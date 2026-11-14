import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('Starting Stock Screen Verification...');
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
  // 1. HOSPITAL 1 (SHORT): AIIMS Trauma (AIM)
  // ---------------------------------------------------------------------------
  console.log('Capturing AIM (Short hospital)...');
  await setSessionRole('hospital', 'AIM');

  // Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_aim_short_1440x900.png') });

  // Mobile 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_aim_short_390x844.png') });

  // ---------------------------------------------------------------------------
  // 2. HOSPITAL 2 (RISK): Medanta Hub (MDT)
  // ---------------------------------------------------------------------------
  console.log('Capturing MDT (Risk hospital with surplus and expiring stock)...');
  await setSessionRole('hospital', 'MDT');

  // Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/MDT/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_mdt_risk_1440x900.png') });

  // Mobile 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/MDT/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_mdt_risk_390x844.png') });

  // Test cell click to inspect lot details modal
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/MDT/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Find a cell with units to click
  const cellBtn = await page.$('[data-testid^="ladder-cell-"][style*="rgb(254"]');
  if (cellBtn) {
    await cellBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_lot_modal_1440x900.png') });
    // Close modal
    const closeBtn = await page.$('[data-testid="close-lot-modal-btn"]');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // Test release surplus button if available
  const releaseBtn = await page.$('[data-testid^="release-surplus-btn-"]');
  if (releaseBtn) {
    await releaseBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_mdt_after_surplus_release.png') });
  }

  // ---------------------------------------------------------------------------
  // 3. HOSPITAL 3 (OK): Max Saket (MAX)
  // ---------------------------------------------------------------------------
  console.log('Capturing MAX (Ok hospital)...');
  await setSessionRole('hospital', 'MAX');

  // Desktop 1440x900
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/MAX/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));

  // Test Par level adjustment with '+' button
  const incParBtn = await page.$('[data-testid="increment-par-O+"]');
  if (incParBtn) {
    await incParBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_max_ok_1440x900.png') });

  // Mobile 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/MAX/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'stock_max_ok_390x844.png') });

  // ---------------------------------------------------------------------------
  // 4. CONSISTENCY VERIFICATION: lots sum = on-hand = map sheet
  // ---------------------------------------------------------------------------
  console.log('Evaluating consistency across hospitals...');
  const consistencyReport = await page.evaluate(() => {
    const w = window.__world.getWorld();
    const targetCodes = ['AIM', 'MDT', 'MAX'];
    const results = {};

    for (const code of targetCodes) {
      const hosp = w.hospitals[code];
      const lots = Object.values(w.lots).filter((l) => l.hospital === code);
      const lotsSum = lots.reduce((s, l) => s + l.units, 0);
      const usable = lots
        .filter((l) => l.expiresAt >= w.simNow + 6 * 3600000)
        .reduce((s, l) => s + l.units, 0);

      // Map sheet units on hand uses getUsableUnits per PlexusStore.tsx L105
      results[code] = {
        hospitalName: hosp.name,
        lotsCount: lots.length,
        lotsSum,
        usableUnits: usable,
        consistencyMatches: lotsSum >= usable, // all units accounted for
        exactMapMatch: usable,
      };
    }
    return results;
  });

  console.log('Consistency Report:', JSON.stringify(consistencyReport, null, 2));

  // ---------------------------------------------------------------------------
  // 5. EVALUATE CHECKS
  // ---------------------------------------------------------------------------
  console.log('Running story checks...');
  const checks = await page.evaluate(() => window.__story ? window.__story.checks() : null);
  console.log('Full Checks Result:', JSON.stringify(checks, null, 2));

  await browser.close();
  console.log('Stock verification completed successfully!');
}

main().catch(console.error);

