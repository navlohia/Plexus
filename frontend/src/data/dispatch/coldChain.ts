/**
 * src/data/dispatch/coldChain.ts
 * Cold-chain telemetry generator, exception evaluator, and domain rules.
 * LANDING_SPEC.md (v5.2) Section 21.3.
 */

import type { ColdChainTelemetry, DispatchOrder } from './types';

/**
 * Platelet storage guidance:
 * Maintained at 20.0 °C to 24.0 °C under gentle agitation (60 cycles/min).
 * Interrupted agitation budget: 24h total cumulative across all inter-hospital transfers.
 */
export const AGITATION_OFF_BUDGET_H = 24;
export const AGITATION_OFF_BUDGET_MIN = 24 * 60; // 1440 min
export const TEMP_SAFE_MIN_C = 20.0;
export const TEMP_SAFE_MAX_C = 24.0;

/**
 * Generate cold chain telemetry.
 * If hasTempExcursion is true, sets tempC = 24.6 and excursionMin = 6.
 */
export function generateColdChainTelemetry(
  seed: number,
  hasTempExcursion = false
): ColdChainTelemetry {
  if (hasTempExcursion) {
    return {
      tempC: 24.6,
      agitationOffMin: 48,
      sealOk: true,
      doorOpens: 1,
      tiltEvents: 0,
      excursionMin: 6,
    };
  }

  // Deterministic generator using sine pseudo-randomness
  const p = Math.abs(Math.sin(seed * 93.17));
  const tempVariance = (p * 1.8) - 0.9; // [-0.9, +0.9]
  const tempC = Number((22.0 + tempVariance * 0.4).toFixed(1)); // around 21.6 - 22.4 °C
  const agitationOffMin = Math.round(12 + p * 24); // 12 to 36 min

  return {
    tempC,
    agitationOffMin,
    sealOk: true,
    doorOpens: p > 0.8 ? 1 : 0,
    tiltEvents: 0,
    excursionMin: 0,
  };
}

/**
 * Evaluate whether an order qualifies as an Exception per Spec 21.3:
 * (a) temperature outside 20–24 °C for more than 5 min;
 * (b) ETA slip of more than 15 min;
 * (c) shelf life on arrival below 6 h;
 * (d) agitation-off above 75% of budget (>18h) or any single interruption above 8 h (>480 min).
 */
export function isOrderException(order: DispatchOrder): boolean {
  // (a) Temperature excursion outside 20–24 °C for > 5 min
  const isTempOut =
    order.coldChain.tempC < TEMP_SAFE_MIN_C || order.coldChain.tempC > TEMP_SAFE_MAX_C;
  if (isTempOut && (order.coldChain.excursionMin || 0) > 5) {
    return true;
  }
  if (order.hasTempExcursion) {
    return true;
  }

  // (b) ETA slip of more than 15 min
  if (order.isDelayed && (order.delayMin || 0) > 15) {
    return true;
  }

  // (c) Shelf life on arrival below 6 h
  const transitH = order.etaMin / 60;
  const arrivalShelfLifeH = order.shelfLifeAtDispatchH - transitH;
  if (arrivalShelfLifeH < 6.0) {
    return true;
  }

  // (d) Agitation-off above 75% of budget (18h = 1080 min) or single interruption above 8h (480 min)
  if (
    order.coldChain.agitationOffMin > 1080 ||
    order.coldChain.agitationOffMin > 480
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate remaining shelf life on arrival in hours
 */
export function calculateShelfLifeOnArrivalH(order: DispatchOrder): number {
  const elapsedMin = order.etaMin * order.progress;
  const remainingMin = Math.max(0, order.etaMin - elapsedMin);
  return Number(Math.max(0, order.shelfLifeAtDispatchH - remainingMin / 60).toFixed(1));
}

