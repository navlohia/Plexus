import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
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
      localStorage.setItem(
        'plexus.session',
        JSON.stringify({
          operatorId: r === 'hospital' ? `PLX-${h}-H1` : 'PLX-AIIMS-01',
          role: r,
          hospital: r === 'hospital' ? h : undefined,
          demoMode: true,
        })
      );
    }, { r: role, h: hospital });
  }

  // Set initial session to hospital AIM
  await setSessionRole('hospital', 'AIM');

  // Setup seed scenarios and orders in the world via window.__world
  console.log('1. Setting up world requests and orders...');
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  await page.evaluate(() => {
    const wApi = window.__world;
    if (!wApi) return;
    const now = wApi.clock.now();

    // Request 1: In Transit (On the way)
    wApi.dispatch('RequestCreated', 'operator:AIM', {
      id: 'REQ-AIM-TRANSIT',
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      urgency: 'urgent',
      createdAt: now - 35 * 60000,
      neededBy: now + 145 * 60000,
      acceptAboCompatible: false,
      acceptPartial: true,
      status: 'in_transit',
      assignedOrderIds: ['TX-AIM-TRANSIT'],
      sourceTag: 'from hospital portal',
    }, 'ev-req-aim-transit');

    wApi.dispatch('OrderAssigned', 'operator:AIM', {
      id: 'TX-AIM-TRANSIT',
      requestId: 'REQ-AIM-TRANSIT',
      from: 'MDT',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      courier: 'Ravi Kumar',
      distanceKm: 14.2,
      durationMin: 28,
      assignedAt: now - 30 * 60000,
      packedAt: now - 20 * 60000,
      pickedUpAt: now - 10 * 60000,
      deliveredAt: now + 18 * 60000,
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.4,
        minTempC: 21.8,
        maxTempC: 22.8,
        excursionMin: 0,
        agitationOffMin: 10,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
      allocations: [
        {
          lotId: 'LOT-MDT-O-01',
          units: 2,
          expiresAt: now + 72 * 3600000, // 72 hours original expiry
        },
      ],
    }, 'ev-ord-aim-transit');

    // Request 2: Partial Fill
    wApi.dispatch('RequestCreated', 'operator:AIM', {
      id: 'REQ-AIM-PARTIAL',
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 6,
      urgency: 'urgent',
      createdAt: now - 25 * 60000,
      neededBy: now + 155 * 60000,
      acceptAboCompatible: false,
      acceptPartial: true,
      status: 'assigned',
      assignedOrderIds: ['TX-AIM-PARTIAL'],
      sourceTag: 'from hospital portal',
    }, 'ev-req-aim-partial');

    wApi.dispatch('OrderAssigned', 'operator:AIM', {
      id: 'TX-AIM-PARTIAL',
      requestId: 'REQ-AIM-PARTIAL',
      from: 'BLK',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2, // only 2 of 6 units assigned (Partial)
      courier: 'Amit Singh',
      distanceKm: 11.5,
      durationMin: 22,
      assignedAt: now - 20 * 60000,
      packedAt: now - 12 * 60000,
      pickedUpAt: now - 2 * 60000,
      deliveredAt: now + 20 * 60000,
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.2,
        minTempC: 21.9,
        maxTempC: 22.5,
        excursionMin: 0,
        agitationOffMin: 2,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
      allocations: [
        {
          lotId: 'LOT-BLK-O-04',
          units: 2,
          expiresAt: now + 88 * 3600000,
        },
      ],
    }, 'ev-ord-aim-partial');

    // Request 3: Arrived (Ready to receive)
    wApi.dispatch('RequestCreated', 'operator:AIM', {
      id: 'REQ-AIM-ARRIVED',
      hospital: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      urgency: 'urgent',
      createdAt: now - 50 * 60000,
      neededBy: now + 130 * 60000,
      acceptAboCompatible: false,
      acceptPartial: true,
      status: 'delivered',
      assignedOrderIds: ['TX-AIM-ARRIVED'],
      sourceTag: 'from hospital portal',
    }, 'ev-req-aim-arrived');

    wApi.dispatch('OrderAssigned', 'operator:AIM', {
      id: 'TX-AIM-ARRIVED',
      requestId: 'REQ-AIM-ARRIVED',
      from: 'SFD',
      to: 'AIM',
      product: 'APH',
      group: 'O-',
      units: 2,
      courier: 'Vikram Joshi',
      distanceKm: 8.4,
      durationMin: 18,
      assignedAt: now - 45 * 60000,
      packedAt: now - 35 * 60000,
      pickedUpAt: now - 20 * 60000,
      deliveredAt: now - 2 * 60000, // Delivered 2 min ago (Arrived!)
      delayed: false,
      delayMin: 0,
      alert: false,
      coldChain: {
        tempC: 22.1,
        minTempC: 21.6,
        maxTempC: 22.4,
        excursionMin: 0,
        agitationOffMin: 20,
        sealOk: true,
        doorOpens: 0,
        tiltEvents: 0,
      },
      allocations: [
        {
          lotId: 'LOT-SFD-O-09',
          units: 2,
          expiresAt: now + 65 * 3600000, // 65 hours original expiry
        },
      ],
    }, 'ev-ord-aim-arrived');
  });

  // -------------------------------------------------------------------------
  // 1. STATE 1: ON THE WAY (1440x900 & 390x844)
  // -------------------------------------------------------------------------
  console.log('Capturing State 1: On the way...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-TRANSIT`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_ontheway_1440x900.png') });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-TRANSIT`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_ontheway_390x844.png') });

  // -------------------------------------------------------------------------
  // 2. STATE 2: DELAYED (1440x900 & 390x844)
  // -------------------------------------------------------------------------
  console.log('Capturing State 2: Delayed...');
  await page.evaluate(() => {
    const wApi = window.__world;
    wApi.dispatch('OrderDelayed', 'operator:AIM', {
      orderId: 'TX-AIM-TRANSIT',
      delayMin: 18,
      reason: 'Traffic congestion near Ring Road intersection',
    });
  });

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-TRANSIT`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_delayed_1440x900.png') });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-TRANSIT`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_delayed_390x844.png') });

  // -------------------------------------------------------------------------
  // 3. STATE 3: COLD-CHAIN ALERT (1440x900 & 390x844)
  // -------------------------------------------------------------------------
  console.log('Capturing State 3: Cold-chain alert...');
  await page.evaluate(() => {
    const wApi = window.__world;
    wApi.dispatch('ColdChainExcursion', 'SYSTEM', {
      orderId: 'TX-AIM-TRANSIT',
      tempC: 24.8,
      excursionMin: 8,
      reason: 'Temperature excursion 24.8 °C for 8 min',
    });
  });

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-TRANSIT`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_coldchain_1440x900.png') });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-TRANSIT`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_coldchain_390x844.png') });

  // -------------------------------------------------------------------------
  // 4. STATE 4: PARTIAL (1440x900 & 390x844)
  // -------------------------------------------------------------------------
  console.log('Capturing State 4: Partial fill...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-PARTIAL`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_partial_1440x900.png') });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-PARTIAL`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_partial_390x844.png') });

  // -------------------------------------------------------------------------
  // 5. STATE 5: ARRIVED + RECEIVE DRAWER (1440x900 & 390x844)
  // -------------------------------------------------------------------------
  console.log('Capturing State 5: Arrived + Receive Drawer...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/requests/REQ-AIM-ARRIVED`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  // Open drawer on desktop
  const desktopConfirmBtn = await page.$('[data-testid="confirm-receipt-btn"]');
  if (desktopConfirmBtn) await desktopConfirmBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_arrived_drawer_1440x900.png') });

  // Close drawer
  const closeBtn = await page.$('[data-testid="close-receive-drawer-btn"]');
  if (closeBtn) await closeBtn.click();
  await new Promise((r) => setTimeout(r, 500));

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 500));
  const mobileConfirmBtn = await page.$('[data-testid="confirm-receipt-btn"]');
  if (mobileConfirmBtn) await mobileConfirmBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_arrived_drawer_390x844.png') });

  // -------------------------------------------------------------------------
  // 6. STATE 6: AFTER CONFIRMING (Stock increased, same lot expiry)
  // -------------------------------------------------------------------------
  console.log('Capturing State 6: After confirming...');
  // Click Accept all button in drawer
  await page.waitForSelector('[data-testid="accept-all-btn"]', { timeout: 3000 });
  await page.click('[data-testid="accept-all-btn"]');
  await new Promise((r) => setTimeout(r, 1200));

  // Screenshot Request Detail after confirming
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_confirmed_390x844.png') });

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'request_detail_confirmed_1440x900.png') });

  // Verify stock increased and lot has original expiry
  const stockVerification = await page.evaluate(() => {
    const wApi = window.__world;
    const w = wApi.getWorld();
    const aimLots = Object.values(w.lots).filter((l) => l.hospital === 'AIM');
    const receivedLot = aimLots.find((l) => l.lotId.includes('TX-AIM-ARRIVED'));
    return {
      totalAimLots: aimLots.length,
      receivedLot: receivedLot ? {
        lotId: receivedLot.lotId,
        units: receivedLot.units,
        expiresAt: receivedLot.expiresAt,
        hoursRemaining: Math.round((receivedLot.expiresAt - w.simNow) / 3600000)
      } : null,
      requestStatus: w.requests['REQ-AIM-ARRIVED']?.status,
      orderStatus: w.orders['TX-AIM-ARRIVED']?.status
    };
  });
  console.log('Stock Verification Result:', JSON.stringify(stockVerification, null, 2));

  // Also capture Hospital Stock screen showing the increased stock
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'hospital_stock_after_received_1440x900.png') });

  // -------------------------------------------------------------------------
  // 7. STATE 7: DISPATCHER'S VIEW UPDATING
  // -------------------------------------------------------------------------
  console.log('Capturing State 7: Dispatcher view...');
  await setSessionRole('dispatch');
  await page.goto(`${BASE_URL}/#/workspace/dashboard`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dispatch_view_after_hospital_receipt.png') });

  // -------------------------------------------------------------------------
  // 8. FINAL CHECKS EVALUATION
  // -------------------------------------------------------------------------
  console.log('Running final story checks...');
  const checks = await page.evaluate(() => window.__story ? window.__story.checks() : null);
  console.log('Checks Result:', JSON.stringify(checks, null, 2));

  await browser.close();
  console.log('All verification captures completed successfully!');
}

main().catch(console.error);
