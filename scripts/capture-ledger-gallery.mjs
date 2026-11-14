import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Capturing Ledger Gallery at 1440 and 390 widths ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();

  // 1. Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/dev/ui`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000)); // Font rendering

  const checks = await page.evaluate(async () => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return await window.__story.checks();
    }
    return { error: 'window.__story.checks not found' };
  });

  console.log('--- window.__story.checks() output ---');
  console.log(JSON.stringify(checks, null, 2));

  const path1440 = path.join(ARTIFACT_DIR, 'ledger_gallery_1440x900.png');
  await page.screenshot({ path: path1440, fullPage: false });
  console.log(`Saved 1440x900 screenshot to: ${path1440}`);

  // 2. Open Sheet Drawer
  try {
    const btn = await page.$('[data-testid="open-sheet-btn"]');
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
      const pathSheet = path.join(ARTIFACT_DIR, 'ledger_gallery_sheet_open.png');
      await page.screenshot({ path: pathSheet, fullPage: false });
      console.log(`Saved sheet drawer open screenshot to: ${pathSheet}`);
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 400));
    }
  } catch (err) {
    console.error('Error opening sheet drawer:', err);
  }

  // 3. Mobile 390x844
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/#/dev/ui`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const path390 = path.join(ARTIFACT_DIR, 'ledger_gallery_390x844.png');
  await page.screenshot({ path: path390, fullPage: false });
  console.log(`Saved 390x844 screenshot to: ${path390}`);

  await browser.close();
  console.log('Capture complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

