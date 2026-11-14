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
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #F2F3F7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 24px 32px;
          }
          .row2 {
            display: grid;
            grid-template-columns: 260px 1fr 360px;
            gap: 18px;
            height: 330px;
            max-height: 330px;
            position: relative;
          }
          .left-col {
            display: flex;
            flex-direction: column;
            gap: 8px;
            height: 330px;
            position: relative;
            z-index: 20;
          }
          .card {
            background: #FFFFFF;
            border-radius: 16px;
            padding: 12px 14px;
            box-shadow: 0 4px 20px rgba(15,23,42,0.03);
          }
          .center-stage {
            background: transparent;
            position: relative;
            z-index: 5;
            overflow: visible;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            height: 330px;
          }
          .bike-container {
            width: auto;
            max-width: none;
            height: 315px;
            max-height: 315px;
            margin-left: auto;
            margin-right: -14px;
            display: flex;
            align-items: flex-end;
            position: relative;
          }
          .van-container {
            width: 148%;
            max-width: none;
            margin-left: -14%;
            margin-right: -34%;
            height: 100%;
            display: flex;
            align-items: flex-end;
            position: relative;
          }
          .van-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            mix-blend-mode: multiply;
            filter: contrast(1.06) brightness(1.02);
            -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%);
            mask-image: radial-gradient(ellipse at center, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%);
          }
          .shadow {
            position: absolute;
            bottom: 12px;
            left: 48%;
            transform: translateX(-50%);
            width: 110%;
            height: 24px;
            border-radius: 50%;
            background: radial-gradient(50% 50% at 50% 50%, rgba(15, 23, 42, 0.32) 0%, rgba(15, 23, 42, 0.08) 55%, transparent 100%);
            filter: blur(4px);
            z-index: 1;
            pointer-events: none;
          }
          .right-col {
            display: flex;
            flex-direction: column;
            gap: 8px;
            height: 330px;
            position: relative;
            z-index: 20;
          }
          .right-card {
            box-shadow: -8px 12px 32px rgba(15, 23, 42, 0.06);
          }
        </style>
      </head>
      <body>
        <div style="font-size: 14px; font-weight: 700; color: #64748B; margin-bottom: 12px;">Moveon-Style Vehicle Z-Index Depth Overlap Test</div>
        <div class="row2">
          <!-- LEFT -->
          <div class="left-col">
            <div class="card" style="height: 186px;">
              <div style="font-weight: 700; font-size: 14px; color: #0F172A;">#TX-1042</div>
              <div style="color: #64748B; font-size: 12px; margin-top: 4px;">26.6 km · 8 min left</div>
            </div>
            <div class="card" style="height: 66px;">
              <div style="font-size: 11px; color: #64748B;">Units Rescued</div>
              <div style="font-weight: 700; font-size: 16px;">184 units</div>
            </div>
            <div class="card" style="height: 62px; display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #FDE68A;"></div>
              <div>
                <div style="font-weight: 700; font-size: 12px;">Rajesh Kumar</div>
                <div style="font-size: 10px; color: #64748B;">Courier · VAN-01</div>
              </div>
            </div>
          </div>

          <!-- CENTER STAGE -->
          <div class="center-stage">
            <div class="van-container">
              <div class="shadow"></div>
              <img class="van-img" src="http://localhost:5173/van_studio_3d.png" />
              <svg viewBox="0 0 1376 768" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;">
                <defs>
                  <clipPath id="vanClip">
                    <rect x="520" y="116" width="736" height="360" rx="4" />
                  </clipPath>
                  <linearGradient id="roofShadow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(15, 23, 42, 0.3)" />
                    <stop offset="100%" stop-color="transparent" />
                  </linearGradient>
                </defs>
                <g clip-path="url(#vanClip)">
                  <rect x="520" y="116" width="736" height="360" fill="rgba(216, 180, 254, 0.28)" />
                  ${Array.from({ length: 6 }).map((_, c) => {
                    const cw = 736 / 6;
                    const x = 520 + c * cw;
                    return Array.from({ length: 4 }).map((_, r) => {
                      const rh = 360 / 4;
                      const y = 116 + r * rh;
                      return `
                        <rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${rh - 2}" rx="3"
                          fill="rgba(196, 148, 252, 0.48)" stroke="rgba(126, 34, 206, 0.38)" stroke-width="1" />
                        <line x1="${x + 6}" y1="${y + rh * 0.4}" x2="${x + cw - 6}" y2="${y + rh * 0.4}"
                          stroke="rgba(147, 51, 234, 0.25)" stroke-width="1.2" />
                      `;
                    }).join('');
                  }).join('')}
                  <rect x="885.5" y="116" width="5" height="360" fill="#1E293B" />
                  <line x1="520" y1="296" x2="1256" y2="296" stroke="#334155" stroke-width="2.5" opacity="0.6" />
                  <rect x="520" y="116" width="736" height="42" fill="url(#roofShadow)" />
                  <rect x="520" y="116" width="736" height="360" rx="4" fill="none" stroke="rgba(126, 34, 206, 0.55)" stroke-width="1.5" />
                </g>
              </svg>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="right-col">
            <div style="display: grid; grid-template-columns: 112px 1fr; gap: 10px; height: 145px;">
              <div class="card right-card" style="background: #ECFDF5; height: 145px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-weight: 700; font-size: 20px; color: #047857;">30h</div>
                <div style="font-size: 10px; color: #059669;">25% of 120h</div>
              </div>
              <div class="card right-card" style="background: #FFFBEB; height: 145px; padding: 12px;">
                <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Box Temperature</div>
                <div style="font-size: 9.5px; color: #64748B;">20.0–24.0 °C safe transit band</div>
                <div style="font-size: 20px; font-weight: 700; color: #0F172A; margin-top: 18px; text-align: center;">22.4 °C</div>
              </div>
            </div>
            <div class="card right-card" style="height: 177px; padding: 14px;">
              <div style="font-weight: 700; font-size: 13px; color: #0F172A;">Expiry Horizon</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-top: 4px;">49u expire within 36 h</div>
            </div>
          </div>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #64748B; margin-top: 40px; margin-bottom: 12px;">Moveon-Style Bike Z-Index Depth Overlap Test</div>
        <div class="row2">
          <!-- LEFT -->
          <div class="left-col">
            <div class="card" style="height: 186px;">
              <div style="font-weight: 700; font-size: 14px; color: #0F172A;">#TX-1049</div>
              <div style="color: #64748B; font-size: 12px; margin-top: 4px;">5.5 km · 2 min left</div>
            </div>
            <div class="card" style="height: 66px;">
              <div style="font-size: 11px; color: #64748B;">Units Rescued</div>
              <div style="font-weight: 700; font-size: 16px;">184 units</div>
            </div>
            <div class="card" style="height: 62px; display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #FDE68A;"></div>
              <div>
                <div style="font-weight: 700; font-size: 12px;">Manoj Verma</div>
                <div style="font-size: 10px; color: #64748B;">Courier · BIKE-01</div>
              </div>
            </div>
          </div>

          <!-- CENTER STAGE -->
          <div class="center-stage">
            <div class="bike-container">
              <div class="shadow" style="width: 75%; bottom: 10px; left: 50%;"></div>
              <img class="van-img" src="http://localhost:5173/bike_studio_3d.png" style="height: 315px; width: auto;" />
              <svg viewBox="0 0 1376 768" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;">
                <defs>
                  <clipPath id="bikeClip2">
                    <rect x="935" y="75" width="230" height="205" rx="14" />
                  </clipPath>
                  <linearGradient id="roofShadow2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(15, 23, 42, 0.3)" />
                    <stop offset="100%" stop-color="transparent" />
                  </linearGradient>
                </defs>
                <g clip-path="url(#bikeClip2)">
                  <rect x="935" y="75" width="230" height="205" fill="rgba(216, 180, 254, 0.28)" />
                  ${Array.from({ length: 3 }).map((_, c) => {
                    const cw = 230 / 3;
                    const x = 935 + c * cw;
                    return Array.from({ length: 2 }).map((_, r) => {
                      const rh = 205 / 2;
                      const y = 75 + r * rh;
                      return `
                        <rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${rh - 2}" rx="3"
                          fill="rgba(196, 148, 252, 0.48)" stroke="rgba(126, 34, 206, 0.38)" stroke-width="1" />
                        <line x1="${x + 4}" y1="${y + rh * 0.45}" x2="${x + cw - 4}" y2="${y + rh * 0.45}"
                          stroke="rgba(147, 51, 234, 0.25)" stroke-width="1" />
                      `;
                    }).join('');
                  }).join('')}
                  <rect x="935" y="75" width="230" height="28" fill="url(#roofShadow2)" />
                  <rect x="935" y="75" width="230" height="205" rx="14" fill="none" stroke="rgba(126, 34, 206, 0.55)" stroke-width="1.5" />
                </g>
              </svg>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="right-col">
            <div style="display: grid; grid-template-columns: 112px 1fr; gap: 10px; height: 145px;">
              <div class="card right-card" style="background: #ECFDF5; height: 145px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-weight: 700; font-size: 20px; color: #047857;">44h</div>
                <div style="font-size: 10px; color: #059669;">37% of 120h</div>
              </div>
              <div class="card right-card" style="background: #FFFBEB; height: 145px; padding: 12px;">
                <div style="font-weight: 700; font-size: 12px; color: #0F172A;">Box Temperature</div>
                <div style="font-size: 9.5px; color: #64748B;">20.0–24.0 °C safe transit band</div>
                <div style="font-size: 20px; font-weight: 700; color: #0F172A; margin-top: 18px; text-align: center;">21.7 °C</div>
              </div>
            </div>
            <div class="card right-card" style="height: 177px; padding: 14px;">
              <div style="font-weight: 700; font-size: 13px; color: #0F172A;">Expiry Horizon</div>
              <div style="font-size: 15px; font-weight: 700; color: #0F172A; margin-top: 4px;">49u expire within 36 h</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 600));
  const shotPath = path.join(ARTIFACT_DIR, 'vehicle_depth_overlap_test.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved vehicle_depth_overlap_test.png');
  await browser.close();
}

main().catch(console.error);
