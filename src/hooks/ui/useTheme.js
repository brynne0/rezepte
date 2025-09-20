import { useState, useEffect } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved) return saved;
    } catch {
      // localStorage not available (private browsing, file:// protocol, etc.)
    }

    // Default to system preference on first visit
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // localStorage not available (private browsing, file:// protocol, etc.)
    }
    document.documentElement.setAttribute("data-theme", theme);

    // Update theme-color meta tag for mobile browsers
    const updateThemeColor = () => {
      const themeColor = theme === "dark" ? "#342a24" : "#f2e7d2";

      // Remove existing theme-color meta tags
      const existingTags = document.querySelectorAll(
        'meta[name="theme-color"]'
      );
      existingTags.forEach((tag) => tag.remove());

      // Add new theme-color meta tag
      const newMetaTag = document.createElement("meta");
      newMetaTag.name = "theme-color";
      newMetaTag.content = themeColor;
      document.head.appendChild(newMetaTag);
    };

    updateThemeColor();
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, setTheme, toggleTheme };
};
