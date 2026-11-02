import * as THREE from 'three';
import { TOKENS } from './palette';

export interface SwarmDiscDef {
  index: number;
  id: string;
  code: string;
  name: string;
  // Normalized base position: x in [-0.42, 0.42] * W, y in [-0.38, 0.38] * H
  xNorm: number;
  yNorm: number;
  zBase: number; // px [-280 .. +240]
  diameter: number; // px [36 .. 70] at z=0

  // Progress-based drift parameters (8-14 px amplitude)
  driftK: [number, number, number];
  driftPhase: [number, number, number];
  driftAmp: [number, number, number];

  // Progress-based tumble
  tumbleAxis: [number, number, number];
  tumbleSpeed: number;

  // Bud orientation (seeded Euler angles)
  budEuler: [number, number, number];
}

export const HOSPITAL_NAMES: { id: string; code: string; name: string }[] = [
  { id: 'ND-01', code: 'AIM', name: 'AIIMS Trauma' },
  { id: 'ND-02', code: 'SFD', name: 'Safdarjung' },
  { id: 'ND-03', code: 'MAX', name: 'Max Saket' },
  { id: 'ND-04', code: 'N62', name: 'Fortis Noida' },
  { id: 'ND-05', code: 'MDT', name: 'Medanta Hub' },
  { id: 'ND-06', code: 'FTN', name: 'Fortis Okhla' },
  { id: 'ND-07', code: 'GTB', name: 'GTB East Delhi' },
  { id: 'ND-08', code: 'RML', name: 'RML Central' },
  { id: 'ND-09', code: 'LNJ', name: 'Lok Nayak' },
  { id: 'ND-10', code: 'SGR', name: 'Sir Ganga Ram' },
  { id: 'ND-11', code: 'APL', name: 'Apollo Sarita' },
  { id: 'ND-12', code: 'RGV', name: 'Rajiv Gandhi' },
  { id: 'ND-13', code: 'FSB', name: 'Fortis Vasant' },
  { id: 'ND-14', code: 'BLK', name: 'BLK-Max Pusa' },
  { id: 'ND-15', code: 'MPD', name: 'Manipal Dwarka' },
  { id: 'ND-16', code: 'STP', name: 'St. Stephens' },
  { id: 'ND-17', code: 'ROH', name: 'Saroj Rohini' },
  { id: 'ND-18', code: 'DWK', name: 'Venkateshwar' },
  { id: 'ND-19', code: 'GCH', name: 'Paras Gurugram' },
  { id: 'ND-20', code: 'NBV', name: 'Jaypee Noida' },
  { id: 'ND-21', code: 'DRB', name: 'DDU Hospital' },
  { id: 'ND-22', code: 'SDP', name: 'Sanjay Gandhi' },
  { id: 'ND-23', code: 'NH4', name: 'Artemis Hub' },
  { id: 'ND-24', code: 'MXP', name: 'Max Patparganj' },
  { id: 'ND-25', code: 'PRS', name: 'Holy Family' },
];

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Generate 25 deterministic swarm disc configurations with min-distance relaxation
 */
function createSwarmDefinitions(): SwarmDiscDef[] {
  const rng = seededRng(1048576);

  const rawDiscs: SwarmDiscDef[] = HOSPITAL_NAMES.map((h, i) => {
    const xNorm = -0.38 + 0.76 * rng();
    const yNorm = -0.34 + 0.68 * rng();
    const zBase = -280 + 520 * rng();
    const diameter = 38 + 28 * rng(); // 38..66 px

    const driftK: [number, number, number] = [
      18 + 12 * rng(),
      20 + 10 * rng(),
      16 + 14 * rng(),
    ];
    const driftPhase: [number, number, number] = [
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
      rng() * Math.PI * 2,
    ];
    const driftAmp: [number, number, number] = [
      8.5 + 4.5 * rng(), // 8.5..13 px
      8.0 + 5.0 * rng(),
      9.0 + 4.5 * rng(),
    ];

    const tumbleAxis = new THREE.Vector3(
      rng() - 0.5,
      rng() - 0.5,
      rng() - 0.5
    ).normalize();

    const tumbleSpeed = 1.8 + 1.6 * rng();

    const budEuler: [number, number, number] = [
      0.50 + (rng() - 0.5) * 0.7,
      (rng() - 0.5) * 1.2,
      (rng() - 0.5) * 0.6,
    ];

    return {
      index: i,
      id: h.id,
      code: h.code,
      name: h.name,
      xNorm,
      yNorm,
      zBase,
      diameter,
      driftK,
      driftPhase,
      driftAmp,
      tumbleAxis: [tumbleAxis.x, tumbleAxis.y, tumbleAxis.z],
      tumbleSpeed,
      budEuler,
    };
  });

  // Min-distance relaxation (12 iterations)
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < rawDiscs.length; i++) {
      for (let j = i + 1; j < rawDiscs.length; j++) {
        const d1 = rawDiscs[i];
        const d2 = rawDiscs[j];
        const dx = (d1.xNorm - d2.xNorm) * 1200;
        const dy = (d1.yNorm - d2.yNorm) * 800;
        const dz = (d1.zBase - d2.zBase) * 0.6;
        const dist = Math.hypot(dx, dy, dz);
        const minDist = (d1.diameter + d2.diameter) * 0.85;

        if (dist < minDist && dist > 1e-4) {
          const overlap = ((minDist - dist) / dist) * 0.25;
          d1.xNorm += (dx * overlap) / 1200;
          d1.yNorm += (dy * overlap) / 800;
          d1.zBase += dz * overlap;
          d2.xNorm -= (dx * overlap) / 1200;
          d2.yNorm -= (dy * overlap) / 800;
          d2.zBase -= dz * overlap;

          d1.xNorm = Math.max(-0.43, Math.min(0.43, d1.xNorm));
          d1.yNorm = Math.max(-0.38, Math.min(0.38, d1.yNorm));
          d1.zBase = Math.max(-300, Math.min(250, d1.zBase));
          d2.xNorm = Math.max(-0.43, Math.min(0.43, d2.xNorm));
          d2.yNorm = Math.max(-0.38, Math.min(0.38, d2.yNorm));
          d2.zBase = Math.max(-300, Math.min(250, d2.zBase));
        }
      }
    }
  }

  return rawDiscs;
}

export const SWARM_DISCS: SwarmDiscDef[] = createSwarmDefinitions();

if (import.meta.env.DEV) {
  if (SWARM_DISCS.length !== 25) {
    console.error(`[swarm] Assert failed: expected 25 discs, got ${SWARM_DISCS.length}`);
  }
}

/**
 * Depth Cue color calculator:
 * Fades color toward paper (#F7F8FA) with distance z (z from -300 to +250 px).
 * Pure function of z.
 */
export function getDiscColorForZ(z: number): THREE.Color {
  const normZ = Math.max(0, Math.min(1, (z - (-300)) / (250 - (-300))));
  const deepRed = new THREE.Color(TOKENS.platelet.core); // #B82A45
  const paperTone = new THREE.Color('#DFCCD1');          // Faded biological red toward paper
  return paperTone.clone().lerp(deepRed, 0.40 + 0.60 * normZ);
}

