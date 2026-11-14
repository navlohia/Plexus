import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const jsUrls = [];
  page.on('response', res => {
    const url = res.url();
    if (url.endsWith('.js') || url.includes('/js/') || url.includes('chunk')) {
      jsUrls.push(url);
    }
  });

  await page.goto('https://mipogg.com/en/', { waitUntil: 'networkidle2' });
  console.log('JS URLs:', jsUrls);

  // Navigate to slide 5
  await page.evaluate(() => {
    // Look for slide 5 navigation button or trigger
    const dots = Array.from(document.querySelectorAll('[data-slide], button, a, span'));
    const dot5 = dots.find(d => d.innerText === '5/5' || d.getAttribute('data-slide') === '4' || d.getAttribute('data-index') === '4');
    if (dot5) dot5.click();
  });

  await new Promise(r => setTimeout(r, 2000));

  // Let's also capture 3 frames 600ms apart to see how spheres move
  await page.screenshot({ path: 'mipogg_frame1.png' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'mipogg_frame2.png' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'mipogg_frame3.png' });
  console.log('Captured 3 frames!');

  await browser.close();
}

main().catch(console.error);
