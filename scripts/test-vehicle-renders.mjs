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

  // Load test page with the dashboard background #F2F3F7
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            margin: 0;
            background: #F2F3F7;
            font-family: sans-serif;
            padding: 40px;
          }
          .stage {
            width: 520px;
            height: 330px;
            background: transparent;
            position: relative;
            display: flex;
            align-items: flex-end;
            justifyContent: center;
            border: 1px dashed rgba(0,0,0,0.1);
          }
          .van-wrap {
            width: 100%;
            height: 100%;
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
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            width: 85%;
            height: 22px;
            border-radius: 50%;
            background: radial-gradient(50% 50% at 50% 50%, rgba(15, 23, 42, 0.32) 0%, rgba(15, 23, 42, 0.08) 55%, transparent 100%);
            filter: blur(4px);
            z-index: 1;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <h2>Van Blend & Cargo Test on #F2F3F7</h2>
        <div class="stage">
          <div class="shadow"></div>
          <div class="van-wrap">
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
                <!-- 6 cols x 4 rows cubes -->
                ${Array.from({ length: 6 }).map((_, c) => {
                  const cw = 736 / 6;
                  const x = 520 + c * cw;
                  return Array.from({ length: 4 }).map((_, r) => {
                    const rh = 360 / 4;
                    const y = 116 + r * rh;
                    return `
                      <rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${rh - 2}" rx="3"
                        fill="rgba(196, 148, 252, 0.48)" stroke="rgba(126, 34, 206, 0.38)" stroke-width="1" />
                      <!-- Box top crease / tape -->
                      <line x1="${x + 6}" y1="${y + rh * 0.4}" x2="${x + cw - 6}" y2="${y + rh * 0.4}"
                        stroke="rgba(147, 51, 234, 0.25)" stroke-width="1.2" />
                    `;
                  }).join('');
                }).join('')}
                <!-- Vertical structural T-divider down the middle -->
                <rect x="885.5" y="116" width="5" height="360" fill="#1E293B" />
                <!-- Horizontal shelf -->
                <line x1="520" y1="296" x2="1256" y2="296" stroke="#334155" stroke-width="2.5" opacity="0.6" />
                <!-- Top roof shadow -->
                <rect x="520" y="116" width="736" height="42" fill="url(#roofShadow)" />
                <!-- Outer cargo border -->
                <rect x="520" y="116" width="736" height="360" rx="4" fill="none" stroke="rgba(126, 34, 206, 0.55)" stroke-width="1.5" />
              </g>
            </svg>
          </div>
        </div>

        <h2 style="margin-top: 40px;">Bike Blend & Cargo Test on #F2F3F7</h2>
        <div class="stage" style="width: 440px; height: 315px;">
          <div class="shadow" style="width: 65%; bottom: 12px;"></div>
          <div style="width: 100%; height: 100%; position: relative;">
            <img class="van-img" src="http://localhost:5173/bike_studio_3d.png" />
            <svg viewBox="0 0 1376 768" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;">
              <defs>
                <clipPath id="bikeClip">
                  <rect x="935" y="75" width="230" height="205" rx="14" />
                </clipPath>
              </defs>
              <g clip-path="url(#bikeClip)">
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
                <rect x="935" y="75" width="230" height="25" fill="url(#roofShadow)" />
                <rect x="935" y="75" width="230" height="205" rx="14" fill="none" stroke="rgba(126, 34, 206, 0.55)" stroke-width="1.5" />
              </g>
            </svg>
          </div>
        </div>
      </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 600));
  const shotPath = path.join(ARTIFACT_DIR, 'vehicle_blend_cargo_test.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved vehicle_blend_cargo_test.png');
  await browser.close();
}

main().catch(console.error);

