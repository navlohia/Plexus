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
  await new Promise((r) => setTimeout(r, 2000));

  const targetProgresses = [0.27, 0.29, 0.31, 0.32, 0.33, 0.335, 0.34, 0.36, 0.45, 0.55];
  const telemetrySummary = [];

  for (const p of targetProgresses) {
    console.log(`Evaluating progress = ${p}...`);

    const tel = await page.evaluate(async (targetP) => {
      const setP = (val) => {
        if (window.__story && typeof window.__story.setProgress === 'function') {
          window.__story.setProgress(val);
        } else if (window.useStoryStore) {
          window.useStoryStore.getState().setProgress(val);
        }
      };
      setP(targetP);
      await new Promise((r) => setTimeout(r, 600));

      const store = window.useStoryStore?.getState();
      return {
        progress: store?.progress,
        fps: store?.fps,
        useLiteMaterial: store?.useLiteMaterial,
        plateletScreen: store?.plateletScreen,
      };
    }, p);

    telemetrySummary.push(tel);

    const pStr = p.toFixed(3).replace('.', '_');
    const fullPath = path.join(artifactDir, `fracture_swarm_progress_${pStr}.png`);
    await page.screenshot({ path: fullPath });
    console.log(`Saved: ${fullPath} | FPS: ${tel.fps} | plateletScreen:`, tel.plateletScreen);

    // POP TEST CROPS at 0.31, 0.32, 0.335
    if (p === 0.31 || p === 0.32 || p === 0.335) {
      const ps = tel.plateletScreen || { x: 893, y: 414 };
      const cropBox = {
        x: Math.max(0, Math.min(1440 - 460, Math.round(ps.x - 230))),
        y: Math.max(0, Math.min(900 - 360, Math.round(ps.y - 180))),
        width: 460,
        height: 360,
      };
      const cropPath = path.join(artifactDir, `pop_test_crop_${pStr}.png`);
      await page.screenshot({
        path: cropPath,
        clip: cropBox,
      });
      console.log(`Saved Pop Test Crop: ${cropPath}`, cropBox);
    }
  }

  // REVERSE TEST: scrub 0.55 to 0.25 and screenshot at 0.28
  console.log('\nPerforming REVERSE TEST: scrub 0.55 -> 0.25 -> 0.28...');
  const reverseTel = await page.evaluate(async () => {
    const setP = (val) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(val);
      } else if (window.useStoryStore) {
        window.useStoryStore.getState().setProgress(val);
      }
    };
    setP(0.25);
    await new Promise((r) => setTimeout(r, 600));
    setP(0.28);
    await new Promise((r) => setTimeout(r, 800));

    const store = window.useStoryStore?.getState();
    return {
      progress: store?.progress,
      fps: store?.fps,
      useLiteMaterial: store?.useLiteMaterial,
      plateletScreen: store?.plateletScreen,
    };
  });

  const reversePath = path.join(artifactDir, `reverse_test_progress_0_280.png`);
  await page.screenshot({ path: reversePath });
  console.log(`Saved Reverse Test Screenshot: ${reversePath}`, reverseTel);

  const report = {
    consoleErrors,
    telemetrySummary,
    reverseTel,
  };

  const reportPath = path.join(artifactDir, 'fracture_swarm_test_summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\n=== TEST COMPLETE ===');
  console.log(`Summary saved to ${reportPath}`);
  console.log(`Console errors count: ${consoleErrors.length}`);

  await browser.close();
}

run().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
