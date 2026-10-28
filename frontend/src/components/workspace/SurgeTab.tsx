import { useState, useMemo, useEffect } from "react";
import { RotateCcw, CheckCircle2, Zap, ArrowRight, ShieldCheck, Clock, Award } from "lucide-react";
import type { TickState } from "../../types";
import { CRISIS_SCENARIOS, BASELINE_SCENARIO, CRISIS_BUTTONS } from "../../lib/crisisData";

interface SurgeTabProps {
  state: TickState;
  activeCrisisId: string | null;
  onActivateScenario: (id: string) => void;
  onStopScenario: () => void;
  onNavigateToMap: () => void;
}

// 4 Primary Donor Reserve Hubs (Left Column)
const DONOR_NODES = [
  { id: "N62", name: "Fortis Noida", sub: "Surplus Hub · Sec-62", circleX: 48, pillX: 74, y: 55 },
  { id: "MDT", name: "Medanta Hub", sub: "Surplus Hub · NH-48", circleX: 48, pillX: 74, y: 135 },
  { id: "APL", name: "Apollo Sarita", sub: "Surplus Hub · Mathura Rd", circleX: 48, pillX: 74, y: 215 },
  { id: "MAX", name: "Max Saket", sub: "Surplus Hub · Press Enclave", circleX: 48, pillX: 74, y: 295 },
];

// 3 Target Crisis Surge Nodes (Right Column)
const CRISIS_NODES = [
  { id: "AIM", name: "AIIMS Trauma", sub: "Central Delhi Trauma Hub", circleX: 952, pillX: 780, y: 75, accent: "#E11D48" },
  { id: "GTB", name: "GTB East Delhi", sub: "Trans-Yamuna Epidemic Hub", circleX: 952, pillX: 780, y: 175, accent: "#D97706" },
  { id: "SFD", name: "Safdarjung", sub: "South Delhi Trauma Wing", circleX: 952, pillX: 780, y: 275, accent: "#0284C7" },
];

// 7 Graceful Wide Bézier Routing Vessels across the Yamuna and NH-48 corridors
const WIDE_VESSELS = [
  { fromX: 205, fromY: 55, toX: 780, toY: 75, delay: "0s", label: "DND Express Link", tagY: 52 },
  { fromX: 205, fromY: 55, toX: 780, toY: 175, delay: "0.5s", label: "Vikas Marg Arterial", tagY: 110 },
  { fromX: 205, fromY: 135, toX: 780, toY: 75, delay: "0.9s", label: "NH-48 Trauma Express", tagY: 96 },
  { fromX: 205, fromY: 135, toX: 780, toY: 275, delay: "0.2s", label: "Mehrauli Arterial", tagY: 198 },
  { fromX: 205, fromY: 215, toX: 780, toY: 175, delay: "0.7s", label: "Barapullah Elevated", tagY: 184 },
  { fromX: 205, fromY: 215, toX: 780, toY: 275, delay: "1.3s", label: "Ring Road South", tagY: 238 },
  { fromX: 205, fromY: 295, toX: 780, toY: 275, delay: "0.4s", label: "Aurobindo Corridor", tagY: 292 },
];

function wideBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx1 = x1 + (x2 - x1) * 0.42;
  const cx2 = x1 + (x2 - x1) * 0.58;
  return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
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

  // Smooth animated numbers
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
      {/* ── ROW 1: 3 Tactile Hardware-Toggle Crisis Cards (Spanning 100% Width) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "14px",
          flexShrink: 0,
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
                gap: "6px",
                padding: "14px 18px",
                borderRadius: "16px",
                border: isActive ? `2px solid ${btn.accent}` : "1.5px solid #E2E8F0",
                background: isActive ? "#FFFFFF" : "#FFFFFF",
                color: "#111827",
                cursor: "pointer",
                transition: "all 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
                transform: isActive ? "translateY(-2px)" : "translateY(0)",
                boxShadow: isActive
                  ? `0 10px 24px -4px ${btn.accent}28, 0 2px 6px rgba(0,0,0,0.04)`
                  : "0 1px 3px rgba(0,0,0,0.03)",
                textAlign: "left",
                position: "relative",
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    CRISIS VECTOR
                  </span>
                </div>

                {/* Status Indicator */}
                {isActive ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background: btn.accentBg,
                      color: btn.accent,
                      border: `1px solid ${btn.accent}33`,
                      padding: "3px 9px",
                      borderRadius: "999px",
                      fontSize: "10px",
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
                      gap: "4px",
                      fontSize: "10.5px",
                      color: "#64748B",
                      fontWeight: 700,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Zap size={11} color="#059669" /> Simulate Shock
                  </span>
                )}
              </div>

              <div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1.3,
                  }}
                >
                  {btn.label}
                </span>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "11.5px",
                    color: "#6B7280",
                    lineHeight: 1.4,
                  }}
                >
                  {btn.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── ROW 2: WIDESCREEN 100%-WIDTH AUTONOMOUS BIO-MESH & SOLVER STUDIO ── */}
      <div
        style={{
          flex: 1,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "22px",
          padding: "18px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Top Header Strip with Embedded High-Value Impact Chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid #F1F5F9",
            paddingBottom: "12px",
            flexShrink: 0,
          }}
        >
          {/* Left Title & Status Badge */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
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
              <span style={{ fontSize: "11px", color: "#94A3B8" }}>·</span>
              <span style={{ fontSize: "11.5px", color: "#64748B", fontFamily: "monospace" }}>
                {result.bannerTelemetry}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#111827" }}>
              {activeCrisis ? activeCrisis.label : "Baseline NCR Network Flow"}
            </h3>
          </div>

          {/* Right: Embedded High-Impact Telemetry Chips (Saved from old JPG 2, taking ZERO extra column space!) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Chip 1: Stockouts */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <Clock size={13} color="#059669" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#065F46", textTransform: "uppercase" }}>
                  Stockouts Prevented
                </span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#047857" }}>
                  0 hrs <span style={{ fontSize: "10px", fontWeight: 600, color: "#059669" }}>vs {result.siloedStockouts}h Siloed</span>
                </span>
              </div>
            </div>

            {/* Chip 2: Platelets Rescued */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <Award size={13} color="#2563EB" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#1E40AF", textTransform: "uppercase" }}>
                  Platelets Rescued
                </span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#1D4ED8" }}>
                  +{displayedUnits} u <span style={{ fontSize: "10px", fontWeight: 600, color: "#3B82F6" }}>({result.rescuedSavingsText})</span>
                </span>
              </div>
            </div>

            {/* Chip 3: O- Trauma Buffer */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#FAF5FF",
                border: "1px solid #E9D5FF",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <ShieldCheck size={13} color="#7C3AED" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#581C87", textTransform: "uppercase" }}>
                  Universal O- Buffer
                </span>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#6D28D9" }}>
                  {displayedPct}% <span style={{ fontSize: "10px", fontWeight: 600, color: "#8B5CF6" }}>Protected</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── WIDESCREEN ANIMATED ARCHITECTURAL MESH CANVAS ── */}
        <div
          style={{
            flex: 1,
            margin: "10px 0",
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
            viewBox="0 0 1000 350"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", height: "100%", maxHeight: "330px" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Architectural dot grid */}
              <pattern id="archGridWide" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1.3" fill="#E2E8F0" />
              </pattern>

              {/* Bézier routing routes */}
              {WIDE_VESSELS.map((v, i) => (
                <path
                  key={i}
                  id={`wide-route-${i}`}
                  d={wideBezierPath(v.fromX, v.fromY, v.toX, v.toY)}
                  fill="none"
                />
              ))}
            </defs>

            {/* Background dot pattern */}
            <rect width="100%" height="100%" fill="url(#archGridWide)" />

            {/* Subtle Tier Column Header Guidelines */}
            <text x="130" y="24" fill="#94A3B8" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
              SURPLUS DONOR HUBS (SUPPLY TIER)
            </text>
            <text x="500" y="24" fill="#94A3B8" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
              GOOGLE OR-TOOLS HIGHWAY ROUTING BUS (TRANSIT TIER)
            </text>
            <text x="860" y="24" fill="#94A3B8" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
              DISRUPTED SURGE HOSPITALS (DEMAND TIER)
            </text>

            {/* Curved Wide Bezier Vessels */}
            {WIDE_VESSELS.map((v, i) => (
              <path
                key={i}
                d={wideBezierPath(v.fromX, v.fromY, v.toX, v.toY)}
                stroke="#10B981"
                strokeWidth="2.5"
                strokeOpacity={activeCrisisId ? "0.55" : "0.3"}
                fill="none"
                strokeLinecap="round"
              />
            ))}

            {/* Live Floating Highway Corridor Waypoint Badges in Center Corridor */}
            {WIDE_VESSELS.map((v, i) => (
              <g key={`corridor-tag-${i}`} opacity={activeCrisisId ? 0.95 : 0.65}>
                <rect
                  x="440"
                  y={v.tagY - 9}
                  width="120"
                  height="18"
                  rx="9"
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                <text
                  x="500"
                  y={v.tagY + 3.5}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {v.label}
                </text>
              </g>
            ))}

            {/* Animated Glowing Packets along Wide Vessels */}
            {WIDE_VESSELS.map((v, i) => (
              <g key={`pkt-${i}`}>
                {/* Outer Glow Halo */}
                <circle r="7" fill="#10B981" opacity="0.25">
                  <animateMotion dur={activeCrisisId ? "2.2s" : "3.0s"} repeatCount="indefinite" begin={v.delay}>
                    <mpath href={`#wide-route-${i}`} />
                  </animateMotion>
                </circle>
                {/* Core Packet */}
                <circle r="4" fill="#059669" opacity="0.95" stroke="#FFFFFF" strokeWidth="1.5">
                  <animateMotion dur={activeCrisisId ? "2.2s" : "3.0s"} repeatCount="indefinite" begin={v.delay}>
                    <mpath href={`#wide-route-${i}`} />
                  </animateMotion>
                </circle>
              </g>
            ))}

            {/* ── LEFT: 4 Surplus Donor Hubs (Spacious & Crisp) ── */}
            {DONOR_NODES.map((n) => (
              <g key={n.id}>
                {/* Donor Card Pill */}
                <rect
                  x={n.pillX}
                  y={n.y - 14}
                  width="130"
                  height="28"
                  rx="14"
                  fill="#FFFFFF"
                  stroke="#A7F3D0"
                  strokeWidth="1.5"
                />
                <text
                  x={n.pillX + 10}
                  y={n.y - 1}
                  fill="#065F46"
                  fontSize="11"
                  fontWeight="800"
                >
                  {n.name}
                </text>
                <text
                  x={n.pillX + 10}
                  y={n.y + 10}
                  fill="#64748B"
                  fontSize="8"
                  fontWeight="600"
                >
                  {n.sub}
                </text>

                {/* Left Circle Node */}
                <circle cx={n.circleX} cy={n.y} r="16" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                <text
                  x={n.circleX}
                  y={n.y + 4}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="9"
                  fontWeight="800"
                >
                  {n.id}
                </text>

                {/* Outbound Anchor Connector Dot */}
                <circle cx="205" cy={n.y} r="4" fill="#10B981" />
              </g>
            ))}

            {/* ── RIGHT: 3 Deficit Crisis Nodes (Radar Waves & High-Contrast Accents) ── */}
            {CRISIS_NODES.map((n, ni) => {
              const accent = ni === 0 ? "#E11D48" : ni === 1 ? "#D97706" : "#0284C7";
              return (
                <g key={n.id}>
                  {/* Inbound Anchor Connector Dot */}
                  <circle cx="780" cy={n.y} r="4" fill={accent} />

                  {/* Pulsing Radar Wave 1 */}
                  <circle cx={n.circleX} cy={n.y} r="28" fill="none" stroke={accent} strokeWidth="1.5" opacity="0">
                    <animate
                      attributeName="r"
                      from="18"
                      to="38"
                      dur="1.8s"
                      repeatCount="indefinite"
                      begin={`${ni * 0.4}s`}
                    />
                    <animate
                      attributeName="opacity"
                      from="0.65"
                      to="0"
                      dur="1.8s"
                      repeatCount="indefinite"
                      begin={`${ni * 0.4}s`}
                    />
                  </circle>
                  {/* Pulsing Radar Wave 2 */}
                  <circle cx={n.circleX} cy={n.y} r="20" fill="none" stroke={accent} strokeWidth="1.8" opacity="0">
                    <animate
                      attributeName="r"
                      from="14"
                      to="26"
                      dur="1.8s"
                      repeatCount="indefinite"
                      begin={`${ni * 0.4 + 0.3}s`}
                    />
                    <animate
                      attributeName="opacity"
                      from="0.75"
                      to="0"
                      dur="1.8s"
                      repeatCount="indefinite"
                      begin={`${ni * 0.4 + 0.3}s`}
                    />
                  </circle>

                  {/* Crisis Card Pill */}
                  <rect
                    x={n.pillX}
                    y={n.y - 14}
                    width="145"
                    height="28"
                    rx="14"
                    fill="#FFFFFF"
                    stroke={`${accent}55`}
                    strokeWidth="1.5"
                  />
                  <text
                    x={n.pillX + 12}
                    y={n.y - 1}
                    fill="#111827"
                    fontSize="11"
                    fontWeight="800"
                  >
                    {n.name}
                  </text>
                  <text
                    x={n.pillX + 12}
                    y={n.y + 10}
                    fill={accent}
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    {activeCrisisId ? "Active Shock · Restocking" : "Target Node · Steady"}
                  </text>

                  {/* Right Circle Node */}
                  <circle cx={n.circleX} cy={n.y} r="16" fill={accent} stroke="#FFFFFF" strokeWidth="2.5" />
                  <text
                    x={n.circleX}
                    y={n.y + 4}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="800"
                  >
                    {n.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── BOTTOM ACTION & TELEMETRY FOOTER BAR ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #F1F5F9",
            paddingTop: "12px",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Left Solver Monospace Telemetry */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#059669",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "11.5px", color: "#64748B", fontFamily: "monospace" }}>
              7,840 Network Arcs Evaluated · Google OR-Tools Min-Cost Max-Flow · Zero Unmet Demand
            </span>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {activeCrisisId && (
              <button
                type="button"
                onClick={handleStopScenario}
                style={{
                  background: "#FEF2F2",
                  color: "#BE123C",
                  border: "1px solid #FECACA",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <RotateCcw size={13} strokeWidth={2.4} />
                <span>Stop Crisis & Reset Mesh</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePushToMap}
              style={{
                background: "#15997A",
                color: "#FFFFFF",
                borderRadius: "10px",
                padding: "8px 18px",
                fontSize: "12.5px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 6px rgba(21, 153, 122, 0.28)",
              }}
            >
              <span>Push Emergency Routes to Live Map</span>
              <ArrowRight size={13} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
