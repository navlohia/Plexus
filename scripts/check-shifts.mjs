import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/#/workspace/dashboard', { waitUntil: 'networkidle0' });

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
  const diffs = {};
  for (const [id, exp] of Object.entries(expectedPositions)) {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      diffs[id] = {
        actual: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        expected: exp,
        diff: {
          dx: Math.round(r.x - exp.x),
          dy: Math.round(r.y - exp.y),
          dw: Math.round(r.width - (exp.w || 0)),
          dh: Math.round(r.height - (exp.h || 0))
        }
      };
    } else {
      diffs[id] = 'NOT FOUND';
    }
  }
  return diffs;
});

console.log(JSON.stringify(shifts, null, 2));
await browser.close();

