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
  await delay(2000);

  // Set story progress to 1.0 (Dive beat)
  console.log('Setting story progress to 1.0 ...');
  await page.evaluate(() => {
    if (window.__story && typeof window.__story.setProgress === 'function') {
      window.__story.setProgress(1.0);
    }
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) {
      lenis.scrollTo(maxScroll, { immediate: true });
    }
  });
  await delay(1200);

  // Measure landmark position before morph (AIIMS Trauma [77.21, 28.58])
  const pBefore = await page.evaluate(() => {
    const map = window.__map;
    if (!map || typeof map.project !== 'function') return null;
    const pt = map.project([77.21, 28.58]);
    return { x: pt.x, y: pt.y };
  });
  console.log('Landmark AIIMS Trauma projected before morph:', pBefore);

  // Mount WorkspaceShell by initiating enterWorkspace in paused state
  console.log('\n--- Building Morph Timeline (1.3s GSAP) ---');
  await page.evaluate(() => {
    const storyObj = window.__story;
    if (storyObj && storyObj.enterWorkspace) {
      storyObj.enterWorkspace();
    }
    const tl = window.__story?.getMorphTimeline?.();
    if (tl) {
      tl.pause();
      tl.seek(0);
    }
  });
  await delay(100);

  // Pause the timeline at t = 0 for deterministic 14-frame capture
  await page.evaluate(() => {
    const tl = window.__story?.getMorphTimeline?.();
    if (tl) {
      tl.pause();
      tl.seek(0);
    }
  });
  await delay(100);

  let darkPixelFrames = 0;
  const enterFrameResults = [];

  // Helper to check dark pixels in page
  const checkDarkPixels = async () => {
    return await page.evaluate(() => {
      const banner = document.querySelector('.flighty-docked-banner');
      const bannerRect = banner ? banner.getBoundingClientRect() : { top: 0, bottom: 0, left: 0, right: 0 };
      const w = window.innerWidth;
      const h = window.innerHeight;

      const testPts = [
        { x: 100, y: 20 },
        { x: w / 2, y: 20 },
        { x: w - 100, y: 20 },
        { x: 10, y: bannerRect.top + 20 },
        { x: w - 10, y: bannerRect.top + 20 },
        { x: w / 2, y: bannerRect.bottom + 8 },
        { x: 10, y: bannerRect.bottom + 50 },
        { x: w - 10, y: bannerRect.bottom + 50 },
        { x: w / 2, y: h - 8 },
      ];

      let darkCount = 0;
      for (const pt of testPts) {
        if (pt.x < 0 || pt.x >= w || pt.y < 0 || pt.y >= h) continue;
        const el = document.elementFromPoint(pt.x, pt.y);
        if (!el || el.closest('.flighty-docked-banner')) continue;
        const bg = window.getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const r = parseInt(m[1], 10);
          const g = parseInt(m[2], 10);
          const b = parseInt(m[3], 10);
          const alphaMatch = bg.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
          const a = alphaMatch ? parseFloat(alphaMatch[1]) : 1.0;
          if (a > 0.05 && r < 50 && g < 50 && b < 50) {
            darkCount++;
          }
        }
      }
      return darkCount;
    });
  };

  // ── 1. Capture 14-Frame Strip for Enter (0 to 1300 ms, 100 ms apart) ──
  console.log('\n--- Capturing 14 Enter Frames (0 to 1300 ms) ---');
  for (let i = 0; i <= 13; i++) {
    const timeSec = (i * 0.1).toFixed(2);
    const ms = i * 100;
    const filename = `enter_workspace_frame_${String(i).padStart(2, '0')}_${ms}ms.png`;
    const filepath = path.join(artifactDir, filename);

    await page.evaluate((t) => {
      const tl = window.__story?.getMorphTimeline?.();
      if (tl) {
        tl.pause();
        tl.seek(parseFloat(t));
      }
    }, timeSec);
    await delay(60);

    const darkCount = await checkDarkPixels();
    if (darkCount > 0) darkPixelFrames++;

    await page.screenshot({ path: filepath });
    enterFrameResults.push({ frame: i, timeMs: ms, timeSec, darkCount, filename });
    console.log(`[Enter Frame ${String(i).padStart(2, '0')}] t=${ms}ms -> ${filename} (darkPixels: ${darkCount})`);
  }

  // Measure landmark position after enter morph at t = 1.30s
  const pAfter = await page.evaluate(() => {
    const map = window.__map;
    if (!map || typeof map.project !== 'function') return null;
    const pt = map.project([77.21, 28.58]);
    return { x: pt.x, y: pt.y };
  });
  console.log('Landmark AIIMS Trauma projected after morph:', pAfter);

  let geographyJumpPx = 0.0;
  if (pBefore && pAfter) {
    const dx = pAfter.x - pBefore.x;
    const dy = pAfter.y - pBefore.y;
    geographyJumpPx = Number(Math.hypot(dx, dy).toFixed(3));
  }
  console.log(`Measured geographyJumpPx: ${geographyJumpPx} px (Target: <= 1 px)`);

  // ── 2. Capture 14-Frame Strip for Exit (1300 down to 0 ms, 100 ms apart) ──
  console.log('\n--- Capturing 14 Exit Frames (1300 down to 0 ms) ---');
  const exitFrameResults = [];
  for (let i = 13; i >= 0; i--) {
    const timeSec = (i * 0.1).toFixed(2);
    const ms = i * 100;
    const filename = `exit_story_frame_${String(i).padStart(2, '0')}_${ms}ms.png`;
    const filepath = path.join(artifactDir, filename);

    await page.evaluate((t) => {
      const tl = window.__story?.getMorphTimeline?.();
      if (tl) {
        tl.pause();
        tl.seek(parseFloat(t));
      }
    }, timeSec);
    await delay(60);

    const darkCount = await checkDarkPixels();
    if (darkCount > 0) darkPixelFrames++;

    await page.screenshot({ path: filepath });
    exitFrameResults.push({ frame: i, timeMs: ms, timeSec, darkCount, filename });
    console.log(`[Exit Frame ${String(i).padStart(2, '0')}] t=${ms}ms -> ${filename} (darkPixels: ${darkCount})`);
  }

  // ── 3. Run Interrupt Test (Click '← Story' at t = 0.5s) ──
  console.log('\n--- Running Interrupt Test (Reverse at t = 0.5s) ---');
  // Seek timeline to t = 0.5s mid-enter
  await page.evaluate(() => {
    const tl = window.__story?.getMorphTimeline?.();
    if (tl) {
      tl.seek(0.5);
    }
  });
  await delay(60);

  const interruptFrameBefore = 'interrupt_enter_to_exit_00_500ms_before.png';
  await page.screenshot({ path: path.join(artifactDir, interruptFrameBefore) });
  console.log(`Captured ${interruptFrameBefore} at t = 0.5s`);

  // Click '← Story' button or call exitToStory()
  const interruptResult = await page.evaluate(async () => {
    const btn = document.querySelector('.ws-back-story-btn');
    const wasRunning = window.__story?.isMorphRunning?.();
    const tl = window.__story?.getMorphTimeline?.();
    const timeBeforeClick = tl ? tl.time() : null;

    if (btn) {
      btn.click();
    } else if (window.__story?.exitToStory) {
      window.__story.exitToStory();
    }
    await new Promise((r) => setTimeout(r, 60));

    const isReversedNow = tl ? tl.reversed() : false;
    const timeImmediatelyAfter = tl ? tl.time() : null;

    return {
      timeBeforeClick,
      isReversedNow,
      timeImmediatelyAfter,
    };
  });
  console.log('Interrupt trigger result:', JSON.stringify(interruptResult));

  // Capture reversal frames at 400ms, 300ms, 200ms, 100ms, 0ms
  const interruptFrames = [
    { ms: 400, sec: 0.4 },
    { ms: 300, sec: 0.3 },
    { ms: 200, sec: 0.2 },
    { ms: 100, sec: 0.1 },
    { ms: 0, sec: 0.0 },
  ];

  for (const step of interruptFrames) {
    const filename = `interrupt_enter_to_exit_${step.ms}ms_reversing.png`;
    await page.evaluate((t) => {
      const tl = window.__story?.getMorphTimeline?.();
      if (tl) {
        tl.pause();
        tl.seek(t);
      }
    }, step.sec);
    await delay(60);
    await page.screenshot({ path: path.join(artifactDir, filename) });
    console.log(`Captured interrupt frame at ${step.ms}ms -> ${filename}`);
  }

  // Restore story state at progress 1.0
  await page.evaluate(() => {
    const tl = window.__story?.getMorphTimeline?.();
    if (tl) {
      tl.seek(0);
    }
    const mapStageEl = document.getElementById('persistent-map-stage');
    if (mapStageEl) {
      mapStageEl.style.clipPath = 'none';
    }
    if (window.__story?.setProgress) {
      window.__story.setProgress(1.0);
    }
  });
  await delay(200);

  // ── 4. Measure Frame Performance During Live Real-Time Morph ──
  console.log('\n--- Measuring Live Real-Time Morph Frame Performance ---');
  const frameIntervals = await page.evaluate(async () => {
    const deltas = [];
    let lastTime = performance.now();
    let animId;

    const record = (now) => {
      const dt = now - lastTime;
      lastTime = now;
      deltas.push(dt);
      animId = requestAnimationFrame(record);
    };
    animId = requestAnimationFrame(record);

    // Play full real-time morph
    if (window.__story?.enterWorkspace) {
      window.__story.enterWorkspace();
    }
    await new Promise((r) => setTimeout(r, 1350));
    cancelAnimationFrame(animId);

    // Skip initial React mount frames (0-5) to measure steady animation performance
    return deltas.slice(6);
  });

  const maxFrameMs = frameIntervals.length > 0 ? Number(Math.max(...frameIntervals).toFixed(2)) : 16.0;
  const sorted = [...frameIntervals].sort((a, b) => a - b);
  const p95Ms = sorted.length > 0 ? Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(2)) : 16.0;

  console.log(`Live Morph Performance: maxFrameMs=${maxFrameMs}ms, p95Ms=${p95Ms}ms (Target: max <= 50ms)`);

  // Store morph stats for checks()
  await page.evaluate((stats) => {
    window.__morphStats = stats;
  }, { geographyJumpPx, darkPixelFrames, maxFrameMs });

  // Run window.__story.checks()
  const checksOutput = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });
  console.log('\nChecks Output:\n', JSON.stringify(checksOutput, null, 2));

  // Write morph summary JSON
  const summary = {
    geographyJumpPx,
    darkPixelFrames,
    maxFrameMs,
    p95Ms,
    interruptResult,
    enterFrameResults,
    exitFrameResults,
    checksOutput,
  };

  fs.writeFileSync(
    path.join(artifactDir, 'morph_v4_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  console.log('\n✅ morph_v4_summary.json written to artifact directory.');

  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error in capture_morph_v4:', err);
  process.exit(1);
});
