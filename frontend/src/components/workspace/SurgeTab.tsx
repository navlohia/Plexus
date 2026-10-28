import { useState, useMemo, useEffect, useRef } from "react";
import { RotateCcw, CheckCircle2, Zap, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, Clock, Award } from "lucide-react";
import type { TickState } from "../../types";
import { CRISIS_SCENARIOS, BASELINE_SCENARIO, CRISIS_BUTTONS } from "../../lib/crisisData";

interface SurgeTabProps {
  state: TickState;
  activeCrisisId: string | null;
  onActivateScenario: (id: string) => void;
  onStopScenario: () => void;
  onNavigateToMap: () => void;
}

// 4 Primary Donor Reserve Hubs (Left Supply Tier)
const DONOR_NODES = [
  { id: "N62", name: "Fortis Noida", sub: "Surplus Hub · Sec-62", circleX: 52, pillX: 80, y: 80 },
  { id: "MDT", name: "Medanta Hub", sub: "Surplus Hub · NH-48", circleX: 52, pillX: 80, y: 180 },
  { id: "APL", name: "Apollo Sarita", sub: "Surplus Hub · Mathura Rd", circleX: 52, pillX: 80, y: 280 },
  { id: "MAX", name: "Max Saket", sub: "Surplus Hub · Press Enclave", circleX: 52, pillX: 80, y: 380 },
];

// 3 Target Crisis Surge Nodes (Right Demand Tier)
const CRISIS_NODES = [
  { id: "AIM", name: "AIIMS Trauma", sub: "Central Delhi Trauma Hub", circleX: 948, pillX: 765, y: 110, accent: "#E11D48" },
  { id: "GTB", name: "GTB East Delhi", sub: "Trans-Yamuna Epidemic Hub", circleX: 948, pillX: 765, y: 230, accent: "#D97706" },
  { id: "SFD", name: "Safdarjung", sub: "South Delhi Trauma Wing", circleX: 948, pillX: 765, y: 350, accent: "#0284C7" },
];

// 7 Graceful Wide Bézier Routing Vessels across major Delhi-NCR corridors
const WIDE_VESSELS = [
  { fromX: 230, fromY: 80, toX: 765, toY: 110, delay: "0s", label: "DND Express Corridor", tagY: 88 },
  { fromX: 230, fromY: 80, toX: 765, toY: 230, delay: "0.5s", label: "Vikas Marg Arterial", tagY: 150 },
  { fromX: 230, fromY: 180, toX: 765, toY: 110, delay: "0.9s", label: "NH-48 Trauma Express", tagY: 136 },
  { fromX: 230, fromY: 180, toX: 765, toY: 350, delay: "0.2s", label: "Mehrauli-Gurugram Arterial", tagY: 260 },
  { fromX: 230, fromY: 280, toX: 765, toY: 230, delay: "0.7s", label: "Barapullah Elevated Bypass", tagY: 248 },
  { fromX: 230, fromY: 280, toX: 765, toY: 350, delay: "1.3s", label: "Ring Road South Corridor", tagY: 312 },
  { fromX: 230, fromY: 380, toX: 765, toY: 350, delay: "0.4s", label: "Aurobindo Marg Direct Link", tagY: 368 },
];

function wideBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx1 = x1 + (x2 - x1) * 0.44;
  const cx2 = x1 + (x2 - x1) * 0.56;
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
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);

  const scrollToSection1 = () => {
    section1Ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToSection2 = () => {
    section2Ref.current?.scrollIntoView({ behavior: "smooth" });
  };

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

    setTimeout(() => {
      setIsSolving(false);
    }, 400);

    // Smoothly scroll down to reveal animation like landing page
    setTimeout(() => {
      scrollToSection2();
    }, 150);
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
    const duration = 300;
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
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        scrollBehavior: "smooth",
        background: "#F8FAFC",
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          PAGE 1: MINIMALIST SCENARIO CHOOSER (LANDING-PAGE STYLE)
         ══════════════════════════════════════════════════════════════ */}
      <div
        ref={section1Ref}
        style={{
          minHeight: "calc(100vh - 60px)",
          scrollSnapAlign: "start",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 24px 30px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Minimalist Landing Eyebrow */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            padding: "4px 14px",
            borderRadius: "999px",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#059669",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#065F46",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            STRESS LAB · SHOCK INJECTION
          </span>
        </div>

        {/* Minimalist Landing Headline */}
        <h1
          style={{
            fontSize: isMobile ? "26px" : "36px",
            fontWeight: 800,
            color: "#0F172A",
            margin: "0 0 10px",
            textAlign: "center",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          Simulate Network Shocks.{" "}
          <span style={{ fontWeight: 400, color: "#64748B" }}>Watch the Mesh Adapt.</span>
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#64748B",
            maxWidth: "600px",
            textAlign: "center",
            margin: "0 0 36px",
            lineHeight: 1.6,
          }}
        >
          Trigger clinical demand shocks across 25 Delhi-NCR hospitals. Google OR-Tools instantly
          rebalances cold-chain blood logistics to prevent critical stockouts.
        </p>

        {/* 3 Responsive Tactile Scenario Cards */}
        <div
          className="surge-scenario-grid"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: isMobile ? "12px" : "18px",
            maxWidth: "1060px",
            width: "100%",
            marginBottom: isMobile ? "24px" : "36px",
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
                  gap: "12px",
                  padding: "22px 24px",
                  borderRadius: "18px",
                  border: isActive ? `2px solid ${btn.accent}` : "1.5px solid #E2E8F0",
                  background: "#FFFFFF",
                  color: "#111827",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.2, 1, 0.3, 1)",
                  transform: isActive ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: isActive
                    ? `0 12px 30px -4px ${btn.accent}26, 0 2px 8px rgba(0,0,0,0.04)`
                    : "0 2px 8px rgba(0,0,0,0.03)",
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
                      fontSize: "12px",
                      fontWeight: 800,
                      color: isActive ? btn.accent : "#94A3B8",
                      fontFamily: "monospace",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {btn.num}
                  </span>

                  {isActive ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: btn.accentBg,
                        color: btn.accent,
                        border: `1px solid ${btn.accent}33`,
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                      }}
                    >
                      <CheckCircle2 size={12} strokeWidth={2.8} />
                      ACTIVE SHOCK
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10.5px",
                        color: "#475569",
                        fontWeight: 700,
                        background: "#F1F5F9",
                        padding: "3px 9px",
                        borderRadius: "6px",
                      }}
                    >
                      <Zap size={11} color="#059669" /> Simulate Shock
                    </span>
                  )}
                </div>

                <div>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#0F172A",
                      lineHeight: 1.3,
                    }}
                  >
                    {btn.label}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12.5px",
                      color: "#64748B",
                      lineHeight: 1.5,
                    }}
                  >
                    {btn.sub}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isActive ? btn.accent : "#059669",
                  }}
                >
                  <span>{isActive ? "Viewing Live Mesh Below" : "Launch Simulation & Scroll"}</span>
                  <ArrowRight size={13} strokeWidth={2.6} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Bouncing Scroll Down Prompt to Lower Page */}
        <button
          type="button"
          onClick={scrollToSection2}
          style={{
            background: "transparent",
            border: "none",
            color: "#64748B",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span>Scroll down to view live OR-Tools network mesh</span>
          <ChevronDown size={18} strokeWidth={2.4} color="#059669" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 2: CINEMATIC FULL-SIZE ANIMATED BIO-MESH ARCHITECTURE
         ══════════════════════════════════════════════════════════════ */}
      <div
        ref={section2Ref}
        style={{
          minHeight: "calc(100vh - 60px)",
          scrollSnapAlign: "start",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: isMobile ? "16px 14px 28px" : "24px 32px",
          background: "#FFFFFF",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Top Control Bar with Navigation and Scenario Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            borderBottom: "1px solid #F1F5F9",
            paddingBottom: "14px",
            flexShrink: 0,
          }}
        >
          {/* Left Title & Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={scrollToSection1}
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Return to 3 scenario cards"
            >
              <ChevronUp size={14} strokeWidth={2.4} />
              <span>Back to Scenarios</span>
            </button>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: isSolving ? "#D97706" : activeCrisisId ? "#065F46" : "#2563EB",
                    background: isSolving ? "#FEF3C7" : activeCrisisId ? "#ECFDF5" : "#EFF6FF",
                    border: `1px solid ${isSolving ? "#FDE68A" : activeCrisisId ? "#A7F3D0" : "#BFDBFE"}`,
                    padding: "2px 8px",
                    borderRadius: "5px",
                    textTransform: "uppercase",
                  }}
                >
                  {isSolving
                    ? "SOLVING NETWORK ARCS..."
                    : activeCrisisId
                    ? "OR-TOOLS MIN-COST MAX-FLOW · CONVERGED"
                    : "BASELINE STEADY STATE"}
                </span>
                <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "monospace" }}>
                  {result.bannerTelemetry}
                </span>
              </div>
              <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
                {activeCrisis ? activeCrisis.label : "Baseline NCR Network Flow"}
              </h2>
            </div>
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
                  borderRadius: "9px",
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
                <span>Reset to Baseline</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePushToMap}
              style={{
                background: "#15997A",
                color: "#FFFFFF",
                borderRadius: "9px",
                padding: "8px 18px",
                fontSize: "12.5px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                transition: "all 0.15s ease",
                boxShadow: "0 2px 6px rgba(21, 153, 122, 0.25)",
              }}
            >
              <span>View Active Routes on Live Map</span>
              <ArrowRight size={13} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        {/* ── CINEMATIC FULL-SIZE ANIMATED BIO-MESH ARCHITECTURAL SVG CANVAS ── */}
        <div
          style={{
            flex: 1,
            margin: "12px 0",
            background: "#F8FAFC",
            borderRadius: "18px",
            border: "1px solid #E2E8F0",
            position: "relative",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
            display: "flex",
            alignItems: "center",
            justifyContent: isMobile ? "flex-start" : "center",
            minHeight: isMobile ? "320px" : "360px",
          }}
        >
          <svg
            key={animKey}
            viewBox="0 0 1000 460"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: "100%", minWidth: isMobile ? "780px" : "auto", height: "100%", maxHeight: "440px" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Architectural dot grid */}
              <pattern id="fullGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1.3" fill="#E2E8F0" />
              </pattern>

              {/* Bézier routing routes */}
              {WIDE_VESSELS.map((v, i) => (
                <path
                  key={i}
                  id={`cinematic-route-${i}`}
                  d={wideBezierPath(v.fromX, v.fromY, v.toX, v.toY)}
                  fill="none"
                />
              ))}
            </defs>

            {/* Background dot pattern */}
            <rect width="100%" height="100%" fill="url(#fullGrid)" />

            {/* Tier Column Header Guidelines */}
            <text x="140" y="30" fill="#94A3B8" fontSize="10.5" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
              SURPLUS DONOR HUBS (SUPPLY TIER)
            </text>
            <text x="500" y="30" fill="#94A3B8" fontSize="10.5" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
              OR-TOOLS HIGHWAY ROUTING CORRIDORS (TRANSIT TIER)
            </text>
            <text x="860" y="30" fill="#94A3B8" fontSize="10.5" fontWeight="800" textAnchor="middle" letterSpacing="0.08em">
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

            {/* Floating Highway Corridor Badges */}
            {WIDE_VESSELS.map((v, i) => (
              <g key={`corridor-tag-${i}`} opacity={activeCrisisId ? 0.95 : 0.7}>
                <rect
                  x="430"
                  y={v.tagY - 10}
                  width="140"
                  height="20"
                  rx="10"
                  fill="#FFFFFF"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                <text
                  x="500"
                  y={v.tagY + 4}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="9"
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
                <circle r="8" fill="#10B981" opacity="0.25">
                  <animateMotion dur={activeCrisisId ? "2.2s" : "3.0s"} repeatCount="indefinite" begin={v.delay}>
                    <mpath href={`#cinematic-route-${i}`} />
                  </animateMotion>
                </circle>
                {/* Core Packet */}
                <circle r="4.5" fill="#059669" opacity="0.95" stroke="#FFFFFF" strokeWidth="1.5">
                  <animateMotion dur={activeCrisisId ? "2.2s" : "3.0s"} repeatCount="indefinite" begin={v.delay}>
                    <mpath href={`#cinematic-route-${i}`} />
                  </animateMotion>
                </circle>
              </g>
            ))}

            {/* ── LEFT: 4 Surplus Donor Hubs (Generously Proportioned) ── */}
            {DONOR_NODES.map((n) => (
              <g key={n.id}>
                {/* Donor Card Pill */}
                <rect
                  x={n.pillX}
                  y={n.y - 18}
                  width="145"
                  height="36"
                  rx="18"
                  fill="#FFFFFF"
                  stroke="#A7F3D0"
                  strokeWidth="1.5"
                />
                <text
                  x={n.pillX + 12}
                  y={n.y - 1}
                  fill="#065F46"
                  fontSize="12"
                  fontWeight="800"
                >
                  {n.name}
                </text>
                <text
                  x={n.pillX + 12}
                  y={n.y + 12}
                  fill="#64748B"
                  fontSize="9"
                  fontWeight="600"
                >
                  {n.sub}
                </text>

                {/* Left Circle Node */}
                <circle cx={n.circleX} cy={n.y} r="18" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
                <text
                  x={n.circleX}
                  y={n.y + 4.5}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="9.5"
                  fontWeight="800"
                >
                  {n.id}
                </text>

                {/* Outbound Connector Dot */}
                <circle cx="230" cy={n.y} r="4.5" fill="#10B981" />
              </g>
            ))}

            {/* ── RIGHT: 3 Deficit Crisis Nodes (Pulsing Radar Waves) ── */}
            {CRISIS_NODES.map((n, ni) => {
              const accent = ni === 0 ? "#E11D48" : ni === 1 ? "#D97706" : "#0284C7";
              return (
                <g key={n.id}>
                  {/* Inbound Connector Dot */}
                  <circle cx="765" cy={n.y} r="4.5" fill={accent} />

                  {/* Pulsing Radar Wave 1 */}
                  <circle cx={n.circleX} cy={n.y} r="30" fill="none" stroke={accent} strokeWidth="1.5" opacity="0">
                    <animate
                      attributeName="r"
                      from="20"
                      to="42"
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
                  <circle cx={n.circleX} cy={n.y} r="22" fill="none" stroke={accent} strokeWidth="1.8" opacity="0">
                    <animate
                      attributeName="r"
                      from="16"
                      to="28"
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
                    y={n.y - 18}
                    width="155"
                    height="36"
                    rx="18"
                    fill="#FFFFFF"
                    stroke={`${accent}55`}
                    strokeWidth="1.5"
                  />
                  <text
                    x={n.pillX + 14}
                    y={n.y - 1}
                    fill="#111827"
                    fontSize="12"
                    fontWeight="800"
                  >
                    {n.name}
                  </text>
                  <text
                    x={n.pillX + 14}
                    y={n.y + 12}
                    fill={accent}
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {activeCrisisId ? "Active Shock · Restocking" : "Target Node · Steady"}
                  </text>

                  {/* Right Circle Node */}
                  <circle cx={n.circleX} cy={n.y} r="18" fill={accent} stroke="#FFFFFF" strokeWidth="2.5" />
                  <text
                    x={n.circleX}
                    y={n.y + 4.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontWeight="800"
                  >
                    {n.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── BOTTOM METRICS & TELEMETRY STRIP ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #F1F5F9",
            paddingTop: "12px",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Left Telemetry */}
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

          {/* Right: 3 Key Metrics */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px" }}>
              <Clock size={13} color="#059669" />
              <span style={{ color: "#64748B" }}>Stockouts:</span>
              <strong style={{ color: "#047857" }}>0 hrs</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px" }}>
              <Award size={13} color="#2563EB" />
              <span style={{ color: "#64748B" }}>Rescued:</span>
              <strong style={{ color: "#1D4ED8" }}>+{displayedUnits}u</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px" }}>
              <ShieldCheck size={13} color="#7C3AED" />
              <span style={{ color: "#64748B" }}>Buffer:</span>
              <strong style={{ color: "#6D28D9" }}>{displayedPct}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
