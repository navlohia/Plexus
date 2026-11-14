import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/hospital/SFD/today', { waitUntil: 'networkidle0' });
  const reqBtn = await page.$('[data-testid="header-request-platelets-btn"]');
  if (reqBtn) await reqBtn.click();
  await new Promise((r) => setTimeout(r, 600));

  const smallBtns = await page.evaluate(() => {
    const portalBtns = document.querySelectorAll(
      '[data-testid="hospital-portal-shell"] button, [data-testid="hospital-portal-header"] button, [data-testid="request-platelets-modal"] button'
    );
    const results = [];
    portalBtns.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      if (rect.height > 0 && rect.height < 44) {
        results.push({
          tag: btn.tagName,
          testId: btn.getAttribute('data-testid'),
          text: (btn.textContent || '').trim().slice(0, 30),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    });
    return results;
  });
  console.log('Small buttons in modal:', JSON.stringify(smallBtns, null, 2));
  await browser.close();
})();
