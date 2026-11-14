/**
 * stresslab/StressLabScenarioPicker.tsx
 * Stress Lab chrome: dispatch-identical status strip + 52px toolbar, then the
 * only three controls on the page — one panel per scenario. No glows, no
 * accent rails, no tinted chips: running state is mono status text + Stop.
 * Keyboard: 1/2/3 run a scenario, Esc stops.
 */

import { useEffect } from "react";
import { Play, Square } from "lucide-react";
import { CRISIS_BUTTONS } from "../../../lib/crisisData";
import { SCENARIO_PRESETS, type ScenarioPresetId } from "../../../world/scenarioPresets";
import { selectors, formatSimTime, type World } from "../../../world";

interface StressLabScenarioPickerProps {
  world: World;
  activeScenarioId: string | null;
  onActivate: (id: ScenarioPresetId) => void;
  onStop: () => void;
}

export default function StressLabScenarioPicker({
  world,
  activeScenarioId,
  onActivate,
  onStop,
}: StressLabScenarioPickerProps) {
  const runningPreset = world.activeScenario?.preset ?? null;
  const isRunning = Boolean(world.activeScenario) || Boolean(activeScenarioId);

  // Keyboard: 1/2/3 run, Esc stops
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx >= 0) {
        const btn = CRISIS_BUTTONS[idx];
        if (btn && (!isRunning || runningPreset !== btn.id)) onActivate(btn.id as ScenarioPresetId);
      } else if (e.key === "Escape" && isRunning) {
        onStop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRunning, runningPreset, onActivate, onStop]);

  // Live per-scenario readouts
  const scenario = world.activeScenario;
  const elapsedH = scenario ? Math.max(0, (world.simNow - scenario.startedAt) / 3600000) : 0;
  const liveMultiplier = scenario
    ? selectors.getScenarioMultiplier(world, scenario.zones[0]?.zone ?? "")
    : 1;

  const stateLabel = scenario
    ? `RUNNING · ${CRISIS_BUTTONS.find((b) => b.id === scenario.preset)?.label ?? scenario.preset}`
    : "BASELINE";

  return (
    <>
      {/* ── Status Strip (pixel-identical to Dispatch) ── */}
      <div className="stresslab-strip">
        <div className="dispatch-strip-item">
          <span className={`stresslab-strip-dot${scenario ? " stresslab-strip-dot--live" : ""}`} />
          <span className="dispatch-strip-lbl">Stress Lab:</span>
          <span className="dispatch-strip-val">{stateLabel}</span>
        </div>
        <div className="dispatch-strip-sep" />
        <div className="dispatch-strip-item">
          <span className="dispatch-strip-lbl">Sim clock:</span>
          <span className="dispatch-strip-val">{formatSimTime(world.simNow)}</span>
        </div>
        <div className="dispatch-strip-sep" />
        <div className="dispatch-strip-item">
          <span className="dispatch-strip-lbl">Autopilot:</span>
          <span className="dispatch-strip-val">
            {scenario ? (scenario.autopilot ? "ON" : "OFF") : world.settings.autopilot ? "ON" : "STANDBY"}
          </span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="stresslab-toolbar stresslab-fade">
        <div className="stresslab-toolbar-title">
          <span className="stresslab-toolbar-name">Stress Lab</span>
          <span className="stresslab-toolbar-state">{stateLabel}</span>
        </div>
        <span className="stresslab-toolbar-hint">
          {isRunning ? "Esc to stop" : "Pick a shock — keys 1 / 2 / 3"}
        </span>
      </div>

      {/* ── Act 1: The Shock — the 3 scenario panels ── */}
      <section className="stresslab-card stresslab-fade">
        <div className="stresslab-scenario-row">
          {CRISIS_BUTTONS.map((btn) => {
            const running = runningPreset === btn.id || (!scenario && activeScenarioId === btn.id);
            const preset = SCENARIO_PRESETS[btn.id as ScenarioPresetId];

            return (
              <button
                key={btn.id}
                type="button"
                className={`stresslab-scenario-btn${running ? " stresslab-scenario-btn--running" : ""}`}
                aria-pressed={running}
                onClick={() => (running ? onStop() : onActivate(btn.id as ScenarioPresetId))}
              >
                <span className="stresslab-scenario-num">{btn.num}</span>
                <span className="stresslab-scenario-label">{btn.label}</span>
                <span className="stresslab-scenario-sub">{btn.sub}</span>

                {running ? (
                  <span className="stresslab-scenario-status">
                    ×{liveMultiplier.toFixed(2)} demand · {Math.round(elapsedH)}h elapsed
                    <span
                      className="stresslab-stop-btn"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStop();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          e.preventDefault();
                          onStop();
                        }
                      }}
                    >
                      <Square size={10} strokeWidth={2.5} />
                      Stop
                    </span>
                  </span>
                ) : (
                  <span className="stresslab-scenario-status">
                    <Play size={11} strokeWidth={2.5} />
                    Run · {preset.durationH}h
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
