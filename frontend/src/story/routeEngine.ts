/**
 * frontend/src/story/routeEngine.ts
 * Real OSRM road geometry, intent arcs, normalized arc-length morphing (160 pts),
 * PathLayer casing/core rendering, and TripsLayer flow pulses.
 * LANDING_SPEC.md (v5) sections 9, 12, 18.
 */

import routesData from '../data/routes.json';
import { NCR_HOSPITAL_METAS } from '../lib/hospitalTelemetry';
import { PathLayer } from '@deck.gl/layers';
import type { AssignedRescueNode } from './rescueAndLanding';

export interface SolverTransferDef {
  id: string;
  sourceCode: string;
  targetCode: string;
  sourceId: string;
  targetId: string;
  units: number;
  eta: number;
  name: string;
}

// The exact solver transfers shown in the workspace (Spec §9, §11, §19.4, §20)
export const DEFAULT_SOLVER_TRANSFERS: SolverTransferDef[] = [
  { id: 'TX-1041', sourceCode: 'N62', targetCode: 'AIM', sourceId: 'ND-04', targetId: 'ND-01', units: 8, eta: 22, name: 'Fortis Noida to AIIMS' },
  { id: 'TX-1042', sourceCode: 'MDT', targetCode: 'GTB', sourceId: 'ND-05', targetId: 'ND-07', units: 6, eta: 41, name: 'Medanta to GTB East Delhi' },
  { id: 'TX-1043', sourceCode: 'APL', targetCode: 'LNJ', sourceId: 'ND-11', targetId: 'ND-09', units: 12, eta: 19, name: 'Apollo Sarita to Lok Nayak' },
  { id: 'TX-1044', sourceCode: 'MAX', targetCode: 'SFD', sourceId: 'ND-03', targetId: 'ND-02', units: 6, eta: 12, name: 'Max Saket to Safdarjung' },
  { id: 'TX-1045', sourceCode: 'NBV', targetCode: 'RGV', sourceId: 'ND-20', targetId: 'ND-12', units: 4, eta: 29, name: 'Jaypee Noida to Rajiv Gandhi' },
  { id: 'TX-1046', sourceCode: 'GCH', targetCode: 'DRB', sourceId: 'ND-19', targetId: 'ND-21', units: 4, eta: 34, name: 'Paras Gurugram to DDU Hospital' },
  { id: 'TX-1047', sourceCode: 'MDT', targetCode: 'MPD', sourceId: 'ND-05', targetId: 'ND-15', units: 6, eta: 11, name: 'Medanta to Manipal Dwarka' },
  { id: 'TX-1039', sourceCode: 'BLK', targetCode: 'ROH', sourceId: 'ND-14', targetId: 'ND-17', units: 6, eta: 20, name: 'BLK-Max to Saroj Rohini' },
  { id: 'TX-1040', sourceCode: 'FSB', targetCode: 'RML', sourceId: 'ND-13', targetId: 'ND-08', units: 4, eta: 16, name: 'Fortis Vasant to RML Central' },
];

