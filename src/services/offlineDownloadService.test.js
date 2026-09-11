import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  downloadAllRecipesForOffline,
  getOfflineDownloadStatus,
  OFFLINE_DOWNLOAD_STATUS_KEY,
} from "./offlineDownloadService";

vi.mock("./recipes", () => ({
  fetchRecipe: vi.fn(),
}));

vi.mock("./imageService", () => ({
  getSignedImageUrls: vi.fn(),
}));

import { fetchRecipe } from "./recipes";
import { getSignedImageUrls } from "./imageService";

describe("offlineDownloadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOfflineDownloadStatus", () => {
    test("returns null when nothing has been stored", () => {
      expect(getOfflineDownloadStatus()).toBeNull();
    });

    test("returns the parsed status when present", () => {
      const status = { completedAt: "2026-01-01T00:00:00.000Z", total: 2 };
      localStorage.setItem(OFFLINE_DOWNLOAD_STATUS_KEY, JSON.stringify(status));

      expect(getOfflineDownloadStatus()).toEqual(status);
    });

    test("returns null when the stored value is corrupt", () => {
      localStorage.setItem(OFFLINE_DOWNLOAD_STATUS_KEY, "not-json");

      expect(getOfflineDownloadStatus()).toBeNull();
    });
  });

  describe("downloadAllRecipesForOffline", () => {
    const recipes = [
      { id: "r1", title: "Soup" },
      { id: "r2", title: "Salad" },
    ];

    test("downloads each recipe's data and reports progress", async () => {
      fetchRecipe.mockResolvedValue({ images: [] });
      const onProgress = vi.fn();

      const result = await downloadAllRecipesForOffline({
        recipes,
        onProgress,
      });

      expect(fetchRecipe).toHaveBeenCalledWith("r1");
      expect(fetchRecipe).toHaveBeenCalledWith("r2");
      expect(result).toEqual({ total: 2, failed: [], aborted: false });

      expect(onProgress).toHaveBeenCalledWith({
        current: 0,
        total: 2,
        recipeTitle: "Soup",
      });
      expect(onProgress).toHaveBeenCalledWith({
        current: 1,
        total: 2,
        recipeTitle: "Salad",
      });
      expect(onProgress).toHaveBeenLastCalledWith({
        current: 2,
        total: 2,
        recipeTitle: null,
      });
    });

    test("fetches and warms signed image URLs for each recipe", async () => {
      fetchRecipe.mockResolvedValue({
        images: [{ path: "a.jpg" }, { path: "b.jpg" }],
      });
      getSignedImageUrls.mockResolvedValue([
        { url: "https://cdn/a.jpg" },
        { url: "" },
      ]);

      await downloadAllRecipesForOffline({ recipes: [recipes[0]] });

      expect(getSignedImageUrls).toHaveBeenCalledWith([
        { path: "a.jpg" },
        { path: "b.jpg" },
      ]);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("https://cdn/a.jpg");
    });

    test("skips image warming when a recipe has no images", async () => {
      fetchRecipe.mockResolvedValue({ images: [] });

      await downloadAllRecipesForOffline({ recipes: [recipes[0]] });

      expect(getSignedImageUrls).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    test("continues past a failed recipe and reports it as failed", async () => {
      fetchRecipe
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce({ images: [] });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await downloadAllRecipesForOffline({ recipes });

      expect(result).toEqual({ total: 2, failed: ["r1"], aborted: false });
      expect(consoleError).toHaveBeenCalled();
    });

    test("stops early and reports aborted when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      const result = await downloadAllRecipesForOffline({
        recipes,
        signal: controller.signal,
      });

      expect(fetchRecipe).not.toHaveBeenCalled();
      expect(result).toEqual({ total: 2, failed: [], aborted: true });
    });

    test("stops mid-loop once the signal is aborted", async () => {
      const controller = new AbortController();
      fetchRecipe.mockImplementation(async (id) => {
        if (id === "r1") controller.abort();
        return { images: [] };
      });

      const result = await downloadAllRecipesForOffline({
        recipes,
        signal: controller.signal,
      });

      expect(fetchRecipe).toHaveBeenCalledTimes(1);
      expect(result.aborted).toBe(true);
    });

    test("persists a completion status after a successful run", async () => {
      fetchRecipe.mockResolvedValue({ images: [] });

      await downloadAllRecipesForOffline({ recipes });

      const status = getOfflineDownloadStatus();
      expect(status).toMatchObject({
        total: 2,
        failedCount: 0,
        aborted: false,
      });
      expect(status.completedAt).toEqual(expect.any(String));
    });

    test("persists the failure count when some recipes fail", async () => {
      fetchRecipe.mockRejectedValue(new Error("boom"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      await downloadAllRecipesForOffline({ recipes });

      expect(getOfflineDownloadStatus()).toMatchObject({
        total: 2,
        failedCount: 2,
      });
    });

    test("does not throw when localStorage is unavailable", async () => {
      fetchRecipe.mockResolvedValue({ images: [] });
      const setItemSpy = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("quota exceeded");
        });

      await expect(
        downloadAllRecipesForOffline({ recipes })
      ).resolves.toMatchObject({ total: 2 });

      setItemSpy.mockRestore();
    });
  });
});
