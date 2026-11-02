import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import StoryTextLayer from './StoryTextLayer';
import { applyStoryCamera } from '../../story/stageCamera';
import { syncStoryPlaceNameLabels } from '../../story/clinicalAtlasStyle';
import { runAllStoryChecks } from '../../story/storyChecks';

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onRunDemo?: () => void;
}

export default function LandingPage({ onOpenWorkspace }: LandingPageProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // 1. Lenis Smooth Scroll Setup (Spec §4: lerp 0.08, 800vh, autoRaf: false)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.85,
      lerp: 0.08,
      autoRaf: false, // Driven strictly by gsap.ticker
    });
    lenisRef.current = lenis;
    (window as any).__lenis = lenis;

    const initP = typeof (window as any).__storyProgress === 'number' ? (window as any).__storyProgress : 0;
    let targetProgress = initP;
    let displayedProgress = initP;

    if (initP > 0.9) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        window.scrollTo(0, maxScroll);
        lenis.scrollTo(maxScroll, { immediate: true });
      }
    }

    lenis.on('scroll', (e: { progress: number; direction: number }) => {
      targetProgress = e.progress;
      if (e.progress >= 0.985 && e.direction > 0) {
        onOpenWorkspace();
      }
    });

    // 2. Performance Tracking for window.__story.checks()
    const frameIntervals: number[] = [];
    let lastFrameTime = performance.now();
    let startupFrameCount = 0;

    // 3. ONE LOOP Architecture (Spec §4)
    // gsap.ticker drives lenis.raf and a single frame(dt).
    // Damped progress: p += (target - p) * (1 - Math.exp(-dt * 7)).
    // Update order each frame: map camera -> Three scene -> DOM.
    gsap.ticker.lagSmoothing(0);

    const tick = (time: number, deltaTime: number) => {
      const now = performance.now();
      const deltaMs = now - lastFrameTime;
      lastFrameTime = now;

      // Skip the first 10 frames during WebGL compile and map initialization
      if (startupFrameCount < 10) {
        startupFrameCount++;
      } else if (deltaMs > 1 && deltaMs < 100) {
        frameIntervals.push(deltaMs);
        if (frameIntervals.length > 300) frameIntervals.shift();
      }

      // Drive Lenis scroll engine
      lenis.raf(time * 1000);

      // Damped progress formula per Spec §4 (dt in seconds)
      const dt = Math.min(0.1, deltaTime / 1000);
      displayedProgress += (targetProgress - displayedProgress) * (1 - Math.exp(-dt * 7));
      if (Math.abs(targetProgress - displayedProgress) < 0.00005) {
        displayedProgress = targetProgress;
      }
      const p = displayedProgress;
      (window as any).__storyProgress = p;

      // ── Step 1: Map Camera (Spec §2 & §4: push 0->0.28, then frozen) ──
      const map = (window as any).__map;
      if (map) {
        applyStoryCamera(map, p);
        syncStoryPlaceNameLabels(map, p, 'story');
      }
      if (typeof (window as any).__updateStoryOverlays === 'function') {
        (window as any).__updateStoryOverlays(p);
      }

      // ── Step 2: Three Scene (Hero platelet, wobble, aging, cracks) ──
      const heroController = (window as any).__storyHeroPlatelet;
      if (heroController && typeof heroController.update === 'function') {
        heroController.update(p, dt, time);
      }

      // ── Step 3: DOM (Transforms & opacities only) ──
      const domController = (window as any).__storyDOM;
      if (domController && typeof domController.update === 'function') {
        domController.update(p);
      }

      // Story Paper Veil (Spec §3: opacity 0.55 -> 0 over 0 -> 0.30)
      const veil = document.getElementById('story-paper-veil');
      if (veil) {
        if (p <= 0.30) {
          const veilAlpha = 0.55 * (1 - p / 0.30);
          veil.style.opacity = `${Math.max(0, veilAlpha).toFixed(3)}`;
          veil.style.display = 'block';
        } else {
          veil.style.opacity = '0.0';
          veil.style.display = 'none';
        }
      }
    };

    gsap.ticker.add(tick);

    // 4. DEV CHECKS: Expose window.__story = { setProgress(p), checks() }
    const setProgressImperative = (p: number) => {
      targetProgress = Math.max(0, Math.min(1, p));
      displayedProgress = targetProgress;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        window.scrollTo(0, targetProgress * maxScroll);
        lenis.scrollTo(targetProgress * maxScroll, { immediate: true });
      }

      // Immediate synchronous frame update
      const map = (window as any).__map;
      if (map) {
        applyStoryCamera(map, p);
        syncStoryPlaceNameLabels(map, p, 'story');
      }
      if (typeof (window as any).__updateStoryOverlays === 'function') {
        (window as any).__updateStoryOverlays(p);
      }
      const hero = (window as any).__storyHeroPlatelet;
      if (hero) hero.update(p, 0.016, performance.now() / 1000);
      const dom = (window as any).__storyDOM;
      if (dom) dom.update(p);

      const veil = document.getElementById('story-paper-veil');
      if (veil) {
        const veilAlpha = p <= 0.30 ? 0.55 * (1 - p / 0.30) : 0;
        veil.style.opacity = `${Math.max(0, veilAlpha).toFixed(3)}`;
        veil.style.display = p <= 0.30 ? 'block' : 'none';
      }
    };

    (window as any).__story = {
      ...(window as any).__story,
      setProgress: setProgressImperative,
      setHaloOpacity: (op: number) => {
        if (typeof (window as any).__setHaloOpacity === 'function') {
          (window as any).__setHaloOpacity(op);
        }
      },
      checks: () => runAllStoryChecks(frameIntervals),
    };

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
      (window as any).__lenis = null;
    };
  }, [onOpenWorkspace]);

  return (
    <div
      id="landing-scroll-root"
      style={{
        position: 'relative',
        width: '100%',
        height: '800vh', // Spec §4: Scroll 800vh
        backgroundColor: 'transparent',
      }}
    >
      {/* Pure DOM text layer: zero cards, pure typography */}
      <StoryTextLayer onOpenMap={onOpenWorkspace} />
    </div>
  );
}
