import { useMemo, useState } from "react";
import { Search, ArrowUpRight, Truck } from "lucide-react";
import type { BloodType, HospitalNode, TickState } from "../../types";
import { expiringUnits, totalUnits, zoneLabel, BLOOD_TYPES } from "../../lib/blood";

interface InventoryTabProps {
  state: TickState;
  onViewOnMap: (id: string) => void;
  onInitiateTransfer: (id: string) => void;
}

function rowStatus(node: HospitalNode): "critical" | "expiring" | "healthy" {
  if (totalUnits(node) === 0 || node.net_balance < -10) return "critical";
  if (expiringUnits(node, 36) > 10) return "expiring";
  return "healthy";
}

const STATUS = {
  critical: { dot: "#F43F5E", text: "#F43F5E", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)", label: "Shortage" },
  expiring: { dot: "#F59E0B", text: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "Expiring" },
  healthy:  { dot: "#10B981", text: "#10B981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.25)", label: "Optimal"  },
};

export default function InventoryTab({ state, onViewOnMap, onInitiateTransfer }: InventoryTabProps) {
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "shortage" | "expiring">("all");
  const [filterBlood,  setFilterBlood]  = useState<BloodType | "All">("All");

  const filtered = useMemo(() => {
    let nodes = state.nodes;
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n => n.name.toLowerCase().includes(q) || n.zone.toLowerCase().includes(q));
    }
    if (filterStatus === "shortage") nodes = nodes.filter(n => n.net_balance < -10 || totalUnits(n) === 0);
    if (filterStatus === "expiring") nodes = nodes.filter(n => expiringUnits(n, 36) > 10);
    if (filterBlood !== "All") {
      nodes = nodes.filter(n => {
        const inv = n.inventory_by_blood_and_age[filterBlood];
        return inv && Object.values(inv).some(v => v > 0);
      });
    }
    return nodes;
  }, [state.nodes, search, filterStatus, filterBlood]);

  return (
    <div className="inv-root">

      {/* ── Filter / Search Toolbar ── */}
      <div className="inv-toolbar">
        {/* Search */}
        <div className="inv-search">
          <Search size={13} className="inv-search-icon" />
          <input
            type="text"
            placeholder="Search facility or zone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="inv-search-input"
          />
        </div>

        {/* Status filter segment */}
        <div className="inv-seg">
          {(["all", "shortage", "expiring"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`inv-seg-btn${filterStatus === s ? " inv-seg-btn--active" : ""}`}
            >
              {s === "all" ? `All (${state.nodes.length})` : s === "shortage" ? "Shortage" : "<36h Risk"}
            </button>
          ))}
        </div>

        {/* Blood group highlight pills */}
        <div className="inv-blood-filters">
          {(["All", ...BLOOD_TYPES] as const).map(bg => (
            <button
              key={bg}
              onClick={() => setFilterBlood(bg as BloodType | "All")}
              className={`inv-blood-btn${filterBlood === bg ? " inv-blood-btn--active" : ""}`}
            >
              {bg}
            </button>
          ))}
        </div>

        <span className="inv-count">{filtered.length} facilities</span>
      </div>

      {/* ── Spreadsheet Data Table (Guaranteed Zero Overlap!) ── */}
      <div className="inv-table-wrap">
        <div className="inv-table-inner">

          {/* Sticky Header with Explicitly Separated Column Headers */}
          <div className="inv-table-head">
            <div className="inv-col-facility">Hospital Facility</div>
            <div className="inv-col-shelf">Total &amp; Shelf-Life</div>
            <div className="inv-col-net">Net Balance</div>
            <div className="inv-col-status">&lt;36H Status</div>
            <div className="inv-col-abo">ABO / Rh Inventory (8 Groups)</div>
            <div className="inv-col-actions">Actions</div>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--ws-text-4)" }}>
              No facilities match your search criteria
            </div>
          ) : (
            filtered.map((node, rowIdx) => {
              const tot     = totalUnits(node);
              const exp36   = expiringUnits(node, 36);
              const crit12  = expiringUnits(node, 12);
              const fresh   = Math.max(0, tot - exp36);
              const bal     = node.net_balance;
              const st      = rowStatus(node);
              const style   = STATUS[st];

              const freshPct = tot > 0 ? (fresh / tot) * 100 : 70;
              const warnPct  = tot > 0 ? ((exp36 - crit12) / tot) * 100 : 20;
              const critPct  = tot > 0 ? (crit12 / tot) * 100 : 10;

              return (
                <div
                  key={node.id}
                  className={`inv-row${rowIdx % 2 === 0 ? "" : " inv-row--alt"}`}
                >
                  {/* 1. Hospital Name & Zone */}
                  <div className="inv-col-facility">
                    <div className="inv-cell-name">{node.name}</div>
                    <div className="inv-cell-zone">{zoneLabel(node.zone)} · L{node.trauma_level} Trauma</div>
                  </div>

                  {/* 2. Total Units + 3-Color Proportional Shelf-Life Bar */}
                  <div className="inv-col-shelf">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: "var(--ws-text-1)" }}>
                        {tot}u
                      </span>
                      <span style={{ fontSize: 10, fontFamily: "var(--ws-font-mono)", color: "var(--ws-text-4)" }}>
                        {freshPct.toFixed(0)}% fresh
                      </span>
                    </div>
                    <div className="inv-shelf-bar">
                      <div className="inv-shelf-seg inv-shelf-seg--fresh" style={{ width: `${freshPct}%` }} title={`Fresh: ${fresh}u`} />
                      <div className="inv-shelf-seg inv-shelf-seg--warn" style={{ width: `${warnPct}%` }} title={`Reroute <36h: ${exp36 - crit12}u`} />
                      <div className="inv-shelf-seg inv-shelf-seg--crit" style={{ width: `${critPct}%` }} title={`Critical <12h: ${crit12}u`} />
                    </div>
                  </div>

                  {/* 3. Net Balance (Separated Capsule — NEVER merges with next column!) */}
                  <div className="inv-col-net">
                    <span className={`inv-net-capsule ${bal >= 0 ? "inv-net-capsule--pos" : "inv-net-capsule--neg"}`}>
                      {bal >= 0 ? `+${bal}` : bal}u
                    </span>
                  </div>

                  {/* 4. <36H STATUS */}
                  <div className="inv-col-status">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--ws-font-mono)",
                          fontWeight: 700,
                          color: exp36 > 0 ? "#F59E0B" : "var(--ws-text-4)",
                        }}
                      >
                        {exp36 > 0 ? `${exp36}u` : "0u"}
                      </span>
                      <span
                        className="inv-status-badge"
                        style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                      >
                        <span className="inv-status-dot" style={{ background: style.dot }} />
                        {style.label}
                      </span>
                    </div>
                  </div>

                  {/* 5. Fixed 8-Column ABO / Rh Mini-Matrix */}
                  <div className="inv-col-abo">
                    <div className="inv-abo-grid-8">
                      {BLOOD_TYPES.map(bg => {
                        const inv = node.inventory_by_blood_and_age[bg];
                        const cnt = inv ? Object.values(inv).reduce((s, v) => s + v, 0) : 0;
                        const isFilterMatch = filterBlood === bg;
                        const thermalClass =
                          cnt === 0
                            ? "inv-abo-cell--empty"
                            : cnt <= 2
                            ? "inv-abo-cell--low"
                            : cnt >= 15
                            ? "inv-abo-cell--high"
                            : "inv-abo-cell--mid";

                        return (
                          <div
                            key={bg}
                            className={`inv-abo-cell ${thermalClass}`}
                            style={isFilterMatch ? { borderColor: "var(--ws-accent)", boxShadow: "0 0 0 1px var(--ws-accent)" } : {}}
                            title={`${node.name} · ${bg}: ${cnt} units (${cnt <= 2 ? "Shortage / Low" : cnt >= 15 ? "Surplus / High" : "Balanced"})`}
                          >
                            <span className="inv-abo-cell-type">{bg}</span>
                            <span className="inv-abo-cell-count">{cnt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 6. Action Buttons */}
                  <div className="inv-col-actions">
                    <button
                      onClick={() => onViewOnMap(node.id)}
                      className="inv-btn-map"
                      title="Inspect node on regional map"
                    >
                      <ArrowUpRight size={11} />
                      Map
                    </button>
                    <button
                      onClick={() => onInitiateTransfer(node.id)}
                      className="inv-btn-transfer"
                      title="Initiate transfer order"
                    >
                      <Truck size={11} />
                      Transfer
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
