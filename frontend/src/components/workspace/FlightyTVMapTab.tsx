import { getRealRoadCorridor } from "../../lib/delhiRoadCorridors";
import { NCR_HOSPITAL_METAS, recalculateHospitalTelemetry } from "../../lib/hospitalTelemetry";

import { useState, useMemo, useEffect, useCallback } from "react";

import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";

import {

  ArrowUpRight,
  CheckCircle2,
  Plus,

  ArrowDownRight,

  Plane,

  X,


  Layers,

  Truck,

  Clock,

  ShieldAlert,

} from "lucide-react";

import type { TickState, BloodType } from "../../types";

import { CRISIS_SCENARIOS } from "../../lib/crisisData";



interface FlightyTVMapTabProps {
  state: TickState;
  selectedHospitalId: string | null;
  activeCrisisId?: string | null;
  onStopCrisis?: () => void;
  onSelectHospital: (id: string | null) => void;
  onOpenDispatch: (id: string) => void;
  onDirectDispatch?: (targetHospitalId: string, units?: number) => void;
}



const CARTO_VOYAGER = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";



// Optimized initial viewport

const INITIAL_VIEW = {

  longitude: 77.16,

  latitude: 28.585,

  zoom: 10.5,

  pitch: 0,

  bearing: 0,

  transitionDuration: 0,

};



// Distinct coordinates and realistic statistics for all 25 hospitals

// All coordinates are strictly bounded inside lat: 28.525..28.670, lng: 77.100..77.340





const HOSPITAL_REGISTRY: any = NCR_HOSPITAL_METAS;




// 6 Distinct Arterial Express Highway Corridors across Delhi-NCR (Varied Donor Hubs!)
const PRIMARY_EXPRESS_CORRIDORS = [
  { source: "ND-03", target: "ND-01", blood: "O+", units: 8, name: "South Delhi Apex Arterial (Max Saket to AIIMS)" },
  { source: "ND-04", target: "ND-07", blood: "O+", units: 8, name: "Trans-Yamuna Expressway (Fortis Noida to GTB)" },
  { source: "ND-05", target: "ND-18", blood: "B+", units: 8, name: "Dwarka Expressway Corridor (Medanta to Venkateshwar)" },
  { source: "ND-11", target: "ND-09", blood: "A+", units: 12, name: "Mathura Road Corridor (Apollo Sarita to Lok Nayak)" },
  { source: "ND-23", target: "ND-19", blood: "AB+", units: 6, name: "Gurugram Supercluster Arterial (Artemis to Paras)" },
  { source: "ND-14", target: "ND-10", blood: "O+", units: 6, name: "Central Delhi Arterial (BLK-Max to Ganga Ram)" },
];

