import { useState, useMemo, useEffect } from "react";
import { RotateCcw, CheckCircle2, Zap } from "lucide-react";
import type { TickState } from "../../types";
import { CRISIS_SCENARIOS, BASELINE_SCENARIO, CRISIS_BUTTONS } from "../../lib/crisisData";

interface SurgeTabProps {
  state: TickState;
  activeCrisisId: string | null;
  onActivateScenario: (id: string) => void;
  onStopScenario: () => void;
  onNavigateToMap: () => void;
}

const DONOR_NODES = [
  { id: "N62", name: "Fortis Noida", circleX: 30, pillX: 52, y: 38 },
  { id: "MDT", name: "Medanta Hub", circleX: 30, pillX: 52, y: 96 },
  { id: "APL", name: "Apollo Sarita", circleX: 30, pillX: 52, y: 154 },
  { id: "MAX", name: "Max Saket", circleX: 30, pillX: 52, y: 212 },
];

const CRISIS_NODES = [
  { id: "AIM", name: "AIIMS Trauma", circleX: 430, pillX: 334, y: 52, accent: "#E11D48" },
  { id: "GTB", name: "GTB East Delhi", circleX: 430, pillX: 334, y: 128, accent: "#D97706" },
  { id: "SFD", name: "Safdarjung", circleX: 430, pillX: 334, y: 204, accent: "#0284C7" },
];

const VESSELS = [
  { fromX: 142, fromY: 38, toX: 334, toY: 52, delay: "0s" },
  { fromX: 142, fromY: 38, toX: 334, toY: 128, delay: "0.5s" },
  { fromX: 142, fromY: 96, toX: 334, toY: 52, delay: "0.9s" },
  { fromX: 142, fromY: 96, toX: 334, toY: 128, delay: "0.2s" },
  { fromX: 142, fromY: 154, toX: 334, toY: 128, delay: "0.7s" },
  { fromX: 142, fromY: 154, toX: 334, toY: 204, delay: "1.3s" },
  { fromX: 142, fromY: 212, toX: 334, toY: 204, delay: "0.4s" },
];

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

