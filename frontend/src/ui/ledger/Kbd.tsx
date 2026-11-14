import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Kbd: React.FC<KbdProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <kbd
      className={`ledger-kbd ${className}`}
      data-testid="ledger-kbd"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 5px',
        minWidth: '18px',
        height: '18px',
        fontFamily: LEDGER_TOKENS.fontMono,
        fontSize: LEDGER_TOKENS.type.t12,
        fontWeight: 500,
        color: LEDGER_TOKENS.ink2,
        background: LEDGER_TOKENS.surface,
        border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
        borderRadius: LEDGER_TOKENS.radius.sm,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        userSelect: 'none',
        ...style,
      }}
    >
      {children}
    </kbd>
  );
};

