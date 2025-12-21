import { useEffect, useRef, useState } from "react";

// Custom hook for intersection observer
// Detects when an element enters the viewport
const useIntersectionObserver = (options = {}) => {
  const ref = useRef();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observerOptions = {
      root: options.root || null,
      rootMargin: options.rootMargin || "50px", // Start loading 50px before entering viewport
      threshold: options.threshold || 0.01,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true);
        }
      });
    }, observerOptions);

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options.root, options.rootMargin, options.threshold, hasBeenVisible]);

  return { ref, isVisible, hasBeenVisible };
};

export default useIntersectionObserver;
