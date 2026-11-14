/**
 * camera.keyframes.ts
 * SINGLE SOURCE OF TRUTH for all camera values in the Plexus Story.
 * All progress points, centers, zooms, pitches, bearings, and easing live here.
 * No camera numbers anywhere else.
 */

export interface CameraKeyframe {
  progress: number;
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface CameraPose {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

// 5 Keyframes across the 120-hour scroll arc:
// 0.00: Hero — far out, pitch ~50°, over NCR
// 0.30: Clock — slow push-in, clock counter
// 0.55: Swarm — drift across NCR
// 0.80: Rescue — descend, pitch easing down
// 1.00: Dive — workspace zoom and center (matches existing workspace map)
export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  {
    progress: 0.0,
    center: [77.21, 28.58],
    zoom: 8.8,
    pitch: 50.0,
    bearing: -12.0,
  },
  {
    progress: 0.3,
    center: [77.20, 28.58],
    zoom: 9.4,
    pitch: 48.0,
    bearing: -12.0,
  },
  {
    progress: 0.55,
    center: [77.185, 28.585],
    zoom: 9.9,
    pitch: 42.0,
    bearing: -12.0,
  },
  {
    progress: 0.8,
    center: [77.17, 28.585],
    zoom: 10.4,
    pitch: 36.0,
    bearing: -12.0,
  },
  {
    progress: 1.0,
    center: [77.16, 28.585],
    zoom: 10.8,
    pitch: 50.0,
    bearing: -12.0,
  },
];

// Easing function for smooth organic transitions
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Computes interpolated camera pose for any progress (0..1)
 */
export function getCameraAtProgress(progress: number): CameraPose {
  const p = Math.max(0, Math.min(1, progress));

  // Find surrounding keyframes
  let i = 0;
  while (i < CAMERA_KEYFRAMES.length - 1 && CAMERA_KEYFRAMES[i + 1].progress < p) {
    i++;
  }

  const k1 = CAMERA_KEYFRAMES[i];
  const k2 = CAMERA_KEYFRAMES[Math.min(i + 1, CAMERA_KEYFRAMES.length - 1)];

  if (k1 === k2 || k2.progress === k1.progress) {
    return {
      center: [k1.center[0], k1.center[1]],
      zoom: k1.zoom,
      pitch: k1.pitch,
      bearing: k1.bearing,
    };
  }

  const segT = (p - k1.progress) / (k2.progress - k1.progress);
  const easedT = easeInOutCubic(segT);

  return {
    center: [
      lerp(k1.center[0], k2.center[0], easedT),
      lerp(k1.center[1], k2.center[1], easedT),
    ],
    zoom: lerp(k1.zoom, k2.zoom, easedT),
    pitch: lerp(k1.pitch, k2.pitch, easedT),
    bearing: lerp(k1.bearing, k2.bearing, easedT),
  };
}

