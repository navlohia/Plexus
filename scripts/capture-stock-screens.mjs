import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

const TARGETS = [
  { name: 'stock_short_aim', path: '/#/hospital/AIM/stock' },
  { name: 'stock_risk_mdt', path: '/#/hospital/MDT/stock' },
  { name: 'stock_steady_max', path: '/#/hospital/MAX/stock' },
  { name: 'stock_drawer_adjust', path: '/#/hospital/AIM/stock?update=adjust' },
];

const RESOLUTIONS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

async function main() {
  console.log('--- Capturing Stock Screens (Short, Risk, Steady, Drawer & Evidence) ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();

  for (const res of RESOLUTIONS) {
    await page.setViewport({ width: res.width, height: res.height });

    for (const target of TARGETS) {
      const url = `${BASE_URL}${target.path}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const filename = `${target.name}_${res.width}x${res.height}.png`;
      const outPath = path.join(ARTIFACT_DIR, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved: ${filename}`);
    }

    // Capture O vs 0 evidence from #/dev/ui
    await page.goto(`${BASE_URL}/#/dev/ui`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    const evidenceEl = await page.$('[data-testid="o-vs-zero-evidence"]');
    if (evidenceEl) {
      const filename = `font_ovs0_evidence_${res.width}x${res.height}.png`;
      const outPath = path.join(ARTIFACT_DIR, filename);
      await evidenceEl.screenshot({ path: outPath });
      console.log(`Saved element: ${filename}`);
    }
  }

  // Also collect checks()
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
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
  console.log('\nAll stock screenshots and checks completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

