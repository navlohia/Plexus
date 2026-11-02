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

  // Screenshot at progress 0
  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task1_progress_0_00.png',
  });
  console.log('Saved task1_progress_0_00.png');

  // Scrub to progress 0.75 (where map labels like GURGAON are prominent and rescue text is active)
  await page.evaluate(() => {
    const lenis = window.__lenis;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis && maxScroll > 0) {
      lenis.scrollTo(maxScroll * 0.75, { immediate: true });
    }
    window.scrollTo(0, maxScroll * 0.75);
  });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task1_progress_0_75.png',
  });
  console.log('Saved task1_progress_0_75.png');

  // Scrub to progress 0.85 (where "The mesh, live." and "[ Open the map -> ]" button are active over GURGAON)
  await page.evaluate(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const lenis = window.__lenis;
    if (lenis && maxScroll > 0) {
      lenis.scrollTo(maxScroll * 0.85, { immediate: true });
    }
    window.scrollTo(0, maxScroll * 0.85);
  });
  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({
    path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/task1_progress_0_85.png',
  });
  console.log('Saved task1_progress_0_85.png');

  await browser.close();
  console.log('All Task 1 screenshots captured successfully.');
})();
