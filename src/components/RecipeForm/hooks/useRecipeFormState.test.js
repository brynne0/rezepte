import { describe, test, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipeFormState } from "./useRecipeFormState";

describe("useRecipeFormState", () => {
  describe("create mode (no initialRecipe)", () => {
    test("returns default empty form data", () => {
      const { result } = renderHook(() => useRecipeFormState({}));

      expect(result.current.formData.title).toBe("");
      expect(result.current.formData.categories).toEqual([]);
      expect(result.current.formData.ungroupedIngredients).toHaveLength(1);
      expect(result.current.formData.ungroupedIngredients[0].name).toBe("");
      expect(result.current.formData.ingredientSections).toEqual([]);
      expect(result.current.formData.instructions).toEqual([""]);
      expect(result.current.formData.nutrition_columns).toHaveLength(1);
      expect(result.current.isEditMode).toBe(false);
    });

    test("generates a unique tempId for the initial ingredient", () => {
      const { result: a } = renderHook(() => useRecipeFormState({}));
      const { result: b } = renderHook(() => useRecipeFormState({}));

      expect(a.current.formData.ungroupedIngredients[0].tempId).not.toBe(
        b.current.formData.ungroupedIngredients[0].tempId
      );
    });
  });

  describe("edit mode (with initialRecipe)", () => {
    test("maps flat ingredients without a subheading into ungroupedIngredients", () => {
      const initialRecipe = {
        title: "Soup",
        ingredients: [
          { name: "Carrot", quantity: "2", unit: "pcs" },
          { name: "Salt", quantity: "1", unit: "tsp" },
        ],
      };

      const { result } = renderHook(() =>
        useRecipeFormState({ initialRecipe })
      );

      expect(result.current.formData.title).toBe("Soup");
      expect(result.current.formData.ungroupedIngredients).toHaveLength(2);
      expect(result.current.formData.ingredientSections).toEqual([]);
      expect(result.current.isEditMode).toBe(true);
    });

    test("groups flat ingredients with a subheading into ingredientSections", () => {
      const initialRecipe = {
        ingredients: [
          { name: "Flour", subheading: "Dough" },
          { name: "Water", subheading: "Dough" },
          { name: "Nutritional Yeast", subheading: "Topping" },
        ],
      };

      const { result } = renderHook(() =>
        useRecipeFormState({ initialRecipe })
      );

      expect(result.current.formData.ungroupedIngredients).toEqual([]);
      expect(result.current.formData.ingredientSections).toHaveLength(2);
      expect(result.current.formData.ingredientSections[0].subheading).toBe(
        "Dough"
      );
      expect(
        result.current.formData.ingredientSections[0].ingredients
      ).toHaveLength(2);
      expect(result.current.formData.ingredientSections[1].subheading).toBe(
        "Topping"
      );
    });

    test("prefers the new ungroupedIngredients/ingredientSections structure over the flat list", () => {
      const initialRecipe = {
        ungroupedIngredients: [{ name: "Tofu" }],
        ingredientSections: [
          { id: "s1", subheading: "Sauce", ingredients: [{ name: "Soy" }] },
        ],
        ingredients: [{ name: "Should be ignored" }],
      };

      const { result } = renderHook(() =>
        useRecipeFormState({ initialRecipe })
      );

      expect(result.current.formData.ungroupedIngredients).toHaveLength(1);
      expect(result.current.formData.ungroupedIngredients[0].name).toBe("Tofu");
      expect(result.current.formData.ingredientSections).toHaveLength(1);
      expect(result.current.formData.ingredientSections[0].subheading).toBe(
        "Sauce"
      );
    });

    test("falls back to a single empty ingredient when the recipe has none", () => {
      const initialRecipe = { title: "Empty recipe", ingredients: [] };

      const { result } = renderHook(() =>
        useRecipeFormState({ initialRecipe })
      );

      expect(result.current.formData.ungroupedIngredients).toHaveLength(1);
      expect(result.current.formData.ungroupedIngredients[0].name).toBe("");
    });

    test("builds ingredientLinks from linked_recipe on ungrouped and sectioned ingredients", () => {
      const linkedRecipe = { id: "r1", title: "Pesto", slug: "pesto" };
      const initialRecipe = {
        ungroupedIngredients: [{ name: "Basil", linked_recipe: linkedRecipe }],
        ingredientSections: [
          {
            id: "s1",
            subheading: "Sauce",
            ingredients: [
              { name: "Cashew Cream", linked_recipe: linkedRecipe },
            ],
          },
        ],
      };

      const { result } = renderHook(() =>
        useRecipeFormState({ initialRecipe })
      );

      const ungroupedTempId =
        result.current.formData.ungroupedIngredients[0].tempId;
      const sectionTempId =
        result.current.formData.ingredientSections[0].ingredients[0].tempId;

      expect(
        result.current.formData.ingredientLinks[`ungrouped-${ungroupedTempId}`]
      ).toEqual(linkedRecipe);
      expect(
        result.current.formData.ingredientLinks[`s1-${sectionTempId}`]
      ).toEqual(linkedRecipe);
    });

    test("updates formData when initialRecipe changes", () => {
      const { result, rerender } = renderHook(
        ({ initialRecipe }) => useRecipeFormState({ initialRecipe }),
        { initialProps: { initialRecipe: { title: "First" } } }
      );

      expect(result.current.formData.title).toBe("First");

      rerender({ initialRecipe: { title: "Second" } });

      expect(result.current.formData.title).toBe("Second");
    });
  });

  describe("handleInputChange", () => {
    test("updates the given field", () => {
      const { result } = renderHook(() => useRecipeFormState({}));

      act(() => {
        result.current.handleInputChange("title", "New title");
      });

      expect(result.current.formData.title).toBe("New title");
    });

    test("clears the validation error for the field when clearError is true", () => {
      const { result } = renderHook(() => useRecipeFormState({}));

      act(() => {
        result.current.setValidationErrors({ title: "Required" });
      });
      act(() => {
        result.current.handleInputChange("title", "New title", true);
      });

      expect(result.current.validationErrors.title).toBe("");
    });

    test("maps the categories field to the category error key", () => {
      const { result } = renderHook(() => useRecipeFormState({}));

      act(() => {
        result.current.setValidationErrors({ category: "Required" });
      });
      act(() => {
        result.current.handleInputChange("categories", ["Dinner"]);
      });

      expect(result.current.validationErrors.category).toBe("");
    });
  });

  describe("hasUnsavedChanges", () => {
    test("returns false when formData matches initialFormData", () => {
      const { result } = renderHook(() => useRecipeFormState({}));

      expect(result.current.hasUnsavedChanges()).toBe(false);
    });

    test("returns true after formData is changed", () => {
      const { result } = renderHook(() => useRecipeFormState({}));

      act(() => {
        result.current.handleInputChange("title", "Changed");
      });

      expect(result.current.hasUnsavedChanges()).toBe(true);
    });
  });
});
