import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export interface BloodGroupProps {
  group: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Normalizes blood group string:
 * - Ensures letter 'O' instead of digit '0'
 * - Replaces ASCII hyphen '-' with unicode minus sign U+2212 '−'
 * - Keeps '+' as '+'
 */
export function formatBloodGroup(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  // Ensure capital O if user or data had digit 0
  if (cleaned.startsWith('0')) {
    cleaned = 'O' + cleaned.slice(1);
  }
  // Replace hyphen with unicode minus sign U+2212
  cleaned = cleaned.replace(/-/g, '\u2212');
  return cleaned;
}

/**
 * Generates screen-reader safe label:
 * e.g. "O negative", "A positive", "AB negative"
 */
export function getBloodGroupAriaLabel(input: string): string {
  const norm = formatBloodGroup(input);
  const isNeg = norm.includes('\u2212') || input.includes('-');
  const base = norm.replace(/[\u2212+-]/g, '').trim();
  return `${base} ${isNeg ? 'negative' : 'positive'}`;
}

export const BloodGroup: React.FC<BloodGroupProps> = ({
  group,
  size = 17,
  className = '',
  style,
}) => {
  const displayGroup = formatBloodGroup(group);
  const ariaLabel = getBloodGroupAriaLabel(group);

  return (
    <span
      className={`ledger-blood-group ${className}`}
      data-testid="ledger-blood-group"
      aria-label={ariaLabel}
      style={{
        fontFamily: LEDGER_TOKENS.fontUi, // NEVER mono per Spec 14
        fontWeight: 600,
        fontSize: typeof size === 'number' ? `${size}px` : size,
        color: LEDGER_TOKENS.ink,
        letterSpacing: '-0.01em',
        display: 'inline-block',
        ...style,
      }}
    >
      {displayGroup}
    </span>
  );
};

