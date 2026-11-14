import puppeteer from 'puppeteer-core';
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
  await page.goto('http://localhost:5173/#/signin', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  // Click autofill button
  console.log('Clicking autofill button...');
  await page.click('[data-testid="autofill-test-id-btn"]');
  await new Promise(r => setTimeout(r, 300));

  const emailVal = await page.$eval('[data-testid="test-id-input"]', el => el.value);
  const passVal = await page.$eval('[data-testid="passkey-input"]', el => el.value);
  console.log('Autofilled values:', { emailVal, passVal });

  // Screenshot autofilled state
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'signin_autofilled_capture.png') });

  // Click submit
  console.log('Clicking sign-in submit...');
  await page.click('[data-testid="signin-submit-btn"]');
  await new Promise(r => setTimeout(r, 550));

  const buttonText = await page.$eval('[data-testid="signin-submit-btn"]', el => el.innerText);
  console.log('Submit button text:', buttonText);

  // Wait for transition
  await new Promise(r => setTimeout(r, 600));
  const currentUrl = page.url();
  console.log('URL after authentication:', currentUrl);

  await browser.close();
}

main().catch(console.error);

