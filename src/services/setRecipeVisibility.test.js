import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("pluralize", () => ({
  default: { isPlural: vi.fn() },
}));

vi.mock("../lib/supabase", () => ({
  default: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import supabase from "../lib/supabase";
import { setRecipeVisibility, fetchSharedRecipe, getShareUrl } from "./recipes";

describe("setRecipeVisibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("calls the visibility RPC and returns the share token", async () => {
    supabase.rpc.mockResolvedValue({ data: "abc123", error: null });

    const result = await setRecipeVisibility(5, "link");

    expect(supabase.rpc).toHaveBeenCalledWith("set_recipe_visibility", {
      p_recipe_id: 5,
      p_visibility: "link",
    });
    expect(result).toBe("abc123");
  });

  test("throws when the RPC fails", async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "Recipe not found" },
    });

    await expect(setRecipeVisibility(5, "private")).rejects.toThrow(
      "Recipe not found"
    );
  });
});

describe("fetchSharedRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shapes the RPC payload like fetchRecipe", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        id: 5,
        title: "Soup",
        recipe_ingredients: [
          {
            id: "ri-2",
            order_index: 1,
            subheading: "Topping",
            ingredients: { id: 2, singular_name: "chive" },
          },
          {
            id: "ri-1",
            order_index: 0,
            subheading: null,
            ingredients: { id: 1, singular_name: "potato" },
          },
        ],
        recipe_categories: [{ categories: { name: "Soups" } }],
        owner: { id: "u1", first_name: "Anna" },
      },
      error: null,
    });

    const recipe = await fetchSharedRecipe("tok");

    expect(supabase.rpc).toHaveBeenCalledWith("get_shared_recipe", {
      p_token: "tok",
    });
    expect(recipe.categories).toEqual(["Soups"]);
    expect(recipe.ungroupedIngredients.map((i) => i.id)).toEqual([1]);
    expect(recipe.ingredientSections[0].subheading).toBe("Topping");
    expect(recipe.owner.first_name).toBe("Anna");
    expect(recipe.recipe_ingredients).toBeUndefined();
  });

  test("throws SHARED_RECIPE_NOT_FOUND when the link is inactive", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    await expect(fetchSharedRecipe("tok")).rejects.toThrow(
      "SHARED_RECIPE_NOT_FOUND"
    );
  });
});

describe("getShareUrl", () => {
  test("builds the shared route with an optional slug", () => {
    expect(getShareUrl("tok", "soup")).toBe(
      `${window.location.origin}/shared/tok/soup`
    );
    expect(getShareUrl("tok")).toBe(`${window.location.origin}/shared/tok`);
  });
});
