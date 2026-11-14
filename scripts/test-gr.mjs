import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Before hash:', await page.evaluate(() => window.location.hash));

  // Type g then r with small delay
  await page.keyboard.press('KeyG');
  await new Promise(r => setTimeout(r, 100));
  await page.keyboard.press('KeyR');
  await new Promise(r => setTimeout(r, 1000));

  console.log('After hash:', await page.evaluate(() => window.location.hash));

  await browser.close();
}

main().catch(console.error);

