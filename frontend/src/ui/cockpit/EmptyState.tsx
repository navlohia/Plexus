import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { CheckCircle2, Search, ArrowRight } from 'lucide-react';

export type EmptyStateVariant = 'first_time' | 'no_results' | 'all_caught_up';

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  what?: string;
  why?: string;
  whatNext?: string;
  actionLabel?: string;
  onAction?: () => void;
  showGhostPreview?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'all_caught_up',
  what,
  why,
  whatNext,
  actionLabel,
  onAction,
  showGhostPreview = true,
  className = '',
  style,
}) => {
  const getDefaultContent = () => {
    switch (variant) {
      case 'first_time':
        return {
          what: 'No transfer requests yet',
          why: 'Hospital has not created any platelet allocations today.',
          whatNext: 'Request units from the 25-hospital mesh.',
          action: 'Request platelets',
          icon: <ArrowRight size={18} />,
        };
      case 'no_results':
        return {
          what: 'No matching transfers found',
          why: 'Filter criteria yielded zero matching records.',
          whatNext: 'Reset query filters to view all activity.',
          action: 'Clear filters',
          icon: <Search size={16} />,
        };
      case 'all_caught_up':
      default:
        return {
          what: 'All transfers completed',
          why: 'No outstanding deliveries or surplus collections in progress.',
          whatNext: 'Mesh is monitoring blood bank buffer levels.',
          action: 'Refresh status',
          icon: <CheckCircle2 size={18} color={COCKPIT_TOKENS.status.green.text} />,
        };
    }
  };

  const defaults = getDefaultContent();
  const displayWhat = what || defaults.what;
  const displayWhy = why || defaults.why;
  const displayWhatNext = whatNext || defaults.whatNext;
  const displayAction = actionLabel || defaults.action;

  return (
    <div
      className={`cockpit-empty-state cockpit-empty-${variant} ${className}`}
      data-testid="cockpit-empty-state"
      data-variant={variant}
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '12px',
        maxHeight: '160px',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Visual Icon / Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {defaults.icon}
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
          {displayWhat}
        </h4>
      </div>

      {/* Answer What, Why & What Next in under 15 words per Section 9 */}
      <p style={{ margin: 0, fontSize: '12.5px', color: COCKPIT_TOKENS.ink.muted, maxWidth: '420px', lineHeight: 1.4 }}>
        {displayWhy} {displayWhatNext}
      </p>

      {/* Action Button */}
      {onAction && (
        <button
          type="button"
          data-testid="empty-state-action-btn"
          onClick={onAction}
          style={{
            minHeight: '44px',
            padding: '0 16px',
            borderRadius: COCKPIT_TOKENS.radii.sm,
            background: COCKPIT_TOKENS.surfaces.pageBg,
            border: COCKPIT_TOKENS.hairlines.default,
            color: COCKPIT_TOKENS.ink.primary,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background 0.15s ease',
          }}
        >
          {displayAction}
        </button>
      )}

      {/* Ghost Preview Wireframe behind per Section 9 */}
      {showGhostPreview && variant !== 'all_caught_up' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-12px',
            left: '20px',
            right: '20px',
            height: '24px',
            borderTop: '1px dashed rgba(20, 27, 45, 0.12)',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

