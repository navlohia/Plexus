import { useCallback, useEffect, useState } from "react";
import {
  Radar,
  LayoutGrid,
  FlaskConical,
  ArrowLeft,
  Zap,
  Droplets,
} from "lucide-react";
import type { ScenarioKey, TickState, TransferOrder, TransferRequestInput, TransferStatus, BloodType } from "../../types";
import { CRISIS_SCENARIOS } from "../../lib/crisisData";
import { createTransferRequest, fetchState, injectChaos, setTransferStatus, tick } from "../../api";
import type { WorkspaceTab } from "../../App";
import MedisoDashboardTab from "./MedisoDashboardTab";
import FlightyTVMapTab from "./FlightyTVMapTab";
import SurgeTab from "./SurgeTab";

export type ThemeMode = "light" | "dark";

interface WorkspaceShellProps {
  initialTab: WorkspaceTab;
  initialScenario: ScenarioKey | null;
  onExit: () => void;
}

const FALLBACK_STATE: TickState = {
  day: 1,
  hour: 0,
  mode: "ORTOOLS_SOLVER",
  kpis: [],
  nodes: [],
  active_arcs: [],
  transfers: [
    {
      id: "TX-1041",
      source_id: "ND-04",
      source_name: "Fortis Noida Sec-62",
      source_zone: "Noida",
      target_id: "ND-01",
      target_name: "AIIMS Trauma & Dengue",
      target_zone: "Central Delhi",
      donor_blood: "O+",
      recipient_blood: "O+",
      units: 8,
      distance_km: 18.2,
      eta_mins: 22,
      cooler_temp_c: 22.1,
      age_hours: 32,
      remaining_hours: 19,
      status: "APPROVED",
      origin: "SOLVER",
      urgency: "CRITICAL",
      reason_text: "FEFO expiry rescue before 36h cutoff",
      created_at: "10:14",
    },
    {
      id: "TX-1042",
      source_id: "ND-05",
      source_name: "Medanta The Medicity",
      source_zone: "Gurugram",
      target_id: "ND-07",
      target_name: "GTB East Delhi",
      target_zone: "East Delhi",
      donor_blood: "O-",
      recipient_blood: "O-",
      units: 6,
      distance_km: 34.6,
      eta_mins: 41,
      cooler_temp_c: 21.8,
      age_hours: 24,
      remaining_hours: 48,
      status: "APPROVED",
      origin: "SOLVER",
      urgency: "CRITICAL",
      reason_text: "Trauma O-Negative critical stockout prevention",
      created_at: "10:20",
    },
    {
      id: "TX-1043",
      source_id: "ND-11",
      source_name: "Apollo Hospital Sarita",
      source_zone: "South Delhi",
      target_id: "ND-09",
      target_name: "Lok Nayak LNJP",
      target_zone: "Central Delhi",
      donor_blood: "A+",
      recipient_blood: "A+",
      units: 12,
      distance_km: 14.1,
      eta_mins: 19,
      cooler_temp_c: 22.4,
      age_hours: 28,
      remaining_hours: 26,
      status: "RECOMMENDED",
      origin: "SOLVER",
      urgency: "URGENT",
      reason_text: "Dengue platelet surge stabilization",
      created_at: "10:24",
    },
    {
      id: "TX-1044",
      source_id: "ND-03",
      source_name: "Max Super Specialty Saket",
      source_zone: "South Delhi",
      target_id: "ND-02",
      target_name: "Safdarjung Super Specialty",
      target_zone: "South Delhi",
      donor_blood: "B+",
      recipient_blood: "B+",
      units: 6,
      distance_km: 7.8,
      eta_mins: 12,
      cooler_temp_c: 21.9,
      age_hours: 18,
      remaining_hours: 54,
      status: "RECOMMENDED",
      origin: "SOLVER",
      urgency: "ROUTINE",
      reason_text: "Corridor inventory leveling",
      created_at: "10:28",
    },
    {
      id: "TX-1045",
      source_id: "ND-20",
      source_name: "Jaypee Hospital Sec-128",
      source_zone: "Noida",
      target_id: "ND-12",
      target_name: "Rajiv Gandhi Super Specialty",
      target_zone: "East Delhi",
      donor_blood: "O+",
      recipient_blood: "O+",
      units: 4,
      distance_km: 22.5,
      eta_mins: 29,
      cooler_temp_c: 22.0,
      age_hours: 30,
      remaining_hours: 22,
      status: "RECOMMENDED",
      origin: "SOLVER",
      urgency: "URGENT",
      reason_text: "East corridor deficit support",
      created_at: "10:31",
    },
    {
      id: "TX-1046",
      source_id: "ND-19",
      source_name: "Paras Health Sector 43",
      source_zone: "Gurugram",
      target_id: "ND-21",
      target_name: "DDU Hospital Hari Nagar",
      target_zone: "West Delhi",
      donor_blood: "AB+",
      recipient_blood: "AB+",
      units: 4,
      distance_km: 26.1,
      eta_mins: 34,
      cooler_temp_c: 22.2,
      age_hours: 34,
      remaining_hours: 18,
      status: "RECOMMENDED",
      origin: "SOLVER",
      urgency: "ROUTINE",
      reason_text: "Universal AB surplus clearance",
      created_at: "10:35",
    },
    {
      id: "TX-1039",
      source_id: "ND-14",
      source_name: "BLK-Max Super Specialty",
      source_zone: "Central Delhi",
      target_id: "ND-17",
      target_name: "Saroj Super Specialty Rohini",
      target_zone: "North Delhi",
      donor_blood: "O+",
      recipient_blood: "O+",
      units: 6,
      distance_km: 15.3,
      eta_mins: 20,
      cooler_temp_c: 21.7,
      age_hours: 20,
      remaining_hours: 42,
      status: "DELIVERED",
      origin: "SOLVER",
      urgency: "ROUTINE",
      reason_text: "North corridor batch transfer",
      created_at: "09:45",
    },
    {
      id: "TX-1040",
      source_id: "ND-13",
      source_name: "Fortis Vasant Kunj",
      source_zone: "South Delhi",
      target_id: "ND-08",
      target_name: "Dr. RML Hospital",
      target_zone: "Central Delhi",
      donor_blood: "A-",
      recipient_blood: "A-",
      units: 4,
      distance_km: 12.0,
      eta_mins: 16,
      cooler_temp_c: 22.1,
      age_hours: 16,
      remaining_hours: 60,
      status: "DELIVERED",
      origin: "SOLVER",
      urgency: "ROUTINE",
      reason_text: "Scheduled A-Negative replenishment",
      created_at: "09:50",
    },
  ],
  decay_matrix_8x5: [],
  solver_telemetry: {
    solve_time_ms: 18.4,
    objective_value: 32835.35,
    active_arc_count: 85,
    expiry_penalty_avoided: 225.8,
    o_minus_buffer: 89.2,
    arcs_generated: 7841,
  },
  comparison_metrics: {
    isolated_waste_pct: 26.4,
    solver_waste_pct: 1.2,
    isolated_stockouts: 48,
    solver_stockouts: 2,
    units_saved_from_incineration: 312,
    unmet_trauma_demand_delta: 46,
    cold_chain_cost_efficiency: 0.984,
    solver_latency_ms: 18.4,
  },
};

