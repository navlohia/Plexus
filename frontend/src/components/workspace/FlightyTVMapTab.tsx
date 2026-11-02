import { getRealRoadCorridor } from "../../lib/delhiRoadCorridors";
import { NCR_HOSPITAL_METAS, recalculateHospitalTelemetry } from "../../lib/hospitalTelemetry";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import { useStoryStore } from "../../store/storyStore";
import { computeGreedyPillPlacements, type PillPlacement } from "../../story/greedyPillPlacement";
import { getRoutesForHospital, type ActiveHospitalRoute } from "../../story/routeEngine";
import HospitalDetailSheet from "./HospitalDetailSheet";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import type { TickState } from "../../types";

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



// CARTO styles imported from storyStore






// Distinct coordinates and realistic statistics for all 25 hospitals

// All coordinates are strictly bounded inside lat: 28.525..28.670, lng: 77.100..77.340





const HOSPITAL_REGISTRY: any = NCR_HOSPITAL_METAS;




// 6 Distinct Arterial Express Highway Corridors across Delhi-NCR (Varied Donor Hubs!)
const PRIMARY_EXPRESS_CORRIDORS = [
  { source: "ND-03", target: "ND-01", blood: "O+", units: 8, eta: 11, name: "South Delhi Apex Arterial (Max Saket to AIIMS)", isEmergency: true },
  { source: "ND-04", target: "ND-07", blood: "O+", units: 8, eta: 16, name: "Trans-Yamuna Expressway (Fortis Noida to GTB)", isEmergency: false },
  { source: "ND-05", target: "ND-18", blood: "B+", units: 6, eta: 14, name: "Dwarka Expressway Corridor (Medanta to Venkateshwar)", isEmergency: false },
  { source: "ND-11", target: "ND-09", blood: "A+", units: 12, eta: 18, name: "Mathura Road Corridor (Apollo Sarita to Lok Nayak)", isEmergency: false },
  { source: "ND-23", target: "ND-19", blood: "AB+", units: 6, eta: 8, name: "Gurugram Supercluster Arterial (Artemis to Paras)", isEmergency: true },
  { source: "ND-14", target: "ND-10", blood: "O+", units: 6, eta: 9, name: "Central Delhi Arterial (BLK-Max to Ganga Ram)", isEmergency: false },
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

  const setViewState = useStoryStore((state) => state.setViewState);
  const setMapOverlays = useStoryStore((state) => state.setMapOverlays);
  const mapInstance = useStoryStore((state) => state.mapInstance);

  const [activeFilter, setActiveFilter] = useState<"ALL" | "SHORTAGE" | "EXPIRY">("ALL");

  const [showArcs] = useState(true);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [pillPlacements, setPillPlacements] = useState<Record<string, PillPlacement>>({});
  const savedCameraRef = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);



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

  // Greedy Pill Placement recomputation (Spec §3 & §9b)
  // Recomputed only on zoom-end / move-end / resize, NEVER per frame
  const recalculatePills = useCallback(() => {
    const map = (window as any).__map;
    if (!map) return;
    const items = hospitalList.map((h) => ({
      id: h.id,
      code: h.code,
      coords: h.coords as [number, number],
      status: h.status,
      supplyRatio: h.supplyRatio,
      burnIndex: h.burnIndex,
      isCrisisAffected: Boolean(activeCrisis && activeCrisis.affectedNodeIds.includes(h.id)),
    }));
    const result = computeGreedyPillPlacements(map, items, selectedHospitalId);
    setPillPlacements(result.placements);
    (window as any).__pillStats = {
      overlapCount: result.overlapCount,
      hiddenCount: result.hiddenCount,
      placements: result.placements,
    };
  }, [hospitalList, selectedHospitalId, activeCrisis]);

  useEffect(() => {
    const map = (window as any).__map;
    recalculatePills();
    if (map) {
      map.on('zoomend', recalculatePills);
      map.on('moveend', recalculatePills);
    }
    window.addEventListener('resize', recalculatePills);
    return () => {
      if (map) {
        map.off('zoomend', recalculatePills);
        map.off('moveend', recalculatePills);
      }
      window.removeEventListener('resize', recalculatePills);
    };
  }, [recalculatePills]);



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



  // Routes for selected hospital (Spec §13 & §14)
  const activeHospitalRoutes = useMemo(() => {
    if (!selectedHospitalId) return { type: 'optimal' as const, routes: [] as ActiveHospitalRoute[], partnerIds: [] as string[] };
    return getRoutesForHospital(selectedHospitalId);
  }, [selectedHospitalId]);

  const handleFocusRoute = useCallback((route: ActiveHospitalRoute) => {
    const map = (window as any).__map;
    if (!map || !route.coords || route.coords.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of route.coords) {
      minX = Math.min(minX, pt[0]);
      maxX = Math.max(maxX, pt[0]);
      minY = Math.min(minY, pt[1]);
      maxY = Math.max(maxY, pt[1]);
    }
    map.fitBounds([[minX, minY], [maxX, maxY]], {
      padding: isMobile
        ? { left: 24, right: 24, top: 80, bottom: 260 }
        : { left: 432, right: 424, top: 88, bottom: 72 },
      duration: 800,
    });
  }, [isMobile]);

  // Camera fitBounds on selection and restore on close (Spec §13 & §14)
  useEffect(() => {
    const map = (window as any).__map;
    if (!map) return;

    if (selectedHospitalId) {
      if (!savedCameraRef.current) {
        const center = map.getCenter();
        savedCameraRef.current = {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };
      }

      const routeInfo = getRoutesForHospital(selectedHospitalId);
      const hospitalIds = [selectedHospitalId, ...routeInfo.partnerIds];
      const coordsList: [number, number][] = [];

      for (const hid of hospitalIds) {
        const meta = NCR_HOSPITAL_METAS[hid];
        if (meta) coordsList.push(meta.coords);
      }

      if (coordsList.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [lng, lat] of coordsList) {
          minX = Math.min(minX, lng); maxX = Math.max(maxX, lng);
          minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
        }

        map.fitBounds([[minX, minY], [maxX, maxY]], {
          padding: isMobile
            ? { left: 24, right: 24, top: 80, bottom: 260 }
            : { left: 432, right: 424, top: 88, bottom: 72 },
          duration: 800,
          maxZoom: 12.8,
        });
      }
    } else {
      if (savedCameraRef.current) {
        const saved = savedCameraRef.current;
        map.easeTo({
          center: saved.center,
          zoom: saved.zoom,
          pitch: saved.pitch,
          bearing: saved.bearing,
          duration: 650,
        });
        savedCameraRef.current = null;
      }
    }
  }, [selectedHospitalId, isMobile]);

  // Keyboard navigation ↑ / ↓ through hospitals (Spec §13)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredHospitals.findIndex((h) => h.id === selectedHospitalId);
        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < filteredHospitals.length - 1 ? currentIndex + 1 : 0;
          onSelectHospital(filteredHospitals[nextIndex]?.id || null);
        } else {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredHospitals.length - 1;
          onSelectHospital(filteredHospitals[prevIndex]?.id || null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredHospitals, selectedHospitalId, onSelectHospital]);







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
        const isHovered = hoveredRouteId ? (arc.source === hoveredRouteId || arc.target === hoveredRouteId || (arc as any).id === hoveredRouteId) : false;
        const isDonorSurplus = src.status !== "Shortage";
        const isExpiryRisk = src.status === "<36h Surplus";
        // SPEC §9, §11, §16: Quiet road-snapped green lines (green-600 core at 45%, 1.5 px). ZERO red or orange lines!
        const routeColor = isHovered
          ? "rgba(22, 163, 74, 1.0)"
          : isSelected
          ? "rgba(23, 128, 95, 0.90)"
          : "rgba(23, 128, 95, 0.45)";

        const roadCoords = getRealRoadCorridor(src.coords, tgt.coords, arc.source, arc.target, handleRouteLoaded);

        return {
          type: "Feature" as const,
          properties: {
            source: arc.source,
            target: arc.target,
            blood: arc.blood,
            units: arc.units,
            eta: (arc as any).eta || 14,
            isDonorSurplus,
            isExpiryRisk,
            isEmergency: false,
            isSelected,
            routeColor,
            haloColor: "rgba(31, 154, 116, 0.15)",
          },
          geometry: {
            type: "LineString" as const,
            coordinates: roadCoords,
          },
        };
      })
      .filter(Boolean) as GeoJSON.Feature[];

    return { type: "FeatureCollection", features };
  }, [showArcs, activeRoutes, selectedHospitalId, hoveredRouteId]);

  
  const mapOverlays = useMemo(() => (
    <>
      {/* Detailed Arterial Corridors: Soft Ambient Glow Halo, Road Casing Bed & Core Arterial Line */}
      {showArcs && (
        <>
          <Source id="route-arcs" type="geojson" data={routeGeoJSON}>
            {/* Layer 1 (Soft Outer Halo): wide ambient glow in semantic color */}
            <Layer
              id="route-halo-layer"
              type="line"
              paint={{
                "line-color": ["get", "routeColor"],
                "line-width": ["case", ["get", "isSelected"], 14, 10],
                "line-opacity": ["case", ["get", "isSelected"], 0.35, 0.20],
                "line-blur": 4.0,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />

            {/* Layer 2 (Road Casing Bed): clean paper casing giving real arterial structure (Spec §12) */}
            <Layer
              id="route-casing-layer"
              type="line"
              paint={{
                "line-color": "#F3EEE4",
                "line-width": ["case", ["get", "isSelected"], 4.5, 3.5],
                "line-opacity": 0.95,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />

            {/* Layer 3 (Core Arterial Road Line): quiet road-snapped green vector line (Spec §11 & §12) */}
            <Layer
              id="route-core-layer"
              type="line"
              paint={{
                "line-color": ["get", "routeColor"],
                "line-width": ["case", ["get", "isSelected"], 2.5, 1.5],
                "line-opacity": 1.0,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        </>
      )}



                    {/* ── HIGH-PRIORITY INSTANT-CLICK HOSPITAL MAP MARKERS ── */}

          {hospitalList.map((h) => {
            const isSelected = selectedHospitalId === h.id;
            const isHovered = hoveredHospitalId === h.id;
            const isCrisisAffected = activeCrisis && activeCrisis.affectedNodeIds.includes(h.id);

            const dotColor =
              isCrisisAffected || h.status === "Shortage"
                ? "#E11D48" // Crimson
                : h.status === "<36h Surplus"
                ? "#F59E0B" // Amber
                : "#15997A"; // Emerald

            const placement = pillPlacements[h.id] || { visible: false, anchor: 'bottom' };
            const isPillVisible = isSelected || isHovered || placement.visible;
            const anchorClass = `pill-anchor-${placement.anchor}`;

            return (
              <Marker
                key={h.id}
                longitude={h.coords[0]}
                latitude={h.coords[1]}
                anchor="center"
                style={{ zIndex: isSelected || isHovered ? 35 : isCrisisAffected ? 15 : 10 }}
              >
                <button
                  type="button"
                  className={`flighty-pin-btn${isSelected ? " pin-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHospital(h.id);
                  }}
                  onMouseEnter={() => setHoveredHospitalId(h.id)}
                  onMouseLeave={() => setHoveredHospitalId(null)}
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
                    className={`flighty-pin-dot${isSelected || isHovered ? " dot-highlighted" : ""}`}
                    style={{ backgroundColor: dotColor }}
                  />

                  {/* Anchored Crisp Code Pill Badge (Greedy Placement per Spec §3) */}
                  <div
                    className={`flighty-pin-pill ${anchorClass} ${isPillVisible ? "pill-visible" : "pill-hidden"}${isSelected || isHovered ? " pill-highlighted" : ""}`}
                  >
                    {h.code}
                  </div>
                </button>
              </Marker>
            );
          })}
    </>
  ), [showArcs, routeGeoJSON, mapInstance, hospitalList, selectedHospitalId, activeCrisis, onSelectHospital, pillPlacements, hoveredHospitalId]);

  useEffect(() => {
    setMapOverlays(mapOverlays);
    return () => {
      setMapOverlays(null);
    };
  }, [mapOverlays, setMapOverlays]);

  return (
    <div
      className="flighty-tv-outer-shell"
      style={{
        background: "transparent",
        padding: "12px 20px 18px",
        gap: 16,
        height: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
      <div className="flighty-clipped-map-frame" style={{ background: "transparent", position: "relative", flex: 1 }}>
        {/* MapLibre Canvas with Carto Positron Light */}
        <div className="flighty-map-canvas-placeholder" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

        {/* Floating Paper-Raised Filter Bar (Spec §11: All NCR (25) · Shortages · <36h Risk) */}
        <div
          className="flighty-floating-filter-bar"
          style={{
            position: 'absolute',
            top: 16,
            left: isMobile ? 12 : 360,
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 6px',
            background: 'var(--color-paper-raised, #FAF7F0)',
            border: '1px solid rgba(20, 27, 45, 0.08)',
            borderRadius: '999px',
            boxShadow: '0 2px 8px rgba(20, 27, 45, 0.04)',
          }}
        >
          <button
            type="button"
            className={`flighty-pill-btn${activeFilter === "ALL" ? " pill-active" : ""}`}
            onClick={() => setActiveFilter("ALL")}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              background: activeFilter === 'ALL' ? '#141B2D' : 'transparent',
              color: activeFilter === 'ALL' ? '#FAF7F0' : 'rgba(20, 27, 45, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All NCR ({hospitalList.length})
          </button>
          <button
            type="button"
            className={`flighty-pill-btn${activeFilter === "SHORTAGE" ? " pill-active" : ""}`}
            onClick={() => setActiveFilter("SHORTAGE")}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              background: activeFilter === 'SHORTAGE' ? '#141B2D' : 'transparent',
              color: activeFilter === 'SHORTAGE' ? '#FAF7F0' : 'rgba(20, 27, 45, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Shortages
          </button>
          <button
            type="button"
            className={`flighty-pill-btn${activeFilter === "EXPIRY" ? " pill-active" : ""}`}
            onClick={() => setActiveFilter("EXPIRY")}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              background: activeFilter === 'EXPIRY' ? '#141B2D' : 'transparent',
              color: activeFilter === 'EXPIRY' ? '#FAF7F0' : 'rgba(20, 27, 45, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            &lt;36h Risk
          </button>
        </div>

        {/* Left White Atmospheric Gradient Scrim (Desktop Only) */}
        {!isMobile && <div className="flighty-white-fog-scrim" />}

        {/* The Left Column of Light-Gray Flighty Cards (Desktop Only - Hidden on Mobile) */}
        {!isMobile && (
          <div className="flighty-left-cards-stack" style={{ zIndex: 40 }}>
            {/* Spec §11: Add a header line: 25 hospitals · by urgency (mono 11px) */}
            <div
              className="flighty-stack-header"
              style={{
                padding: '6px 12px 10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'rgba(20, 27, 45, 0.55)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              25 hospitals · by urgency
            </div>

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
                className={`flighty-card${isSelected ? " flighty-card-selected" : ""}${hoveredHospitalId === node.id ? " flighty-card-hovered" : ""}`}
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
                onMouseEnter={() => setHoveredHospitalId(node.id)}
                onMouseLeave={() => setHoveredHospitalId(null)}
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

        {/* 48px paper-to-transparent fade at the bottom (Spec §9b) */}
        {!isMobile && (
          <div
            className="flighty-panel-bottom-fade"
            style={{
              position: "absolute",
              bottom: "16px",
              left: "18px",
              width: "320px",
              height: "48px",
              pointerEvents: "none",
              zIndex: 41,
              background:
                "linear-gradient(to bottom, rgba(243, 238, 228, 0) 0%, rgba(243, 238, 228, 0.95) 75%, rgba(243, 238, 228, 1) 100%)",
            }}
          />
        )}



        {/* ── REDESIGNED HOSPITAL DETAIL SIDE SHEET (LANDING_SPEC v5 Section 14) ── */}
        {selectedNode && (
          <HospitalDetailSheet
            hospital={{
              id: selectedNode.id,
              code: selectedNode.code,
              short: selectedNode.short,
              fullName: selectedNode.fullName,
              city: selectedNode.city,
              coords: selectedNode.coords as [number, number],
              status: selectedNode.status,
              stock: selectedNode.stock,
              exp36: selectedNode.exp36,
              netBalance: selectedNode.netBalance,
              liveInv: (selectedNode as any).liveInv,
              targetBaseline: NCR_HOSPITAL_METAS[selectedNode.id]?.targetBaseline,
              isTrauma: NCR_HOSPITAL_METAS[selectedNode.id]?.isTrauma,
            }}
            routes={activeHospitalRoutes.routes}
            isCandidateMode={activeHospitalRoutes.type === 'candidates'}
            isMobile={isMobile}
            onClose={() => onSelectHospital(null)}
            onDispatch={(id, units) => {
              if (onDirectDispatch) onDirectDispatch(id, units);
              else onOpenDispatch(id);
            }}
            onFocusRoute={handleFocusRoute}
            onHoverRoute={(rId) => setHoveredRouteId(rId)}
          />
        )}

      </div>

    </div>

  );

}

