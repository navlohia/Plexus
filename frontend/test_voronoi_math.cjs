const { Delaunay } = require('d3-delaunay');

const seeds = [
  { index: 0, x: 0.125, z: -0.004, radius: 0.125 },
  { index: 1, x: -0.141, z: 0.124, radius: 0.188 },
  { index: 2, x: 0.000, z: -0.251, radius: 0.251 },
  { index: 3, x: 0.188, z: 0.267, radius: 0.327 },
  { index: 4, x: -0.343, z: -0.094, radius: 0.356 },
  { index: 5, x: 0.349, z: -0.201, radius: 0.403 },
  { index: 6, x: -0.122, z: 0.412, radius: 0.430 },
  { index: 7, x: -0.232, z: -0.394, radius: 0.457 },
  { index: 8, x: 0.446, z: 0.124, radius: 0.463 },
  { index: 9, x: -0.448, z: 0.212, radius: 0.496 },
  { index: 10, x: 0.199, z: -0.481, radius: 0.521 },
  { index: 11, x: 0.175, z: 0.529, radius: 0.557 },
  { index: 12, x: -0.624, z: -0.308, radius: 0.696 },
  { index: 13, x: 0.680, z: -0.194, radius: 0.707 },
  { index: 14, x: -0.378, z: 0.604, radius: 0.713 },
  { index: 15, x: -0.125, z: -0.701, radius: 0.712 },
  { index: 16, x: 0.567, z: 0.434, radius: 0.714 },
  { index: 17, x: -0.728, z: 0.015, radius: 0.728 },
  { index: 18, x: 0.534, z: -0.508, radius: 0.737 },
  { index: 19, x: -0.052, z: 0.743, radius: 0.745 },
  { index: 20, x: -0.457, z: -0.592, radius: 0.748 },
  { index: 21, x: 0.740, z: 0.132, radius: 0.752 },
  { index: 22, x: -0.649, z: 0.394, radius: 0.759 },
  { index: 23, x: 0.213, z: -0.735, radius: 0.765 },
  { index: 24, x: 0.349, z: 0.687, radius: 0.771 },
];

const points = seeds.map(s => [s.x, s.z]);
const delaunay = Delaunay.from(points);
const voronoi = delaunay.voronoi([-1.5, -1.5, 1.5, 1.5]);

function clipSegment(p1, p2, R = 0.98) {
  const dx = p2[0] - p1[0];
  const dz = p2[1] - p1[1];
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return null;
  const b = 2 * (p1[0] * dx + p1[1] * dz);
  const c = p1[0] * p1[0] + p1[1] * p1[1] - R * R;
  const discr = b * b - 4 * a * c;
  if (discr < 0) return null;
  const sq = Math.sqrt(discr);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  const tMin = Math.max(0, Math.min(t1, t2));
  const tMax = Math.min(1, Math.max(t1, t2));
  if (tMin > 1 || tMax < 0 || tMin >= tMax) return null;
  return [
    [p1[0] + tMin * dx, p1[1] + tMin * dz],
    [p1[0] + tMax * dx, p1[1] + tMax * dz]
  ];
}

const edgeMap = new Map();
for (const poly of voronoi.cellPolygons()) {
  for (let i = 0; i < poly.length - 1; i++) {
    const a = poly[i], b = poly[i + 1];
    const clipped = clipSegment(a, b, 0.98);
    if (!clipped) continue;
    const k1 = `${clipped[0][0].toFixed(3)},${clipped[0][1].toFixed(3)}-${clipped[1][0].toFixed(3)},${clipped[1][1].toFixed(3)}`;
    const k2 = `${clipped[1][0].toFixed(3)},${clipped[1][1].toFixed(3)}-${clipped[0][0].toFixed(3)},${clipped[0][1].toFixed(3)}`;
    if (!edgeMap.has(k1) && !edgeMap.has(k2)) {
      edgeMap.set(k1, clipped);
    }
  }
}

console.log('Unique clipped Voronoi edges:', edgeMap.size);
const edges = Array.from(edgeMap.values());
console.log('Sample edge:', edges[0]);

