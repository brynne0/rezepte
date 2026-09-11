import { describe, test, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIngredientManagement } from "./useIngredientManagement";

const baseIngredient = (tempId, overrides = {}) => ({
  tempId,
  ingredient_id: "",
  recipe_ingredient_id: "",
  name: "",
  quantity: "",
  unit: "",
  notes: "",
  ...overrides,
});

const setup = (formDataOverrides = {}) => {
  let formData = {
    ungroupedIngredients: [baseIngredient("t1", { name: "Flour" })],
    ingredientSections: [
      {
        id: "s1",
        subheading: "Sauce",
        ingredients: [baseIngredient("t2", { name: "Cashew Cream" })],
      },
    ],
    ingredientLinks: {},
    instructions: ["Step 1"],
    ...formDataOverrides,
  };
  const setFormData = vi.fn((updater) => {
    formData = typeof updater === "function" ? updater(formData) : updater;
  });
  let validationErrors = {};
  const setValidationErrors = vi.fn((updater) => {
    validationErrors =
      typeof updater === "function" ? updater(validationErrors) : updater;
  });
  const generateUniqueId = vi.fn(() => "new-temp-id");

  const { result, rerender } = renderHook(
    (props) =>
      useIngredientManagement({
        formData,
        setFormData,
        validationErrors,
        setValidationErrors,
        generateUniqueId,
        ...props,
      }),
    { initialProps: {} }
  );

  return {
    result,
    rerender,
    getFormData: () => formData,
    getValidationErrors: () => validationErrors,
    setFormData,
    setValidationErrors,
  };
};

