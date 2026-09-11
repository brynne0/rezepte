import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOfflineDownload } from "./useOfflineDownload";

const { mockToastAdd } = vi.hoisted(() => ({ mockToastAdd: vi.fn() }));

vi.mock("@/components/ui/toast", () => ({
  toast: { add: mockToastAdd },
}));

vi.mock("@/hooks/data/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../services/offlineDownloadService", () => ({
  downloadAllRecipesForOffline: vi.fn(),
  getOfflineDownloadStatus: vi.fn(() => null),
}));

vi.mock("../../../hooks/data/useRecipesPagination", () => ({
  fetchRecipesWithCategories: vi.fn(),
}));

import { useAuth } from "@/hooks/data/useAuth";
import {
  downloadAllRecipesForOffline,
  getOfflineDownloadStatus,
} from "../../../services/offlineDownloadService";
import { fetchRecipesWithCategories } from "../../../hooks/data/useRecipesPagination";

const t = (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key);

describe("useOfflineDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    getOfflineDownloadStatus.mockReturnValue(null);
  });

  test("does nothing when there is no logged in user", async () => {
    useAuth.mockReturnValue({ user: null });
    const { result } = renderHook(() => useOfflineDownload(t));

    await act(async () => {
      await result.current.startDownload();
    });

    expect(fetchRecipesWithCategories).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBe(false);
  });

  test("shows an info toast and skips downloading when there are no recipes", async () => {
    fetchRecipesWithCategories.mockResolvedValue([]);
    const { result } = renderHook(() => useOfflineDownload(t));

    await act(async () => {
      await result.current.startDownload();
    });

    expect(downloadAllRecipesForOffline).not.toHaveBeenCalled();
    expect(mockToastAdd).toHaveBeenCalledWith({
      title: "offline_download_no_recipes",
      type: "info",
    });
    expect(result.current.isDownloading).toBe(false);
  });

  test("downloads recipes fetched fresh for the current user and shows a success toast", async () => {
    const recipes = [{ id: "r1" }, { id: "r2" }];
    fetchRecipesWithCategories.mockResolvedValue(recipes);
    downloadAllRecipesForOffline.mockResolvedValue({
      total: 2,
      failed: [],
      aborted: false,
    });
    getOfflineDownloadStatus.mockReturnValue({ total: 2, failedCount: 0 });

    const { result } = renderHook(() => useOfflineDownload(t));

    await act(async () => {
      await result.current.startDownload();
    });

    expect(fetchRecipesWithCategories).toHaveBeenCalledWith("user-1");
    expect(downloadAllRecipesForOffline).toHaveBeenCalledWith(
      expect.objectContaining({ recipes })
    );
    expect(mockToastAdd).toHaveBeenCalledWith({
      title: "offline_download_success",
      type: "success",
    });
    expect(result.current.status).toEqual({ total: 2, failedCount: 0 });
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  test("shows a partial-failure toast when some recipes fail to download", async () => {
    fetchRecipesWithCategories.mockResolvedValue([{ id: "r1" }]);
    downloadAllRecipesForOffline.mockResolvedValue({
      total: 1,
      failed: ["r1"],
      aborted: false,
    });

    const { result } = renderHook(() => useOfflineDownload(t));

    await act(async () => {
      await result.current.startDownload();
    });

    expect(mockToastAdd).toHaveBeenCalledWith({
      title: `offline_download_partial:${JSON.stringify({ count: 1 })}`,
      type: "error",
    });
  });

  test("shows a cancelled toast when the download was aborted", async () => {
    fetchRecipesWithCategories.mockResolvedValue([{ id: "r1" }]);
    downloadAllRecipesForOffline.mockResolvedValue({
      total: 1,
      failed: [],
      aborted: true,
    });

    const { result } = renderHook(() => useOfflineDownload(t));

    await act(async () => {
      await result.current.startDownload();
    });

    expect(mockToastAdd).toHaveBeenCalledWith({
      title: "offline_download_cancelled",
      type: "info",
    });
  });

  test("shows an error toast and resets state when fetching recipes throws", async () => {
    fetchRecipesWithCategories.mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useOfflineDownload(t));

    await act(async () => {
      await result.current.startDownload();
    });

    expect(mockToastAdd).toHaveBeenCalledWith({
      title: "offline_download_error",
      type: "error",
    });
    expect(result.current.isDownloading).toBe(false);
    expect(result.current.progress).toBeNull();
  });

  test("cancelDownload aborts the in-flight download's signal", async () => {
    fetchRecipesWithCategories.mockResolvedValue([{ id: "r1" }]);
    let capturedSignal;
    let resolveDownload;
    downloadAllRecipesForOffline.mockImplementation(
      ({ signal }) =>
        new Promise((resolve) => {
          capturedSignal = signal;
          resolveDownload = resolve;
        })
    );

    const { result } = renderHook(() => useOfflineDownload(t));

    let downloadPromise;
    act(() => {
      downloadPromise = result.current.startDownload();
    });

    await waitFor(() => expect(capturedSignal).toBeDefined());

    act(() => {
      result.current.cancelDownload();
    });

    expect(capturedSignal.aborted).toBe(true);

    await act(async () => {
      resolveDownload({ total: 1, failed: [], aborted: true });
      await downloadPromise;
    });
  });

  test("cancelDownload is a no-op when nothing is downloading", () => {
    const { result } = renderHook(() => useOfflineDownload(t));

    expect(() => result.current.cancelDownload()).not.toThrow();
  });

  test("exposes progress updates reported during the download", async () => {
    fetchRecipesWithCategories.mockResolvedValue([{ id: "r1" }]);
    const progressSnapshots = [];
    let resolveDownload;
    downloadAllRecipesForOffline.mockImplementation(
      ({ onProgress }) =>
        new Promise((resolve) => {
          onProgress({ current: 0, total: 1, recipeTitle: "Soup" });
          resolveDownload = resolve;
        })
    );

    const { result } = renderHook(() => useOfflineDownload(t));

    act(() => {
      result.current.startDownload();
    });

    await waitFor(() =>
      expect(result.current.progress).toEqual({
        current: 0,
        total: 1,
        recipeTitle: "Soup",
      })
    );
    progressSnapshots.push(result.current.progress);

    await act(async () => {
      resolveDownload({ total: 1, failed: [], aborted: false });
    });

    expect(progressSnapshots[0]).toEqual({
      current: 0,
      total: 1,
      recipeTitle: "Soup",
    });
  });
});
