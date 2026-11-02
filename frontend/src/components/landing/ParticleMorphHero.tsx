import { useStoryStore } from '../../store/storyStore';
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import {
  ArrowRight,
  Compass,
  Cpu,
  Flame,
  Layers,
  Radio,
  Thermometer,
} from 'lucide-react';


interface ParticleMorphHeroProps {
  onEnterWorkspace?: (tab?: string) => void;
}

// 25 Ground-Truth Delhi-NCR Hospital Nodes
interface HospitalNode {
  id: string;
  code: string;
  name: string;
  fullName: string;
  zone: string;
  x: number;
  z: number;
  status: 'critical' | 'warning' | 'optimal';
  units: number;
  expiring36h: number;
}

const NCR_HOSPITALS: HospitalNode[] = [
  { id: 'ND-01', code: 'AIM', name: 'AIIMS Trauma', fullName: 'AIIMS Level-1 Apex Trauma', zone: 'Central Delhi', x: -0.35, z: 0.25, status: 'critical', units: 14, expiring36h: 2 },
  { id: 'ND-02', code: 'SFD', name: 'Safdarjung', fullName: 'Safdarjung Multi-Specialty', zone: 'South Delhi', x: -0.48, z: 0.32, status: 'critical', units: 18, expiring36h: 1 },
  { id: 'ND-03', code: 'MAX', name: 'Max Saket', fullName: 'Max Super Speciality Saket', zone: 'South Delhi', x: -0.15, z: 1.15, status: 'warning', units: 42, expiring36h: 8 },
  { id: 'ND-04', code: 'N62', name: 'Fortis Noida', fullName: 'Fortis Hospital Sector 62', zone: 'Noida Hub', x: 1.85, z: 0.15, status: 'optimal', units: 64, expiring36h: 12 },
  { id: 'ND-05', code: 'MDT', name: 'Medanta Hub', fullName: 'Medanta The Medicity', zone: 'Gurugram Supercluster', x: -1.95, z: 1.85, status: 'optimal', units: 88, expiring36h: 16 },
  { id: 'ND-06', code: 'LNJ', name: 'LNJP Central', fullName: 'Lok Nayak Jai Prakash', zone: 'Old Delhi', x: 0.12, z: -0.65, status: 'critical', units: 11, expiring36h: 0 },
  { id: 'ND-07', code: 'GTB', name: 'GTB Hospital', fullName: 'Guru Teg Bahadur East', zone: 'East Delhi', x: 1.15, z: -1.35, status: 'critical', units: 9, expiring36h: 0 },
  { id: 'ND-08', code: 'RML', name: 'RML Hospital', fullName: 'Dr. Ram Manohar Lohia', zone: 'Central Delhi', x: -0.38, z: -0.42, status: 'optimal', units: 48, expiring36h: 6 },
  { id: 'ND-09', code: 'BLK', name: 'BLK-Max Pusa', fullName: 'BLK-Max Super Speciality', zone: 'West Delhi', x: -0.78, z: -0.55, status: 'optimal', units: 52, expiring36h: 9 },
  { id: 'ND-10', code: 'SGR', name: 'Sir Ganga Ram', fullName: 'Sir Ganga Ram Hospital', zone: 'Central Delhi', x: -0.68, z: -0.48, status: 'optimal', units: 45, expiring36h: 7 },
  { id: 'ND-11', code: 'APL', name: 'Apollo Sarita', fullName: 'Indraprastha Apollo', zone: 'South-East Delhi', x: 0.65, z: 0.78, status: 'optimal', units: 76, expiring36h: 14 },
  { id: 'ND-12', code: 'JYP', name: 'Jaypee Noida', fullName: 'Jaypee Hospital Sec-128', zone: 'Noida Expressway', x: 1.95, z: 1.05, status: 'warning', units: 31, expiring36h: 5 },
  { id: 'ND-13', code: 'FTV', name: 'Fortis Vasant', fullName: 'Fortis Flt Lt Rajan Dhall', zone: 'South Delhi', x: -0.82, z: 1.18, status: 'optimal', units: 38, expiring36h: 4 },
  { id: 'ND-14', code: 'ILB', name: 'ILBS Delhi', fullName: 'Institute of Liver & Biliary', zone: 'South Delhi', x: -0.92, z: 1.08, status: 'optimal', units: 34, expiring36h: 3 },
  { id: 'ND-15', code: 'DWK', name: 'Manipal Dwarka', fullName: 'Manipal Hospital Sec-6', zone: 'South-West Delhi', x: -1.75, z: 0.35, status: 'optimal', units: 55, expiring36h: 8 },
  { id: 'ND-16', code: 'NH4', name: 'Narayana Gurugram', fullName: 'Narayana Superspeciality', zone: 'Gurugram', x: -1.55, z: 1.35, status: 'warning', units: 29, expiring36h: 4 },
  { id: 'ND-17', code: 'ART', name: 'Artemis Gurgaon', fullName: 'Artemis Hospital Sec-51', zone: 'Gurugram', x: -1.65, z: 1.95, status: 'optimal', units: 62, expiring36h: 10 },
  { id: 'ND-18', code: 'MHL', name: 'Moolchand Med', fullName: 'Moolchand Medcity', zone: 'South Delhi', x: 0.18, z: 0.42, status: 'optimal', units: 39, expiring36h: 6 },
  { id: 'ND-19', code: 'BTR', name: 'Batra Tughlakabad', fullName: 'Batra Hospital & MRC', zone: 'South Delhi', x: 0.22, z: 1.28, status: 'optimal', units: 33, expiring36h: 5 },
  { id: 'ND-20', code: 'HLY', name: 'Holy Family', fullName: 'Holy Family Okhla', zone: 'South-East Delhi', x: 0.72, z: 0.52, status: 'optimal', units: 41, expiring36h: 6 },
  { id: 'ND-21', code: 'MXP', name: 'Max Patparganj', fullName: 'Max Super Speciality East', zone: 'East Delhi', x: 1.22, z: -0.25, status: 'optimal', units: 47, expiring36h: 7 },
  { id: 'ND-22', code: 'MXS', name: 'Max Shalimar', fullName: 'Max Hospital Shalimar Bagh', zone: 'North Delhi', x: -0.85, z: -1.45, status: 'optimal', units: 44, expiring36h: 6 },
  { id: 'ND-23', code: 'KLS', name: 'Kailash Sec-27', fullName: 'Kailash Hospital Noida', zone: 'Noida Hub', x: 1.62, z: 0.55, status: 'optimal', units: 36, expiring36h: 5 },
  { id: 'ND-24', code: 'MTR', name: 'Metro Noida', fullName: 'Metro Heart Institute', zone: 'Noida Hub', x: 1.52, z: 0.28, status: 'optimal', units: 30, expiring36h: 4 },
  { id: 'ND-25', code: 'DDU', name: 'DDU Hospital', fullName: 'Deen Dayal Upadhyay', zone: 'West Delhi', x: -1.35, z: -0.15, status: 'optimal', units: 32, expiring36h: 3 },
];

