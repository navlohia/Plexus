import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Helper
  const shot = async (url, vp, filename, delayMs = 1200) => {
    await page.setViewport(vp);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, delayMs));
    const outPath = path.join(ARTIFACT_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Captured ${filename} (${vp.width}x${vp.height})`);
  };

  // 1. Today Screen
  await shot('/#/hospital/AIM/today', { width: 1440, height: 900 }, 'today_r5_1440.png');
  await shot('/#/hospital/AIM/today', { width: 390, height: 844 }, 'today_r5_390.png');

  // Mobile pass viewports for Today
  await shot('/#/hospital/AIM/today', { width: 360, height: 780 }, 'mobile_today_360.png');
  await shot('/#/hospital/AIM/today', { width: 430, height: 932 }, 'mobile_today_430.png');

  // 2. Requests Screen
  await shot('/#/hospital/AIM/requests', { width: 1440, height: 900 }, 'requests_r5_1440.png');
  await shot('/#/hospital/AIM/requests', { width: 390, height: 844 }, 'requests_r5_390.png');

  // 3. Tracking Screen
  await shot('/#/hospital/AIM/requests/TX-0412', { width: 1440, height: 900 }, 'tracking_r5_1440.png');
  await shot('/#/hospital/AIM/requests/TX-0412', { width: 390, height: 844 }, 'tracking_r5_390.png');

  // 4. Stock Screen
  await shot('/#/hospital/AIM/stock', { width: 1440, height: 900 }, 'stock_r5_1440.png');
  await shot('/#/hospital/AIM/stock', { width: 390, height: 844 }, 'stock_r5_390.png');

  // 5. Dispatch Orders Table
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  const card1440 = await page.$('[data-testid="orders-table-card"]');
  if (card1440) {
    await card1440.screenshot({ path: path.join(ARTIFACT_DIR, 'dispatch_table_r5_1440.png') });
    console.log('Captured dispatch_table_r5_1440.png');
  }

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));
  const card390 = await page.$('[data-testid="orders-table-card"]');
  if (card390) {
    await card390.screenshot({ path: path.join(ARTIFACT_DIR, 'dispatch_table_r5_390.png') });
    console.log('Captured dispatch_table_r5_390.png');
  }

  // 6. Command Palette
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'command_palette_r5_1440.png') });
  console.log('Captured command_palette_r5_1440.png');

  await browser.close();
  console.log('=== ALL R5 SCREENSHOTS CAPTURED ===');
}

capture().catch(console.error);

