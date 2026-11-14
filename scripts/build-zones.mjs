import fs from 'fs';
import path from 'path';
import * as d3 from 'd3-geo';

const GEO_URL = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM2/geoBoundaries-IND-ADM2_simplified.geojson';

const DISTRICT_ZONE_MAP = {
  // Delhi Revenue Districts -> 5 Delhi Zones
  'North ': 'North Delhi',
  'North West': 'North Delhi',
  'West': 'West Delhi',
  'South West': 'West Delhi',
  'Central': 'Central Delhi',
  'New Delhi': 'Central Delhi',
  'East': 'East Delhi',
  'North East': 'East Delhi',
  'Shahdara': 'East Delhi',
  'South': 'South Delhi',
  'South East': 'South Delhi',
  // NCR Core Satellite Districts
  'Gurgaon': 'Gurugram',
  'Faridabad': 'Faridabad',
  'Gautam Buddha Nagar': 'Noida',
  'Ghaziabad': 'Ghaziabad',
};

function reverseRings(geom) {
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map((ring) => ring.slice().reverse()),
    };
  } else if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) => poly.map((ring) => ring.slice().reverse())),
    };
  }
  return geom;
}

function haversineDistKm(c1, c2) {
  const R = 6371;
  const dLat = ((c2[1] - c1[1]) * Math.PI) / 180;
  const dLng = ((c2[0] - c1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((c1[1] * Math.PI) / 180) *
      Math.cos((c2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function main() {
  console.log('--- Fetching geoBoundaries India ADM2 simplified GeoJSON ---');
  let rawGj;
  const cachedPath = path.resolve('scripts/geoBoundaries-IND-ADM2_simplified.geojson');
  if (fs.existsSync(cachedPath)) {
    console.log('Loading from local cache:', cachedPath);
    rawGj = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
  } else {
    const res = await fetch(GEO_URL);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    rawGj = await res.json();
    fs.writeFileSync(cachedPath, JSON.stringify(rawGj));
    console.log(`Downloaded and cached ${rawGj.features.length} features from geoBoundaries`);
  }

  // Filter features for core Delhi-NCR districts only (omits distant peripheral neighbors)
  const districtNames = Object.keys(DISTRICT_ZONE_MAP);
  const filteredFeatures = rawGj.features.filter((f) => {
    const rawName = f.properties.shapeName;
    return districtNames.includes(rawName);
  });
  console.log(`Filtered to ${filteredFeatures.length} core Delhi-NCR districts`);

  // Normalize polygon winding so spherical area < 2*PI (d3-geo compatibility)
  const normalizedFeatures = filteredFeatures.map((f) => {
    const distName = f.properties.shapeName;
    const zoneKey = DISTRICT_ZONE_MAP[distName];
    const isOverArea = d3.geoArea(f) > 2 * Math.PI;
    const geom = isOverArea ? reverseRings(f.geometry) : f.geometry;

    return {
      type: 'Feature',
      properties: {
        ...f.properties,
        districtName: distName.trim(),
        zoneKey,
        isNeighbor: false,
      },
      geometry: geom,
    };
  });

  const ncrFeatureCollection = {
    type: 'FeatureCollection',
    features: normalizedFeatures,
  };

  // Setup d3-geo projection zoomed in on the active Delhi-NCR yellow & hospital cluster
  const width = 320;
  const height = 180;

  // Zoom bounding box: lng 77.02 to 77.38, lat 28.46 to 28.71 (clockwise)
  const zoomBbox = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [77.02, 28.46],
        [77.02, 28.71],
        [77.38, 28.71],
        [77.38, 28.46],
        [77.02, 28.46]
      ]]
    }
  };

  const projection = d3.geoMercator().fitExtent(
    [
      [14, 10],
      [width - 14, height - 10],
    ],
    zoomBbox
  );
  const pathGenerator = d3.geoPath(projection);

  // Compute SVG paths and centroids
  const svgDistricts = [];
  for (const f of normalizedFeatures) {
    const svgPath = pathGenerator(f);
    const centroid = pathGenerator.centroid(f);
    const distName = f.properties.districtName;
    const zoneKey = f.properties.zoneKey;

    svgDistricts.push({
      id: f.properties.shapeID || distName.toLowerCase().replace(/\s+/g, '-'),
      name: distName,
      zoneKey,
      isNeighbor: false,
      path: svgPath,
      centroid: [Number(centroid[0].toFixed(2)), Number(centroid[1].toFixed(2))],
    });
  }

  // Load 25 hospitals
  const hospitalsPath = path.resolve('frontend/src/world/hospitals.json');
  const hospitals = JSON.parse(fs.readFileSync(hospitalsPath, 'utf8'));

  // Assign every hospital's zone by point-in-polygon (centroid fallback)
  console.log('\n--- Hospital Zone Assignment by Point-in-Polygon ---');
  const hospitalZoneMapping = {};
  const assignmentRows = [];

  for (const h of hospitals) {
    const pt = [h.lng, h.lat];
    let matchedFeature = null;

    // 1. Point-in-polygon check across all core features using d3.geoContains
    for (const f of normalizedFeatures) {
      if (d3.geoContains(f, pt)) {
        matchedFeature = f;
        break;
      }
    }

    let assignedZone = '';
    let method = 'point-in-polygon';
    let districtName = '';

    if (matchedFeature) {
      districtName = matchedFeature.properties.districtName;
      assignedZone = matchedFeature.properties.zoneKey;
    } else {
      // Centroid fallback
      method = 'centroid fallback';
      let closestDist = Infinity;
      for (const f of normalizedFeatures) {
        const centroid = d3.geoCentroid(f);
        const dist = haversineDistKm(pt, centroid);
        if (dist < closestDist) {
          closestDist = dist;
          assignedZone = f.properties.zoneKey;
          districtName = f.properties.districtName;
        }
      }
    }

    hospitalZoneMapping[h.code] = {
      code: h.code,
      id: h.id,
      name: h.name,
      fullName: h.fullName,
      zone: assignedZone,
      district: districtName,
      method,
    };

    assignmentRows.push({
      code: h.code,
      name: h.name,
      lng: h.lng,
      lat: h.lat,
      district: districtName,
      zone: assignedZone,
      method,
    });
  }

  // Print formatted table of all 25 hospitals
  console.table(assignmentRows);

  // Project hospital dots into SVG coordinates
  const projectedHospitals = hospitals.map((h) => {
    const projected = projection([h.lng, h.lat]);
    return {
      code: h.code,
      id: h.id,
      name: h.name,
      fullName: h.fullName,
      lng: h.lng,
      lat: h.lat,
      x: Number(projected[0].toFixed(2)),
      y: Number(projected[1].toFixed(2)),
      zone: hospitalZoneMapping[h.code].zone,
    };
  });

  // SVG Export structure
  const svgOutput = {
    attribution: 'Boundary data: geoBoundaries (ODbL 1.0)',
    license: 'Open Data Commons Open Database License (ODbL) 1.0',
    source: 'geoBoundaries India ADM2 Simplified',
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    districts: svgDistricts,
    hospitals: projectedHospitals,
  };

  // Target directories
  const targetDirs = [
    path.resolve('frontend/src/data'),
    path.resolve('src/data'),
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'zones.geo.json'), JSON.stringify(ncrFeatureCollection, null, 2));
    fs.writeFileSync(path.join(dir, 'zones.svg.json'), JSON.stringify(svgOutput, null, 2));
  }

  fs.writeFileSync(
    path.resolve('frontend/src/data/hospitalZoneMapping.json'),
    JSON.stringify(hospitalZoneMapping, null, 2)
  );

  console.log('\nEmitted zoomed-in zones.svg.json and zones.geo.json successfully to frontend/src/data/ and src/data/');
}

main().catch((err) => {
  console.error('Build zones error:', err);
  process.exit(1);
});
