/**
 * components/workspace/SurgeTab.tsx
 * Stress Lab — rebuilt as a minimal dispatch-consistent console.
 *
 * Exactly three scenario buttons (StressLabScenarioPicker), one live
 * with/without board (StressLabResults), and the bio-mesh animation as the
 * end-of-flow payoff (BioMeshAnimation). No configuration panel: preset
 * parameters live in `world/scenarioPresets.ts`. Every rendered number is
 * derived from the live shared World — nothing hardcoded.
 */

import { useMemo, useRef, useState } from "react";
import type { TickState } from "../../types";
import { dispatchWorldEvent } from "../../world";
import { computeScenarioComparison } from "../../world/counterfactual";
import { SCENARIO_PRESETS, type ScenarioPresetId } from "../../world/scenarioPresets";
import { useWorld } from "./stresslab/useWorld";
import StressLabScenarioPicker from "./stresslab/StressLabScenarioPicker";
import StressLabResults from "./stresslab/StressLabResults";
import BioMeshAnimation from "./stresslab/BioMeshAnimation";

interface SurgeTabProps {
  state: TickState;
  activeCrisisId: string | null;
  onActivateScenario: (id: string) => void;
  onStopScenario: () => void;
  onNavigateToMap: () => void;
}

export default function SurgeTab({
  state: _state,
  activeCrisisId,
  onActivateScenario,
  onStopScenario,
  onNavigateToMap,
}: SurgeTabProps) {
  const world = useWorld();
  const [animKey, setAnimKey] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  const comparison = useMemo(() => computeScenarioComparison(world), [world]);

  const runningPreset = world.activeScenario?.preset ?? null;
  const hasRun =
    Boolean(world.activeScenario) ||
    Boolean(activeCrisisId) ||
    Object.keys(world.requests).some((id) => id.startsWith("scn:"));

  const scrollToPicker = () => {
    pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleActivate = (presetId: ScenarioPresetId) => {
    const preset = SCENARIO_PRESETS[presetId];
    if (!preset) return;

    dispatchWorldEvent("ScenarioStarted", "operator:DISPATCH-01", {
      id: `scn-${presetId}-${Date.now()}`,
      preset: presetId,
      durationH: preset.durationH,
      multiplier: preset.multiplier,
      zones: preset.zones.map((zone) => ({ zone, multiplier: preset.multiplier })),
      productShift: preset.productShift,
      donorDip: preset.donorDip,
      autopilot: preset.autopilot,
    });

    setAnimKey((k) => k + 1);
    onActivateScenario(presetId);
  };

  const handleStop = () => {
    dispatchWorldEvent("ScenarioStopped", "operator:DISPATCH-01", {});
    setAnimKey((k) => k + 1);
    onStopScenario();
  };

  return (
    <div className="stresslab-root">
      <div ref={pickerRef} />

      <div className="stresslab-inner">
        <StressLabScenarioPicker
          world={world}
          activeScenarioId={activeCrisisId ?? runningPreset}
          onActivate={handleActivate}
          onStop={handleStop}
        />

        <StressLabResults comparison={comparison} hasRun={hasRun} />

        <BioMeshAnimation
          world={world}
          activeScenarioId={activeCrisisId ?? runningPreset}
          comparison={comparison}
          animKey={animKey}
          onBackToPicker={scrollToPicker}
          onNavigateToMap={onNavigateToMap}
        />
      </div>
    </div>
  );
}
