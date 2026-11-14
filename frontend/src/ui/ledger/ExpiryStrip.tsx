import React, { useState } from 'react';
import { LEDGER_TOKENS } from './tokens';
import { BloodGroup } from './BloodGroup';
import { Popover } from './Popover';
import { TextTabs } from './TextTabs';

export interface ExpiryBin {
  binIndex: number; // 0 to 23 (each bin is 5 h, total 120 h)
  hoursRange: string; // e.g. "0–5 h", "25–30 h"
  units: number;
}

export interface ExpiryRowData {
  group: string; // e.g. "O-", "O+", etc.
  parLevel: number;
  bins: ExpiryBin[]; // 24 bins of 5 h
  totalUnits: number;
  coverDays: number | null; // null if demand < 0.2u/d
  isCritical?: boolean;
}

export interface ExpiryStripProps {
  rows: ExpiryRowData[];
  selectedProduct?: 'APH' | 'RDP';
  onProductChange?: (prod: 'APH' | 'RDP') => void;
  onParChange?: (group: string, newPar: number) => void;
  onBinClick?: (group: string, bin: ExpiryBin) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ExpiryStrip: React.FC<ExpiryStripProps> = ({
  rows,
  selectedProduct = 'APH',
  onProductChange,
  onParChange,
  onBinClick,
  className = '',
  style,
}) => {
  const [editingParVal, setEditingParVal] = useState<number>(4);

  // Find max bin units across all groups to normalize bar heights
  const maxBinUnits = Math.max(
    1,
    ...rows.flatMap((r) => r.bins.map((b) => b.units))
  );

  return (
    <div
      className={`ledger-expiry-strip-container ${className}`}
      data-testid="ledger-expiry-strip"
      style={{
        width: '100%',
        fontFamily: LEDGER_TOKENS.fontUi,
        color: LEDGER_TOKENS.ink,
        ...style,
      }}
    >
      {/* Product Toggle as TextTabs per Section 4.2 */}
      {onProductChange && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: LEDGER_TOKENS.ink2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Shelf-life distribution (0–120 h)
          </div>
          <TextTabs
            tabs={[
              { id: 'APH', label: 'Apheresis (SDP)' },
              { id: 'RDP', label: 'RDP (random donor)' },
            ]}
            activeTab={selectedProduct}
            onChange={(id) => onProductChange(id as 'APH' | 'RDP')}
          />
        </div>
      )}

      {/* Shared Axis Header above rows: labels 0, 12 h, 36 h, 72 h, 120 h */}
      <div
        data-testid="expiry-strip-shared-axis"
        className="ledger-expiry-axis"
        style={{
          padding: '0 8px 6px 8px',
          borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
          fontSize: LEDGER_TOKENS.type.t12,
          color: LEDGER_TOKENS.ink3,
        }}
      >
        <div className="ledger-expiry-axis-header-row" style={{ display: 'contents' }}>
          <span>Blood group</span>
          <div className="ledger-expiry-axis-markers" style={{ position: 'relative', width: '100%', height: '16px' }}>
            <span style={{ position: 'absolute', left: '0' }}>0</span>
            <span style={{ position: 'absolute', left: `${(12 / 120) * 100}%`, transform: 'translateX(-50%)' }}>12 h</span>
            <span style={{ position: 'absolute', left: `${(36 / 120) * 100}%`, transform: 'translateX(-50%)' }}>36 h</span>
            <span style={{ position: 'absolute', left: `${(72 / 120) * 100}%`, transform: 'translateX(-50%)' }}>72 h</span>
            <span style={{ position: 'absolute', right: '0' }}>120 h</span>
          </div>
          <div className="ledger-expiry-axis-totals" style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
            <span>Units</span>
            <span style={{ width: '48px', textAlign: 'right' }}>Cover</span>
          </div>
        </div>
      </div>

      {/* Expiry Strip Rows: 56 px high on desktop, two-line on mobile */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row) => {
          const isShortOrLow = row.isCritical || (row.coverDays !== null && row.coverDays < 1.5);

          return (
            <div
              key={row.group}
              data-testid={`expiry-row-${row.group}`}
              className="ledger-expiry-row"
              style={{
                borderBottom: `1px solid ${LEDGER_TOKENS.hairline}`,
                background: 'transparent',
              }}
            >
              {/* Row Top / Desktop Left & Right: Group on Left, Units/Cover on Right */}
              <div className="ledger-expiry-row-top" style={{ display: 'contents' }}>
                {/* Left: Group (17/600) + par (13/400 ink-3) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isShortOrLow && (
                    <span
                      aria-label="Critical low cover or shortage"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: LEDGER_TOKENS.bad,
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <BloodGroup group={row.group} size={17} />

                  {/* Par N button with popover editor */}
                  <Popover
                    trigger="click"
                    content={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
                        <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink3 }}>Target par level:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingParVal((p) => Math.max(1, p - 1))}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: `1px solid ${LEDGER_TOKENS.hairlineStrong}` }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {editingParVal}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingParVal((p) => Math.min(30, p + 1))}
                            style={{ width: '28px', height: '28px', borderRadius: '4px', border: `1px solid ${LEDGER_TOKENS.hairlineStrong}` }}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onParChange?.(row.group, editingParVal);
                            }}
                            style={{
                              background: LEDGER_TOKENS.primary,
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      data-testid={`par-editor-${row.group}`}
                      onClick={() => {
                        setEditingParVal(row.parLevel);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: LEDGER_TOKENS.ink3,
                        fontSize: '13px',
                        fontWeight: 400,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        minHeight: '32px',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      par {row.parLevel}
                    </button>
                  </Popover>
                </div>

                {/* Desktop Middle / Mobile Line 2: 24 bins strip */}
                <div
                  className="ledger-expiry-row-strip"
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '560px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Zone bands */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: `${(12 / 120) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(244, 63, 94, 0.12)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${(12 / 120) * 100}%`,
                      width: `${(24 / 120) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(245, 158, 11, 0.12)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${(36 / 120) * 100}%`,
                      width: `${(36 / 120) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(168, 85, 247, 0.08)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${(72 / 120) * 100}%`,
                      width: `${(48 / 120) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: 'rgba(16, 185, 129, 0.08)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* 24 Bins */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(24, 1fr)',
                      alignItems: 'flex-end',
                      gap: '1px',
                      zIndex: 1,
                    }}
                  >
                    {row.bins.map((bin) => {
                      const binHours = (bin.binIndex + 0.5) * 5;
                      const isUnder12 = binHours < 12;
                      const isUnder36 = binHours >= 12 && binHours < 36;
                      const isUnder72 = binHours >= 36 && binHours < 72;

                      const barColor = isUnder12
                        ? '#F43F5E'
                        : isUnder36
                        ? '#F59E0B'
                        : isUnder72
                        ? '#A855F7'
                        : '#10B981';

                      const barHeightPx =
                        bin.units > 0
                          ? Math.max(3, Math.round((bin.units / maxBinUnits) * 28))
                          : 0;

                      return (
                        <Popover
                          key={bin.binIndex}
                          content={`${bin.units}u · ${bin.hoursRange} left`}
                        >
                          <div
                            onClick={() => onBinClick?.(row.group, bin)}
                            style={{
                              height: '100%',
                              display: 'flex',
                              alignItems: 'flex-end',
                              cursor: bin.units > 0 ? 'pointer' : 'default',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: `${barHeightPx}px`,
                                background: barColor,
                                borderRadius: '1px 1px 0 0',
                              }}
                            />
                          </div>
                        </Popover>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Total units and cover */}
                <div
                  className="ledger-expiry-row-totals"
                  style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: '20px' }}
                >
                  <span
                    className="cockpit-mono"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: LEDGER_TOKENS.ink,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.totalUnits}u
                  </span>
                  <span
                    className="cockpit-mono"
                    style={{
                      width: '48px',
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: isShortOrLow ? 700 : 500,
                      color: isShortOrLow ? LEDGER_TOKENS.bad : LEDGER_TOKENS.ink2,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {row.coverDays !== null ? `${row.coverDays.toFixed(1)} d` : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-Line Responsive Styles per Section 13 */}
      <style>{`
        .ledger-expiry-axis {
          display: grid;
          grid-template-columns: 120px 1fr 140px;
          align-items: flex-end;
        }
        .ledger-expiry-row {
          display: grid;
          grid-template-columns: 120px 1fr 140px;
          align-items: center;
          height: 56px;
          padding: 0 8px;
        }

        @media (max-width: 680px) {
          .ledger-expiry-axis {
            display: flex !important;
            flex-direction: column !important;
            height: auto !important;
            gap: 6px !important;
            padding: 8px 4px !important;
          }
          .ledger-expiry-axis-header-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .ledger-expiry-axis-markers {
            width: 100% !important;
          }
          .ledger-expiry-row {
            display: flex !important;
            flex-direction: column !important;
            height: auto !important;
            min-height: 58px !important;
            padding: 10px 4px !important;
            gap: 8px !important;
          }
          .ledger-expiry-row-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .ledger-expiry-row-strip {
            width: 100% !important;
            max-width: 100% !important;
            height: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};
