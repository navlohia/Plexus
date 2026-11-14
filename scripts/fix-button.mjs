import fs from 'fs';

let content = fs.readFileSync('frontend/src/components/workspace/MoveonDashboard.tsx', 'utf8');
const lines = content.split(/\r?\n/);

console.log('Line 4112:', lines[4112]);
console.log('Line 4113:', lines[4113]);
console.log('Line 4114:', lines[4114]);
console.log('Line 4115:', lines[4115]);

const replacementLines = [
  '                            >',
  '                              Show earlier ({filteredOrders.length - 8} more) ↓',
  '                            </button>',
  '                          )}',
  '                        </>',
  '                      );',
  '                    })()',
  '                  )}',
  '                </div>',
  '              </div>',
  '            </div>',
  '          </div>',
  '        </div>',
  '',
  '        {/* Footnote per spec 21.6 */}',
];

// Replace lines[4112..4114] with replacementLines
lines.splice(4112, 3, ...replacementLines);

fs.writeFileSync('frontend/src/components/workspace/MoveonDashboard.tsx', lines.join('\n'), 'utf8');
console.log('Successfully spliced replacement lines! New line count:', lines.length);
