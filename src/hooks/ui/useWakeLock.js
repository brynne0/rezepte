import { useState, useEffect, useCallback, useRef } from "react";

// Requests a screen wake lock to prevent the screen from dimming.
export const useWakeLock = () => {
  const [active, setActive] = useState(false);
  const supported = "wakeLock" in navigator;
  const wakeLockRef = useRef(null);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
    setActive(false);
  }, []);

  const acquire = useCallback(async () => {
    if (!supported) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => setActive(false));
      setActive(true);
    } catch {
      setActive(false);
    }
  }, [supported]);

  // Reacquire after the page becomes visible again
  useEffect(() => {
    if (!active) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [active, acquire]);

  // Release on unmount
  useEffect(
    () => () => {
      release();
    },
    [release]
  );

  const toggle = useCallback(() => {
    active ? release() : acquire();
  }, [active, acquire, release]);

  return { active, supported, toggle };
};
