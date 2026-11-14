/**
 * src/world/solver.ts
 * FEFO (First-Expired, First-Out) Solver Engine
 * PORTAL_SPEC.md Section 1.9
 */

import { MIN_SAFE_ARRIVAL_H, EXPIRING_H } from './config';
import type {
  World,
  SolverProposal,
  BloodGroup,
  OrderAllocation,
  PlateletProduct,
} from './types';
import {
  getUsableUnits,
  getDemand36,
  getNetBalance,
  isDataStale,
} from './selectors';
import { getIdealVehicleType } from './vehicles';
import routesData from '../data/routes.json';

const allRoutes = (routesData as any)?.routes || {};

function getRouteEstimate(fromCode: string, toCode: string): { distanceKm: number; etaMin: number } {
  const key = [fromCode, toCode].sort().join('|');
  const route = allRoutes[key];
  if (route && route.d && route.t) {
    return {
      distanceKm: Number((route.d / 1000).toFixed(1)),
      etaMin: Math.max(5, Math.round(route.t / 60)),
    };
  }
  return { distanceKm: 14.1, etaMin: 16 };
}

/**
 * Checks if candidate donor blood group is compatible with recipient blood group
 * Default in Plexus is ABO-identical unless request explicitly accepts ABO-compatible
 */
export function isAboCompatible(donor: BloodGroup, recipient: BloodGroup, allowCompatible: boolean = false): boolean {
  if (donor === recipient) return true;
  if (!allowCompatible) return false;

  // Platelet plasma compatibility (reverse of red blood cells):
  // AB is universal platelet donor, O is universal recipient
  const compatibilityMap: Record<BloodGroup, BloodGroup[]> = {
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'O+': ['O+'],
    'O-': ['O-', 'O+'],
  };

  return compatibilityMap[donor]?.includes(recipient) ?? false;
}

/**
 * Runs the FEFO solver over the current world at simNow
 */
