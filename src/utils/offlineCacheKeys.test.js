import { describe, test, expect, afterEach, vi } from "vitest";
import {
  userProfileCacheKey,
  cookingTimesCacheKey,
  categoriesCacheKey,
  signedImageUrlCacheKey,
  clearOfflineCaches,
  clearDownloadedRecipeCaches,
  clearRecipeImagesCache,
} from "./offlineCacheKeys";

// Plain-object storage so Object.keys() lists entries like a real browser
const makeStorage = (entries) => {
  const store = { ...entries };
  Object.defineProperty(store, "removeItem", {
    value: (key) => delete store[key],
    enumerable: false,
  });
  return store;
};

describe("offlineCacheKeys", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("clearOfflineCaches removes this user's caches only", () => {
    const storage = makeStorage({
      [userProfileCacheKey("u1")]: "1",
      [cookingTimesCacheKey("u1", "en")]: "1",
      [cookingTimesCacheKey("u1", "de")]: "1",
      [categoriesCacheKey("en")]: "1",
      [signedImageUrlCacheKey("u1", "a.jpg")]: "1",
      [signedImageUrlCacheKey("u2", "b.jpg")]: "1",
      [userProfileCacheKey("u2")]: "1",
    });
    vi.stubGlobal("localStorage", storage);

    clearOfflineCaches("u1");

    expect(Object.keys(storage).sort()).toEqual(
      [signedImageUrlCacheKey("u2", "b.jpg"), userProfileCacheKey("u2")].sort()
    );
  });

  test("clearDownloadedRecipeCaches only removes signed image URLs", () => {
    const storage = makeStorage({
      [userProfileCacheKey("u1")]: "1",
      [signedImageUrlCacheKey("u1", "a.jpg")]: "1",
    });
    vi.stubGlobal("localStorage", storage);

    clearDownloadedRecipeCaches("u1");
    expect(Object.keys(storage)).toEqual([userProfileCacheKey("u1")]);
  });

  test("ignores storage errors while sweeping", () => {
    vi.stubGlobal(
      "localStorage",
      new Proxy(
        {},
        {
          ownKeys: () => {
            throw new Error("denied");
          },
        }
      )
    );
    expect(() => clearDownloadedRecipeCaches("u1")).not.toThrow();
  });

  describe("clearRecipeImagesCache", () => {
    test("deletes the service worker image cache", async () => {
      const del = vi.fn().mockResolvedValue(true);
      vi.stubGlobal("caches", { delete: del });
      await clearRecipeImagesCache();
      expect(del).toHaveBeenCalledWith("recipe-images-cache");
    });

    test("ignores Cache Storage errors", async () => {
      vi.stubGlobal("caches", {
        delete: vi.fn().mockRejectedValue(new Error("x")),
      });
      await expect(clearRecipeImagesCache()).resolves.toBeUndefined();
    });

    test("does nothing without Cache Storage", async () => {
      vi.stubGlobal("caches", undefined);
      await expect(clearRecipeImagesCache()).resolves.toBeUndefined();
    });
  });
});
