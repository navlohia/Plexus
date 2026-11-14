/**
 * fractureSeeds.ts
 * 25 deterministic Lloyd-relaxed Voronoi seed positions inside the unit disc.
 * Used for:
 * 1. Generating the 1024x1024 Voronoi hairline crack texture on the Three.js platelet
 * 2. Positioning the 25 deck.gl swap discs at progress 0.320..0.330
 */

export interface FractureSeed {
  index: number;
  x: number; // normalized -1..1
  z: number; // normalized -1..1
  radius: number; // distance from center sqrt(x^2 + z^2)
}

export const FRACTURE_SEEDS: FractureSeed[] = [
  { index: 0, x: 0.125, z: -0.004, radius: 0.125 },
  { index: 1, x: -0.141, z: 0.124, radius: 0.188 },
  { index: 2, x: 0.000, z: -0.251, radius: 0.251 },
  { index: 3, x: 0.188, z: 0.267, radius: 0.327 },
  { index: 4, x: -0.343, z: -0.094, radius: 0.356 },
  { index: 5, x: 0.349, z: -0.201, radius: 0.403 },
  { index: 6, x: -0.122, z: 0.412, radius: 0.430 },
  { index: 7, x: -0.232, z: -0.394, radius: 0.457 },
  { index: 8, x: 0.446, z: 0.124, radius: 0.463 },
  { index: 9, x: -0.448, z: 0.212, radius: 0.496 },
  { index: 10, x: 0.199, z: -0.481, radius: 0.521 },
  { index: 11, x: 0.175, z: 0.529, radius: 0.557 },
  { index: 12, x: -0.624, z: -0.308, radius: 0.696 },
  { index: 13, x: 0.680, z: -0.194, radius: 0.707 },
  { index: 14, x: -0.378, z: 0.604, radius: 0.713 },
  { index: 15, x: -0.125, z: -0.701, radius: 0.712 },
  { index: 16, x: 0.567, z: 0.434, radius: 0.714 },
  { index: 17, x: -0.728, z: 0.015, radius: 0.728 },
  { index: 18, x: 0.534, z: -0.508, radius: 0.737 },
  { index: 19, x: -0.052, z: 0.743, radius: 0.745 },
  { index: 20, x: -0.457, z: -0.592, radius: 0.748 },
  { index: 21, x: 0.740, z: 0.132, radius: 0.752 },
  { index: 22, x: -0.649, z: 0.394, radius: 0.759 },
  { index: 23, x: 0.213, z: -0.735, radius: 0.765 },
  { index: 24, x: 0.349, z: 0.687, radius: 0.771 },
];

if (import.meta.env.DEV) {
  if (FRACTURE_SEEDS.length !== 25) {
    throw new Error(`[fractureSeeds] Assert failed: expected 25 seeds, got ${FRACTURE_SEEDS.length}`);
  }
}