export function runSolver(world: World, _horizonH: number = 6): SolverProposal[] {
  const proposals: SolverProposal[] = [];
  const now = world.simNow;

  // Track simulated unit deductions so multiple proposals don't double-allocate
  const reservedLotUnits = new Map<string, number>();

  const getRemainingLotUnits = (lotId: string, initialUnits: number) => {
    const reserved = reservedLotUnits.get(lotId) || 0;
    return Math.max(0, initialUnits - reserved);
  };

  const reserveUnits = (lotId: string, qty: number) => {
    reservedLotUnits.set(lotId, (reservedLotUnits.get(lotId) || 0) + qty);
  };

  // ── PHASE 1: Fulfill open unassigned requests ──
  const openRequests = Object.values(world.requests)
    .filter((r) => r.status === 'requested' || r.status === 'matching')
    .sort((a, b) => a.neededBy - b.neededBy);

  for (const req of openRequests) {
    const toHosp = req.hospital;
    const recipientDeficit = Math.max(1, Math.abs(getNetBalance(world, toHosp)));

    // Search eligible source hospitals
    const candidates: Array<{
      fromHosp: string;
      allocations: OrderAllocation[];
      units: number;
      etaMin: number;
      distanceKm: number;
      arrivalShelfLifeH: number;
      score: number;
      reason: string;
    }> = [];

    for (const sourceHosp of Object.values(world.hospitals)) {
      if (sourceHosp.code === toHosp) continue;

      // Source must keep its own demand36 (never create a new shortage!)
      const sourceUsable = getUsableUnits(world, sourceHosp.code);
      const sourceDemand = getDemand36(world, sourceHosp.code);
      const sourceSurplus = sourceUsable - sourceDemand;
      if (sourceSurplus <= 0) continue;

      const { distanceKm, etaMin } = getRouteEstimate(sourceHosp.code, toHosp);
      const minRequiredArrivalExpiry = now + (etaMin * 60000) + (MIN_SAFE_ARRIVAL_H * 3600000);

      // Collect eligible lots matching product & group, sorted by expiresAt ascending (FEFO)
      const matchingLots = Object.values(world.lots)
        .filter(
          (l) =>
            l.hospital === sourceHosp.code &&
            l.product === req.product &&
            isAboCompatible(l.group, req.group, req.acceptAboCompatible) &&
            l.expiresAt >= minRequiredArrivalExpiry &&
            getRemainingLotUnits(l.lotId, l.units) > 0
        )
        .sort((a, b) => a.expiresAt - b.expiresAt);

      if (matchingLots.length === 0) continue;

      let unitsToTake = Math.min(req.units, sourceSurplus);
      if (!req.acceptPartial && unitsToTake < req.units) {
        continue;
      }

      const allocations: OrderAllocation[] = [];
      let unitsCollected = 0;
      let unitsRescuedFromExpiring = 0;

      for (const lot of matchingLots) {
        if (unitsCollected >= unitsToTake) break;
        const available = getRemainingLotUnits(lot.lotId, lot.units);
        const take = Math.min(available, unitsToTake - unitsCollected);
        if (take > 0) {
          allocations.push({
            lotId: lot.lotId,
            units: take,
            expiresAt: lot.expiresAt,
          });
          unitsCollected += take;
          if (lot.expiresAt < now + EXPIRING_H * 3600000) {
            unitsRescuedFromExpiring += take;
          }
        }
      }

      if (unitsCollected === 0) continue;

      const oldestLotExpiry = allocations[0].expiresAt;
      const hoursLeftAtSource = Number(((oldestLotExpiry - now) / 3600000).toFixed(1));
      const hoursLeftOnArrival = Number(
        ((oldestLotExpiry - (now + etaMin * 60000)) / 3600000).toFixed(1)
      );

      // Score = 3 * rescued + 2 * shortageCovered - etaMin / 10 - stalenessPenalty
      const stalenessPenalty = isDataStale(world, sourceHosp.code) ? 8 : 0;
      const score =
        3 * unitsRescuedFromExpiring +
        2 * unitsCollected -
        etaMin / 10 -
        stalenessPenalty;

      const reason = `FEFO: ${sourceHosp.code}'s oldest unit has ${hoursLeftAtSource} h left; arrives with ${hoursLeftOnArrival} h; ${toHosp} is ${recipientDeficit}u short.`;

      candidates.push({
        fromHosp: sourceHosp.code,
        allocations,
        units: unitsCollected,
        etaMin,
        distanceKm,
        arrivalShelfLifeH: hoursLeftOnArrival,
        score,
        reason,
      });
    }

    if (candidates.length > 0) {
      // Sort candidates by score descending, tie-break: lower ETA, then hospital code
      candidates.sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.01) {
          return b.score - a.score;
        }
        if (a.etaMin !== b.etaMin) {
          return a.etaMin - b.etaMin;
        }
        return a.fromHosp.localeCompare(b.fromHosp);
      });

      const best = candidates[0];
      for (const alloc of best.allocations) {
        reserveUnits(alloc.lotId, alloc.units);
      }

      proposals.push({
        kind: 'request',
        requestId: req.id,
        from: best.fromHosp,
        to: toHosp,
        product: req.product,
        group: req.group,
        units: best.units,
        allocations: best.allocations,
        vehicleType: getIdealVehicleType(best.units, req.urgency),
        distanceKm: best.distanceKm,
        etaMin: best.etaMin,
        arrivalShelfLifeH: best.arrivalShelfLifeH,
        score: Number(best.score.toFixed(2)),
        reason: best.reason,
      });
    }
  }

  // ── PHASE 2: Rescue expiring stock (<36h) from surplus nodes to deficit nodes ──
  const shortHospitals = Object.values(world.hospitals)
    .filter((h) => getNetBalance(world, h.code) < 0)
    .sort((a, b) => getNetBalance(world, a.code) - getNetBalance(world, b.code));

  for (const recipient of shortHospitals) {
    const deficit = Math.abs(getNetBalance(world, recipient.code));
    if (deficit <= 0) continue;

    for (const donor of Object.values(world.hospitals)) {
      if (donor.code === recipient.code) continue;

      const donorUsable = getUsableUnits(world, donor.code);
      const donorDemand = getDemand36(world, donor.code);
      const donorSurplus = donorUsable - donorDemand;
      if (donorSurplus <= 0) continue;

      const { distanceKm, etaMin } = getRouteEstimate(donor.code, recipient.code);
      const minRequiredArrivalExpiry = now + (etaMin * 60000) + (MIN_SAFE_ARRIVAL_H * 3600000);

      // Find lots expiring within 36h that can safely arrive
      const expiringLots = Object.values(world.lots)
        .filter(
          (l) =>
            l.hospital === donor.code &&
            l.expiresAt >= minRequiredArrivalExpiry &&
            l.expiresAt < now + EXPIRING_H * 3600000 &&
            getRemainingLotUnits(l.lotId, l.units) > 0
        )
        .sort((a, b) => a.expiresAt - b.expiresAt);

      if (expiringLots.length === 0) continue;

      const lot = expiringLots[0];
      const available = getRemainingLotUnits(lot.lotId, lot.units);
      const transferUnits = Math.min(available, deficit, donorSurplus);
      if (transferUnits <= 0) continue;

      const hoursLeftAtSource = Number(((lot.expiresAt - now) / 3600000).toFixed(1));
      const hoursLeftOnArrival = Number(
        ((lot.expiresAt - (now + etaMin * 60000)) / 3600000).toFixed(1)
      );

      const allocations: OrderAllocation[] = [
        {
          lotId: lot.lotId,
          units: transferUnits,
          expiresAt: lot.expiresAt,
        },
      ];

      reserveUnits(lot.lotId, transferUnits);

      const score = 3 * transferUnits + 2 * transferUnits - etaMin / 10;
      const reason = `FEFO: ${donor.code}'s oldest unit has ${hoursLeftAtSource} h left; arrives with ${hoursLeftOnArrival} h; ${recipient.code} is ${deficit}u short.`;

      proposals.push({
        kind: 'rescue',
        from: donor.code,
        to: recipient.code,
        product: lot.product,
        group: lot.group,
        units: transferUnits,
        allocations,
        vehicleType: getIdealVehicleType(transferUnits),
        distanceKm,
        etaMin,
        arrivalShelfLifeH: hoursLeftOnArrival,
        score: Number(score.toFixed(2)),
        reason,
      });

      break; // One rescue per short hospital per pass
    }
  }

  return proposals;
}

