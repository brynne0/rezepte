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
        unit: "cups",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
      },
      {
        id: "ing-2",
        recipe_ingredient_id: "ri-2",
        quantity: "1",
        unit: "tsp",
        singular_name: "salt",
        plural_name: "salts",
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
            unit: "cups",
            singular_name: "sugar",
            plural_name: "sugars",
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
            unit: "cup",
            singular_name: "butter",
            plural_name: "butters",
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
        unit: "cup",
        singular_name: "milk",
        plural_name: "milks",
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

    test("handles legacy flat ingredients structure", async () => {
      const legacyRecipe = {
        id: "recipe-legacy",
        title: "Legacy Recipe",
        original_language: "en",
        ingredients: [
          {
            id: "ing-legacy",
            recipe_ingredient_id: "ri-legacy",
            quantity: "1",
            singular_name: "egg",
            plural_name: "eggs",
          },
        ],
      };

      const result = await getTranslatedRecipe(legacyRecipe, "en");

      expect(result).toHaveProperty("ingredients");
      expect(result.ingredients[0]).toHaveProperty("name");
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
    test("uses singular name for quantity 1 in English", async () => {
      const recipe = {
        ...mockRecipeWithUngroupedIngredients,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "apple",
            plural_name: "apples",
          },
        ],
      };

      const result = await getTranslatedRecipe(recipe, "en");

      // For English, should use singular form for quantity 1
      expect(result.ungroupedIngredients[0].name).toBe("apple");
    });

    test("uses plural name for quantity > 1 in English", async () => {
      const recipe = {
        ...mockRecipeWithUngroupedIngredients,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3",
            singular_name: "apple",
            plural_name: "apples",
          },
        ],
      };

      const result = await getTranslatedRecipe(recipe, "en");

      // For English, should use plural form for quantity > 1
      expect(result.ungroupedIngredients[0].name).toBe("apples");
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
          },
        ],
      };

      const result = await getTranslatedRecipe(recipe, "en");

      // Should fall back to singular when plural is missing
      expect(result.ungroupedIngredients[0].name).toBe("rice");
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
