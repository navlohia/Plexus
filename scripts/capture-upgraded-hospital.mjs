import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function capture() {
  console.log('Launching browser to capture upgraded Hospital Portal screens...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  const shot = async (url, vp, filename, delayMs = 1800) => {
    await page.setViewport(vp);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, delayMs));
    const outPath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${filename} (${vp.width}x${vp.height})`);
  };

  // 1. Today Screen (1440x900 & 390x844)
  await shot('/#/hospital/SFD/today', { width: 1440, height: 900 }, 'upgraded_today_1440.png');
  await shot('/#/hospital/SFD/today', { width: 390, height: 844 }, 'upgraded_today_390.png');

  // 2. Requests List Screen (1440x900 & 390x844)
  await shot('/#/hospital/SFD/requests', { width: 1440, height: 900 }, 'upgraded_requests_1440.png');
  await shot('/#/hospital/SFD/requests', { width: 390, height: 844 }, 'upgraded_requests_390.png');

  // 3. Request Detail (Tracking) Screen (1440x900 & 390x844)
  await shot('/#/hospital/SFD/requests/TX-0412', { width: 1440, height: 900 }, 'upgraded_tracking_1440.png', 2500);
  await shot('/#/hospital/SFD/requests/TX-0412', { width: 390, height: 844 }, 'upgraded_tracking_390.png', 2000);

  // 4. Stock Screen (1440x900 & 390x844)
  await shot('/#/hospital/SFD/stock', { width: 1440, height: 900 }, 'upgraded_stock_1440.png');
  await shot('/#/hospital/SFD/stock', { width: 390, height: 844 }, 'upgraded_stock_390.png');

  // 5. Request Platelets Drawer
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/SFD/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  const reqBtn = await page.$('[data-testid="header-request-platelets-btn"]');
  if (reqBtn) {
    await reqBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'upgraded_request_drawer_1440.png') });
    console.log('Saved screenshot: upgraded_request_drawer_1440.png');
  }

  // 6. Run in-browser story checks
  try {
    const checksOutput = await page.evaluate(async () => {
      if (window.__story && typeof window.__story.checks === 'function') {
        return await window.__story.checks();
      }
      return { error: 'window.__story.checks not available' };
    });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'portal_upgrade_checks.json'),
      JSON.stringify(checksOutput, null, 2),
      'utf8'
    );
    console.log('Story checks evaluated and saved to portal_upgrade_checks.json');
  } catch (err) {
    console.error('Error evaluating story checks:', err);
  }

  await browser.close();
  console.log('--- All screenshots and checks complete! ---');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});

