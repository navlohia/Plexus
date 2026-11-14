/**
 * src/world/selectors.ts
 * Canonical Derived Definitions for World Model
 * PORTAL_SPEC.md Section 1.7
 */

import {
  MIN_SAFE_ARRIVAL_H,
  EXPIRING_H,
  DEMAND_HORIZON_H,
  STALE_H,
} from './config';
import type {
  World,
  BloodGroup,
  PlateletProduct,
  DispatchOrder,
  HospitalState,
  DeficitSeverity,
} from './types';

/**
 * Usable units at hospital: units in lots with at least MIN_SAFE_ARRIVAL_H (6 h) left
 */
export function getUsableUnits(
  world: World,
  hospitalCode: string,
  group?: BloodGroup,
  product?: PlateletProduct,
  atTime: number = world.simNow
): number {
  const minExpiry = atTime + MIN_SAFE_ARRIVAL_H * 3600 * 1000;
  let total = 0;

  for (const lot of Object.values(world.lots)) {
    if (lot.hospital === hospitalCode) {
      if (group && lot.group !== group) continue;
      if (product && lot.product !== product) continue;
      if (lot.expiresAt >= minExpiry) {
        total += lot.units;
      }
    }
  }

  return total;
}

/**
 * Expiring units at hospital: units with < 36 h left (and still usable >= 6 h)
 */
export function getExpiring36Units(
  world: World,
  hospitalCode: string,
  group?: BloodGroup,
  product?: PlateletProduct,
  atTime: number = world.simNow
): number {
  const minExpiry = atTime + MIN_SAFE_ARRIVAL_H * 3600 * 1000;
  const maxExpiry = atTime + EXPIRING_H * 3600 * 1000;
  let total = 0;

  for (const lot of Object.values(world.lots)) {
    if (lot.hospital === hospitalCode) {
      if (group && lot.group !== group) continue;
      if (product && lot.product !== product) continue;
      if (lot.expiresAt >= minExpiry && lot.expiresAt < maxExpiry) {
        total += lot.units;
      }
    }
  }

  return total;
}

/**
 * Scenario demand multiplier for a given hospital's zone with 20/50/30 ramp
 * PORTAL_SPEC.md Section 5
 */
export function getScenarioMultiplier(world: World, zone: string): number {
  if (!world.activeScenario) return 1.0;
  const scn = world.activeScenario;
  const elapsed = world.simNow - scn.startedAt;
  const total = (scn.durationH || 72) * 3600000;

  if (elapsed < 0 || elapsed > total) return 1.0;

  const f = Math.max(0, Math.min(1, elapsed / total));
  let ramp = 1.0;
  if (f < 0.2) {
    ramp = f / 0.2; // 0.0 -> 1.0
  } else if (f < 0.7) {
    ramp = 1.0; // plateau
  } else {
    ramp = Math.max(0, (1.0 - f) / 0.3); // 1.0 -> 0.0
  }

  const match = scn.zones.find((z) => z.zone.toLowerCase() === zone.toLowerCase());
  if (match) {
    return Number((1.0 + (match.multiplier - 1.0) * ramp).toFixed(2));
  }

  // Neighbors get 50% of the uplift
  if (scn.zones.length > 0) {
    const avgMultiplier = scn.zones.reduce((s, z) => s + z.multiplier, 0) / scn.zones.length;
    const neighborZones = ['central delhi', 'noida', 'west delhi', 'north delhi', 'gurugram', 'faridabad'];
    if (neighborZones.includes(zone.toLowerCase())) {
      return Number((1.0 + (avgMultiplier - 1.0) * 0.5 * ramp).toFixed(2));
    }
  }

  return 1.0;
}

/**
 * Daily usage for a hospital across all groups or a specific group/product
 */
export function getDailyUsage(
  world: World,
  hospitalCode: string,
  group?: BloodGroup,
  product?: PlateletProduct
): number {
  const hosp = world.hospitals[hospitalCode];
  if (!hosp) return 0;

  let sum = 0;
  for (const [g, pMap] of Object.entries(hosp.usagePerDay)) {
    if (group && g !== group) continue;
    for (const [p, qty] of Object.entries(pMap)) {
      if (product && p !== product) continue;
      sum += qty;
    }
  }
  return sum;
}

/**
 * 36h demand at hospital: usagePerDay * 1.5 * scenarioMultiplier(zone) + open unassigned requests
 */
