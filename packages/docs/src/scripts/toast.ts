/**
 * Toast notification system using Bootstrap Toast
 */

import successIcon from "@assets/toast-icons/success.svg?raw";
import dangerIcon from "@assets/toast-icons/danger.svg?raw";
import warningIcon from "@assets/toast-icons/warning.svg?raw";
import infoIcon from "@assets/toast-icons/info.svg?raw";

// Declare global bootstrap object from CDN
declare const bootstrap: {
  Toast: new (
    element: HTMLElement,
    options?: { autohide?: boolean; delay?: number },
  ) => {
    show(): void;
  };
};

export interface ToastOptions {
  message: string;
  type?: "success" | "danger" | "warning" | "info";
  duration?: number;
}

const toastIcons = {
  success: successIcon,
  danger: dangerIcon,
  warning: warningIcon,
  info: infoIcon,
};

let toastCounter = 0;

export function showToast(options: ToastOptions): void {
  const { message, type = "success", duration = 3000 } = options;

  const container = document.getElementById("toast-container");
  if (!container) {
    console.error("Toast container not found");
    return;
  }

  // Create unique ID for this toast
  const toastId = `toast-${++toastCounter}`;

  // Create toast element
  const toastElement = document.createElement("div");
  toastElement.id = toastId;
  toastElement.className = `toast align-items-center text-bg-${type} border-0`;
  toastElement.setAttribute("role", "alert");
  toastElement.setAttribute("aria-live", "assertive");
  toastElement.setAttribute("aria-atomic", "true");

  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        ${toastIcons[type]}
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toastElement);

  // Initialize and show toast
  const toast = new bootstrap.Toast(toastElement, {
    autohide: true,
    delay: duration,
  });

  toast.show();

  // Remove from DOM after hidden
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

export function showSuccessToast(message: string, duration?: number): void {
  showToast({ message, type: "success", duration });
}

export function showErrorToast(message: string, duration?: number): void {
  showToast({ message, type: "danger", duration });
}

export function showWarningToast(message: string, duration?: number): void {
  showToast({ message, type: "warning", duration });
}

export function showInfoToast(message: string, duration?: number): void {
  showToast({ message, type: "info", duration });
}
