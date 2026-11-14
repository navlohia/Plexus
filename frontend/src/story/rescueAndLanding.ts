import { NCR_HOSPITAL_METAS, recalculateHospitalTelemetry } from '../lib/hospitalTelemetry';
import { createDefaultHospitalNodes } from '../components/workspace/WorkspaceShell';
import { getRealRoadCorridor } from '../lib/delhiRoadCorridors';
import type { ParticleDef } from './cloudAndNodes';

export interface HospitalNodeMeta {
  id: string;
  code: string;
  short: string;
  fullName: string;
  coords: [number, number];
  status: 'Shortage' | '<36h Surplus' | 'Optimal';
  statusColor: string; // #E11D48 | #F59E0B
  isArcEndpoint: boolean;
  windowStart: number;
  windowEnd: number;
}

export interface PrimaryCorridorDef {
  source: string;
  target: string;
  blood: string;
  units: number;
  eta: number;
  name: string;
  isEmergency: boolean;
  semanticType: 'emergency' | 'rebalance' | 'expiry';
  routeColor: string;
}

export const PRIMARY_EXPRESS_CORRIDORS: PrimaryCorridorDef[] = [
  { source: 'ND-03', target: 'ND-01', blood: 'O+', units: 8, eta: 11, name: 'South Delhi Apex Arterial (Max Saket to AIIMS)', isEmergency: true, semanticType: 'emergency', routeColor: '#E11D48' },
  { source: 'ND-04', target: 'ND-07', blood: 'O+', units: 8, eta: 16, name: 'Trans-Yamuna Expressway (Fortis Noida to GTB)', isEmergency: false, semanticType: 'rebalance', routeColor: '#059669' },
  { source: 'ND-05', target: 'ND-18', blood: 'B+', units: 6, eta: 14, name: 'Dwarka Expressway Corridor (Medanta to Venkateshwar)', isEmergency: false, semanticType: 'expiry', routeColor: '#D97706' },
  { source: 'ND-11', target: 'ND-09', blood: 'A+', units: 12, eta: 18, name: 'Mathura Road Corridor (Apollo Sarita to Lok Nayak)', isEmergency: false, semanticType: 'rebalance', routeColor: '#059669' },
  { source: 'ND-23', target: 'ND-19', blood: 'AB+', units: 6, eta: 8, name: 'Gurugram Supercluster Arterial (Artemis to Paras)', isEmergency: true, semanticType: 'emergency', routeColor: '#E11D48' },
  { source: 'ND-14', target: 'ND-10', blood: 'O+', units: 6, eta: 9, name: 'Central Delhi Arterial (BLK-Max to Ganga Ram)', isEmergency: false, semanticType: 'expiry', routeColor: '#D97706' },
];

const ARC_ENDPOINT_IDS = new Set<string>();
PRIMARY_EXPRESS_CORRIDORS.forEach((c) => {
  ARC_ENDPOINT_IDS.add(c.source);
  ARC_ENDPOINT_IDS.add(c.target);
});

export interface AssignedRescueNode {
  particleIndex: number;
  hospital: HospitalNodeMeta;
  windowStart: number;
  windowEnd: number;
}

/**
 * Deterministic assignment: sort 25 nodes by X at 0.54, sort 25 hospitals by projected X.
 * lng/lat from the SAME data source as workspace (NCR_HOSPITAL_METAS).
 * Colors use the workspace's OWN marker color function evaluated on workspace baseline nodes.
 * Stagger is determined by distance from the platelet origin so landings cascade outward as a wave.
 */
