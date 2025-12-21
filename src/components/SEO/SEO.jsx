import { useEffect } from "react";

/**
 * SEO Component for managing meta tags dynamically
 * Works with React 19 without external dependencies
 */
const SEO = ({
  title,
  description,
  image,
  url,
  type = "website",
  structuredData,
}) => {
  useEffect(() => {
    // Set document title
    if (title) {
      document.title = title;
    }

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      if (!content) return;

      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(
        `meta[${attribute}="${name}"]`
      );

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    // Standard meta tags
    updateMetaTag("description", description);

    // Open Graph tags
    updateMetaTag("og:title", title, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:image", image, true);
    updateMetaTag("og:url", url, true);
    updateMetaTag("og:type", type, true);

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", image);

    // Structured Data (JSON-LD)
    if (structuredData) {
      let scriptElement = document.querySelector(
        'script[type="application/ld+json"]'
      );

      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.type = "application/ld+json";
        document.head.appendChild(scriptElement);
      }

      scriptElement.textContent = JSON.stringify(structuredData);
    }

    // Cleanup function to remove structured data when component unmounts
    return () => {
      if (structuredData) {
        const scriptElement = document.querySelector(
          'script[type="application/ld+json"]'
        );
        if (scriptElement) {
          scriptElement.remove();
        }
      }
    };
  }, [title, description, image, url, type, structuredData]);

  return null; // This component doesn't render anything
};

export default SEO;
