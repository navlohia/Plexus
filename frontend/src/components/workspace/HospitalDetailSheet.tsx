/**
 * HospitalDetailSheet.tsx
 * Standard (non-modal) side sheet redesigned per LANDING_SPEC.md (v5) Section 14.
 *
 * Anti-"AI" Rules:
 *  - Width: 392px (420px at >= 1600px), paper-raised background
 *  - 1px ink/10 left hairline, follows card corner radius
 *  - NO drop shadow, NO dark header, NO gradient
 *  - Sections separated by 1px hairlines with 24px padding
 *  - NO bordered tinted tiles, NO pill badges, NO icon-in-circle rows
 *  - NO equal-weight card grids, NO centered text, NO emoji
 *  - Hierarchy from type scale, whitespace, hairlines, and numerals
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { BloodType } from '../../types';
import { NCR_HOSPITAL_METAS } from '../../lib/hospitalTelemetry';
import type { ActiveHospitalRoute } from '../../story/routeEngine';

export interface HospitalDetailSheetProps {
  hospital: {
    id: string;
    code: string;
    short: string;
    fullName: string;
    city: string;
    coords: [number, number];
    status: 'Shortage' | '<36h Surplus' | 'Optimal';
    stock: number;
    exp36: number;
    netBalance: number;
    liveInv?: any;
    targetBaseline?: number;
    isTrauma?: boolean;
  };
  routes: ActiveHospitalRoute[];
  isCandidateMode: boolean;
  isMobile: boolean;
  onClose?: () => void;
  onCloseDrawerOnly?: () => void;
  onFullDismiss?: () => void;
  onDispatch: (targetHospitalId: string, units?: number, orderId?: string) => void;
  onFocusRoute: (route: ActiveHospitalRoute) => void;
  onHoverRoute: (routeId: string | null) => void;
}

export default function HospitalDetailSheet({
  hospital,
  routes,
  isCandidateMode,
  isMobile,
  onClose,
  onCloseDrawerOnly,
  onFullDismiss,
  onDispatch,
  onFocusRoute,
  onHoverRoute,
}: HospitalDetailSheetProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(() => routes[0]?.id || null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mobileSnapIndex, setMobileSnapIndex] = useState<0 | 1 | 2>(1); // 0=28%, 1=62%, 2=92%

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus heading on open (A11y per Spec §14)
  useEffect(() => {
    headingRef.current?.focus();
  }, [hospital.id]);

  // Keep first route selected by default
  useEffect(() => {
    if (routes.length > 0 && (!selectedRouteId || !routes.some((r) => r.id === selectedRouteId))) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  // Handle [✕] click: closes drawer only, keeps hospital selected and zoomed (Spec §3.4)
  const handleCloseDrawerOnly = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onCloseDrawerOnly) onCloseDrawerOnly();
      else if (onClose) onClose();
    }, 220);
  };

  // Handle [ESC] click or Escape key: clears hospital selection and zooms back to overview (Spec §3.4)
  const handleFullDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onFullDismiss) onFullDismiss();
      else if (onClose) onClose();
    }, 220);
  };

  // Esc key listener (A11y per Spec §14 & §3.4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleFullDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFullDismiss, onClose]);

  // Expose mobile snap control on window for Puppeteer testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setMobileSheetSnap = (idx: 0 | 1 | 2) => {
        setMobileSnapIndex(idx);
      };
      (window as any).__getMobileSheetSnap = () => mobileSnapIndex;
    }
  }, [mobileSnapIndex]);

  // 1. Header status presentation
  const isShortage = hospital.status === 'Shortage';
  const isAtRisk = hospital.status === '<36h Surplus';

  const statusDotColor = isShortage ? '#BE123C' : isAtRisk ? '#D97706' : '#059669';
  const statusTextColor = isShortage ? '#B91C1C' : isAtRisk ? '#B45309' : '#047857';
  const statusLabel = isShortage
    ? 'Critical shortage'
    : isAtRisk
      ? '<36h expiry risk'
      : 'Optimal buffer';

  // Sub line per Spec §14: <Zone/City> · <Facility type>
  const subLine = hospital.city || `${hospital.short} · Trauma Centre`;

  // 2. Balance calculation & ruler derivation
  const stock = hospital.stock;
  const exp36 = hospital.exp36;
  const netBalance = hospital.netBalance;

  // Deriving need figure from existing fields (Spec §14):
  const targetBaseline = hospital.targetBaseline || (hospital.isTrauma ? 85 : 60);
  const usableStock = Math.max(0, stock - exp36);
  const maxScale = Math.max(stock, targetBaseline, 80) * 1.08;

  const usableWidthPct = Math.min(100, Math.round((usableStock / maxScale) * 100));
  const expWidthPct = Math.min(100 - usableWidthPct, Math.round((exp36 / maxScale) * 100));
  const targetTickPct = Math.min(98, Math.round((targetBaseline / maxScale) * 100));

  // 3. Blood groups sorted by severity (lowest units first)
  const sortedBloodGroups = useMemo(() => {
    const inv = hospital.liveInv;
    const counts: Record<BloodType, number> = {
      'O-': inv?.['O-'] ? Object.values(inv['O-']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(1, Math.round(stock * 0.05)),
      'O+': inv?.['O+'] ? Object.values(inv['O+']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(8, Math.round(stock * 0.35)),
      'A-': inv?.['A-'] ? Object.values(inv['A-']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(1, Math.round(stock * 0.04)),
      'A+': inv?.['A+'] ? Object.values(inv['A+']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(6, Math.round(stock * 0.22)),
      'B-': inv?.['B-'] ? Object.values(inv['B-']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(1, Math.round(stock * 0.04)),
      'B+': inv?.['B+'] ? Object.values(inv['B+']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(5, Math.round(stock * 0.20)),
      'AB-': inv?.['AB-'] ? Object.values(inv['AB-']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(0, Math.round(stock * 0.01)),
      'AB+': inv?.['AB+'] ? Object.values(inv['AB+']).reduce((s: number, v: any) => s + (Number(v) || 0), 0) : Math.max(2, Math.round(stock * 0.09)),
    };

    return (Object.keys(counts) as BloodType[])
      .map((bt) => ({
        group: bt,
        units: counts[bt],
        isCritical: counts[bt] <= 2,
        isLow: counts[bt] > 2 && counts[bt] <= 4,
      }))
      .sort((a, b) => a.units - b.units);
  }, [hospital.liveInv, stock]);

  // 4. Optimal / candidate routes
  const bestRoute = routes.find((r) => r.isBest) || routes[0];
  const bestUnits = bestRoute ? (bestRoute.units || 8) : 8;
  const bestPartner = bestRoute ? bestRoute.partnerCode : 'HUB';
  const bestEta = bestRoute ? `${Math.round(bestRoute.durationS / 60)} min` : '15 min';

  // 5. Dispatch handler
  const handleDispatch = () => {
    if (isDispatched) return;
    onDispatch(hospital.id, bestUnits, bestRoute?.id);
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 2400);
  };

  // Mobile snap points: 28%, 62%, 92%
  const snapHeights = ['28vh', '62vh', '92vh'];
  const mobileHeight = snapHeights[mobileSnapIndex];

  return (
    <aside
      className={`hospital-side-sheet${isClosing ? ' sheet-closing' : ''}`}
      role="region"
      aria-labelledby="hospital-sheet-title"
      style={
        isMobile
          ? {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: mobileHeight,
            maxHeight: mobileHeight,
            background: 'var(--color-paper-raised, #FAF7F0)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderTop: '1px solid rgba(20, 27, 45, 0.10)',
            borderLeft: 'none',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50,
            overflow: 'hidden',
            transition: 'height 0.28s cubic-bezier(0.22, 1, 0.36, 1), max-height 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          }
          : undefined
      }
    >
      {/* Mobile Hairline Drag Handle per Spec §14 */}
      {isMobile && (
        <div
          className="sheet-handle"
          onClick={() => setMobileSnapIndex((prev) => ((prev + 1) % 3) as 0 | 1 | 2)}
          style={{
            width: '100%',
            padding: '10px 0 6px',
            display: 'flex',
            justifyContent: 'center',
            cursor: 'grab',
            flexShrink: 0,
          }}
          title="Tap to resize sheet (28% · 62% · 92%)"
        >
          <div
            style={{
              width: 36,
              height: 3,
              borderRadius: 999,
              background: 'rgba(20, 27, 45, 0.22)',
            }}
          />
        </div>
      )}

      {/* Scrollable Container */}
      <div
        className="sheet-scroll-body"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── SECTION 1: HEADER (Spec §3.3 & §3.4) ── */}
        <section className="sheet-section sheet-section-1" style={{ padding: '14px 18px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(20, 27, 45, 0.60)',
                letterSpacing: '0.04em',
              }}
            >
              {hospital.code}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Spec §19.6: Replace the ESC text with a × icon button (1.5 px stroke, ink/60, 40 px hit area, tooltip "Close panel (keeps hospital selected)") */}
              <button
                type="button"
                className="sheet-close-btn"
                onClick={handleCloseDrawerOnly}
                style={{
                  width: 40,
                  height: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'rgba(20, 27, 45, 0.60)',
                  transition: 'color 0.15s ease',
                }}
                title="Close panel (keeps hospital selected)"
                aria-label="Close panel (keeps hospital selected)"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 1L13 13M1 13L13 1" />
                </svg>
              </button>
            </div>
          </div>

          <h2
            id="hospital-sheet-title"
            ref={headingRef}
            tabIndex={-1}
            style={{
              fontFamily: "var(--font-main, 'Plus Jakarta Sans', sans-serif)",
              fontSize: '15.5px',
              lineHeight: 1.2,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: '#141B2D',
              margin: '0 0 2px',
              outline: 'none',
            }}
          >
            {hospital.fullName}
          </h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '11px',
              lineHeight: 1.2,
              color: 'rgba(20, 27, 45, 0.60)',
              marginBottom: '10px',
            }}
          >
            <span>{subLine}</span>
            <span style={{ color: 'rgba(20, 27, 45, 0.3)' }}>·</span>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: statusDotColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontWeight: 600,
                color: statusTextColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
        </section>

        {/* ── SECTION 2: BALANCE (Spec §3.3) ── */}
        <section className="sheet-section sheet-section-2" style={{ padding: '12px 18px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(20, 27, 45, 0.55)',
              textTransform: 'uppercase',
            }}
          >
            NET BALANCE
          </div>

          {/* Numeral at 26px font-weight 700 per Spec §3.3 */}
          <div
            style={{
              fontSize: '26px',
              lineHeight: 1.1,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              color: statusTextColor,
              margin: '3px 0 4px',
            }}
          >
            {netBalance < 0 ? `−${Math.abs(netBalance)}u` : `+${netBalance}u`}
          </div>

          {/* Explanation sentence in 11px per Spec §3.3 */}
          <p
            style={{
              fontSize: '11px',
              lineHeight: '15px',
              color: 'rgba(20, 27, 45, 0.70)',
              margin: '0 0 8px',
            }}
          >
            {stock} units on hand, {exp36} expire within 36 hours.
          </p>

          {/* 2px Ruler derived from existing targetBaseline need (Spec §14 & §3.3) */}
          <div style={{ position: 'relative', width: '100%', paddingTop: 2, paddingBottom: 10 }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 2,
                background: 'rgba(20, 27, 45, 0.10)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: 2,
                  width: `${usableWidthPct}%`,
                  backgroundColor: statusTextColor,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${usableWidthPct}%`,
                  top: 0,
                  height: 2,
                  width: `${expWidthPct}%`,
                  background:
                    'repeating-linear-gradient(45deg, rgba(20, 27, 45, 0.35), rgba(20, 27, 45, 0.35) 2px, transparent 2px, transparent 4px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${targetTickPct}%`,
                  top: -3,
                  width: 1,
                  height: 8,
                  backgroundColor: 'rgba(20, 27, 45, 0.40)',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: `${targetTickPct}%`,
                top: 10,
                transform: 'translateX(-50%)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9.5px',
                color: 'rgba(20, 27, 45, 0.50)',
                whiteSpace: 'nowrap',
              }}
            >
              {targetBaseline}u need
            </div>
          </div>
        </section>

        {/* ── SECTION 3: BLOOD GROUPS (Compact 2-Column Grid per Spec §3.3) ── */}
        <section className="sheet-section sheet-section-3" style={{ padding: '10px 18px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(20, 27, 45, 0.55)',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            BLOOD GROUPS
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 12px',
              fontSize: '11px',
            }}
          >
            {sortedBloodGroups.map((item) => (
              <div
                key={item.group}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#141B2D',
                      width: 26,
                    }}
                  >
                    {item.group}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'rgba(20, 27, 45, 0.85)',
                    }}
                  >
                    {item.units}u
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    margin: '0 4px',
                    height: 2,
                    background: 'rgba(20, 27, 45, 0.08)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${Math.min(100, Math.round((item.units / 22) * 100))}%`,
                      backgroundColor: item.isCritical ? '#DC2626' : 'rgba(20, 27, 45, 0.50)',
                    }}
                  />
                </div>

                <div style={{ width: 28, textAlign: 'right' }}>
                  {item.isCritical ? (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9.5px',
                        fontWeight: 600,
                        color: '#DC2626',
                      }}
                    >
                      crit
                    </span>
                  ) : item.isLow ? (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '9.5px',
                        fontWeight: 600,
                        color: '#B45309',
                      }}
                    >
                      low
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: OPTIMAL / CANDIDATE ROUTES (Spec §3.3) ── */}
        <section className="sheet-section sheet-section-4" style={{ padding: '10px 18px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(20, 27, 45, 0.55)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            {isCandidateMode ? 'CANDIDATE ROUTES' : 'OPTIMAL ROUTES'} ({routes.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {routes.slice(0, 3).map((r, rIdx) => {
              const isSelected = selectedRouteId === r.id;
              const isBest = r.isBest || (!isCandidateMode && rIdx === 0);
              const partnerShort = NCR_HOSPITAL_METAS[r.partnerId]?.short || r.partnerCode;
              const etaMins = Math.round(r.durationS / 60);
              const distKm = (r.distanceM / 1000).toFixed(1);
              const units = r.units || (isCandidateMode ? 4 : 8);

              return (
                <div
                  key={r.id}
                  className="sheet-route-row"
                  data-testid={`sheet-route-${r.id}`}
                  onClick={() => {
                    setSelectedRouteId(r.id);
                    onFocusRoute(r);
                  }}
                  onMouseEnter={() => onHoverRoute(r.id)}
                  onMouseLeave={() => onHoverRoute(null)}
                  style={{
                    padding: '8px 10px',
                    fontSize: '11px',
                    borderLeft: isSelected ? '2px solid #16A34A' : '2px solid transparent',
                    background: isSelected ? 'rgba(22, 163, 74, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 2,
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#141B2D' }}>
                      {r.partnerCode} · {partnerShort}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#141B2D',
                      }}
                    >
                      +{units}u
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '10.5px',
                        color: 'rgba(20, 27, 45, 0.55)',
                      }}
                    >
                      {etaMins} min · {distKm} km · est.
                    </span>
                    {isBest ? (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: '#16A34A',
                        }}
                      >
                        Best
                      </span>
                    ) : isCandidateMode ? (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '10.5px',
                          color: 'rgba(20, 27, 45, 0.50)',
                        }}
                      >
                        Candidate
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── SECTION 5: COLD CHAIN (Spec §3.3) ── */}
        <section
          className="sheet-section sheet-section-5"
          style={{
            padding: '8px 18px',
            borderBottom: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'rgba(20, 27, 45, 0.60)',
                letterSpacing: '0.02em',
              }}
            >
              Cold chain 22.0°C · agitated · OK
            </span>
          </div>
        </section>
      </div>

      {/* ── SECTION 6: STICKY FOOTER (Spec §3.3: 36px Dispatch CTA button) ── */}
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--color-paper-raised, #FAF7F0)',
          borderTop: '1px solid rgba(20, 27, 45, 0.08)',
          padding: '10px 18px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleDispatch}
          disabled={isDispatched}
          style={{
            width: '100%',
            height: 36,
            minHeight: 36,
            background: isDispatched ? '#047857' : '#15997A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '0 14px',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: isDispatched ? "'JetBrains Mono', monospace" : 'inherit',
            cursor: isDispatched ? 'default' : 'pointer',
            transition: 'background 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isDispatched ? 'Dispatched' : `Dispatch ${bestUnits}u from ${bestPartner} · ${bestEta}`}
        </button>
      </footer>
    </aside>
  );
}
