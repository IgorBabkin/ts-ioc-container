/**
 * Toast notification system using Bootstrap Toast
 */

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

  // Icon based on type
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
    </svg>`,
    danger: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>
    </svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
    </svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
    </svg>`,
  };

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
        ${icons[type]}
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
