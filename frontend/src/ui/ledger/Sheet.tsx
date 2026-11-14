import React, { useEffect, useRef } from 'react';
import { LEDGER_TOKENS } from './tokens';
import { Button } from './Button';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerSummary?: React.ReactNode;
  footerActionLabel?: string;
  onFooterAction?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerSummary,
  footerActionLabel,
  onFooterAction,
  isSubmitting = false,
  className = '',
}) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="ledger-sheet-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'rgba(20, 23, 28, 0.3)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className={`ledger-sheet ${className}`}
        data-testid="ledger-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px', // 440 px per Section 3
          maxWidth: '100vw',
          height: '100vh',
          background: '#FFFFFF',
          borderRadius: '16px 0 0 16px',
          boxShadow: '-16px 0 48px rgba(15, 23, 42, 0.08)',
          borderLeft: '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
          color: LEDGER_TOKENS.ink,
        }}
      >
        {/* Mobile hairline drag handle per Section 13 */}
        <div
          className="ledger-sheet-handle"
          aria-hidden="true"
          style={{
            display: 'none',
            width: '36px',
            height: '4px',
            background: LEDGER_TOKENS.hairlineStrong,
            borderRadius: '2px',
            margin: '8px auto 0 auto',
            flexShrink: 0,
          }}
        />

        {/* Header: 56 px high per Section 3 */}
        <div
          style={{
            height: '56px',
            minHeight: '56px',
            padding: '0 24px',
            borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: LEDGER_TOKENS.type.t17, fontWeight: 600 }}>{title}</h2>
            {subtitle && (
              <span style={{ fontSize: LEDGER_TOKENS.type.t12, color: LEDGER_TOKENS.ink3 }}>
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Close sheet"
            onClick={onClose}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: LEDGER_TOKENS.radius.sm,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: LEDGER_TOKENS.ink3,
            }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrolling Body: with padding-bottom 104px per Section 3 */}
        <div
          data-testid="ledger-sheet-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingBottom: '104px', // The footer must never overlap content
          }}
        >
          {children}
        </div>

        {/* Sticky 72 px Footer: holding a one-line summary and the primary button */}
        {(footerSummary || footerActionLabel) && (
          <div
            data-testid="ledger-sheet-footer"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '72px', // sticky 72 px footer
              borderTop: '1px solid rgba(15, 23, 42, 0.08)',
              background: '#FFFFFF',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                fontSize: LEDGER_TOKENS.type.t13 || '13px',
                color: LEDGER_TOKENS.ink2,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
                flex: 1,
              }}
            >
              {footerSummary}
            </div>
            {footerActionLabel && onFooterAction && (
              <Button
                variant="primary"
                data-testid="submit-platelet-request-btn"
                onClick={onFooterAction}
                disabled={isSubmitting}
                style={{ height: '44px', minHeight: '44px', padding: '0 20px', borderRadius: 999 }}
              >
                {footerActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .ledger-sheet {
            width: 100vw !important;
            max-width: 100vw !important;
            border-radius: 12px 12px 0 0 !important;
            border-left: none !important;
            border-top: 1px solid ${LEDGER_TOKENS.hairline} !important;
          }
          .ledger-sheet-handle {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

