/**
 * Main client-side entry point
 * Initializes all interactive features
 */

import { initializeTheme } from "./theme";
import { initializeMermaid } from "./mermaid";
import { initializeTableOfContents } from "./toc";
import { initializeAllCopyButtons } from "./copy-button";

function init(): void {
  initializeTheme();
  initializeMermaid();
  initializeTableOfContents();
  initializeAllCopyButtons();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
