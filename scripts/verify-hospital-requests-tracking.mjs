import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Starting Hospital Requests & Tracking Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  async function capture(name, url, options = {}) {
    console.log(`\nCapturing: ${name} -> ${url}`);

    // Desktop: 1440x900
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    if (options.action) await page.evaluate(options.action);
    await new Promise((r) => setTimeout(r, 600));
    const path1440 = path.join(ARTIFACT_DIR, `${name}_1440x900.png`);
    await page.screenshot({ path: path1440 });
    console.log(`  Saved: ${path1440}`);

    // Mobile: 390x844
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    if (options.action) await page.evaluate(options.action);
    await new Promise((r) => setTimeout(r, 600));
    const path390 = path.join(ARTIFACT_DIR, `${name}_390x844.png`);
    await page.screenshot({ path: path390 });
    console.log(`  Saved: ${path390}`);
  }

  // 1. on_the_way (Tracking active in-transit order)
  await capture('tracking_on_the_way', `${BASE_URL}/#/hospital/AIM/requests/REQ-0901?state=on_the_way`);

  // 2. delayed_with_reason (Tracking with delay note + reason)
  await capture('tracking_delayed_with_reason', `${BASE_URL}/#/hospital/AIM/requests/REQ-0901?state=delayed`);

  // 3. cold_chain_alert (Tracking with cold-chain excursion banner)
  await capture('tracking_cold_chain_alert', `${BASE_URL}/#/hospital/AIM/requests/REQ-0901?state=cold_chain`);

  // 4. arrived (Tracking with arrived state + confirm receipt button)
  await capture('tracking_arrived', `${BASE_URL}/#/hospital/AIM/requests/REQ-0901?state=arrived`);
  // Also capture mobile scrolled down to confirm receipt button
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-0901?state=arrived`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.scrollBy(0, 600));
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'tracking_arrived_390x844_btn.png') });
  console.log('  Saved: tracking_arrived_390x844_btn.png');

  // 5. completed (Requests screen with completed tab grouped by day & outcomes)
  await capture('requests_completed', `${BASE_URL}/#/hospital/AIM/requests`, {
    action: () => {
      const btn = document.querySelector('[data-testid="tab-completed-requests"]');
      if (btn) btn.click();
    },
  });

  // 6. empty_first_time (Requests screen ?empty=first_time)
  await capture('requests_empty_first_time', `${BASE_URL}/#/hospital/AIM/requests?empty=first_time`);

  // 7. empty_no_results (Requests screen ?empty=no_results)
  await capture('requests_empty_no_results', `${BASE_URL}/#/hospital/AIM/requests?empty=no_results`);

  // 8. empty_all_caught_up (Requests screen ?empty=all_caught_up)
  await capture('requests_empty_all_caught_up', `${BASE_URL}/#/hospital/AIM/requests?empty=all_caught_up`);

  // 9. request_sheet (Request sheet modal open with 48px steppers, 8 group tiles, Best option card)
  await capture('request_sheet_modal', `${BASE_URL}/#/hospital/AIM/requests`, {
    action: () => {
      const btn = document.querySelector('[data-testid="header-request-platelets-btn"]');
      if (btn) btn.click();
    },
  });

  // Run story checks on the page
  console.log('\n--- Running window.__story.checks() ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const checksResult = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });

  console.log('window.__story.checks() hospitalUI output:');
  console.log(JSON.stringify(checksResult?.hospitalUI, null, 2));

  await browser.close();
  console.log('--- All verifications completed successfully ---');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
