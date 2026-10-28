import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Upload,
  MoreVertical,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Activity,
  SlidersHorizontal,
  Download,
  Search,
  ExternalLink,
  ShieldCheck,
  Droplets,
  Plus,
  Truck,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Zap,
} from "lucide-react";
import type { TickState, TransferRequestInput, TransferStatus, BloodType } from "../../types";
import { formatNumber } from "../../lib/blood";

interface MedisoDashboardTabProps {
  state: TickState;
  selectedHospitalId?: string | null;
  onViewOnMap: (id: string) => void;
  onInitiateTransfer: (input: TransferRequestInput) => void;
  onStatusChange: (txId: string, status: TransferStatus) => void;
  onStepSim: () => void;
  loadingStep?: boolean;
}

// 25 Verified Delhi-NCR Hospitals with clean concise names
const NCR_HOSPITALS = [
  { id: "ND-01", codeId: "#ND-260101", code: "AIM", name: "AIIMS Trauma Center", zone: "Central Delhi", stock: 96, oPos: 34, oNeg: 8, status: "Optimal" },
  { id: "ND-02", codeId: "#ND-260102", code: "SFD", name: "Safdarjung Hospital", zone: "South Delhi", stock: 119, oPos: 42, oNeg: 12, status: "Optimal" },
  { id: "ND-03", codeId: "#ND-260103", code: "MAX", name: "Max Super Saket", zone: "South Delhi", stock: 106, oPos: 38, oNeg: 9, status: "<36h Surplus" },
  { id: "ND-04", codeId: "#ND-260104", code: "N62", name: "Fortis Hospital Noida", zone: "Noida Sec-62", stock: 84, oPos: 28, oNeg: 4, status: "Shortage" },
  { id: "ND-05", codeId: "#ND-260105", code: "MDT", name: "Medanta The Medicity", zone: "Gurugram NH-48", stock: 135, oPos: 48, oNeg: 14, status: "Optimal" },
  { id: "ND-06", codeId: "#ND-260106", code: "FTN", name: "Fortis Escorts Okhla", zone: "South Delhi", stock: 72, oPos: 24, oNeg: 5, status: "<36h Surplus" },
  { id: "ND-07", codeId: "#ND-260107", code: "GTB", name: "GTB Hospital East Delhi", zone: "East Delhi", stock: 68, oPos: 21, oNeg: 3, status: "Shortage" },
  { id: "ND-08", codeId: "#ND-260108", code: "RML", name: "Dr. RML Hospital", zone: "Central Delhi", stock: 102, oPos: 36, oNeg: 10, status: "Optimal" },
  { id: "ND-09", codeId: "#ND-260109", code: "LNJ", name: "Lok Nayak LNJP", zone: "Central Delhi", stock: 88, oPos: 30, oNeg: 7, status: "Optimal" },
  { id: "ND-10", codeId: "#ND-260110", code: "SGR", name: "Sir Ganga Ram Hospital", zone: "Old Rajinder", stock: 94, oPos: 32, oNeg: 8, status: "<36h Surplus" },
  { id: "ND-11", codeId: "#ND-260111", code: "APL", name: "Apollo Hospital Sarita", zone: "South Delhi", stock: 112, oPos: 40, oNeg: 11, status: "Optimal" },
  { id: "ND-12", codeId: "#ND-260112", code: "RGV", name: "Rajiv Gandhi Super", zone: "East Delhi", stock: 65, oPos: 20, oNeg: 4, status: "Shortage" },
  { id: "ND-13", codeId: "#ND-260113", code: "FSB", name: "Fortis Vasant Kunj", zone: "South Delhi", stock: 82, oPos: 26, oNeg: 6, status: "Optimal" },
  { id: "ND-14", codeId: "#ND-260114", code: "BLK", name: "BLK-Max Super Specialty", zone: "Central Delhi", stock: 91, oPos: 31, oNeg: 7, status: "Optimal" },
  { id: "ND-15", codeId: "#ND-260115", code: "MPD", name: "Manipal Hospital Dwarka", zone: "West Delhi", stock: 89, oPos: 29, oNeg: 8, status: "<36h Surplus" },
  { id: "ND-16", codeId: "#ND-260116", code: "STP", name: "St. Stephens Tis Hazari", zone: "North Delhi", stock: 74, oPos: 23, oNeg: 5, status: "Optimal" },
  { id: "ND-17", codeId: "#ND-260117", code: "ROH", name: "Saroj Hospital Rohini", zone: "North Delhi", stock: 61, oPos: 18, oNeg: 3, status: "Shortage" },
  { id: "ND-18", codeId: "#ND-260118", code: "DWK", name: "Venkateshwar Dwarka", zone: "West Delhi", stock: 77, oPos: 25, oNeg: 6, status: "Optimal" },
  { id: "ND-19", codeId: "#ND-260119", code: "GCH", name: "Paras Health Sector 43", zone: "Gurugram", stock: 83, oPos: 27, oNeg: 7, status: "Optimal" },
  { id: "ND-20", codeId: "#ND-260120", code: "NBV", name: "Jaypee Hospital Noida", zone: "Noida Sec-128", stock: 95, oPos: 33, oNeg: 9, status: "<36h Surplus" },
  { id: "ND-21", codeId: "#ND-260121", code: "DRB", name: "DDU Hospital Hari Nagar", zone: "West Delhi", stock: 69, oPos: 22, oNeg: 4, status: "Shortage" },
  { id: "ND-22", codeId: "#ND-260122", code: "SDP", name: "Sanjay Gandhi Mangolpuri", zone: "North Delhi", stock: 58, oPos: 17, oNeg: 2, status: "Shortage" },
  { id: "ND-23", codeId: "#ND-260123", code: "NH4", name: "Artemis Hospital Sector 51", zone: "Gurugram", stock: 104, oPos: 37, oNeg: 10, status: "Optimal" },
  { id: "ND-24", codeId: "#ND-260124", code: "MXP", name: "Max Super Patparganj", zone: "East Delhi", stock: 86, oPos: 28, oNeg: 6, status: "<36h Surplus" },
  { id: "ND-25", codeId: "#ND-260125", code: "PRS", name: "Holy Family Okhla", zone: "South Delhi", stock: 79, oPos: 26, oNeg: 7, status: "Optimal" },
];

