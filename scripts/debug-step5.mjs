import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/hospital/AIM/today', { waitUntil: 'networkidle2' });
  console.log('Navigated to AIM today');

  console.log('Testing window.__world.clock.setTime...');
  const res = await page.evaluate(() => {
    const now = window.__world?.clock.now();
    console.log('sim now:', now);
    window.__world?.clock.setTime(now + 120000);
    return { ok: true, newNow: window.__world?.clock.now() };
  });
  console.log('Result:', res);

  console.log('Testing screenshot...');
  await page.screenshot({ path: 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3\\test_step5_screenshot.png' });
  console.log('Screenshot succeeded!');

  await browser.close();
}

main().catch(console.error);

