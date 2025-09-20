import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { useTheme } from "./useTheme";

describe("useTheme Hook", () => {
  let mockMatchMedia;
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock matchMedia
    mockMatchMedia = vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      value: mockMatchMedia,
      writable: true,
    });

    // Mock document.documentElement.setAttribute
    document.documentElement.setAttribute = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("initialises with light theme when no localStorage value and system prefers light", () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({ matches: false });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  test("initialises with dark theme when no localStorage value and system prefers dark", () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({ matches: true });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  test("initialises with saved theme from localStorage", () => {
    mockLocalStorage.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
    expect(mockMatchMedia).not.toHaveBeenCalled();
  });

  test("saves theme to localStorage on initialisation", () => {
    mockLocalStorage.getItem.mockReturnValue("light");

    renderHook(() => useTheme());

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "light"
    );
  });

  test("sets data-theme attribute on document element on initialisation", () => {
    mockLocalStorage.getItem.mockReturnValue("dark");

    renderHook(() => useTheme());

    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "dark"
    );
  });

  test("toggleTheme switches from light to dark", () => {
    mockLocalStorage.getItem.mockReturnValue("light");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "dark"
    );
  });

  test("toggleTheme switches from dark to light", () => {
    mockLocalStorage.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "light"
    );
  });

  test("setTheme directly sets the theme", () => {
    mockLocalStorage.getItem.mockReturnValue("light");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "dark"
    );
  });

  test("setTheme with light theme", () => {
    mockLocalStorage.getItem.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "light");
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "light"
    );
  });

  test("theme persistence through multiple toggles", () => {
    mockLocalStorage.getItem.mockReturnValue("light");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe("dark");

    expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(4); // Initial + 3 toggles
    expect(document.documentElement.setAttribute).toHaveBeenCalledTimes(4);
  });

  test("returns all expected methods and values", () => {
    mockLocalStorage.getItem.mockReturnValue("light");

    const { result } = renderHook(() => useTheme());

    expect(result.current).toHaveProperty("theme");
    expect(result.current).toHaveProperty("setTheme");
    expect(result.current).toHaveProperty("toggleTheme");
    expect(typeof result.current.theme).toBe("string");
    expect(typeof result.current.setTheme).toBe("function");
    expect(typeof result.current.toggleTheme).toBe("function");
  });

  test("handles invalid localStorage values gracefully", () => {
    mockLocalStorage.getItem.mockReturnValue("invalid-theme");
    mockMatchMedia.mockReturnValue({ matches: false });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("invalid-theme");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "theme",
      "invalid-theme"
    );
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(
      "data-theme",
      "invalid-theme"
    );
  });

  test("handles localStorage throwing errors", () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });
    mockMatchMedia.mockReturnValue({ matches: false });

    const { result } = renderHook(() => useTheme());
    
    // Should not throw and should fall back to system preference
    expect(result.current.theme).toBe("light");
  });

  test("theme state updates trigger useEffect", () => {
    mockLocalStorage.getItem.mockReturnValue("light");

    const { result } = renderHook(() => useTheme());

    const initialSetItemCalls = mockLocalStorage.setItem.mock.calls.length;
    const initialSetAttributeCalls =
      document.documentElement.setAttribute.mock.calls.length;

    act(() => {
      result.current.setTheme("dark");
    });

    expect(mockLocalStorage.setItem.mock.calls.length).toBe(
      initialSetItemCalls + 1
    );
    expect(document.documentElement.setAttribute.mock.calls.length).toBe(
      initialSetAttributeCalls + 1
    );
  });
});
