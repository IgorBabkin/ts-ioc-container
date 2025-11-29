/**
 * Utility functions for detecting and managing system theme preferences
 */

/**
 * Get the current system theme preference (macOS/Windows/Linux)
 * @returns "dark" | "light"
 */
export function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") {
    return "light"; // Default for SSR
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Check if system prefers dark mode
 * @returns boolean
 */
export function prefersDarkMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Check if system prefers light mode
 * @returns boolean
 */
export function prefersLightMode(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

/**
 * Watch for system theme changes and call callback when it changes
 * @param callback Function to call when theme changes
 * @returns Function to remove the listener
 */
export function watchSystemTheme(
  callback: (isDark: boolean) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {}; // No-op for SSR
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  // Call immediately with current value
  callback(mediaQuery.matches);

  // Modern browsers support addEventListener
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", (event) => {
      callback(event.matches);
    });
    return () => {
      mediaQuery.removeEventListener("change", (event) => {
        callback(event.matches);
      });
    };
  } else {
    // Fallback for older browsers (deprecated but still works)
    const handler = (event: MediaQueryListEvent) => {
      callback(event.matches);
    };
    mediaQuery.addListener(handler);
    return () => {
      mediaQuery.removeListener(handler);
    };
  }
}

/**
 * Get all available theme information
 * @returns Object with theme information
 */
export function getThemeInfo() {
  if (typeof window === "undefined") {
    return {
      systemTheme: "light" as const,
      prefersDark: false,
      prefersLight: true,
      hasStoredPreference: false,
      storedTheme: null,
    };
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const storedTheme = localStorage.getItem("theme");

  return {
    systemTheme: prefersDark ? ("dark" as const) : ("light" as const),
    prefersDark,
    prefersLight: !prefersDark,
    hasStoredPreference: storedTheme !== null,
    storedTheme,
  };
}
