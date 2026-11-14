import puppeteer from 'puppeteer-core';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  console.log('--- Testing Font Pairing Candidates (Section 2.1) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/test-font-pairing.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500)); // Allow fonts to load

  const testResults = await page.evaluate(async () => {
    // Helper to measure bounding client rect of text
    function measureText(text, font, size, isTnum) {
      const span = document.createElement('span');
      span.style.fontFamily = font;
      span.style.fontSize = size;
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.whiteSpace = 'nowrap';
      if (isTnum) {
        span.style.fontVariantNumeric = 'tabular-nums';
        span.style.fontFeatureSettings = "'tnum' 1";
      } else {
        span.style.fontVariantNumeric = 'proportional-nums';
        span.style.fontFeatureSettings = "'tnum' 0";
      }
      span.textContent = text;
      document.body.appendChild(span);
      const rect = span.getBoundingClientRect();
      document.body.removeChild(span);
      return { width: rect.width, height: rect.height };
    }

    // Helper to evaluate a candidate pair
    function evaluatePair(name, uiFont, displayFont) {
      // 1. Tabular figures test: under tnum, all digits 0-9 must have the same width
      const digitWidthsTnum = [];
      const digitWidthsPnum = [];
      for (let i = 0; i <= 9; i++) {
        digitWidthsTnum.push(measureText(String(i), uiFont, '24px', true).width);
        digitWidthsPnum.push(measureText(String(i), uiFont, '24px', false).width);
      }
      const tnumMin = Math.min(...digitWidthsTnum);
      const tnumMax = Math.max(...digitWidthsTnum);
      const tnumDiff = Math.abs(tnumMax - tnumMin);
      const pnumDiff = Math.abs(Math.max(...digitWidthsPnum) - Math.min(...digitWidthsPnum));
      const hasTabularNums = tnumDiff < 0.2; // effectively zero variance
      const tnumChangesWidth = pnumDiff > 0.5; // proportional figures vary, tabular equalizes

      // 2. Capital O vs digit 0 distinction:
      const oMeasure = measureText('O', uiFont, '32px', true);
      const zeroMeasure = measureText('0', uiFont, '32px', true);
      const widthDiff = Math.abs(oMeasure.width - zeroMeasure.width);
      // In Instrument Sans, capital O is wider (round geometric/humanist) while digit 0 is narrower and taller or oval
      const oVsZeroDistinct = widthDiff > 1.0;

      // 3. Display face lining figures test:
      // In lining figures, bottom baseline is uniform, and heights of '0' and '3' or '7' don't descend below baseline
      const dispZero = measureText('0', displayFont, '42px', true);
      const dispOne = measureText('1', displayFont, '42px', true);
      const dispSeven = measureText('7', displayFont, '42px', true);
      const dispNine = measureText('9', displayFont, '42px', true);
      // Height variance across lining digits is minimal (< 2px at 42px), unlike oldstyle figures
      const dispHeightDiff = Math.max(dispZero.height, dispOne.height, dispSeven.height, dispNine.height) -
                             Math.min(dispZero.height, dispOne.height, dispSeven.height, dispNine.height);
      const hasLiningFigures = dispHeightDiff < 2.0;

      const passesAll = hasTabularNums && oVsZeroDistinct && hasLiningFigures;

      return {
        name,
        uiFont,
        displayFont,
        tabular: {
          tnumVariance: tnumDiff.toFixed(3),
          pnumVariance: pnumDiff.toFixed(3),
          pass: hasTabularNums
        },
        oVsZero: {
          capOWidth: oMeasure.width.toFixed(2),
          digitZeroWidth: zeroMeasure.width.toFixed(2),
          difference: widthDiff.toFixed(2),
          pass: oVsZeroDistinct
        },
        displayLining: {
          heightVariance: dispHeightDiff.toFixed(2),
          pass: hasLiningFigures
        },
        pass: passesAll
      };
    }

    return {
      candidateA: evaluatePair('Candidate A', 'Instrument Sans', 'Instrument Serif'),
      candidateB: evaluatePair('Candidate B', 'Hanken Grotesk', 'Fraunces')
    };
  });

  console.log('Test Results:');
  console.log(JSON.stringify(testResults, null, 2));

  // Capture screenshot of the test page for evidence
  const screenshotPath = path.join(ARTIFACT_DIR, 'font_pairing_test_evidence.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved font pairing screenshot to:', screenshotPath);

  await browser.close();
}

main().catch(console.error);

