import React, { useState } from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { VehicleArt } from './VehicleArt';
import { StatusChip, StatusChipVariant } from './StatusChip';

export interface BoardRowData {
  id: string; // e.g. TX-0412
  vehicleType?: 'van' | 'bike' | 'truck';
  fromCode: string;
  toCode: string;
  units: number;
  group: string;
  product: string; // 'Apheresis' | 'RDP'
  etaTime: string;
  statusVariant?: StatusChipVariant;
  statusLabel?: string;
}

export interface BoardRowProps {
  data: BoardRowData;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const BoardRow: React.FC<BoardRowProps> = ({
  data,
  onClick,
  className = '',
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);

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
      className={`cockpit-board-row ${className}`}
      data-testid="cockpit-board-row"
      data-row-id={data.id}
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 90px 100px 1fr 70px auto',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 18px',
        borderRadius: '14px',
        background: isHovered ? COCKPIT_TOKENS.surfaces.cardBgSubtle : 'transparent',
        border: '1px solid transparent',
        borderColor: isHovered ? 'rgba(20, 27, 45, 0.08)' : 'transparent',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered ? '0 4px 12px rgba(20, 27, 45, 0.05)' : 'none',
        transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* 1. Vehicle Thumbnail (56x28 per Section 4) */}
      <div style={{ width: 56, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <VehicleArt type={data.vehicleType || 'van'} variant="thumb" />
      </div>

      {/* 2. Mono Transfer ID */}
      <span
        className="cockpit-mono"
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: COCKPIT_TOKENS.ink.primary,
        }}
      >
        {data.id}
      </span>

      {/* 3. Mono Route: APL → AIM */}
      <span
        className="cockpit-mono"
        style={{
          fontSize: '12.5px',
          fontWeight: 600,
          color: COCKPIT_TOKENS.ink.secondary,
        }}
      >
        {data.fromCode} → {data.toCode}
      </span>

      {/* 4. Units & Product Label */}
      <span
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: COCKPIT_TOKENS.ink.primary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {data.units}u {data.group} {data.product}
      </span>

      {/* 5. ETA Time */}
      <span
        style={{
          fontSize: '13.5px',
          fontWeight: 700,
          color: COCKPIT_TOKENS.ink.primary,
          textAlign: 'right',
        }}
      >
        {data.etaTime}
      </span>

      {/* 6. Status Chip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <StatusChip variant={data.statusVariant || 'ontime'} label={data.statusLabel} />
      </div>
    </div>
  );
};

