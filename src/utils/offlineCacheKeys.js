import { removeCachedValue } from "./localStorageCache";

export const SUPPORTED_LANGUAGES = ["en", "de"];

const SIGNED_IMAGE_URL_CACHE_PREFIX = "signedImageUrl:";

export const userProfileCacheKey = (userId) => `user-profile-cache-${userId}`;

export const cookingTimesCacheKey = (userId, language) =>
  `cooking-times-cache-${userId}-${language}`;

export const categoriesCacheKey = (language) => `categories-cache-${language}`;

export const signedImageUrlCacheKey = (userId, path) =>
  `${SIGNED_IMAGE_URL_CACHE_PREFIX}${userId}:${path}`;

// Removes every offline cache tied to a user session, so a previous user's
// data can't linger (or briefly flash) for the next person signing in on
// the same device.
export const clearOfflineCaches = (userId) => {
  removeCachedValue(userProfileCacheKey(userId));

  for (const lang of SUPPORTED_LANGUAGES) {
    removeCachedValue(cookingTimesCacheKey(userId, lang));
    removeCachedValue(categoriesCacheKey(lang));
  }

  // Signed image URLs are keyed per user + image path, so they can be swept
  // for just this user without touching another account's cached entries.
  const userSignedImagePrefix = `${SIGNED_IMAGE_URL_CACHE_PREFIX}${userId}:`;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(userSignedImagePrefix)) {
        removeCachedValue(key);
      }
    }
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled)
  }
};
