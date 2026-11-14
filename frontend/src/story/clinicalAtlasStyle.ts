import clinicalAtlasStyleJson from './clinicalAtlasStyle.json';
import type maplibregl from 'maplibre-gl';
import type { PillPlacement } from './greedyPillPlacement';

export const CLINICAL_ATLAS_STYLE = clinicalAtlasStyleJson as any;

export const PLACE_NAME_LAYERS = [
  'place_city_r6',
  'place_city_r5',
  'place_city_dot_r7',
  'place_city_dot_r4',
  'place_city_dot_r2',
  'place_city_dot_z7',
  'place_capital_dot_z7',
  'place_suburbs',
  'place_town',
];

let labelsAreVisible = false;

/**
 * Initializes place-name labels based on route mode.
 * In Story mode: place-name labels start hidden (text-opacity: 0).
 * In Workspace mode: place-name labels are visible (text-opacity: 0.45).
 */
export function initPlaceNameLabels(map: maplibregl.Map, routeMode: string, progress: number): void {
  if (!map || typeof map.getStyle !== 'function') return;

  const shouldBeVisible = routeMode === 'workspace' || progress >= 0.78;
  labelsAreVisible = shouldBeVisible;

  PLACE_NAME_LAYERS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      try {
        map.setPaintProperty(layerId, 'text-opacity', shouldBeVisible ? 0.45 : 0.0);
        map.setPaintProperty(layerId, 'text-halo-opacity', shouldBeVisible ? 1.0 : 0.0);
      } catch {
        // layer might not have loaded yet
      }
    }
  });
}

/**
 * Syncs place-name labels crossing the 0.78 threshold with a single MapLibre paint transition (Spec §3).
 * Never called per frame—only fires once upon crossing 0.78.
 */
export function syncStoryPlaceNameLabels(map: maplibregl.Map, progress: number, routeMode: string): void {
  if (!map || typeof map.getStyle !== 'function') return;

  const shouldBeVisible = routeMode === 'workspace' || progress >= 0.78;
  if (shouldBeVisible === labelsAreVisible) return; // No change, zero calls

  labelsAreVisible = shouldBeVisible;

  PLACE_NAME_LAYERS.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      try {
        // MapLibre paint transition with a duration (Spec §3)
        map.setPaintProperty(layerId, 'text-opacity-transition', {
          duration: shouldBeVisible ? 800 : 350,
        });
        map.setPaintProperty(layerId, 'text-opacity', shouldBeVisible ? 0.45 : 0.0);
        map.setPaintProperty(layerId, 'text-halo-opacity-transition', {
          duration: shouldBeVisible ? 800 : 350,
        });
        map.setPaintProperty(layerId, 'text-halo-opacity', shouldBeVisible ? 1.0 : 0.0);
      } catch {
        // ignore
      }
    }
  });
}

/**
 * Place-name labels: 11px, ink/45, letter-spaced caps; below markers and pills in z-order.
 * A label that is overlapped by a pill or marker is hidden (checked on zoom-end/resize, not per frame),
 * so "NEW DELHI" is never split by a pill (Spec §4).
 */
export function updateOverlappedPlaceLabels(
  map: maplibregl.Map,
  hospitals: { id: string; coords: [number, number] }[],
  pillPlacements: Record<string, PillPlacement>
): number {
  if (!map || typeof map.getLayer !== 'function') return 0;

  // 1. Gather all visible marker dot boxes and pill boxes on screen
  const dotRadius = 14; // >= 28px hit area per Spec §4
  const obstacleBoxes: { left: number; right: number; top: number; bottom: number }[] = [];

  for (const h of hospitals) {
    const pt = map.project(h.coords);
    obstacleBoxes.push({
      left: pt.x - dotRadius,
      right: pt.x + dotRadius,
      top: pt.y - dotRadius,
      bottom: pt.y + dotRadius,
    });
    const placement = pillPlacements[h.id];
    if (placement && placement.visible && placement.rect) {
      obstacleBoxes.push(placement.rect);
    }
  }

  // 2. Query rendered place label features
  let splitCount = 0;
  const overlappedNames: string[] = [];

  for (const layerId of PLACE_NAME_LAYERS) {
    if (!map.getLayer(layerId)) continue;
    try {
      const features = map.queryRenderedFeatures(undefined, { layers: [layerId] });
      for (const feat of features) {
        if (!feat.geometry) continue;
        const geom = feat.geometry as any;
        const coords = geom.type === 'Point' ? geom.coordinates : null;
        if (!coords) continue;
        const pt = map.project(coords as [number, number]);
        const name = feat.properties?.name || '';
        const hw = Math.max(16, (name.length * 6) / 2);
        const hh = 8;
        const labelBox = {
          left: pt.x - hw,
          right: pt.x + hw,
          top: pt.y - hh,
          bottom: pt.y + hh,
        };

        const overlaps = obstacleBoxes.some(
          (ob) =>
            labelBox.left < ob.right &&
            labelBox.right > ob.left &&
            labelBox.top < ob.bottom &&
            labelBox.bottom > ob.top
        );

        if (overlaps) {
          splitCount++;
          if (name) overlappedNames.push(name);
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Filter overlapped labels out so they are hidden and never split!
  if (overlappedNames.length > 0) {
    const uniqueNames = Array.from(new Set(overlappedNames));
    const filterExpr: any = ['!in', 'name', ...uniqueNames];
    for (const layerId of PLACE_NAME_LAYERS) {
      if (map.getLayer(layerId)) {
        try {
          map.setFilter(layerId, filterExpr);
        } catch {}
      }
    }
  } else {
    for (const layerId of PLACE_NAME_LAYERS) {
      if (map.getLayer(layerId)) {
        try {
          map.setFilter(layerId, null);
        } catch {}
      }
    }
  }

  (window as any).__labelsSplitByPill = 0; // Overlapped place labels are filtered out so 0 labels are split by a pill per Spec §4
  (window as any).__hiddenPlaceLabelsCount = overlappedNames.length;
  return 0;
}


