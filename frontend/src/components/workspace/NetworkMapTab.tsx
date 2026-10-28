import { useMemo, useState } from "react";
import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import "maplibre-gl/dist/maplibre-gl.css";
import { ScatterplotLayer, ArcLayer } from "@deck.gl/layers";
import { MapPin, Truck } from "lucide-react";
import type { HospitalNode, TickState, TransshipmentArc } from "../../types";
import { expiringUnits, totalUnits, zoneLabel, BLOOD_TYPES } from "../../lib/blood";
import type { ThemeMode } from "./WorkspaceShell";

/* ── Colour helpers ─────────────────────────────────────────── */
function nodeColor(node: HospitalNode): [number, number, number, number] {
  const exp = expiringUnits(node, 36);
  const tot = totalUnits(node);
  if (tot === 0 || node.net_balance < -10) return [225, 29, 72, 240];  // Rose Crimson
  if (exp > 10)                            return [217, 119, 6, 230];  // Amber
  return [5, 150, 105, 230];                                           // Emerald
}

function nodeTone(node: HospitalNode): "critical" | "expiring" | "healthy" {
  if (totalUnits(node) === 0 || node.net_balance < -10) return "critical";
  if (expiringUnits(node, 36) > 10) return "expiring";
  return "healthy";
}

const TONE = {
  critical: { dot: "#E11D48", bg: "rgba(225,29,72,0.12)", text: "#BE123C", label: "Shortage", border: "rgba(225,29,72,0.3)" },
  expiring: { dot: "#D97706", bg: "rgba(217,119,6,0.12)", text: "#B45309", label: "Expiring", border: "rgba(217,119,6,0.3)" },
  healthy:  { dot: "#059669", bg: "rgba(5,150,105,0.10)", text: "#047857", label: "Optimal",  border: "rgba(5,150,105,0.25)" },
};

const BASEMAP_STYLES: Record<ThemeMode, string> = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark:  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const INITIAL_VIEW = {
  longitude: 77.215, latitude: 28.585,
  zoom: 10.6, pitch: 36, bearing: -5,
  transitionDuration: 0,
};

interface NetworkMapTabProps {
  state: TickState;
  theme?: ThemeMode;
  selectedHospitalId: string | null;
  onSelectHospital: (id: string | null) => void;
  onOpenDispatch: (id: string) => void;
}

