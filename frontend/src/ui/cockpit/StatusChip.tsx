import React from 'react';
import { COCKPIT_TOKENS } from './tokens';
import { Check, Clock, AlertTriangle, Package, Hourglass } from 'lucide-react';

export type StatusChipVariant = 'ontime' | 'delayed' | 'alert' | 'assigned' | 'waiting';

export interface StatusChipProps {
  variant?: StatusChipVariant;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  variant = 'ontime',
  label,
  className = '',
  style,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'ontime':
        return {
          bg: COCKPIT_TOKENS.status.green.bg,
          border: COCKPIT_TOKENS.status.green.border,
          text: COCKPIT_TOKENS.status.green.text,
          icon: <Check size={14} strokeWidth={2} />,
          defaultLabel: 'On time',
        };
      case 'delayed':
        return {
          bg: COCKPIT_TOKENS.status.amber.bg,
          border: COCKPIT_TOKENS.status.amber.border,
          text: COCKPIT_TOKENS.status.amber.text,
          icon: <Clock size={14} strokeWidth={2} />,
          defaultLabel: 'Delayed',
        };
      case 'alert':
        return {
          bg: COCKPIT_TOKENS.status.red.bg,
          border: COCKPIT_TOKENS.status.red.border,
          text: COCKPIT_TOKENS.status.red.text,
          icon: <AlertTriangle size={14} strokeWidth={2} />,
          defaultLabel: 'Alert',
        };
      case 'assigned':
        return {
          bg: COCKPIT_TOKENS.lavender[50],
          border: COCKPIT_TOKENS.lavender[200],
          text: COCKPIT_TOKENS.lavender[800],
          icon: <Package size={14} strokeWidth={2} />,
          defaultLabel: 'Assigned',
        };
      case 'waiting':
      default:
        return {
          bg: COCKPIT_TOKENS.status.grey.bg,
          border: COCKPIT_TOKENS.status.grey.border,
          text: COCKPIT_TOKENS.status.grey.text,
          icon: <Hourglass size={14} strokeWidth={2} />,
          defaultLabel: 'Waiting for vehicle',
        };
    }
  };

  const config = getVariantStyles();
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`cockpit-status-chip cockpit-status-${variant} ${className}`}
      data-testid="cockpit-status-chip"
      data-variant={variant}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: COCKPIT_TOKENS.radii.pill,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text,
        fontSize: '11.5px',
        fontWeight: 600,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center' }}>
        {config.icon}
      </span>
      <span>{displayLabel}</span>
    </span>
  );
};

