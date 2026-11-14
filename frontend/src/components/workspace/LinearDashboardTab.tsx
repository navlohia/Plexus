import { useMemo, useState } from "react";
import { Filter, Play, BarChart2, TrendingUp, Table, Send, ChevronRight } from "lucide-react";
import type { TickState } from "../../types";
import { totalUnits, expiringUnits } from "../../lib/blood";

interface LinearDashboardTabProps {
  state: TickState;
  onViewOnMap: (id: string) => void;
  onInitiateTransfer: (id: string) => void;
}

export default function LinearDashboardTab({
  state,
  onViewOnMap,
  onInitiateTransfer,
}: LinearDashboardTabProps) {
  const [displayMode, setDisplayMode] = useState<"bar" | "line" | "table">("bar");
  const [showArchived, setShowArchived] = useState(false);
  const [hideZeroStock, setHideZeroStock] = useState(false);
  const [hideOptimal, setHideOptimal] = useState(false);
  const [measure, setMeasure] = useState("Platelet units");
  const [slice, setSlice] = useState("Facility");

  const facilities = useMemo(() => {
    let list = state.nodes.map(n => {
      const tot = totalUnits(n);
      const exp36 = expiringUnits(n, 36);
      const stableUnits = Math.max(0, tot - exp36);

      const oNeg = n.inventory_by_blood_and_age["O-"] ? Object.values(n.inventory_by_blood_and_age["O-"]).reduce((s, v) => s + v, 0) : 0;
      const oPos = n.inventory_by_blood_and_age["O+"] ? Object.values(n.inventory_by_blood_and_age["O+"]).reduce((s, v) => s + v, 0) : 0;
      const aPos = n.inventory_by_blood_and_age["A+"] ? Object.values(n.inventory_by_blood_and_age["A+"]).reduce((s, v) => s + v, 0) : 0;
      const bPos = n.inventory_by_blood_and_age["B+"] ? Object.values(n.inventory_by_blood_and_age["B+"]).reduce((s, v) => s + v, 0) : 0;
      const abNeg = n.inventory_by_blood_and_age["AB-"] ? Object.values(n.inventory_by_blood_and_age["AB-"]).reduce((s, v) => s + v, 0) : 0;
      const abPos = n.inventory_by_blood_and_age["AB+"] ? Object.values(n.inventory_by_blood_and_age["AB+"]).reduce((s, v) => s + v, 0) : 0;

      return {
        id: n.id,
        name: n.name,
        zone: n.zone,
        netBalance: n.net_balance,
        tot,
        exp36,
        stableUnits,
        oNeg,
        oPos,
        aPos,
        bPos,
        abNeg,
        abPos,
      };
    });

    if (hideZeroStock) {
      list = list.filter(f => f.tot > 0);
    }
    if (hideOptimal) {
      list = list.filter(f => f.netBalance < 0 || f.exp36 > 10);
    }

    return list;
  }, [state.nodes, hideZeroStock, hideOptimal]);

  const chartBars = useMemo(() => facilities.slice(0, 16), [facilities]);

  return (
    <div className="linear-dash-root">

      {/* ── 1. Top Breadcrumbs Navigation Bar (Zero emojis) ── */}
      <div className="linear-breadcrumbs-bar">
        <div className="linear-breadcrumbs-left">
          <span className="linear-crumb">Clearinghouse</span>
          <ChevronRight size={12} className="linear-crumb-sep" />
          <span className="linear-crumb">Regional Inventory</span>
          <ChevronRight size={12} className="linear-crumb-sep" />
          <span className="linear-crumb-active">Platelet &amp; ABO Matrix</span>

          <button className="linear-filter-btn" type="button">
            <Filter size={11} />
            Filter
          </button>
        </div>

        <div className="linear-top-actions">
          <button
            className="linear-action-pill"
            onClick={() => onInitiateTransfer(facilities[0]?.id || "ND-01")}
            type="button"
          >
            <Send size={11} style={{ marginRight: 5 }} />
            New Dispatch
          </button>
        </div>
      </div>

      {/* ── 2. Dashboard Body (Split: Main Left + Controls Right) ── */}
      <div className="linear-dash-layout">

        {/* Main Left Pane */}
        <div className="linear-main-pane">

          {/* Title Section */}
          <div className="linear-title-section">
            <h1 className="linear-title">Platelet Inventory &amp; ABO Balance Matrix</h1>
            <p className="linear-subtitle">Cross-facility stock distribution, shelf-life vulnerability, and universal donor reserves</p>
          </div>

          {/* Stacked Vertical Bar Chart */}
          {(displayMode === "bar" || displayMode === "line") && (
            <div className="linear-chart-box">
              <div className="linear-chart-body">
                {/* Dashed Horizontal Grid Lines (0 to 110 on the right) */}
                <div className="linear-grid-bg">
                  {[110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(v => (
                    <div key={v} className="linear-grid-row">
                      <div className="linear-grid-line" />
                      <span className="linear-grid-label">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Stacked Vertical Bars */}
                <div className="linear-bars-row">
                  {chartBars.map(f => {
                    const heightPct = Math.min(100, Math.max(10, (f.tot / 110) * 100));

                    return (
                      <div
                        key={f.id}
                        className="linear-bar-item"
                        title={`${f.name}: ${f.tot} units (${f.exp36}u expiring <36h)`}
                        onClick={() => onViewOnMap(f.id)}
                      >
                        <div
                          className="linear-bar-stack"
                          style={{ height: `${heightPct}%` }}
                        >
                          {/* Segment 1: Charcoal Base (Stable stock) */}
                          <div
                            className="linear-bar-base"
                            style={{ height: "45%" }}
                          />
                          {/* Segment 2: Crimson (O- Universal Donor) */}
                          {f.oNeg > 0 && (
                            <div
                              className="linear-bar-red"
                              style={{ height: `${Math.max(10, (f.oNeg / Math.max(1, f.tot)) * 40)}%` }}
                              title={`O-: ${f.oNeg}u`}
                            />
                          )}
                          {/* Segment 3: Amber (O+ Reserve) */}
                          {f.oPos > 0 && (
                            <div
                              className="linear-bar-amber"
                              style={{ height: `${Math.max(8, (f.oPos / Math.max(1, f.tot)) * 30)}%` }}
                              title={`O+: ${f.oPos}u`}
                            />
                          )}
                          {/* Segment 4: Blue (A+) */}
                          {f.aPos > 0 && (
                            <div
                              className="linear-bar-blue"
                              style={{ height: `${Math.max(8, (f.aPos / Math.max(1, f.tot)) * 30)}%` }}
                              title={`A+: ${f.aPos}u`}
                            />
                          )}
                          {/* Segment 5: Green (B+) */}
                          {f.bPos > 0 && (
                            <div
                              className="linear-bar-green"
                              style={{ height: `${Math.max(8, (f.bPos / Math.max(1, f.tot)) * 25)}%` }}
                              title={`B+: ${f.bPos}u`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Clean Data Table with CSS Dot Badges (Zero emojis) */}
          <div className="linear-table-container">
            <table className="linear-dash-table">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Facility</th>
                  <th style={{ width: "12%" }}>Total Units</th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--gray" /> Stable
                    </span>
                  </th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--red" /> O- (Universal)
                    </span>
                  </th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--blue" /> O+
                    </span>
                  </th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--green" /> A+
                    </span>
                  </th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--red" /> B+
                    </span>
                  </th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--amber" /> AB-
                    </span>
                  </th>
                  <th>
                    <span className="linear-th-with-dot">
                      <span className="linear-dot linear-dot--purple" /> &lt;36h Risk
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {facilities.map(f => {
                  return (
                    <tr
                      key={f.id}
                      onClick={() => onViewOnMap(f.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="linear-facility-cell">
                          <button
                            type="button"
                            className="linear-play-btn"
                            title="Initiate lateral transfer for this facility"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInitiateTransfer(f.id);
                            }}
                          >
                            <Play size={10} style={{ color: "#94A3B8", fill: "#94A3B8" }} />
                          </button>
                          <span title={f.name}>{f.name}</span>
                        </div>
                      </td>
                      <td className="linear-cell-num">{f.tot}</td>
                      <td className="linear-cell-num" style={{ color: "#94A3B8" }}>{f.stableUnits}</td>
                      <td className="linear-cell-num" style={{ color: f.oNeg <= 2 ? "#E11D48" : undefined, fontWeight: f.oNeg <= 2 ? 800 : undefined }}>
                        {f.oNeg}
                      </td>
                      <td className="linear-cell-num">{f.oPos}</td>
                      <td className="linear-cell-num">{f.aPos}</td>
                      <td className="linear-cell-num">{f.bPos}</td>
                      <td className="linear-cell-num">{f.abNeg}</td>
                      <td className="linear-cell-num" style={{ color: f.exp36 > 0 ? "#F59E0B" : undefined, fontWeight: f.exp36 > 0 ? 800 : undefined }}>
                        {f.exp36}u
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Controls Panel */}
        <div className="linear-controls-panel">

          {/* Measure */}
          <div className="linear-ctrl-group">
            <label className="linear-ctrl-label">Measure</label>
            <select
              value={measure}
              onChange={e => setMeasure(e.target.value)}
              className="linear-ctrl-select"
            >
              <option value="Platelet units">Platelet units</option>
              <option value="Critical <36h Risk">Critical &lt;36h Risk</option>
              <option value="Net Imbalance">Net Imbalance</option>
            </select>
          </div>

          {/* Display */}
          <div className="linear-ctrl-group">
            <label className="linear-ctrl-label">Display</label>
            <div className="linear-seg-display">
              <button
                type="button"
                onClick={() => setDisplayMode("bar")}
                className={`linear-seg-btn${displayMode === "bar" ? " linear-seg-btn--active" : ""}`}
                title="Bar Chart"
              >
                <BarChart2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("line")}
                className={`linear-seg-btn${displayMode === "line" ? " linear-seg-btn--active" : ""}`}
                title="Line Trend"
              >
                <TrendingUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={`linear-seg-btn${displayMode === "table" ? " linear-seg-btn--active" : ""}`}
                title="Table Only"
              >
                <Table size={13} />
              </button>
            </div>
          </div>

          {/* Slice */}
          <div className="linear-ctrl-group">
            <label className="linear-ctrl-label">Slice</label>
            <select
              value={slice}
              onChange={e => setSlice(e.target.value)}
              className="linear-ctrl-select"
            >
              <option value="Facility">Facility Node</option>
              <option value="Zone">Sector / Zone</option>
              <option value="Trauma Level">Trauma Level</option>
            </select>
          </div>

          {/* Segment */}
          <div className="linear-ctrl-group">
            <label className="linear-ctrl-label">Segment</label>
            <div className="linear-segment-box">
              <span className="linear-dot linear-dot--red" style={{ marginRight: 6 }} />
              <span>Blood Group (ABO)</span>
            </div>
          </div>

          {/* Minimalist Switch Toggles */}
          <div className="linear-toggles-list">
            <div
              className="linear-toggle-row"
              onClick={() => setShowArchived(v => !v)}
            >
              <span>Show archived transfers</span>
              <div className={`linear-switch-pill${showArchived ? " linear-switch-pill--on" : ""}`}>
                <div className="linear-switch-knob" />
              </div>
            </div>

            <div
              className="linear-toggle-row"
              onClick={() => setHideZeroStock(v => !v)}
            >
              <span>Hide zero stock nodes</span>
              <div className={`linear-switch-pill${hideZeroStock ? " linear-switch-pill--on" : ""}`}>
                <div className="linear-switch-knob" />
              </div>
            </div>

            <div
              className="linear-toggle-row"
              onClick={() => setHideOptimal(v => !v)}
            >
              <span>Highlight deficit nodes</span>
              <div className={`linear-switch-pill${hideOptimal ? " linear-switch-pill--on" : ""}`}>
                <div className="linear-switch-knob" />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
