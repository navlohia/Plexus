import { useMemo, useState } from "react";
import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import "maplibre-gl/dist/maplibre-gl.css";
import { ScatterplotLayer, ArcLayer } from "@deck.gl/layers";
import { Send, CheckCircle2, ShieldAlert, ArrowUpRight, Clock } from "lucide-react";
import type { HospitalNode, TickState, TransshipmentArc } from "../../types";
import { expiringUnits, totalUnits, zoneLabel } from "../../lib/blood";
import type { ThemeMode } from "./WorkspaceShell";

const BASEMAP_STYLES: Record<ThemeMode, string> = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark:  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

const INITIAL_VIEW = {
  longitude: 77.215, latitude: 28.585,
  zoom: 10.8, pitch: 0, bearing: 0,
  transitionDuration: 0,
};

const HOSPITAL_CALLSIGNS: Record<string, { code: string; short: string }> = {
  "ND-01": { code: "AIM", short: "AIIMS Trauma" },
  "ND-02": { code: "SJD", short: "Safdarjung" },
  "ND-03": { code: "MAX", short: "Max Saket" },
  "ND-04": { code: "N62", short: "Fortis N-62" },
  "ND-05": { code: "MED", short: "Medanta Medicity" },
  "ND-06": { code: "FTN", short: "Fortis Okhla" },
  "ND-07": { code: "GTB", short: "GTB Hospital" },
  "ND-08": { code: "RML", short: "RML Hospital" },
  "ND-09": { code: "LNJ", short: "LNJP Hospital" },
  "ND-10": { code: "SGR", short: "Sir Ganga Ram" },
  "ND-11": { code: "APL", short: "Apollo Sarita" },
  "ND-12": { code: "RGV", short: "Rajiv Gandhi" },
  "ND-13": { code: "FSB", short: "Fortis Vasant" },
  "ND-14": { code: "BLK", short: "BLK-Max Pusa" },
  "ND-15": { code: "MPD", short: "Manipal Dwarka" },
  "ND-16": { code: "STP", short: "St. Stephens" },
  "ND-17": { code: "ROH", short: "Saroj Rohini" },
  "ND-18": { code: "DWK", short: "Venkateshwar" },
  "ND-19": { code: "GCH", short: "Paras Gurugram" },
  "ND-20": { code: "NBV", short: "Jaypee Noida" },
  "ND-21": { code: "DRB", short: "DDU Hospital" },
  "ND-22": { code: "SDP", short: "Sanjay Gandhi" },
  "ND-23": { code: "NH4", short: "Artemis Gurugram" },
  "ND-24": { code: "MXP", short: "Max Patparganj" },
  "ND-25": { code: "PRS", short: "Holy Family" },
};

const REGIONS = [
  { key: "ALL",           label: "ALL" },
  { key: "CENTRAL_DELHI", label: "CENTRAL DELHI" },
  { key: "SOUTH_DELHI",   label: "SOUTH DELHI" },
  { key: "NORTH_DELHI",   label: "NORTH DELHI" },
  { key: "EAST_DELHI",    label: "EAST DELHI" },
  { key: "WEST_DELHI",    label: "WEST DELHI" },
  { key: "GURUGRAM",      label: "GURUGRAM" },
  { key: "NOIDA",         label: "NOIDA" },
];

interface FlightyNetworkMapProps {
  state: TickState;
  theme?: ThemeMode;
  selectedHospitalId: string | null;
  onSelectHospital: (id: string | null) => void;
  onOpenDispatch: (id: string) => void;
}

