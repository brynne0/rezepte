import { describe, test, expect, beforeEach, vi } from "vitest";
import { queueFrom } from "../test-utils/supabaseMock";

// Tiny fake dictionary; unknown words come back unchanged (as on failure)
const dictionary = {
  zwiebeln: "onions",
  zwiebel: "onion",
  tomate: "tomato",
  pomme: "apple",
  "onion:de": "Zwiebel",
  "onions:de": "Zwiebeln",
  "tomatoes:de": "Tomaten",
  "suppe:en": "Soup",
  "soup:de": "Suppe",
};
const lookup = (text, lang) =>
  dictionary[`${text.toLowerCase()}:${lang}`] ??
  (lang === "en" ? dictionary[text.toLowerCase()] : undefined) ??
  text;

vi.mock("./recipeTranslationService", () => ({
  updateRecipeTranslations: vi.fn(),
  translateText: vi.fn(),
}));

vi.mock("./translationCore", () => ({
  translateTexts: vi.fn(),
}));

vi.mock("./imageService", () => ({
  uploadLocalImages: vi.fn(),
  cleanupOrphanedImages: vi.fn(),
  deleteRecipeImageFolder: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import supabase from "../lib/supabase";
import { translateText } from "./recipeTranslationService";
import { translateTexts } from "./translationCore";
import { uploadLocalImages, cleanupOrphanedImages } from "./imageService";
import {
  createRecipe,
  updateRecipe,
  copyRecipeFromFriend,
  fetchSharedRecipe,
} from "./recipes";

const ok = (data = null) => ({ data, error: null });

// rpc responses keyed by function: values are consumed in order
const queueRpc = (...results) => {
  for (const result of results) supabase.rpc.mockResolvedValueOnce(result);
};

// createRecipe in German with one named ingredient
const createGerman = (name, extra = {}) =>
  createRecipe({
    title: "Eintopf",
    original_language: "de",
    ungroupedIngredients: [{ name, tempId: "t1" }],
    ...extra,
  });

describe("recipes save flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    supabase.rpc.mockResolvedValue(ok(null));
    translateText.mockImplementation(async (text, lang) => lookup(text, lang));
    translateTexts.mockImplementation(async (texts, lang) =>
      texts.map((text) => lookup(text, lang))
    );
  });

  describe("German ingredients", () => {
    test("reuses an ingredient already cached in German", async () => {
      queueRpc(ok("i1"));
      const [, rows] = queueFrom(supabase.from, ok({ id: "r1" }), ok());

      await createGerman("Zwiebeln");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "match_ingredient_by_translation",
        { p_language: "de", p_search_name: "zwiebeln" }
      );
      expect(rows.insert).toHaveBeenCalledWith([
        expect.objectContaining({ ingredient_id: "i1", is_plural: true }),
      ]);
    });

    test("matches via the English translation and caches the German names", async () => {
      queueRpc(ok(null), ok(null), ok("i2"));
      const [, fetchIng, updateIng, rows] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({
          singular_name: "onion",
          plural_name: "onions",
          translated_names: { fr: { singular_name: "oignon" } },
        }),
        ok(),
        ok()
      );

      await createGerman("Zwiebeln");

      expect(supabase.rpc).toHaveBeenLastCalledWith(
        "match_ingredient_by_english",
        { p_candidates: ["onion", "onions"] }
      );
      expect(fetchIng.eq).toHaveBeenCalledWith("id", "i2");
      expect(updateIng.update).toHaveBeenCalledWith({
        translated_names: {
          fr: { singular_name: "oignon" },
          de: { singular_name: "Zwiebel", plural_name: "Zwiebeln" },
        },
      });
      expect(rows.insert.mock.calls[0][0][0].ingredient_id).toBe("i2");
    });

    test("caches the user's input when translating the match fails", async () => {
      queueRpc(ok(null), ok("i2"));
      const [, , updateIng] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({
          singular_name: "leek",
          plural_name: null,
          translated_names: null,
        }),
        ok(),
        ok()
      );

      await createGerman("Lauch");

      expect(updateIng.update).toHaveBeenCalledWith({
        translated_names: {
          de: { singular_name: "lauch", plural_name: "lauch" },
        },
      });
    });

    test("fails the save when caching the translation fails", async () => {
      queueRpc(ok(null), ok("i2"));
      queueFrom(supabase.from, ok({ id: "r1" }), {
        data: null,
        error: new Error("gone"),
      });
      await expect(createGerman("Lauch")).rejects.toThrow(
        "Failed to add translation to ingredient: gone"
      );

      queueRpc(ok(null), ok("i2"));
      queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ singular_name: "leek", plural_name: "leeks" }),
        { error: { message: "rls" } }
      );
      await expect(createGerman("Lauch")).rejects.toThrow(
        "Failed to update ingredient translations: rls"
      );
    });

    test("falls back to an English-name search for English typed in German mode", async () => {
      // translation, english(input), english(translation), then en search
      queueRpc(ok(null), ok(null), ok(null), ok("i3"));
      const [, , updateIng] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ singular_name: "onion", plural_name: "onions" }),
        ok(),
        ok()
      );

      await createGerman("Zwiebeln");
      expect(supabase.rpc).toHaveBeenCalledTimes(4);
      expect(updateIng.update).toHaveBeenCalled();
    });

    test("creates a plural ingredient with a back-translated singular", async () => {
      const [, ingredient, rows] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ id: "new" }),
        ok()
      );

      await createGerman("Zwiebeln");

      expect(ingredient.insert).toHaveBeenCalledWith([
        {
          singular_name: "onion",
          plural_name: "onions",
          translated_names: {
            de: { singular_name: "Zwiebel", plural_name: "Zwiebeln" },
          },
        },
      ]);
      expect(rows.insert.mock.calls[0][0][0]).toMatchObject({
        ingredient_id: "new",
        is_plural: true,
      });
    });

    test("creates a singular ingredient with a back-translated plural", async () => {
      const [, ingredient, rows] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ id: "new" }),
        ok()
      );

      await createGerman("Tomate");

      expect(ingredient.insert.mock.calls[0][0][0]).toEqual({
        singular_name: "tomato",
        plural_name: "tomatoes",
        translated_names: {
          de: { singular_name: "Tomate", plural_name: "Tomaten" },
        },
      });
      expect(rows.insert.mock.calls[0][0][0].is_plural).toBe(false);
    });

    test("uses the input as singular when back-translation fails", async () => {
      translateText.mockImplementation(async (text) => text);
      const [, ingredient] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ id: "new" }),
        ok()
      );

      await createGerman("Zwiebeln");
      expect(ingredient.insert.mock.calls[0][0][0].translated_names.de).toEqual(
        { singular_name: "Zwiebeln", plural_name: "Zwiebeln" }
      );
    });

    test.each([
      ["Tomate", "de", "Tomaten"],
      ["Paprika", "de", "Paprikae"],
      ["pomme", "fr", "pommes"],
    ])(
      "guesses the plural of %s (%s) when back-translation fails",
      async (name, language, expectedPlural) => {
        translateText.mockImplementation(async (text) => text);
        const [, ingredient] = queueFrom(
          supabase.from,
          ok({ id: "r1" }),
          ok({ id: "new" }),
          ok()
        );

        await createRecipe({
          title: "x",
          original_language: language,
          ungroupedIngredients: [{ name, tempId: "t1" }],
        });

        expect(
          ingredient.insert.mock.calls[0][0][0].translated_names[language]
        ).toEqual({ singular_name: name, plural_name: expectedPlural });
      }
    );

    test.each([
      ["de", "Tomaten"],
      ["fr", "Tomates"],
    ])(
      "falls back to the input as English when translation throws (%s)",
      async (language, expectedPlural) => {
        translateText.mockRejectedValue(new Error("down"));
        const [, ingredient] = queueFrom(
          supabase.from,
          ok({ id: "r1" }),
          ok({ id: "new" }),
          ok()
        );

        await createRecipe({
          title: "x",
          original_language: language,
          ungroupedIngredients: [{ name: "Tomate", tempId: "t1" }],
        });

        expect(ingredient.insert.mock.calls[0][0][0]).toEqual({
          singular_name: "tomate",
          plural_name: "tomates",
          translated_names: {
            [language]: {
              singular_name: "Tomate",
              plural_name: expectedPlural,
            },
          },
        });
      }
    );

    test("translates on demand when no batch translation is available", async () => {
      translateTexts.mockResolvedValue([]);
      queueFrom(supabase.from, ok({ id: "r1" }), ok({ id: "new" }), ok());

      await createGerman("Zwiebeln");
      expect(translateText).toHaveBeenCalledWith("Zwiebeln", "en", null, "de");
    });

    test("throws when creating the ingredient fails", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }), {
        data: null,
        error: { message: "dup" },
      });
      await expect(createGerman("Tomate")).rejects.toThrow(
        "Error creating ingredient: dup"
      );
    });

    test.each([
      ["the German cache lookup", [{ error: { message: "x" } }]],
      ["the English lookup", [ok(null), { error: { message: "x" } }]],
    ])("throws when %s fails", async (_label, results) => {
      queueRpc(...results);
      queueFrom(supabase.from, ok({ id: "r1" }));
      await expect(createGerman("Tomate")).rejects.toThrow(
        "Error looking up ingredients: x"
      );
    });

    test("throws when the English-mode lookup fails", async () => {
      queueRpc({ error: { message: "x" } });
      queueFrom(supabase.from, ok({ id: "r1" }));
      await expect(
        createRecipe({
          title: "x",
          original_language: "en",
          ungroupedIngredients: [{ name: "tofu", tempId: "t1" }],
        })
      ).rejects.toThrow("Error looking up ingredients: x");
    });

    test("rejects an ingredient with neither id nor name", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }));
      await expect(
        createRecipe({
          title: "x",
          original_language: "en",
          ungroupedIngredients: [{ tempId: "t1" }],
        })
      ).rejects.toThrow("Ingredient must have either ingredient_id or name");
    });

    test("keeps section subheadings, order and recipe links", async () => {
      const [, rows] = queueFrom(supabase.from, ok({ id: "r1" }), ok());

      await createRecipe({
        title: "x",
        original_language: "en",
        ungroupedIngredients: [],
        ingredientSections: [
          {
            id: "s1",
            subheading: "Sauce",
            ingredients: [{ ingredient_id: "i1", tempId: "a" }],
          },
          { id: "s2", ingredients: [{ ingredient_id: "i2", tempId: "b" }] },
        ],
        ingredientLinks: { "s1-a": { id: "linked" } },
      });

      expect(rows.insert.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          subheading: "Sauce",
          order_index: 0,
          linked_recipe_id: "linked",
        }),
        expect.objectContaining({
          subheading: null,
          order_index: 1,
          linked_recipe_id: null,
        }),
      ]);
    });
  });

  describe("categories on create", () => {
    test("links an existing category and skips all_recipes", async () => {
      const [, find, link, insert] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ id: "c1" }),
        ok({ id: "c1" }),
        { error: null }
      );

      await createRecipe({
        title: "x",
        categories: ["100%_Soup", "all_recipes", ""],
      });

      expect(find.ilike).toHaveBeenCalledWith("name", "100\\%\\_Soup");
      expect(link.ilike).toHaveBeenCalled();
      expect(insert.insert).toHaveBeenCalledWith({
        recipe_id: "r1",
        categoriy_id: "c1",
      });
      expect(supabase.from).toHaveBeenCalledTimes(4);
    });

    test.each([
      ["de", "Suppe", { en: "Soup" }],
      ["en", "Soup", { de: "Suppe" }],
    ])(
      "creates a missing %s category with its translation",
      async (language, name, translated) => {
        const [, , create] = queueFrom(
          supabase.from,
          ok({ id: "r1" }),
          ok(null),
          ok({ id: "c2" }),
          ok({ id: "c2" }),
          { error: null }
        );

        await createRecipe({
          title: "x",
          original_language: language,
          categories: [name],
        });

        expect(create.insert).toHaveBeenCalledWith({
          name,
          user_id: "u1",
          original_language: language,
          translated_category: translated,
        });
      }
    );

    test("stores no translation when translating fails", async () => {
      translateText.mockRejectedValueOnce(new Error("down"));
      const [, , create] = queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok(null),
        ok({ id: "c2" }),
        ok({ id: "c2" }),
        { error: null }
      );

      await createRecipe({ title: "x", categories: ["Brot"] });
      expect(create.insert.mock.calls[0][0].translated_category).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    test("skips linking when the category can't be created", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }), ok(null), {
        data: null,
        error: { message: "rls" },
      });

      await createRecipe({ title: "x", categories: ["Brot"] });
      expect(supabase.from).toHaveBeenCalledTimes(3);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to create category:",
        expect.anything()
      );
    });

    test("survives an unexpected error while resolving a category", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }));
      supabase.auth.getUser
        .mockResolvedValueOnce({ data: { user: { id: "u1" } } })
        .mockRejectedValueOnce(new Error("network"));

      await expect(
        createRecipe({ title: "x", categories: ["Brot"] })
      ).resolves.toEqual({ id: "r1" });
    });

    test.each([
      [{ message: "duplicate key" }, false],
      [{ message: "x", code: "23505" }, false],
      [{ message: "rls" }, true],
    ])("link error %o warns: %s", async (error, warns) => {
      queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok({ id: "c1" }),
        ok({ id: "c1" }),
        { error }
      );

      await createRecipe({ title: "x", categories: ["Soup"] });
      expect(console.warn).toHaveBeenCalledTimes(warns ? 1 : 0);
    });

    test("does nothing when the category disappears before linking", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }), ok({ id: "c1" }), ok(null));
      await createRecipe({ title: "x", categories: ["Soup"] });
      expect(supabase.from).toHaveBeenCalledTimes(3);
    });

    test("warns when linking throws", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }), ok({ id: "c1" }));
      supabase.auth.getUser
        .mockResolvedValueOnce({ data: { user: { id: "u1" } } })
        .mockResolvedValueOnce({ data: { user: { id: "u1" } } })
        .mockRejectedValueOnce(new Error("network"));

      await createRecipe({ title: "x", categories: ["Soup"] });
      expect(console.warn).toHaveBeenCalledWith(
        "Failed to add recipe to category:",
        expect.any(Error)
      );
    });
  });

  describe("progress reporting", () => {
    test("counts recipe, ingredients, categories and images", async () => {
      queueFrom(
        supabase.from,
        ok({ id: "r1" }),
        ok(),
        ok({ id: "c1" }),
        ok({ id: "c1" }),
        { error: null },
        ok()
      );
      uploadLocalImages.mockImplementation(async (images, _u, _r, cb) => {
        cb({ current: 1, imageId: "img", uploading: false });
        return images;
      });
      const onProgress = vi.fn();

      await createRecipe(
        {
          title: "x",
          original_language: "en",
          ungroupedIngredients: [{ ingredient_id: "i1", tempId: "a" }],
          ingredientSections: [
            { id: "s", ingredients: [{ ingredient_id: "i2", tempId: "b" }] },
          ],
          categories: ["Soup", "all_recipes"],
          images: [{ id: "img", isLocal: true, file: {} }],
        },
        onProgress
      );

      const phases = onProgress.mock.calls.map(([p]) => [
        p.phase,
        p.completed,
        p.total,
      ]);
      expect(phases).toEqual([
        ["recipe", 0, 5],
        ["recipe", 1, 5],
        ["ingredients", 2, 5],
        ["ingredients", 3, 5],
        ["categories", 4, 5],
        ["images", 5, 5],
      ]);
      expect(onProgress).toHaveBeenLastCalledWith(
        expect.objectContaining({ imageId: "img", phaseTotal: 1 })
      );
    });

    test("passes no image callback without onProgress", async () => {
      queueFrom(supabase.from, ok({ id: "r1" }), ok());
      uploadLocalImages.mockResolvedValue([]);
      await createRecipe({ title: "x", images: [{ id: "a" }] });
      expect(uploadLocalImages.mock.calls[0][3]).toBeNull();
    });

    test("keeps the recipe when image upload throws", async () => {
      queueFrom(supabase.from, ok({ id: "r1", images: [] }));
      uploadLocalImages.mockRejectedValue(new Error("quota"));
      const result = await createRecipe({ title: "x", images: [{ id: "a" }] });
      expect(result.id).toBe("r1");
      expect(console.error).toHaveBeenCalledWith("Failed to process images");
    });
  });

  describe("updateRecipe branches", () => {
    const original = ok({ title: "Old", images: [{ id: "old" }] });

    test("throws when the original recipe can't be fetched", async () => {
      queueFrom(supabase.from, { data: null, error: { message: "gone" } });
      await expect(updateRecipe("r1", {})).rejects.toThrow(
        "Failed to fetch original recipe: gone"
      );
    });

    test("throws when deleting old ingredients fails", async () => {
      queueFrom(supabase.from, original, ok({ id: "r1" }), {
        error: { message: "rls" },
      });
      await expect(
        updateRecipe("r1", { ungroupedIngredients: [] })
      ).rejects.toThrow("Failed to delete existing ingredients: rls");
    });

    test("replaces categories, clearing them when empty", async () => {
      const [, , del] = queueFrom(
        supabase.from,
        original,
        ok({ id: "r1" }),
        ok()
      );
      await updateRecipe("r1", { categories: [] });
      expect(del.delete).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledTimes(3);

      queueFrom(
        supabase.from,
        original,
        ok({ id: "r1", original_language: "de" }),
        ok(),
        ok({ id: "c1" }),
        ok({ id: "c1" }),
        { error: null }
      );
      await updateRecipe("r1", { categories: ["Suppe"] });
      expect(supabase.from).toHaveBeenCalledTimes(9);
    });

    test("cleans up removed images and clears the field", async () => {
      const [, , clear] = queueFrom(
        supabase.from,
        original,
        ok({ id: "r1" }),
        ok()
      );
      const result = await updateRecipe("r1", { images: [] });
      expect(cleanupOrphanedImages).toHaveBeenCalledWith([{ id: "old" }], []);
      expect(clear.update).toHaveBeenCalledWith({ images: [] });
      expect(result.images).toEqual([]);
    });

    test("flags a failed clear", async () => {
      queueFrom(supabase.from, ok({ images: null }), ok({ id: "r1" }), {
        error: { message: "x" },
      });
      const result = await updateRecipe("r1", { images: [] });
      expect(cleanupOrphanedImages).not.toHaveBeenCalled();
      expect(result.imageUpdateFailed).toBe(true);
    });

    test("saves uploaded images, flagging a failed save", async () => {
      uploadLocalImages.mockResolvedValue([{ id: "new" }]);
      queueFrom(supabase.from, original, ok({ id: "r1" }), ok());
      expect((await updateRecipe("r1", { images: [{}] })).images).toEqual([
        { id: "new" },
      ]);

      queueFrom(supabase.from, original, ok({ id: "r1" }), {
        error: { message: "x" },
      });
      expect(
        (await updateRecipe("r1", { images: [{}] })).imageUpdateFailed
      ).toBe(true);
    });

    test("flags an image upload exception", async () => {
      uploadLocalImages.mockRejectedValue(new Error("quota"));
      queueFrom(supabase.from, original, ok({ id: "r1" }));
      expect(
        (await updateRecipe("r1", { images: [{}] })).imageUpdateFailed
      ).toBe(true);
    });
  });

  describe("shared recipes", () => {
    const sharedRow = {
      id: "r9",
      user_id: "stranger",
      title: "Brot",
      original_language: "de",
      recipe_ingredients: [
        {
          id: "ri2",
          order_index: 1,
          subheading: "Teig",
          ingredients: { id: "i2" },
        },
        {
          id: "ri1",
          order_index: 0,
          subheading: "  ",
          ingredients: { id: "i1" },
        },
        { id: "ri3", subheading: "Teig", ingredients: { id: "i3" } },
      ],
      recipe_categories: [
        { categories: { name: "Brot" } },
        { categories: null },
      ],
    };

    test("fetchSharedRecipe shapes the row and throws when missing", async () => {
      supabase.rpc.mockResolvedValueOnce(ok(structuredClone(sharedRow)));
      const recipe = await fetchSharedRecipe("tok");
      expect(supabase.rpc).toHaveBeenCalledWith("get_shared_recipe", {
        p_token: "tok",
      });
      expect(recipe.ungroupedIngredients.map((i) => i.id)).toEqual(["i1"]);
      expect(recipe.ingredientSections).toEqual([
        expect.objectContaining({ subheading: "Teig" }),
      ]);
      expect(recipe.categories).toEqual(["Brot"]);

      supabase.rpc.mockResolvedValueOnce(ok(null));
      await expect(fetchSharedRecipe("tok")).rejects.toThrow(
        "SHARED_RECIPE_NOT_FOUND"
      );

      const err = new Error("rpc");
      supabase.rpc.mockResolvedValueOnce({ data: null, error: err });
      await expect(fetchSharedRecipe("tok")).rejects.toBe(err);
    });

    test("copies a link-shared recipe with its sections", async () => {
      supabase.rpc.mockResolvedValueOnce(ok(structuredClone(sharedRow)));
      const [insert, rows] = queueFrom(supabase.from, ok({ id: "copy" }), ok());

      await copyRecipeFromFriend("r9", { shareToken: "tok" });

      expect(insert.insert.mock.calls[0][0][0].copied_from_name).toBeNull();
      expect(rows.insert.mock.calls[0][0].map((r) => r.subheading)).toEqual([
        null,
        "Teig",
        "Teig",
      ]);
    });

    test("throws when copying fails", async () => {
      supabase.rpc.mockResolvedValue(ok(structuredClone(sharedRow)));
      queueFrom(supabase.from, { data: null, error: { message: "rls" } });
      await expect(
        copyRecipeFromFriend("r9", { shareToken: "tok" })
      ).rejects.toThrow("rls");

      queueFrom(supabase.from, ok({ id: "copy" }), {
        error: { message: "fk" },
      });
      await expect(
        copyRecipeFromFriend("r9", { shareToken: "tok" })
      ).rejects.toThrow("Recipe copied but failed to add ingredients: fk");
    });
  });
});
