export const coloursCssVars = {
  "--ss-bg-primary": "#111418",

  "--ss-surface": "rgba(255, 255, 255, 0.03)",
  "--ss-border": "rgba(255, 255, 255, 0.07)",

  "--ss-accent-positive": "#22a17d",
  "--ss-accent-negative": "#e05a5a",
  "--ss-accent-stable": "#5b8db8",
  "--ss-accent-warning": "#c8963e",

  "--ss-accent-cyan": "#22a17d",
  "--ss-accent-deep-cyan": "#22a17d",
  "--ss-accent-electric-blue-soft": "#5b8db8",
  "--ss-accent-muted-magenta": "#e05a5a",

  "--ss-surface-2": "rgba(255, 255, 255, 0.03)",
  "--ss-surface-3": "rgba(255, 255, 255, 0.04)",
  "--ss-surface-4": "rgba(255, 255, 255, 0.05)",
  "--ss-surface-tertiary": "rgba(255, 255, 255, 0.06)",

  "--ss-glow-cyan": "rgba(34, 161, 125, 0.12)",
  "--ss-glow-cyan-strong": "rgba(34, 161, 125, 0.18)",

  "--ss-glow-deep-blue": "rgba(91, 141, 184, 0.10)",
  "--ss-glow-deep-blue-strong": "rgba(91, 141, 184, 0.16)",

  "--ss-glow-magenta": "rgba(224, 90, 90, 0.14)",
  "--ss-glow-magenta-strong": "rgba(224, 90, 90, 0.20)",

  "--ss-glow-warning": "rgba(200, 150, 62, 0.12)",
  "--ss-glow-warning-strong": "rgba(200, 150, 62, 0.18)",
} as const;

export type ColoursCssVarName = keyof typeof coloursCssVars;
export type ColoursCssVarValue = (typeof coloursCssVars)[ColoursCssVarName];