export function getDemand36(world: World, hospitalCode: string, group?: BloodGroup): number {
  const hosp = world.hospitals[hospitalCode];
  if (!hosp) return 0;

  const mult = getScenarioMultiplier(world, hosp.zone);
  const baselineDaily = getDailyUsage(world, hospitalCode, group);
  const baseline36 = baselineDaily * (DEMAND_HORIZON_H / 24) * mult;

  // Plus units in open requests not yet assigned
  let openReqUnits = 0;
  for (const req of Object.values(world.requests)) {
    if (req.hospital === hospitalCode && (req.status === 'requested' || req.status === 'matching')) {
      if (!group || req.group === group) {
        openReqUnits += req.units;
      }
    }
  }

  return Math.round(baseline36 + openReqUnits);
}

/**
 * Incoming units: units in active orders heading to hospital that are not yet received
 */
export function getIncomingUnits(world: World, hospitalCode: string, group?: BloodGroup): number {
  let incoming = 0;
  for (const order of Object.values(world.orders)) {
    if (order.to === hospitalCode && order.status !== 'received' && order.status !== 'cancelled') {
      if (!group || order.group === group) {
        incoming += order.units;
      }
    }
  }
  return incoming;
}

/**
 * Net position: usable(h) + incoming(h) - demand36(h)
 */
export function getNetBalance(world: World, hospitalCode: string): number {
  const usable = getUsableUnits(world, hospitalCode);
  const incoming = getIncomingUnits(world, hospitalCode);
  const demand = getDemand36(world, hospitalCode);
  return usable + incoming - demand;
}

/**
 * Hospital state: short if net < 0; risk if net >= 0 and expiring36 > 0; else ok
 */
export function getHospitalState(world: World, hospitalCode: string): HospitalState {
  const net = getNetBalance(world, hospitalCode);
  if (net < 0) {
    return 'short';
  }
  const exp36 = getExpiring36Units(world, hospitalCode);
  if (exp36 > 0) {
    return 'risk';
  }
  return 'ok';
}

/**
 * Severity of a deficit:
 * - critical if deficit >= 10u or neededBy < 1 h
 * - high if 5-9u or neededBy < 3 h
 * - else moderate
 */
export function getDeficitSeverity(deficitUnits: number, neededBySimMs?: number, now: number = Date.now()): DeficitSeverity {
  const absDef = Math.abs(deficitUnits);
  const hoursLeft = neededBySimMs !== undefined ? (neededBySimMs - now) / 3600000 : 999;

  if (absDef >= 10 || hoursLeft < 1) {
    return 'critical';
  }
  if (absDef >= 5 || hoursLeft < 3) {
    return 'high';
  }
  return 'moderate';
}

