import type maplibregl from 'maplibre-gl';

export type PillAnchor = 'bottom' | 'top' | 'right' | 'left';

export interface HospitalPillItem {
  id: string;
  code: string;
  coords: [number, number]; // [lng, lat]
  status: string; // 'Shortage' | '<36h Surplus' | 'Optimal'
  supplyRatio: number;
  burnIndex: number;
  isCrisisAffected?: boolean;
}

export interface PillPlacement {
  visible: boolean;
  anchor: PillAnchor;
  offset: { x: number; y: number };
  rect?: BoundingBox;
}

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CardBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  panelRight: number;
  bannerBottom: number;
}

function boxesOverlap(b1: BoundingBox, b2: BoundingBox, buffer = 2): boolean {
  return (
    b1.left < b2.right + buffer &&
    b1.right > b2.left - buffer &&
    b1.top < b2.bottom + buffer &&
    b1.bottom > b2.top - buffer
  );
}

export function computeGreedyPillPlacements(
  map: maplibregl.Map | null,
  hospitals: HospitalPillItem[],
  selectedHospitalId: string | null = null,
  boundsOverride?: Partial<CardBounds>
): {
  placements: Record<string, PillPlacement>;
  overlapCount: number;
  hiddenCount: number;
} {
  const result: Record<string, PillPlacement> = {};
  if (!map || typeof map.project !== 'function' || !hospitals || hospitals.length === 0) {
    return { placements: result, overlapCount: 0, hiddenCount: 0 };
  }

  // 1. Measure layout bounds relative to map canvas container
  const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const h = typeof window !== 'undefined' ? window.innerHeight : 900;
  const isMobile = w < 768;

  const mapContainer = typeof map.getContainer === 'function' ? map.getContainer() : null;
  const frameEl = typeof document !== 'undefined' ? document.querySelector('.flighty-clipped-map-frame') : null;
  const mapRect = mapContainer
    ? mapContainer.getBoundingClientRect()
    : frameEl
    ? frameEl.getBoundingClientRect()
    : { left: 0, top: 0, width: w, height: h, right: w, bottom: h };

  let bounds: CardBounds = {
    left: 4,
    right: Math.max(100, mapRect.width - 4),
    top: 4,
    bottom: Math.max(100, mapRect.height - 4),
    panelRight: 0,
    bannerBottom: 0,
    ...boundsOverride,
  };

  const panelEl = typeof document !== 'undefined' ? document.querySelector('.flighty-left-cards-stack') : null;
  if (panelEl && !isMobile) {
    const rect = panelEl.getBoundingClientRect();
    if (rect.width > 0 && rect.right > mapRect.left) {
      bounds.panelRight = Math.max(0, rect.right - mapRect.left + 6);
    }
  }

  const bannerEl = typeof document !== 'undefined' ? document.querySelector('.flighty-docked-banner') : null;
  if (bannerEl) {
    const rect = bannerEl.getBoundingClientRect();
    if (rect.height > 0 && rect.bottom > mapRect.top) {
      bounds.bannerBottom = Math.max(0, rect.bottom - mapRect.top + 6);
    }
  }

  // 2. Project all hospital coordinates to screen points and compute dot boxes
  const screenPoints: Record<string, { x: number; y: number }> = {};
  const dotBoxes: Record<string, BoundingBox> = {};
  const dotRadius = 8;

  for (const hItem of hospitals) {
    const pt = map.project(hItem.coords);
    screenPoints[hItem.id] = { x: pt.x, y: pt.y };
    dotBoxes[hItem.id] = {
      left: pt.x - dotRadius,
      right: pt.x + dotRadius,
      top: pt.y - dotRadius,
      bottom: pt.y + dotRadius,
    };
  }

  // 3. Sort hospitals strictly by priority per Spec §3:
  // Priority: Selected hospital -> Red shortages (by supply ratio asc) -> Amber by severity (burn index desc) -> Optimal
  const prioritized = [...hospitals].sort((a, b) => {
    if (a.id === selectedHospitalId) return -1;
    if (b.id === selectedHospitalId) return 1;

    const isRedA = a.isCrisisAffected || a.status === 'Shortage';
    const isRedB = b.isCrisisAffected || b.status === 'Shortage';
    if (isRedA && !isRedB) return -1;
    if (!isRedA && isRedB) return 1;
    if (isRedA && isRedB) {
      return a.supplyRatio - b.supplyRatio; // Lowest supply ratio = highest severity
    }

    const isAmberA = a.status === '<36h Surplus';
    const isAmberB = b.status === '<36h Surplus';
    if (isAmberA && !isAmberB) return -1;
    if (!isAmberA && isAmberB) return 1;
    if (isAmberA && isAmberB) {
      return b.burnIndex - a.burnIndex; // Highest burn index = highest severity
    }

    return 0;
  });

  // Pill dimensions (3-char monospace pill with padding and min-height 32px per Spec §4)
  const pillW = 48;
  const pillH = 32;
  const hw = pillW / 2;
  const hh = pillH / 2;
  const offsetGap = 6; // 6px offset per spec

  const placedPills: { hospitalId: string; box: BoundingBox; anchor: PillAnchor }[] = [];
  const candidateAnchors: PillAnchor[] = ['bottom', 'top', 'right', 'left'];

  // 4. Greedy placement loop
  for (const hItem of prioritized) {
    const pt = screenPoints[hItem.id];
    if (!pt) continue;

    const isSelected = hItem.id === selectedHospitalId;
    let accepted: { anchor: PillAnchor; box: BoundingBox } | null = null;

    for (const anchor of candidateAnchors) {
      let candBox: BoundingBox;

      if (anchor === 'bottom') {
        const top = pt.y + dotRadius + offsetGap;
        candBox = {
          left: pt.x - hw,
          right: pt.x + hw,
          top,
          bottom: top + pillH,
        };
      } else if (anchor === 'top') {
        const bottom = pt.y - dotRadius - offsetGap;
        candBox = {
          left: pt.x - hw,
          right: pt.x + hw,
          top: bottom - pillH,
          bottom,
        };
      } else if (anchor === 'right') {
        const left = pt.x + dotRadius + offsetGap;
        candBox = {
          left,
          right: left + pillW,
          top: pt.y - hh,
          bottom: pt.y + hh,
        };
      } else {
        // 'left'
        const right = pt.x - dotRadius - offsetGap;
        candBox = {
          left: right - pillW,
          right,
          top: pt.y - hh,
          bottom: pt.y + hh,
        };
      }

      // ── Collision Checks ──
      // Check 1: Overlap with any other marker dot
      let overlapsDot = false;
      for (const [dotId, dotBox] of Object.entries(dotBoxes)) {
        if (dotId === hItem.id) continue;
        if (boxesOverlap(candBox, dotBox, 3)) {
          overlapsDot = true;
          break;
        }
      }
      if (overlapsDot) continue;

      // Check 2: Overlap with already placed pills
      let overlapsPlacedPill = false;
      for (const placed of placedPills) {
        if (boxesOverlap(candBox, placed.box, 3)) {
          overlapsPlacedPill = true;
          break;
        }
      }
      if (overlapsPlacedPill) continue;

      // Check 3: Clipped by left panel (desktop)
      if (!isMobile && candBox.left < bounds.panelRight) {
        continue;
      }

      // Check 4: Clipped by top docked banner
      if (candBox.top < bounds.bannerBottom) {
        continue;
      }

      // Check 5: Clipped by map card boundary
      if (
        candBox.left < bounds.left ||
        candBox.right > bounds.right ||
        candBox.top < bounds.top ||
        candBox.bottom > bounds.bottom
      ) {
        continue;
      }

      // Accept first anchor satisfying all conditions
      accepted = { anchor, box: candBox };
      break;
    }

    if (accepted) {
      placedPills.push({ hospitalId: hItem.id, box: accepted.box, anchor: accepted.anchor });
      result[hItem.id] = {
        visible: true,
        anchor: accepted.anchor,
        offset: getAnchorOffset(accepted.anchor, dotRadius, offsetGap),
        rect: accepted.box,
      };
    } else if (isSelected) {
      // Selected hospital is ALWAYS visible per Spec §3
      const fallbackBox: BoundingBox = {
        left: pt.x - hw,
        right: pt.x + hw,
        top: pt.y + dotRadius + offsetGap,
        bottom: pt.y + dotRadius + offsetGap + pillH,
      };
      placedPills.push({ hospitalId: hItem.id, box: fallbackBox, anchor: 'bottom' });
      result[hItem.id] = {
        visible: true,
        anchor: 'bottom',
        offset: getAnchorOffset('bottom', dotRadius, offsetGap),
        rect: fallbackBox,
      };
    } else {
      // Hidden: will show on hover or focus
      result[hItem.id] = {
        visible: false,
        anchor: 'bottom',
        offset: getAnchorOffset('bottom', dotRadius, offsetGap),
      };
    }
  }

  const hiddenCount = hospitals.length - placedPills.length;
  return {
    placements: result,
    overlapCount: 0,
    hiddenCount,
  };
}

function getAnchorOffset(anchor: PillAnchor, dotRadius: number, gap: number): { x: number; y: number } {
  if (anchor === 'bottom') return { x: 0, y: dotRadius + gap };
  if (anchor === 'top') return { x: 0, y: -(dotRadius + gap) };
  if (anchor === 'right') return { x: dotRadius + gap, y: 0 };
  return { x: -(dotRadius + gap), y: 0 };
}
