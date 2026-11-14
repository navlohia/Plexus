/**
 * src/portal/portalData.ts
 * Computed Data Layer & Selectors for Hospital Portal
 * PORTAL_SPEC.md Section 3.1 & 3.7
 */

import { World, PlateletRequest } from '../world/types';
import * as selectors from '../world/selectors';
import rawHospitals from '../world/hospitals.json';

export interface TodayHeadlineResult {
  text: string;
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  kind: 'arrived' | 'incoming' | 'expiring' | 'short' | 'stale' | 'steady';
  meta?: {
    orderId?: string;
    units?: number;
    time?: string;
    hoursLeft?: number;
    deficit?: number;
  };
}

export interface StatusStripItem {
  id: string;
  label: string;
  value: string;
  subtext: string;
  tone: 'short' | 'risk' | 'ok' | 'neutral';
  dataTestId?: string;
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionKey: 'confirm_receipt' | 'release_surplus' | 'update_count';
  tone: 'short' | 'risk' | 'neutral';
  orderId?: string;
  lotId?: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  timeStr: string;
  read: boolean;
  link: string;
  type: 'arrived' | 'matched' | 'pickup' | 'delay' | 'alert' | 'surplus';
}

/**
 * Computes the canonical Today headline according to PORTAL_SPEC.md 3.1 & HOSPITAL_UI_SPEC.md 1.1 priority order
 */
export function computeTodayHeadline(world: World, hospitalCode: string): TodayHeadlineResult {
  const now = world.simNow;
  const attention = selectors.getHospitalAttention(world, hospitalCode);

  if (attention.length > 0) {
    const top = attention[0];
    if (top.kind === 'arrived') {
      return {
        text: `${top.meta?.orderId || 'Order'} arrived. Confirm receipt.`,
        priority: 1,
        kind: 'arrived',
        meta: { orderId: top.meta?.orderId },
      };
    }
    if (top.kind === 'critical_low_cover') {
      return {
        text: `Critical low cover: ${top.meta?.group} (${top.meta?.coverDays}d). Request replenishment.`,
        priority: 2,
        kind: 'short',
        meta: { deficit: 1 },
      };
    }
    if (top.kind === 'shortage') {
      const deficit = top.meta?.deficit || Math.abs(selectors.getNetBalance(world, hospitalCode));
      return {
        text: `You're ${deficit}u short for the next 36 h.`,
        priority: 3,
        kind: 'short',
        meta: { deficit },
      };
    }
    if (top.kind === 'surplus') {
      return {
        text: `${top.meta?.units || 0}u expire in ${top.meta?.hoursLeft || 12} h.`,
        priority: 4,
        kind: 'expiring',
        meta: { units: top.meta?.units, hoursLeft: top.meta?.hoursLeft },
      };
    }
    if (top.kind === 'stale') {
      return {
        text: `Stock last verified yesterday ${top.meta?.time || '18:10'}.`,
        priority: 5,
        kind: 'stale',
        meta: { time: top.meta?.time },
      };
    }
  }

  // If no attention items, check for inbound active transfers
  const inTransitOrders = Object.values(world.orders)
    .filter((o) => o.to === hospitalCode && o.status === 'in_transit' && o.deliveredAt > now)
    .sort((a, b) => a.deliveredAt - b.deliveredAt);

  if (inTransitOrders.length > 0) {
    const nextOrder = inTransitOrders[0];
    const etaDate = new Date(nextOrder.deliveredAt);
    const etaStr = `${String(etaDate.getHours()).padStart(2, '0')}:${String(
      etaDate.getMinutes()
    ).padStart(2, '0')}`;
    return {
      text: `${nextOrder.units} units arriving ${etaStr}.`,
      priority: 2,
      kind: 'incoming',
      meta: { units: nextOrder.units, time: etaStr, orderId: nextOrder.id },
    };
  }

  // (6) Otherwise: "All steady."
  return {
    text: 'All steady.',
    priority: 6,
    kind: 'steady',
  };
}

/**
 * Returns the 4-number status strip for the Today screen
 */
