import React, { useState } from 'react';
import { Clock } from 'lucide-react';

// ─── Pure Vector Fallback for Van ───
export function PureVectorVanSVG({
  withXray = true,
  litCubes: _litCubes,
  isSirenStrobing,
}: {
  withXray?: boolean;
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  return (
    <svg viewBox="0 0 560 312" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="70" y="80" width="410" height="150" rx="20" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
      <path d="M70 170 L170 170 L210 90 L70 90 Z" fill="#E2E8F0" />
      <circle cx="150" cy="235" r="32" fill="#1E293B" />
      <circle cx="150" cy="235" r="14" fill="#94A3B8" />
      <circle cx="410" cy="235" r="32" fill="#1E293B" />
      <circle cx="410" cy="235" r="14" fill="#94A3B8" />
      {withXray && (
        <rect x="220" y="95" width="230" height="105" rx="8" fill="rgba(192,132,252,0.4)" stroke="#9333EA" strokeWidth="1.5" />
      )}
      {isSirenStrobing && (
        <circle cx="210" cy="74" r="8" fill="#EF4444" />
      )}
    </svg>
  );
}

// ─── Pure Vector Fallback for Bike ───
export function PureVectorBikeSVG({
  litCubes: _litCubes,
  isSirenStrobing: _isSirenStrobing,
}: {
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
}) {
  return (
    <svg viewBox="0 0 560 312" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <circle cx="140" cy="220" r="36" fill="#1E293B" />
      <circle cx="410" cy="220" r="36" fill="#1E293B" />
      <path d="M140 220 L240 180 L290 220 L410 220 L350 140 L230 140 Z" stroke="#334155" strokeWidth="8" strokeLinejoin="round" fill="none" />
      <rect x="340" y="90" width="90" height="70" rx="8" fill="rgba(192,132,252,0.45)" stroke="#9333EA" strokeWidth="2" />
    </svg>
  );
}

// ─── Studio Van Render with Purple X-Ray Overlay ───
export function StudioVanRender({
  withXray = true,
  litCubes = 12,
  isSirenStrobing,
  isCargoFlashing,
  className = '',
  style,
}: {
  withXray?: boolean;
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {!imgFailed ? (
        <img
          src="/van_studio_3d.png"
          alt="Heavy Commercial Fleet Van"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
          }}
        />
      ) : (
        <PureVectorVanSVG
          withXray={withXray}
          litCubes={litCubes}
          isSirenStrobing={isSirenStrobing}
        />
      )}

      {/* Interactive 3D Isometric Purple X-Ray Cargo Overlay */}
      <svg
        viewBox="0 0 560 312"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="vanXrayOverlayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(192,132,252,0.52)" />
            <stop offset="100%" stopColor="rgba(147,51,234,0.30)" />
          </linearGradient>
          <filter id="vanBayGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#C084FC" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* 3D Isometric Cargo Bay (6 cols × 4 rows = 24 cubes) */}
        {withXray && (
          <g
            filter="url(#vanBayGlow)"
            style={isCargoFlashing ? { filter: 'drop-shadow(0 0 16px rgba(168, 85, 247, 0.95))' } : undefined}
          >
            <rect
              x="213"
              y="81"
              width="272"
              height="119"
              rx="5"
              fill="url(#vanXrayOverlayGrad)"
              stroke="#9333EA"
              strokeWidth="1.2"
            />
            {Array.from({ length: 6 }, (_, col) => {
              const x = 217 + col * 44 + (col >= 3 ? 6 : 0);
              return Array.from({ length: 4 }, (_, row) => {
                const y = 86 + row * 26.5;
                const w = 38;
                const h = 22;
                const dx = 4;
                const dy = 3;
                const cubeIdx = col * 4 + (3 - row);
                const isLit = litCubes === undefined || cubeIdx < litCubes;

                return (
                  <g key={`${col}-${row}`}>
                    <polygon
                      points={`${x},${y + dy} ${x + dx},${y} ${x + w},${y} ${x + w - dx},${y + dy}`}
                      fill={isLit ? "#D8B4FE" : "rgba(216, 180, 254, 0.22)"}
                      stroke={isLit ? "#A855F7" : "rgba(168, 85, 247, 0.3)"}
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={`${x},${y + dy} ${x + w - dx},${y + dy} ${x + w - dx},${y + h} ${x},${y + h}`}
                      fill={isLit ? "#C084FC" : "rgba(192, 132, 252, 0.16)"}
                      stroke={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.25)"}
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={`${x + w - dx},${y + dy} ${x + w},${y} ${x + w},${y + h - dy} ${x + w - dx},${y + h}`}
                      fill={isLit ? "#9333EA" : "rgba(147, 51, 234, 0.18)"}
                      stroke={isLit ? "#7E22CE" : "rgba(126, 34, 206, 0.25)"}
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                    <line
                      x1={x + 3}
                      y1={y + dy + 3}
                      x2={x + 13}
                      y2={y + dy + 14}
                      stroke="#FFFFFF"
                      strokeWidth="1"
                      opacity={isLit ? 0.5 : 0.1}
                      strokeLinecap="round"
                    />
                  </g>
                );
              });
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Studio Bike Render with Purple Cargo Box Overlay ───
export function StudioBikeRender({
  litCubes: _litCubes = 4,
  isSirenStrobing,
  isCargoFlashing,
  className = '',
  style,
}: {
  litCubes?: number;
  isSirenStrobing?: boolean;
  isCargoFlashing?: boolean;
  isSpinning?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {!imgFailed ? (
        <img
          src="/bike_studio_3d.png"
          alt="Courier Delivery Motorcycle"
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
          }}
        />
      ) : (
        <PureVectorBikeSVG
          litCubes={_litCubes}
          isSirenStrobing={isSirenStrobing}
        />
      )}

      {/* Interactive 3D Isometric Purple X-Ray Overlay on Rear Top-Box */}
      <svg
        viewBox="0 0 560 312"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="bikeXrayOverlayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(192,132,252,0.85)" />
            <stop offset="100%" stopColor="rgba(147,51,234,0.55)" />
          </linearGradient>
          <filter id="bikeBoxGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#C084FC" floodOpacity="0.75" />
          </filter>
        </defs>

        <g filter="url(#bikeBoxGlow)" style={isCargoFlashing ? { filter: 'drop-shadow(0 0 14px rgba(168, 85, 247, 0.95))' } : undefined}>
          <rect
            x="368"
            y="98"
            width="104"
            height="82"
            rx="5"
            fill="url(#bikeXrayOverlayGrad)"
            stroke="#9333EA"
            strokeWidth="1.2"
          />
          {Array.from({ length: 2 }, (_, col) => {
            const x = 376 + col * 48;
            return Array.from({ length: 2 }, (_, row) => {
              const y = 106 + row * 34;
              return (
                <g key={`${col}-${row}`}>
                  <polygon
                    points={`${x},${y + 4} ${x + 6},${y} ${x + 40},${y} ${x + 34},${y + 4}`}
                    fill="#D8B4FE"
                    stroke="#A855F7"
                    strokeWidth="0.8"
                  />
                  <polygon
                    points={`${x},${y + 4} ${x + 34},${y + 4} ${x + 34},${y + 26} ${x},${y + 26}`}
                    fill="#C084FC"
                    stroke="#9333EA"
                    strokeWidth="0.8"
                  />
                  <polygon
                    points={`${x + 34},${y + 4} ${x + 40},${y} ${x + 40},${y + 22} ${x + 34},${y + 26}`}
                    fill="#9333EA"
                    stroke="#7E22CE"
                    strokeWidth="0.8"
                  />
                </g>
              );
            });
          })}
        </g>
      </svg>
    </div>
  );
}

// ─── Miniature Vehicle Icon for Timeline & Rows ───
export function MiniVehicleIcon({
  vehicleId,
  units = 6,
  style,
}: {
  vehicleId?: string;
  units?: number;
  style?: React.CSSProperties;
}) {
  const isBike = vehicleId?.toUpperCase().includes('BIKE') || (units <= 4 && !vehicleId?.toUpperCase().includes('VAN'));
  const src = isBike ? '/bike_studio_3d.png' : '/van_studio_3d.png';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 32,
        position: 'relative',
        filter: 'drop-shadow(0 2px 4px rgba(15,23,42,0.12))',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={src}
        alt={isBike ? 'Bike' : 'Van'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}

// ─── Box Temperature Gauge SVG (20-24°C safe transit band) ───
export function GaugeSVG({ tempC = 22.0, style }: { tempC?: number; style?: React.CSSProperties }) {
  const r = 46;
  const cx = 80;
  const cy = 56;
  const totalAngle = 180;
  const clampedTemp = Math.max(16, Math.min(28, tempC));
  const fillPct = (clampedTemp - 16) / (28 - 16);
  const arcEnd = 180 + totalAngle * fillPct;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (fromDeg: number, toDeg: number, radius: number) => {
    const start = { x: cx + radius * Math.cos(toRad(fromDeg)), y: cy + radius * Math.sin(toRad(fromDeg)) };
    const end = { x: cx + radius * Math.cos(toRad(toDeg)), y: cy + radius * Math.sin(toRad(toDeg)) };
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
  };

  const isSafe = tempC >= 20.0 && tempC <= 24.0;
  const safeStart = 180 + 180 * (4 / 12); // 20°C
  const safeEnd = 180 + 180 * (8 / 12); // 24°C

  return (
    <svg viewBox="0 0 160 66" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 125, height: 50, ...style }}>
      <path d={arcPath(180, 360, r)} stroke="#F1F5F9" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d={arcPath(safeStart, safeEnd, r)} stroke="#BBF7D0" strokeWidth="8" fill="none" />
      <path d={arcPath(180, arcEnd, r)} stroke={isSafe ? '#86EFAC' : '#FCA5A5'} strokeWidth="8" strokeLinecap="round" fill="none" />
      {(() => {
        const nx = cx + r * Math.cos(toRad(arcEnd));
        const ny = cy + r * Math.sin(toRad(arcEnd));
        return <circle cx={nx} cy={ny} r="4.5" fill={isSafe ? '#15803D' : '#DC2626'} />;
      })()}
    </svg>
  );
}

// ─── Shelf Life Tank Wave Card ───
export function ShelfLifeTank({
  hoursRemaining = 29,
  pctOf120h = 25,
  isAmber = false,
  isRed = false,
  style,
}: {
  hoursRemaining?: number;
  pctOf120h?: number;
  isAmber?: boolean;
  isRed?: boolean;
  style?: React.CSSProperties;
}) {
  const bg = isRed ? '#FEF2F2' : isAmber ? '#FFFBEB' : '#E6F4EA';
  const waveFill = isRed ? '#FCA5A5' : isAmber ? '#FDE68A' : '#A7F3D0';
  const waveTop = isRed ? '#EF4444' : isAmber ? '#F59E0B' : '#34D399';
  const textColor = isRed ? '#B91C1C' : isAmber ? '#B45309' : '#15803D';

  const fillPct = Math.max(0.12, Math.min(0.88, pctOf120h / 100));
  const waveY = 120 * (1 - fillPct);

  return (
    <div
      style={{
        background: bg,
        borderRadius: 16,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 104,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 112 120"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        preserveAspectRatio="none"
      >
        <defs>
          <clipPath id="shelfCardClip">
            <rect x="0" y="0" width="112" height="120" rx="16" />
          </clipPath>
        </defs>
        <g clipPath="url(#shelfCardClip)">
          <rect x="0" y={waveY} width="112" height={120 - waveY} fill={waveFill} />
          <path d={`M0 ${waveY} Q28 ${waveY - 5} 56 ${waveY} Q84 ${waveY + 5} 112 ${waveY} L112 0 L0 0 Z`} fill={bg} />
          <path d={`M0 ${waveY + 1} Q28 ${waveY - 4} 56 ${waveY + 1} Q84 ${waveY + 6} 112 ${waveY + 1}`} stroke={waveTop} strokeWidth="2.5" fill="none" />
        </g>
      </svg>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <Clock size={16} color={textColor} style={{ marginBottom: 2 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono', monospace" }}>
          {hoursRemaining.toFixed(0)}h
        </div>
        <div style={{ fontSize: 10, color: textColor, fontWeight: 600 }}>
          {pctOf120h}% of 120h
        </div>
      </div>
    </div>
  );
}
