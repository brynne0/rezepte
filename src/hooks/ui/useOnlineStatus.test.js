import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { useOnlineStatus } from "./useOnlineStatus";

describe("useOnlineStatus Hook", () => {
  let mockAddEventListener;
  let mockRemoveEventListener;
  let originalOnLine;

  beforeEach(() => {
    // Store the original navigator.onLine value
    originalOnLine = navigator.onLine;

    // Mock event listeners
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();

    Object.defineProperty(window, "addEventListener", {
      value: mockAddEventListener,
      writable: true,
    });

    Object.defineProperty(window, "removeEventListener", {
      value: mockRemoveEventListener,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore original navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
    });
  });

  test("initializes with current navigator.onLine value when online", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  test("initializes with current navigator.onLine value when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  test("sets up event listeners on mount", () => {
    renderHook(() => useOnlineStatus());

    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });

  test("removes event listeners on unmount", () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "offline",
      expect.any(Function)
    );
  });

  test("updates state when online event is fired", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    // Get the online event handler
    const onlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "online"
    )[1];

    act(() => {
      onlineHandler();
    });

    expect(result.current).toBe(true);
  });

  test("updates state when offline event is fired", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Get the offline event handler
    const offlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "offline"
    )[1];

    act(() => {
      offlineHandler();
    });

    expect(result.current).toBe(false);
  });

  test("handles multiple online/offline transitions", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Get the event handlers
    const onlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "online"
    )[1];
    const offlineHandler = mockAddEventListener.mock.calls.find(
      (call) => call[0] === "offline"
    )[1];

    // Go offline
    act(() => {
      offlineHandler();
    });
    expect(result.current).toBe(false);

    // Go online
    act(() => {
      onlineHandler();
    });
    expect(result.current).toBe(true);

    // Go offline again
    act(() => {
      offlineHandler();
    });
    expect(result.current).toBe(false);

    // Go online again
    act(() => {
      onlineHandler();
    });
    expect(result.current).toBe(true);
  });

  test("returns boolean value", () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(typeof result.current).toBe("boolean");
  });

  test("does not re-add event listeners on re-render", () => {
    const { rerender } = renderHook(() => useOnlineStatus());

    // Initial render should add listeners
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);

    // Re-render the hook
    rerender();

    // Event listeners should not be re-added on re-render
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(0);
  });
});