export default function FlightyTVMapTab({

  state,

  selectedHospitalId,

  activeCrisisId,

  onStopCrisis,

  onSelectHospital,

  onOpenDispatch,
  onDirectDispatch,
}: FlightyTVMapTabProps) {

  const activeCrisis = activeCrisisId && CRISIS_SCENARIOS[activeCrisisId] ? CRISIS_SCENARIOS[activeCrisisId] : null;

  const [viewState, setViewState] = useState(INITIAL_VIEW);

  const [activeFilter, setActiveFilter] = useState<"ALL" | "SHORTAGE" | "EXPIRY">("ALL");

  const [showArcs, setShowArcs] = useState(true);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [justStabilized, setJustStabilized] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);



  useEffect(() => {

    const handleResize = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);

  }, []);



  // Automatically focus camera on the crisis epicenter when a crisis is active

  useEffect(() => {

    if (activeCrisis) {

      setViewState((prev) => ({

        ...prev,

        longitude: activeCrisis.centerCoords[0],

        latitude: activeCrisis.centerCoords[1],

        zoom: activeCrisis.zoom,

      }));

    }

  }, [activeCrisisId]);



  // Enriched hospital list with unified live status calculation using recalculateHospitalTelemetry
  const hospitalList = useMemo(() => {
    const liveNodes = Array.isArray(state?.nodes) && state.nodes.length > 0 ? state.nodes : [];
    return Object.entries(NCR_HOSPITAL_METAS).map(([id, meta]) => {
      const liveNode = liveNodes.find((n) => n && n.id === id);
      const telemetry = recalculateHospitalTelemetry(id, liveNode);
      const inv = liveNode?.inventory_by_blood_and_age;

      return {
        id,
        code: telemetry.code,
        short: telemetry.name,
        fullName: telemetry.fullName,
        city: telemetry.city,
        coords: telemetry.coords,
        viability: telemetry.supplyRatio,
        urgency: telemetry.burnIndex,
        supplyRatio: telemetry.supplyRatio,
        burnIndex: telemetry.burnIndex,
        status: telemetry.status,
        statusColor: telemetry.statusColor,
        barColor: (telemetry.status === "Shortage" ? "crimson" : telemetry.status === "<36h Surplus" ? "amber" : "emerald") as "crimson" | "amber" | "emerald",
        stock: telemetry.totalStock,
        exp36: telemetry.expiringUnder36h,
        netBalance: telemetry.netBalance,
        activeCourierText: meta.activeCourierText,
        liveInv: inv,
      };
    });
  }, [state?.nodes]);



  const filteredHospitals = useMemo(() => {

    let list = hospitalList;

    if (activeFilter === "SHORTAGE") {

      list = hospitalList.filter((h) => h.status === "Shortage");

    } else if (activeFilter === "EXPIRY") {

      list = hospitalList.filter((h) => h.status === "<36h Surplus");

    }



    if (activeCrisis) {

      return [...list].sort((a, b) => {

        const aAff = activeCrisis.affectedNodeIds.includes(a.id) ? 1 : 0;

        const bAff = activeCrisis.affectedNodeIds.includes(b.id) ? 1 : 0;

        return bAff - aAff;

      });

    }

    return list;

  }, [hospitalList, activeFilter, activeCrisis]);



  const selectedNode = useMemo(() => {

    if (!selectedHospitalId) return null;

    return hospitalList.find((h) => h.id === selectedHospitalId) || null;

  }, [hospitalList, selectedHospitalId]);



  // Realistic varied ABO counts reading from live node inventory

  const aboInventoryBreakdown = useMemo(() => {

    if (!selectedNode) return [];

    const stock = selectedNode.stock;

    const inv = (selectedNode as any).liveInv;



    const counts: Record<BloodType, number> = {

      "O-": inv?.["O-"] ? Object.values(inv["O-"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(1, Math.round(stock * 0.06)),

      "O+": inv?.["O+"] ? Object.values(inv["O+"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(8, Math.round(stock * 0.35)),

      "A-": inv?.["A-"] ? Object.values(inv["A-"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(1, Math.round(stock * 0.04)),

      "A+": inv?.["A+"] ? Object.values(inv["A+"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(6, Math.round(stock * 0.23)),

      "B-": inv?.["B-"] ? Object.values(inv["B-"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(1, Math.round(stock * 0.04)),

      "B+": inv?.["B+"] ? Object.values(inv["B+"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(5, Math.round(stock * 0.21)),

      "AB-": inv?.["AB-"] ? Object.values(inv["AB-"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(0, Math.round(stock * 0.01)),

      "AB+": inv?.["AB+"] ? Object.values(inv["AB+"]).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(2, Math.round(stock * 0.06)),

    };



    return (Object.keys(counts) as BloodType[]).map((bt) => {

      const units = counts[bt];

      const maxRef = Math.max(24, Math.round(stock * 0.45));

      const fillPct = Math.min(100, Math.round((units / maxRef) * 100));

      return {

        type: bt,

        units,

        fillPct,

        isAlert: units <= 2,

        isOptimal: units >= 10,

      };

    });

  }, [selectedNode]);







  // Trigger re-render when new real-road OSRM routes resolve

  const [, setRouteVersion] = useState(0);

  const handleRouteLoaded = useCallback(() => {

    setRouteVersion((v) => v + 1);

  }, []);



  // Detailed Highway Corridors using Catmull-Rom road splines (no stringy spaghetti!)

  // Active routes combining crisis corridors, live state transfers, and primary corridors

  const activeRoutes = useMemo(() => {

    const liveTransfers = Array.isArray(state?.transfers) ? state.transfers : [];

    const validTransfers = liveTransfers

      .filter((t: any) => t && t.status !== "DELIVERED" && HOSPITAL_REGISTRY[t.source_id] && HOSPITAL_REGISTRY[t.target_id])

      .map((t: any) => ({

        source: t.source_id,

        target: t.target_id,

        blood: t.donor_blood || "O+",

        units: t.units || 8,

        eta: t.eta_mins || 20,

        isEmergency: t.urgency === "CRITICAL" || String(t.id).startsWith("#EMG"),

      }));



    if (activeCrisis) {

      const crisisRoutes = activeCrisis.emergencyRoutes.map((r) => ({

        source: r.source_id,

        target: r.target_id,

        blood: r.blood,

        units: r.units,

        eta: parseInt(r.eta) || 15,

        isEmergency: true,

      }));

      const extra = validTransfers.filter(

        (st) => !crisisRoutes.some((cr) => cr.source === st.source && cr.target === st.target)

      );

      return [...crisisRoutes, ...extra];

    }



    const merged = [...validTransfers];

    for (const primary of PRIMARY_EXPRESS_CORRIDORS) {

      if (!merged.some((m) => m.source === primary.source && m.target === primary.target)) {

        merged.push({ ...primary, eta: 20, isEmergency: false });

      }

    }

    return merged;

  }, [state?.transfers, activeCrisis]);



  // Detailed Highway Corridors using Catmull-Rom road splines (no stringy spaghetti!)

  const routeGeoJSON = useMemo((): GeoJSON.FeatureCollection => {

    if (!showArcs) return { type: "FeatureCollection", features: [] };



    let routes = [...activeRoutes];



    // If user has selected a hospital, ensure its routes are prominently highlighted

    if (selectedHospitalId && HOSPITAL_REGISTRY[selectedHospitalId]) {

      const hospitalConnected = routes.filter(

        (r) => r.source === selectedHospitalId || r.target === selectedHospitalId

      );

      if (hospitalConnected.length > 0) {

        routes = [

          ...hospitalConnected,

          ...routes.filter((r) => !hospitalConnected.some((hr) => hr.source === r.source && hr.target === r.target)),

        ];

      }

    }



    // Limit to at most 6 clean arterial corridors at any moment to prevent visual clutter

    const displayed = routes.slice(0, 6);



    const features = displayed

      .map((arc) => {

        const src = HOSPITAL_REGISTRY[arc.source];

        const tgt = HOSPITAL_REGISTRY[arc.target];

        if (!src || !tgt) return null;



        const isSelected = selectedHospitalId ? (arc.source === selectedHospitalId || arc.target === selectedHospitalId) : false;

        const isDonorSurplus = src.status !== "Shortage";



        const roadCoords = getRealRoadCorridor(src.coords, tgt.coords, arc.source, arc.target, handleRouteLoaded);

        return {

          type: "Feature" as const,

          properties: {

            source: arc.source,

            target: arc.target,

            blood: arc.blood,

            units: arc.units,

            isDonorSurplus,

            isEmergency: Boolean(arc.isEmergency),

            isSelected,

          },

          geometry: {

            type: "LineString" as const,

            coordinates: roadCoords,

          },

        };

      })

      .filter(Boolean) as GeoJSON.Feature[];



    return { type: "FeatureCollection", features };

  }, [showArcs, activeRoutes, selectedHospitalId]);



  // Interpolated courier positions along highway splines



  const handleDrawerDispatch = useCallback(() => {
    if (!selectedNode) return;
    setIsDispatching(true);
    if (onDirectDispatch) {
      onDirectDispatch(selectedNode.id, 16);
    } else {
      onOpenDispatch(selectedNode.id);
    }
    setJustStabilized(true);
    setTimeout(() => setIsDispatching(false), 300);
    setTimeout(() => setJustStabilized(false), 2400);
  }, [selectedNode, onDirectDispatch, onOpenDispatch]);

  return (

    <div className="flighty-tv-outer-shell">

      {/* ── ROW 1: DOCKED BLACK FLIGHTY BANNER (Outside map container so zero lines poke above!) ── */}

      <div className="flighty-docked-banner">

        {/* Left Title */}

        <div className="flighty-banner-title">

          Today's Hospital Blood Disruption

        </div>



        {/* Center/Right Single-Line Compact Filter Pills & Brand */}

        <div className="flighty-banner-right">

          <div className="flighty-filter-pills">

            <button

              type="button"

              className={`flighty-pill-btn${activeFilter === "ALL" ? " pill-active" : ""}`}

              onClick={() => setActiveFilter("ALL")}

            >

              All NCR ({hospitalList.length})

            </button>

            <button

              type="button"

              className={`flighty-pill-btn${activeFilter === "SHORTAGE" ? " pill-active" : ""}`}

              onClick={() => setActiveFilter("SHORTAGE")}

            >

              Shortages

            </button>

            <button

              type="button"

              className={`flighty-pill-btn${activeFilter === "EXPIRY" ? " pill-active" : ""}`}

              onClick={() => setActiveFilter("EXPIRY")}

            >

              &lt;36h Risk

            </button>

            <button

              type="button"

              className={`flighty-pill-btn${showArcs ? " pill-active" : ""}`}

              onClick={() => setShowArcs(!showArcs)}

            >

              <Layers size={11} style={{ marginRight: 4 }} />

              Route Arcs ({showArcs ? "On" : "Off"})

            </button>

          </div>



          {/* Brand Text */}

          <div className="flighty-brand-text">

            <span className="brand-primary">PLEXUS.AI</span>

            <span className="brand-sep"> / </span>

            <span className="brand-mesh">NCR MESH</span>

          </div>



          {/* Tilted Floating Corner Badge (rotate: 8deg) */}

          <div className="flighty-tilted-badge" title="Live Transshipment Feed">

            <Plane size={18} strokeWidth={2.2} />

          </div>

        </div>

      </div>



      {/* ── LIVE CRISIS SHOCK ALERT STRIP (visible whenever a Stress Lab scenario is active!) ── */}

      {activeCrisis && (

        <div

          style={{

            background: "linear-gradient(90deg, #991B1B 0%, #E11D48 100%)",

            color: "#FFFFFF",

            padding: "9px 24px",

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            boxShadow: "0 3px 12px rgba(225, 29, 72, 0.28)",

            zIndex: 42,

            flexShrink: 0,

          }}

        >

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

            <span

              style={{

                width: 9,

                height: 9,

                borderRadius: "50%",

                background: "#FFFFFF",

                display: "inline-block",

                animation: "pulse-badge 0.8s ease-in-out infinite",

              }}

            />

            <span style={{ fontWeight: 800, fontSize: "12.5px", letterSpacing: "0.02em" }}>

              LIVE STRESS LAB SHOCK ACTIVE: {activeCrisis.title}

            </span>

            <span

              style={{

                fontSize: "10.5px",

                fontWeight: 700,

                background: "rgba(255,255,255,0.22)",

                padding: "2px 8px",

                borderRadius: "999px",

              }}

            >

              5 Emergency Corridors Injected · {activeCrisis.epicenterName}

            </span>

          </div>



          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

            <button

              type="button"

              onClick={() => {

                setViewState((prev) => ({

                  ...prev,

                  longitude: activeCrisis.centerCoords[0],

                  latitude: activeCrisis.centerCoords[1],

                  zoom: activeCrisis.zoom,

                }));

              }}

              style={{

                background: "rgba(255,255,255,0.2)",

                color: "#FFFFFF",

                border: "1px solid rgba(255,255,255,0.45)",

                borderRadius: "8px",

                padding: "4px 12px",

                fontSize: "11px",

                fontWeight: 700,

                cursor: "pointer",

              }}

            >

              Focus Epicenter ⌖

            </button>

            {onStopCrisis && (

              <button

                type="button"

                onClick={onStopCrisis}

                style={{

                  background: "#FFFFFF",

                  color: "#991B1B",

                  border: "none",

                  borderRadius: "8px",

                  padding: "4px 12px",

                  fontSize: "11px",

                  fontWeight: 800,

                  cursor: "pointer",

                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",

                }}

              >

                ⏹ Stop Shock & Reset

              </button>

            )}

          </div>

        </div>

      )}



      {/* ── ROW 2: CLIPPED MAP CONTAINER (overflow: hidden guarantees clean containment!) ── */}

      <div className="flighty-clipped-map-frame">

        {/* MapLibre Canvas with Carto Positron Light */}

        <Map

          {...viewState}

          onMove={(evt) => setViewState((prev) => ({ ...prev, ...evt.viewState }))}

          mapStyle={CARTO_VOYAGER}

          style={{ width: "100%", height: "100%" }}

          attributionControl={false}

        >

          {/* Detailed Highway Corridor Routing with Underneath Road Casing & Pulse Dash */}

          {showArcs && (

            <Source id="route-arcs" type="geojson" data={routeGeoJSON}>

              {/* Layer 1: Crisp White Highway Casing */}

              <Layer

                id="route-casing-layer"

                type="line"

                paint={{

                  "line-color": "#FFFFFF",

                  "line-width": ["case", ["get", "isSelected"], 6.5, 4.2],

                  "line-opacity": 0.92,

                }}

                layout={{ "line-cap": "round", "line-join": "round" }}

              />

              {/* Layer 2: Core Arterial Road Line (Emerald for surplus, Crimson for emergency / deficit) */}

              <Layer

                id="route-core-layer"

                type="line"

                paint={{

                  "line-color": [

                    "case",

                    ["get", "isEmergency"],

                    "#E11D48",

                    ["case", ["get", "isDonorSurplus"], "#15997A", "#E11D48"],

                  ],

                  "line-width": ["case", ["get", "isSelected"], 3.8, 2.4],

                  "line-opacity": ["case", ["get", "isSelected"], 1.0, 0.88],

                }}

                layout={{ "line-cap": "round", "line-join": "round" }}

              />

              {/* Layer 3: Subtle Animated Pulse / Directional Dash */}

              <Layer

                id="route-dash-layer"

                type="line"

                paint={{

                  "line-color": "#FFFFFF",

                  "line-width": 1.4,

                  "line-dasharray": [2, 4],

                  "line-opacity": 0.65,

                }}

                layout={{ "line-cap": "round", "line-join": "round" }}

              />

            </Source>

          )}



                    {/* ── HIGH-PRIORITY INSTANT-CLICK HOSPITAL MAP MARKERS ── */}

          {hospitalList.map((h) => {

            const isSelected = selectedHospitalId === h.id;

            const isCrisisAffected = activeCrisis && activeCrisis.affectedNodeIds.includes(h.id);

            const dotColor =

              isCrisisAffected || h.status === "Shortage"

                ? "#E11D48" // Crimson

                : h.status === "<36h Surplus"

                ? "#F59E0B" // Amber

                : "#15997A"; // Emerald



            return (

              <Marker

                key={h.id}

                longitude={h.coords[0]}

                latitude={h.coords[1]}

                anchor="center"

                style={{ zIndex: isSelected ? 18 : isCrisisAffected ? 15 : 10 }}

              >

                <button

                  type="button"

                  className={`flighty-pin-btn${isSelected ? " pin-active" : ""}`}

                  onClick={(e) => {

                    e.stopPropagation();

                    onSelectHospital(h.id);

                  }}

                  title={`Click to inspect ${h.fullName}${isCrisisAffected ? " (CRISIS EPICENTER)" : ""}`}

                  style={{ position: "relative" }}

                >

                  {/* Crisis Pulsing Outer Aura */}

                  {isCrisisAffected && (

                    <span

                      style={{

                        position: "absolute",

                        top: 1,

                        left: "50%",

                        transform: "translateX(-50%)",

                        width: 22,

                        height: 22,

                        borderRadius: "50%",

                        background: "rgba(225, 29, 72, 0.35)",

                        animation: "pulse-badge 1.0s ease-in-out infinite",

                        pointerEvents: "none",

                      }}

                    />

                  )}

                  {/* Top White-Bordered Colored Dot */}

                  <div

                    className="flighty-pin-dot"

                    style={{ backgroundColor: dotColor }}

                  />

                  {/* Bottom Crisp White Code Pill Badge */}

                  <div className="flighty-pin-pill">

                    {h.code}

                  </div>

                </button>

              </Marker>

            );

          })}

        </Map>



        {/* Left White Atmospheric Gradient Scrim (Desktop Only) */}

        {!isMobile && <div className="flighty-white-fog-scrim" />}



        {/* The Left Column of Light-Gray Flighty Cards (Desktop Only - Hidden on Mobile) */}

        {!isMobile && (

        <div className="flighty-left-cards-stack" style={{ zIndex: 40 }}>

          {filteredHospitals.map((node) => {

            const isSelected = selectedHospitalId === node.id;

            const barColor =

              node.barColor === "crimson"

                ? "#E11D48"

                : node.barColor === "emerald"

                ? "#15997A"

                : "#F59E0B";



            return (

              <div

                key={node.id}

                className={`flighty-card${isSelected ? " flighty-card-selected" : ""}`}

                onClick={() => {

                  onSelectHospital(node.id);

                  setViewState((prev) => ({

                    ...prev,

                    longitude: node.coords[0],

                    latitude: node.coords[1],

                    zoom: 11.5,

                    transitionDuration: 500,

                  }));

                }}

              >

                {/* Column 1: 3-Letter Code */}

                <div className="flighty-card-code">{node.code}</div>



                {/* Column 2: Name, Dual Circular Arrow Stats, Thin Progress Line */}

                <div className="flighty-card-content">

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>

                    <div className="flighty-card-title">{node.short}</div>

                    {activeCrisis && activeCrisis.affectedNodeIds.includes(node.id) && (

                      <span

                        style={{

                          background: "#FFE4E6",

                          color: "#E11D48",

                          border: "1px solid #FDA4AF",

                          padding: "1px 5px",

                          borderRadius: "4px",

                          fontSize: "8.5px",

                          fontWeight: 800,

                          letterSpacing: "0.04em",

                          flexShrink: 0,

                        }}

                      >

                        CRISIS SHOCK

                      </span>

                    )}

                  </div>



                  <div className="flighty-card-stats-row">

                    {/* Stat 1: Stock Viability % */}

                    <div className="flighty-stat-item">

                      <span className="flighty-stat-circle">

                        <ArrowUpRight size={11} strokeWidth={2.5} />

                      </span>

                      <span className="flighty-stat-val">{node.supplyRatio}%</span>

                    </div>



                    {/* Stat 2: Expiry Urgency % */}

                    <div className="flighty-stat-item">

                      <span className="flighty-stat-circle">

                        <ArrowDownRight size={11} strokeWidth={2.5} />

                      </span>

                      <span className="flighty-stat-val">{node.burnIndex}%</span>

                    </div>

                  </div>



                  {/* Thin 3.5px Progress Bar on #D8DCE3 track */}

                  <div className="flighty-progress-track">

                    <div

                      className="flighty-progress-fill"

                      style={{

                        width: `${node.burnIndex}%`,

                        backgroundColor: barColor,

                      }}

                    />

                  </div>

                </div>

              </div>

            );

          })}

        </div>

        )}



        {/* ── REDESIGNED FLIGHTY TERMINAL PASS CARD (DESKTOP FLOATING / MOBILE BOTTOM DRAWER) ── */}

        {selectedNode && (

          <div

            className="flighty-inspector-drawer"

            style={{

              position: isMobile ? "fixed" : "absolute",

              bottom: isMobile ? 0 : "18px",

              left: isMobile ? 0 : "auto",

              right: isMobile ? 0 : "18px",

              width: isMobile ? "100%" : "385px",

              height: isMobile ? "50vh" : "auto",

              maxHeight: isMobile ? "50vh" : "calc(100% - 36px)",

              background: "#FFFFFF",

              borderTopLeftRadius: "24px",

              borderTopRightRadius: "24px",

              borderBottomLeftRadius: isMobile ? 0 : "18px",

              borderBottomRightRadius: isMobile ? 0 : "18px",

              boxShadow: isMobile

                ? "0 -12px 40px rgba(0, 0, 0, 0.25)"

                : "0 24px 60px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.08)",

              border: "1px solid #E5E7EB",

              borderBottom: isMobile ? "none" : "1px solid #E5E7EB",

              zIndex: 50,

              overflow: "hidden",

              display: "flex",

              flexDirection: "column",

              fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",

              transition: "height 0.25s ease, max-height 0.25s ease",

            }}

          >

            {isMobile && (

              <div

                style={{

                  width: "36px",

                  height: "4px",

                  borderRadius: "999px",

                  background: "#9CA3AF",

                  margin: "8px auto 4px",

                  flexShrink: 0,

                }}

              />

            )}

            {/* Top Dark Charcoal Flighty Header */}

            <div

              style={{

                background: "#111827",

                color: "#FFFFFF",

                padding: "16px 18px",

                display: "flex",

                flexDirection: "column",

                gap: "8px",

                flexShrink: 0,

              }}

            >

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                  <span

                    style={{

                      background: "#2563EB",

                      color: "#FFFFFF",

                      fontSize: "11px",

                      fontWeight: 800,

                      padding: "3px 8px",

                      borderRadius: "6px",

                      fontFamily: "monospace",

                      letterSpacing: "0.04em",

                    }}

                  >

                    {selectedNode.code}

                  </span>

                  <span
                    style={{
                      background:
                        selectedNode.status === "Shortage"
                          ? "rgba(225, 29, 72, 0.2)"
                          : selectedNode.status === "<36h Surplus"
                          ? "rgba(217, 119, 6, 0.2)"
                          : "rgba(16, 185, 129, 0.2)",
                      color:
                        selectedNode.status === "Shortage"
                          ? "#FDA4AF"
                          : selectedNode.status === "<36h Surplus"
                          ? "#FCD34D"
                          : "#6EE7B7",
                      border: `1px solid ${
                        selectedNode.status === "Shortage"
                          ? "rgba(225, 29, 72, 0.4)"
                          : selectedNode.status === "<36h Surplus"
                          ? "rgba(217, 119, 6, 0.4)"
                          : "rgba(16, 185, 129, 0.4)"
                      }`,
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "999px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {selectedNode.status === "Shortage"
                      ? "CRITICAL SHORTAGE"
                      : selectedNode.status === "<36h Surplus"
                      ? "<36H EXPIRY RISK"
                      : justStabilized || selectedNode.netBalance >= 0
                      ? "● OPTIMAL BUFFER (STABILIZED)"
                      : "OPTIMAL BUFFER"}
                  </span>

                </div>



                <button

                  type="button"

                  onClick={() => onSelectHospital(null)}

                  style={{

                    background: "rgba(255, 255, 255, 0.12)",

                    border: "none",

                    color: "#D1D5DB",

                    width: "28px",

                    height: "28px",

                    borderRadius: "50%",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "center",

                    cursor: "pointer",

                  }}

                  title="Close inspector"

                >

                  <X size={14} color="#FFFFFF" />

                </button>

              </div>



              <div>

                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.25 }}>

                  {selectedNode.fullName}

                </h4>

                <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#9CA3AF" }}>

                  {selectedNode.city}

                </p>

              </div>



              {/* 3-Column Dark Telemetry Strip */}

              <div

                style={{

                  display: "grid",

                  gridTemplateColumns: "repeat(3, 1fr)",

                  gap: "6px",

                  background: "rgba(255, 255, 255, 0.06)",

                  borderRadius: "10px",

                  padding: "8px 10px",

                  marginTop: "4px",

                }}

              >

                <div style={{ display: "flex", flexDirection: "column" }}>

                  <span style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 700 }}>

                    Total Stock

                  </span>

                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#FFFFFF" }}>

                    {selectedNode.stock}u

                  </span>

                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>

                  <span style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 700 }}>

                    &lt;36h Expiry

                  </span>

                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#F59E0B" }}>

                    {selectedNode.exp36}u

                  </span>

                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>

                  <span style={{ fontSize: "9px", color: "#9CA3AF", textTransform: "uppercase", fontWeight: 700 }}>

                    Net Balance

                  </span>

                  <span

                    style={{

                      fontSize: "15px",

                      fontWeight: 800,

                      color: selectedNode.netBalance < 0 ? "#F87171" : "#34D399",

                    }}

                  >

                    {selectedNode.netBalance > 0 ? `+${selectedNode.netBalance}u` : `${selectedNode.netBalance}u`}

                  </span>

                </div>

              </div>

            </div>



            {/* Middle Section: Real Biological 8-Group ABO Inventory Grid */}

            <div

              style={{

                padding: "14px 18px",

                overflowY: "auto",

                flex: 1,

                display: "flex",

                flexDirection: "column",

                gap: "12px",

              }}

            >

              <div>

                <div

                  style={{

                    fontSize: "10px",

                    fontWeight: 800,

                    letterSpacing: "0.08em",

                    color: "#4B5563",

                    marginBottom: "8px",

                  }}

                >

                  LIVE ABO / RH INVENTORY RESERVES

                </div>



                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>

                  {aboInventoryBreakdown.map((item) => {

                    return (

                      <div

                        key={item.type}

                        style={{

                          background: item.isAlert ? "#FEF2F2" : item.isOptimal ? "#F0FDF4" : "#F8FAFC",

                          border: item.isAlert

                            ? "1.5px solid #FCA5A5"

                            : item.isOptimal

                            ? "1.5px solid #86EFAC"

                            : "1px solid #E2E8F0",

                          borderRadius: "10px",

                          padding: "8px 9px",

                          display: "flex",

                          flexDirection: "column",

                          gap: "3px",

                        }}

                      >

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                          <span style={{ fontSize: "12px", fontWeight: 800, color: "#111827" }}>

                            {item.type}

                          </span>

                          {item.isAlert && (

                            <span

                              style={{

                                width: "6px",

                                height: "6px",

                                borderRadius: "50%",

                                background: "#E11D48",

                              }}

                            />

                          )}

                        </div>

                        <span

                          style={{

                            fontSize: "14px",

                            fontWeight: 800,

                            color: item.isAlert ? "#DC2626" : "#1F2937",

                          }}

                        >

                          {item.units}u

                        </span>

                        <div

                          style={{

                            width: "100%",

                            height: "3.5px",

                            background: "#E5E7EB",

                            borderRadius: "999px",

                            overflow: "hidden",

                          }}

                        >

                          <div

                            style={{

                              height: "100%",

                              width: `${item.fillPct}%`,

                              background: item.isAlert ? "#E11D48" : item.isOptimal ? "#15997A" : "#64748B",

                              borderRadius: "999px",

                            }}

                          />

                        </div>

                      </div>

                    );

                  })}

                </div>

              </div>



              {/* Active Courier Telemetry Feed for this Hospital */}

              <div

                style={{

                  background: "#F8FAFC",

                  border: "1px solid #E2E8F0",

                  borderRadius: "12px",

                  padding: "10px 12px",

                }}

              >

                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>

                  <Truck size={13} color="#15997A" />

                  <span

                    style={{

                      fontSize: "9.5px",

                      fontWeight: 800,

                      color: "#15997A",

                      letterSpacing: "0.06em",

                    }}

                  >

                    ACTIVE COLD-CHAIN TELEMETRY

                  </span>

                </div>

                <p style={{ margin: "2px 0 6px", fontSize: "11px", color: "#374151", fontWeight: 600 }}>

                  {selectedNode.activeCourierText}

                </p>

                <div style={{ display: "flex", gap: "6px" }}>

                  <span

                    style={{

                      display: "inline-flex",

                      alignItems: "center",

                      gap: "3px",

                      background: "#FFFFFF",

                      border: "1px solid #E2E8F0",

                      borderRadius: "6px",

                      padding: "2px 6px",

                      fontSize: "9.5px",

                      color: "#6B7280",

                    }}

                  >

                    <Clock size={10} /> Dynamic GPS Tracked

                  </span>

                  <span

                    style={{

                      display: "inline-flex",

                      alignItems: "center",

                      gap: "3px",

                      background: "#FFFFFF",

                      border: "1px solid #E2E8F0",

                      borderRadius: "6px",

                      padding: "2px 6px",

                      fontSize: "9.5px",

                      color: "#6B7280",

                    }}

                  >

                    <ShieldAlert size={10} /> 22.0°C Agitated

                  </span>

                </div>

              </div>

            </div>



            {/* Bottom Action Footer */}

            <div

              style={{

                padding: "12px 18px",

                borderTop: "1px solid #E5E7EB",

                background: "#FAFAFA",

                flexShrink: 0,

              }}

            >

                            <button
                type="button"
                onClick={handleDrawerDispatch}
                disabled={isDispatching}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: justStabilized ? "#10B981" : "#15997A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(21, 153, 122, 0.28)",
                  transition: "all 0.2s ease",
                }}
              >
                {justStabilized ? (
                  <>
                    <CheckCircle2 size={15} strokeWidth={2.5} />
                    <span>✓ +16u Dispatched & Stabilized!</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} strokeWidth={2.5} />
                    <span>+ Dispatch Emergency Units to {selectedNode.code}</span>
                  </>
                )}
              </button>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}

