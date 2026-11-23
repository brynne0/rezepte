import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useIngredientNameBackfill,
  findIngredientsMissingNames,
} from "./useIngredientNameBackfill";
import { translateIngredientNames } from "../../services/recipeTranslationService";
import { useOnlineStatus } from "../ui/useOnlineStatus";

vi.mock("../../services/recipeTranslationService", () => ({
  translateIngredientNames: vi.fn(),
}));

vi.mock("../ui/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

// Module-level session cache persists between tests, so each uses unique ids
const recipeWith = (...ingredients) => ({
  id: `recipe-${ingredients.map((i) => i.id).join("-")}`,
  recipe_ingredients: ingredients.map((ingredient, index) => ({
    id: `ri-${index}`,
    ingredients: ingredient,
  })),
});

describe("findIngredientsMissingNames", () => {
  test("returns nothing for English, whose names are canonical", () => {
    const recipes = [recipeWith({ id: "a", singular_name: "flour" })];
    expect(findIngredientsMissingNames(recipes, "en")).toEqual([]);
  });

  test("returns each ingredient without a stored name once", () => {
    const flour = { id: "flour", singular_name: "flour" };
    const salt = {
      id: "salt",
      singular_name: "salt",
      translated_names: { de: { singular_name: "Salz" } },
    };
    const recipes = [recipeWith(flour, salt), recipeWith(flour)];

    expect(findIngredientsMissingNames(recipes, "de")).toEqual([flour]);
  });
});

describe("useIngredientNameBackfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnlineStatus.mockReturnValue(true);
  });

  test("fills translated names into the recipes for search", async () => {
    const butter = { id: "butter-1", singular_name: "butter" };
    const recipes = [recipeWith(butter)];
    translateIngredientNames.mockResolvedValue({
      singular_name: "Butter",
      plural_name: "Butter",
    });

    const { result } = renderHook(() =>
      useIngredientNameBackfill(recipes, "de")
    );

    // The list shows straight away, before names are filled in
    expect(result.current).toBe(recipes);

    await waitFor(() =>
      expect(
        result.current[0].recipe_ingredients[0].ingredients.translated_names.de
      ).toEqual({ singular_name: "Butter", plural_name: "Butter" })
    );
    expect(translateIngredientNames).toHaveBeenCalledWith(butter, "de");
  });

  test("translates each ingredient only once per session", async () => {
    const egg = { id: "egg-1", singular_name: "egg" };
    translateIngredientNames.mockResolvedValue({ singular_name: "Ei" });

    const first = renderHook(() =>
      useIngredientNameBackfill([recipeWith(egg)], "de")
    );
    await waitFor(() => expect(translateIngredientNames).toHaveBeenCalled());
    first.unmount();

    renderHook(() => useIngredientNameBackfill([recipeWith(egg)], "de"));

    expect(translateIngredientNames).toHaveBeenCalledTimes(1);
  });

  test("leaves recipes unchanged when translation fails", async () => {
    const recipes = [recipeWith({ id: "leek-1", singular_name: "leek" })];
    translateIngredientNames.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useIngredientNameBackfill(recipes, "de")
    );

    await waitFor(() => expect(translateIngredientNames).toHaveBeenCalled());
    expect(result.current).toBe(recipes);
  });

  test("does nothing while offline", () => {
    useOnlineStatus.mockReturnValue(false);

    renderHook(() =>
      useIngredientNameBackfill(
        [recipeWith({ id: "oat-1", singular_name: "oat" })],
        "de"
      )
    );

    expect(translateIngredientNames).not.toHaveBeenCalled();
  });

  test("does nothing in English", () => {
    renderHook(() =>
      useIngredientNameBackfill(
        [recipeWith({ id: "rye-1", singular_name: "rye" })],
        "en"
      )
    );

    expect(translateIngredientNames).not.toHaveBeenCalled();
  });
});
