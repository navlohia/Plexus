import { getRealRoadCorridor } from "../../lib/delhiRoadCorridors";
import { useState, useMemo, useEffect, useCallback } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plane,
  X,
  Send,
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
interface HospitalMeta {
  code: string;
  short: string;
  fullName: string;
  city: string;
  coords: [number, number]; // [lng, lat]
  viability: number;
  urgency: number;
  status: "Shortage" | "Expiring" | "Optimal";
  barColor: "crimson" | "amber" | "emerald";
  stock: number;
  exp36: number;
  netBalance: number;
  activeCourierText: string;
}

const HOSPITAL_REGISTRY: Record<string, HospitalMeta> = {
  "ND-01": { code: "AIM", short: "AIIMS Trauma", fullName: "AIIMS Trauma & Dengue Center", city: "Central Delhi · Level-1 Apex Trauma", coords: [77.209, 28.567], viability: 38, urgency: 94, status: "Shortage", barColor: "crimson", stock: 96, exp36: 18, netBalance: -14, activeCourierText: "Inbound: Fortis Noida · 8u O+ PLT · 14m ETA" },
  "ND-02": { code: "SFD", short: "Safdarjung", fullName: "Safdarjung Super Specialty", city: "South Delhi · Tertiary Trauma Center", coords: [77.195, 28.552], viability: 52, urgency: 81, status: "Shortage", barColor: "crimson", stock: 49, exp36: 11, netBalance: -18, activeCourierText: "Inbound: Max Saket · 6u B+ PLT · 11m ETA · 21.9°C" },
  "ND-03": { code: "MAX", short: "Max Saket", fullName: "Max Super Specialty Saket", city: "South Delhi · Quaternary Hub", coords: [77.214, 28.530], viability: 76, urgency: 62, status: "Optimal", barColor: "amber", stock: 106, exp36: 8, netBalance: 12, activeCourierText: "Outbound: Safdarjung · 6u B+ PLT · In-Transit" },
  "ND-04": { code: "N62", short: "Fortis Noida", fullName: "Fortis Hospital Sec-62 Noida", city: "Noida Sec-62 · Corridor Donor Hub", coords: [77.330, 28.620], viability: 89, urgency: 74, status: "Expiring", barColor: "amber", stock: 93, exp36: 28, netBalance: 24, activeCourierText: "Outbound: GTB Hospital · 8u O+ PLT · 18m ETA" },
  "ND-05": { code: "MDT", short: "Medanta Hub", fullName: "Medanta The Medicity Hub", city: "Gurugram NH-48 · Super Cluster", coords: [77.118, 28.535], viability: 84, urgency: 68, status: "Expiring", barColor: "amber", stock: 135, exp36: 24, netBalance: 18, activeCourierText: "Outbound: GTB Hospital · 6u O- PLT · 32m ETA" },
  "ND-06": { code: "FTN", short: "Fortis Okhla", fullName: "Fortis Escorts Heart Okhla", city: "South Delhi · Cardio Specialty", coords: [77.278, 28.560], viability: 71, urgency: 65, status: "Optimal", barColor: "amber", stock: 72, exp36: 7, netBalance: 6, activeCourierText: "Standing Reserve · Zero Spoilage Risk" },
  "ND-07": { code: "GTB", short: "GTB East Delhi", fullName: "GTB Hospital Dilshad Garden", city: "East Delhi · Dengue Surge Epicenter", coords: [77.309, 28.665], viability: 31, urgency: 96, status: "Shortage", barColor: "crimson", stock: 68, exp36: 19, netBalance: -18, activeCourierText: "Inbound: Medanta Hub · 6u O- Emergency Buffer" },
  "ND-08": { code: "RML", short: "RML Central", fullName: "Dr. RML Hospital Connaught", city: "Central Delhi · Civil Services Apex", coords: [77.202, 28.625], viability: 49, urgency: 79, status: "Shortage", barColor: "crimson", stock: 102, exp36: 16, netBalance: -8, activeCourierText: "Inbound: Fortis Vasant · 4u A- · 16m ETA" },
  "ND-09": { code: "LNJ", short: "Lok Nayak", fullName: "Lok Nayak Jai Prakash (LNJP)", city: "Central Delhi · Municipal Hub", coords: [77.239, 28.636], viability: 44, urgency: 86, status: "Shortage", barColor: "crimson", stock: 88, exp36: 17, netBalance: -12, activeCourierText: "Inbound: Apollo Sarita · 12u A+ PLT · 19m ETA" },
  "ND-10": { code: "SGR", short: "Sir Ganga Ram", fullName: "Sir Ganga Ram Hospital", city: "Old Rajinder · Multi-Specialty", coords: [77.189, 28.618], viability: 63, urgency: 58, status: "Optimal", barColor: "amber", stock: 94, exp36: 9, netBalance: 4, activeCourierText: "Buffer Prepositioned · 24h Window Steady" },
  "ND-11": { code: "APL", short: "Apollo Sarita", fullName: "Indraprastha Apollo Hospital", city: "Sarita Vihar · South Corridor Hub", coords: [77.284, 28.540], viability: 92, urgency: 45, status: "Optimal", barColor: "amber", stock: 112, exp36: 6, netBalance: 22, activeCourierText: "Outbound: Lok Nayak · 12u A+ Dispatched" },
  "ND-12": { code: "RGV", short: "Rajiv Gandhi", fullName: "Rajiv Gandhi Super Specialty", city: "East Delhi · Oncology & Hematology", coords: [77.318, 28.660], viability: 35, urgency: 91, status: "Shortage", barColor: "crimson", stock: 65, exp36: 15, netBalance: -16, activeCourierText: "Inbound: Jaypee Noida · 4u O+ · 29m ETA" },
  "ND-13": { code: "FSB", short: "Fortis Vasant", fullName: "Fortis Flt Lt Rajan Dhall", city: "Vasant Kunj · South West Corridor", coords: [77.156, 28.532], viability: 78, urgency: 54, status: "Optimal", barColor: "amber", stock: 82, exp36: 7, netBalance: 8, activeCourierText: "Outbound: RML Hospital · 4u A- Replenishment" },
  "ND-14": { code: "BLK", short: "BLK-Max Pusa", fullName: "BLK-Max Super Specialty", city: "Karol Bagh · Central Corridor Hub", coords: [77.181, 28.622], viability: 58, urgency: 72, status: "Optimal", barColor: "amber", stock: 91, exp36: 11, netBalance: 2, activeCourierText: "Outbound: Saroj Rohini · 6u O+ · 20m ETA" },
  "ND-15": { code: "MPD", short: "Manipal Dwarka", fullName: "Manipal Hospital Dwarka", city: "Dwarka Sec-6 · West Corridor", coords: [77.110, 28.580], viability: 69, urgency: 63, status: "Optimal", barColor: "amber", stock: 89, exp36: 10, netBalance: 5, activeCourierText: "Standing Reserve · Balanced ABO Levels" },
  "ND-16": { code: "STP", short: "St. Stephens", fullName: "St. Stephens Hospital Tis Hazari", city: "Tis Hazari · North Central Hub", coords: [77.217, 28.655], viability: 61, urgency: 66, status: "Optimal", barColor: "amber", stock: 74, exp36: 8, netBalance: 3, activeCourierText: "Standing Reserve · 48h Viability Steady" },
  "ND-17": { code: "ROH", short: "Saroj Rohini", fullName: "Saroj Super Specialty Rohini", city: "North Delhi · Outer Ring Corridor", coords: [77.135, 28.665], viability: 33, urgency: 93, status: "Shortage", barColor: "crimson", stock: 61, exp36: 14, netBalance: -15, activeCourierText: "Inbound: BLK-Max · 6u O+ · 20m ETA" },
  "ND-18": { code: "DWK", short: "Venkateshwar", fullName: "Venkateshwar Hospital Dwarka", city: "Dwarka Sec-18 · West Trauma Wing", coords: [77.112, 28.565], viability: 74, urgency: 59, status: "Optimal", barColor: "amber", stock: 77, exp36: 8, netBalance: 6, activeCourierText: "Standing Reserve · West Corridor Stable" },
  "ND-19": { code: "GCH", short: "Paras Gurugram", fullName: "Paras Health Sector 43", city: "Gurugram · South Metro Corridor", coords: [77.140, 28.530], viability: 81, urgency: 51, status: "Optimal", barColor: "amber", stock: 83, exp36: 9, netBalance: 11, activeCourierText: "Outbound: DDU Hospital · 4u AB+ Dispatched" },
  "ND-20": { code: "NBV", short: "Jaypee Noida", fullName: "Jaypee Hospital Sector 128", city: "Noida Sec-128 · Expressway Corridor", coords: [77.330, 28.545], viability: 86, urgency: 64, status: "Expiring", barColor: "amber", stock: 95, exp36: 18, netBalance: 16, activeCourierText: "Outbound: Rajiv Gandhi · 4u O+ Dispatched" },
  "ND-21": { code: "DRB", short: "DDU Hospital", fullName: "Deen Dayal Upadhyay Hospital", city: "Hari Nagar · West Trauma Apex", coords: [77.125, 28.615], viability: 41, urgency: 87, status: "Shortage", barColor: "crimson", stock: 69, exp36: 16, netBalance: -11, activeCourierText: "Inbound: Paras Gurugram · 4u AB+ · 34m ETA" },
  "ND-22": { code: "SDP", short: "Sanjay Gandhi", fullName: "Sanjay Gandhi Memorial Mangolpuri", city: "Mangolpuri · North West ICU Block", coords: [77.120, 28.660], viability: 29, urgency: 98, status: "Shortage", barColor: "crimson", stock: 58, exp36: 18, netBalance: -20, activeCourierText: "OR-Tools Priority Routing Inbound" },
  "ND-23": { code: "NH4", short: "Artemis Hub", fullName: "Artemis Hospital Sector 51", city: "Gurugram · NH-48 Express Node", coords: [77.130, 28.538], viability: 88, urgency: 53, status: "Optimal", barColor: "amber", stock: 104, exp36: 10, netBalance: 15, activeCourierText: "Universal O- Buffer Available (14u)" },
  "ND-24": { code: "MXP", short: "Max Patparganj", fullName: "Max Super Specialty Patparganj", city: "East Delhi · IP Extension Hub", coords: [77.304, 28.630], viability: 73, urgency: 67, status: "Optimal", barColor: "amber", stock: 86, exp36: 11, netBalance: 7, activeCourierText: "Standing Reserve · East Delhi Support" },
  "ND-25": { code: "PRS", short: "Holy Family", fullName: "Holy Family Hospital Okhla", city: "Okhla · Jamia Nagar Cluster", coords: [77.273, 28.548], viability: 65, urgency: 61, status: "Optimal", barColor: "amber", stock: 79, exp36: 9, netBalance: 4, activeCourierText: "Standing Reserve · Low Spoilage Risk" },
};

