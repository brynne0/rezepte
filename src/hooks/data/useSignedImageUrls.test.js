import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const auth = { user: { id: "u1" } };
vi.mock("./useAuth", () => ({ useAuth: () => auth }));
vi.mock("../ui/useOnlineStatus", () => ({ useOnlineStatus: () => true }));
vi.mock("../../services/imageService", () => ({
  getSignedImageUrls: vi.fn(),
}));

import { getSignedImageUrls } from "../../services/imageService";
import { writeCachedValue } from "../../utils/localStorageCache";
import { signedImageUrlCacheKey } from "../../utils/offlineCacheKeys";
import { useSignedImageUrls } from "./useSignedImageUrls";

const sign = (images) =>
  Promise.resolve(images.map((img) => ({ ...img, url: `signed:${img.path}` })));

describe("useSignedImageUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    auth.user = { id: "u1" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    getSignedImageUrls.mockImplementation(sign);
  });

  test("returns nothing for no images", async () => {
    const { result } = renderHook(() => useSignedImageUrls([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedImages).toEqual([]);
    expect(getSignedImageUrls).not.toHaveBeenCalled();
  });

  test("signs images and caches the URLs", async () => {
    const images = [{ path: "a.jpg" }];
    const { result } = renderHook(() => useSignedImageUrls(images));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedImages).toEqual([
      { path: "a.jpg", url: "signed:a.jpg" },
    ]);
    expect(
      localStorage.getItem(signedImageUrlCacheKey("u1", "a.jpg"))
    ).toContain("signed:a.jpg");
  });

  test("reuses cached URLs and only fetches the rest", async () => {
    writeCachedValue(signedImageUrlCacheKey("u1", "a.jpg"), {
      path: "a.jpg",
      url: "cached",
    });
    const images = [{ path: "a.jpg" }, { path: "b.jpg" }];
    const { result } = renderHook(() => useSignedImageUrls(images));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getSignedImageUrls).toHaveBeenCalledWith([{ path: "b.jpg" }]);
    expect(result.current.signedImages.map((i) => i.url)).toEqual([
      "cached",
      "signed:b.jpg",
    ]);
  });

  test("skips fetching when everything is cached", async () => {
    writeCachedValue(signedImageUrlCacheKey("u1", "a.jpg"), { url: "cached" });
    const images = [{ path: "a.jpg" }];
    const { result } = renderHook(() => useSignedImageUrls(images));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getSignedImageUrls).not.toHaveBeenCalled();
  });

  test("doesn't use the cache when signed out", async () => {
    auth.user = null;
    writeCachedValue(signedImageUrlCacheKey("u1", "a.jpg"), { url: "cached" });
    const images = [{ path: "a.jpg" }];
    const { result } = renderHook(() => useSignedImageUrls(images));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.signedImages[0].url).toBe("signed:a.jpg");
    expect(localStorage.length).toBe(1);
  });

  test("falls back to the raw images on error", async () => {
    getSignedImageUrls.mockRejectedValue(new Error("offline"));
    const images = [{ path: "a.jpg" }];
    const { result } = renderHook(() => useSignedImageUrls(images));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("offline");
    expect(result.current.signedImages).toBe(images);
  });

  test("ignores results that arrive after unmount", async () => {
    let resolve;
    getSignedImageUrls.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const { result, unmount } = renderHook(() =>
      useSignedImageUrls([{ path: "a.jpg" }])
    );
    unmount();
    resolve([{ path: "a.jpg", url: "late" }]);
    await Promise.resolve();
    expect(result.current.signedImages).toEqual([]);
  });

  test("ignores errors that arrive after unmount", async () => {
    let reject;
    getSignedImageUrls.mockReturnValue(
      new Promise((_, r) => {
        reject = r;
      })
    );
    const { result, unmount } = renderHook(() =>
      useSignedImageUrls([{ path: "a.jpg" }])
    );
    unmount();
    reject(new Error("late"));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.error).toBeNull();
  });
});
