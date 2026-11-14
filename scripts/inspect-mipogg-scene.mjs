import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('https://mipogg.com/en/', { waitUntil: 'networkidle2' });

  // Navigate to slide 5
  await page.evaluate(() => {
    // Click slide 5 in navigation
    const navItems = Array.from(document.querySelectorAll('a, button, li, span, div'));
    const item = navItems.find(el => el.innerText && el.innerText.trim() === '5/5');
    if (item) item.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // Inspect the Three scene objects
  const sceneInfo = await page.evaluate(() => {
    // Find canvas and any Three.js or WebGL scene attached
    const info = [];
    // Traverse window or __THREE__ or common patterns
    function inspectObj(obj, depth = 0, name = '') {
      if (!obj || depth > 4) return null;
      const res = { name: obj.name || name, type: obj.type, children: [] };
      if (obj.position) {
        res.pos = [obj.position.x, obj.position.y, obj.position.z];
      }
      if (obj.children && obj.children.length) {
        res.children = obj.children.map(c => inspectObj(c, depth + 1, c.name));
      }
      return res;
    }

    // Try finding root Three scene
    // Sometimes on window or canvas.__three or similar
    return {
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, p')).map(p => p.innerText).filter(t => t && t.includes('Worldwide'))
    };
  });
  console.log('Scene Info:', sceneInfo);

  await browser.close();
}

main().catch(console.error);

