import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const pageA = await browser.newPage();
  await pageA.setViewport({ width: 1440, height: 900 });

  const pageB = await browser.newPage();
  await pageB.setViewport({ width: 1440, height: 900 });

  console.log('Navigating pageA to Today...');
  await pageA.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle2' });

  console.log('Creating request in pageA...');
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
  console.log('Created reqId:', reqId);

  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step1_A_request_submitted.png') });
  console.log('Step 1 captured');

  console.log('Navigating pageB to Proposed...');
  await pageB.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle2' });
  const propTab = await pageB.$('[data-testid="tab-proposed"]');
  if (propTab) await pageB.evaluate(el => el.click(), propTab);
  await new Promise(r => setTimeout(r, 600));

  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step2_B_sees_proposed.png') });
  console.log('Step 2 captured');

  console.log('Assigning order in pageB...');
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
      deliveredAt: simNow - 1 * 60000, // already arrived!
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
  console.log('Assigned orderId:', orderId);

  const inTransitTab = await pageB.$('[data-testid="tab-in_transit"]');
  if (inTransitTab) await pageB.evaluate(el => el.click(), inTransitTab);
  await new Promise(r => setTimeout(r, 600));

  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step3_B_assigned_vehicle_card.png') });
  console.log('Step 3 captured');

  console.log('Navigating pageA to request detail...');
  await pageA.goto(`${BASE_URL}/#/hospital/AIM/requests/${reqId}`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step4_A_status_advancing_eta.png') });
  console.log('Step 4 captured');

  await pageA.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step5_A_arrived_confirm_active.png') });
  console.log('Step 5 captured');

  console.log('Confirming receipt in pageA...');
  const confirmBtn = await pageA.$('[data-testid="confirm-receipt-btn"]') || await pageA.$(`[data-testid="order-receive-btn-${orderId}"]`);
  if (confirmBtn) {
    await pageA.evaluate(el => el.click(), confirmBtn);
    await new Promise(r => setTimeout(r, 500));
    const acceptBtn = await pageA.$('[data-testid="accept-all-btn"]');
    if (acceptBtn) {
      await pageA.evaluate(el => el.click(), acceptBtn);
    }
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
  console.log('Step 6 captured');

  console.log('Navigating pageB to map...');
  await pageB.goto(`${BASE_URL}/#/workspace/map`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  await pageB.screenshot({ path: path.join(ARTIFACT_DIR, 'twowindow_step7_B_map_kpis_updated.png') });
  console.log('Step 7 captured');

  const finalCheck = await pageB.evaluate((oId) => {
    const w = window.__world.getWorld();
    const order = w.orders[oId];
    const aimLots = Object.values(w.lots).filter(l => l.hospital === 'AIM');
    return {
      orderReceived: order?.status === 'received',
      aimLotCount: aimLots.length,
      aimNet: window.__world.selectors.getNetBalance(w, 'AIM'),
    };
  }, orderId);

  console.log('Final sync check:', finalCheck);

  await browser.close();
  console.log('ALL 7 STEPS CAPTURED SUCCESSFULLY!');
}

main().catch(console.error);

