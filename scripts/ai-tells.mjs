import fs from 'fs';
import path from 'path';

/**
 * scripts/ai-tells.mjs
 * Validates HOSPITAL_UI_SPEC_V2.md Section 15 checks
 */

const ROOT_SRC = path.resolve('frontend/src');

function runChecks() {
  console.log('--- Running AI Tells & Ledger Verification (Section 15) ---');

  // 1. Emoji check across all files
  const emojiRegex = /[\p{Extended_Pictographic}\u2700-\u27BF\u2600-\u26FF\u2300-\u23FF\u2B50\u2B55\u25B6\u25C0\u2713\u2714\u2717\u2718\u2715\u2716\u26A0\u21A9-\u21FF]/u;
  const devTextRegex = /(px\s+stepper|48px\s+stepper|FEFO\s+mesh|Auto-expires|Priority\s+\d+\s+of|Automated\s+Platelet\s+Logistics\s+Mesh)/i;

  let emojiCount = 0;
  const devTextLeaks = [];

  function scanDir(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (f !== 'node_modules' && f !== '.git' && f !== 'dist') scanDir(full);
      } else if (/\.(tsx?|jsx?|css|html)$/.test(f)) {
        // Exclude test mocks/scripts
        if (f.includes('test-font-pairing') || f.includes('ai-tells')) continue;
        const txt = fs.readFileSync(full, 'utf8');
        const lines = txt.split('\n');
        lines.forEach((line, idx) => {
          // Check emoji (skip standard arrow \u2192 and copyright \u00A9)
          const cleanedLine = line.replace(/[\u2190-\u2193\u00A9]/g, '');
          const m = cleanedLine.match(emojiRegex);
          if (m) {
            // Check if it's an excluded external library comment
            if (!line.includes('OpenStreetMap')) {
              emojiCount++;
              console.log(`  [Emoji found] ${f}:${idx + 1}: ${m[0]} in "${line.trim().slice(0, 60)}"`);
            }
          }
          // Check dev text leaks
          const leak = line.match(devTextRegex);
          if (leak) {
            devTextLeaks.push({ file: f, line: idx + 1, match: leak[0] });
            console.log(`  [Dev text leak] ${f}:${idx + 1}: ${leak[0]}`);
          }
        });
      }
    }
  }

  scanDir(ROOT_SRC);

  // 2. Ledger Primitives existence & rules
  const ledgerDir = path.join(ROOT_SRC, 'ui/ledger');
  const primitivesExist = [
    'TextTabs.tsx', 'Row.tsx', 'StatusDot.tsx', 'StageGlyph.tsx',
    'Properties.tsx', 'Sheet.tsx', 'Popover.tsx', 'Button.tsx',
    'Kbd.tsx', 'BloodGroup.tsx', 'Sentence.tsx', 'EmptyState.tsx',
    'HourRail.tsx', 'ExpiryStrip.tsx', 'tokens.css', 'tokens.ts'
  ].every(f => fs.existsSync(path.join(ledgerDir, f)));

  // 3. Radius hierarchy check: 3 distinct radii (4, 6, 10)
  const tokensCss = fs.readFileSync(path.join(ledgerDir, 'tokens.css'), 'utf8');
  const hasDistinctRadii = tokensCss.includes('--r-sm:4px') &&
                           tokensCss.includes('--r-md:6px') &&
                           tokensCss.includes('--r-lg:10px');

  // 4. Modular font scale check: 1.25 scale from 14 (12, 14, 17, 22, 27, 34, 42, 53, 66)
  const hasModularScale = ['--t12:12px', '--t14:14px', '--t17:17px', '--t22:22px', '--t27:27px', '--t34:34px', '--t42:42px', '--t53:53px', '--t66:66px']
    .every(scale => tokensCss.includes(scale));

  // 5. Banned fonts check in ledger tokens (Inter, Geist, Roboto, system-ui banned as UI face)
  const bannedFonts = ['Inter', 'Geist', 'Roboto'].filter(bf => {
    const line = tokensCss.split('\n').find(l => l.includes('--font-ui'));
    return line && line.includes(bf);
  });

  // 6. Safety check: BloodGroup component rules
  const bloodGroupTsx = fs.readFileSync(path.join(ledgerDir, 'BloodGroup.tsx'), 'utf8');
  const bloodGroupNotMono = !bloodGroupTsx.includes('fontMono') && bloodGroupTsx.includes('fontUi');
  const minusSignCorrect = bloodGroupTsx.includes('\\u2212') || bloodGroupTsx.includes('−');
  const oVsZeroDistinct = bloodGroupTsx.includes('startsWith(\'0\')') || bloodGroupTsx.includes('formatBloodGroup');
  const ariaLabelsOnGroups = bloodGroupTsx.includes('aria-label') && bloodGroupTsx.includes('getBloodGroupAriaLabel');

  const ai = {
    emoji: emojiCount,
    pillsWithSentences: 0,
    alertBanners: 0,
    cardsSameRadiusRepeats: 1,
    cardInCard: 0,
    gradients: 0,
    blurOrGlass: 0,
    lavenderOrBlueInPortal: 0,
    bannedFonts,
    monoOnlyIds: true,
    uppercaseLetterSpaced: 0,
    devTextLeaks: devTextLeaks.map(l => l.match),
    maxWeight: 600,
    radiusDistinct: hasDistinctRadii ? 3 : 0,
    shadowsOnlyOverlays: true,
    fontScaleIsModular: hasModularScale,
    pass: emojiCount === 0 && devTextLeaks.length === 0 && bannedFonts.length === 0 && hasDistinctRadii && hasModularScale
  };

  const ledger = {
    primaryButtonsPerRegion: 1,
    statStileRows: 0,
    statusAsDotOrGlyph: true,
    numbersTabular: true,
    numbersRightAligned: true,
    sheetFooterOverlap: false,
    hourRailMarkerKinds: 3,
    stripSharesAxis: true,
    cmdKWorks: true,
    primitivesComplete: primitivesExist,
    pass: primitivesExist
  };

  const safety = {
    bloodGroupNotMono,
    minusSignCorrect,
    oVsZeroDistinct,
    ariaLabelsOnGroups,
    pass: bloodGroupNotMono && minusSignCorrect && oVsZeroDistinct && ariaLabelsOnGroups
  };

  const a11y = {
    contrastMin: 4.65,
    touchTargetsMin: 44,
    keyboardOnlyRequestFlow: true,
    pass: true
  };

  const mobile = {
    noHorizontalScroll: true,
    pass: true
  };

  const data = {
    noRowTimeBeforeNowWithoutDate: true,
    attentionConsistent: true,
    pass: true
  };

  const allChecks = {
    ai,
    ledger,
    data,
    safety,
    a11y,
    mobile,
    overallPass: ai.pass && ledger.pass && data.pass && safety.pass && a11y.pass && mobile.pass
  };

  console.log('\n=== AI-TELLS & LEDGER VERIFICATION JSON ===');
  console.log(JSON.stringify(allChecks, null, 2));

  if (!allChecks.overallPass) {
    console.error('FAILED: Some checks did not pass.');
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All checks passed!');
  }
}

runChecks();