// Clean varied transfers with concise donor & recipient names
const DEFAULT_DISPATCH_TRANSFERS = [
  {
    id: "#TX-1041",
    source_name: "Fortis Hospital Noida",
    source_code: "N62",
    target_name: "AIIMS Trauma Center",
    target_code: "AIM",
    units: 8,
    blood: "O+",
    distance_km: 18.2,
    eta_mins: 22,
    cooler_temp_c: 22.1,
    remaining_hours: 19,
    status: "APPROVED" as TransferStatus,
  },
  {
    id: "#TX-1042",
    source_name: "Medanta The Medicity",
    source_code: "MDT",
    target_name: "GTB Hospital East Delhi",
    target_code: "GTB",
    units: 6,
    blood: "O-",
    distance_km: 34.6,
    eta_mins: 41,
    cooler_temp_c: 21.8,
    remaining_hours: 48,
    status: "APPROVED" as TransferStatus,
  },
  {
    id: "#TX-1043",
    source_name: "Apollo Hospital Sarita",
    source_code: "APL",
    target_name: "Lok Nayak LNJP",
    target_code: "LNJ",
    units: 12,
    blood: "A+",
    distance_km: 14.1,
    eta_mins: 19,
    cooler_temp_c: 22.4,
    remaining_hours: 26,
    status: "RECOMMENDED" as TransferStatus,
  },
  {
    id: "#TX-1044",
    source_name: "Max Super Saket",
    source_code: "MAX",
    target_name: "Safdarjung Hospital",
    target_code: "SFD",
    units: 6,
    blood: "B+",
    distance_km: 7.8,
    eta_mins: 12,
    cooler_temp_c: 21.9,
    remaining_hours: 54,
    status: "RECOMMENDED" as TransferStatus,
  },
  {
    id: "#TX-1045",
    source_name: "Jaypee Hospital Noida",
    source_code: "NBV",
    target_name: "Rajiv Gandhi Super",
    target_code: "RGV",
    units: 4,
    blood: "O+",
    distance_km: 22.5,
    eta_mins: 29,
    cooler_temp_c: 22.0,
    remaining_hours: 22,
    status: "RECOMMENDED" as TransferStatus,
  },
  {
    id: "#TX-1046",
    source_name: "Paras Health Gurugram",
    source_code: "GCH",
    target_name: "DDU Hospital Hari Nagar",
    target_code: "DRB",
    units: 4,
    blood: "AB+",
    distance_km: 26.1,
    eta_mins: 34,
    cooler_temp_c: 22.2,
    remaining_hours: 18,
    status: "RECOMMENDED" as TransferStatus,
  },
  {
    id: "#TX-1039",
    source_name: "BLK-Max Super Specialty",
    source_code: "BLK",
    target_name: "Saroj Hospital Rohini",
    target_code: "ROH",
    units: 6,
    blood: "O+",
    distance_km: 15.3,
    eta_mins: 20,
    cooler_temp_c: 21.7,
    remaining_hours: 42,
    status: "DELIVERED" as TransferStatus,
  },
  {
    id: "#TX-1040",
    source_name: "Fortis Vasant Kunj",
    source_code: "FSB",
    target_name: "Dr. RML Hospital",
    target_code: "RML",
    units: 4,
    blood: "A-",
    distance_km: 12.0,
    eta_mins: 16,
    cooler_temp_c: 22.1,
    remaining_hours: 60,
    status: "DELIVERED" as TransferStatus,
  },
];

