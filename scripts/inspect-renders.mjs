import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 700 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 24px; background: #E4E5EC; font-family: sans-serif;">
        <h2>Studio Vehicle Renders</h2>
        <div style="display: flex; gap: 20px;">
          <div style="background: white; border-radius: 12px; padding: 16px; width: 500px;">
            <h4>Van (VAN-04)</h4>
            <img src="http://localhost:5173/van_studio_3d.png" style="width: 100%; border-radius: 8px; display: block;" />
          </div>
          <div style="background: white; border-radius: 12px; padding: 16px; width: 500px;">
            <h4>Bike (BIKE-02)</h4>
            <img src="http://localhost:5173/bike_studio_3d.png" style="width: 100%; border-radius: 8px; display: block;" />
          </div>
        </div>
      </body>
    </html>
  `);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/test_studio_renders.png' });
  await browser.close();
  console.log('Saved test_studio_renders.png');
}

main().catch(console.error);
