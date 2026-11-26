import { describe, test, expect, beforeEach, vi } from "vitest";
import { mockChain, queueFrom } from "../test-utils/supabaseMock";

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock("./recipeTranslationService", () => ({
  translateText: vi.fn(),
}));

import supabase from "../lib/supabase";
import { translateText } from "./recipeTranslationService";
import {
  fetchCategories,
  getCategories,
  withAllRecipesOption,
  createCategory,
  updateCategoryTranslations,
  updateCategoryName,
  deleteCategory,
  saveCategoryOrder,
  addRecipeToCategory,
  removeRecipeFromCategory,
  getRecipesByCategory,
} from "./categoriesService";

const mockUser = { id: "user-1" };
const dbError = { message: "boom" };

describe("categoriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("fetchCategories", () => {
    test("returns empty array when signed out", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      expect(await fetchCategories()).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    test("returns the user's categories in display order", async () => {
      const [chain] = queueFrom(supabase.from, {
        data: [{ id: 1, name: "Soup" }],
        error: null,
      });
      expect(await fetchCategories()).toEqual([{ id: 1, name: "Soup" }]);
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(chain.order).toHaveBeenCalledWith("display_order");
    });

    test("returns empty array when data is null", async () => {
      queueFrom(supabase.from, { data: null, error: null });
      expect(await fetchCategories()).toEqual([]);
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(fetchCategories()).rejects.toThrow(
        "Error fetching categories: boom"
      );
    });
  });

  describe("getCategories", () => {
    test("uses the translated label when one exists for the language", async () => {
      queueFrom(supabase.from, {
        data: [
          {
            id: 1,
            name: "Soup",
            display_order: 0,
            translated_category: { de: "Suppe" },
          },
          { id: 2, name: "Cake", display_order: 1, translated_category: null },
        ],
        error: null,
      });

      expect(await getCategories("de")).toEqual([
        { id: 1, value: "Soup", label: "Suppe", order: 0 },
        { id: 2, value: "Cake", label: "Cake", order: 1 },
      ]);
    });
  });

  describe("withAllRecipesOption", () => {
    test("prepends a localised All Recipes option", () => {
      const cats = [{ value: "soup" }];
      expect(withAllRecipesOption(cats, "de")[0].label).toBe("Alle Rezepte");
      expect(withAllRecipesOption(cats)[0]).toEqual({
        value: "all_recipes",
        label: "All Recipes",
        isSystem: true,
      });
      expect(withAllRecipesOption(cats)[1]).toBe(cats[0]);
    });
  });

  describe("createCategory", () => {
    test("throws when not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(createCategory("Soup")).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("rejects a duplicate name", async () => {
      queueFrom(supabase.from, { data: { id: 9 }, error: null });
      await expect(createCategory("Soup")).rejects.toThrow("already exists");
    });

    test("escapes ILIKE wildcards in the duplicate check", async () => {
      const [check] = queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await createCategory("100%_good");
      expect(check.ilike).toHaveBeenCalledWith("name", "100\\%\\_good");
    });

    test("proceeds when the existence check fails (RLS)", async () => {
      const check = mockChain();
      check.single.mockRejectedValue(new Error("406"));
      const insert = mockChain({ data: { id: 1 }, error: null });
      supabase.from.mockReturnValueOnce(check).mockReturnValueOnce(insert);

      expect(await createCategory("Soup")).toEqual({ id: 1 });
      expect(console.warn).toHaveBeenCalled();
    });

    test("inserts trimmed name with no translation by default", async () => {
      const [, insert] = queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await createCategory("  Soup  ");
      expect(translateText).not.toHaveBeenCalled();
      expect(insert.insert).toHaveBeenCalledWith([
        {
          name: "Soup",
          user_id: "user-1",
          original_language: "en",
          translated_category: null,
        },
      ]);
    });

    test("stores the translation into the other language", async () => {
      translateText.mockResolvedValue("Suppe");
      const [, insert] = queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await createCategory("Soup", { en: "Soup" });
      expect(translateText).toHaveBeenCalledWith("Soup", "de", "Food category");
      expect(insert.insert.mock.calls[0][0][0].translated_category).toEqual({
        de: "Suppe",
      });
    });

    test("translates German names into English", async () => {
      translateText.mockResolvedValue("Soup");
      const [, insert] = queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await createCategory("Suppe", { de: "Suppe" });
      const row = insert.insert.mock.calls[0][0][0];
      expect(row.original_language).toBe("de");
      expect(row.translated_category).toEqual({ en: "Soup" });
    });

    test("skips an unchanged (failed) translation", async () => {
      translateText.mockResolvedValue("soup");
      const [, insert] = queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await createCategory("Soup", { en: "Soup" });
      expect(insert.insert.mock.calls[0][0][0].translated_category).toBeNull();
    });

    test("still creates the category when translation throws", async () => {
      translateText.mockRejectedValue(new Error("api down"));
      queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      expect(await createCategory("Soup", { en: "Soup" })).toEqual({ id: 1 });
    });

    test("throws when the insert fails", async () => {
      queueFrom(
        supabase.from,
        { data: null, error: null },
        { data: null, error: dbError }
      );
      await expect(createCategory("Soup")).rejects.toThrow(
        "Error creating category: boom"
      );
    });
  });

  describe("updateCategoryTranslations", () => {
    test("updates and returns the row", async () => {
      const [chain] = queueFrom(supabase.from, {
        data: { id: 1 },
        error: null,
      });
      expect(await updateCategoryTranslations(1, { de: "Suppe" })).toEqual({
        id: 1,
      });
      expect(chain.update).toHaveBeenCalledWith({
        translated_category: { de: "Suppe" },
      });
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(updateCategoryTranslations(1, {})).rejects.toThrow(
        "Error updating category translations: boom"
      );
    });
  });

  describe("updateCategoryName", () => {
    const owned = { data: { user_id: "user-1", name: "Soup" }, error: null };

    test("throws when the category is missing", async () => {
      queueFrom(supabase.from, { data: null, error: null });
      await expect(updateCategoryName(1, "X")).rejects.toThrow(
        "Category not found"
      );
    });

    test("throws when the category belongs to someone else", async () => {
      queueFrom(supabase.from, {
        data: { user_id: "other", name: "Soup" },
        error: null,
      });
      await expect(updateCategoryName(1, "X")).rejects.toThrow(
        "only rename categories you created"
      );
    });

    test("rejects a name another category already uses", async () => {
      queueFrom(supabase.from, owned, { data: { id: 2 }, error: null });
      await expect(updateCategoryName(1, "Cake")).rejects.toThrow(
        "already exists"
      );
    });

    test("skips the duplicate check for a case-only change", async () => {
      const [, update] = queueFrom(supabase.from, owned, {
        data: { id: 1 },
        error: null,
      });
      await updateCategoryName(1, "soup");
      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(update.update).toHaveBeenCalledWith({
        name: "soup",
        original_language: "en",
        translated_category: null,
      });
    });

    test("renames with a fresh translation", async () => {
      translateText.mockResolvedValue("Kuchen");
      const [, , update] = queueFrom(
        supabase.from,
        owned,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await updateCategoryName(1, "Cake", { en: "Cake" });
      expect(update.update).toHaveBeenCalledWith({
        name: "Cake",
        original_language: "en",
        translated_category: { de: "Kuchen" },
      });
    });

    test("ignores unchanged or failed translations", async () => {
      translateText.mockResolvedValueOnce("Cake");
      const [, , update] = queueFrom(
        supabase.from,
        owned,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await updateCategoryName(1, "Cake", { en: "Cake" });
      expect(update.update.mock.calls[0][0].translated_category).toBeNull();

      translateText.mockRejectedValueOnce(new Error("down"));
      queueFrom(
        supabase.from,
        owned,
        { data: null, error: null },
        { data: { id: 1 }, error: null }
      );
      await expect(
        updateCategoryName(1, "Kuchen", { de: "Kuchen" })
      ).resolves.toEqual({ id: 1 });
    });

    test("throws when the update fails", async () => {
      queueFrom(supabase.from, owned, { data: null, error: dbError });
      await expect(updateCategoryName(1, "Soup")).rejects.toThrow(
        "Error updating category: boom"
      );
    });
  });

  describe("deleteCategory", () => {
    test("throws when missing or not owned", async () => {
      queueFrom(supabase.from, { data: null, error: null });
      await expect(deleteCategory(1)).rejects.toThrow("Category not found");

      queueFrom(supabase.from, { data: { user_id: "other" }, error: null });
      await expect(deleteCategory(1)).rejects.toThrow(
        "only delete categories you created"
      );
    });

    test("deletes an owned category", async () => {
      const [, del] = queueFrom(
        supabase.from,
        { data: { user_id: "user-1" }, error: null },
        { error: null }
      );
      expect(await deleteCategory(1)).toBe(true);
      expect(del.delete).toHaveBeenCalled();
      expect(del.eq).toHaveBeenCalledWith("id", 1);
    });

    test("throws when the delete fails", async () => {
      queueFrom(
        supabase.from,
        { data: { user_id: "user-1" }, error: null },
        { error: dbError }
      );
      await expect(deleteCategory(1)).rejects.toThrow(
        "Error deleting category: boom"
      );
    });
  });

  describe("saveCategoryOrder", () => {
    test("writes each category's index as its display order", async () => {
      const chains = queueFrom(supabase.from, { error: null }, { error: null });
      await saveCategoryOrder(["a", "b"]);
      expect(chains[0].update).toHaveBeenCalledWith({ display_order: 0 });
      expect(chains[0].eq).toHaveBeenCalledWith("id", "a");
      expect(chains[1].update).toHaveBeenCalledWith({ display_order: 1 });
      expect(chains[1].eq).toHaveBeenCalledWith("user_id", "user-1");
    });
  });

  describe("addRecipeToCategory", () => {
    test("throws when the category is missing", async () => {
      queueFrom(supabase.from, { data: null, error: null });
      await expect(addRecipeToCategory("r1", "Soup")).rejects.toThrow(
        "Category 'Soup' not found"
      );
    });

    test("returns the existing link without inserting", async () => {
      queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { data: { id: "link" }, error: null }
      );
      expect(await addRecipeToCategory("r1", "Soup")).toEqual({ id: "link" });
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    test("creates the link", async () => {
      const [, , insert] = queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { data: null, error: null },
        { data: { id: "new" }, error: null }
      );
      expect(await addRecipeToCategory("r1", "Soup")).toEqual({ id: "new" });
      expect(insert.insert).toHaveBeenCalledWith({
        recipe_id: "r1",
        categoriy_id: "c1",
      });
    });

    test("throws when the insert fails", async () => {
      queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { data: null, error: null },
        { data: null, error: dbError }
      );
      await expect(addRecipeToCategory("r1", "Soup")).rejects.toThrow(
        "Error adding recipe to category: boom"
      );
    });
  });

  describe("removeRecipeFromCategory", () => {
    test("throws when the category is missing", async () => {
      queueFrom(supabase.from, { data: null, error: null });
      await expect(removeRecipeFromCategory("r1", "Soup")).rejects.toThrow(
        "not found"
      );
    });

    test("removes the link", async () => {
      const [, del] = queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { error: null }
      );
      expect(await removeRecipeFromCategory("r1", "Soup")).toBe(true);
      expect(del.eq).toHaveBeenCalledWith("categoriy_id", "c1");
    });

    test("throws when the delete fails", async () => {
      queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { error: dbError }
      );
      await expect(removeRecipeFromCategory("r1", "Soup")).rejects.toThrow(
        "Error removing recipe from category: boom"
      );
    });
  });

  describe("getRecipesByCategory", () => {
    test("pages through all recipes for all_recipes", async () => {
      const [chain] = queueFrom(supabase.from, { data: [1], count: 1 });
      expect(await getRecipesByCategory("all_recipes", 2, 10)).toEqual({
        data: [1],
        count: 1,
      });
      expect(chain.range).toHaveBeenCalledWith(10, 19);
    });

    test("throws when the category is missing", async () => {
      queueFrom(supabase.from, { data: null, error: null });
      await expect(getRecipesByCategory("Soup")).rejects.toThrow("not found");
    });

    test("unwraps recipes from the join rows", async () => {
      queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { data: [{ recipes: { id: "r1" } }], error: null, count: 1 }
      );
      expect(await getRecipesByCategory("Soup")).toEqual({
        data: [{ id: "r1" }],
        count: 1,
      });
    });

    test("returns empty data when the join returns null", async () => {
      queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { data: null, error: null, count: 0 }
      );
      expect((await getRecipesByCategory("Soup")).data).toEqual([]);
    });

    test("throws on join error", async () => {
      queueFrom(
        supabase.from,
        { data: { id: "c1" }, error: null },
        { data: null, error: dbError }
      );
      await expect(getRecipesByCategory("Soup")).rejects.toThrow(
        "Error fetching recipes by category: boom"
      );
    });
  });
});
