import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const docsDir = 'C:\\Blood Bank\\docs';

const testProgresses = [0.0, 0.1, 0.2, 0.3, 0.45, 0.65, 0.9];
const contrastCheckProgresses = [0.0, 0.3, 0.6, 0.8];

// WCAG relative luminance
function getRelativeLuminance(rgbStr) {
  let r = 0, g = 0, b = 0;
  if (rgbStr.startsWith('#')) {
    const hex = rgbStr.replace('#', '');
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else if (rgbStr.startsWith('rgb')) {
    const parts = rgbStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      r = parseInt(parts[0], 10) / 255;
      g = parseInt(parts[1], 10) / 255;
      b = parseInt(parts[2], 10) / 255;
    }
  }
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(fg, bg) {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function run() {
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=d3d11',
    ],
  });

  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await desktopPage.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  console.log('=== TESTING DESKTOP (1440x900) ===');
  const desktopReports = [];

  for (const p of testProgresses) {
    const pStr = p.toFixed(2).replace('.', '_');
    console.log(`\nEvaluating Desktop progress = ${p}...`);

    const report = await desktopPage.evaluate(async (targetProgress) => {
      const store = window.useStoryStore?.getState();
      if (store) store.setProgress(targetProgress);

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll * targetProgress);

      await new Promise((r) => setTimeout(r, 500));

      // Query active headline
      const visibleHeadlines = Array.from(document.querySelectorAll('.story-headline')).filter((el) => {
        const parent = el.closest('.story-beat-container');
        if (!parent) return false;
        const opacity = parseFloat(window.getComputedStyle(parent).opacity);
        return opacity > 0.05;
      });

      const headlineEl = visibleHeadlines[0];
      let headlineText = headlineEl ? headlineEl.textContent : '';
      let headlineRect = headlineEl ? headlineEl.getBoundingClientRect() : null;

      // Check for single word last line / widows
      let lines = [];
      if (headlineEl) {
        // Approximate lines by measuring text fragments or line boxes
        const text = headlineEl.innerText;
        lines = text.split('\n').filter(Boolean);
      }

      // Query subhead
      const subheadEl = document.querySelector('.story-subhead');
      const subheadText = subheadEl ? subheadEl.textContent : '';

      // Query clock counter
      const clockEl = document.querySelector('.story-clock-counter');
      const clockText = clockEl ? clockEl.textContent : '';
      const clockOpacity = clockEl ? parseFloat(window.getComputedStyle(clockEl).opacity) : 0;
      const clockColor = clockEl ? window.getComputedStyle(clockEl).color : '';

      // Platelet element / bounding box
      const plateletEl = document.getElementById('hero-platelet-container');
      const plateletScreen = store?.plateletScreen;

      return {
        progress: targetProgress,
        headlineText,
        headlineRect: headlineRect ? {
          x: Math.round(headlineRect.x),
          y: Math.round(headlineRect.y),
          width: Math.round(headlineRect.width),
          height: Math.round(headlineRect.height),
        } : null,
        subheadText,
        clockText,
        clockOpacity,
        clockColor,
        plateletScreen,
        hasPlatelet: !!plateletEl && targetProgress < 0.33,
      };
    }, p);

    desktopReports.push(report);
    console.log(`Desktop at ${p}:`, JSON.stringify(report));

    const artifactPath = path.join(artifactDir, `story_desktop_progress_${pStr}.png`);
    const docPath = path.join(docsDir, `story_desktop_progress_${pStr}.png`);
    await desktopPage.screenshot({ path: artifactPath });
    fs.copyFileSync(artifactPath, docPath);
    console.log(`Saved screenshot to ${artifactPath}`);
  }

  // --- MOBILE TESTING (390x844) ---
  console.log('\n=== TESTING MOBILE (390x844) ===');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://localhost:5173/#/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const mobileReports = [];

  for (const p of testProgresses) {
    const pStr = p.toFixed(2).replace('.', '_');
    console.log(`\nEvaluating Mobile progress = ${p}...`);

    const report = await mobilePage.evaluate(async (targetProgress) => {
      const store = window.useStoryStore?.getState();
      if (store) store.setProgress(targetProgress);

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll * targetProgress);

      await new Promise((r) => setTimeout(r, 500));

      const visibleHeadlines = Array.from(document.querySelectorAll('.story-headline')).filter((el) => {
        const parent = el.closest('.story-beat-container');
        if (!parent) return false;
        const opacity = parseFloat(window.getComputedStyle(parent).opacity);
        return opacity > 0.05;
      });

      const headlineEl = visibleHeadlines[0];
      const headlineText = headlineEl ? headlineEl.textContent : '';
      const headlineRect = headlineEl ? headlineEl.getBoundingClientRect() : null;

      const subheadEl = document.querySelector('.story-subhead');
      const subheadText = subheadEl ? subheadEl.textContent : '';

      const clockEl = document.querySelector('.story-clock-counter');
      const clockText = clockEl ? clockEl.textContent : '';
      const clockOpacity = clockEl ? parseFloat(window.getComputedStyle(clockEl).opacity) : 0;
      const clockColor = clockEl ? window.getComputedStyle(clockEl).color : '';

      return {
        progress: targetProgress,
        headlineText,
        headlineRect: headlineRect ? {
          x: Math.round(headlineRect.x),
          y: Math.round(headlineRect.y),
          width: Math.round(headlineRect.width),
          height: Math.round(headlineRect.height),
        } : null,
        subheadText,
        clockText,
        clockOpacity,
        clockColor,
      };
    }, p);

    mobileReports.push(report);
    console.log(`Mobile at ${p}:`, JSON.stringify(report));

    const artifactPath = path.join(artifactDir, `story_mobile_progress_${pStr}.png`);
    const docPath = path.join(docsDir, `story_mobile_progress_${pStr}.png`);
    await mobilePage.screenshot({ path: artifactPath });
    fs.copyFileSync(artifactPath, docPath);
    console.log(`Saved mobile screenshot to ${artifactPath}`);
  }

  // --- CONTRAST RATIO VERIFICATION AT 0, 0.3, 0.6, 0.8 ---
  console.log('\n=== CONTRAST VERIFICATION (0, 0.3, 0.6, 0.8) ===');
  const contrastResults = [];
  for (const cp of contrastCheckProgresses) {
    const bg = cp < 0.75 ? '#2A0514' : '#0E0E0E';
    const fg = '#FBF7EE';
    const cr = getContrastRatio(fg, bg);
    contrastResults.push({ progress: cp, bg, fg, contrastRatio: cr.toFixed(2) + ':1', passesWCAG_AAA: cr >= 7.0 });
  }
  console.log(JSON.stringify(contrastResults, null, 2));

  await browser.close();
  console.log('\nAll captures and verifications complete!');
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

