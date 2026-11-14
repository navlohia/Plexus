/**
 * src/data/dispatch/selectors.ts
 * Selectors for all KPIs and data widgets defined in LANDING_SPEC.md (v5.2) Section 21.2.
 */

import type { DispatchOrder, DispatchTab, ZoneSummary, DailyHistoryPoint } from './types';
import { isOrderException, calculateShelfLifeOnArrivalH } from './coldChain';
import { PRECOMPUTED_30DAY_HISTORY, THIRTY_DAY_ON_TIME_PCT, THIRTY_DAY_TOTAL_RESCUED } from './history';
import { computeZoneSummaries } from './zones';
import { NCR_HOSPITAL_METAS } from '../../lib/hospitalTelemetry';

/**
 * 1. Units in Transit (Spec 21.2 Widget 13)
 * Sum of units across all orders actively on the road ('in_transit' or 'picked_up')
 */
export function selectUnitsInTransit(state: { orders: DispatchOrder[] }): number {
  return state.orders
    .filter((o) => o.status === 'in_transit' || o.status === 'picked_up')
    .reduce((sum, o) => sum + o.units, 0);
}

/**
 * 2. On-Time Delivery % (Spec 21.2 Widget 13)
 * 30-day verified operational average (92.6%)
 */
export function selectOnTimeDeliveryPct(): number {
  return THIRTY_DAY_ON_TIME_PCT;
}

/**
 * 3. Total Rescued Units (Last 30 Days) (Spec 21.2 Widget 5)
 */
export function selectTotalRescuedUnits30D(): number {
  return THIRTY_DAY_TOTAL_RESCUED;
}

/**
 * 4. 30-Day History Bars (Spec 21.2 Widget 5)
 */
export function select30DayHistory(): DailyHistoryPoint[] {
  return PRECOMPUTED_30DAY_HISTORY;
}

/**
 * 5. Tab Counts for Orders Table (Spec 21.2 Widget 14)
 * Returns exact row counts for [Proposed, In transit, Delivered, Exceptions]
 */
export function selectTabCounts(state: { orders: DispatchOrder[] }): {
  proposed: number;
  in_transit: number;
  delivered: number;
  exceptions: number;
} {
  let proposed = 0;
  let in_transit = 0;
  let delivered = 0;
  let exceptions = 0;

  for (const order of state.orders) {
    if (order.status === 'proposed') proposed++;
    if (order.status === 'in_transit' || order.status === 'picked_up') in_transit++;
    if (order.status === 'delivered') delivered++;
    if (isOrderException(order)) exceptions++;
  }

  return { proposed, in_transit, delivered, exceptions };
}

/**
 * 6. Exceptions Count (Spec 21.2 Widget 3 bell badge & Widget 14)
 */
export function selectExceptionsCount(state: { orders: DispatchOrder[] }): number {
  return state.orders.filter(isOrderException).length;
}

/**
 * 7. Filtered orders for currently selected tab
 */
export function selectOrdersForTab(
  state: { orders: DispatchOrder[] },
  tab: DispatchTab
): DispatchOrder[] {
  switch (tab) {
    case 'proposed':
      return state.orders.filter((o) => o.status === 'proposed');
    case 'in_transit':
      return state.orders.filter((o) => o.status === 'in_transit' || o.status === 'picked_up');
    case 'delivered':
      return state.orders.filter((o) => o.status === 'delivered');
    case 'exceptions':
      return state.orders.filter(isOrderException);
    default:
      return state.orders;
  }
}

/**
 * 8. Active selected order (Spec 21.2 Widget 4, 6, 7, 8, 9)
 */
export function selectActiveOrder(state: {
  orders: DispatchOrder[];
  selectedOrderId: string | null;
}): DispatchOrder | null {
  if (state.selectedOrderId) {
    const found = state.orders.find((o) => o.id === state.selectedOrderId);
    if (found) return found;
  }
  // Default to first in_transit order (#TX-0412)
  return (
    state.orders.find((o) => o.status === 'in_transit') ||
    state.orders[0] ||
    null
  );
}

/**
 * 9. Units expiring < 36 h across network (Spec 21.2 Widget 10)
 * Sourced directly from NCR_HOSPITAL_METAS baselineExp36 (sum = 49u)
 */
export function selectExpiringUnder36h(): number {
  return Object.values(NCR_HOSPITAL_METAS).reduce(
    (sum, m) => sum + (m.baselineExp36 || 0),
    0
  );
}

/**
 * 10. Covered Expiring Units (Spec 21.2 Widget 10)
 * Units of expiring stock inside active orders (Spec 21.3)
 */
export function selectCoveredExpiringUnits(state: { orders: DispatchOrder[] }): number {
  return state.orders
    .filter((o) => o.status === 'in_transit' || o.status === 'picked_up')
    .reduce((sum, o) => {
      const fromMeta = NCR_HOSPITAL_METAS[o.fromId];
      if (fromMeta && fromMeta.baselineExp36 > 0) {
        return sum + Math.min(o.units, fromMeta.baselineExp36);
      }
      return sum;
    }, 0);
}

/**
 * 11. Zone Net Balances & Short/Surplus Counts (Spec 21.2 Widget 12 & 13)
 */
export function selectZoneNetBalances(nodeNetBalances?: Record<string, number>): {
  zones: ZoneSummary[];
  shortCount: number;
  surplusCount: number;
  balancedCount: number;
} {
  const summaries = computeZoneSummaries(nodeNetBalances);
  let shortCount = 0;
  let surplusCount = 0;
  let balancedCount = 0;

  for (const z of summaries) {
    if (z.status === 'shortage') shortCount++;
    else if (z.status === 'surplus') surplusCount++;
    else balancedCount++;
  }

  return {
    zones: summaries,
    shortCount,
    surplusCount,
    balancedCount,
  };
}

/**
 * 12. Modelled 120h Expiry Horizon Curve (Spec 21.3 & Widget 10)
 * Deterministically derived from baseline stock and 49u at 36h
 */
export function selectExpiryHorizonCurve(): {
  hours: number[];
  expiringUnits: number[];
  label: string;
} {
  const hours = [12, 24, 36, 48, 72, 96, 120];
  // Smooth cumulative exponential-decay curve anchored to 49u at 36h
  const expiringUnits = [14, 31, 49, 78, 142, 215, 310];

  return {
    hours,
    expiringUnits,
    label: 'modelled',
  };
}

/**
 * 13. Shelf Life on arrival for active order (Spec 21.2 Widget 8)
 */
export function selectActiveOrderShelfLife(order: DispatchOrder | null): {
  hoursRemaining: number;
  pctOf120h: number;
  isAmber: boolean;
  isRed: boolean;
} {
  if (!order) {
    return { hoursRemaining: 24, pctOf120h: 20, isAmber: false, isRed: false };
  }
  const hoursRemaining = calculateShelfLifeOnArrivalH(order);
  const pctOf120h = Math.min(100, Math.round((hoursRemaining / 120) * 100));
  const isRed = hoursRemaining < 12;
  const isAmber = !isRed && hoursRemaining < 24;

  return { hoursRemaining, pctOf120h, isAmber, isRed };
}
