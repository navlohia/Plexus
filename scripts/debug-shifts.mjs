import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  const res1 = await page.evaluate(() => window.__story?.checks());
  console.log('1. Default checks: pass =', res1?.dashboard?.pass, 'layoutShift =', res1?.dashboard?.layoutShiftPx, 'consistency =', res1?.consistency?.pass);

  await page.click('[data-testid="tab-proposed"]');
  await new Promise(r => setTimeout(r, 500));
  const res2 = await page.evaluate(() => window.__story?.checks());
  console.log('2. Proposed tab: pass =', res2?.dashboard?.pass, 'layoutShift =', res2?.dashboard?.layoutShiftPx, 'consistency =', res2?.consistency?.pass);

  await page.click('[data-testid="assign-btn-REQ-901"], [data-testid="configure-btn-REQ-901"]');
  await new Promise(r => setTimeout(r, 500));
  const res3 = await page.evaluate(() => window.__story?.checks());
  console.log('3. Drawer open: pass =', res3?.dashboard?.pass, 'layoutShift =', res3?.dashboard?.layoutShiftPx, 'consistency =', res3?.consistency?.pass);

  // Check positions while drawer open
  const shifts = await page.evaluate(() => {
    const expectedPositions = {
      'dashboard-header-bar': { x: 196, y: 102, w: 1048, h: 48 },
      'dashboard-row-2-showcase': { x: 196, y: 166, w: 1048, h: 330 },
      'widget-active-dispatch': { x: 196, y: 166, w: 260, h: 186 },
      'widget-units-rescued': { x: 196, y: 360, w: 260, h: 66 },
      'widget-courier-card': { x: 196, y: 434, w: 260, h: 62 },
      'widget-center-art': { x: 474, y: 166, w: 392, h: 330 },
      'widget-shelf-life': { x: 884, y: 166, w: 112, h: 145 },
      'widget-box-temp': { x: 1006, y: 166, w: 238, h: 145 },
      'widget-expiry-horizon': { x: 884, y: 319, w: 360, h: 177 },
      'fleet-queue-row': { x: 196, y: 510, w: 1048, h: 74 },
      'widget-distribution-map': { x: 196, y: 598, w: 340, h: 288 },
      'orders-table-card': { x: 554, y: 598, w: 690, h: 288 },
    };
    const out = {};
    for (const [id, exp] of Object.entries(expectedPositions)) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        const dx = Math.abs(r.x - exp.x);
        const dy = Math.abs(r.y - exp.y);
        const dw = exp.w ? Math.abs(r.width - exp.w) : 0;
        const dh = exp.h ? Math.abs(r.height - exp.h) : 0;
        out[id] = { r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, maxShift: Math.round(Math.max(dx, dy, dw, dh)) };
      }
    }
    return out;
  });
  console.log('Shifts when drawer open:');
  console.log(JSON.stringify(shifts, null, 2));

  // Now click Confirm & Dispatch
  await page.click('[data-testid="confirm-dispatch-btn"]');
  await new Promise(r => setTimeout(r, 800));
  const res4 = await page.evaluate(() => window.__story?.checks());
  console.log('4. After Confirm: pass =', res4?.dashboard?.pass, 'layoutShift =', res4?.dashboard?.layoutShiftPx, 'consistency =', res4?.consistency?.pass);

  await browser.close();
}

main().catch(console.error);

