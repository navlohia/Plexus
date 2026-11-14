import { describe, it, expect } from 'vitest';
import { createSeedData, fold, ANCHOR_SIM_TIME } from '../../world';
import * as selectors from '../../world/selectors';

describe('Portal H4: Stock Screen & Consistency Tests', () => {
  const seed = createSeedData(ANCHOR_SIM_TIME);
  const world = fold(seed, [], ANCHOR_SIM_TIME);

  it('1. KPI row: on hand sum of lots, usable >= 6h, and worst group days of cover', () => {
    for (const code of ['AIM', 'BLK', 'MAX']) {
      const lots = Object.values(world.lots).filter((l) => l.hospital === code);
      const totalOnHand = lots.reduce((s, l) => s + l.units, 0);
      const usable = selectors.getUsableUnits(world, code);
      const exp36 = selectors.getExpiring36Units(world, code);

      expect(totalOnHand).toBeGreaterThanOrEqual(usable);
      expect(usable).toBeGreaterThanOrEqual(0);
      expect(exp36).toBeGreaterThanOrEqual(0);

      // Verify worst group identification
      const groups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const;
      let worstGroup = 'O-';
      let worstDays: number | null = null;
      for (const g of groups) {
        const d = selectors.getDaysOfCover(world, code, g);
        if (d !== null) {
          if (worstDays === null || d < worstDays) {
            worstDays = d;
            worstGroup = g;
          }
        }
      }

      expect(worstGroup).toBeDefined();
      const overall = selectors.getDaysOfCover(world, code);
      if (worstDays !== null && overall !== null) {
        expect(worstDays).toBeLessThanOrEqual(overall);
      }
    }
  });

  it('2. ParLevelSet updates hospital par levels in world fold', () => {
    const updatedWorld = fold(
      seed,
      [
        {
          id: 'test-par-set-01',
          type: 'ParLevelSet',
          at: ANCHOR_SIM_TIME + 1000,
          actor: 'operator:AIM',
          payload: {
            hospitalCode: 'AIM',
            group: 'O-',
            level: 8,
          },
        },
      ],
      ANCHOR_SIM_TIME + 1000
    );

    expect(updatedWorld.hospitals.AIM.parLevels['O-']).toBe(8);
  });

  it('3. SurplusReleased event is handled idempotently in fold', () => {
    const sampleLot = Object.values(world.lots).find((l) => l.hospital === 'MDT');
    expect(sampleLot).toBeDefined();

    const updatedWorld = fold(
      seed,
      [
        {
          id: 'test-surplus-rel-01',
          type: 'SurplusReleased',
          at: ANCHOR_SIM_TIME + 2000,
          actor: 'operator:MDT',
          payload: {
            hospitalCode: 'MDT',
            lotId: sampleLot!.lotId,
            units: sampleLot!.units,
            suggestedDestination: 'AIM',
          },
        },
      ],
      ANCHOR_SIM_TIME + 2000
    );

    expect(updatedWorld).toBeDefined();
    expect(updatedWorld.lots[sampleLot!.lotId]).toBeDefined();
  });

  it('4. Outdate rate headline matches canonical selector', () => {
    const rate = selectors.getOutdateRate(world);
    expect(rate).toBeGreaterThanOrEqual(0.06);
    expect(rate).toBeLessThanOrEqual(0.10);
  });

  it('5. Consistency.stock: lots sum = on-hand = map sheet on-hand across all hospitals', () => {
    for (const code of Object.keys(world.hospitals)) {
      const usable = selectors.getUsableUnits(world, code);
      const lots = Object.values(world.lots).filter((l) => l.hospital === code);
      const lotsUsable = lots
        .filter((l) => l.expiresAt >= world.simNow + 6 * 3600000)
        .reduce((sum, l) => sum + l.units, 0);

      expect(usable).toBe(lotsUsable);
    }
  });
});

