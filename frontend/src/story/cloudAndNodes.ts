import * as THREE from 'three';

/**
 * Superellipse lens disc geometry per Spec §5 & §7:
 * r(t) = R * |cos t| ^ (2/n)
 * y(t) = T * sign(sin t) * |sin t| ^ (2/n)
 * R = 1, T = 0.22, n = 2.4, 20 radial segments for cloud instances
 */
export function createLensDiscGeometry(radialSegments = 20): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const samples = 32;
  const exponent = 2.0 / 2.4; // 0.8333333333333334

  for (let i = 0; i <= samples; i++) {
    const t = -Math.PI * 0.5 + (Math.PI * i) / samples;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    const r = Math.pow(Math.abs(cosT), exponent);
    const s = sinT >= 0 ? 1 : -1;
    const y = 0.22 * s * Math.pow(Math.abs(sinT), exponent);

    points.push(new THREE.Vector2(Math.max(0, r), y));
  }

  const geometry = new THREE.LatheGeometry(points, radialSegments);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Analytic leave(p) from Spec §7, identical in JS and GLSL:
 * ramp = clamp(dot(p.xz, normalize(vec2(0.8, 0.6))) * 0.5 + 0.5, 0, 1)
 * wob  = 0.5 + 0.5 * sin(3.1 * p.x + 1.7) * sin(2.7 * p.z + 0.6)
 * leave(p) = clamp(0.65 * ramp + 0.35 * wob, 0, 1)
 */
