import React, { useState } from 'react';
import { LEDGER_TOKENS } from './tokens';
import { Popover } from './Popover';

export type HourRailMarkerKind = 'arrival' | 'expiry' | 'deadline';

export interface HourRailMarker {
  id: string;
  kind: HourRailMarkerKind;
  hourOffset: number; // 0 to 36 hours from now
  timeStr: string; // e.g. "15:58"
  primaryLabel: string; // e.g. "15:58" or "6u expire" or "REQ-901 due"
  secondaryLabel?: string; // e.g. "12u O− · Medanta"
  vehicleType?: 'van' | 'bike' | 'truck';
  lane?: 1 | 2; // vertical lane to prevent label collisions
  details?: React.ReactNode;
  onClick?: () => void;
}

export interface HourRailProps {
  nowLabel?: string; // default "Now"
  windowHours?: number; // default 36
  markers?: HourRailMarker[];
  ticks?: { hourOffset: number; timeStr: string; dateStr?: string }[];
  isTrackingVariant?: boolean;
  trackingElapsedPct?: number; // 0 to 100
  trackingCheckpoints?: { label: string; time?: string; done: boolean }[];
  className?: string;
  style?: React.CSSProperties;
}

export const HourRail: React.FC<HourRailProps> = ({
  nowLabel = 'Now',
  windowHours = 36,
  markers = [],
  ticks = [
    { hourOffset: 0, timeStr: 'Now' },
    { hourOffset: 6, timeStr: '03:00' },
    { hourOffset: 12, timeStr: '09:00' },
    { hourOffset: 18, timeStr: '15:00' },
    { hourOffset: 24, timeStr: '21:00', dateStr: 'Wed 11 Nov' },
    { hourOffset: 30, timeStr: '03:00' },
    { hourOffset: 36, timeStr: '09:00' },
  ],
  isTrackingVariant = false,
  trackingElapsedPct = 65,
  trackingCheckpoints = [
    { label: 'Packed', time: '15:31', done: true },
    { label: 'Picked up', time: '15:36', done: true },
    { label: 'In transit', done: true },
    { label: 'Arrived', time: '15:58', done: false },
  ],
  className = '',
  style,
}) => {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  if (isTrackingVariant) {
    // Tracking variant per Section 4.1 & 8
    return (
      <div
        className={`ledger-hour-rail ledger-tracking-rail ${className}`}
        data-testid="ledger-tracking-rail"
        style={{
          width: '100%',
          height: '72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          fontFamily: LEDGER_TOKENS.fontUi,
          position: 'relative',
          padding: '0 12px',
          ...style,
        }}
      >
        {/* Checkpoint row on axis */}
        <div style={{ position: 'relative', width: '100%', height: '2px', background: LEDGER_TOKENS.hairlineStrong }}>
          {/* Elapsed portion drawn in ink per Section 4.1 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${Math.min(100, Math.max(0, trackingElapsedPct))}%`,
              height: '100%',
              background: LEDGER_TOKENS.ink,
              transition: 'width 240ms ease',
            }}
          />

          {/* Small ink dot at "Now" on progress line */}
          <div
            style={{
              position: 'absolute',
              top: '-3px',
              left: `calc(${Math.min(100, Math.max(0, trackingElapsedPct))}% - 4px)`,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: LEDGER_TOKENS.ink,
            }}
          />
        </div>

        {/* Checkpoint Markers along the axis */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          {trackingCheckpoints.map((cp, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: idx === 0 ? 'flex-start' : idx === trackingCheckpoints.length - 1 ? 'flex-end' : 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: cp.done ? LEDGER_TOKENS.ink : 'transparent',
                    border: `1.5px solid ${cp.done ? LEDGER_TOKENS.ink : LEDGER_TOKENS.hairlineStrong}`,
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: cp.done ? 600 : 400, color: cp.done ? LEDGER_TOKENS.ink : LEDGER_TOKENS.ink3 }}>
                  {cp.label}
                </span>
              </div>
              {cp.time && (
                <span style={{ fontSize: '12px', color: LEDGER_TOKENS.ink3, fontVariantNumeric: 'tabular-nums', marginTop: '2px' }}>
                  {cp.time}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard 36h Today Hour Rail per Section 4.1
  return (
    <div
      className={`ledger-hour-rail ${className}`}
      data-testid="ledger-hour-rail"
      style={{
        width: '100%',
        height: '72px', // 72 px high per Section 4.1
        position: 'relative',
        fontFamily: LEDGER_TOKENS.fontUi,
        margin: '16px 0 24px 0',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 1 px --hairline-strong axis */}
      <div
        style={{
          position: 'absolute',
          top: '32px',
          left: 0,
          right: 0,
          height: '1px',
          background: LEDGER_TOKENS.hairlineStrong,
        }}
      />

      {/* "Now" 6 px ink dot at the left with label "Now" */}
      <div
        style={{
          position: 'absolute',
          top: '29px',
          left: '0',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: LEDGER_TOKENS.ink,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '0',
          fontSize: '12px',
          fontWeight: 600,
          color: LEDGER_TOKENS.ink,
        }}
      >
        {nowLabel}
      </div>

      {/* Axis Ticks every 6 h */}
      {ticks.map((tick, idx) => {
        const leftPct = (tick.hourOffset / windowHours) * 100;
        if (tick.hourOffset === 0) return null; // "Now" covers offset 0
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: '28px',
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* 1 px tick mark */}
            <div style={{ width: '1px', height: '8px', background: LEDGER_TOKENS.hairlineStrong }} />
            {/* Tick time label */}
            <span
              style={{
                marginTop: '4px',
                fontSize: LEDGER_TOKENS.type.t12,
                color: LEDGER_TOKENS.ink3,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {tick.timeStr}
            </span>
            {tick.dateStr && (
              <span style={{ fontSize: '10px', color: LEDGER_TOKENS.ink4, whiteSpace: 'nowrap' }}>
                {tick.dateStr}
              </span>
            )}
          </div>
        );
      })}

      {/* Markers (3 kinds only: Arrival, Expiry, Deadline) */}
      {markers.map((marker) => {
        const leftPct = Math.min(96, Math.max(4, (marker.hourOffset / windowHours) * 100));
        const laneOffset = (marker.lane || 1) === 1 ? 0 : 16;

        return (
          <div
            key={marker.id}
            onClick={marker.onClick}
            onMouseEnter={() => setHoveredMarkerId(marker.id)}
            onMouseLeave={() => setHoveredMarkerId(null)}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              transform: 'translateX(-50%)',
              cursor: marker.onClick ? 'pointer' : 'default',
              zIndex: hoveredMarkerId === marker.id ? 20 : 10,
            }}
          >
            {/* KIND 1: Arrival (Vehicle silhouette + stem above axis + labels below) */}
            {marker.kind === 'arrival' && (
              <Popover content={marker.details || `${marker.primaryLabel} · ${marker.secondaryLabel || ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* 32x16 Thumbnail above axis */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      transform: 'translateY(-100%)',
                      width: '32px',
                      height: '16px',
                      background: LEDGER_TOKENS.surface,
                      border: `1px solid ${LEDGER_TOKENS.hairlineStrong}`,
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: LEDGER_TOKENS.ink,
                    }}
                  >
                    VAN
                  </div>
                  {/* 1 px stem to axis */}
                  <div style={{ position: 'absolute', top: '16px', width: '1px', height: '16px', background: LEDGER_TOKENS.hairlineStrong }} />
                  {/* Dot on axis */}
                  <div style={{ position: 'absolute', top: '29px', width: '6px', height: '6px', borderRadius: '50%', background: LEDGER_TOKENS.good }} />
                  {/* Label below in designated vertical lane */}
                  <div
                    style={{
                      position: 'absolute',
                      top: `${42 + laneOffset}px`,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: LEDGER_TOKENS.ink, fontVariantNumeric: 'tabular-nums' }}>
                      {marker.primaryLabel}
                    </div>
                    {marker.secondaryLabel && (
                      <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink3 }}>
                        {marker.secondaryLabel}
                      </div>
                    )}
                  </div>
                </div>
              </Popover>
            )}

            {/* KIND 2: Expiry (6x10 --bad tick on the axis) */}
            {marker.kind === 'expiry' && (
              <Popover content={marker.details || `${marker.primaryLabel} ${marker.secondaryLabel || ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: '27px',
                      width: '6px',
                      height: '10px',
                      background: LEDGER_TOKENS.bad,
                      borderRadius: '1px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: `${42 + laneOffset}px`,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: LEDGER_TOKENS.bad }}>
                      {marker.primaryLabel}
                    </div>
                    {marker.secondaryLabel && (
                      <div style={{ fontSize: '11px', color: LEDGER_TOKENS.ink3 }}>
                        {marker.secondaryLabel}
                      </div>
                    )}
                  </div>
                </div>
              </Popover>
            )}

            {/* KIND 3: Deadline (hollow ink circle) */}
            {marker.kind === 'deadline' && (
              <Popover content={marker.details || marker.primaryLabel}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: '28px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      border: `1.5px solid ${LEDGER_TOKENS.ink}`,
                      background: LEDGER_TOKENS.canvas,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: `${42 + laneOffset}px`,
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: LEDGER_TOKENS.ink2,
                    }}
                  >
                    {marker.primaryLabel}
                  </div>
                </div>
              </Popover>
            )}
          </div>
        );
      })}
    </div>
  );
};

