/**
 * src/data/dispatch/simClock.ts
 * Simulation clock advancing order statuses and progress at max 1 Hz.
 * Supports ?speed=N query parameter.
 * LANDING_SPEC.md (v5.2) Section 21.3.
 */

import type { DispatchOrder } from './types';

/**
 * Read demo speed multiplier from URL (?speed=N)
 */
export function getSimSpeedMultiplier(): number {
  if (typeof window === 'undefined') return 1;
  const params = new URLSearchParams(window.location.search);
  const speed = parseFloat(params.get('speed') || '1');
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

/**
 * Advance orders through simulation clock:
 * Statuses advance: proposed -> (approve) -> picked_up (+4 min) -> in_transit -> delivered at ETA
 */
export function advanceSimulationOrders(
  orders: DispatchOrder[],
  deltaSec: number
): { orders: DispatchOrder[]; changed: boolean } {
  let hasChanged = false;

  const nextOrders = orders.map((order) => {
    // 1. Picked up: advance to in_transit after 4 simulated minutes
    if (order.status === 'picked_up') {
      const currentProgress = order.progress || 0;
      // 4 min = 240 seconds
      const nextProgress = currentProgress + deltaSec / 240;
      if (nextProgress >= 1.0) {
        hasChanged = true;
        return {
          ...order,
          status: 'in_transit' as const,
          progress: 0.05,
        };
      }
      return {
        ...order,
        progress: nextProgress,
      };
    }

    // 2. In transit: advance progress towards ETA
    if (order.status === 'in_transit') {
      const totalTransitSec = Math.max(60, order.etaMin * 60);
      const progressDelta = deltaSec / totalTransitSec;
      const nextProgress = Math.min(1.0, order.progress + progressDelta);

      if (nextProgress >= 1.0) {
        hasChanged = true;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;
        return {
          ...order,
          status: 'delivered' as const,
          progress: 1.0,
          deliveredAt: timeStr,
        };
      }

      if (Math.abs(nextProgress - order.progress) > 0.005) {
        hasChanged = true;
        return {
          ...order,
          progress: Number(nextProgress.toFixed(4)),
        };
      }
    }

    return order;
  });

  return { orders: nextOrders, changed: hasChanged };
}

