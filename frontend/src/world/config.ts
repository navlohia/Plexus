/**
 * src/world/config.ts
 * World Model Constants
 * PORTAL_SPEC.md Section 1.2
 */

export const SHELF_LIFE_H = 120; // 5 days at 20-24 °C with continuous gentle agitation
export const MIN_SAFE_ARRIVAL_H = 6; // minimum remaining shelf life required on arrival
export const EXPIRING_H = 36; // threshold for expiring stock risk
export const DEMAND_HORIZON_H = 36; // horizon for hospital demand calculations
export const STALE_H = 24; // data freshness limit in hours
export const AGITATION_OFF_BUDGET_H = 24; // cumulative budget for agitation interruption

export const TEMP_BAND = [20, 24] as const;
export const PREP_MIN = [3, 6] as const;
export const PICKUP_WAIT_MIN = [2, 5] as const;

export const CAPACITY = {
  bike: 4,
  van: 16,
  truck: 40,
} as const;

export const DURATION_FACTOR = {
  bike: 0.85,
  van: 1.0,
  truck: 1.25,
} as const;

export const URGENCY_H = {
  immediate: 1,
  urgent: 3,
  sameDay: 8,
  planned: 24,
} as const;

export const AUTOPILOT_DELAY_S = 90;

export const GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const;

// Platelets only: Apheresis (SDP) and RDP. No plasma or red cells anywhere.
export const PRODUCTS = ['APH', 'RDP'] as const;

export const STORAGE_KEY_EVENTS = 'plexus.events.v1';
export const STORAGE_KEY_SIM = 'plexus.sim';
export const STORAGE_KEY_SESSION = 'plexus.session';
export const CHANNEL_NAME = 'plexus-world';
export const MAX_EVENTS_CAP = 5000;
export const UNDO_WINDOW_MS = 8000;

