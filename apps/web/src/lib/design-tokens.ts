// KostIn design tokens — Next.js / Web (Pemilik + Penyewa parity)
// Source: DESIGN_ANALYSIS_mob_penyewa.md / DESIGN_ANALYSIS_web_pemilik.md
// Kept in sync with apps/mobile/src/theme/index.ts — same token names & hex
// values, adapted per-platform only where the platform forces a difference
// (font-family strings include the CSS fallback stack; radius/spacing stay
// unitless numbers so callers can append `px` or feed a CSS-in-JS lib).

export const colors = {
  // Brand / accent
  accent: '#FF5A5F',
  accentHover: '#E03C41',
  accentSoft: '#FFF1F1',
  accentBorder: '#FFB3B5',

  // Neutrals & surfaces
  dark: '#1C1C1E',
  darkMid: '#2C2C2E',
  surface: '#FFFFFF',
  bg: '#F4F4F5',
  bgAlt: '#FAFAFA',
  border: '#E4E4E7',
  borderLight: '#F4F4F5',

  // Text
  text: '#1C1C1E',
  textSec: '#3F3F46',
  textMid: '#71717A',
  textLight: '#A1A1AA',

  // Semantic states
  success: '#10B981',
  successSoft: '#ECFDF5',
  successBorder: '#6EE7B7',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  warningBorder: '#FCD34D',
  error: '#EF4444',
  errorSoft: '#FEF2F2',
  errorBorder: '#FCA5A5',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',

  // Misc
  mapBg: '#E8EEF4',

  // Domain-specific extras observed on individual screens (escrow/KYC/etc.)
  escrow: '#006C49',
  escrowDeep: '#005236',
  escrowSoft: '#6FFBBE',
  verified: '#00AC77',
  warningTextDeep: '#92400E',
} as const;

export const typography = {
  fontFamily: {
    heading: "'Rubik', sans-serif",
    body: "'Inter', sans-serif",
    mono: "ui-monospace, monospace",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  // Named scale synthesized from the observed size sets in both design docs
  // (mobile: 9–84px, web: 9–64px). Use these tokens instead of raw numbers.
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
    display: 64,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.5,
  },
} as const;

// 4px base unit — matches observed paddings/gaps across both prototypes
// (4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80).
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
  '7xl': 80,
} as const;

// Observed across KCard/WCard/WModalCard/KChip/WPillTab radii.
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  full: 999,
} as const;

export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
} as const;

export type DesignTokens = typeof designTokens;
export type ColorToken = keyof typeof colors;
export type FontSizeToken = keyof typeof typography.fontSize;
export type SpacingToken = keyof typeof spacing;
export type BorderRadiusToken = keyof typeof borderRadius;

export default designTokens;
