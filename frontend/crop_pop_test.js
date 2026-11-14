import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function crop() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 500, height: 380, deviceScaleFactor: 1 },
  });

  const page = await browser.newPage();

  for (const p of ['0_310', '0_320', '0_335']) {
    const fullImgPath = path.join(artifactDir, `fracture_swarm_progress_${p}.png`);
    const base64Data = fs.readFileSync(fullImgPath).toString('base64');
    const dataUri = `data:image/png;base64,${base64Data}`;

    // Platelet is at x=893, y=414 on 1440x900.
    // Center at (250, 190): left offset = 250 - 893 = -643px, top offset = 190 - 414 = -224px.
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; overflow: hidden; background: #fff;">
          <img src="${dataUri}" style="position: absolute; left: -643px; top: -224px; width: 1440px; height: 900px;" />
        </body>
      </html>
    `;
    await page.setContent(html);
    await new Promise((r) => setTimeout(r, 200));
    const outPath = path.join(artifactDir, `pop_test_crop_${p}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved exact pop crop with data URI: ${outPath}`);
  }

  await browser.close();
}

crop().catch(console.error);
