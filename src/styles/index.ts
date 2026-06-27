import { color, font, space, radius, elevation, typeScale, layout } from '../design/tokens';

export const colors = {
  bg: { primary: color.bg, secondary: color.bgAlt, tertiary: color.border },
  text: { primary: color.text, secondary: color.textMuted, muted: color.textFaint, tertiary: color.textFaint, secondaryText: color.textMuted },
  brand: { primary: color.primary, dark: color.primaryDark, light: color.primary },
  semantic: { success: color.success, danger: color.danger, warning: color.textFaint, error: color.danger },
  // Flat aliases for backward compatibility
  primary: color.primary,
  success: color.success,
  warning: color.textFaint,
  error: color.danger,
};

export const typography = {
  font,
  h1: { fontSize: typeScale.h1.desktop.size, fontWeight: typeScale.h1.desktop.weight, lineHeight: typeScale.h1.desktop.line },
  h2: { fontSize: typeScale.h2.desktop.size, fontWeight: typeScale.h2.desktop.weight, lineHeight: typeScale.h2.desktop.line },
  h3: { fontSize: typeScale.h3.desktop.size, fontWeight: typeScale.h3.desktop.weight, lineHeight: typeScale.h3.desktop.line },
  body: { fontSize: typeScale.body.desktop.size, fontWeight: typeScale.body.desktop.weight, lineHeight: typeScale.body.desktop.line },
  bodyEmphasis: { fontSize: typeScale.body.desktop.size, fontWeight: 600, lineHeight: typeScale.body.desktop.line },
  bodyText: { fontSize: typeScale.body.desktop.size, fontWeight: 400, lineHeight: typeScale.body.desktop.line },
  label: { fontSize: typeScale.label.desktop.size, fontWeight: typeScale.label.desktop.weight, lineHeight: typeScale.label.desktop.line },
  caption: { fontSize: typeScale.caption.desktop.size, fontWeight: typeScale.caption.desktop.weight, lineHeight: typeScale.caption.desktop.line },
  pageTitle: { fontSize: typeScale.h1.desktop.size, fontWeight: typeScale.h1.desktop.weight, lineHeight: typeScale.h1.desktop.line },
  sectionTitle: { fontSize: typeScale.h2.desktop.size, fontWeight: typeScale.h2.desktop.weight, lineHeight: typeScale.h2.desktop.line },
  cardTitle: { fontSize: typeScale.h3.desktop.size, fontWeight: typeScale.h3.desktop.weight, lineHeight: typeScale.h3.desktop.line },
  heroTitle: { fontSize: typeScale.hero.desktop.size, fontWeight: typeScale.hero.desktop.weight, lineHeight: typeScale.hero.desktop.line, letterSpacing: typeScale.hero.desktop.track },
  secondaryText: { fontSize: typeScale.body.desktop.size, fontWeight: 400, lineHeight: typeScale.body.desktop.line, color: color.textMuted },
};

export const spacing = {
  ...space,
  base: space[4],
  xs: space[1],
  sm: space[2],
  lg: space[6],
  xl: space[8],
  xxl: space[12],
};

export { radius, elevation, layout };
