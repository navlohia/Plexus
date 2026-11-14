import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

const TABS = ['proposed', 'in_transit', 'delivered', 'exceptions'];
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 390, height: 844, name: '390' },
];

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/#/workspace/dashboard`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    for (const tab of TABS) {
      // Click tab
      const tabSelector = `[data-testid="tab-${tab}"]`;
      const tabEl = await page.$(tabSelector);
      if (tabEl) {
        await tabEl.click();
        await new Promise(r => setTimeout(r, 400));
      }

      const filename = `dispatch_orders_after_${tab}_${vp.name}.png`;
      const outPath = path.join(ARTIFACT_DIR, filename);
      await page.screenshot({ path: outPath });
      console.log(`Saved after: ${filename}`);

      // Also capture card close-up
      const cardEl = await page.$('[data-testid="orders-table-card"]');
      if (cardEl) {
        const cardFilename = `dispatch_card_after_${tab}_${vp.name}.png`;
        const cardOutPath = path.join(ARTIFACT_DIR, cardFilename);
        await cardEl.screenshot({ path: cardOutPath });
        console.log(`Saved card close-up: ${cardFilename}`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log('Finished capturing after screenshots.');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});

