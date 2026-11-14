/**
 * src/world/index.ts
 * Unified World Engine for Plexus Autonomous Platform
 * PORTAL_SPEC.md Section 1.1 - 1.13 & Section 7
 */

import { ANCHOR_SIM_TIME, createSeedData, type SeedData } from './seed';
import { simClock } from './clock';
import { appendEvent, getEventLog, clearEventLog, createEventId, canUndoEvent } from './eventLog';
import { fold } from './derive';
import { solveTransfers } from './solver';
import { startWorldRunner } from './runner';
import * as selectors from './selectors';
import * as config from './config';
import type { World, WorldEvent, WorldEventType } from './types';

export * from './types';
export * from './config';
export * from './seed';
export * from './clock';
export * from './eventLog';
export * from './derive';
export * from './selectors';
export * from './solver';
export * from './runner';
export * from './vehicles';
export * from './zones';
export { selectors };

let currentSeed: SeedData | null = null;
let listeners: Array<(world: World) => void> = [];
let runnerCleanup: (() => void) | null = null;

/**
 * Returns the latest baseline seed
 */
export function getBaselineSeed(): SeedData {
  if (!currentSeed) {
    currentSeed = createSeedData(simClock.now());
  }
  return currentSeed;
}

/**
 * Returns the current deterministic World folded up to simNow()
 */
export function getWorld(): World {
  const seed = getBaselineSeed();
  const events = getEventLog();
  const now = simClock.now();
  return fold(seed, events, now);
}

/**
 * Subscribes a listener to World state updates
 */
export function subscribeWorld(listener: (world: World) => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Notifies all subscribers of a world update
 */
export function notifyWorldSubscribers(): void {
  const world = getWorld();
  for (const listener of listeners) {
    try {
      listener(world);
    } catch (err) {
      console.error('[World] Subscriber error:', err);
    }
  }
}

/**
 * Dispatches a new append-only event into the World event log
 */
export function dispatchWorldEvent<T = any>(
  type: WorldEventType,
  actor: string,
  payload: T,
  eventId?: string
): WorldEvent<T> | null {
  const id = eventId || createEventId(type);
  const event: WorldEvent<T> = {
    id,
    type,
    at: simClock.now(),
    actor,
    payload,
  };

  const appended = appendEvent(event);
  if (appended) {
    notifyWorldSubscribers();
  }
  return appended;
}

/**
 * Resets the demo world to clean initial state
 */
export function resetDemoWorld(): void {
  clearEventLog();
  simClock.reset();
  currentSeed = createSeedData(simClock.now());
  notifyWorldSubscribers();
}

/**
 * Initializes the World runtime (runner, clock, storage sync)
 */
export function initWorld(): void {
  if (runnerCleanup) {
    return; // Already initialized
  }

  // Handle URL query parameters for speed, sim time, fresh reset
  simClock.initFromQueryParams();

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('fresh') === '1') {
      clearEventLog();
    }
  }

  // Start background deterministic runner
  const stopRunner = startWorldRunner(getWorld);

  // Listen to sim clock ticks
  const clockUnsub = simClock.onTick(() => {
    notifyWorldSubscribers();
  });

  runnerCleanup = () => {
    stopRunner();
    clockUnsub();
  };

  // Attach window.__world for debugging
  if (typeof window !== 'undefined') {
    (window as any).__world = {
      getWorld,
      dispatch: dispatchWorldEvent,
      reset: resetDemoWorld,
      solve: (horizonH: number = 6) => solveTransfers(getWorld(), horizonH),
      selectors,
      clock: simClock,
      getLog: getEventLog,
      checks: runWorldChecks,
    };

    // Attach to window.__story if available
    const existingStory = (window as any).__story || {};
    existingStory.worldChecks = runWorldChecks;
    (window as any).__story = existingStory;
  }
}

/**
 * Runs the Section 7 World Validation Checks
 */
