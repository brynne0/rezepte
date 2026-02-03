import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "htmlTag", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
      convertDetectedLanguage: (lng) => {
        // Normalize language codes: en-AU, en-US -> en, de-DE -> de
        if (lng && lng.includes("-")) {
          return lng.split("-")[0];
        }
        return lng;
      },
    },
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

// Manually update HTML lang attribute on language change
i18n.on("languageChanged", (lng) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
  }
});

export default i18n;
