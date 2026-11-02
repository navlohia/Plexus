import { NCR_HOSPITAL_METAS, recalculateHospitalTelemetry } from '../lib/hospitalTelemetry';
import { SWARM_DISCS } from './swarm';

export interface RescueHospital {
  id: string;
  code: string;
  short: string;
  fullName: string;
  coords: [number, number]; // [lng, lat]
  status: 'Shortage' | '<36h Surplus' | 'Optimal';
  statusColor: string; // #E11D48 | #F59E0B | #15997A
  isEndpoint: boolean;
}

// 6 Primary Arterial Express Corridors across Delhi-NCR (matches FlightyTVMapTab.tsx)
export const PRIMARY_EXPRESS_CORRIDORS = [
  { source: 'ND-03', target: 'ND-01', blood: 'O+', units: 8, name: 'South Delhi Apex Arterial (Max Saket to AIIMS)' },
  { source: 'ND-04', target: 'ND-07', blood: 'O+', units: 8, name: 'Trans-Yamuna Expressway (Fortis Noida to GTB)' },
  { source: 'ND-05', target: 'ND-18', blood: 'B+', units: 8, name: 'Dwarka Expressway Corridor (Medanta to Venkateshwar)' },
  { source: 'ND-11', target: 'ND-09', blood: 'A+', units: 12, name: 'Mathura Road Corridor (Apollo Sarita to Lok Nayak)' },
  { source: 'ND-23', target: 'ND-19', blood: 'AB+', units: 6, name: 'Gurugram Supercluster Arterial (Artemis to Paras)' },
  { source: 'ND-14', target: 'ND-10', blood: 'O+', units: 6, name: 'Central Delhi Arterial (BLK-Max to Ganga Ram)' },
];

// Set of hospital IDs that are endpoints of the arterial rescue corridors
export const ARC_ENDPOINT_IDS = new Set<string>([
  'ND-01', 'ND-03', 'ND-04', 'ND-07', 'ND-05', 'ND-18',
  'ND-11', 'ND-09', 'ND-23', 'ND-19', 'ND-14', 'ND-10',
]);

/**
 * Builds the 25 hospital rescue definitions with ground-truth coordinates & baseline status
 */
export function buildRescueHospitals(): RescueHospital[] {
  return Object.entries(NCR_HOSPITAL_METAS).map(([id, meta]) => {
    const tel = recalculateHospitalTelemetry(id);
    const statusColor =
      tel.status === 'Shortage'
        ? '#E11D48'
        : tel.status === '<36h Surplus'
        ? '#F59E0B'
        : '#15997A';

    return {
      id,
      code: tel.code,
      short: tel.name,
      fullName: tel.fullName,
      coords: meta.coords,
      status: tel.status,
      statusColor,
      isEndpoint: ARC_ENDPOINT_IDS.has(id),
    };
  });
}

export const RESCUE_HOSPITALS: RescueHospital[] = buildRescueHospitals();

/**
 * Deterministically pairs the 25 3D swarm discs to the 25 hospitals:
 * Discs are sorted by their x position at progress 0.55.
 * Hospitals are sorted by their longitude (projected x).
 * Disc i corresponds to hospital DISC_TO_HOSPITAL_MAP[i].
 */
export function createDiscToHospitalMapping(): RescueHospital[] {
  // 1. Compute disc x at 0.55
  const discRanks = SWARM_DISCS.map((d, index) => {
    const k = d.driftK[0];
    const ph = d.driftPhase[0];
    const amp = d.driftAmp[0];
    const driftX = Math.sin(0.55 * k + ph) * amp;
    const xAt055 = d.xNorm * 1440 + driftX;
    return { index, xAt055 };
  });

  discRanks.sort((a, b) => a.xAt055 - b.xAt055);

  // 2. Sort hospitals by longitude ascending (West to East)
  const sortedHospitals = [...RESCUE_HOSPITALS].sort((a, b) => a.coords[0] - b.coords[0]);

  // 3. Map[discIndex] = hospital
  const mapping: RescueHospital[] = new Array(25);
  for (let rank = 0; rank < 25; rank++) {
    const discIdx = discRanks[rank].index;
    mapping[discIdx] = sortedHospitals[rank];
  }

  return mapping;
}

export const DISC_TO_HOSPITAL_MAP: RescueHospital[] = createDiscToHospitalMapping();

if (import.meta.env.DEV) {
  if (RESCUE_HOSPITALS.length !== 25) {
    console.error(`[hospitalRescue] Expected 25 rescue hospitals, got ${RESCUE_HOSPITALS.length}`);
  }
  if (DISC_TO_HOSPITAL_MAP.length !== 25) {
    console.error(`[hospitalRescue] Expected 25 mapped discs, got ${DISC_TO_HOSPITAL_MAP.length}`);
  }
}

