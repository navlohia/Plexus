import React from 'react';
import { COCKPIT_TOKENS } from './tokens';

export interface FlowMetrics {
  outdateRatePct: number;
  totalReceived: number;
  issuedUnits: number;
  sentUnits: number;
  expiredUnits: number;
  networkComparisonText?: string;
  hasSurplus?: boolean;
}

export interface FlowBarProps {
  metrics?: FlowMetrics;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const FlowBar: React.FC<FlowBarProps> = ({
  metrics = {
    outdateRatePct: 7.8,
    totalReceived: 340,
    issuedUnits: 285,
    sentUnits: 32,
    expiredUnits: 23,
    networkComparisonText: 'Network baseline derived from 30-day mesh history',
    hasSurplus: false,
  },
  isLoading = false,
  className = '',
  style,
}) => {
  if (isLoading) {
    return (
      <div
        className={`cockpit-flow-bar ${className}`}
        data-testid="cockpit-flow-bar"
        style={{
          background: COCKPIT_TOKENS.surfaces.cardBg,
          borderRadius: COCKPIT_TOKENS.radii.card,
          boxShadow: COCKPIT_TOKENS.shadows.card,
          border: COCKPIT_TOKENS.hairlines.default,
          padding: '24px 28px',
          ...style,
        }}
      >
        <div className="cockpit-skeleton" style={{ width: '140px', height: '18px', marginBottom: '12px' }} />
        <div className="cockpit-skeleton" style={{ width: '100px', height: '48px', marginBottom: '16px' }} />
        <div className="cockpit-skeleton" style={{ width: '100%', height: '16px', borderRadius: '8px' }} />
      </div>
    );
  }

  const totalOutgoing = metrics.issuedUnits + metrics.sentUnits + metrics.expiredUnits || 1;
  const issuedPct = Math.round((metrics.issuedUnits / totalOutgoing) * 100);
  const sentPct = Math.round((metrics.sentUnits / totalOutgoing) * 100);
  const expiredPct = Math.max(0, 100 - issuedPct - sentPct);

  return (
    <div
      className={`cockpit-flow-bar ${className}`}
      data-testid="stock-flow-card"
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...style,
      }}
    >
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: COCKPIT_TOKENS.ink.muted, letterSpacing: '0.04em' }}>
          30-day disposition flow
        </div>
        {/* Outdate Rate as Dominant Headline */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
          <span
            data-testid="outdate-rate-headline"
            style={{
              fontSize: '44px',
              lineHeight: '44px',
              fontWeight: 800,
              fontFamily: COCKPIT_TOKENS.fonts.display,
              color: metrics.outdateRatePct > 10 ? COCKPIT_TOKENS.status.red.text : COCKPIT_TOKENS.status.green.text,
              letterSpacing: '-0.02em',
            }}
          >
            {metrics.outdateRatePct.toFixed(1)}%
          </span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: COCKPIT_TOKENS.ink.secondary }}>
            Outdate rate
          </span>
        </div>
        {metrics.networkComparisonText && (
          <div style={{ fontSize: '12px', color: COCKPIT_TOKENS.ink.muted, marginTop: '2px' }}>
            {metrics.networkComparisonText}
          </div>
        )}
      </div>

      {/* ONE Stacked Bar: issued green, sent lavender #8B5CF6, expired red per Section 7 */}
      <div>
        <div
          data-testid="stacked-flow-bar"
          style={{
            height: '16px',
            borderRadius: '8px',
            display: 'flex',
            overflow: 'hidden',
            background: 'rgba(20, 27, 45, 0.08)',
          }}
        >
          <div
            title={`Issued to clinical patients: ${issuedPct}% (${metrics.issuedUnits}u)`}
            style={{ width: `${issuedPct}%`, background: COCKPIT_TOKENS.status.green.solid, transition: 'width 0.4s ease' }}
          />
          <div
            title={`Transferred via Plexus: ${sentPct}% (${metrics.sentUnits}u)`}
            style={{ width: `${sentPct}%`, background: COCKPIT_TOKENS.lavender[500], transition: 'width 0.4s ease' }}
          />
          <div
            title={`Expired / QC Outdate: ${expiredPct}% (${metrics.expiredUnits}u)`}
            style={{ width: `${expiredPct}%`, background: COCKPIT_TOKENS.status.red.solid, transition: 'width 0.4s ease' }}
          />
        </div>

        {/* Legend with 3 Numbers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '12px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: COCKPIT_TOKENS.status.green.solid }} />
            <span style={{ color: COCKPIT_TOKENS.ink.secondary }}>
              Issued: <strong style={{ color: COCKPIT_TOKENS.ink.primary }}>{metrics.issuedUnits}u</strong> ({issuedPct}%)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: COCKPIT_TOKENS.lavender[500] }} />
            <span style={{ color: COCKPIT_TOKENS.ink.secondary }}>
              Sent: <strong style={{ color: COCKPIT_TOKENS.ink.primary }}>{metrics.sentUnits}u</strong> ({sentPct}%)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: COCKPIT_TOKENS.status.red.solid }} />
            <span style={{ color: COCKPIT_TOKENS.ink.secondary }}>
              Expired: <strong style={{ color: COCKPIT_TOKENS.ink.primary }}>{metrics.expiredUnits}u</strong> ({expiredPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Inline Surplus notice when no surplus is available per Section 7 */}
      {metrics.hasSurplus === false && (
        <div
          data-testid="flow-surplus-none"
          style={{
            fontSize: '13px',
            color: COCKPIT_TOKENS.ink.muted,
            paddingTop: '10px',
            borderTop: '1px solid rgba(20, 27, 45, 0.08)',
          }}
        >
          Nothing at risk of expiring.
        </div>
      )}

      {/* Footnote "Simulated data." per Section 7 */}
      <div style={{ fontSize: '11px', color: COCKPIT_TOKENS.ink.subtle, paddingTop: '4px', borderTop: '1px solid rgba(20, 27, 45, 0.05)' }}>
        Simulated data.
      </div>
    </div>
  );
};
