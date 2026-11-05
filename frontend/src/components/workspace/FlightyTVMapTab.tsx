import { getRealRoadCorridor } from "../../lib/delhiRoadCorridors";
import { NCR_HOSPITAL_METAS, recalculateHospitalTelemetry } from "../../lib/hospitalTelemetry";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Marker, Source, Layer } from "react-map-gl/maplibre";
import { useStoryStore } from "../../store/storyStore";
import { computeGreedyPillPlacements, type PillPlacement } from "../../story/greedyPillPlacement";
import {
  getRoutesForHospital,
  type ActiveHospitalRoute,
  DEFAULT_SOLVER_TRANSFERS,
  PRECOMPUTED_PAIRS,
} from "../../story/routeEngine";
import HospitalDetailSheet from "./HospitalDetailSheet";

import "maplibre-gl/dist/maplibre-gl.css";

import {
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import type { TickState } from "../../types";

import { CRISIS_SCENARIOS } from "../../lib/crisisData";
import { useDispatchStore } from "../../data/dispatch";
import { usePlexusStore } from "../../context/PlexusStore";



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
  const plexus = usePlexusStore();

  const setViewState = useStoryStore((state) => state.setViewState);
  const setMapOverlays = useStoryStore((state) => state.setMapOverlays);
  const mapInstance = useStoryStore((state) => state.mapInstance);

  const [activeFilter, setActiveFilter] = useState<"ALL" | "SHORTAGE" | "EXPIRY">("ALL");

  const [showArcs] = useState(true);

  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null);
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  void hoveredRouteId;
  const [pillPlacements, setPillPlacements] = useState<Record<string, PillPlacement>>({});
  const savedCameraRef = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);

  // Section 3.4 & §19.5: Decouple right drawer open state from hospital selection
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Routes for selected hospital (Spec §13 & §14)
  const activeHospitalRoutes = useMemo(() => {
    if (!selectedHospitalId) return { type: 'optimal' as const, routes: [] as ActiveHospitalRoute[], partnerIds: [] as string[] };
    return getRoutesForHospital(selectedHospitalId);
  }, [selectedHospitalId]);

  // Spec §19.5 & §20: Center-zoom camera symmetrically onto hospital within the clear map area
  const centerHospitalSymmetrically = useCallback(
    (hospitalId: string, drawerOpen: boolean, duration = 850) => {
      const map = (window as any).__map || mapInstance;
      if (!map) return;

      const meta = NCR_HOSPITAL_METAS[hospitalId];
      if (!meta) return;

      if (!savedCameraRef.current) {
        const center = map.getCenter();
        savedCameraRef.current = {
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
        };
      }

      const hospCoords = meta.coords;
      const routeInfo = getRoutesForHospital(hospitalId);

      const allVertices: [number, number][] = [];
      if (routeInfo.routes && routeInfo.routes.length > 0) {
        for (const r of routeInfo.routes) {
          if (r.coords && r.coords.length > 0) {
            for (const pt of r.coords) {
              allVertices.push(pt);
            }
          }
        }
      }

      // Spec §19.5: Build bounds SYMMETRICALLY around the hospital
      // (mirror the farthest route vertex on each axis) so the hospital lands in the center
      // and every route still fits
      let maxDeltaLng = 0.035;
      let maxDeltaLat = 0.025;
      for (const [lng, lat] of allVertices) {
        const dLng = Math.abs(lng - hospCoords[0]);
        const dLat = Math.abs(lat - hospCoords[1]);
        if (dLng > maxDeltaLng) maxDeltaLng = dLng;
        if (dLat > maxDeltaLat) maxDeltaLat = dLat;
      }

      const symmetricBounds: [[number, number], [number, number]] = [
        [hospCoords[0] - maxDeltaLng, hospCoords[1] - maxDeltaLat],
        [hospCoords[0] + maxDeltaLng, hospCoords[1] + maxDeltaLat],
      ];

      const w = window.innerWidth;
      const h = window.innerHeight;
      const mob = w < 768;

      let leftPad = 0;
      let rightPad = 0;
      let topPad = 80;
      let bottomPad = 48;

      if (!mob) {
        const listEl = document.querySelector('.flighty-left-cards-stack');
        if (listEl) {
          const rect = listEl.getBoundingClientRect();
          leftPad = Math.round(rect.right) + 24;
        } else {
          leftPad = 400 + 18 + 24;
        }

        if (drawerOpen) {
          const sheetEl = document.querySelector('.hospital-side-sheet');
          if (sheetEl) {
            const rect = sheetEl.getBoundingClientRect();
            rightPad = Math.round(w - rect.left) + 24;
          } else {
            rightPad = (w >= 1600 ? 420 : 392) + 24;
          }
        } else {
          rightPad = 40;
        }

        const filterEl = document.querySelector('.flighty-floating-filter-bar');
        if (filterEl) {
          const rect = filterEl.getBoundingClientRect();
          topPad = Math.round(rect.bottom) + 16;
        } else {
          topPad = 96;
        }
      } else {
        leftPad = 24;
        rightPad = 24;
        topPad = 80;
        bottomPad = drawerOpen ? Math.round(h * 0.40) : 48;
      }

      const finalPadding = {
        left: leftPad + 40,
        right: rightPad + 40,
        top: topPad + 40,
        bottom: bottomPad + 40,
      };

      map.fitBounds(symmetricBounds, {
        padding: finalPadding,
        duration,
        maxZoom: 13.5,
        essential: true,
      });
    },
    [mapInstance]
  );

  // Section 3.4 & §19.5: ESC key / button handler (clears selection, closes drawer, restores camera)
  const handleFullDismiss = useCallback(() => {
    setIsDrawerOpen(false);
    onSelectHospital(null);
    window.location.hash = '/workspace/map';

    const map = (window as any).__map || mapInstance;
    if (map && savedCameraRef.current) {
      const saved = savedCameraRef.current;
      map.easeTo({
        center: saved.center,
        zoom: saved.zoom,
        pitch: saved.pitch,
        bearing: saved.bearing,
        duration: 1000,
        essential: true,
      });
      savedCameraRef.current = null;
    } else if (map) {
      map.easeTo({
        center: [77.20, 28.61],
        zoom: 10.6,
        duration: 1000,
        essential: true,
      });
    }
  }, [mapInstance, onSelectHospital]);

  // Section 19.5: [✕] button closes only the sheet; hospital stays selected; camera re-centers in wider clear rect (600ms)
  const handleCloseDrawerOnly = useCallback(() => {
    setIsDrawerOpen(false);
    if (selectedHospitalId) {
      setTimeout(() => {
        centerHospitalSymmetrically(selectedHospitalId, false, 600);
      }, 50);
    }
  }, [selectedHospitalId, centerHospitalSymmetrically]);

  // Section 3.2 & §19.5: Select hospital and center-zoom
  const handleSelectAndZoomHospital = useCallback(
    (hospId: string | null) => {
      if (!hospId) {
        handleFullDismiss();
        return;
      }
      onSelectHospital(hospId);
      setIsDrawerOpen(true);
      const meta = NCR_HOSPITAL_METAS[hospId];
      if (meta) {
        window.location.hash = `/workspace/map/${meta.code}`;
      }
      setTimeout(() => {
        centerHospitalSymmetrically(hospId, true, 850);
      }, 50);
    },
    [onSelectHospital, handleFullDismiss, centerHospitalSymmetrically]
  );



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



  const handleFocusRoute = useCallback((route: ActiveHospitalRoute) => {
    const map = (window as any).__map || mapInstance;
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
  }, [isMobile, mapInstance]);

  // Sync window telemetry, selection and deck.gl pressure halos (Spec §20)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__selectedHospitalId = selectedHospitalId;
      (window as any).__isDrawerOpen = isDrawerOpen;
      (window as any).__updateHalos?.(selectedHospitalId, activeHospitalRoutes.partnerIds);
    }
  }, [selectedHospitalId, isDrawerOpen, activeHospitalRoutes]);

  // Initial deep link / selection camera centering
  useEffect(() => {
    if (selectedHospitalId) {
      setIsDrawerOpen(true);
      const timer = setTimeout(() => {
        centerHospitalSymmetrically(selectedHospitalId, true, 850);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedHospitalId, centerHospitalSymmetrically]);

  // Window resize handler: update mobile breakpoint and re-center active selection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (selectedHospitalId) {
        centerHospitalSymmetrically(selectedHospitalId, isDrawerOpen, 0);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedHospitalId, isDrawerOpen, centerHospitalSymmetrically]);

  // Click on empty map canvas unselects (Spec §19.5)
  useEffect(() => {
    const map = (window as any).__map || mapInstance;
    if (!map) return;

    const onMapClick = (e: any) => {
      if (e.originalEvent && (e.originalEvent.target as HTMLElement)?.tagName === 'CANVAS') {
        if (selectedHospitalId) {
          handleFullDismiss();
        }
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [mapInstance, selectedHospitalId, handleFullDismiss]);

  // Keyboard navigation: Escape fully unselects (Spec §19.5 & §20); ↑ / ↓ cycles hospitals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedHospitalId) {
          e.preventDefault();
          handleFullDismiss();
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredHospitals.findIndex((h) => h.id === selectedHospitalId);
        if (e.key === 'ArrowDown') {
          const nextIndex = currentIndex < filteredHospitals.length - 1 ? currentIndex + 1 : 0;
          handleSelectAndZoomHospital(filteredHospitals[nextIndex]?.id || null);
        } else {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredHospitals.length - 1;
          handleSelectAndZoomHospital(filteredHospitals[prevIndex]?.id || null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredHospitals, selectedHospitalId, handleSelectAndZoomHospital, handleFullDismiss]);







  // Trigger re-render when new real-road OSRM routes resolve
  const [, setRouteVersion] = useState(0);

  const handleRouteLoaded = useCallback(() => {
    setRouteVersion((v) => v + 1);
  }, []);
  void handleRouteLoaded;

  // SECTION 2.3: OSRM route loader on mount so dark-green highway corridors appear on frame zero
  useEffect(() => {
    for (const corridor of PRIMARY_EXPRESS_CORRIDORS) {
      const src = HOSPITAL_REGISTRY[corridor.source];
      const tgt = HOSPITAL_REGISTRY[corridor.target];
      if (src && tgt) {
        getRealRoadCorridor(src.coords, tgt.coords, corridor.source, corridor.target);
      }
    }
    setRouteVersion((v) => v + 1);
  }, []);

  // Spec §19.4 & §20: Selection-only routes (static green lines, zero moving elements)
  const routeGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
    if (!showArcs) return { type: "FeatureCollection", features: [] };

    // With a hospital selected, render ONLY routes where from === code || to === code
    // Everything else is HIDDEN, not dimmed. If the hospital has no solver transfers,
    // show its 3 nearest candidates (dashed, labeled "candidates").
    if (selectedHospitalId) {
      const activeInfo = activeHospitalRoutes;
      const features: GeoJSON.Feature[] = activeInfo.routes.map((r) => ({
        type: "Feature",
        properties: {
          id: r.id,
          source: r.sourceId,
          target: r.targetId,
          sourceCode: r.sourceCode,
          targetCode: r.targetCode,
          isDashed: Boolean(r.isDashed || r.isCandidate),
          isCandidate: Boolean(r.isCandidate),
          opacity: r.isCandidate ? 0.85 : 1.0,
          isSelected: true,
        },
        geometry: {
          type: "LineString",
          coordinates: r.coords,
        },
      }));

      return { type: "FeatureCollection", features };
    }

    // With no selection, show only the top 6 transfers by urgency
    const top6 = DEFAULT_SOLVER_TRANSFERS.slice(0, 6);
    const features: GeoJSON.Feature[] = [];

    // Include any new in-transit order from Plexus global store (Section 1.2)
    for (const order of plexus.inTransitOrders) {
      if (top6.some((tx) => tx.id === order.id)) continue;
      const pair = PRECOMPUTED_PAIRS.find(
        (p) =>
          (p.transfer.sourceCode === order.from && p.transfer.targetCode === order.to) ||
          (p.transfer.sourceCode === order.to && p.transfer.targetCode === order.from) ||
          p.transfer.id === order.id
      );
      if (pair) {
        features.push({
          type: "Feature",
          properties: {
            id: order.id,
            source: order.fromId,
            target: order.toId,
            sourceCode: order.from,
            targetCode: order.to,
            isDashed: false,
            isCandidate: false,
            opacity: 1.0,
            isSelected: false,
          },
          geometry: {
            type: "LineString",
            coordinates: pair.road160,
          },
        });
      }
    }

    for (const tx of top6) {
      const pair = PRECOMPUTED_PAIRS.find((p) => p.transfer.id === tx.id);
      if (!pair) continue;
      features.push({
        type: "Feature",
        properties: {
          id: tx.id,
          source: tx.sourceId,
          target: tx.targetId,
          sourceCode: tx.sourceCode,
          targetCode: tx.targetCode,
          isDashed: false,
          isCandidate: false,
          opacity: 1.0,
          isSelected: false,
        },
        geometry: {
          type: "LineString",
          coordinates: pair.road160,
        },
      });
    }

    return { type: "FeatureCollection", features };
  }, [showArcs, selectedHospitalId, activeHospitalRoutes, plexus.inTransitOrders]);

  const mapOverlays = useMemo(() => (
    <>
      {/* Spec §19.4 & §20: Road-snapped dark green routes (green-600 core, paper casing, zero pulses) */}
      {showArcs && (
        <Source id="route-arcs" type="geojson" data={routeGeoJSON}>
          {/* Layer 1: Road Casing Bed (paper casing for high contrast against atlas) */}
          <Layer
            id="route-casing-layer"
            type="line"
            paint={{
              "line-color": "#F3EEE4",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 3.4,
                12, 4.2,
                13.5, 5.0,
              ],
              "line-opacity": 0.90,
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />

          {/* Layer 2: Core Highway Vector (Solid emerald, width interpolated by zoom) */}
          <Layer
            id="route-core-layer"
            type="line"
            filter={["!=", ["get", "isDashed"], true]}
            paint={{
              "line-color": "#047857",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 1.4,
                12, 2.2,
                13.5, 3.0,
              ],
              "line-opacity": ["get", "opacity"],
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />

          {/* Layer 3: Dashed Core Track for candidate routes when hospital has no solver transfers */}
          <Layer
            id="route-candidate-layer"
            type="line"
            filter={["==", ["get", "isDashed"], true]}
            paint={{
              "line-color": "#047857",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10, 1.4,
                12, 2.2,
                13.5, 3.0,
              ],
              "line-opacity": 0.85,
              "line-dasharray": [3, 2],
            }}
            layout={{ "line-cap": "round", "line-join": "round" }}
          />
        </Source>
      )}

      {/* ── HIGH-PRIORITY INSTANT-CLICK HOSPITAL MAP MARKERS ── */}
      {hospitalList.map((h) => {
        const isSelected = selectedHospitalId === h.id;
        const isHovered = hoveredHospitalId === h.id;
        const isCrisisAffected = activeCrisis && activeCrisis.affectedNodeIds.includes(h.id);

        // Spec §20: Unrelated markers dim to 35% with no pills; their halos dim to 30%
        const isRelated = selectedHospitalId
          ? isSelected || activeHospitalRoutes.partnerIds.includes(h.id)
          : true;

        const markerOpacity = isRelated ? 1.0 : 0.35;

        const dotColor =
          isCrisisAffected || h.status === "Shortage"
            ? "#E11D48" // Crimson
            : h.status === "<36h Surplus"
            ? "#F59E0B" // Amber
            : "#15997A"; // Emerald

        const placement = pillPlacements[h.id] || { visible: false, anchor: 'bottom' };
        // Spec §20: Unrelated markers lose pills
        const isPillVisible = selectedHospitalId
          ? isSelected || (isRelated && (isHovered || placement.visible))
          : isHovered || placement.visible;

        const anchorClass = `pill-anchor-${placement.anchor}`;

        return (
          <Marker
            key={h.id}
            longitude={h.coords[0]}
            latitude={h.coords[1]}
            anchor="center"
            style={{
              zIndex: isSelected || isHovered ? 35 : isCrisisAffected ? 15 : 10,
              opacity: markerOpacity,
              transition: 'opacity 0.25s ease',
            }}
          >
            <button
              type="button"
              className={`flighty-pin-btn${isSelected ? " pin-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAndZoomHospital(h.id);
              }}
              onMouseEnter={() => setHoveredHospitalId(h.id)}
              onMouseLeave={() => setHoveredHospitalId(null)}
              title={`Click to inspect ${h.fullName}`}
              style={{ position: "relative" }}
            >
              {/* Top White-Bordered Colored Dot */}
              <div
                className={`flighty-pin-dot${isSelected || isHovered ? " dot-highlighted" : ""}`}
                style={{ backgroundColor: dotColor }}
              />

              {/* Anchored Crisp Code Pill Badge */}
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
  ), [showArcs, routeGeoJSON, hospitalList, selectedHospitalId, activeHospitalRoutes, activeCrisis, handleSelectAndZoomHospital, pillPlacements, hoveredHospitalId]);

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

        {/* Floating Paper-Raised Filter Bar (Spec §3.1: Left-aligned above 25 HOSPITALS • BY URGENCY) */}
        <div
          className="flighty-floating-filter-bar"
          style={{
            position: 'absolute',
            top: 14,
            left: 18,
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 6px',
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
              padding: '5px 12px',
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
              padding: '5px 12px',
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
              padding: '5px 12px',
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
                onClick={() => handleSelectAndZoomHospital(node.id)}
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



        {/* ── REDESIGNED HOSPITAL DETAIL SIDE SHEET (Spec §3.3 & §3.4) ── */}
        {selectedNode && isDrawerOpen && (
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
            onCloseDrawerOnly={handleCloseDrawerOnly}
            onFullDismiss={handleFullDismiss}
            onDispatch={(id, units, orderId) => {
              if (orderId) {
                useDispatchStore.getState().approve(orderId);
              } else {
                useDispatchStore.getState().approve(id);
              }
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

