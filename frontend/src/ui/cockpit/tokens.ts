/**
 * src/ui/cockpit/tokens.ts
 * TypeScript exports for Cockpit Design Tokens
 * Sampled from Dispatch dashboard CSS per HOSPITAL_UI_SPEC.md 2
 */

export const COCKPIT_TOKENS = {
  surfaces: {
    pageBg: '#E9EBF2',
    cardBg: '#FFFFFF',
    cardBgSubtle: '#F8FAFC',
    maxWidth: 1320,
  },
  radii: {
    hero: 32,
    card: 24,
    inner: 16,
    pill: 9999,
    sm: 8,
  },
  shadows: {
    card: '0 1px 2px rgba(20, 27, 45, 0.04), 0 12px 32px rgba(20, 27, 45, 0.06)',
    lift: '0 4px 12px rgba(20, 27, 45, 0.06), 0 20px 48px rgba(20, 27, 45, 0.08)',
    popover: '0 12px 32px rgba(20, 27, 45, 0.12), 0 1px 3px rgba(20, 27, 45, 0.06)',
    vehicleGround: '0 16px 28px -6px rgba(20, 27, 45, 0.22)',
  },
  hairlines: {
    default: '1px solid rgba(20, 27, 45, 0.08)',
    subtle: '1px solid rgba(20, 27, 45, 0.04)',
    strong: '1px solid rgba(20, 27, 45, 0.14)',
  },
  ink: {
    primary: '#141B2D',
    secondary: 'rgba(20, 27, 45, 0.70)',
    muted: 'rgba(20, 27, 45, 0.60)',
    subtle: 'rgba(20, 27, 45, 0.40)',
    faint: 'rgba(20, 27, 45, 0.20)',
  },
  lavender: {
    50: '#F5F3FF',
    100: '#EFE9FE',
    200: '#DDD6FE',
    500: '#8B5CF6',
    600: '#7C3AED',
    800: '#5B21B6',
  },
  status: {
    red: {
      bg: '#FEE2E2',
      border: '#FCA5A5',
      text: '#991B1B',
      solid: '#DC2626',
    },
    amber: {
      bg: '#FEF3C7',
      border: '#FCD34D',
      text: '#92400E',
      solid: '#D97706',
    },
    green: {
      bg: '#DCFCE7',
      border: '#86EFAC',
      text: '#166534',
      solid: '#16A34A',
      dark: '#15803D',
    },
    grey: {
      bg: '#F1F3F5',
      border: '#E2E8F0',
      text: '#475569',
      solid: '#64748B',
    },
  },
  fonts: {
    display: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  },
} as const;

