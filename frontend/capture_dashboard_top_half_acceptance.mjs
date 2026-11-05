import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';
const docsDir = 'C:\\Blood Bank\\docs';

const ordersToCapture = [
  { id: 'TX-0412', name: 'in_transit' },
  { id: 'TX-1044', name: 'proposed' },
  { id: 'TX-1042', name: 'exception' },
];

async function capture() {
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const { id, name } of ordersToCapture) {
    // 1440x900
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));

      // Select order via store
      await page.evaluate((orderId) => {
        window.__dispatchStore?.getState().selectOrder(orderId);
      }, id);
      await new Promise(r => setTimeout(r, 400));

      const fileName = `dashboard_top_half_1440x900_${name}.png`;
      const artPath = path.join(artifactDir, fileName);
      const docPath = path.join(docsDir, fileName);

      await page.screenshot({ path: artPath, fullPage: false });
      fs.copyFileSync(artPath, docPath);
      console.log(`Saved 1440x900 ${name} (${id}) -> ${artPath}`);
      await page.close();
    }

    // 390x844 (Mobile)
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
      await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 600));

      // Select order via store
      await page.evaluate((orderId) => {
        window.__dispatchStore?.getState().selectOrder(orderId);
      }, id);
      await new Promise(r => setTimeout(r, 400));

      const fileName = `dashboard_top_half_390x844_${name}.png`;
      const artPath = path.join(artifactDir, fileName);
      const docPath = path.join(docsDir, fileName);

      await page.screenshot({ path: artPath, fullPage: false });
      fs.copyFileSync(artPath, docPath);
      console.log(`Saved 390x844 ${name} (${id}) -> ${artPath}`);
      await page.close();
    }
  }

  await browser.close();
  console.log('Acceptance screenshot capture complete.');
}

capture().catch(console.error);

