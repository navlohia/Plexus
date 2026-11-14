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

  // Check background map styles at scroll = 0
  const mapStyleAt0 = await page.evaluate(() => {
    const el = document.getElementById('persistent-map-stage');
    return el ? { opacity: el.style.opacity, transform: el.style.transform } : null;
  });
  console.log('Map style at progress 0:', mapStyleAt0);

  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task4_damped_progress_0_00.png',
  });
  console.log('Saved task4_damped_progress_0_00.png');

  // Smooth scroll scrub test: simulate mouse wheel events
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) {
      lenis.scrollTo(maxScroll * 0.45);
    }
  });
  // Wait for RAF interpolation to settle
  await new Promise((r) => setTimeout(r, 1500));

  const mapStyleAt45 = await page.evaluate(() => {
    const el = document.getElementById('persistent-map-stage');
    return el ? { opacity: el.style.opacity, transform: el.style.transform } : null;
  });
  console.log('Map style at progress ~0.45:', mapStyleAt45);

  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task4_damped_progress_0_45.png',
  });
  console.log('Saved task4_damped_progress_0_45.png');

  // Scroll to 0.85
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) {
      lenis.scrollTo(maxScroll * 0.85);
    }
  });
  await new Promise((r) => setTimeout(r, 1500));

  const mapStyleAt85 = await page.evaluate(() => {
    const el = document.getElementById('persistent-map-stage');
    return el ? { opacity: el.style.opacity, transform: el.style.transform } : null;
  });
  console.log('Map style at progress 0.85:', mapStyleAt85);

  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task4_damped_progress_0_85.png',
  });
  console.log('Saved task4_damped_progress_0_85.png');

  await browser.close();
  console.log('Task 4 verification complete.');
})();

