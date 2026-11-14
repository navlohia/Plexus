/**
 * src/world/scenarioPresets.ts
 * Fixed per-preset scenario parameters for the Stress Lab.
 *
 * The Stress Lab UI exposes exactly three scenario buttons — no configuration
 * controls. Each preset below is the single source of truth for what gets
 * dispatched in the `ScenarioStarted` event payload when its button runs.
 */

export type ScenarioPresetId = 'dengue' | 'trauma' | 'agitator';

export interface ScenarioPreset {
  durationH: number;
  multiplier: number;
  zones: string[];
  autopilot: boolean;
  /** Share of apheresis (APH) product in scenario requests, e.g. 0.15 */
  productShift: number;
  /** Relative donor-supply dip during the scenario, e.g. -0.10 */
  donorDip: number;
}

export const SCENARIO_PRESETS: Record<ScenarioPresetId, ScenarioPreset> = {
  // East Delhi dengue: 72h platelet surge across East/South Delhi
  dengue: {
    durationH: 72,
    multiplier: 2.0,
    zones: ['East Delhi', 'South Delhi'],
    autopilot: true,
    productShift: 0.15,
    donorDip: -0.10,
  },
  // NH-48 mass casualty: fast STAT O-negative drain around Gurugram
  trauma: {
    durationH: 24,
    multiplier: 2.5,
    zones: ['Gurugram', 'South Delhi'],
    autopilot: true,
    productShift: 0,
    donorDip: -0.10,
  },
  // Safdarjung agitator fault: local thermal-cutoff evacuation event
  agitator: {
    durationH: 12,
    multiplier: 1.0,
    zones: ['South Delhi'],
    autopilot: true,
    productShift: 0,
    donorDip: -0.10,
  },
};
