import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./recipeTranslationService", () => ({
  updateRecipeTranslations: vi.fn(),
  translateText: vi.fn((text) => Promise.resolve(text)),
}));

vi.mock("./imageService", () => ({
  uploadLocalImages: vi.fn(),
  cleanupOrphanedImages: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
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
  copyRecipeFromFriend,
  findCopiedRecipe,
  fetchCopiedRecipeIds,
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
    "not",
    "limit",
  ].forEach((method) => {
    builder[method] = vi.fn(() => builder);
  });
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
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

    test("reuses an existing ingredient matched by name via the server-side lookup", async () => {
      supabase.rpc.mockResolvedValue({ data: "i1", error: null });
      const ingredientsInsertBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { id: "r1" }, error: null })
        ) // recipes insert
        .mockReturnValueOnce(ingredientsInsertBuilder); // recipe_ingredients insert

      await createRecipe({
        title: "Chili",
        original_language: "en",
        ungroupedIngredients: [
          { name: "tofu", tempId: "t1", quantity: "1", unit: "block" },
        ],
      });

      expect(supabase.rpc).toHaveBeenCalledWith("match_ingredient_by_english", {
        p_candidates: ["tofu", "tofus"],
      });
      expect(ingredientsInsertBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({ ingredient_id: "i1" }),
      ]);
      // No new ingredient row created - the match was reused
      expect(supabase.from).not.toHaveBeenCalledWith("ingredients");
    });

    test("creates a new ingredient when the server-side lookup finds no match", async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });
      const ingredientCreateBuilder = makeQueryBuilder({
        data: { id: "i9" },
        error: null,
      });
      const ingredientsInsertBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { id: "r1" }, error: null })
        ) // recipes insert
        .mockReturnValueOnce(ingredientCreateBuilder) // ingredients insert
        .mockReturnValueOnce(ingredientsInsertBuilder); // recipe_ingredients insert

      await createRecipe({
        title: "Chili",
        original_language: "en",
        ungroupedIngredients: [
          { name: "seitan", tempId: "t1", quantity: "1", unit: "block" },
        ],
      });

      expect(ingredientCreateBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          singular_name: "seitan",
          plural_name: "seitans",
        }),
      ]);
      expect(ingredientsInsertBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({ ingredient_id: "i9" }),
      ]);
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

    test("leaves ingredients and categories untouched when omitted from recipeData", async () => {
      const fetchOriginalBuilder = makeQueryBuilder({
        data: { title: "Old", images: [] },
        error: null,
      });
      const updateBuilder = makeQueryBuilder({
        data: { id: "r1", title: "New" },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(fetchOriginalBuilder) // fetch original recipe
        .mockReturnValueOnce(updateBuilder); // update recipe

      const result = await updateRecipe("r1", { title: "New" });

      expect(result).toEqual({ id: "r1", title: "New" });
      // Only the two calls above - no recipe_ingredients or
      // recipe_categories touched since neither field was provided
      expect(supabase.from).toHaveBeenCalledTimes(2);
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

  describe("copyRecipeFromFriend", () => {
    test("throws when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(copyRecipeFromFriend("r1", {})).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("throws when copying your own recipe", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({
          data: {
            id: "r1",
            user_id: currentUser.id,
            recipe_ingredients: [],
            recipe_categories: [],
          },
          error: null,
        })
      );

      await expect(copyRecipeFromFriend("r1", {})).rejects.toThrow(
        "Cannot copy your own recipe"
      );
    });

    test("creates an independent copy without images, reusing ingredients by id and dropping recipe links", async () => {
      const friendRecipe = {
        id: "r1",
        user_id: "friend-1",
        title: "Soup",
        servings: "4",
        instructions: ["Boil"],
        source: "Grandma's book",
        notes: "Extra salt",
        original_language: "en",
        images: [{ id: "img1", path: "friend/r1/a.jpg" }],
        nutrition: { calories: 200 },
        recipe_ingredients: [
          {
            id: "ri1",
            order_index: 0,
            subheading: null,
            quantity: "1",
            unit: "can",
            notes: null,
            is_plural: false,
            linked_recipe_id: "other-recipe",
            ingredients: {
              id: "i1",
              singular_name: "tomato",
              plural_name: "tomatoes",
            },
          },
        ],
        recipe_categories: [],
      };
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: friendRecipe, error: null })
      ); // fetchRecipe
      const insertBuilder = makeQueryBuilder({
        data: { id: "new1", slug: "soup" },
        error: null,
      });
      const ingredientsInsertBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(insertBuilder) // recipes insert
        .mockReturnValueOnce(ingredientsInsertBuilder); // recipe_ingredients insert

      const result = await copyRecipeFromFriend("r1", {
        categoryNames: [],
        friendFirstName: "Jane",
      });

      expect(result).toEqual({ id: "new1", slug: "soup" });
      expect(insertBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          title: "Soup",
          source: "Grandma's book",
          user_id: currentUser.id,
          images: [],
          private: false,
          copied_from_recipe_id: "r1",
          copied_from_name: "Jane",
        }),
      ]);
      expect(insertBuilder.insert.mock.calls[0][0][0]).not.toHaveProperty(
        "translated_recipe"
      );
      expect(ingredientsInsertBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          recipe_id: "new1",
          ingredient_id: "i1",
          linked_recipe_id: null,
        }),
      ]);
    });

    test("assigns categories to the copy using the current user's own categories", async () => {
      const friendRecipe = {
        id: "r1",
        user_id: "friend-1",
        title: "Soup",
        original_language: "en",
        images: [],
        recipe_ingredients: [],
        recipe_categories: [],
      };
      const insertBuilder = makeQueryBuilder({
        data: { id: "new1", slug: "soup" },
        error: null,
      });
      const recipeCategoriesInsertBuilder = makeQueryBuilder({ error: null });
      supabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: friendRecipe, error: null })
        ) // fetchRecipe
        .mockReturnValueOnce(insertBuilder) // recipes insert
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { id: "c1" }, error: null })
        ) // getOrCreateCategory: existing category lookup
        .mockReturnValueOnce(
          makeQueryBuilder({ data: { id: "c1" }, error: null })
        ) // addRecipeToCategory: category lookup
        .mockReturnValueOnce(recipeCategoriesInsertBuilder); // recipe_categories insert

      await copyRecipeFromFriend("r1", { categoryNames: ["Dinner"] });

      expect(recipeCategoriesInsertBuilder.insert).toHaveBeenCalledWith({
        recipe_id: "new1",
        categoriy_id: "c1",
      });
    });
  });

  describe("findCopiedRecipe", () => {
    test("returns null when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      expect(await findCopiedRecipe("r1")).toBeNull();
    });

    test("returns the current user's most recent copy of the recipe", async () => {
      const builder = makeQueryBuilder({
        data: { id: "c1", slug: "soup", created_at: "2026-01-01" },
        error: null,
      });
      supabase.from.mockReturnValueOnce(builder);

      const result = await findCopiedRecipe("r1");

      expect(result).toEqual({
        id: "c1",
        slug: "soup",
        created_at: "2026-01-01",
      });
      expect(builder.eq).toHaveBeenCalledWith("copied_from_recipe_id", "r1");
    });

    test("throws when the query fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: { message: "db down" } })
      );

      await expect(findCopiedRecipe("r1")).rejects.toThrow("db down");
    });
  });

  describe("fetchCopiedRecipeIds", () => {
    test("returns an empty set when there is no logged-in user", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      expect(await fetchCopiedRecipeIds()).toEqual(new Set());
    });

    test("returns the set of recipe ids the user has already copied", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            { copied_from_recipe_id: "r1" },
            { copied_from_recipe_id: "r2" },
          ],
          error: null,
        })
      );

      expect(await fetchCopiedRecipeIds()).toEqual(new Set(["r1", "r2"]));
    });

    test("throws when the query fails", async () => {
      supabase.from.mockReturnValueOnce(
        makeQueryBuilder({ data: null, error: { message: "db down" } })
      );

      await expect(fetchCopiedRecipeIds()).rejects.toThrow("db down");
    });
  });
});
