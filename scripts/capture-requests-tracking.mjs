import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

const TARGETS = [
  { name: 'requests_active', path: '/#/hospital/AIM/requests' },
  { name: 'requests_empty', path: '/#/hospital/AIM/requests?empty=1' },
  { name: 'request_sheet_step1', path: '/#/hospital/AIM/today?new=1' },
  { name: 'request_sheet_step2', path: '/#/hospital/AIM/today?new=1&step=options' },
  { name: 'tracking_ontheway', path: '/#/hospital/AIM/requests/REQ-0901?state=on_the_way' },
  { name: 'tracking_delayed', path: '/#/hospital/AIM/requests/REQ-0901?state=delayed' },
  { name: 'tracking_coldchain', path: '/#/hospital/AIM/requests/REQ-0901?state=cold_chain' },
  { name: 'tracking_arrived', path: '/#/hospital/AIM/requests/REQ-0901?state=arrived' },
];

const RESOLUTIONS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

async function main() {
  console.log('--- Capturing Requests, Sheet & Tracking Screens ---');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();

  for (const res of RESOLUTIONS) {
    await page.setViewport({ width: res.width, height: res.height });

    for (const target of TARGETS) {
      const url = `${BASE_URL}${target.path}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      if (target.name === 'request_sheet_step2') {
        await page.evaluate(() => {
          const body = document.querySelector('[data-testid="ledger-sheet-body"]');
          if (body) {
            body.scrollTop = body.scrollHeight;
          }
        });
        await new Promise((r) => setTimeout(r, 300));
      }

      const filename = `${target.name}_${res.width}x${res.height}.png`;
      const outPath = path.join(ARTIFACT_DIR, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved: ${filename}`);
    }
  }

  // Also collect checks()
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/#/hospital/AIM/today`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const checks = await page.evaluate(async () => {
    if (window.__story && typeof window.__story.checks === 'function') {
      return await window.__story.checks();
    }
    return { error: 'window.__story.checks not available' };
  });

  console.log('\n=== window.__story.checks() RESULT ===');
  console.log(JSON.stringify(checks, null, 2));

  await browser.close();
  console.log('\nAll screenshots and checks completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
