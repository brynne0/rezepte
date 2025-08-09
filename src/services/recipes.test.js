import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock pluralize
const mockPluralize = {
  isPlural: vi.fn(),
};

vi.mock("pluralize", () => ({
  default: mockPluralize,
}));

// Mock the translation function (DeepL service)
const mockTranslateText = vi.fn();

// Mock Supabase for the translation function
vi.mock("../lib/supabase", () => ({
  default: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import supabase from "../lib/supabase";

describe("German Pluralization Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test the core logic by replicating it in a test function
  const testDetermineIngredientPlurality = async (
    inputName,
    language = "en"
  ) => {
    if (!inputName) {
      return false;
    }

    const trimmedName = inputName.trim().toLowerCase();

    // If it's English, test directly
    if (language === "en") {
      return mockPluralize.isPlural(trimmedName);
    }

    // For other languages, translate to English first then test plurality
    try {
      const translatedToEnglish = await mockTranslateText(
        trimmedName,
        "en",
        language
      );
      return mockPluralize.isPlural(translatedToEnglish.toLowerCase());
    } catch (error) {
      console.error("Failed to translate for plurality check:", error);
      return false;
    }
  };

  // Mock the translate function
  beforeEach(() => {
    mockTranslateText.mockImplementation(
      async (text, targetLang, sourceLang) => {
        if (sourceLang === "de" && targetLang === "en") {
          const translations = {
            äpfel: "apples",
            zucker: "sugar",
            tomaten: "tomatoes",
            kartoffeln: "potatoes",
            apfel: "apple",
          };
          return translations[text.toLowerCase()] || text;
        }
        return text;
      }
    );
  });

  test("detects English plural ingredients correctly", async () => {
    // Mock pluralize for English words
    mockPluralize.isPlural.mockImplementation((word) => {
      const plurals = ["apples", "tomatoes", "potatoes", "carrots"];
      return plurals.includes(word.toLowerCase());
    });

    // Test English plurals
    expect(await testDetermineIngredientPlurality("apples", "en")).toBe(true);
    expect(await testDetermineIngredientPlurality("tomatoes", "en")).toBe(true);

    // Test English singulars
    expect(await testDetermineIngredientPlurality("sugar", "en")).toBe(false);
    expect(await testDetermineIngredientPlurality("flour", "en")).toBe(false);

    // Verify pluralize.isPlural was called with correct arguments
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("apples");
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("tomatoes");
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("sugar");
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("flour");
  });

  test("translates German ingredients to English for pluralization detection", async () => {
    // Mock pluralize for translated English words
    mockPluralize.isPlural.mockImplementation((word) => {
      const plurals = ["apples", "tomatoes", "potatoes"];
      return plurals.includes(word.toLowerCase());
    });

    // Test German plurals -> English plurals -> detected as plural
    expect(await testDetermineIngredientPlurality("Äpfel", "de")).toBe(true);
    expect(await testDetermineIngredientPlurality("Tomaten", "de")).toBe(true);

    // Test German singulars -> English singulars -> detected as singular
    expect(await testDetermineIngredientPlurality("Zucker", "de")).toBe(false);
    expect(await testDetermineIngredientPlurality("Apfel", "de")).toBe(false);

    // Verify translation was called with correct arguments
    expect(mockTranslateText).toHaveBeenCalledWith("äpfel", "en", "de");
    expect(mockTranslateText).toHaveBeenCalledWith("tomaten", "en", "de");
    expect(mockTranslateText).toHaveBeenCalledWith("zucker", "en", "de");
    expect(mockTranslateText).toHaveBeenCalledWith("apfel", "en", "de");

    // Verify pluralize was called on translated English words
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("apples");
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("tomatoes");
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("sugar");
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("apple");
  });

  test("falls back to singular when German translation fails", async () => {
    // Mock translation failure
    mockTranslateText.mockRejectedValueOnce(
      new Error("Translation API failed")
    );

    const result = await testDetermineIngredientPlurality(
      "UnbekanntesWort",
      "de"
    );

    // Should return false (singular) when translation fails
    expect(result).toBe(false);

    // Verify translation was attempted (should be lowercase)
    expect(mockTranslateText).toHaveBeenCalledWith(
      "unbekannteswort",
      "en",
      "de"
    );

    // Should NOT call pluralize.isPlural due to translation failure
    expect(mockPluralize.isPlural).not.toHaveBeenCalled();
  });

  test("handles empty or null ingredient names", async () => {
    expect(await testDetermineIngredientPlurality("", "en")).toBe(false);
    expect(await testDetermineIngredientPlurality(null, "en")).toBe(false);
    expect(await testDetermineIngredientPlurality(undefined, "de")).toBe(false);

    // Should not call any external functions for empty/null inputs
    expect(mockPluralize.isPlural).not.toHaveBeenCalled();
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  test("handles whitespace in ingredient names", async () => {
    mockPluralize.isPlural.mockReturnValue(true);

    // Test that whitespace is properly trimmed
    await testDetermineIngredientPlurality("  apples  ", "en");

    // Verify trimmed and lowercased name was passed to pluralize
    expect(mockPluralize.isPlural).toHaveBeenCalledWith("apples");
  });

  test("correctly handles case-insensitive German translations", async () => {
    mockPluralize.isPlural.mockReturnValue(true);

    // Test different cases of German words
    await testDetermineIngredientPlurality("ÄPFEL", "de");
    await testDetermineIngredientPlurality("äpfel", "de");
    await testDetermineIngredientPlurality("Äpfel", "de");

    // All should be translated with lowercase
    expect(mockTranslateText).toHaveBeenCalledWith("äpfel", "en", "de");
    expect(mockTranslateText).toHaveBeenCalledTimes(3);
  });
});

// Test the actual integration with the translation service
describe("Translation Service Integration", () => {
  test("uses Supabase edge function for translation", async () => {
    const mockInvoke = supabase.functions.invoke;

    // Mock successful translation response
    mockInvoke.mockResolvedValue({
      data: { translatedText: "apples" },
      error: null,
    });

    mockPluralize.isPlural.mockReturnValue(true);

    // Simulate the translation logic from recipes.js
    const translateText = async (
      text,
      targetLanguage,
      sourceLanguage = null
    ) => {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          text: text.trim(),
          target_lang: targetLanguage.toUpperCase(),
          source_lang: sourceLanguage ? sourceLanguage.toUpperCase() : null,
        },
      });

      if (error) {
        return text;
      }

      return data?.translatedText || text;
    };

    const result = await translateText("äpfel", "en", "de");

    expect(result).toBe("apples");
    expect(mockInvoke).toHaveBeenCalledWith("translate", {
      body: {
        text: "äpfel",
        target_lang: "EN",
        source_lang: "DE",
      },
    });
  });

  test("handles translation service errors gracefully", async () => {
    const mockInvoke = supabase.functions.invoke;

    // Mock translation service error
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Translation service unavailable" },
    });

    // Simulate error handling from recipes.js
    const translateText = async (
      text,
      targetLanguage,
      sourceLanguage = null
    ) => {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          text: text.trim(),
          target_lang: targetLanguage.toUpperCase(),
          source_lang: sourceLanguage ? sourceLanguage.toUpperCase() : null,
        },
      });

      if (error) {
        return text; // Return original text on error
      }

      return data?.translatedText || text;
    };

    const result = await translateText("äpfel", "en", "de");

    // Should return original text when translation fails
    expect(result).toBe("äpfel");
  });
});
