import puppeteer from 'puppeteer-core';

async function testFilter() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/#/workspace/dispatch?dev=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const initialRows = await page.$$eval('[data-testid^="order-row-"]', els => els.length);
  console.log('Initial order rows (All NCR):', initialRows);

  console.log('Clicking South Delhi zone tile...');
  await page.click('[data-testid="zone-tile-South Delhi"]');
  await new Promise(r => setTimeout(r, 300));

  const filteredRows = await page.$$eval('[data-testid^="order-row-"]', els => els.length);
  console.log('Filtered order rows (South Delhi):', filteredRows);

  console.log('Clicking South Delhi tile again to toggle off...');
  await page.click('[data-testid="zone-tile-South Delhi"]');
  await new Promise(r => setTimeout(r, 300));

  const resetRows = await page.$$eval('[data-testid^="order-row-"]', els => els.length);
  console.log('Reset order rows:', resetRows);

  await browser.close();
}

testFilter().catch(console.error);
