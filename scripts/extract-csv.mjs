import puppeteer from 'puppeteer-core';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/#/workspace/dispatch', { waitUntil: 'networkidle0' });
  const csvText = await page.evaluate(() => {
    // We can directly click export button and catch the csv content or construct it from store
    const store = window.useDispatchStore.getState();
    const orders = store.orders;
    const headers = [
      'Order ID',
      'Product',
      'Units',
      'Blood Group',
      'Origin Name',
      'Origin Code',
      'Destination Name',
      'Destination Code',
      'Courier Name',
      'Vehicle ID',
      'Distance (km)',
      'ETA',
      'Status',
      'Temp (°C)',
      'Agitation Off (min)',
    ];
    const rows = orders.map((o) => [
      o.id,
      o.product,
      o.units,
      o.group,
      `"${o.fromName.replace(/"/g, '""')}"`,
      o.from,
      `"${o.toName.replace(/"/g, '""')}"`,
      o.to,
      `"${o.courier.name.replace(/"/g, '""')}"`,
      o.vehicleId,
      o.distanceKm,
      o.etaTime,
      o.status,
      o.coldChain.tempC,
      o.coldChain.agitationOffMin,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  });
  console.log('--- CSV OUTPUT (FIRST 4 LINES) ---');
  console.log(csvText.split('\n').slice(0, 4).join('\n'));
  await browser.close();
}

test().catch(console.error);

