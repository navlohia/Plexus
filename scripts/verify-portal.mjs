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

    // -------------------------------------------------------------
    // 1. Sign-In Page with "Sign in as a hospital ▾" dropdown
    // -------------------------------------------------------------
    console.log('1. Capturing Sign-In Page...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_signin_1440x900.png'),
    });

    // -------------------------------------------------------------
    // 2. Hospital AIM (State: Short) at 1440x900 and 390x844
    // -------------------------------------------------------------
    console.log('2. Testing Hospital AIM (Short)...');
    await setSession({ operatorId: 'PLX-AIM-H1', role: 'hospital', hospital: 'AIM', demoMode: true });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/hospital/AIM/today?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_aim_short_1440x900.png'),
    });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_aim_short_390x844.png'),
    });

    // -------------------------------------------------------------
    // 3. Hospital MDT (State: Risk) at 1440x900 and 390x844
    // -------------------------------------------------------------
    console.log('3. Testing Hospital MDT (Risk)...');
    await setSession({ operatorId: 'PLX-MDT-H1', role: 'hospital', hospital: 'MDT', demoMode: true });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/hospital/MDT/today?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_mdt_risk_1440x900.png'),
    });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_mdt_risk_390x844.png'),
    });

    // -------------------------------------------------------------
    // 4. Hospital MAX (State: OK) at 1440x900 and 390x844
    // -------------------------------------------------------------
    console.log('4. Testing Hospital MAX (OK)...');
    await setSession({ operatorId: 'PLX-MAX-H1', role: 'hospital', hospital: 'MAX', demoMode: true });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/hospital/MAX/today?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_max_ok_1440x900.png'),
    });

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'portal_max_ok_390x844.png'),
    });

    // -------------------------------------------------------------
    // 5. Test Hospital User trying to access /workspace (Redirect test)
    // -------------------------------------------------------------
    console.log('5. Testing /workspace redirect guard for hospital user...');
    await setSession({ operatorId: 'PLX-AIM-H1', role: 'hospital', hospital: 'AIM', demoMode: true });
    await page.goto(`${BASE_URL}/#/workspace/map`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    const redirectedUrl = page.url();
    console.log('URL after navigating to /#/workspace/map as hospital user:', redirectedUrl);

    // -------------------------------------------------------------
    // 6. Test Demo Switcher & Notifications Panel
    // -------------------------------------------------------------
    console.log('6. Testing notifications popover and request modal...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/#/hospital/AIM/today?dev=1`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));

    // Open notifications
    const bellBtn = await page.$('[data-testid="portal-notif-bell"]');
    if (bellBtn) {
      await bellBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'portal_notifications_open.png'),
      });
      // Click bell again to close
      await bellBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    // Open Platelet Request Modal
    const reqBtn = await page.$('[data-testid="header-request-platelets-btn"]');
    if (reqBtn) {
      await reqBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'portal_request_modal_open.png'),
      });
      // Close modal
      const closeBtn = await page.$('[aria-label="Close modal"]');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    // -------------------------------------------------------------
    // 7. Extract window.__story.checks()
    // -------------------------------------------------------------
    console.log('7. Evaluating window.__story.checks()...');
    const checks = await page.evaluate(() => {
      const story = window.__story;
      if (story && typeof story.checks === 'function') {
        return story.checks();
      }
      return null;
    });

    console.log('Story Checks Result:', JSON.stringify(checks, null, 2));
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'portal_checks_result.json'),
      JSON.stringify({ checks, redirectedUrl }, null, 2)
    );

    console.log('All verification tasks complete!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
