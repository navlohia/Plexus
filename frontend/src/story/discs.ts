/**
 * discs.ts (LANDING_SPEC v2)
 * 25 hospital blood bank metadata for Delhi-NCR.
 * Pure 3D instances rendered in the single R3F scene.
 * No deck.gl swap or scatterplot layer.
 */

import { HOSPITAL_NAMES, SWARM_DISCS, SwarmDiscDef } from './swarm';
import { FRACTURE_SEEDS, FractureSeed } from './fractureSeeds';

export interface Disc3DData {
  index: number;
  id: string;
  code: string;
  name: string;
  seed: FractureSeed;
  swarm: SwarmDiscDef;
}

export const DISCS_3D: Disc3DData[] = HOSPITAL_NAMES.map((h, i) => ({
  index: i,
  id: h.id,
  code: h.code,
  name: h.name,
  seed: FRACTURE_SEEDS[i],
  swarm: SWARM_DISCS[i],
}));

if (import.meta.env.DEV) {
  if (DISCS_3D.length !== 25) {
    console.error(`[discs] Assert failed: expected 25 discs, got ${DISCS_3D.length}`);
  }
}
