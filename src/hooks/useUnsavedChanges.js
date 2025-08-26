import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useUnsavedChanges = (hasUnsavedChanges, message) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const originalNavigate = useRef(navigate);

  // Handle browser navigation (back button, refresh, closing tab)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  // Custom navigate function that shows confirmation dialog
  const navigateWithConfirmation = useCallback(
    (to, options = {}) => {
      if (hasUnsavedChanges && !options.replace) {
        setPendingNavigation({ to, options });
        setIsModalOpen(true);
      } else {
        originalNavigate.current(to, options);
      }
    },
    [hasUnsavedChanges]
  );

  const handleConfirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      originalNavigate.current(pendingNavigation.to, pendingNavigation.options);
      setPendingNavigation(null);
    }
    setIsModalOpen(false);
  }, [pendingNavigation]);

  const handleCancelNavigation = useCallback(() => {
    setPendingNavigation(null);
    setIsModalOpen(false);
  }, []);

  return {
    isModalOpen,
    navigate: navigateWithConfirmation,
    confirmNavigation: handleConfirmNavigation,
    cancelNavigation: handleCancelNavigation,
    message,
  };
};