export default function WorkspaceShell({ initialTab, initialScenario, onExit }: WorkspaceShellProps) {
  // Normalize tab: inventory or dispatch map cleanly to dashboard
  const resolvedInitial: "map" | "dashboard" | "surge" =
    initialTab === "dashboard" || initialTab === "inventory" || initialTab === "dispatch"
      ? "dashboard"
      : initialTab === "surge"
      ? "surge"
      : "map";

  const [tab, setTab] = useState<"map" | "dashboard" | "surge">(resolvedInitial);
  const [activeCrisisId, setActiveCrisisId] = useState<string | null>(initialScenario || null);
  const [state, setState] = useState<TickState>(FALLBACK_STATE);
  const [loading, setLoading] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchState()
      .then((s) => {
        if (s && s.nodes && s.nodes.length > 0) {
          setState((prev) => ({
            ...s,
            transfers: s.transfers && s.transfers.length > 0 ? s.transfers : prev.transfers,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialScenario) {
      injectChaos(initialScenario).then(setState).catch(() => {});
    }
  }, [initialScenario]);

  useEffect(() => {
    if (!toast) return;
    setToastVisible(true);
    const hideTimer = setTimeout(() => setToastVisible(false), 2600);
    const clearTimer = setTimeout(() => setToast(null), 3000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [toast]);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const handleStep = useCallback(() => {
    if (isRebalancing) return;
    setIsRebalancing(true);

    // Instant local state update — never wait for backend
    setState((prev) => {
      const newHour = (prev.hour + 6) % 24;
      const newDay = prev.hour + 6 >= 24 ? prev.day + 1 : prev.day;
      return { ...prev, day: newDay, hour: newHour };
    });

    // Reset button after exactly 400ms
    setTimeout(() => setIsRebalancing(false), 400);

    // Background backend sync (fire and forget)
    tick(6).then((s) => {
      if (s && s.nodes && s.nodes.length > 0) setState(s);
    }).catch(() => {});

    showToast("+6h simulated: network rebalanced");
  }, [isRebalancing]);

  const handleTransferRequest = useCallback(async (p: TransferRequestInput) => {
    // Determine smart matched donor based on target
    let donorId = "ND-04";
    let donorName = "Fortis Hospital Noida";
    let donorZone = "Noida Sec-62";
    let distKm = 18.2;
    let etaMins = 22;

    if (p.target_id === "ND-04") {
      donorId = "ND-05";
      donorName = "Medanta The Medicity";
      donorZone = "Gurugram NH-48";
      distKm = 24.2;
      etaMins = 28;
    } else if (p.target_id === "ND-05") {
      donorId = "ND-11";
      donorName = "Apollo Hospital Sarita";
      donorZone = "South Delhi";
      distKm = 21.0;
      etaMins = 25;
    } else if (p.target_id === "ND-02") {
      donorId = "ND-03";
      donorName = "Max Super Saket";
      donorZone = "South Delhi";
      distKm = 7.8;
      etaMins = 12;
    } else if (p.target_id === "ND-07") {
      donorId = "ND-04";
      donorName = "Fortis Hospital Noida";
      donorZone = "Noida Sec-62";
      distKm = 11.4;
      etaMins = 18;
    }

    const hospitalLookup: Record<string, { name: string; zone: string }> = {
      "ND-01": { name: "AIIMS Trauma Center", zone: "Central Delhi" },
      "ND-02": { name: "Safdarjung Hospital", zone: "South Delhi" },
      "ND-03": { name: "Max Super Saket", zone: "South Delhi" },
      "ND-04": { name: "Fortis Hospital Noida", zone: "Noida Sec-62" },
      "ND-05": { name: "Medanta The Medicity", zone: "Gurugram NH-48" },
      "ND-06": { name: "Fortis Escorts Okhla", zone: "South Delhi" },
      "ND-07": { name: "GTB Hospital East Delhi", zone: "East Delhi" },
      "ND-08": { name: "Dr. RML Hospital", zone: "Central Delhi" },
      "ND-09": { name: "Lok Nayak LNJP", zone: "Central Delhi" },
      "ND-10": { name: "Sir Ganga Ram Hospital", zone: "Old Rajinder" },
      "ND-11": { name: "Apollo Hospital Sarita", zone: "South Delhi" },
      "ND-12": { name: "Rajiv Gandhi Super", zone: "East Delhi" },
      "ND-13": { name: "Fortis Vasant Kunj", zone: "South Delhi" },
      "ND-14": { name: "BLK-Max Super Specialty", zone: "Central Delhi" },
      "ND-15": { name: "Manipal Hospital Dwarka", zone: "West Delhi" },
      "ND-16": { name: "St. Stephens Tis Hazari", zone: "North Delhi" },
      "ND-17": { name: "Saroj Hospital Rohini", zone: "North Delhi" },
      "ND-18": { name: "Venkateshwar Dwarka", zone: "West Delhi" },
      "ND-19": { name: "Paras Health Sector 43", zone: "Gurugram" },
      "ND-20": { name: "Jaypee Hospital Noida", zone: "Noida Sec-128" },
      "ND-21": { name: "DDU Hospital Hari Nagar", zone: "West Delhi" },
      "ND-22": { name: "Sanjay Gandhi Mangolpuri", zone: "North Delhi" },
      "ND-23": { name: "Artemis Hospital Sector 51", zone: "Gurugram" },
      "ND-24": { name: "Max Super Patparganj", zone: "East Delhi" },
      "ND-25": { name: "Holy Family Okhla", zone: "South Delhi" },
    };

    const targetInfo = hospitalLookup[p.target_id] || { name: p.target_id, zone: "NCR Corridor" };

    const newTx: TransferOrder = {
      id: `#TX-${Math.floor(1050 + Math.random() * 50)}`,
      source_id: donorId,
      source_name: donorName,
      source_zone: donorZone,
      target_id: p.target_id,
      target_name: targetInfo.name,
      target_zone: targetInfo.zone,
      donor_blood: p.blood,
      recipient_blood: p.blood,
      units: p.units,
      distance_km: distKm,
      eta_mins: etaMins,
      cooler_temp_c: 22.0,
      age_hours: 24,
      remaining_hours: 48,
      status: "APPROVED" as TransferStatus,
      origin: "MANUAL" as const,
      urgency: p.urgency || ("CRITICAL" as const),
      reason_text: `Express courier dispatch to ${targetInfo.name}`,
      created_at: "Just now",
    };

    // Atomically deduct stock from donor and update recipient in shared nodes
    setState((prev) => {
      const currentNodes = Array.isArray(prev?.nodes) && prev.nodes.length > 0 ? prev.nodes : FALLBACK_STATE.nodes;
      const updatedNodes = currentNodes.map((n) => {
        if (n.id === donorId) {
          const inv = { ...(n.inventory_by_blood_and_age || {}) };
          const bInv = { ...(inv[p.blood] || {}) };
          let needed = p.units;
          for (const age of Object.keys(bInv)) {
            const aNum = Number(age);
            const cur = bInv[aNum] || 0;
            if (cur > 0) {
              const take = Math.min(needed, cur);
              bInv[aNum] -= take;
              needed -= take;
              if (needed <= 0) break;
            }
          }
          inv[p.blood] = bInv;
          return {
            ...n,
            inventory_by_blood_and_age: inv,
            net_balance: (n.net_balance || 0) - p.units,
          };
        }
        if (n.id === p.target_id) {
          return {
            ...n,
            net_balance: (n.net_balance || 0) + p.units,
          };
        }
        return n;
      });

      return {
        ...prev,
        nodes: updatedNodes,
        transfers: [newTx, ...prev.transfers],
      };
    });

    showToast(`✓ Express Courier Dispatched: ${p.units}u ${p.blood} to ${targetInfo.name}`);

    // Fire background API dispatch
    createTransferRequest(p).catch(() => {});
  }, []);

  const handleStatusChange = useCallback(async (txId: string, status: TransferStatus) => {
    setState((prev) => {
      const cleanTxId = txId.startsWith("#") ? txId : `#${txId}`;
      const bareTxId = txId.replace("#", "");
      const tx = prev.transfers.find((t) => t.id === cleanTxId || t.id === bareTxId);

      let updatedNodes = prev.nodes;
      if (status === "DELIVERED" && tx) {
        // Credit units to recipient node upon delivery
        updatedNodes = prev.nodes.map((n) => {
          if (n.id === tx.target_id) {
            const inv = { ...(n.inventory_by_blood_and_age || {}) };
            const bInv = { ...(inv[tx.recipient_blood] || {}) };
            bInv[24] = (bInv[24] || 0) + tx.units;
            inv[tx.recipient_blood] = bInv;
            return {
              ...n,
              inventory_by_blood_and_age: inv,
              net_balance: (n.net_balance || 0) + tx.units,
            };
          }
          return n;
        });
      }

      return {
        ...prev,
        nodes: updatedNodes,
        transfers: prev.transfers.map((t) =>
          t.id === cleanTxId || t.id === bareTxId ? { ...t, status } : t
        ),
      };
    });

    showToast(`Transfer updated → ${status}`);
    setTransferStatus(txId.replace("#", ""), status).catch(() => {});
  }, []);

  const handleActivateScenario = useCallback((scenarioId: string) => {
    setActiveCrisisId(scenarioId);
    const scenario = CRISIS_SCENARIOS[scenarioId];
    if (!scenario) return;

    // Convert emergency routes to valid Transfer objects
    const emergencyTransfers: TransferOrder[] = scenario.emergencyRoutes.map((r) => ({
      id: r.id,
      source_id: r.source_id,
      source_name: r.source_name,
      source_zone: "Surplus Hub",
      target_id: r.target_id,
      target_name: r.target_name,
      target_zone: "Crisis Node",
      donor_blood: r.blood as BloodType,
      recipient_blood: r.blood as BloodType,
      units: r.units,
      distance_km: 14.5,
      eta_mins: parseInt(r.eta) || 15,
      cooler_temp_c: 22.0,
      age_hours: 24,
      remaining_hours: 48,
      status: "APPROVED" as TransferStatus,
      origin: "SOLVER" as const,
      urgency: "CRITICAL" as const,
      reason_text: r.reason,
      created_at: "Just now",
    }));

    // Update affected hospital stock and net balance in local state
    setState((prev) => {
      const currentNodes = Array.isArray(prev?.nodes) && prev.nodes.length > 0 ? prev.nodes : FALLBACK_STATE.nodes;
      const updatedNodes = currentNodes.map((n) => {
        if (scenario.affectedNodeIds.includes(n.id)) {
          return {
            ...n,
            net_balance: n.net_balance < 0 ? n.net_balance - 16 : -28,
          };
        }
        return n;
      });

      const prevTransfers = Array.isArray(prev?.transfers) ? prev.transfers : FALLBACK_STATE.transfers;
      const nonEmg = prevTransfers.filter((t) => !String(t.id).startsWith("#EMG"));
      return {
        ...prev,
        nodes: updatedNodes,
        transfers: [...emergencyTransfers, ...nonEmg],
      };
    });

    // Background backend sync preserving emergency routes
    const backendEventMap: Record<string, string> = {
      dengue: "DENGUE_SURGE_EAST_DELHI",
      trauma: "HIGHWAY_TRAUMA_NH48",
      agitator: "FREEZER_FAULT_NOIDA",
    };
    const backendEvent = backendEventMap[scenarioId] || scenarioId;
    injectChaos(backendEvent)
      .then((next) => {
        if (next && Array.isArray(next.nodes) && next.nodes.length > 0) {
          setState((_prev) => ({
            ...next,
            transfers: [
              ...emergencyTransfers,
              ...next.transfers.filter((t: any) => !String(t.id).startsWith("#EMG")),
            ],
          }));
        }
      })
      .catch(() => {});

    showToast(`✓ Active Shock Injected: ${scenario.shortTitle}`);
  }, []);

  const handleStopScenario = useCallback(() => {
    setActiveCrisisId(null);
    fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/reset`, { method: "POST" })
      .then((r) => r.json())
      .then((next) => {
        if (next && Array.isArray(next.nodes) && next.nodes.length > 0) {
          setState(next);
        } else {
          setState(FALLBACK_STATE);
        }
      })
      .catch(() => {
        setState(FALLBACK_STATE);
      });
    showToast("✓ Crisis simulation stopped · Baseline network restored");
  }, []);

  return (
    <div className="ws-fullbleed-root">
      {/* ── STEP 1: ULTRA-CLEAN TOP BAR (60px) WITH ONLY 3 TABS ── */}
      <header className="ws-topbar-clean">
        {/* Left: ← Story + #15997A emerald icon + Plexus */}
        <div className="ws-topbar-left">
          <button
            type="button"
            onClick={onExit}
            className="ws-back-story-btn"
            title="Return to Story Landing Page"
          >
            <ArrowLeft size={14} strokeWidth={2.2} />
            <span>Story</span>
          </button>
          <div className="ws-brand-divider" />
          <div className="ws-topbar-brand">
            <div className="ws-topbar-brand-icon">
              <Droplets size={16} strokeWidth={2.5} color="#FFFFFF" />
            </div>
            <span className="ws-topbar-brand-name">Plexus</span>
          </div>
        </div>

        {/* Center: ONLY 3 TABS inside a clean pill switcher */}
        <div className="ws-tab-switcher">
          <button
            type="button"
            onClick={() => {
              setTab("map");
              window.location.hash = "/workspace/map";
            }}
            className={`ws-tab-pill${tab === "map" ? " active" : ""}`}
          >
            <Radar size={15} strokeWidth={tab === "map" ? 2.2 : 1.8} />
            <span>Live Disruption TV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("dashboard");
              window.location.hash = "/workspace/dashboard";
            }}
            className={`ws-tab-pill${tab === "dashboard" ? " active" : ""}`}
          >
            <LayoutGrid size={15} strokeWidth={tab === "dashboard" ? 2.2 : 1.8} />
            <span>Clinical Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("surge");
              window.location.hash = "/workspace/surge";
            }}
            className={`ws-tab-pill${tab === "surge" ? " active" : ""}`}
          >
            <FlaskConical size={15} strokeWidth={tab === "surge" ? 2.2 : 1.8} />
            <span>Stress Lab</span>
          </button>
        </div>

        {/* Right: Only the #15997A +6h Solver Rebalance button */}
        <div className="ws-topbar-right">
          <button
            type="button"
            onClick={handleStep}
            disabled={isRebalancing}
            className="ws-topbar-rebalance-btn"
            title="Advance simulation by 6 hours"
          >
            <Zap size={14} strokeWidth={2.2} />
            <span>{isRebalancing ? "Rebalancing..." : "+6h Solver Rebalance"}</span>
          </button>
        </div>
      </header>

      {/* ── FULL-WIDTH 100vw MAIN VIEW CANVAS ── */}
      <main className="ws-fullbleed-stage">
        {tab === "map" && (
          <FlightyTVMapTab
            state={state}
            selectedHospitalId={selectedHospitalId}
            activeCrisisId={activeCrisisId}
            onStopCrisis={handleStopScenario}
            onSelectHospital={setSelectedHospitalId}
            onOpenDispatch={(id) => {
              setSelectedHospitalId(id);
              setTab("dashboard");
              window.location.hash = "/workspace/dashboard";
            }}
          />
        )}

        {tab === "dashboard" && (
          <MedisoDashboardTab
            state={state}
            selectedHospitalId={selectedHospitalId}
            onViewOnMap={(id) => {
              setSelectedHospitalId(id);
              setTab("map");
              window.location.hash = "/workspace/map";
            }}
            onInitiateTransfer={handleTransferRequest}
            onStatusChange={handleStatusChange}
            onStepSim={handleStep}
            loadingStep={loading}
          />
        )}

        {tab === "surge" && (
          <SurgeTab
            state={state}
            activeCrisisId={activeCrisisId}
            onActivateScenario={handleActivateScenario}
            onStopScenario={handleStopScenario}
            onNavigateToMap={() => {
              setTab("map");
              window.location.hash = "/workspace/map";
              showToast("✓ Navigating to Live Disruption TV · Emergency Routes Active");
            }}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`mediso-toast mediso-toast--${toast.type}${toastVisible ? " toast-visible" : ""}`}>
          <span className={`mediso-toast-dot dot-${toast.type}`} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
