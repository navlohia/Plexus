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

  // 1. Click Proposed tab (Section 3.1)
  console.log('Clicking Proposed tab ...');
  await page.click('[data-testid="tab-proposed"]');
  await new Promise((r) => setTimeout(r, 600));

  const shotProposed = path.join(ARTIFACT_DIR, 'dashboard_option_a_proposed_tab.png');
  await page.screenshot({ path: shotProposed, fullPage: true });
  console.log('Captured Proposed tab:', shotProposed);

  // 2. Click [ Assign → ] on REQ-901 (DISPATCH-SPEC.md Section 1.1 & 1.2)
  console.log('Opening REQ-901 Centered Glassmorphic Dispatch Modal ...');
  await page.waitForSelector('[data-testid="assign-btn-REQ-901"]', { timeout: 5000 });
  await page.click('[data-testid="assign-btn-REQ-901"]');
  await page.waitForSelector('[data-testid="stepper-minus-btn"]', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 600));

  const shotModal = path.join(ARTIFACT_DIR, 'dashboard_dispatch_modal_centered.png');
  const shotDrawer = path.join(ARTIFACT_DIR, 'dashboard_option_a_drawer_expanded.png');
  await page.screenshot({ path: shotModal, fullPage: true });
  fs.copyFileSync(shotModal, shotDrawer);
  console.log('Captured Centered Glassmorphic Dispatch Modal:', shotModal);

  // 3. Test Stepper: step down from 12u to 6u to test Bike Ambulance sync
  console.log('Stepping down units from 12u to 5u to trigger Bike Ambulance auto-switch ...');
  for (let step = 0; step < 7; step++) {
    await page.click('[data-testid="stepper-minus-btn"]');
    await new Promise((r) => setTimeout(r, 80));
  }
  await new Promise((r) => setTimeout(r, 500));

  const shotBikeSync = path.join(ARTIFACT_DIR, 'dashboard_option_a_stepper_bike_sync.png');
  await page.screenshot({ path: shotBikeSync, fullPage: true });
  console.log('Captured Stepper Bike Sync (5u):', shotBikeSync);

  // 4. Step back up to 12u
  console.log('Stepping back up to 12u ...');
  for (let step = 0; step < 7; step++) {
    await page.click('[data-testid="stepper-plus-btn"]');
    await new Promise((r) => setTimeout(r, 80));
  }
  await new Promise((r) => setTimeout(r, 400));

  // 5. Test Confirm & Dispatch CTA button (Spec Section 4.1 Launch Animation)
  console.log('Clicking Confirm & Dispatch button ...');
  await page.click('[data-testid="confirm-dispatch-btn"]');

  // Capture Phase 2 (Revving: Siren strobing, wheel spin, wind-tunnel speed lines, chassis tilt)
  await new Promise((r) => setTimeout(r, 550));
  const shotRevving = path.join(ARTIFACT_DIR, 'dashboard_anim_phase2_revving.png');
  await page.screenshot({ path: shotRevving, fullPage: true });
  console.log('Captured Phase 2 (Revving):', shotRevving);

  // Capture Phase 3 (Launching: High-speed drive-off off left side with particle trail)
  await new Promise((r) => setTimeout(r, 550));
  const shotDriveoff = path.join(ARTIFACT_DIR, 'dashboard_anim_phase3_driveoff.png');
  await page.screenshot({ path: shotDriveoff, fullPage: true });
  console.log('Captured Phase 3 (High-Speed Drive-off):', shotDriveoff);

  // Wait for Phase 4 to complete & settle (New Active Shipment Entry & In-transit tab)
  await new Promise((r) => setTimeout(r, 800));
  const shotAfterConfirm = path.join(ARTIFACT_DIR, 'dashboard_option_a_after_confirm.png');
  await page.screenshot({ path: shotAfterConfirm, fullPage: true });
  console.log('Captured After Confirm (Phase 4 Entry Settled):', shotAfterConfirm);

  // 6. Run checks()
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
