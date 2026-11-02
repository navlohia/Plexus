const puppeteer = require('./frontend/node_modules/puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Opening Story page (http://localhost:5173/#/)...');
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2500));

  const progressSteps = [0.0, 0.25, 0.5, 0.75, 1.0];

  for (const p of progressSteps) {
    console.log(`Setting progress to ${p}...`);
    await page.evaluate((val) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: maxScroll * val, behavior: 'instant' });
      // Also update store directly to ensure 100% sync
      if (window.__map) {
        // window.__map is available
      }
      // Click debug button for exact state
      const buttons = Array.from(document.querySelectorAll('#story-debug-readout button'));
      const btn = buttons.find((b) => b.innerText.trim() === String(val));
      if (btn) btn.click();
    }, p);

    // Wait for requestAnimationFrame and map render
    await new Promise((r) => setTimeout(r, 1200));

    const camState = await page.evaluate(() => {
      const map = window.__map;
      if (!map) return 'No map instance';
      const c = map.getCenter();
      return {
        center: [Number(c.lng.toFixed(4)), Number(c.lat.toFixed(4))],
        zoom: Number(map.getZoom().toFixed(2)),
        pitch: Number(map.getPitch().toFixed(1)),
        bearing: Number(map.getBearing().toFixed(1)),
        bgColor: map.getPaintProperty('background', 'background-color'),
        waterColor: map.getPaintProperty('water', 'fill-color'),
      };
    });

    console.log(`Progress ${p} Map State:`, camState);

    const filename = `progress_${p.toFixed(2)}.png`;
    await page.screenshot({ path: filename });
    console.log(`Saved screenshot: ${filename}`);
  }

  await browser.close();
  console.log('All 5 progress screenshots captured successfully!');
})().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});

