import React from 'react';
import { COCKPIT_TOKENS } from './tokens';

export interface MiniStatRow {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'ok' | 'risk' | 'short' | 'neutral';
}

export interface StatMiniProps {
  rows?: [MiniStatRow, MiniStatRow];
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StatMini: React.FC<StatMiniProps> = ({
  rows = [
    { label: 'Expiring < 36 h', value: '0u', subtext: 'Safe buffer', tone: 'ok' },
    { label: 'Verified inventory', value: '14:02', subtext: 'In-charge checked', tone: 'neutral' },
  ],
  isLoading = false,
  className = '',
  style,
}) => {
  if (isLoading) {
    return (
      <div
        className={`cockpit-stat-mini ${className}`}
        data-testid="cockpit-stat-mini"
        style={{
          background: COCKPIT_TOKENS.surfaces.cardBg,
          borderRadius: COCKPIT_TOKENS.radii.card,
          boxShadow: COCKPIT_TOKENS.shadows.card,
          border: COCKPIT_TOKENS.hairlines.default,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          ...style,
        }}
      >
        <div>
          <div className="cockpit-skeleton" style={{ width: '80px', height: '14px', marginBottom: '8px' }} />
          <div className="cockpit-skeleton" style={{ width: '120px', height: '24px' }} />
        </div>
        <div style={{ height: '1px', background: 'rgba(20, 27, 45, 0.08)' }} />
        <div>
          <div className="cockpit-skeleton" style={{ width: '100px', height: '14px', marginBottom: '8px' }} />
          <div className="cockpit-skeleton" style={{ width: '110px', height: '24px' }} />
        </div>
      </div>
    );
  }

  const getToneColor = (tone?: string) => {
    switch (tone) {
      case 'risk':
        return COCKPIT_TOKENS.status.amber.text;
      case 'short':
        return COCKPIT_TOKENS.status.red.text;
      case 'ok':
        return COCKPIT_TOKENS.status.green.text;
      case 'neutral':
      default:
        return COCKPIT_TOKENS.ink.primary;
    }
  };

  return (
    <div
      className={`cockpit-stat-mini ${className}`}
      data-testid="cockpit-stat-mini"
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        ...style,
      }}
    >
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <div
              style={{
                height: '1px',
                background: 'rgba(20, 27, 45, 0.06)',
                margin: '0 -4px',
              }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div className="cockpit-label" style={{ marginBottom: '2px' }}>
                {row.label}
              </div>
              {row.subtext && (
                <div style={{ fontSize: '11.5px', color: COCKPIT_TOKENS.ink.subtle }}>
                  {row.subtext}
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: getToneColor(row.tone),
                fontFamily: COCKPIT_TOKENS.fonts.display,
                letterSpacing: '-0.02em',
              }}
            >
              {row.value}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

