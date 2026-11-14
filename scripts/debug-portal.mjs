import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/hospital/AIM/today', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Finding button...');
  const btn = await page.$('[data-testid="header-request-platelets-btn"]');
  console.log('Clicking button...');
  await page.evaluate(el => el.click(), btn);
  console.log('Clicked button!');

  await new Promise(r => setTimeout(r, 1000));
  const modal = await page.$('[data-testid="request-platelets-modal"]');
  console.log('Modal visible:', !!modal);

  const groupO = await page.$('[data-testid="blood-group-O-"]');
  console.log('Group O- visible:', !!groupO);
  if (groupO) await page.evaluate(el => el.click(), groupO);

  const preset4 = await page.$('[data-testid="preset-unit-4"]');
  console.log('Preset 4 visible:', !!preset4);
  if (preset4) await page.evaluate(el => el.click(), preset4);

  const urgentBtn = await page.$('[data-testid="urgency-urgent"]');
  console.log('Urgent btn visible:', !!urgentBtn);
  if (urgentBtn) await page.evaluate(el => el.click(), urgentBtn);

  const submitBtn = await page.$('[data-testid="submit-platelet-request-btn"]');
  console.log('Submit btn visible:', !!submitBtn);
  if (submitBtn) await page.evaluate(el => el.click(), submitBtn);

  await new Promise(r => setTimeout(r, 1500));
  console.log('New URL:', page.url());

  await browser.close();
  console.log('Finished debug test!');
}

main().catch(console.error);
