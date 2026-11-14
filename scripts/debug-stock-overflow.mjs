import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 800, isMobile: true });
  await page.goto('http://localhost:5173/#/hospital/AIM/stock', { waitUntil: 'networkidle2' });
  const stockDivs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        if (el.closest('[data-testid="expiry-ladder-scroll-container"]')) return false;
        if (el.getAttribute('data-testid') === 'expiry-ladder-scroll-container') return false;
        return el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 4;
      })
      .map(el => ({
        tag: el.tagName,
        testid: el.getAttribute('data-testid'),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        snippet: el.outerHTML.slice(0, 140)
      }));
  });
  console.log('Stock 360 overflowing divs:', JSON.stringify(stockDivs, null, 2));
  await browser.close();
}

main().catch(console.error);

