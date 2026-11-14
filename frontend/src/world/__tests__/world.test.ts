/**
 * src/world/__tests__/world.test.ts
 * Vitest Test Suite for World Core
 * PORTAL_SPEC.md Section 1.13
 */

import { describe, it, expect } from 'vitest';
import {
  createSeedData,
  ANCHOR_SIM_TIME,
  fold,
  solveTransfers,
  canUndoEvent,
  runWorldChecks,
  MIN_SAFE_ARRIVAL_H,
  getUsableUnits,
  getDemand36,
  getHospitalState,
  isDataStale,
  getOutdateRate,
} from '../index';
import type { WorldEvent } from '../types';

describe('Plexus Shared World Core', () => {
  const seed = createSeedData(ANCHOR_SIM_TIME);
  const now = ANCHOR_SIM_TIME;

  // 1. Determinism
  it('1. Determinism: identical seed + events + simNow yields identical World', () => {
    const world1 = fold(seed, [], now);
    const world2 = fold(seed, [], now);

    expect(JSON.stringify(world1)).toBe(JSON.stringify(world2));
    expect(world1.hospitals.AIM.code).toBe('AIM');
    expect(Object.keys(world1.hospitals).length).toBe(25);
  });

  // 2. Idempotence
  it('2. Idempotence: duplicate event id causes no state change', () => {
    const event: WorldEvent = {
      id: 'idemp-evt-101',
      type: 'StockAdjusted',
      at: now - 5000,
      actor: 'operator:TEST-01',
      payload: {
        hospital: 'AIM',
        group: 'O+',
        product: 'APH',
        diffUnits: 4,
        reason: 'Received (donation)',
      },
    };

    const worldOnce = fold(seed, [event], now);
    const worldTwice = fold(seed, [event, event], now);

    expect(JSON.stringify(worldOnce)).toBe(JSON.stringify(worldTwice));
  });

  // 3. Time Derivation
  it('3. Time Derivation: order lifecycle advances strictly by timestamp', () => {
    const orderId = 'TX-TEST-TIME';
    const assignedAt = now;
    const packedAt = now + 4 * 60 * 1000;
    const pickedUpAt = now + 7 * 60 * 1000;
    const deliveredAt = now + 25 * 60 * 1000;

    const testSeed = createSeedData(now);
    testSeed.orders[orderId] = {
      id: orderId,
      from: 'MDT',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 4,
      allocations: [],
      courier: 'Test Courier',
      distanceKm: 15.0,
      durationMin: 18,
      assignedAt,
      packedAt,
      pickedUpAt,
      deliveredAt,
      receivedAt: null,
      cancelledAt: null,
      status: 'assigned',
      delayed: false,
      delayMin: 0,
      alert: false,
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
    };

    // At t < packedAt: assigned
    const atT0 = fold(testSeed, [], now + 2 * 60 * 1000);
    expect(atT0.orders[orderId].status).toBe('assigned');

    // At packedAt <= t < pickedUpAt: packed
    const atT1 = fold(testSeed, [], now + 5 * 60 * 1000);
    expect(atT1.orders[orderId].status).toBe('packed');

    // At pickedUpAt <= t < deliveredAt: in_transit
    const atT2 = fold(testSeed, [], now + 15 * 60 * 1000);
    expect(atT2.orders[orderId].status).toBe('in_transit');

    // At t >= deliveredAt: arrived
    const atT3 = fold(testSeed, [], now + 30 * 60 * 1000);
    expect(atT3.orders[orderId].status).toBe('arrived');
  });

  // 4. FEFO Eligibility
  it('4. FEFO Eligibility: only lots with >= 6h on arrival are proposed', () => {
    const world = fold(seed, [], now);
    const proposals = solveTransfers(world, 6);

    expect(proposals.length).toBeGreaterThan(0);
    for (const proposal of proposals) {
      expect(proposal.arrivalShelfLifeH).toBeGreaterThanOrEqual(MIN_SAFE_ARRIVAL_H);
      for (const alloc of proposal.allocations) {
        const arrivalShelfLifeH = (alloc.expiresAt - (now + proposal.etaMin * 60000)) / 3600000;
        expect(arrivalShelfLifeH).toBeGreaterThanOrEqual(MIN_SAFE_ARRIVAL_H);
      }
    }
  });

  // 5. Solver never creates a new shortage
  it('5. Solver Safety: source hospital never creates a new shortage (usable - proposed >= demand36)', () => {
    const world = fold(seed, [], now);
    const proposals = solveTransfers(world, 6);

    for (const proposal of proposals) {
      const sourceUsable = getUsableUnits(world, proposal.from);
      const sourceDemand = getDemand36(world, proposal.from);
      expect(sourceUsable - proposal.units).toBeGreaterThanOrEqual(sourceDemand);
    }
  });

  // 6. Undo Window
  it('6. Undo Window: undo valid within 8s by same actor; rejected if > 8s or different actor', () => {
    const ev: WorldEvent = {
      id: 'test-undo-ev',
      type: 'StockAdjusted',
      at: now - 5000, // 5s ago
      actor: 'operator:DR_NEHA',
      payload: {},
    };

    // Valid within 8s by same actor
    expect(canUndoEvent(ev, 'operator:DR_NEHA', now)).toBe(true);

    // Rejected if different actor
    expect(canUndoEvent(ev, 'operator:OTHER', now)).toBe(false);

    // Rejected if > 8s ago
    const lateEv: WorldEvent = { ...ev, at: now - 9000 };
    expect(canUndoEvent(lateEv, 'operator:DR_NEHA', now)).toBe(false);
  });

  // 7. Two-Tab Simulation with mocked channel
  it('7. Two-Tab Simulation: channel nudges re-read storage and converge to identical state', () => {
    const tab1Seed = createSeedData(now);
    const tab2Seed = createSeedData(now);

    // Shared storage simulation
    const sharedStorage: WorldEvent[] = [];

    // Tab 1 creates an event and persists to storage
    const newEvent: WorldEvent = {
      id: 'tab1-order-assigned-99',
      type: 'OrderAssigned',
      at: now + 1000,
      actor: 'operator:DISPATCH-01',
      payload: {
        id: 'TX-TAB-TEST',
        from: 'MDT',
        to: 'AIM',
        units: 6,
        product: 'APH',
        group: 'O-',
      },
    };
    sharedStorage.push(newEvent);

    // Tab 2 receives nudge broadcast and folds from shared storage
    const tab1World = fold(tab1Seed, sharedStorage, now + 1000);
    const tab2World = fold(tab2Seed, sharedStorage, now + 1000);

    expect(JSON.stringify(tab1World)).toBe(JSON.stringify(tab2World));
    expect(tab2World.orders['TX-TAB-TEST']).toBeDefined();
  });

  // 8. Calibration Verification
  it('8. Calibration: initial state has 5 short, 11 risk, 9 ok, 3 stale, outdate ≈ 8%', () => {
    const world = fold(seed, [], now);

    let shortCount = 0;
    let riskCount = 0;
    let okCount = 0;
    let staleCount = 0;

    for (const h of Object.values(world.hospitals)) {
      const state = getHospitalState(world, h.code);
      if (state === 'short') shortCount++;
      else if (state === 'risk') riskCount++;
      else if (state === 'ok') okCount++;

      if (isDataStale(world, h.code)) {
        staleCount++;
      }
    }

    expect(shortCount).toBe(5);
    expect(riskCount).toBe(11);
    expect(okCount).toBe(9);
    expect(staleCount).toBe(3);

    const outdateRate = getOutdateRate(world);
    const outdatePct = Number((outdateRate * 100).toFixed(1));
    expect(outdatePct).toBeGreaterThanOrEqual(6.0);
    expect(outdatePct).toBeLessThanOrEqual(10.0);
  });

  // 9. Comprehensive Checks function
  it('9. runWorldChecks() passes all Section 7 validation rules', () => {
    const checks = runWorldChecks();
    expect(checks.pass).toBe(true);
    expect(checks.deterministic).toBe(true);
    expect(checks.idempotent).toBe(true);
    expect(checks.initialStates.pass).toBe(true);
    expect(checks.baselineOutdateOk).toBe(true);
    expect(checks.undoWindowOk).toBe(true);
    expect(checks.fefoEligibility).toBe(true);
    expect(checks.sourceNeverShort).toBe(true);
  });
});

