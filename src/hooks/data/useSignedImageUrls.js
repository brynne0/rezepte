import { useState, useEffect, useRef, useMemo } from "react";
import { getSignedImageUrls } from "../../services/imageService";

// In-memory cache with expiration tracking
const urlCache = new Map();
const CACHE_DURATION = 50 * 60 * 1000; // 50 minutes (before 1-hour expiry)

export const useSignedImageUrls = (images, isShared = false) => {
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
        const now = Date.now();
        const cachedResults = [];
        const imagesToFetch = [];

        // Check cache first
        images.forEach((image) => {
          const cacheKey = `${image.path}-${isShared}`;
          const cached = urlCache.get(cacheKey);

          if (cached && now - cached.timestamp < CACHE_DURATION) {
            cachedResults.push(cached.image);
          } else {
            imagesToFetch.push(image);
          }
        });

        // Fetch uncached images
        let newSignedImages = [...cachedResults];
        if (imagesToFetch.length > 0) {
          const expiresIn = isShared ? 604800 : 3600; // 7 days vs 1 hour
          const freshUrls = await getSignedImageUrls(imagesToFetch, expiresIn);

          // Cache new URLs
          freshUrls.forEach((image) => {
            const cacheKey = `${image.path}-${isShared}`;
            urlCache.set(cacheKey, { image, timestamp: now });
          });

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
  }, [imagesKey, isShared]); // Use imagesKey instead of images to prevent infinite loops

  return { signedImages, loading, error };
};
