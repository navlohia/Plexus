import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { BloodGroup } from '../../world/types';
import { ArrowRight } from 'lucide-react';

export interface StockGlanceItem {
  group: BloodGroup;
  usableUnits: number;
  coverDays: number | null;
  isCritical: boolean;
  isLowCover: boolean;
}

export interface StockGlanceProps {
  groups: StockGlanceItem[];
  onOpenStock?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StockGlance: React.FC<StockGlanceProps> = ({
  groups,
  onOpenStock,
  className = '',
  style,
}) => {
  return (
    <div
      className={`cockpit-stock-glance ${className}`}
      data-testid="cockpit-stock-glance"
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onOpenStock ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
      onClick={onOpenStock}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(20, 27, 45, 0.06)',
        }}
      >
        <span className="cockpit-label">Stock glance</span>
        {onOpenStock && (
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: COCKPIT_TOKENS.lavender[800],
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Ladder <ArrowRight size={13} />
          </span>
        )}
      </div>

      {/* 8-Group Strip */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {groups.map((item) => {
          const maxCover = 3.5;
          const fillPct =
            item.coverDays !== null
              ? Math.min(100, Math.max(10, (item.coverDays / maxCover) * 100))
              : 8;

          const barColor = item.isCritical
            ? COCKPIT_TOKENS.status.red.solid
            : item.isLowCover
            ? COCKPIT_TOKENS.status.amber.solid
            : item.coverDays !== null
            ? COCKPIT_TOKENS.status.green.solid
            : 'rgba(20, 27, 45, 0.15)';

          return (
            <div
              key={item.group}
              data-testid={`stock-glance-row-${item.group}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              {/* Group Code */}
              <span
                className="cockpit-mono"
                style={{
                  width: '28px',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: item.isCritical ? COCKPIT_TOKENS.status.red.text : COCKPIT_TOKENS.ink.primary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                {item.group}
                {item.isCritical && (
                  <span
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: COCKPIT_TOKENS.status.red.solid,
                      display: 'inline-block',
                    }}
                  />
                )}
              </span>

              {/* Units */}
              <span
                style={{
                  width: '24px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: item.usableUnits === 0 ? COCKPIT_TOKENS.ink.muted : COCKPIT_TOKENS.ink.primary,
                }}
              >
                {item.usableUnits}u
              </span>

              {/* Cover Bar */}
              <div
                style={{
                  flex: 1,
                  height: '5px',
                  background: 'rgba(20, 27, 45, 0.06)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${fillPct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Cover Number / Dash */}
              <span
                style={{
                  width: '32px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: item.isCritical
                    ? COCKPIT_TOKENS.status.red.text
                    : item.isLowCover
                    ? COCKPIT_TOKENS.status.amber.text
                    : COCKPIT_TOKENS.ink.muted,
                }}
              >
                {item.coverDays !== null ? `${item.coverDays.toFixed(1)}d` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
