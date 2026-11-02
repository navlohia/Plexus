/**
 * osrmRouting.ts — Plexus Flagship V2
 * OSRM road-geometry fetching + curated NCR highway corridor dictionary.
 * All coords strictly bounded: lng [76.70, 77.42], lat [28.43, 28.72]
 */

export interface RoutePoint {
  lng: number;
  lat: number;
  timestamp: number; // 0-1000 normalised for TripsLayer animation
}

export interface OSRMRoute {
  points: RoutePoint[];
  distanceKm: number;
  durationMins: number;
}

// ── 12 Curated Delhi-NCR highway corridors ────────────────────
export const NCR_HIGHWAY_CORRIDORS: Record<string, RoutePoint[]> = {
  "MDT-SFD": [
    { lng: 77.118, lat: 28.535, timestamp: 0   },
    { lng: 77.132, lat: 28.540, timestamp: 100 },
    { lng: 77.148, lat: 28.545, timestamp: 200 },
    { lng: 77.162, lat: 28.549, timestamp: 320 },
    { lng: 77.175, lat: 28.551, timestamp: 450 },
    { lng: 77.184, lat: 28.552, timestamp: 600 },
    { lng: 77.191, lat: 28.552, timestamp: 780 },
    { lng: 77.195, lat: 28.552, timestamp: 1000 },
  ],
  "MAX-AIM": [
    { lng: 77.214, lat: 28.530, timestamp: 0   },
    { lng: 77.214, lat: 28.541, timestamp: 150 },
    { lng: 77.213, lat: 28.548, timestamp: 300 },
    { lng: 77.211, lat: 28.555, timestamp: 460 },
    { lng: 77.210, lat: 28.561, timestamp: 640 },
    { lng: 77.209, lat: 28.565, timestamp: 840 },
    { lng: 77.209, lat: 28.567, timestamp: 1000 },
  ],
  "MAX-SFD": [
    { lng: 77.214, lat: 28.530, timestamp: 0   },
    { lng: 77.210, lat: 28.535, timestamp: 200 },
    { lng: 77.205, lat: 28.540, timestamp: 400 },
    { lng: 77.200, lat: 28.545, timestamp: 600 },
    { lng: 77.197, lat: 28.549, timestamp: 800 },
    { lng: 77.195, lat: 28.552, timestamp: 1000 },
  ],
  "N62-GTB": [
    { lng: 77.330, lat: 28.620, timestamp: 0   },
    { lng: 77.315, lat: 28.625, timestamp: 150 },
    { lng: 77.298, lat: 28.630, timestamp: 300 },
    { lng: 77.280, lat: 28.636, timestamp: 460 },
    { lng: 77.262, lat: 28.640, timestamp: 620 },
    { lng: 77.245, lat: 28.642, timestamp: 780 },
    { lng: 77.309, lat: 28.645, timestamp: 1000 },
  ],
  "APL-AIM": [
    { lng: 77.275, lat: 28.537, timestamp: 0   },
    { lng: 77.262, lat: 28.543, timestamp: 160 },
    { lng: 77.248, lat: 28.550, timestamp: 320 },
    { lng: 77.234, lat: 28.556, timestamp: 480 },
    { lng: 77.221, lat: 28.561, timestamp: 640 },
    { lng: 77.213, lat: 28.565, timestamp: 830 },
    { lng: 77.209, lat: 28.567, timestamp: 1000 },
  ],
  "MDT-DWK": [
    { lng: 77.118, lat: 28.535, timestamp: 0   },
    { lng: 77.105, lat: 28.542, timestamp: 200 },
    { lng: 77.092, lat: 28.552, timestamp: 400 },
    { lng: 77.082, lat: 28.562, timestamp: 620 },
    { lng: 77.075, lat: 28.570, timestamp: 830 },
    { lng: 77.072, lat: 28.573, timestamp: 1000 },
  ],
  "BLK-RML": [
    { lng: 77.170, lat: 28.657, timestamp: 0   },
    { lng: 77.176, lat: 28.649, timestamp: 200 },
    { lng: 77.184, lat: 28.641, timestamp: 400 },
    { lng: 77.193, lat: 28.633, timestamp: 620 },
    { lng: 77.199, lat: 28.627, timestamp: 830 },
    { lng: 77.202, lat: 28.625, timestamp: 1000 },
  ],
  "FTN-AIM": [
    { lng: 77.278, lat: 28.560, timestamp: 0   },
    { lng: 77.262, lat: 28.558, timestamp: 180 },
    { lng: 77.246, lat: 28.557, timestamp: 360 },
    { lng: 77.231, lat: 28.559, timestamp: 540 },
    { lng: 77.218, lat: 28.562, timestamp: 720 },
    { lng: 77.212, lat: 28.564, timestamp: 880 },
    { lng: 77.209, lat: 28.567, timestamp: 1000 },
  ],
  "N62-AIM": [
    { lng: 77.330, lat: 28.620, timestamp: 0   },
    { lng: 77.310, lat: 28.615, timestamp: 150 },
    { lng: 77.288, lat: 28.605, timestamp: 300 },
    { lng: 77.265, lat: 28.594, timestamp: 450 },
    { lng: 77.245, lat: 28.583, timestamp: 600 },
    { lng: 77.228, lat: 28.574, timestamp: 750 },
    { lng: 77.215, lat: 28.568, timestamp: 900 },
    { lng: 77.209, lat: 28.567, timestamp: 1000 },
  ],
  "MDT-AIM": [
    { lng: 77.118, lat: 28.535, timestamp: 0   },
    { lng: 77.138, lat: 28.540, timestamp: 180 },
    { lng: 77.158, lat: 28.545, timestamp: 360 },
    { lng: 77.175, lat: 28.549, timestamp: 520 },
    { lng: 77.190, lat: 28.553, timestamp: 680 },
    { lng: 77.201, lat: 28.558, timestamp: 830 },
    { lng: 77.209, lat: 28.567, timestamp: 1000 },
  ],
  "APL-SFD": [
    { lng: 77.275, lat: 28.537, timestamp: 0   },
    { lng: 77.260, lat: 28.540, timestamp: 200 },
    { lng: 77.245, lat: 28.543, timestamp: 400 },
    { lng: 77.228, lat: 28.547, timestamp: 600 },
    { lng: 77.211, lat: 28.549, timestamp: 800 },
    { lng: 77.195, lat: 28.552, timestamp: 1000 },
  ],
  "FSB-SFD": [
    { lng: 77.157, lat: 28.524, timestamp: 0   },
    { lng: 77.163, lat: 28.530, timestamp: 200 },
    { lng: 77.171, lat: 28.536, timestamp: 400 },
    { lng: 77.179, lat: 28.542, timestamp: 600 },
    { lng: 77.186, lat: 28.547, timestamp: 800 },
    { lng: 77.195, lat: 28.552, timestamp: 1000 },
  ],
};

