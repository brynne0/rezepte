import { useState, useEffect, useRef, useMemo } from "react";
import { getSignedImageUrls } from "../../services/imageService";
import {
  readCachedValue,
  writeCachedValue,
} from "../../utils/localStorageCache";
import { signedImageUrlCacheKey } from "../../utils/offlineCacheKeys";
import { useAuth } from "./useAuth";
import { useOnlineStatus } from "../ui/useOnlineStatus";

const CACHE_DURATION = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days (before 7-day expiry)

export const useSignedImageUrls = (images) => {
  const { user } = useAuth();
  const userId = user?.id;
  const isOnline = useOnlineStatus();
  const [signedImages, setSignedImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Create a stable key from images array to prevent infinite loops
  const imagesKey = useMemo(() => {
    if (!images || images.length === 0) return "empty";
    return images.map((img) => img.path).join("|");
  }, [images]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!images || images.length === 0) {
      setSignedImages([]);
      setLoading(false);
      return;
    }

    const fetchSignedUrls = async () => {
      try {
        setLoading(true);
        const urlsByPath = new Map();
        const imagesToFetch = [];

        // Offline, keep old URLs so they match the SW-cached images
        const maxAge = isOnline ? CACHE_DURATION : undefined;
        images.forEach((image) => {
          const cached = userId
            ? readCachedValue(
                signedImageUrlCacheKey(userId, image.path),
                maxAge
              )
            : null;

          if (cached?.url) {
            urlsByPath.set(image.path, cached.url);
          } else {
            imagesToFetch.push(image);
          }
        });

        // Fetch uncached images
        if (imagesToFetch.length > 0) {
          const freshUrls = await getSignedImageUrls(imagesToFetch);

          freshUrls.forEach((image) => {
            urlsByPath.set(image.path, image.url);
            // Don't cache failures so they're retried
            if (userId && image.url) {
              writeCachedValue(
                signedImageUrlCacheKey(userId, image.path),
                image
              );
            }
          });
        }

        // Only the URL comes from cache; order and is_main stay current
        const newSignedImages = images.map((image) => ({
          ...image,
          url: urlsByPath.get(image.path) ?? null,
        }));

        if (mountedRef.current) {
          setSignedImages(newSignedImages);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching signed URLs:", err);
        if (mountedRef.current) {
          setError(err.message);
          setSignedImages(images); // Fallback
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void fetchSignedUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey, userId, isOnline]); // Use imagesKey instead of images to prevent infinite loops

  return { signedImages, loading, error };
};
