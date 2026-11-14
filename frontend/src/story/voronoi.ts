import * as THREE from 'three';
import { FRACTURE_SEEDS } from './fractureSeeds';

let cachedTexture: THREE.CanvasTexture | null = null;

/**
 * Generates a 1024x1024 deterministic Voronoi crack texture from the 25 Lloyd-relaxed seeds.
 * Hairlines are ~1.5px white lines on black, brightest at cell intersections.
 */
export function getOrCreateVoronoiTexture(): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;

  const SIZE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context for Voronoi canvas');

  const imgData = ctx.createImageData(SIZE, SIZE);
  const data = imgData.data;

  const N = FRACTURE_SEEDS.length;
  const w = 0.0038; // ~1.5px on a 1024 canvas in [-1, 1] range

  for (let y = 0; y < SIZE; y++) {
    const pz = (y / (SIZE - 1)) * 2 - 1;
    for (let x = 0; x < SIZE; x++) {
      const px = (x / (SIZE - 1)) * 2 - 1;
      const r = Math.hypot(px, pz);
      if (r > 0.92) continue; // Outside platelet disc boundary

      // Find 3 closest seeds
      let d1 = 999;
      let d2 = 999;
      let d3 = 999;

      for (let i = 0; i < N; i++) {
        const seed = FRACTURE_SEEDS[i];
        const dx = px - seed.x;
        const dz = pz - seed.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < d1) {
          d3 = d2;
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d3 = d2;
          d2 = d;
        } else if (d < d3) {
          d3 = d;
        }
      }

      const diff = d2 - d1;
      if (diff < w) {
        // Line intensity
        const line = 1.0 - diff / w;
        // Intersection boost where 3rd seed is close
        const corner = Math.max(0, 1.0 - (d3 - d1) / (w * 2.8));
        const alpha = Math.min(1.0, line * 0.75 + corner * 0.35);

        // Edge fade near disc rim
        const rimFade = r > 0.85 ? Math.max(0, 1.0 - (r - 0.85) / 0.07) : 1.0;
        const byteVal = Math.round(alpha * rimFade * 255);

        const idx = (y * SIZE + x) * 4;
        data[idx] = byteVal;     // R
        data[idx + 1] = byteVal; // G
        data[idx + 2] = byteVal; // B
        data[idx + 3] = 255;     // A
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  cachedTexture = texture;
  return texture;
}

