import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

export interface ShelfMarginProps {
  hoursLeft: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ShelfMargin: React.FC<ShelfMarginProps> = ({
  hoursLeft = 29,
  label,
  className = '',
  style,
}) => {
  const isSafe = hoursLeft >= 36;
  const isTight = hoursLeft >= 12 && hoursLeft < 36;

  const config = isSafe
    ? {
        bg: COCKPIT_TOKENS.status.green.bg,
        border: COCKPIT_TOKENS.status.green.border,
        text: COCKPIT_TOKENS.status.green.text,
        icon: <ShieldCheck size={14} />,
        statusTag: 'Safe buffer',
      }
    : isTight
    ? {
        bg: COCKPIT_TOKENS.status.amber.bg,
        border: COCKPIT_TOKENS.status.amber.border,
        text: COCKPIT_TOKENS.status.amber.text,
        icon: <Clock size={14} />,
        statusTag: 'Tight margin',
      }
    : {
        bg: COCKPIT_TOKENS.status.red.bg,
        border: COCKPIT_TOKENS.status.red.border,
        text: COCKPIT_TOKENS.status.red.text,
        icon: <AlertTriangle size={14} />,
        statusTag: 'Critical shelf life',
      };

  return (
    <div
      className={`cockpit-shelf-margin ${className}`}
      data-testid="cockpit-shelf-margin"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: COCKPIT_TOKENS.radii.pill,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        fontSize: '12px',
        fontWeight: 600,
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
        {config.icon}
      </span>
      <span>
        {hoursLeft.toFixed(0)} h left on arrival
      </span>
      <span style={{ opacity: 0.6 }}>•</span>
      <span>{label || config.statusTag}</span>
    </div>
  );
};
