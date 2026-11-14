/**
 * scripts/build-routes.mjs
 * Build-time script to fetch road-snapped geometries from OSRM public demo
 * LANDING_SPEC.md (v5) section 12
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Hospital definitions (Single source of truth matching NCR_HOSPITAL_METAS)
const HOSPITALS = [
  { id: 'ND-01', code: 'AIM', name: 'AIIMS Trauma', coords: [77.209, 28.567] },
  { id: 'ND-02', code: 'SFD', name: 'Safdarjung', coords: [77.195, 28.552] },
  { id: 'ND-03', code: 'MAX', name: 'Max Saket', coords: [77.214, 28.530] },
  { id: 'ND-04', code: 'N62', name: 'Fortis Noida', coords: [77.330, 28.620] },
  { id: 'ND-05', code: 'MDT', name: 'Medanta Hub', coords: [77.118, 28.535] },
  { id: 'ND-06', code: 'FTN', name: 'Fortis Okhla', coords: [77.278, 28.560] },
  { id: 'ND-07', code: 'GTB', name: 'GTB East Delhi', coords: [77.309, 28.645] },
  { id: 'ND-08', code: 'RML', name: 'RML Central', coords: [77.202, 28.625] },
  { id: 'ND-09', code: 'LNJ', name: 'Lok Nayak', coords: [77.239, 28.636] },
  { id: 'ND-10', code: 'SGR', name: 'Sir Ganga Ram', coords: [77.189, 28.618] },
  { id: 'ND-11', code: 'APL', name: 'Apollo Sarita', coords: [77.284, 28.540] },
  { id: 'ND-12', code: 'RGV', name: 'Rajiv Gandhi', coords: [77.318, 28.642] },
  { id: 'ND-13', code: 'FSB', name: 'Fortis Vasant', coords: [77.156, 28.532] },
  { id: 'ND-14', code: 'BLK', name: 'BLK-Max Pusa', coords: [77.181, 28.622] },
  { id: 'ND-15', code: 'MPD', name: 'Manipal Dwarka', coords: [77.110, 28.580] },
  { id: 'ND-16', code: 'STP', name: 'St. Stephens', coords: [77.217, 28.640] },
  { id: 'ND-17', code: 'ROH', name: 'Saroj Rohini', coords: [77.135, 28.640] },
  { id: 'ND-18', code: 'DWK', name: 'Venkateshwar', coords: [77.112, 28.565] },
  { id: 'ND-19', code: 'GCH', name: 'Paras Gurugram', coords: [77.140, 28.530] },
  { id: 'ND-20', code: 'NBV', name: 'Jaypee Noida', coords: [77.330, 28.545] },
  { id: 'ND-21', code: 'DRB', name: 'DDU Hospital', coords: [77.125, 28.615] },
  { id: 'ND-22', code: 'SDP', name: 'Sanjay Gandhi', coords: [77.120, 28.640] },
  { id: 'ND-23', code: 'NH4', name: 'Artemis Hub', coords: [77.130, 28.538] },
  { id: 'ND-24', code: 'MXP', name: 'Max Patparganj', coords: [77.304, 28.630] },
  { id: 'ND-25', code: 'PRS', name: 'Holy Family', coords: [77.273, 28.548] },
];

const HOSPITAL_BY_CODE = new Map(HOSPITALS.map((h) => [h.code, h]));

// 2. Haversine distance in meters
function haversineM(c1, c2) {
  const R = 6371000;
  const dLat = ((c2[1] - c1[1]) * Math.PI) / 180;
  const dLng = ((c2[0] - c1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((c1[1] * Math.PI) / 180) *
      Math.cos((c2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 3. Polyline6 decoder
export function decodePolyline6(str) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const factor = 1e6;
  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

// 4. Build Pair Set: solver pairs + 6 nearest neighbors per hospital
export function computePairSet() {
  const pairs = new Set();

  // Solver pairs
  const solverPairs = [
    ['N62', 'AIM'],
    ['MDT', 'GTB'],
    ['APL', 'LNJ'],
    ['MAX', 'SFD'],
    ['NBV', 'RGV'],
    ['GCH', 'DRB'],
    ['BLK', 'ROH'],
    ['FSB', 'RML'],
  ];

  for (const [a, b] of solverPairs) {
    const key = [a, b].sort().join('|');
    pairs.add(key);
  }

  // 6 nearest neighbors per hospital
  for (const h of HOSPITALS) {
    const neighbors = HOSPITALS.filter((other) => other.code !== h.code)
      .map((other) => ({
        code: other.code,
        distance: haversineM(h.coords, other.coords),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);

    for (const n of neighbors) {
      const key = [h.code, n.code].sort().join('|');
      pairs.add(key);
    }
  }

  return Array.from(pairs).sort();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('=== Plexus Road Corridor Builder (OSRM) ===');
  console.log('LANDING_SPEC.md v5 section 12\n');

  // Placeholder User-Agent with contact per spec instructions
  const USER_AGENT = 'PlexusBloodBank/1.0 (https://github.com/plexus-ai; contact: dev-support@plexus.internal)';
  console.log(`[Etiquette] Using User-Agent: ${USER_AGENT}`);
  console.log(`[Etiquette] Spacing >= 1.1s between requests`);

  const pairs = computePairSet();
  console.log(`[Pair Set] Computed ${pairs.length} unique undirected pairs.`);

  // Resumable disk cache
  const cacheFile = path.resolve(__dirname, '.osrm-cache.json');
  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      console.log(`[Cache] Loaded ${Object.keys(cache).length} cached routes from ${cacheFile}`);
    } catch {
      cache = {};
    }
  }

  const results = {};
  let newFetches = 0;
  let cacheHits = 0;
  let failures = [];
  let maxOffsetM = 0;

  for (let i = 0; i < pairs.length; i++) {
    const pairKey = pairs[i];
    const [codeA, codeB] = pairKey.split('|');
    const hospA = HOSPITAL_BY_CODE.get(codeA);
    const hospB = HOSPITAL_BY_CODE.get(codeB);

    if (!hospA || !hospB) {
      console.error(`Unknown hospital code in pair: ${pairKey}`);
      continue;
    }

    if (cache[pairKey] && cache[pairKey].p) {
      results[pairKey] = cache[pairKey];
      cacheHits++;

      // Validate endpoints
      const pts = decodePolyline6(cache[pairKey].p);
      const startDist = haversineM(pts[0], hospA.coords);
      const endDist = haversineM(pts[pts.length - 1], hospB.coords);
      maxOffsetM = Math.max(maxOffsetM, startDist, endDist);
      continue;
    }

    // Rate limiting: 1.15 seconds spacing
    if (newFetches > 0) {
      await delay(1150);
    }

    const [lngA, latA] = hospA.coords;
    const [lngB, latB] = hospB.coords;
    const url = `https://router.project-osrm.org/route/v1/driving/${lngA},${latA};${lngB},${latB}?overview=full&geometries=polyline6&alternatives=false&steps=false`;

    let attempt = 0;
    let success = false;
    let data = null;

    while (attempt < 3 && !success) {
      attempt++;
      try {
        process.stdout.write(`[${i + 1}/${pairs.length}] Fetching ${pairKey} (${codeA} -> ${codeB})... `);
        const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }
        data = await resp.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error(`OSRM response code: ${data.code}`);
        }
        success = true;
      } catch (err) {
        console.warn(`Attempt ${attempt} failed: ${err.message}`);
        if (attempt < 3) {
          const backoff = attempt * 2000;
          console.log(`Waiting ${backoff}ms before retry...`);
          await delay(backoff);
        }
      }
    }

    if (success && data?.routes?.[0]) {
      const r = data.routes[0];
      const routeObj = {
        d: Math.round(r.distance),
        t: Math.round(r.duration),
        p: r.geometry,
      };

      // Validate endpoints
      const pts = decodePolyline6(routeObj.p);
      const startDist = haversineM(pts[0], hospA.coords);
      const endDist = haversineM(pts[pts.length - 1], hospB.coords);
      const offset = Math.max(startDist, endDist);
      maxOffsetM = Math.max(maxOffsetM, offset);

      if (offset > 150) {
        console.warn(`⚠️ Warning: Endpoint offset for ${pairKey} is ${Math.round(offset)}m (> 150m)`);
      }

      results[pairKey] = routeObj;
      cache[pairKey] = routeObj;
      newFetches++;

      // Save cache incrementally
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ (${Math.round(r.distance)}m, ${Math.round(r.duration)}s, ${pts.length} pts, offset: ${Math.round(offset)}m)`);
    } else {
      console.error(`❌ FAILED ${pairKey}`);
      failures.push(pairKey);
    }
  }

  // 5. Build final output object
  const output = {
    meta: {
      source: 'OSRM public demo',
      profile: 'driving',
      generatedAt: new Date().toISOString(),
      note: 'free-flow estimate, no live traffic',
      totalRoutes: Object.keys(results).length,
      endpointOffsetMaxM: Math.round(maxOffsetM),
    },
    routes: results,
  };

  const jsonStr = JSON.stringify(output, null, 2);

  // Write to src/data/routes.json and frontend/src/data/routes.json
  const outPaths = [
    path.resolve(rootDir, 'src', 'data', 'routes.json'),
    path.resolve(rootDir, 'frontend', 'src', 'data', 'routes.json'),
  ];

  for (const p of outPaths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, jsonStr, 'utf8');
  }

  const stat = fs.statSync(outPaths[1]);
  const sizeKb = (stat.size / 1024).toFixed(1);

  console.log('\n=== OSRM Route Generation Summary ===');
  console.log(`Routes Generated: ${Object.keys(results).length} / ${pairs.length}`);
  console.log(`Cache Hits: ${cacheHits}, New Fetches: ${newFetches}`);
  console.log(`Max Endpoint Offset: ${Math.round(maxOffsetM)}m (spec limit <= 150m)`);
  console.log(`File Size: ${sizeKb} KB`);
  console.log(`Failures: ${failures.length > 0 ? failures.join(', ') : 'None (0)'}`);
  console.log(`Output files written to:`);
  outPaths.forEach((p) => console.log(`  - ${p}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal error building routes:', err);
    process.exit(1);
  });
}

