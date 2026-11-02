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

  // Screenshot at progress 0.70 (Handoff commencement)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.70, { immediate: true });
    window.scrollTo(0, maxScroll * 0.70);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task3_handoff_progress_0_70.png',
  });
  console.log('Saved task3_handoff_progress_0_70.png');

  // Screenshot at progress 0.76 (Active flight and arrival, courier streams flowing)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.76, { immediate: true });
    window.scrollTo(0, maxScroll * 0.76);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task3_handoff_progress_0_76.png',
  });
  console.log('Saved task3_handoff_progress_0_76.png');

  // Screenshot at progress 0.82 (3D spheres fully 0 scale/opacity; 2D crisp pins 100% active; zero black dash artifacts)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.82, { immediate: true });
    window.scrollTo(0, maxScroll * 0.82);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task3_handoff_progress_0_82.png',
  });
  console.log('Saved task3_handoff_progress_0_82.png');

  // Screenshot at progress 0.90 ("The mesh, live.", courier pulses streaming, crisp 2D pins)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) lenis.scrollTo(maxScroll * 0.90, { immediate: true });
    window.scrollTo(0, maxScroll * 0.90);
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task3_mesh_live_progress_0_90.png',
  });
  console.log('Saved task3_mesh_live_progress_0_90.png');

  await browser.close();
  console.log('Task 3 screenshots captured successfully.');
})();

