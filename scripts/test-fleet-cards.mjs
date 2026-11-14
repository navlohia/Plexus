import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #F2F3F7;
            padding: 30px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .row {
            display: flex;
            gap: 12px;
          }
          .card {
            min-width: 225px;
            width: 225px;
            height: 74px;
            border-radius: 12px;
            padding: 9px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .active-card {
            background: #FFFFFF;
            box-shadow: 0 4px 20px rgba(15,23,42,0.07);
            border: 1px solid rgba(168, 85, 247, 0.25);
          }
          .inactive-card {
            background: rgba(255,255,255,0.6);
            border: 1px solid transparent;
          }
        </style>
      </head>
      <body>
        <h2>Row 3 Fleet Cards Test</h2>
        <div class="row">
          <!-- Card 1: Van Inactive -->
          <div class="card inactive-card">
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0F172A;">#TX-0419</div>
              <div style="font-size: 11px; color: #71717A;">Apheresis · O- · 6u</div>
              <div style="font-size: 10px; color: #A1A1AA;">SGR → GTB</div>
            </div>
            <div style="position: relative; width: 95px; height: 54px; display: flex; align-items: center; justify-content: center;">
              <img src="http://localhost:5173/bike_studio_3d.png" style="width: 95px; height: 54px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.06) brightness(1.02);" />
            </div>
          </div>

          <!-- Card 2: Van Active with Purple Cargo -->
          <div class="card active-card">
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0F172A;">#TX-1042</div>
              <div style="font-size: 11px; color: #71717A;">Apheresis · O- · 12u</div>
              <div style="font-size: 10px; color: #A1A1AA;">MDT → GTB</div>
            </div>
            <div style="position: relative; width: 95px; height: 54px; display: flex; align-items: center; justify-content: center;">
              <img src="http://localhost:5173/van_studio_3d.png" style="width: 95px; height: 54px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.06) brightness(1.02);" />
              <svg viewBox="0 0 1376 768" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;">
                <rect x="520" y="116" width="736" height="360" rx="6" fill="rgba(192, 132, 252, 0.52)" stroke="#9333EA" stroke-width="4" />
                <line x1="888" y1="116" x2="888" y2="476" stroke="#1E293B" stroke-width="6" />
                <line x1="520" y1="296" x2="1256" y2="296" stroke="#7E22CE" stroke-width="3" opacity="0.6" />
              </svg>
            </div>
          </div>

          <!-- Card 3: Bike Active with Purple Cargo -->
          <div class="card active-card">
            <div>
              <div style="font-size: 13px; font-weight: 700; color: #0F172A;">#TX-1049</div>
              <div style="font-size: 11px; color: #71717A;">RDP · B+ · 6u</div>
              <div style="font-size: 10px; color: #A1A1AA;">BLK → SGR</div>
            </div>
            <div style="position: relative; width: 95px; height: 54px; display: flex; align-items: center; justify-content: center;">
              <img src="http://localhost:5173/bike_studio_3d.png" style="width: 95px; height: 54px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.06) brightness(1.02);" />
              <svg viewBox="0 0 1376 768" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;">
                <rect x="935" y="75" width="230" height="205" rx="14" fill="rgba(192, 132, 252, 0.52)" stroke="#9333EA" stroke-width="4" />
                <line x1="1011" y1="75" x2="1011" y2="280" stroke="#7E22CE" stroke-width="2.5" opacity="0.6" />
                <line x1="1088" y1="75" x2="1088" y2="280" stroke="#7E22CE" stroke-width="2.5" opacity="0.6" />
              </svg>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 600));
  const shotPath = path.join(ARTIFACT_DIR, 'fleet_cards_studio_test.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved fleet_cards_studio_test.png');
  await browser.close();
}

main().catch(console.error);

