/**
 * palette.ts (LANDING_SPEC v2)
 * Unified color tokens sampled directly from workspace UI and MapLibre style.
 * Light-first, clinical, editorial. Zero burgundy.
 */

import type maplibregl from 'maplibre-gl';

export const TOKENS = {
  // Surfaces & Backgrounds
  paper: '#F3EEE4',       // Story cream & workspace page background (Spec §2 & §9b)
  paperPure: '#FFFFFF',   // Workspace card / surface
  paperMuted: '#ECEEF2',  // Borders and dividers

  // Typography & Inks
  ink: '#111827',         // Primary text
  inkSecondary: '#374151',// Secondary supporting text
  inkMuted: '#6B7280',    // Monospace metadata, hairline annotations
  inkSubtle: '#9CA3AF',
  inkHairline: 'rgba(17, 24, 39, 0.15)',
  shadowInk: 'rgba(17, 24, 39, 0.16)',

  // Status & Actions
  green: '#15997A',       // Workspace Solver Rebalance emerald
  red: '#E11D48',         // Workspace shortage crimson
  amber: '#F59E0B',       // Workspace <36h surplus amber

  // Hero Platelet Physical Material (Spec §5: warm rose, with real depth)
  platelet: {
    core: '#E9AEBA',      // Warm pearl-rose core (Spec §5)
    deep: '#CC7A8E',      // Deep rose sheen rim & cracks (Spec §5)
    aged: '#D9C3C2',      // Warm aged matte (Spec §5, never grey)
    cracks: '#CC7A8E',    // Deep rose hairline cracks
  },
};

export interface MapPalette {
  background: string;
  water: string;
  waterway: string;
  roads: string;
  roadOpacity: number;
  buildingOpacity: number;
  labelOpacity: number;
}

// At progress 0: Map is ghost (paper land, labels 0, roads ~25%, buildings 0)
export const PALETTE_GHOST: MapPalette = {
  background: TOKENS.paper,
  water: '#D4DCE4',
  waterway: '#D4DCE4',
  roads: '#CBD5E1',
  roadOpacity: 0.25,
  buildingOpacity: 0.0,
  labelOpacity: 0.0,
};

// At progress >= 0.82: Matches exact workspace map style (Carto Positron paper & ink)
export const PALETTE_WORKSPACE: MapPalette = {
  background: TOKENS.paper,
  water: '#D4DCE4',
  waterway: '#D4DCE4',
  roads: '#CBD5E1',
  roadOpacity: 1.0,
  buildingOpacity: 1.0,
  labelOpacity: 1.0,
};

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function checkPlateletColor(colorHex: string): { rMinusG: number; saturation: number } {
  const [r, g, b] = parseHex(colorHex);
  const rMinusG = r - g;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 127 ? (max - min) / (510 - max - min) : (max - min) / (max + min);
  return { rMinusG, saturation: Math.round(s * 100) };
}

/**
 * One-time base map quiet setup (Spec §3).
 * NO per-frame setPaintProperty anywhere.
 */
export function initQuietMapStyle(map: maplibregl.Map): void {
  if (!map || typeof map.getStyle !== 'function') return;
  const style = map.getStyle();
  if (!style || !style.layers) return;

  style.layers.forEach((layer) => {
    const id = layer.id;
    // Hide village, hamlet, locality labels below suburb
    if (
      layer.type === 'symbol' &&
      (id.includes('village') || id.includes('hamlet') || id.includes('suburb') || id.includes('locality'))
    ) {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {
        // ignore
      }
    }
  });
}

/**
 * Legacy stub: Spec §3 explicitly bans per-frame setPaintProperty.
 * Ghost look is driven entirely by the paper veil div.
 */
export function applyPaletteAtProgress(_map: maplibregl.Map, _progress: number): void {
  // Pure no-op to maintain 60 FPS and avoid GPU stalls
}
