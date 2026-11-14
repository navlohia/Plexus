import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/components/workspace/MoveonDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const endMarker = `              )}\r\n            </div>`;
const endMarkerLF = `              )}\n            </div>`;

let idx = 0;
while (true) {
  let found = content.indexOf(endMarker, idx);
  if (found === -1) found = content.indexOf(endMarkerLF, idx);
  if (found === -1) break;
  console.log('Found endMarker at:', found);
  idx = found + 1;
}

