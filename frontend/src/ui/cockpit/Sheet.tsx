import React, { useEffect } from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
  className = '',
  style,
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`cockpit-sheet-overlay ${className}`}
      data-testid="cockpit-sheet-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(20, 27, 45, 0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        transition: 'opacity 0.2s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cockpit-sheet-container"
        data-testid="cockpit-sheet"
        style={{
          width: '100%',
          maxWidth: width,
          background: COCKPIT_TOKENS.surfaces.cardBg,
          boxShadow: '0 16px 48px rgba(20, 27, 45, 0.18)',
          borderLeft: COCKPIT_TOKENS.hairlines.default,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          animation: 'cockpit-sheet-slide-in 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          ...style,
        }}
      >
        {/* Mobile Drag Handle Indicator (Visible on small screens) */}
        <div
          aria-hidden="true"
          className="cockpit-mobile-handle"
          style={{
            display: 'none',
            justifyContent: 'center',
            padding: '10px 0 2px 0',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(20, 27, 45, 0.20)',
            }}
          />
        </div>

        {/* Sheet Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid rgba(20, 27, 45, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: COCKPIT_TOKENS.surfaces.cardBg,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: COCKPIT_TOKENS.ink.primary,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: COCKPIT_TOKENS.ink.muted,
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            data-testid="close-sheet-btn"
            onClick={onClose}
            aria-label="Close sheet"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: COCKPIT_TOKENS.ink.muted,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Sheet Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {children}
        </div>

        {/* Sticky Sheet Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 28px',
              borderTop: '1px solid rgba(20, 27, 45, 0.08)',
              background: COCKPIT_TOKENS.surfaces.cardBgSubtle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cockpit-sheet-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 640px) {
          .cockpit-sheet-overlay {
            align-items: flex-end !important;
          }
          .cockpit-sheet-container {
            max-width: 100% !important;
            height: 92% !important;
            border-radius: 24px 24px 0 0 !important;
            border-left: none !important;
            border-top: 1px solid rgba(20, 27, 45, 0.12) !important;
            animation: cockpit-sheet-slide-up 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .cockpit-mobile-handle {
            display: flex !important;
          }
        }
        @keyframes cockpit-sheet-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