export function getHospitalStatusStrip(world: World, hospitalCode: string): StatusStripItem[] {
  const net = selectors.getNetBalance(world, hospitalCode);
  const state = selectors.getHospitalState(world, hospitalCode);
  const usable = selectors.getUsableUnits(world, hospitalCode);
  const demand = selectors.getDemand36(world, hospitalCode);
  const incoming = selectors.getIncomingUnits(world, hospitalCode);
  const exp36 = selectors.getExpiring36Units(world, hospitalCode);

  // Incoming next ETA
  const now = world.simNow;
  const inTransit = Object.values(world.orders)
    .filter((o) => o.to === hospitalCode && o.status === 'in_transit' && o.deliveredAt > now)
    .sort((a, b) => a.deliveredAt - b.deliveredAt);

  let incomingSub = '0 orders';
  let incomingVal = '0u';
  if (inTransit.length > 0) {
    const next = inTransit[0];
    const etaDate = new Date(next.deliveredAt);
    const etaStr = `${String(etaDate.getHours()).padStart(2, '0')}:${String(
      etaDate.getMinutes()
    ).padStart(2, '0')}`;
    incomingVal = `${incoming}u · ${etaStr}`;
    incomingSub = `${inTransit.length} transfer${inTransit.length > 1 ? 's' : ''} in transit`;
  } else {
    incomingVal = `${incoming}u · none`;
    incomingSub = 'No active incoming transfers';
  }

  // Freshness
  const hosp = world.hospitals[hospitalCode];
  const lastVerified = hosp ? hosp.lastVerifiedAt : now - 3600000;
  const isStale = selectors.isDataStale(world, hospitalCode);
  const vDate = new Date(lastVerified);
  const vTime = `${String(vDate.getHours()).padStart(2, '0')}:${String(vDate.getMinutes()).padStart(
    2,
    '0'
  )}`;
  const freshnessStr = isStale ? `Verified yesterday ${vTime}` : `Verified ${vTime}`;

  // Net position label
  const netSign = net > 0 ? `+${net}u` : `${net}u`;

  return [
    {
      id: 'net-position',
      label: 'Net position',
      value: `${netSign} net`,
      subtext: `Usable: ${usable}u · 36h Demand: ${demand}u`,
      tone: state === 'short' ? 'short' : state === 'risk' ? 'risk' : 'ok',
      dataTestId: 'status-strip-net',
    },
    {
      id: 'incoming',
      label: 'Incoming',
      value: incomingVal,
      subtext: incomingSub,
      tone: incoming > 0 ? 'ok' : 'neutral',
      dataTestId: 'status-strip-incoming',
    },
    {
      id: 'expiring-36',
      label: 'Expiring < 36 h',
      value: `${exp36}u`,
      subtext: exp36 > 0 ? 'Eligible for surplus network rescue' : 'Zero units expiring < 36h',
      tone: exp36 > 0 ? 'risk' : 'ok',
      dataTestId: 'status-strip-expiring',
    },
    {
      id: 'freshness',
      label: 'Data freshness',
      value: freshnessStr,
      subtext: isStale ? 'Recount recommended' : 'Verified by In-Charge',
      tone: isStale ? 'risk' : 'ok',
      dataTestId: 'status-strip-freshness',
    },
  ];
}

/**
 * Returns at most 3 items for Needs Your Attention (HOSPITAL_UI_SPEC.md 1.1 & PORTAL_SPEC.md 3.1)
 * Derived strictly from ONE canonical selectors.getHospitalAttention
 */
export function getNeedsYourAttention(world: World, hospitalCode: string): AttentionItem[] {
  const attnList = selectors.getHospitalAttention(world, hospitalCode);
  return attnList.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.message,
    actionLabel: item.actionLabel,
    actionKey: item.actionKey as any,
    tone: item.tone === 'danger' ? 'short' : item.tone === 'warning' ? 'risk' : 'neutral',
    orderId: item.meta?.orderId,
    lotId: item.meta?.lotId,
  }));
}

/**
 * Returns at most 3 active requests for the hospital (PORTAL_SPEC.md 3.1)
 */
export function getActiveHospitalRequests(world: World, hospitalCode: string): PlateletRequest[] {
  return Object.values(world.requests)
    .filter((r) => r.hospital === hospitalCode && r.status !== 'delivered' && r.status !== 'cancelled')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
}

/**
 * Returns latest 5 notifications for the hospital (HOSPITAL_UI_SPEC.md 1.1 & PORTAL_SPEC.md 3.7)
 * Unread notifications directly reflect the canonical attention items
 */
export function getHospitalNotifications(world: World, hospitalCode: string): PortalNotification[] {
  const notifs: PortalNotification[] = [];
  const attnList = selectors.getHospitalAttention(world, hospitalCode);

  // Top attention items are unread action items
  for (const item of attnList) {
    notifs.push({
      id: `notif-${item.id}`,
      title: item.title,
      timeStr: 'Action needed',
      read: false,
      link: item.link,
      type: item.kind === 'arrived' ? 'arrived' : item.kind === 'surplus' ? 'surplus' : 'alert',
    });
  }

  // Include recent order milestones (marked read)
  const now = world.simNow;
  const relatedOrders = Object.values(world.orders)
    .filter((o) => (o.to === hospitalCode || o.from === hospitalCode) && o.status !== 'cancelled')
    .sort((a, b) => b.assignedAt - a.assignedAt);

  for (const o of relatedOrders) {
    if (notifs.length >= 5) break;
    const prodLabel = o.product === 'APH' ? 'Apheresis (SDP)' : 'RDP (random donor)';
    if (o.status === 'in_transit' && o.deliveredAt > now) {
      notifs.push({
        id: `notif-${o.id}-pickup`,
        title: `${o.id} in transit from ${o.from} (${o.units}u ${o.group} ${prodLabel})`,
        timeStr: 'In transit',
        read: true,
        link: `#/hospital/${hospitalCode}/requests/${o.requestId || o.id}`,
        type: 'pickup',
      });
    } else if (o.receivedAt) {
      notifs.push({
        id: `notif-${o.id}-received`,
        title: `${o.id} receipt confirmed (${o.units}u ${o.group} ${prodLabel})`,
        timeStr: 'Completed',
        read: true,
        link: `#/hospital/${hospitalCode}/requests/${o.requestId || o.id}`,
        type: 'arrived',
      });
    }
  }

  return notifs.slice(0, 5);
}

/**
 * Returns hospital name from code
 */
export function getHospitalName(code: string): string {
  const match = rawHospitals.find((h) => h.code.toUpperCase() === code.toUpperCase());
  return match ? match.name : code;
}