export default function FlightyNetworkMap({
  state,
  theme = "light",
  selectedHospitalId,
  onSelectHospital,
  onOpenDispatch,
}: FlightyNetworkMapProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [activeRegion, setActiveRegion] = useState("ALL");

  const nodes = useMemo(() => {
    return state.nodes.map(n => {
      const info = HOSPITAL_CALLSIGNS[n.id] ?? {
        code: n.id.replace("ND-", "H"),
        short: n.name.split(" ")[0],
      };
      const tot = totalUnits(n);
      const exp36 = expiringUnits(n, 36);

      const loadPct = Math.min(98, Math.max(15, Math.round((tot / 100) * 85)));
      const riskPct = tot > 0 ? Math.min(99, Math.round((exp36 / tot) * 100)) : 0;
      const urgencyPct = Math.min(100, Math.max(12, Math.max(loadPct, riskPct)));

      return {
        ...n,
        code: info.code,
        short: info.short,
        tot,
        exp36,
        loadPct,
        riskPct,
        urgencyPct,
      };
    });
  }, [state.nodes]);

  const filteredHospitals = useMemo(() => {
    let list = nodes;
    if (activeRegion !== "ALL") {
      list = list.filter(n => n.zone === activeRegion);
    }
    return [...list].sort((a, b) => b.exp36 - a.exp36 || b.tot - a.tot);
  }, [nodes, activeRegion]);

  const routes: TransshipmentArc[] = useMemo(() => state.active_arcs.slice(0, 16), [state.active_arcs]);

  const selectedHospital = useMemo(
    () => nodes.find(n => n.id === selectedHospitalId) ?? null,
    [nodes, selectedHospitalId]
  );

  const handleCardClick = (id: string, lng: number, lat: number) => {
    onSelectHospital(id);
    setViewState(v => ({
      ...v,
      longitude: lng,
      latitude: lat,
      zoom: 11.8,
      transitionDuration: 800,
    }));
  };

  const layers = useMemo(() => {
    const list: any[] = [];

    list.push(
      new ArcLayer({
        id: "transit-arcs",
        data: routes,
        getSourcePosition: (d: TransshipmentArc) => [d.source_coords[1], d.source_coords[0]] as [number, number],
        getTargetPosition: (d: TransshipmentArc) => [d.target_coords[1], d.target_coords[0]] as [number, number],
        getSourceColor: [255, 120, 0, 220],
        getTargetColor: [255, 160, 20, 240],
        getWidth: 2.8,
        getHeight: 0.35,
        greatCircle: true,
        pickable: false,
      })
    );

    list.push(
      new ScatterplotLayer({
        id: "transit-nodes-glow",
        data: nodes,
        getPosition: (d: HospitalNode) => [d.lng, d.lat] as [number, number],
        getFillColor: [255, 140, 0, 70],
        getRadius: 800,
        radiusMinPixels: 14,
        radiusMaxPixels: 30,
        pickable: false,
      })
    );

    list.push(
      new ScatterplotLayer({
        id: "transit-nodes-core",
        data: nodes,
        getPosition: (d: HospitalNode) => [d.lng, d.lat] as [number, number],
        getFillColor: (d: any) => (d.net_balance < 0 ? [225, 29, 72, 255] : [255, 130, 0, 255]),
        getRadius: (d: any) => (d.id === selectedHospitalId ? 520 : 360),
        radiusMinPixels: 7,
        radiusMaxPixels: 15,
        stroked: true,
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 2.5,
        pickable: true,
        onClick: ({ object }: { object?: HospitalNode }) => {
          if (object) onSelectHospital(object.id);
        },
      })
    );

    return list;
  }, [routes, nodes, selectedHospitalId, onSelectHospital]);

  return (
    <div className="flighty-tv-root">

      {/* ── Floating Left Disruption Cards Stack ── */}
      <div className="flighty-cards-stack">
        {filteredHospitals.slice(0, 6).map(h => {
          const isSelected = selectedHospitalId === h.id;
          return (
            <div
              key={h.id}
              onClick={() => handleCardClick(h.id, h.lng, h.lat)}
              className={`flighty-card${isSelected ? " flighty-card--active" : ""}`}
            >
              <div className="flighty-card-top">
                <span className="flighty-iata-code">{h.code}</span>
                <span className="flighty-city-name" title={h.name}>{h.short}</span>
              </div>

              <div className="flighty-card-metrics">
                <span className="flighty-metric" title="Outbound transshipment load pressure">
                  <span className="flighty-metric-icon"><ArrowUpRight size={10} /></span>
                  <span className="flighty-metric-val">{h.loadPct}% Load</span>
                </span>
                <span className="flighty-metric" title="Units expiring within 36 hours">
                  <span className="flighty-metric-icon"><Clock size={10} /></span>
                  <span className="flighty-metric-val">{h.riskPct}% Risk</span>
                </span>
              </div>

              <div className="flighty-bar-track">
                <div
                  className="flighty-bar-fill"
                  style={{ width: `${h.urgencyPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. High-Contrast Desaturated Basemap with DeckGL ── */}
      <div style={{ width: "100%", height: "100%" }}>
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

      {/* ── 4. Selected Facility Quick Action Drawer (Right Side) ── */}
      {selectedHospital && (
        <div className="flighty-detail-drawer">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontFamily: "var(--ws-font-mono)", color: "#FF8800", fontWeight: 800 }}>
              {selectedHospital.code} · {zoneLabel(selectedHospital.zone)}
            </span>
            <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={11} /> LIVE NODE
            </span>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{selectedHospital.name}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Level {selectedHospital.trauma_level} Trauma Center</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>TOTAL STOCK</div>
              <div style={{ fontSize: 16, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: "#FFFFFF" }}>{selectedHospital.tot}u</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>&lt;36H RISK</div>
              <div style={{ fontSize: 16, fontFamily: "var(--ws-font-mono)", fontWeight: 700, color: "#FF8800" }}>{selectedHospital.exp36}u</div>
            </div>
          </div>

          {selectedHospital.net_balance < 0 && (
            <div style={{ fontSize: 11, color: "#F43F5E", display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldAlert size={12} />
              <span>Net Deficit: {Math.abs(selectedHospital.net_balance)} units required</span>
            </div>
          )}

          <button
            onClick={() => onOpenDispatch(selectedHospital.id)}
            className="flighty-dispatch-btn"
          >
            <Send size={12} />
            Dispatch Lateral Transshipment
          </button>
        </div>
      )}

      {/* ── 5. Clean Bottom Sector Strip ── */}
      <div className="flighty-bottom-bar">
        <div className="flighty-regions-row">
          {REGIONS.map(r => (
            <button
              key={r.key}
              onClick={() => setActiveRegion(r.key)}
              className={`flighty-region-text-btn${activeRegion === r.key ? " flighty-region-text-btn--active" : ""}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flighty-legal-note">
          OR-TOOLS MESH SOLVER · 120H PLATELET SHELF-LIFE TELEMETRY
        </div>
      </div>

    </div>
  );
}
