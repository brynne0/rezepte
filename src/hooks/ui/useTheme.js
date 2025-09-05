import { useState, useEffect } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;

    // Default to system preference on first visit
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    
    // Update theme-color meta tag for mobile browsers
    const updateThemeColor = () => {
      const themeColor = theme === "dark" ? "#55443c" : "#f2e7d2";
      
      // Remove existing theme-color meta tags
      const existingTags = document.querySelectorAll('meta[name="theme-color"]');
      existingTags.forEach(tag => tag.remove());
      
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
