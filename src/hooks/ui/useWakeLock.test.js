import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { useWakeLock } from "./useWakeLock";

// A factory that creates a mock WakeLockSentinel
const makeMockSentinel = () => {
  const listeners = {};
  return {
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn((event, fn) => {
      listeners[event] = fn;
    }),
    _trigger: (event) => listeners[event]?.(),
  };
};

describe("useWakeLock", () => {
  let mockSentinel;
  let mockRequest;
  let visibilityHandlers;

  beforeEach(() => {
    mockSentinel = makeMockSentinel();
    mockRequest = vi.fn().mockResolvedValue(mockSentinel);

    Object.defineProperty(navigator, "wakeLock", {
      value: { request: mockRequest },
      writable: true,
      configurable: true,
    });

    // Capture visibilitychange listeners
    visibilityHandlers = [];
    vi.spyOn(document, "addEventListener").mockImplementation((event, fn) => {
      if (event === "visibilitychange") visibilityHandlers.push(fn);
    });
    vi.spyOn(document, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("detects support when wakeLock is in navigator", () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current.supported).toBe(true);
  });

  test("detects no support when wakeLock is missing", () => {
    const nav = navigator;
    delete nav.wakeLock;
    const { result } = renderHook(() => useWakeLock());
    expect(result.current.supported).toBe(false);
  });

  test("starts inactive", () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current.active).toBe(false);
  });

  test("toggle acquires wake lock and sets active", async () => {
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });

    expect(mockRequest).toHaveBeenCalledWith("screen");
    expect(result.current.active).toBe(true);
  });

  test("toggle releases wake lock and sets inactive", async () => {
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.active).toBe(true);

    await act(async () => {
      result.current.toggle();
    });
    expect(mockSentinel.release).toHaveBeenCalled();
    expect(result.current.active).toBe(false);
  });

  test("sentinel release event sets active to false", async () => {
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.active).toBe(true);

    // Simulate the browser revoking the lock externally
    act(() => {
      mockSentinel._trigger("release");
    });
    expect(result.current.active).toBe(false);
  });

  test("reacquires lock when page becomes visible again", async () => {
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Simulate tab going hidden then visible
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    await act(async () => {
      visibilityHandlers.forEach((fn) => fn());
    });

    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  test("does not reacquire when page becomes visible while inactive", async () => {
    renderHook(() => useWakeLock());

    // No toggle called — lock was never acquired
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    await act(async () => {
      visibilityHandlers.forEach((fn) => fn());
    });

    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("releases lock on unmount", async () => {
    const { result, unmount } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.active).toBe(true);

    await act(async () => {
      unmount();
    });
    expect(mockSentinel.release).toHaveBeenCalled();
  });

  test("toggle does nothing when unsupported", async () => {
    Object.defineProperty(navigator, "wakeLock", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.active).toBe(false);
  });

  test("sets inactive when request throws", async () => {
    mockRequest.mockRejectedValueOnce(
      new DOMException("Not allowed", "NotAllowedError")
    );

    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    expect(result.current.active).toBe(false);
  });

  test("removes visibilitychange listener on unmount", async () => {
    const { result, unmount } = renderHook(() => useWakeLock());

    await act(async () => {
      result.current.toggle();
    });
    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
