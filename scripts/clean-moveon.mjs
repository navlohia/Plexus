import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/src/components/workspace/MoveonDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const searchStrCRLF = '                </div>\r\n              </div>\r\n            </div>';
const searchStrLF = '                </div>\n              </div>\n            </div>';

let searchIdx = content.indexOf(searchStrCRLF, 146707);
let searchStr = searchStrCRLF;
if (searchIdx === -1) {
  searchIdx = content.indexOf(searchStrLF, 146707);
  searchStr = searchStrLF;
}

const footnoteIdx = content.indexOf('{/* Footnote per spec 21.6 */}');

console.log('searchIdx:', searchIdx, 'footnoteIdx:', footnoteIdx);

const part1 = content.slice(0, searchIdx + searchStr.length);
const closing = '\r\n          </div>\r\n        </div>\r\n\r\n        ';
const part2 = content.slice(footnoteIdx);

const newContent = part1 + closing + part2;
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Cleaned up MoveonDashboard.tsx! Total length:', newContent.length);

