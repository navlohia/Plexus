import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export type StatusDotVariant = 'good' | 'warn' | 'bad' | 'hollow' | 'ontime' | 'delayed' | 'alert' | 'packed';

export interface StatusDotProps {
  status?: StatusDotVariant;
  text?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusDot: React.FC<StatusDotProps> = ({
  status = 'good',
  text,
  className = '',
  style,
}) => {
  let dotColor: string = LEDGER_TOKENS.good;
  let isHollow = false;

  switch (status) {
    case 'good':
    case 'ontime':
      dotColor = LEDGER_TOKENS.good;
      break;
    case 'warn':
    case 'delayed':
      dotColor = LEDGER_TOKENS.warn;
      break;
    case 'bad':
    case 'alert':
      dotColor = LEDGER_TOKENS.bad;
      break;
    case 'hollow':
    case 'packed':
    default:
      dotColor = LEDGER_TOKENS.ink3;
      isHollow = true;
      break;
  }

  return (
    <span
      className={`ledger-status-dot ${className}`}
      data-testid="ledger-status-dot"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: LEDGER_TOKENS.type.t13 || '13px',
        fontWeight: 400,
        color: LEDGER_TOKENS.ink2,
        fontFamily: LEDGER_TOKENS.fontUi,
        lineHeight: 1.2,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          flexShrink: 0,
          background: isHollow ? 'transparent' : dotColor,
          border: isHollow ? `1.5px solid ${dotColor}` : 'none',
        }}
      />
      {text && <span>{text}</span>}
    </span>
  );
};
