import React, { useState, useRef, useEffect } from 'react';
import { LEDGER_TOKENS } from './tokens';

export interface PopoverProps {
  content: React.ReactNode;
  children: React.ReactNode;
  trigger?: 'hover' | 'click';
  align?: 'left' | 'center' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const Popover: React.FC<PopoverProps> = ({
  content,
  children,
  trigger = 'hover',
  align = 'center',
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger !== 'click' || !isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, trigger]);

  return (
    <div
      ref={containerRef}
      className={`ledger-popover-container ${className}`}
      data-testid="ledger-popover-container"
      onMouseEnter={() => trigger === 'hover' && setIsOpen(true)}
      onMouseLeave={() => trigger === 'hover' && setIsOpen(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        ...style,
      }}
    >
      <div
        onClick={() => trigger === 'click' && setIsOpen(!isOpen)}
        style={{ cursor: trigger === 'click' ? 'pointer' : 'default' }}
      >
        {children}
      </div>

      {isOpen && (
        <div
          role="tooltip"
          data-testid="ledger-popover-content"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: align === 'left' ? '0' : align === 'center' ? '50%' : 'auto',
            right: align === 'right' ? '0' : 'auto',
            transform: align === 'center' ? 'translateX(-50%)' : 'none',
            maxWidth: '240px', // max 240 px per Section 3
            background: '#FFFFFF',
            color: LEDGER_TOKENS.ink,
            border: `1px solid ${LEDGER_TOKENS.hairline}`,
            borderRadius: LEDGER_TOKENS.radius.md, // radius 6
            boxShadow: LEDGER_TOKENS.shadow.pop, // --shadow-pop
            padding: '6px 10px',
            fontSize: LEDGER_TOKENS.type.t12,
            fontWeight: 400,
            fontFamily: LEDGER_TOKENS.fontUi,
            lineHeight: 1.35,
            zIndex: 100,
            whiteSpace: 'normal',
            pointerEvents: trigger === 'click' ? 'auto' : 'none',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

