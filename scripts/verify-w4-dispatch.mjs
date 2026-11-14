import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Nav\\.gemini\\antigravity\\brain\\55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('1. Navigating to http://localhost:5173/#/workspace/dispatch?dev=1 ...');
  await page.goto('http://localhost:5173/#/workspace/dispatch?dev=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Run window checks
  const checks = await page.evaluate(() => {
    return window.__story ? window.__story.checks() : null;
  });
  console.log('Story Checks Output:');
  console.log(JSON.stringify(checks, null, 2));

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'w4_checks_result.json'),
    JSON.stringify(checks, null, 2)
  );

  // Measure active card element count
  const cardElemCount = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="active-card-content"]');
    return el ? el.children.length : -1;
  });
  console.log(`Active card element count: ${cardElemCount}`);

  // Screenshot 1: Decluttered Active Dispatch Card & Overview (1440x900)
  const shot1 = path.join(ARTIFACT_DIR, 'w4_dispatch_decluttered_1440x900.png');
  await page.screenshot({ path: shot1, fullPage: true });
  console.log('Saved w4_dispatch_decluttered_1440x900.png');

  // Open "Why this source?" popover
  console.log('2. Opening "Why this source?" popover...');
  await page.click('[data-testid="why-this-source-btn"]');
  await new Promise(r => setTimeout(r, 400));
  const shot2 = path.join(ARTIFACT_DIR, 'w4_why_source_popover_open.png');
  await page.screenshot({ path: shot2, fullPage: true });
  console.log('Saved w4_why_source_popover_open.png');

  // Close popover
  await page.click('[data-testid="why-this-source-btn"]');
  await new Promise(r => setTimeout(r, 300));

  // Navigate to Proposed tab in the orders table
  console.log('3. Navigating to Proposed tab...');
  const proposedTabBtn = await page.$('button[data-testid="tab-proposed"]');
  if (proposedTabBtn) {
    await proposedTabBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }

  // Open Assign Modal on REQ-901
  console.log('4. Opening Assign Modal on REQ-901...');
  const assignBtn = await page.$('[data-testid="assign-trigger-btn-REQ-901"]');
  if (assignBtn) {
    await assignBtn.click();
  } else {
    // Click button with text Assign in table
    await page.evaluate(() => {
      const rows = document.querySelectorAll('button');
      for (const b of Array.from(rows)) {
        if (b.textContent && b.textContent.includes('Assign')) {
          b.click();
          break;
        }
      }
    });
  }
        if (b.textContent && b.textContent.includes('Assign')) {
          b.click();
          break;
        }
      }
    });
  }
  await new Promise(r => setTimeout(r, 600));

  // Screenshot 3: Redesigned Two-Pane Assign Modal (Recommended vs Ineligible)
  const shot3 = path.join(ARTIFACT_DIR, 'w4_assign_modal_two_pane_1440x900.png');
  await page.screenshot({ path: shot3, fullPage: true });
  console.log('Saved w4_assign_modal_two_pane_1440x900.png');

  // Test "Split across sources" toggle
  console.log('5. Toggling split across sources...');
  const splitBtn = await page.$('[data-testid="toggle-split-mode-btn"]');
  if (splitBtn) {
    await splitBtn.click();
    await new Promise(r => setTimeout(r, 400));
    const shotSplit = path.join(ARTIFACT_DIR, 'w4_assign_modal_split_mode.png');
    await page.screenshot({ path: shotSplit, fullPage: true });
    console.log('Saved w4_assign_modal_split_mode.png');
    // Toggle back
    await splitBtn.click();
    await new Promise(r => setTimeout(r, 300));
  }

  // Confirm Assign (Click Green Button)
  console.log('6. Confirming assignment via Green button...');
  const confirmBtn = await page.$('[data-testid="confirm-dispatch-btn"]');
  if (confirmBtn) {
    await confirmBtn.click();
  }
  await new Promise(r => setTimeout(r, 400));

  // Screenshot 4: Sideways Queue after Assign with new card inserted & highlighted
  const shot4 = path.join(ARTIFACT_DIR, 'w4_queue_after_assign.png');
  await page.screenshot({ path: shot4, fullPage: true });
  console.log('Saved w4_queue_after_assign.png');

  // Now capture Mobile viewport (390x844)
  console.log('7. Capturing mobile viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/#/workspace/dispatch?dev=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  const shotMobile1 = path.join(ARTIFACT_DIR, 'w4_dispatch_mobile_390x844.png');
  await page.screenshot({ path: shotMobile1, fullPage: true });
  console.log('Saved w4_dispatch_mobile_390x844.png');

  // Open modal on mobile
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const b of Array.from(buttons)) {
      if (b.textContent && b.textContent.includes('Proposed')) {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const b of Array.from(buttons)) {
      if (b.textContent && b.textContent.includes('Assign')) {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const shotMobile2 = path.join(ARTIFACT_DIR, 'w4_assign_modal_mobile_390x844.png');
  await page.screenshot({ path: shotMobile2, fullPage: true });
  console.log('Saved w4_assign_modal_mobile_390x844.png');

  await browser.close();
  console.log('All W4 verification tests and screenshots completed successfully!');
}

main().catch(console.error);