/**
 * Fetch real road geometry from OSRM, fall back to linear interpolation.
 */
export async function fetchOSRMCorridor(
  donorCoords: [number, number],
  recipientCoords: [number, number]
): Promise<OSRMRoute> {
  const [donorLng, donorLat]   = donorCoords;
  const [recipLng, recipLat]   = recipientCoords;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${donorLng},${donorLat};${recipLng},${recipLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("OSRM HTTP error");
    const data = await res.json();
    if (!data.routes?.[0]) throw new Error("No route");

    const coords: [number, number][] = data.routes[0].geometry.coordinates;
    const filtered = coords.filter(
      ([lng, lat]) => lng >= 76.70 && lng <= 77.42 && lat >= 28.43 && lat <= 28.72
    );
    if (filtered.length < 2) throw new Error("Out of bounds");

    const points: RoutePoint[] = filtered.map(([lng, lat], i) => ({
      lng, lat,
      timestamp: Math.round((i / (filtered.length - 1)) * 1000),
    }));

    return {
      points,
      distanceKm: data.routes[0].distance / 1000,
      durationMins: data.routes[0].duration / 60,
    };
  } catch {
    // Fallback — straight-line with 20 steps
    const STEPS = 20;
    const points: RoutePoint[] = Array.from({ length: STEPS }, (_, i) => {
      const t = i / (STEPS - 1);
      return {
        lng: donorLng + (recipLng - donorLng) * t,
        lat: donorLat + (recipLat - donorLat) * t,
        timestamp: Math.round(t * 1000),
      };
    });
    const dLng = (recipLng - donorLng) * 102.5;
    const dLat = (recipLat - donorLat) * 111.0;
    const distanceKm = Math.hypot(dLng, dLat) * 1.25;
    return { points, distanceKm, durationMins: distanceKm * 2.5 };
  }
}

/** Return a prebuilt curated corridor or null */
export function getPrebuiltCorridor(fromCode: string, toCode: string): RoutePoint[] | null {
  const key = `${fromCode}-${toCode}`;
  const rev = `${toCode}-${fromCode}`;
  if (NCR_HIGHWAY_CORRIDORS[key]) return NCR_HIGHWAY_CORRIDORS[key];
  if (NCR_HIGHWAY_CORRIDORS[rev]) {
    const pts = [...NCR_HIGHWAY_CORRIDORS[rev]].reverse();
    return pts.map((p, i) => ({ ...p, timestamp: Math.round((i / (pts.length - 1)) * 1000) }));
  }
  return null;
}

/** Interpolate position along route at progress 0→1 */
export function getPointAlongRoute(points: RoutePoint[], progress: number): [number, number] {
  if (!points.length) return [77.209, 28.567];
  if (points.length === 1) return [points[0].lng, points[0].lat];
  const targetT = progress * 1000;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (targetT >= a.timestamp && targetT <= b.timestamp) {
      const t = (targetT - a.timestamp) / (b.timestamp - a.timestamp);
      return [a.lng + (b.lng - a.lng) * t, a.lat + (b.lat - a.lat) * t];
    }
  }
  const last = points[points.length - 1];
  return [last.lng, last.lat];
}

