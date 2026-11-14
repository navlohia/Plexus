import gsap from 'gsap';

let activeRevealTimeline: gsap.core.Timeline | null = null;

/**
 * playWorkspaceReveal() (GSAP timeline per Spec §9 & §9b)
 * Used by Story -> Workspace transition.
 * Deep links skip the reveal.
 *
 * Sequence:
 * - Header chrome: fade + 12px slide (0 - 0.4s)
 * - Banner: slide-down 24px + fade (0.1 - 0.6s)
 * - Panel: slide-in from x -32px with 40ms list-card stagger (0.2 - 0.8s)
 * - Pills: fade (0.7 - 1.0s)
 */
export function playWorkspaceReveal(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRevealTimeline) {
      activeRevealTimeline.kill();
    }

    const header = document.querySelector('.ws-topbar-clean');
    const banner = document.querySelector('.flighty-docked-banner');
    const panel = document.querySelector('.flighty-left-cards-stack');
    const cards = document.querySelectorAll('.flighty-card');
    const pills = document.querySelectorAll('.flighty-pin-pill');

    const tl = gsap.timeline({
      onComplete: () => {
        activeRevealTimeline = null;
        resolve();
      },
    });
    activeRevealTimeline = tl;

    // 1. Header chrome fade + 12px slide (0 - 0.4s)
    if (header) {
      tl.fromTo(
        header,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        0
      );
    }

    // 2. Banner slide-down 24px + fade (0.1 - 0.6s)
    if (banner) {
      tl.fromTo(
        banner,
        { opacity: 0, y: -24 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
        0.1
      );
    }

    // 3. Panel slide-in from x -32px with 40ms list-card stagger (0.2 - 0.8s)
    if (panel) {
      tl.fromTo(
        panel,
        { opacity: 0, x: -32 },
        { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
        0.2
      );
    }
    if (cards && cards.length > 0) {
      tl.fromTo(
        cards,
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' },
        0.2
      );
    }

    // 4. Pills fade (0.7 - 1.0s)
    if (pills && pills.length > 0) {
      tl.fromTo(
        pills,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' },
        0.7
      );
    }
  });
}

/**
 * reverseWorkspaceReveal() (GSAP timeline per Spec §9 & §9b)
 * Exact reverse vectors:
 * - Pills fade (0.0 - 0.3s)
 * - Panel slides out to x -32px with reverse stagger (0.1 - 0.5s)
 * - Banner slides up 24px + fades out (0.2 - 0.6s)
 * - Header chrome fades + slides up 12px (0.3 - 0.7s)
 */
export function reverseWorkspaceReveal(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRevealTimeline) {
      activeRevealTimeline.kill();
    }

    const header = document.querySelector('.ws-topbar-clean');
    const banner = document.querySelector('.flighty-docked-banner');
    const panel = document.querySelector('.flighty-left-cards-stack');
    const cards = document.querySelectorAll('.flighty-card');
    const pills = document.querySelectorAll('.flighty-pin-pill');

    const tl = gsap.timeline({
      onComplete: () => {
        activeRevealTimeline = null;
        resolve();
      },
    });
    activeRevealTimeline = tl;

    // Pills fade out first
    if (pills && pills.length > 0) {
      tl.to(pills, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0);
    }

    // List cards slide out with reverse stagger
    if (cards && cards.length > 0) {
      tl.to(
        cards,
        { opacity: 0, x: -16, duration: 0.3, stagger: 0.02, ease: 'power2.in' },
        0.1
      );
    }
    if (panel) {
      tl.to(panel, { opacity: 0, x: -32, duration: 0.4, ease: 'power2.in' }, 0.15);
    }

    // Banner slides up 24px + fades out
    if (banner) {
      tl.to(banner, { opacity: 0, y: -24, duration: 0.4, ease: 'power3.in' }, 0.2);
    }

    // Header chrome fades out + 12px slide up
    if (header) {
      tl.to(header, { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' }, 0.3);
    }
  });
}

