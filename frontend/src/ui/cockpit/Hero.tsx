import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { VehicleArt } from './VehicleArt';
import { StatusChip } from './StatusChip';
import { Check, ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';

export type HeroState = 'arrived' | 'inbound' | 'shortage' | 'risk' | 'stale' | 'steady';

export interface HeroProps {
  state?: HeroState;
  // Inbound & Arrived fields
  orderId?: string;
  fromHospital?: { code: string; name: string };
  toHospital?: { code: string; name: string };
  etaTime?: string;
  etaRemainingMin?: number;
  progressPercent?: number;
  shelfLifeH?: number;
  temperatureC?: number;
  courierName?: string;
  vehicleId?: string;
  vehicleType?: 'van' | 'bike' | 'truck';
  // Shortage / Risk fields
  deficitUnits?: number;
  expiringUnits?: number;
  expiringHoursLeft?: number;
  sourcesCount?: number;
  nearestSourceMin?: number;
  // Stale fields
  verifiedTime?: string;
  // Scenario flag
  outbreakMode?: boolean;
  outbreakDemandMultiplier?: number;
  // Action callback
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  // Loading & Error states
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Hero: React.FC<HeroProps> = ({
  state = 'inbound',
  orderId = 'TX-0412',
  fromHospital = { code: 'APL', name: 'Apollo Hospital' },
  toHospital = { code: 'AIM', name: 'AIIMS Trauma' },
  etaTime = '15:58',
  etaRemainingMin = 7,
  progressPercent = 65,
  shelfLifeH = 29,
  temperatureC = 22.0,
  courierName = 'Rajesh',
  vehicleId = 'VAN-01',
  vehicleType = 'van',
  deficitUnits = 4,
  expiringUnits = 6,
  expiringHoursLeft = 9,
  sourcesCount = 3,
  nearestSourceMin = 11,
  verifiedTime = 'yesterday 18:10',
  outbreakMode = false,
  outbreakDemandMultiplier = 2.4,
  onPrimaryAction,
  primaryActionLabel,
  isLoading = false,
  error = null,
  onRetry,
  className = '',
  style,
}) => {
  if (isLoading) {
    return (
      <div
        className={`cockpit-hero cockpit-hero-loading ${className}`}
        data-testid="cockpit-hero"
        style={{
          background: COCKPIT_TOKENS.surfaces.cardBg,
          borderRadius: COCKPIT_TOKENS.radii.hero,
          boxShadow: COCKPIT_TOKENS.shadows.card,
          border: COCKPIT_TOKENS.hairlines.default,
          padding: '36px 40px',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          ...style,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="cockpit-skeleton" style={{ width: '180px', height: '24px' }} />
          <div className="cockpit-skeleton" style={{ width: '100px', height: '28px', borderRadius: '999px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center', margin: '20px 0' }}>
          <div>
            <div className="cockpit-skeleton" style={{ width: '220px', height: '64px', marginBottom: '12px' }} />
            <div className="cockpit-skeleton" style={{ width: '160px', height: '20px' }} />
          </div>
          <div className="cockpit-skeleton" style={{ width: '100%', height: '140px', borderRadius: '16px' }} />
        </div>
        <div className="cockpit-skeleton" style={{ width: '140px', height: '44px', borderRadius: '8px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`cockpit-hero cockpit-hero-error ${className}`}
        data-testid="cockpit-hero"
        style={{
          background: COCKPIT_TOKENS.surfaces.cardBg,
          borderRadius: COCKPIT_TOKENS.radii.hero,
          boxShadow: COCKPIT_TOKENS.shadows.card,
          border: `1px solid ${COCKPIT_TOKENS.status.amber.border}`,
          padding: '36px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          ...style,
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: COCKPIT_TOKENS.status.amber.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COCKPIT_TOKENS.status.amber.text, flexShrink: 0 }}>
          <AlertTriangle size={22} strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: COCKPIT_TOKENS.ink.primary }}>
            Unable to update transfer tracking
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: COCKPIT_TOKENS.ink.muted }}>
            {error || 'Network connection briefly interrupted. Displaying cached telemetry.'}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              minHeight: '44px',
              padding: '0 18px',
              borderRadius: COCKPIT_TOKENS.radii.sm,
              background: COCKPIT_TOKENS.surfaces.pageBg,
              border: COCKPIT_TOKENS.hairlines.default,
              color: COCKPIT_TOKENS.ink.primary,
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`cockpit-hero cockpit-hero-${state} ${className}`}
      data-testid="cockpit-hero"
      data-hero-state={state}
      style={{
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.hero,
        boxShadow: COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 36px',
        transition: 'all 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
    >
      {/* Soft Radial Lavender Tint Behind Vehicle Art (Single Allowed Tint per Section 2 & 4) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '60%',
          height: '120%',
          background: 'radial-gradient(ellipse at 75% 50%, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.03) 55%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Header Row: Status, Outbreak note */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="cockpit-label">
              {state === 'arrived'
                ? 'Delivery arrived'
                : state === 'inbound'
                ? 'Active incoming transfer'
                : state === 'shortage'
                ? 'Supply requirement'
                : state === 'risk'
                ? 'Surplus risk'
                : state === 'stale'
                ? 'Verification status'
                : 'Network balance'}
            </span>
            {outbreakMode && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: COCKPIT_TOKENS.radii.pill,
                  background: COCKPIT_TOKENS.status.amber.bg,
                  color: COCKPIT_TOKENS.status.amber.text,
                  border: `1px solid ${COCKPIT_TOKENS.status.amber.border}`,
                }}
              >
                Outbreak mode · demand ×{outbreakDemandMultiplier} in your zone
              </span>
            )}
          </div>

          {state === 'inbound' && (
            <StatusChip variant="ontime" label="On time" />
          )}
          {state === 'arrived' && (
            <StatusChip variant="assigned" label="Arrived at bay" />
          )}
          {state === 'shortage' && (
            <StatusChip variant="alert" label="Deficit" />
          )}
          {state === 'risk' && (
            <StatusChip variant="delayed" label="Expiring" />
          )}
        </div>

        {/* Middle Main Content Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Contextual State Headline & Big Numbers */}
          <div>
            {state === 'inbound' && (
              <div>
                {/* Route Line: APL ——●—— AIM with filled progress portion (NO moving dot!) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="cockpit-mono" style={{ fontSize: '13px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
                    {fromHospital.code}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: '160px',
                      height: '4px',
                      background: 'rgba(20, 27, 45, 0.10)',
                      borderRadius: '2px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${progressPercent}%`,
                        background: COCKPIT_TOKENS.lavender[500],
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span className="cockpit-mono" style={{ fontSize: '13px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary }}>
                    {toHospital.code}
                  </span>
                </div>

                {/* Giant ETA (Scale 72/72 per Section 2) */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <div
                    data-testid="hero-eta"
                    style={{
                      fontSize: '64px',
                      lineHeight: '64px',
                      fontWeight: 700,
                      fontFamily: COCKPIT_TOKENS.fonts.display,
                      letterSpacing: '-0.03em',
                      color: COCKPIT_TOKENS.ink.primary,
                    }}
                  >
                    {etaTime}
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: COCKPIT_TOKENS.ink.muted }}>
                    {etaRemainingMin} min est.
                  </span>
                </div>

                <div style={{ marginTop: '8px', fontSize: '13px', color: COCKPIT_TOKENS.ink.secondary }}>
                  Transfer <span className="cockpit-mono" style={{ fontWeight: 600 }}>#{orderId}</span> • Courier {courierName} ({vehicleId})
                </div>
              </div>
            )}

            {state === 'arrived' && (
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary, lineHeight: 1.2 }}>
                  Transfer <span className="cockpit-mono">{orderId}</span> arrived
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: COCKPIT_TOKENS.ink.secondary, lineHeight: 1.45 }}>
                  Consignment from {fromHospital.name} arrived at blood bank receiving bay. Temperature and tamper inspection required.
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '12.5px', color: COCKPIT_TOKENS.status.green.text }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Seal intact
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> {temperatureC.toFixed(1)} °C verified
                  </span>
                </div>
              </div>
            )}

            {state === 'shortage' && (
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COCKPIT_TOKENS.status.red.text, lineHeight: 1.2 }}>
                  {deficitUnits} units projected short
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: COCKPIT_TOKENS.ink.secondary, lineHeight: 1.45 }}>
                  Projected 36-hour demand exceeds current usable stock. Match preview shows {sourcesCount} network sources available (nearest {nearestSourceMin} min).
                </p>
              </div>
            )}

            {state === 'risk' && (
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COCKPIT_TOKENS.status.amber.text, lineHeight: 1.2 }}>
                  {expiringUnits}u expire in {expiringHoursLeft} h
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: COCKPIT_TOKENS.ink.secondary, lineHeight: 1.45 }}>
                  Inventory units approaching the 36-hour shelf-life limit. Release surplus now to enable autonomous network reallocation before discard.
                </p>
              </div>
            )}

            {state === 'stale' && (
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: COCKPIT_TOKENS.ink.primary, lineHeight: 1.2 }}>
                  Stock last verified {verifiedTime}
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: COCKPIT_TOKENS.ink.secondary, lineHeight: 1.45 }}>
                  Physical inventory has not been reconciled in over 24 hours. Submit a count to calibrate autonomous dispatch routing.
                </p>
              </div>
            )}

            {state === 'steady' && (
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: COCKPIT_TOKENS.status.green.text, lineHeight: 1.2 }}>
                  All steady
                </div>
                <p style={{ margin: '8px 0 14px 0', fontSize: '14px', color: COCKPIT_TOKENS.ink.secondary, lineHeight: 1.45 }}>
                  All 8 blood groups have adequate buffer cover for projected 36-hour clinical demands. Zero units expiring soon.
                </p>
                {/* 36h Outlook Mini Chart (Usable vs Expected Demand per Section 4) */}
                <div
                  data-testid="hero-steady-outlook"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: COCKPIT_TOKENS.surfaces.pageBg,
                    border: COCKPIT_TOKENS.hairlines.default,
                    maxWidth: '340px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: COCKPIT_TOKENS.ink.secondary }}>36 h outlook</span>
                    <span style={{ fontWeight: 600, color: COCKPIT_TOKENS.status.green.text }}>+4u buffer margin</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: COCKPIT_TOKENS.ink.muted, width: '48px' }}>Usable</span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(20,27,45,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '80%', height: '100%', background: COCKPIT_TOKENS.status.green.solid, borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, width: '24px', textAlign: 'right' }}>16u</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: COCKPIT_TOKENS.ink.muted, width: '48px' }}>Demand</span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(20,27,45,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '60%', height: '100%', background: COCKPIT_TOKENS.lavender[500], borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, width: '24px', textAlign: 'right' }}>12u</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Vehicle Art (2:1 ratio, overlapping ground shadow, glass chips) */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <VehicleArt
              type={vehicleType}
              variant="hero"
              chips={
                state === 'inbound'
                  ? [
                      { label: `Shelf life ${shelfLifeH} h`, icon: <ShieldCheck size={12} color={COCKPIT_TOKENS.status.green.text} /> },
                      { label: `${temperatureC.toFixed(1)} °C`, icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: COCKPIT_TOKENS.status.green.solid }} /> },
                    ]
                  : undefined
              }
            />
          </div>
        </div>

        {/* Bottom Row: ONE Contextual Primary Action Button (per HOSPITAL_UI_SPEC.md Section 1.7 & 2) */}
        {state !== 'steady' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              data-testid="hero-primary-action"
              onClick={onPrimaryAction}
              style={{
                minHeight: '44px',
                padding: '0 22px',
                borderRadius: COCKPIT_TOKENS.radii.sm,
                background: state === 'arrived' ? COCKPIT_TOKENS.status.green.solid : state === 'shortage' ? COCKPIT_TOKENS.status.green.solid : COCKPIT_TOKENS.ink.primary,
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(20, 27, 45, 0.12)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>
                {primaryActionLabel ||
                  (state === 'arrived'
                    ? 'Confirm receipt'
                    : state === 'inbound'
                    ? 'Track delivery'
                    : state === 'shortage'
                    ? 'Request platelets'
                    : state === 'risk'
                    ? 'Release to network'
                    : 'Verify stock')}
              </span>
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

