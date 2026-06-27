// COLOR — Stripe palette. 10 values. No others permitted anywhere.
export const color = {
  primary:    '#635BFF',  // Stripe purple-blue — CTAs, links, active state
  primaryDark:'#0A2540',  // Stripe ink — headings
  text:       '#1A1A1A',  // body
  textMuted:  '#697386',  // secondary / labels
  textFaint:  '#8792A2',  // captions, timestamps
  bg:         '#FFFFFF',  // page background
  bgAlt:      '#F6F9FC',  // section / card background (Stripe's light wash)
  border:     '#E3E8EE',  // 1px borders, dividers
  success:    '#1A7F4B',  // gains
  danger:     '#DF1B41',  // losses, errors
} as const;

// TYPE — system stack only. No web fonts, no Inter import.
export const font =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// SPACING — 4px base. Use the scale, never raw px.
export const space = {
  1:'4px', 2:'8px', 3:'12px', 4:'16px', 5:'20px', 6:'24px',
  8:'32px', 10:'40px', 12:'48px', 16:'64px', 20:'80px', 24:'96px'
} as const;

export const radius = { sm:'6px', md:'8px', lg:'12px', pill:'980px' } as const;

// Apple-style: NO drop shadows. Depth via border + bgAlt only.
export const elevation = {
  none: 'none',
  card: '0 0 0 1px ' + color.border
} as const;

// Responsive type scale — sizes differ by device, define BOTH explicitly.
// Each token = [mobile, desktop]. Apply mobile by default, desktop at ≥768px.
export const typeScale = {
  hero: {
    mobile:  { size:'40px', weight:600, line:'1.1',  track:'-0.02em' },
    desktop: { size:'64px', weight:600, line:'1.05', track:'-0.022em' },
  },
  h1: {
    mobile:  { size:'28px', weight:600, line:'1.2' },
    desktop: { size:'40px', weight:600, line:'1.15' },
  },
  h2: {
    mobile:  { size:'22px', weight:600, line:'1.3' },
    desktop: { size:'28px', weight:600, line:'1.25' },
  },
  h3: {
    mobile:  { size:'18px', weight:600, line:'1.3' },
    desktop: { size:'20px', weight:600, line:'1.3' },
  },
  body: {
    mobile:  { size:'16px', weight:400, line:'1.6' },
    desktop: { size:'17px', weight:400, line:'1.6' },
  },
  label: {
    mobile:  { size:'13px', weight:500, line:'1.4' },
    desktop: { size:'14px', weight:500, line:'1.4' },
  },
  caption: {
    mobile:  { size:'12px', weight:400, line:'1.4' },
    desktop: { size:'12px', weight:400, line:'1.4' },
  },
  mono: {
    mobile:  { size:'15px', weight:600, line:'1.2' },
    desktop: { size:'16px', weight:600, line:'1.2' },
  },
} as const;

// Layout dimensions — mobile vs desktop, exact.
export const layout = {
  pagePaddingMobile:  '16px',
  pagePaddingDesktop: '48px',
  maxContentWidth:    '1120px',
  sectionGapMobile:   '48px',
  sectionGapDesktop:  '80px',
  cardPaddingMobile:  '16px',
  cardPaddingDesktop: '24px',
  gridMinColWidth:    '240px',
  navTabBarHeight:    '56px',
  navRailWidth:       '240px',
  buttonHeightMobile: '44px',
  buttonHeightDesktop:'40px',
  touchTargetMin:     '44px',
  breakpoint:         '768px',
} as const;
