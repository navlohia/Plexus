/**
 * stresslab/BioMeshAnimation.tsx
 * Act 3 — the payoff: a live supply→demand mesh driven by the World. De-slopped
 * per the plan: no dot grid, no radar pulses, no glowing packet halos, no pill
 * shapes — flat rectangles, single circles, 1px borders, dispatch radii.
 * Node positions are presentation constants; membership, sub-labels, vessels
 * and footer metrics derive from world state each tick. Honors reduced motion.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronUp } from "lucide-react";
import { CRISIS_SCENARIOS } from "../../../lib/crisisData";
import { selectors, type World } from "../../../world";
import type { ScenarioComparison } from "../../../world/counterfactual";

interface BioMeshAnimationProps {
  world: World;
  activeScenarioId: string | null;
  comparison: ScenarioComparison;
  /** Bump to replay the vessel animation on scenario change */
  animKey: number;
  onBackToPicker: () => void;
  onNavigateToMap: () => void;
}

// Diagram layout constants (presentation only — values come from the world)
const DONOR_NODES = [
  { code: "N62", name: "Fortis Noida", x: 80, y: 80 },
  { code: "MDT", name: "Medanta Hub", x: 80, y: 180 },
  { code: "APL", name: "Apollo Sarita", x: 80, y: 280 },
  { code: "MAX", name: "Max Saket", x: 80, y: 380 },
];

const CRISIS_NODES = [
  { code: "AIM", name: "AIIMS Trauma", x: 765, y: 110 },
  { code: "GTB", name: "GTB East Delhi", x: 765, y: 230 },
  { code: "SFD", name: "Safdarjung", x: 765, y: 350 },
];

const DONOR_OUT_X = 230;
const CRISIS_IN_X = 765;

function wideBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx1 = x1 + (x2 - x1) * 0.44;
  const cx2 = x1 + (x2 - x1) * 0.56;
  return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
}