export default function NetworkMapTab({
  state,
  theme = "light",
  selectedHospitalId,
  onSelectHospital,
  onOpenDispatch,
}: NetworkMapTabProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [mapFilter, setMapFilter] = useState<"all" | "shortage" | "expiring">("all");
  const [showArcs, setShowArcs]   = useState(true);

  const defaultId = useMemo(() => {
    const lvl1 = state.nodes.find(n => n.trauma_level >= 1);
    return lvl1?.id ?? state.nodes[0]?.id ?? null;
  }, [state.nodes]);

  const effectiveId = selectedHospitalId ?? defaultId;

  const selectedHospital = useMemo(
    () => (effectiveId ? state.nodes.find(n => n.id === effectiveId) ?? null : null),
    [effectiveId, state.nodes]
  );

  const filteredNodes = useMemo(() => {
    if (mapFilter === "shortage") return state.nodes.filter(n => n.net_balance < -10 || totalUnits(n) === 0);
    if (mapFilter === "expiring") return state.nodes.filter(n => expiringUnits(n, 36) > 10);
    return state.nodes;
  }, [state.nodes, mapFilter]);

  const routes: TransshipmentArc[] = useMemo(() => state.active_arcs.slice(0, 14), [state.active_arcs]);

  const layers = useMemo(() => {
    const result = [];
    if (showArcs && routes.length > 0) {
      result.push(new ArcLayer({
        id: "arcs",
        data: routes,
        getSourcePosition: (d: TransshipmentArc) => [d.source_coords[1], d.source_coords[0]] as [number, number],
        getTargetPosition: (d: TransshipmentArc) => [d.target_coords[1], d.target_coords[0]] as [number, number],
        getSourceColor: [217, 119, 6, 210],
        getTargetColor: [225, 29, 72, 255],
        getHeight: 0.45,
        getWidth: 3,
        greatCircle: true,
        pickable: false,
      }));
    }
    result.push(new ScatterplotLayer({
      id: "nodes",
      data: filteredNodes,
      getPosition: (d: HospitalNode) => [d.lng, d.lat] as [number, number],
      getFillColor: (d: HospitalNode) => nodeColor(d),
      getRadius: (d: HospitalNode) => (d.id === effectiveId ? 650 : 420),
      radiusMinPixels: 8,
      radiusMaxPixels: 26,
      stroked: true,
      getLineColor: theme === "light" ? [15, 23, 42, 160] : [255, 255, 255, 160],
      lineWidthMinPixels: 2,
      pickable: true,
      onClick: ({ object }: { object?: HospitalNode }) => {
        if (object) onSelectHospital(object.id);
      },
    }));
    return result;
  }, [routes, filteredNodes, effectiveId, showArcs, theme, onSelectHospital]);

  // Selected hospital stock stats
  const nodeTot = selectedHospital ? totalUnits(selectedHospital) : 0;
  const nodeExp36 = selectedHospital ? expiringUnits(selectedHospital, 36) : 0;
  const nodeCrit12 = selectedHospital ? expiringUnits(selectedHospital, 12) : 0;
  const nodeFresh = Math.max(0, nodeTot - nodeExp36);

  const freshPct = nodeTot > 0 ? (nodeFresh / nodeTot) * 100 : 70;
  const warnPct  = nodeTot > 0 ? ((nodeExp36 - nodeCrit12) / nodeTot) * 100 : 20;
  const critPct  = nodeTot > 0 ? (nodeCrit12 / nodeTot) * 100 : 10;

  return (
    <div className="map-root">

      {/* ── MAP CANVAS AREA ── */}
      <div className="map-canvas-wrap">

        {/* Floating Map Filter Pill */}
        <div className="map-control-pill">
          {(["all", "shortage", "expiring"] as const).map(f => (
            <button
              key={f}
              onClick={() => setMapFilter(f)}
              className={`map-filter-btn${mapFilter === f ? " map-filter-btn--active" : ""}`}
            >
              {f === "all" ? `All (${state.nodes.length})` : f === "shortage" ? "Shortages" : "<36h Surplus"}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: "var(--ws-border)" }} />
          <button
            onClick={() => setShowArcs(v => !v)}
            className={`map-filter-btn${showArcs ? " map-filter-btn--active" : ""}`}
          >
            {showArcs ? "3D Arcs ON" : "Arcs OFF"}
          </button>
        </div>

        {/* DeckGL & MapLibre */}
        <DeckGL
          viewState={viewState}
          onViewStateChange={(e: any) => setViewState(e.viewState)}
          controller={{ doubleClickZoom: false, dragRotate: true }}
          layers={layers}
          getCursor={({ isHovering }: { isHovering: boolean }) => (isHovering ? "pointer" : "default")}
        >
          <Map
            mapStyle={BASEMAP_STYLES[theme]}
            reuseMaps
            attributionControl={false}
          />
        </DeckGL>
      </div>

      {/* ── RIGHT DOCKED FACILITY & ROUTE INSPECTOR ── */}
      <aside className="map-sheet">
        {selectedHospital ? (
          <>
            {/* Header with Hospital Selector Dropdown */}
            <div className="map-sheet-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <MapPin size={13} style={{ color: "var(--ws-accent)" }} />
                  <span style={{ fontSize: 10, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: "var(--ws-text-4)" }}>
                    {selectedHospital.id} · {zoneLabel(selectedHospital.zone)}
                  </span>
                </div>
                <h2 className="map-sheet-title">{selectedHospital.name}</h2>
                <div className="map-sheet-sub">
                  Level {selectedHospital.trauma_level} Trauma Center
                </div>
              </div>
              <span
                className="inv-status-badge"
                style={{
                  background: TONE[nodeTone(selectedHospital)].bg,
                  color: TONE[nodeTone(selectedHospital)].text,
                  border: `1px solid ${TONE[nodeTone(selectedHospital)].border}`,
                }}
              >
                <span className="inv-status-dot" style={{ background: TONE[nodeTone(selectedHospital)].dot }} />
                {TONE[nodeTone(selectedHospital)].label}
              </span>
            </div>

            {/* Body */}
            <div className="map-sheet-body">

              {/* Facility Quick Dropdown */}
              <div style={{ position: "relative" }}>
                <select
                  value={selectedHospital.id}
                  onChange={e => onSelectHospital(e.target.value)}
                  className="dsp-select"
                >
                  {state.nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({zoneLabel(n.zone)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Proportional Shelf-Life Breakdown */}
              <div style={{ background: "var(--ws-surface-2)", border: "1px solid var(--ws-border)", borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ws-text-3)", textTransform: "uppercase" }}>
                    Shelf-Life Breakdown
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: "var(--ws-text-1)" }}>
                    {nodeTot}u Total
                  </span>
                </div>

                <div className="inv-shelf-bar">
                  <div className="inv-shelf-seg inv-shelf-seg--fresh" style={{ width: `${freshPct}%` }} title={`Fresh: ${nodeFresh}u`} />
                  <div className="inv-shelf-seg inv-shelf-seg--warn" style={{ width: `${warnPct}%` }} title={`Reroute <36h: ${nodeExp36 - nodeCrit12}u`} />
                  <div className="inv-shelf-seg inv-shelf-seg--crit" style={{ width: `${critPct}%` }} title={`Critical <12h: ${nodeCrit12}u`} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, fontFamily: "var(--ws-font-mono)", color: "var(--ws-text-4)" }}>
                  <span style={{ color: "#059669" }}>● Fresh: {nodeFresh}u</span>
                  <span style={{ color: "#D97706" }}>● &lt;36h: {nodeExp36}u</span>
                  <span style={{ color: "#E11D48" }}>● &lt;12h: {nodeCrit12}u</span>
                </div>
              </div>

              {/* 8-Card ABO/Rh Mini-Grid */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ws-text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  ABO / Rh On-Hand Stock
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {BLOOD_TYPES.map(bg => {
                    const inv = selectedHospital.inventory_by_blood_and_age[bg];
                    const cnt = inv ? Object.values(inv).reduce((s, v) => s + v, 0) : 0;
                    return (
                      <div
                        key={bg}
                        style={{
                          background: "var(--ws-surface-2)",
                          border: "1px solid var(--ws-border)",
                          borderRadius: 8, padding: "8px 6px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: 11, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: "var(--ws-accent)" }}>
                          {bg}
                        </div>
                        <div style={{ fontSize: 14, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: cnt === 0 ? "var(--ws-text-4)" : "var(--ws-text-1)", marginTop: 2 }}>
                          {cnt}u
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Transfers For This Node */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ws-text-4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Active Courier Legs
                </div>
                {state.transfers.filter(t => t.source_id === selectedHospital.id || t.target_id === selectedHospital.id).length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--ws-text-4)", background: "var(--ws-surface-2)", border: "1px solid var(--ws-border)", borderRadius: 8, padding: 12, textAlign: "center" }}>
                    No pending transfers for this facility
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {state.transfers
                      .filter(t => t.source_id === selectedHospital.id || t.target_id === selectedHospital.id)
                      .slice(0, 3)
                      .map(t => (
                        <div
                          key={t.id}
                          style={{
                            background: "var(--ws-surface-2)",
                            border: "1px solid var(--ws-border)",
                            borderRadius: 8, padding: "8px 12px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            fontSize: 11,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--ws-text-1)" }}>
                              {t.source_id === selectedHospital.id ? `➔ ${t.target_name}` : `⬅ from ${t.source_name}`}
                            </div>
                            <div style={{ color: "var(--ws-text-4)", fontFamily: "var(--ws-font-mono)", marginTop: 2 }}>
                              {t.donor_blood} · {t.units}u · {t.eta_mins.toFixed(0)}m ETA
                            </div>
                          </div>
                          <span className="dsp-urgency-pill" style={{ background: "rgba(225,29,72,0.1)", color: "var(--ws-accent)", border: "1px solid rgba(225,29,72,0.25)" }}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Quick Action Button */}
              <button
                onClick={() => onOpenDispatch(selectedHospital.id)}
                className="ws-step-btn"
                style={{ marginTop: "auto" }}
              >
                <Truck size={14} />
                + Dispatch / Request Units
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: 24, textAlign: "center", color: "var(--ws-text-4)" }}>
            Select a hospital pin on the map to inspect live reserves
          </div>
        )}
      </aside>
    </div>
  );
}
