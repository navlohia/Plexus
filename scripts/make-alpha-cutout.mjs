import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function processImage(imageSrc, outName) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1376, height: 768 });

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; background: transparent;">
        <canvas id="c" width="1376" height="768"></canvas>
      </body>
    </html>
  `);

  const base64Data = fs.readFileSync(imageSrc).toString('base64');
  const mime = imageSrc.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
  const dataUri = `data:${mime};base64,${base64Data}`;

  const resultBase64 = await page.evaluate(async (uri) => {
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = uri;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
    });

    ctx.drawImage(img, 0, 0, 1376, 768);
    const imgData = ctx.getImageData(0, 0, 1376, 768);
    const data = imgData.data;

    // Sample corner background colors
    // We want any pixel that is near-white background to become transparent,
    // but keep white painted truck body intact.
    // Notice: background is on the outer borders (y < 80, x < 150, x > 1300, y > 650)
    // flood fill or color keying from top-left corner (0,0)
    const w = 1376;
    const h = 768;
    const visited = new Uint8Array(w * h);
    const queue = [];

    // Push all 4 border edges into queue
    for (let x = 0; x < w; x++) {
      queue.push(x, 0);
      queue.push(x, h - 1);
      visited[x] = 1;
      visited[(h - 1) * w + x] = 1;
    }
    for (let y = 0; y < h; y++) {
      queue.push(0, y);
      queue.push(w - 1, y);
      visited[y * w] = 1;
      visited[y * w + (w - 1)] = 1;
    }

    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // If this pixel is part of the light studio backdrop:
      // In studio photo, backdrop is very light grey/white (r > 218, g > 218, b > 218, with low color saturation)
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const diff = maxC - minC;

      // Studio floor/backdrop has diff <= 12 and minC >= 210
      // Tires or wheels or truck metal have either diff > 15 or minC < 200
      if (minC >= 210 && diff <= 14) {
        // Fade to alpha based on brightness
        // pixels with minC >= 248 -> completely transparent (alpha = 0)
        // pixels between 210 and 248 -> soft feathered edge
        if (minC >= 246) {
          data[idx + 3] = 0;
        } else {
          const alphaFactor = (246 - minC) / (246 - 210);
          data[idx + 3] = Math.round(alphaFactor * 180);
        }

        // Check 4 neighbors
        const neighbors = [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nIdx = ny * w + nx;
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  }, dataUri);

  const cleanBase64 = resultBase64.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(ARTIFACT_DIR, outName), Buffer.from(cleanBase64, 'base64'));
  console.log(`Saved ${outName}`);
  await browser.close();
}

async function run() {
  await processImage('frontend/public/van_studio_3d.png', 'van_studio_alpha.png');
  await processImage('frontend/public/bike_studio_3d.png', 'bike_studio_alpha.png');
}

run().catch(console.error);

