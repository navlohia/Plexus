import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const DOCS_DIR = 'c:\\Blood Bank\\docs';

if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173/#/workspace/dispatch ...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="dashboard-board"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Capture 1440x900 default (shows geographic map, single line table, bike silhouette)
  console.log('Capturing 1440x900...');
  const shot1440 = path.join(ARTIFACT_DIR, 'dashboard_acceptance_1440x900.png');
  const shot1440Docs = path.join(DOCS_DIR, 'dashboard-reference-1440x900.png');
  await page.screenshot({ path: shot1440, fullPage: true });
  fs.copyFileSync(shot1440, shot1440Docs);

  // 2. Hover over a district polygon (e.g. NOI - Noida) to show dynamic floating pill
  console.log('Hovering Noida district polygon ...');
  const noidaPath = await page.$('#NOI');
  if (noidaPath) {
    await noidaPath.hover();
    await new Promise((r) => setTimeout(r, 400));
  }
  const shotMapHover = path.join(ARTIFACT_DIR, 'dashboard_acceptance_map_hover.png');
  await page.screenshot({ path: shotMapHover, fullPage: true });

  // 3. Hover over a hospital code badge in table (e.g. APL) to show instant tooltip
  console.log('Hovering hospital badge APL in table ...');
  const aplBadges = await page.$$('[data-testid="hospital-badge-APL"]');
  if (aplBadges.length > 1) {
    await aplBadges[1].hover();
  } else if (aplBadges.length > 0) {
    await aplBadges[0].hover();
  }
  await new Promise((r) => setTimeout(r, 400));
  const shotBadgeHover = path.join(ARTIFACT_DIR, 'dashboard_acceptance_badge_hover.png');
  await page.screenshot({ path: shotBadgeHover, fullPage: true });

  // 4. Capture 1920x1080
  console.log('Capturing 1920x1080...');
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));
  const shot1920 = path.join(ARTIFACT_DIR, 'dashboard_acceptance_1920x1080.png');
  const shot1920Docs = path.join(DOCS_DIR, 'dashboard-reference-1920x1080.png');
  await page.screenshot({ path: shot1920, fullPage: true });
  fs.copyFileSync(shot1920, shot1920Docs);

  // 5. Capture 390x844 mobile
  console.log('Capturing 390x844 mobile...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 600));
  const shotMobile = path.join(ARTIFACT_DIR, 'dashboard_acceptance_390x844_mobile.png');
  await page.screenshot({ path: shotMobile, fullPage: true });

  // Reset to 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));

  // 6. Test Exceptions tab
  console.log('Clicking Exceptions tab ...');
  await page.click('[data-testid="tab-exceptions"]');
  await new Promise((r) => setTimeout(r, 500));
  const shotExceptions = path.join(ARTIFACT_DIR, 'dashboard_acceptance_exceptions_tab.png');
  await page.screenshot({ path: shotExceptions, fullPage: true });

  // 7. Run window.__story.checks()
  console.log('Running window.__story.checks() ...');
  const checkResult = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });

  console.log('STORY_CHECKS_RESULT:');
  console.log(JSON.stringify(checkResult, null, 2));

  await browser.close();
}

run().catch((err) => {
  console.error('QA Test error:', err);
  process.exit(1);
});
