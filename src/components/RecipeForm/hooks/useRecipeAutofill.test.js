import { describe, test, expect, vi } from "vitest";
import { useRecipeAutofill as createAutofillHandler } from "./useRecipeAutofill";

const setup = (overrides = {}) => {
  let formData = {};
  const setFormData = vi.fn((updater) => {
    formData = typeof updater === "function" ? updater(formData) : updater;
  });
  const handleInputChange = vi.fn((field, value) => {
    formData = { ...formData, [field]: value };
  });
  const toTitleCase = (s) => s;
  const generateUniqueId = vi.fn(
    () => `temp-${Math.random().toString(36).slice(2)}`
  );
  const onDone = vi.fn();

  const handleAutofill = createAutofillHandler({
    setFormData,
    handleInputChange,
    toTitleCase,
    generateUniqueId,
    onDone,
    ...overrides,
  });

  return {
    handleAutofill,
    getFormData: () => formData,
    setFormData,
    handleInputChange,
    onDone,
  };
};

describe("useRecipeAutofill", () => {
  test("clears existing form fields before applying parsed data", () => {
    const { handleAutofill, getFormData } = setup();

    handleAutofill({});

    expect(getFormData()).toMatchObject({
      title: "",
      servings: "",
      categories: [],
      ungroupedIngredients: [],
      ingredientSections: [],
      instructions: [],
    });
  });

  test("fills title, servings, categories, and source via handleInputChange", () => {
    const { handleAutofill, handleInputChange } = setup();

    handleAutofill({
      title: "vegan chili",
      servings: "4",
      categories: ["Dinner"],
      source: "https://example.com/recipe",
    });

    expect(handleInputChange).toHaveBeenCalledWith("title", "vegan chili");
    expect(handleInputChange).toHaveBeenCalledWith("servings", "4");
    expect(handleInputChange).toHaveBeenCalledWith("categories", ["Dinner"]);
    expect(handleInputChange).toHaveBeenCalledWith(
      "source",
      "https://example.com/recipe"
    );
  });

  test("builds ungroupedIngredients from a flat ingredients list", () => {
    const { handleAutofill, getFormData } = setup();

    handleAutofill({
      ingredients: [
        { name: "Black beans", quantity: "1", unit: "can" },
        { name: "Cumin", quantity: "1", unit: "tsp" },
      ],
    });

    const { ungroupedIngredients, ingredientSections } = getFormData();
    expect(ingredientSections).toEqual([]);
    expect(ungroupedIngredients).toHaveLength(2);
    expect(ungroupedIngredients[0]).toMatchObject({
      name: "Black beans",
      quantity: "1",
      unit: "can",
    });
    expect(ungroupedIngredients[0].tempId).toBeTruthy();
  });

  test("builds ingredientSections when sections are present, ignoring flat ingredients", () => {
    const { handleAutofill, getFormData } = setup();

    handleAutofill({
      ingredientSections: [
        {
          subheading: "Sauce",
          ingredients: [{ name: "Tahini", quantity: "2", unit: "tbsp" }],
        },
      ],
      ingredients: [{ name: "Should be ignored" }],
    });

    const { ingredientSections } = getFormData();
    expect(ingredientSections).toHaveLength(1);
    expect(ingredientSections[0].subheading).toBe("Sauce");
    expect(ingredientSections[0].ingredients[0]).toMatchObject({
      name: "Tahini",
      quantity: "2",
      unit: "tbsp",
    });
  });

  test("fills instructions when present", () => {
    const { handleAutofill, getFormData } = setup();

    handleAutofill({ instructions: ["Chop vegetables", "Simmer for 20 min"] });

    expect(getFormData().instructions).toEqual([
      "Chop vegetables",
      "Simmer for 20 min",
    ]);
  });

  test("calls onDone after processing", () => {
    const { handleAutofill, onDone } = setup();

    handleAutofill({});

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("does not throw when onDone is not provided", () => {
    const { handleAutofill } = setup({ onDone: undefined });

    expect(() => handleAutofill({})).not.toThrow();
  });
});
