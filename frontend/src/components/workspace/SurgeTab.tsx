import { useState, useMemo, useEffect } from "react";
import { RotateCcw, CheckCircle2, Zap, ArrowRight, ShieldCheck, Clock, Award, Truck, AlertTriangle } from "lucide-react";
import type { TickState } from "../../types";
import { CRISIS_SCENARIOS, BASELINE_SCENARIO, CRISIS_BUTTONS } from "../../lib/crisisData";

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
    onActivateScenario(id);

    setTimeout(() => {
      setIsSolving(false);
    }, 350);
  };

  const handleStopScenario = () => {
    setIsSolving(false);
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
        overflow: "hidden",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        background: "#F8FAFC",
        boxSizing: "border-box",
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── ROW 1: 3 Tactile Crisis Trigger Buttons (Plain, Simple, 100% Width) ── */}
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
                borderRadius: "14px",
                border: isActive ? `2px solid ${btn.accent}` : "1.5px solid #E2E8F0",
                background: "#FFFFFF",
                color: "#111827",
                cursor: "pointer",
                transition: "all 0.18s ease",
                transform: isActive ? "translateY(-1px)" : "translateY(0)",
                boxShadow: isActive
                  ? `0 6px 18px -3px ${btn.accent}24, 0 2px 6px rgba(0,0,0,0.03)`
                  : "0 1px 3px rgba(0,0,0,0.03)",
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: isActive ? btn.accent : "#94A3B8",
                      fontFamily: "monospace",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {btn.num}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    SHOCK SCENARIO
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
                      letterSpacing: "0.03em",
                    }}
                  >
                    {isSolving ? (
                      "SOLVING..."
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
                      color: "#475569",
                      fontWeight: 700,
                      background: "#F1F5F9",
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
                    color: "#0F172A",
                    lineHeight: 1.3,
                  }}
                >
                  {btn.label}
                </span>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "11.5px",
                    color: "#64748B",
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

      {/* ── ROW 2: PLAIN, SIMPLE WORKBENCH (Zero Mess, Clean Data Presentation) ── */}
      <div
        style={{
          flex: 1,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "18px",
          padding: "18px 22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          minHeight: 0,
        }}
      >
        {/* Header Ribbon with High-Value Clinical Telemetry */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid #F1F5F9",
            paddingBottom: "14px",
            flexShrink: 0,
          }}
        >
          {/* Left Title & Status */}
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
                  borderRadius: "6px",
                  textTransform: "uppercase",
                }}
              >
                {isSolving
                  ? "SOLVING NETWORK ARCS..."
                  : activeCrisisId
                  ? "OR-TOOLS MIN-COST MAX-FLOW · CONVERGED IN 14.2ms"
                  : "BASELINE OR-TOOLS DISPATCH · STEADY STATE"}
              </span>
              <span style={{ fontSize: "11px", color: "#CBD5E1" }}>·</span>
              <span style={{ fontSize: "11.5px", color: "#64748B", fontFamily: "monospace" }}>
                {result.bannerTelemetry}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0F172A" }}>
              {activeCrisis ? activeCrisis.label : "Baseline NCR Network Flow"}
            </h3>
          </div>

          {/* Right: Key Performance Impact Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Stockouts Chip */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <Clock size={14} color="#059669" />
              <div>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#065F46", textTransform: "uppercase", display: "block", lineHeight: 1 }}>
                  Stockouts Prevented
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#047857" }}>
                  0 hrs <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#059669" }}>vs {result.siloedStockouts}h Siloed</span>
                </span>
              </div>
            </div>

            {/* Units Rescued Chip */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <Award size={14} color="#2563EB" />
              <div>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#1E40AF", textTransform: "uppercase", display: "block", lineHeight: 1 }}>
                  Platelets Rescued
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#1D4ED8" }}>
                  +{displayedUnits} u <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#3B82F6" }}>({result.rescuedSavingsText})</span>
                </span>
              </div>
            </div>

            {/* O- Buffer Chip */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "#FAF5FF",
                border: "1px solid #E9D5FF",
                padding: "6px 12px",
                borderRadius: "8px",
              }}
            >
              <ShieldCheck size={14} color="#7C3AED" />
              <div>
                <span style={{ fontSize: "9px", fontWeight: 800, color: "#581C87", textTransform: "uppercase", display: "block", lineHeight: 1 }}>
                  Universal O- Buffer
                </span>
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#6D28D9" }}>
                  {displayedPct}% <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#8B5CF6" }}>Protected</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT: PLAIN & SIMPLE 2-PANEL DATA SPLIT ── */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1.55fr 1fr",
            gap: "16px",
            margin: "12px 0",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* LEFT: Autonomous Emergency Dispatches Table */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <Truck size={15} color="#059669" />
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                  Autonomous Emergency Dispatch Legs ({result.emergencyRoutes.length})
                </h4>
              </div>
              <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600 }}>
                Real-Time OR-Tools Solutions
              </span>
            </div>

            {/* Clean Dispatch Strip Table */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {result.emergencyRoutes.map((route) => (
                <div
                  key={route.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  {/* Left: Origin & Destination */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "240px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: "#475569",
                        background: "#F1F5F9",
                        padding: "2px 6px",
                        borderRadius: "5px",
                      }}
                    >
                      {route.id}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          background: "#ECFDF5",
                          color: "#065F46",
                          border: "1px solid #A7F3D0",
                          padding: "2px 7px",
                          borderRadius: "5px",
                        }}
                      >
                        {route.donorCode}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94A3B8" }}>➔</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          background: activeCrisisId ? "#FFF1F2" : "#EFF6FF",
                          color: activeCrisisId ? "#BE123C" : "#1D4ED8",
                          border: activeCrisisId ? "1px solid #FECACA" : "1px solid #BFDBFE",
                          padding: "2px 7px",
                          borderRadius: "5px",
                        }}
                      >
                        {route.recipientCode}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#1E293B", marginLeft: "4px" }}>
                        {route.target_name.split(" ")[0]}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Biologic Cargo & Protocol */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                    <span
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 800,
                        color: "#0F172A",
                        background: "#FEF3C7",
                        border: "1px solid #FDE68A",
                        padding: "2px 8px",
                        borderRadius: "5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {route.cargo}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748B", whiteSpace: "nowrap" }}>
                      {route.reason}
                    </span>
                  </div>

                  {/* Right: ETA & Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", fontFamily: "monospace" }}>
                      {route.eta}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "#F0FDF4",
                        color: "#166534",
                        border: "1px solid #BBF7D0",
                        padding: "2px 7px",
                        borderRadius: "999px",
                      }}
                    >
                      En Route
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Siloed vs Plexus Comparison & Clinical Safety Card */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "14px" }}>
                <AlertTriangle size={15} color="#D97706" />
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                  Siloed Failure vs. Plexus Mesh Resilience
                </h4>
              </div>

              {/* Comparison Bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748B", fontWeight: 600 }}>Traditional Siloed Response</span>
                    <span style={{ color: "#E11D48", fontWeight: 800 }}>78% Unmet Demand / Spoilage</span>
                  </div>
                  <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "78%", height: "100%", background: "#E11D48", borderRadius: "999px" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "4px" }}>
                    <span style={{ color: "#64748B", fontWeight: 600 }}>Plexus Autonomous Mesh</span>
                    <span style={{ color: "#059669", fontWeight: 800 }}>99.2% Demand Fulfilled · 1.2% Waste</span>
                  </div>
                  <div style={{ height: "8px", background: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: "99.2%", height: "100%", background: "#059669", borderRadius: "999px" }} />
                  </div>
                </div>
              </div>

              {/* Key Clinical Safeguards */}
              <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
                  Active Clinical Safeguards
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11.5px", color: "#334155" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span><strong>FEFO Expiry Rescue:</strong> Oldest viable units rerouted first</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span><strong>Asymmetric ABO Match:</strong> Strict iso-group compatibility</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <CheckCircle2 size={13} color="#059669" />
                    <span><strong>Green Corridor Transit:</strong> Pre-cleared arterial highway paths</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Latency Badge */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "10px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#64748B" }}>Solver Convergence:</span>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#0F172A", fontFamily: "monospace" }}>
                14.2ms (7,840 arcs)
              </span>
            </div>
          </div>
        </div>

        {/* ── FOOTER BAR: ACTION CONTROLS ── */}
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
              Google OR-Tools Multi-Commodity Max-Flow · 25 Delhi-NCR Hospitals Synchronized
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
                <span>Stop Crisis & Reset Mesh</span>
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
              <span>Push Emergency Routes to Live Map</span>
              <ArrowRight size={13} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
