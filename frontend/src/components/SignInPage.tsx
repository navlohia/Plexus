import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { setSession, parseOperatorCredentials } from '../portal/session';
import rawHospitals from '../world/hospitals.json';

interface SignInPageProps {
  onAuthenticated?: () => void;
}

// ---------------------------------------------------------------------------
// 3D MIPOGG Dynamic Living Earth & Orbiting Celestial Swarm
// ---------------------------------------------------------------------------
interface ParticleData {
  id: string;
  type: 'orange' | 'mauve-pop' | 'mauve-dark' | 'mauve-pale' | 'mauve-pale-light';
  radius: number;
  targetScale: number;
  curScale: number;
  delay: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  anchor: THREE.Vector3;
  floatSpeed: number;
  ampX: number;
  ampY: number;
  ampZ: number;
  phase: number;
}

interface TrailParticleData {
  type: 'orange' | 'mauve-pop' | 'mauve-dark' | 'mauve-pale';
  radius: number;
  targetScale: number;
  curScale: number;
  anchor: THREE.Vector3;
  floatSpeed: number;
  ampX: number;
  ampY: number;
  phase: number;
}

interface BgParticleData {
  type: 'mauve-pop' | 'mauve-dark' | 'mauve-pale' | 'orange';
  radius: number;
  targetScale: number;
  curScale: number;
  pos: THREE.Vector3;
  floatSpeed: number;
  ampX: number;
  ampY: number;
  phase: number;
}

