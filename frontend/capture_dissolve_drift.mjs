import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

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
  await new Promise((r) => setTimeout(r, 2000));

  // Progress values requested for acceptance
  const targets = [0.29, 0.31, 0.34, 0.37, 0.40, 0.44, 0.50, 0.54];
  const results = {};

  for (const p of targets) {
    console.log(`Setting progress to ${p} ...`);
    const data = await page.evaluate(async (targetP) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(targetP);
      }
      await new Promise((r) => setTimeout(r, 500));

      const heroStats = window.__storyHeroPlatelet ? window.__storyHeroPlatelet.getStats() : null;
      return {
        progress: window.__storyProgress,
        heroStats,
      };
    }, p);

    const filename = `dissolve_progress_${p.toFixed(2).replace('.', '_')}.png`;
    const filepath = path.join(artifactDir, filename);
    await page.screenshot({ path: filepath });
    console.log(`Captured ${filename}:`, JSON.stringify(data));
    results[p] = { filename, data };
  }

  // Scrub-back test: 0.54 -> 0.25 (scrubbing back down), screenshot at 0.28
  console.log('\n--- Executing Scrub-back test: 0.54 -> 0.25 -> 0.28 ---');
  await page.evaluate(async () => {
    // Step-wise scrub back to simulate user reverse wheel/scroll
    const steps = [0.50, 0.45, 0.40, 0.35, 0.30, 0.25, 0.28];
    for (const s of steps) {
      window.__story.setProgress(s);
      await new Promise((r) => setTimeout(r, 60));
    }
    await new Promise((r) => setTimeout(r, 400));
  });

  const scrubData = await page.evaluate(() => {
    const heroStats = window.__storyHeroPlatelet ? window.__storyHeroPlatelet.getStats() : null;
    return {
      progress: window.__storyProgress,
      heroStats,
    };
  });

  const scrubFilename = 'dissolve_scrubback_progress_0_28.png';
  const scrubFilepath = path.join(artifactDir, scrubFilename);
  await page.screenshot({ path: scrubFilepath });
  console.log(`Captured scrub-back ${scrubFilename}:`, JSON.stringify(scrubData));

  // Measure FPS during the dissolve (scroll 0.30 to 0.46)
  console.log('\n--- Measuring FPS during the dissolve (0.30 -> 0.46) ---');
  await page.evaluate(() => {
    window.__story.setProgress(0.30);
  });
  await new Promise((r) => setTimeout(r, 300));

  const perfStats = await page.evaluate(async () => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const frameDeltas = [];
    let last = performance.now();

    return new Promise((resolve) => {
      let cur = 0.30;
      function step() {
        const now = performance.now();
        frameDeltas.push(now - last);
        last = now;

        cur += 0.004; // smooth fine-grain scroll
        if (lenis) {
          lenis.scrollTo(cur * maxScroll, { immediate: true });
        }

        if (cur <= 0.46) {
          requestAnimationFrame(step);
        } else {
          // Compute FPS and percentiles
          const valid = frameDeltas.slice(3); // skip warmup
          const totalTime = valid.reduce((a, b) => a + b, 0);
          const fps = valid.length / (totalTime / 1000);

          valid.sort((a, b) => a - b);
          const p50 = valid[Math.floor(valid.length * 0.50)] || 16.6;
          const p95 = valid[Math.floor(valid.length * 0.95)] || 16.6;
          const max = valid[valid.length - 1] || 16.6;

          resolve({
            frameCount: valid.length,
            fps: Number(fps.toFixed(1)),
            p50Ms: Number(p50.toFixed(2)),
            p95Ms: Number(p95.toFixed(2)),
            maxMs: Number(max.toFixed(2)),
          });
        }
      }
      requestAnimationFrame(step);
    });
  });

  console.log('Dissolve Performance Stats:', JSON.stringify(perfStats, null, 2));

  // Run final window.__story.checks()
  console.log('\n--- Running window.__story.checks() ---');
  const finalChecks = await page.evaluate(async () => {
    // Set to 0.50 so Drift node positions are populated
    window.__story.setProgress(0.50);
    await new Promise((r) => setTimeout(r, 200));
    return window.__story.checks();
  });
  console.log('Checks Result:\n', JSON.stringify(finalChecks, null, 2));

  await browser.close();

  return {
    results,
    scrubData,
    perfStats,
    finalChecks,
    errors,
  };
}

main().catch((err) => {
  console.error('Fatal error in capture script:', err);
  process.exit(1);
});

