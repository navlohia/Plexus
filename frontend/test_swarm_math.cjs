function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

// Generate 25 points inside x in [-0.42, 0.42], y in [-0.38, 0.38], z in [-300, 250]
const points = [];
for (let i = 0; i < 25; i++) {
  points.push({
    xNorm: -0.40 + 0.80 * rng(),
    yNorm: -0.35 + 0.70 * rng(),
    z: -280 + 510 * rng(),
    diameter: 38 + 30 * rng(), // 38..68 px
    driftK: 18 + 14 * rng(),
    driftPhase: rng() * Math.PI * 2,
    driftAmp: 8 + 6 * rng(), // 8..14 px
  });
}

// Relax points with min-distance repulsion
for (let iter = 0; iter < 10; iter++) {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      const dx = (p1.xNorm - p2.xNorm) * 1200; // rough px
      const dy = (p1.yNorm - p2.yNorm) * 800;
      const dz = (p1.z - p2.z) * 0.5;
      const dist = Math.hypot(dx, dy, dz);
      const minDist = (p1.diameter + p2.diameter) * 0.75;
      if (dist < minDist && dist > 1e-4) {
        const overlap = (minDist - dist) / dist * 0.2;
        p1.xNorm += (dx * overlap) / 1200;
        p1.yNorm += (dy * overlap) / 800;
        p1.z += dz * overlap;
        p2.xNorm -= (dx * overlap) / 1200;
        p2.yNorm -= (dy * overlap) / 800;
        p2.z -= dz * overlap;

        // clamp
        p1.xNorm = Math.max(-0.43, Math.min(0.43, p1.xNorm));
        p1.yNorm = Math.max(-0.38, Math.min(0.38, p1.yNorm));
        p1.z = Math.max(-300, Math.min(250, p1.z));
        p2.xNorm = Math.max(-0.43, Math.min(0.43, p2.xNorm));
        p2.yNorm = Math.max(-0.38, Math.min(0.38, p2.yNorm));
        p2.z = Math.max(-300, Math.min(250, p2.z));
      }
    }
  }
}

console.log('Relaxation complete. Sample point 0:', points[0]);
console.log('Point count:', points.length);

