/**
 * Copy-to-clipboard functionality for code blocks
 */

import { showSuccessToast, showErrorToast } from "./toast";

export function initializeCopyButton(button: HTMLElement): void {
  if (button.dataset.initialized) return;
  button.dataset.initialized = "true";

  button.addEventListener("click", async function (this: HTMLElement) {
    const code = this.getAttribute("data-code");
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);

      // Add copied state
      this.classList.add("copied");
      const copyText = this.querySelector<HTMLElement>(".copy-text");
      if (copyText) {
        copyText.textContent = "Copied!";
      }

      // Show success toast
      showSuccessToast("Code copied to clipboard!");

      // Reset after 2 seconds
      setTimeout(() => {
        this.classList.remove("copied");
        if (copyText) {
          copyText.textContent = "Copy";
        }
      }, 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
      // Show error toast
      showErrorToast("Failed to copy code to clipboard");
    }
  });
}

export function initializeAllCopyButtons(): void {
  const copyButtons = document.querySelectorAll<HTMLElement>(".code-copy-btn");
  copyButtons.forEach(initializeCopyButton);
}
