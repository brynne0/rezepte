import { useState, useEffect, useRef, useMemo } from "react";
import { getSignedImageUrls } from "../../services/imageService";
import {
  readCachedValue,
  writeCachedValue,
} from "../../utils/localStorageCache";
import { signedImageUrlCacheKey } from "../../utils/offlineCacheKeys";
import { useAuth } from "./useAuth";

const CACHE_DURATION = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days (before 7-day expiry)

export const useSignedImageUrls = (images) => {
  const { user } = useAuth();
  const userId = user?.id;
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
        const cachedResults = [];
        const imagesToFetch = [];

        // Check cache first (only when we know whose cache to read)
        images.forEach((image) => {
          const cached = userId
            ? readCachedValue(
                signedImageUrlCacheKey(userId, image.path),
                CACHE_DURATION
              )
            : null;

          if (cached) {
            cachedResults.push(cached);
          } else {
            imagesToFetch.push(image);
          }
        });

        // Fetch uncached images
        let newSignedImages = [...cachedResults];
        if (imagesToFetch.length > 0) {
          const freshUrls = await getSignedImageUrls(imagesToFetch);

          // Cache new URLs
          if (userId) {
            freshUrls.forEach((image) => {
              writeCachedValue(
                signedImageUrlCacheKey(userId, image.path),
                image
              );
            });
          }

          newSignedImages = [...newSignedImages, ...freshUrls];
        }

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

    fetchSignedUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey, userId]); // Use imagesKey instead of images to prevent infinite loops

  return { signedImages, loading, error };
};
