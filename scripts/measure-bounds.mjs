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

  const vanBounds = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/van_studio_3d.png';
    await new Promise(r => img.onload = r);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Find non-white/non-transparent bounding box
    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        // studio bg is white/very light grey > 248
        if (a > 30 && (r < 240 || g < 240 || b < 240)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  });

  const bikeBounds = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/bike_studio_3d.png';
    await new Promise(r => img.onload = r);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a > 30 && (r < 240 || g < 240 || b < 240)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  });

  console.log('Van bounds:', vanBounds);
  console.log('Bike bounds:', bikeBounds);
  await browser.close();
}

main().catch(console.error);

