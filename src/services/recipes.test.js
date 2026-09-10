import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./translationService", () => ({
  updateRecipeTranslations: vi.fn(),
}));

vi.mock("./imageService", () => ({
  uploadLocalImages: vi.fn(),
  cleanupOrphanedImages: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import {
  fetchRecipes,
  fetchRecipesPaginated,
  checkRecipeTitleExists,
  fetchRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "./recipes";
import supabase from "../lib/supabase";
import { uploadLocalImages } from "./imageService";

// Supabase's real query builder is itself thenable, so `await` resolves at
// any point in the chain. Every chain method returns the same builder, and
// the builder resolves to `result` when awaited or terminated with
// `.single()`.
const makeQueryBuilder = (result) => {
  const builder = {};
  [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "neq",
    "ilike",
    "order",
    "range",
  ].forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
};

const currentUser = { id: "u1" };

describe("recipes service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: currentUser } });
  });

  describe("fetchRecipes", () => {
    test("returns an empty array when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      expect(await fetchRecipes()).toEqual([]);
    });

    test("returns the current user's recipes", async () => {
      const recipes = [{ id: "r1", title: "Chili" }];
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: recipes, error: null })
      );

      expect(await fetchRecipes()).toEqual(recipes);
    });

    test("throws when the query fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: new Error("db down") })
      );

      await expect(fetchRecipes()).rejects.toThrow("db down");
    });
  });

  describe("fetchRecipesPaginated", () => {
    test("returns an empty page when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      expect(await fetchRecipesPaginated(1, 12)).toEqual({
        recipes: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    test("computes pagination info from the total count", async () => {
      const builder = makeQueryBuilder({
        data: [{ id: "r1" }, { id: "r2" }],
        error: null,
        count: 25,
      });
      supabase.from.mockReturnValueOnce(builder);

      const result = await fetchRecipesPaginated(2, 12);

      expect(result).toMatchObject({
        totalCount: 25,
        totalPages: 3,
        currentPage: 2,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    test("filters by category and search term when given", async () => {
      const builder = makeQueryBuilder({ data: [], error: null, count: 0 });
      supabase.from.mockReturnValueOnce(builder);

      await fetchRecipesPaginated(1, 12, {
        category: "Dinner",
        searchTerm: "chili",
      });

      expect(builder.eq).toHaveBeenCalledWith("category", "Dinner");
      expect(builder.ilike).toHaveBeenCalledWith("title", "%chili%");
    });

    test("throws when the query fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: new Error("db down") })
      );

      await expect(fetchRecipesPaginated()).rejects.toThrow("db down");
    });
  });

  describe("checkRecipeTitleExists", () => {
    test("throws when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(checkRecipeTitleExists("Chili")).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("returns true when a matching title exists", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: [{ id: "r1" }], error: null })
      );

      expect(await checkRecipeTitleExists("Chili")).toBe(true);
    });

    test("returns false when no matching title exists", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: [], error: null })
      );

      expect(await checkRecipeTitleExists("Chili")).toBe(false);
    });

    test("excludes the given recipe id when checking (edit mode)", async () => {
      const builder = makeQueryBuilder({ data: [], error: null });
      supabase.from.mockReturnValueOnce(builder);

      await checkRecipeTitleExists("Chili", "r1");

      expect(builder.neq).toHaveBeenCalledWith("id", "r1");
    });

    test("throws a friendly error when the query fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: { message: "db down" } })
      );

      await expect(checkRecipeTitleExists("Chili")).rejects.toThrow(
        "Error checking recipe title: db down"
      );
    });
  });

  describe("fetchRecipe", () => {
    test("throws when no id is given", async () => {
      await expect(fetchRecipe()).rejects.toThrow("Recipe ID is required");
    });

    test("throws when the query fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: new Error("not found") })
      );

      await expect(fetchRecipe("r1")).rejects.toThrow("not found");
    });

    test("separates ungrouped ingredients from sectioned ones, in order", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({
          data: {
            id: "r1",
            title: "Chili",
            recipe_ingredients: [
              {
                id: "ri2",
                order_index: 1,
                subheading: "Sauce",
                ingredients: { id: "i2", singular_name: "tahini" },
              },
              {
                id: "ri1",
                order_index: 0,
                subheading: null,
                ingredients: { id: "i1", singular_name: "tofu" },
              },
            ],
            recipe_categories: [],
          },
          error: null,
        })
      );

      const result = await fetchRecipe("r1");

      expect(result.ungroupedIngredients).toHaveLength(1);
      expect(result.ungroupedIngredients[0].singular_name).toBe("tofu");
      expect(result.ingredientSections).toEqual([
        {
          id: "section-0",
          subheading: "Sauce",
          ingredients: [expect.objectContaining({ singular_name: "tahini" })],
        },
      ]);
      // Ordering is preserved by order_index before grouping.
      expect(result.ingredients.map((i) => i.recipe_ingredient_id)).toEqual([
        "ri1",
        "ri2",
      ]);
    });

    test("extracts category names and removes the raw join fields", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({
          data: {
            id: "r1",
            recipe_ingredients: [],
            recipe_categories: [
              { categories: { name: "Dinner" } },
              { categories: null },
            ],
          },
          error: null,
        })
      );

      const result = await fetchRecipe("r1");

      expect(result.categories).toEqual(["Dinner"]);
      expect(result.recipe_ingredients).toBeUndefined();
      expect(result.recipe_categories).toBeUndefined();
    });
  });

  describe("createRecipe", () => {
    test("throws when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(createRecipe({ title: "Chili" })).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("creates the recipe and inserts ingredients referenced by id", async () => {
      const insertBuilder = makeQueryBuilder({
        data: { id: "r1", title: "Chili" },
        error: null,
      });
      const ingredientsInsertBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(insertBuilder) // recipes insert
        .mockReturnValueOnce(ingredientsInsertBuilder); // recipe_ingredients insert

      const result = await createRecipe({
        title: "Chili",
        original_language: "en",
        ungroupedIngredients: [
          { ingredient_id: "i1", tempId: "t1", quantity: "1", unit: "can" },
        ],
      });

      expect(result).toEqual({ id: "r1", title: "Chili" });
      expect(ingredientsInsertBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          recipe_id: "r1",
          ingredient_id: "i1",
          order_index: 0,
        }),
      ]);
    });

    test("throws when the recipe insert fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: { message: "db down" } })
      );

      await expect(createRecipe({ title: "Chili" })).rejects.toThrow("db down");
    });

    test("throws a wrapped error when inserting ingredients fails", async () => {
      supabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { id: "r1" }, error: null })
        )
        .mockReturnValueOnce(
          makeQueryBuilder({ error: { message: "constraint violation" } })
        );

      await expect(
        createRecipe({
          title: "Chili",
          original_language: "en",
          ungroupedIngredients: [{ ingredient_id: "i1", tempId: "t1" }],
        })
      ).rejects.toThrow(
        "Recipe created but failed to add ingredients: constraint violation"
      );
    });

    test("uploads local images after creating the recipe", async () => {
      const imagesUpdateBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { id: "r1" }, error: null })
        )
        .mockReturnValueOnce(imagesUpdateBuilder);
      uploadLocalImages.mockResolvedValue([{ id: "img1", path: "u/r1/a.jpg" }]);

      await createRecipe({
        title: "Chili",
        images: [{ id: "img1", isLocal: true, file: {} }],
      });

      expect(uploadLocalImages).toHaveBeenCalled();
      expect(imagesUpdateBuilder.update).toHaveBeenCalledWith({
        images: [{ id: "img1", path: "u/r1/a.jpg" }],
      });
    });
  });

  describe("updateRecipe", () => {
    test("throws when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(updateRecipe("r1", {})).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("updates the recipe, replacing its ingredients", async () => {
      const fetchOriginalBuilder = makeQueryBuilder({
        data: { title: "Old", images: [] },
        error: null,
      });
      const updateBuilder = makeQueryBuilder({
        data: { id: "r1", title: "New" },
        error: null,
      });
      const deleteIngredientsBuilder = makeQueryBuilder({ error: null });
      const languageLookupBuilder = makeQueryBuilder({
        data: { original_language: "en" },
        error: null,
      });
      const insertIngredientsBuilder = makeQueryBuilder({ error: null });

      supabase.from
        .mockReturnValueOnce(fetchOriginalBuilder) // fetch original recipe
        .mockReturnValueOnce(updateBuilder) // update recipe
        .mockReturnValueOnce(deleteIngredientsBuilder) // delete old ingredients
        .mockReturnValueOnce(languageLookupBuilder) // per-ingredient language lookup
        .mockReturnValueOnce(insertIngredientsBuilder); // insert new ingredients

      const result = await updateRecipe("r1", {
        title: "New",
        ungroupedIngredients: [{ ingredient_id: "i1", tempId: "t1" }],
      });

      expect(result).toEqual({ id: "r1", title: "New" });
      expect(deleteIngredientsBuilder.delete).toHaveBeenCalled();
      expect(insertIngredientsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({ recipe_id: "r1", ingredient_id: "i1" }),
      ]);
    });

    test("throws when the recipe update fails", async () => {
      supabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { title: "Old", images: [] }, error: null })
        )
        .mockReturnValueOnce(
          makeQueryBuilder({ data: null, error: { message: "db down" } })
        );

      await expect(updateRecipe("r1", { title: "New" })).rejects.toThrow(
        "db down"
      );
    });
  });

  describe("deleteRecipe", () => {
    test("deletes the recipe's ingredients, then the recipe", async () => {
      const deleteIngredientsBuilder = makeQueryBuilder({ error: null });
      const deleteRecipeBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(deleteIngredientsBuilder)
        .mockReturnValueOnce(deleteRecipeBuilder);

      await expect(deleteRecipe("r1")).resolves.toBe(true);
      expect(deleteIngredientsBuilder.eq).toHaveBeenCalledWith(
        "recipe_id",
        "r1"
      );
      expect(deleteRecipeBuilder.eq).toHaveBeenCalledWith("id", "r1");
    });

    test("throws when deleting the recipe's ingredients fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ error: { message: "db down" } })
      );

      await expect(deleteRecipe("r1")).rejects.toThrow(
        "Failed to delete recipe ingredients: db down"
      );
    });

    test("throws when deleting the recipe itself fails", async () => {
      supabase.from
        .mockReturnValueOnce(makeQueryBuilder({ error: null }))
        .mockReturnValueOnce(
          makeQueryBuilder({ error: { message: "db down" } })
        );

      await expect(deleteRecipe("r1")).rejects.toThrow("db down");
    });
  });
});
