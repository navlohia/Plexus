import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Capturing BEFORE Screenshots for Today Screen ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  // Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'today_before_1440x900.png') });
  console.log('Captured today_before_1440x900.png');

  // Desktop 1920x1080
  await page.setViewport({ width: 1920, height: 1080 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'today_before_1920x1080.png') });
  console.log('Captured today_before_1920x1080.png');

  // Mobile 390x844
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'today_before_390x844.png') });
  console.log('Captured today_before_390x844.png');

  await browser.close();
  console.log('--- BEFORE Screenshots Captured Successfully ---');
}

main().catch(console.error);
