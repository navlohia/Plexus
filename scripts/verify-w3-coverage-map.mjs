import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('=== Starting Acceptance Verification for W3 Coverage · NCR Map ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });

  const page = await browser.newPage();

  // ── 1. Desktop 1440x900 Default State ──
  console.log('1. Setting viewport 1440x900 (Desktop)...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/#/workspace/dispatch?dev=1', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // Run window.checks()
  console.log('2. Running window.checks() in browser...');
  const checks = await page.evaluate(() => {
    return typeof window.checks === 'function' ? window.checks() : (window.__story ? window.__story.checks() : null);
  });

  console.log('\n--- Full window.checks() Output ---');
  console.log(JSON.stringify(checks, null, 2));

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'acceptance_checks_result.json'),
    JSON.stringify(checks, null, 2)
  );

  // Read Card Footer Content
  const cardFooterText = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="widget-distribution-map"]');
    return card ? card.innerText : '';
  });
  console.log('\n--- Coverage Map Card Text ---');
  console.log(cardFooterText);

  // Capture 1: Default Desktop 1440x900
  console.log('\n3. Capturing coverage_map_1440x900_default.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'coverage_map_1440x900_default.png'),
    fullPage: false,
  });

  // Capture Coverage Card Close-up
  const cardElement = await page.$('[data-testid="widget-distribution-map"]');
  if (cardElement) {
    await cardElement.screenshot({
      path: path.join(ARTIFACT_DIR, 'coverage_map_card_default.png'),
    });
  }

  // ── 2. Desktop 1440x900 Hover State (South Delhi) ──
  console.log('4. Hovering over South Delhi district tile...');
  const southTile = await page.$('[data-testid="zone-tile-South Delhi"]');
  if (southTile) {
    await southTile.hover();
    await new Promise((r) => setTimeout(r, 400));

    console.log('Capturing coverage_map_1440x900_hover.png...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'coverage_map_1440x900_hover.png'),
      fullPage: false,
    });

    if (cardElement) {
      await cardElement.screenshot({
        path: path.join(ARTIFACT_DIR, 'coverage_map_card_hover.png'),
      });
    }
  }

  // ── 3. Desktop 1440x900 Zone Filtered (Click South Delhi) ──
  console.log('5. Clicking South Delhi to activate zone filter...');
  if (southTile) {
    await southTile.click();
    await new Promise((r) => setTimeout(r, 400));

    console.log('Capturing coverage_map_1440x900_zone_filtered.png...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'coverage_map_1440x900_zone_filtered.png'),
      fullPage: false,
    });

    if (cardElement) {
      await cardElement.screenshot({
        path: path.join(ARTIFACT_DIR, 'coverage_map_card_zone_filtered.png'),
      });
    }

    // Toggle filter back off
    await southTile.click();
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── 4. Mobile 390x844 Viewport ──
  console.log('6. Setting mobile viewport 390x844...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/#/workspace/dispatch?dev=1', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // Scroll to coverage map card
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="widget-distribution-map"]');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise((r) => setTimeout(r, 350));

  console.log('Capturing coverage_map_390x844_mobile.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'coverage_map_390x844_mobile.png'),
    fullPage: false,
  });

  // Also capture full mobile page
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'coverage_map_390x844_mobile_full.png'),
    fullPage: true,
  });

  await browser.close();
  console.log('\n=== All Acceptance Verification captures completed successfully! ===');
}

main().catch((err) => {
  console.error('Acceptance run error:', err);
  process.exit(1);
});
