import React, { useState } from 'react';
import { LEDGER_TOKENS } from './tokens';
import { ChevronRight } from 'lucide-react';

export interface RowProps {
  children: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Row: React.FC<RowProps> = ({
  children,
  onClick,
  showChevron = true,
  className = '',
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`ledger-row ${className}`}
      data-testid="ledger-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '44px', // 44px high per Section 3
        minHeight: '44px',
        padding: '0 12px',
        background: isHovered && isClickable ? LEDGER_TOKENS.surface : 'transparent', // No box, hover --surface
        borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`, // 1px bottom hairline
        fontFamily: LEDGER_TOKENS.fontUi,
        fontSize: LEDGER_TOKENS.type.t14,
        color: LEDGER_TOKENS.ink,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 0.12s ease',
        outline: 'none',
        position: 'relative',
        ...style,
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {children}
      </div>

      {showChevron && isClickable && (
        <div
          aria-hidden="true"
          style={{
            marginLeft: '8px',
            color: LEDGER_TOKENS.ink3,
            opacity: isHovered ? 1 : 0, // Chevron appears on hover per Section 3
            transition: 'opacity 0.15s ease',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
};