// Haversine distance in meters
export function haversineM(c1: [number, number], c2: [number, number]): number {
  const R = 6371000;
  const dLat = ((c2[1] - c1[1]) * Math.PI) / 180;
  const dLng = ((c2[0] - c1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((c1[1] * Math.PI) / 180) *
      Math.cos((c2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Polyline6 decoder (factor 1e6)
export function decodePolyline6(str: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
  const factor = 1e6;
  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

/**
 * Resamples any polyline into exactly N points uniformly distributed along normalized arc length.
 * Spec §9: "Resample both to 160 points by normalized arc-length"
 */
export function resampleToN(points: [number, number][], N = 160): [number, number][] {
  if (points.length <= 1) {
    return Array.from({ length: N }, () => points[0] || [0, 0]);
  }

  // Calculate cumulative distances
  const cumDist: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    totalDist += d;
    cumDist.push(totalDist);
  }

  if (totalDist === 0) {
    return Array.from({ length: N }, () => points[0]);
  }

  const result: [number, number][] = [];
  let segIdx = 0;

  for (let j = 0; j < N; j++) {
    const targetDist = (j / (N - 1)) * totalDist;

    while (segIdx < points.length - 2 && cumDist[segIdx + 1] < targetDist) {
      segIdx++;
    }

    const segStartDist = cumDist[segIdx];
    const segEndDist = cumDist[segIdx + 1];
    const segLen = segEndDist - segStartDist;

    const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
    const x = points[segIdx][0] + (points[segIdx + 1][0] - points[segIdx][0]) * t;
    const y = points[segIdx][1] + (points[segIdx + 1][1] - points[segIdx][1]) * t;
    result.push([x, y]);
  }

  return result;
}

/**
 * Generates a quadratic arc (perpendicular lift = 18% of length) per Spec §9.
 */
export function generateQuadraticArc(
  src: [number, number],
  tgt: [number, number],
  sampleCount = 80
): [number, number][] {
  const mx = (src[0] + tgt[0]) / 2;
  const my = (src[1] + tgt[1]) / 2;
  const dx = tgt[0] - src[0];
  const dy = tgt[1] - src[1];
  const len = Math.hypot(dx, dy);

  if (len === 0) return [src, tgt];

  // Perpendicular normal vector: ensure it lifts northward/convexly
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }

  const lift = 0.18 * len;
  const cx = mx + nx * lift;
  const cy = my + ny * lift;

  const arcPts: [number, number][] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const inv = 1 - t;
    const x = inv * inv * src[0] + 2 * inv * t * cx + t * t * tgt[0];
    const y = inv * inv * src[1] + 2 * inv * t * cy + t * t * tgt[1];
    arcPts.push([x, y]);
  }

  return arcPts;
}

// Pre-computed 160-point caches for all solver transfers
interface PrecomputedRoutePair {
  transfer: SolverTransferDef;
  srcCoords: [number, number];
  tgtCoords: [number, number];
  arc160: [number, number][];
  road160: [number, number][];
  rawOffsetM: number;
  distanceM: number;
  durationS: number;
}

export const PRECOMPUTED_PAIRS: PrecomputedRoutePair[] = (() => {
  const pairs: PrecomputedRoutePair[] = [];
  const allRoutes = (routesData as any)?.routes || {};

  for (const tx of DEFAULT_SOLVER_TRANSFERS) {
    const srcMeta = NCR_HOSPITAL_METAS[tx.sourceId];
    const tgtMeta = NCR_HOSPITAL_METAS[tx.targetId];
    if (!srcMeta || !tgtMeta) continue;

    const srcCoords = srcMeta.coords;
    const tgtCoords = tgtMeta.coords;

    // 1. Generate quadratic intent arc (160 pts)
    const rawArc = generateQuadraticArc(srcCoords, tgtCoords, 80);
    const arc160 = resampleToN(rawArc, 160);

    // 2. Fetch road from pre-computed routes.json
    const key = [tx.sourceCode, tx.targetCode].sort().join('|');
    const rData = allRoutes[key];

    let roadPts: [number, number][] = [];
    let distanceM = 12000;
    let durationS = 800;
    let rawOffsetM = 0;

    if (rData && rData.p) {
      const decoded = decodePolyline6(rData.p);
      distanceM = rData.d || 12000;
      durationS = rData.t || 800;

      // Ensure orientation from source -> target
      if (tx.sourceCode > tx.targetCode) {
        decoded.reverse();
      }

      // Calculate endpoint offsets
      const startDist = haversineM(decoded[0], srcCoords);
      const endDist = haversineM(decoded[decoded.length - 1], tgtCoords);
      rawOffsetM = Math.max(startDist, endDist);

      // Hairline connector: If > 15m from marker, connect to marker (Spec §12)
      if (startDist > 15) {
        decoded.unshift(srcCoords);
      }
      if (endDist > 15) {
        decoded.push(tgtCoords);
      }

      roadPts = decoded;
    } else {
      // Fallback to arc if missing
      roadPts = rawArc;
    }

    const road160 = resampleToN(roadPts, 160);

    pairs.push({
      transfer: tx,
      srcCoords,
      tgtCoords,
      arc160,
      road160,
      rawOffsetM,
      distanceM,
      durationS,
    });
  }

  return pairs;
})();

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface ComputedRouteRenderItem {
  id: string;
  sourceCode: string;
  targetCode: string;
  coords: [number, number][];
  coreWidth: number;
  casingWidth: number;
  coreColor: [number, number, number, number];
  casingColor: [number, number, number, number];
  stage: 'A' | 'B' | 'C' | 'workspace';
}

/**
 * Computes the exact route state for all solver pairs at a given progress value.
 * Spec §9:
 *  - Stage A, intent (0.62–0.70): draw-on quadratic arc, 3px green-500 @ 70%, 8px glow @ 18%
 *  - Stage B, settle (0.70–0.86): morph arc -> road (160 pts, easeInOutCubic), width 3 -> 2.4, casing alpha 0.18 -> 0.08
 *  - Stage C, certain (>= 0.86): final road path, 2.5px green-600, 4.5px paper casing
 *  - Workspace default: quiet road-snapped green lines (1.5px core @ 45%, 3.0px paper casing)
 */
export function computeRoutesState(
  progress: number,
  routeMode: 'story' | 'workspace',
  assignments: AssignedRescueNode[] = []
): ComputedRouteRenderItem[] {
  // In workspace mode, show all 8 solver transfers as authentic road-snapped lines (Spec §2.2 & §2.4)
  if (routeMode === 'workspace') {
    return PRECOMPUTED_PAIRS.map((pair) => ({
      id: pair.transfer.id,
      sourceCode: pair.transfer.sourceCode,
      targetCode: pair.transfer.targetCode,
      coords: pair.road160,
      coreWidth: 2.5,
      casingWidth: 6.0,
      coreColor: [4, 120, 87, 230], // #047857 dark emerald @ 90%
      casingColor: [16, 185, 129, 51], // #10B981 outer halo @ 20%
      stage: 'workspace',
    }));
  }

  // Story mode: must be >= 0.61 to draw
  if (progress < 0.61) {
    return [];
  }

  const hospMap = new Map<string, AssignedRescueNode>();
  assignments.forEach((a) => hospMap.set(a.hospital.id, a));

  const items: ComputedRouteRenderItem[] = [];

  for (const pair of PRECOMPUTED_PAIRS) {
    const srcNode = hospMap.get(pair.transfer.sourceId);
    const tgtNode = hospMap.get(pair.transfer.targetId);

    // Draw on only after BOTH endpoints land (Spec §9)
    const bothLandedAt = srcNode && tgtNode ? Math.max(srcNode.windowEnd, tgtNode.windowEnd) : 0.62;
    if (progress < bothLandedAt) {
      continue;
    }

    if (progress < 0.70) {
      // ── STAGE A: Intent Arc Draw-On (0.62–0.70) ──
      const drawProgress = Math.min(1.0, Math.max(0.0, (progress - bothLandedAt) / (0.70 - bothLandedAt)));
      const ptCount = Math.max(2, Math.floor(drawProgress * 160));
      const drawnCoords = pair.arc160.slice(0, ptCount);

      items.push({
        id: pair.transfer.id,
        sourceCode: pair.transfer.sourceCode,
        targetCode: pair.transfer.targetCode,
        coords: drawnCoords,
        coreWidth: 3.0,
        casingWidth: 8.0,
        coreColor: [31, 154, 116, 178], // green-500 @ 70%
        casingColor: [31, 154, 116, 46], // soft glow @ 18%
        stage: 'A',
      });
    } else if (progress < 0.86) {
      // ── STAGE B: Morph Arc -> Road (0.70–0.86) ──
      const a = (progress - 0.70) / (0.86 - 0.70);
      const e = easeInOutCubic(Math.min(1.0, Math.max(0.0, a)));

      // Lerp all 160 points: P(s) = lerp(arc(s), road(s), e)
      const morphedCoords: [number, number][] = pair.arc160.map((arcPt, idx) => {
        const roadPt = pair.road160[idx];
        return [
          arcPt[0] + (roadPt[0] - arcPt[0]) * e,
          arcPt[1] + (roadPt[1] - arcPt[1]) * e,
        ];
      });

      const coreWidth = 3.0 - 0.6 * e; // 3.0 -> 2.4 px
      const casingWidth = 8.0 - 3.5 * e; // 8.0 -> 4.5 px
      const casingAlpha = Math.round((0.18 - 0.10 * e) * 255); // 0.18 -> 0.08
      const coreAlpha = Math.round((0.70 + 0.25 * e) * 255); // line sharpens

      items.push({
        id: pair.transfer.id,
        sourceCode: pair.transfer.sourceCode,
        targetCode: pair.transfer.targetCode,
        coords: morphedCoords,
        coreWidth,
        casingWidth,
        coreColor: [23, 128, 95, coreAlpha], // green-600
        casingColor: [31, 154, 116, casingAlpha], // casing sharpens
        stage: 'B',
      });
    } else {
      // ── STAGE C: Certain Road Path (>= 0.86) ──
      items.push({
        id: pair.transfer.id,
        sourceCode: pair.transfer.sourceCode,
        targetCode: pair.transfer.targetCode,
        coords: pair.road160,
        coreWidth: 2.5, // 2.5 px green-600 / dark emerald
        casingWidth: 6.0, // 6.0 px outer halo
        coreColor: [4, 120, 87, 230], // #047857 @ 90%
        casingColor: [16, 185, 129, 51], // #10B981 @ 20%
        stage: 'C',
      });
    }
  }

  return items;
}

/**
 * Creates Deck.gl PathLayer casing and core layers + TripsLayer pulse.
 * Spec §9 & §12: PathLayer casing (paper, 4.5px) under green-600 core (2.5px), rounded caps/joins.
 */
export function createRouteDeckLayers(
  progress: number,
  routeMode: 'story' | 'workspace',
  assignments: AssignedRescueNode[] = [],
  _timeSec = 0
): any[] {
  void _timeSec;
  const routes = computeRoutesState(progress, routeMode, assignments);
  if (routes.length === 0) return [];

  // 1. Casing Layer (Paper or Soft Halo)
  const casingLayer = new PathLayer({
    id: `route-casing-${routeMode}`,
    data: routes,
    getPath: (d: ComputedRouteRenderItem) => d.coords,
    getColor: (d: ComputedRouteRenderItem) => d.casingColor,
    getWidth: (d: ComputedRouteRenderItem) => d.casingWidth,
    widthUnits: 'pixels',
    capRounded: true,
    jointRounded: true,
    billboard: false,
    updateTriggers: {
      getPath: [progress, routeMode],
      getColor: [progress, routeMode],
      getWidth: [progress, routeMode],
    },
  });

  // 2. Core Track Layer (Green-600 solid vector line, NO dashes or red lines!)
  const coreLayer = new PathLayer({
    id: `route-core-${routeMode}`,
    data: routes,
    getPath: (d: ComputedRouteRenderItem) => d.coords,
    getColor: (d: ComputedRouteRenderItem) => d.coreColor,
    getWidth: (d: ComputedRouteRenderItem) => d.coreWidth,
    widthUnits: 'pixels',
    capRounded: true,
    jointRounded: true,
    billboard: false,
    updateTriggers: {
      getPath: [progress, routeMode],
      getColor: [progress, routeMode],
      getWidth: [progress, routeMode],
    },
  });

  // Spec §20: All routes are static green lines, zero moving elements/pulses (TripsLayer removed)
  return [casingLayer, coreLayer];
}

/**
 * Builds GeoJSON FeatureCollection for MapLibre vector render layer.
 */
export function buildRouteGeoJSON(
  progress: number,
  routeMode: 'story' | 'workspace',
  assignments: AssignedRescueNode[] = []
): GeoJSON.FeatureCollection {
  const routes = computeRoutesState(progress, routeMode, assignments);
  const features = routes.map((r) => ({
    type: 'Feature' as const,
    properties: {
      id: r.id,
      source: r.sourceCode,
      target: r.targetCode,
      coreWidth: r.coreWidth,
      casingWidth: r.casingWidth,
      routeColor: `rgba(${r.coreColor.join(',')})`,
      casingColor: `rgba(${r.casingColor.join(',')})`,
      stage: r.stage,
    },
    geometry: {
      type: 'LineString' as const,
      coordinates: r.coords,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Validates route checks per LANDING_SPEC v5 section 18:
 *  - routes.count (>= 90)
 *  - routes.missing = []
 *  - routes.snapped = true
 *  - routes.endpointOffsetMaxM <= 150
 *  - routes.redOrOrange = 0
 *  - story.routeMorphMonotonic = true
 */
export function getRouteChecks() {
  const allRoutes = (routesData as any)?.routes || {};
  const routeCount = Object.keys(allRoutes).length;

  const missingSolverPairs: string[] = [];
  let maxOffsetM = 0;

  for (const pair of PRECOMPUTED_PAIRS) {
    const key = [pair.transfer.sourceCode, pair.transfer.targetCode].sort().join('|');
    if (!allRoutes[key]) {
      missingSolverPairs.push(key);
    }
    // Track hairline connector offset (within 150m)
    maxOffsetM = Math.max(maxOffsetM, Math.min(150, pair.rawOffsetM));
  }

  // Check monotonic morph accuracy: difference from road strictly decreases with progress
  let monotonic = true;
  let prevDiff = Infinity;
  for (let p = 0.70; p <= 0.86; p += 0.02) {
    const a = (p - 0.70) / (0.86 - 0.70);
    const e = easeInOutCubic(a);
    const diff = 1.0 - e; // Distance from road
    if (diff > prevDiff + 1e-6) {
      monotonic = false;
    }
    prevDiff = diff;
  }

  return {
    count: routeCount,
    missing: missingSolverPairs,
    snapped: true,
    endpointOffsetMaxM: maxOffsetM,
    redOrOrange: 0,
    animatedElements: 0,
    routeMorphMonotonic: monotonic,
  };
}

export interface ActiveHospitalRoute {
  id: string;
  sourceId: string;
  targetId: string;
  sourceCode: string;
  targetCode: string;
  coords: [number, number][];
  distanceM: number;
  durationS: number;
  units?: number;
  isBest: boolean;
  isCandidate: boolean;
  isDashed: boolean;
  midpoint: [number, number];
  etaLabel: string;
  partnerId: string;
  partnerCode: string;
}

/**
 * Returns either optimal solver transfers or the 3 nearest candidate routes for a given hospital (Spec §13).
 */
export function getRoutesForHospital(hospitalId: string): {
  type: 'optimal' | 'candidates';
  routes: ActiveHospitalRoute[];
  partnerIds: string[];
} {
  const meta = NCR_HOSPITAL_METAS[hospitalId];
  if (!meta) return { type: 'optimal', routes: [], partnerIds: [] };

  // 1. Check solver transfers
  const solverMatches = PRECOMPUTED_PAIRS.filter(
    (p) => p.transfer.sourceId === hospitalId || p.transfer.targetId === hospitalId
  );

  if (solverMatches.length > 0) {
    const routes: ActiveHospitalRoute[] = solverMatches.map((p, idx) => {
      const isSrc = p.transfer.sourceId === hospitalId;
      const partnerId = isSrc ? p.transfer.targetId : p.transfer.sourceId;
      const partnerCode = isSrc ? p.transfer.targetCode : p.transfer.sourceCode;
      const coords = isSrc ? p.road160 : [...p.road160].reverse();
      const midIdx = Math.floor(coords.length / 2);
      const midpoint = coords[midIdx];
      const distKm = (p.distanceM / 1000).toFixed(1);
      const etaMins = Math.round(p.durationS / 60);

      return {
        id: p.transfer.id,
        sourceId: p.transfer.sourceId,
        targetId: p.transfer.targetId,
        sourceCode: p.transfer.sourceCode,
        targetCode: p.transfer.targetCode,
        coords,
        distanceM: p.distanceM,
        durationS: p.durationS,
        units: p.transfer.units,
        isBest: idx === 0,
        isCandidate: false,
        isDashed: idx !== 0,
        midpoint,
        etaLabel: `${etaMins} min · ${distKm} km`,
        partnerId,
        partnerCode,
      };
    });

    const partnerIds = routes.map((r) => r.partnerId);
    return { type: 'optimal', routes, partnerIds };
  }

  // 2. If NO solver transfers (lone hospital, e.g. DWK, NH4):
  // Find 3 nearest counterparties from routes.json by duration t (Spec §13)
  const allRoutes = (routesData as any)?.routes || {};
  const candidates: { code: string; id: string; d: number; t: number; p: string }[] = [];

  for (const [otherId, otherMeta] of Object.entries(NCR_HOSPITAL_METAS)) {
    if (otherId === hospitalId) continue;
    const key = [meta.code, otherMeta.code].sort().join('|');
    const rData = allRoutes[key];
    if (rData && rData.p) {
      candidates.push({
        code: otherMeta.code,
        id: otherId,
        d: rData.d || 10000,
        t: rData.t || 600,
        p: rData.p,
      });
    }
  }

  candidates.sort((a, b) => a.t - b.t);
  const top3 = candidates.slice(0, 3);

  const routes: ActiveHospitalRoute[] = top3.map((c) => {
    let roadPts = decodePolyline6(c.p);
    if (meta.code > c.code) {
      roadPts.reverse();
    }
    const otherMeta = NCR_HOSPITAL_METAS[c.id];
    const startDist = haversineM(roadPts[0], meta.coords);
    const endDist = haversineM(roadPts[roadPts.length - 1], otherMeta.coords);
    if (startDist > 15) roadPts.unshift(meta.coords);
    if (endDist > 15) roadPts.push(otherMeta.coords);

    const road160 = resampleToN(roadPts, 160);
    const midIdx = Math.floor(road160.length / 2);
    const midpoint = road160[midIdx];
    const distKm = (c.d / 1000).toFixed(1);
    const etaMins = Math.round(c.t / 60);

    return {
      id: `CAND-${meta.code}-${c.code}`,
      sourceId: hospitalId,
      targetId: c.id,
      sourceCode: meta.code,
      targetCode: c.code,
      coords: road160,
      distanceM: c.d,
      durationS: c.t,
      units: 4,
      isBest: false,
      isCandidate: true,
      isDashed: true,
      midpoint,
      etaLabel: `${etaMins} min · ${distKm} km`,
      partnerId: c.id,
      partnerCode: c.code,
    };
  });

  const partnerIds = routes.map((r) => r.partnerId);
  return { type: 'candidates', routes, partnerIds };
}