export function calcLeave(x: number, z: number): number {
  const ramp = Math.max(0, Math.min(1, (x * 0.8 + z * 0.6) * 0.5 + 0.5));
  const wob = 0.5 + 0.5 * Math.sin(3.1 * x + 1.7) * Math.sin(2.7 * z + 0.6);
  return Math.max(0, Math.min(1, 0.65 * ramp + 0.35 * wob));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ParticleDef {
  isNode: boolean;
  xLoc: number;
  zLoc: number;
  yLoc: number;
  leaveVal: number;

  targetFlowX: number; // 42vw to 104vw (fraction of viewportW)
  targetFlowY: number; // +-46% H (fraction of viewportH)
  targetFlowZ: number; // -300 to +220 px

  baseRadius: number;  // 3.5 to 9.0 px (7-18 px diameter)
  nodeRadius: number;  // 13.0 to 17.0 px (26-34 px diameter)

  driftKx: number;
  driftKy: number;
  phaseX: number;
  phaseY: number;
  driftAmpX: number;   // 6 to 14 px
  driftAmpY: number;   // 4 to 10 px

  rotSeedX: number;
  rotSeedY: number;
  rotSeedZ: number;
  tumbleSpeedX: number;
  tumbleSpeedY: number;
  tumbleSpeedZ: number;
}

/**
 * Builds deterministic particle definitions: 160 desktop / 90 mobile (Spec §7).
 * First 25 are designated as the nodes (1.6-2x larger, distinguishable).
 * Discs follow curl-noise streamlines sweeping from the platelet toward the stage center.
 */
export function buildParticleDefinitions(isMobile: boolean): ParticleDef[] {
  const count = isMobile ? 90 : 160;
  const rng = mulberry32(1337);
  const particles: ParticleDef[] = [];

  for (let i = 0; i < count; i++) {
    const isNode = i < 25;

    // Distribute surface points across the unit disc using Fibonacci spiral
    const theta = i * 2.3999632;
    const r = Math.sqrt((i + 0.5) / count) * 0.94;
    const xLoc = r * Math.cos(theta);
    const zLoc = r * Math.sin(theta);

    // Compute y on superellipse surface
    const rLen = Math.hypot(xLoc, zLoc);
    const cosT = Math.min(1, Math.pow(rLen, 1.2));
    const t = Math.acos(cosT);
    const yLoc = 0.22 * Math.pow(Math.abs(Math.sin(t)), 0.8333333333333334);

    const leaveVal = calcLeave(xLoc, zLoc);

    // Curl-noise streamline flow from the platelet (x ≈ 0.71) sweeping toward stage center (x ≈ 0.56)
    const s = rng();
    const curlWave = Math.sin(s * 5.2 + i * 0.15) * 0.05;
    const targetFlowX = Math.max(0.44, Math.min(0.98, 0.44 + 0.50 * Math.pow(s, 0.85) + curlWave));
    const targetFlowY = (rng() - 0.5) * 0.82 + Math.cos(s * 3.8 + i * 0.1) * 0.06;
    const targetFlowZ = -280 + rng() * 460;

    // Sizing: cloud 7-18 px diameter (radius 3.5 to 9 px), nodes 1.6-2x larger (22-30 px diameter)
    const baseRadius = 3.5 + rng() * 5.5;
    const nodeRadius = 11.0 + rng() * 4.0; // 22 to 30 px diameter (1.6-2x cloud average)

    // Drift & face-biased slow tumble parameters (disc normals mostly within 65° of camera axis)
    const driftKx = 10 + rng() * 14;
    const driftKy = 8 + rng() * 12;
    const phaseX = rng() * Math.PI * 2;
    const phaseY = rng() * Math.PI * 2;
    const driftAmpX = 6 + rng() * 8;
    const driftAmpY = 4 + rng() * 6;

    // Face-biased rotation seeds and slow tumble:
    // Lathe geometry normal is Y axis in local space. Under rotation X, nz = sin(rotX) * cos(rotY).
    // Easing rotX towards ~60°-75° keeps normals within 65° of camera axis (nz >= 0.422).
    const rotSeedX = THREE.MathUtils.degToRad(28) + (rng() - 0.5) * 0.25;
    const rotSeedY = (rng() - 0.5) * 0.30;
    const rotSeedZ = (rng() - 0.5) * 0.20;
    const tumbleSpeedX = (rng() - 0.5) * 0.35;
    const tumbleSpeedY = (rng() - 0.5) * 0.35;
    const tumbleSpeedZ = (rng() - 0.5) * 0.25;

    particles.push({
      isNode,
      xLoc,
      zLoc,
      yLoc,
      leaveVal,
      targetFlowX,
      targetFlowY,
      targetFlowZ,
      baseRadius,
      nodeRadius,
      driftKx,
      driftKy,
      phaseX,
      phaseY,
      driftAmpX,
      driftAmpY,
      rotSeedX,
      rotSeedY,
      rotSeedZ,
      tumbleSpeedX,
      tumbleSpeedY,
      tumbleSpeedZ,
    });
  }

  return particles;
}

/**
 * Calculates share of discs viewed edge-on (normal angle with camera axis > 75°).
 * Target: edgeOnShare <= 0.12 (Spec §7 & §13).
 */
export function calculateEdgeOnShare(
  particles: ParticleDef[],
  progress: number
): number {
  if (!particles || particles.length === 0) return 0;
  let edgeOnCount = 0;
  const rotX0 = THREE.MathUtils.degToRad(38);

  for (const p of particles) {
    const curRotX = rotX0 + (p.rotSeedX + progress * p.tumbleSpeedX);
    const curRotY = p.rotSeedY + progress * p.tumbleSpeedY;
    // Lathe geometry normal is Y in local space; rotated by Euler XYZ, nz = sin(curRotX) * cos(curRotY)
    const nz = Math.abs(Math.sin(curRotX) * Math.cos(curRotY));
    // If angle between normal and camera axis > 75° (|nz| < 0.2588)
    if (nz < 0.2588) {
      edgeOnCount++;
    }
  }
  return Number((edgeOnCount / particles.length).toFixed(3));
}

/**
 * Computes nodeRingScore: coefficient of variation (stdDev / mean)
 * of node distances from their centroid in Drift. Must be >= 0.25 (Spec §13).
 */
export function calculateNodeRingScore(positions: { x: number; y: number }[]): number {
  if (positions.length < 2) return 0;

  let cx = 0;
  let cy = 0;
  for (const p of positions) {
    cx += p.x;
    cy += p.y;
  }
  cx /= positions.length;
  cy /= positions.length;

  const dists: number[] = [];
  let sumDist = 0;
  for (const p of positions) {
    const d = Math.hypot(p.x - cx, p.y - cy);
    dists.push(d);
    sumDist += d;
  }
  const meanDist = sumDist / dists.length;
  if (meanDist < 0.0001) return 0;

  let sumSqDiff = 0;
  for (const d of dists) {
    sumSqDiff += Math.pow(d - meanDist, 2);
  }
  const stdDev = Math.sqrt(sumSqDiff / dists.length);
  return stdDev / meanDist;
}

