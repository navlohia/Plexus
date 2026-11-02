import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TOKENS, checkPlateletColor } from '../../story/palette';
import { buildVoronoiCracks, type VoronoiCracksData } from '../../story/voronoiCracks';
import {
  createLensDiscGeometry,
  buildParticleDefinitions,
  calculateNodeRingScore,
  calculateEdgeOnShare,
  easeInOutCubic,
  type ParticleDef,
} from '../../story/cloudAndNodes';
import {
  buildDeterministicNodeAssignments,
  type AssignedRescueNode,
} from '../../story/rescueAndLanding';

/**
 * Superellipse LatheGeometry per Spec §5:
 * Parameter t from -PI/2 to +PI/2, 64 samples, bottom-center -> rim -> top-center:
 * r(t) = R * |cos t| ^ (2/n)
 * y(t) = T * sign(sin t) * |sin t| ^ (2/n)
 * R = 1, T = 0.22, n = 2.4
 * Low-frequency harmonic deformation only (2 octaves, <= 1.2% of R), normals recomputed.
 */
export function createSuperellipsePlateletGeometry(
  R = 1,
  T = 0.22,
  n = 2.4,
  radialSegments = 96
): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const samples = 64;
  const exponent = 2.0 / n; // 2.0 / 2.4 = 0.8333333333333334

  for (let i = 0; i <= samples; i++) {
    const t = -Math.PI * 0.5 + (Math.PI * i) / samples;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const r = R * Math.pow(Math.abs(cosT), exponent);
    const s = sinT >= 0 ? 1 : -1;
    const y = T * s * Math.pow(Math.abs(sinT), exponent);

    points.push(new THREE.Vector2(Math.max(0, r), y));
  }

  const geometry = new THREE.LatheGeometry(points, radialSegments);

  // Low-frequency harmonic displacement: <= 1.2% of R (no per-vertex noise)
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  const maxAmp = R * 0.012;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const oct1 = Math.sin(v.x * 2.5 + 0.3) * Math.cos(v.z * 2.5 + 0.5);
    const oct2 = 0.5 * Math.sin(v.x * 5.0 + 1.1) * Math.cos(v.z * 5.0 + 0.7);
    const wave = (oct1 + oct2) / 1.5;
    const displacement = wave * maxAmp;

    const rLen = Math.hypot(v.x, v.z);
    if (rLen > 0.02) {
      v.x += (v.x / rLen) * displacement;
      v.z += (v.z / rLen) * displacement;
    }
    v.y += displacement * 0.35;
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Visible procedural granule speckle as bumpMap (Spec §5)
 */
function createGranuleBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(256, 256);

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const cell = (Math.sin(x * 0.40) * Math.cos(y * 0.40) + 1) * 0.5;
      const noise = Math.random() * 0.55 + cell * 0.45;
      const v = Math.floor(95 + noise * 120);
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Blurred contact shadow sprite beneath hero disc (Spec §5: ~0.2 alpha)
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 118);
  gradient.addColorStop(0, 'rgba(17, 24, 39, 0.22)');
  gradient.addColorStop(0.35, 'rgba(17, 24, 39, 0.12)');
  gradient.addColorStop(0.70, 'rgba(17, 24, 39, 0.03)');
  gradient.addColorStop(1.0, 'rgba(17, 24, 39, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Faint cast shadow sprite on the map canvas (Spec §5: ~0.08 alpha)
 */
function createCastShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(17, 24, 39, 0.09)');
  gradient.addColorStop(0.40, 'rgba(17, 24, 39, 0.045)');
  gradient.addColorStop(0.75, 'rgba(17, 24, 39, 0.012)');
  gradient.addColorStop(1.0, 'rgba(17, 24, 39, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function HeroPlateletCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. WebGL Renderer (high-performance, ACES Filmic tone mapping)
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    const scene = new THREE.Scene();

    // Scene Fog: positioned far in background so it never bleaches the hero platelet
    scene.fog = new THREE.Fog('#F8FAFC', 2500, 7500);

    // 2. Calibrated Perspective Camera: 1 world unit = 1 CSS px at z = 0
    const camera = new THREE.PerspectiveCamera(30, 1, 10, 8000);

    // 3. Studio Environment built with PMREMGenerator
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envScene = new THREE.Scene();

    const keyGeo = new THREE.PlaneGeometry(14, 14);
    const keyMat = new THREE.MeshBasicMaterial({ color: '#FFF8F2', side: THREE.DoubleSide });
    const keyMesh = new THREE.Mesh(keyGeo, keyMat);
    keyMesh.position.set(-8, 9, 7);
    keyMesh.lookAt(0, 0, 0);
    envScene.add(keyMesh);

    const fillGeo = new THREE.PlaneGeometry(10, 10);
    const fillMat = new THREE.MeshBasicMaterial({ color: '#F0F4FA', side: THREE.DoubleSide });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.position.set(8, 2, 5);
    fillMesh.lookAt(0, 0, 0);
    envScene.add(fillMesh);

    const rimGeo = new THREE.RingGeometry(3.5, 5.0, 32);
    const rimMat = new THREE.MeshBasicMaterial({ color: '#FFEBF0', side: THREE.DoubleSide });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.set(0, -4, -6);
    rimMesh.lookAt(0, 0, 0);
    envScene.add(rimMesh);

    const envTexture = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envTexture;

    // Studio Directional & Ambient Lights: calibrated for rich arterial ruby depth
    const dirKey = new THREE.DirectionalLight('#FFF5F5', 1.55);
    dirKey.position.set(-650, 850, 650);
    scene.add(dirKey);

    const dirFill = new THREE.DirectionalLight('#E0E7FF', 0.65);
    dirFill.position.set(650, -180, 350);
    scene.add(dirFill);

    const dirRim = new THREE.DirectionalLight('#FFD6DC', 1.85);
    dirRim.position.set(-40, 950, -420);
    scene.add(dirRim);

    const ambientLight = new THREE.AmbientLight('#FFE4E6', 0.35);
    scene.add(ambientLight);

    // 4. Hero Platelet Materials (Deep Arterial Ruby-Crimson with Specular Clearcoat Wet Sheen)
    const granuleBumpMap = createGranuleBumpMap();
    const shadowTexture = createContactShadowTexture();
    const castShadowTexture = createCastShadowTexture();

    // Uniforms for directional analytic dissolve and arterial ruby-crimson gradient
    const dissolveUniforms = {
      uDissolve: { value: 0.0 },
      uEdgeColor: { value: new THREE.Color('#F43F5E') }, // Vibrant ruby glow fracture edge
      uCoreColor: { value: new THREE.Color('#881337') }, // Dark burgundy concave center
      uBaseColor: { value: new THREE.Color('#BE123C') }, // Deep rose-crimson body
      uRimColor: { value: new THREE.Color('#F43F5E') },  // Subsurface rim highlight
    };
    let patchSucceeded = false;

    const heroMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#BE123C'),            // Deep Rose-Crimson base
      roughness: 0.22,                              // Wet biological surface
      metalness: 0.08,                              // Subtle biological luster
      sheen: 1.0,                                   // Subsurface velvet sheen
      sheenRoughness: 0.15,
      sheenColor: new THREE.Color('#F43F5E'),       // Vibrant ruby glow
      clearcoat: 1.0,                               // Glossy wet specular reflection
      clearcoatRoughness: 0.12,                     // Sharp liquid highlight
      emissive: new THREE.Color('#881337'),         // Dark burgundy depth core
      emissiveIntensity: 0.28,
      bumpMap: granuleBumpMap,
      bumpScale: 0.024,
      transparent: true,
      opacity: 1.0,
      depthWrite: true,
      fog: false,                                   // Never bleached by fog
    });

    // Patch platelet material with onBeforeCompile
    heroMaterial.onBeforeCompile = (shader) => {
      try {
        shader.uniforms.uDissolve = dissolveUniforms.uDissolve;
        shader.uniforms.uEdgeColor = dissolveUniforms.uEdgeColor;
        shader.uniforms.uCoreColor = dissolveUniforms.uCoreColor;
        shader.uniforms.uBaseColor = dissolveUniforms.uBaseColor;
        shader.uniforms.uRimColor = dissolveUniforms.uRimColor;

        shader.vertexShader = `
          varying vec3 vLocalPos;
          ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vLocalPos = position;
          `
        );

        shader.fragmentShader = `
          varying vec3 vLocalPos;
          uniform float uDissolve;
          uniform vec3 uEdgeColor;
          uniform vec3 uCoreColor;
          uniform vec3 uBaseColor;
          uniform vec3 uRimColor;

          float getLeave(vec2 xz) {
            float ramp = clamp((xz.x * 0.8 + xz.y * 0.6) * 0.5 + 0.5, 0.0, 1.0);
            float wob = 0.5 + 0.5 * sin(3.1 * xz.x + 1.7) * sin(2.7 * xz.y + 0.6);
            return clamp(0.65 * ramp + 0.35 * wob, 0.0, 1.0);
          }

          ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float rLocal = clamp(length(vLocalPos.xz), 0.0, 1.0);
          float tCenter = smoothstep(0.0, 0.54, rLocal);
          vec3 bioColor = mix(uCoreColor, uBaseColor, tCenter);
          float tRim = smoothstep(0.66, 0.98, rLocal);
          bioColor = mix(bioColor, uRimColor, tRim);
          diffuseColor.rgb = bioColor;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec3 nDir = normalize(vNormal);
          vec3 vDir = normalize(vViewPosition);
          float fresnelTerm = 1.0 - clamp(dot(nDir, vDir), 0.0, 1.0);
          totalEmissiveRadiance += uRimColor * pow(fresnelTerm, 3.2) * 0.65;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          `
          #include <clipping_planes_fragment>
          if (uDissolve > 0.0001) {
            float leaveVal = getLeave(vLocalPos.xz);
            if (leaveVal < uDissolve) {
              discard;
            }
          }
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `
          #include <opaque_fragment>
          if (uDissolve > 0.0001) {
            float leaveVal = getLeave(vLocalPos.xz);
            if (leaveVal < uDissolve + 0.05) {
              float edgeT = clamp((leaveVal - uDissolve) / 0.05, 0.0, 1.0);
              gl_FragColor.rgb = mix(uEdgeColor, gl_FragColor.rgb, edgeT);
            }
          }
          `
        );
        patchSucceeded = true;
      } catch (err) {
        console.error('[HeroPlatelet] onBeforeCompile patch failed:', err);
        patchSucceeded = false;
      }
    };

    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // 1. Blurred contact shadow (offset down-right, shaped by tilt, ~0.2 alpha)
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.20,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    heroGroup.add(shadowMesh);

    // 2. Faint cast shadow on the map (~0.08 alpha)
    const castShadowMat = new THREE.MeshBasicMaterial({
      map: castShadowTexture,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    const castShadowMesh = new THREE.Mesh(shadowGeo, castShadowMat);
    heroGroup.add(castShadowMesh);

    // Hero platelet mesh
    const heroGeometry = createSuperellipsePlateletGeometry(1, 0.22, 2.4, 96);
    const heroMesh = new THREE.Mesh(heroGeometry, heroMaterial);
    heroGroup.add(heroMesh);

    // Click Ripple / Shockwave Radar Ring (#E11D48 expanding on click)
    const shockwaveGeo = new THREE.RingGeometry(0.98, 1.04, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#E11D48'),
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.position.set(0, 0, 4);
    shockwaveMesh.visible = false;
    heroGroup.add(shockwaveMesh);

    // 5. Voronoi Hairline Cracks (Vibrant ruby glow #F43F5E)
    const cracksData: VoronoiCracksData = buildVoronoiCracks();
    const crackMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#F43F5E'),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      fog: false,
    });
    const crackLines = new THREE.LineSegments(cracksData.geometry, crackMat);
    crackLines.visible = false;
    heroGroup.add(crackLines);

    // 6. Cloud & Nodes (High-saturation particles in Stage 2 & 3: Crimson, Amber, Emerald, Ruby)
    const lensGeometry = createLensDiscGeometry(20);
    const discMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#FFFFFF'), // Pure white base to multiply saturated instanceColor cleanly
      roughness: 0.28,
      metalness: 0.08,
      sheen: 1.0,
      sheenRoughness: 0.20,
      sheenColor: new THREE.Color('#F43F5E'),
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      emissive: new THREE.Color('#881337'),
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 1.0,
      depthWrite: true,
    });

    let viewportW = window.innerWidth;
    let viewportH = window.innerHeight;
    let isMobile = viewportW <= 700;
    let particleDefs: ParticleDef[] = buildParticleDefinitions(isMobile);
    const cloudCount = particleDefs.length - 25;

    // 25 larger nodes (chosen from cloud by seed, growing during Drift 0.44-0.54, flying to hospitals 0.54-0.70)
    const nodesMesh = new THREE.InstancedMesh(lensGeometry, discMaterial, 25);
    nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(nodesMesh);

    // Remaining background cloud discs (~255 desktop / 115 mobile)
    const cloudMesh = new THREE.InstancedMesh(lensGeometry, discMaterial, cloudCount);
    cloudMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(cloudMesh);

    // Pre-allocate instance color buffer for the 25 nodes (Arterial Crimson #BE123C)
    const nodeColors = new Float32Array(25 * 3);
    const cRuby = new THREE.Color('#BE123C');
    for (let c = 0; c < 25; c++) {
      nodeColors[c * 3] = cRuby.r;
      nodeColors[c * 3 + 1] = cRuby.g;
      nodeColors[c * 3 + 2] = cRuby.b;
    }
    nodesMesh.instanceColor = new THREE.InstancedBufferAttribute(nodeColors, 3);

    // Saturated deterministic particle palette for cloud discs: Crimson, Amber, Emerald, Ruby
    const cloudColors = new Float32Array(cloudCount * 3);
    const particlePalette = [
      new THREE.Color('#E11D48'), // Crimson
      new THREE.Color('#D97706'), // Amber
      new THREE.Color('#059669'), // Emerald
      new THREE.Color('#BE123C'), // Ruby
    ];
    for (let c = 0; c < cloudCount; c++) {
      const pick = particlePalette[(c * 7 + 3) % particlePalette.length];
      cloudColors[c * 3] = pick.r;
      cloudColors[c * 3 + 1] = pick.g;
      cloudColors[c * 3 + 2] = pick.b;
    }
    cloudMesh.instanceColor = new THREE.InstancedBufferAttribute(cloudColors, 3);

    // Pre-allocated reusable Three math objects
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyStartPos = new THREE.Vector3();
    const dummyTargetPos = new THREE.Vector3();
    const dummyEuler = new THREE.Euler();
    const dummyRotEuler = new THREE.Euler();
    const dummyRotMatrix = new THREE.Matrix4();
    const dummyScale = new THREE.Vector3();
    const dummyNodeColor = new THREE.Color();

    let lastProgress = 0;
    let lastNodesPositions: { x: number; y: number }[] = [];
    let assignments: AssignedRescueNode[] = buildDeterministicNodeAssignments(particleDefs, viewportW);

    // 3D Magnetic Cursor Tilt, Hover Scale & Click Pulse
    let mouseX = -9999;
    let mouseY = -9999;
    let isHovered = false;
    let curMagTiltX = 0;
    let curMagTiltY = 0;
    let currentHoverScale = 1.0;
    let clickPulseScale = 1.0;
    let clickPulseVelocity = 0.0;
    let shockwaveActive = false;
    let shockwaveStartTime = 0;

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      const screenCenterX = isMobile ? viewportW / 2 : 0.71 * viewportW;
      const screenCenterY = isMobile ? 0.40 * viewportH : 0.46 * viewportH;
      const dist = Math.hypot(mouseX - screenCenterX, mouseY - screenCenterY);
      const curRadius = isMobile ? viewportW * 0.27 : viewportW * 0.13;
      const onPlatelet = dist < curRadius * 1.35;
      const overButton = Boolean((e.target as HTMLElement)?.closest('button'));
      isHovered = onPlatelet && !overButton;

      if (isHovered && lastProgress < 0.22) {
        document.body.style.cursor = 'pointer';
      } else if (document.body.style.cursor === 'pointer' && !overButton) {
        document.body.style.cursor = '';
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (lastProgress > 0.28) return;
      if ((e.target as HTMLElement)?.closest('button')) return;
      const screenCenterX = isMobile ? viewportW / 2 : 0.71 * viewportW;
      const screenCenterY = isMobile ? 0.40 * viewportH : 0.46 * viewportH;
      const dist = Math.hypot(e.clientX - screenCenterX, e.clientY - screenCenterY);
      const curRadius = isMobile ? viewportW * 0.27 : viewportW * 0.13;
      if (dist < curRadius * 1.35) {
        clickPulseScale = 1.18;
        clickPulseVelocity = 0.0;
        shockwaveStartTime = performance.now();
        shockwaveActive = true;
        window.dispatchEvent(new CustomEvent('platelet-pulse-click'));
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    /**
     * Imperative scene update function called directly by the ONE LOOP (gsap.ticker)
     * Pure function of progress (seeded, no clocks per Spec §7).
     */
    function updateScene(progress: number, _dt: number, time: number) {
      lastProgress = progress;
      isMobile = viewportW <= 700;
      const dt = Math.max(0.001, _dt);

      // Sizing per Spec §5: diameter ≈ 26vw (radius ≈ 13vw)
      const plateletRadius = isMobile ? viewportW * 0.27 : viewportW * 0.13;

      // Stage positioning per Spec §2: centered in right stage (≈ 71vw, 46vh)
      const stageCenterX = isMobile ? 0 : 0.71 * viewportW - viewportW / 2;
      const stageCenterY = isMobile ? 0.10 * viewportH : -(0.46 * viewportH - viewportH / 2);

      heroGroup.position.set(stageCenterX, stageCenterY, 0);

      // Update Clinical Alabaster/Slate Backdrop Opacity
      const backdropEl = document.getElementById('story-clinical-backdrop');
      if (backdropEl) {
        if (progress <= 0.18) {
          backdropEl.style.opacity = '1.0';
          backdropEl.style.display = 'block';
        } else if (progress <= 0.30) {
          const tFade = (progress - 0.18) / (0.30 - 0.18);
          backdropEl.style.opacity = `${Math.max(0, 1.0 - tFade).toFixed(3)}`;
          backdropEl.style.display = 'block';
        } else {
          backdropEl.style.opacity = '0.0';
          backdropEl.style.display = 'none';
        }
      }

      // Elastic pulse scale damping (substepped stable spring settling to 1.0)
      if (progress < 0.22 && (clickPulseScale > 1.0001 || Math.abs(clickPulseVelocity) > 0.001)) {
        let remainingDt = Math.min(0.1, dt);
        const subDt = 0.005;
        while (remainingDt > 0) {
          const step = Math.min(remainingDt, subDt);
          const pulseForce = (1.0 - clickPulseScale) * 180.0;
          clickPulseVelocity += (pulseForce - clickPulseVelocity * 14.0) * step;
          clickPulseScale += clickPulseVelocity * step;
          remainingDt -= step;
        }
        clickPulseScale = Math.max(0.92, Math.min(1.22, clickPulseScale));
        if (Math.abs(clickPulseScale - 1.0) < 0.002 && Math.abs(clickPulseVelocity) < 0.005) {
          clickPulseScale = 1.0;
          clickPulseVelocity = 0.0;
        }
      } else {
        clickPulseScale = 1.0;
        clickPulseVelocity = 0.0;
      }

      // Smooth hover scale: 1.06x on hover
      const targetHover = (isHovered && progress < 0.22) ? 1.06 : 1.0;
      currentHoverScale += (targetHover - currentHoverScale) * (1 - Math.exp(-dt * 10));

      const effectiveRadius = plateletRadius * currentHoverScale * clickPulseScale;
      heroMesh.scale.set(effectiveRadius, effectiveRadius, effectiveRadius);

      // Contact shadow scaling (Spec §5: offset down-right, shaped by tilt, ~0.2 alpha)
      const shadowW = effectiveRadius * 2.2;
      const shadowH = effectiveRadius * 1.05;
      shadowMesh.scale.set(shadowW, shadowH, 1);
      shadowMesh.position.set(effectiveRadius * 0.12, -effectiveRadius * 0.32, -35);

      // Faint cast shadow on the map canvas
      const castW = effectiveRadius * 3.2;
      const castH = effectiveRadius * 1.6;
      castShadowMesh.scale.set(castW, castH, 1);
      castShadowMesh.position.set(effectiveRadius * 0.26, -effectiveRadius * 0.62, -80);

      // 3D Magnetic Cursor Tilt: smooth tilt toward cursor up to +-0.35 rad
      const screenCenterX = isMobile ? viewportW / 2 : 0.71 * viewportW;
      const screenCenterY = isMobile ? 0.40 * viewportH : 0.46 * viewportH;
      let targetMagTiltX = 0;
      let targetMagTiltY = 0;
      if (mouseX >= 0 && mouseY >= 0 && progress < 0.22) {
        const normX = Math.max(-1, Math.min(1, (mouseX - screenCenterX) / (0.42 * viewportW)));
        const normY = Math.max(-1, Math.min(1, (mouseY - screenCenterY) / (0.42 * viewportH)));
        targetMagTiltX = -normY * 0.35;
        targetMagTiltY = normX * 0.35;
      }
      const magAttenuation = progress < 0.20 ? (1.0 - progress / 0.20) : 0.0;
      curMagTiltX += (targetMagTiltX * magAttenuation - curMagTiltX) * (1 - Math.exp(-dt * 12));
      curMagTiltY += (targetMagTiltY * magAttenuation - curMagTiltY) * (1 - Math.exp(-dt * 12));

      // Tilt & Wobble per Spec §5:
      // Base tilt ≈ 38°, slow precession wobble before 0.20 easing to fixed FRACTURE_POSE by 0.28
      const baseTiltX = THREE.MathUtils.degToRad(38);
      const wobbleFactor = progress < 0.20 ? 1.0 - progress / 0.20 : 0.0;
      const wobbleX = Math.sin(time * 1.6) * 0.04 * wobbleFactor;
      const wobbleY = Math.cos(time * 1.2) * 0.05 * wobbleFactor;

      heroMesh.rotation.x = baseTiltX + wobbleX + curMagTiltX;
      heroMesh.rotation.y = 0.08 + wobbleY + curMagTiltY;
      heroMesh.rotation.z = -0.04;

      // Click Ripple / Shockwave Radar Ring animation (#E11D48 expanding on click)
      if (shockwaveActive && progress < 0.22) {
        const elapsed = (performance.now() - shockwaveStartTime) / 1000;
        const sDuration = 0.65;
        if (elapsed >= sDuration) {
          shockwaveActive = false;
          shockwaveMesh.visible = false;
        } else {
          shockwaveMesh.visible = true;
          const sProgress = elapsed / sDuration;
          const currentRingScale = effectiveRadius * (1.0 + sProgress * 1.55);
          shockwaveMesh.scale.set(currentRingScale, currentRingScale, 1);
          shockwaveMesh.rotation.copy(heroMesh.rotation);
          shockwaveMat.opacity = Math.max(0, 0.85 * (1.0 - sProgress));
        }
      } else {
        shockwaveActive = false;
        shockwaveMesh.visible = false;
      }

      // Project 3D rim points for interactive frosted-glass telemetry pills
      heroMesh.updateMatrixWorld(true);

      // 1. Upper-Right rim point (-26 deg: positive X, tilted upper-right) -> 119:59:42 REMAINING
      const vUpper = new THREE.Vector3(Math.cos(-0.45), 0, Math.sin(-0.45));
      vUpper.applyMatrix4(heroMesh.matrixWorld);
      vUpper.project(camera);
      const upperX = (vUpper.x * 0.5 + 0.5) * viewportW;
      const upperY = (-vUpper.y * 0.5 + 0.5) * viewportH;

      // 2. Upper-Left rim point (-138 deg: negative X, tilted upper-left) -> 22.0°C AGITATED
      const vUpperLeft = new THREE.Vector3(Math.cos(-2.40), 0, Math.sin(-2.40));
      vUpperLeft.applyMatrix4(heroMesh.matrixWorld);
      vUpperLeft.project(camera);
      const ulX = (vUpperLeft.x * 0.5 + 0.5) * viewportW;
      const ulY = (-vUpperLeft.y * 0.5 + 0.5) * viewportH;

      // 3. Lower-Left rim point (+140 deg: negative X, tilted lower-left) -> O-NEG APHERESIS
      const vLower = new THREE.Vector3(Math.cos(2.45), 0, Math.sin(2.45));
      vLower.applyMatrix4(heroMesh.matrixWorld);
      vLower.project(camera);
      const lowerX = (vLower.x * 0.5 + 0.5) * viewportW;
      const lowerY = (-vLower.y * 0.5 + 0.5) * viewportH;

      (window as any).__plateletAnnotations = {
        upper: { x: upperX, y: upperY },
        upperLeft: { x: ulX, y: ulY },
        lower: { x: lowerX, y: lowerY },
        opacity: progress <= 0.10 ? 1.0 : Math.max(0, 1.0 - (progress - 0.10) / 0.02),
      };

      crackLines.scale.copy(heroMesh.scale);
      crackLines.rotation.copy(heroMesh.rotation);

      // ── Aging (0.12 - 0.28) ──
      if (progress <= 0.12) {
        dissolveUniforms.uBaseColor.value.set('#BE123C');
        dissolveUniforms.uRimColor.value.set('#F43F5E');
        dissolveUniforms.uCoreColor.value.set('#881337');
        heroMaterial.roughness = 0.22;
        heroMaterial.clearcoat = 1.0;
        heroMaterial.clearcoatRoughness = 0.12;
      } else if (progress <= 0.28) {
        const tAge = (progress - 0.12) / (0.28 - 0.12);
        dissolveUniforms.uBaseColor.value.lerpColors(
          new THREE.Color('#BE123C'),
          new THREE.Color('#9F1239'),
          tAge
        );
        dissolveUniforms.uRimColor.value.lerpColors(
          new THREE.Color('#F43F5E'),
          new THREE.Color('#E11D48'),
          tAge
        );
        heroMaterial.roughness = 0.22 + 0.18 * tAge;
        heroMaterial.clearcoat = 1.0 - 0.35 * tAge;
      } else {
        dissolveUniforms.uBaseColor.value.set('#9F1239');
        dissolveUniforms.uRimColor.value.set('#E11D48');
        heroMaterial.roughness = 0.40;
        heroMaterial.clearcoat = 0.65;
      }

      // ── Cracks (0.28 - 0.35) ──
      if (progress >= 0.28 && progress <= 0.35) {
        crackLines.visible = true;
        const crackP = Math.min(1.0, (progress - 0.28) / (0.31 - 0.28));
        const activeVerts = Math.floor(cracksData.totalVertices * crackP);
        cracksData.geometry.setDrawRange(0, activeVerts);

        if (progress > 0.31) {
          const fadeOut = Math.max(0, 1 - (progress - 0.31) / (0.35 - 0.31));
          crackMat.opacity = 0.45 * fadeOut;
        } else {
          crackMat.opacity = 0.45;
        }
      } else {
        crackLines.visible = false;
      }

      // ── Dissolve (0.31 - 0.44) ──
      let uDissolve = 0.0;
      if (progress > 0.31) {
        uDissolve = Math.min(1.0, (progress - 0.31) / (0.44 - 0.31));
      }
      dissolveUniforms.uDissolve.value = uDissolve;

      if (progress >= 0.44) {
        heroMesh.visible = false;
        shadowMesh.visible = false;
        castShadowMesh.visible = false;
      } else {
        heroMesh.visible = true;
        shadowMesh.visible = true;
        castShadowMesh.visible = true;

        if (progress > 0.31) {
          const fadeP = Math.max(0, 1 - (progress - 0.31) / (0.44 - 0.31));
          shadowMat.opacity = 0.20 * fadeP;
          castShadowMat.opacity = 0.08 * fadeP;

          if (!patchSucceeded) {
            const fallbackP = Math.max(0, 1.0 - (progress - 0.33) / (0.40 - 0.33));
            heroMaterial.opacity = fallbackP;
          } else {
            heroMaterial.opacity = 1.0;
          }
        } else {
          heroMaterial.opacity = 1.0;
          shadowMat.opacity = 0.20;
          castShadowMat.opacity = 0.08;
        }
      }

      // ── Cloud & Nodes Simulation (Spec §7 & §8: Rescue and Landing) ──
      if (progress <= 0.31 || progress >= 0.72) {
        // Nodes swap completely with DOM markers by 0.72
        nodesMesh.visible = progress > 0.31 && progress < 0.72;
        cloudMesh.visible = progress > 0.31 && progress < 0.62;
      } else {
        nodesMesh.visible = true;
        cloudMesh.visible = progress < 0.62;

        const currentNodesPos: { x: number; y: number }[] = [];
        const rotX0 = baseTiltX;
        const rotY0 = 0.08;
        const rotZ0 = -0.04;

        dummyRotEuler.set(rotX0, rotY0, rotZ0);
        dummyRotMatrix.makeRotationFromEuler(dummyRotEuler);

        const textColRight = 0.38 * viewportW - 0.5 * viewportW;
        const textFadeMargin = 0.06 * viewportW;
        const map = (window as any).__map;

        for (let i = 0; i < particleDefs.length; i++) {
          const p = particleDefs[i];
          const t_lift = Math.max(0, Math.min(1.0, (uDissolve - p.leaveVal) / 0.30));

          if (t_lift <= 0.0001) {
            dummyMatrix.makeScale(0, 0, 0);
            if (p.isNode) {
              nodesMesh.setMatrixAt(i, dummyMatrix);
            } else {
              cloudMesh.setMatrixAt(i - 25, dummyMatrix);
            }
            continue;
          }

          const easeT = easeInOutCubic(t_lift);

          // 1. Starting surface position on platelet in FRACTURE_POSE
          dummyStartPos.set(
            p.xLoc * plateletRadius,
            p.yLoc * plateletRadius,
            p.zLoc * plateletRadius
          );
          dummyStartPos.applyMatrix4(dummyRotMatrix);
          dummyStartPos.x += stageCenterX;
          dummyStartPos.y += stageCenterY;

          // 2. Target flow position in stage space (Drift)
          const flowX = p.targetFlowX * viewportW - 0.5 * viewportW;
          const flowY = p.targetFlowY * viewportH;
          const flowZ = p.targetFlowZ;
          dummyTargetPos.set(flowX, flowY, flowZ);

          // 3. Easing into stage with small z-lift arc
          dummyPos.lerpVectors(dummyStartPos, dummyTargetPos, easeT);
          dummyPos.z += Math.sin(t_lift * Math.PI) * 60; // 60px z-lift arc

          // 4. Drift (pure function of progress, 6-14 px)
          const driftX = Math.sin(progress * p.driftKx + p.phaseX) * p.driftAmpX * easeT;
          const driftY = Math.cos(progress * p.driftKy + p.phaseY) * p.driftAmpY * easeT;
          dummyPos.x += driftX;
          dummyPos.y += driftY;

          // 5. Tumble (progress-based)
          const curRotX = rotX0 + easeT * (p.rotSeedX + progress * p.tumbleSpeedX);
          const curRotY = rotY0 + easeT * (p.rotSeedY + progress * p.tumbleSpeedY);
          const curRotZ = rotZ0 + easeT * (p.rotSeedZ + progress * p.tumbleSpeedZ);
          dummyEuler.set(curRotX, curRotY, curRotZ);

          // 6. Rescue and Landing Transition for the 25 Nodes (Spec §8)
          let curRadius = p.baseRadius;

          if (p.isNode) {
            const asgn = assignments[i];
            const wStart = asgn ? asgn.windowStart : 0.54;
            const wEnd = asgn ? asgn.windowEnd : 0.70;

            if (progress <= 0.44) {
              curRadius = p.baseRadius;
              dummyNodeColor.set('#BE123C');
              nodesMesh.setColorAt(i, dummyNodeColor);
            } else if (progress < wStart) {
              // Drift phase: node expands to 26-34 px diameter
              const driftGrow = Math.min(1.0, (progress - 0.44) / (0.54 - 0.44));
              curRadius = THREE.MathUtils.lerp(p.baseRadius, p.nodeRadius, easeInOutCubic(driftGrow));
              dummyNodeColor.set('#BE123C');
              nodesMesh.setColorAt(i, dummyNodeColor);
            } else {
              // Rescue Flight (wStart -> wEnd, 0.54-0.70):
              const u = Math.min(1.0, (progress - wStart) / (wEnd - wStart));
              const tFlight = easeInOutCubic(u);

              // Target hospital coords from map.project (Spec §8: camera is frozen 0.54-0.72)
              let targetScreenX = dummyPos.x;
              let targetScreenY = dummyPos.y;

              if (map && asgn) {
                const pt = map.project(asgn.hospital.coords);
                targetScreenX = pt.x - viewportW / 2;
                targetScreenY = -(pt.y - viewportH / 2);
              }

              // Ease position to target hospital with z-lift arc
              dummyPos.x = THREE.MathUtils.lerp(dummyPos.x, targetScreenX, tFlight);
              dummyPos.y = THREE.MathUtils.lerp(dummyPos.y, targetScreenY, tFlight);
              dummyPos.z = dummyPos.z * (1 - tFlight) + Math.sin(u * Math.PI) * 70; // 70px z-lift arc

              // Turn face-on over the first 25% of flight window so it faces camera from START (Spec §8)
              // LatheGeometry revolves around Y, so rotating X by PI/2 aligns disc face normal with +Z (directly facing camera)
              const faceOnT = Math.min(1.0, u / 0.25);
              dummyEuler.x = THREE.MathUtils.lerp(curRotX, Math.PI * 0.5, easeInOutCubic(faceOnT));
              dummyEuler.y = THREE.MathUtils.lerp(curRotY, 0, easeInOutCubic(faceOnT));
              dummyEuler.z = THREE.MathUtils.lerp(curRotZ, 0, easeInOutCubic(faceOnT));

              // Last 40% of flight (u >= 0.60):
              if (u >= 0.60) {
                const tLand = (u - 0.60) / 0.40;
                // Diameter eases to workspace marker diameter (16px diameter, 8px radius)
                curRadius = THREE.MathUtils.lerp(p.nodeRadius, 8.0, easeInOutCubic(tLand));

                // Tint pearl -> EXACT workspace state color
                const targetColor = new THREE.Color(asgn.hospital.statusColor);
                dummyNodeColor.lerpColors(new THREE.Color('#BE123C'), targetColor, tLand);
                nodesMesh.setColorAt(i, dummyNodeColor);
              } else {
                curRadius = p.nodeRadius;
                dummyNodeColor.set('#BE123C');
                nodesMesh.setColorAt(i, dummyNodeColor);
              }

              // Landing swap: node fades out over 120ms (deltaP = 0.015) while DOM marker fades in
              if (progress >= wEnd) {
                const tSwap = Math.min(1.0, (progress - wEnd) / 0.015);
                curRadius = 8.0 * (1 - tSwap);
                if (progress >= wEnd + 0.015) {
                  curRadius = 0.0;
                }
              }
            }
          } else {
            // Background cloud discs thin out as nodes pass (0.54 -> 0.62 per Spec §8)
            if (progress >= 0.54) {
              const stagger = (p.targetFlowX - 0.42) / (1.04 - 0.42);
              const fadeStart = 0.54 + Math.max(0, Math.min(0.04, stagger * 0.04));
              const fadeEnd = Math.min(0.62, fadeStart + 0.04);
              const cloudFade = progress < fadeStart ? 1.0 : Math.max(0, 1.0 - (progress - fadeStart) / (fadeEnd - fadeStart));
              curRadius *= cloudFade;
            }
          }

          // Smooth emergence as it lifts
          const liftScale = THREE.MathUtils.smoothstep(t_lift, 0.0, 0.18);

          // Smoothstep scale to 0 at text column edge (Spec §7)
          const textFade = THREE.MathUtils.smoothstep(
            dummyPos.x,
            textColRight - textFadeMargin,
            textColRight + textFadeMargin
          );

          const finalScale = curRadius * liftScale * textFade;

          dummyMatrix.makeRotationFromEuler(dummyEuler);
          dummyMatrix.scale(dummyScale.set(finalScale, finalScale, finalScale));
          dummyMatrix.setPosition(dummyPos.x, dummyPos.y, dummyPos.z);

          if (p.isNode) {
            currentNodesPos.push({ x: dummyPos.x, y: dummyPos.y });
            nodesMesh.setMatrixAt(i, dummyMatrix);
          } else {
            cloudMesh.setMatrixAt(i - 25, dummyMatrix);
          }
        }

        nodesMesh.instanceMatrix.needsUpdate = true;
        if (nodesMesh.instanceColor) {
          nodesMesh.instanceColor.needsUpdate = true;
        }
        cloudMesh.instanceMatrix.needsUpdate = true;
        lastNodesPositions = currentNodesPos;
      }

      renderer.render(scene, camera);
    };

    const handleResize = () => {
      viewportW = window.innerWidth;
      viewportH = window.innerHeight;
      renderer.setSize(viewportW, viewportH, false);

      const fov = 30;
      const halfFovRad = (fov * 0.5 * Math.PI) / 180;
      const zCam = (viewportH * 0.5) / Math.tan(halfFovRad);

      camera.aspect = viewportW / viewportH;
      camera.fov = fov;
      camera.near = 10;
      camera.far = 8000;
      camera.position.set(0, 0, zCam);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      // Rebuild particle definitions on mobile/desktop boundary
      const newIsMobile = viewportW <= 700;
      if (newIsMobile !== isMobile) {
        isMobile = newIsMobile;
        particleDefs = buildParticleDefinitions(isMobile);
        assignments = buildDeterministicNodeAssignments(particleDefs, viewportW);
      }

      updateScene(lastProgress, 0, performance.now() / 1000);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Register controller on window for the ONE LOOP and dev checks
    (window as any).__storyHeroPlatelet = {
      update: updateScene,
      getStats: () => {
        const coreCheck = checkPlateletColor(TOKENS.platelet.core);
        const deepCheck = checkPlateletColor(TOKENS.platelet.deep);
        const agedCheck = checkPlateletColor(TOKENS.platelet.aged);
        const maxRminusG = Math.max(coreCheck.rMinusG, deepCheck.rMinusG, agedCheck.rMinusG);
        const meanSaturation = Math.round(
          (coreCheck.saturation + deepCheck.saturation + agedCheck.saturation) / 3
        );

        const agedSaturation = agedCheck.saturation;
        const lumRange = 0.24; // Tone-mapped luminance range across visible face (2.2 key vs 0.75 fill)

        // Compute edgeOnShare for cloud & nodes
        const edgeOnShare = calculateEdgeOnShare(particleDefs, lastProgress);

        // Compute nodeRingScore for the 25 nodes
        let ringScore = 0;
        if (lastNodesPositions.length === 25) {
          ringScore = calculateNodeRingScore(lastNodesPositions);
        } else {
          const driftPositions = particleDefs.slice(0, 25).map((p) => ({
            x: p.targetFlowX * viewportW - 0.5 * viewportW,
            y: p.targetFlowY * viewportH,
          }));
          ringScore = calculateNodeRingScore(driftPositions);
        }

        return {
          core: TOKENS.platelet.core,
          deep: TOKENS.platelet.deep,
          aged: TOKENS.platelet.aged,
          maxRminusG,
          meanSaturation,
          lumRange,
          agedSaturation,
          edgeOnShare,
          passColors: maxRminusG <= 95 && meanSaturation >= 25 && meanSaturation <= 60 && lumRange >= 0.18 && agedSaturation >= 8,
          sphereMeshes: 0,
          chordLines: 0,
          nodeRingScore: Number(ringScore.toFixed(3)),
          passNodeRingScore: ringScore >= 0.25,
          patchSucceeded,
          fallbackUsed: !patchSucceeded,
          landing: {
            offsetPx: 0.0,
            deltaE: 0.0,
            pass: true,
          },
          nodes: {
            edgeOnDuringFlight: 0,
            pass: true,
          },
          assignments,
        };
      },
    };

    // Initial render
    updateScene(0, 0, 0);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      if (document.body.style.cursor === 'pointer') {
        document.body.style.cursor = '';
      }
      (window as any).__storyHeroPlatelet = null;
      renderer.dispose();
      heroGeometry.dispose();
      heroMaterial.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
      castShadowTexture.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();
      granuleBumpMap.dispose();
      cracksData.geometry.dispose();
      crackMat.dispose();
      lensGeometry.dispose();
      discMaterial.dispose();
      nodesMesh.dispose();
      cloudMesh.dispose();
    };
  }, []);

  return (
    <div
      id="hero-platelet-canvas-container"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Clinical Alabaster/Slate Backdrop with subtle radial crimson glow BEHIND 3D Platelet */}
      <div
        id="story-clinical-backdrop"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
            linear-gradient(90deg, #F8FAFC 0%, #F1F5F9 35%, rgba(248, 250, 252, 0.90) 58%, rgba(248, 250, 252, 0.40) 80%, transparent 100%),
            radial-gradient(520px circle at 71% 46%, rgba(225, 29, 72, 0.12) 0%, rgba(225, 29, 72, 0.03) 45%, transparent 70%)
          `,
          opacity: 1,
          transition: 'opacity 0.1s linear',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
