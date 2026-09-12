import { fetchRecipe } from "./recipes";
import { getSignedImageUrls } from "./imageService";
import { getUserProfile } from "./userService";
import { getTranslatedCookingTimes } from "./cookingTimesTranslationService";
import { getCategories, withAllRecipesOption } from "./categoriesService";
import { writeCachedValue } from "../utils/localStorageCache";
import {
  SUPPORTED_LANGUAGES,
  userProfileCacheKey,
  cookingTimesCacheKey,
  categoriesCacheKey,
  signedImageUrlCacheKey,
} from "../utils/offlineCacheKeys";

export const OFFLINE_DOWNLOAD_STATUS_KEY = "offline-download-status";

// Silently caches the user's profile so Settings shows correct info offline
// even if the user never opened Settings while online.
const downloadProfile = async (userId) => {
  try {
    const profile = await getUserProfile();
    writeCachedValue(userProfileCacheKey(userId), profile);
  } catch (error) {
    console.error("Failed to cache profile for offline use:", error);
  }
};

// Silently caches cooking times in every supported language so the Cooking
// Times screen works offline even if it was never opened online, and stays
// correct if the user switches app language while offline.
const downloadCookingTimes = async (userId) => {
  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      const fallback = SUPPORTED_LANGUAGES.find((l) => l !== lang);
      const data = await getTranslatedCookingTimes(lang, fallback);
      writeCachedValue(cookingTimesCacheKey(userId, lang), data);
    } catch (error) {
      console.error(`Failed to cache cooking times for ${lang}:`, error);
    }
  }
};

// Silently caches categories in every supported language, same reasoning as
// cooking times: works offline even if Home or Settings' category list was
// never opened online. Shares its cache with useCategories.js (Home's
// filter dropdown) and CategoriesTab.jsx (Settings) - same underlying data.
const downloadCategories = async () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    try {
      const data = withAllRecipesOption(await getCategories(lang), lang);
      writeCachedValue(categoriesCacheKey(lang), data);
    } catch (error) {
      console.error(`Failed to cache categories for ${lang}:`, error);
    }
  }
};

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

    // Persist the signed URLs themselves (not just the image bytes), so a
    // recipe downloaded but never viewed online can still reconstruct a
    // valid request for its images while offline - generating a fresh
    // signed URL requires network, which won't be available.
    signedImages.forEach((image) => {
      if (image.url) {
        writeCachedValue(signedImageUrlCacheKey(image.path), image);
      }
    });

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
  userId,
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

  if (!signal?.aborted && userId) {
    await downloadProfile(userId);
    await downloadCookingTimes(userId);
    await downloadCategories();
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
