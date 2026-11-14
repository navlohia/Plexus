import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { BoardRow, BoardRowData } from './BoardRow';
import { ArrowRight } from 'lucide-react';

export interface BoardProps {
  title?: string;
  transfers?: BoardRowData[];
  maxVisible?: number;
  onViewAll?: () => void;
  onRowClick?: (row: BoardRowData) => void;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Board: React.FC<BoardProps> = ({
  title = 'Transfers in motion',
  transfers = [],
  maxVisible = 5,
  onViewAll,
  onRowClick,
  isLoading = false,
  className = '',
  style,
}) => {
  const visibleRows = transfers.slice(0, maxVisible);
  const hasMore = transfers.length > maxVisible;

  if (isLoading) {
    return (
      <div
        className={`cockpit-board ${className}`}
        data-testid="cockpit-board"
        style={{
          background: COCKPIT_TOKENS.surfaces.cardBg,
          borderRadius: COCKPIT_TOKENS.radii.card,
          boxShadow: COCKPIT_TOKENS.shadows.card,
          border: COCKPIT_TOKENS.hairlines.default,
          padding: '24px 28px',
          ...style,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div className="cockpit-skeleton" style={{ width: '160px', height: '22px' }} />
          <div className="cockpit-skeleton" style={{ width: '90px', height: '20px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="cockpit-skeleton" style={{ width: '100%', height: '52px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cockpit-board ${className}`}
      data-testid="cockpit-board"
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Board Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(20, 27, 45, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 700,
              color: COCKPIT_TOKENS.ink.primary,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </h3>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: COCKPIT_TOKENS.radii.pill,
              background: COCKPIT_TOKENS.surfaces.pageBg,
              color: COCKPIT_TOKENS.ink.muted,
            }}
          >
            {transfers.length} active
          </span>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            style={{
              minHeight: '44px',
              background: 'transparent',
              border: 'none',
              padding: '0 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: COCKPIT_TOKENS.lavender[800],
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>All requests</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Rows or Empty Board State */}
      {visibleRows.length === 0 ? (
        /* Empty Board: One quiet line "Nothing in motion" + ghost row preview + one explanatory sentence per Section 4 */
        <div data-testid="board-empty-state" style={{ padding: '16px 0 8px 0' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: COCKPIT_TOKENS.ink.primary, marginBottom: '6px' }}>
            Nothing in motion
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: COCKPIT_TOKENS.ink.muted, lineHeight: 1.4 }}>
            New platelet transfers will appear here once requested or auto-assigned by the logistics mesh.
          </p>

          {/* Ghost Preview Row */}
          <div
            aria-hidden="true"
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 90px 100px 1fr 70px auto',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 18px',
              borderRadius: '14px',
              background: 'rgba(20, 27, 45, 0.02)',
              border: '1px dashed rgba(20, 27, 45, 0.12)',
              opacity: 0.55,
            }}
          >
            <div style={{ width: 44, height: 22, background: 'rgba(20, 27, 45, 0.08)', borderRadius: 4 }} />
            <span className="cockpit-mono" style={{ fontSize: '13px', color: 'rgba(20, 27, 45, 0.4)' }}>TX-••••</span>
            <span className="cockpit-mono" style={{ fontSize: '12.5px', color: 'rgba(20, 27, 45, 0.4)' }}>••• → •••</span>
            <span style={{ fontSize: '13px', color: 'rgba(20, 27, 45, 0.4)' }}>•u •••••••</span>
            <span style={{ fontSize: '13px', color: 'rgba(20, 27, 45, 0.4)', textAlign: 'right' }}>••:••</span>
            <span style={{ fontSize: '11px', color: 'rgba(20, 27, 45, 0.4)' }}>Scheduled</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleRows.map((row) => (
            <BoardRow
              key={row.id}
              data={row}
              onClick={() => onRowClick?.(row)}
            />
          ))}

          {hasMore && onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              style={{
                minHeight: '44px',
                marginTop: '10px',
                padding: '0 10px',
                textAlign: 'center',
                background: COCKPIT_TOKENS.surfaces.pageBg,
                border: 'none',
                borderRadius: '8px',
                color: COCKPIT_TOKENS.ink.secondary,
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              + {transfers.length - maxVisible} more transfers in progress
            </button>
          )}
        </div>
      )}
    </div>
  );
};

