import gsap from 'gsap';
import type maplibregl from 'maplibre-gl';
import { useStoryStore } from '../store/storyStore';

export interface MorphControllerOptions {
  onStartEnter?: () => void;
  onCompleteEnter?: () => void;
  onStartExit?: () => void;
  onCompleteExit?: () => void;
}

let morphTimeline: gsap.core.Timeline | null = null;
let currentDirection: 'enter' | 'exit' | null = null;
let enterResolve: (() => void) | null = null;
let exitResolve: (() => void) | null = null;
let activeOptions: MorphControllerOptions = {};

export function getMorphTimeline(): gsap.core.Timeline | null {
  return morphTimeline;
}

export function isMorphRunning(): boolean {
  return morphTimeline !== null && morphTimeline.isActive();
}

/**
 * Builds or refreshes the 1.3s GSAP timeline adhering strictly to LANDING_SPEC v4 §9:
 *
 * 0.00       Push #/workspace/map. Lenis stop + scroll lock.
 * 0.00-0.25  Text column and CTA fade out, translateY -12px. Three canvas fades out.
 * 0.00-0.95  Map container clip-path inset() to workspace card rect, radius 0 -> 28px.
 *            Rect is MEASURED from real workspace DOM at call time. Outside is paper.
 * 0.15-0.60  Header chrome (tabs, Solver button, "← Story") translateY 12px + fade. Logo stationary.
 * 0.25-0.75  Banner slides down 24px + fades in.
 * 0.35-0.95  Hospital panel slides in from x -32px; list cards stagger 40 ms.
 * 0.80-1.10  Pills settle; ripple-free; halos hold at workspace opacity.
 * 1.10-1.30  Rest. Interaction enabled. Unmount Story scene. Unlock scroll in workspace mode.
 */
export function buildMorphTimeline(map: maplibregl.Map | null): gsap.core.Timeline {
  if (morphTimeline) {
    morphTimeline.kill();
    morphTimeline = null;
  }

  // 1. Measure real workspace card rect from DOM (Measured once per call)
  let topInset = 132;
  let rightInset = 18;
  let bottomInset = 18;
  let leftInset = 18;
  const radius = 28;

  const frameEl = document.querySelector('.flighty-clipped-map-frame');
  if (frameEl) {
    const rect = frameEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      topInset = Math.round(rect.top);
      rightInset = Math.round(window.innerWidth - rect.right);
      bottomInset = Math.round(window.innerHeight - rect.bottom);
      leftInset = Math.round(rect.left);
    }
  }

  const mapStageEl = document.getElementById('persistent-map-stage');
  const threeContainer = document.getElementById('hero-platelet-canvas-container');
  const textLayer = document.querySelector('.story-text-layer-root');
  const ctaBtn = document.querySelector('.story-cta-btn') || document.querySelector('.story-skip-btn');
  const wsHeaderChrome = document.querySelectorAll(
    '.ws-topbar-clean .ws-back-story-btn, .ws-topbar-clean .ws-brand-divider, .ws-topbar-clean .ws-tab-switcher, .ws-topbar-clean .ws-topbar-right'
  );
  const wsBanner = document.querySelector('.flighty-docked-banner');
  const wsPanel = document.querySelector('.flighty-left-cards-stack');
  const wsCards = document.querySelectorAll('.flighty-card');
  const wsBottomFade = document.querySelector('.flighty-panel-bottom-fade');
  const wsPills = document.querySelectorAll('.flighty-pin-pill');

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power3.inOut' },
    onComplete: () => {
      currentDirection = null;

      // 1.10-1.30 rest ends: Interaction enabled & scroll unlocked
      if (map) {
        map.scrollZoom.enable();
        map.dragPan.enable();
        map.dragRotate.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();
      }
      document.body.style.overflow = '';

      activeOptions.onCompleteEnter?.();
      if (enterResolve) {
        const res = enterResolve;
        enterResolve = null;
        res();
      }
    },
    onReverseComplete: () => {
      currentDirection = null;

      if (mapStageEl) {
        mapStageEl.style.clipPath = 'none';
      }

      if (map) {
        map.scrollZoom.disable();
        map.dragPan.disable();
        map.dragRotate.disable();
      }

      // Restore Story at progress 1.0 and lenis.scrollTo(max, { immediate: true })
      useStoryStore.getState().setProgress(1.0);
      (window as any).__storyProgress = 1.0;
      if (typeof (window as any).__story?.setProgress === 'function') {
        (window as any).__story.setProgress(1.0);
      }

      const lenis = (window as any).__lenis;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (lenis && maxScroll > 0) {
        lenis.scrollTo(maxScroll, { immediate: true });
        lenis.start();
      }
      document.body.style.overflow = '';

      activeOptions.onCompleteExit?.();
      if (exitResolve) {
        const res = exitResolve;
        exitResolve = null;
        res();
      }
    },
  });

  // ── 0.00 - 0.25: Story Text + CTA + Story Topbar fade out, translateY -12px ──
  if (textLayer) {
    tl.fromTo(
      textLayer,
      { opacity: 1, y: 0 },
      { opacity: 0, y: -12, duration: 0.25, ease: 'power2.inOut' },
      0.0
    );
  }
  if (ctaBtn) {
    tl.fromTo(
      ctaBtn,
      { opacity: 1, y: 0 },
      { opacity: 0, y: -12, duration: 0.25, ease: 'power2.inOut' },
      0.0
    );
  }
  const storyTopbar = document.querySelector('.story-topbar');
  if (storyTopbar) {
    tl.fromTo(
      storyTopbar,
      { opacity: 1, y: 0 },
      { opacity: 0, y: -12, duration: 0.25, ease: 'power2.inOut' },
      0.0
    );
  }

  // ── 0.00 - 0.25: Three canvas fades ──
  if (threeContainer) {
    tl.fromTo(
      threeContainer,
      { opacity: 1 },
      { opacity: 0, duration: 0.25, ease: 'power2.inOut' },
      0.0
    );
  }

  // ── 0.00 - 0.95: Map container clip-path inset() to workspace card rect ──
  if (mapStageEl) {
    tl.fromTo(
      mapStageEl,
      {
        clipPath: 'inset(0px 0px 0px 0px round 0px)',
      },
      {
        clipPath: `inset(${topInset}px ${rightInset}px ${bottomInset}px ${leftInset}px round ${radius}px)`,
        duration: 0.95,
        ease: 'power3.inOut',
      },
      0.0
    );
  }

  // ── 0.15 - 0.60: Workspace Header chrome fades in with translateY 12px (logo does not move) ──
  const wsChromeTargets = (wsHeaderChrome && wsHeaderChrome.length > 0)
    ? wsHeaderChrome
    : document.querySelector('.ws-topbar-clean');
  if (wsChromeTargets) {
    tl.fromTo(
      wsChromeTargets,
      { opacity: 0, y: -12 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      0.15
    );
  }

  // Explicitly ensure ALL workspace elements start hidden at t = 0 (before their respective reveal times)
  const chromeList = wsHeaderChrome && wsHeaderChrome.length > 0
    ? Array.from(wsHeaderChrome)
    : [document.querySelector('.ws-topbar-clean')].filter(Boolean);

  const allWsElements = [
    ...chromeList,
    wsBanner,
    wsPanel,
    ...Array.from(wsCards),
    wsBottomFade,
    ...Array.from(wsPills),
  ].filter(Boolean);

  if (allWsElements.length > 0) {
    tl.set(allWsElements, { opacity: 0 }, 0.0);
  }

  // ── 0.25 - 0.75: Banner slides down 24px + fades in ──
  if (wsBanner) {
    tl.fromTo(
      wsBanner,
      { opacity: 0, y: -24 },
      { opacity: 1, y: 0, duration: 0.50, ease: 'power3.out' },
      0.25
    );
  }

  // ── 0.35 - 0.95: Hospital panel slides in from x -32px; list cards stagger 40ms ──
  if (wsPanel) {
    tl.fromTo(
      wsPanel,
      { opacity: 0, x: -32 },
      { opacity: 1, x: 0, duration: 0.60, ease: 'power2.out' },
      0.35
    );
  }
  if (wsCards && wsCards.length > 0) {
    tl.fromTo(
      wsCards,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' },
      0.35
    );
  }
  if (wsBottomFade) {
    tl.fromTo(
      wsBottomFade,
      { opacity: 0 },
      { opacity: 1, duration: 0.40, ease: 'power2.out' },
      0.55
    );
  }

  // ── 0.80 - 1.10: Pills settle; ripple-free; halos hold at workspace opacity ──
  if (wsPills && wsPills.length > 0) {
    tl.fromTo(
      wsPills,
      { opacity: 0 },
      { opacity: 1, duration: 0.30, ease: 'power2.out' },
      0.80
    );
  }

  // ── 1.10 - 1.30: Rest period (200ms) ──
  tl.to({}, { duration: 0.20 }, 1.10);

  morphTimeline = tl;
  return tl;
}

