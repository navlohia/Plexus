import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Biologics3DScene from "./Biologics3DScene";

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onRunDemo: () => void;
}

/* ── Minimalist Slide Content (Clean & Concise like before) ──── */
const SLIDES = [
  {
    id: 1,
    eyebrow: "Autonomous Transfusion Logistics",
    headline: ["An intercept network", "of vital importance"],
    headlineWeights: ["light", "bold"] as const,
    body: "Plexus: an autonomous blood-platelet clearinghouse connecting 25 Delhi-NCR hospitals on a single 120-hour expiry clock — routing surplus units to critical shortages before they are incinerated.",
  },
  {
    id: 2,
    eyebrow: "Network at a glance",
    headline: ["2,200+", "platelet units tracked"],
    headlineWeights: ["bold", "light"] as const,
    stats: [
      { value: "25", label: "NCR hospitals on one mesh" },
      { value: "120h", label: "Platelet shelf-life window" },
      { value: "0.9%", label: "Spoilage rate vs 26% baseline" },
    ],
  },
  {
    id: 3,
    eyebrow: "Google OR-Tools Engine",
    headline: ["A powerful and precise", "clinical routing network"],
    headlineWeights: ["bold", "light"] as const,
    body: "Every 6 hours, our minimum-cost network-flow solver scans all 25 hospitals across 8 blood groups, resolving surplus-deficit imbalances in under 20 ms — well before the 36-hour spoilage threshold.",
  },
  {
    id: 4,
    eyebrow: "Clinical & Mathematical Architecture",
    headline: ["Everything you", "need to know"],
    headlineWeights: ["bold", "light"] as const,
    isAccordion: true,
  },
];

const ACCORDION_ITEMS = [
  {
    idx: "01",
    q: "Why do blood platelets expire in strictly 120 hours?",
    a: "Platelet concentrates must be agitated at 20–24°C. After 5 days, bacterial proliferation risk makes transfusion unsafe. Plexus fires lateral-transshipment alerts at 84 hours — well before the 36-hour critical window.",
  },
  {
    idx: "02",
    q: "How does the OR-Tools solver eliminate spoilage?",
    a: "Our minimum-cost network-flow models all 25 hospitals as graph nodes. Every 6 hours it resolves surplus at donor hospitals to deficit at recipient hospitals across all 8 blood groups — in under 20 ms.",
  },
  {
    idx: "03",
    q: "How is O-negative trauma reserve protected?",
    a: "The ABO substitution matrix applies a cost ×8 penalty on O- cross-type use, enforcing a hard floor at Level-1 trauma centres while still allowing 14 safe alternative pairings.",
  },
  {
    idx: "04",
    q: "What happens during a Dengue or Highway Trauma surge?",
    a: "Demand spikes are detected as rising net-deficits. The clearinghouse instantly re-routes from low-utilisation hospitals, escalates courier priority, and notifies neighbouring zones. Try it live in the Surge Lab.",
  },
  {
    idx: "05",
    q: "How is cold-chain compliance maintained in transit?",
    a: "Each dispatch manifest includes a live agitator temperature reading. Drift beyond 20–24°C for >10 minutes triggers an automatic alert at the receiving hospital. Non-compliant shipments are flagged in the Dispatch Desk.",
  },
];

