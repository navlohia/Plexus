import React, { useState } from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { StatusChip, StatusChipVariant } from './StatusChip';

export interface TicketCardData {
  id: string; // e.g. REQ-901
  fromCode: string;
  toCode: string;
  units: number;
  group: string;
  product: string;
  currentStage: 1 | 2 | 3 | 4 | 5; // 1: Requested, 2: Found, 3: Packed, 4: In transit, 5: Delivered
  etaTime: string;
  statusVariant?: StatusChipVariant;
  statusLabel?: string;
  urgency?: 'immediate' | 'urgent' | 'sameday' | 'planned';
}

export interface TicketCardProps {
  data: TicketCardData;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  data,
  onClick,
  className = '',
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getBarColor = () => {
    switch (data.statusVariant) {
      case 'alert':
        return COCKPIT_TOKENS.status.red.solid;
      case 'delayed':
        return COCKPIT_TOKENS.status.amber.solid;
      case 'assigned':
        return COCKPIT_TOKENS.lavender[500];
      case 'ontime':
      default:
        return COCKPIT_TOKENS.status.green.solid;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cockpit-ticket-card ${className}`}
      data-testid="cockpit-ticket-card"
      data-ticket-id={data.id}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px 16px 22px',
        background: COCKPIT_TOKENS.surfaces.cardBg,
        borderRadius: COCKPIT_TOKENS.radii.card,
        boxShadow: isHovered ? COCKPIT_TOKENS.shadows.lift : COCKPIT_TOKENS.shadows.card,
        border: COCKPIT_TOKENS.hairlines.default,
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* 4px Status Bar on Left per Spec */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '5px',
          background: getBarColor(),
          borderRadius: '4px 0 0 4px',
        }}
      />

      {/* Center Left: Route & Request Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="cockpit-mono"
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: COCKPIT_TOKENS.ink.primary,
            }}
          >
            {data.fromCode} → {data.toCode}
          </span>
          <span
            className="cockpit-mono"
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: COCKPIT_TOKENS.surfaces.pageBg,
              color: COCKPIT_TOKENS.ink.secondary,
            }}
          >
            {data.id}
          </span>
          {data.urgency === 'immediate' && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: COCKPIT_TOKENS.status.red.bg,
                color: COCKPIT_TOKENS.status.red.text,
              }}
            >
              Immediate
            </span>
          )}
        </div>

        <div style={{ fontSize: '13.5px', color: COCKPIT_TOKENS.ink.muted }}>
          <strong style={{ color: COCKPIT_TOKENS.ink.primary }}>{data.units}u {data.group}</strong> · {data.product}
        </div>
      </div>

      {/* Five-Dot Stage Indicator per Spec 5 */}
      <div
        aria-label={`Stage ${data.currentStage} of 5`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 20px',
        }}
      >
        {[1, 2, 3, 4, 5].map((stg) => {
          const isPassed = stg <= data.currentStage;
          const isCurrent = stg === data.currentStage;
          return (
            <div
              key={stg}
              style={{
                width: isCurrent ? '10px' : '6px',
                height: isCurrent ? '10px' : '6px',
                borderRadius: '50%',
                background: isPassed ? COCKPIT_TOKENS.lavender[500] : 'rgba(20, 27, 45, 0.15)',
                transition: 'all 0.2s ease',
              }}
            />
          );
        })}
      </div>

      {/* Right: ETA & Status Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: COCKPIT_TOKENS.fonts.display,
              color: COCKPIT_TOKENS.ink.primary,
            }}
          >
            {data.etaTime}
          </div>
          <div className="cockpit-label" style={{ fontSize: '11px' }}>
            Estimated arrival
          </div>
        </div>

        <StatusChip variant={data.statusVariant || 'ontime'} label={data.statusLabel} />
      </div>
    </div>
  );
};

