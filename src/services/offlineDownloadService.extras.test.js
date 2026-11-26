import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./recipes", () => ({ fetchRecipe: vi.fn() }));
vi.mock("./imageService", () => ({ getSignedImageUrls: vi.fn() }));
vi.mock("./userService", () => ({ getUserProfile: vi.fn() }));
vi.mock("./cookingTimesTranslationService", () => ({
  getTranslatedCookingTimes: vi.fn(),
}));
vi.mock("./categoriesService", () => ({
  getCategories: vi.fn(),
  withAllRecipesOption: (cats, lang) => [{ value: `all-${lang}` }, ...cats],
}));

import { fetchRecipe } from "./recipes";
import { getUserProfile } from "./userService";
import { getTranslatedCookingTimes } from "./cookingTimesTranslationService";
import { getCategories } from "./categoriesService";
import { readCachedValue } from "../utils/localStorageCache";
import {
  userProfileCacheKey,
  cookingTimesCacheKey,
  categoriesCacheKey,
} from "../utils/offlineCacheKeys";
import {
  downloadAllRecipesForOffline,
  clearOfflineDownloadStatus,
  getOfflineDownloadStatus,
  OFFLINE_DOWNLOAD_STATUS_KEY,
} from "./offlineDownloadService";

describe("offlineDownloadService extras", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchRecipe.mockResolvedValue({ images: [] });
    getUserProfile.mockResolvedValue({ username: "b" });
    getTranslatedCookingTimes.mockImplementation(async (lang) => [lang]);
    getCategories.mockImplementation(async (lang) => [{ value: lang }]);
  });

  test("also caches profile, cooking times and categories for the user", async () => {
    await downloadAllRecipesForOffline({ recipes: [], userId: "u1" });

    expect(readCachedValue(userProfileCacheKey("u1"))).toEqual({
      username: "b",
    });
    expect(getTranslatedCookingTimes).toHaveBeenCalledWith("en", "de");
    expect(getTranslatedCookingTimes).toHaveBeenCalledWith("de", "en");
    expect(readCachedValue(cookingTimesCacheKey("u1", "de"))).toEqual(["de"]);
    expect(readCachedValue(categoriesCacheKey("en"))).toEqual([
      { value: "all-en" },
      { value: "en" },
    ]);
  });

  test("keeps going when any of those caches fail", async () => {
    getUserProfile.mockRejectedValue(new Error("p"));
    getTranslatedCookingTimes.mockRejectedValue(new Error("c"));
    getCategories.mockRejectedValue(new Error("k"));

    await expect(
      downloadAllRecipesForOffline({ recipes: [], userId: "u1" })
    ).resolves.toEqual({ total: 0, failed: [], aborted: false });
    expect(console.error).toHaveBeenCalledTimes(5);
  });

  test("skips the extra caches without a user", async () => {
    await downloadAllRecipesForOffline({ recipes: [] });
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  test("only downloads recipes changed since the last run", async () => {
    const recipes = [
      { id: "old", created_at: "2025-01-01" },
      { id: "edited", created_at: "2025-01-01", updated_at: "2025-06-01" },
      { id: "new", created_at: "2025-06-01" },
      { id: "unknown" },
    ];
    const result = await downloadAllRecipesForOffline({
      recipes,
      since: "2025-03-01",
    });
    expect(fetchRecipe.mock.calls.map(([id]) => id)).toEqual([
      "edited",
      "new",
      "unknown",
    ]);
    expect(result.total).toBe(3);
  });

  test("clearOfflineDownloadStatus removes the stored status", () => {
    localStorage.setItem(OFFLINE_DOWNLOAD_STATUS_KEY, '{"total":1}');
    clearOfflineDownloadStatus();
    expect(getOfflineDownloadStatus()).toBeNull();
  });

  test("clearOfflineDownloadStatus ignores storage errors", () => {
    vi.spyOn(localStorage, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => clearOfflineDownloadStatus()).not.toThrow();
  });
});