export default function LandingPage({ onOpenWorkspace }: LandingPageProps) {
  /* ── Curtain loader ─────────────────────────────── */
  const [curtainDone, setCurtainDone] = useState(false);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / 750) * 100));
      setCounter(pct);
      if (pct < 100) requestAnimationFrame(tick);
      else setTimeout(() => setCurtainDone(true), 80);
    };
    requestAnimationFrame(tick);
  }, []);

  /* ── Slide state & smooth wheel navigation ──────── */
  const [slide, setSlide] = useState(0);
  const totalSlides = SLIDES.length;
  const isScrollingRef = useRef(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) return;
      if (Math.abs(e.deltaY) < 25) return;
      isScrollingRef.current = true;
      setTimeout(() => { isScrollingRef.current = false; }, 800);

      if (e.deltaY > 0) {
        setSlide((s) => Math.min(s + 1, totalSlides - 1));
      } else {
        setSlide((s) => Math.max(s - 1, 0));
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        setSlide((s) => Math.min(s + 1, totalSlides - 1));
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        setSlide((s) => Math.max(s - 1, 0));
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < 40) return;
      isScrollingRef.current = true;
      setTimeout(() => { isScrollingRef.current = false; }, 800);

      if (deltaY > 0) {
        setSlide((s) => Math.min(s + 1, totalSlides - 1));
      } else {
        setSlide((s) => Math.max(s - 1, 0));
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [totalSlides]);

  /* ── Accordion (slide 4) ────────────────────────── */
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const current = SLIDES[slide];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Curtain loader ─────────────────────────── */}
      <AnimatePresence>
        {!curtainDone && (
          <motion.div
            key="curtain"
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
            style={{ background: "#5C0A22" }}
            exit={{ y: "-100%", transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
          >
            <p className="text-white font-extrabold tracking-tight mb-2" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Plexus
            </p>
            <p className="text-rose-200/90 text-lg font-mono">{counter}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Full-page MIPOGG blood-red gradient background ── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(125deg, #5C0A22 0%, #8B1030 28%, #C44B68 52%, #E8897A 72%, #F5BBA8 88%, #FDD8C8 100%)",
        }}
      />

      {/* ── 3D Scene with DNA Double Helix & Glossy Spheres ── */}
      <div className="absolute inset-0 z-[1]">
        <Biologics3DScene activeSlide={slide} />
      </div>

      {/* ── Fixed top header — like MIPOGG ─────────── */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 lg:px-12 h-18">
        {/* Logo — square box like MIPOGG "M" */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center border-2 cursor-pointer transition-transform hover:scale-105"
          style={{ borderColor: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.12)" }}
          onClick={onOpenWorkspace}
        >
          <span className="text-white font-extrabold text-lg leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
            P
          </span>
        </div>

        {/* Right nav cluster — slide counter + action */}
        <div className="flex items-center gap-3">
          {/* Slide counter pill (like MIPOGG 1/5) */}
          <div
            className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-semibold text-white"
            style={{
              borderColor: "rgba(255,255,255,0.30)",
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="font-mono">{slide + 1}/{totalSlides}</span>
            <div className="flex items-center gap-1">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="rounded-full transition-all cursor-pointer border-none p-0"
                  style={{
                    width: i === slide ? "18px" : "6px",
                    height: "6px",
                    background: i === slide ? "#ffffff" : "rgba(255,255,255,0.40)",
                  }}
                  title={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <ChevronDown size={13} className="opacity-60" />
          </div>

          {/* Open Workspace CTA — white pill */}
          <button
            onClick={onOpenWorkspace}
            className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer border-none transition-all hover:scale-[1.02] shadow-lg"
            style={{ background: "#ffffff", color: "#5C0A22", fontFamily: "'Outfit', sans-serif" }}
          >
            Open Workspace
            <ArrowUpRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ── Slide content ────────────────────────────
          Left: text (42%) | Right: 3D scene (58%)
          Minimalist, left-aligned, spacious         */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          className="absolute inset-0 z-10 flex items-center"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Left text column */}
          <div className="w-full max-w-[42%] pl-8 md:pl-12 lg:pl-16 pr-6 py-12">
            {/* Eyebrow */}
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {current.eyebrow}
            </p>

            {/* Headline — mixed weights, left-aligned, large */}
            <h1
              className="mb-6"
              style={{
                fontSize: "clamp(2.4rem, 4.4vw, 4.8rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: "#ffffff",
              }}
            >
              {current.headline.map((line, i) => (
                <span
                  key={i}
                  style={{
                    display: "block",
                    fontWeight: current.headlineWeights[i] === "bold" ? 800 : 300,
                    color: current.headlineWeights[i] === "bold" ? "#ffffff" : "rgba(255,240,242,0.90)",
                  }}
                >
                  {line}
                </span>
              ))}
            </h1>

            {/* Body text (minimal, clean) */}
            {"body" in current && current.body && (
              <p
                className="text-base leading-relaxed mb-6"
                style={{
                  color: "rgba(255,228,232,0.85)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  maxWidth: "40ch",
                }}
              >
                {current.body}
              </p>
            )}

            {/* Stats (slide 2) */}
            {"stats" in current && current.stats && (
              <div className="flex flex-col gap-5 mt-2">
                {current.stats.map((s) => (
                  <div key={s.label}>
                    <p
                      className="font-extrabold leading-none mb-1 font-mono tracking-tight"
                      style={{ fontSize: "clamp(2.2rem, 3.8vw, 3.6rem)", color: "#ffffff" }}
                    >
                      {s.value}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(255,220,225,0.80)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Accordion (slide 4) */}
            {"isAccordion" in current && current.isAccordion && (
              <div className="mt-2 flex flex-col gap-0 max-h-[60vh] overflow-y-auto pr-2">
                {ACCORDION_ITEMS.map((item) => {
                  const isOpen = openAccordion === item.idx;
                  return (
                    <div
                      key={item.idx}
                      className="cursor-pointer"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.18)" }}
                      onClick={() => setOpenAccordion(isOpen ? null : item.idx)}
                    >
                      <div className="flex items-center gap-3 py-3">
                        <span
                          className="text-xs font-bold shrink-0 font-mono"
                          style={{
                            color: "rgba(255,255,255,0.50)",
                            minWidth: "24px",
                          }}
                        >
                          {item.idx}
                        </span>
                        <span
                          className="text-xs md:text-sm font-medium flex-1 text-white"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {item.q}
                        </span>
                        <span
                          className="text-lg font-light text-white/70 shrink-0 transition-transform duration-300"
                          style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                        >
                          +
                        </span>
                      </div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: "hidden" }}
                          >
                            <p
                              className="text-xs leading-relaxed pb-3.5 pl-9"
                              style={{
                                color: "rgba(255,224,228,0.85)",
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}
                            >
                              {item.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Fixed bottom CTAs — clean centered Follow Plexus pill ── */}
      <div className="fixed bottom-6 inset-x-0 z-50 flex items-center justify-center px-8 lg:px-12 pointer-events-none">
        {/* Center: "Follow Plexus" outlined pill */}
        <button
          className="pointer-events-auto rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-wider border text-white cursor-pointer transition-all hover:bg-white/10 shadow-lg"
          style={{
            borderColor: "rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            fontFamily: "'Outfit', sans-serif",
          }}
          onClick={onOpenWorkspace}
        >
          Follow Plexus
        </button>
      </div>

      {/* ── Slide dots (right side, vertical) ─────── */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className="rounded-full transition-all cursor-pointer border-none p-0"
            style={{
              width: "7px",
              height: i === slide ? "26px" : "7px",
              background: i === slide ? "#ffffff" : "rgba(255,255,255,0.35)",
            }}
            title={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