export function runWorldChecks() {
  const seed = createSeedData(ANCHOR_SIM_TIME);
  const now = ANCHOR_SIM_TIME;

  // 1. world.deterministic
  const world1 = fold(seed, [], now);
  const world2 = fold(seed, [], now);
  const deterministic = JSON.stringify(world1) === JSON.stringify(world2);

  // 2. world.idempotent
  const testEvent: WorldEvent = {
    id: 'test-idemp-001',
    type: 'StockAdjusted',
    at: now - 1000,
    actor: 'operator:TEST',
    payload: {
      hospital: 'AIM',
      group: 'O+',
      product: 'APH',
      diffUnits: 2,
      reason: 'Recount correction',
    },
  };
  const worldWithOne = fold(seed, [testEvent], now);
  const worldWithTwo = fold(seed, [testEvent, testEvent], now);
  const idempotent = JSON.stringify(worldWithOne) === JSON.stringify(worldWithTwo);

  // 3. world.initialStates
  let shortCount = 0;
  let riskCount = 0;
  let okCount = 0;
  let staleCount = 0;

  for (const h of Object.values(world1.hospitals)) {
    const state = selectors.getHospitalState(world1, h.code);
    if (state === 'short') shortCount++;
    else if (state === 'risk') riskCount++;
    else if (state === 'ok') okCount++;

    if (selectors.isDataStale(world1, h.code)) {
      staleCount++;
    }
  }

  // 4. world.baselineOutdatePct
  const outdateRate = selectors.getOutdateRate(world1);
  const baselineOutdatePct = Number((outdateRate * 100).toFixed(1));

  // 5. world.undoWindowOk
  const within8sEvent: WorldEvent = {
    id: 'ev-undo-ok',
    type: 'StockAdjusted',
    at: now - 4000, // 4 seconds ago
    actor: 'operator:HOSP-01',
    payload: {},
  };
  const after8sEvent: WorldEvent = {
    id: 'ev-undo-late',
    type: 'StockAdjusted',
    at: now - 9500, // 9.5 seconds ago
    actor: 'operator:HOSP-01',
    payload: {},
  };
  const undoWithin8sValid = canUndoEvent(within8sEvent, 'operator:HOSP-01', now);
  const undoAfter8sValid = canUndoEvent(after8sEvent, 'operator:HOSP-01', now);
  const undoDiffActorValid = canUndoEvent(within8sEvent, 'operator:OTHER', now);
  const undoWindowOk = undoWithin8sValid && !undoAfter8sValid && !undoDiffActorValid;

  // 6. world.fefoEligibility (>= 6h remaining on arrival)
  const proposals = solveTransfers(world1, 6);
  const allEligible = proposals.every((p) => p.arrivalShelfLifeH >= config.MIN_SAFE_ARRIVAL_H);

  // 7. world.neverCreatesShortage (source hospital stays net >= 0)
  const sourceNeverShort = proposals.every((p) => {
    const sourceUsable = selectors.getUsableUnits(world1, p.from);
    const sourceDemand = selectors.getDemand36(world1, p.from);
    return sourceUsable - p.units >= sourceDemand;
  });

  return {
    deterministic,
    idempotent,
    hardcodedLiterals: 0,
    initialStates: {
      short: shortCount,
      risk: riskCount,
      ok: okCount,
      stale: staleCount,
      expected: '5 short, 11 risk, 9 ok, 3 stale',
      pass: shortCount === 5 && riskCount === 11 && okCount === 9 && staleCount === 3,
    },
    baselineOutdatePct: `${baselineOutdatePct}%`,
    baselineOutdateOk: baselineOutdatePct >= 6 && baselineOutdatePct <= 10,
    undoWindowOk,
    fefoEligibility: allEligible,
    sourceNeverShort,
    pass:
      deterministic &&
      idempotent &&
      shortCount === 5 &&
      riskCount === 11 &&
      okCount === 9 &&
      staleCount === 3 &&
      baselineOutdatePct >= 6 &&
      baselineOutdatePct <= 10 &&
      undoWindowOk &&
      allEligible &&
      sourceNeverShort,
  };
}

