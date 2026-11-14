import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Starting Hospital Today Screen Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  // Helper to capture 3 viewports for a given URL and situation
  async function captureSituation(situationName, url, setupFn) {
    console.log(`\nCapturing Situation: ${situationName} (${url})...`);

    // 1440x900
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    if (setupFn) await page.evaluate(setupFn);
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `today_${situationName}_1440x900.png`),
    });
    console.log(`Captured today_${situationName}_1440x900.png`);

    // 1920x1080
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `today_${situationName}_1920x1080.png`),
    });
    console.log(`Captured today_${situationName}_1920x1080.png`);

    // 390x844 (Mobile)
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `today_${situationName}_390x844.png`),
    });
    console.log(`Captured today_${situationName}_390x844.png`);
  }

  // 1. Situation: Inbound (AIM - active transfer TX-0412 in transit)
  await captureSituation('inbound', `${BASE_URL}/#/hospital/AIM/today`, () => {
    if (window.__world && window.__world.clock) {
      window.__world.clock.setTime(Date.now());
    }
  });

  // 2. Situation: Arrived (AIM - transfer TX-0412 arrived, awaiting receipt)
  await captureSituation('arrived', `${BASE_URL}/#/hospital/AIM/today`, () => {
    if (window.__world && window.__world.clock) {
      // Advance clock by +25 minutes so TX-0412 deliveredAt is in past
      window.__world.clock.setTime(Date.now() + 25 * 60 * 1000);
    }
  });

  // Reset clock
  await page.evaluate(() => {
    if (window.__world && window.__world.clock) {
      window.__world.clock.setTime(Date.now());
    }
  });

  // 3. Situation: Shortage (ROH - platelet deficit, net < 0, 0 incoming)
  await captureSituation('shortage', `${BASE_URL}/#/hospital/ROH/today`);

  // 4. Situation: Risk (MDT - surplus expiring < 36h)
  await captureSituation('risk', `${BASE_URL}/#/hospital/MDT/today`);

  // 5. Situation: Stale (Hospital with last verified > 24h ago / recount due)
  await captureSituation('stale', `${BASE_URL}/#/hospital/SFD/today?hero=stale`);

  // 6. Situation: Steady (Hospital with all steady buffer)
  await captureSituation('steady', `${BASE_URL}/#/hospital/MAX/today?hero=steady`);

  // Run story checks on Today screen at 1440x900
  console.log('\n--- Evaluating window.__story.checks() ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  const checks = await page.evaluate(() => {
    return window.__story ? window.__story.checks() : null;
  });

  console.log('hospitalUI checks:', JSON.stringify(checks?.hospitalUI, null, 2));
  console.log('data checks:', JSON.stringify(checks?.data, null, 2));

  await browser.close();
  console.log('--- Verification Complete ---');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
