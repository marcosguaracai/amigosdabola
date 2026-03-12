// Simple helper to set the current year in footers across pages.
(() => {
  const el = document.getElementById("copyright-year");
  if (el) {
    el.textContent = new Date().getFullYear();
  }
})();

(() => {
  if (window.toast) return;

  const containerId = "global-toast-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const showToast = (type, message, options = {}) => {
    const defaults = { success: 2200, info: 2800, error: 3600 };
    const { title, duration = defaults[type] || 2800 } = options;
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      ${title ? `<div class="toast__title">${title}</div>` : ""}
      <div class="toast__message">${message}</div>
    `;
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      window.setTimeout(() => toast.remove(), 200);
    }, duration);
  };

window.toast = {
  success: (message, options) => showToast("success", message, options),
  error: (message, options) => showToast("error", message, options),
  info: (message, options) => showToast("info", message, options),
};
})();

(() => {
  if (window.setFeedback) return;

  window.setFeedback = (element, message = "", tone = "info", options = {}) => {
    if (!element) return;
    if (!element.dataset.defaultHidden) {
      element.dataset.defaultHidden = element.classList.contains("hidden") ? "true" : "false";
    }
    const { persist = false } = options;
    element.dataset.tone = tone;
    element.textContent = message;
    if (message) {
      element.classList.remove("hidden");
      return;
    }
    if (persist) return;
    if (element.dataset.defaultHidden === "true") {
      element.classList.add("hidden");
    }
  };
})();

(() => {
  if (!("HTMLDialogElement" in window)) return;

  const focusableSelector =
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
  let openDialog = null;
  let lastActiveElement = null;

  const getFocusableElements = (dialog) =>
    Array.from(dialog.querySelectorAll(focusableSelector)).filter((el) => !el.disabled);

  const handleKeydown = (event) => {
    if (!openDialog || event.key !== "Tab") return;
    const focusable = getFocusableElements(openDialog);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const isShift = event.shiftKey;
    const active = document.activeElement;

    if (isShift && (active === first || active === openDialog)) {
      event.preventDefault();
      last.focus();
    } else if (!isShift && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const focusFirstElement = (dialog) => {
    const focusable = getFocusableElements(dialog);
    if (focusable.length) {
      focusable[0].focus();
    } else {
      dialog.focus();
    }
  };

  const restoreFocus = () => {
    if (lastActiveElement && document.contains(lastActiveElement)) {
      lastActiveElement.focus();
    }
    lastActiveElement = null;
  };

  const originalShowModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function patchedShowModal(...args) {
    if (!this.open) {
      lastActiveElement = document.activeElement;
      openDialog = this;
      document.addEventListener("keydown", handleKeydown);
    }
    const result = originalShowModal.apply(this, args);
    focusFirstElement(this);
    return result;
  };

  document.addEventListener("close", (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (openDialog === dialog) {
      openDialog = null;
      document.removeEventListener("keydown", handleKeydown);
    }
    restoreFocus();
  }, true);
})();

(() => {
  const main = document.querySelector("main");
  if (!main) return;
  const syncBusyState = () => {
    const isLoading = document.body.classList.contains("page-loading");
    main.setAttribute("aria-busy", isLoading ? "true" : "false");
  };
  syncBusyState();
  const observer = new MutationObserver(syncBusyState);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();

(() => {
  const COPY_COOLDOWN_MS = 2000;

  const copyText = async (value) => {
    if (!value) return false;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    textarea.remove();
    return success;
  };

  const maybeCopy = async (element, options = {}) => {
    if (!element) return;
    const now = Date.now();
    const last = Number(element.dataset.lastCopy || 0);
    if (now - last < COPY_COOLDOWN_MS) return;
    element.dataset.lastCopy = String(now);
    const value = element.dataset.copy || element.textContent || "";
    try {
      const ok = await copyText(value.trim());
      if (ok && window.toast && options.toast !== false) {
        window.toast.info(`Copiado: ${value.trim()}`);
      }
    } catch (error) {
      console.warn("Não foi possível copiar:", error);
    }
  };

  document.addEventListener("mouseover", (event) => {
    const target = event.target.closest("[data-copy]");
    if (!target) return;
    maybeCopy(target, { toast: false });
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-copy]");
    if (!target) return;
    event.preventDefault();
    maybeCopy(target);
  });
})();
