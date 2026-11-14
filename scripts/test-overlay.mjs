import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1376, height: 768 });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Test overlaying on Van and Bike
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; background: #0F172A; display: flex; flex-direction: column; gap: 20px; padding: 20px;">
        <div style="position: relative; width: 688px; height: 384px; background: #F8FAFC; border-radius: 12px; overflow: hidden;">
          <img src="/van_studio_3d.png" style="width: 100%; height: 100%; object-fit: contain;" />
          <!-- Cargo box overlay test on Van -->
          <div style="position: absolute; left: 262px; top: 100px; width: 334px; height: 146px; border: 2px solid #9333EA; background: rgba(192, 132, 252, 0.42); border-radius: 6px;"></div>
        </div>

        <div style="position: relative; width: 688px; height: 384px; background: #F8FAFC; border-radius: 12px; overflow: hidden;">
          <img src="/bike_studio_3d.png" style="width: 100%; height: 100%; object-fit: contain;" />
          <!-- Clean tank patch removing any text/cross -->
          <div style="position: absolute; left: 254px; top: 136px; width: 50px; height: 18px; background: linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%); border-radius: 9px; opacity: 0.95;"></div>
          <!-- Top box overlay test on Bike -->
          <div style="position: absolute; left: 506px; top: 44px; width: 88px; height: 78px; border: 2px solid #9333EA; background: rgba(192, 132, 252, 0.42); border-radius: 6px;"></div>
        </div>
      </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/test_overlay_alignment2.png' });
  await browser.close();
  console.log('Saved test_overlay_alignment2.png');
}

main().catch(console.error);
