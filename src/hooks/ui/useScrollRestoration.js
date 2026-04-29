import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export const useScrollRestoration = (ready = true) => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Save scroll position whenever the user scrolls
  useEffect(() => {
    const el = document.getElementById("main-content");
    if (!el) return;

    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${location.key}`, el.scrollTop);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [location.key]);

  // Restore scroll only once content is ready
  useEffect(() => {
    if (!ready) return;
    const el = document.getElementById("main-content");
    if (!el) return;

    if (navigationType === "POP") {
      const saved = sessionStorage.getItem(`scroll-${location.key}`);
      el.scrollTo(0, saved ? parseInt(saved, 10) : 0);
    } else {
      el.scrollTo(0, 0);
    }
  }, [ready, location.key, navigationType]);
};
