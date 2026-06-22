// Shared design tokens. Light theme, mirroring the Watchtimer convention of
// capping content width so the app stays phone-scaled on desktop web.
export const COLORS = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F6',
  text: '#1A1D23',
  textMuted: '#6B7280',
  border: '#E3E6EB',
  primary: '#2563EB', // weight line
  accent: '#F97316', // reps line
  danger: '#DC2626',
  success: '#16A34A',
  onPrimary: '#FFFFFF',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const FONT = {
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

// Keep content phone-width on large/desktop web screens.
export const MAX_CONTENT_WIDTH = 480;
