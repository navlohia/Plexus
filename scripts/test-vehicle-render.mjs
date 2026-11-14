import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Render both vehicles with 3D isometric cargo cubes inside a 600x240 box
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 24px;
            background: #E4E5EC;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .stage {
            background: radial-gradient(65% 55% at 50% 45%, #FFFFFF 0%, #FAFAFC 60%, #F1F5F9 100%);
            border-radius: 16px;
            width: 580px;
            height: 330px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(15,23,42,0.06);
          }
        </style>
      </head>
      <body>
        <div style="display: flex; gap: 24px;">
          <!-- 1. STUDIO VAN WITH PURPLE ISOMETRIC X-RAY CARGO CUBES -->
          <div class="stage">
            <div style="position: relative; width: 560px; height: 312px;">
              <img src="/van_studio_3d.png" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
              <!-- SVG X-Ray Cargo Overlay on Van (aligned with 1376x768 aspect) -->
              <svg viewBox="0 0 560 312" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                <defs>
                  <linearGradient id="vanXrayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(192,132,252,0.55)" />
                    <stop offset="100%" stop-color="rgba(147,51,234,0.32)" />
                  </linearGradient>
                </defs>
                <!-- Cargo Bay Window (x: 213, y: 81, w: 272, h: 119) -->
                <rect x="213" y="81" width="272" height="119" rx="5" fill="url(#vanXrayGrad)" stroke="#9333EA" stroke-width="1.2" />
                <!-- 6 cols x 4 rows isometric cubes -->
                ${Array.from({ length: 6 }, (_, col) => {
                  const x = 217 + col * 44 + (col >= 3 ? 6 : 0);
                  return Array.from({ length: 4 }, (_, row) => {
                    const y = 86 + row * 26.5;
                    const w = 38;
                    const h = 22;
                    const dx = 4;
                    const dy = 3;
                    const cubeIdx = col * 4 + (3 - row);
                    const isLit = cubeIdx < 12; // 12 units lit
                    return `
                      <g>
                        <polygon points="${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}"
                          fill="${isLit ? '#D8B4FE' : 'rgba(216, 180, 254, 0.22)'}"
                          stroke="${isLit ? '#A855F7' : 'rgba(168, 85, 247, 0.3)'}" stroke-width="0.8" stroke-linejoin="round" />
                        <polygon points="${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}"
                          fill="${isLit ? '#C084FC' : 'rgba(192, 132, 252, 0.16)'}"
                          stroke="${isLit ? '#9333EA' : 'rgba(147, 51, 234, 0.25)'}" stroke-width="0.8" stroke-linejoin="round" />
                        <polygon points="${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}"
                          fill="${isLit ? '#9333EA' : 'rgba(147, 51, 234, 0.18)'}"
                          stroke="${isLit ? '#7E22CE' : 'rgba(126, 34, 206, 0.25)'}" stroke-width="0.8" stroke-linejoin="round" />
                        <line x1="${x + 3}" y1="${y + dy + 3}" x2="${x + 13}" y2="${y + dy + 14}"
                          stroke="#FFFFFF" stroke-width="1" opacity="${isLit ? '0.5' : '0.1'}" stroke-linecap="round" />
                      </g>
                    `;
                  }).join('');
                }).join('')}
              </svg>
            </div>
          </div>

          <!-- 2. STUDIO BIKE WITH PURPLE ISOMETRIC X-RAY CARGO CUBES -->
          <div class="stage">
            <div style="position: relative; width: 560px; height: 312px;">
              <img src="/bike_studio_3d.png" style="width: 100%; height: 100%; object-fit: contain; display: block;" />
              <!-- SVG X-Ray Cargo Overlay on Bike -->
              <svg viewBox="0 0 560 312" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
                <defs>
                  <linearGradient id="bikeXrayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(192,132,252,0.85)" />
                    <stop offset="100%" stop-color="rgba(147,51,234,0.55)" />
                  </linearGradient>
                </defs>
                <!-- Clean Tank Specular Patch (covers any text/cross on tank) -->
                <path d="M 198 108 C 215 104 235 105 252 112 C 255 120 238 126 215 125 C 200 125 197 116 198 108 Z"
                  fill="url(#tankPatchGrad)" opacity="0.9" />
                <defs>
                  <linearGradient id="tankPatchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" />
                    <stop offset="60%" stop-color="#F1F5F9" />
                    <stop offset="100%" stop-color="#E2E8F0" />
                  </linearGradient>
                </defs>
                <!-- Cargo Box Cutaway Window (x: 412, y: 36, w: 72, h: 63) -->
                <rect x="412" y="36" width="72" height="63" rx="5" fill="url(#bikeXrayGrad)" stroke="#9333EA" stroke-width="1.2" />
                <!-- 3 cols x 2 rows isometric cubes (6u capacity) -->
                ${[
                  { col: 0, x: 416 },
                  { col: 1, x: 439 },
                  { col: 2, x: 462 },
                ].map(({ col, x }) => [0, 1].map(row => {
                  const y = row === 0 ? 40 : 68;
                  const w = 20;
                  const h = 24;
                  const dx = 2.5;
                  const dy = 2.5;
                  const cubeIdx = col * 2 + (1 - row);
                  const isLit = cubeIdx < 6; // 6 units lit
                  return `
                    <g>
                      <polygon points="${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}"
                        fill="${isLit ? '#D8B4FE' : 'rgba(216, 180, 254, 0.22)'}"
                        stroke="${isLit ? '#A855F7' : 'rgba(168, 85, 247, 0.3)'}" stroke-width="0.8" stroke-linejoin="round" />
                      <polygon points="${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}"
                        fill="${isLit ? '#C084FC' : 'rgba(192, 132, 252, 0.16)'}"
                        stroke="${isLit ? '#9333EA' : 'rgba(147, 51, 234, 0.25)'}" stroke-width="0.8" stroke-linejoin="round" />
                      <polygon points="${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}"
                        fill="${isLit ? '#9333EA' : 'rgba(147, 51, 234, 0.18)'}"
                        stroke="${isLit ? '#7E22CE' : 'rgba(126, 34, 206, 0.25)'}" stroke-width="0.8" stroke-linejoin="round" />
                      <line x1="${x + 2}" y1="${y + dy + 2}" x2="${x + 7}" y2="${y + dy + 15}"
                        stroke="#FFFFFF" stroke-width="0.9" opacity="${isLit ? '0.55' : '0.1'}" stroke-linecap="round" />
                    </g>
                  `;
                }).join('')).join('')}
              </svg>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/test_vehicle_render_result.png' });
  await browser.close();
  console.log('Saved test_vehicle_render_result.png');
}

main().catch(console.error);

