import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// `canRestore` should be false when the list's order can change based on the
// visit itself (e.g. sorting by most-recently-viewed)
export const useScrollRestoration = (
  scrollRef,
  ready = true,
  canRestore = true
) => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Save scroll position whenever the user scrolls
  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${location.key}`, el.scrollTop);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [location.key, scrollRef]);

  // Restore scroll only once content is ready
  useEffect(() => {
    if (!ready) return;
    const el = scrollRef?.current;
    if (!el) return;

    if (navigationType === "POP" && canRestore) {
      const saved = sessionStorage.getItem(`scroll-${location.key}`);
      el.scrollTo(0, saved ? parseInt(saved, 10) : 0);
    } else {
      el.scrollTo(0, 0);
    }
  }, [ready, location.key, navigationType, scrollRef, canRestore]);
};
