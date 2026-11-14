import fs from 'fs';

let content = fs.readFileSync('frontend/src/components/workspace/MoveonDashboard.tsx', 'utf8');

// 1. Header bar styling
content = content.replace(
  `<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#18181B', letterSpacing: '-0.01em' }}>Transfer orders</span>`,
  `<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#18181B', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Transfer orders</span>`
);

content = content.replace(
  `{/* Status tabs using Ledger TextTabs primitive */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>`,
  `{/* Status tabs using Ledger TextTabs primitive */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>`
);

content = content.replace(
  `{/* Action buttons (CSV & Filter) */}
              <div style={{ display: 'flex', gap: 6, position: 'relative' }}>`,
  `{/* Action buttons (CSV & Filter) */}
              <div style={{ display: 'flex', gap: 6, position: 'relative', flexShrink: 0 }}>`
);

// 2. Proposed columns
content = content.replace(
  `activeTab === 'proposed'
                        ? '85px 135px 145px 80px 85px 1fr'`,
  `activeTab === 'proposed'
                        ? '120px 115px 140px 75px 85px 1fr'`
);

content = content.replace(
  `gridTemplateColumns: '85px 135px 145px 80px 85px 1fr',`,
  `gridTemplateColumns: '120px 115px 140px 75px 85px 1fr',`
);

content = content.replace(
  `<span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 500, color: '#18181B' }}>
                                  #{req.id}
                                </span>`,
  `<span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 500, color: '#18181B', whiteSpace: 'nowrap' }}>
                                  #{req.id}
                                </span>`
);

content = content.replace(
  `<span style={{ fontSize: 11, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {HOSPITAL_DIRECTORY[req.targetHospital]?.name?.split(' ')[0] || req.targetHospital}
                                </span>`,
  `{HOSPITAL_DIRECTORY[req.targetHospital]?.name?.split(' ')[0] && HOSPITAL_DIRECTORY[req.targetHospital]?.name?.split(' ')[0] !== req.targetHospital && (
                                  <span style={{ fontSize: 11, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {HOSPITAL_DIRECTORY[req.targetHospital].name.split(' ')[0]}
                                  </span>
                                )}`
);

fs.writeFileSync('frontend/src/components/workspace/MoveonDashboard.tsx', content, 'utf8');
console.log('Applied polish adjustments to MoveonDashboard.tsx!');

