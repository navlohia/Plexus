/**
 * src/world/clock.ts
 * Deterministic Wall-Clock Based Sim Clock
 * PORTAL_SPEC.md Section 1.5
 */

import { STORAGE_KEY_SIM } from './config';

export interface SimClockState {
  anchorSim: number; // sim time in epoch ms at anchor
  anchorWall: number; // wall-clock time in epoch ms at anchor
  speed: number; // speed multiplier (1, 6, 30, 120, etc.)
}

/**
 * Parse URL query parameters ?speed=N and ?t=HH:MM
 */
function getQueryParams(): { speed?: number; t?: string; fresh?: boolean } {
  if (typeof window === 'undefined' || !window.location) {
    return {};
  }
  try {
    const searchParams = new URLSearchParams(window.location.search);
    let hashSearch = '';
    if (window.location.hash && window.location.hash.includes('?')) {
      hashSearch = window.location.hash.substring(window.location.hash.indexOf('?'));
    }
    const hashParams = new URLSearchParams(hashSearch);

    const speedRaw = searchParams.get('speed') || hashParams.get('speed');
    const speed = speedRaw ? parseFloat(speedRaw) : undefined;
    const t = searchParams.get('t') || hashParams.get('t') || undefined;
    const fresh = searchParams.has('fresh') || hashParams.has('fresh');
    return { speed: Number.isFinite(speed) ? speed : undefined, t, fresh };
  } catch {
    return {};
  }
}

/**
 * Load or initialize Sim Clock state
 * Defaults to real IST time at first load per HOSPITAL_UI_SPEC.md 1.2
 */
export function getSimClockState(): SimClockState {
  const query = getQueryParams();
  const nowWall = Date.now();

  if (typeof window !== 'undefined' && window.localStorage && !query.fresh) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SIM);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.anchorSim === 'number' &&
          typeof parsed.anchorWall === 'number' &&
          typeof parsed.speed === 'number'
        ) {
          // If the stored clock was from an old hardcoded demo date (> 24 hours behind real time)
          // and no query parameter requested it, reset to real IST time
          const isStaleHistoricalSeed = parsed.anchorSim < nowWall - 24 * 3600 * 1000 && !query.t;
          if (!isStaleHistoricalSeed) {
            if (query.speed !== undefined && query.speed !== parsed.speed) {
              const currentSim = parsed.anchorSim + (nowWall - parsed.anchorWall) * parsed.speed;
              const updated: SimClockState = {
                anchorSim: currentSim,
                anchorWall: nowWall,
                speed: query.speed,
              };
              saveSimClockState(updated);
              return updated;
            }
            return parsed;
          }
        }
      }
    } catch {
      // Fallback below
    }
  }

  // Initialize fresh clock: defaults to REAL IST time
  let anchorSim = nowWall;

  if (query.t) {
    const parts = query.t.split(':');
    if (parts.length === 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const d = new Date(nowWall);
        d.setHours(h, m, 0, 0);
        anchorSim = d.getTime();
      }
    }
  }

  const state: SimClockState = {
    anchorSim,
    anchorWall: nowWall,
    speed: query.speed ?? 1,
  };

  saveSimClockState(state);
  return state;
}

/**
 * Returns whether a non-standard sim clock speed or time offset is active
 * HOSPITAL_UI_SPEC.md 1.2: show "SIM ×N" chip only when speed ≠ 1 or offset is active
 */
export function isSimClockActive(): { active: boolean; speed: number; label: string } {
  const state = getSimClockState();
  const speed = state.speed;
  const isSpeedActive = speed !== 1;
  const offsetMs = Math.abs(state.anchorSim - state.anchorWall);
  const isOffsetActive = offsetMs > 60000;
  const active = isSpeedActive || isOffsetActive;
  return {
    active,
    speed,
    label: `SIM ×${speed}`,
  };
}

/**
 * Persist sim clock state to localStorage
 */
export function saveSimClockState(state: SimClockState): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_SIM, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

/**
 * Returns the current simulation time in epoch ms:
 * simNow = anchorSim + (wall - anchorWall) * speed
 */
export function getSimNow(): number {
  const state = getSimClockState();
  const wallNow = Date.now();
  return Math.round(state.anchorSim + (wallNow - state.anchorWall) * state.speed);
}

/**
 * Changes simulation speed with seamless re-anchoring
 */
export function setSimSpeed(newSpeed: number): void {
  const currentSim = getSimNow();
  const wallNow = Date.now();
  const nextState: SimClockState = {
    anchorSim: currentSim,
    anchorWall: wallNow,
    speed: Math.max(0.1, newSpeed),
  };
  saveSimClockState(nextState);
}

/**
 * Explicitly sets simulation time with seamless re-anchoring
 */
export function setSimTime(targetSimMs: number): void {
  const state = getSimClockState();
  const wallNow = Date.now();
  const nextState: SimClockState = {
    anchorSim: targetSimMs,
    anchorWall: wallNow,
    speed: state.speed,
  };
  saveSimClockState(nextState);
}

/**
 * Formats a sim timestamp into IST 24h format "HH:MM"
 */
export function formatSimTime(simMs: number): string {
  // IST is UTC+05:30
  const d = new Date(simMs);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const hh = String(istDate.getHours()).padStart(2, '0');
  const mm = String(istDate.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a sim timestamp into IST date "07 Nov 2026"
 */
export function formatSimDate(simMs: number): string {
  const d = new Date(simMs);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const day = String(istDate.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[istDate.getMonth()];
  const year = istDate.getFullYear();
  return `${day} ${month} ${year}`;
}

export const simClock = {
  now: getSimNow,
  setSpeed: setSimSpeed,
  setTime: setSimTime,
  getState: getSimClockState,
  isActive: isSimClockActive,
  formatTime: formatSimTime,
  formatDate: formatSimDate,
  reset: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('plexus.sim');
    }
  },
  initFromQueryParams: () => {
    if (typeof window === 'undefined') return;
    const query = getQueryParams();
    if (query.speed && !isNaN(query.speed) && query.speed > 0) {
      setSimSpeed(query.speed);
    }
  },
  onTick: (cb: () => void) => {
    if (typeof window === 'undefined') return () => { };
    const timer = setInterval(cb, 1000);
    return () => clearInterval(timer);
  },
};


