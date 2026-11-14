import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function checkButtons() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/hospital/AIM/stock', { waitUntil: 'networkidle0' });
  const buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.map((b) => ({
      testId: b.getAttribute('data-testid') || b.className,
      text: b.textContent.trim().slice(0, 30),
      height: Math.round(b.getBoundingClientRect().height),
      width: Math.round(b.getBoundingClientRect().width),
    })).filter((b) => b.height < 44 && b.height > 0);
  });
  console.log('Buttons under 44px:', buttons);
  await browser.close();
}

checkButtons().catch(console.error);

