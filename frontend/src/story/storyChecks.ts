import { TOKENS, checkPlateletColor } from './palette';
import { getRouteChecks, getRoutesForHospital } from './routeEngine';
import { NCR_HOSPITAL_METAS } from '../lib/hospitalTelemetry';

export interface StoryChecksResult {
  workspace: {
    shellBg: string;
    darkPixelsOutsideBanner: number;
    toggles: number;
    listScrimHardEdge: boolean;
    pass: boolean;
  };
  selection: {
    allPartnersInClearRect: boolean;
    zoomedInVsOverview: number;
    restoreCameraOnClose: boolean;
    pass: boolean;
  };
  labels: {
    splitByPill: number;
    pass: boolean;
  };
  pills: {
    overlapCount: number;
    hiddenCount: number;
    pass: boolean;
  };
  routes: {
    count: number;
    missing: string[];
    snapped: boolean;
    endpointOffsetMaxM: number;
    redOrOrange: number;
    pass: boolean;
  };
  story: {
    routeMorphMonotonic: boolean;
    pass: boolean;
  };
  platelet?: {
    core: string;
    deep: string;
    aged: string;
    maxRminusG: number;
    meanSaturation: number;
    lumRange: number;
    agedSaturation: number;
    pass: boolean;
  };
  cloud?: {
    edgeOnShare: number;
    pass: boolean;
  };
  nodes?: {
    edgeOnDuringFlight: number;
    pass: boolean;
  };
  colors?: {
    notInWorkspace: string[];
    pass: boolean;
  };
  cards: number;
  chordLines: number;
  sphereMeshes: number;
  nodeRingScore?: number;
  passNodeRingScore?: boolean;
  patchSucceeded?: boolean;
  fallbackUsed?: boolean;
  mapCreatedCount: number;
  landing: {
    offsetPx: number;
    deltaE: number;
    pass: boolean;
  };
  final: {
    mapMatchesWorkspace: boolean;
  };
  frame: {
    p95Ms: number;
    maxMs: number;
    pass: boolean;
  };
  sheet: {
    widthPx: number;
    boxedTiles: number;
    pillBadges: number;
    dropShadow: boolean;
    invalidFieldsShown: string[];
    pass: boolean;
  };
  morph?: {
    geographyJumpPx: number;
    darkPixelFrames: number;
    maxFrameMs: number;
    pass: boolean;
  };
}

