import { describe, it, expect } from 'vitest';
import {
  createSeedData,
  fold,
  ANCHOR_SIM_TIME,
  setSimSpeed,
  getSimNow,
  getScenarioMultiplier,
  WorldEvent,
} from '../index';
import { computeScenarioComparison } from '../counterfactual';
import { WorldRunner } from '../runner';

describe('PORTAL_SPEC Section 5: Stress Lab Outbreak Scenario & Counterfactual Analysis', () => {
  const seed = createSeedData(ANCHOR_SIM_TIME);

  it('1. Presets & Dengue Defaults: 72h, x2.0 multiplier, affected zones, +15pt Apheresis, -10% donors', () => {
    const scnEvent: WorldEvent = {
      id: 'test-dengue-start',
      type: 'ScenarioStarted',
      at: ANCHOR_SIM_TIME,
      actor: 'operator:DISPATCH-01',
      payload: { preset: 'dengue' },
    };
    const world = fold(seed, [scnEvent], ANCHOR_SIM_TIME + 1000);
    expect(world.activeScenario).toBeDefined();
    expect(world.activeScenario?.preset).toBe('dengue');
    expect(world.activeScenario?.durationH).toBe(72);
    expect(world.activeScenario?.productShift).toBe(0.15);
    expect(world.activeScenario?.donorDip).toBe(-0.10);
    expect(world.activeScenario?.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ zone: 'East Delhi', multiplier: 2.0 }),
        expect.objectContaining({ zone: 'South Delhi', multiplier: 2.0 }),
        expect.objectContaining({ zone: 'Ghaziabad', multiplier: 2.0 }),
      ])
    );
  });

  it('2. Demand Ramp Calculation: 20% ramp-up, 50% plateau, 30% decay', () => {
    const scnEvent: WorldEvent = {
      id: 'test-dengue-ramp',
      type: 'ScenarioStarted',
      at: ANCHOR_SIM_TIME,
      actor: 'operator:DISPATCH-01',
      payload: {
        preset: 'dengue',
        durationH: 72,
        zones: [{ zone: 'East Delhi', multiplier: 2.0 }],
      },
    };
    const totalDuration = 72 * 3600000;

    // At t=0 (0% elapsed) -> multiplier is 1.0
    const w0 = fold(seed, [scnEvent], ANCHOR_SIM_TIME);
    expect(getScenarioMultiplier(w0, 'East Delhi')).toBe(1.0);

    // At t=0.10 * 72h (10% elapsed, halfway up ramp) -> multiplier is ~1.5
    const wRamp = fold(seed, [scnEvent], ANCHOR_SIM_TIME + 0.1 * totalDuration);
    expect(getScenarioMultiplier(wRamp, 'East Delhi')).toBeCloseTo(1.5, 1);

    // At t=0.40 * 72h (40% elapsed, in plateau) -> multiplier is 2.0
    const wPlateau = fold(seed, [scnEvent], ANCHOR_SIM_TIME + 0.4 * totalDuration);
    expect(getScenarioMultiplier(wPlateau, 'East Delhi')).toBe(2.0);

    // At t=0.85 * 72h (85% elapsed, halfway down decay) -> multiplier is ~1.5
    const wDecay = fold(seed, [scnEvent], ANCHOR_SIM_TIME + 0.85 * totalDuration);
    expect(getScenarioMultiplier(wDecay, 'East Delhi')).toBeCloseTo(1.5, 1);

    // Neighbor zone (Central Delhi) gets 50% uplift during plateau
    expect(getScenarioMultiplier(wPlateau, 'Central Delhi')).toBeCloseTo(1.5, 1);
  });

  it('3. Sim speed continuity: re-anchors clock smoothly without time leaps', () => {
    const beforeSim = getSimNow();
    setSimSpeed(30);
    const afterSim30 = getSimNow();
    expect(Math.abs(afterSim30 - beforeSim)).toBeLessThan(500);

    setSimSpeed(120);
    const afterSim120 = getSimNow();
    expect(Math.abs(afterSim120 - afterSim30)).toBeLessThan(500);

    // Restore 1x
    setSimSpeed(1);
  });

  it('4. Autonomous dispatch toggle: SettingChanged updates autopilot flag', () => {
    const settingEvent: WorldEvent = {
      id: 'test-autopilot-on',
      type: 'SettingChanged',
      at: ANCHOR_SIM_TIME,
      actor: 'operator:DISPATCH-01',
      payload: { autopilot: true },
    };
    const world = fold(seed, [settingEvent], ANCHOR_SIM_TIME + 1000);
    expect(world.settings.autopilot).toBe(true);
  });

  it('5. Counterfactual Engine: derived from world, WITHOUT never beats the mesh', () => {
    const scnEvent: WorldEvent = {
      id: 'test-dengue-compare',
      type: 'ScenarioStarted',
      at: ANCHOR_SIM_TIME,
      actor: 'operator:DISPATCH-01',
      payload: { preset: 'dengue' },
    };
    const world = fold(seed, [scnEvent], ANCHOR_SIM_TIME + 1000);
    const comparison = computeScenarioComparison(world);

    expect(comparison.withPlexus).toBeDefined();
    expect(comparison.withoutPlexus).toBeDefined();

    // Monotonicity: an isolated network can never outperform the mesh
    expect(comparison.withoutPlexus.unmetUnits).toBeGreaterThanOrEqual(comparison.withPlexus.unmetUnits);
    expect(comparison.withoutPlexus.expiredUnits).toBeGreaterThanOrEqual(comparison.withPlexus.expiredUnits);
    expect(comparison.withoutPlexus.outdateRatePct).toBeGreaterThanOrEqual(comparison.withPlexus.outdateRatePct);

    // Rescued units: zero cross-hospital sharing in the counterfactual
    expect(comparison.withoutPlexus.rescuedUnits).toBe(0);
    expect(comparison.withPlexus.rescuedUnits).toBeGreaterThanOrEqual(0);

    // Service level: percentages stay in bounds and WITH >= WITHOUT
    // (null only when no requests exist in scope at all)
    const withPct = comparison.withPlexus.serviceLevelPct;
    const withoutPct = comparison.withoutPlexus.serviceLevelPct;
    if (withPct === null) {
      expect(withoutPct).toBeNull();
    } else {
      expect(withPct).toBeGreaterThanOrEqual(0);
      expect(withPct).toBeLessThanOrEqual(100);
      expect(withoutPct).not.toBeNull();
      expect(withoutPct as number).toBeLessThanOrEqual(withPct);
    }
  });

  it('6. Scenario request generation & Autopilot assignment runner loop', () => {
    const scnEvent: WorldEvent = {
      id: 'test-scn-gen',
      type: 'ScenarioStarted',
      at: ANCHOR_SIM_TIME,
      actor: 'operator:DISPATCH-01',
      payload: { preset: 'dengue', autopilot: true },
    };
    const worldWithScn = fold(seed, [scnEvent], ANCHOR_SIM_TIME + 25 * 60000); // 25 min in

    const runner = new WorldRunner();
    const produced = runner.tick(worldWithScn);

    // Should produce deterministic scenario requests `scn:`
    const scnRequests = produced.filter((e) => e.id.startsWith('scn:'));
    expect(scnRequests.length).toBeGreaterThan(0);
    expect(scnRequests[0].type).toBe('RequestCreated');
    expect(scnRequests[0].payload.sourceTag).toBe('Simulated scenario');
  });
});

