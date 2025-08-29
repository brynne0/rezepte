import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useUnsavedChanges } from "./useUnsavedChanges";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("useUnsavedChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing event listeners
    window.removeEventListener("beforeunload", expect.any(Function));
  });

  afterEach(() => {
    // Clean up event listeners after each test
    window.removeEventListener("beforeunload", expect.any(Function));
  });

  describe("Basic Hook Functionality", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(false, "Test message")
      );

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.message).toBe("Test message");
      expect(typeof result.current.navigate).toBe("function");
      expect(typeof result.current.confirmNavigation).toBe("function");
      expect(typeof result.current.cancelNavigation).toBe("function");
    });

    it("should handle message parameter", () => {
      const customMessage = "You have unsaved changes";
      const { result } = renderHook(() =>
        useUnsavedChanges(true, customMessage)
      );

      expect(result.current.message).toBe(customMessage);
    });
  });

  describe("Navigation Behavior", () => {
    it("should navigate directly when no unsaved changes", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(false, "Test message")
      );

      act(() => {
        result.current.navigate("/test-path");
      });

      expect(mockNavigate).toHaveBeenCalledWith("/test-path", {});
      expect(result.current.isModalOpen).toBe(false);
    });

    it("should navigate directly with replace option", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      act(() => {
        result.current.navigate("/test-path", { replace: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith("/test-path", {
        replace: true,
      });
      expect(result.current.isModalOpen).toBe(false);
    });

    it("should show modal when unsaved changes exist", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      act(() => {
        result.current.navigate("/test-path");
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should handle navigation with options", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(false, "Test message")
      );

      const options = { state: { from: "test" } };

      act(() => {
        result.current.navigate("/test-path", options);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/test-path", options);
    });
  });

  describe("Modal State Management", () => {
    it("should open modal when navigating with unsaved changes", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      act(() => {
        result.current.navigate("/test-path");
      });

      expect(result.current.isModalOpen).toBe(true);
    });

    it("should close modal on cancel navigation", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      // Open modal
      act(() => {
        result.current.navigate("/test-path");
      });

      expect(result.current.isModalOpen).toBe(true);

      // Cancel navigation
      act(() => {
        result.current.cancelNavigation();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should close modal and navigate on confirm", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      // Open modal
      act(() => {
        result.current.navigate("/test-path", { state: { test: true } });
      });

      expect(result.current.isModalOpen).toBe(true);

      // Confirm navigation
      act(() => {
        result.current.confirmNavigation();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith("/test-path", {
        state: { test: true },
      });
    });

    it("should handle confirm navigation when no pending navigation", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(false, "Test message")
      );

      // Try to confirm without pending navigation
      act(() => {
        result.current.confirmNavigation();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
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

      // Simulate beforeunload event
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
    it("should update behavior when hasUnsavedChanges changes", () => {
      let hasUnsavedChanges = false;
      const { result, rerender } = renderHook(() =>
        useUnsavedChanges(hasUnsavedChanges, "Test message")
      );

      // Initially no unsaved changes - should navigate directly
      act(() => {
        result.current.navigate("/test-path");
      });

      expect(mockNavigate).toHaveBeenCalledWith("/test-path", {});
      expect(result.current.isModalOpen).toBe(false);

      mockNavigate.mockClear();

      // Update to have unsaved changes
      hasUnsavedChanges = true;
      rerender();

      // Now should show modal instead of navigating
      act(() => {
        result.current.navigate("/another-path");
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

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

    it("should handle multiple rapid navigation attempts", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      // Multiple rapid navigation calls
      act(() => {
        result.current.navigate("/path1");
        result.current.navigate("/path2");
        result.current.navigate("/path3");
      });

      // Should only open modal once and store the last navigation
      expect(result.current.isModalOpen).toBe(true);

      // Confirm should navigate to the last requested path
      act(() => {
        result.current.confirmNavigation();
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/path3", {});
    });

    it("should handle navigation options correctly", () => {
      const { result } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      const complexOptions = {
        replace: false,
        state: { from: "test", data: { id: 123 } },
      };

      act(() => {
        result.current.navigate("/complex-path", complexOptions);
      });

      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.confirmNavigation();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        "/complex-path",
        complexOptions
      );
    });
  });

  describe("Callback Stability", () => {
    it("should maintain stable callback references", () => {
      const { result, rerender } = renderHook(() =>
        useUnsavedChanges(true, "Test message")
      );

      const initialNavigate = result.current.navigate;
      const initialConfirm = result.current.confirmNavigation;
      const initialCancel = result.current.cancelNavigation;

      // Rerender with same props
      rerender();

      expect(result.current.navigate).toBe(initialNavigate);
      expect(result.current.confirmNavigation).toBe(initialConfirm);
      expect(result.current.cancelNavigation).toBe(initialCancel);
    });

    it("should update navigate callback when hasUnsavedChanges changes", () => {
      let hasUnsavedChanges = true;
      const { result, rerender } = renderHook(() =>
        useUnsavedChanges(hasUnsavedChanges, "Test message")
      );

      const initialNavigate = result.current.navigate;

      // Change hasUnsavedChanges
      hasUnsavedChanges = false;
      rerender();

      // Navigate callback should be updated due to dependency change
      expect(result.current.navigate).not.toBe(initialNavigate);
    });
  });
});
