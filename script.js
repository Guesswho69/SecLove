// ============================================================
// script.js
// Shared utilities imported by every page. Nothing page-specific
// lives here — this is the common toolbox: auth guarding, theme,
// toasts, ripple/skeleton/splash helpers, validators, formatters.
// ============================================================

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// ---------------------------------------------------------
// Auth guard
// ---------------------------------------------------------
/**
 * Waits for Firebase Auth to resolve, then either calls `onReady(user)`
 * for a signed-in user, or redirects to login.html if signed out.
 * Every protected page (dashboard/profile/inbox/settings) should call
 * this exactly once instead of touching onAuthStateChanged directly.
 * @param {(user: import("firebase/auth").User) => void} onReady
 */
export function requireAuth(onReady) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onReady(user);
    } else {
      window.location.href = "login.html";
    }
  });
}

// ---------------------------------------------------------
// Auto-login redirect
// ---------------------------------------------------------
/**
 * For public-facing pages (index/login/signup): if the visitor already
 * has an active session — e.g. they searched the site again, or
 * bookmarked it, and chose "stay logged in" at their last login —
 * send them straight to the dashboard instead of showing the
 * landing/login form again. Call this once at the top of the page;
 * it resolves quietly and does nothing if no one is signed in.
 * @param {string} destination
 */
export function redirectIfLoggedIn(destination = "dashboard.html") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = destination;
    } else {
      hideSplash();
    }
  });
}

// ---------------------------------------------------------
// Notifications
// ---------------------------------------------------------
/**
 * Asks the browser for permission to show system notifications.
 * Safe to call repeatedly — browsers only prompt once per origin.
 * NOTE: this only enables notifications while a tab for this site
 * is open (foreground or backgrounded). Waking the phone when the
 * site/app is fully closed requires push notifications (Firebase
 * Cloud Messaging + a service worker + a server-side trigger), which
 * is outside what a pure static-site, no-backend build can do.
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Shows a system notification if permission has been granted,
 * falling back silently otherwise (the in-app toast still covers that case).
 */
export function showSystemNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: undefined, tag: "secret-letter-message" });
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

// ---------------------------------------------------------
// Anonymous sender hint
// ---------------------------------------------------------
/**
 * Builds a small, non-identifying "hint" about a message sender —
 * device type, browser family, and a coarse region derived from their
 * timezone. This deliberately stops well short of anything that could
 * identify a specific person: no IP address, no precise location, no
 * fingerprinting. It's the same category of detail sites already infer
 * from a plain page request, just surfaced to the recipient as flavor.
 * @returns {{device: string, browser: string, region: string}}
 */
export function buildSenderHint() {
  const ua = navigator.userAgent || "";
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";

  let browser = "a browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("OPR")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  let region = "somewhere";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    // "America/New_York" -> "New York"; "Europe/London" -> "London"
    const parts = tz.split("/");
    if (parts.length > 1) region = parts[parts.length - 1].replace(/_/g, " ");
  } catch {
    // Intl not available — leave as "somewhere"
  }

  return { device, browser, region };
}

// ---------------------------------------------------------
// Theme
// ---------------------------------------------------------
/**
 * Applies the saved theme (or system preference) before first paint
 * is ideal, but since this runs after <link> parsing we apply it as
 * early as the module executes and update the toggle icon if present.
 */
export function initTheme() {
  const saved = localStorage.getItem("sl-theme");
  const preferred = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", preferred);

  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) toggleBtn.textContent = preferred === "light" ? "☀️" : "🌙";
}

// ---------------------------------------------------------
// Splash screen
// ---------------------------------------------------------
export function hideSplash() {
  const splash = document.getElementById("splash");
  if (splash) splash.classList.add("hidden");
}

// ---------------------------------------------------------
// Offline / online detection
// ---------------------------------------------------------
export function initOfflineBanner() {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;

  const update = () => {
    banner.classList.toggle("show", !navigator.onLine);
  };
  window.addEventListener("online", () => {
    update();
    showToast("Back online.", "success");
  });
  window.addEventListener("offline", () => {
    update();
    showToast("You're offline.", "error");
  });
  update();
}

// ---------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------
/**
 * Shows a toast at the bottom of the screen. Type is "success", "error", or default.
 * @param {string} message
 * @param {"success"|"error"|""} type
 */
export function showToast(message, type = "") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`.trim();
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("leaving");
    setTimeout(() => toast.remove(), 240);
  }, 3200);
}

// ---------------------------------------------------------
// Ripple effect (delegated — call after any innerHTML update
// that adds new [data-ripple] buttons)
// ---------------------------------------------------------
let rippleDelegated = false;

export function attachRipples() {
  if (rippleDelegated) return; // delegated listener only needs to attach once
  rippleDelegated = true;

  document.addEventListener("click", (e) => {
    const target = e.target.closest(".btn, [data-ripple]");
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    const prevPosition = getComputedStyle(target).position;
    if (prevPosition === "static") target.style.position = "relative";
    target.style.overflow = "hidden";
    target.appendChild(ripple);

    setTimeout(() => ripple.remove(), 620);
  });
}

// ---------------------------------------------------------
// Button loading state
// ---------------------------------------------------------
/**
 * Toggles a button between normal and loading state, swapping its
 * label and disabling interaction while a request is in flight.
 * @param {HTMLButtonElement} btn
 * @param {boolean} isLoading
 * @param {string} label
 */
export function setButtonLoading(btn, isLoading, label) {
  if (!btn) return;
  btn.disabled = isLoading;
  const textSpan = btn.querySelector("span:not(.spinner)") || btn;
  if (isLoading) {
    btn.dataset.originalLabel = textSpan.textContent;
    textSpan.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span>${label}`;
  } else {
    textSpan.textContent = label || btn.dataset.originalLabel || textSpan.textContent;
  }
}

// ---------------------------------------------------------
// Debounce
// ---------------------------------------------------------
/**
 * Returns a debounced version of fn that waits `delay` ms of silence
 * before firing — used for live username checks and search input.
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---------------------------------------------------------
// Validators
// ---------------------------------------------------------
export function isValidUsername(value) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ---------------------------------------------------------
// Formatters
// ---------------------------------------------------------
/**
 * Formats a Firestore Timestamp (or null, if serverTimestamp hasn't
 * resolved locally yet) as "Jul 2026".
 */
export function formatMonthYear(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "Just now";
  return timestamp.toDate().toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/**
 * Formats a Firestore Timestamp as a short relative time ("3m ago",
 * "2h ago", "5d ago") falling back to a date once it's old enough.
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "Just now";
  const date = timestamp.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Escapes a string for safe insertion into innerHTML — used whenever
 * we render user-authored text (bios, message bodies).
 */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------------------------------------------------------
// Image compression (client-side, before Storage upload)
// ---------------------------------------------------------
/**
 * Resizes and re-encodes an image file to a JPEG blob capped at
 * `maxDimension` on its longest side, at the given quality. Keeps
 * profile photo uploads small and fast regardless of the source size.
 * @param {File} file
 * @param {number} maxDimension
 * @param {number} quality 0-1
 * @returns {Promise<Blob>}
 */
export function compressImage(file, maxDimension = 512, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Compression failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read image"));
    };

    img.src = url;
  });
}