export const solveTransfers = runSolver;

export interface RequestMatchCandidate {
  code: string;
  name: string;
  availableUnits: number;
  etaMin: number;
  arrivalShelfLifeH: number;
  distanceKm: number;
}

export interface RequestMatchResult {
  sourcesCount: number;
  sources: RequestMatchCandidate[];
  nearestEtaMin: number | null;
  minArrivalShelfLifeH: number | null;
  canFulfillWithinWindow: boolean;
  message: string;
}

export function findRequestMatches(
  world: World,
  params: {
    hospital: string;
    product: PlateletProduct;
    group: BloodGroup;
    units: number;
    neededWithinH: number;
    acceptAboCompatible?: boolean;
    acceptPartial?: boolean;
  }
): RequestMatchResult {
  const now = world.simNow;
  const toHosp = params.hospital;
  const neededWithinMin = params.neededWithinH * 60;

  const sources: RequestMatchCandidate[] = [];

  for (const sourceHosp of Object.values(world.hospitals)) {
    if (sourceHosp.code === toHosp) continue;

    // Source must not compromise its own 36h demand
    const sourceUsable = getUsableUnits(world, sourceHosp.code);
    const sourceDemand = getDemand36(world, sourceHosp.code);
    const sourceSurplus = sourceUsable - sourceDemand;
    if (sourceSurplus <= 0) continue;

    const { distanceKm, etaMin } = getRouteEstimate(sourceHosp.code, toHosp);
    const minRequiredArrivalExpiry = now + (etaMin * 60000) + (MIN_SAFE_ARRIVAL_H * 3600000);

    const matchingLots = Object.values(world.lots)
      .filter(
        (l) =>
          l.hospital === sourceHosp.code &&
          l.product === params.product &&
          isAboCompatible(l.group, params.group, params.acceptAboCompatible ?? false) &&
          l.expiresAt >= minRequiredArrivalExpiry &&
          l.units > 0
      )
      .sort((a, b) => a.expiresAt - b.expiresAt);

    if (matchingLots.length === 0) continue;

    const totalEligibleUnits = matchingLots.reduce((acc, l) => acc + l.units, 0);
    const availableFromSource = Math.min(totalEligibleUnits, sourceSurplus);

    if (params.acceptPartial === false && availableFromSource < params.units) {
      continue;
    }

    if (availableFromSource > 0) {
      const oldestLot = matchingLots[0];
      const arrivalShelfLifeH = Number(
        ((oldestLot.expiresAt - (now + etaMin * 60000)) / 3600000).toFixed(1)
      );

      sources.push({
        code: sourceHosp.code,
        name: sourceHosp.fullName || sourceHosp.name,
        availableUnits: availableFromSource,
        etaMin,
        arrivalShelfLifeH,
        distanceKm,
      });
    }
  }

  // Sort sources by ETA ascending
  sources.sort((a, b) => a.etaMin - b.etaMin);

  if (sources.length === 0) {
    return {
      sourcesCount: 0,
      sources: [],
      nearestEtaMin: null,
      minArrivalShelfLifeH: null,
      canFulfillWithinWindow: false,
      message: 'No source has eligible stock. The request will queue and alert dispatch.',
    };
  }

  const nearest = sources[0];
  const reachableSources = sources.filter((s) => s.etaMin <= neededWithinMin);

  if (reachableSources.length === 0) {
    return {
      sourcesCount: sources.length,
      sources,
      nearestEtaMin: nearest.etaMin,
      minArrivalShelfLifeH: nearest.arrivalShelfLifeH,
      canFulfillWithinWindow: false,
      message: 'No source can reach you inside this window. The request is still queued and the dispatcher is alerted.',
    };
  }

  const nearestReachable = reachableSources[0];
  return {
    sourcesCount: reachableSources.length,
    sources: reachableSources,
    nearestEtaMin: nearestReachable.etaMin,
    minArrivalShelfLifeH: nearestReachable.arrivalShelfLifeH,
    canFulfillWithinWindow: true,
    message: `${reachableSources.length} source${reachableSources.length > 1 ? 's' : ''} can supply · nearest ${nearestReachable.etaMin} min · arrives with ${nearestReachable.arrivalShelfLifeH} h left`,
  };
}

