import fs from 'fs';

async function main() {
  const urls = [
    'https://mipogg.com/assets/SceneSwitcher.5a5b3da5.js',
    'https://mipogg.com/assets/liquid.9f07a8d9.js',
    'https://mipogg.com/assets/index.69075134.js',
    'https://mipogg.com/assets/index.40de06b0.js',
    'https://mipogg.com/assets/index.5ddee5ef.js',
    'https://mipogg.com/assets/app.424f28da.js'
  ];

  for (const u of urls) {
    try {
      const text = await fetch(u).then(r => r.text());
      const keywords = ['scene', 'camera', 'mesh', 'sphere', 'worldwide', 'rotation', 'orbit', 'particles'];
      const found = {};
      for (const k of keywords) {
        const count = (text.match(new RegExp(k, 'gi')) || []).length;
        if (count > 0) found[k] = count;
      }
      console.log(u, found);
      // If mesh or camera is high, let's search for snippets
      if (found.mesh > 5 || found.sphere > 5) {
        // Find where sphere or mesh is used
        const idx = text.indexOf('Sphere');
        if (idx !== -1) {
          console.log('Snippet around Sphere in', u, ':\n', text.slice(Math.max(0, idx - 150), idx + 350));
        }
      }
    } catch (e) {
      console.error(u, e.message);
    }
  }
}

main().catch(console.error);

