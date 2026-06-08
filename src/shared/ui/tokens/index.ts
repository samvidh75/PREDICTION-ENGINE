/**
 * Unified design token barrel.
 * Replaces: design/, design-system/tokens/, designSystem/theme/
 */
export { colors } from "./colors";
export type { Colors } from "./colors";

export { typography } from "./typography";
export type { Typography } from "./typography";

export { spacing } from "./spacing";
export type { Spacing } from "./spacing";

export { shadows } from "./shadows";
export type { Shadows } from "./shadows";

export { radii } from "./radii";
export type { Radii } from "./radii";

export { motion } from "./motion";
export type { Motion } from "./motion";

export { glow } from "./glow";
export type { Glow } from "./glow";

import { colors } from "./colors";
import { typography } from "./typography";
import { spacing } from "./spacing";
import { shadows } from "./shadows";
import { radii } from "./radii";
import { motion } from "./motion";
import { glow } from "./glow";

/** Unified design tokens object — single import for all tokens. */
export const tokens = { colors, typography, spacing, shadows, radii, motion, glow } as const;
export type Tokens = typeof tokens;
