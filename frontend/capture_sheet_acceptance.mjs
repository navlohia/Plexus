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

  console.log('[Puppeteer] Navigating to http://localhost:5173/?dev=1#/workspace/map ...');
  await page.goto('http://localhost:5173/?dev=1#/workspace/map', { waitUntil: 'networkidle0' });
  await delay(2500);

  // ── DELIVERABLE 1: SFD (Critical Shortage) ──
  console.log('[Puppeteer] Selecting SFD (Critical shortage)...');
  await page.evaluate(() => {
    const sfdCard = Array.from(document.querySelectorAll('.flighty-card')).find((el) =>
      el.textContent.includes('SFD')
    );
    if (sfdCard) sfdCard.click();
  });
  await delay(1200);

  const sfdPath = path.join(artifactDir, 'workspace_sheet_sfd_critical.png');
  await page.screenshot({ path: sfdPath });
  console.log(`[Puppeteer] Saved SFD screenshot: ${sfdPath}`);

  // Capture story checks while SFD is selected
  const checksSFD = await page.evaluate(() => {
    return (window.__story && typeof window.__story.checks === 'function')
      ? window.__story.checks()
      : null;
  });
  if (checksSFD) {
    fs.writeFileSync(
      path.join(artifactDir, 'story_checks_sheet_v5.json'),
      JSON.stringify(checksSFD, null, 2),
      'utf-8'
    );
    console.log('[Puppeteer] Saved story_checks_sheet_v5.json:', checksSFD.sheet);
  }

  // ── DELIVERABLE 2: "Show all 8" expanded state ──
  console.log('[Puppeteer] Clicking "Show all 8" button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const show8Btn = btns.find((b) => b.textContent && b.textContent.includes('Show all 8'));
    if (show8Btn) show8Btn.click();
  });
  await delay(400);

  const show8Path = path.join(artifactDir, 'workspace_sheet_show_all_8.png');
  await page.screenshot({ path: show8Path });
  console.log(`[Puppeteer] Saved "Show all 8" screenshot: ${show8Path}`);

  // ── DELIVERABLE 3: Amber / At-Risk Hospital (e.g. MDT or DWK) ──
  console.log('[Puppeteer] Selecting Amber hospital (MDT)...');
  await page.evaluate(() => {
    const mdtCard = Array.from(document.querySelectorAll('.flighty-card')).find((el) =>
      el.textContent.includes('MDT')
    );
    if (mdtCard) mdtCard.click();
  });
  await delay(1000);

  const amberPath = path.join(artifactDir, 'workspace_sheet_amber_at_risk.png');
  await page.screenshot({ path: amberPath });
  console.log(`[Puppeteer] Saved Amber hospital screenshot: ${amberPath}`);

  // ── DELIVERABLE 4: Positive-Balance Hospital (e.g. MAX or AIM) ──
  console.log('[Puppeteer] Selecting Positive-balance hospital (MAX)...');
  await page.evaluate(() => {
    const maxCard = Array.from(document.querySelectorAll('.flighty-card')).find((el) =>
      el.textContent.includes('MAX')
    );
    if (maxCard) maxCard.click();
  });
  await delay(1000);

  const posPath = path.join(artifactDir, 'workspace_sheet_positive_optimal.png');
  await page.screenshot({ path: posPath });
  console.log(`[Puppeteer] Saved Positive hospital screenshot: ${posPath}`);

  // ── DELIVERABLE 5: 6-Frame Motion Strip for Open and Close ──
  console.log('[Puppeteer] Capturing 6-frame close animation strip...');
  // Trigger close
  await page.evaluate(() => {
    const escBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'ESC');
    if (escBtn) escBtn.click();
  });

  const closeFrames = [];
  for (let i = 0; i < 6; i++) {
    await delay(45); // ~260ms total for 6 frames
    const b64 = await page.screenshot({ encoding: 'base64' });
    closeFrames.push(b64);
  }
  await delay(300);

  console.log('[Puppeteer] Capturing 6-frame open animation strip...');
  // Click SFD again to trigger open
  await page.evaluate(() => {
    const sfdCard = Array.from(document.querySelectorAll('.flighty-card')).find((el) =>
      el.textContent.includes('SFD')
    );
    if (sfdCard) sfdCard.click();
  });

  const openFrames = [];
  for (let i = 0; i < 6; i++) {
    await delay(70); // ~420ms total for 6 frames
    const b64 = await page.screenshot({ encoding: 'base64' });
    openFrames.push(b64);
  }
  await delay(500);

  // Stitch 6-frame Open Filmstrip
  console.log('[Puppeteer] Stitching 6-frame open strip...');
  const openStripB64 = await page.evaluate(async (frames) => {
    const canvas = document.createElement('canvas');
    const fw = 320;
    const fh = 200;
    canvas.width = fw * frames.length;
    canvas.height = fh + 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#141B2D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = 'data:image/png;base64,' + frames[i];
      });
      ctx.drawImage(img, i * fw, 0, fw, fh);
      ctx.fillStyle = '#FAF7F0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`Open Frame ${i + 1} (${Math.round((i * 420) / 5)}ms)`, i * fw + 10, fh + 20);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, openFrames);

  fs.writeFileSync(
    path.join(artifactDir, 'sheet_open_6frame_strip.png'),
    Buffer.from(openStripB64, 'base64')
  );

  // Stitch 6-frame Close Filmstrip
  console.log('[Puppeteer] Stitching 6-frame close strip...');
  const closeStripB64 = await page.evaluate(async (frames) => {
    const canvas = document.createElement('canvas');
    const fw = 320;
    const fh = 200;
    canvas.width = fw * frames.length;
    canvas.height = fh + 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#141B2D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = 'data:image/png;base64,' + frames[i];
      });
      ctx.drawImage(img, i * fw, 0, fw, fh);
      ctx.fillStyle = '#FAF7F0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`Close Frame ${i + 1} (${Math.round((i * 260) / 5)}ms)`, i * fw + 10, fh + 20);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, closeFrames);

  fs.writeFileSync(
    path.join(artifactDir, 'sheet_close_6frame_strip.png'),
    Buffer.from(closeStripB64, 'base64')
  );

  // ── DELIVERABLE 6: Mobile Viewport (390x844) in each snap (28%, 62%, 92%) ──
  console.log('[Puppeteer] Switching to Mobile Viewport 390x844...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await delay(800);

  // Snap 1: 28%
  console.log('[Puppeteer] Setting snap point 28%...');
  await page.evaluate(() => {
    if (typeof window.__setMobileSheetSnap === 'function') {
      window.__setMobileSheetSnap(0);
    }
  });
  await delay(500);
  const snap28Path = path.join(artifactDir, 'workspace_sheet_mobile_snap_28.png');
  await page.screenshot({ path: snap28Path });
  console.log(`[Puppeteer] Saved mobile snap 28%: ${snap28Path}`);

  // Snap 2: 62%
  console.log('[Puppeteer] Setting snap point 62%...');
  await page.evaluate(() => {
    if (typeof window.__setMobileSheetSnap === 'function') {
      window.__setMobileSheetSnap(1);
    }
  });
  await delay(500);
  const snap62Path = path.join(artifactDir, 'workspace_sheet_mobile_snap_62.png');
  await page.screenshot({ path: snap62Path });
  console.log(`[Puppeteer] Saved mobile snap 62%: ${snap62Path}`);

  // Snap 3: 92%
  console.log('[Puppeteer] Setting snap point 92%...');
  await page.evaluate(() => {
    if (typeof window.__setMobileSheetSnap === 'function') {
      window.__setMobileSheetSnap(2);
    }
  });
  await delay(500);
  const snap92Path = path.join(artifactDir, 'workspace_sheet_mobile_snap_92.png');
  await page.screenshot({ path: snap92Path });
  console.log(`[Puppeteer] Saved mobile snap 92%: ${snap92Path}`);

  console.log('[Puppeteer] All deliverables successfully captured!');
  await browser.close();
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});

