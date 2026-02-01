/**
 * Theme configuration and constants
 */

import { THEME_KEY, THEME_DARK, THEME_LIGHT, type ThemeMode } from "./types";

export { THEME_KEY, THEME_DARK, THEME_LIGHT };
export type { ThemeMode };

export const THEME_ATTRIBUTE = "data-bs-theme" as const;
export const MERMAID_THEME_LIGHT = "default" as const;
export const MERMAID_THEME_DARK = "dark" as const;

/**
 * Bootstrap theme color overrides
 */
export const themeColors = {
  light: {
    primary: "#87a96b",
    primaryRgb: "135, 169, 107",
  },
  dark: {
    primary: "#a8c585",
    primaryRgb: "168, 197, 133",
  },
} as const;