const ALL_BLOOD_GROUPS: BloodGroup[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/**
 * Days of cover: usable / daily usage
 * Returns null when daily usage < 0.2u/day (No recent demand per HOSPITAL_UI_SPEC.md 1.4)
 * NEVER returns 99.0
 */
export function getDaysOfCover(world: World, hospitalCode: string, group?: BloodGroup): number | null {
  const usable = getUsableUnits(world, hospitalCode, group);
  const daily = getDailyUsage(world, hospitalCode, group);
  if (daily < 0.2) return null;
  return Number((usable / daily).toFixed(1));
}

/**
 * Status words per HOSPITAL_UI_SPEC.md 1.5:
 * - "Short" only if projected need exceeds usable + incoming
 * - "Low cover" only if cover < 1.5 d and real demand (daily >= 0.2)
 * - Otherwise null (OK is silent)
 */
export function getGroupStatusWord(
  world: World,
  hospitalCode: string,
  group: BloodGroup
): 'Short' | 'Low cover' | null {
  const usable = getUsableUnits(world, hospitalCode, group);
  const incoming = getIncomingUnits(world, hospitalCode, group);
  const demand36 = getDemand36(world, hospitalCode, group);
  const daily = getDailyUsage(world, hospitalCode, group);

  if (demand36 > usable + incoming) {
    return 'Short';
  }

  if (daily >= 0.2) {
    const cover = usable / daily;
    if (cover < 1.5) {
      return 'Low cover';
    }
  }

  return null;
}

export interface HospitalAttentionItem {
  id: string;
  kind: 'arrived' | 'critical_low_cover' | 'shortage' | 'surplus' | 'stale';
  priority: 1 | 2 | 3 | 4 | 5;
  tone: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel: string;
  actionKey: 'confirm_receipt' | 'request_platelets' | 'release_surplus' | 'update_stock';
  link: string;
  meta?: {
    orderId?: string;
    lotId?: string;
    group?: BloodGroup;
    product?: PlateletProduct;
    units?: number;
    hoursLeft?: number;
    deficit?: number;
    coverDays?: number;
    time?: string;
  };
}

/**
 * ONE canonical attention selector per HOSPITAL_UI_SPEC.md 1.1:
 * Returns the ordered list of things that need the hospital from the world:
 * 1. arrived order awaiting confirmation
 * 2. critical low cover (< 1.5d with real demand)
 * 3. shortage (projected need exceeds usable + incoming)
 * 4. surplus to release (< 36h shelf life)
 * 5. stale data (> 24h since last verified)
 */
export function getHospitalAttention(world: World, hospitalCode: string): HospitalAttentionItem[] {
  const items: HospitalAttentionItem[] = [];
  const now = world.simNow;

  // 1. Arrived order awaiting confirmation
  const arrivedOrder = Object.values(world.orders).find(
    (o) =>
      o.to === hospitalCode &&
      !o.receivedAt &&
      o.status !== 'cancelled' &&
      (o.status === 'arrived' || o.deliveredAt <= now)
  );
  if (arrivedOrder) {
    const prodLabel = arrivedOrder.product === 'APH' ? 'Apheresis (SDP)' : 'RDP (random donor)';
    items.push({
      id: `attn-arrived-${arrivedOrder.id}`,
      kind: 'arrived',
      priority: 1,
      tone: 'danger',
      title: `${arrivedOrder.id} arrived · ${arrivedOrder.units}u ${arrivedOrder.group} ${prodLabel}`,
      message: 'Delivered at receiving bay. Clinical receipt checklist & verification required.',
      actionLabel: 'Confirm receipt',
      actionKey: 'confirm_receipt',
      link: `#/hospital/${hospitalCode}/requests/${arrivedOrder.requestId || arrivedOrder.id}?update=receive`,
      meta: {
        orderId: arrivedOrder.id,
        units: arrivedOrder.units,
        group: arrivedOrder.group,
        product: arrivedOrder.product,
      },
    });
  }

  // 2. Critical low cover (< 1.5d and real demand)
  let worstLowCoverGroup: BloodGroup | null = null;
  let worstCover = 999;
  for (const g of ALL_BLOOD_GROUPS) {
    const daily = getDailyUsage(world, hospitalCode, g);
    if (daily >= 0.2) {
      const usable = getUsableUnits(world, hospitalCode, g);
      const cover = usable / daily;
      if (cover < 1.5 && cover < worstCover) {
        worstCover = cover;
        worstLowCoverGroup = g;
      }
    }
  }
  if (worstLowCoverGroup) {
    items.push({
      id: `attn-low-cover-${worstLowCoverGroup}`,
      kind: 'critical_low_cover',
      priority: 2,
      tone: worstCover < 1.0 ? 'danger' : 'warning',
      title: `Critical low cover: ${worstLowCoverGroup} (${worstCover.toFixed(1)}d)`,
      message: `${worstLowCoverGroup} cover is critically below the 1.5-day safety threshold with active patient demand.`,
      actionLabel: 'Request platelets',
      actionKey: 'request_platelets',
      link: `#/hospital/${hospitalCode}/today?new=1`,
      meta: {
        group: worstLowCoverGroup,
        coverDays: Number(worstCover.toFixed(1)),
      },
    });
  }

  // 3. Shortage (projected need exceeds usable + incoming)
  const net = getNetBalance(world, hospitalCode);
  if (net < 0) {
    const deficit = Math.abs(net);
    items.push({
      id: 'attn-shortage',
      kind: 'shortage',
      priority: 3,
      tone: 'danger',
      title: `Platelet deficit: ${deficit}u short`,
      message: `Projected 36-hour demand exceeds usable inventory and incoming transfers by ${deficit} units.`,
      actionLabel: 'Request platelets',
      actionKey: 'request_platelets',
      link: `#/hospital/${hospitalCode}/today?new=1`,
      meta: { deficit },
    });
  }

  // 4. Surplus to release (lots expiring in 6-36h)
  const expiringLots = Object.values(world.lots)
    .filter(
      (l) =>
        l.hospital === hospitalCode &&
        l.expiresAt > now + 6 * 3600 * 1000 &&
        l.expiresAt < now + 36 * 3600 * 1000
    )
    .sort((a, b) => a.expiresAt - b.expiresAt);
  if (expiringLots.length > 0) {
    const lot = expiringLots[0];
    const hLeft = Math.max(1, Math.round((lot.expiresAt - now) / 3600000));
    const prodLabel = lot.product === 'APH' ? 'Apheresis (SDP)' : 'RDP (random donor)';
    items.push({
      id: `attn-surplus-${lot.lotId}`,
      kind: 'surplus',
      priority: 4,
      tone: 'warning',
      title: `Surplus risk: ${lot.units}u expiring in ${hLeft} h`,
      message: `Lot #${lot.lotId} (${lot.group} ${prodLabel}) can be released to the network before expiry.`,
      actionLabel: 'Release surplus',
      actionKey: 'release_surplus',
      link: `#/hospital/${hospitalCode}/stock`,
      meta: {
        lotId: lot.lotId,
        units: lot.units,
        group: lot.group,
        product: lot.product,
        hoursLeft: hLeft,
      },
    });
  }

  // 5. Stale data (stock verified > 24h ago)
  if (isDataStale(world, hospitalCode)) {
    const hosp = world.hospitals[hospitalCode];
    const lastVerified = hosp ? hosp.lastVerifiedAt : now - 26 * 3600 * 1000;
    const vDate = new Date(lastVerified);
    const vTime = `${String(vDate.getHours()).padStart(2, '0')}:${String(vDate.getMinutes()).padStart(2, '0')}`;
    items.push({
      id: 'attn-stale-data',
      kind: 'stale',
      priority: 5,
      tone: 'warning',
      title: 'Daily platelet inventory recount due',
      message: `Stock verified > 24 hours ago (${vTime}). Submit a physical recount to calibrate mesh.`,
      actionLabel: 'Update stock',
      actionKey: 'update_stock',
      link: `#/hospital/${hospitalCode}/stock?update=count`,
      meta: { time: vTime },
    });
  }

  return items;
}

/**
 * Freshness in milliseconds since last verification: now - lastVerifiedAt
 */
export function getDataFreshnessMs(world: World, hospitalCode: string): number {
  const hosp = world.hospitals[hospitalCode];
  if (!hosp) return 0;
  return Math.max(0, world.simNow - hosp.lastVerifiedAt);
}

/**
 * Is hospital stock data stale (> 24h since last verified)
 */
export function isDataStale(world: World, hospitalCode: string): boolean {
  return getDataFreshnessMs(world, hospitalCode) > STALE_H * 3600 * 1000;
}

/**
 * 30-day baseline outdate rate: units expired / units received in window
 */
export function getOutdateRate(world: World): number {
  if (!world.history30d || world.history30d.length === 0) {
    return 0.08;
  }
  let totalExpired = 0;
  let totalReceived = 0;
  for (const day of world.history30d) {
    totalExpired += day.expired;
    totalReceived += day.received;
  }
  if (totalReceived <= 0) return 0;
  return Number((totalExpired / totalReceived).toFixed(3));
}

/**
 * Rescued units in window: delivered and received lots that had < 36h left at pickup
 */
export function getRescuedUnits(world: World): number {
  let count = 0;
  // History + active received orders
  for (const day of world.history30d) {
    count += day.rescued;
  }
  return count;
}

/**
 * Shelf life on arrival for an order: earliest allocated expiresAt - deliveredAt
 */
export function getShelfLifeOnArrivalH(order: DispatchOrder): number {
  if (!order.allocations || order.allocations.length === 0) {
    return 24;
  }
  const earliestExpiry = Math.min(...order.allocations.map((a) => a.expiresAt));
  const diffMs = earliestExpiry - order.deliveredAt;
  return Math.max(0, Number((diffMs / 3600000).toFixed(1)));
}

/**
 * Agitation-off minutes for an order
 */
export function getAgitationOffMinutes(order: DispatchOrder, atTime: number): number {
  if (atTime < order.pickedUpAt) {
    return 0;
  }
  const endTime = order.receivedAt ?? Math.min(atTime, order.deliveredAt);
  const diffMs = Math.max(0, endTime - order.pickedUpAt);
  return Math.round(diffMs / 60000);
}

