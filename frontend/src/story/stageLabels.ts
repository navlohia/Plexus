import type maplibregl from 'maplibre-gl';

/**
 * Counts the exact number of active rendered labels in the current map viewport.
 */
export function countRenderedLabels(map: maplibregl.Map): {
  total: number;
  byLayer: Record<string, number>;
} {
  if (!map || typeof map.getStyle !== 'function') {
    return { total: 0, byLayer: {} };
  }

  const style = map.getStyle();
  if (!style || !style.layers) {
    return { total: 0, byLayer: {} };
  }

  const symbolLayerIds = style.layers
    .filter((l) => l.type === 'symbol')
    .map((l) => l.id);

  const byLayer: Record<string, number> = {};
  let total = 0;

  try {
    const features = map.queryRenderedFeatures(undefined, { layers: symbolLayerIds });
    for (const f of features) {
      const lid = f.layer.id;
      byLayer[lid] = (byLayer[lid] || 0) + 1;
      total++;
    }
  } catch (err) {
    console.warn('[stageLabels] queryRenderedFeatures error:', err);
  }

  return { total, byLayer };
}

