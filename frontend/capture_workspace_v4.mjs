import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=d3d11',
    ],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
      console.error('[Browser Error]', text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.error('[Page Error]', err.message);
  });

  // ── 1. Deep Link Direct Visit at 1440x900 ──
  console.log('Navigating directly to http://localhost:5173/#/workspace/map (1440x900) ...');
  await page.goto('http://localhost:5173/#/workspace/map', { waitUntil: 'networkidle2' });
  await delay(2500);

  // Trigger pill placement calculation if not already run
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await delay(600);

  const desktop1440Filename = 'workspace_deep_link_1440x900.png';
  const desktop1440Path = path.join(artifactDir, desktop1440Filename);
  await page.screenshot({ path: desktop1440Path });
  console.log(`Captured ${desktop1440Filename}`);

  // Run checks at 1440x900
  const checks1440 = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });
  console.log('Checks at 1440x900:', JSON.stringify(checks1440, null, 2));

  // ── 2. Viewport 1920x1080 ──
  console.log('\n--- Switching to 1920x1080 ---');
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await delay(1200);

  const desktop1920Filename = 'workspace_deep_link_1920x1080.png';
  const desktop1920Path = path.join(artifactDir, desktop1920Filename);
  await page.screenshot({ path: desktop1920Path });
  console.log(`Captured ${desktop1920Filename}`);

  const checks1920 = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });
  console.log('Checks at 1920x1080:', JSON.stringify(checks1920, null, 2));

  // ── 3. Viewport 390x844 (Mobile) ──
  console.log('\n--- Switching to 390x844 (Mobile) ---');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await delay(1200);

  const mobileFilename = 'workspace_deep_link_390x844.png';
  const mobilePath = path.join(artifactDir, mobileFilename);
  await page.screenshot({ path: mobilePath });
  console.log(`Captured ${mobileFilename}`);

  const checksMobile = await page.evaluate(() => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });
  console.log('Checks at 390x844:', JSON.stringify(checksMobile, null, 2));

  // ── 4. Test Hover Interaction (1440x900) ──
  console.log('\n--- Testing List Item Hover Highlighting ---');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
  });
  await delay(800);

  // Hover the first card in the stack (AIIMS Trauma)
  await page.hover('.flighty-card');
  await delay(400);

  const hoverCheck = await page.evaluate(() => {
    const highlightedDot = document.querySelector('.flighty-pin-dot.dot-highlighted');
    const highlightedPill = document.querySelector('.flighty-pin-pill.pill-highlighted');
    const cardHovered = document.querySelector('.flighty-card-hovered');

    return {
      hasHighlightedDot: Boolean(highlightedDot),
      hasHighlightedPill: Boolean(highlightedPill),
      hasHighlightedCard: Boolean(cardHovered),
    };
  });
  console.log('Hover check result:', JSON.stringify(hoverCheck));

  const hoverFilename = 'workspace_hover_highlight.png';
  const hoverPath = path.join(artifactDir, hoverFilename);
  await page.screenshot({ path: hoverPath });
  console.log(`Captured ${hoverFilename}`);

  // ── 5. Test playWorkspaceReveal() and reverseWorkspaceReveal() API ──
  console.log('\n--- Testing playWorkspaceReveal() and reverseWorkspaceReveal() ---');
  const revealTest = await page.evaluate(async () => {
    if (!window.__story || typeof window.__story.playWorkspaceReveal !== 'function') {
      return { error: 'playWorkspaceReveal not found on window.__story' };
    }
    await window.__story.reverseWorkspaceReveal();
    await new Promise((r) => setTimeout(r, 400));
    await window.__story.playWorkspaceReveal();
    await new Promise((r) => setTimeout(r, 1100));

    return { success: true };
  });
  console.log('Reveal API test result:', JSON.stringify(revealTest));

  const summary = {
    checks1440,
    checks1920,
    checksMobile,
    hoverCheck,
    revealTest,
    mapCreatedLogs: consoleLogs.filter((l) => l.includes('map created')).length,
  };

  fs.writeFileSync(
    path.join(artifactDir, 'workspace_v4_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log('\n✅ All Workspace v4 captures and verification complete.');
  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error in runner:', err);
  process.exit(1);
});
