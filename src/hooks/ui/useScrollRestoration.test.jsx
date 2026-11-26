import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const nav = vi.hoisted(() => ({ key: "k1", type: "PUSH" }));
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ key: nav.key }),
  useNavigationType: () => nav.type,
}));

import { useScrollRestoration } from "./useScrollRestoration";

const makeEl = () => {
  const el = document.createElement("div");
  el.scrollTo = vi.fn();
  return el;
};

describe("useScrollRestoration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    nav.key = "k1";
    nav.type = "PUSH";
  });

  test("saves the scroll position per location", () => {
    const el = makeEl();
    renderHook(() => useScrollRestoration({ current: el }));
    el.scrollTop = 250;
    el.dispatchEvent(new Event("scroll"));
    expect(sessionStorage.getItem("scroll-k1")).toBe("250");
  });

  test("stops listening on unmount", () => {
    const el = makeEl();
    const { unmount } = renderHook(() => useScrollRestoration({ current: el }));
    unmount();
    el.scrollTop = 99;
    el.dispatchEvent(new Event("scroll"));
    expect(sessionStorage.getItem("scroll-k1")).toBeNull();
  });

  test("scrolls to the top on a new navigation", () => {
    sessionStorage.setItem("scroll-k1", "300");
    const el = makeEl();
    renderHook(() => useScrollRestoration({ current: el }));
    expect(el.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test("restores the saved position on back/forward", () => {
    nav.type = "POP";
    sessionStorage.setItem("scroll-k1", "300");
    const el = makeEl();
    renderHook(() => useScrollRestoration({ current: el }));
    expect(el.scrollTo).toHaveBeenCalledWith(0, 300);
  });

  test("goes to the top on back/forward with nothing saved", () => {
    nav.type = "POP";
    const el = makeEl();
    renderHook(() => useScrollRestoration({ current: el }));
    expect(el.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test("doesn't restore when the list order can change", () => {
    nav.type = "POP";
    sessionStorage.setItem("scroll-k1", "300");
    const el = makeEl();
    renderHook(() => useScrollRestoration({ current: el }, true, false));
    expect(el.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  test("waits until content is ready", () => {
    nav.type = "POP";
    sessionStorage.setItem("scroll-k1", "300");
    const el = makeEl();
    const { rerender } = renderHook(
      ({ ready }) => useScrollRestoration({ current: el }, ready),
      { initialProps: { ready: false } }
    );
    expect(el.scrollTo).not.toHaveBeenCalled();
    rerender({ ready: true });
    expect(el.scrollTo).toHaveBeenCalledWith(0, 300);
  });

  test("does nothing without an element", () => {
    expect(() =>
      renderHook(() => useScrollRestoration({ current: null }))
    ).not.toThrow();
    expect(() => renderHook(() => useScrollRestoration(null))).not.toThrow();
  });
});
