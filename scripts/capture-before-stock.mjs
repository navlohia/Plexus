import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Capturing BEFORE Screenshots for Stock Screen ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();

  async function capture(name, url) {
    // 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `stock_before_${name}_1440x900.png`) });

    // 390x844
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `stock_before_${name}_390x844.png`) });
    console.log(`Captured before: ${name}`);
  }

  await capture('short', `${BASE_URL}/#/hospital/ROH/stock`);
  await capture('risk', `${BASE_URL}/#/hospital/MDT/stock`);
  await capture('steady', `${BASE_URL}/#/hospital/MAX/stock`);
  await capture('drawer', `${BASE_URL}/#/hospital/AIM/stock?update=adjust`);

  await browser.close();
  console.log('--- Finished capturing BEFORE screenshots ---');
}

main().catch(console.error);

