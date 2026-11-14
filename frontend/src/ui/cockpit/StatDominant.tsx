import React from 'react';
import { COCKPIT_TOKENS } from './tokens';

export interface StatDominantProps {
  label?: string;
  value?: string | number;
  subtext?: string;
  tone?: 'ok' | 'short' | 'risk' | 'neutral';
  sparklineData?: number[];
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StatDominant: React.FC<StatDominantProps> = ({
  label = 'Net position',
  value = '+11u',
  subtext = '16u usable · 17u expected demand · 12u incoming',
  tone = 'ok',
  sparklineData = [14, 15, 13, 16, 17, 19, 18],
  isLoading = false,
  className = '',
  style,
}) => {
  const getToneColor = () => {
    switch (tone) {
      case 'short':
        return COCKPIT_TOKENS.status.red.text;
      case 'risk':
        return COCKPIT_TOKENS.status.amber.text;
      case 'ok':
        return COCKPIT_TOKENS.status.green.text;
      case 'neutral':
      default:
        return COCKPIT_TOKENS.ink.primary;
    }
  };

  if (isLoading) {
    return (
      <div
        className={`cockpit-stat-dominant cockpit-stat-loading ${className}`}
        data-testid="cockpit-stat-dominant"
        style={{
          background: COCKPIT_TOKENS.surfaces.cardBg,
          borderRadius: COCKPIT_TOKENS.radii.card,
          boxShadow: COCKPIT_TOKENS.shadows.card,
          border: COCKPIT_TOKENS.hairlines.default,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '160px',
          ...style,
        }}
      >
        <div className="cockpit-skeleton" style={{ width: '100px', height: '16px' }} />
        <div className="cockpit-skeleton" style={{ width: '130px', height: '56px', margin: '12px 0' }} />
        <div className="cockpit-skeleton" style={{ width: '85%', height: '14px' }} />
      </div>
    );
  }

  // Generate lightweight SVG sparkline
  const minVal = Math.min(...sparklineData, 0);
  const maxVal = Math.max(...sparklineData, 20);
  const range = maxVal - minVal || 1;
  const width = 80;
  const height = 28;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      className={`cockpit-stat-dominant ${className}`}
      data-testid="cockpit-stat-dominant"
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '24px 26px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
    >
      {/* Top Sentence-Case Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="cockpit-label">{label}</span>
        {/* Tiny 36h Outlook Sparkline */}
        {sparklineData.length > 1 && (
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <polyline
              fill="none"
              stroke={COCKPIT_TOKENS.lavender[500]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        )}
      </div>

      {/* Dominant Stat Numeral (Scale 56/56 per Section 2) */}
      <div
        style={{
          fontSize: '52px',
          lineHeight: '56px',
          fontWeight: 700,
          fontFamily: COCKPIT_TOKENS.fonts.display,
          color: getToneColor(),
          letterSpacing: '-0.03em',
          margin: '12px 0 8px 0',
        }}
      >
        {value}
      </div>

      {/* Sub-line / context */}
      <div style={{ fontSize: '13px', lineHeight: '18px', color: COCKPIT_TOKENS.ink.muted }}>
        {subtext}
      </div>
    </div>
  );
};

