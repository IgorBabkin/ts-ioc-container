/**
 * Theme management script
 * Handles light/dark theme switching with localStorage persistence
 */

import {
  THEME_KEY,
  THEME_DARK,
  THEME_LIGHT,
  THEME_ATTRIBUTE,
  type ThemeMode,
} from "../config/theme";
import { getSystemTheme } from "../utils/theme";

export function getStoredTheme(): ThemeMode | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(THEME_KEY) as ThemeMode | null;
}

export function setStoredTheme(theme: ThemeMode): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(THEME_KEY, theme);
  }
}

export function getPreferredTheme(): ThemeMode {
  return getStoredTheme() || getSystemTheme();
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
  updateThemeIcons(theme);
}

export function updateThemeIcons(theme: ThemeMode): void {
  const lightIcon = document.getElementById("theme-icon-light");
  const darkIcon = document.getElementById("theme-icon-dark");

  if (theme === THEME_DARK) {
    lightIcon?.style.setProperty("display", "none");
    darkIcon?.style.setProperty("display", "block");
  } else {
    lightIcon?.style.setProperty("display", "block");
    darkIcon?.style.setProperty("display", "none");
  }
}

export function setTheme(theme: ThemeMode): void {
  applyTheme(theme);
  setStoredTheme(theme);

  // Dispatch custom event for Mermaid and other components
  window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme } }));
}

export function toggleTheme(): void {
  const currentTheme = document.documentElement.getAttribute(
    THEME_ATTRIBUTE,
  ) as ThemeMode;
  const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  setTheme(newTheme);
}

export function initializeTheme(): void {
  const theme = getPreferredTheme();
  applyTheme(theme);

  // Watch for system theme changes
  if (typeof window !== "undefined") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (!getStoredTheme()) {
          setTheme(e.matches ? THEME_DARK : THEME_LIGHT);
        }
      });
  }

  // Setup theme toggle button
  const toggleButton = document.getElementById("theme-toggle");
  if (toggleButton) {
    toggleButton.addEventListener("click", toggleTheme);
  }
}
