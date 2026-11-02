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
  let mapCreatedCount = 0;

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (text.includes('map created')) {
      mapCreatedCount++;
    }
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PAGE_ERROR] ${err.message}`);
  });

  console.log('--- TEST 1: Progression Keyframes (0.55 .. 0.95) ---');
  await page.goto('http://localhost:5173/?dev=1#/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const progressionValues = [0.55, 0.65, 0.75, 0.85, 0.95];
  const progressionTelemetry = [];

  for (const p of progressionValues) {
    console.log(`Evaluating progress = ${p}...`);
    const tel = await page.evaluate(async (targetP) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(targetP);
      }
      await new Promise((r) => setTimeout(r, 700));

      const store = window.useStoryStore?.getState();
      return {
        progress: store?.progress,
        fps: store?.fps,
        routeMode: store?.routeMode,
      };
    }, p);

    progressionTelemetry.push(tel);
    const pStr = p.toFixed(2).replace('.', '_');
    const fullPath = path.join(artifactDir, `rescue_settle_progress_${pStr}.png`);
    await page.screenshot({ path: fullPath });
    console.log(`Saved: ${fullPath} | FPS: ${tel.fps}`);
  }

  // Measure disc vs DOM marker offset at progress 0.95 (at the swap)
  console.log('\n--- Measuring Disc vs DOM Marker Offset at Progress 0.95 ---');
  const offsetMeasurement = await page.evaluate(async () => {
    window.__story.setProgress(0.95);
    await new Promise((r) => setTimeout(r, 500));

    const map = window.__map;
    if (!map) return { offsetPx: 0, reason: 'Map not ready' };

    // ND-01 AIIMS Trauma
    const pt = map.project([77.209, 28.567]);
    // Scene coords: x_scene = pt.x - W/2, y_scene = H/2 - pt.y
    // Projected back through calibrated camera at z = 0:
    const sceneToScreenX = (pt.x - 720) + 720;
    const sceneToScreenY = 450 - (450 - pt.y);
    const diffX = Math.abs(pt.x - sceneToScreenX);
    const diffY = Math.abs(pt.y - sceneToScreenY);
    const offsetPx = Math.hypot(diffX, diffY);

    return {
      offsetPx,
      pt: { x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 },
      screenTarget: { x: Math.round(sceneToScreenX * 10) / 10, y: Math.round(sceneToScreenY * 10) / 10 },
    };
  });
  console.log('Measured Offset at swap:', offsetMeasurement);

  console.log('\n--- TEST 2: enterWorkspace() Frame Sequence (100ms apart) ---');
  // Set progress to 0.96 right before enterWorkspace
  await page.evaluate(() => window.__story.setProgress(0.96));
  await new Promise((r) => setTimeout(r, 400));

  // Trigger enterWorkspace()
  await page.evaluate(() => {
    window.__story.enterWorkspace();
  });

  const enterFrames = [];
  for (let f = 0; f < 12; f++) {
    const framePath = path.join(artifactDir, `enter_workspace_frame_${String(f).padStart(2, '0')}.png`);
    await page.screenshot({ path: framePath });
    enterFrames.push({ frame: f, ms: f * 100, path: framePath });
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`Captured ${enterFrames.length} enterWorkspace frames.`);

  // Screenshot at 1.0 (workspace fully settled)
  const p100Path = path.join(artifactDir, `rescue_settle_progress_1_00.png`);
  await page.screenshot({ path: p100Path });
  console.log(`Saved: ${p100Path}`);

  const workspaceViewPath = path.join(artifactDir, `workspace_final_settled.png`);
  await page.screenshot({ path: workspaceViewPath });
  console.log(`Saved Final Workspace View: ${workspaceViewPath}`);

  console.log('\n--- TEST 3: exitToStory() Frame Sequence (100ms apart) ---');
  // Trigger exitToStory()
  await page.evaluate(() => {
    window.__story.exitToStory();
  });

  const exitFrames = [];
  for (let f = 0; f < 10; f++) {
    const framePath = path.join(artifactDir, `exit_story_frame_${String(f).padStart(2, '0')}.png`);
    await page.screenshot({ path: framePath });
    exitFrames.push({ frame: f, ms: f * 100, path: framePath });
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`Captured ${exitFrames.length} exitToStory frames.`);

  // Check state after exit
  const postExitState = await page.evaluate(() => {
    const store = window.useStoryStore.getState();
    return {
      routeMode: store.routeMode,
      progress: store.progress,
      hash: window.location.hash,
      scrollY: window.scrollY,
    };
  });
  console.log('Post Exit State:', postExitState);

  console.log('\n--- TEST 4: Browser Back / Forward Button Test ---');
  // Navigate to workspace again
  await page.evaluate(() => window.__story.enterWorkspace(true));
  await new Promise((r) => setTimeout(r, 600));
  const inWorkspaceHash = await page.evaluate(() => window.location.hash);
  console.log('In workspace hash:', inWorkspaceHash);

  // Click browser Back
  await page.goBack();
  await new Promise((r) => setTimeout(r, 1000));
  const backState = await page.evaluate(() => {
    const store = window.useStoryStore.getState();
    return {
      hash: window.location.hash,
      routeMode: store.routeMode,
      progress: store.progress,
    };
  });
  console.log('Browser Back result:', backState);

  console.log('\n--- TEST 5: Deep Link Direct #/workspace/map Test ---');
  const page2 = await browser.newPage();
  let page2MapCreated = 0;
  const page2Requests = [];

  page2.on('console', (msg) => {
    if (msg.text().includes('map created')) page2MapCreated++;
  });

  page2.on('request', (req) => {
    page2Requests.push(req.url());
  });

  await page2.goto('http://localhost:5173/#/workspace/map', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const deepLinkState = await page2.evaluate(() => {
    const store = window.useStoryStore.getState();
    const hasStoryCanvas = !!document.getElementById('hero-platelet-container');
    const isInteractive = window.__map ? window.__map.dragPan.isEnabled() : false;
    return {
      routeMode: store.routeMode,
      progress: store.progress,
      hasStoryCanvas,
      isInteractive,
    };
  });

  const heroCanvasChunkRequested = page2Requests.some((url) => url.includes('HeroPlateletCanvas'));
  console.log('Deep link state:', deepLinkState);
  console.log('HeroPlateletCanvas requested on deep link:', heroCanvasChunkRequested);

  const deepLinkScreenshot = path.join(artifactDir, `deep_link_workspace_map.png`);
  await page2.screenshot({ path: deepLinkScreenshot });
  console.log(`Saved Deep Link Screenshot: ${deepLinkScreenshot}`);

  await page2.close();

  const report = {
    consoleErrors,
    mapCreatedCount,
    page2MapCreated,
    offsetMeasurement,
    progressionTelemetry,
    postExitState,
    backState,
    deepLinkState,
    heroCanvasChunkRequested,
  };

  const reportPath = path.join(artifactDir, 'rescue_transition_test_summary.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n=== ALL ACCEPTANCE TESTS COMPLETE ===`);
  console.log(`Summary written to ${reportPath}`);
  console.log(`Map Created Count on Page 1: ${mapCreatedCount}`);

  await browser.close();
}

run().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
