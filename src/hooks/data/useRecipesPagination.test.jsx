import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { queueFrom } from "../../test-utils/supabaseMock";
import {
  createTestQueryClient,
  createQueryClientWrapper,
} from "../../test-utils/queryClient";

const auth = vi.hoisted(() => ({ user: { id: "u1" } }));

vi.mock("../../lib/supabase", () => ({ default: { from: vi.fn() } }));
vi.mock("./useAuth", () => ({ useAuth: () => auth }));
vi.mock("./useIngredientNameBackfill", () => ({
  useIngredientNameBackfill: (recipes) => recipes,
}));
vi.mock("../../services/recipeTranslationService", () => ({
  getTranslatedRecipeTitle: vi.fn(async (recipe) => recipe),
}));

import supabase from "../../lib/supabase";
import {
  fetchRecipesWithCategories,
  useRecipesPagination,
} from "./useRecipesPagination";

const row = (id, title, extra = {}) => ({
  id,
  title,
  created_at: `2025-01-0${id}`,
  recipe_categories: [],
  recipe_ingredients: [],
  ...extra,
});

describe("fetchRecipesWithCategories", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns nothing without a user", async () => {
    expect(await fetchRecipesWithCategories(null)).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("flattens categories and flags recipes with ingredients", async () => {
    const [chain] = queueFrom(supabase.from, {
      data: [
        row("1", "Soup", {
          recipe_categories: [
            { categories: { name: "Dinner" } },
            { categories: null },
          ],
          recipe_ingredients: [{ id: "ri" }],
        }),
        row("2", "Toast", {
          recipe_categories: null,
          recipe_ingredients: null,
        }),
      ],
      error: null,
    });

    const result = await fetchRecipesWithCategories("u1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(result[0]).toMatchObject({
      categories: ["Dinner", undefined],
      hasIngredients: true,
    });
    expect(result[1]).toMatchObject({ categories: [], hasIngredients: false });
  });

  test("throws on error", async () => {
    const error = new Error("db");
    queueFrom(supabase.from, { data: null, error });
    await expect(fetchRecipesWithCategories("u1")).rejects.toBe(error);
  });
});

describe("useRecipesPagination", () => {
  let client;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = { id: "u1" };
    client = createTestQueryClient();
  });

  const render = (...args) =>
    renderHook(() => useRecipesPagination(...args), {
      wrapper: createQueryClientWrapper(client),
    });

  test("loads, filters and paginates the user's recipes", async () => {
    queueFrom(supabase.from, {
      data: [row("1", "Apple pie"), row("2", "Bean soup"), row("3", "Corn")],
      error: null,
    });

    const { result } = render(1, 2, "all_recipes", "", "title_asc");
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.recipes.map((r) => r.title)).toEqual([
      "Apple pie",
      "Bean soup",
    ]);
    expect(result.current.totalRecipeCount).toBe(3);
    expect(result.current.paginationInfo).toEqual({
      totalCount: 3,
      totalPages: 2,
      currentPage: 1,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  test("applies the search term", async () => {
    queueFrom(supabase.from, {
      data: [row("1", "Apple pie"), row("2", "Bean soup")],
      error: null,
    });
    const { result } = render(1, 10, "all_recipes", "bean");
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recipes.map((r) => r.title)).toEqual(["Bean soup"]);
  });

  test("doesn't fetch when disabled or signed out", () => {
    const disabled = render(1, 10, "all_recipes", "", "created_at_desc", false);
    expect(disabled.result.current.recipes).toEqual([]);

    auth.user = null;
    render(1, 10);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("refreshRecipes invalidates the recipe queries", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    queueFrom(supabase.from, { data: [], error: null });
    const { result } = render(1, 10);
    await waitFor(() => expect(result.current.loading).toBe(false));

    queueFrom(supabase.from, { data: [], error: null });
    await act(() => result.current.refreshRecipes());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["recipes"] });
  });
});
