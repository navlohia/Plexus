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

  await page.evaluate(() => {
    window.__loggedKeys = [];
    window.addEventListener('keydown', (e) => {
      window.__loggedKeys.push({
        key: e.key,
        code: e.code,
        target: e.target?.tagName,
        defaultPrevented: e.defaultPrevented
      });
    }, true);
  });

  await page.keyboard.type('r');
  await new Promise(r => setTimeout(r, 200));

  await page.keyboard.type('g');
  await page.keyboard.type('r');
  await new Promise(r => setTimeout(r, 200));

  const keys = await page.evaluate(() => window.__loggedKeys);
  console.log('Logged keys:', keys);
  console.log('URL hash:', await page.evaluate(() => window.location.hash));
  console.log('Modal element (request-sheet-content):', await page.evaluate(() => Boolean(document.querySelector('[data-testid="request-sheet-content"]'))));
  console.log('Ledger sheet:', await page.evaluate(() => Boolean(document.querySelector('[data-testid="ledger-sheet"]'))));

  await browser.close();
}

main().catch(console.error);
