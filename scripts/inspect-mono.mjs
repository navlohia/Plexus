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

  const failingElements = await page.evaluate(() => {
    const root =
      document.querySelector('[data-testid="hospital-portal-shell"]') ||
      document.querySelector('[data-testid="cockpit-gallery-root"]') ||
      document.querySelector('[data-testid="dev-ui-root"]') ||
      document.querySelector('.app-root-shell');

    if (!root) return ['no root'];
    const failures = [];
    const allEls = Array.from(root.querySelectorAll('*'));
    for (const el of allEls) {
      const style = window.getComputedStyle(el);
      const font = (style.fontFamily || '').toLowerCase();
      const isMono = font.includes('mono') || font.includes('consolas');
      if (isMono) {
        const text = (el.textContent || '').trim();
        const isShortOrId =
          el.classList.contains('cockpit-mono') ||
          /^(TX|REQ|LOT|VAN|BIK|CASE|PLX)[\w-]*$/i.test(text) ||
          /^[A-Z]{2,4}$/.test(text) ||
          /^[ABO][+-]$/.test(text) ||
          /^\d+(\.\d+)?[udhms]?$/.test(text) ||
          /^\d{1,2}:\d{2}$/.test(text) ||
          el.children.length > 0;
        if (!isShortOrId && text.length > 30) {
          failures.push({
            tag: el.tagName,
            className: el.className,
            text: text.slice(0, 100),
            fontFamily: style.fontFamily
          });
        }
      }
    }
    return failures;
  });

  console.log('Failing mono elements:', failingElements);
  await browser.close();
}

main().catch(console.error);

