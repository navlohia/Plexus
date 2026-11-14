import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('Starting Section 5 Stress Lab Outbreak & Counterfactual Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();

  async function setSessionRole(role, hospital = 'GTB') {
    await page.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle0' });
    await page.evaluate(
      ({ r, h }) => {
        localStorage.setItem(
          'plexus.session',
          JSON.stringify({
            operatorId: r === 'dispatch' ? 'PLX-DISPATCH-01' : `PLX-${h}-H1`,
            role: r,
            hospital: h,
            demoMode: true,
          })
        );
      },
      { r: role, h: hospital }
    );
  }

  // ---------------------------------------------------------------------------
  // 1. Stress Lab Baseline Controls (1440x900)
  // ---------------------------------------------------------------------------
  console.log('1. Capturing Stress Lab Baseline Controls (1440x900)...');
  await setSessionRole('dispatch', 'AIM');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#/workspace/surge`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stress_lab_baseline_controls_1440x900.png'),
  });

  // ---------------------------------------------------------------------------
  // 2. Start Dengue Outbreak at x30 Speed
  // ---------------------------------------------------------------------------
  console.log('2. Setting speed to x30 and starting Dengue Surge...');
  const speed30Btn = await page.$('[data-testid="sim-speed-30x"]');
  if (speed30Btn) {
    await speed30Btn.click();
    console.log('Clicked 30x speed button');
  }
  await new Promise((r) => setTimeout(r, 500));

  const startBtn = await page.$('[data-testid="start-scenario-btn"]');
  if (startBtn) {
    await startBtn.click();
    console.log('Clicked Start Dengue Surge button');
  }

  // Allow sim time to advance at 30x (4 seconds = 120 sim-minutes)
  console.log('Simulating at 30x for 4 seconds (~2 hours simulation time)...');
  await new Promise((r) => setTimeout(r, 4000));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stress_lab_dengue_started_x30_1440x900.png'),
  });

  // ---------------------------------------------------------------------------
  // 3. Hospital Outbreak Banner (GTB East Delhi & SFD South Delhi)
  // ---------------------------------------------------------------------------
  console.log('3. Capturing Hospital Outbreak Banner at 1440x900 and 390x844...');
  await setSessionRole('hospital', 'GTB');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#/hospital/GTB/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hospital_portal_outbreak_banner_1440x900.png'),
  });

  // Mobile viewport 390x844
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 800));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'hospital_portal_outbreak_banner_390x844.png'),
  });

  // ---------------------------------------------------------------------------
  // 4. Dispatcher Proposed Tab Filling with scn: Requests
  // ---------------------------------------------------------------------------
  console.log('4. Capturing Dispatch Proposed Tab with Outbreak Requests (1440x900)...');
  await setSessionRole('dispatch', 'AIM');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  const proposedTab = await page.$('[data-testid="tab-proposed"]');
  if (proposedTab) {
    await proposedTab.click();
    console.log('Clicked Proposed tab');
  }
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'dispatch_proposed_filling_scn_requests_1440x900.png'),
  });

  // ---------------------------------------------------------------------------
  // 5. Autopilot Assigning Orders & Vehicle Cards
  // ---------------------------------------------------------------------------
  console.log('5. Waiting for autopilot runner to assign requests and capture Active Dispatch...');
  const inTransitTab = await page.$('[data-testid="tab-in_transit"]');
  if (inTransitTab) {
    await inTransitTab.click();
    console.log('Clicked In Transit tab');
  }
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'dispatch_autopilot_assigned_vehicle_cards_1440x900.png'),
  });

  // ---------------------------------------------------------------------------
  // 6. Stress Lab KPIs Diverging (With Plexus vs Without Plexus)
  // ---------------------------------------------------------------------------
  console.log('6. Capturing Diverging Counterfactual Results & Event Feed in Stress Lab...');
  await page.goto(`${BASE_URL}/#/workspace/surge`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'stress_lab_kpis_diverging_with_without_1440x900.png'),
  });

  // ---------------------------------------------------------------------------
  // 7. Extract checks() and Live Counterfactual Numbers
  // ---------------------------------------------------------------------------
  const checksOutput = await page.evaluate(() => {
    if (typeof window.checks === 'function') {
      return window.checks();
    }
    return null;
  });

  const scenarioMetrics = await page.evaluate(() => {
    if (typeof window.__world?.getWorld === 'function') {
      const w = window.__world.getWorld();
      // Counterfactual calculation
      const requests = Object.values(w.requests);
      const orders = Object.values(w.orders);
      return {
        activeScenario: w.activeScenario,
        settings: w.settings,
        requestCount: requests.length,
        orderCount: orders.length,
        sampleRequests: requests.slice(0, 3).map((r) => ({ id: r.id, hosp: r.hospital, units: r.units, status: r.status })),
        sampleOrders: orders.slice(0, 3).map((o) => ({ id: o.id, from: o.from, to: o.to, courier: o.courier, status: o.status })),
      };
    }
    return null;
  });

  console.log('\n--- STORY CHECKS OUTPUT ---');
  console.log(JSON.stringify(checksOutput?.scenario, null, 2));

  console.log('\n--- WORLD SCENARIO TELEMETRY ---');
  console.log(JSON.stringify(scenarioMetrics, null, 2));

  await browser.close();
  console.log('Verification run complete!');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