// 5 Primary Arterial Express Highway Corridors across Delhi-NCR (Never cluttered stringy spaghetti!)
const PRIMARY_EXPRESS_CORRIDORS = [
  { source: "ND-04", target: "ND-01", blood: "O+", units: 8, name: "Trans-Yamuna DND Express Corridor" },   // Fortis Noida -> AIIMS
  { source: "ND-05", target: "ND-07", blood: "O-", units: 6, name: "NH-48 / Central Arterial Corridor" },     // Medanta Hub -> GTB
  { source: "ND-11", target: "ND-09", blood: "A+", units: 12, name: "Mathura Road / Civil Services Link" },  // Apollo Sarita -> Lok Nayak
  { source: "ND-03", target: "ND-02", blood: "B+", units: 6, name: "South Delhi Trauma Arterial" },          // Max Saket -> Safdarjung
  { source: "ND-14", target: "ND-17", blood: "O+", units: 6, name: "Outer Ring Road Express Corridor" },     // BLK-Max -> Saroj Rohini
];

export default function FlightyTVMapTab({
  state,
  selectedHospitalId,
  activeCrisisId,
  onStopCrisis,
  onSelectHospital,
  onOpenDispatch,
}: FlightyTVMapTabProps) {
  const activeCrisis = activeCrisisId && CRISIS_SCENARIOS[activeCrisisId] ? CRISIS_SCENARIOS[activeCrisisId] : null;
  const [viewState, setViewState] = useState(INITIAL_VIEW);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "SHORTAGE" | "EXPIRY">("ALL");
  const [showArcs, setShowArcs] = useState(true);

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

  // Enriched hospital list with unified live status calculation
  const hospitalList = useMemo(() => {
    const liveNodes = Array.isArray(state?.nodes) && state.nodes.length > 0 ? state.nodes : [];
    return Object.entries(HOSPITAL_REGISTRY).map(([id, meta]) => {
      const liveNode = liveNodes.find((n) => n && n.id === id);
      const inv = liveNode?.inventory_by_blood_and_age;
      const stock = inv
        ? Object.values(inv).reduce(
            (s, b) => s + (b ? Object.values(b).reduce((acc, v) => acc + (Number(v) || 0), 0) : 0),
            0
          )
        : meta.stock;
      const netBal = liveNode ? liveNode.net_balance : meta.netBalance;

      // Unified status calculation
      let status: "Shortage" | "Expiring" | "Optimal" = "Optimal";
      let barColor: "crimson" | "amber" | "emerald" = "emerald";

      if (stock < 85 || netBal < -30) {
        status = "Shortage";
        barColor = "crimson";
      } else if (stock >= 125 || netBal > 15) {
        status = "Expiring";
        barColor = "amber";
      } else {
        status = "Optimal";
        barColor = "emerald";
      }

      return {
        id,
        ...meta,
        status,
        barColor,
        stock,
        netBalance: netBal !== undefined ? netBal : meta.netBalance,
        liveInv: inv,
      };
    });
  }, [state.nodes]);

  const filteredHospitals = useMemo(() => {
    let list = hospitalList;
    if (activeFilter === "SHORTAGE") {
      list = hospitalList.filter((h) => h.status === "Shortage");
    } else if (activeFilter === "EXPIRY") {
      list = hospitalList.filter((h) => h.status === "Expiring");
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
                : h.status === "Expiring"
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

        {/* Left White Atmospheric Gradient Scrim */}
        <div className="flighty-white-fog-scrim" />

        {/* The Left Column of Light-Gray Flighty Cards */}
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
                      <span className="flighty-stat-val">{node.viability}%</span>
                    </div>

                    {/* Stat 2: Expiry Urgency % */}
                    <div className="flighty-stat-item">
                      <span className="flighty-stat-circle">
                        <ArrowDownRight size={11} strokeWidth={2.5} />
                      </span>
                      <span className="flighty-stat-val">{node.urgency}%</span>
                    </div>
                  </div>

                  {/* Thin 3.5px Progress Bar on #D8DCE3 track */}
                  <div className="flighty-progress-track">
                    <div
                      className="flighty-progress-fill"
                      style={{
                        width: `${node.urgency}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── REDESIGNED RIGHT-HAND FLIGHTY TERMINAL PASS CARD (100% INLINE STYLED) ── */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              bottom: "18px",
              right: "18px",
              width: "385px",
              maxHeight: "calc(100% - 36px)",
              background: "#FFFFFF",
              borderRadius: "18px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #E5E7EB",
              zIndex: 45,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif",
            }}
          >
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
                          : selectedNode.status === "Expiring"
                          ? "rgba(217, 119, 6, 0.2)"
                          : "rgba(16, 185, 129, 0.2)",
                      color:
                        selectedNode.status === "Shortage"
                          ? "#FDA4AF"
                          : selectedNode.status === "Expiring"
                          ? "#FCD34D"
                          : "#6EE7B7",
                      border: `1px solid ${
                        selectedNode.status === "Shortage"
                          ? "rgba(225, 29, 72, 0.4)"
                          : selectedNode.status === "Expiring"
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
                      : selectedNode.status === "Expiring"
                      ? "<36H EXPIRY RISK"
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
                onClick={() => onOpenDispatch(selectedNode.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "#15997A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                <Send size={13} />
                <span>+ Dispatch Emergency Units to {selectedNode.code}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
