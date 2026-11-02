import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 1. Load Story landing page
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  // Progress 0.10: Stage 1 Vibrant Arterial Crimson Platelet (No cracks, no brown)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.10, { immediate: true });
    window.scrollTo(0, maxScroll * 0.10);
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task2_stage1_progress_0_10.png',
  });
  console.log('Saved task2_stage1_progress_0_10.png');

  // Progress 0.35: Stage 2 Tilted Geometric Orbital Ring (25 Luminous Spheres on right + Plexus hairlines)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.35, { immediate: true });
    window.scrollTo(0, maxScroll * 0.35);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task2_stage2_orbital_ring_0_35.png',
  });
  console.log('Saved task2_stage2_orbital_ring_0_35.png');

  // Progress 0.60: Stage 3 Scatter / Swarm (Clear of bottom-left text card)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.60, { immediate: true });
    window.scrollTo(0, maxScroll * 0.60);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task2_stage3_scatter_0_60.png',
  });
  console.log('Saved task2_stage3_scatter_0_60.png');

  // Progress 0.85: Stage 4 Rescue & Settle
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.85, { immediate: true });
    window.scrollTo(0, maxScroll * 0.85);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task2_stage4_rescue_0_85.png',
  });
  console.log('Saved task2_stage4_rescue_0_85.png');

  await browser.close();
  console.log('Task 2 screenshots captured successfully.');
})();