/**
 * Executes enterWorkspace() per Spec §9
 * Triggers forward playhead 0.00 -> 1.30s.
 * If mid-exit, seamlessly reverses forward from current playhead without restart.
 */
export function executeEnterWorkspace(
  map: maplibregl.Map | null,
  options: MorphControllerOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    activeOptions = { ...activeOptions, ...options };
    enterResolve = resolve;

    // 0.00: Push #/workspace/map, Lenis stop + scroll lock
    if (window.location.hash !== '#/workspace/map') {
      window.history.pushState(null, '', '#/workspace/map');
    }
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';

    if (map) {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.dragRotate.disable();
    }

    options.onStartEnter?.();

    if (morphTimeline && currentDirection === 'exit') {
      // INTERRUPT: reverse running timeline forward from current playhead! Never restart!
      currentDirection = 'enter';
      morphTimeline.play();
      return;
    }

    if (morphTimeline && currentDirection === 'enter' && morphTimeline.isActive()) {
      // Already running forward
      return;
    }

    currentDirection = 'enter';
    const tl = buildMorphTimeline(map);
    tl.play(0);
  });
}

/**
 * Executes exitToStory() per Spec §9
 * Exact reverse: 1.30s -> 0.00s.
 * If mid-enter, seamlessly reverses backward from current playhead without restart.
 */
export function executeExitToStory(
  map: maplibregl.Map | null,
  options: MorphControllerOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    activeOptions = { ...activeOptions, ...options };
    exitResolve = resolve;

    options.onStartExit?.();

    if (map) {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.dragRotate.disable();
    }

    if (window.location.hash !== '#/' && window.location.hash !== '') {
      window.history.pushState(null, '', '#/');
    }
    const lenis = (window as any).__lenis;
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';

    if (morphTimeline && currentDirection === 'enter') {
      // INTERRUPT: reverse running timeline backward from current playhead! Never restart!
      currentDirection = 'exit';
      morphTimeline.reverse();
      return;
    }

    if (morphTimeline && currentDirection === 'exit' && morphTimeline.isActive()) {
      // Already running backward
      return;
    }

    currentDirection = 'exit';
    if (!morphTimeline) {
      buildMorphTimeline(map);
    }
    // Seek to 1.30s (full workspace state) and reverse to 0.00s!
    morphTimeline!.seek(1.30);
    morphTimeline!.reverse();
  });
}
