// Neumorphic ("soft UI") light theme with an orange highlight. The whole app
// sits on a single soft base color: cards, buttons and inputs share that color
// with the canvas, and depth comes from paired light/dark shadows (see SHADOWS)
// rather than borders or color contrast. Content is capped at MAX_CONTENT_WIDTH
// so the app stays phone-scaled on desktop web.
export const COLORS = {
  background: '#E8ECF2', // soft base — canvas AND raised surfaces share this
  surface: '#E8ECF2',
  surfaceAlt: '#E8ECF2',
  text: '#2C313A',
  textMuted: '#6B7280',
  textFaint: '#A7B0C0', // e.g. "last time" placeholder hints
  border: '#D3DAE6', // hairline for the rare divider; mostly superseded by shadows
  primary: '#F97316', // orange highlight — weight line, primary actions
  accent: '#5C7AA6', // cool slate secondary — reps line (distinct from orange)
  danger: '#DC2626',
  success: '#16A34A',
  onPrimary: '#FFFFFF',
  // Neumorphic shadow tones: light picks out top-left edges, dark the bottom-right.
  shadowLight: '#FFFFFF',
  shadowDark: '#C4CCDB',
} as const;

// Reusable neumorphic elevations. Spread these into a style; on web/native (RN
// 0.81+) `boxShadow` renders the layered soft shadows that define the look.
export const SHADOWS = {
  // Raised card / panel: highlight from the top-left, shadow to the bottom-right.
  raised: {
    boxShadow: `-6px -6px 14px ${COLORS.shadowLight}, 6px 6px 14px ${COLORS.shadowDark}`,
  },
  // Smaller raised element (chips, compact buttons, list rows).
  raisedSm: {
    boxShadow: `-3px -3px 7px ${COLORS.shadowLight}, 3px 3px 7px ${COLORS.shadowDark}`,
  },
  // Recessed surface (text inputs): the raised shadows turned inward.
  inset: {
    boxShadow: `inset 3px 3px 6px ${COLORS.shadowDark}, inset -3px -3px 6px ${COLORS.shadowLight}`,
  },
  // Subtle "pushed in" feedback for a pressed button.
  pressed: {
    boxShadow: `inset 2px 2px 5px ${COLORS.shadowDark}, inset -2px -2px 5px ${COLORS.shadowLight}`,
  },
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
