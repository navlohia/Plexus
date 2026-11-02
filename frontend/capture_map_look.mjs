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

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[Browser Error]', msg.text());
    }
  });

  console.log('1. Testing Workspace Route: http://localhost:5173/#/workspace/map ...');
  await page.goto('http://localhost:5173/#/workspace/map', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2500));

  const workspaceLabels = await page.evaluate(() => {
    const map = window.__map;
    if (!map) return { error: 'No map instance' };
    if (window.__countRenderedLabels) {
      return window.__countRenderedLabels();
    }
    return { error: 'No countRenderedLabels helper' };
  });

  console.log('Workspace rendered labels:', JSON.stringify(workspaceLabels, null, 2));

  const workspaceScreenshotPath = path.join(artifactDir, 'map_acceptance_workspace.png');
  await page.screenshot({ path: workspaceScreenshotPath });
  console.log('Saved workspace screenshot:', workspaceScreenshotPath);

  console.log('\n2. Testing Story at p = 0.0 with setHaloOpacity(1) forced on ...');
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const p00Data = await page.evaluate(async () => {
    if (window.__story && typeof window.__story.setProgress === 'function') {
      window.__story.setProgress(0.0);
    }
    if (window.__story && typeof window.__story.setHaloOpacity === 'function') {
      window.__story.setHaloOpacity(1.0);
    }
    await new Promise((r) => setTimeout(r, 600));

    const labels = window.__countRenderedLabels ? window.__countRenderedLabels() : null;
    const veil = document.getElementById('story-paper-veil');
    const veilOpacity = veil ? veil.style.opacity : null;

    return { labels, veilOpacity };
  });
  console.log('p = 0.0 Data:', JSON.stringify(p00Data, null, 2));

  const p00ScreenshotPath = path.join(artifactDir, 'map_acceptance_story_p00_halos.png');
  await page.screenshot({ path: p00ScreenshotPath });
  console.log('Saved p00 screenshot:', p00ScreenshotPath);

  console.log('\n3. Testing Story at p = 0.5 with setHaloOpacity(1) forced on ...');
  const p50Data = await page.evaluate(async () => {
    if (window.__story && typeof window.__story.setProgress === 'function') {
      window.__story.setProgress(0.5);
    }
    if (window.__story && typeof window.__story.setHaloOpacity === 'function') {
      window.__story.setHaloOpacity(1.0);
    }
    await new Promise((r) => setTimeout(r, 600));

    const labels = window.__countRenderedLabels ? window.__countRenderedLabels() : null;
    const veil = document.getElementById('story-paper-veil');
    const veilOpacity = veil ? veil.style.opacity : null;

    return { labels, veilOpacity };
  });
  console.log('p = 0.5 Data:', JSON.stringify(p50Data, null, 2));

  const p50ScreenshotPath = path.join(artifactDir, 'map_acceptance_story_p50_halos.png');
  await page.screenshot({ path: p50ScreenshotPath });
  console.log('Saved p50 screenshot:', p50ScreenshotPath);

  console.log('\n4. Testing Story at p = 0.9 with setHaloOpacity(1) forced on ...');
  const p90Data = await page.evaluate(async () => {
    if (window.__story && typeof window.__story.setProgress === 'function') {
      window.__story.setProgress(0.9);
    }
    if (window.__story && typeof window.__story.setHaloOpacity === 'function') {
      window.__story.setHaloOpacity(1.0);
    }
    await new Promise((r) => setTimeout(r, 1000)); // allow label paint transition duration (800ms)

    const labels = window.__countRenderedLabels ? window.__countRenderedLabels() : null;
    const veil = document.getElementById('story-paper-veil');
    const veilOpacity = veil ? veil.style.opacity : null;

    return { labels, veilOpacity };
  });
  console.log('p = 0.9 Data:', JSON.stringify(p90Data, null, 2));

  const p90ScreenshotPath = path.join(artifactDir, 'map_acceptance_story_p90_halos.png');
  await page.screenshot({ path: p90ScreenshotPath });
  console.log('Saved p90 screenshot:', p90ScreenshotPath);

  // Measure scroll frame performance (0 -> 1 scroll)
  console.log('\n5. Measuring scroll frame intervals (0 -> 1) ...');
  await page.evaluate(() => {
    window.__story.setProgress(0.0);
  });
  await new Promise((r) => setTimeout(r, 500));

  const scrollResult = await page.evaluate(async () => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const start = performance.now();
    const frameDeltas = [];
    let last = start;

    return new Promise((resolve) => {
      let currentProgress = 0;
      function step() {
        const now = performance.now();
        frameDeltas.push(now - last);
        last = now;

        currentProgress += 0.015;
        if (lenis) {
          lenis.scrollTo(currentProgress * maxScroll, { immediate: true });
        }

        if (currentProgress < 1.0) {
          requestAnimationFrame(step);
        } else {
          // Compute p95 and max
          const valid = frameDeltas.slice(5); // skip initial warmup
          valid.sort((a, b) => a - b);
          const p95 = valid[Math.floor(valid.length * 0.95)] || 16.0;
          const max = valid[valid.length - 1] || 16.0;
          const median = valid[Math.floor(valid.length * 0.5)] || 16.0;
          resolve({
            sampleCount: valid.length,
            p95: Number(p95.toFixed(2)),
            max: Number(max.toFixed(2)),
            median: Number(median.toFixed(2)),
            checks: window.__story.checks ? window.__story.checks() : null,
          });
        }
      }
      requestAnimationFrame(step);
    });
  });

  console.log('Scroll performance stats:', JSON.stringify(scrollResult, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

