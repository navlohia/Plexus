import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function run() {
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
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
  const consoleErrors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PAGE_ERROR] ${err.message}`);
  });

  console.log('Navigating to http://localhost:5173/?dev=1#/...');
  await page.goto('http://localhost:5173/?dev=1#/', { waitUntil: 'networkidle2' });

  // Initial wait for map and WebGL initialization
  await new Promise((r) => setTimeout(r, 2000));

  // --- DESKTOP VIEWPORT CAPTURES (1440x900) ---
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const desktopProgresses = [0.0, 0.1, 0.2, 0.28];
  const desktopTelemetry = [];

  for (const p of desktopProgresses) {
    console.log(`Setting progress to ${p} (Desktop 1440x900)...`);
    const tel = await page.evaluate(async (targetP) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(targetP);
      }
      await new Promise((r) => setTimeout(r, 500));

      const store = window.useStoryStore?.getState();
      return {
        progress: store?.progress,
        fps: store?.fps,
        useLiteMaterial: store?.useLiteMaterial,
        plateletScreen: store?.plateletScreen,
      };
    }, p);

    desktopTelemetry.push(tel);
    const pStr = p.toFixed(2).replace('.', '_');
    const outPath = path.join(artifactDir, `v2_desktop_progress_${pStr}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved: ${outPath} | Telemetry:`, tel);
  }

  // --- SCRUB-BACK TEST (0.28 -> 0.10) ---
  console.log('Performing scrub-back test: 0.28 -> 0.10...');
  const scrubBackTel = await page.evaluate(async () => {
    window.__story.setProgress(0.10);
    await new Promise((r) => setTimeout(r, 600));
    const store = window.useStoryStore?.getState();
    return {
      progress: store?.progress,
      fps: store?.fps,
      useLiteMaterial: store?.useLiteMaterial,
      plateletScreen: store?.plateletScreen,
    };
  });
  const scrubBackPath = path.join(artifactDir, `v2_desktop_scrub_back_0_10.png`);
  await page.screenshot({ path: scrubBackPath });
  console.log(`Saved scrub-back screenshot: ${scrubBackPath}`, scrubBackTel);

  // --- ROUTE SWITCH TEST (Single Session, No Reload) ---
  console.log('\nTesting Route Persistence (#/ -> #/workspace/map -> #/)...');
  await page.evaluate(() => {
    window.location.hash = '/workspace/map';
  });
  await new Promise((r) => setTimeout(r, 1200));
  const workspacePath = path.join(artifactDir, 'v2_workspace_map_route.png');
  await page.screenshot({ path: workspacePath });
  console.log(`Saved workspace route screenshot: ${workspacePath}`);

  // Navigate back to story
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await new Promise((r) => setTimeout(r, 1200));

  // --- MOBILE VIEWPORT CAPTURES (390x844) ---
  console.log('\nTesting Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  // Trigger resize event
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await new Promise((r) => setTimeout(r, 600));

  const mobileProgresses = [0.0, 0.1, 0.2, 0.28];
  const mobileTelemetry = [];

  for (const p of mobileProgresses) {
    console.log(`Setting progress to ${p} (Mobile 390x844)...`);
    const tel = await page.evaluate(async (targetP) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(targetP);
      }
      await new Promise((r) => setTimeout(r, 500));

      const store = window.useStoryStore?.getState();
      return {
        progress: store?.progress,
        fps: store?.fps,
        useLiteMaterial: store?.useLiteMaterial,
        plateletScreen: store?.plateletScreen,
      };
    }, p);

    mobileTelemetry.push(tel);
    const pStr = p.toFixed(2).replace('.', '_');
    const outPath = path.join(artifactDir, `v2_mobile_progress_${pStr}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved: ${outPath} | Telemetry:`, tel);
  }

  // Count "map created" console messages across the entire session
  const mapCreatedLogs = consoleLogs.filter((l) => l.includes('map created'));

  const report = {
    mapCreatedCount: mapCreatedLogs.length,
    consoleErrors,
    desktopTelemetry,
    scrubBackTel,
    mobileTelemetry,
  };

  const reportPath = path.join(artifactDir, 'v2_hero_test_summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\n=== TEST COMPLETE ===');
  console.log(`Report saved to ${reportPath}`);
  console.log(`Map created log count: ${mapCreatedLogs.length}`);
  console.log(`Errors count: ${consoleErrors.length}`);

  await browser.close();
}

run().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
