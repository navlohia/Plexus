import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import Map, { MapRef } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStoryStore } from '../../store/storyStore';
import { CLINICAL_ATLAS_STYLE, initPlaceNameLabels } from '../../story/clinicalAtlasStyle';
import { SHOW_HALOS_IN_WORKSPACE, createPressureHaloLayers } from '../../story/pressureHalos';
import { applyStoryCamera } from '../../story/stageCamera';
import { countRenderedLabels } from '../../story/stageLabels';
import {
  buildDeterministicNodeAssignments,
  type AssignedRescueNode,
} from '../../story/rescueAndLanding';
import { buildParticleDefinitions } from '../../story/cloudAndNodes';
import { computeGreedyPillPlacements, type PillPlacement } from '../../story/greedyPillPlacement';
import { buildRouteGeoJSON, createRouteDeckLayers } from '../../story/routeEngine';

let currentHaloOpacity = 0.0;

export function setStoryHaloOpacity(op: number): void {
  currentHaloOpacity = op;
  const overlay = (window as any).__deckOverlay;
  if (!overlay) return;
  const layers = createPressureHaloLayers(op);
  overlay.setProps({ layers });
}

export function updateStoryMarkersAndArcs(
  p: number,
  map: any,
  assignments: AssignedRescueNode[]
): void {
  if (!map || typeof map.project !== 'function') return;

  // 1. Update Story DOM markers
  for (let i = 0; i < assignments.length; i++) {
    const asgn = assignments[i];
    const h = asgn.hospital;
    const markerEl = document.getElementById(`story-dom-marker-${h.id}`);
    const rippleEl = document.getElementById(`story-dom-ripple-${h.id}`);
    if (!markerEl) continue;

    if (p < asgn.windowEnd) {
      markerEl.style.opacity = '0';
      markerEl.style.display = 'none';
      if (rippleEl) {
        rippleEl.style.display = 'none';
        rippleEl.style.opacity = '0';
      }
      continue;
    }

    const pt = map.project(h.coords);
    markerEl.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0) translate(-50%, -50%)`;
    markerEl.style.display = 'flex';

    // Landing swap: DOM marker fades in beneath node over 120ms (deltaP = 0.015) while node fades out
    const tSwap = Math.min(1.0, (p - asgn.windowEnd) / 0.015);
    markerEl.style.opacity = `${tSwap.toFixed(3)}`;

    // Ripple: one 450 ms expanding ring (1px ring, state color 40% to 0, once only) per landing (Spec §8)
    // 450 ms interval in scroll progress ~ 0.040
    if (rippleEl) {
      if (p >= asgn.windowEnd && p < asgn.windowEnd + 0.040) {
        const uRipple = (p - asgn.windowEnd) / 0.040;
        const ringSize = 16 + 42 * Math.sqrt(uRipple); // expands from 16px to 58px
        const ringAlpha = 0.40 * (1.0 - uRipple);
        rippleEl.style.display = 'block';
        rippleEl.style.width = `${ringSize.toFixed(1)}px`;
        rippleEl.style.height = `${ringSize.toFixed(1)}px`;
        rippleEl.style.opacity = `${ringAlpha.toFixed(3)}`;
      } else {
        rippleEl.style.display = 'none';
        rippleEl.style.opacity = '0';
      }
    }

    // Pills: section 3 placement; in the Story only arc endpoints show pills, 120 ms after landing
    if (h.isArcEndpoint) {
      const pillEl = document.getElementById(`story-dom-pill-${h.id}`);
      if (pillEl) {
        if (p < asgn.windowEnd + 0.015) {
          pillEl.style.opacity = '0';
        } else {
          const tPill = Math.min(1.0, (p - (asgn.windowEnd + 0.015)) / 0.015);
          pillEl.style.opacity = `${tPill.toFixed(3)}`;
        }
      }
    }
  }

  // 2. Update realistic routes via GeoJSON + Deck.gl (Spec §9 & §12)
  if (p >= 0.61) {
    const geojson = buildRouteGeoJSON(p, 'story', assignments);
    const source: any = map.getSource('story-route-arcs');
    if (source && typeof source.setData === 'function') {
      source.setData(geojson);
    }
  } else {
    const source: any = map.getSource('story-route-arcs');
    if (source && typeof source.setData === 'function') {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }

  // 3. Update pressure halos + Deck.gl layers (PathLayer casing/core + TripsLayer pulse)
  if (p >= 0.54 && p <= 0.72) {
    const haloT = (p - 0.54) / (0.72 - 0.54);
    currentHaloOpacity = haloT;
  } else if (p > 0.72) {
    currentHaloOpacity = 1.0;
  } else {
    currentHaloOpacity = 0.0;
  }

  const overlay = (window as any).__deckOverlay;
  if (overlay) {
    const haloLayers = createPressureHaloLayers(currentHaloOpacity);
    const nowSec = performance.now() / 1000;
    const routeLayers = createRouteDeckLayers(p, 'story', assignments, nowSec);
    overlay.setProps({ layers: [...haloLayers, ...routeLayers] });
  }
}

export const MapStage: React.FC = () => {
  const mapRef = useRef<MapRef | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const createdRef = useRef(false);

  const routeMode = useStoryStore((state) => state.routeMode);
  const mapOverlays = useStoryStore((state) => state.mapOverlays);
  const setViewState = useStoryStore((state) => state.setViewState);
  const setMapCreated = useStoryStore((state) => state.setMapCreated);
  const setDeckOverlay = useStoryStore((state) => state.setDeckOverlay);
  const setMapInstance = useStoryStore((state) => state.setMapInstance);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 700;
  const assignments = useMemo(() => {
    const particles = buildParticleDefinitions(isMobile);
    return buildDeterministicNodeAssignments(particles, typeof window !== 'undefined' ? window.innerWidth : 1440);
  }, [isMobile]);


  const [storyPillPlacements, setStoryPillPlacements] = useState<Record<string, PillPlacement>>({});

  const recalculateStoryPills = useCallback(() => {
    const map = (window as any).__map || mapRef.current?.getMap();
    if (!map) return;
    const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const isMob = w < 768;
    const panelRight = isMob ? 0 : 0.42 * w; // Never under the text column (Spec §8)

    const items = assignments.map((asgn) => ({
      id: asgn.hospital.id,
      code: asgn.hospital.code,
      coords: asgn.hospital.coords,
      status: asgn.hospital.status,
      supplyRatio: asgn.hospital.status === 'Shortage' ? 40 : 100,
      burnIndex: asgn.hospital.status === 'Shortage' ? 90 : 30,
    }));

    const result = computeGreedyPillPlacements(map, items, null, { panelRight });
    setStoryPillPlacements(result.placements);
  }, [assignments]);

  useEffect(() => {
    window.addEventListener('resize', recalculateStoryPills);
    return () => {
      window.removeEventListener('resize', recalculateStoryPills);
    };
  }, [recalculateStoryPills]);

  // Sync map interaction handlers & view properties based on routeMode
  useEffect(() => {
    const map = mapRef.current?.getMap() || (window as any).__map;
    if (!map) return;

    const curProgress = (window as any).__storyProgress || 0;

    if (routeMode === 'workspace') {
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.dragRotate.enable();
      map.dragPan.enable();
      map.keyboard.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
      map.resize();

      initPlaceNameLabels(map, 'workspace', 1.0);

      // Hide paper veil in workspace
      const veil = document.getElementById('story-paper-veil');
      if (veil) {
        veil.style.opacity = '0.0';
        veil.style.display = 'none';
      }

      // Halos in workspace behind SHOW_HALOS_IN_WORKSPACE flag (Spec §3)
      if (SHOW_HALOS_IN_WORKSPACE) {
        setStoryHaloOpacity(1.0);
      }
    } else {
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.dragRotate.disable();
      map.dragPan.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();

      initPlaceNameLabels(map, 'story', curProgress);

      const veil = document.getElementById('story-paper-veil');
      if (veil) {
        const veilAlpha = curProgress <= 0.30 ? 0.55 * (1 - curProgress / 0.30) : 0;
        veil.style.opacity = `${Math.max(0, veilAlpha).toFixed(3)}`;
        veil.style.display = curProgress <= 0.30 ? 'block' : 'none';
      }

      setStoryHaloOpacity(currentHaloOpacity);
    }
  }, [routeMode]);

  return (
    <div
      id="persistent-map-stage"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: routeMode === 'workspace' ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    >
      <Map
        id="persistent-maplibre-instance"
        ref={mapRef}
        initialViewState={{
          longitude: 77.21,
          latitude: 28.58,
          zoom: 10,
          pitch: 40,
          bearing: -12,
        }}
        onMove={(evt) => {
          if (routeMode === 'workspace') {
            setViewState(evt.viewState);
          }
        }}
        interactive={routeMode === 'workspace'}
        mapStyle={CLINICAL_ATLAS_STYLE}
        maxPitch={80}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={(evt) => {
          if (!createdRef.current) {
            createdRef.current = true;
            console.log('map created');
            setMapCreated(true);

            const map = evt.target;
            const overlay = new MapboxOverlay({
              interleaved: true,
              layers: [],
            });
            overlayRef.current = overlay;
            map.addControl(overlay);
            setDeckOverlay(overlay);

            // 3-Layer Arterial Corridor Routing (Spec Task 2)
            // Layer 1: Soft outer halo (wide translucent glow)
            // Layer 2: Crisp core track (solid continuous vector line, zero dashed artifacts)
            if (!map.getSource('story-route-arcs')) {
              map.addSource('story-route-arcs', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
              });

              // Layer 1: Road Casing Bed (paper casing for high contrast against atlas per Spec §12)
              map.addLayer({
                id: 'story-route-casing',
                type: 'line',
                source: 'story-route-arcs',
                paint: {
                  'line-color': ['get', 'casingColor'],
                  'line-width': ['get', 'casingWidth'],
                  'line-opacity': 1.0,
                },
                layout: { 'line-cap': 'round', 'line-join': 'round' },
              });

              // Layer 2: Crisp Core Track (Solid green vector line, zero red/orange or dashes!)
              map.addLayer({
                id: 'story-route-core',
                type: 'line',
                source: 'story-route-arcs',
                paint: {
                  'line-color': ['get', 'routeColor'],
                  'line-width': ['get', 'coreWidth'],
                  'line-opacity': 1.0,
                },
                layout: { 'line-cap': 'round', 'line-join': 'round' },
              });
            }

            map.on('zoomend', recalculateStoryPills);
            map.on('moveend', recalculateStoryPills);
            recalculateStoryPills();

            (window as any).__map = map;
            (window as any).__deckOverlay = overlay;
            (window as any).__setHaloOpacity = setStoryHaloOpacity;
            (window as any).__countRenderedLabels = () => countRenderedLabels(map);
            (window as any).__updateStoryOverlays = (p: number) =>
              updateStoryMarkersAndArcs(p, map, assignments);
            setMapInstance(map);

            const curProgress = (window as any).__storyProgress || 0;

            // Place name labels initialized per routeMode
            initPlaceNameLabels(map, routeMode, curProgress);

            // Initial stage camera pose (Spec §2 & §4)
            if (routeMode === 'story') {
              applyStoryCamera(map, 0.0);
            }

            // Deck.gl halos
            if (routeMode === 'workspace' && SHOW_HALOS_IN_WORKSPACE) {
              setStoryHaloOpacity(1.0);
            } else {
              setStoryHaloOpacity(currentHaloOpacity);
            }
          }
        }}
      >
        {routeMode === 'workspace' && mapOverlays}
      </Map>

      {/* Story DOM Markers Layer (Spec §8: Landing swap beneath 3D nodes) */}
      {routeMode === 'story' && (
        <div
          id="story-dom-markers-layer"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 3,
            overflow: 'hidden',
          }}
        >
          {assignments.map((asgn) => {
            const h = asgn.hospital;
            const placement = storyPillPlacements[h.id] || { visible: false, anchor: 'bottom' };
            const anchorClass = `pill-anchor-${placement.anchor}`;
            return (
              <div
                key={h.id}
                id={`story-dom-marker-${h.id}`}
                className="flighty-pin-container"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0,
                  pointerEvents: 'none',
                  willChange: 'transform, opacity',
                }}
              >
                {/* 450 ms expanding ripple ring on landing (Spec §8: 1px ring, state color 40% to 0) */}
                <div
                  id={`story-dom-ripple-${h.id}`}
                  style={{
                    position: 'absolute',
                    borderRadius: '50%',
                    border: `1px solid ${h.statusColor}`,
                    pointerEvents: 'none',
                    opacity: 0,
                    display: 'none',
                    boxSizing: 'border-box',
                    transform: 'translate(-50%, -50%)',
                    left: '50%',
                    top: '50%',
                  }}
                />

                <div
                  className="flighty-pin-dot"
                  style={{
                    backgroundColor: h.statusColor,
                  }}
                />
                {h.isArcEndpoint && (
                  <div
                    id={`story-dom-pill-${h.id}`}
                    className={`flighty-pin-pill ${anchorClass}`}
                    style={{
                      opacity: 0,
                      display: placement.visible ? 'block' : 'none',
                      transition: 'none',
                    }}
                  >
                    {h.code}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Route & Map Attribution per Spec §12 */}
      <div
        className="map-attribution-notice"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 12,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: 'rgba(20, 27, 45, 0.45)',
          pointerEvents: 'none',
          zIndex: 10,
          letterSpacing: '0.02em',
        }}
      >
        Routes © OpenStreetMap contributors · OSRM
      </div>

      {/* Story Paper Veil (Spec §3): opacity 0.55 -> 0 over 0 -> 0.30, zero per-frame setPaintProperty */}
      <div
        id="story-paper-veil"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#F3EEE4',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: routeMode === 'workspace' ? 0.0 : 0.55,
          display: routeMode === 'workspace' ? 'none' : 'block',
          transition: 'none',
        }}
      />
    </div>
  );
};

export default MapStage;
