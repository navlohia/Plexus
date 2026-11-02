import { useEffect, useRef } from 'react';
import { Droplets, ArrowRight } from 'lucide-react';
import { TOKENS, lerpColor } from '../../story/palette';
import { STORY_BEATS } from '../../story/copy';

interface StoryTextLayerProps {
  onOpenMap?: () => void;
}

export default function StoryTextLayer({ onOpenMap }: StoryTextLayerProps) {
  // DOM element refs for pure imperative per-frame updates (zero React re-renders)
  const beatHeroRef = useRef<HTMLDivElement>(null);
  const beatAgingRef = useRef<HTMLDivElement>(null);
  const beatCracksRef = useRef<HTMLDivElement>(null);
  const beatDriftRef = useRef<HTMLDivElement>(null);
  const beatRescueRef = useRef<HTMLDivElement>(null);
  const beatSettleRef = useRef<HTMLDivElement>(null);

  const clockContainerRef = useRef<HTMLDivElement>(null);
  const clockTextRef = useRef<HTMLSpanElement>(null);
  const clockBarFillRef = useRef<HTMLDivElement>(null);

  const scrollCueRef = useRef<HTMLDivElement>(null);
  const annotationsRef = useRef<HTMLDivElement>(null);
  const annotationUpperRef = useRef<HTMLDivElement>(null);
  const annotationLowerRef = useRef<HTMLDivElement>(null);
  const annotationUpperLeftRef = useRef<HTMLDivElement>(null);

  const countdownTextRef = useRef<HTMLSpanElement>(null);
  const heroScrollFillRef = useRef<HTMLDivElement>(null);
  const heroScrollTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Live ticking countdown timer for 119:59:42 REMAINING
    const baseTotalSeconds = 119 * 3600 + 59 * 60 + 42;
    const startTime = performance.now();
    const interval = setInterval(() => {
      const elapsedSec = Math.floor((performance.now() - startTime) / 1000);
      const remaining = Math.max(0, baseTotalSeconds - elapsedSec);
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      if (countdownTextRef.current) {
        countdownTextRef.current.textContent = `${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} REMAINING`;
      }
    }, 1000);

    const onPlateletPulse = () => {
      if (countdownTextRef.current) {
        countdownTextRef.current.style.color = '#E11D48';
        setTimeout(() => {
          if (countdownTextRef.current) countdownTextRef.current.style.color = '';
        }, 600);
      }
    };
    window.addEventListener('platelet-pulse-click', onPlateletPulse);

    return () => {
      clearInterval(interval);
      window.removeEventListener('platelet-pulse-click', onPlateletPulse);
    };
  }, []);

  useEffect(() => {
    /**
     * Imperative DOM update driven strictly by the ONE LOOP (gsap.ticker)
     * All updates are transform / opacity only (Spec §4).
     */
    const updateDOM = (progress: number) => {
      // ── 1. Hero Beat (0.00 - 0.12) ──
      // Visible 0.00 -> 0.10, fades out 0.10 -> 0.12
      if (beatHeroRef.current) {
        if (progress <= 0.10) {
          beatHeroRef.current.style.opacity = '1.0';
          beatHeroRef.current.style.transform = 'translateY(0px)';
          beatHeroRef.current.style.display = 'block';
        } else if (progress <= 0.12) {
          const tOut = (progress - 0.10) / 0.02;
          beatHeroRef.current.style.opacity = `${Math.max(0, 1 - tOut).toFixed(3)}`;
          beatHeroRef.current.style.transform = `translateY(-${(16 * tOut).toFixed(1)}px)`;
          beatHeroRef.current.style.display = 'block';
        } else {
          beatHeroRef.current.style.opacity = '0.0';
          beatHeroRef.current.style.display = 'none';
        }
      }

      // ── 2. Aging Beat (0.12 - 0.28) ──
      // Fades in 0.12 -> 0.14, holds 0.14 -> 0.265, fades out 0.265 -> 0.28
      if (beatAgingRef.current) {
        if (progress < 0.12 || progress > 0.285) {
          beatAgingRef.current.style.opacity = '0.0';
          beatAgingRef.current.style.display = 'none';
        } else if (progress < 0.14) {
          const tIn = (progress - 0.12) / 0.02;
          beatAgingRef.current.style.opacity = `${Math.min(1, tIn).toFixed(3)}`;
          beatAgingRef.current.style.transform = `translateY(${((1 - tIn) * 16).toFixed(1)}px)`;
          beatAgingRef.current.style.display = 'block';
        } else if (progress <= 0.265) {
          beatAgingRef.current.style.opacity = '1.0';
          beatAgingRef.current.style.transform = 'translateY(0px)';
          beatAgingRef.current.style.display = 'block';
        } else {
          const tOut = (progress - 0.265) / 0.015;
          beatAgingRef.current.style.opacity = `${Math.max(0, 1 - tOut).toFixed(3)}`;
          beatAgingRef.current.style.transform = `translateY(-${(16 * tOut).toFixed(1)}px)`;
          beatAgingRef.current.style.display = 'block';
        }
      }

      // ── 3. Dissolve Beat (0.28 - 0.44) ──
      // "25 hospitals. One clock." / "One blood bank's surplus is another's shortage."
      if (beatCracksRef.current) {
        if (progress < 0.275 || progress > 0.44) {
          beatCracksRef.current.style.opacity = '0.0';
          beatCracksRef.current.style.display = 'none';
        } else if (progress <= 0.285) {
          const tIn = (progress - 0.275) / 0.01;
          beatCracksRef.current.style.opacity = `${Math.min(1, tIn).toFixed(3)}`;
          beatCracksRef.current.style.transform = `translateY(${((1 - tIn) * 16).toFixed(1)}px)`;
          beatCracksRef.current.style.display = 'block';
        } else if (progress <= 0.42) {
          beatCracksRef.current.style.opacity = '1.0';
          beatCracksRef.current.style.transform = 'translateY(0px)';
          beatCracksRef.current.style.display = 'block';
        } else {
          const tOut = (progress - 0.42) / 0.02;
          beatCracksRef.current.style.opacity = `${Math.max(0, 1 - tOut).toFixed(3)}`;
          beatCracksRef.current.style.transform = `translateY(-${(16 * tOut).toFixed(1)}px)`;
          beatCracksRef.current.style.display = 'block';
        }
      }

      // ── 4. Drift Beat (0.44 - 0.528) ──
      // "The blood exists. It's in the wrong building." / "Each hospital sees only its own shelf."
      if (beatDriftRef.current) {
        if (progress < 0.43 || progress > 0.528) {
          beatDriftRef.current.style.opacity = '0.0';
          beatDriftRef.current.style.display = 'none';
        } else if (progress <= 0.45) {
          const tIn = (progress - 0.43) / 0.02;
          beatDriftRef.current.style.opacity = `${Math.min(1, tIn).toFixed(3)}`;
          beatDriftRef.current.style.transform = `translateY(${((1 - tIn) * 16).toFixed(1)}px)`;
          beatDriftRef.current.style.display = 'block';
        } else if (progress <= 0.51) {
          beatDriftRef.current.style.opacity = '1.0';
          beatDriftRef.current.style.transform = 'translateY(0px)';
          beatDriftRef.current.style.display = 'block';
        } else {
          const tOut = (progress - 0.51) / 0.018;
          beatDriftRef.current.style.opacity = `${Math.max(0, 1 - tOut).toFixed(3)}`;
          beatDriftRef.current.style.transform = `translateY(-${(16 * tOut).toFixed(1)}px)`;
          beatDriftRef.current.style.display = 'block';
        }
      }

      // ── 5. Rescue Beat (0.54 - 0.72) ──
      // "Plexus moves it before it expires." / "Lateral transshipment across Delhi-NCR..."
      if (beatRescueRef.current) {
        if (progress < 0.528 || progress > 0.72) {
          beatRescueRef.current.style.opacity = '0.0';
          beatRescueRef.current.style.display = 'none';
        } else if (progress <= 0.54) {
          const tIn = (progress - 0.528) / 0.012;
          beatRescueRef.current.style.opacity = `${Math.min(1, tIn).toFixed(3)}`;
          beatRescueRef.current.style.transform = `translateY(${((1 - tIn) * 16).toFixed(1)}px)`;
          beatRescueRef.current.style.display = 'block';
        } else if (progress <= 0.70) {
          beatRescueRef.current.style.opacity = '1.0';
          beatRescueRef.current.style.transform = 'translateY(0px)';
          beatRescueRef.current.style.display = 'block';
        } else {
          const tOut = (progress - 0.70) / 0.02;
          beatRescueRef.current.style.opacity = `${Math.max(0, 1 - tOut).toFixed(3)}`;
          beatRescueRef.current.style.transform = `translateY(-${(16 * tOut).toFixed(1)}px)`;
          beatRescueRef.current.style.display = 'block';
        }
      }

      // ── 6. Settle Beat (0.72 - 0.985+) ──
      // "The mesh, live." + CTA ("Open the map →")
      if (beatSettleRef.current) {
        if (progress < 0.72) {
          beatSettleRef.current.style.opacity = '0.0';
          beatSettleRef.current.style.display = 'none';
        } else if (progress <= 0.76) {
          const tIn = (progress - 0.72) / 0.04;
          beatSettleRef.current.style.opacity = `${Math.min(1, tIn).toFixed(3)}`;
          beatSettleRef.current.style.transform = `translateY(${((1 - tIn) * 16).toFixed(1)}px)`;
          beatSettleRef.current.style.display = 'block';
        } else {
          beatSettleRef.current.style.opacity = '1.0';
          beatSettleRef.current.style.transform = 'translateY(0px)';
          beatSettleRef.current.style.display = 'block';
        }
      }

      // ── 4. Clock Counter (Spec §10) ──
      // Reaches 120h at 0.31, gone by 0.34. Ink until 96h, then red.
      if (clockContainerRef.current) {
        if (progress < 0.12 || progress >= 0.34) {
          clockContainerRef.current.style.opacity = '0.0';
          clockContainerRef.current.style.display = 'none';
        } else {
          clockContainerRef.current.style.display = 'flex';
          let clockAlpha = 1.0;
          if (progress < 0.14) {
            clockAlpha = (progress - 0.12) / 0.02;
          } else if (progress > 0.31) {
            clockAlpha = Math.max(0, 1.0 - (progress - 0.31) / 0.03);
          }
          clockContainerRef.current.style.opacity = `${clockAlpha.toFixed(3)}`;

          // Reaches 120 at 0.31
          const tHours = Math.min(1.0, Math.max(0, (progress - 0.12) / (0.31 - 0.12)));
          const hours = Math.round(tHours * 120);

          let color = TOKENS.ink;
          if (hours >= 96) {
            const tRed = (hours - 96) / (120 - 96);
            color = lerpColor(TOKENS.ink, TOKENS.red, tRed);
          }

          if (clockTextRef.current) {
            clockTextRef.current.textContent = `${String(hours).padStart(3, '0')}h / 120h`;
            clockTextRef.current.style.color = color;
          }
          if (clockBarFillRef.current) {
            clockBarFillRef.current.style.width = `${(tHours * 100).toFixed(1)}%`;
            clockBarFillRef.current.style.backgroundColor = color;
          }
        }
      }

      // ── 5. Scroll Cue (Spec §10: gone after 0.03, never touches text) ──
      if (scrollCueRef.current) {
        if (progress <= 0.03) {
          const cueAlpha = 1.0 - progress / 0.03;
          scrollCueRef.current.style.opacity = `${cueAlpha.toFixed(3)}`;
          scrollCueRef.current.style.display = 'flex';
        } else {
          scrollCueRef.current.style.opacity = '0.0';
          scrollCueRef.current.style.display = 'none';
        }
      }

      // ── Hero Scroll Meter (Stage 1) ──
      if (heroScrollFillRef.current) {
        heroScrollFillRef.current.style.width = `${(Math.min(1.0, progress / 0.12) * 100).toFixed(0)}%`;
      }
      if (heroScrollTextRef.current) {
        heroScrollTextRef.current.textContent = `${(progress * 100).toFixed(0)}% SCROLLED`;
      }

      // ── 6. Platelet Annotations (0.00 - 0.12, right stage) ──
      const annot = (window as any).__plateletAnnotations;
      if (annotationsRef.current) {
        if (progress <= 0.12) {
          const alpha = annot?.opacity !== undefined ? annot.opacity : (progress <= 0.10 ? 1.0 : Math.max(0, 1.0 - (progress - 0.10) / 0.02));
          annotationsRef.current.style.opacity = `${alpha.toFixed(3)}`;
          annotationsRef.current.style.display = 'block';

          if (annot && annot.upper && annotationUpperRef.current) {
            annotationUpperRef.current.style.transform = `translate3d(${annot.upper.x.toFixed(1)}px, ${annot.upper.y.toFixed(1)}px, 0)`;
          }
          if (annot && annot.lower && annotationLowerRef.current) {
            annotationLowerRef.current.style.transform = `translate3d(${annot.lower.x.toFixed(1)}px, ${annot.lower.y.toFixed(1)}px, 0)`;
          }
          if (annot && annot.upperLeft && annotationUpperLeftRef.current) {
            annotationUpperLeftRef.current.style.transform = `translate3d(${annot.upperLeft.x.toFixed(1)}px, ${annot.upperLeft.y.toFixed(1)}px, 0)`;
          }
        } else {
          annotationsRef.current.style.opacity = '0.0';
          annotationsRef.current.style.display = 'none';
        }
      }
    };

    (window as any).__storyDOM = { update: updateDOM };

    // Initial update at progress 0
    updateDOM(0);

    return () => {
      (window as any).__storyDOM = null;
    };
  }, []);

  return (
    <div
      className="story-text-layer-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{`
        /* SPEC §10: Typography and Layout */
        .story-headline {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(2rem, 4.2vw, 4.5rem);
          line-height: 1.06;
          letter-spacing: -0.03em;
          text-align: left;
          max-width: 32vw;
          margin: 0;
          font-weight: 600;
          color: #111827;
        }

        .story-headline-line {
          display: block;
          white-space: nowrap;
        }

        .story-subhead {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          line-height: 1.5;
          letter-spacing: -0.01em;
          text-align: left;
          text-wrap: pretty;
          max-width: 30vw;
          margin-top: 18px;
          margin-bottom: 0;
          color: #4B5563;
        }

        /* Pure layout column: NO card, NO background, NO border, NO shadow, NO backdrop-filter */
        .story-left-column {
          position: absolute;
          left: 8vw;
          bottom: 16vh;
          width: 34vw;
          max-width: 36vw;
          height: 380px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          user-select: none;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }

        .story-beat-item {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
        }

        /* Clock counter at bottom-right of stage (NO card, NO box) */
        .story-stage-clock {
          position: absolute;
          right: 8vw;
          bottom: 7vh;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          user-select: none;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
        }

        .story-clock-digits {
          font-family: 'JetBrains Mono', monospace;
          font-variant-numeric: tabular-nums;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #111827;
        }

        .story-clock-track {
          width: 110px;
          height: 1px;
          background: #E5E7EB;
          position: relative;
          overflow: hidden;
        }

        .story-clock-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0%;
          background: #111827;
          transition: none;
        }

        /* Scroll cue: bottom-center of left column, never touches text */
        .story-scroll-cue {
          position: absolute;
          left: 8vw;
          bottom: 5vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          user-select: none;
          background: transparent;
          border: none;
          box-shadow: none;
          backdrop-filter: none;
        }

        .story-scroll-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: #9CA3AF;
        }

        .story-scroll-line {
          width: 1px;
          height: 24px;
          background: linear-gradient(to bottom, #9CA3AF, transparent);
        }

        /* Top Bar: exact workspace logo component + Skip pill */
        .story-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          z-index: 20;
          pointer-events: none;
        }

        .story-workspace-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          pointer-events: auto;
          cursor: pointer;
        }

        .story-logo-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: #15997A;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(21, 153, 122, 0.28);
        }

        .story-logo-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 17.5px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .story-skip-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 9999px;
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          color: #111827;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.15s ease;
        }
        .story-skip-pill:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
          transform: translateY(-1px);
        }

        /* Mobile Layout */
        @media (max-width: 700px) {
          .story-left-column {
            left: 20px !important;
            right: 20px !important;
            bottom: 36px !important;
            top: auto !important;
            width: auto !important;
            max-width: calc(100% - 40px) !important;
            height: 180px !important;
          }
          .story-headline {
            font-size: clamp(1.75rem, 6.8vw, 2.3rem) !important;
            line-height: 1.08 !important;
            max-width: 100% !important;
            text-wrap: balance !important;
          }
          .story-headline-line {
            display: inline !important;
            white-space: normal !important;
          }
          .story-subhead {
            font-size: 13.5px !important;
            max-width: 100% !important;
            margin-top: 10px !important;
          }
          .story-stage-clock {
            right: 20px !important;
            bottom: 210px !important;
          }
          .story-scroll-cue {
            display: none !important;
          }
          .story-annotations-layer {
            display: none !important;
          }
          .story-topbar {
            padding: 0 16px !important;
          }
          #story-debug-readout,
          .platelet-dev-controls {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Header: Exact workspace logo top-left + Skip to map pill top-right (Spec §2) */}
      <div className="story-topbar">
        <div className="story-workspace-logo" onClick={onOpenMap}>
          <div className="story-logo-icon">
            <Droplets size={16} strokeWidth={2.5} color="#FFFFFF" />
          </div>
          <span className="story-logo-text">Plexus</span>
        </div>

        <button
          type="button"
          onClick={onOpenMap}
          className="story-skip-pill"
          title="Skip straight to live map workspace"
        >
          <span>SKIP TO MAP</span>
          <ArrowRight size={13} strokeWidth={2.2} />
        </button>
      </div>

      {/* 2. Left Column Text (x 8vw-40vw, max-width 36vw, NO cards, pure typography, explicit line breaks) */}
      <div className="story-left-column">
        {/* Beat 0: Hero (0.00 - 0.12) */}
        <div ref={beatHeroRef} className="story-beat-item" style={{ opacity: 1 }}>
          {/* Sleek Frosted Glass Telemetry Strip */}
          <button
            type="button"
            className="story-telemetry-badge"
            title="Autonomous Blood Grid Status"
          >
            <span className="telemetry-badge-dot" />
            <span>DELHI-NCR AUTONOMOUS MESH</span>
            <span className="telemetry-sep">|</span>
            <span>25 HOSPITALS</span>
            <span className="telemetry-sep">|</span>
            <span>FEFO ENGINE ARMED</span>
          </button>

          <h1 className="story-headline">
            {STORY_BEATS.hero.headlineLines.map((line, idx) => (
              <span key={idx} className="story-headline-line">{line}</span>
            ))}
          </h1>
          <p className="story-subhead">{STORY_BEATS.hero.subhead}</p>

          {/* Action Row: High-Contrast Dark Slate CTA + Scroll Progress Bar */}
          <div className="hero-action-row">
            <button
              type="button"
              onClick={onOpenMap}
              className="hero-explore-btn"
              title="Launch live blood distribution mesh"
            >
              <span className="hero-btn-pulse-dot" />
              <span>Explore Live Mesh</span>
              <ArrowRight size={13} strokeWidth={2.5} className="hero-btn-arrow" />
            </button>

            <button
              type="button"
              className="hero-scroll-meter-pill"
              title="Scroll down to inspect life cycle"
            >
              <div className="hero-scroll-track">
                <div ref={heroScrollFillRef} className="hero-scroll-fill" />
              </div>
              <span ref={heroScrollTextRef} className="hero-scroll-percent">0% SCROLLED</span>
            </button>
          </div>
        </div>

        {/* Beat 1: Aging (0.12 - 0.28) */}
        <div ref={beatAgingRef} className="story-beat-item" style={{ opacity: 0, display: 'none' }}>
          <h1 className="story-headline">
            {STORY_BEATS.clock.headlineLines.map((line, idx) => (
              <span key={idx} className="story-headline-line">{line}</span>
            ))}
          </h1>
        </div>

        {/* Beat 2: Dissolve (0.28 - 0.44) */}
        <div ref={beatCracksRef} className="story-beat-item" style={{ opacity: 0, display: 'none' }}>
          <h1 className="story-headline">
            {STORY_BEATS.fracture.headlineLines.map((line, idx) => (
              <span key={idx} className="story-headline-line">{line}</span>
            ))}
          </h1>
          <p className="story-subhead">{STORY_BEATS.fracture.subhead}</p>
        </div>

        {/* Beat 3: Drift (0.44 - 0.54) */}
        <div ref={beatDriftRef} className="story-beat-item" style={{ opacity: 0, display: 'none' }}>
          <h1 className="story-headline">
            {STORY_BEATS.swarm.headlineLines.map((line, idx) => (
              <span key={idx} className="story-headline-line">{line}</span>
            ))}
          </h1>
          <p className="story-subhead">{STORY_BEATS.swarm.subhead}</p>
        </div>

        {/* Beat 4: Rescue (0.54 - 0.72) */}
        <div ref={beatRescueRef} className="story-beat-item" style={{ opacity: 0, display: 'none' }}>
          <h1 className="story-headline">
            {STORY_BEATS.rescue.headlineLines.map((line, idx) => (
              <span key={idx} className="story-headline-line">{line}</span>
            ))}
          </h1>
          <p className="story-subhead">{STORY_BEATS.rescue.subhead}</p>
        </div>

        {/* Beat 5: Settle (0.72 - 0.985+) */}
        <div ref={beatSettleRef} className="story-beat-item" style={{ opacity: 0, display: 'none' }}>
          <h1 className="story-headline">
            {STORY_BEATS.dive.headlineLines.map((line, idx) => (
              <span key={idx} className="story-headline-line">{line}</span>
            ))}
          </h1>
          <button
            type="button"
            onClick={onOpenMap}
            className="story-cta-pill"
            style={{
              marginTop: '22px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              background: '#15997A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              pointerEvents: 'auto',
              boxShadow: '0 4px 14px rgba(21, 153, 122, 0.32)',
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
          >
            <span>Open the map →</span>
          </button>
        </div>
      </div>

      {/* 3. Hero Platelet Interactive Callout Pills (3D anchored rim points, 4px ruby contact dot, frosted-glass telemetry) */}
      <div
        ref={annotationsRef}
        className="story-annotations-layer"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 1,
          zIndex: 15,
        }}
      >
        {/* Upper-Right annotation: ● 119:59:42 REMAINING (anchored to upper-right rim) */}
        <div
          ref={annotationUpperRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'flex',
            alignItems: 'center',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
            pointerEvents: 'none',
          }}
        >
          {/* 4px ruby contact dot ON silhouette */}
          <div
            className="story-contact-dot"
            style={{
              position: 'absolute',
              left: '-2px',
              top: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#BE123C',
              boxShadow: '0 0 8px rgba(190, 18, 60, 0.85)',
            }}
          />
          {/* Hairline leader extending rightward */}
          <div
            style={{
              position: 'absolute',
              left: '3px',
              top: '0px',
              width: '46px',
              height: '1px',
              backgroundColor: 'rgba(190, 18, 60, 0.45)',
            }}
          />
          {/* Interactive frosted-glass pill */}
          <div style={{ position: 'absolute', left: '52px', top: '-15px', pointerEvents: 'auto' }}>
            <button
              type="button"
              className="story-frosted-pill"
              title="Active platelet viability countdown"
            >
              <span className="pill-dot pill-dot-crimson" />
              <span ref={countdownTextRef}>119:59:42 REMAINING</span>
            </button>
          </div>
        </div>

        {/* Upper-Left annotation: ● 22.0°C AGITATED (anchored to upper-left rim) */}
        <div
          ref={annotationUpperLeftRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'flex',
            alignItems: 'center',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
            pointerEvents: 'none',
          }}
        >
          {/* 4px ruby contact dot ON silhouette */}
          <div
            className="story-contact-dot"
            style={{
              position: 'absolute',
              left: '-2px',
              top: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#BE123C',
              boxShadow: '0 0 8px rgba(190, 18, 60, 0.85)',
            }}
          />
          {/* Hairline leader extending leftward */}
          <div
            style={{
              position: 'absolute',
              right: '3px',
              top: '0px',
              width: '46px',
              height: '1px',
              backgroundColor: 'rgba(190, 18, 60, 0.45)',
            }}
          />
          {/* Interactive frosted-glass pill */}
          <div style={{ position: 'absolute', right: '52px', top: '-15px', pointerEvents: 'auto' }}>
            <button
              type="button"
              className="story-frosted-pill"
              title="Clinical storage temperature & agitation telemetry"
            >
              <span className="pill-dot pill-dot-emerald" />
              <span>22.0°C AGITATED</span>
            </button>
          </div>
        </div>

        {/* Lower-Left annotation: ● O-NEG APHERESIS (anchored to lower-left rim) */}
        <div
          ref={annotationLowerRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'flex',
            alignItems: 'center',
            willChange: 'transform',
            transform: 'translate3d(0, 0, 0)',
            pointerEvents: 'none',
          }}
        >
          {/* 4px ruby contact dot ON silhouette */}
          <div
            className="story-contact-dot"
            style={{
              position: 'absolute',
              left: '-2px',
              top: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#BE123C',
              boxShadow: '0 0 8px rgba(190, 18, 60, 0.85)',
            }}
          />
          {/* Hairline leader extending leftward */}
          <div
            style={{
              position: 'absolute',
              right: '3px',
              top: '0px',
              width: '46px',
              height: '1px',
              backgroundColor: 'rgba(190, 18, 60, 0.45)',
            }}
          />
          {/* Interactive frosted-glass pill */}
          <div style={{ position: 'absolute', right: '52px', top: '-15px', pointerEvents: 'auto' }}>
            <button
              type="button"
              className="story-frosted-pill"
              title="Universal donor component identification"
            >
              <span className="pill-dot pill-dot-amber" />
              <span>O-NEG APHERESIS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Clock Counter: bottom-right of the stage, NO card/box (Spec §10) */}
      <div ref={clockContainerRef} className="story-stage-clock" style={{ opacity: 0, display: 'none' }}>
        <span ref={clockTextRef} className="story-clock-digits">
          000h / 120h
        </span>
        <div className="story-clock-track">
          <div ref={clockBarFillRef} className="story-clock-fill" />
        </div>
      </div>

      {/* 5. Scroll Cue: bottom-center of left column, never touches text (Spec §10) */}
      <div ref={scrollCueRef} className="story-scroll-cue" style={{ opacity: 1 }}>
        <span className="story-scroll-label">SCROLL</span>
        <div className="story-scroll-line" />
      </div>
    </div>
  );
}
