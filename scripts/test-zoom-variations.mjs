import * as d3 from 'd3-geo';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

const gj = JSON.parse(fs.readFileSync('frontend/src/data/zones.geo.json', 'utf8'));
const hospitals = JSON.parse(fs.readFileSync('frontend/src/world/hospitals.json', 'utf8'));

// Filter out outer neighbors
const coreFeatures = gj.features.filter((f) => !f.properties.isNeighbor);

// Test Option A: Zoomed in to Delhi NCT + Ghaziabad/Noida (frames the yellow portion and all hospitals)
// Bounding box: lng 77.06 to 77.36, lat 28.50 to 28.68
const zoomBboxA = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [77.06, 28.50],
      [77.06, 28.68],
      [77.36, 28.68],
      [77.36, 28.50],
      [77.06, 28.50]
    ]]
  }
};

// Test Option B: Tighter zoom directly on the yellow portion + hospital cluster
// lng 77.10 to 77.34, lat 28.52 to 28.66
const zoomBboxB = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [77.10, 28.52],
      [77.10, 28.66],
      [77.34, 28.66],
      [77.34, 28.52],
      [77.10, 28.52]
    ]]
  }
};

// Test Option C: Only the active yellow/tinted districts itself
// (Ghaziabad, East Delhi, South Delhi, Central Delhi)

console.log('Generating variations...');

function buildSvg(zoomBbox, name) {
  const width = 320;
  const height = 180;
  const proj = d3.geoMercator().fitExtent([[16, 12], [width - 16, height - 12]], zoomBbox);
  const pathGen = d3.geoPath(proj);

  const districtsSvg = coreFeatures.map((f) => {
    return {
      id: f.properties.shapeID || f.properties.districtName,
      name: f.properties.districtName,
      zoneKey: f.properties.zoneKey,
      path: pathGen(f),
      centroid: pathGen.centroid(f),
    };
  });

  const hospitalsSvg = hospitals.map((h) => {
    const [x, y] = proj([h.lng, h.lat]);
    return {
      code: h.code,
      name: h.name,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      zone: h.zone,
    };
  });

  return {
    attribution: 'Boundary data: geoBoundaries (ODbL 1.0)',
    license: 'Open Data Commons Open Database License (ODbL) 1.0',
    source: 'geoBoundaries India ADM2 Simplified',
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    districts: districtsSvg,
    hospitals: hospitalsSvg,
  };
}

const dataA = buildSvg(zoomBboxA, 'zoomA');
const dataB = buildSvg(zoomBboxB, 'zoomB');

fs.writeFileSync(path.resolve('frontend/src/data/zones.svg.json'), JSON.stringify(dataA, null, 2));
fs.writeFileSync(path.resolve('src/data/zones.svg.json'), JSON.stringify(dataA, null, 2));

console.log('Saved dataA to zones.svg.json');

