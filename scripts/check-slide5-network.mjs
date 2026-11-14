import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('response', res => {
    const url = res.url();
    if (url.includes('.js') || url.includes('.glb') || url.includes('.gltf') || url.includes('.bin')) {
      console.log('Loaded:', url);
    }
  });

  await page.goto('https://mipogg.com/en/', { waitUntil: 'networkidle0' });

  // Let's click slide 5
  await page.evaluate(() => {
    // Look for button with dot or navigation
    const btns = Array.from(document.querySelectorAll('button, [data-slide], li, a'));
    for (const b of btns) {
      if (b.innerText && b.innerText.includes('5')) {
        b.click();
      }
    }
  });

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
}

main().catch(console.error);

