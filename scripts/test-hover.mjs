import puppeteer from 'puppeteer-core';

async function testHover() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/#/workspace/dispatch?dev=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const southTile = await page.$('[data-testid="zone-tile-South Delhi"]');
  console.log('South tile found:', !!southTile);
  await southTile.hover();
  await new Promise(r => setTimeout(r, 300));

  const tooltipInfo = await page.evaluate(() => {
    const textEls = Array.from(document.querySelectorAll('svg text'));
    return textEls.map(t => ({ text: t.textContent, fill: t.getAttribute('fill') }));
  });

  console.log('SVG Text elements on hover:', tooltipInfo);
  await browser.close();
}

testHover().catch(console.error);

