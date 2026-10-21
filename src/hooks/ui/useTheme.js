import { useSyncExternalStore } from "react";

export const THEME_OPTIONS = ["light", "dark", "system"];

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set();

const readPreference = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEME_OPTIONS.includes(saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  return "system";
};

let preference = readPreference();

const resolveTheme = (pref) => {
  if (pref !== "system") return pref;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
};

const applyTheme = () => {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");

  // Mobile browser chrome colour
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((tag) => tag.remove());
  const metaTag = document.createElement("meta");
  metaTag.name = "theme-color";
  metaTag.content = resolved === "dark" ? "#241d19" : "#f2e7d2";
  document.head.appendChild(metaTag);
};

const setTheme = (next) => {
  preference = THEME_OPTIONS.includes(next) ? next : "system";
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // localStorage unavailable
  }
  applyTheme();
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => preference;

// Call once on startup
export const initTheme = () => {
  preference = readPreference();
  applyTheme();
  window.matchMedia(DARK_QUERY).addEventListener?.("change", () => {
    if (preference === "system") applyTheme();
  });
};

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);
  return { theme, setTheme };
};
