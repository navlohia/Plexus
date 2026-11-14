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

  console.log('[Puppeteer] Navigating to http://localhost:5173/?dev=1 ...');
  await page.goto('http://localhost:5173/?dev=1', { waitUntil: 'networkidle0' });
  await delay(2500);

  // Helper to set progress precisely
  async function setProgress(p) {
    await page.evaluate((targetP) => {
      window.__storyProgress = targetP;
      const lenis = window.__lenis;
      if (lenis) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        lenis.scrollTo(targetP * maxScroll, { immediate: true });
      }
      const map = window.__map;
      if (map && typeof window.__updateStoryOverlays === 'function') {
        window.__updateStoryOverlays(targetP);
      }
      const hero = window.__storyHeroPlatelet;
      if (hero && typeof hero.update === 'function') {
        hero.update(targetP, 0.016, performance.now() / 1000);
      }
    }, p);
    await delay(600);
  }

  // 1. Story screenshots at 0.62, 0.68, 0.74, 0.80, 0.90
  const progressList = [0.62, 0.68, 0.74, 0.80, 0.90];
  for (const p of progressList) {
    console.log(`[Puppeteer] Capturing Story at progress ${p}...`);
    await setProgress(p);
    const filename = `story_progress_${p.toFixed(2)}.png`;
    await page.screenshot({
      path: path.join(artifactDir, filename),
      fullPage: false,
    });
    console.log(`Saved ${filename}`);
  }

  // 2. Zoomed crops for two routes at 0.66 (Intent Arc) vs 0.90 (Road Snapped)
  // Route 1: MAX -> SFD (Max Saket to Safdarjung in South Delhi: roughly x: 650..920, y: 500..750)
  // Route 2: N62 -> AIM (Fortis Noida to AIIMS: roughly x: 680..1150, y: 440..720)
  console.log('[Puppeteer] Capturing zoomed crops for MAX->SFD and N62->AIM at 0.66 vs 0.90...');

  // Set to 0.66
  await setProgress(0.66);
  // Crop 1: South Delhi (MAX -> SFD) at 0.66
  await page.screenshot({
    path: path.join(artifactDir, 'crop_route1_max_sfd_p0.66_arc.png'),
    clip: { x: 670, y: 510, width: 240, height: 210 },
  });
  // Crop 2: Central-Noida Corridor (N62 -> AIM) at 0.66
  await page.screenshot({
    path: path.join(artifactDir, 'crop_route2_n62_aim_p0.66_arc.png'),
    clip: { x: 690, y: 460, width: 380, height: 240 },
  });

  // Set to 0.90
  await setProgress(0.90);
  // Crop 1: South Delhi (MAX -> SFD) at 0.90
  await page.screenshot({
    path: path.join(artifactDir, 'crop_route1_max_sfd_p0.90_road.png'),
    clip: { x: 670, y: 510, width: 240, height: 210 },
  });
  // Crop 2: Central-Noida Corridor (N62 -> AIM) at 0.90
  await page.screenshot({
    path: path.join(artifactDir, 'crop_route2_n62_aim_p0.90_road.png'),
    clip: { x: 690, y: 460, width: 380, height: 240 },
  });

  // 3. Workspace Default Screenshot
  console.log('[Puppeteer] Navigating to Workspace #/workspace/map...');
  await page.goto('http://localhost:5173/#/workspace/map', { waitUntil: 'networkidle0' });
  await delay(2500);

  const wsDefaultFilename = 'workspace_default_routes.png';
  await page.screenshot({
    path: path.join(artifactDir, wsDefaultFilename),
    fullPage: false,
  });
  console.log(`Saved ${wsDefaultFilename}`);

  // 4. Run window.__story.checks()
  const checksOutput = await page.evaluate(() => {
    if (typeof window.__story?.checks === 'function') {
      return window.__story.checks();
    }
    return null;
  });

  console.log('[Puppeteer] window.__story.checks() output:');
  console.log(JSON.stringify(checksOutput, null, 2));

  fs.writeFileSync(
    path.join(artifactDir, 'story_checks_routes_v5.json'),
    JSON.stringify(checksOutput, null, 2),
    'utf-8'
  );

  await browser.close();
  console.log('[Puppeteer] Finished successfully!');
}

main().catch((err) => {
  console.error('[Puppeteer Fatal]', err);
  process.exit(1);
});

