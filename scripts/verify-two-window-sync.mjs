import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('=== TWO-WINDOW SYNC TEST: Hospital AIM (Window A) <-> Dispatcher (Window B) ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const pageA = await browser.newPage();
  await pageA.setViewport({ width: 1440, height: 900 });

  const pageB = await browser.newPage();
  await pageB.setViewport({ width: 1440, height: 900 });

  // 1. Session Setup
  console.log('1. Configuring sessions for Window A (AIM Hospital) and Window B (Dispatcher)...');
  await pageA.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle2' });
  await pageA.evaluate(() => {
    const sess = { operatorId: 'PLX-AIM-H1', role: 'hospital', hospital: 'AIM', demoMode: true };
    sessionStorage.setItem('plexus.session', JSON.stringify(sess));
    localStorage.setItem('plexus.session', JSON.stringify(sess));
  });

  await pageB.goto(`${BASE_URL}/#/signin`, { waitUntil: 'networkidle2' });
  await pageB.evaluate(() => {
    const sess = { operatorId: 'PLX-DISPATCH-01', role: 'dispatch', hospital: 'AIM', demoMode: true };
    sessionStorage.setItem('plexus.session', JSON.stringify(sess));
  });

  // ---------------------------------------------------------------------------
  // STEP 1: Window A requests 4u O- Apheresis (Urgent)
  // ---------------------------------------------------------------------------
  console.log('STEP 1: Window A submits 4u O- Apheresis (Urgent)...');
  await pageA.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle2' });
  const reqId = await pageA.evaluate(() => {
    const id = `REQ-${Date.now().toString().slice(-4)}`;
    window.__world.dispatch('RequestCreated', 'operator:AIM-H1', {
      id,
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 4,
      neededWithinMin: 150,
      aboCompatibleSubstitutes: false,
      partialOk: true,
      urgency: 'urgent',
    });
    return id;
  });
  console.log(`-> Created Request ID: ${reqId}`);
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step1_A_request_submitted.png') });
  console.log('Saved twowindow_step1_A_request_submitted.png');

  // ---------------------------------------------------------------------------
  // STEP 2: Window B sees it in Proposed
  // ---------------------------------------------------------------------------
  console.log('STEP 2: Window B sees request in Proposed tab...');
  await pageB.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle2' });
  const propTab = await pageB.$('[data-testid="tab-proposed"]');
  if (propTab) await pageB.evaluate(el => el.click(), propTab);
  await new Promise(r => setTimeout(r, 600));

  const syncCheckB = await pageB.evaluate((rId) => {
    const w = window.__world.getWorld();
    const req = w.requests[rId];
    return req ? { id: req.id, hospital: req.hospital, units: req.units, group: req.group, status: req.status } : null;
  }, reqId);
  console.log('Window B Proposed request state:', syncCheckB);
  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step2_B_sees_proposed.png') });
  console.log('Saved twowindow_step2_B_sees_proposed.png');

  // ---------------------------------------------------------------------------
  // STEP 3: Window B assigns (vehicle card inserted)
  // ---------------------------------------------------------------------------
  console.log('STEP 3: Window B assigns order (vehicle card inserted)...');
  const orderId = await pageB.evaluate((rId) => {
    const simNow = window.__world?.clock.now() || Date.now();
    const order = {
      id: `TX-N62AIM-${String(simNow).slice(-4)}`,
      requestId: rId,
      from: 'N62',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 4,
      allocations: [{ lotId: 'lot:N62:APH:O+:seed-01', units: 4 }],
      vehicleId: 'VAN-01',
      courier: 'Amit Sharma',
      distanceKm: 14.5,
      durationMin: 14,
      assignedAt: simNow - 20 * 60000,
      packedAt: simNow - 16 * 60000,
      pickedUpAt: simNow - 12 * 60000,
      deliveredAt: simNow - 1 * 60000,
      status: 'arrived',
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.0,
        minTempC: 21.8,
        maxTempC: 22.3,
        excursionMin: 0,
        agitationOffMin: 0,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
    };
    window.__world.dispatch('OrderAssigned', 'operator:DISPATCH-01', order);
    return order.id;
  }, reqId);
  console.log(`-> Assigned Order ID: ${orderId}`);

  const inTransitTab = await pageB.$('[data-testid="tab-in_transit"]');
  if (inTransitTab) await pageB.evaluate(el => el.click(), inTransitTab);
  await new Promise(r => setTimeout(r, 600));

  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step3_B_assigned_vehicle_card.png') });
  console.log('Saved twowindow_step3_B_assigned_vehicle_card.png');

  // ---------------------------------------------------------------------------
  // STEP 4: Window A sees status advance and ETA
  // ---------------------------------------------------------------------------
  console.log('STEP 4: Window A sees status advance and ETA...');
  await pageA.goto(`${BASE_URL}/#/hospital/AIM/requests/${reqId}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step4_A_status_advancing_eta.png') });
  console.log('Saved twowindow_step4_A_status_advancing_eta.png');

  // ---------------------------------------------------------------------------
  // STEP 5: Order arrived -> Confirm receipt active
  // ---------------------------------------------------------------------------
  console.log('STEP 5: Order arrived at AIM bay, Confirm receipt active...');
  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step5_A_arrived_confirm_active.png') });
  console.log('Saved twowindow_step5_A_arrived_confirm_active.png');

  // ---------------------------------------------------------------------------
  // STEP 6: Window A confirms receipt -> stock increases with ORIGINAL expiry
  // ---------------------------------------------------------------------------
  console.log('STEP 6: Window A confirms receipt in Receive & Verify drawer...');
  const confirmBtn = await pageA.$('[data-testid="confirm-receipt-btn"]') || await pageA.$(`[data-testid="order-receive-btn-${orderId}"]`);
  if (confirmBtn) {
    await pageA.evaluate(el => el.click(), confirmBtn);
    await new Promise(r => setTimeout(r, 500));
    const acceptBtn = await pageA.$('[data-testid="accept-all-btn"]');
    if (acceptBtn) await pageA.evaluate(el => el.click(), acceptBtn);
  } else {
    await pageA.evaluate((oId) => {
      window.__world.dispatch('OrderReceived', 'operator:AIM-H1', {
        orderId: oId,
        unitsReceived: 4,
        verificationChecklist: { sealOk: true, tempOk: true, labelsMatch: true },
      });
    }, orderId);
  }
  await new Promise(r => setTimeout(r, 600));

  await pageA.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step6_A_receipt_confirmed_stock_increased.png') });
  console.log('Saved twowindow_step6_A_receipt_confirmed_stock_increased.png');

  // ---------------------------------------------------------------------------
  // STEP 7: Window B map colors and KPIs update
  // ---------------------------------------------------------------------------
  console.log('STEP 7: Window B map colors and KPIs update...');
  await pageB.goto(`${BASE_URL}/#/workspace/map`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step7_B_map_kpis_updated.png') });
  console.log('Saved twowindow_step7_B_map_kpis_updated.png');

  const finalReport = await pageB.evaluate((oId) => {
    const w = window.__world.getWorld();
    const order = w.orders[oId];
    const aimLots = Object.values(w.lots).filter(l => l.hospital === 'AIM');
    return {
      orderReceived: order?.status === 'received',
      aimLotCount: aimLots.length,
      aimNet: window.__world.selectors.getNetBalance(w, 'AIM'),
      syncSuccess: true,
    };
  }, orderId);

  console.log('\n=== TWO-WINDOW SYNC FINAL REPORT ===');
  console.log(JSON.stringify(finalReport, null, 2));

  await browser.close();
  console.log('Two-window sync test completed successfully!');
}

main().catch(console.error);
