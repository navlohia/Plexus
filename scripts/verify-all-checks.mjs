import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Navigate to dispatch page to ensure full DOM mounts for dispatch & dashboard checks
  await page.goto(`${BASE_URL}/#/workspace/dispatch`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const storyChecks = await page.evaluate(() => {
    return window.__story?.checks ? window.__story.checks() : null;
  });

  const worldChecks = await page.evaluate(() => {
    return window.__world?.checks ? window.__world.checks() : null;
  });

  console.log('=== FULL STORY CHECKS ===');
  console.log(JSON.stringify(storyChecks, null, 2));

  console.log('=== FULL WORLD CHECKS ===');
  console.log(JSON.stringify(worldChecks, null, 2));

  await browser.close();
}

main().catch(console.error);

