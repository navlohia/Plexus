import puppeteer from 'puppeteer-core';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  const rescuedInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="widget-units-rescued"]');
    return el ? { text: el.textContent, innerHTML: el.innerHTML } : null;
  });
  console.log('RESCUED INFO:', rescuedInfo);
  await browser.close();
}
test();

