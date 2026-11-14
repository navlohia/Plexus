import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const docsDir = 'C:\\Blood Bank\\docs';

const testProgresses = [0.28, 0.30, 0.31, 0.32, 0.325, 0.33, 0.34, 0.36, 0.45];

async function run() {
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=d3d11',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const consoleLogs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('map created') || text.includes('Assert failed') || text.includes('Error')) {
      console.log(`[Browser Console] ${text}`);
    }
  });

  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2500));

  const setStoryProgress = async (target) => {
    await page.evaluate((p) => {
      const lenis = window.__lenis;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollY = maxScroll * p;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(scrollY, { immediate: true });
      } else {
        window.scrollTo(0, scrollY);
      }
      window.useStoryStore?.getState().setProgress(p);
    }, target);
    await new Promise((r) => setTimeout(r, 600));
  };

  console.log('\n=== 1. CAPTURING ACCEPTANCE PROGRESS SCREENSHOTS ===');
  for (const p of testProgresses) {
    const pStr = p.toFixed(3).replace('.', '_');
    console.log(`Setting progress to ${p}...`);

    await setStoryProgress(p);

    const shotName = `fracture_progress_${pStr}.png`;
    const artifactPath = path.join(artifactDir, shotName);
    const docsPath = path.join(docsDir, shotName);

    await page.screenshot({ path: artifactPath });
    fs.copyFileSync(artifactPath, docsPath);
    console.log(`Captured: ${shotName}`);
  }

  console.log('\n=== 2. SWAP TEST AT 0.318 AND 0.334 ===');
  // Close-up crop box centered on platelet region [520, 100, 680, 560]
  const swapCropBox = { x: 520, y: 100, width: 680, height: 560 };

  // At 0.318: Three.js platelet visible, cracks active, swap starting
  await setStoryProgress(0.318);

  const telemetry318 = await page.evaluate(() => {
    const s = window.useStoryStore?.getState();
    return {
      plateletScreen: s?.plateletScreen,
      progress: s?.progress,
      plateletCanvasMounted: !!document.getElementById('hero-platelet-container'),
    };
  });
  console.log('Telemetry at 0.318:', telemetry318);

  const crop318Artifact = path.join(artifactDir, 'fracture_swap_0_318_crop.png');
  await page.screenshot({
    path: crop318Artifact,
    clip: swapCropBox,
  });
  fs.copyFileSync(crop318Artifact, path.join(docsDir, 'fracture_swap_0_318_crop.png'));
  console.log('Saved 0.318 crop');

  // At 0.334: Platelet unmounted (> 0.335 or swap at 0.330), deck.gl discs visible
  await setStoryProgress(0.334);

  const telemetry334 = await page.evaluate(() => {
    const s = window.useStoryStore?.getState();
    const map = window.__map;
    const overlay = window.__deckOverlay;
    const fillLayer = overlay?._deck?.props?.layers?.find((l) => l.id === 'story-discs-fill');
    const discs = fillLayer?.props?.data || [];

    // Measure disc cluster bounds and center in screen space
    let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
    let sumX = 0, sumY = 0;
    if (map && discs.length > 0) {
      for (const d of discs) {
        const pt = map.project(d.position);
        minX = Math.min(minX, pt.x - d.radius);
        maxX = Math.max(maxX, pt.x + d.radius);
        minY = Math.min(minY, pt.y - d.radius);
        maxY = Math.max(maxY, pt.y + d.radius);
        sumX += pt.x;
        sumY += pt.y;
      }
    }
    const clusterCenterX = discs.length > 0 ? sumX / discs.length : 0;
    const clusterCenterY = discs.length > 0 ? sumY / discs.length : 0;
    const clusterExtentX = (maxX - minX) / 2;
    const clusterExtentY = (maxY - minY) / 2;

    return {
      progress: s?.progress,
      plateletCanvasMounted: !!document.getElementById('hero-platelet-container'),
      discCount: discs.length,
      clusterCenter: { x: Math.round(clusterCenterX * 10) / 10, y: Math.round(clusterCenterY * 10) / 10 },
      clusterBounds: { minX: Math.round(minX), maxX: Math.round(maxX), minY: Math.round(minY), maxY: Math.round(maxY) },
      clusterRadius: Math.round(Math.max(clusterExtentX, clusterExtentY) * 10) / 10,
    };
  });
  console.log('Telemetry at 0.334:', telemetry334);

  const crop334Artifact = path.join(artifactDir, 'fracture_swap_0_334_crop.png');
  await page.screenshot({
    path: crop334Artifact,
    clip: swapCropBox,
  });
  fs.copyFileSync(crop334Artifact, path.join(docsDir, 'fracture_swap_0_334_crop.png'));
  console.log('Saved 0.334 crop');

  console.log('\n=== 3. REVERSE SCRUB TEST (0.45 -> 0.25 -> 0.30) ===');
  await page.evaluate(async () => {
    const s = window.useStoryStore?.getState();
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    // Scrub downwards from 0.45 to 0.25
    for (let p = 0.45; p >= 0.25; p -= 0.02) {
      if (lenis) lenis.scrollTo(maxScroll * p, { immediate: true });
      s?.setProgress(p);
      await new Promise((r) => setTimeout(r, 40));
    }
    // Scrub forward to 0.30
    for (let p = 0.25; p <= 0.30; p += 0.01) {
      if (lenis) lenis.scrollTo(maxScroll * p, { immediate: true });
      s?.setProgress(p);
      await new Promise((r) => setTimeout(r, 40));
    }
    if (lenis) lenis.scrollTo(maxScroll * 0.30, { immediate: true });
    s?.setProgress(0.30);
    await new Promise((r) => setTimeout(r, 400));
  });
  await new Promise((r) => setTimeout(r, 400));

  const reverseShotArtifact = path.join(artifactDir, 'fracture_reverse_0_30.png');
  await page.screenshot({ path: reverseShotArtifact });
  fs.copyFileSync(reverseShotArtifact, path.join(docsDir, 'fracture_reverse_0_30.png'));
  console.log('Saved reverse test screenshot at 0.30');

  console.log('\n=== 4. VORONOI SEEDS OVERLAY CAPTURE ===');
  await setStoryProgress(0.31);
  await page.evaluate(async () => {
    window.useStoryStore?.getState().setShowVoronoiSeeds(true);
    await new Promise((r) => setTimeout(r, 300));
  });
  await new Promise((r) => setTimeout(r, 300));
  const seedsShotArtifact = path.join(artifactDir, 'fracture_voronoi_seeds_overlay.png');
  await page.screenshot({ path: seedsShotArtifact });
  fs.copyFileSync(seedsShotArtifact, path.join(docsDir, 'fracture_voronoi_seeds_overlay.png'));
  console.log('Saved Voronoi seeds overlay screenshot');

  // Turn off seeds overlay
  await page.evaluate(() => {
    window.useStoryStore?.getState().setShowVoronoiSeeds(false);
  });

  console.log('\n=== 5. DISC COUNT & FPS DURING BURST (0.33 .. 0.36) ===');
  await page.evaluate(async () => {
    window.useStoryStore?.getState().setProgress(0.45);
    await new Promise((r) => setTimeout(r, 500));
  });

  const auditData = await page.evaluate(async () => {
    const s = window.useStoryStore?.getState();
    const map = window.__map;
    const overlay = window.__deckOverlay;

    // Check deck layers
    const deckInstance = overlay?._deck;
    const layers = deckInstance?.props?.layers || [];
    const fillLayer = layers.find((l) => l.id === 'story-discs-fill');
    const ringLayer = layers.find((l) => l.id === 'story-discs-ring');

    const discData = fillLayer?.props?.data || [];

    // Measure FPS during burst loop
    let frameCount = 0;
    const start = performance.now();
    for (let i = 0; i < 30; i++) {
      const p = 0.33 + (i / 30) * 0.03;
      s.setProgress(p);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      frameCount++;
    }
    const duration = (performance.now() - start) / 1000;
    const measuredFps = Math.round(frameCount / duration);

    // Reset back to 0.45
    s.setProgress(0.45);

    return {
      discCount: discData.length,
      firstDisc: discData[0],
      lastDisc: discData[discData.length - 1],
      measuredFps,
      currentFps: s.fps,
      mapCreatedCount: console.log, // handled via log intercept
    };
  });

  console.log('Audit Data at 0.45:', auditData);

  const mapCreatedLogs = consoleLogs.filter((l) => l.includes('map created'));
  console.log(`"map created" count in console: ${mapCreatedLogs.length}`);

  const summary = {
    testProgresses,
    telemetry318,
    telemetry334,
    auditData,
    mapCreatedCount: mapCreatedLogs.length,
  };

  fs.writeFileSync(
    path.join(artifactDir, 'fracture_test_summary.json'),
    JSON.stringify(summary, null, 2)
  );

  await browser.close();
  console.log('Testing completed successfully!');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
