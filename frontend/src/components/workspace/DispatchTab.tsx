import { useState, useMemo } from "react";
import {
  Truck,
  CheckCircle2,
  Clock,
  Thermometer,
  Send,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { BloodType, TickState, TransferRequestInput, TransferStatus, TransferUrgency } from "../../types";
import { BLOOD_TYPES, totalUnits } from "../../lib/blood";

interface DispatchTabProps {
  state: TickState;
  preselectedHospitalId?: string;
  onTransferRequest: (p: TransferRequestInput) => Promise<void>;
  onStatusChange: (txId: string, status: TransferStatus) => Promise<void>;
}

export default function DispatchTab({
  state,
  preselectedHospitalId,
  onTransferRequest,
  onStatusChange,
}: DispatchTabProps) {
  const defaultTarget = preselectedHospitalId ?? (state.nodes[0]?.id ?? "");
  const [targetId, setTargetId] = useState(defaultTarget);
  const [blood, setBlood] = useState<BloodType>("O+");
  const [units, setUnits] = useState(4);
  const [urgency, setUrgency] = useState<TransferUrgency>("URGENT");
  const [submitting, setSubmitting] = useState(false);
  const [filterState, setFilterState] = useState<"ALL" | "APPROVED" | "RECOMMENDED" | "DELIVERED">("ALL");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;
    setSubmitting(true);
    try {
      await onTransferRequest({ target_id: targetId, blood, units, urgency });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransfers = useMemo(() => {
    if (filterState === "ALL") return state.transfers;
    return state.transfers.filter(t => t.status === filterState);
  }, [state.transfers, filterState]);

  const activeCount = useMemo(() => {
    return state.transfers.filter(t => t.status !== "DELIVERED").length;
  }, [state.transfers]);

  const criticalCount = useMemo(() => {
    return state.transfers.filter(t => t.urgency === "CRITICAL" && t.status !== "DELIVERED").length;
  }, [state.transfers]);

  const totalUnitsInMotion = useMemo(() => {
    return state.transfers
      .filter(t => t.status === "APPROVED")
      .reduce((s, t) => s + t.units, 0);
  }, [state.transfers]);

  const pendingSolverRoutes = useMemo(() => {
    return state.transfers.filter(t => t.status === "RECOMMENDED");
  }, [state.transfers]);

  const handleBatchApprove = async () => {
    for (const r of pendingSolverRoutes.slice(0, 5)) {
      await onStatusChange(r.id, "APPROVED");
    }
  };

  const donorCandidate = useMemo(() => {
    const targetNode = state.nodes.find(n => n.id === targetId);
    if (!targetNode) return null;
    const candidates = state.nodes
      .filter(n => n.id !== targetId)
      .map(n => {
        const inv = n.inventory_by_blood_and_age[blood];
        const count = inv ? Object.values(inv).reduce((s, v) => s + v, 0) : 0;
        return { node: n, count };
      })
      .filter(c => c.count >= units)
      .sort((a, b) => b.count - a.count);
    return candidates[0]?.node ?? state.nodes[1] ?? null;
  }, [state.nodes, targetId, blood, units]);

  return (
    <div className="dispatch-sleek-root">

      {/* ── 1. Minimalist Top Status Strip ── */}
      <div className="dispatch-sleek-strip">
        <div className="dispatch-strip-item">
          <Truck size={12} className="text-emerald" />
          <span className="dispatch-strip-lbl">Active En-Route:</span>
          <span className="dispatch-strip-val">{activeCount} Transits</span>
        </div>

        <div className="dispatch-strip-sep" />

        <div className="dispatch-strip-item">
          <span className="dispatch-strip-dot-red" />
          <span className="dispatch-strip-lbl">Critical Expedites:</span>
          <span className="dispatch-strip-val text-crimson">{criticalCount}</span>
        </div>

        <div className="dispatch-strip-sep" />

        <div className="dispatch-strip-item">
          <span className="dispatch-strip-lbl">Units In Transit:</span>
          <span className="dispatch-strip-val">{totalUnitsInMotion}u</span>
        </div>

        <div className="dispatch-strip-sep" />

        <div className="dispatch-strip-item">
          <Thermometer size={12} className="text-cyan" />
          <span className="dispatch-strip-lbl">Cold-Chain:</span>
          <span className="dispatch-strip-val">22.1°C Nominal</span>
        </div>

        <div className="dispatch-strip-sep" />

        <div className="dispatch-strip-item">
          <Clock size={12} className="text-amber" />
          <span className="dispatch-strip-lbl">Mean Latency:</span>
          <span className="dispatch-strip-val">24.8m ETA</span>
        </div>
      </div>

      {/* ── 2. Split Workspace Layout ── */}
      <div className="dispatch-sleek-layout">

        {/* ── Left Main: Transfer Route Pipeline ── */}
        <div className="dispatch-sleek-pipeline">

          {/* Filters Bar */}
          <div className="dispatch-sleek-toolbar">
            <div className="dispatch-sleek-filters">
              {(["ALL", "APPROVED", "RECOMMENDED", "DELIVERED"] as const).map(s => {
                const count = s === "ALL" ? state.transfers.length : state.transfers.filter(t => t.status === s).length;
                const label = s === "ALL" ? "All Manifests" : s === "APPROVED" ? "In Transit" : s === "RECOMMENDED" ? "Pending Approval" : "Delivered";
                return (
                  <button
                    key={s}
                    onClick={() => setFilterState(s)}
                    className={`dispatch-filter-tab${filterState === s ? " dispatch-filter-tab--active" : ""}`}
                    type="button"
                  >
                    <span>{label}</span>
                    <span className="dispatch-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {pendingSolverRoutes.length > 0 && (
              <button
                onClick={handleBatchApprove}
                className="dispatch-batch-btn"
                type="button"
              >
                <Zap size={11} />
                <span>Authorize Top {Math.min(5, pendingSolverRoutes.length)} Optimal</span>
              </button>
            )}
          </div>

          {/* Route Cards Stream */}
          <div className="dispatch-sleek-cards">
            {filteredTransfers.length === 0 ? (
              <div className="dispatch-sleek-empty">
                <ShieldCheck size={24} className="text-emerald" />
                <span>All lateral transshipment requests are fulfilled</span>
              </div>
            ) : (
              filteredTransfers.map(t => {
                const isCritical = t.urgency === "CRITICAL";
                const isApproved = t.status === "APPROVED";
                const isDelivered = t.status === "DELIVERED";

                return (
                  <div
                    key={t.id}
                    className={`dispatch-clean-card${isCritical ? " dispatch-clean-card--critical" : ""}`}
                  >
                    {/* Top Row: ID, Urgency, Status */}
                    <div className="dispatch-clean-header">
                      <div className="dispatch-clean-id-group">
                        <span className="dispatch-clean-id">{t.id}</span>
                        <span className={`dispatch-clean-urgency dispatch-clean-urgency--${t.urgency.toLowerCase()}`}>
                          {t.urgency}
                        </span>
                        <span className="dispatch-clean-clock">{t.created_at}</span>
                      </div>

                      <div className="dispatch-clean-status">
                        {isDelivered ? (
                          <span className="dispatch-status-chip dispatch-status-chip--delivered">
                            <CheckCircle2 size={11} /> Delivered
                          </span>
                        ) : isApproved ? (
                          <span className="dispatch-status-chip dispatch-status-chip--transit">
                            <span className="ws-live-pulse-dot" /> In Transit · {t.eta_mins}m
                          </span>
                        ) : (
                          <span className="dispatch-status-chip dispatch-status-chip--pending">
                            <Clock size={11} /> Pending Solver Authorization
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Route Flow */}
                    <div className="dispatch-clean-flow">
                      <div className="dispatch-flow-stop">
                        <span className="dispatch-flow-tag">ORIGIN</span>
                        <span className="dispatch-flow-name">{t.source_name}</span>
                      </div>

                      <div className="dispatch-flow-connector">
                        <span className="dispatch-flow-dist">{t.distance_km} km</span>
                        <ArrowRight size={13} className="dispatch-flow-arrow" />
                      </div>

                      <div className="dispatch-flow-stop">
                        <span className="dispatch-flow-tag">DESTINATION</span>
                        <span className="dispatch-flow-name">{t.target_name}</span>
                      </div>
                    </div>

                    {/* Bottom Row: Metadata & Action */}
                    <div className="dispatch-clean-footer">
                      <div className="dispatch-clean-meta-chips">
                        <span className="dispatch-chip-blood">
                          <strong>{t.donor_blood}</strong> · {t.units}u
                        </span>
                        <span className="dispatch-chip-spec">
                          <Clock size={10} /> {t.remaining_hours}h shelf-life
                        </span>
                        <span className="dispatch-chip-spec">
                          <Thermometer size={10} /> {t.cooler_temp_c}°C
                        </span>
                      </div>

                      <div className="dispatch-clean-actions">
                        {t.status === "RECOMMENDED" && (
                          <>
                            <button
                              onClick={() => onStatusChange(t.id, "APPROVED")}
                              className="dispatch-btn-primary"
                              type="button"
                            >
                              Authorize
                            </button>
                            <button
                              onClick={() => onStatusChange(t.id, "DELIVERED")}
                              className="dispatch-btn-secondary"
                              type="button"
                            >
                              Dismiss
                            </button>
                          </>
                        )}

                        {t.status === "APPROVED" && (
                          <button
                            onClick={() => onStatusChange(t.id, "DELIVERED")}
                            className="dispatch-btn-confirm"
                            type="button"
                          >
                            <CheckCircle2 size={11} /> Confirm Delivery
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* ── Right Pane: Direct Manual Dispatch Terminal ── */}
        <div className="dispatch-sleek-terminal">
          <div className="dispatch-terminal-card">
            <div className="dispatch-terminal-header">
              <h3 className="dispatch-terminal-title">Manual Lateral Dispatch</h3>
              <p className="dispatch-terminal-sub">Real-time emergency override routing</p>
            </div>

            <form onSubmit={handleSubmit} className="dispatch-terminal-form">

              <div className="dispatch-input-group">
                <label className="dispatch-input-lbl">Recipient Facility</label>
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="dispatch-select-input"
                >
                  {state.nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({totalUnits(n)}u in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="dispatch-input-group">
                <label className="dispatch-input-lbl">Blood Group Spec</label>
                <div className="dispatch-blood-pills">
                  {BLOOD_TYPES.map(bt => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setBlood(bt)}
                      className={`dispatch-blood-pill${blood === bt ? " dispatch-blood-pill--active" : ""}`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dispatch-input-group">
                <div className="dispatch-input-row-between">
                  <label className="dispatch-input-lbl">Quantity</label>
                  <span className="dispatch-units-badge">{units} Units</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={units}
                  onChange={e => setUnits(Number(e.target.value))}
                  className="dispatch-range-track"
                />
              </div>

              <div className="dispatch-input-group">
                <label className="dispatch-input-lbl">Priority Level</label>
                <div className="dispatch-urgency-pills">
                  {(["ROUTINE", "URGENT", "CRITICAL"] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`dispatch-urgency-pill dispatch-urgency-pill--${u.toLowerCase()}${urgency === u ? " dispatch-urgency-pill--active" : ""}`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {donorCandidate && (
                <div className="dispatch-candidate-card">
                  <span className="dispatch-candidate-lbl">RECOMMENDED DONOR</span>
                  <div className="dispatch-candidate-name">{donorCandidate.name}</div>
                  <div className="dispatch-candidate-sub">{totalUnits(donorCandidate)} units available</div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !targetId}
                className="dispatch-dispatch-submit-btn"
              >
                <Send size={12} />
                <span>{submitting ? "Transmitting…" : "Authorize & Dispatch"}</span>
              </button>

            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
