import React from 'react';
import { LEDGER_TOKENS } from './tokens';

export type StageLevel = 1 | 2 | 3 | 4 | 5; // 1: requested, 2: found, 3: packed, 4: in_transit, 5: delivered
export type StageVariant = 'default' | 'delayed' | 'alert';

export interface StageGlyphProps {
  stage?: StageLevel;
  variant?: StageVariant;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const StageGlyph: React.FC<StageGlyphProps> = ({
  stage = 1,
  variant = 'default',
  size = 16,
  className = '',
  style,
}) => {
  const color =
    variant === 'alert'
      ? LEDGER_TOKENS.bad
      : variant === 'delayed'
      ? LEDGER_TOKENS.warn
      : stage === 5
      ? LEDGER_TOKENS.good
      : LEDGER_TOKENS.ink;

  const trackColor = LEDGER_TOKENS.hairlineStrong;

  // Center & radius for 16x16 SVG
  const c = 8;
  const r = 6.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={`ledger-stage-glyph ${className}`}
      data-testid="ledger-stage-glyph"
      data-stage={stage}
      aria-label={`Stage ${stage} of 5`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Outer Circle Track */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth="1.5"
      />

      {/* Progress fill according to stage */}
      {stage === 1 && (
        /* Empty circle */
        null
      )}

      {stage === 2 && (
        /* Quarter filled (top-right quadrant) */
        <path
          d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 0 1 ${c + r} ${c} Z`}
          fill={color}
        />
      )}

      {stage === 3 && (
        /* Half filled (right half) */
        <path
          d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} Z`}
          fill={color}
        />
      )}

      {stage === 4 && (
        /* Three quarters filled */
        <path
          d={`M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - r} ${c} Z`}
          fill={color}
        />
      )}

      {stage === 5 && (
        /* Filled circle with checkmark */
        <>
          <circle cx={c} cy={c} r={r} fill={color} />
          <path
            d="M 5 8.2 L 7.1 10.3 L 11 6.2"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
};

