import { useState, useEffect } from "react";

const detectIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (/MacIntel/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export const useInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed if running in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    setIsIOS(detectIOS());

    if (window.__pwaInstallPrompt) {
      setInstallPrompt(window.__pwaInstallPrompt);
      window.__pwaInstallPrompt = null;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // App installed — prompt is no longer available
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  return { installPrompt, isInstalled, isIOS, triggerInstall };
};
