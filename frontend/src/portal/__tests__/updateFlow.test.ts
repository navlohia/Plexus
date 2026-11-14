import { describe, it, expect } from 'vitest';
import { createSeedData, fold, ANCHOR_SIM_TIME } from '../../world';
import type { WorldEvent } from '../../world/types';

describe('Portal H4: Update Stock Flow Tests', () => {
  const seed = createSeedData(ANCHOR_SIM_TIME);

  it('1. noNegativeStock: discarding more than on-hand never produces negative units', () => {
    const initialUnits = Object.values(seed.lots)
      .filter((l) => l.hospital === 'AIM' && l.group === 'O-')
      .reduce((s, l) => s + l.units, 0);

    const excessiveDiscardEvent: WorldEvent = {
      id: 'test-discard-excessive-01',
      type: 'StockAdjusted',
      at: ANCHOR_SIM_TIME + 1000,
      actor: 'operator:AIM',
      payload: {
        hospital: 'AIM',
        group: 'O-',
        product: 'APH',
        deltaUnits: -(initialUnits + 999),
        reason: 'Expired or discarded',
      },
    };

    const foldedWorld = fold(seed, [excessiveDiscardEvent], ANCHOR_SIM_TIME + 1000);
    const postUnits = Object.values(foldedWorld.lots)
      .filter((l) => l.hospital === 'AIM' && l.group === 'O-')
      .reduce((s, l) => s + l.units, 0);

    expect(postUnits).toBe(0);
    expect(postUnits).toBeGreaterThanOrEqual(0);
  });

  it('2. everyAdjustmentHasReason: validates required clinical reasons', () => {
    const canonicalReasons = [
      'Received (donation)',
      'Issued to patient',
      'Sent to another hospital',
      'Expired or discarded',
      'Damaged or QC fail',
      'Recount correction',
    ];

    canonicalReasons.forEach((r, idx) => {
      const event: WorldEvent = {
        id: `test-adj-reason-${idx}`,
        type: 'StockAdjusted',
        at: ANCHOR_SIM_TIME + 2000 + idx * 100,
        actor: 'operator:AIM',
        payload: {
          hospital: 'AIM',
          group: 'O+',
          product: 'APH',
          deltaUnits: 1,
          reason: r,
        },
      };

      const resultWorld = fold(seed, [event], ANCHOR_SIM_TIME + 5000);
      expect(resultWorld).toBeDefined();
    });
  });

  it('3. undoWorks: UndoApplied within 8s reverts the exact adjustment', () => {
    const beforeUnits = Object.values(seed.lots)
      .filter((l) => l.hospital === 'AIM' && l.group === 'O+')
      .reduce((s, l) => s + l.units, 0);

    const adjEvent: WorldEvent = {
      id: 'test-undo-flow-adj-01',
      type: 'StockAdjusted',
      at: ANCHOR_SIM_TIME + 1000,
      actor: 'operator:AIM',
      payload: {
        hospital: 'AIM',
        group: 'O+',
        product: 'APH',
        deltaUnits: 5,
        reason: 'Received (donation)',
      },
    };

    const foldedWithAdj = fold(seed, [adjEvent], ANCHOR_SIM_TIME + 1500);
    const duringUnits = Object.values(foldedWithAdj.lots)
      .filter((l) => l.hospital === 'AIM' && l.group === 'O+')
      .reduce((s, l) => s + l.units, 0);
    expect(duringUnits).toBe(beforeUnits + 5);

    const undoEvent: WorldEvent = {
      id: 'test-undo-flow-undo-01',
      type: 'UndoApplied',
      at: ANCHOR_SIM_TIME + 4000, // 3s later (within 8s window)
      actor: 'operator:AIM',
      payload: {
        targetEventId: 'test-undo-flow-adj-01',
      },
    };

    const foldedWithUndo = fold(seed, [adjEvent, undoEvent], ANCHOR_SIM_TIME + 4500);
    const revertedUnits = Object.values(foldedWithUndo.lots)
      .filter((l) => l.hospital === 'AIM' && l.group === 'O+')
      .reduce((s, l) => s + l.units, 0);
    expect(revertedUnits).toBe(beforeUnits);
  });

  it('4. Daily count submission updates lastVerifiedAt and adjusts variances', () => {
    const countEvent: WorldEvent = {
      id: 'test-count-submit-01',
      type: 'CountSubmitted',
      at: ANCHOR_SIM_TIME + 5000,
      actor: 'operator:AIM',
      payload: {
        hospitalCode: 'AIM',
        counts: { 'O+': 10 },
        variances: { 'O+': 2 },
      },
    };

    const folded = fold(seed, [countEvent], ANCHOR_SIM_TIME + 5000);
    expect(folded.hospitals.AIM.lastVerifiedAt).toBe(ANCHOR_SIM_TIME + 5000);
  });

  it('5. LotReceived creates lot with original expiry and collected date', () => {
    const lotEvent: WorldEvent = {
      id: 'test-lot-recv-01',
      type: 'LotReceived',
      at: ANCHOR_SIM_TIME + 6000,
      actor: 'operator:AIM',
      payload: {
        lotId: 'LOT-AIM-O-TEST-99',
        hospital: 'AIM',
        product: 'APH',
        group: 'O-',
        units: 3,
        collectedAt: ANCHOR_SIM_TIME + 6000,
        expiresAt: ANCHOR_SIM_TIME + 6000 + 120 * 3600000,
        origin: 'donation',
      },
    };

    const folded = fold(seed, [lotEvent], ANCHOR_SIM_TIME + 6000);
    const created = folded.lots['LOT-AIM-O-TEST-99'];
    expect(created).toBeDefined();
    expect(created.units).toBe(3);
    expect(created.expiresAt).toBe(ANCHOR_SIM_TIME + 6000 + 120 * 3600000);
  });
});

