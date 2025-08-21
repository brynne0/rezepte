import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import useClickOutside from "./useClickOutside";

describe("useClickOutside", () => {
  let mockCallback;
  let mockElement;
  let outsideElement;

  beforeEach(() => {
    mockCallback = vi.fn();
    
    // Create mock DOM elements
    mockElement = document.createElement("div");
    mockElement.className = "test-element";
    document.body.appendChild(mockElement);

    outsideElement = document.createElement("div");
    outsideElement.className = "outside-element";
    document.body.appendChild(outsideElement);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.removeChild(mockElement);
    document.body.removeChild(outsideElement);
  });

  test("returns a ref object", () => {
    const { result } = renderHook(() => useClickOutside(mockCallback));
    
    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
    expect(result.current).toHaveProperty("current");
  });

  test("calls callback when clicking outside the referenced element", () => {
    const { result } = renderHook(() => useClickOutside(mockCallback));
    
    // Assign the ref to our mock element
    act(() => {
      result.current.current = mockElement;
    });

    // Simulate click outside
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: outsideElement,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("does not call callback when clicking inside the referenced element", () => {
    const { result } = renderHook(() => useClickOutside(mockCallback));
    
    // Assign the ref to our mock element
    act(() => {
      result.current.current = mockElement;
    });

    // Simulate click inside
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: mockElement,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  test("does not call callback when clicking inside a child element", () => {
    const { result } = renderHook(() => useClickOutside(mockCallback));
    
    // Create child element
    const childElement = document.createElement("span");
    childElement.className = "child-element";
    mockElement.appendChild(childElement);
    
    // Assign the ref to our mock element
    act(() => {
      result.current.current = mockElement;
    });

    // Simulate click on child element
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: childElement,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  test("does not call callback when clicking on dropdown items", () => {
    const { result } = renderHook(() => useClickOutside(mockCallback));
    
    // Create dropdown item element
    const dropdownItem = document.createElement("div");
    dropdownItem.className = "dropdown-item";
    document.body.appendChild(dropdownItem);
    
    // Assign the ref to our mock element
    act(() => {
      result.current.current = mockElement;
    });

    // Simulate click on dropdown item
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: dropdownItem,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(mockCallback).not.toHaveBeenCalled();
    
    // Clean up
    document.body.removeChild(dropdownItem);
  });

  test("does not call callback when clicking on nested dropdown items", () => {
    const { result } = renderHook(() => useClickOutside(mockCallback));
    
    // Create nested dropdown structure
    const dropdownContainer = document.createElement("div");
    dropdownContainer.className = "dropdown-container";
    const dropdownItem = document.createElement("div");
    dropdownItem.className = "dropdown-item";
    const nestedElement = document.createElement("span");
    nestedElement.className = "nested-element";
    
    dropdownItem.appendChild(nestedElement);
    dropdownContainer.appendChild(dropdownItem);
    document.body.appendChild(dropdownContainer);
    
    // Assign the ref to our mock element
    act(() => {
      result.current.current = mockElement;
    });

    // Simulate click on nested element within dropdown item
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: nestedElement,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(mockCallback).not.toHaveBeenCalled();
    
    // Clean up
    document.body.removeChild(dropdownContainer);
  });

  test("does not call callback when ref.current is null", () => {
    renderHook(() => useClickOutside(mockCallback));
    
    // Don't assign anything to ref.current (it should be null/undefined)
    
    // Simulate click outside
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: outsideElement,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  test("removes event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    
    const { unmount } = renderHook(() => useClickOutside(mockCallback));
    
    // Unmount the hook
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });

  test("adds event listener on mount", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    
    renderHook(() => useClickOutside(mockCallback));
    
    expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });

  test("updates event listener when callback changes", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    
    const { rerender } = renderHook(
      ({ callback }) => useClickOutside(callback),
      { initialProps: { callback: firstCallback } }
    );
    
    // Clear initial call counts
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
    
    // Change the callback
    rerender({ callback: secondCallback });
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));
    
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  test("works with multiple instances simultaneously", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    const element1 = document.createElement("div");
    const element2 = document.createElement("div");
    document.body.appendChild(element1);
    document.body.appendChild(element2);
    
    const { result: result1 } = renderHook(() => useClickOutside(callback1));
    const { result: result2 } = renderHook(() => useClickOutside(callback2));
    
    act(() => {
      result1.current.current = element1;
      result2.current.current = element2;
    });
    
    // Click outside both elements
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: outsideElement,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });
    
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
    
    // Reset mocks
    callback1.mockClear();
    callback2.mockClear();
    
    // Click inside element1
    act(() => {
      const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: element1,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });
    
    // Only callback2 should be called (clicked outside element2)
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
    
    // Clean up
    document.body.removeChild(element1);
    document.body.removeChild(element2);
  });
});