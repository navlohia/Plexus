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
  onClose: () => void;
  onDispatch: (targetHospitalId: string, units?: number) => void;
  onFocusRoute: (route: ActiveHospitalRoute) => void;
  onHoverRoute: (routeId: string | null) => void;
}

export default function HospitalDetailSheet({
  hospital,
  routes,
  isCandidateMode,
  isMobile,
  onClose,
  onDispatch,
  onFocusRoute,
  onHoverRoute,
}: HospitalDetailSheetProps) {
  const [showAllBloodGroups, setShowAllBloodGroups] = useState(false);
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

  // Handle close transition
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 260);
  };

  // Esc key listener (A11y per Spec §14)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const displayedGroups = showAllBloodGroups ? sortedBloodGroups : sortedBloodGroups.slice(0, 4);

  // 4. Optimal / candidate routes
  const bestRoute = routes.find((r) => r.isBest) || routes[0];
  const bestUnits = bestRoute ? (bestRoute.units || 8) : 8;
  const bestPartner = bestRoute ? bestRoute.partnerCode : 'HUB';
  const bestEta = bestRoute ? `${Math.round(bestRoute.durationS / 60)} min` : '15 min';

  // 5. Dispatch handler
  const handleDispatch = () => {
    if (isDispatched) return;
    onDispatch(hospital.id, bestUnits);
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
        {/* ── SECTION 1: HEADER ── */}
        <section className="sheet-section sheet-section-1" style={{ padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                fontWeight: 600,
                color: 'rgba(20, 27, 45, 0.60)',
                letterSpacing: '0.04em',
              }}
            >
              {hospital.code}
            </span>
            <button
              type="button"
              onClick={handleClose}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(20, 27, 45, 0.60)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                minHeight: isMobile ? 44 : 24,
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Close inspector (Esc)"
            >
              ESC
            </button>
          </div>

          <h2
            id="hospital-sheet-title"
            ref={headingRef}
            tabIndex={-1}
            style={{
              fontFamily: "var(--font-main, 'Plus Jakarta Sans', sans-serif)",
              fontSize: '24px',
              lineHeight: '28px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#141B2D',
              margin: '10px 0 4px',
              outline: 'none',
            }}
          >
            {hospital.fullName}
          </h2>

          <div
            style={{
              fontSize: '13px',
              lineHeight: '18px',
              color: 'rgba(20, 27, 45, 0.60)',
              marginBottom: '12px',
            }}
          >
            {subLine}
          </div>

          {/* Status: 6px dot + text (text only, NO pill badge per Spec §14) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                fontSize: '12.5px',
                fontWeight: 600,
                color: statusTextColor,
                letterSpacing: '0.01em',
              }}
            >
              {statusLabel}
            </span>
          </div>
        </section>

        {/* ── SECTION 2: BALANCE ── */}
        <section className="sheet-section sheet-section-2">
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(20, 27, 45, 0.55)',
              textTransform: 'uppercase',
            }}
          >
            NET BALANCE
          </div>

          {/* Numeral at 56/56 in the state's 700 shade per Spec §14 */}
          <div
            style={{
              fontSize: '56px',
              lineHeight: '56px',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
              color: statusTextColor,
              margin: '10px 0 10px',
            }}
          >
            {netBalance < 0 ? `−${Math.abs(netBalance)}u` : `+${netBalance}u`}
          </div>

          {/* One human sentence beneath it */}
          <p
            style={{
              fontSize: '13px',
              lineHeight: '19px',
              color: 'rgba(20, 27, 45, 0.70)',
              margin: '0 0 16px',
            }}
          >
            {stock} units on hand. {exp36} expire within 36 hours.
          </p>

          {/* 2px Ruler derived from existing targetBaseline need (Spec §14) */}
          <div style={{ position: 'relative', width: '100%', paddingTop: 4, paddingBottom: 16 }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 2,
                background: 'rgba(20, 27, 45, 0.10)',
              }}
            >
              {/* Solid segment = usable stock */}
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

              {/* Hatched segment = expiring stock */}
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

              {/* End tick labeled with the target need */}
              <div
                style={{
                  position: 'absolute',
                  left: `${targetTickPct}%`,
                  top: -4,
                  width: 1,
                  height: 10,
                  backgroundColor: 'rgba(20, 27, 45, 0.40)',
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                left: `${targetTickPct}%`,
                top: 14,
                transform: 'translateX(-50%)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: 'rgba(20, 27, 45, 0.50)',
                whiteSpace: 'nowrap',
              }}
            >
              {targetBaseline}u need
            </div>
          </div>
        </section>

        {/* ── SECTION 3: BLOOD GROUPS ── */}
        <section className="sheet-section sheet-section-3">
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(20, 27, 45, 0.55)',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            BLOOD GROUPS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedGroups.map((item) => (
              <div
                key={item.group}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                }}
              >
                {/* Group label (mono 13/600) + Units (tabular) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 72 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#141B2D',
                      width: 32,
                    }}
                  >
                    {item.group}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      fontWeight: 500,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#141B2D',
                    }}
                  >
                    {item.units}u
                  </span>
                </div>

                {/* 2px hairline bar: red-600 when critical, ink/50 otherwise, NEVER green! (Spec §14) */}
                <div
                  style={{
                    flex: 1,
                    margin: '0 18px',
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

                {/* Status word only when not OK */}
                <div style={{ width: 56, textAlign: 'right' }}>
                  {item.isCritical ? (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#DC2626',
                      }}
                    >
                      critical
                    </span>
                  ) : item.isLow ? (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
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

          <button
            type="button"
            onClick={() => setShowAllBloodGroups(!showAllBloodGroups)}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(20, 27, 45, 0.60)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0 0',
              textAlign: 'left',
              display: 'inline-block',
              minHeight: isMobile ? 44 : 24,
            }}
          >
            {showAllBloodGroups ? 'Show top 4 ↑' : 'Show all 8 ↓'}
          </button>
        </section>

        {/* ── SECTION 4: OPTIMAL / CANDIDATE ROUTES ── */}
        <section className="sheet-section sheet-section-4">
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: 'rgba(20, 27, 45, 0.55)',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            {isCandidateMode ? 'CANDIDATE ROUTES' : 'OPTIMAL ROUTES'} ({routes.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {routes.map((r, rIdx) => {
              const isSelected = selectedRouteId === r.id;
              const isBest = r.isBest || (!isCandidateMode && rIdx === 0);
              const partnerShort = NCR_HOSPITAL_METAS[r.partnerId]?.short || r.partnerCode;
              const etaMins = Math.round(r.durationS / 60);
              const distKm = (r.distanceM / 1000).toFixed(1);
              const units = r.units || (isCandidateMode ? 4 : 8);

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRouteId(r.id);
                    onFocusRoute(r);
                  }}
                  onMouseEnter={() => onHoverRoute(r.id)}
                  onMouseLeave={() => onHoverRoute(null)}
                  style={{
                    padding: '8px 12px',
                    borderLeft: isSelected ? '2px solid #16A34A' : '2px solid transparent',
                    background: isSelected ? 'rgba(22, 163, 74, 0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minHeight: isMobile ? 44 : undefined,
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
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#141B2D' }}>
                      {r.partnerCode} · {partnerShort}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '13px',
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
                        fontSize: '11px',
                        color: 'rgba(20, 27, 45, 0.55)',
                      }}
                    >
                      {etaMins} min · {distKm} km · est.
                    </span>
                    {isBest ? (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '11px',
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
                          fontSize: '11px',
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

        {/* ── SECTION 5: COLD CHAIN ── */}
        <section
          className="sheet-section sheet-section-5"
          style={{
            padding: '16px 24px',
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

      {/* ── SECTION 6: STICKY FOOTER ── */}
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--color-paper-raised, #FAF7F0)',
          borderTop: '1px solid rgba(20, 27, 45, 0.08)',
          padding: '16px 24px',
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
            background: isDispatched ? '#047857' : '#15997A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '13px 18px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: isDispatched ? "'JetBrains Mono', monospace" : 'inherit',
            cursor: isDispatched ? 'default' : 'pointer',
            transition: 'background 0.2s ease',
            minHeight: 44, // Touch target >= 44px (A11y per Spec §14)
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
