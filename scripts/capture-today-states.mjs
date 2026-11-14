import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

const STATES = ['arrived', 'inbound', 'shortage', 'risk', 'stale', 'steady'];
const RESOLUTIONS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
];

async function main() {
  console.log('--- Capturing Today Ledger States (6 states x 3 resolutions) ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();

  // Run through all combinations
  for (const res of RESOLUTIONS) {
    await page.setViewport({ width: res.width, height: res.height });

    for (const state of STATES) {
      const url = `${BASE_URL}/#/hospital/AIM/today?state=${state}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const filename = `today_ledger_${state}_${res.width}x${res.height}.png`;
      const outPath = path.join(ARTIFACT_DIR, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved: ${filename}`);
    }
  }

  // Evaluate checks on default steady state at 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const checks = await page.evaluate(async () => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return await window.__story.checks();
    }
    return { error: 'window.__story.checks not available' };
  });

  console.log('\n=== window.__story.checks() RESULT ===');
  console.log(JSON.stringify(checks, null, 2));

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

