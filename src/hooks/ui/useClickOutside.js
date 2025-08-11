import { useEffect, useRef } from "react";

// Custom hook for click outside detection
const useClickOutside = (callback) => {
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        // Check if the clicked element is a dropdown item
        const isDropdownItem = event.target.closest(".dropdown-item");
        if (isDropdownItem) {
          return; // Don't close if clicking a dropdown item
        }
        callback();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [callback]);

  return ref;
};

export default useClickOutside;
