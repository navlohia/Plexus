import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const fills = await page.evaluate(() => {
    const tiles = document.querySelectorAll('[data-testid^="zone-tile-"]');
    return Array.from(tiles).map(t => t.getAttribute('fill'));
  });
  console.log('zone fills:', fills);
  await browser.close();
}

main().catch(console.error);