const MipoggEarthScene: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const globeMeshRef = useRef<THREE.Mesh>(null);
  const surfaceMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const trailMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const bgMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Mouse parallax interpolation
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Globe dimensions matching MIPOGG slide 5
  const globeR = isMobile ? 1.05 : 1.34;

  // Load official MIPOGG studio matcaps & vector world outline map
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const worldTex = loader.load('/textures/world.png');
    worldTex.wrapS = THREE.RepeatWrapping;
    worldTex.colorSpace = THREE.SRGBColorSpace;

    const mauvePop = loader.load('/textures/mauve-pop.png');
    mauvePop.colorSpace = THREE.SRGBColorSpace;

    const mauveDark = loader.load('/textures/mauve-dark.png');
    mauveDark.colorSpace = THREE.SRGBColorSpace;

    const mauvePale = loader.load('/textures/mauve-pale.png');
    mauvePale.colorSpace = THREE.SRGBColorSpace;

    const mauvePaleLight = loader.load('/textures/mauve-pale-light.png');
    mauvePaleLight.colorSpace = THREE.SRGBColorSpace;

    const orange = loader.load('/textures/orange.png');
    orange.colorSpace = THREE.SRGBColorSpace;

    return {
      mauvePop,
      mauveDark,
      mauvePale,
      mauvePaleLight,
      orange,
      world: worldTex,
    };
  }, []);

  const materials = useMemo(() => {
    return {
      world: new THREE.MeshMatcapMaterial({
        matcap: textures.mauvePop,
        map: textures.world,
      }),
      'mauve-pop': new THREE.MeshMatcapMaterial({ matcap: textures.mauvePop }),
      'mauve-dark': new THREE.MeshMatcapMaterial({ matcap: textures.mauveDark }),
      'mauve-pale': new THREE.MeshMatcapMaterial({ matcap: textures.mauvePale }),
      'mauve-pale-light': new THREE.MeshMatcapMaterial({ matcap: textures.mauvePaleLight }),
      orange: new THREE.MeshMatcapMaterial({ matcap: textures.orange }),
    };
  }, [textures]);

  const sharedSphereGeo = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);

  // Surface cluster particles (MIPOGG clustered colony on right horizon & signature hero spheres)
  const particles = useMemo(() => {
    const list: ParticleData[] = [];
    const count = isMobile ? 28 : 50;

    // Palette distribution matching MIPOGG: orange peach accents, pale lavender pearls, deep velvet darks, pop purples
    const typePool: ParticleData['type'][] = [
      'orange',
      'mauve-pale',
      'mauve-pale',
      'mauve-pale-light',
      'mauve-pop',
      'mauve-pop',
      'mauve-dark',
      'mauve-dark',
    ];

    for (let i = 0; i < count; i++) {
      let type = typePool[i % typePool.length];
      let r = 0.038 + (i % 8) * 0.016;
      let phi = (Math.random() - 0.5) * Math.PI * 0.85; // Latitude -75..75 deg
      let theta = (Math.random() * 0.9 - 0.2) * Math.PI; // Longitude biased to right horizon

      // Exact signature hero spheres observed in MIPOGG slide 5
      if (i === 0) {
        // 1. Signature Hero Peach Sphere on middle-left equator
        type = 'orange';
        r = isMobile ? 0.18 : 0.23;
        phi = -0.02;
        theta = -0.88 * Math.PI; // Positioned right on the left contour facing text
      } else if (i === 1) {
        // 2. Large Deep Dark Plum sphere on upper right
        type = 'mauve-dark';
        r = isMobile ? 0.16 : 0.22;
        phi = 0.32;
        theta = 0.18 * Math.PI;
      } else if (i === 2) {
        // 3. Large Alabaster Pearl on lower right
        type = 'mauve-pale';
        r = isMobile ? 0.15 : 0.20;
        phi = -0.42;
        theta = 0.28 * Math.PI;
      } else if (i === 3) {
        // 4. Vibrant Pop Violet sphere
        type = 'mauve-pop';
        r = isMobile ? 0.14 : 0.18;
        phi = -0.15;
        theta = 0.38 * Math.PI;
      } else if (i === 4) {
        // 5. Secondary Warm Peach sphere on upper crest
        type = 'orange';
        r = isMobile ? 0.12 : 0.15;
        phi = 0.58;
        theta = 0.08 * Math.PI;
      } else if (i === 5) {
        // 6. Secondary Deep Dark Plum on lower rim
        type = 'mauve-dark';
        r = isMobile ? 0.12 : 0.16;
        phi = -0.62;
        theta = 0.12 * Math.PI;
      } else if (i === 6) {
        // 7. Pale pearl nestled next to hero peach
        type = 'mauve-pale';
        r = 0.09;
        phi = -0.14;
        theta = -0.82 * Math.PI;
      }

      const dist = globeR + r * 0.94;
      const x = dist * Math.cos(phi) * Math.cos(theta);
      const y = dist * Math.sin(phi);
      const z = dist * Math.cos(phi) * Math.sin(theta);

      list.push({
        id: `p-${i}`,
        type,
        radius: r,
        targetScale: r,
        curScale: 0.001,
        delay: i * 0.018,
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.006),
        anchor: new THREE.Vector3(x, y, z),
        floatSpeed: 0.85 + (i % 6) * 0.16,
        ampX: 0.014 + (i % 4) * 0.005,
        ampY: 0.016 + (i % 3) * 0.006,
        ampZ: 0.014 + (i % 4) * 0.005,
        phase: (i * 0.65) % (Math.PI * 2),
      });
    }

    return list;
  }, [globeR, isMobile]);

  // Trail stream drifting left into negative space
  const trailParticles = useMemo(() => {
    const list: TrailParticleData[] = [];
    const count = isMobile ? 6 : 14;
    const types: TrailParticleData['type'][] = ['orange', 'mauve-pale', 'mauve-dark', 'mauve-pop'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const r = 0.032 + (i % 4) * 0.015;
      const x = -globeR - 0.35 - (i * 0.16) - Math.random() * 0.35;
      const y = (Math.sin(i * 1.15) * 0.95) + (Math.random() - 0.5) * 0.25;
      const z = (Math.cos(i * 0.85) * 0.45) + (Math.random() - 0.5) * 0.2;

      list.push({
        type,
        radius: r,
        targetScale: r,
        curScale: 0.001,
        anchor: new THREE.Vector3(x, y, z),
        floatSpeed: 0.6 + (i % 3) * 0.18,
        ampX: 0.035 + (i % 3) * 0.012,
        ampY: 0.045 + (i % 4) * 0.015,
        phase: i * 0.75,
      });
    }

    return list;
  }, [globeR, isMobile]);

  // Deep ambient cosmic background particles
  const bgParticles = useMemo(() => {
    if (isMobile) return [];
    const list: BgParticleData[] = [];
    const count = 18;
    const types: BgParticleData['type'][] = ['mauve-pop', 'mauve-dark', 'mauve-pale', 'orange'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const r = 0.10 + Math.random() * 0.16;
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * 9;
      const z = -14 - Math.random() * 8;

      list.push({
        type,
        radius: r,
        targetScale: r,
        curScale: 0.001,
        pos: new THREE.Vector3(x, y, z),
        floatSpeed: 0.32 + Math.random() * 0.3,
        ampX: 0.18 + Math.random() * 0.25,
        ampY: 0.22 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    return list;
  }, [isMobile]);

  // 60 FPS Physics Simulation & Organic Living Buoyancy
  const rotAxis = useMemo(() => new THREE.Vector3(0.12, 0.5, 0).normalize(), []);

  // Initialize globe rotation to show Africa and Eurasia
  useEffect(() => {
    if (globeMeshRef.current) {
      globeMeshRef.current.rotation.y = 2.4;
      globeMeshRef.current.rotation.x = 0.22;
    }
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Smooth cursor parallax with damped lerp
    mouseRef.current.x = THREE.MathUtils.lerp(mouseRef.current.x, mouseRef.current.targetX, 0.05);
    mouseRef.current.y = THREE.MathUtils.lerp(mouseRef.current.y, mouseRef.current.targetY, 0.05);

    // Subtle 3D group parallax
    if (groupRef.current) {
      groupRef.current.rotation.y = mouseRef.current.x * 0.08;
      groupRef.current.rotation.x = -mouseRef.current.y * 0.06;
    }

    // 1. Rotate the central globe smoothly on its tilted axis
    if (globeMeshRef.current) {
      globeMeshRef.current.rotateOnAxis(rotAxis, 0.0022);
    }

    // 2. Physics & Fluid Buoyancy on Clustered Surface Spheres
    const G = 0.0026;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const mesh = surfaceMeshRefs.current[i];
      if (!mesh) continue;

      // Staggered smooth blooming entrance
      if (t > p.delay) {
        p.curScale = THREE.MathUtils.lerp(p.curScale, p.targetScale, 0.065);
        mesh.scale.setScalar(p.curScale);
      }

      // Gravitational pull towards center
      const toCenter = p.pos.clone().negate().normalize();
      p.vel.addScaledVector(toCenter, G);

      // Gentle anchor restoring spring so the cluster maintains its organic archipelago shape
      const toAnchor = p.anchor.clone().sub(p.pos);
      p.vel.addScaledVector(toAnchor, 0.0045);

      // Apply velocity and fluid viscosity damping
      p.pos.add(p.vel);
      p.vel.multiplyScalar(0.92);

      // Solid collision constraint with globe surface
      const distFromCenter = p.pos.length();
      const minSurface = globeR + p.radius * 0.94;
      if (distFromCenter < minSurface) {
        p.pos.normalize().multiplyScalar(minSurface);
        const norm = p.pos.clone().normalize();
        const vDotN = p.vel.dot(norm);
        if (vDotN < 0) {
          p.vel.addScaledVector(norm, -vDotN * 1.15);
        }
      }

      // Sphere-to-sphere collision & soft repulsion
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const delta = p.pos.clone().sub(p2.pos);
        const dist = delta.length();
        const minDist = p.radius + p2.radius;
        if (dist < minDist && dist > 0.0001) {
          const overlap = (minDist - dist) * 0.5;
          const norm = delta.normalize();
          p.pos.addScaledVector(norm, overlap * 0.65);
          p2.pos.addScaledVector(norm, -overlap * 0.65);

          p.vel.addScaledVector(norm, overlap * 0.04);
          p2.vel.addScaledVector(norm, -overlap * 0.04);
        }
      }

      // Organic liquid micro-buoyancy (breathing life)
      const floatX = Math.cos(t * p.floatSpeed + p.phase) * p.ampX;
      const floatY = Math.sin(t * p.floatSpeed * 1.1 + p.phase) * p.ampY;
      const floatZ = Math.cos(t * p.floatSpeed * 0.8 + p.phase) * p.ampZ;

      mesh.position.set(p.pos.x + floatX, p.pos.y + floatY, p.pos.z + floatZ);
    }

    // 3. Floating Left Trail Stream
    for (let i = 0; i < trailParticles.length; i++) {
      const tp = trailParticles[i];
      const mesh = trailMeshRefs.current[i];
      if (!mesh) continue;

      tp.curScale = THREE.MathUtils.lerp(tp.curScale, tp.targetScale, 0.06);
      mesh.scale.setScalar(tp.curScale);

      const fx = Math.cos(t * tp.floatSpeed + tp.phase) * tp.ampX;
      const fy = Math.sin(t * tp.floatSpeed * 1.15 + tp.phase) * tp.ampY;
      mesh.position.set(tp.anchor.x + fx, tp.anchor.y + fy, tp.anchor.z);
    }

    // 4. Ambient Deep Background Dust
    for (let i = 0; i < bgParticles.length; i++) {
      const bp = bgParticles[i];
      const mesh = bgMeshRefs.current[i];
      if (!mesh) continue;

      bp.curScale = THREE.MathUtils.lerp(bp.curScale, bp.targetScale, 0.04);
      mesh.scale.setScalar(bp.curScale);

      const fx = Math.cos(t * bp.floatSpeed + bp.phase) * bp.ampX;
      const fy = Math.sin(t * bp.floatSpeed * 0.9 + bp.phase) * bp.ampY;
      mesh.position.set(bp.pos.x + fx, bp.pos.y + fy, bp.pos.z);
    }
  });

  // Framing position: Shifted right to [2.22, -0.05, 0] to match MIPOGG's exact 72% composition
  const groupPos: [number, number, number] = isMobile ? [0.15, -0.65, -0.4] : [2.22, -0.05, 0];

  return (
    <group ref={groupRef} position={groupPos}>
      {/* Central Living Globe with MIPOGG continent outline map */}
      <mesh ref={globeMeshRef}>
        <sphereGeometry args={[globeR, 64, 64]} />
        <primitive object={materials.world} attach="material" />
      </mesh>

      {/* Clustered Surface Spheres */}
      {particles.map((p, idx) => (
        <mesh
          key={p.id}
          ref={(el: THREE.Mesh | null) => {
            surfaceMeshRefs.current[idx] = el;
          }}
          geometry={sharedSphereGeo}
          material={materials[p.type]}
        />
      ))}

      {/* Floating Trail Particles Drifting Left */}
      {trailParticles.map((tp, idx) => (
        <mesh
          key={`trail-${idx}`}
          ref={(el: THREE.Mesh | null) => {
            trailMeshRefs.current[idx] = el;
          }}
          geometry={sharedSphereGeo}
          material={materials[tp.type]}
        />
      ))}

      {/* Ambient Deep Space Particles */}
      {bgParticles.map((bp, idx) => (
        <mesh
          key={`bg-${idx}`}
          ref={(el: THREE.Mesh | null) => {
            bgMeshRefs.current[idx] = el;
          }}
          geometry={sharedSphereGeo}
          material={materials[bp.type]}
        />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// SIGN IN PAGE COMPONENT (21st.dev Portal + MIPOGG Crimson Stage)
// ---------------------------------------------------------------------------
export const SignInPage: React.FC<SignInPageProps> = ({ onAuthenticated }) => {
  const [operatorId, setOperatorId] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [selectedHospital, setSelectedHospital] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 1-Click Judge autofill matching Section 2.2
  const handleAutoFillJudge = () => {
    setOperatorId('PLX-AIIMS-01');
    setPasskey('PLEXUS-2026');
    setSelectedHospital('');
  };

  const handleSelectHospital = (code: string) => {
    setSelectedHospital(code);
    if (!code) return;
    const hosp = rawHospitals.find((h) => h.code === code);
    const emailPrefix = hosp
      ? (hosp.code === 'AIM' ? 'aiims' : hosp.code === 'MAX' ? 'max' : hosp.code === 'SFD' ? 'safdarjung' : hosp.code === 'MDT' ? 'medanta' : hosp.code.toLowerCase())
      : code.toLowerCase();
    setOperatorId(`${emailPrefix}@gmail.com`);
    setPasskey('PLEXUS-2026');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveId = operatorId.trim() || 'PLX-AIIMS-01';
    const creds = parseOperatorCredentials(effectiveId);
    const role = creds.role;
    const hospital = creds.hospital || (role === 'hospital' ? 'AIM' : undefined);

    setSession({
      operatorId: effectiveId,
      role,
      hospital,
      demoMode: true,
    });

    if (onAuthenticated) onAuthenticated();

    if (role === 'hospital') {
      window.location.hash = `#/hospital/${hospital || 'AIM'}/today`;
    } else {
      window.location.hash = '#/workspace/map';
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#FFFFFF',
        // MIPOGG Royal Purple Aubergine to Apricot Sunrise Gradient
        background: `
          radial-gradient(55% 65% at 75% 25%, #FCA072 0%, #E86B7B 28%, rgba(130, 46, 184, 0) 72%),
          radial-gradient(45% 50% at 85% 85%, #F98F78 0%, rgba(94, 26, 122, 0) 65%),
          linear-gradient(115deg, #250938 0%, #3B0E54 22%, #581878 46%, #7B28A4 70%, #9C38B8 86%, #E87282 100%)
        `,
      }}
    >
      {/* Scoped CSS for 21st.dev Glass Inputs & Chrome Autofill Override */}
      <style>{`
        @media (max-width: 768px) {
          .signin-left-col {
            padding-left: 24px !important;
            padding-right: 24px !important;
            justify-content: center !important;
          }
        }
        .plexus-21st-input {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          background: rgba(28, 5, 17, 0.48) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          padding: 0 14px;
          color: #FFFFFF !important;
          font-size: 13.5px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .plexus-21st-input::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }
        .plexus-21st-input:focus {
          border-color: rgba(251, 113, 133, 0.65);
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.22);
          background: rgba(38, 7, 23, 0.65) !important;
        }
        .plexus-21st-input:-webkit-autofill,
        .plexus-21st-input:-webkit-autofill:hover,
        .plexus-21st-input:-webkit-autofill:focus,
        .plexus-21st-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0px 1000px #380A20 inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          caret-color: #FFFFFF !important;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      {/* 21st.dev Subtle Concentric Radar Rings Behind Left Form */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {[160, 260, 360, 460, 560, 680].map((size) => (
          <div
            key={size}
            style={{
              position: 'absolute',
              left: '23%',
              top: '52%',
              width: `${size}px`,
              height: `${size}px`,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '1px solid rgba(255, 255, 255, 0.045)',
            }}
          />
        ))}
      </div>

      {/* Top-Left Brand Badge */}
      <div
        onClick={() => (window.location.hash = '#/')}
        style={{
          position: 'absolute',
          top: '34px',
          left: '42px',
          zIndex: 30,
          width: '46px',
          height: '46px',
          borderRadius: '10px',
          border: '1.5px solid rgba(255, 255, 255, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: 700,
          cursor: 'pointer',
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(10px)',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
      >
        P
      </div>

      {/* Top-Right Skip Button */}
      <button
        data-testid="skip-signin-btn"
        onClick={() => (window.location.hash = '#/workspace/map')}
        style={{
          position: 'absolute',
          top: '34px',
          right: '42px',
          zIndex: 30,
          background: 'rgba(255, 255, 255, 0.10)',
          backdropFilter: 'blur(12px)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.24)',
          borderRadius: '999px',
          padding: '10px 22px',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FFFFFF';
          e.currentTarget.style.color = '#380A20';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.10)';
          e.currentTarget.style.color = '#FFFFFF';
        }}
      >
        SKIP TO WORKSPACE →
      </button>

      {/* 3D WebGL Canvas */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        <Canvas camera={{ position: [0, 0, 8], fov: 30 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <MipoggEarthScene />
        </Canvas>
      </div>

      {/* LEFT COLUMN: 21st.dev Modern Animated Sign-In Form */}
      <div
        className="signin-left-col"
        style={{
          position: 'relative',
          zIndex: 20,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 'min(10vw, 130px)',
          pointerEvents: 'none',
        }}
      >
        <form
          data-testid="signin-card"
          autoComplete="off"
          onSubmit={handleSubmit}
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 48px)',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <h1
            style={{
              fontSize: '34px',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              margin: '0 0 6px 0',
              color: '#FFFFFF',
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.72)',
              margin: '0 0 24px 0',
            }}
          >
            Sign in to your Plexus account
          </p>

          {/* Top 1-Click Judge Auth Button (Matches 21st.dev 'Login with Google') */}
          <button
            type="button"
            data-testid="autofill-test-id-btn"
            onClick={handleAutoFillJudge}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.20)';
            }}
          >
            {/* Crisp 4-color Google G icon */}
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z"
              />
            </svg>
            Continue with Judge Test ID
          </button>

          {/* "Sign in as a hospital ▾" Selector per PORTAL_SPEC §2 */}
          <div style={{ marginTop: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <label
                htmlFor="hospital-selector"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.75)',
                  letterSpacing: '0.02em',
                }}
              >
                Sign in as a hospital ▾
              </label>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.45)' }}>Demo accounts</span>
            </div>
            <select
              id="hospital-selector"
              data-testid="hospital-signin-select"
              aria-label="Sign in as a hospital"
              value={selectedHospital}
              onChange={(e) => handleSelectHospital(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(28, 5, 17, 0.55)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.20)',
                color: '#FFFFFF',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#2B0617', color: '#FFF' }}>
                Select a hospital to test portal...
              </option>
              {rawHospitals.map((h) => (
                <option key={h.code} value={h.code} style={{ background: '#2B0617', color: '#FFF' }}>
                  {h.code} — {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dashed 'or' Divider (Matches 21st.dev) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              margin: '20px 0',
            }}
          >
            <div style={{ flex: 1, borderBottom: '1px dashed rgba(255, 255, 255, 0.22)' }} />
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)' }}>or</span>
            <div style={{ flex: 1, borderBottom: '1px dashed rgba(255, 255, 255, 0.22)' }} />
          </div>

          {/* Field 1: Email or Operator ID */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#FFFFFF',
              }}
            >
              Email or Operator ID <span style={{ color: '#F43F5E' }}>*</span>
            </label>
            <input
              className="plexus-21st-input"
              data-testid="test-id-input"
              name="plexus_operator_node_id"
              autoComplete="off"
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="e.g. aiims@gmail.com, max@gmail.com, admin@fmail.com"
            />
            {/* Quick Regex Suggestion Chips */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginTop: '8px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Quick:</span>
              {[
                { label: 'admin@fmail.com', desc: 'Workspace' },
                { label: 'aiims@gmail.com', desc: 'AIIMS' },
                { label: 'max@gmail.com', desc: 'Max' },
                { label: 'safdarjung@gmail.com', desc: 'Safdarjung' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setOperatorId(chip.label);
                    setPasskey('PLEXUS-2026');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.85)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field 2: Password with Interactive Eye Icon */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#FFFFFF',
              }}
            >
              Password <span style={{ color: '#F43F5E' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="plexus-21st-input"
                data-testid="passkey-input"
                name="plexus_operator_passkey"
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter your password"
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? (
                  /* Eye-off icon */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* Eye icon */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Primary Submit Button: 21st.dev Dark Velvet Glass CTA */}
          <button
            type="submit"
            data-testid="signin-submit-btn"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              background: '#230614',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(25, 3, 14, 0.4)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#360B21';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.36)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#230614';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
            }}
          >
            Sign in →
          </button>

          {/* Forgot Password Link */}
          <div style={{ marginTop: '16px' }}>
            <a
              href="#/signin"
              onClick={(e) => {
                e.preventDefault();
                handleAutoFillJudge();
              }}
              style={{
                fontSize: '12.5px',
                color: '#FFB899',
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
