import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export interface PropertyItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export interface PropertiesProps {
  items: PropertyItem[];
  className?: string;
  style?: React.CSSProperties;
}

export const Properties: React.FC<PropertiesProps> = ({
  items,
  className = '',
  style,
}) => {
  return (
    <div
      className={`ledger-properties ${className}`}
      data-testid="ledger-properties"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        ...style,
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          className="ledger-property-row"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            padding: '10px 0',
            borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, // hairlines between rows
            fontSize: LEDGER_TOKENS.type.t14,
            lineHeight: 1.4,
          }}
        >
          {/* Label: 13, ink-3, 140 px width per Section 3 */}
          <span
            style={{
              width: '140px',
              flexShrink: 0,
              fontSize: '13px',
              fontWeight: 400,
              color: LEDGER_TOKENS.ink3,
              fontFamily: LEDGER_TOKENS.fontUi,
            }}
          >
            {item.label}
          </span>

          {/* Value: 14, ink, flex-1 */}
          <span
            style={{
              flex: 1,
              fontSize: LEDGER_TOKENS.type.t14,
              color: LEDGER_TOKENS.ink,
              fontFamily: item.mono ? LEDGER_TOKENS.fontMono : LEDGER_TOKENS.fontUi,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

