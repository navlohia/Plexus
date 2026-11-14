import fs from 'fs';
import path from 'path';

const dir = 'frontend/src/portal';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const f of files) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf-8').split('\n');
  lines.forEach((line, idx) => {
    // Check for blue keywords or hexes
    if (/\bblue\b|#2563EB|#3B82F6|#1D4ED8|#60A5FA|#93C5FD|#BFDBFE|#EFF6FF|#1E40AF/i.test(line)) {
      console.log(`${f}:${idx + 1}: ${line.trim()}`);
    }
  });
}
