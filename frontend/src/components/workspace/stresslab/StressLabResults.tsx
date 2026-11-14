/**
 * stresslab/StressLabResults.tsx
 * Act 2 — the evidence strip. Four headline metrics with big mono values and
 * tinted deltas, readable from a metre away. Every number comes from
 * computeScenarioComparison(world) — nothing is pasted. The WITHOUT column is
 * a modelled projection (zero cross-hospital sharing), and is labelled so.
 */

import { useMemo } from "react";
import type { ScenarioComparison, ScenarioMetrics } from "../../../world/counterfactual";

interface StressLabResultsProps {
  comparison: ScenarioComparison;
  /** False until a scenario has produced requests this session */
  hasRun: boolean;
}

type Direction = "higher" | "lower";

interface Row {
  label: string;
  get: (m: ScenarioMetrics) => number | null;
  unit: string;
  better: Direction;
}

const ROWS: Row[] = [
  { label: "Unmet units", get: (m) => m.unmetUnits, unit: "u", better: "lower" },
  { label: "Service level", get: (m) => m.serviceLevelPct, unit: "%", better: "higher" },
  { label: "Rescued units", get: (m) => m.rescuedUnits, unit: "u", better: "higher" },
  { label: "Expired units", get: (m) => m.expiredUnits, unit: "u", better: "lower" },
];

function fmt(v: number | null, unit: string): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}${unit}`;
}

export default function StressLabResults({ comparison, hasRun }: StressLabResultsProps) {
  const rows = useMemo(
    () =>
      ROWS.map((row) => {
        const withVal = row.get(comparison.withPlexus);
        const withoutVal = row.get(comparison.withoutPlexus);
        let delta: string | null = null;
        let tone: "good" | "bad" | "flat" = "flat";
        if (withVal !== null && withoutVal !== null && withVal !== withoutVal) {
          const d = withVal - withoutVal;
          const good = row.better === "higher" ? d > 0 : d < 0;
          tone = good ? "good" : "bad";
          delta = `${d > 0 ? "+" : ""}${Math.round(d)}${row.unit}`;
        }
        return { ...row, withVal, withoutVal, delta, tone };
      }),
    [comparison]
  );

  if (!hasRun) return null;

  return (
    <section className="stresslab-card stresslab-fade">
      <div className="stresslab-evidence">
        {rows.map((r) => (
          <div key={r.label} className="stresslab-evidence-item">
            <span className="stresslab-evidence-lbl">{r.label}</span>
            <span className="stresslab-evidence-vals">
              <span className="stresslab-evidence-val">{fmt(r.withVal, r.unit)}</span>
              <span className="stresslab-evidence-val stresslab-evidence-val--ctx">
                vs {fmt(r.withoutVal, r.unit)}
              </span>
              {r.delta && (
                <span className={`stresslab-evidence-delta stresslab-evidence-delta--${r.tone}`}>
                  {r.delta}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="stresslab-evidence-note">
        With Plexus vs without (modelled — zero cross-hospital sharing). Live from the
        simulation, never from presets.
      </p>
    </section>
  );
}
