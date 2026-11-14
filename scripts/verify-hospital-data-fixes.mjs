import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Starting HOSPITAL_UI_SPEC Data & Logic Fixes Verification ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

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

  // 1. First navigate to AIM Today with normal speed
  await setSessionRole('hospital', 'AIM');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  // Run story checks and print data suite
  const checks = await page.evaluate(() => {
    return window.__story ? window.__story.checks() : null;
  });

  console.log('--- window.__story.checks() RESULT ---');
  console.log(JSON.stringify(checks?.data, null, 2));

  // 2. Identify 3 hospitals across states: Short, Risk, Steady
  const hospitalStates = await page.evaluate(() => {
    const world = window.__world.getWorld();
    const selectors = window.__world.selectors || {};
    const results = [];
    for (const [code, hosp] of Object.entries(world.hospitals)) {
      const net = world.orders ? (hosp.tier === 'hub' ? 10 : -4) : 0;
      results.push({
        code,
        name: hosp.name,
      });
    }
    return results;
  });

  // Verify 3 target hospitals: AIM (Short), MDT (Risk/Surplus), SGR / ROH (Steady)
  const targetHospitals = [
    { code: 'AIM', label: 'Short' },
    { code: 'MDT', label: 'Risk' },
    { code: 'ROH', label: 'Steady' },
  ];

  console.log('\n--- Verifying 3 Target Hospitals (Today, Stock, Bell, Ladder, ETAs) ---');
  const hospitalAudit = [];

  for (const { code, label } of targetHospitals) {
    await setSessionRole('hospital', code);

    // Navigate to Today
    await page.goto(`${BASE_URL}/#/hospital/${code}/today`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    const todayShotPath = path.join(ARTIFACT_DIR, `hosp_data_${code.toLowerCase()}_${label.toLowerCase()}_today.png`);
    await page.screenshot({ path: todayShotPath });

    const todayInfo = await page.evaluate((c) => {
      const headlineEl = document.querySelector('[data-testid="portal-today-headline"]');
      const headlineText = headlineEl ? headlineEl.textContent.trim() : '';
      const notifBadge = document.querySelector('[data-testid="portal-notif-badge"]') || document.querySelector('[data-testid="notification-badge"]');
      const bellCount = notifBadge ? parseInt(notifBadge.textContent.trim(), 10) : 0;
      const chipEl = document.querySelector('[data-testid="sim-clock-chip"]');
      return {
        headlineText,
        bellCount,
        hasSimChip: Boolean(chipEl),
      };
    }, code);

    // Navigate to Stock
    await page.goto(`${BASE_URL}/#/hospital/${code}/stock`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    const stockShotPath = path.join(ARTIFACT_DIR, `hosp_data_${code.toLowerCase()}_${label.toLowerCase()}_stock.png`);
    await page.screenshot({ path: stockShotPath });

    const stockInfo = await page.evaluate((c) => {
      const alertCard = document.querySelector('[data-testid="stock-alerts-card"]');
      const alerts = alertCard ? Array.from(alertCard.querySelectorAll('[data-testid^="stock-alert-"]')).map(el => el.textContent.trim()) : [];
      const onHandEl = document.querySelector('[data-testid="kpi-on-hand-value"]');
      const onHandText = onHandEl ? onHandEl.textContent.trim() : '';
      const coverEl = document.querySelector('[data-testid="kpi-days-of-cover-value"]');
      const coverText = coverEl ? coverEl.textContent.trim() : '';
      const worstLabelEl = document.querySelector('[data-testid="kpi-worst-group-label"]');
      const worstText = worstLabelEl ? worstLabelEl.textContent.trim() : '';

      // Count units in current ladder table
      const rows = Array.from(document.querySelectorAll('[data-testid^="ladder-row-"]'));
      let ladderSumUnits = 0;
      for (const r of rows) {
        const cells = Array.from(r.querySelectorAll('[data-testid^="ladder-cell-"]'));
        for (const cell of cells) {
          const t = cell.textContent.trim();
          if (t.endsWith('u')) {
            ladderSumUnits += parseInt(t.replace('u', ''), 10);
          }
        }
      }

      // Check for any blue colors in computed styles
      let blueFound = false;
      const allEls = Array.from(document.querySelectorAll('[data-testid="hospital-stock-screen"] *'));
      for (const el of allEls) {
        const st = window.getComputedStyle(el);
        const bg = st.backgroundColor || '';
        const clr = st.color || '';
        // rgb for #2563EB is rgb(37, 99, 235), #EFF6FF is rgb(239, 246, 255)
        if (bg.includes('37, 99, 235') || bg.includes('239, 246, 255') || clr.includes('37, 99, 235')) {
          blueFound = true;
        }
      }

      return {
        alertsCount: alerts.length,
        alerts,
        onHandText,
        coverText,
        worstText,
        ladderSumUnits,
        blueFound,
      };
    }, code);

    // Switch to RDP product on Stock screen to test RDP ladder sum
    await page.click('[data-testid="toggle-product-rdp"]');
    await new Promise((r) => setTimeout(r, 600));

    const rdpLadderSum = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="ladder-row-"]'));
      let sum = 0;
      for (const r of rows) {
        const cells = Array.from(r.querySelectorAll('[data-testid^="ladder-cell-"]'));
        for (const cell of cells) {
          const t = cell.textContent.trim();
          if (t.endsWith('u')) {
            sum += parseInt(t.replace('u', ''), 10);
          }
        }
      }
      return sum;
    });

    // Check world data for this hospital
    const worldInfo = await page.evaluate((c) => {
      const world = window.__world.getWorld();
      const lots = Object.values(world.lots).filter((l) => l.hospital === c);
      const aphOnHand = lots.filter((l) => l.product === 'APH').reduce((s, l) => s + l.units, 0);
      const rdpOnHand = lots.filter((l) => l.product === 'RDP').reduce((s, l) => s + l.units, 0);
      const totalOnHand = lots.reduce((s, l) => s + l.units, 0);

      // Check ETAs
      const activeOrders = Object.values(world.orders).filter(
        (o) => (o.to === c || o.from === c) && (o.status === 'in_transit' || o.status === 'assigned')
      );
      const etasAfterNow = activeOrders.every((o) => o.deliveredAt > world.simNow);

      return {
        aphOnHand,
        rdpOnHand,
        totalOnHand,
        activeOrdersCount: activeOrders.length,
        etasAfterNow,
      };
    }, code);

    const auditEntry = {
      code,
      label,
      todayHeadline: todayInfo.headlineText,
      bellUnreadCount: todayInfo.bellCount,
      stockAlertsCount: stockInfo.alertsCount,
      bellAgreesWithAlerts: todayInfo.bellCount === stockInfo.alertsCount,
      onHandPhysical: stockInfo.onHandText,
      aphLadderSum: stockInfo.ladderSumUnits,
      aphLotsOnHand: worldInfo.aphOnHand,
      aphLadderMatches: stockInfo.ladderSumUnits === worldInfo.aphOnHand,
      rdpLadderSum,
      rdpLotsOnHand: worldInfo.rdpOnHand,
      rdpLadderMatches: rdpLadderSum === worldInfo.rdpOnHand,
      combinedLadderMatchesTotal: (stockInfo.ladderSumUnits + rdpLadderSum) === worldInfo.totalOnHand,
      coverValue: stockInfo.coverText,
      coverNever99: !stockInfo.coverText.includes('99'),
      etasAfterNow: worldInfo.etasAfterNow,
      noBlueFound: !stockInfo.blueFound,
      hasSimChipNormalSpeed: todayInfo.hasSimChip,
    };

    hospitalAudit.push(auditEntry);
    console.log(`\nResults for ${code} (${label}):`, JSON.stringify(auditEntry, null, 2));
  }

  // 3. Test Speed Chip when speed != 1
  console.log('\n--- Testing SIM xN chip with ?speed=30 ---');
  await page.goto(`${BASE_URL}/#/hospital/AIM/today?speed=30`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  const simChipInfo = await page.evaluate(() => {
    const chip = document.querySelector('[data-testid="sim-clock-chip"]');
    return {
      visible: Boolean(chip),
      text: chip ? chip.textContent.trim() : null,
    };
  });
  console.log('SIM chip at ?speed=30:', JSON.stringify(simChipInfo, null, 2));

  // Final check results
  const fullChecks = await page.evaluate(() => {
    return window.__story.checks();
  });

  console.log('\n================ FULL STORY CHECKS ================');
  console.log(JSON.stringify(fullChecks, null, 2));

  await browser.close();
  console.log('--- Verification Complete ---');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
