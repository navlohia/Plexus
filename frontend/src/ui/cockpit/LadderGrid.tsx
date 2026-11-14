import React, { useState } from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { X } from 'lucide-react';

export type PlateletProductType = 'APH' | 'RDP';
export type BloodGroupCode = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export interface LadderBucketDef {
  id: string;
  label: string;
  sublabel: string;
}

export const LADDER_BUCKETS: LadderBucketDef[] = [
  { id: 'sub12', label: '< 12 h', sublabel: 'Critical' },
  { id: 'h12_36', label: '12–36 h', sublabel: 'Tight' },
  { id: 'h36_72', label: '36–72 h', sublabel: 'Safe' },
  { id: 'h72_120', label: '72–120 h', sublabel: 'Fresh' },
];

export interface LadderRowModel {
  group: BloodGroupCode;
  par: number;
  buckets: Record<string, number>; // bucketId -> units
  coverDays: number | null;
  statusWord: 'Short' | 'Low cover' | null;
  criticalNote?: string;
}

export interface LadderGridProps {
  product?: PlateletProductType;
  onProductChange?: (prod: PlateletProductType) => void;
  rows?: LadderRowModel[];
  onCellClick?: (group: BloodGroupCode, bucketId: string, units: number) => void;
  onEditPar?: (group: BloodGroupCode, newPar: number) => void;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_ROWS: LadderRowModel[] = [
  { group: 'O-', par: 5, buckets: { sub12: 2, h12_36: 0, h36_72: 0, h72_120: 0 }, coverDays: 0.0, statusWord: 'Short', criticalNote: '0.0 d cover · request or enable substitutes' },
  { group: 'O+', par: 10, buckets: { sub12: 0, h12_36: 4, h36_72: 6, h72_120: 2 }, coverDays: 3.2, statusWord: null },
  { group: 'A-', par: 4, buckets: { sub12: 0, h12_36: 0, h36_72: 2, h72_120: 0 }, coverDays: 1.2, statusWord: 'Low cover' },
  { group: 'A+', par: 8, buckets: { sub12: 0, h12_36: 2, h36_72: 4, h72_120: 4 }, coverDays: 2.8, statusWord: null },
  { group: 'B-', par: 4, buckets: { sub12: 0, h12_36: 0, h36_72: 0, h72_120: 2 }, coverDays: null, statusWord: null },
  { group: 'B+', par: 8, buckets: { sub12: 0, h12_36: 2, h36_72: 5, h72_120: 3 }, coverDays: 3.0, statusWord: null },
  { group: 'AB-', par: 2, buckets: { sub12: 0, h12_36: 0, h36_72: 0, h72_120: 1 }, coverDays: null, statusWord: null },
  { group: 'AB+', par: 3, buckets: { sub12: 0, h12_36: 0, h36_72: 2, h72_120: 1 }, coverDays: null, statusWord: null },
];

export const LadderGrid: React.FC<LadderGridProps> = ({
  product = 'APH',
  onProductChange,
  rows = DEFAULT_ROWS,
  onCellClick,
  onEditPar,
  isLoading = false,
  className = '',
  style,
}) => {
  const [editingPar, setEditingPar] = useState<{ group: BloodGroupCode; par: number } | null>(null);

  if (isLoading) {
    return (
      <div
        className={`cockpit-ladder-grid ${className}`}
        data-testid="cockpit-ladder-grid"
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
          <div className="cockpit-skeleton" style={{ width: '200px', height: '24px' }} />
          <div className="cockpit-skeleton" style={{ width: '180px', height: '36px', borderRadius: '8px' }} />
        </div>
        <div className="cockpit-skeleton" style={{ width: '100%', height: '320px', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <div
      className={`cockpit-ladder-grid ${className}`}
      data-testid="cockpit-ladder-grid"
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style,
      }}
    >
      {/* Top Header Row: Section Title + Product Segmented Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: COCKPIT_TOKENS.fonts.display,
              color: COCKPIT_TOKENS.ink.primary,
              letterSpacing: '-0.01em',
            }}
          >
            Expiry ladder
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: COCKPIT_TOKENS.ink.muted }}>
            8 blood groups × 4 shelf-life horizons. Click cell to inspect active lots.
          </p>
        </div>

        {/* Product Toggle per Section 2 & 7: "Apheresis (SDP)" and "RDP (random donor)" */}
        <div
          data-testid="product-toggle-group"
          style={{
            display: 'flex',
            background: COCKPIT_TOKENS.surfaces.pageBg,
            borderRadius: COCKPIT_TOKENS.radii.sm,
            padding: '3px',
            border: COCKPIT_TOKENS.hairlines.default,
          }}
        >
          <button
            type="button"
            data-testid="toggle-product-aph"
            onClick={() => onProductChange?.('APH')}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '6px',
              border: 'none',
              background: product === 'APH' ? COCKPIT_TOKENS.surfaces.cardBg : 'transparent',
              color: product === 'APH' ? COCKPIT_TOKENS.ink.primary : COCKPIT_TOKENS.ink.muted,
              boxShadow: product === 'APH' ? '0 1px 3px rgba(20,27,45,0.08)' : 'none',
              fontWeight: product === 'APH' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Apheresis (SDP)
          </button>
          <button
            type="button"
            data-testid="toggle-product-rdp"
            onClick={() => onProductChange?.('RDP')}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '6px',
              border: 'none',
              background: product === 'RDP' ? COCKPIT_TOKENS.surfaces.cardBg : 'transparent',
              color: product === 'RDP' ? COCKPIT_TOKENS.ink.primary : COCKPIT_TOKENS.ink.muted,
              boxShadow: product === 'RDP' ? '0 1px 3px rgba(20,27,45,0.08)' : 'none',
              fontWeight: product === 'RDP' ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            RDP (random donor)
          </button>
        </div>
      </div>

      {/* Horizontally scrollable container with sticky first column */}
      <div
        data-testid="expiry-ladder-scroll-container"
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderRadius: COCKPIT_TOKENS.radii.inner,
          border: '1px solid rgba(20, 27, 45, 0.08)',
          background: COCKPIT_TOKENS.surfaces.cardBg,
        }}
      >
        <table
          data-testid="expiry-ladder-table"
          style={{
            width: '100%',
            minWidth: '700px',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ background: COCKPIT_TOKENS.surfaces.cardBgSubtle, borderBottom: '1px solid rgba(20, 27, 45, 0.08)' }}>
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  background: COCKPIT_TOKENS.surfaces.cardBgSubtle,
                  padding: '12px 18px',
                  width: '180px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: COCKPIT_TOKENS.ink.muted,
                  boxShadow: '2px 0 6px rgba(20,27,45,0.02)',
                }}
              >
                Group · Target par
              </th>
              {LADDER_BUCKETS.map((b) => (
                <th
                  key={b.id}
                  style={{
                    padding: '12px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color:
                      b.id === 'sub12'
                        ? COCKPIT_TOKENS.status.red.text
                        : b.id === 'h12_36'
                        ? COCKPIT_TOKENS.status.amber.text
                        : COCKPIT_TOKENS.ink.muted,
                  }}
                >
                  <div>{b.label}</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 400, opacity: 0.65 }}>
                    {b.sublabel}
                  </div>
                </th>
              ))}
              <th
                style={{
                  padding: '12px 18px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: COCKPIT_TOKENS.ink.muted,
                  textAlign: 'right',
                  width: '180px',
                }}
              >
                Cover
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isCritical = row.statusWord === 'Short';

              return (
                <tr
                  key={row.group}
                  data-testid={`ladder-row-${row.group}`}
                  style={{
                    borderBottom: '1px solid rgba(20, 27, 45, 0.05)',
                    position: 'relative',
                  }}
                >
                  {/* Sticky Group + Par Level Header Column */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      background: COCKPIT_TOKENS.surfaces.cardBg,
                      padding: '10px 18px',
                      boxShadow: '2px 0 6px rgba(20,27,45,0.02)',
                      borderLeft: isCritical ? `3px solid ${COCKPIT_TOKENS.status.red.solid}` : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      {/* 20 px bold group header per Section 7 */}
                      <span
                        className="cockpit-mono"
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          fontFamily: COCKPIT_TOKENS.fonts.display,
                          color: COCKPIT_TOKENS.ink.primary,
                        }}
                      >
                        {row.group}
                      </span>

                      {/* Small "par N" tag per Section 7: click edits in a popover */}
                      <button
                        type="button"
                        data-testid={`par-level-editor-${row.group}`}
                        aria-label={`Edit target par level for ${row.group}, currently ${row.par}`}
                        onClick={() => setEditingPar({ group: row.group, par: row.par })}
                        style={{
                          minHeight: '44px',
                          padding: '4px 10px',
                          background: COCKPIT_TOKENS.surfaces.pageBg,
                          border: '1px solid rgba(20, 27, 45, 0.10)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COCKPIT_TOKENS.ink.secondary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        par {row.par}
                      </button>

                      {/* Par Editor Popover */}
                      {editingPar && editingPar.group === row.group && (
                        <div
                          data-testid={`par-popover-${row.group}`}
                          style={{
                            position: 'absolute',
                            left: '50px',
                            top: '32px',
                            zIndex: 40,
                            background: COCKPIT_TOKENS.surfaces.cardBg,
                            borderRadius: '10px',
                            boxShadow: COCKPIT_TOKENS.shadows.popover,
                            border: COCKPIT_TOKENS.hairlines.strong,
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            minWidth: '190px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: COCKPIT_TOKENS.ink.muted, letterSpacing: '0.04em' }}>
                            Target par · {row.group}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              data-testid={`decrement-par-${row.group}`}
                              aria-label={`Decrease par level for ${row.group}`}
                              onClick={() => setEditingPar({ ...editingPar, par: Math.max(1, editingPar.par - 1) })}
                              style={{
                                minWidth: '44px',
                                minHeight: '44px',
                                borderRadius: '6px',
                                border: '1px solid rgba(20, 27, 45, 0.15)',
                                background: COCKPIT_TOKENS.surfaces.pageBg,
                                color: COCKPIT_TOKENS.ink.primary,
                                fontWeight: 700,
                                fontSize: '18px',
                                cursor: 'pointer',
                              }}
                            >
                              −
                            </button>
                            <span
                              style={{
                                flex: 1,
                                textAlign: 'center',
                                fontSize: '17px',
                                fontWeight: 800,
                                fontFamily: COCKPIT_TOKENS.fonts.mono,
                                color: COCKPIT_TOKENS.ink.primary,
                              }}
                            >
                              {editingPar.par}u
                            </span>
                            <button
                              type="button"
                              data-testid={`increment-par-${row.group}`}
                              aria-label={`Increase par level for ${row.group}`}
                              onClick={() => setEditingPar({ ...editingPar, par: Math.min(30, editingPar.par + 1) })}
                              style={{
                                minWidth: '44px',
                                minHeight: '44px',
                                borderRadius: '6px',
                                border: '1px solid rgba(20, 27, 45, 0.15)',
                                background: COCKPIT_TOKENS.surfaces.pageBg,
                                color: COCKPIT_TOKENS.ink.primary,
                                fontWeight: 700,
                                fontSize: '18px',
                                cursor: 'pointer',
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <button
                              type="button"
                              data-testid={`save-par-${row.group}`}
                              onClick={() => {
                                onEditPar?.(row.group, editingPar.par);
                                setEditingPar(null);
                              }}
                              style={{
                                flex: 1,
                                minHeight: '44px',
                                borderRadius: '6px',
                                border: 'none',
                                background: COCKPIT_TOKENS.status.green.solid,
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              data-testid={`cancel-par-${row.group}`}
                              onClick={() => setEditingPar(null)}
                              style={{
                                minHeight: '44px',
                                padding: '0 12px',
                                borderRadius: '6px',
                                border: '1px solid rgba(20, 27, 45, 0.15)',
                                background: 'transparent',
                                color: COCKPIT_TOKENS.ink.muted,
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Bucket Columns with Proximity Tinting (Empty is faint dot per Section 7) */}
                  {LADDER_BUCKETS.map((b) => {
                    const units = row.buckets[b.id] || 0;
                    const hasUnits = units > 0;

                    let bg = 'transparent';
                    let text = 'rgba(20, 27, 45, 0.25)'; // Faint dot color
                    let border = '1px solid transparent';

                    if (hasUnits) {
                      if (b.id === 'sub12') {
                        bg = COCKPIT_TOKENS.status.red.bg;
                        text = COCKPIT_TOKENS.status.red.text;
                        border = `1px solid ${COCKPIT_TOKENS.status.red.border}`;
                      } else if (b.id === 'h12_36') {
                        bg = COCKPIT_TOKENS.status.amber.bg;
                        text = COCKPIT_TOKENS.status.amber.text;
                        border = `1px solid ${COCKPIT_TOKENS.status.amber.border}`;
                      } else {
                        bg = COCKPIT_TOKENS.lavender[50];
                        text = COCKPIT_TOKENS.lavender[800];
                        border = `1px solid ${COCKPIT_TOKENS.lavender[200]}`;
                      }
                    }

                    return (
                      <td key={b.id} style={{ padding: '6px 8px' }}>
                        <button
                          type="button"
                          data-testid={`ladder-cell-${row.group}-${b.id}`}
                          aria-label={`${row.group} ${b.label}: ${hasUnits ? units + ' units' : 'empty'}`}
                          onClick={() => onCellClick?.(row.group, b.id, units)}
                          style={{
                            width: '100%',
                            minHeight: '44px',
                            borderRadius: '6px',
                            background: bg,
                            border,
                            color: text,
                            fontWeight: hasUnits ? 700 : 400,
                            fontSize: hasUnits ? '13.5px' : '16px',
                            fontFamily: hasUnits ? COCKPIT_TOKENS.fonts.mono : 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: hasUnits ? 'pointer' : 'default',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {hasUnits ? `${units}u` : '·'}
                        </button>
                      </td>
                    );
                  })}

                  {/* Cover Column with Mini Cover Bar, Value or "—", and Status Word */}
                  <td style={{ padding: '8px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {row.coverDays !== null ? (
                          <div
                            style={{
                              width: '40px',
                              height: '5px',
                              borderRadius: '3px',
                              background: 'rgba(20, 27, 45, 0.08)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, (row.coverDays / 3.0) * 100)}%`,
                                height: '100%',
                                background:
                                  row.coverDays < 1.0
                                    ? COCKPIT_TOKENS.status.red.solid
                                    : row.coverDays < 2.0
                                    ? COCKPIT_TOKENS.status.amber.solid
                                    : COCKPIT_TOKENS.status.green.solid,
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                        ) : null}

                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: isCritical ? COCKPIT_TOKENS.status.red.text : COCKPIT_TOKENS.ink.primary,
                          }}
                        >
                          {row.coverDays !== null ? `${row.coverDays.toFixed(1)}d` : '—'}
                        </span>

                        {row.statusWord && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: row.statusWord === 'Short' ? COCKPIT_TOKENS.status.red.bg : COCKPIT_TOKENS.status.amber.bg,
                              color: row.statusWord === 'Short' ? COCKPIT_TOKENS.status.red.text : COCKPIT_TOKENS.status.amber.text,
                            }}
                          >
                            {row.statusWord}
                          </span>
                        )}
                      </div>

                      {/* Critical inline note replaces big pink banner per Section 7 */}
                      {row.criticalNote && (
                        <div style={{ fontSize: '11px', color: COCKPIT_TOKENS.status.red.text, fontWeight: 600 }}>
                          {row.criticalNote}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
