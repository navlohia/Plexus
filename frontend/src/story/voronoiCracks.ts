import * as THREE from 'three';
import { Delaunay } from 'd3-delaunay';
import { FRACTURE_SEEDS } from './fractureSeeds';

export interface VoronoiCellInfo {
  index: number;
  // Model-space position on the upper lens surface
  center: [number, number, number]; // [x, y, z]
  radius: number;                   // approximate radius of the cell in model space
}

export interface VoronoiCracksData {
  geometry: THREE.BufferGeometry;
  totalVertices: number;
  cells: VoronoiCellInfo[];
}

/**
 * Clips a 2D line segment (p1 -> p2) against circle of radius R
 */
function clipSegmentToCircle(
  p1: [number, number],
  p2: [number, number],
  R = 0.98
): [[number, number], [number, number]] | null {
  const dx = p2[0] - p1[0];
  const dz = p2[1] - p1[1];
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return null;
  const b = 2 * (p1[0] * dx + p1[1] * dz);
  const c = p1[0] * p1[0] + p1[1] * p1[1] - R * R;
  const discr = b * b - 4 * a * c;
  if (discr < 0) return null;
  const sq = Math.sqrt(discr);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  const tMin = Math.max(0, Math.min(t1, t2));
  const tMax = Math.min(1, Math.max(t1, t2));
  if (tMin > 1 || tMax < 0 || tMin >= tMax) return null;
  return [
    [p1[0] + tMin * dx, p1[1] + tMin * dz],
    [p1[0] + tMax * dx, p1[1] + tMax * dz],
  ];
}

/**
 * Calculates surface height y and applies low-frequency harmonic displacement
 * matching createSuperellipsePlateletGeometry (§4)
 */
function getSurfaceY(x: number, z: number, T = 0.22, n = 2.4, eps = 0.005): number {
  const r = Math.min(1.0, Math.hypot(x, z));
  // Exact Section 4 profile on top face (y >= 0)
  // r = R * |cos t|^(2/n), y = T * |sin t|^(2/n) => y = T * (1 - r^n)^(1/n)
  const baseY = T * Math.pow(Math.max(0, 1.0 - Math.pow(r, n)), 1.0 / n);

  // Match the 2-octave low-frequency displacement from createSuperellipsePlateletGeometry
  const oct1 = Math.sin(x * 2.5 + 0.3) * Math.cos(z * 2.5 + 0.5);
  const oct2 = 0.5 * Math.sin(x * 5.0 + 1.1) * Math.cos(z * 5.0 + 0.7);
  const wave = (oct1 + oct2) / 1.5;
  const displacement = wave * 0.012;

  return baseY + displacement * 0.35 + eps;
}

/**
 * Generates Voronoi hairline cracks and cell centroids for the hero platelet
 */
export function buildVoronoiCracks(): VoronoiCracksData {
  const points: [number, number][] = FRACTURE_SEEDS.map((s) => [s.x, s.z]);
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([-1.5, -1.5, 1.5, 1.5]);

  // 1. Deduplicate and clip Voronoi edges
  const edgeMap = new Map<string, [[number, number], [number, number]]>();
  const cellPolygons = Array.from(voronoi.cellPolygons());

  cellPolygons.forEach((poly) => {
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i] as [number, number];
      const b = poly[i + 1] as [number, number];
      const clipped = clipSegmentToCircle(a, b, 0.98);
      if (!clipped) continue;
      const k1 = `${clipped[0][0].toFixed(3)},${clipped[0][1].toFixed(3)}-${clipped[1][0].toFixed(3)},${clipped[1][1].toFixed(3)}`;
      const k2 = `${clipped[1][0].toFixed(3)},${clipped[1][1].toFixed(3)}-${clipped[0][0].toFixed(3)},${clipped[0][1].toFixed(3)}`;
      if (!edgeMap.has(k1) && !edgeMap.has(k2)) {
        edgeMap.set(k1, clipped);
      }
    }
  });

  const rawEdges = Array.from(edgeMap.values());

  // 2. Subdivide each edge ~4x with small perpendicular jitter
  interface SubSegment {
    p1: [number, number, number];
    p2: [number, number, number];
    distFromCenter: number;
  }

  const subSegments: SubSegment[] = [];

  rawEdges.forEach((edge, edgeIdx) => {
    const [pA, pB] = edge;
    const dx = pB[0] - pA[0];
    const dz = pB[1] - pA[1];
    const len = Math.hypot(dx, dz);
    if (len < 0.005) return;

    // Perpendicular vector for organic jitter
    const perpX = -dz / len;
    const perpZ = dx / len;

    const divisions = 4;
    const pts: [number, number, number][] = [];

    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions;
      let x = pA[0] + dx * t;
      let z = pA[1] + dz * t;

      // Interior points get small seeded perpendicular jitter (<= 0.012 amplitude)
      if (i > 0 && i < divisions) {
        const seedVal = Math.sin(edgeIdx * 19.3 + i * 37.1) * 43758.5453;
        const jitter = (seedVal - Math.floor(seedVal) - 0.5) * 0.020;
        x += perpX * jitter;
        z += perpZ * jitter;
      }

      // Constrain inside unit disc
      const r = Math.hypot(x, z);
      if (r > 0.98) {
        x = (x / r) * 0.98;
        z = (z / r) * 0.98;
      }

      const y = getSurfaceY(x, z);
      pts.push([x, y, z]);
    }

    // Connect subdivided points as discrete line segments
    for (let i = 0; i < pts.length - 1; i++) {
      const pt1 = pts[i];
      const pt2 = pts[i + 1];
      const midX = (pt1[0] + pt2[0]) * 0.5;
      const midZ = (pt1[2] + pt2[2]) * 0.5;
      const dist = Math.hypot(midX, midZ);
      subSegments.push({ p1: pt1, p2: pt2, distFromCenter: dist });
    }
  });

  // 3. Sort segments by distance from center ascending (cracks reveal from center to rim)
  subSegments.sort((a, b) => a.distFromCenter - b.distFromCenter);

  // 4. Construct Float32Array for LineSegments (2 vertices = 6 floats per segment)
  const totalVertices = subSegments.length * 2;
  const positions = new Float32Array(totalVertices * 3);

  subSegments.forEach((seg, i) => {
    const base = i * 6;
    positions[base + 0] = seg.p1[0];
    positions[base + 1] = seg.p1[1];
    positions[base + 2] = seg.p1[2];
    positions[base + 3] = seg.p2[0];
    positions[base + 4] = seg.p2[1];
    positions[base + 5] = seg.p2[2];
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0); // starts hidden

  // 5. Calculate cell centroids and radii for all 25 cells
  const cells: VoronoiCellInfo[] = FRACTURE_SEEDS.map((seed, i) => {
    const x = seed.x;
    const z = seed.z;
    const y = getSurfaceY(x, z, 0.22, 2.4, 0.0);

    // Compute approximate cell radius from polygon vertices
    const poly = cellPolygons[i];
    let avgRadius = 0.20;
    if (poly && poly.length > 2) {
      let rSum = 0;
      for (let j = 0; j < poly.length - 1; j++) {
        rSum += Math.hypot(poly[j][0] - x, poly[j][1] - z);
      }
      avgRadius = Math.max(0.12, Math.min(0.26, rSum / (poly.length - 1)));
    }

    return {
      index: i,
      center: [x, y, z],
      radius: avgRadius,
    };
  });

  if (import.meta.env.DEV) {
    if (cells.length !== 25) {
      console.error(`[voronoiCracks] Expected 25 cells, got ${cells.length}`);
    }
  }

  return { geometry, totalVertices, cells };
}

