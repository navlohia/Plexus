import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Biologics3DSceneProps {
  activeSlide?: number;
}

export default function Biologics3DScene({ activeSlide = 0 }: Biologics3DSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef(activeSlide);

  useEffect(() => {
    slideRef.current = activeSlide;
  }, [activeSlide]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);

    /* ── Warm Studio Lighting (MIPOGG Aesthetic) ─────────────── */
    scene.add(new THREE.AmbientLight(0xfff0f2, 1.2));

    const keyLight = new THREE.DirectionalLight(0xffe4e6, 2.8);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfda4af, 1.9);
    fillLight.position.set(-6, -3, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfecdd3, 1.4);
    rimLight.position.set(2, -6, -3);
    scene.add(rimLight);

    const backGlow = new THREE.PointLight(0xffccd5, 1.6, 25);
    backGlow.position.set(3, 2, -4);
    scene.add(backGlow);

    /* ── 1. Iconic Large Central Glossy Sphere (Platelet Core) ── */
    const largeGeo = new THREE.SphereGeometry(1.9, 80, 80);
    const largeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf08080,         // warm salmon/coral
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.98,
      clearcoatRoughness: 0.04,
      reflectivity: 0.9,
    });
    const largeSphere = new THREE.Mesh(largeGeo, largeMat);
    scene.add(largeSphere);

    /* ── 2. Procedural 3D DNA Double Helix Model ──────────────── */
    const dnaGroup = new THREE.Group();

    const helixHeight = 6.2;
    const helixRadius = 0.9;
    const helixTurns = 2.4;
    const steps = 38;

    const rungGeo = new THREE.CylinderGeometry(0.04, 0.04, helixRadius * 2, 16);
    const beadGeo = new THREE.SphereGeometry(0.14, 24, 24);

    const strand1Mat = new THREE.MeshPhysicalMaterial({
      color: 0xfb7185,         // rose
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.95,
      clearcoatRoughness: 0.05,
    });

    const strand2Mat = new THREE.MeshPhysicalMaterial({
      color: 0xe11d48,         // crimson
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 0.95,
      clearcoatRoughness: 0.05,
    });

    const rungMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd1dc,         // blush translucent connection
      roughness: 0.25,
      metalness: 0.02,
      clearcoat: 0.9,
      transmission: 0.25,
      transparent: true,
      opacity: 0.88,
    });

    const dnaNodes: { bead1: THREE.Mesh; bead2: THREE.Mesh; rung: THREE.Mesh; angle: number; y: number }[] = [];

    for (let i = 0; i < steps; i++) {
      const frac = i / (steps - 1);
      const y = (frac - 0.5) * helixHeight;
      const angle = frac * Math.PI * 2 * helixTurns;

      const x1 = Math.cos(angle) * helixRadius;
      const z1 = Math.sin(angle) * helixRadius;

      const x2 = Math.cos(angle + Math.PI) * helixRadius;
      const z2 = Math.sin(angle + Math.PI) * helixRadius;

      // Strand 1 node
      const bead1 = new THREE.Mesh(beadGeo, strand1Mat);
      bead1.position.set(x1, y, z1);
      dnaGroup.add(bead1);

      // Strand 2 node
      const bead2 = new THREE.Mesh(beadGeo, strand2Mat);
      bead2.position.set(x2, y, z2);
      dnaGroup.add(bead2);

      // Connecting rung between strand 1 & 2
      const rung = new THREE.Mesh(rungGeo, rungMat);
      rung.position.set(0, y, 0);
      rung.rotation.z = Math.PI / 2;
      rung.rotation.y = -angle;
      dnaGroup.add(rung);

      dnaNodes.push({ bead1, bead2, rung, angle, y });
    }

    dnaGroup.rotation.z = 0.35; // graceful tilt
    dnaGroup.rotation.x = 0.2;
    scene.add(dnaGroup);

    /* ── 3. Satellite Biologic Spheres ───────────────────────── */
    const satelliteConfigs = [
      { basePos: [-3.6,  2.2, -1.6], r: 0.54, color: 0xfb7185, speed: 0.85, phase: 0.3 },
      { basePos: [ 4.8,  2.6, -2.0], r: 0.50, color: 0xe11d48, speed: 1.05, phase: 1.6 },
      { basePos: [-1.8, -2.9, -2.2], r: 0.44, color: 0xf43f5e, speed: 0.9, phase: 3.2 },
      { basePos: [ 0.9,  3.4, -2.8], r: 0.38, color: 0xfda4af, speed: 1.25, phase: 4.4 },
      { basePos: [ 4.2, -2.6, -2.5], r: 0.48, color: 0xbe123c, speed: 0.75, phase: 2.1 },
      { basePos: [-4.6, -0.6, -2.4], r: 0.46, color: 0xe11d48, speed: 0.95, phase: 5.1 },
      { basePos: [ 5.6,  0.2, -3.8], r: 0.40, color: 0xfb7185, speed: 0.8, phase: 0.8 },
    ];

    const satelliteMeshes: { mesh: THREE.Mesh; cfg: typeof satelliteConfigs[0] }[] = [];
    satelliteConfigs.forEach((cfg) => {
      const geo = new THREE.SphereGeometry(cfg.r, 48, 48);
      const mat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        roughness: 0.2,
        metalness: 0.05,
        clearcoat: 0.92,
        clearcoatRoughness: 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.basePos[0], cfg.basePos[1], cfg.basePos[2]);
      scene.add(mesh);
      satelliteMeshes.push({ mesh, cfg });
    });

    /* ── Choreographed Slide Poses (MIPOGG Scroll Transitions) ── */
    const slidePoses = [
      // Slide 0: Hero / Overview (large coral sphere on right, DNA helix floating alongside)
      {
        largePos: { x: 2.3, y: -0.2, z: 0.2 },
        largeScale: 1.0,
        dnaPos: { x: 3.8, y: 0.3, z: -1.2 },
        dnaRot: { x: 0.25, y: 0, z: 0.38 },
        dnaScale: 0.9,
        cameraPos: { x: 0, y: 0, z: 9.0 },
        cameraRotY: 0,
        satSpread: 1.0,
      },
      // Slide 1: Network at a Glance / Stats (DNA helix rotates forward into profile, large sphere glides down)
      {
        largePos: { x: 1.7, y: -0.6, z: 1.3 },
        largeScale: 1.06,
        dnaPos: { x: 3.1, y: 0.2, z: 0.5 },
        dnaRot: { x: 0.1, y: 1.2, z: 0.22 },
        dnaScale: 1.05,
        cameraPos: { x: -0.3, y: 0.1, z: 8.4 },
        cameraRotY: 0.04,
        satSpread: 1.25,
      },
      // Slide 2: OR-Tools Engine (DNA helix tilts diagonally like a flow vector, satellites cluster)
      {
        largePos: { x: 2.7, y: 0.4, z: -0.5 },
        largeScale: 0.95,
        dnaPos: { x: 2.2, y: -0.5, z: -0.8 },
        dnaRot: { x: -0.4, y: 2.2, z: 0.65 },
        dnaScale: 0.95,
        cameraPos: { x: 0.2, y: -0.1, z: 8.8 },
        cameraRotY: -0.05,
        satSpread: 0.85,
      },
      // Slide 3: Everything you need to know / Accordion (recedes into deep ambient background)
      {
        largePos: { x: 3.4, y: -0.2, z: -1.8 },
        largeScale: 0.80,
        dnaPos: { x: 4.2, y: 0.6, z: -2.4 },
        dnaRot: { x: 0.3, y: 3.1, z: 0.3 },
        dnaScale: 0.75,
        cameraPos: { x: 0.5, y: 0, z: 9.3 },
        cameraRotY: -0.08,
        satSpread: 0.75,
      },
    ];

    /* ── Mouse Parallax ───────────────────────────────────────── */
    let tMX = 0, tMY = 0, cMX = 0, cMY = 0;
    const onMouse = (e: MouseEvent) => {
      tMX = (e.clientX / window.innerWidth - 0.5) * 2;
      tMY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    /* ── Resize Handler ───────────────────────────────────────── */
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ── Animation Loop with Smooth Damping (Lerp) ─────────────── */
    let raf: number;
    let t = 0;

    const curLargePos = { x: 2.3, y: -0.2, z: 0.2 };
    let curLargeScale = 1.0;
    const curDnaPos = { x: 3.8, y: 0.3, z: -1.2 };
    const curDnaRot = { x: 0.25, y: 0, z: 0.38 };
    let curDnaScale = 0.9;
    const curCamPos = { x: 0, y: 0, z: 9.0 };
    let curCamRotY = 0;
    let curSatSpread = 1.0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.008;

      // Mouse smoothing
      cMX += (tMX - cMX) * 0.045;
      cMY += (tMY - cMY) * 0.045;

      const sIdx = Math.max(0, Math.min(slideRef.current, slidePoses.length - 1));
      const target = slidePoses[sIdx];

      // Smooth interpolation toward target slide configuration
      const k = 0.045;
      curLargePos.x += (target.largePos.x - curLargePos.x) * k;
      curLargePos.y += (target.largePos.y - curLargePos.y) * k;
      curLargePos.z += (target.largePos.z - curLargePos.z) * k;
      curLargeScale += (target.largeScale - curLargeScale) * k;

      curDnaPos.x += (target.dnaPos.x - curDnaPos.x) * k;
      curDnaPos.y += (target.dnaPos.y - curDnaPos.y) * k;
      curDnaPos.z += (target.dnaPos.z - curDnaPos.z) * k;
      curDnaRot.x += (target.dnaRot.x - curDnaRot.x) * k;
      curDnaRot.y += (target.dnaRot.y - curDnaRot.y) * k;
      curDnaRot.z += (target.dnaRot.z - curDnaRot.z) * k;
      curDnaScale += (target.dnaScale - curDnaScale) * k;

      curCamPos.x += (target.cameraPos.x - curCamPos.x) * k;
      curCamPos.y += (target.cameraPos.y - curCamPos.y) * k;
      curCamPos.z += (target.cameraPos.z - curCamPos.z) * k;
      curCamRotY += (target.cameraRotY - curCamRotY) * k;
      curSatSpread += (target.satSpread - curSatSpread) * k;

      // 1. Large Sphere float & gentle spin
      const floatY = Math.sin(t * 0.8) * 0.18;
      const floatX = Math.cos(t * 0.45) * 0.08;
      largeSphere.position.set(
        curLargePos.x + floatX,
        curLargePos.y + floatY,
        curLargePos.z
      );
      largeSphere.scale.setScalar(curLargeScale);
      largeSphere.rotation.y += 0.0035;
      largeSphere.rotation.z += 0.0015;

      // 2. DNA Helix continuous axial twist + gentle vertical undulation
      const dnaFloatY = Math.sin(t * 0.95 + 1.2) * 0.15;
      dnaGroup.position.set(
        curDnaPos.x,
        curDnaPos.y + dnaFloatY,
        curDnaPos.z
      );
      dnaGroup.scale.setScalar(curDnaScale);
      dnaGroup.rotation.x = curDnaRot.x + Math.sin(t * 0.5) * 0.05;
      dnaGroup.rotation.y = curDnaRot.y + t * 0.4; // constant smooth helical unwinding
      dnaGroup.rotation.z = curDnaRot.z;

      // Wave ripple traveling along DNA rungs
      dnaNodes.forEach(({ bead1, bead2, rung, angle }, idx) => {
        const wave = Math.sin(t * 2.0 - idx * 0.22) * 0.04;
        const curR = helixRadius + wave;
        const curA = angle + t * 0.15;

        bead1.position.x = Math.cos(curA) * curR;
        bead1.position.z = Math.sin(curA) * curR;

        bead2.position.x = Math.cos(curA + Math.PI) * curR;
        bead2.position.z = Math.sin(curA + Math.PI) * curR;

        rung.rotation.y = -curA;
      });

      // 3. Satellites orbiting and drifting
      const satShiftX = sIdx === 3 ? 1.8 : 0;
      satelliteMeshes.forEach(({ mesh, cfg }) => {
        const satT = t * cfg.speed + cfg.phase;
        const driftX = Math.cos(satT) * 0.3 * curSatSpread;
        const driftY = Math.sin(satT * 1.25) * 0.25 * curSatSpread;
        const driftZ = Math.sin(satT * 0.7) * 0.22;

        mesh.position.set(
          cfg.basePos[0] * curSatSpread + driftX + satShiftX,
          cfg.basePos[1] + driftY,
          cfg.basePos[2] + driftZ
        );
        mesh.rotation.y += 0.008 * cfg.speed;
      });

      // 4. Camera position + mouse parallax tilt
      camera.position.set(
        curCamPos.x + cMX * 0.3,
        curCamPos.y - cMY * 0.22,
        curCamPos.z
      );
      camera.rotation.y = curCamRotY + cMX * 0.05;
      camera.rotation.x = -cMY * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    /* ── Cleanup ──────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
