import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const PROGRESS_POINTS = [0.00, 0.12, 0.20, 0.28, 0.33, 0.37, 0.44, 0.54];

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
    const filename = `hero_cloud_p${pStr}_${width}x${height}.png`;
    const filepath = path.join(artifactDir, filename);

    await page.evaluate((prog) => {
      if (window.__story && typeof window.__story.setProgress === 'function') {
        window.__story.setProgress(prog);
      }
    }, p);

    await delay(350); // allow Three scene and map to settle

    await page.screenshot({ path: filepath });
    console.log(`[${label}] Captured p=${pStr} -> ${filename}`);
    results.push({ p, filename });
  }

  let checksResult = null;
  if (label === 'Desktop') {
    checksResult = await page.evaluate(() => {
      if (window.__story && typeof window.__story.checks === 'function') {
        return window.__story.checks();
      }
      return null;
    });
  }

  await page.close();
  return { results, checksResult };
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
  const mobile = await captureViewport(browser, 390, 844, 'Mobile');

  await browser.close();

  console.log('\n======================================================');
  console.log('Checks Output:');
  console.log(JSON.stringify(desktop.checksResult, null, 2));
  console.log('======================================================');

  fs.writeFileSync(
    path.join(artifactDir, 'hero_cloud_v4_summary.json'),
    JSON.stringify({ desktop, mobile, checks: desktop.checksResult }, null, 2),
    'utf-8'
  );

  console.log('✅ hero_cloud_v4_summary.json written to artifact directory.');
}

main().catch((err) => {
  console.error('Fatal error in capture_hero_cloud_v4:', err);
  process.exit(1);
});