// 6 Express Green Highway Corridors
const HIGHWAY_CORRIDORS = [
  { from: 'N62', to: 'AIM', name: 'DND Green Corridor', speed: '11m ETA', blood: 'O+ 8u' },
  { from: 'MAX', to: 'SFD', name: 'Aurobindo Flyway', speed: '08m ETA', blood: 'O- 6u' },
  { from: 'MDT', to: 'RML', name: 'NH-48 Express Wave', speed: '21m ETA', blood: 'B+ 8u' },
  { from: 'JYP', to: 'GTB', name: 'NH-24 Arterial Line', speed: '16m ETA', blood: 'A+ 6u' },
  { from: 'APL', to: 'LNJ', name: 'Mathura Road Intercept', speed: '14m ETA', blood: 'O+ 10u' },
  { from: 'DWK', to: 'AIM', name: 'Airport Tunnel Sprint', speed: '18m ETA', blood: 'AB+ 4u' },
];

// 3D Scene moved to HeroPlateletCanvas.tsx


// ── MAIN LANDING PAGE CONTAINER COMPONENT ──
export const ParticleMorphHero: React.FC<ParticleMorphHeroProps> = ({ onEnterWorkspace }) => {
  const storeProgress = useStoryStore((state) => state.progress);
  const setStoreProgress = useStoryStore((state) => state.setProgress);
  const activeStageFromProgress = (p: number) => (p < 0.25 ? 0 : p < 0.56 ? 1 : p < 0.84 ? 2 : 3);

  const [activeStage, setActiveStage] = useState(() => activeStageFromProgress(storeProgress));
  const [scrollPct, setScrollPct] = useState(() => Math.round(storeProgress * 100));
  const [clockStr, setClockStr] = useState('119:59:42.84');
  const [selectedHospital] = useState<HospitalNode>(NCR_HOSPITALS[0]);

  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis Smooth Scroll Engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    lenis.on('scroll', (e: { progress: number }) => {
      const p = e.progress;
      setStoreProgress(p);
      setScrollPct(Math.round(p * 100));
      setActiveStage(activeStageFromProgress(p));
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  
  useEffect(() => {
    setScrollPct(Math.round(storeProgress * 100));
    setActiveStage(activeStageFromProgress(storeProgress));
  }, [storeProgress]);

  // Live 120-Hour Bio-Clock Timer
  useEffect(() => {
    const start = performance.now();
    const baseMs = (119 * 3600 + 59 * 60 + 42) * 1000;
    const interval = setInterval(() => {
      const elapsed = performance.now() - start;
      const rem = Math.max(0, baseMs - elapsed);
      const hrs = Math.floor(rem / 3600000);
      const mins = Math.floor((rem % 3600000) / 60000);
      const secs = Math.floor((rem % 60000) / 1000);
      const cs = Math.floor((rem % 1000) / 10);
      setClockStr(
        `${String(hrs).padStart(3, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
      );
    }, 45);
    return () => clearInterval(interval);
  }, []);

  // Jump smoothly to any stage
  const jumpToStage = (idx: number) => {
    if (!lenisRef.current) return;
    const stageTargets = [0, 0.3, 0.55, 0.8, 1.0];
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    lenisRef.current.scrollTo(maxScroll * stageTargets[idx], { duration: 1.6 });
  };

  const navigateTo = (hash: string, tab?: string) => {
    if (onEnterWorkspace && tab) {
      onEnterWorkspace(tab);
    }
    window.location.hash = hash;
  };

  return (
    <div
      
      style={{
        position: 'relative',
        width: '100%',
        height: '600vh',
        backgroundColor: 'transparent',
        color: '#F8FAFC',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── 1. FIXED VIEWPORT CONTAINER (ATMOSPHERE + 3D SCENE + TELEMETRY HUD) ── */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {/* Soft Radial Biological Atmosphere Glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(750px circle at 72% 44%, rgba(244, 63, 94, 0.12), transparent 70%), radial-gradient(650px circle at 65% 72%, rgba(16, 185, 129, 0.08), transparent 65%)',
          }}
        />

        {/* Precision Coordinate Background Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* 3D Platelet Canvas is mounted persistent above MapStage in App.tsx */}

        {/* Asymmetrical Left Vignette (Protects Text Readability) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background:
              'linear-gradient(90deg, rgba(6,7,11,0.96) 0%, rgba(6,7,11,0.85) 34%, rgba(6,7,11,0.2) 62%, transparent 100%)',
          }}
        />

        {/* ── TOP NAV BAR (AEROSPACE & CLINICAL TELEMETRY) ── */}
        <header
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '62px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 36px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(6, 7, 11, 0.72)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Logo & Version */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#F43F5E',
                boxShadow: '0 0 16px #F43F5E',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.12em' }}>PLEXUS</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  color: '#64748B',
                  letterSpacing: '0.08em',
                }}
              >
                AUTONOMOUS BIOLOGICS MESH
              </span>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10B981',
              }}
            >
              v2.5 NCR-RADAR
            </span>
          </div>

          {/* Center Real-Time Telemetry Bar */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={12} color="#F8FAFC" /> SOLVER: <strong style={{ color: '#F8FAFC' }}>14.2ms</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>//</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={12} color="#10B981" /> BEACONS: <strong style={{ color: '#10B981' }}>25/25 ACTIVE</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>//</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Thermometer size={12} color="#06B6D4" /> COLD-CHAIN: <strong style={{ color: '#06B6D4' }}>22.0°C AGITATED</strong>
            </span>
          </div>

          {/* Quick Route Switches */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { label: 'Disruption TV', hash: '#/workspace/map', tab: 'map', icon: Radio },
              { label: 'Clinical OS', hash: '#/workspace/dashboard', tab: 'dashboard', icon: Layers },
              { label: 'Stress Lab', hash: '#/workspace/surge', tab: 'surge', icon: Flame },
            ].map((btn) => {
              const IconComp = btn.icon;
              return (
                <button
                  key={btn.label}
                  onClick={() => navigateTo(btn.hash, btn.tab)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    padding: '7px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '5px',
                    color: '#E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <IconComp size={12} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── LEFT 38% ASYMMETRICAL STAGE CONSOLE ── */}
        <div
          style={{
            position: 'absolute',
            top: '72px',
            bottom: '56px',
            left: '52px',
            width: 'min(460px, 42vw)',
            zIndex: 15,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <AnimatePresence mode="wait">
            {/* ── STAGE 0: THE 120-HOUR THROMBOCYTE ── */}
            {activeStage === 0 && (
              <motion.div
                key="stage-0"
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -22, filter: 'blur(8px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ width: '100%' }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#F43F5E',
                    marginBottom: '14px',
                    letterSpacing: '0.12em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F43F5E' }} />
                  01 // THE THROMBOCYTE PARADOX
                </div>

                <h1
                  style={{
                    fontSize: 'clamp(2.5rem, 3.8vw, 3.6rem)',
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: '-0.038em',
                    margin: '0 0 16px 0',
                  }}
                >
                  Autonomous<br />
                  <span style={{ color: '#F43F5E' }}>Biological</span><br />
                  Logistics.
                </h1>

                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: '#94A3B8',
                    margin: '0 0 24px 0',
                  }}
                >
                  Platelets expire in 120 hours. When isolated hospital blood banks operate in silos, apheresis units are incinerated while trauma patients in the next pin code bleed out.
                </p>

                {/* Glass Bio-Timer Box */}
                <div
                  style={{
                    padding: '18px 22px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#94A3B8' }}>
                      BATCH #PLX-8841 [O-NEG]
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10px',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                      22.0°C AGITATED
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#F43F5E',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {clockStr}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      color: '#64748B',
                      marginTop: '6px',
                    }}
                  >
                    MANDATORY AGITATION WINDOW BEFORE CELLULAR COLLAPSE
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => jumpToStage(1)}
                    style={{
                      padding: '14px 24px',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: '#F43F5E',
                      color: '#06070B',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 0 28px rgba(244, 63, 94, 0.4)',
                    }}
                  >
                    SCROLL TO FISSION <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => navigateTo('#/workspace/map', 'map')}
                    style={{
                      padding: '14px 20px',
                      fontSize: '12px',
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(255,255,255,0.05)',
                      color: '#E2E8F0',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    SKIP TO LIVE TV ↗
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STAGE 1: CELLULAR FISSION (BREAKING INTO SPHERES & DISCS) ── */}
            {activeStage === 1 && (
              <motion.div
                key="stage-1"
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -22, filter: 'blur(8px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ width: '100%' }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#F59E0B',
                    marginBottom: '14px',
                    letterSpacing: '0.12em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  02 // CELLULAR FISSION & FEFO
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(2.3rem, 3.4vw, 3.2rem)',
                    fontWeight: 800,
                    lineHeight: 1.06,
                    letterSpacing: '-0.038em',
                    margin: '0 0 16px 0',
                  }}
                >
                  Breaking the<br />
                  <span style={{ color: '#F59E0B' }}>Hospital Silos.</span>
                </h2>

                <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#94A3B8', margin: '0 0 24px 0' }}>
                  As the unit breaks down into individual clinical components, Plexus intercepts inventory in real-time. FEFO transfers units across Delhi-NCR highways before expiry windows collapse.
                </p>

                {/* Regional Spoilage Benchmark Card */}
                <div
                  style={{
                    padding: '20px 22px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      color: '#64748B',
                      marginBottom: '16px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    REGIONAL WASTAGE BENCHMARK (DELHI-NCR)
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ color: '#94A3B8' }}>ISOLATED HOSPITAL SILOS</span>
                      <span style={{ color: '#F43F5E', fontWeight: 600 }}>26.4% SPOILED</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '78%', height: '100%', background: '#F43F5E' }} />
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ color: '#94A3B8' }}>PLEXUS AUTONOMOUS MESH</span>
                      <span style={{ color: '#10B981', fontWeight: 600 }}>0.9% SPOILED</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '7%', height: '100%', background: '#10B981', boxShadow: '0 0 12px #10B981' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STAGE 2: TOPOGRAPHIC RADAR CONVERGENCE ── */}
            {activeStage === 2 && (
              <motion.div
                key="stage-2"
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -22, filter: 'blur(8px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ width: '100%' }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#06B6D4',
                    marginBottom: '14px',
                    letterSpacing: '0.12em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#06B6D4' }} />
                  03 // 25 RADAR BEACONS LOCKED
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(2.3rem, 3.4vw, 3.2rem)',
                    fontWeight: 800,
                    lineHeight: 1.06,
                    letterSpacing: '-0.038em',
                    margin: '0 0 16px 0',
                  }}
                >
                  The Spheres Turn<br />
                  <span style={{ color: '#06B6D4' }}>Into Live Hospitals.</span>
                </h2>

                <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#94A3B8', margin: '0 0 20px 0' }}>
                  Every sphere from the broken platelet snaps into the exact geographic coordinates of Delhi-NCR hospitals. High-speed OSRM green corridors ignite between donor hubs and crisis centers.
                </p>

                {/* Live Corridors List */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      color: '#64748B',
                      marginBottom: '12px',
                    }}
                  >
                    ACTIVE CORRIDORS TRACKED BY THE 14.2ms SOLVER
                  </div>

                  {HIGHWAY_CORRIDORS.slice(0, 3).map((item) => (
                    <div
                      key={item.name}
                      onClick={() => navigateTo('#/workspace/map', 'map')}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#F8FAFC' }}>
                          {item.from} ➔ {item.to} // {item.name}
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                          {item.blood} • {item.speed}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: '#10B981',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        GREEN WAVE
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STAGE 3: LIVE DISRUPTION TV TRANSITION PORTAL ── */}
            {activeStage === 3 && (
              <motion.div
                key="stage-3"
                initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -22, filter: 'blur(8px)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ width: '100%' }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: '#10B981',
                    marginBottom: '14px',
                    letterSpacing: '0.12em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  04 // TRANSITION TO LIVE DISRUPTION TV
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(2.3rem, 3.4vw, 3.2rem)',
                    fontWeight: 800,
                    lineHeight: 1.06,
                    letterSpacing: '-0.038em',
                    margin: '0 0 16px 0',
                  }}
                >
                  Dock into the<br />
                  <span style={{ color: '#10B981' }}>Live TV Operations.</span>
                </h2>

                <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#94A3B8', margin: '0 0 20px 0' }}>
                  The 3D spheres are now live telemetry nodes. Click below to expand the interactive live map terminal with moving couriers and automated dispatch.
                </p>

                {/* Interactive Portal Launcher Card */}
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 7, 11, 0.8) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    boxShadow: '0 0 32px rgba(16, 185, 129, 0.15)',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                      ● LIVE DISRUPTION TV IS READY
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#64748B' }}>
                      25 NODES CONNECTED
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#CBD5E1' }}>
                      <span>Selected Apex Center</span>
                      <strong style={{ color: '#F8FAFC' }}>{selectedHospital.fullName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#CBD5E1' }}>
                      <span>Status</span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: selectedHospital.status === 'critical' ? '#F43F5E' : '#10B981',
                          fontWeight: 600,
                        }}
                      >
                        {selectedHospital.status.toUpperCase()} ({selectedHospital.units} units)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigateTo('#/workspace/map', 'map')}
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: '#10B981',
                      color: '#06070B',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 0 24px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    ENTER FULLSCREEN DISRUPTION TV ↗
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── BOTTOM AEROSPACE TIMELINE BAR ── */}
        <footer
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '48px',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 36px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(6, 7, 11, 0.78)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Coordinates */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Compass size={13} color="#94A3B8" />
            <span>28.5672° N, 77.2100° E // DELHI-NCR ARTERIAL GRID</span>
          </div>

          {/* Interactive Stage Jump Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {[
              { label: '01 THROMBOCYTE', idx: 0 },
              { label: '02 FISSION', idx: 1 },
              { label: '03 RADAR MESH', idx: 2 },
              { label: '04 DISRUPTION TV', idx: 3 },
            ].map((stage) => (
              <button
                key={stage.label}
                onClick={() => jumpToStage(stage.idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  cursor: 'pointer',
                  color: activeStage === stage.idx ? '#10B981' : '#475569',
                  fontWeight: activeStage === stage.idx ? 700 : 400,
                  transition: 'color 0.15s ease',
                }}
              >
                {stage.label}
              </button>
            ))}

            {/* Scroll Progress Bar */}
            <div
              style={{
                width: '100px',
                height: '4px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${scrollPct}%`,
                  height: '100%',
                  background: '#10B981',
                  transition: 'width 0.1s ease-out',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: '#94A3B8',
                width: '36px',
              }}
            >
              {scrollPct}%
            </span>
          </div>

          {/* Direct Launch CTA */}
          <button
            onClick={() => navigateTo('#/workspace/map', 'map')}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              padding: '6px 14px',
              borderRadius: '5px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10B981',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            LAUNCH TV ↗
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ParticleMorphHero;
