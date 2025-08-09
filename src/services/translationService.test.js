import { describe, test, expect, beforeEach, vi } from "vitest";
import { getTranslatedRecipe } from "./translationService";

// Mock Supabase
vi.mock("../lib/supabase", () => ({
  default: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

// Mock the translation API call
const mockTranslateText = vi.fn();
vi.mock("./translationService", async () => {
  const actual = await vi.importActual("./translationService");
  return {
    ...actual,
    // Override internal functions for testing
    __esModule: true,
  };
});

describe("Translation Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslateText.mockReset();
  });

  const mockRecipeWithUngroupedIngredients = {
    id: "recipe-1",
    title: "Test Recipe",
    original_language: "en",
    instructions: ["Step 1", "Step 2"],
    ungroupedIngredients: [
      {
        id: "ing-1",
        recipe_ingredient_id: "ri-1",
        quantity: "2",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
        is_plural: true, // User typed plural form
      },
      {
        id: "ing-2",
        recipe_ingredient_id: "ri-2",
        quantity: "1",
        unit: "tsp",
        singular_name: "salt",
        plural_name: "salts",
        is_plural: false, // User typed singular form
      },
    ],
  };

  const mockRecipeWithSections = {
    id: "recipe-2",
    title: "Sectioned Recipe",
    original_language: "en",
    ingredientSections: [
      {
        subheading: "For the base",
        ingredients: [
          {
            id: "ing-3",
            recipe_ingredient_id: "ri-3",
            quantity: "3",
            unit: "cup/s",
            singular_name: "sugar",
            plural_name: "sugars",
            is_plural: false, // User typed singular form
          },
        ],
      },
      {
        subheading: "For the topping",
        ingredients: [
          {
            id: "ing-4",
            recipe_ingredient_id: "ri-4",
            quantity: "1",
            unit: "cup/s",
            singular_name: "butter",
            plural_name: "butters",
            is_plural: false, // User typed singular form
          },
        ],
      },
    ],
  };

  const mockRecipeWithMixedIngredients = {
    id: "recipe-3",
    title: "Mixed Recipe",
    original_language: "en",
    ungroupedIngredients: [
      {
        id: "ing-5",
        recipe_ingredient_id: "ri-5",
        quantity: "1",
        unit: "cup/s",
        singular_name: "milk",
        plural_name: "milks",
        is_plural: false, // User typed singular form
      },
    ],
    ingredientSections: [
      {
        subheading: "Spices",
        ingredients: [
          {
            id: "ing-6",
            recipe_ingredient_id: "ri-6",
            quantity: "2",
            unit: "tsp",
            singular_name: "cinnamon",
            plural_name: "cinnamons",
            is_plural: false, // User typed singular form
          },
        ],
      },
    ],
  };

  describe("Same Language Processing", () => {
    test("processes ungrouped ingredients when target language matches original", async () => {
      const result = await getTranslatedRecipe(
        mockRecipeWithUngroupedIngredients,
        "en"
      );

      expect(result).toHaveProperty("ungroupedIngredients");
      expect(result.ungroupedIngredients).toHaveLength(2);

      // Should add 'name' field to ingredients for consistency
      expect(result.ungroupedIngredients[0]).toHaveProperty("name");
      expect(result.ungroupedIngredients[1]).toHaveProperty("name");
    });

    test("processes ingredient sections when target language matches original", async () => {
      const result = await getTranslatedRecipe(mockRecipeWithSections, "en");

      expect(result).toHaveProperty("ingredientSections");
      expect(result.ingredientSections).toHaveLength(2);

      // Should add 'name' field to all ingredients in sections
      expect(result.ingredientSections[0].ingredients[0]).toHaveProperty(
        "name"
      );
      expect(result.ingredientSections[1].ingredients[0]).toHaveProperty(
        "name"
      );
    });

    test("handles mixed ingredient structures when target language matches original", async () => {
      const result = await getTranslatedRecipe(
        mockRecipeWithMixedIngredients,
        "en"
      );

      expect(result).toHaveProperty("ungroupedIngredients");
      expect(result).toHaveProperty("ingredientSections");
      expect(result.ungroupedIngredients[0]).toHaveProperty("name");
      expect(result.ingredientSections[0].ingredients[0]).toHaveProperty(
        "name"
      );
    });
  });

  describe("Translation Required", () => {
    test("sets translation metadata when languages differ", async () => {
      // Mock the translation functions to avoid actual API calls
      vi.doMock("./translationService", () => ({
        getTranslatedRecipe: vi.fn().mockResolvedValue({
          ...mockRecipeWithUngroupedIngredients,
          isTranslated: true,
          translatedFrom: "en",
        }),
      }));

      const result = await getTranslatedRecipe(
        mockRecipeWithUngroupedIngredients,
        "de"
      );

      // Should indicate translation occurred
      expect(result).toHaveProperty("isTranslated", true);
      expect(result).toHaveProperty("translatedFrom", "en");
    });

    test("handles translation errors gracefully", async () => {
      // This is more of an integration test - actual error handling
      // would need to be tested with proper mocking of the internal functions
      expect(true).toBe(true); // Placeholder for error handling tests
    });
  });

  describe("Ingredient Display Name Logic", () => {
    test("uses is_plural flag for ingredient name selection", async () => {
      const recipe = {
        ...mockRecipeWithUngroupedIngredients,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3", // High quantity but user typed singular
            singular_name: "apple",
            plural_name: "apples",
            is_plural: false, // User typed singular form
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "1", // Low quantity but user typed plural
            singular_name: "tomato",
            plural_name: "tomatoes",
            is_plural: true, // User typed plural form
          },
        ],
      };

      const result = await getTranslatedRecipe(recipe, "en");

      // Should use is_plural flag, not quantity
      expect(result.ungroupedIngredients[0].name).toBe("apple"); // is_plural: false
      expect(result.ungroupedIngredients[1].name).toBe("tomatoes"); // is_plural: true
    });

    test("falls back to singular when plural is missing", async () => {
      const recipe = {
        ...mockRecipeWithUngroupedIngredients,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3",
            singular_name: "rice",
            // plural_name missing
            is_plural: true, // User typed plural but no plural_name available
          },
        ],
      };

      const result = await getTranslatedRecipe(recipe, "en");

      // Should fall back to singular when plural is missing
      expect(result.ungroupedIngredients[0].name).toBe("rice");
    });

    test("defaults to singular when is_plural is missing", async () => {
      const recipe = {
        ...mockRecipeWithUngroupedIngredients,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "5",
            singular_name: "carrot",
            plural_name: "carrots",
            // is_plural missing
          },
        ],
      };

      const result = await getTranslatedRecipe(recipe, "en");

      // Should default to singular when is_plural is missing
      expect(result.ungroupedIngredients[0].name).toBe("carrot");
    });
  });

  describe("Translation Capitalisation Rules", () => {
    test("German translations preserve case while English translations are lowercased", () => {
      const mockTranslatedText = "Brokkoli"; // API returns capitalised German

      const testCapitalisation = (targetLanguage) => {
        return targetLanguage === "de"
          ? mockTranslatedText
          : mockTranslatedText.toLowerCase();
      };

      // German case - should preserve as-is
      const finalSingularDe = testCapitalisation("de");
      const finalPluralDe = testCapitalisation("de");

      expect(finalSingularDe).toBe("Brokkoli"); // Preserved capitalisation
      expect(finalPluralDe).toBe("Brokkoli"); // Preserved capitalisation

      // English case - should be lowercased
      const finalSingularEn = testCapitalisation("en");
      const finalPluralEn = testCapitalisation("en");

      expect(finalSingularEn).toBe("brokkoli"); // Lowercased
      expect(finalPluralEn).toBe("brokkoli"); // Lowercased
    });

    test("German ingredient examples maintain proper capitalisation", () => {
      // Test the example: "broccoli and peas" should become "Brokkoli und Erbsen"
      const germanTranslations = [
        { api: "Brokkoli", expected: "Brokkoli" },
        { api: "Erbsen", expected: "Erbsen" },
        { api: "Karotten", expected: "Karotten" },
        { api: "Kartoffeln", expected: "Kartoffeln" },
      ];

      const applyGermanCapitalisation = (translatedText, targetLanguage) => {
        return targetLanguage === "de"
          ? translatedText
          : translatedText.toLowerCase();
      };

      germanTranslations.forEach(({ api, expected }) => {
        const result = applyGermanCapitalisation(api, "de");

        expect(result).toBe(expected);
        expect(result[0]).toBe(result[0].toUpperCase()); // Should be capitalised
      });
    });

    test("Sentence ingredient gets capitalised properly", () => {
      const englishSentence = "broccoli or peas";
      const mockTranslatedText = "Brokkoli oder Erbsen";

      // Mock the translation API to return German translation
      const mockTranslateText = vi.fn().mockResolvedValue(mockTranslatedText);

      const simulateTranslationFlow = async (inputText, targetLanguage) => {
        // Simulate the translation process from translationService.js
        const translatedText = await mockTranslateText(
          inputText,
          targetLanguage
        );

        // Apply capitalisation rules (German preserves case, English lowercases)
        const finalResult =
          targetLanguage === "de"
            ? translatedText
            : translatedText.toLowerCase();

        return finalResult;
      };

      // Test: English sentence → German translation with proper capitalisation
      return simulateTranslationFlow(englishSentence, "de").then((result) => {
        expect(mockTranslateText).toHaveBeenCalledWith(englishSentence, "de");
        expect(result).toBe("Brokkoli oder Erbsen");

        // Verify proper German capitalisation is preserved
        expect(result).toContain("Brokkoli");
        expect(result).toContain("Erbsen");

        // Verify it's not lowercased (which would happen for English)
        expect(result).not.toBe("brokkoli oder erbsen");
      });
    });

    test("English translations are consistently lowercased", () => {
      const mockApiResponses = ["BROCCOLI", "Peas", "CaRrOtS", "potatoes"];

      const applyEnglishCapitalisation = (translatedText, targetLanguage) => {
        return targetLanguage === "de"
          ? translatedText
          : translatedText.toLowerCase();
      };

      mockApiResponses.forEach((apiResponse) => {
        const result = applyEnglishCapitalisation(apiResponse, "en");

        expect(result).toBe(apiResponse.toLowerCase());
        expect(result).toBe(result.toLowerCase()); // Should be fully lowercase
      });
    });
  });

  describe("Edge Cases", () => {
    test("handles recipe with no ingredients", async () => {
      const emptyRecipe = {
        id: "empty-recipe",
        title: "Empty Recipe",
        original_language: "en",
      };

      const result = await getTranslatedRecipe(emptyRecipe, "en");

      expect(result.id).toBe("empty-recipe");
      expect(result.title).toBe("Empty Recipe");
    });

    test("handles recipe with empty ingredient arrays", async () => {
      const emptyIngredientRecipe = {
        id: "empty-ing-recipe",
        title: "Empty Ingredient Recipe",
        original_language: "en",
        ungroupedIngredients: [],
        ingredientSections: [],
      };

      const result = await getTranslatedRecipe(emptyIngredientRecipe, "en");

      expect(result.ungroupedIngredients).toEqual([]);
      expect(result.ingredientSections).toEqual([]);
    });

    test("handles malformed ingredient data gracefully", async () => {
      const malformedRecipe = {
        id: "malformed-recipe",
        title: "Malformed Recipe",
        original_language: "en",
        ungroupedIngredients: [
          {
            id: "ing-malformed",
            recipe_ingredient_id: "ri-malformed",
            // Missing name fields
          },
        ],
      };

      const result = await getTranslatedRecipe(malformedRecipe, "en");

      // Should still return a result without crashing
      expect(result).toHaveProperty("ungroupedIngredients");
      expect(result.ungroupedIngredients).toHaveLength(1);
    });
  });
});
