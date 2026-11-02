import type maplibregl from 'maplibre-gl';
import { NCR_HOSPITAL_METAS } from '../lib/hospitalTelemetry';

export interface StoryCameraPose {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

let cachedStagePose: StoryCameraPose | null = null;
let lastBoundsWidth = 0;
let lastBoundsHeight = 0;

/**
 * Computes the runtime stage camera from hospital bounds and layout padding (Spec §2):
 * Left column (0-44vw) holds text.
 * Right stage (44-100vw) holds the 3D scene & hospital network.
 * Mobile (<=700px): text at bottom, padding.bottom 46vh.
 */
export function computeStoryStageCamera(map: maplibregl.Map): StoryCameraPose {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (cachedStagePose && w === lastBoundsWidth && h === lastBoundsHeight) {
    return cachedStagePose;
  }

  const coords = Object.values(NCR_HOSPITAL_METAS).map((m) => m.coords);
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const isMobile = w <= 700;
  const padding = isMobile
    ? {
        left: Math.round(w * 0.04),
        right: Math.round(w * 0.04),
        top: Math.round(h * 0.08),
        bottom: Math.round(h * 0.46),
      }
    : {
        left: Math.round(w * 0.44),
        right: Math.round(w * 0.06),
        top: Math.round(h * 0.14),
        bottom: Math.round(h * 0.10),
      };

  const bounds = [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];

  let cam: any = null;
  if (typeof (map as any).cameraForBounds === 'function') {
    cam = (map as any).cameraForBounds(bounds, {
      padding,
      pitch: 40,
      bearing: -12,
    });
  }

  if (cam && cam.center) {
    cachedStagePose = {
      center: [cam.center.lng, cam.center.lat],
      zoom: cam.zoom,
      pitch: 40,
      bearing: -12,
    };
  } else {
    // Robust fallback if cameraForBounds unavailable
    cachedStagePose = {
      center: [77.16, 28.585],
      zoom: isMobile ? 9.8 : 10.4,
      pitch: 40,
      bearing: -12,
    };
  }

  lastBoundsWidth = w;
  lastBoundsHeight = h;
  return cachedStagePose;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Camera rule per Spec §4, §6 & §9:
 * 0.00-0.28: Slow push into stage camera.
 * 0.28-0.72: Strictly FROZEN while nodes fly and land.
 * 0.72-0.88: Dive eases smoothly to the workspace camera.
 * >= 0.88: Map camera is IDENTICAL to the workspace camera.
 */
export function applyStoryCamera(map: maplibregl.Map, progress: number): void {
  if (!map) return;
  const stageCam = computeStoryStageCamera(map);

  // Workspace camera target (from INITIAL_MAP_VIEW in storyStore)
  const workspaceCenter: [number, number] = [77.21, 28.58];
  const workspaceZoom = 10.8;
  const workspacePitch = 50.0;
  const workspaceBearing = -12.0;

  if (progress <= 0.28) {
    // 0.00 -> 0.28: Slow push into stage camera
    const t = easeInOutCubic(progress / 0.28);
    const startZoom = stageCam.zoom - 0.40;
    const curZoom = startZoom + (stageCam.zoom - startZoom) * t;

    map.jumpTo({
      center: stageCam.center,
      zoom: curZoom,
      pitch: stageCam.pitch,
      bearing: -12.0,
    });
  } else if (progress <= 0.54) {
    // 0.28 -> 0.54: Gentle drift (bearing -12 -> -4, zoom +0.12), easing out to rest at 0.54
    const u = (progress - 0.28) / (0.54 - 0.28);
    const tDrift = 1 - Math.pow(1 - u, 3); // easeOutCubic
    const curBearing = -12.0 + (-4.0 - (-12.0)) * tDrift;
    const curZoom = stageCam.zoom + 0.12 * tDrift;

    map.jumpTo({
      center: stageCam.center,
      zoom: curZoom,
      pitch: stageCam.pitch,
      bearing: curBearing,
    });
  } else if (progress <= 0.72) {
    // 0.54 -> 0.72: Strictly FROZEN while nodes fly and land so map.project() is exact
    map.jumpTo({
      center: stageCam.center,
      zoom: stageCam.zoom + 0.12,
      pitch: stageCam.pitch,
      bearing: -4.0,
    });
  } else if (progress < 0.88) {
    // Dive (0.72 -> 0.88): camera eases to workspace camera
    const u = (progress - 0.72) / (0.88 - 0.72);
    const t = easeInOutCubic(u);
    const startZoom = stageCam.zoom + 0.12;
    const startBearing = -4.0;
    const curLng = stageCam.center[0] + (workspaceCenter[0] - stageCam.center[0]) * t;
    const curLat = stageCam.center[1] + (workspaceCenter[1] - stageCam.center[1]) * t;
    const curZoom = startZoom + (workspaceZoom - startZoom) * t;
    const curPitch = stageCam.pitch + (workspacePitch - stageCam.pitch) * t;
    const curBearing = startBearing + (workspaceBearing - startBearing) * t;

    map.jumpTo({
      center: [curLng, curLat],
      zoom: curZoom,
      pitch: curPitch,
      bearing: curBearing,
    });
  } else {
    // At >= 0.88: map camera is IDENTICAL to the workspace map
    map.jumpTo({
      center: workspaceCenter,
      zoom: workspaceZoom,
      pitch: workspacePitch,
      bearing: workspaceBearing,
    });
  }
}

