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

  // 1. Workspace default overview
  console.log('[Puppeteer] Navigating to http://localhost:5173/?dev=1#/workspace/map ...');
  await page.goto('http://localhost:5173/?dev=1#/workspace/map', { waitUntil: 'networkidle0' });
  await delay(2500);

  console.log('[Puppeteer] Capturing workspace default overview...');
  const defaultPath = path.join(artifactDir, 'workspace_default_v5.png');
  await page.screenshot({ path: defaultPath });
  console.log(`[Puppeteer] Saved: ${defaultPath}`);

  // 2. Select SFD: trigger selection and capture 10-frame strip during the 1100ms transition
  console.log('[Puppeteer] Clicking SFD list card / marker to start selection...');
  await page.evaluate(() => {
    const sfdCard = Array.from(document.querySelectorAll('.flighty-card')).find((el) =>
      el.textContent.includes('SFD')
    );
    if (sfdCard) {
      sfdCard.click();
    } else {
      window.location.hash = '/workspace/map/SFD';
    }
  });

  // Capture 10 frames spaced across 1100ms (~110ms each)
  console.log('[Puppeteer] Capturing 10-frame transition strip...');
  const frameBase64s = [];
  for (let i = 1; i <= 10; i++) {
    await delay(100);
    const framePath = path.join(artifactDir, `camera_move_frame_${String(i).padStart(2, '0')}.png`);
    const b64 = await page.screenshot({ path: framePath, encoding: 'base64' });
    frameBase64s.push(b64);
  }
  await delay(400); // Wait for settle

  console.log('[Puppeteer] Capturing settled selected SFD state...');
  const sfdPath = path.join(artifactDir, 'workspace_selected_sfd.png');
  await page.screenshot({ path: sfdPath });
  console.log(`[Puppeteer] Saved: ${sfdPath}`);

  const sfdChecks = await page.evaluate(() => {
    return (window.__story && typeof window.__story.checks === 'function')
      ? window.__story.checks()
      : null;
  });
  if (sfdChecks) {
    fs.writeFileSync(path.join(artifactDir, 'story_checks_selection_sfd.json'), JSON.stringify(sfdChecks, null, 2), 'utf-8');
    console.log('[Puppeteer] SFD Selection Zoom Delta:', sfdChecks.selection.zoomedInVsOverview);
  }

  // Stitch 10-frame horizontal filmstrip
  console.log('[Puppeteer] Stitching 10-frame filmstrip...');
  const stripBase64 = await page.evaluate(async (frames) => {
    const canvas = document.createElement('canvas');
    const fw = 320;
    const fh = 200;
    canvas.width = fw * frames.length;
    canvas.height = fh + 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#141B2D';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < frames.length; i++) {
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = 'data:image/png;base64,' + frames[i];
      });
      ctx.drawImage(img, i * fw, 28, fw, fh);
      ctx.fillStyle = '#FAF7F0';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(`Frame ${i + 1}/10 (+${(i + 1) * 110}ms)`, i * fw + 10, 19);
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(i * fw, 0);
        ctx.lineTo(i * fw, canvas.height);
        ctx.stroke();
      }
    }
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  }, frameBase64s);

  if (stripBase64) {
    const stripPath = path.join(artifactDir, 'camera_move_10frame_strip.png');
    fs.writeFileSync(stripPath, Buffer.from(stripBase64, 'base64'));
    console.log(`[Puppeteer] Saved 10-frame strip: ${stripPath}`);
  }

  // 3. Select lone hospital with no solver partners (DWK)
  console.log('[Puppeteer] Selecting lone hospital DWK (no solver partners)...');
  await page.evaluate(() => {
    const dwkCard = Array.from(document.querySelectorAll('.flighty-card')).find((el) =>
      el.textContent.includes('DWK')
    );
    if (dwkCard) {
      dwkCard.click();
    } else {
      window.location.hash = '/workspace/map/DWK';
    }
  });
  await delay(1400); // Wait for easeTo zoom 12.5 to complete

  const dwkPath = path.join(artifactDir, 'workspace_selected_lone_dwk.png');
  await page.screenshot({ path: dwkPath });
  console.log(`[Puppeteer] Saved: ${dwkPath}`);

  // 4. Close selection via Escape key and verify camera restored
  console.log('[Puppeteer] Pressing Escape key to close selection...');
  await page.keyboard.press('Escape');
  await delay(1200); // Wait for restore camera (1000ms) to complete

  const closedPath = path.join(artifactDir, 'workspace_closed_restored.png');
  await page.screenshot({ path: closedPath });
  console.log(`[Puppeteer] Saved: ${closedPath}`);

  // 5. Run window.__story.checks()
  console.log('[Puppeteer] Evaluating checks()...');
  const checks = await page.evaluate(() => {
    return (window.__story && typeof window.__story.checks === 'function')
      ? window.__story.checks()
      : null;
  });

  const checksPath = path.join(artifactDir, 'story_checks_selection_v5.json');
  fs.writeFileSync(checksPath, JSON.stringify(checks, null, 2), 'utf-8');
  console.log(`[Puppeteer] Saved checks to: ${checksPath}`);
  console.log('Checks Result:\n', JSON.stringify(checks, null, 2));

  await browser.close();
  console.log('[Puppeteer] Acceptance capture complete!');
}

main().catch((err) => {
  console.error('[Puppeteer Error]', err);
  process.exit(1);
});
