import React from 'react';
import { LEDGER_TOKENS } from './tokens';
import { Button } from './Button';

export interface EmptyStateProps {
  headline: string; // One line
  explanation?: string; // Under 15 words
  actionLabel?: string;
  onAction?: () => void;
  showGhostPreview?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  headline,
  explanation,
  actionLabel,
  onAction,
  showGhostPreview = true,
  className = '',
  style,
}) => {
  return (
    <div
      className={`ledger-empty-state ${className}`}
      data-testid="ledger-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start', // Left-aligned text only per Section 3
        textAlign: 'left',
        gap: '8px',
        padding: '24px 0',
        ...style,
      }}
    >
      {/* Headline: 14/600 ink */}
      <div
        style={{
          fontFamily: LEDGER_TOKENS.fontUi,
          fontSize: LEDGER_TOKENS.type.t14,
          fontWeight: 600,
          color: LEDGER_TOKENS.ink,
        }}
      >
        {headline}
      </div>

      {/* Explanation & Action: in under 15 words */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {explanation && (
          <span
            style={{
              fontFamily: LEDGER_TOKENS.fontUi,
              fontSize: '13px',
              color: LEDGER_TOKENS.ink3,
              lineHeight: 1.4,
            }}
          >
            {explanation}
          </span>
        )}
        {actionLabel && onAction && (
          <Button variant="text" onClick={onAction}>
            {actionLabel} →
          </Button>
        )}
      </div>

      {/* Ghost preview of what will appear (Linear-style dashed hairline ghost row) */}
      {showGhostPreview && (
        <div
          aria-hidden="true"
          data-testid="ledger-ghost-preview"
          style={{
            marginTop: '12px',
            width: '100%',
            height: '44px',
            borderBottom: `1px dashed ${LEDGER_TOKENS.hairlineStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px',
            opacity: 0.45,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: LEDGER_TOKENS.hairlineStrong }} />
            <span style={{ width: '60px', height: '10px', borderRadius: '2px', background: LEDGER_TOKENS.hairlineStrong }} />
            <span style={{ width: '120px', height: '10px', borderRadius: '2px', background: LEDGER_TOKENS.hairline }} />
          </div>
          <span style={{ width: '40px', height: '10px', borderRadius: '2px', background: LEDGER_TOKENS.hairline }} />
        </div>
      )}
    </div>
  );
};

