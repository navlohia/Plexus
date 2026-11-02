import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=390,844',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=d3d11',
    ],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });

  const page = await browser.newPage();

  console.log('[Puppeteer Mobile] Navigating to http://localhost:5173/?dev=1#/workspace/map ...');
  await page.goto('http://localhost:5173/?dev=1#/workspace/map', { waitUntil: 'networkidle0' });
  await delay(2500);

  const mobDefaultPath = path.join(artifactDir, 'workspace_mobile_default_390x844.png');
  await page.screenshot({ path: mobDefaultPath });
  console.log(`[Puppeteer Mobile] Saved: ${mobDefaultPath}`);

  console.log('[Puppeteer Mobile] Selecting SFD on mobile...');
  await page.evaluate(() => {
    window.location.hash = '/workspace/map/SFD';
  });
  await delay(1500);

  const mobSfdPath = path.join(artifactDir, 'workspace_mobile_selected_sfd_390x844.png');
  await page.screenshot({ path: mobSfdPath });
  console.log(`[Puppeteer Mobile] Saved: ${mobSfdPath}`);

  await browser.close();
  console.log('[Puppeteer Mobile] Mobile capture complete!');
}

main().catch((err) => {
  console.error('[Puppeteer Mobile Error]', err);
  process.exit(1);
});