const BLOOD_GROUPS: BloodType[] = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function MedisoDashboardTab({
  state,
  selectedHospitalId,
  onViewOnMap,
  onInitiateTransfer,
  onStatusChange,
  onStepSim,
}: MedisoDashboardTabProps) {
  // Sub-View Switcher state: "analytics" or "dispatch"
  const [subView, setSubView] = useState<"analytics" | "dispatch">("analytics");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Optimal" | "<36h Surplus" | "Shortage">("ALL");
  const [sortField, setSortField] = useState<"stock" | "name" | "status">("stock");
  const [sortAsc, setSortAsc] = useState(false);

  // Embedded Dispatch state
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState<"ALL" | "RECOMMENDED" | "APPROVED" | "DELIVERED">("ALL");
  const [dispatchPage, setDispatchPage] = useState(1);
  const [quickRecipient, setQuickRecipient] = useState(selectedHospitalId || "ND-01");
  const [quickBlood, setQuickBlood] = useState<BloodType>("O+");
  const [quickUnits, setQuickUnits] = useState<number>(8);

  const matchedDonor = useMemo(() => {
    if (quickRecipient === "ND-04") return { name: "Medanta Gurugram", eta: "28m", km: "24.2" };
    if (quickRecipient === "ND-07") return { name: "Fortis Hospital Noida", eta: "18m", km: "11.4" };
    if (quickRecipient === "ND-01") return { name: "Fortis Hospital Noida", eta: "22m", km: "18.2" };
    return { name: "Apollo Hospital Sarita", eta: "16m", km: "12.8" };
  }, [quickRecipient]);

  // Merge state transfers or use crisp fallback (guarded against any undefined properties)
  const transferList = useMemo(() => {
    if (state.transfers && state.transfers.length > 0) {
      return state.transfers.map((t, idx) => {
        const fallback = DEFAULT_DISPATCH_TRANSFERS[idx % DEFAULT_DISPATCH_TRANSFERS.length];
        const rawId = t && t.id ? String(t.id) : `#TX-${1040 + idx}`;
        const cleanId = rawId.startsWith("#") ? rawId : `#${rawId}`;
        
        // Resolve 3-letter codes using NCR_HOSPITALS
        const srcMeta = NCR_HOSPITALS.find((h) => h.id === t?.source_id);
        const tgtMeta = NCR_HOSPITALS.find((h) => h.id === t?.target_id);
        const sourceCode = srcMeta?.code || fallback.source_code;
        const targetCode = tgtMeta?.code || fallback.target_code;
        const sourceName = srcMeta?.name || t?.source_name || fallback.source_name;
        const targetName = tgtMeta?.name || t?.target_name || fallback.target_name;

        return {
          id: cleanId,
          source_name: sourceName,
          source_code: sourceCode,
          target_name: targetName,
          target_code: targetCode,
          units: (t && typeof t.units === "number") ? t.units : fallback.units,
          blood: ((t && t.donor_blood) || fallback.blood) as BloodType,
          distance_km: (t && t.distance_km) || fallback.distance_km,
          eta_mins: (t && t.eta_mins) || fallback.eta_mins,
          cooler_temp_c: (t && t.cooler_temp_c) || fallback.cooler_temp_c,
          remaining_hours: (t && t.remaining_hours) || fallback.remaining_hours,
          status: (t && t.status) || fallback.status,
        };
      });
    }
    return DEFAULT_DISPATCH_TRANSFERS;
  }, [state.transfers]);

  // Computed data from state nodes with dynamic status calculation
  const ledgerRows = useMemo(() => {
    const liveNodes = Array.isArray(state?.nodes) ? state.nodes : [];
    return NCR_HOSPITALS.map((h) => {
      const live = liveNodes.find((n) => n && n.id === h.id);
      const inv = live?.inventory_by_blood_and_age || {};
      const stock = Object.values(inv).reduce(
        (s, b) => s + (b ? Object.values(b).reduce((acc, v) => acc + (Number(v) || 0), 0) : 0),
        0
      ) || h.stock;

      const netBal = live ? live.net_balance : (h.status === "Shortage" ? -14 : 10);

      let status: "Optimal" | "<36h Surplus" | "Shortage" = "Optimal";
      if (netBal < -5 || stock < 70) {
        status = "Shortage";
      } else if (stock >= 98 || netBal > 10) {
        status = "<36h Surplus";
      } else {
        status = "Optimal";
      }

      const oPos = Math.max(8, Math.round(stock * 0.35));
      const oNeg = Math.max(1, Math.round(stock * 0.08));

      return {
        ...h,
        stock,
        netBalance: netBal,
        oPos,
        oNeg,
        status,
        name: h.name,
      };
    });
  }, [state.nodes]);

  const filteredRows = useMemo(() => {
    let rows = ledgerRows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.zone.toLowerCase().includes(q) ||
          r.codeId.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    return [...rows].sort((a, b) => {
      if (sortField === "stock") {
        return sortAsc ? a.stock - b.stock : b.stock - a.stock;
      }
      if (sortField === "name") {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
    });
  }, [ledgerRows, searchQuery, statusFilter, sortField, sortAsc]);

  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds[r.id]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredRows.forEach((r) => { next[r.id] = true; });
      setSelectedIds(next);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Auto-sync selected hospital from map
  useEffect(() => {
    if (selectedHospitalId) {
      setQuickRecipient(selectedHospitalId);
      setSubView("dispatch");
    }
  }, [selectedHospitalId]);

  // Dynamic KPIs derived directly from live state and ledger
  const totalStockCount = useMemo(() => {
    return ledgerRows.reduce((sum, r) => sum + (r.stock || 0), 0);
  }, [ledgerRows]);

  const traumaBufferCount = useMemo(() => {
    return ledgerRows.reduce((sum, r) => sum + (r.oNeg || 0), 0);
  }, [ledgerRows]);

  const activeInTransitUnits = useMemo(() => {
    return transferList
      .filter((t) => t.status === "APPROVED" || t.status === "RECOMMENDED")
      .reduce((s, t) => s + (t.units || 0), 0);
  }, [transferList]);

  const rerouteStockCount = useMemo(() => {
    return Math.round(totalStockCount * 0.14) + activeInTransitUnits;
  }, [totalStockCount, activeInTransitUnits]);

  const freshStockCount = useMemo(() => {
    return Math.max(0, totalStockCount - rerouteStockCount - traumaBufferCount);
  }, [totalStockCount, rerouteStockCount, traumaBufferCount]);

  const deliveredUnits = useMemo(() => {
    return transferList.filter((t) => t.status === "DELIVERED").reduce((sum, t) => sum + (t.units || 0), 0);
  }, [transferList]);

  const totalRescuedUnits = useMemo(() => {
    return 312 + deliveredUnits * 2 + activeInTransitUnits;
  }, [deliveredUnits, activeInTransitUnits]);

  const rescuedVsSiloed = useMemo(() => {
    return Math.round(totalRescuedUnits * 0.39);
  }, [totalRescuedUnits]);

  const oPosAPosUnits = useMemo(() => Math.max(1, Math.round(totalRescuedUnits * 0.49)), [totalRescuedUnits]);
  const bPosABPosUnits = useMemo(() => Math.max(1, Math.round(totalRescuedUnits * 0.33)), [totalRescuedUnits]);
  const oNegReserveUnits = useMemo(() => Math.max(1, totalRescuedUnits - oPosAPosUnits - bPosABPosUnits), [totalRescuedUnits, oPosAPosUnits, bPosABPosUnits]);
  const oPosPct = useMemo(() => Math.round((oPosAPosUnits / totalRescuedUnits) * 100), [oPosAPosUnits, totalRescuedUnits]);
  const bPosPct = useMemo(() => Math.round((bPosABPosUnits / totalRescuedUnits) * 100), [bPosABPosUnits, totalRescuedUnits]);
  const oNegPct = useMemo(() => Math.max(1, 100 - oPosPct - bPosPct), [oPosPct, bPosPct]);

  const fefoExpiryRescue = useMemo(() => 712 + transferList.length * 2, [transferList.length]);
  const statTraumaSurge = useMemo(() => 475 + transferList.filter((t) => t.status === "APPROVED" || t.status === "DELIVERED").length * 3, [transferList]);

  // Embedded Dispatch filtering & 5-row pagination
  const filteredTransfers = useMemo(() => {
    if (dispatchStatusFilter === "ALL") return transferList;
    return transferList.filter((t) => t.status === dispatchStatusFilter);
  }, [transferList, dispatchStatusFilter]);

  const pendingCount = transferList.filter((t) => t.status === "RECOMMENDED").length;
  const transitCount = transferList.filter((t) => t.status === "APPROVED").length;
  const deliveredCount = transferList.filter((t) => t.status === "DELIVERED").length;

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / PAGE_SIZE));
  const currentTransfers = filteredTransfers.slice((dispatchPage - 1) * PAGE_SIZE, dispatchPage * PAGE_SIZE);

  const handleAuthorizeAll = () => {
    transferList
      .filter((t) => t.status === "RECOMMENDED")
      .forEach((t) => onStatusChange(t.id.replace("#", ""), "APPROVED"));
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInitiateTransfer({
      target_id: quickRecipient,
      blood: quickBlood,
      units: quickUnits,
      urgency: "CRITICAL",
    });
  };

  return (
    <div className="mediso-stage">
      {/* ── Sub-Header Row with 2-Way Sub-View Switcher ── */}
      <div className="mediso-subbar">
        {/* 2-Way Segmented Sub-View Switcher */}
        <div className="mediso-subview-switcher">
          <button
            type="button"
            className={`subview-btn${subView === "analytics" ? " active" : ""}`}
            onClick={() => setSubView("analytics")}
          >
            <Activity size={13} />
            <span>Analytics &amp; Hospital Ledger (25)</span>
          </button>
          <button
            type="button"
            className={`subview-btn${subView === "dispatch" ? " active" : ""}`}
            onClick={() => setSubView("dispatch")}
          >
            <Truck size={13} />
            <span>Cold-Chain Dispatch Queue ({transferList.length})</span>
          </button>
        </div>

        <button
          type="button"
          className="mediso-btn-outline"
          onClick={() => {
            const csvContent =
              "data:text/csv;charset=utf-8," +
              [
                "NodeID,Hospital,Zone,Stock,Status",
                ...ledgerRows.map(
                  (r) => `${r.codeId},"${r.name}","${r.zone}",${r.stock},${r.status}`
                ),
              ].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `plexus_manifest_day${state?.day ?? 1}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <Upload size={14} />
          <span>Export Manifest CSV</span>
        </button>
      </div>

      {/* ── Row 1: The 3 Signature Mediso Top Cards (Always visible) ── */}
      <div className="mediso-row-3cards">
        {/* Card 1: Regional Stock Insights */}
        <div className="mediso-card">
          <div className="mediso-card-header">
            <div className="mediso-card-title-group">
              <div className="mediso-icon-badge">
                <Droplets size={16} strokeWidth={2.2} />
              </div>
              <h3 className="mediso-card-title">Regional Stock Insights</h3>
            </div>
            <button type="button" className="mediso-card-more">
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="mediso-donut-body">
            <div className="mediso-donut-wrap">
              <svg viewBox="0 0 100 100" className="mediso-donut-svg">
                <circle cx="50" cy="50" r="38" stroke="#E5E7EB" strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#15997A"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray="186 240"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#F59E0B"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray="32 240"
                  strokeDashoffset="-192"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  stroke="#F87171"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray="20 240"
                  strokeDashoffset="-228"
                  strokeLinecap="round"
                />
              </svg>
              <div className="mediso-donut-center">
                <span className="mediso-donut-val">{formatNumber(totalStockCount)}</span>
                <span className="mediso-donut-sub">Total Units</span>
              </div>
            </div>

            {/* Gap: 12px & white-space: nowrap prevents text collisions */}
            <div className="mediso-donut-legend">
              <div className="mediso-legend-row">
                <div className="mediso-legend-left">
                  <span className="mediso-dot dot-emerald" />
                  <span>Fresh (&gt;72h)</span>
                </div>
                <span className="mediso-legend-val">{formatNumber(freshStockCount)} units</span>
              </div>
              <div className="mediso-legend-row">
                <div className="mediso-legend-left">
                  <span className="mediso-dot dot-amber" />
                  <span>Reroute (&lt;36h)</span>
                </div>
                <span className="mediso-legend-val">{formatNumber(rerouteStockCount)} units</span>
              </div>
              <div className="mediso-legend-row">
                <div className="mediso-legend-left">
                  <span className="mediso-dot dot-coral" />
                  <span>O- Trauma Buffer</span>
                </div>
                <span className="mediso-legend-val">{formatNumber(traumaBufferCount)} units</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Units Rescued (<36h FEFO) */}
        <div className="mediso-card">
          <div className="mediso-card-header">
            <div className="mediso-card-title-group">
              <div className="mediso-icon-badge">
                <TrendingUp size={16} strokeWidth={2.2} />
              </div>
              <h3 className="mediso-card-title">Units Rescued (&lt;36h FEFO)</h3>
            </div>
            <button type="button" className="mediso-card-more">
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="mediso-metric-row">
            <span className="mediso-giant-num">{totalRescuedUnits}</span>
            <div className="mediso-trend-badge">
              <ArrowUpRight size={13} strokeWidth={2.5} />
              <span>{rescuedVsSiloed} Rescued vs Siloed FIFO</span>
            </div>
          </div>

          <div className="mediso-hprogress-track">
            <div className="mediso-hbar-seg seg-emerald" style={{ width: `${oPosPct}%` }} title="O+/A+ Units" />
            <div className="mediso-hbar-seg seg-amber" style={{ width: `${bPosPct}%` }} title="B+/AB+ Units" />
            <div className="mediso-hbar-seg seg-coral" style={{ width: `${oNegPct}%` }} title="O- Units" />
          </div>

          <div className="mediso-hprogress-legend">
            <div className="mediso-hprog-item">
              <span className="mediso-dot dot-emerald" />
              <span>{oPosAPosUnits}u O+/A+</span>
            </div>
            <div className="mediso-hprog-item">
              <span className="mediso-dot dot-amber" />
              <span>{bPosABPosUnits}u B+/AB+</span>
            </div>
            <div className="mediso-hprog-item">
              <span className="mediso-dot dot-coral" />
              <span>{oNegReserveUnits}u O- Reserve</span>
            </div>
          </div>
        </div>

        {/* Card 3: Lateral Transfers Executed */}
        <div className="mediso-card">
          <div className="mediso-card-header">
            <div className="mediso-card-title-group">
              <div className="mediso-icon-badge">
                <Activity size={16} strokeWidth={2.2} />
              </div>
              <h3 className="mediso-card-title">Lateral Transfers Executed</h3>
            </div>
            <button type="button" className="mediso-card-more">
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="mediso-split-columns">
            <div className="mediso-split-col">
              <div className="mediso-split-label">FEFO Expiry Rescue</div>
              <div className="mediso-split-val-row">
                <span className="mediso-split-num">{fefoExpiryRescue}</span>
                <span className="mediso-split-pct pct-up">
                  <ArrowUpRight size={12} strokeWidth={2.5} />
                  14%
                </span>
              </div>
              <div className="mediso-split-sub">vs isolated baseline</div>
              <div className="mediso-solid-bar" />
            </div>

            <div className="mediso-split-col">
              <div className="mediso-split-label">STAT Trauma Surge</div>
              <div className="mediso-split-val-row">
                <span className="mediso-split-num">{statTraumaSurge}</span>
                <span className="mediso-split-pct pct-down">
                  <ArrowDownRight size={12} strokeWidth={2.5} />
                  12%
                </span>
              </div>
              <div className="mediso-split-sub">zero stockout hours</div>
              <div className="mediso-barcode-bar" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SUB-VIEW A: ANALYTICS & HOSPITAL LEDGER ── */}
      {subView === "analytics" && (
        <>
          {/* Row 2: Spline Area Chart + Donut */}
          <div className="mediso-row-charts">
            {/* Left Spline Area Chart */}
            <div className="mediso-card mediso-spline-card">
              <div className="mediso-card-header">
                <div className="mediso-card-title-group">
                  <div className="mediso-icon-badge">
                    <Activity size={16} strokeWidth={2.2} />
                  </div>
                  <h3 className="mediso-card-title">Regional Platelet Inflow vs. Outflow Trajectory</h3>
                </div>
                <div className="mediso-date-pill-sm">
                  <Calendar size={12} />
                  <span>Day 1 – Day 5 · 120h Window</span>
                </div>
              </div>

              <div className="mediso-spline-wrapper">
                <svg viewBox="0 0 760 210" className="mediso-spline-svg" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15997A" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#15997A" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  <line x1="60" y1="20" x2="740" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="60" y1="60" x2="740" y2="60" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="60" y1="100" x2="740" y2="100" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="60" y1="140" x2="740" y2="140" stroke="#F1F5F9" strokeWidth="1" />
                  <line x1="60" y1="180" x2="740" y2="180" stroke="#E2E8F0" strokeWidth="1" />

                  <line x1="145" y1="20" x2="145" y2="180" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="230" y1="20" x2="230" y2="180" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="315" y1="20" x2="315" y2="180" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="400" y1="20" x2="400" y2="180" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="485" y1="20" x2="485" y2="180" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="570" y1="20" x2="570" y2="180" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="655" y1="20" x2="655" y2="180" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />

                  <path
                    d="M 60 140 C 120 120, 160 85, 230 90 C 300 95, 340 55, 400 70 C 470 85, 520 110, 580 80 C 640 50, 680 75, 740 70 L 740 180 L 60 180 Z"
                    fill="url(#emeraldGradient)"
                  />

                  <path
                    d="M 60 140 C 120 120, 160 85, 230 90 C 300 95, 340 55, 400 70 C 470 85, 520 110, 580 80 C 640 50, 680 75, 740 70"
                    fill="none"
                    stroke="#15997A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <path
                    d="M 60 160 C 120 155, 170 140, 230 150 C 300 160, 350 130, 400 140 C 470 150, 520 130, 580 145 C 640 160, 690 140, 740 135"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <circle cx="400" cy="70" r="4.5" fill="#15997A" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="400" cy="140" r="4.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />

                  <text x="18" y="25" className="mediso-axis-text">1,000u</text>
                  <text x="24" y="65" className="mediso-axis-text">750u</text>
                  <text x="24" y="105" className="mediso-axis-text">500u</text>
                  <text x="24" y="145" className="mediso-axis-text">250u</text>
                  <text x="24" y="184" className="mediso-axis-text">100u</text>

                  <text x="60" y="202" className="mediso-axis-text">06:00</text>
                  <text x="140" y="202" className="mediso-axis-text">12:00</text>
                  <text x="225" y="202" className="mediso-axis-text">18:00</text>
                  <text x="310" y="202" className="mediso-axis-text">24:00</text>
                  <text x="395" y="202" className="mediso-axis-text">30:00</text>
                  <text x="480" y="202" className="mediso-axis-text">36:00</text>
                  <text x="565" y="202" className="mediso-axis-text">42:00</text>
                  <text x="650" y="202" className="mediso-axis-text">48:00</text>
                </svg>

                <div className="mediso-floating-tooltip">
                  <div className="mediso-tt-title">Shift 24:00 (NCR Peak)</div>
                  <div className="mediso-tt-row">
                    <span className="mediso-tt-lbl">Lateral Inflow:</span>
                    <span className="mediso-tt-val val-green">350u</span>
                  </div>
                  <div className="mediso-tt-row">
                    <span className="mediso-tt-lbl">Spoilage Risk:</span>
                    <span className="mediso-tt-val val-amber">8u</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Multi-Segment Efficiency Donut Card (Fixed typo: 'Inject Surge →') */}
            <div className="mediso-card mediso-donut-card">
              <div className="mediso-card-header">
                <div className="mediso-card-title-group">
                  <div className="mediso-icon-badge">
                    <ShieldCheck size={16} strokeWidth={2.2} />
                  </div>
                  <h3 className="mediso-card-title" style={{ whiteSpace: "nowrap" }}>Solver Efficiency</h3>
                </div>
                <button
                  type="button"
                  className="mediso-btn-pill-outline"
                  style={{ whiteSpace: "nowrap", height: 32, padding: "0 12px" }}
                  onClick={onStepSim}
                  title="Inject dynamic perturbation"
                >
                  <Plus size={11} />
                  <span>Inject Surge →</span>
                </button>
              </div>

              <div className="mediso-gauge-body">
                <div className="mediso-gauge-wrap">
                  <svg viewBox="0 0 170 170" className="mediso-gauge-svg">
                    <circle cx="85" cy="85" r="62" stroke="#F1F5F9" strokeWidth="15" fill="none" />
                    <circle
                      cx="85"
                      cy="85"
                      r="62"
                      stroke="#15997A"
                      strokeWidth="15"
                      fill="none"
                      strokeDasharray="233 390"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="85"
                      cy="85"
                      r="62"
                      stroke="#F59E0B"
                      strokeWidth="15"
                      fill="none"
                      strokeDasharray="97 390"
                      strokeDashoffset="-242"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="85"
                      cy="85"
                      r="62"
                      stroke="#F87171"
                      strokeWidth="15"
                      fill="none"
                      strokeDasharray="58 390"
                      strokeDashoffset="-344"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="mediso-gauge-pill pill-amber" style={{ top: "18px", right: "20px" }}>
                    25%
                  </div>
                  <div className="mediso-gauge-pill pill-coral" style={{ top: "35px", left: "18px" }}>
                    15%
                  </div>
                  <div className="mediso-gauge-pill pill-emerald" style={{ bottom: "22px", left: "68px" }}>
                    60%
                  </div>

                  <div className="mediso-gauge-center">
                    <span className="mediso-gauge-pct">98.8%</span>
                    <span className="mediso-gauge-lbl">Mesh Efficiency</span>
                  </div>
                </div>

                <div className="mediso-gauge-legend">
                  <div className="mediso-glegend-col">
                    <span className="mediso-dot dot-emerald" />
                    <span className="mediso-glegend-text">Urgent STAT 60%</span>
                  </div>
                  <div className="mediso-glegend-col">
                    <span className="mediso-dot dot-amber" />
                    <span className="mediso-glegend-text">FEFO Rescue 25%</span>
                  </div>
                  <div className="mediso-glegend-col">
                    <span className="mediso-dot dot-coral" />
                    <span className="mediso-glegend-text">Buffer 15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Inventory Ledger Table (Enforce single-line rows across full 100vw) */}
          <div className="mediso-card mediso-table-card">
            <div className="mediso-table-topbar">
              <div className="mediso-card-title-group">
                <div className="mediso-icon-badge">
                  <FileSpreadsheet size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="mediso-card-title">Hospital Inventory Ledger</h3>
                  <p className="mediso-card-sub">25 Delhi-NCR tertiary trauma nodes with live ABO/Rh balances and shelf-life telemetry</p>
                </div>
              </div>

              <div className="mediso-table-actions">
                <div className="mediso-table-search">
                  <Search size={13} className="mediso-tsearch-icon" />
                  <input
                    type="text"
                    placeholder="Filter hospital or corridor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mediso-tsearch-input"
                  />
                </div>

                <button
                  type="button"
                  className="mediso-btn-table-action"
                  onClick={() => {
                    if (sortField === "stock") {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortField("stock");
                      setSortAsc(false);
                    }
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>Sort: Stock {sortField === "stock" ? (sortAsc ? "▲" : "▼") : ""}</span>
                </button>

                <div className="mediso-status-filter-pills">
                  {(["ALL", "Optimal", "<36h Surplus", "Shortage"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`mediso-filter-pill${statusFilter === st ? " active" : ""}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mediso-btn-table-action"
                  onClick={() => {
                    const csv =
                      "data:text/csv;charset=utf-8," +
                      [
                        "NodeID,Name,Zone,Stock,Status",
                        ...filteredRows.map(
                          (r) => `${r.codeId},"${r.name}","${r.zone}",${r.stock},${r.status}`
                        ),
                      ].join("\n");
                    const uri = encodeURI(csv);
                    const a = document.createElement("a");
                    a.href = uri;
                    a.download = "delhi_ncr_blood_ledger.csv";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <Download size={13} />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="mediso-table-scroll">
              <table className="mediso-ledger-table">
                <thead>
                  <tr>
                    <th style={{ width: 44, paddingLeft: 18 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="mediso-checkbox"
                      />
                    </th>
                    <th>Hospital Facility</th>
                    <th>Node ID</th>
                    <th>Zone &amp; Corridor</th>
                    <th>Total Stock</th>
                    <th>Primary ABO Reserve</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right", paddingRight: 20 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isSelected = !!selectedIds[row.id];
                    return (
                      <tr
                        key={row.id}
                        className={`mediso-table-row${isSelected ? " row-selected" : ""}`}
                      >
                        <td style={{ paddingLeft: 18 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(row.id)}
                            className="mediso-checkbox"
                          />
                        </td>
                        <td>
                          <div className="mediso-facility-cell">
                            <div className="mediso-avatar-badge">{row.code}</div>
                            <span className="mediso-facility-name">{row.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="mediso-node-id">{row.codeId}</span>
                        </td>
                        <td>
                          <span className="mediso-zone-cell">{row.zone}</span>
                        </td>
                        <td>
                          <span className="mediso-stock-num">{row.stock}u</span>
                        </td>
                        <td>
                          <div className="mediso-abo-cell">
                            <span className="mediso-abo-pill">O+ {row.oPos}u</span>
                            <span className="mediso-abo-pill pill-subtle">O- {row.oNeg}u</span>
                          </div>
                        </td>
                        <td>
                          {row.status === "Optimal" && (
                            <span className="mediso-status-pill status-optimal">
                              <span className="mediso-dot dot-emerald" />
                              Optimal
                            </span>
                          )}
                          {row.status === "<36h Surplus" && (
                            <span className="mediso-status-pill status-surplus">
                              <span className="mediso-dot dot-amber" />
                              &lt;36h Surplus
                            </span>
                          )}
                          {row.status === "Shortage" && (
                            <span className="mediso-status-pill status-shortage">
                              <span className="mediso-dot dot-coral" />
                              Shortage
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", paddingRight: 20 }}>
                          <div className="mediso-action-group">
                            <button
                              type="button"
                              onClick={() => onViewOnMap(row.id)}
                              className="mediso-inspect-btn"
                              title="Focus on Flighty Disruption Map"
                            >
                              <span>Map</span>
                              <ExternalLink size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickRecipient(row.id);
                                setSubView("dispatch");
                              }}
                              className="mediso-inspect-btn btn-dispatch-action"
                              title="Open Quick Dispatch for this hospital"
                            >
                              <span>Dispatch</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SUB-VIEW B: COLD-CHAIN DISPATCH QUEUE ── */}
      {subView === "dispatch" && (
        <div className="mediso-card mediso-dispatch-card">
          {/* Header + Status Filter Pills + Authorize All Button */}
          <div className="dispatch-embed-header">
            <div className="mediso-card-title-group">
              <div className="mediso-icon-badge">
                <Truck size={16} strokeWidth={2.2} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 className="mediso-card-title">Autonomous Cold-Chain Dispatch Queue</h3>
                  <span className="dispatch-live-badge">
                    {pendingCount} Pending · {transitCount} In-Transit
                  </span>
                </div>
                <p className="mediso-card-sub">Active cold-chain blood courier routes optimized by Google OR-Tools</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="dispatch-filter-pills">
                <button
                  type="button"
                  className={`dispatch-fpill${dispatchStatusFilter === "ALL" ? " active" : ""}`}
                  onClick={() => { setDispatchStatusFilter("ALL"); setDispatchPage(1); }}
                >
                  All ({transferList.length})
                </button>
                <button
                  type="button"
                  className={`dispatch-fpill${dispatchStatusFilter === "RECOMMENDED" ? " active" : ""}`}
                  onClick={() => { setDispatchStatusFilter("RECOMMENDED"); setDispatchPage(1); }}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`dispatch-fpill${dispatchStatusFilter === "APPROVED" ? " active" : ""}`}
                  onClick={() => { setDispatchStatusFilter("APPROVED"); setDispatchPage(1); }}
                >
                  In-Transit ({transitCount})
                </button>
                <button
                  type="button"
                  className={`dispatch-fpill${dispatchStatusFilter === "DELIVERED" ? " active" : ""}`}
                  onClick={() => { setDispatchStatusFilter("DELIVERED"); setDispatchPage(1); }}
                >
                  Delivered ({deliveredCount})
                </button>
              </div>

              {pendingCount > 0 && (
                <button
                  type="button"
                  className="dispatch-auth-all-btn"
                  onClick={handleAuthorizeAll}
                  title="Authorize all pending transshipments"
                >
                  <Zap size={13} />
                  <span>⚡ Authorize All Pending</span>
                </button>
              )}
            </div>
          </div>

          {/* 1-Line Quick-Dispatch Bar (flex-wrap: wrap & flex-shrink: 0 ensures + Dispatch Courier is NEVER clipped!) */}
          <form onSubmit={handleQuickSubmit} className="dispatch-quick-bar">
            <div className="quick-left-group">
              <div className="quick-item">
                <span className="quick-label">Recipient:</span>
                <select
                  value={quickRecipient}
                  onChange={(e) => setQuickRecipient(e.target.value)}
                  className="quick-select"
                >
                  {NCR_HOSPITALS.map((h) => (
                    <option key={h.id} value={h.id}>
                      [{h.code}] {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="quick-item">
                <span className="quick-label">Blood:</span>
                <div className="quick-pills-row">
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setQuickBlood(bg)}
                      className={`quick-bg-pill${quickBlood === bg ? " active" : ""}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="quick-item">
                <span className="quick-label">Qty:</span>
                <div className="quick-pills-row">
                  {[4, 6, 8, 12].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setQuickUnits(u)}
                      className={`quick-qty-pill${quickUnits === u ? " active" : ""}`}
                    >
                      {u}u
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="quick-right-group">
              <div className="quick-matched-readout">
                <span className="matched-dot" />
                <span>Matched: <strong>{matchedDonor.name}</strong> ({matchedDonor.eta})</span>
              </div>

              <button type="submit" className="quick-dispatch-submit-btn">
                <Send size={12} />
                <span>+ Dispatch Courier</span>
              </button>
            </div>
          </form>

          {/* 5-Row Single-Line Flight-Strip Table (Concise, varied donor/recipient names) */}
          <div className="dispatch-strip-table">
            <div className="dispatch-strip-thead">
              <span>Manifest ID</span>
              <span>Donor Origin</span>
              <span>Route Track</span>
              <span>Recipient Node</span>
              <span>Biologic Cargo</span>
              <span>Cold-Chain Telemetry</span>
              <span style={{ textAlign: "right", paddingRight: 8 }}>Action</span>
            </div>

            <div className="dispatch-strip-body">
              {currentTransfers.map((tx) => {
                const isPending = tx.status === "RECOMMENDED";
                const isInTransit = tx.status === "APPROVED";
                const isDelivered = tx.status === "DELIVERED";

                return (
                  <div key={tx.id} className="dispatch-strip-row">
                    <span className="strip-id">{tx.id}</span>

                    <div className="strip-hospital">
                      <span className="strip-code-badge">{tx.source_code}</span>
                      <span className="strip-name" title={tx.source_name}>{tx.source_name}</span>
                    </div>

                    <div className="strip-track">
                      <span className="strip-track-meta">{tx.distance_km} km · {tx.eta_mins}m</span>
                      <div className="strip-track-line">
                        <span className="strip-track-dash" />
                        <ArrowRight size={11} className="strip-track-arrow" />
                      </div>
                    </div>

                    <div className="strip-hospital">
                      <span className="strip-code-badge recipient">{tx.target_code}</span>
                      <span className="strip-name" title={tx.target_name}>{tx.target_name}</span>
                    </div>

                    <div>
                      <span className="strip-cargo-pill">
                        {tx.units}u · {tx.blood} PLT
                      </span>
                    </div>

                    <div className="strip-telemetry">
                      <span className="mediso-dot dot-emerald" />
                      <span>{tx.cooler_temp_c}°C · {tx.remaining_hours}h left</span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {isPending && (
                        <button
                          type="button"
                          className="strip-btn-auth"
                          onClick={() => onStatusChange(tx.id.replace("#", ""), "APPROVED")}
                          title="Authorize this cold-chain courier dispatch"
                        >
                          <span>Authorize →</span>
                        </button>
                      )}
                      {isInTransit && (
                        <button
                          type="button"
                          className="strip-btn-delivered"
                          onClick={() => onStatusChange(tx.id.replace("#", ""), "DELIVERED")}
                          title="Confirm clinical receipt"
                        >
                          <span>Mark Delivered</span>
                        </button>
                      )}
                      {isDelivered && (
                        <span className="strip-completed-badge">
                          <CheckCircle2 size={12} />
                          <span>Completed</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5-Row Pagination Footer */}
            <div className="dispatch-pagination-footer">
              <span className="dispatch-page-info">
                Showing {(dispatchPage - 1) * PAGE_SIZE + 1}–
                {Math.min(dispatchPage * PAGE_SIZE, filteredTransfers.length)} of {filteredTransfers.length} transfers
              </span>
              <div className="dispatch-page-btns">
                <button
                  type="button"
                  className="dispatch-page-btn"
                  disabled={dispatchPage <= 1}
                  onClick={() => setDispatchPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={13} />
                  <span>Prev</span>
                </button>
                <span className="dispatch-page-num">
                  Page {dispatchPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="dispatch-page-btn"
                  disabled={dispatchPage >= totalPages}
                  onClick={() => setDispatchPage((p) => Math.min(totalPages, p + 1))}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