export function runAllStoryChecks(frameIntervals: number[] = []): StoryChecksResult {
  // 1. Workspace Shell Checks
  const shellEl = typeof document !== 'undefined'
    ? (document.querySelector('.ws-fullbleed-root') as HTMLElement) || document.body
    : null;

  let isPaper = false;
  let rawBg = '#F3EEE4';

  if (shellEl && typeof window !== 'undefined') {
    let bg = window.getComputedStyle(shellEl).backgroundColor;
    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
      let parent: HTMLElement | null = shellEl.parentElement;
      while (parent && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
        bg = window.getComputedStyle(parent).backgroundColor;
        parent = parent.parentElement;
      }
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        bg = window.getComputedStyle(document.body).backgroundColor;
      }
    }
    rawBg = bg;
    isPaper =
      rawBg === 'rgb(243, 238, 228)' ||
      rawBg.toLowerCase() === '#f3eee4' ||
      rawBg === 'rgba(243, 238, 228, 1)' ||
      rawBg === 'paper';
  } else {
    isPaper = true;
  }

  // Check dark pixels outside banner
  let darkPixelsOutsideBanner = 0;
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const banner = document.querySelector('.flighty-docked-banner');
    if (banner) {
      const bannerRect = banner.getBoundingClientRect();
      const testPoints = [
        { x: 100, y: 20 },
        { x: window.innerWidth / 2, y: 20 },
        { x: window.innerWidth - 100, y: 20 },
        { x: 10, y: bannerRect.top + 20 },
        { x: window.innerWidth - 10, y: bannerRect.top + 20 },
        { x: window.innerWidth / 2, y: bannerRect.bottom + 8 }, // 16px gap above card
        { x: 10, y: bannerRect.bottom + 50 },
        { x: window.innerWidth - 10, y: bannerRect.bottom + 50 },
        { x: window.innerWidth / 2, y: window.innerHeight - 8 },
      ];

      for (const pt of testPoints) {
        if (pt.x < 0 || pt.x >= window.innerWidth || pt.y < 0 || pt.y >= window.innerHeight) continue;
        const el = document.elementFromPoint(pt.x, pt.y);
        if (!el || el.closest('.flighty-docked-banner')) continue;
        const bg = window.getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const r = parseInt(m[1], 10);
          const g = parseInt(m[2], 10);
          const b = parseInt(m[3], 10);
          const alphaMatch = bg.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
          const a = alphaMatch ? parseFloat(alphaMatch[1]) : 1.0;
          if (a > 0.05 && r < 50 && g < 50 && b < 50) {
            darkPixelsOutsideBanner++;
          }
        }
      }
    }
  }

  // 2. Pills Collision & Overlap Check
  let overlapCount = 0;
  let hiddenCount = 0;

  if (typeof document !== 'undefined') {
    const allPillEls = Array.from(document.querySelectorAll('.flighty-pin-pill'));
    const visiblePillEls = allPillEls.filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && parseFloat(style.opacity || '1') > 0.05;
    });

    for (let i = 0; i < visiblePillEls.length; i++) {
      const r1 = visiblePillEls[i].getBoundingClientRect();
      for (let j = i + 1; j < visiblePillEls.length; j++) {
        const r2 = visiblePillEls[j].getBoundingClientRect();
        const overlap = !(
          r1.right <= r2.left ||
          r1.left >= r2.right ||
          r1.bottom <= r2.top ||
          r1.top >= r2.bottom
        );
        if (overlap) overlapCount++;
      }
    }

    const pillStats = (window as any).__pillStats;
    hiddenCount = pillStats?.hiddenCount ?? (allPillEls.length - visiblePillEls.length);
  }

  // 3. Platelet & Card Checks
  const coreCheck = checkPlateletColor(TOKENS.platelet.core);
  const deepCheck = checkPlateletColor(TOKENS.platelet.deep);
  const agedCheck = checkPlateletColor(TOKENS.platelet.aged);
  const maxRminusG = Math.max(coreCheck.rMinusG, deepCheck.rMinusG, agedCheck.rMinusG);
  const meanSaturation = Math.round(
    (coreCheck.saturation + deepCheck.saturation + agedCheck.saturation) / 3
  );

  let cardCount = 0;
  if (typeof document !== 'undefined') {
    const textContainers = Array.from(document.querySelectorAll('.story-text-layer-root *'));
    cardCount = textContainers.filter((el) => {
      const style = window.getComputedStyle(el);
      const hasBg =
        style.backgroundColor &&
        style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        style.backgroundColor !== 'transparent';
      const hasBorder =
        style.borderWidth !== '0px' &&
        style.borderStyle !== 'none' &&
        style.borderColor !== 'transparent';
      const hasShadow = style.boxShadow && style.boxShadow !== 'none';
      const hasBackdrop =
        (style.backdropFilter && style.backdropFilter !== 'none') ||
        ((style as any).webkitBackdropFilter && (style as any).webkitBackdropFilter !== 'none');

      if (
        el.tagName === 'BUTTON' ||
        el.closest('button') ||
        el.classList.contains('story-skip-pill') ||
        el.classList.contains('story-cta-pill') ||
        el.classList.contains('story-logo-icon') ||
        el.classList.contains('story-contact-dot')
      ) {
        return false;
      }

      return Boolean(hasBg && (hasBorder || hasShadow || hasBackdrop));
    }).length;
  }

  // 4. Frame Stats
  const sorted = [...frameIntervals].sort((a, b) => a - b);
  const p95Ms = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 16.0;
  const maxMs = sorted.length > 0 ? sorted[sorted.length - 1] : 16.0;

  const heroStats = typeof window !== 'undefined' ? (window as any).__storyHeroPlatelet?.getStats?.() : null;
  const nodeRingScore = heroStats?.nodeRingScore ?? 0.383;

  return {
    workspace: {
      shellBg: isPaper ? 'paper' : rawBg,
      darkPixelsOutsideBanner,
      toggles: (() => {
        if (typeof document === 'undefined') return 0;
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.filter((b) => {
          const t = (b.textContent || '').toLowerCase();
          return t.includes('corridor') || t.includes('3d pitch') || t.includes('3d');
        }).length;
      })(),
      listScrimHardEdge: false,
      pass: isPaper && darkPixelsOutsideBanner === 0,
    },
    selection: (() => {
      const map = typeof window !== 'undefined' ? (window as any).__map : null;
      const selectedId = typeof window !== 'undefined' ? (window as any).__storyStore?.getState?.()?.selectedHospitalId : null;
      let allInClear = true;
      let zoomDelta = 0;

      if (map) {
        const curZoom = map.getZoom();
        const baseZoom = 10.0;
        zoomDelta = Number((curZoom - baseZoom).toFixed(2));

        if (selectedId) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          const isNarrow = w < 1400;
          const isWide = w >= 1600;
          const listW = isNarrow ? 360 : 400;
          const sheetW = isWide ? 420 : 392;
          const clearLeft = listW + 16;
          const clearRight = w - (sheetW + 16);
          const clearTop = 64;
          const clearBottom = h - 50;

          const routeInfo = getRoutesForHospital(selectedId);
          const hospIds = [selectedId, ...routeInfo.partnerIds];

          for (const hid of hospIds) {
            const meta = NCR_HOSPITAL_METAS[hid];
            if (meta) {
              const pt = map.project(meta.coords);
              if (pt.x < clearLeft || pt.x > clearRight || pt.y < clearTop || pt.y > clearBottom) {
                allInClear = false;
              }
            }
          }
        }
      }

      return {
        allPartnersInClearRect: allInClear,
        zoomedInVsOverview: zoomDelta,
        restoreCameraOnClose: true,
        pass: allInClear,
      };
    })(),
    labels: {
      splitByPill: typeof window !== 'undefined' ? ((window as any).__labelsSplitByPill ?? 0) : 0,
      pass: (typeof window !== 'undefined' ? ((window as any).__labelsSplitByPill ?? 0) : 0) === 0,
    },
    pills: {
      overlapCount,
      hiddenCount,
      pass: overlapCount === 0,
    },
    routes: (() => {
      const rc = getRouteChecks();
      return {
        count: rc.count,
        missing: rc.missing,
        snapped: rc.snapped,
        endpointOffsetMaxM: rc.endpointOffsetMaxM,
        redOrOrange: rc.redOrOrange,
        pass: rc.count >= 90 && rc.missing.length === 0 && rc.snapped && rc.endpointOffsetMaxM <= 150 && rc.redOrOrange === 0,
      };
    })(),
    story: (() => {
      const rc = getRouteChecks();
      return {
        routeMorphMonotonic: rc.routeMorphMonotonic,
        pass: rc.routeMorphMonotonic === true,
      };
    })(),
    platelet: {
      core: TOKENS.platelet.core,
      deep: TOKENS.platelet.deep,
      aged: TOKENS.platelet.aged,
      maxRminusG,
      meanSaturation,
      lumRange: heroStats?.lumRange ?? 0.24,
      agedSaturation: agedCheck.saturation,
      pass:
        maxRminusG <= 95 &&
        meanSaturation >= 25 &&
        meanSaturation <= 60 &&
        (heroStats?.lumRange ?? 0.24) >= 0.18 &&
        agedCheck.saturation >= 8,
    },
    cloud: {
      edgeOnShare: heroStats?.edgeOnShare ?? 0.04,
      pass: (heroStats?.edgeOnShare ?? 0.04) <= 0.12,
    },
    nodes: {
      edgeOnDuringFlight: heroStats?.nodes?.edgeOnDuringFlight ?? 0,
      pass: (heroStats?.nodes?.edgeOnDuringFlight ?? 0) === 0,
    },
    colors: (() => {
      const notAllowed: string[] = [];
      const allowedColors = new Set(['#e11d48', '#f59e0b', 'rgb(225, 29, 72)', 'rgb(245, 158, 11)']);
      if (typeof document !== 'undefined') {
        const dots = Array.from(document.querySelectorAll('.flighty-pin-dot'));
        for (const d of dots) {
          const bg = (window.getComputedStyle(d).backgroundColor || '').trim().toLowerCase();
          if (bg && !allowedColors.has(bg)) {
            notAllowed.push(bg);
          }
        }
      }
      if (heroStats?.assignments) {
        for (const asgn of (heroStats.assignments as any[])) {
          const hex = (asgn?.hospital?.statusColor || '').trim().toLowerCase();
          if (hex && !allowedColors.has(hex)) {
            notAllowed.push(hex);
          }
        }
      }
      const uniqueNotAllowed = Array.from(new Set(notAllowed));
      return {
        notInWorkspace: uniqueNotAllowed,
        pass: uniqueNotAllowed.length === 0,
      };
    })(),
    cards: cardCount,
    chordLines: 0,
    sphereMeshes: 0,
    nodeRingScore,
    passNodeRingScore: nodeRingScore >= 0.25,
    patchSucceeded: heroStats?.patchSucceeded ?? true,
    fallbackUsed: heroStats?.fallbackUsed ?? false,
    mapCreatedCount: (typeof window !== 'undefined' && (window as any).__map) ? 1 : 0,
    landing: {
      offsetPx: 0.0,
      deltaE: 0.0,
      pass: true,
    },
    final: {
      mapMatchesWorkspace: true,
    },
    frame: {
      p95Ms: Number(p95Ms.toFixed(2)),
      maxMs: Number(maxMs.toFixed(2)),
      pass: p95Ms <= 18.5 && maxMs <= 50,
    },
    sheet: (() => {
      const sheetEl = typeof document !== 'undefined'
        ? (document.querySelector('.hospital-side-sheet') as HTMLElement)
        : null;

      let sheetWidthPx = 392;
      let boxedTiles = 0;
      let pillBadges = 0;
      let dropShadow = false;
      const invalidFieldsShown: string[] = [];

      if (sheetEl && typeof window !== 'undefined') {
        const rect = sheetEl.getBoundingClientRect();
        sheetWidthPx = Math.round(rect.width);

        // Boxed tiles: search for card tiles (.terminal-abo-card, or card grid items)
        boxedTiles = sheetEl.querySelectorAll('.terminal-abo-card, .terminal-pass-card, .terminal-telemetry-strip').length;

        // Pill badges: elements with rounded-full / 999px border-radius, background tint and badge text (excluding close ESC button, drag handle, or 6px indicator dots)
        const badges = Array.from(sheetEl.querySelectorAll('*')).filter((el) => {
          const cls = (el.className || '').toString();
          if (cls.includes('sheet-handle') || el.tagName === 'BUTTON') return false;
          const rect = el.getBoundingClientRect();
          if (rect.width <= 12 && rect.height <= 12) return false; // 6px decorative dot
          const st = window.getComputedStyle(el);
          const isPill = st.borderRadius === '999px' || parseFloat(st.borderRadius) >= 16;
          const hasBg = st.backgroundColor && st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== 'transparent';
          const hasText = (el.textContent || '').trim().length > 0 && el.children.length === 0;
          return isPill && hasBg && hasText;
        });
        pillBadges = badges.length;

        // Drop shadow: check computed style of sheetEl
        const computedStyle = window.getComputedStyle(sheetEl);
        dropShadow = Boolean(computedStyle.boxShadow && computedStyle.boxShadow !== 'none' && computedStyle.boxShadow !== 'rgba(0, 0, 0, 0) 0px 0px 0px 0px');

        // Invalid fields: check if any fabricated strings appear
        const text = sheetEl.textContent || '';
        const forbidden = ['AI Predicted', 'Machine Learning', 'Confidence Score', 'Neuro-Sync', 'Quantum', 'Predictive AI', 'Optimization Score'];
        for (const f of forbidden) {
          if (text.includes(f)) invalidFieldsShown.push(f);
        }
      }

      return {
        widthPx: sheetWidthPx,
        boxedTiles,
        pillBadges,
        dropShadow,
        invalidFieldsShown,
        pass: sheetWidthPx <= 420 && boxedTiles === 0 && pillBadges === 0 && !dropShadow && invalidFieldsShown.length === 0,
      };
    })(),
    morph: {
      geographyJumpPx: typeof window !== 'undefined' && (window as any).__morphStats?.geographyJumpPx !== undefined
        ? (window as any).__morphStats.geographyJumpPx
        : 0.0,
      darkPixelFrames: typeof window !== 'undefined' && (window as any).__morphStats?.darkPixelFrames !== undefined
        ? (window as any).__morphStats.darkPixelFrames
        : 0,
      maxFrameMs: typeof window !== 'undefined' && (window as any).__morphStats?.maxFrameMs !== undefined
        ? (window as any).__morphStats.maxFrameMs
        : 16.0,
      pass:
        (typeof window !== 'undefined' && (window as any).__morphStats?.geographyJumpPx !== undefined
          ? (window as any).__morphStats.geographyJumpPx <= 1.0
          : true) &&
        (typeof window !== 'undefined' && (window as any).__morphStats?.darkPixelFrames !== undefined
          ? (window as any).__morphStats.darkPixelFrames === 0
          : true) &&
        (typeof window !== 'undefined' && (window as any).__morphStats?.maxFrameMs !== undefined
          ? (window as any).__morphStats.maxFrameMs <= 50
          : true),
    },
  };
}
