import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUnsavedChanges } from "./useUnsavedChanges";

const mockUseBlocker = vi.fn();
vi.mock("react-router-dom", () => ({
  useBlocker: (...args) => mockUseBlocker(...args),
}));

describe("useUnsavedChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBlocker.mockReturnValue({ state: "unblocked" });
  });

  describe("Basic Hook Functionality", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(false, "Test message")
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.message).toBe("Test message");
      expect(typeof result.current.confirmNavigation).toBe("function");
      expect(typeof result.current.cancelNavigation).toBe("function");
      expect(result.current.navigate).toBeUndefined();
    });

    it("should handle message parameter", () => {
      const customMessage = "You have unsaved changes";
      const { result } = renderHook(() =>
        useUnsavedChanges(true, customMessage)
      );

      expect(result.current.message).toBe(customMessage);
    });

    it("passes a predicate function to useBlocker", () => {
      renderHook(() => useUnsavedChanges(true, "Test message"));

      expect(mockUseBlocker).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("Blocking predicate", () => {
    it("blocks when hasUnsavedChanges is true and the pathname changes", () => {
      renderHook(() => useUnsavedChanges(true, "Test message"));
      const predicate = mockUseBlocker.mock.calls[0][0];

      expect(
        predicate({
          currentLocation: { pathname: "/a" },
          nextLocation: { pathname: "/b" },
        })
      ).toBe(true);
    });

    it("does not block when hasUnsavedChanges is false", () => {
      renderHook(() => useUnsavedChanges(false, "Test message"));
      const predicate = mockUseBlocker.mock.calls[0][0];

      expect(
        predicate({
          currentLocation: { pathname: "/a" },
          nextLocation: { pathname: "/b" },
        })
      ).toBe(false);
    });

    it("does not block when the pathname is unchanged", () => {
      renderHook(() => useUnsavedChanges(true, "Test message"));
      const predicate = mockUseBlocker.mock.calls[0][0];

      expect(
        predicate({
          currentLocation: { pathname: "/a" },
          nextLocation: { pathname: "/a" },
        })
      ).toBe(false);
    });
  });

  describe("Modal state driven by the blocker", () => {
    it("reports the modal as open when the blocker is blocked", () => {
      mockUseBlocker.mockReturnValue({
        state: "blocked",
        proceed: vi.fn(),
        reset: vi.fn(),
      });

      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      expect(result.current.isModalOpen).toBe(true);
    });

    it("reports the modal as closed when the blocker is unblocked", () => {
      mockUseBlocker.mockReturnValue({ state: "unblocked" });

      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      expect(result.current.isModalOpen).toBe(false);
    });

    it("confirmNavigation calls blocker.proceed when blocked", () => {
      const proceed = vi.fn();
      mockUseBlocker.mockReturnValue({
        state: "blocked",
        proceed,
        reset: vi.fn(),
      });

      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      act(() => {
        result.current.confirmNavigation();
      });

      expect(proceed).toHaveBeenCalledTimes(1);
    });

    it("confirmNavigation is a no-op when not blocked", () => {
      mockUseBlocker.mockReturnValue({ state: "unblocked" });

      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      expect(() => {
        act(() => {
          result.current.confirmNavigation();
        });
      }).not.toThrow();
    });

    it("cancelNavigation calls blocker.reset when blocked", () => {
      const reset = vi.fn();
      mockUseBlocker.mockReturnValue({
        state: "blocked",
        proceed: vi.fn(),
        reset,
      });

      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      act(() => {
        result.current.cancelNavigation();
      });

      expect(reset).toHaveBeenCalledTimes(1);
    });

    it("cancelNavigation is a no-op when not blocked", () => {
      mockUseBlocker.mockReturnValue({ state: "unblocked" });

      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      expect(() => {
        act(() => {
          result.current.cancelNavigation();
        });
      }).not.toThrow();
    });
  });

  describe("Browser Navigation Events", () => {
    it("should add beforeunload listener when hasUnsavedChanges is true", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useUnsavedChanges(true, "Test message"));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it("should prevent beforeunload when unsaved changes exist", () => {
      renderHook(() => useUnsavedChanges(true, "Test message"));

      const beforeUnloadEvent = new Event("beforeunload");
      Object.defineProperty(beforeUnloadEvent, "preventDefault", {
        value: vi.fn(),
        writable: false,
      });
      Object.defineProperty(beforeUnloadEvent, "returnValue", {
        value: undefined,
        writable: true,
      });

      window.dispatchEvent(beforeUnloadEvent);

      expect(beforeUnloadEvent.preventDefault).toHaveBeenCalled();
      expect(beforeUnloadEvent.returnValue).toBe("Test message");
    });

    it("should not prevent beforeunload when no unsaved changes", () => {
      renderHook(() => useUnsavedChanges(false, "Test message"));

      const beforeUnloadEvent = new Event("beforeunload");
      Object.defineProperty(beforeUnloadEvent, "preventDefault", {
        value: vi.fn(),
        writable: false,
      });

      window.dispatchEvent(beforeUnloadEvent);

      expect(beforeUnloadEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("should remove beforeunload listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Hook Updates", () => {
    it("should update message when message changes", () => {
      let message = "Initial message";
      const { result, rerender } = renderHook(() =>
        useUnsavedChanges(true, message)
      );

      expect(result.current.message).toBe("Initial message");

      message = "Updated message";
      rerender();

      expect(result.current.message).toBe("Updated message");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined message", () => {
      const { result } = renderHook(() => useUnsavedChanges(true, undefined));

      expect(result.current.message).toBeUndefined();
    });

    it("should handle empty string message", () => {
      const { result } = renderHook(() => useUnsavedChanges(true, ""));

      expect(result.current.message).toBe("");
    });
  });

  describe("Callback Stability", () => {
    it("should maintain stable callback references across rerenders with the same blocker", () => {
      const stableBlocker = { state: "unblocked" };
      mockUseBlocker.mockReturnValue(stableBlocker);

      const { result, rerender } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      const initialConfirm = result.current.confirmNavigation;
      const initialCancel = result.current.cancelNavigation;

      rerender();

      expect(result.current.confirmNavigation).toBe(initialConfirm);
      expect(result.current.cancelNavigation).toBe(initialCancel);
    });
  });
});
