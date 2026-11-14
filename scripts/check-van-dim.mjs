import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  const info = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/van_studio_3d.png';
    await new Promise(r => img.onload = r);
    return { width: img.naturalWidth, height: img.naturalHeight };
  });

  console.log('Van dimensions:', info);
  await browser.close();
}

main().catch(console.error);

