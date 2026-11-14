import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
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
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
      console.error('[Browser Error]', text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.error('[Page Error]', err.message);
  });

  console.log('Navigating to http://localhost:5173/#/ ...');
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });
  await delay(2500);

  // ── 1. Keyframe Captures across Rescue & Settle (Desktop 1440x900) ──
  const desktopProgressTargets = [0.55, 0.62, 0.70, 0.75, 0.85, 0.95];
  const progressResults = {};

  for (const p of desktopProgressTargets) {
    console.log(`Setting desktop progress to ${p} ...`);
    const info = await page.evaluate(async (targetP) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(targetP);
      }
      await new Promise((r) => setTimeout(r, 400));

      const map = window.__map;
      const center = map ? map.getCenter() : null;
      const zoom = map ? map.getZoom() : null;
      const pitch = map ? map.getPitch() : null;
      const bearing = map ? map.getBearing() : null;

      // Check DOM markers count
      const domMarkers = document.querySelectorAll('[id^="story-dom-marker-"]');
      const visibleMarkers = Array.from(domMarkers).filter(
        (el) => el.style.display !== 'none' && parseFloat(el.style.opacity || '0') > 0.05
      ).length;

      // Check Pills
      const pills = document.querySelectorAll('[id^="story-dom-pill-"]');
      const visiblePills = Array.from(pills).filter(
        (el) => parseFloat(el.style.opacity || '0') > 0.05
      ).length;

      return {
        progress: window.__storyProgress,
        visibleMarkers,
        visiblePills,
        camera: { center, zoom, pitch, bearing },
      };
    }, p);

    const filename = `rescue_progress_${p.toFixed(2).replace('.', '_')}_desktop.png`;
    const filepath = path.join(artifactDir, filename);
    await page.screenshot({ path: filepath });
    console.log(`Captured ${filename}:`, JSON.stringify(info));
    progressResults[p] = { filename, info };
  }

  // ── 2. Keyframe Captures across Rescue & Settle (Mobile 390x844) ──
  console.log('\n--- Switching to Mobile Viewport (390x844) ---');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await delay(1000);

  const mobileTargets = [0.55, 0.70, 0.85, 0.95];
  for (const p of mobileTargets) {
    console.log(`Setting mobile progress to ${p} ...`);
    await page.evaluate(async (targetP) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(targetP);
      }
      await new Promise((r) => setTimeout(r, 400));
    }, p);

    const filename = `rescue_progress_${p.toFixed(2).replace('.', '_')}_mobile.png`;
    const filepath = path.join(artifactDir, filename);
    await page.screenshot({ path: filepath });
    console.log(`Captured mobile ${filename}`);
  }

  // Restore Desktop Viewport
  console.log('\n--- Restoring Desktop Viewport (1440x900) ---');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await delay(500);

  // Set to progress 0.95 before initiating enterWorkspace morph
  await page.evaluate(async () => {
    window.__story.setProgress(0.95);
    await new Promise((r) => setTimeout(r, 500));
  });

  // ── 3. enterWorkspace() Frame Sequence (>= 12 frames, 100ms apart) ──
  console.log('\n--- Capturing enterWorkspace() Morph Frame Sequence (14 frames, 100ms apart) ---');
  const enterFrames = [];
  const geoCoordinates = [];

  // Start enterWorkspace morph
  await page.evaluate(() => {
    // Click the CTA or call enterWorkspace directly
    if (window.__story && typeof window.__story.enterWorkspace === 'function') {
      window.__story.enterWorkspace();
    }
  });

  for (let frameIdx = 0; frameIdx < 14; frameIdx++) {
    const elapsedMs = frameIdx * 100;
    const filename = `enter_workspace_frame_${String(frameIdx).padStart(2, '0')}_${elapsedMs}ms.png`;
    const filepath = path.join(artifactDir, filename);
    await page.screenshot({ path: filepath });

    const geoCheck = await page.evaluate(() => {
      const map = window.__map;
      if (!map) return null;
      // Track AIIMS projected coords on screen
      const aiimsScreen = map.project([77.209, 28.567]);
      const center = map.getCenter();
      const zoom = map.getZoom();
      const mapStage = document.getElementById('persistent-map-stage');
      const clipPath = mapStage ? mapStage.style.clipPath : '';
      return {
        aiimsScreen: { x: Math.round(aiimsScreen.x), y: Math.round(aiimsScreen.y) },
        center: { lng: Number(center.lng.toFixed(4)), lat: Number(center.lat.toFixed(4)) },
        zoom: Number(zoom.toFixed(2)),
        clipPath,
      };
    });

    enterFrames.push({ frameIdx, elapsedMs, filename, geoCheck });
    console.log(`Enter Frame ${frameIdx} (${elapsedMs}ms):`, JSON.stringify(geoCheck));
    await delay(100);
  }

  // Wait for complete workspace stabilization
  await delay(500);

  // Check workspace state
  const workspaceState = await page.evaluate(() => {
    const map = window.__map;
    const isInteractive = map && map.dragPan.isEnabled() && map.scrollZoom.isEnabled();
    const hash = window.location.hash;
    const frameEl = document.querySelector('.flighty-clipped-map-frame');
    const header = document.querySelector('.ws-topbar-clean');
    const banner = document.querySelector('.flighty-docked-banner');
    const cards = document.querySelector('.flighty-left-cards-stack');
    return {
      hash,
      isInteractive,
      hasFrame: Boolean(frameEl),
      hasHeader: Boolean(header),
      hasBanner: Boolean(banner),
      hasCards: Boolean(cards),
    };
  });
  console.log('\nStabilized Workspace State:', JSON.stringify(workspaceState));

  // ── 4. exitToStory() Frame Sequence (>= 12 frames, 100ms apart) ──
  console.log('\n--- Capturing exitToStory() Reverse Morph Frame Sequence (12 frames, 100ms apart) ---');
  const exitFrames = [];

  // Click the ← Story button in workspace header
  await page.evaluate(() => {
    const btn = document.querySelector('.ws-back-story-btn');
    if (btn) {
      btn.click();
    } else if (window.__story && typeof window.__story.exitToStory === 'function') {
      window.__story.exitToStory();
    }
  });

  for (let frameIdx = 0; frameIdx < 12; frameIdx++) {
    const elapsedMs = frameIdx * 100;
    const filename = `exit_story_frame_${String(frameIdx).padStart(2, '0')}_${elapsedMs}ms.png`;
    const filepath = path.join(artifactDir, filename);
    await page.screenshot({ path: filepath });

    const state = await page.evaluate(() => {
      const p = window.__storyProgress;
      const scrollY = window.scrollY;
      const bodyOverflow = document.body.style.overflow;
      const mapStage = document.getElementById('persistent-map-stage');
      const clipPath = mapStage ? mapStage.style.clipPath : '';
      return { p, scrollY, bodyOverflow, clipPath };
    });

    exitFrames.push({ frameIdx, elapsedMs, filename, state });
    console.log(`Exit Frame ${frameIdx} (${elapsedMs}ms):`, JSON.stringify(state));
    await delay(100);
  }

  await delay(500);

  // Check Story Restored State at progress 1.0
  const storyRestoredState = await page.evaluate(() => {
    const p = window.__storyProgress;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const bodyOverflow = document.body.style.overflow;
    const domMarkers = document.querySelectorAll('[id^="story-dom-marker-"]');
    const visibleMarkers = Array.from(domMarkers).filter(
      (el) => el.style.display !== 'none' && parseFloat(el.style.opacity || '0') > 0.05
    ).length;
    return {
      progress: p,
      scrollY,
      maxScroll,
      scrollUnlocked: bodyOverflow === '',
      visibleMarkers,
    };
  });
  console.log('\nRestored Story Settle State:', JSON.stringify(storyRestoredState));

  // ── 5. Back Button and Deep Link Verification ──
  console.log('\n--- Testing Deep Link to #/workspace/map ---');
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await page2.goto('http://localhost:5173/#/workspace/map', { waitUntil: 'networkidle2' });
  await delay(2000);

  const deepLinkCheck = await page2.evaluate(() => {
    const storyCanvas = document.getElementById('hero-platelet-canvas-container');
    const wsHeader = document.querySelector('.ws-topbar-clean');
    const map = window.__map;
    const isInteractive = map && map.dragPan.isEnabled() && map.scrollZoom.isEnabled();
    return {
      deepLinkStoryCanvasMounted: Boolean(storyCanvas),
      wsHeaderMounted: Boolean(wsHeader),
      isInteractive,
    };
  });
  const deepLinkFilepath = path.join(artifactDir, 'deeplink_workspace_map.png');
  await page2.screenshot({ path: deepLinkFilepath });
  console.log('Deep link check:', JSON.stringify(deepLinkCheck));
  await page2.close();

  // ── 6. Dev Checks (window.__story.checks()) ──
  console.log('\n--- Running window.__story.checks() ---');
  const checksOutput = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });
  console.log('Checks Output:', JSON.stringify(checksOutput, null, 2));

  // Count "map created" instances in console logs
  const mapCreatedCount = consoleLogs.filter((log) => log.includes('map created')).length;
  console.log(`\nMap created logs count: ${mapCreatedCount}`);

  // Summary JSON output
  const summary = {
    checksOutput,
    mapCreatedCount,
    progressResults,
    enterFramesCount: enterFrames.length,
    exitFramesCount: exitFrames.length,
    workspaceState,
    storyRestoredState,
    deepLinkCheck,
  };

  fs.writeFileSync(
    path.join(artifactDir, 'rescue_morph_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log('\n✅ All captures and verifications complete.');
  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error in runner:', err);
  process.exit(1);
});

