import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowRight, CheckCircle2, Shield, Zap, UserPlus } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

/**
 * High-Resolution Procedural Equirectangular Earth Continents Alpha Map (2048 x 1024)
 * Uses smooth spline interpolation between geographic vertices to sculpt organic,
 * curved continental landmasses identical to the matte-clay 3D globe on mipogg.com.
 */
function createEarthTextures(): { continentMap: THREE.CanvasTexture; shadowMap: THREE.CanvasTexture } {
  const width = 2048;
  const height = 1024;

  const toX = (lng: number) => ((lng + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // Smooth closed curve through geographic coordinates using quadratic bezier midpoints
  const drawSmoothLandmass = (ctx: CanvasRenderingContext2D, coords: [number, number][]) => {
    if (coords.length < 3) return;
    const pts = coords.map(([lng, lat]) => ({ x: toX(lng), y: toY(lat) }));
    const n = pts.length;

    ctx.beginPath();
    const midStart = { x: (pts[n - 1].x + pts[0].x) / 2, y: (pts[n - 1].y + pts[0].y) / 2 };
    ctx.moveTo(midStart.x, midStart.y);

    for (let i = 0; i < n; i++) {
      const pCurrent = pts[i];
      const pNext = pts[(i + 1) % n];
      const mid = { x: (pCurrent.x + pNext.x) / 2, y: (pCurrent.y + pNext.y) / 2 };
      ctx.quadraticCurveTo(pCurrent.x, pCurrent.y, mid.x, mid.y);
    }

    ctx.closePath();
    ctx.fill();
  };

  const drawAllContinents = (ctx: CanvasRenderingContext2D) => {
    // 1. North America & Central America
    drawSmoothLandmass(ctx, [
      [-168, 65], [-160, 71], [-140, 70], [-125, 69], [-105, 73], [-95, 72],
      [-85, 66], [-80, 62], [-82, 55], [-76, 52], [-65, 58], [-55, 50],
      [-60, 44], [-68, 43], [-74, 38], [-76, 35], [-81, 30], [-80, 25],
      [-82, 25], [-84, 30], [-88, 30], [-95, 29], [-97, 26], [-97, 20],
      [-92, 16], [-88, 16], [-83, 10], [-77, 8], [-83, 8], [-87, 13],
      [-95, 16], [-105, 20], [-110, 24], [-112, 30], [-110, 23], [-115, 32],
      [-120, 35], [-124, 40], [-124, 48], [-130, 54], [-140, 59], [-152, 60],
      [-162, 58], [-168, 65],
    ]);

    // 2. Greenland
    drawSmoothLandmass(ctx, [
      [-55, 60], [-45, 60], [-35, 66], [-20, 71], [-18, 77], [-25, 82],
      [-40, 83], [-55, 82], [-60, 78], [-55, 70], [-52, 64], [-55, 60],
    ]);

    // 3. South America
    drawSmoothLandmass(ctx, [
      [-77, 8], [-73, 11], [-65, 11], [-60, 9], [-50, 4], [-44, -2],
      [-35, -5], [-35, -10], [-38, -14], [-40, -20], [-44, -24], [-48, -28],
      [-53, -33], [-58, -35], [-65, -40], [-66, -46], [-66, -52], [-68, -55],
      [-73, -54], [-75, -48], [-74, -42], [-71, -33], [-70, -20], [-76, -14],
      [-81, -5], [-80, 2], [-77, 8],
    ]);

    // 4. Europe & Scandinavia
    drawSmoothLandmass(ctx, [
      [-9, 36], [-9, 43], [-2, 43], [3, 42], [6, 44], [8, 48],
      [8, 54], [12, 57], [10, 60], [5, 62], [15, 68], [25, 71],
      [31, 70], [28, 65], [22, 60], [18, 55], [20, 54], [25, 54],
      [30, 55], [35, 50], [30, 45], [28, 42], [23, 40], [20, 40],
      [15, 41], [15, 38], [10, 38], [5, 36], [-9, 36],
    ]);

    // British Isles
    drawSmoothLandmass(ctx, [[-5, 50], [1, 51], [1, 58], [-4, 58], [-5, 50]]);
    drawSmoothLandmass(ctx, [[-10, 51], [-6, 52], [-6, 55], [-10, 54], [-10, 51]]);

    // Italy
    drawSmoothLandmass(ctx, [[10, 44], [12, 42], [16, 41], [18, 40], [16, 38], [15, 40], [12, 44]]);

    // 5. Africa
    drawSmoothLandmass(ctx, [
      [-17, 28], [-10, 35], [0, 36], [10, 37], [25, 32], [32, 31],
      [34, 28], [36, 23], [43, 12], [51, 11], [46, 5], [40, -3],
      [40, -10], [35, -20], [32, -28], [28, -34], [20, -35], [18, -34],
      [15, -28], [12, -18], [9, -5], [5, 4], [2, 6], [-4, 5],
      [-10, 5], [-15, 11], [-17, 15], [-17, 28],
    ]);

    // Madagascar
    drawSmoothLandmass(ctx, [[44, -12], [50, -13], [49, -25], [44, -25], [44, -12]]);

    // 6. Eurasia & Northern Asia
    drawSmoothLandmass(ctx, [
      [35, 60], [50, 65], [60, 70], [80, 73], [100, 75], [125, 73],
      [140, 72], [160, 70], [175, 66], [180, 65], [170, 60], [150, 58],
      [140, 52], [135, 45], [130, 40], [122, 38], [120, 32], [118, 24],
      [108, 20], [105, 18], [100, 15], [98, 8], [104, 1], [102, 10],
      [98, 18], [90, 22], [88, 21], [82, 16], [80, 10], [77, 8],
      [75, 12], [72, 18], [68, 24], [72, 30], [75, 34], [82, 32],
      [88, 26], [90, 22], [65, 25], [60, 25], [55, 25], [50, 30],
      [45, 30], [35, 30], [35, 36], [40, 40], [50, 42], [55, 38],
      [60, 38], [35, 60],
    ]);

    // Arabian Peninsula
    drawSmoothLandmass(ctx, [
      [35, 28], [43, 28], [52, 25], [60, 22], [55, 15], [45, 12],
      [42, 14], [35, 25], [35, 28],
    ]);

    // Japan
    drawSmoothLandmass(ctx, [
      [130, 32], [135, 34], [140, 38], [142, 44], [140, 45], [132, 38], [130, 32],
    ]);

    // 7. Australia & New Zealand
    drawSmoothLandmass(ctx, [
      [114, -22], [120, -18], [130, -14], [138, -12], [142, -10],
      [145, -15], [150, -22], [153, -28], [150, -35], [142, -38],
      [135, -36], [125, -34], [115, -32], [113, -26], [114, -22],
    ]);

    // New Zealand
    drawSmoothLandmass(ctx, [
      [168, -36], [178, -38], [176, -46], [166, -46], [168, -36],
    ]);
  };

  // Canvas 1: Continent Alpha Mask (Color: Pure White fill for crisp clay relief)
  const canvas1 = document.createElement('canvas');
  canvas1.width = width;
  canvas1.height = height;
  const ctx1 = canvas1.getContext('2d')!;
  ctx1.clearRect(0, 0, width, height);
  ctx1.fillStyle = '#FFFFFF';
  drawAllContinents(ctx1);

  // Canvas 2: Dilated Coastline Drop Shadow Mask
  const canvas2 = document.createElement('canvas');
  canvas2.width = width;
  canvas2.height = height;
  const ctx2 = canvas2.getContext('2d')!;
  ctx2.clearRect(0, 0, width, height);
  ctx2.fillStyle = '#FFFFFF';
  ctx2.strokeStyle = '#FFFFFF';
  ctx2.lineWidth = 14;
  ctx2.lineJoin = 'round';
  drawAllContinents(ctx2);

  const continentMap = new THREE.CanvasTexture(canvas1);
  continentMap.wrapS = THREE.RepeatWrapping;
  continentMap.wrapT = THREE.ClampToEdgeWrapping;

  const shadowMap = new THREE.CanvasTexture(canvas2);
  shadowMap.wrapS = THREE.RepeatWrapping;
  shadowMap.wrapT = THREE.ClampToEdgeWrapping;

  return { continentMap, shadowMap };
}

export default function SignInPage() {
  const mountRef = useRef<HTMLDivElement>(null);

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [operatorId, setOperatorId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── 3D MATTE-CLAY PLANET EARTH SCENE (MIPOGG.COM STYLE) ──
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 2. Camera Setup (FOV 34, positioned to frame Earth at right)
    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      50
    );
    camera.position.set(0, 0, 10.5);
    camera.lookAt(0, 0, 0);

    // 3. Studio Diffuse Lighting for Matte Clay Finish (MIPOGG.COM Lighting Theory)
    // Deep crimson/wine ambient light fills shadows softly
    const ambientLight = new THREE.AmbientLight(0x5a1028, 1.4);
    scene.add(ambientLight);

    // Key Light: Upper-left soft white directional light illuminating the Earth curvature
    const keyLight = new THREE.DirectionalLight(0xfff5ee, 2.4);
    keyLight.position.set(-4.0, 3.8, 4.5);
    scene.add(keyLight);

    // Warm Sunset Peach Rim Light: From lower-right, matching the background gradient glow
    const rimLight = new THREE.DirectionalLight(0xfcb59f, 2.2);
    rimLight.position.set(4.5, -2.2, -1.0);
    scene.add(rimLight);

    // Subtle front-center fill light
    const fillLight = new THREE.DirectionalLight(0xffd1dc, 0.7);
    fillLight.position.set(0.0, -2.5, 3.5);
    scene.add(fillLight);

    // 4. Root Earth Group
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // Generate high-resolution procedural continent alpha masks
    const { continentMap, shadowMap } = createEarthTextures();

    // ── LAYER A: Ocean Sphere (radius = 1.68, velvety matte crimson #9E1236) ──
    const oceanGeo = new THREE.SphereGeometry(1.68, 64, 64);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: '#9E1236',
      emissive: '#380412',
      emissiveIntensity: 0.30,
      roughness: 0.88,
      metalness: 0.0,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    earthGroup.add(oceanMesh);

    // ── LAYER B: Coastline Drop-Shadow Layer (radius = 1.692, deep shadow #480516) ──
    const shadowGeo = new THREE.SphereGeometry(1.692, 64, 64);
    const shadowMat = new THREE.MeshStandardMaterial({
      color: '#480516',
      alphaMap: shadowMap,
      transparent: true,
      alphaTest: 0.03,
      roughness: 0.90,
      metalness: 0.0,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    earthGroup.add(shadowMesh);

    // ── LAYER C: Raised 3D Continents Relief (radius = 1.708, matte ruby-rose #D62A54) ──
    const continentGeo = new THREE.SphereGeometry(1.708, 64, 64);
    const continentMat = new THREE.MeshStandardMaterial({
      color: '#D62A54',
      alphaMap: continentMap,
      transparent: true,
      alphaTest: 0.03,
      roughness: 0.84,
      metalness: 0.0,
      depthWrite: true,
    });
    const continentMesh = new THREE.Mesh(continentGeo, continentMat);
    earthGroup.add(continentMesh);

    // Subtle 23° axial tilt and initial rotation for instant continent visibility on page load
    const initialRotY = -0.85;
    const axialTiltZ = -0.22;
    oceanMesh.rotation.y = initialRotY;
    shadowMesh.rotation.y = initialRotY;
    continentMesh.rotation.y = initialRotY;
    oceanMesh.rotation.z = axialTiltZ;
    shadowMesh.rotation.z = axialTiltZ;
    continentMesh.rotation.z = axialTiltZ;

    // ── SECTION 2.3: 32 Surface-Nestled Rim Cluster Spheres ──
    // 3 Matte Tones strictly adhering to clay finish (zero metallic grey/silver)
    const matteColors = {
      cream: new THREE.Color('#FFF1F2'),      // 25% Matte Pearl Cream
      rose: new THREE.Color('#E11D48'),       // 45% Matte Arterial Rose
      burgundy: new THREE.Color('#3B0718'),   // 30% Matte Deep Burgundy
    };

    const sharedSphereGeo = new THREE.SphereGeometry(1, 32, 32);

    // 4 Arc Sectors hugging outer silhouette tightly just like mipogg.com:
    // 1. Top-Left: 120°-165° (white & rose clusters)
    // 2. Top-Right: 30°-80° (cream, rose, burgundy)
    // 3. Bottom-Right: 295°-345° (burgundy & rose)
    // 4. Bottom-Left: 210°-250° (rose & burgundy)
    const sectors = [
      { minDeg: 120, maxDeg: 165, count: 9 },  // Top-left limb
      { minDeg: 30, maxDeg: 80, count: 9 },    // Top-right limb
      { minDeg: 295, maxDeg: 345, count: 8 },  // Bottom-right limb
      { minDeg: 210, maxDeg: 250, count: 6 },  // Bottom-left limb
    ];

    const clusterSpheres: { mesh: THREE.Mesh; baseAngle: number; radius: number; dist: number }[] = [];

    sectors.forEach((sec, secIdx) => {
      for (let i = 0; i < sec.count; i++) {
        const frac = sec.count > 1 ? i / (sec.count - 1) : 0.5;
        const deg = sec.minDeg + frac * (sec.maxDeg - sec.minDeg) + (Math.random() - 0.5) * 6;
        const rad = (deg * Math.PI) / 180;

        const sphereRadius = 0.09 + Math.random() * 0.14;
        const dist = 1.66 + Math.random() * 0.12;
        // Keep z tightly bound to outer limb so it never blocks the continent face
        const z = (Math.random() - 0.5) * 0.45;

        const rColor = (i + secIdx * 3) % 10;
        let c: THREE.Color;
        if (rColor < 3) c = matteColors.cream;
        else if (rColor < 7) c = matteColors.rose;
        else c = matteColors.burgundy;

        const mat = new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.86,
          metalness: 0.0,
        });

        const sMesh = new THREE.Mesh(sharedSphereGeo, mat);
        sMesh.scale.setScalar(sphereRadius);
        sMesh.position.set(Math.cos(rad) * dist, Math.sin(rad) * dist, z);
        earthGroup.add(sMesh);

        clusterSpheres.push({ mesh: sMesh, baseAngle: rad, radius: sphereRadius, dist });
      }
    });

    // ── SECTION 2.4: Delicate Distant Ambient Micro-Dots ──
    // Strictly placed in open space (never overlapping left form text!) in luminous soft tones
    const microDots: { mesh: THREE.Mesh; baseY: number; freq: number; phase: number; amp: number }[] = [];
    const ambientPastels = [
      new THREE.Color('#FFF1F2'),
      new THREE.Color('#FECDD3'),
      new THREE.Color('#FED7AA'),
    ];

    for (let i = 0; i < 20; i++) {
      const microRadius = 0.02 + Math.random() * 0.035;
      // Keep x away from the left text column (x > 0.4 or y outside +/- 1.8)
      const mx = 0.4 + Math.random() * 3.4;
      const my = (Math.random() * 4.4 - 2.2);
      const mz = -1.2 + Math.random() * 1.8;

      const color = ambientPastels[i % ambientPastels.length];
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.86,
        metalness: 0.0,
      });

      const mMesh = new THREE.Mesh(sharedSphereGeo, mat);
      mMesh.scale.setScalar(microRadius);
      mMesh.position.set(mx, my, mz);
      scene.add(mMesh);

      microDots.push({
        mesh: mMesh,
        baseY: my,
        freq: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        amp: 0.04 + Math.random() * 0.05,
      });
    }

    // ── Pointer Parallax Tracking ──
    const mouse = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = Math.max(-1, Math.min(1, nx));
      mouse.targetY = Math.max(-1, Math.min(1, ny));
    };
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    // ── Responsive Layout & Resize ──
    const updateLayout = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width === 0 || height === 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      // Position Earth group on desktop to balance with borderless editorial text column
      if (width >= 900) {
        earthGroup.position.set(1.78, -0.05, 0);
        earthGroup.scale.set(1.0, 1.0, 1.0);
      } else {
        earthGroup.position.set(0, 0.40, 0);
        const scaleFactor = Math.min(0.85, Math.max(0.68, width / 900));
        earthGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
      }
    };

    const resizeObserver = new ResizeObserver(() => updateLayout());
    resizeObserver.observe(container);
    updateLayout();

    // ── Animation Loop ──
    let animationFrameId: number;
    let startTime = performance.now();
    let isTabVisible = document.visibilityState === 'visible';

    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isTabVisible) return;

      const elapsed = (now - startTime) / 1000;

      // Section 2.2: Rotate the Earth slowly (rotation.y += 0.0022)
      const rotSpeed = prefersReducedMotion ? 0.0006 : 0.0022;
      oceanMesh.rotation.y += rotSpeed;
      shadowMesh.rotation.y += rotSpeed;
      continentMesh.rotation.y += rotSpeed;

      // Smooth pointer parallax
      mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
      mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

      const maxParallax = prefersReducedMotion ? 0.04 : 0.22;
      earthGroup.rotation.y = mouse.currentX * maxParallax;
      earthGroup.rotation.x = -mouse.currentY * maxParallax * 0.70;

      // Gentle vertical sinusoidal bobbing for ambient micro-dots
      if (!prefersReducedMotion) {
        microDots.forEach((dot) => {
          dot.mesh.position.y = dot.baseY + Math.sin(elapsed * dot.freq + dot.phase) * dot.amp;
        });
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver.disconnect();

      oceanGeo.dispose();
      shadowGeo.dispose();
      continentGeo.dispose();
      sharedSphereGeo.dispose();
      oceanMat.dispose();
      shadowMat.dispose();
      continentMat.dispose();
      continentMap.dispose();
      shadowMap.dispose();

      clusterSpheres.forEach((c) => {
        if (Array.isArray(c.mesh.material)) c.mesh.material.forEach((m) => m.dispose());
        else c.mesh.material.dispose();
      });

      microDots.forEach((d) => {
        if (Array.isArray(d.mesh.material)) d.mesh.material.forEach((m) => m.dispose());
        else d.mesh.material.dispose();
      });

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Form Handlers ──
  const handleAutofillDemo = () => {
    soundEngine.playButtonClick();
    setOperatorId('PLX-AIIMS-01');
    setPasskey('PLEXUS-2026');
    if (authMode === 'signup') {
      setConfirmPasskey('PLEXUS-2026');
    }
    setErrorMsg('');
  };

  // ── Route Transition Navigation (Smooth 350ms Fade) ──
  const navigateWithFade = (targetHash: string) => {
    soundEngine.playButtonClick();
    setIsExiting(true);
    setTimeout(() => {
      window.location.hash = targetHash;
    }, 350);
  };

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId.trim()) {
      setErrorMsg('Please enter an Operator ID');
      soundEngine.playButtonClick();
      return;
    }
    if (!passkey) {
      setErrorMsg('Please enter a Security Passkey');
      soundEngine.playButtonClick();
      return;
    }
    if (authMode === 'signup' && passkey !== confirmPasskey) {
      setErrorMsg('Passkeys do not match');
      soundEngine.playButtonClick();
      return;
    }

    setErrorMsg('');
    setIsVerifying(true);
    soundEngine.playButtonClick();

    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      soundEngine.playSeparationChord();

      // Hold verified feedback for 400ms, then trigger smooth 350ms fade transition into Story Stage 1 (#/)
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          window.location.hash = '#/';
        }, 350);
      }, 400);
    }, 450);
  };

  return (
    <div
      className="plexus-mipogg-bg"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 50,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isExiting ? 'none' : 'auto',
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        /* Autofill styling override to preserve dark luxury frosted glass in WebKit */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #FFFFFF !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(45, 6, 18, 0.95) inset !important;
          box-shadow: 0 0 0px 1000px rgba(45, 6, 18, 0.95) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .signin-input:focus {
          border-color: rgba(255, 241, 242, 0.75) !important;
          background: rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 0 16px rgba(255, 241, 242, 0.22);
        }

        @media (max-width: 900px) {
          .signin-viewport-grid {
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            overflow-y: auto !important;
            padding: 80px 24px 40px !important;
          }
          .signin-card-container {
            width: 100% !important;
            max-width: 400px !important;
            margin: 0 !important;
          }
          .signin-orb-wrapper {
            position: fixed !important;
            opacity: 0.60 !important;
          }
        }
      `}</style>

      {/* ── TOP-LEFT: Logo Badge [P] (Section 3.2) ── */}
      <div
        onClick={() => navigateWithFade('#/')}
        title="Return to Story Landing"
        style={{
          position: 'absolute',
          top: '26px',
          left: '32px',
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.10)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.70)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
          transition: 'all 0.2s ease',
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: '20px',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
          }}
        >
          P
        </span>
      </div>

      {/* ── TOP-RIGHT: Pill "SKIP TO WORKSPACE ↗" (Section 3.2) ── */}
      <button
        type="button"
        data-testid="skip-signin-btn"
        onClick={() => navigateWithFade('#/workspace/map')}
        style={{
          position: 'absolute',
          top: '26px',
          right: '32px',
          background: 'rgba(255, 255, 255, 0.94)',
          color: '#3B0718',
          border: 'none',
          borderRadius: '999px',
          padding: '10px 22px',
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          cursor: 'pointer',
          zIndex: 30,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.18)',
          transition: 'all 0.18s ease',
        }}
      >
        SKIP TO WORKSPACE ↗
      </button>

      {/* ── SUBTLE EDITORIAL PLUS CROSSES (+) (MIPOGG.COM ATMOSPHERE) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '22%',
          right: '12%',
          color: 'rgba(255, 255, 255, 0.22)',
          fontSize: '20px',
          fontWeight: 300,
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        +
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '64%',
          right: '20%',
          color: 'rgba(255, 255, 255, 0.18)',
          fontSize: '16px',
          fontWeight: 300,
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        +
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '46%',
          left: '46%',
          color: 'rgba(255, 255, 255, 0.14)',
          fontSize: '17px',
          fontWeight: 300,
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        +
      </div>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '8%',
          color: 'rgba(255, 255, 255, 0.16)',
          fontSize: '18px',
          fontWeight: 300,
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        +
      </div>

      {/* ── 3D SCENE: Matte-Clay Planet Earth Canvas (Section 2) ── */}
      <div
        ref={mountRef}
        className="signin-orb-wrapper"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ── MAIN VIEWPORT FLEX CONTAINER ── */}
      <div
        className="signin-viewport-grid"
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          width: '100vw',
          height: '100vh',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        {/* ── LEFT-SIDE: Clean Borderless Editorial Sign-In / Sign-Up (Section 3.1) ── */}
        <div
          className="signin-card-container"
          data-testid="signin-card"
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: '400px',
            marginLeft: '9vw',
          }}
        >
          {/* Section 3.2: Clean Sign In | Sign Up Translucent Pill Toggle above Headline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '999px',
                padding: '3px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMsg('');
                  soundEngine.playButtonClick();
                }}
                className="mode-toggle-btn"
                style={{
                  background: authMode === 'signin' ? '#FFFFFF' : 'transparent',
                  color: authMode === 'signin' ? '#3B0718' : 'rgba(255, 241, 242, 0.85)',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'all 0.18s ease',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMsg('');
                  soundEngine.playButtonClick();
                }}
                className="mode-toggle-btn"
                style={{
                  background: authMode === 'signup' ? '#FFFFFF' : 'transparent',
                  color: authMode === 'signup' ? '#3B0718' : 'rgba(255, 241, 242, 0.85)',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'all 0.18s ease',
                }}
              >
                Sign Up
              </button>
            </div>

            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10.5px',
                color: '#FDA4AF',
                letterSpacing: '0.12em',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              NODE AUTHENTICATION
            </span>
          </div>

          {/* Section 3.2: 48px White Editorial Headline */}
          <h1
            style={{
              fontSize: '48px',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              margin: '0 0 12px 0',
            }}
          >
            {authMode === 'signin' ? (
              <>
                Enter the<br />Plexus Mesh.
              </>
            ) : (
              <>
                Join the<br />Plexus Mesh.
              </>
            )}
          </h1>

          {/* Section 3.2: Subtitle */}
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.45,
              color: 'rgba(255, 241, 242, 0.75)',
              margin: '0 0 28px 0',
            }}
          >
            Autonomous 25-hospital platelet logistics across Delhi-NCR.
          </p>

          {errorMsg && (
            <div
              style={{
                background: 'rgba(225, 29, 72, 0.35)',
                border: '1px solid rgba(244, 63, 94, 0.6)',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                color: '#FFE4E6',
                marginBottom: '16px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuthenticate}>
            {/* Input 1: Operator ID */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="operator-test-id"
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10.5px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#FBCFE8',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                HOSPITAL OPERATOR ID
              </label>
              <input
                id="operator-test-id"
                type="text"
                data-testid="test-id-input"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="PLX-AIIMS-01"
                className="signin-input"
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  borderRadius: '12px',
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  outline: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  boxSizing: 'border-box',
                  transition: 'all 0.18s ease',
                }}
              />
            </div>

            {/* Input 2: Security Passkey */}
            <div style={{ marginBottom: authMode === 'signup' ? 14 : 16 }}>
              <label
                htmlFor="security-passkey"
                style={{
                  display: 'block',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10.5px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#FBCFE8',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                SECURITY PASSKEY
              </label>
              <input
                id="security-passkey"
                type="password"
                data-testid="passkey-input"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="••••••••••••"
                className="signin-input"
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  borderRadius: '12px',
                  padding: '0 16px',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  outline: 'none',
                  fontFamily: "'JetBrains Mono', monospace",
                  boxSizing: 'border-box',
                  transition: 'all 0.18s ease',
                }}
              />
            </div>

            {/* Input 3: Confirm Passkey (Only in Sign Up Mode) */}
            {authMode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="confirm-passkey"
                  style={{
                    display: 'block',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10.5px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: '#FBCFE8',
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  CONFIRM SECURITY PASSKEY
                </label>
                <input
                  id="confirm-passkey"
                  type="password"
                  data-testid="confirm-passkey-input"
                  value={confirmPasskey}
                  onChange={(e) => setConfirmPasskey(e.target.value)}
                  placeholder="••••••••••••"
                  className="signin-input"
                  style={{
                    width: '100%',
                    height: '48px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    borderRadius: '12px',
                    padding: '0 16px',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    outline: 'none',
                    fontFamily: "'JetBrains Mono', monospace",
                    boxSizing: 'border-box',
                    transition: 'all 0.18s ease',
                  }}
                />
              </div>
            )}

            {/* Section 3.2: One-Click Judge Test ID Pill */}
            <div
              data-testid="autofill-test-id-btn"
              onClick={handleAutofillDemo}
              title="Click to auto-fill judge test credentials"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.10)',
                border: '1px dashed rgba(255, 241, 242, 0.40)',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '11px',
                color: '#FFE4E6',
                cursor: 'pointer',
                marginBottom: '24px',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={14} color="#FDE047" strokeWidth={2.4} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                ⚡ Auto-Fill Judge Test ID (PLX-AIIMS-01)
              </span>
            </div>

            {/* Section 3.2: Primary White Pill CTA */}
            <button
              type="submit"
              data-testid="signin-submit-btn"
              disabled={isVerifying}
              style={{
                width: '100%',
                height: '50px',
                background: isVerified ? '#059669' : '#FFFFFF',
                color: isVerified ? '#FFFFFF' : '#3B0718',
                fontWeight: 600,
                fontSize: '14px',
                borderRadius: '999px',
                border: 'none',
                cursor: isVerifying ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 12px 30px rgba(45, 6, 20, 0.35)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {isVerified ? (
                <>
                  <CheckCircle2 size={17} strokeWidth={2.5} color="#FFFFFF" />
                  <span>● NODE VERIFIED: AIIMS TRAUMA</span>
                </>
              ) : isVerifying ? (
                <>
                  <Shield size={17} strokeWidth={2.2} />
                  <span>Verifying Node Certificate...</span>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <UserPlus size={16} strokeWidth={2.4} />
                  <span>Register Node  →</span>
                </>
              ) : (
                <>
                  <span>Authenticate Node  →</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