export function buildDeterministicNodeAssignments(
  particleDefs: ParticleDef[],
  viewportW: number
): AssignedRescueNode[] {
  // 1. Get 25 nodes
  const nodeParticles = particleDefs.slice(0, 25).map((p, idx) => ({
    particleIndex: idx,
    flowX: p.targetFlowX * viewportW - 0.5 * viewportW,
  }));
  nodeParticles.sort((a, b) => a.flowX - b.flowX);

  // 2. Get 25 hospitals sorted by longitude (projected X) using workspace's own telemetry
  const defaultNodes = createDefaultHospitalNodes();
  const hospitalList: HospitalNodeMeta[] = Object.entries(NCR_HOSPITAL_METAS).map(([id, meta]) => {
    const liveNode = defaultNodes.find((n) => n.id === id);
    const tel = recalculateHospitalTelemetry(id, liveNode);

    // Workspace marker color function:
    // Shortage -> Crimson #E11D48
    // <36h Surplus -> Amber #F59E0B
    // In baseline, all 25 hospitals are strictly #E11D48 (5) or #F59E0B (20); zero optimal/teal.
    let statusColor = '#F59E0B';
    if (tel.status === 'Shortage') {
      statusColor = '#E11D48';
    } else if (tel.status === '<36h Surplus') {
      statusColor = '#F59E0B';
    }

    return {
      id,
      code: meta.code,
      short: meta.short,
      fullName: meta.fullName,
      coords: meta.coords,
      status: tel.status,
      statusColor,
      isArcEndpoint: ARC_ENDPOINT_IDS.has(id),
      windowStart: 0.54,
      windowEnd: 0.70,
    };
  });

  hospitalList.sort((a, b) => a.coords[0] - b.coords[0]);

  // 3. Stagger by distance from platelet origin [77.21, 28.57] in NCR geographic space
  // Landing delay increases with distance from the platelet origin so the landings cascade as a wave (Spec §8)
  const PLATELET_ORIGIN_GEO: [number, number] = [77.21, 28.57];
  const distList = hospitalList.map((h) => {
    const dx = h.coords[0] - PLATELET_ORIGIN_GEO[0];
    const dy = (h.coords[1] - PLATELET_ORIGIN_GEO[1]) * 1.15;
    return Math.hypot(dx, dy);
  });
  const minDist = Math.min(...distList);
  const maxDist = Math.max(...distList);
  const distSpan = maxDist > minDist ? maxDist - minDist : 1.0;

  // 4. Match 1-to-1 deterministically and assign staggered flight windows
  return nodeParticles.map((np, k) => {
    const hosp = hospitalList[k];
    const dist = distList[k];
    const normDist = (dist - minDist) / distSpan;

    // Stagger 0-0.035: windowStart 0.54..0.575, flight duration 0.065, windowEnd 0.605..0.640
    // Central nodes land by ~0.61 so Stage A intent arcs begin drawing on at 0.62 (Spec §9)
    const windowStart = 0.54 + normDist * 0.035;
    const windowEnd = windowStart + 0.065;
    hosp.windowStart = windowStart;
    hosp.windowEnd = windowEnd;

    return {
      particleIndex: np.particleIndex,
      hospital: hosp,
      windowStart,
      windowEnd,
    };
  });
}

/**
 * Builds GeoJSON FeatureCollection for the 6 primary corridors as nodes land.
 * An arc starts drawing only after BOTH endpoints have landed, over ~0.04 progress.
 * High-arching cubic Bezier coordinates with 3-layer arterial corridor styling.
 */
export function buildStoryCorridorGeoJSON(
  progress: number,
  assignments: AssignedRescueNode[]
): GeoJSON.FeatureCollection {
  if (progress < 0.64) {
    return { type: 'FeatureCollection', features: [] };
  }

  const hospMap = new Map<string, AssignedRescueNode>();
  assignments.forEach((a) => hospMap.set(a.hospital.id, a));

  const features: any[] = [];

  for (const arc of PRIMARY_EXPRESS_CORRIDORS) {
    const srcNode = hospMap.get(arc.source);
    const tgtNode = hospMap.get(arc.target);
    if (!srcNode || !tgtNode) continue;

    // Draw on only after BOTH endpoints land (Spec §8)
    const bothLandedAt = Math.max(srcNode.windowEnd, tgtNode.windowEnd);
    if (progress < bothLandedAt) continue;

    // Reveal over ~0.04 progress
    const revealT = Math.min(1.0, (progress - bothLandedAt) / 0.04);
    if (revealT <= 0.01) continue;

    const srcMeta = NCR_HOSPITAL_METAS[arc.source];
    const tgtMeta = NCR_HOSPITAL_METAS[arc.target];
    const fullRoadCoords = getRealRoadCorridor(srcMeta.coords, tgtMeta.coords, arc.source, arc.target);

    // Slice coordinates based on revealT
    const numPoints = Math.max(2, Math.floor(fullRoadCoords.length * revealT));
    const slicedCoords = fullRoadCoords.slice(0, numPoints);

    features.push({
      type: 'Feature',
      properties: {
        source: arc.source,
        target: arc.target,
        blood: arc.blood,
        units: arc.units,
        eta: arc.eta,
        name: arc.name,
        isEmergency: arc.isEmergency,
        semanticType: arc.semanticType,
        routeColor: arc.routeColor,
        haloColor: arc.routeColor,
        isSelected: false,
      },
      geometry: {
        type: 'LineString',
        coordinates: slicedCoords,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Returns active primary express corridors that have completed landing for live courier animations.
 */
export function getStoryActiveCorridors(
  progress: number,
  assignments: AssignedRescueNode[]
): Array<PrimaryCorridorDef & { coords: [number, number][] }> {
  if (progress < 0.68) return [];

  const hospMap = new Map<string, AssignedRescueNode>();
  assignments.forEach((a) => hospMap.set(a.hospital.id, a));

  const active: Array<PrimaryCorridorDef & { coords: [number, number][] }> = [];

  for (const arc of PRIMARY_EXPRESS_CORRIDORS) {
    const srcNode = hospMap.get(arc.source);
    const tgtNode = hospMap.get(arc.target);
    if (!srcNode || !tgtNode) continue;

    const bothLandedAt = Math.max(srcNode.windowEnd, tgtNode.windowEnd);
    if (progress >= bothLandedAt + 0.04) {
      const srcMeta = NCR_HOSPITAL_METAS[arc.source];
      const tgtMeta = NCR_HOSPITAL_METAS[arc.target];
      const coords = getRealRoadCorridor(srcMeta.coords, tgtMeta.coords, arc.source, arc.target);
      active.push({
        ...arc,
        coords,
      });
    }
  }

  return active;
}
