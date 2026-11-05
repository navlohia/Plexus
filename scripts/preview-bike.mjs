import fs from 'fs';
import puppeteer from 'puppeteer-core';
import path from 'path';

const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #F2F3F7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; gap: 12px; }
    .card { background: white; border-radius: 12px; padding: 10px 12px; width: 180px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .id { font-size: 11px; font-weight: 700; color: #18181B; }
    .sub { font-size: 10px; font-weight: 600; color: #18181B; }
    .route { font-size: 9.5px; color: #71717A; }
    .flex { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  </style>
</head>
<body>
  <!-- Box Van Card -->
  <div class="card">
    <div class="id">#TX-1042</div>
    <div class="flex">
      <div>
        <div class="sub">Apheresis · O- · 6u</div>
        <div class="route">MDT → GTB</div>
      </div>
      <svg viewBox="0 0 72 34" fill="none" style="width: 60px; height: 28px;">
        <rect x="25" y="6" width="44" height="20" rx="2" fill="#F4F4F6" stroke="#D0D2D8" stroke-width="0.8" />
        <rect x="25" y="6" width="44" height="4" rx="2" fill="white" opacity="0.65" />
        <rect x="25" y="14" width="44" height="2" fill="#E11D48" opacity="0.7" />
        <rect x="3" y="10" width="23" height="16" rx="2" fill="#F8F8FA" stroke="#D0D2D8" stroke-width="0.8" />
        <path d="M12 11 L18 11 L22 17 L12 17 Z" fill="#93C5FD" opacity="0.8" />
        <circle cx="14" cy="27" r="4.5" fill="#252525" />
        <circle cx="14" cy="27" r="2.5" fill="#C8CBD4" />
        <circle cx="48" cy="27" r="4.5" fill="#252525" />
        <circle cx="48" cy="27" r="2.5" fill="#C8CBD4" />
        <circle cx="59" cy="27" r="4.5" fill="#252525" />
        <circle cx="59" cy="27" r="2.5" fill="#C8CBD4" />
      </svg>
    </div>
  </div>

  <!-- Bike Ambulance Card (TX-1049) -->
  <div class="card" style="border: 1px solid #C084FC;">
    <div class="id" style="color: #9333EA;">#TX-1049</div>
    <div class="flex">
      <div>
        <div class="sub">RDP · B+ · 20u</div>
        <div class="route">BLK → SGR</div>
      </div>
      <svg viewBox="0 0 72 34" fill="none" style="width: 60px; height: 28px;">
        <!-- Rear Cold Box -->
        <rect x="36" y="7" width="28" height="17" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.9" />
        <rect x="36" y="7" width="28" height="4" rx="2" fill="white" opacity="0.9" />
        <rect x="36" y="13" width="28" height="2" fill="#E11D48" opacity="0.85" />
        <rect x="47" y="16.5" width="6" height="1.8" rx="0.5" fill="#E11D48" />
        <rect x="49.1" y="14.4" width="1.8" height="6" rx="0.5" fill="#E11D48" />

        <!-- Beacon light -->
        <rect x="44" y="4.5" width="12" height="2.5" rx="1.2" fill="#1E293B" />
        <circle cx="47" cy="5.7" r="1.2" fill="#EF4444" />
        <circle cx="53" cy="5.7" r="1.2" fill="#3B82F6" />

        <!-- Chassis / Spine -->
        <path d="M22 17 Q28 13 36 13 L36 19 L26 21 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="0.8" />
        <!-- Fuel tank -->
        <path d="M19 14 Q23 10 28 10 L33 13 L26 16 Z" fill="#FFFFFF" stroke="#94A3B8" stroke-width="0.8" />
        <!-- Seat -->
        <path d="M28 13 Q32 11 36 13" stroke="#1E293B" stroke-width="3" stroke-linecap="round" />
        <!-- Front fork & Handlebar -->
        <line x1="15" y1="27" x2="20" y2="10" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" />
        <line x1="18" y1="10" x2="23" y2="8" stroke="#334155" stroke-width="2.2" stroke-linecap="round" />
        <!-- Headlight Fairing -->
        <path d="M14 17 Q17 14 19 16 L17 21 Z" fill="#F8FAFC" stroke="#64748B" stroke-width="0.8" />
        <circle cx="14" cy="18" r="2" fill="#FDE047" />

        <!-- Wheels -->
        <g>
          <!-- Front Wheel -->
          <circle cx="15" cy="27" r="6" fill="#1E293B" />
          <circle cx="15" cy="27" r="3.8" fill="#CBD5E1" />
          <circle cx="15" cy="27" r="1.8" fill="#475569" />
          <!-- Rear Wheel -->
          <circle cx="48" cy="27" r="6" fill="#1E293B" />
          <circle cx="48" cy="27" r="3.8" fill="#CBD5E1" />
          <circle cx="48" cy="27" r="1.8" fill="#475569" />
        </g>
      </svg>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scripts/preview-bike.html', html);

async function preview() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 480, height: 200, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.resolve('scripts/preview-bike.html'));
  await page.screenshot({ path: 'C:/Users/Nav/.gemini/antigravity/brain/55bf07bd-477b-452a-a2d2-c2fbaaa7cfe3/preview-bike.png' });
  await browser.close();
  console.log('Bike preview generated');
}

preview().catch(console.error);

