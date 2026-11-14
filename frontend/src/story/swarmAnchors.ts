/**
 * swarmAnchors.ts
 * 25 deterministic seeded geographic anchor positions across NCR bounds.
 * Used during the Fracture Burst (progress 0.33 -> 0.36) and Swarm drift (0.35 -> 0.55).
 * Each anchor corresponds to disc index 0..24 (ND-01..ND-25).
 * NCR camera center is roughly [77.20, 28.58] at zoom ~9.5.
 */

export interface SwarmAnchor {
  index: number;
  id: string;
  code: string;
  lng: number;
  lat: number;
}

// 25 deterministic seeded anchors distributed organically across visible NCR bounds
export const SWARM_ANCHORS: SwarmAnchor[] = [
  { index: 0,  id: "ND-01", code: "AIM", lng: 77.218, lat: 28.572 },
  { index: 1,  id: "ND-02", code: "SFD", lng: 77.185, lat: 28.548 },
  { index: 2,  id: "ND-03", code: "MAX", lng: 77.228, lat: 28.522 },
  { index: 3,  id: "ND-04", code: "N62", lng: 77.332, lat: 28.618 },
  { index: 4,  id: "ND-05", code: "MDT", lng: 77.124, lat: 28.528 },
  { index: 5,  id: "ND-06", code: "FTN", lng: 77.272, lat: 28.554 },
  { index: 6,  id: "ND-07", code: "GTB", lng: 77.308, lat: 28.674 },
  { index: 7,  id: "ND-08", code: "RML", lng: 77.198, lat: 28.618 },
  { index: 8,  id: "ND-09", code: "LNJ", lng: 77.242, lat: 28.636 },
  { index: 9,  id: "ND-10", code: "SGR", lng: 77.182, lat: 28.634 },
  { index: 10, id: "ND-11", code: "APL", lng: 77.292, lat: 28.536 },
  { index: 11, id: "ND-12", code: "RGV", lng: 77.322, lat: 28.648 },
  { index: 12, id: "ND-13", code: "FSB", lng: 77.150, lat: 28.526 },
  { index: 13, id: "ND-14", code: "BLK", lng: 77.174, lat: 28.616 },
  { index: 14, id: "ND-15", code: "MPD", lng: 77.132, lat: 28.584 },
  { index: 15, id: "ND-16", code: "STP", lng: 77.214, lat: 28.662 },
  { index: 16, id: "ND-17", code: "ROH", lng: 77.142, lat: 28.668 },
  { index: 17, id: "ND-18", code: "DWK", lng: 77.112, lat: 28.592 },
  { index: 18, id: "ND-19", code: "GCH", lng: 77.146, lat: 28.518 },
  { index: 19, id: "ND-20", code: "NBV", lng: 77.338, lat: 28.538 },
  { index: 20, id: "ND-21", code: "DRB", lng: 77.120, lat: 28.622 },
  { index: 21, id: "ND-22", code: "SDP", lng: 77.118, lat: 28.652 },
  { index: 22, id: "ND-23", code: "NH4", lng: 77.136, lat: 28.544 },
  { index: 23, id: "ND-24", code: "MXP", lng: 77.298, lat: 28.624 },
  { index: 24, id: "ND-25", code: "PRS", lng: 77.266, lat: 28.542 },
];

if (import.meta.env.DEV) {
  if (SWARM_ANCHORS.length !== 25) {
    throw new Error(`[swarmAnchors] Assert failed: expected 25 anchors, got ${SWARM_ANCHORS.length}`);
  }
}

