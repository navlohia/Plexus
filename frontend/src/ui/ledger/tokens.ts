/**
 * src/ui/ledger/tokens.ts
 * Type-safe token values matching tokens.css exactly
 * HOSPITAL_UI_SPEC_V2 Section 2
 */

export const LEDGER_TOKENS = {
  canvas: '#F2F3F7',
  surface: '#FFFFFF',
  hairline: 'rgba(15,23,42,0.06)',
  hairlineStrong: 'rgba(15,23,42,0.12)',

  ink: '#0F172A',
  ink2: '#475569',
  ink3: '#64748B',
  ink4: '#94A3B8',

  primary: '#0F172A',
  primaryText: '#FFFFFF',
  primaryHover: '#1E293B',

  good: '#10B981',
  warn: '#F59E0B',
  bad: '#EF4444',
  warnTint: 'rgba(184,111,16,.07)',
  badTint: 'rgba(196,43,60,.06)',

  fontUi: '"Instrument Sans", "Hanken Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
  fontDisplay: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontMono: '"JetBrains Mono", ui-monospace, monospace',

  type: {
    t12: '12px',
    t13: '13px',
    t14: '14px',
    t17: '17px',
    t22: '22px',
    t27: '27px',
    t34: '34px',
    t42: '42px',
    t53: '53px',
    t66: '66px',
  },

  radius: {
    sm: '4px',
    md: '6px',
    lg: '10px',
  },

  shadow: {
    pop: '0 1px 2px rgba(20,23,28,.06), 0 12px 32px rgba(20,23,28,.10)',
    sheet: '-1px 0 0 var(--hairline), -24px 0 48px rgba(20,23,28,.08)',
  },

  layout: {
    contentMax: '1120px',
    gutter: '32px',
    gutterM: '16px',
    rowH: '44px',
    topbarH: '52px',
  },
} as const;
