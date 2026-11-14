import puppeteer from 'puppeteer-core';
import fs from 'fs';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1376, height: 768 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; position: relative;">
        <img id="truck" src="http://localhost:5173/van_studio_3d.png" style="width: 1376px; height: 768px; display: block;" />
        <svg id="grid" viewBox="0 0 1376 768" style="position: absolute; inset: 0; width: 1376px; height: 768px; pointer-events: none;">
          <!-- Calibration rectangles -->
          <!-- Fine-tuned cargo bay inside the container -->
          <rect id="test-box" x="520" y="116" width="736" height="360" rx="4" fill="rgba(196, 148, 252, 0.45)" stroke="#7E22CE" stroke-width="2" />
        </svg>
      </body>
    </html>
  `);
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/truck_box_calib1.png' });
  await browser.close();
  console.log('Saved truck_box_calib1.png');
}

main().catch(console.error);
