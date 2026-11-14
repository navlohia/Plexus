import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Launching browser via Chrome executable...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();

    // Helper to set session in localStorage
    const setSession = async (session) => {
      await page.evaluate((s) => {
        localStorage.setItem('plexus.session', JSON.stringify(s));
      }, session);
    };

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Empty Form (1440x900 and 390x844)
    // ─────────────────────────────────────────────────────────────
    console.log('1. Capturing Empty Request Sheet...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle2' });
    await setSession({ operatorId: 'PLX-AIM-H1', role: 'hospital', hospital: 'AIM', demoMode: true });

    await page.goto(`${BASE_URL}/#/hospital/AIM/today?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    // Open sheet via "+ Request platelets" header button
    const openBtn = await page.$('[data-testid="header-request-platelets-btn"]');
    if (openBtn) await openBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_empty_form_1440x900.png'),
    });

    // Mobile 390x844 Bottom Sheet
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_empty_form_390x844.png'),
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Filled Form with Live Match Preview (1440x900 and 390x844)
    // ─────────────────────────────────────────────────────────────
    console.log('2. Capturing Filled Request Sheet with Preview & Options...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 300));

    // Select Blood Group O-
    const bGroupBtn = await page.$('[data-testid="blood-group-O-"]');
    if (bGroupBtn) await bGroupBtn.click();

    // Select Units = 2
    const preset2Btn = await page.$('[data-testid="preset-unit-2"]');
    if (preset2Btn) await preset2Btn.click();

    // Select Urgency = Urgent (< 3 h)
    const urgBtn = await page.$('[data-testid="urgency-urgent"]');
    if (urgBtn) await urgBtn.click();

    // Open "More options" disclosure
    const moreBtn = await page.$('[data-testid="more-options-toggle"]');
    if (moreBtn) await moreBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_filled_form_1440x900.png'),
    });

    // Mobile 390x844
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_filled_form_390x844.png'),
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 3: No-Source Case (1440x900 and 390x844)
    // ─────────────────────────────────────────────────────────────
    console.log('3. Capturing No-Source Window Case...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Choose Blood Group AB- (rarest group in NCR with 0 surplus lots in 1h distance)
    const grpAbNeg = await page.$('[data-testid="blood-group-AB-"]');
    if (grpAbNeg) await grpAbNeg.click();

    // Choose Immediate (< 1 h)
    const immBtn = await page.$('[data-testid="urgency-immediate"]');
    if (immBtn) await immBtn.click();

    // Uncheck accept partial to require strict match
    const partialChk = await page.$('[data-testid="opt-partial-ok"]');
    if (partialChk) {
      const isChecked = await (await partialChk.getProperty('checked')).jsonValue();
      if (isChecked) await partialChk.click();
    }
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_nosource_1440x900.png'),
    });

    // Mobile 390x844
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_nosource_390x844.png'),
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Submit & Success (Detail Screen + Toast)
    // ─────────────────────────────────────────────────────────────
    console.log('4. Submitting Request and Capturing Success...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Switch back to O-, 2u, Urgent (< 3 h) which has valid sources
    const grpO = await page.$('[data-testid="blood-group-O-"]');
    if (grpO) await grpO.click();
    const urg3 = await page.$('[data-testid="urgency-urgent"]');
    if (urg3) await urg3.click();
    const p2 = await page.$('[data-testid="preset-unit-2"]');
    if (p2) await p2.click();

    // Re-check partial OK
    const partialAgain = await page.$('[data-testid="opt-partial-ok"]');
    if (partialAgain) {
      const isChecked = await (await partialAgain.getProperty('checked')).jsonValue();
      if (!isChecked) await partialAgain.click();
    }
    await new Promise((r) => setTimeout(r, 400));

    // Submit form
    const submitBtn = await page.$('[data-testid="submit-platelet-request-btn"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    await new Promise((r) => setTimeout(r, 1200));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_success_1440x900.png'),
    });

    // Mobile Success
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'request_success_390x844.png'),
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Requests List Screen (Active and Completed)
    // ─────────────────────────────────────────────────────────────
    console.log('5. Capturing Requests List Screen...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/hospital/AIM/requests?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'requests_list_active_1440x900.png'),
    });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'requests_list_active_390x844.png'),
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Dispatcher Proposed Tab (Two Roles / Two Windows)
    // ─────────────────────────────────────────────────────────────
    console.log('6. Switching to Dispatch Role to verify Proposed Tab with hospital portal badge...');
    await setSession({ operatorId: 'PLX-AIIMS-01', role: 'dispatch', demoMode: true });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/workspace/dashboard?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));

    // Switch to Proposed tab in Dispatcher table
    const proposedTabBtn = await page.$('[data-testid="tab-proposed"]');
    if (proposedTabBtn) {
      await proposedTabBtn.click();
      await new Promise((r) => setTimeout(r, 800));
    }

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'dispatch_proposed_with_hospital_request.png'),
    });

    // ─────────────────────────────────────────────────────────────
    // STEP 7: Run window.__story.checks()
    // ─────────────────────────────────────────────────────────────
    console.log('7. Running window.__story.checks()...');
    const checksResult = await page.evaluate(() => {
      return window.__story ? window.__story.checks() : null;
    });

    console.log('Checks Result Portal:', JSON.stringify(checksResult?.portal, null, 2));
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'request_flow_checks_result.json'),
      JSON.stringify(checksResult, null, 2)
    );

    console.log('All verification and screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Request flow verification failed:', err);
  process.exit(1);
});