export default function BioMeshAnimation({
  world,
  activeScenarioId,
  comparison,
  animKey,
  onBackToPicker,
  onNavigateToMap,
}: BioMeshAnimationProps) {
  const isMobile = useMemo(
    () => typeof window !== "undefined" && window.innerWidth < 768,
    []
  );
  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const scenarioMeta = activeScenarioId ? CRISIS_SCENARIOS[activeScenarioId] : null;
  const isActive = Boolean(world.activeScenario || activeScenarioId);

  // ── Live node values ──
  const donorLive = DONOR_NODES.filter((n) => world.hospitals[n.code]).map((n) => {
    const net = selectors.getNetBalance(world, n.code);
    return { ...n, net };
  });

  const crisisLive = CRISIS_NODES.filter((n) => world.hospitals[n.code]).map((n) => {
    const state = selectors.getHospitalState(world, n.code);
    return { ...n, state };
  });

  // ── Live vessels: one per active dispatch order (capped for legibility) ──
  const activeOrders = Object.values(world.orders)
    .filter((o) => o.status === "assigned" || o.status === "packed" || o.status === "in_transit")
    .slice(0, 10);

  const vessels = activeOrders
    .map((o, i) => {
      const from = DONOR_NODES.find((n) => n.code === o.from);
      const to = CRISIS_NODES.find((n) => n.code === o.to);
      if (!from || !to) return null;
      return {
        key: o.id,
        path: wideBezierPath(DONOR_OUT_X, from.y, CRISIS_IN_X, to.y),
        delay: `${(i % 7) * 0.35}s`,
        dur: isActive ? "2.4s" : "3.2s",
      };
    })
    .filter(Boolean) as { key: string; path: string; delay: string; dur: string }[];

  // ── Live footer metrics ──
  const allHospitals = Object.keys(world.hospitals);
  const shortCount = crisisLive.filter((n) => n.state === "short").length;
  const bufferPct =
    allHospitals.length > 0
      ? Math.round(
          (allHospitals.filter((c) => selectors.getHospitalState(world, c) !== "short").length /
            allHospitals.length) *
            100
        )
      : 0;

  // Animated rescued-units counter (skipped under reduced motion)
  const targetRescued = comparison.withPlexus.rescuedUnits;
  const [displayedRescued, setDisplayedRescued] = useState(targetRescued);
  const displayedRef = useRef(targetRescued);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReduced) {
      displayedRef.current = targetRescued;
      setDisplayedRescued(targetRescued);
      return;
    }
    let start: number | null = null;
    const from = displayedRef.current;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / 300, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (targetRescued - from) * ease);
      displayedRef.current = next;
      setDisplayedRescued(next);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetRescued, prefersReduced]);

  return (
    <section className="stresslab-card stresslab-fade" style={{ padding: 0, overflow: "hidden" }}>
      {/* 48px header bar (dispatch toolbar rhythm) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          minHeight: 48,
          borderBottom: "1px solid var(--ws-border)",
          padding: "6px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={onBackToPicker}
            className="stresslab-stop-btn"
            style={{ borderColor: "var(--ws-border-2)", color: "var(--ws-text-3)" }}
            title="Back to the three scenario panels"
          >
            <ChevronUp size={12} strokeWidth={2.4} />
            <span>Scenarios</span>
          </button>
          <div>
            <span className="stresslab-toolbar-state" style={{ display: "block" }}>
              {isActive ? "Mesh response · live" : "Baseline steady state"}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ws-text-1)", fontFamily: "var(--font-main)" }}>
              {scenarioMeta ? scenarioMeta.title : "Baseline NCR Network Flow"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToMap}
          className="stresslab-map-btn"
        >
          <span>View active routes on live map</span>
          <ArrowRight size={12} strokeWidth={2.6} />
        </button>
      </div>

      {/* SVG canvas — flat, no grid, no pulses, no halos */}
      <div className="stresslab-biomesh-canvas" style={{ margin: 12, minHeight: 300, border: "none" }}>
        <svg
          key={animKey}
          viewBox="0 0 1000 460"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", minWidth: isMobile ? 780 : "auto", height: "100%", maxHeight: 420 }}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={
            scenarioMeta
              ? `Live mesh response for ${scenarioMeta.shortTitle}`
              : "Live baseline NCR mesh flow"
          }
        >
          <defs>
            {vessels.map((v, i) => (
              <path key={v.key} id={`sl-route-${i}`} d={v.path} fill="none" />
            ))}
          </defs>

          {/* Tier headers — plain gray, dispatch label style */}
          <text x="150" y="30" fill="var(--ws-text-4)" fontSize="10.5" fontWeight="500" textAnchor="middle">
            Surplus donor hubs
          </text>
          <text x="500" y="30" fill="var(--ws-text-4)" fontSize="10.5" fontWeight="500" textAnchor="middle">
            Live routing corridors
          </text>
          <text x="850" y="30" fill="var(--ws-text-4)" fontSize="10.5" fontWeight="500" textAnchor="middle">
            Demand tier
          </text>

          {/* Vessels + plain packets (live orders only) */}
          {vessels.map((v, i) => (
            <g key={`vessel-${v.key}`}>
              <path d={v.path} stroke="var(--ws-emerald)" strokeWidth="2" strokeOpacity={isActive ? 0.75 : 0.45} fill="none" strokeLinecap="round" />
              {!prefersReduced && (
                <circle r="3.5" fill="var(--ws-emerald)">
                  <animateMotion dur={v.dur} repeatCount="indefinite" begin={v.delay}>
                    <mpath href={`#sl-route-${i}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          ))}

          {vessels.length === 0 && (
            <text x="500" y="240" fill="var(--ws-text-4)" fontSize="12" fontWeight="500" textAnchor="middle" fontFamily="var(--ws-font-mono)">
              No active dispatch orders — run a scenario to generate traffic
            </text>
          )}

          {/* Donor nodes — flat rectangles, single circles */}
          {donorLive.map((n) => (
            <g key={n.code}>
              <rect x={n.x} y={n.y - 18} width="150" height="36" rx="6" fill="var(--ws-surface)" stroke="var(--ws-border)" strokeWidth="1" />
              <text x={n.x + 12} y={n.y - 1} fill="var(--ws-text-1)" fontSize="12" fontWeight="700" fontFamily="var(--font-main)">
                {n.name}
              </text>
              <text x={n.x + 12} y={n.y + 12} fill="var(--ws-text-4)" fontSize="9" fontWeight="500" fontFamily="var(--ws-font-mono)">
                {n.net >= 0 ? `+${n.net}` : n.net}u net · surplus hub
              </text>
              <circle cx={DONOR_OUT_X} cy={n.y} r="4" fill="var(--ws-emerald)" />
              <circle cx={n.x - 28} cy={n.y} r="17" fill="var(--ws-emerald)" />
              <text x={n.x - 28} y={n.y + 4} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="var(--ws-font-mono)">
                {n.code}
              </text>
            </g>
          ))}

          {/* Crisis nodes — flat rectangles, single circles */}
          {crisisLive.map((n) => {
            const stateWord =
              n.state === "short" ? "Short · restocking" : n.state === "risk" ? "Buffer turning" : "Steady";
            const stateColor =
              n.state === "short" ? "var(--ws-crimson)" : n.state === "risk" ? "var(--ws-amber)" : "var(--ws-emerald)";
            return (
              <g key={n.code}>
                <circle cx={CRISIS_IN_X} cy={n.y} r="4" fill={stateColor} />
                <rect x={n.x} y={n.y - 18} width="160" height="36" rx="6" fill="var(--ws-surface)" stroke="var(--ws-border)" strokeWidth="1" />
                <text x={n.x + 14} y={n.y - 1} fill="var(--ws-text-1)" fontSize="12" fontWeight="700" fontFamily="var(--font-main)">
                  {n.name}
                </text>
                <text x={n.x + 14} y={n.y + 12} fill={stateColor} fontSize="9" fontWeight="600" fontFamily="var(--ws-font-mono)">
                  {stateWord}
                </text>
                <circle cx={n.x + 183} cy={n.y} r="17" fill={stateColor} />
                <text x={n.x + 183} y={n.y + 4} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="var(--ws-font-mono)">
                  {n.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer telemetry — plain label + mono value, all live */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          borderTop: "1px solid var(--ws-border)",
          padding: "10px 20px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="stresslab-strip-dot"
            style={{ background: shortCount === 0 ? "var(--ws-emerald)" : "var(--ws-crimson)" }}
          />
          <span className="stresslab-mono" style={{ fontSize: 11, color: "var(--ws-text-4)" }}>
            {shortCount === 0
              ? "Zero hospitals short"
              : `${shortCount} demand node${shortCount > 1 ? "s" : ""} short`}{" "}
            · live orders: {activeOrders.length}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="dispatch-strip-lbl">Rescued:</span>
            <strong className="stresslab-mono" style={{ color: "var(--ws-emerald)" }}>+{displayedRescued}u</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="dispatch-strip-lbl">Buffer cover:</span>
            <strong className="stresslab-mono" style={{ color: "var(--ws-text-1)" }}>{bufferPct}%</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
