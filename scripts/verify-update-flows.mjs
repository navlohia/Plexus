import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('Starting Update Flows Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();

  // Helper to set session
  async function setSessionRole(role, hospital = 'AIM') {
    await page.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle0' });
    await page.evaluate(({ r, h }) => {
      localStorage.setItem('plexus.session', JSON.stringify({
        operatorId: r === 'dispatch' ? 'PLX-DISPATCH-01' : `PLX-${h}-H1`,
        role: r,
        hospital: h,
        demoMode: true,
      }));
    }, { r: role, h: hospital });
  }

  // ---------------------------------------------------------------------------
  // 1. MOBILE SCREENSHOTS (390x844) FOR EACH TAB
  // ---------------------------------------------------------------------------
  console.log('Capturing mobile viewports (390x844) for all 4 update drawer tabs...');
  await setSessionRole('hospital', 'AIM');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // Open Update Stock Drawer
  const openDrawerBtn = await page.$('[data-testid="open-update-stock-btn"]');
  if (openDrawerBtn) await openDrawerBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  // Tab 1: Adjust (Default)
  console.log('Capturing Tab 1: Adjust...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'update_drawer_tab_adjust_390x844.png') });

  // Tab 2: Receive units
  console.log('Capturing Tab 2: Receive units...');
  await page.click('[data-testid="update-tab-receive"]');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'update_drawer_tab_receive_390x844.png') });

  // Tab 3: Daily count
  console.log('Capturing Tab 3: Daily count...');
  await page.click('[data-testid="update-tab-count"]');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'update_drawer_tab_count_390x844.png') });

  // Tab 4: Audit log
  console.log('Capturing Tab 4: Audit log...');
  await page.click('[data-testid="update-tab-audit"]');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'update_drawer_tab_audit_390x844.png') });

  // ---------------------------------------------------------------------------
  // 2. RECORDED SEQUENCE: ADJUST, UNDO, RECEIVE A LOT, SUBMIT A COUNT
  // ---------------------------------------------------------------------------
  console.log('Executing step 2: Recorded update sequence...');

  // Switch back to Desktop 1440x900 for clear audit and multi-window proof
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.click('[data-testid="open-update-stock-btn"]');
  await new Promise((r) => setTimeout(r, 800));

  // Step 2a: Adjust (Decrement -1u O+ with reason 'Issued to patient')
  console.log('Step 2a: Adjusting stock (-1u O+ Issued to patient)...');
  await page.click('[data-testid="update-tab-adjust"]');
  await new Promise((r) => setTimeout(r, 500));
  await page.click('[data-testid="adjust-decrement-btn"]');
  await page.select('[data-testid="adjust-reason-select"]', 'Issued to patient');
  await new Promise((r) => setTimeout(r, 600));

  // Capture before submit with FEFO indicator visible
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sequence_1a_adjust_fefo_preview.png') });

  // Submit adjustment
  await page.click('[data-testid="apply-adjustment-btn"]');
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sequence_1b_adjust_applied_with_undo.png') });

  // Step 2b: Undo the adjustment within 8 seconds
  console.log('Step 2b: Clicking Undo within 8s window...');
  await page.click('[data-testid="apply-undo-btn"]');
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sequence_2_undo_reverted.png') });

  // Step 2c: Receive a lot (+4u O- Apheresis)
  console.log('Step 2c: Receiving a new lot (+4u O-)...');
  await page.click('[data-testid="update-tab-receive"]');
  await new Promise((r) => setTimeout(r, 500));
  await page.click('[data-testid="receive-group-tile-O-"]');
  await new Promise((r) => setTimeout(r, 300));
  // Presets 4u
  const preset4 = (await page.$$('button')).find(async (b) => (await b.evaluate((el) => el.textContent?.trim())) === '4u');
  await page.click('[data-testid="submit-receive-lot-btn"]');
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sequence_3_lot_received.png') });

  // Step 2d: Submit a daily physical count
  console.log('Step 2d: Submitting a daily physical count...');
  await page.click('[data-testid="update-tab-count"]');
  await new Promise((r) => setTimeout(r, 600));
  await page.click('[data-testid="submit-daily-count-btn"]');
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sequence_4_count_submitted.png') });

  // ---------------------------------------------------------------------------
  // 3. SHOW MAP SHEET AND DISPATCH NUMBERS UPDATING IN SECOND WINDOW
  // ---------------------------------------------------------------------------
  console.log('Step 3: Opening second window (Dispatcher Workspace / Map Sheet)...');
  const dispatchPage = await browser.newPage();
  await dispatchPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await dispatchPage.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle0' });
  await dispatchPage.evaluate(() => {
    localStorage.setItem('plexus.session', JSON.stringify({
      operatorId: 'PLX-DISPATCH-01',
      role: 'dispatch',
      demoMode: true,
    }));
  });
  await dispatchPage.goto(`${BASE_URL}/#/workspace/map`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  // Select AIIMS Trauma (AIM) in map to show sheet with updated on-hand units
  await dispatchPage.evaluate(() => {
    // Select AIM node
    const w = window.__world.getWorld();
    window.location.hash = '#/workspace/map?node=AIM';
  });
  await new Promise((r) => setTimeout(r, 1200));
  await dispatchPage.screenshot({ path: path.join(ARTIFACT_DIR, 'sequence_5_dispatch_map_updated.png') });

  // ---------------------------------------------------------------------------
  // 4. CHECKS EVALUATION
  // ---------------------------------------------------------------------------
  console.log('Running story checks...');
  const checks = await page.evaluate(() => window.__story ? window.__story.checks() : null);
  console.log('Story Checks Result:', JSON.stringify(checks, null, 2));

  await browser.close();
  console.log('All update flows verification captures completed successfully!');
}

main().catch(console.error);

