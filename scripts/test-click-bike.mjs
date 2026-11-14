import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="dashboard-board"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 600));

  // Click fleet-card-TX-1049
  console.log('Clicking fleet-card-TX-1049 ...');
  await page.click('[data-testid="fleet-card-TX-1049"]');
  await new Promise(r => setTimeout(r, 600));

  const shotPath = path.join(ARTIFACT_DIR, 'dashboard_bike_selected_1440x900.png');
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log('Saved dashboard_bike_selected_1440x900.png');

  await browser.close();
}

main().catch(console.error);

