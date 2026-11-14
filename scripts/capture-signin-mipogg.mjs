import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  console.log('Navigating to http://localhost:5173/#/signin ...');
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' });

  // Wait for 1.8 seconds for entrance animation and clustering
  await new Promise((r) => setTimeout(r, 1800));

  // Desktop Screenshot
  const desktopPath = path.join(ARTIFACT_DIR, 'signin_mipogg_1440x900.png');
  await page.screenshot({ path: desktopPath });
  await page.screenshot({ path: 'signin_mipogg_1440x900_local.png' });
  console.log('Saved signin_mipogg_1440x900.png');

  // Capture motion frames 300ms apart
  for (let i = 1; i <= 3; i++) {
    await new Promise((r) => setTimeout(r, 350));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `signin_mipogg_motion_${i}.png`) });
    console.log(`Saved signin_mipogg_motion_${i}.png`);
  }

  // Mobile Screenshot
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1800));

  const mobilePath = path.join(ARTIFACT_DIR, 'signin_mipogg_390x844.png');
  await page.screenshot({ path: mobilePath });
  await page.screenshot({ path: 'signin_mipogg_390x844_local.png' });
  console.log('Saved signin_mipogg_390x844.png');

  await browser.close();
  console.log('Done capturing!');
}

main().catch(console.error);

