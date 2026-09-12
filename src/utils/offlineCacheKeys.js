import { removeCachedValue } from "./localStorageCache";

export const SUPPORTED_LANGUAGES = ["en", "de"];

const SIGNED_IMAGE_URL_CACHE_PREFIX = "signedImageUrl:";

export const userProfileCacheKey = (userId) => `user-profile-cache-${userId}`;

export const cookingTimesCacheKey = (userId, language) =>
  `cooking-times-cache-${userId}-${language}`;

export const categoriesCacheKey = (language) => `categories-cache-${language}`;

export const signedImageUrlCacheKey = (path) =>
  `${SIGNED_IMAGE_URL_CACHE_PREFIX}${path}`;

// Removes every offline cache tied to a user session, so a previous user's
// data can't linger (or briefly flash) for the next person signing in on
// the same device.
export const clearOfflineCaches = (userId) => {
  removeCachedValue(userProfileCacheKey(userId));

  for (const lang of SUPPORTED_LANGUAGES) {
    removeCachedValue(cookingTimesCacheKey(userId, lang));
    removeCachedValue(categoriesCacheKey(lang));
  }

  // Signed image URLs are keyed per image path, not per user, so they can't
  // be targeted individually - clear every cached one on sign-out instead.
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(SIGNED_IMAGE_URL_CACHE_PREFIX)) {
        removeCachedValue(key);
      }
    }
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled)
  }
};
