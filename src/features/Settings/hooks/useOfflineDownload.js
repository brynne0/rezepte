import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/data/useAuth";
import { toast } from "@/components/ui/toast";
import {
  downloadAllRecipesForOffline,
  getOfflineDownloadStatus,
  clearOfflineDownloadStatus,
} from "../../../services/offlineDownloadService";
import { fetchRecipesWithCategories } from "../../../hooks/data/useRecipesPagination";
import { clearDownloadedRecipeCaches } from "../../../utils/offlineCacheKeys";

export const useOfflineDownload = (t) => {
  const { user } = useAuth();
  const userId = user?.id;

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState(() => getOfflineDownloadStatus());
  const abortControllerRef = useRef(null);

  const startDownload = useCallback(async () => {
    if (!userId) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsDownloading(true);
    setProgress({ current: 0, total: 0, recipeTitle: null });

    try {
      // Fetch the list fresh rather than reading TanStack's cache, so the
      // download always sees the current recipe collection.
      const recipes = await fetchRecipesWithCategories(userId);

      if (recipes.length === 0) {
        toast.add({ title: t("offline_download_no_recipes"), type: "info" });
        return;
      }

      const result = await downloadAllRecipesForOffline({
        recipes,
        userId,
        onProgress: setProgress,
        signal: controller.signal,
      });

      setStatus(getOfflineDownloadStatus());

      if (result.aborted) {
        toast.add({ title: t("offline_download_cancelled"), type: "info" });
      } else if (result.failed.length > 0) {
        toast.add({
          title: t("offline_download_partial", {
            count: result.failed.length,
          }),
          type: "error",
        });
      } else {
        toast.add({ title: t("offline_download_success"), type: "success" });
      }
    } catch (error) {
      console.error("Offline download failed:", error);
      toast.add({ title: t("offline_download_error"), type: "error" });
    } finally {
      setIsDownloading(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  }, [userId, t]);

  const cancelDownload = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const deleteDownloads = useCallback(async () => {
    if (!userId) return;

    // Note: this only clears the signed-image-URL bookkeeping and download
    // status - it deliberately does not touch the service worker's shared
    // recipe-images-cache/supabase-rest-cache, since those are populated by
    // ordinary browsing too (any recipe viewed online, downloaded or not)
    // and aren't specific to what this feature downloaded.
    clearDownloadedRecipeCaches(userId);
    clearOfflineDownloadStatus();
    setStatus(null);

    toast.add({ title: t("offline_download_deleted"), type: "success" });
  }, [userId, t]);

  return {
    isDownloading,
    progress,
    status,
    startDownload,
    cancelDownload,
    deleteDownloads,
  };
};
