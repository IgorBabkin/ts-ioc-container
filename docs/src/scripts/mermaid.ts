/**
 * Mermaid diagram initialization and theme switching
 */

import mermaid from "mermaid";
import { MERMAID_THEME_LIGHT, MERMAID_THEME_DARK } from "../config/theme";
import { getPreferredTheme } from "./theme";

// Make mermaid globally accessible for re-rendering
declare global {
  interface Window {
    mermaid: typeof mermaid;
  }
}

window.mermaid = mermaid;

/**
 * Store original Mermaid diagram content before processing
 */
export function storeMermaidContent(): void {
  const diagrams = document.querySelectorAll(".mermaid");
  diagrams.forEach((el) => {
    if (!el.hasAttribute("data-original-content")) {
      const content = el.innerHTML.trim() || el.textContent?.trim();
      if (content && !el.hasAttribute("data-processed")) {
        el.setAttribute("data-original-content", content);
      }
    }
  });
}

/**
 * Initialize Mermaid with theme awareness
 */
export function initializeMermaid(): void {
  const theme = getPreferredTheme();
  const mermaidTheme =
    theme === "dark" ? MERMAID_THEME_DARK : MERMAID_THEME_LIGHT;

  mermaid.initialize({
    startOnLoad: true,
    theme: mermaidTheme,
  });
}

/**
 * Re-render all Mermaid diagrams with new theme
 */
export function rerenderMermaidDiagrams(): void {
  document.querySelectorAll(".mermaid").forEach((el) => {
    const originalContent = el.getAttribute("data-original-content");

    if (originalContent) {
      // Clear processed content and restore original
      el.innerHTML = originalContent;
      el.removeAttribute("data-processed");
      el.removeAttribute("data-mermaid");

      // Re-render with new theme
      try {
        mermaid.run({ nodes: [el as HTMLElement] });
      } catch (error) {
        console.warn("Error re-rendering Mermaid diagram:", error);
      }
    }
  });
}

/**
 * Update Mermaid theme and re-render all diagrams
 */
export function updateMermaidTheme(theme: "light" | "dark"): void {
  const mermaidTheme =
    theme === "dark" ? MERMAID_THEME_DARK : MERMAID_THEME_LIGHT;

  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
  });

  rerenderMermaidDiagrams();
}

// Initialize Mermaid content storage
if (document.readyState !== "loading") {
  storeMermaidContent();
} else {
  document.addEventListener("DOMContentLoaded", storeMermaidContent);
}

// Listen for theme changes
window.addEventListener("theme-changed", (e: Event) => {
  const customEvent = e as CustomEvent<{ theme: "light" | "dark" }>;
  updateMermaidTheme(customEvent.detail.theme);
});
