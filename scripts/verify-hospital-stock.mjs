import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Verifying Hospital Stock Screen Redesign ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();

  // 1. Check window.__story.checks()
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const checks = await page.evaluate(() => {
    if (window.__story && window.__story.checks) {
      return window.__story.checks();
    }
    return null;
  });

  console.log('--- window.__story.checks() output ---');
  console.log(JSON.stringify(checks, null, 2));

  // 2. Capture AFTER screenshots
  async function capture(name, url) {
    // 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `stock_after_${name}_1440x900.png`) });

    // 390x844
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `stock_after_${name}_390x844.png`) });
    console.log(`Captured after: ${name}`);
  }

  await capture('short', `${BASE_URL}/#/hospital/ROH/stock`);
  await capture('risk', `${BASE_URL}/#/hospital/MDT/stock`);
  await capture('steady', `${BASE_URL}/#/hospital/MAX/stock`);
  await capture('drawer', `${BASE_URL}/#/hospital/AIM/stock?update=adjust`);

  // 3. Capture Par Editor Popover
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const parBtn = await page.$('[data-testid="par-level-editor-O-"]');
  if (parBtn) {
    await parBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_after_par_popover_1440x900.png') });
    console.log('Captured par popover screenshot');
  }

  // 4. Capture Lot Details Modal
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  // Find a cell with units
  const cellWithUnits = await page.$('button[data-testid^="ladder-cell-"][aria-label*="units"]');
  if (cellWithUnits) {
    await cellWithUnits.click();
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_after_lot_modal_1440x900.png') });
    console.log('Captured lot modal screenshot');
  }

  await browser.close();
  console.log('--- Verification complete ---');
}

main().catch(console.error);

