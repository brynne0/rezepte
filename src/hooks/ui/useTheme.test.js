import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { useTheme, initTheme } from "./useTheme";

describe("useTheme Hook", () => {
  let mockLocalStorage;
  let systemDark;
  let mediaListeners;

  const themeColor = () =>
    document.querySelector('meta[name="theme-color"]')?.content;

  beforeEach(() => {
    mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    systemDark = false;
    mediaListeners = [];
    Object.defineProperty(window, "matchMedia", {
      value: vi.fn(() => ({
        get matches() {
          return systemDark;
        },
        addEventListener: (_event, listener) => mediaListeners.push(listener),
        removeEventListener: vi.fn(),
      })),
      writable: true,
    });

    document.documentElement.classList.remove("dark");
  });

  test("defaults to system when nothing is saved", () => {
    initTheme();
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
  });

  test("system preference follows the OS (light)", () => {
    initTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(themeColor()).toBe("#f2e7d2");
  });

  test("system preference follows the OS (dark)", () => {
    systemDark = true;
    initTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(themeColor()).toBe("#241d19");
  });

  test("reacts to OS theme changes while set to system", () => {
    initTheme();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    systemDark = true;
    mediaListeners.forEach((listener) => listener());

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("ignores OS theme changes when an explicit theme is set", () => {
    mockLocalStorage.getItem.mockReturnValue("light");
    initTheme();

    systemDark = true;
    mediaListeners.forEach((listener) => listener());

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  test("initialises with saved theme from localStorage", () => {
    mockLocalStorage.getItem.mockReturnValue("dark");
    initTheme();
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("falls back to system for invalid saved values", () => {
    mockLocalStorage.getItem.mockReturnValue("invalid-theme");
    initTheme();
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
  });

  test("falls back to system when localStorage throws", () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });
    initTheme();
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("system");
  });

  test("setTheme persists, applies and updates all consumers", () => {
    initTheme();
    const first = renderHook(() => useTheme());
    const second = renderHook(() => useTheme());

    act(() => {
      first.result.current.setTheme("dark");
    });

    expect(first.result.current.theme).toBe("dark");
    expect(second.result.current.theme).toBe("dark");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      first.result.current.setTheme("system");
    });

    expect(second.result.current.theme).toBe("system");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  test("does not write to localStorage just by loading", () => {
    initTheme();
    renderHook(() => useTheme());

    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });
});
