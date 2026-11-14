import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  console.log('--- 1. Testing Keyboard Shortcut `r` and Focus Return ---');
  // Focus the request button directly
  await page.focus('[data-testid="header-request-platelets-btn"]');
  const initialFocusedTag = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  console.log('Initially focused element:', initialFocusedTag);

  // Press 'r' to open request modal
  await page.keyboard.type('r');
  await new Promise((r) => setTimeout(r, 600));

  const isModalOpen = await page.evaluate(() => Boolean(document.querySelector('[data-testid="request-sheet-content"]') || document.querySelector('[data-testid="ledger-sheet"]')));
  console.log('Request modal open after pressing "r":', isModalOpen);

  // Press 'Escape' to close modal
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 600));

  const isModalClosed = await page.evaluate(() => !document.querySelector('[data-testid="ledger-sheet"]'));
  const returnedFocusTag = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  console.log('Request modal closed after Escape:', isModalClosed);
  console.log('Returned focused element:', returnedFocusTag);

  console.log('--- 2. Testing Command Palette `Ctrl+K` and Request Search ---');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 600));

  const isCmdKOpen = await page.evaluate(() => Boolean(document.querySelector('[data-testid="command-palette-modal"]')));
  console.log('Command palette open after Ctrl+K:', isCmdKOpen);

  // Type search query
  await page.keyboard.type('REQ');
  await new Promise((r) => setTimeout(r, 300));

  const cmdItems = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="command-palette-modal"]');
    return modal ? Array.from(modal.querySelectorAll('div[style*="cursor: pointer"]')).map((el) => el.textContent?.trim()) : [];
  });
  console.log('Filtered commands matching REQ:', cmdItems.slice(0, 3));

  // Press Escape to close command palette
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 500));
  const isCmdKClosed = await page.evaluate(() => !document.querySelector('[data-testid="command-palette-modal"]'));
  console.log('Command palette closed after Escape:', isCmdKClosed);

  console.log('--- 3. Testing `j` / `k` Row Navigation & Enter ---');
  await page.keyboard.press('KeyJ');
  await new Promise((r) => setTimeout(r, 200));

  const selectedRowId = await page.evaluate(() => {
    const el = document.querySelector('[data-row-selected="true"]');
    return el ? el.getAttribute('data-testid') : null;
  });
  console.log('Row selected after pressing "j":', selectedRowId);

  console.log('--- 4. Testing Tab Switch Shortcuts `g r` ---');
  await page.keyboard.type('gr');
  await new Promise((r) => setTimeout(r, 1000));

  const currentTab = await page.evaluate(() => window.location.hash);
  console.log('Current URL hash after "g r":', currentTab);

  console.log('--- 5. Testing Mobile Viewports (360, 390, 430) ---');
  for (const width of [360, 390, 430]) {
    await page.setViewport({ width, height: 844 });
    await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));

    const metrics = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const headline = document.querySelector('.ledger-headline');
      const hStyle = headline ? window.getComputedStyle(headline) : null;
      const hourRailArrivals = document.querySelector('[data-testid="mobile-hour-rail-arrivals"]');

      return {
        viewportWidth: window.innerWidth,
        scrollWidth: scrollW,
        noHorizontalScroll: scrollW <= window.innerWidth + 1,
        headlineFontSize: hStyle ? hStyle.fontSize : null,
        headlineLineHeight: hStyle ? hStyle.lineHeight : null,
        hasHourRailMobileArrivals: Boolean(hourRailArrivals),
      };
    });

    console.log(`Viewport ${width}px results:`, metrics);
  }

  await browser.close();
  console.log('=== ALL AUTOMATED TESTS COMPLETED ===');
}

main().catch(console.error);