export default function SurgeTab({
  state: _state,
  activeCrisisId,
  onActivateScenario,
  onStopScenario,
  onNavigateToMap,
}: SurgeTabProps) {
  const [animKey, setAnimKey] = useState(0);
  const [isSolving, setIsSolving] = useState(false);

  // Derive active scenario result from global crisisData
  const result = useMemo(() => {
    if (!activeCrisisId) return BASELINE_SCENARIO;
    return CRISIS_SCENARIOS[activeCrisisId] || BASELINE_SCENARIO;
  }, [activeCrisisId]);

  const activeCrisis = useMemo(() => {
    if (!activeCrisisId) return null;
    return CRISIS_BUTTONS.find((b) => b.id === activeCrisisId) || null;
  }, [activeCrisisId]);

  const handleToggleScenario = (id: string) => {
    if (activeCrisisId === id) {
      handleStopScenario();
      return;
    }

    setIsSolving(true);
    setAnimKey((k) => k + 1);
    onActivateScenario(id);

    // 450ms solver convergence animation
    setTimeout(() => {
      setIsSolving(false);
    }, 450);
  };

  const handleStopScenario = () => {
    setIsSolving(false);
    setAnimKey((k) => k + 1);
    onStopScenario();
  };

  const handlePushToMap = () => {
    if (!activeCrisisId) {
      onActivateScenario("dengue");
    }
    onNavigateToMap();
  };

  // Animated numbers
  const [displayedUnits, setDisplayedUnits] = useState(result.rescuedUnits);
  const [displayedPct, setDisplayedPct] = useState(result.oNegProtectedPct);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const targetUnits = result.rescuedUnits;
    const targetPct = result.oNegProtectedPct;
    const fromUnits = displayedUnits;
    const fromPct = displayedPct;
    const duration = 400;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayedUnits(Math.round(fromUnits + (targetUnits - fromUnits) * ease));
      setDisplayedPct(Math.round(fromPct + (targetPct - fromPct) * ease));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [result]);

  return (
    <div
      style={{
        height: "calc(100vh - 60px)",
        overflow: "hidden",
        padding: "16px 26px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        background: "#F7F8FA",
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* ── ROW 1: 3 Tactile Crisis Trigger Buttons + Reset Button ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "14px",
          }}
        >
          {CRISIS_BUTTONS.map((btn) => {
            const isActive = activeCrisisId === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleToggleScenario(btn.id)}
                title={isActive ? "Click to stop this crisis scenario" : "Click to simulate this crisis"}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "5px",
                  padding: "14px 18px",
                  borderRadius: "16px",
                  border: isActive ? `2px solid ${btn.accent}` : "2px solid #E5E7EB",
                  background: "#FFFFFF",
                  color: "#111827",
                  cursor: "pointer",
                  transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
                  transform: isActive ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: isActive
                    ? `0 10px 24px -4px ${btn.accent}28, 0 2px 6px rgba(0,0,0,0.04)`
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: isActive ? btn.accent : "#9CA3AF",
                      fontFamily: "monospace",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {btn.num}
                  </span>

                  {/* Status Indicator: Only says SOLVING when actively solving, then ACTIVE SHOCK */}
                  {isActive ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: btn.accentBg,
                        color: btn.accent,
                        border: `1px solid ${btn.accent}33`,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {isSolving ? (
                        <>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: btn.accent,
                              display: "inline-block",
                              animation: "pulse-badge 0.8s ease-in-out infinite",
                            }}
                          />
                          SOLVING...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={11} strokeWidth={2.8} />
                          ACTIVE · CLICK TO STOP
                        </>
                      )}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "10px",
                        color: "#9CA3AF",
                        fontWeight: 700,
                      }}
                    >
                      <Zap size={11} /> Simulate
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#111827",
                    lineHeight: 1.3,
                    marginTop: "2px",
                  }}
                >
                  {btn.label}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#6B7280",
                    lineHeight: 1.4,
                  }}
                >
                  {btn.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stop / Reset Button */}
        <button
          type="button"
          onClick={handleStopScenario}
          title={activeCrisisId ? "Stop current crisis simulation and restore baseline network" : "Baseline network is active"}
          style={{
            height: "94px",
            minWidth: "140px",
            padding: "0 18px",
            borderRadius: "16px",
            border: activeCrisisId ? "2px solid #F43F5E" : "2px solid #10B981",
            background: activeCrisisId ? "#FFF1F2" : "#F0FDF4",
            color: activeCrisisId ? "#BE123C" : "#059669",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            fontWeight: 800,
            fontSize: "11.5px",
            transition: "all 0.18s ease",
            boxShadow: activeCrisisId ? "0 4px 12px rgba(244, 63, 94, 0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <RotateCcw size={16} strokeWidth={2.6} />
          <span>{activeCrisisId ? "Stop Crisis" : "Baseline Active"}</span>
          <span style={{ fontSize: "9.5px", fontWeight: 600, color: activeCrisisId ? "#E11D48" : "#10B981" }}>
            {activeCrisisId ? "Click to Revert Baseline" : "0 Emergencies Active"}
          </span>
        </button>
      </div>

      {/* ── ROW 2: Split Stage (1.15fr 1fr) in Crisp Mediso Light Mode ── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr",
          gap: "16px",
          minHeight: 0,
        }}
      >
        {/* ─ LEFT CARD: Crisp Mediso Light-Mode Animated Bio-Mesh Visualizer ─ */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECEEF2",
            borderRadius: "22px",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top Header Strip */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: isSolving ? "#D97706" : activeCrisisId ? "#065F46" : "#2563EB",
                  background: isSolving ? "#FEF3C7" : activeCrisisId ? "#ECFDF5" : "#EFF6FF",
                  border: `1px solid ${isSolving ? "#FDE68A" : activeCrisisId ? "#A7F3D0" : "#BFDBFE"}`,
                  padding: "3px 9px",
                  borderRadius: "7px",
                  textTransform: "uppercase",
                }}
              >
                {isSolving
                  ? "SOLVING 7,840 NETWORK ARCS..."
                  : activeCrisisId
                  ? "OR-TOOLS MIN-COST MAX-FLOW · CONVERGED IN 14.2ms"
                  : "BASELINE OR-TOOLS DISPATCH · STEADY STATE"}
              </span>
            </div>
            <h3 style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: 800, color: "#111827" }}>
              {activeCrisis ? activeCrisis.label : "Baseline NCR Network Flow"}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#6B7280", fontFamily: "monospace" }}>
              {result.bannerTelemetry}
            </p>
          </div>

          {/* SVG Animated Bio-Mesh Architectural Canvas (#F8FAFC with Dot Grid) */}
          <div
            style={{
              flex: 1,
              margin: "12px 0",
              background: "#F8FAFC",
              borderRadius: "16px",
              border: "1px solid #E2E8F0",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              key={animKey}
              viewBox="0 0 460 250"
              style={{ width: "100%", height: "100%", maxHeight: "230px" }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Architectural dot grid */}
                <pattern id="archGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="#E2E8F0" />
                </pattern>
                {VESSELS.map((v, i) => (
                  <path
                    key={i}
                    id={`route-${i}`}
                    d={bezierPath(v.fromX, v.fromY, v.toX, v.toY)}
                    fill="none"
                  />
                ))}
              </defs>

              {/* Background dot pattern */}
              <rect width="100%" height="100%" fill="url(#archGrid)" />

              {/* Curved Bezier Vessels */}
              {VESSELS.map((v, i) => (
                <path
                  key={i}
                  d={bezierPath(v.fromX, v.fromY, v.toX, v.toY)}
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeOpacity={activeCrisisId ? "0.45" : "0.25"}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}

              {/* Animated Glowing Packets along Vessels */}
              {VESSELS.map((v, i) => (
                <circle key={`dot-${i}`} r="4" fill="#10B981" opacity="0.95">
                  <animateMotion dur={activeCrisisId ? "2.2s" : "3.0s"} repeatCount="indefinite" begin={v.delay}>
                    <mpath href={`#route-${i}`} />
                  </animateMotion>
                </circle>
              ))}

              {/* Left 4 Surplus Donor Hubs (Never Overlapping Labels) */}
              {DONOR_NODES.map((n) => (
                <g key={n.id}>
                  {/* Pill Badge */}
                  <rect
                    x={n.pillX}
                    y={n.y - 11}
                    width="86"
                    height="22"
                    rx="11"
                    fill="#FFFFFF"
                    stroke="#A7F3D0"
                    strokeWidth="1.5"
                  />
                  <text
                    x={n.pillX + 43}
                    y={n.y + 3.5}
                    textAnchor="middle"
                    fill="#065F46"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {n.name}
                  </text>
                  {/* Distinct Circle Node */}
                  <circle cx={n.circleX} cy={n.y} r="14" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                  <text
                    x={n.circleX}
                    y={n.y + 3.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="7.5"
                    fontWeight="800"
                  >
                    {n.id}
                  </text>
                </g>
              ))}

              {/* Right 3 Deficit Crisis Nodes (Radar Rings + Non-Overlapping Labels) */}
              {CRISIS_NODES.map((n, ni) => {
                const accent = ni === 0 ? "#E11D48" : ni === 1 ? "#D97706" : "#0284C7";
                return (
                  <g key={n.id}>
                    {/* Pulsing Radar Wave 1 */}
                    <circle cx={n.circleX} cy={n.y} r="26" fill="none" stroke={accent} strokeWidth="1.2" opacity="0">
                      <animate
                        attributeName="r"
                        from="16"
                        to="34"
                        dur="1.9s"
                        repeatCount="indefinite"
                        begin={`${ni * 0.5}s`}
                      />
                      <animate
                        attributeName="opacity"
                        from="0.6"
                        to="0"
                        dur="1.9s"
                        repeatCount="indefinite"
                        begin={`${ni * 0.5}s`}
                      />
                    </circle>
                    {/* Pulsing Radar Wave 2 */}
                    <circle cx={n.circleX} cy={n.y} r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity="0">
                      <animate
                        attributeName="r"
                        from="12"
                        to="24"
                        dur="1.9s"
                        repeatCount="indefinite"
                        begin={`${ni * 0.5 + 0.3}s`}
                      />
                      <animate
                        attributeName="opacity"
                        from="0.7"
                        to="0"
                        dur="1.9s"
                        repeatCount="indefinite"
                        begin={`${ni * 0.5 + 0.3}s`}
                      />
                    </circle>
                    {/* Pill Badge */}
                    <rect
                      x={n.pillX}
                      y={n.y - 11}
                      width="88"
                      height="22"
                      rx="11"
                      fill="#FFFFFF"
                      stroke={`${accent}44`}
                      strokeWidth="1.5"
                    />
                    <text
                      x={n.pillX + 44}
                      y={n.y + 3.5}
                      textAnchor="middle"
                      fill="#1F2937"
                      fontSize="10"
                      fontWeight="700"
                    >
                      {n.name}
                    </text>
                    {/* Distinct Circle Node */}
                    <circle cx={n.circleX} cy={n.y} r="14" fill={accent} stroke="#FFFFFF" strokeWidth="2.5" />
                    <text
                      x={n.circleX}
                      y={n.y + 3.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="7.5"
                      fontWeight="800"
                    >
                      {n.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Action Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #F1F5F9",
              paddingTop: "12px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "11px", color: "#6B7280", fontFamily: "monospace" }}>
              7,840 Network Arcs Evaluated · Zero Unmet Demand
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {activeCrisisId && (
                <button
                  type="button"
                  onClick={handleStopScenario}
                  style={{
                    background: "#FEF2F2",
                    color: "#BE123C",
                    border: "1px solid #FCA5A5",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  ⏹ Stop Crisis & Reset Mesh
                </button>
              )}
              <button
                type="button"
                onClick={handlePushToMap}
                style={{
                  background: "#15997A",
                  color: "#FFFFFF",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 2px 6px rgba(21, 153, 122, 0.28)",
                }}
              >
                Push Emergency Routes to Live Map →
              </button>
            </div>
          </div>
        </div>

        {/* ─ RIGHT CARD: Impact Metrics & Dispatched Couriers Summary ─ */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECEEF2",
            borderRadius: "22px",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            overflow: "hidden",
          }}
        >
          {/* Top 3 Horizontal Single-Line KPI Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              {
                label: "Stockouts Prevented",
                value: "0 hrs",
                sub: `vs ${result.siloedStockouts}h Siloed`,
                color: "#15997A",
              },
              {
                label: "Platelets Rescued",
                value: `+${displayedUnits} u`,
                sub: result.rescuedSavingsText,
                color: "#0284C7",
              },
              {
                label: "O- Trauma Buffer",
                value: `${displayedPct}%`,
                sub: "Universal Buffer Protected",
                color: "#7C3AED",
              },
            ].map((tile) => (
              <div
                key={tile.label}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "14px",
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 800,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "5px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tile.label}
                </div>
                <div
                  style={{
                    fontSize: "23px",
                    fontWeight: 800,
                    color: tile.color,
                    lineHeight: 1.1,
                    marginBottom: "3px",
                  }}
                >
                  {tile.value}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#64748B",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tile.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Middle: 2-Bar Comparison: Siloed Failure vs Plexus Mesh Resilience */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "10px",
              }}
            >
              Siloed Hospital Failure vs. Plexus Mesh Resilience
            </div>
            {/* Siloed bar */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#64748B", fontWeight: 600 }}>Traditional Siloed Hospitals</span>
                <span style={{ color: "#E11D48", fontWeight: 700 }}>78% Unmet Surge / Spoilage</span>
              </div>
              <div style={{ height: "8px", background: "#FEE2E2", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: "78%",
                    background: "#E11D48",
                    borderRadius: "4px",
                    transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
            </div>
            {/* Plexus bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#64748B", fontWeight: 600 }}>Plexus Autonomous Mesh</span>
                <span style={{ color: "#15997A", fontWeight: 700 }}>99.2% Demand Fulfilled · 1.2% Waste</span>
              </div>
              <div style={{ height: "8px", background: "#DCFCE7", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: "99.2%",
                    background: "#15997A",
                    borderRadius: "4px",
                    transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom: 3 Autonomous Couriers Dispatched */}
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <div
              style={{
                fontSize: "9.5px",
                fontWeight: 800,
                color: "#4B5563",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: "2px",
              }}
            >
              Top Autonomous Couriers Dispatched {activeCrisisId ? "for Active Shock" : "(Steady State)"}
            </div>
            {result.emergencyRoutes.slice(0, 3).map((route) => (
              <div
                key={route.id}
                style={{
                  height: "38px",
                  background: "#F8FAFC",
                  borderRadius: "10px",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  border: "1px solid #E2E8F0",
                  gap: "8px",
                }}
              >
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#9CA3AF" }}>
                  {route.id}
                </span>
                <span
                  style={{
                    background: "#10B981",
                    color: "#FFFFFF",
                    borderRadius: "5px",
                    padding: "2px 6px",
                    fontSize: "9.5px",
                    fontWeight: 800,
                  }}
                >
                  {route.donorCode}
                </span>
                <span style={{ color: "#9CA3AF", fontSize: "10px" }}>→</span>
                <span
                  style={{
                    background: "#E11D48",
                    color: "#FFFFFF",
                    borderRadius: "5px",
                    padding: "2px 6px",
                    fontSize: "9.5px",
                    fontWeight: 800,
                  }}
                >
                  {route.recipientCode}
                </span>
                <span style={{ fontWeight: 700, color: "#111827", fontSize: "11px" }}>
                  {route.cargo}
                </span>
                <span style={{ color: "#15997A", fontSize: "10.5px", fontWeight: 700, marginLeft: "auto" }}>
                  {route.eta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-badge {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
