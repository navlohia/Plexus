import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Launching Chrome for Task 1 Upgrades verification...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[Browser Error]', msg.text());
      }
    });

    console.log('Navigating to http://localhost:5173/?dev=1#/ ...');
    await page.goto('http://localhost:5173/?dev=1#/', { waitUntil: 'networkidle2' });
    await delay(1800);

    // 1. Capture p=0.00 default Stage 1 hero view
    console.log('Capturing p=0.00 default view...');
    await page.evaluate(() => {
      if (window.__story?.setProgress) window.__story.setProgress(0.00);
    });
    await delay(500);
    const p0Path = path.join(artifactDir, 'task1_hero_p0.00_default.png');
    await page.screenshot({ path: p0Path });
    console.log('Saved:', p0Path);

    // 2. Test Hover (move cursor to platelet center ~ 0.71 * 1440 = 1022, 0.46 * 900 = 414)
    console.log('Testing hover at (1022, 414)...');
    await page.mouse.move(1022, 414);
    await delay(350);
    const pHoverPath = path.join(artifactDir, 'task1_hero_p0.00_hover.png');
    await page.screenshot({ path: pHoverPath });
    console.log('Saved:', pHoverPath);

    // 3. Test Click (click platelet center to trigger elastic pulse & shockwave)
    console.log('Testing click at (1022, 414)...');
    await page.mouse.click(1022, 414);
    await delay(120); // Capture shockwave mid-expansion
    const pClickPath = path.join(artifactDir, 'task1_hero_p0.00_click_pulse.png');
    await page.screenshot({ path: pClickPath });
    console.log('Saved:', pClickPath);

    // Wait for shockwave to settle
    await delay(700);

    // 4. Capture key progress points: 0.12, 0.20, 0.28, 0.35
    for (const p of [0.12, 0.20, 0.28, 0.35]) {
      await page.evaluate((prog) => {
        if (window.__story?.setProgress) window.__story.setProgress(prog);
      }, p);
      await delay(400);
      const filePath = path.join(artifactDir, `task1_hero_p${p.toFixed(2)}.png`);
      await page.screenshot({ path: filePath });
      console.log(`Saved: task1_hero_p${p.toFixed(2)}.png`);
    }

    // 5. Run checks
    const checks = await page.evaluate(() => {
      if (window.__story?.checks) return window.__story.checks();
      return null;
    });

    console.log('\n=== STORY CHECKS RESULT ===');
    console.log(JSON.stringify(checks, null, 2));

    // Save summary JSON
    const summaryPath = path.join(artifactDir, 'task1_upgrades_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({ checks }, null, 2));
    console.log('Saved summary:', summaryPath);

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }
}

main();

