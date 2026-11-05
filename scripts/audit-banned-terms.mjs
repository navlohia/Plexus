import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const banned = ['Ambulance', 'Rapido', 'FEFO Match', '🚑', '🏍️'];
const files = walk('frontend/src');
let found = 0;
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  banned.forEach((b) => {
    if (content.includes(b)) {
      console.log(`Found "${b}" in ${f}`);
      found++;
    }
  });
}
if (found === 0) console.log('Clean! Zero banned terms found.');

