import puppeteer from 'puppeteer-core';
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
  console.log('Navigating to http://localhost:5173/#/signin ...');
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Pristine Desktop 1440x900
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_1440x900_default.png'), fullPage: true });
  console.log('Saved signin_1440x900_default.png');

  // 2. Autofill Judge Test ID
  console.log('Clicking Judge autofill...');
  await page.click('[data-testid="autofill-test-id-btn"]');
  await new Promise(r => setTimeout(r, 400));

  const emailVal = await page.$eval('[data-testid="test-id-input"]', el => el.value);
  const passVal = await page.$eval('[data-testid="passkey-input"]', el => el.value);
  console.log('Autofilled values:', { emailVal, passVal });

  // Toggle password eye
  const buttons = await page.$$('button[type="button"]');
  for (const b of buttons) {
    const hasEye = await b.$('svg path[d*="M1 12"]');
    if (hasEye) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 300));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_1440x900_autofilled.png'), fullPage: true });
  console.log('Saved signin_1440x900_autofilled.png');

  // 3. Mobile 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_390x844_mobile.png'), fullPage: true });
  console.log('Saved signin_390x844_mobile.png');

  await browser.close();
}

main().catch(console.error);

