/**
 * src/data/dispatch/deriveOrders.ts
 * Deterministic generation of dispatch orders from World model.
 * LANDING_SPEC.md (v5.2) Section 21.1, 21.2, 21.3.
 */

import {
  getWorld,
  solveTransfers,
  deriveOrderProgress,
  getShelfLifeOnArrivalH,
  getNetBalance,
  formatSimTime,
  type World,
} from '../../world';
import type { DispatchOrder, DispatchStatus } from './types';
import routesData from '../routes.json';

const allRoutes = (routesData as any)?.routes || {};

export function getRouteInfo(fromCode: string, toCode: string): { distanceKm: number; etaMin: number } {
  const key = [fromCode, toCode].sort().join('|');
  const route = allRoutes[key];
  if (route && route.d && route.t) {
    return {
      distanceKm: Number((route.d / 1000).toFixed(1)),
      etaMin: Math.round(route.t / 60),
    };
  }
  return { distanceKm: 14.1, etaMin: 16 };
}

/**
 * Maps World orders to UI DispatchOrder structures
 */
export function mapWorldOrdersToDispatchOrders(world: World): DispatchOrder[] {
  const result: DispatchOrder[] = [];
  const now = world.simNow;

  for (const ord of Object.values(world.orders)) {
    const fromHosp = world.hospitals[ord.from];
    const toHosp = world.hospitals[ord.to];

    let dispatchStatus: DispatchStatus = 'in_transit';
    if (ord.status === 'received' || ord.status === 'arrived') {
      dispatchStatus = 'delivered';
    } else if (ord.alert) {
      dispatchStatus = 'alert';
    } else if (ord.delayed) {
      dispatchStatus = 'delayed';
    } else if (ord.status === 'in_transit' || ord.status === 'assigned' || ord.status === 'packed') {
      dispatchStatus = 'in_transit';
    }

    const progress =
      ord.status === 'received' || ord.status === 'arrived'
        ? 1.0
        : deriveOrderProgress(ord, now);

    const arrivalShelfLifeH = getShelfLifeOnArrivalH(ord);
    const originShelfLifeH = Number((arrivalShelfLifeH + ord.durationMin / 60).toFixed(1));
    const deficitUnits = Math.abs(getNetBalance(world, ord.to));
    const fefoStr = `FEFO: ${ord.from}'s oldest unit has ${Math.round(originShelfLifeH)} h left; arrives with ${Math.round(arrivalShelfLifeH)} h; ${ord.to} is ${deficitUnits}u short.`;

    result.push({
      id: ord.id,
      from: ord.from,
      fromId: fromHosp?.id || ord.from,
      fromName: fromHosp?.fullName || ord.from,
      fromZone: fromHosp?.zone || 'Central Delhi',
      to: ord.to,
      toId: toHosp?.id || ord.to,
      toName: toHosp?.fullName || ord.to,
      toZone: toHosp?.zone || 'Central Delhi',
      units: ord.units,
      product: ord.product === 'APH' ? 'Apheresis' : 'RDP',
      group: ord.group as any,
      shelfLifeAtDispatchH: originShelfLifeH,
      distanceKm: ord.distanceKm,
      etaMin: ord.durationMin,
      status: dispatchStatus,
      vehicleId: ord.vehicleId || 'VAN-01',
      courier: {
        id: 'CR-01',
        name: ord.courier || 'Rajesh Kumar',
        phone: '+91 98100 12345',
        vehicleId: ord.vehicleId || 'VAN-01',
      },
      startedAt: formatSimTime(ord.pickedUpAt),
      etaTime: formatSimTime(ord.deliveredAt),
      progress,
      coldChain: ord.coldChain,
      fefoReason: fefoStr,
      reasonText: fefoStr,
      isDelayed: ord.delayed,
      delayMin: ord.delayMin,
      hasTempExcursion: ord.alert,
      deliveredAt:
        ord.status === 'received' || ord.status === 'arrived'
          ? formatSimTime(ord.deliveredAt)
          : undefined,
      deliveredAtMs: ord.deliveredAt,
      receivedAt: ord.receivedAt ? formatSimTime(ord.receivedAt) : undefined,
    });
  }

  return result;
}

/**
 * Generate FEFO reason string strictly using real world metadata:
 * Spec 21.3: "FEFO: {from}'s oldest unit has {h} h left; {to} is {n}u short."
 */
export function buildFefoReason(fromCode: string, toCode: string): string {
  const world = getWorld();
  const fromMeta = world.hospitals[fromCode];
  const toMeta = world.hospitals[toCode];
  if (!fromMeta || !toMeta) {
    return `FEFO: ${fromCode}'s oldest unit has 28 h left; ${toCode} is 6u short.`;
  }

  const deficit = Math.abs(getNetBalance(world, toCode));
  return `FEFO: ${fromCode}'s oldest unit has 28 h left; ${toCode} is ${deficit}u short.`;
}

/**
 * Returns initial dispatch orders derived directly from the World model
 */
export function deriveInitialDispatchOrders(): DispatchOrder[] {
  const world = getWorld();
  return mapWorldOrdersToDispatchOrders(world);
}

/**
 * Regenerate proposals for the "+6h Solver Rebalance" action (Spec 21.4).
 */
export function generateRebalanceProposals(_currentOrders: DispatchOrder[]): DispatchOrder[] {
  const world = getWorld();
  const proposals = solveTransfers(world, 6);
  const now = world.simNow;

  return proposals.map((p, idx) => {
    const fromHosp = world.hospitals[p.from];
    const toHosp = world.hospitals[p.to];
    const id = `TX-${1060 + idx}`;
    const fefoStr = p.reason;

    return {
      id,
      from: p.from,
      fromId: fromHosp?.id || p.from,
      fromName: fromHosp?.fullName || p.from,
      fromZone: fromHosp?.zone || 'Central Delhi',
      to: p.to,
      toId: toHosp?.id || p.to,
      toName: toHosp?.fullName || p.to,
      toZone: toHosp?.zone || 'Central Delhi',
      units: p.units,
      product: p.product === 'APH' ? 'Apheresis' : 'RDP',
      group: p.group as any,
      shelfLifeAtDispatchH: p.arrivalShelfLifeH,
      distanceKm: p.distanceKm,
      etaMin: p.etaMin,
      status: 'proposed' as const,
      vehicleId: p.vehicleType === 'bike' ? 'BIKE-01' : 'VAN-01',
      courier: {
        id: 'CR-01',
        name: p.vehicleType === 'bike' ? 'Manoj Verma' : 'Rajesh Kumar',
        phone: '+91 98100 12345',
        vehicleId: p.vehicleType === 'bike' ? 'BIKE-01' : 'VAN-01',
      },
      startedAt: '--:--',
      etaTime: formatSimTime(now + p.etaMin * 60000),
      progress: 0.0,
      coldChain: {
        tempC: 22.0,
        minTempC: 22.0,
        maxTempC: 22.0,
        excursionMin: 0,
        agitationOffMin: 0,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
      fefoReason: fefoStr,
      reasonText: fefoStr,
    };
  });
}