describe("useIngredientManagement", () => {
  test("handleIngredientChange updates an ungrouped ingredient field", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.handleIngredientChange("ungrouped", "t1", "name", "Sugar");
    });
    rerender();

    expect(getFormData().ungroupedIngredients[0].name).toBe("Sugar");
  });

  test("handleIngredientChange updates an ingredient within a section", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.handleIngredientChange("s1", "t2", "quantity", "200");
    });
    rerender();

    expect(getFormData().ingredientSections[0].ingredients[0].quantity).toBe(
      "200"
    );
  });

  test("handleIngredientChange clears the given validation error key", () => {
    const { result, getValidationErrors, rerender } = setup();

    act(() => {
      result.current.handleIngredientChange(
        "ungrouped",
        "t1",
        "name",
        "Sugar",
        "ingredient-t1"
      );
    });
    rerender();

    expect(getValidationErrors()["ingredient-t1"]).toBe("");
  });

  test("handleSectionChange updates the section subheading", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.handleSectionChange("s1", "subheading", "Topping");
    });
    rerender();

    expect(getFormData().ingredientSections[0].subheading).toBe("Topping");
  });

  test("addIngredient appends a new empty ingredient to ungrouped list", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addIngredient("ungrouped");
    });
    rerender();

    expect(getFormData().ungroupedIngredients).toHaveLength(2);
    expect(getFormData().ungroupedIngredients[1]).toMatchObject({
      tempId: "new-temp-id",
      name: "",
    });
  });

  test("addIngredient appends a new empty ingredient to a specific section", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addIngredient("s1");
    });
    rerender();

    expect(getFormData().ingredientSections[0].ingredients).toHaveLength(2);
    expect(getFormData().ingredientSections[0].ingredients[1].tempId).toBe(
      "new-temp-id"
    );
  });

  test("addSection appends a new section with one empty ingredient", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addSection();
    });
    rerender();

    expect(getFormData().ingredientSections).toHaveLength(2);
    const newSection = getFormData().ingredientSections[1];
    expect(newSection.subheading).toBe("");
    expect(newSection.ingredients).toHaveLength(1);
  });

  test("removeSection removes the section by id", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.removeSection("s1");
    });
    rerender();

    expect(getFormData().ingredientSections).toEqual([]);
  });

  test("removeIngredient removes an ungrouped ingredient by tempId", () => {
    const { result, getFormData, rerender } = setup({
      ungroupedIngredients: [
        baseIngredient("t1", { name: "Flour" }),
        baseIngredient("t1b", { name: "Sugar" }),
      ],
    });

    act(() => {
      result.current.removeIngredient("ungrouped", "t1");
    });
    rerender();

    expect(getFormData().ungroupedIngredients).toHaveLength(1);
    expect(getFormData().ungroupedIngredients[0].tempId).toBe("t1b");
  });

  test("removeIngredient removes an ingredient from a section", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.removeIngredient("s1", "t2");
    });
    rerender();

    expect(getFormData().ingredientSections[0].ingredients).toEqual([]);
  });

  test("handleIngredientLink stores a linked recipe under the section-tempId key", () => {
    const { result, getFormData, rerender } = setup();
    const linkedRecipe = { id: "r1", title: "Pesto", slug: "pesto" };

    act(() => {
      result.current.handleIngredientLink("ungrouped", "t1", linkedRecipe);
    });
    rerender();

    expect(getFormData().ingredientLinks["ungrouped-t1"]).toEqual(linkedRecipe);
  });

  test("removeIngredientLink deletes the link for the given key", () => {
    const { result, getFormData, rerender } = setup({
      ingredientLinks: { "ungrouped-t1": { id: "r1" } },
    });

    act(() => {
      result.current.removeIngredientLink("ungrouped", "t1");
    });
    rerender();

    expect(getFormData().ingredientLinks).not.toHaveProperty("ungrouped-t1");
  });

  test("getIngredientLink returns the linked recipe for the given key", () => {
    const linkedRecipe = { id: "r1", title: "Pesto" };
    const { result } = setup({
      ingredientLinks: { "ungrouped-t1": linkedRecipe },
    });

    expect(result.current.getIngredientLink("ungrouped", "t1")).toEqual(
      linkedRecipe
    );
    expect(
      result.current.getIngredientLink("ungrouped", "missing")
    ).toBeUndefined();
  });

  describe("handleDragEnd", () => {
    test("does nothing when there is no destination", () => {
      const { result, setFormData } = setup();

      act(() => {
        result.current.handleDragEnd({
          source: { index: 0 },
          destination: null,
        });
      });

      expect(setFormData).not.toHaveBeenCalled();
    });

    test("reorders instructions", () => {
      const { result, getFormData, rerender } = setup({
        instructions: ["Step 1", "Step 2", "Step 3"],
      });

      act(() => {
        result.current.handleDragEnd({
          type: "instruction",
          source: { index: 0 },
          destination: { index: 2 },
        });
      });
      rerender();

      expect(getFormData().instructions).toEqual([
        "Step 2",
        "Step 3",
        "Step 1",
      ]);
    });

    test("reorders ungrouped ingredients within the same container", () => {
      const { result, getFormData, rerender } = setup({
        ungroupedIngredients: [
          baseIngredient("a", { name: "A" }),
          baseIngredient("b", { name: "B" }),
        ],
      });

      act(() => {
        result.current.handleDragEnd({
          type: "ingredient",
          source: { index: 0, droppableId: "ungrouped" },
          destination: { index: 1, droppableId: "ungrouped" },
        });
      });
      rerender();

      expect(getFormData().ungroupedIngredients.map((i) => i.tempId)).toEqual([
        "b",
        "a",
      ]);
    });

    test("moves an ingredient from ungrouped into a section", () => {
      const { result, getFormData, rerender } = setup({
        ungroupedIngredients: [baseIngredient("t1", { name: "Flour" })],
        ingredientSections: [
          { id: "s1", subheading: "Sauce", ingredients: [] },
        ],
      });

      act(() => {
        result.current.handleDragEnd({
          type: "ingredient",
          source: { index: 0, droppableId: "ungrouped" },
          destination: { index: 0, droppableId: "s1" },
        });
      });
      rerender();

      expect(getFormData().ungroupedIngredients).toEqual([]);
      expect(getFormData().ingredientSections[0].ingredients).toHaveLength(1);
      expect(getFormData().ingredientSections[0].ingredients[0].tempId).toBe(
        "t1"
      );
    });

    test("reorders sections", () => {
      const { result, getFormData, rerender } = setup({
        ingredientSections: [
          { id: "s1", subheading: "First", ingredients: [] },
          { id: "s2", subheading: "Second", ingredients: [] },
        ],
      });

      act(() => {
        result.current.handleDragEnd({
          type: "section",
          source: { index: 0 },
          destination: { index: 1 },
        });
      });
      rerender();

      expect(getFormData().ingredientSections.map((s) => s.id)).toEqual([
        "s2",
        "s1",
      ]);
    });
  });
});
