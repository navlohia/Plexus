import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export interface SentenceProps {
  headline: string; // Max 9 words
  subline?: string; // Max 12 words
  action?: React.ReactNode;
  secondaryLines?: { dotColor?: string; text: string; onClick?: () => void }[];
  className?: string;
  style?: React.CSSProperties;
}

export const Sentence: React.FC<SentenceProps> = ({
  headline,
  subline,
  action,
  secondaryLines = [],
  className = '',
  style,
}) => {
  return (
    <div
      className={`ledger-sentence-wrapper ${className}`}
      data-testid="ledger-sentence"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '24px',
        ...style,
      }}
    >
      {/* Display headline: bold Inter sans-serif */}
      <h1
        className="ledger-headline"
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '36px',
          lineHeight: '42px',
          fontWeight: 700,
          color: '#0F172A',
          letterSpacing: '-0.03em',
        }}
      >
        {headline}
      </h1>

      {/* Subline: 17/24 ink-2 + action */}
      {(subline || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '2px',
          }}
        >
          {subline && (
            <p
              style={{
                margin: 0,
                fontFamily: LEDGER_TOKENS.fontUi,
                fontSize: LEDGER_TOKENS.type.t17,
                lineHeight: '24px',
                color: LEDGER_TOKENS.ink2,
              }}
            >
              {subline}
            </p>
          )}
          {action && <div style={{ display: 'inline-flex', alignItems: 'center' }}>{action}</div>}
        </div>
      )}

      {/* Secondary "also" lines: at most 2, ● text → with state dot (no pills, no boxes per Spec 6) */}
      {secondaryLines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
          {secondaryLines.slice(0, 2).map((line, idx) => (
            <div
              key={idx}
              onClick={line.onClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: LEDGER_TOKENS.type.t14,
                color: LEDGER_TOKENS.ink2,
                cursor: line.onClick ? 'pointer' : 'default',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: line.dotColor || LEDGER_TOKENS.bad,
                }}
              />
              <span>{line.text}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .ledger-headline {
            font-size: 42px !important;
            line-height: 46px !important;
          }
        }
        @media (max-width: 768px) {
          .ledger-headline {
            font-size: 34px !important;
            line-height: 38px !important;
          }
        }
      `}</style>
    </div>
  );
};

