import { fetchRecipe } from "./recipes";
import { getSignedImageUrls } from "./imageService";

export const OFFLINE_DOWNLOAD_STATUS_KEY = "offline-download-status";

export const getOfflineDownloadStatus = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_DOWNLOAD_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setOfflineDownloadStatus = (status) => {
  try {
    localStorage.setItem(OFFLINE_DOWNLOAD_STATUS_KEY, JSON.stringify(status));
  } catch {
    // Ignore storage failures - this is just status text, not the offline data itself.
  }
};

// Warms the service worker's cache for one recipe's raw data + images.
// Deliberately does NOT translate - translation happens client-side at
// view time regardless of language, using this same cached raw response,
// so pre-translating here would just be an unnecessary API cost.
const downloadRecipe = async (recipe) => {
  const originalRecipe = await fetchRecipe(recipe.id);

  const images = originalRecipe?.images || [];
  if (images.length > 0) {
    const signedImages = await getSignedImageUrls(images);
    await Promise.all(
      signedImages
        .filter((image) => image.url)
        .map((image) => fetch(image.url).catch(() => null))
    );
  }
};

// Downloads every recipe's detail + images, one at a time rather than in
// parallel, to avoid firing a burst of simultaneous requests.
export const downloadAllRecipesForOffline = async ({
  recipes,
  onProgress,
  signal,
}) => {
  const total = recipes.length;
  const failed = [];

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;

    const recipe = recipes[i];
    onProgress?.({ current: i, total, recipeTitle: recipe.title });

    try {
      await downloadRecipe(recipe);
    } catch (error) {
      console.error(`Failed to download recipe ${recipe.id}:`, error);
      failed.push(recipe.id);
    }
  }

  const aborted = !!signal?.aborted;

  onProgress?.({ current: total, total, recipeTitle: null });

  const status = {
    completedAt: new Date().toISOString(),
    total,
    failedCount: failed.length,
    aborted,
  };
  setOfflineDownloadStatus(status);

  return { total, failed, aborted };
};
