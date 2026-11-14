import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PROGRESS_POINTS = [0.54, 0.58, 0.62, 0.66, 0.70, 0.75, 0.85, 0.95, 1.00];

async function captureViewport(browser, width, height, label) {
  console.log(`\n======================================================`);
  console.log(`Capturing ${label} (${width}x${height})...`);
  console.log(`======================================================`);

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error ${label}]`, msg.text());
    }
  });

  const url = 'http://localhost:5173/?dev=1#/';
  await page.goto(url, { waitUntil: 'networkidle2' });
  await delay(1500);

  const results = [];

  for (const p of PROGRESS_POINTS) {
    const pStr = p.toFixed(2);
    const filename = `rescue_landing_p${pStr}_${width}x${height}.png`;
    const filepath = path.join(artifactDir, filename);

    await page.evaluate((prog) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(prog);
      }
    }, p);

    await delay(450); // allow Three scene, arcs, and DOM markers to settle

    // Diagnostics at this frame
    const frameDiag = await page.evaluate(() => {
      const markers = Array.from(document.querySelectorAll('.flighty-pin-container'));
      const visibleMarkers = markers.filter((m) => {
        const s = window.getComputedStyle(m);
        return s.display !== 'none' && parseFloat(s.opacity) > 0.05;
      });

      const pills = Array.from(document.querySelectorAll('.flighty-pin-pill'));
      const visiblePills = pills.filter((p) => {
        const s = window.getComputedStyle(p);
        return s.display !== 'none' && parseFloat(s.opacity) > 0.05;
      });

      const colors = visibleMarkers.map((m) => {
        const dot = m.querySelector('.flighty-pin-dot');
        return dot ? window.getComputedStyle(dot).backgroundColor : '';
      });

      return {
        visibleMarkersCount: visibleMarkers.length,
        visiblePillsCount: visiblePills.length,
        colors: Array.from(new Set(colors)),
      };
    });

    await page.screenshot({ path: filepath });
    console.log(`[${label}] Captured p=${pStr} -> ${filename} (markers: ${frameDiag.visibleMarkersCount}, pills: ${frameDiag.visiblePillsCount}, colors: ${JSON.stringify(frameDiag.colors)})`);
    results.push({ p, filename, ...frameDiag });
  }

  let checksResult = null;
  let hospitalTable = [];
  if (label === 'Desktop') {
    checksResult = await page.evaluate(() => {
      if (window.__story && typeof window.__story.checks === 'function') {
        return window.__story.checks();
      }
      return null;
    });

    hospitalTable = await page.evaluate(() => {
      const stats = window.__storyHeroPlatelet?.getStats?.();
      if (!stats || !stats.assignments) return [];
      return stats.assignments.map((a) => ({
        code: a.hospital.code,
        short: a.hospital.short,
        state: a.hospital.status,
        hex: a.hospital.statusColor,
        windowStart: Number(a.windowStart.toFixed(3)),
        windowEnd: Number(a.windowEnd.toFixed(3)),
      }));
    });
  }

  await page.close();
  return { results, checksResult, hospitalTable };
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
  });

  const desktop = await captureViewport(browser, 1440, 900, 'Desktop');

  await browser.close();

  console.log('\n======================================================');
  console.log('25 Hospitals Table (code, state, hex):');
  console.table(desktop.hospitalTable);
  console.log('======================================================');

  console.log('\n======================================================');
  console.log('Checks Output:');
  console.log(JSON.stringify(desktop.checksResult, null, 2));
  console.log('======================================================');

  fs.writeFileSync(
    path.join(artifactDir, 'rescue_landing_v4_summary.json'),
    JSON.stringify({ desktop, checks: desktop.checksResult, hospitalTable: desktop.hospitalTable }, null, 2),
    'utf-8'
  );

  console.log('✅ rescue_landing_v4_summary.json written to artifact directory.');
}

main().catch((err) => {
  console.error('Fatal error in capture_rescue_landing_v4:', err);
  process.exit(1);
});

