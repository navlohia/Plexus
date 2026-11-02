import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const docsDir = 'C:\\Blood Bank\\docs';

async function capture() {
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=d3d11',
    ],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]', err.message);
  });

  console.log('Navigating to http://localhost:5173/#/');
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });

  // Initial wait for map and WebGL context
  await new Promise((r) => setTimeout(r, 2000));

  // Ensure we start with PBR material
  await page.evaluate(() => {
    if (window.useStoryStore) {
      window.useStoryStore.getState().setUseLiteMaterial(false);
    }
  });

  const testProgresses = [0.0, 0.1, 0.2, 0.3, 0.35];
  const telemetrySummary = [];

  for (const p of testProgresses) {
    console.log(`\nEvaluating progress = ${p}...`);

    const result = await page.evaluate(async (targetProgress) => {
      const store = window.useStoryStore?.getState();
      if (store) {
        // Enforce PBR for standard tests unless user toggles
        store.setUseLiteMaterial(false);
        store.setProgress(targetProgress);
      }

      // Synchronize window scroll for Lenis
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll * targetProgress);

      // Wait 3 frames
      await new Promise((r) => setTimeout(r, 600));

      const plateletEl = document.getElementById('hero-platelet-container');
      const updatedStore = window.useStoryStore?.getState();

      return {
        progress: targetProgress,
        hasPlateletContainer: !!plateletEl,
        plateletScreen: updatedStore?.plateletScreen ?? null,
        fps: updatedStore?.fps ?? null,
        useLiteMaterial: updatedStore?.useLiteMaterial ?? false,
        devSettings: updatedStore?.devSettings ?? null,
      };
    }, p);

    telemetrySummary.push(result);
    console.log(`Telemetry at ${p}:`, JSON.stringify(result));

    await new Promise((r) => setTimeout(r, 300));

    const pStr = p.toFixed(2).replace('.', '_');
    const artifactPath = path.join(artifactDir, `platelet_progress_${pStr}.png`);
    const docPath = path.join(docsDir, `platelet_progress_${pStr}.png`);

    await page.screenshot({ path: artifactPath });
    fs.copyFileSync(artifactPath, docPath);
    console.log(`Saved screenshot to ${artifactPath}`);
  }

  // Also test the Fallback Lite Material at progress 0.1
  console.log('\nTesting Fallback Lite Material (matcap + fresnel)...');
  const liteResult = await page.evaluate(async () => {
    const store = window.useStoryStore?.getState();
    if (store) {
      store.setProgress(0.1);
      store.setUseLiteMaterial(true);
    }
    await new Promise((r) => setTimeout(r, 600));
    const updatedStore = window.useStoryStore?.getState();
    return {
      progress: 0.1,
      useLiteMaterial: updatedStore?.useLiteMaterial,
      fps: updatedStore?.fps,
      plateletScreen: updatedStore?.plateletScreen,
    };
  });
  console.log('Lite Material Telemetry:', liteResult);

  const liteArtifactPath = path.join(artifactDir, `platelet_lite_material.png`);
  const liteDocPath = path.join(docsDir, `platelet_lite_material.png`);
  await page.screenshot({ path: liteArtifactPath });
  fs.copyFileSync(liteArtifactPath, liteDocPath);
  console.log(`Saved Lite Material screenshot to ${liteArtifactPath}`);

  console.log('\n=== COMPLETE TELEMETRY REPORT ===');
  console.log(JSON.stringify(telemetrySummary, null, 2));

  console.log('\n=== RECENT CONSOLE MESSAGES ===');
  consoleLogs.slice(-10).forEach((l) => console.log(l));

  await browser.close();
  console.log('\nCapture completed successfully!');
}

capture().catch((err) => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
