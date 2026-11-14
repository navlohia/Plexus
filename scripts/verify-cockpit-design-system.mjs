import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Starting Cockpit Design System Verification (#/dev/ui) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  // 1. Desktop 1440x900 Full Page Capture
  console.log('Navigating to #/dev/ui at 1440x900...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#/dev/ui`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'cockpit_gallery_1440x900.png'),
    fullPage: true,
  });
  console.log('Captured cockpit_gallery_1440x900.png');

  // 2. Mobile 390x844 Full Page Capture
  console.log('Capturing at 390x844...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#/dev/ui`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'cockpit_gallery_390x844.png'),
    fullPage: true,
  });
  console.log('Captured cockpit_gallery_390x844.png');

  // 3. Interactive States Test at 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/dev/ui`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Test Hero State Switches
  const heroStates = ['arrived', 'shortage', 'risk', 'stale', 'steady', 'inbound'];
  for (const st of heroStates) {
    await page.click(`[data-testid="hero-state-btn-${st}"]`);
    await new Promise((r) => setTimeout(r, 100));
  }

  // Open Sheet Drawer Demo
  console.log('Testing Sheet Drawer open...');
  await page.click('[data-testid="open-sheet-demo-btn"]');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'cockpit_gallery_sheet_open.png'),
  });
  console.log('Captured cockpit_gallery_sheet_open.png');

  // Close Sheet Drawer
  await page.click('[data-testid="close-sheet-btn"]');
  await new Promise((r) => setTimeout(r, 400));

  // Open HospitalMenu Popover
  console.log('Testing HospitalMenu popover...');
  await page.click('[data-testid="hospital-menu-trigger"]');
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'cockpit_gallery_menu_open.png'),
  });
  console.log('Captured cockpit_gallery_menu_open.png');

  // 4. Run Story Checks and evaluate hospitalUI suite
  console.log('\n--- Evaluating window.__story.checks() ---');
  const checks = await page.evaluate(() => {
    return window.__story ? window.__story.checks() : null;
  });

  console.log('hospitalUI checks:', JSON.stringify(checks?.hospitalUI, null, 2));
  console.log('data checks:', JSON.stringify(checks?.data, null, 2));

  // 5. Audit all components present in DOM
  const domAudit = await page.evaluate(() => {
    return {
      hasHero: Boolean(document.querySelector('[data-testid="cockpit-hero"]')),
      hasStatDominant: Boolean(document.querySelector('[data-testid="cockpit-stat-dominant"]')),
      hasStatMini: Boolean(document.querySelector('[data-testid="cockpit-stat-mini"]')),
      hasBoard: Boolean(document.querySelector('[data-testid="cockpit-board"]')),
      hasBoardRow: Boolean(document.querySelector('[data-testid="cockpit-board-row"]')),
      hasTicketCard: Boolean(document.querySelector('[data-testid="cockpit-ticket-card"]')),
      hasStatusChip: Boolean(document.querySelector('[data-testid="cockpit-status-chip"]')),
      hasTimeline: Boolean(document.querySelector('[data-testid="cockpit-timeline"]')),
      hasShelfMargin: Boolean(document.querySelector('[data-testid="cockpit-shelf-margin"]')),
      hasLadderGrid: Boolean(document.querySelector('[data-testid="cockpit-ladder-grid"]')),
      hasFlowBar: Boolean(document.querySelector('[data-testid="cockpit-flow-bar"]')),
      hasEmptyState: Boolean(document.querySelector('[data-testid="cockpit-empty-state"]')),
      hasHospitalMenu: Boolean(document.querySelector('[data-testid="cockpit-hospital-menu"]')),
      hasVehicleArt: Boolean(document.querySelector('[data-testid="cockpit-vehicle-art"]')),
    };
  });
  console.log('\nComponent Kit Audit in Gallery:', JSON.stringify(domAudit, null, 2));

  await browser.close();
  console.log('--- Cockpit Verification Complete ---');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
