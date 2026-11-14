import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Starting HOSPITAL_UI_SPEC Sections 9-13 Polish & QA Verification ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
  });

  // ---------------------------------------------------------------------------
  // 1. STORY & WORLD CHECKS (HOSPITAL_UI & DATA)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 1: Running window.__story.checks() ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const checks = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });

  console.log('\n=== HOSPITAL_UI CHECKS ===');
  console.log(JSON.stringify(checks?.hospitalUI, null, 2));

  console.log('\n=== DATA CHECKS ===');
  console.log(JSON.stringify(checks?.data, null, 2));

  // ---------------------------------------------------------------------------
  // 2. RESPONSIVENESS & HORIZONTAL SCROLL PASS (1440, 1024, 768, 390)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 2: Responsive Pass across 1440, 1024, 768, 390 ---');
  const breakpoints = [1440, 1024, 768, 390];
  const testRoutes = ['today', 'requests', 'requests/REQ-0901', 'stock'];

  for (const bp of breakpoints) {
    await page.setViewport({ width: bp, height: bp === 390 ? 844 : 900 });
    for (const route of testRoutes) {
      await page.goto(`${BASE_URL}/#/hospital/AIM/${route}`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 400));

      const overflowResult = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const root = document.querySelector('[data-testid="hospital-portal-shell"]') || body;
        
        // Find elements wider than window (excluding the ladder horizontal scroll matrix)
        const overflowing = [];
        const allEls = Array.from(root.querySelectorAll('*'));
        for (const el of allEls) {
          if (el.closest('[data-testid="stock-ladder-matrix"]') || el.classList.contains('ladder-matrix-scroll')) {
            continue; // Ladder is explicitly allowed to scroll horizontally
          }
          if (el.scrollWidth > window.innerWidth + 2 && el.clientWidth > window.innerWidth + 2) {
            overflowing.push({
              tag: el.tagName,
              cls: el.className,
              id: el.id,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              windowWidth: window.innerWidth,
            });
          }
        }
        return {
          windowWidth: window.innerWidth,
          docScrollWidth: docEl.scrollWidth,
          overflowCount: overflowing.length,
          overflowing: overflowing.slice(0, 3),
        };
      });

      console.log(`  [Width ${bp}px] Route: ${route} -> docScroll: ${overflowResult.docScrollWidth}px (window: ${overflowResult.windowWidth}px), overflows: ${overflowResult.overflowCount}`);
      if (overflowResult.overflowCount > 0) {
        console.log('    Details:', JSON.stringify(overflowResult.overflowing));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. TOUCH TARGET PASS (Strictly >= 44px)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 3: Checking touch targets on interactive elements ---');
  await page.setViewport({ width: 390, height: 844 });
  for (const route of testRoutes) {
    await page.goto(`${BASE_URL}/#/hospital/AIM/${route}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));

    const smallTargets = await page.evaluate(() => {
      const interactives = Array.from(document.querySelectorAll('button, a[href], input, select, [role="button"]'));
      const small = [];
      for (const el of interactives) {
        const rect = el.getBoundingClientRect();
        // Ignore hidden elements or zero size elements
        if (rect.width === 0 || rect.height === 0 || el.offsetParent === null) continue;
        if (rect.height < 43.5 || rect.width < 43.5) {
          // Check if parent container has padding touch target or if inside ladder cells
          const text = (el.textContent || '').trim().slice(0, 30);
          small.push({
            tag: el.tagName,
            text,
            testId: el.getAttribute('data-testid'),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
      return small;
    });

    console.log(`  Touch targets on ${route}: ${smallTargets.length} small found`);
    if (smallTargets.length > 0) {
      console.log('    Sample small targets:', JSON.stringify(smallTargets.slice(0, 5)));
    }
  }

  // ---------------------------------------------------------------------------
  // 4. ACCESSIBILITY: KEYBOARD NAVIGATION & FOCUS RETURN
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 4: Testing Keyboard Accessibility & Focus Return ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));

  // Focus request button and press Enter
  const requestBtn = await page.$('[data-testid="header-request-platelets-btn"]');
  if (requestBtn) {
    await requestBtn.focus();
    const activeBeforeModal = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    console.log(`  Active element before opening modal: ${activeBeforeModal}`);

    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 400));

    const modalVisible = await page.$('[data-testid="request-platelets-modal"]');
    console.log(`  Request modal opened via keyboard: ${Boolean(modalVisible)}`);

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));

    const modalAfterEsc = await page.$('[data-testid="request-platelets-modal"]');
    const activeAfterClose = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    console.log(`  Request modal closed on Escape: ${!modalAfterEsc}`);
    console.log(`  Focus returned to: ${activeAfterClose}`);
  }

  // Test Stock Update Drawer keyboard navigation
  await page.goto(`${BASE_URL}/#/hospital/AIM/stock`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  const updateStockBtn = await page.$('[data-testid="open-update-stock-btn"]');
  if (updateStockBtn) {
    await updateStockBtn.focus();
    const activeBeforeDrawer = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    console.log(`  Active element before opening drawer: ${activeBeforeDrawer}`);

    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 400));

    const drawerVisible = await page.$('[data-testid="update-stock-drawer"]');
    console.log(`  Update drawer opened via keyboard: ${Boolean(drawerVisible)}`);

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));

    const drawerAfterEsc = await page.$('[data-testid="update-stock-drawer"]');
    const activeAfterDrawerClose = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    console.log(`  Update drawer closed on Escape: ${!drawerAfterEsc}`);
    console.log(`  Focus returned to: ${activeAfterDrawerClose}`);
  }

  // ---------------------------------------------------------------------------
  // 5. CAPTURE FINAL HIGH-FIDELITY SCREENSHOTS (1440x900 & 390x844)
  // ---------------------------------------------------------------------------
  console.log('\n--- Step 5: Capturing side-by-side after screenshots ---');
  async function takeScreenshots(name, route) {
    // 1440
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/#/hospital/AIM/${route}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    const p1440 = path.join(ARTIFACT_DIR, `${name}_1440x900.png`);
    await page.screenshot({ path: p1440 });

    // 390
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/#/hospital/AIM/${route}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    const p390 = path.join(ARTIFACT_DIR, `${name}_390x844.png`);
    await page.screenshot({ path: p390 });
    console.log(`  Saved ${name} at 1440 and 390`);
  }

  await takeScreenshots('today_after_steady', 'today');
  await takeScreenshots('today_after_inbound', 'today?hero=inbound');
  await takeScreenshots('requests_after_active', 'requests');
  await takeScreenshots('tracking_after_ontheway', 'requests/REQ-0901');
  await takeScreenshots('stock_after_usable', 'stock');

  await browser.close();
  console.log('\n--- All Verification Tasks Complete ---');
}

main().catch(console.error);

