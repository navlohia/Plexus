import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('--- Launching Puppeteer ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  // Clear localStorage once at the beginning
  await page.goto('http://localhost:5173/#/workspace/map', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await sleep(500);
  await sleep(2000);

  // Read world state
  const worldSummary = await page.evaluate(() => {
    const w = window.__world;
    if (!w) return null;
    const world = w.getWorld ? w.getWorld() : w;
    return {
      hospitalsCount: Object.keys(world.hospitals).length,
      lotsCount: Object.keys(world.lots).length,
      ordersCount: Object.keys(world.orders).length,
      requestsCount: Object.keys(world.requests).length,
      simNow: world.simNow,
    };
  });
  console.log('World Summary from Map page:', worldSummary);

  // Pick 3 hospitals: AIM, GTB, MDT
  const targetHospitalCodes = ['AIM', 'GTB', 'MDT'];
  const mapHospitalData = {};

  for (const code of targetHospitalCodes) {
    console.log(`Selecting hospital ${code} on map...`);
    const data = await page.evaluate((c) => {
      const w = window.__world;
      const world = w.getWorld ? w.getWorld() : w;
      const selectors = w.selectors;
      const hosp = world.hospitals[c];
      const usable = selectors.getUsableUnits(world, c);
      const exp36 = selectors.getExpiring36Units(world, c);
      const demand36 = selectors.getDemand36(world, c);
      const incoming = selectors.getIncomingUnits(world, c);
      const net = selectors.getNetBalance(world, c);
      const state = selectors.getHospitalState(world, c);

      // Select in UI
      const storyStore = window.__storyStore;
      if (storyStore && hosp) {
        storyStore.getState().setSelectedHospital(hosp.id);
      }
      return {
        code: c,
        id: hosp?.id,
        name: hosp?.name,
        fullName: hosp?.fullName,
        stock: usable,
        exp36,
        demand36,
        incoming,
        netBalance: net,
        state
      };
    }, code);

    await sleep(1000);
    mapHospitalData[code] = data;

    console.log(`Map Sheet for ${code}:`, data);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `acceptance_map_sheet_${code}.png`)
    });
  }

  // 2. Visit Dispatch Dashboard
  console.log('Navigating to Dispatch Dashboard...');
  await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
  await sleep(2000);

  // Verify same numbers for 3 hospitals in Dispatch
  const dispatchHospitalData = await page.evaluate((codes) => {
    const w = window.__world;
    const world = w.getWorld ? w.getWorld() : w;
    const selectors = w.selectors;
    const res = {};
    for (const c of codes) {
      const hosp = world.hospitals[c];
      res[c] = {
        code: c,
        id: hosp?.id,
        name: hosp?.name,
        fullName: hosp?.fullName,
        stock: selectors.getUsableUnits(world, c),
        exp36: selectors.getExpiring36Units(world, c),
        demand36: selectors.getDemand36(world, c),
        incoming: selectors.getIncomingUnits(world, c),
        netBalance: selectors.getNetBalance(world, c),
        state: selectors.getHospitalState(world, c)
      };
    }
    return res;
  }, targetHospitalCodes);

  console.log('Dispatch Hospital Data comparison:');
  for (const c of targetHospitalCodes) {
    const mapD = mapHospitalData[c];
    const dispD = dispatchHospitalData[c];
    const match =
      mapD.stock === dispD.stock &&
      mapD.exp36 === dispD.exp36 &&
      mapD.netBalance === dispD.netBalance;
    console.log(`  ${c}: Map[stock=${mapD.stock}, exp36=${mapD.exp36}, net=${mapD.netBalance}] vs Disp[stock=${dispD.stock}, exp36=${dispD.exp36}, net=${dispD.netBalance}] => MATCH: ${match}`);
  }

  // 3. Inspect 3 Orders on Dispatch Dashboard
  const sampleOrders = await page.evaluate(() => {
    const w = window.__world;
    const world = w.getWorld ? w.getWorld() : w;
    const orders = Object.values(world.orders);
    return orders.slice(0, 3).map((o) => ({
      id: o.id,
      from: o.from,
      to: o.to,
      units: o.units,
      product: o.product,
      distanceKm: o.distanceKm,
      durationMin: o.durationMin,
      courier: o.courier,
      vehicleId: o.vehicleId,
      status: o.status,
      alert: o.alert,
      delayed: o.delayed
    }));
  });
  console.log('3 Sample Orders:', sampleOrders);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'acceptance_dispatch_overview.png')
  });

  // 4. Proposed Tab: Check columns, Kind badges, and Assign logic
  console.log('Switching to Proposed tab...');
  await page.waitForSelector('[data-testid="tab-proposed"]', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="tab-proposed"]');
    if (el) el.scrollIntoView();
  });
  await sleep(500);
  await page.click('[data-testid="tab-proposed"]');
  await sleep(1000);

  // Check columns & rows
  const proposedRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-testid^="request-row-"]'));
    return rows.map((r) => r.textContent?.trim().replace(/\s+/g, ' '));
  });
  console.log('Proposed Rows:', proposedRows);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'acceptance_proposed_before_assign.png')
  });

  // 5. Click Assign button on first proposed item
  console.log('Clicking Assign button on first proposed item...');
  const beforeInTransitText = await page.evaluate(() => {
    const tab = document.querySelector('[data-testid="tab-in_transit"]');
    return tab ? tab.textContent?.trim() : 'unknown';
  });
  console.log('Before Assign Tab:', beforeInTransitText);

  // Click the first Assign button using real mouse click
  await page.waitForSelector('[data-testid^="assign-btn-"]', { timeout: 10000 });
  await page.click('[data-testid^="assign-btn-"]');
  await sleep(800);

  // Take screenshot of opened Assign modal
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'acceptance_assign_modal_open.png')
  });

  // Click Confirm Dispatch button inside modal
  console.log('Clicking Confirm & Dispatch button in modal...');
  await page.waitForSelector('[data-testid="confirm-dispatch-btn"]', { timeout: 10000 });
  await page.click('[data-testid="confirm-dispatch-btn"]');

  // Wait for drive-off launch animation and sideways queue insertion
  console.log('Waiting for drive-off animation & sideways queue card insertion...');
  await sleep(2500);

  const afterInTransitText = await page.evaluate(() => {
    const tab = document.querySelector('[data-testid="tab-in_transit"]');
    return tab ? tab.textContent?.trim() : 'unknown';
  });
  console.log('After Assign In-transit Tab:', afterInTransitText);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'acceptance_after_assign_in_transit.png')
  });

  // 6. Test "+6h Solver Rebalance" button
  console.log('Testing +6h Solver Rebalance button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rebalanceBtn = btns.find((b) => b.textContent?.includes('Solver Rebalance'));
    if (rebalanceBtn) rebalanceBtn.click();
  });
  await sleep(1000);

  // 7. Reload page: assert numbers stay stable
  console.log('Reloading page to test persistence and stability...');
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(2000);

  const reloadedInTransitText = await page.evaluate(() => {
    const tab = document.querySelector('[data-testid="tab-in_transit"]');
    return tab ? tab.textContent?.trim() : 'unknown';
  });
  console.log('After Reload In-transit Tab:', reloadedInTransitText);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'acceptance_after_reload_stable.png')
  });

  // 8. Run window.checks()
  console.log('Running window.checks()...');
  const checksOutput = await page.evaluate(() => {
    if (typeof window.checks === 'function') {
      return window.checks();
    }
    return { error: 'window.checks is not a function' };
  });

  console.log('--- CHECKS OUTPUT ---');
  console.log(JSON.stringify(checksOutput, null, 2));

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'acceptance_checks_result.json'),
    JSON.stringify(checksOutput, null, 2)
  );

  await browser.close();
  console.log('--- Verification Complete ---');
}

run().catch((err) => {
  console.error('Error during verification:', err);
  process.exit(1);
});
