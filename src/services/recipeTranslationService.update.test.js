import { describe, test, expect, beforeEach, vi } from "vitest";
import { mockChain, queueFrom } from "../test-utils/supabaseMock";

vi.mock("../lib/supabase", () => ({
  default: { from: vi.fn() },
}));

vi.mock("./translationCore", async (importOriginal) => ({
  ...(await importOriginal()),
  translateText: vi.fn(),
  translateTexts: vi.fn(),
  mergeTranslatedField: vi.fn(),
}));

import supabase from "../lib/supabase";
import {
  translateText,
  translateTexts,
  mergeTranslatedField,
} from "./translationCore";
import {
  getTranslatedRecipe,
  getTranslatedRecipeTitle,
  translateIngredientNames,
  updateRecipeTranslations,
  updateTranslationOnly,
} from "./recipeTranslationService";

// Tags text with the target language so translated output is recognisable
const tag = (text, lang) => `${text} [${lang}]`;

const recipe = {
  id: "r1",
  title: "Lentil soup",
  category: "Soup",
  notes: "Freezes well",
  source: "Grandma",
  instructions: ["Boil", "Serve!"],
  original_language: "en",
};

describe("recipeTranslationService (saving and editing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    translateText.mockImplementation(async (text, lang) => tag(text, lang));
    translateTexts.mockImplementation(async (texts, lang) =>
      texts.map((text) => (text ? tag(text, lang) : text))
    );
    mergeTranslatedField.mockResolvedValue();
  });

  describe("getTranslatedRecipe", () => {
    test("translates and saves recipe text", async () => {
      const result = await getTranslatedRecipe(recipe, "de");

      expect(result).toMatchObject({
        title: "Lentil soup [de]",
        category: "Soup [de]",
        notes: "Freezes well [de]",
        instructions: ["Boil [de].", "Serve! [de]."],
        isTranslated: true,
      });
      expect(mergeTranslatedField).toHaveBeenCalledWith(
        "recipes",
        "r1",
        "translated_recipe",
        "de",
        expect.any(Function)
      );
      const build = mergeTranslatedField.mock.calls[0][4];
      expect(build({ section_subheadings: ["x"], title: "old" })).toMatchObject(
        { title: "Lentil soup [de]", section_subheadings: ["x"] }
      );
    });

    test("marks a partial failure and doesn't save it", async () => {
      translateTexts.mockImplementation(
        async (texts, _lang, _src, onFailure) => {
          onFailure();
          return texts;
        }
      );
      const result = await getTranslatedRecipe(recipe, "de");
      expect(result.translationUnavailable).toBe(true);
      expect(mergeTranslatedField).not.toHaveBeenCalled();
    });

    test("returns the original text when translation throws", async () => {
      translateTexts.mockRejectedValue(new Error("down"));
      const result = await getTranslatedRecipe(recipe, "de");
      expect(result).toMatchObject({
        title: "Lentil soup",
        translationUnavailable: true,
      });
    });

    describe("ingredient notes", () => {
      const withNotes = (notes) => ({
        ...recipe,
        translated_recipe: {
          de: { title: "Linsensuppe", instructions: ["Kochen."] },
        },
        ungroupedIngredients: [
          {
            id: "i1",
            recipe_ingredient_id: "ri1",
            singular_name: "lentil",
            translated_names: { de: { singular_name: "Linse" } },
            notes,
          },
        ],
      });

      const notesRow = (translated_notes) =>
        supabase.from.mockReturnValue(
          mockChain({ data: { translated_notes }, error: null })
        );

      test("uses cached notes", async () => {
        notesRow({ de: "gewaschen" });
        const result = await getTranslatedRecipe(withNotes("washed"), "de");
        expect(result.ungroupedIngredients[0].notes).toBe("gewaschen");
        expect(translateText).not.toHaveBeenCalledWith(
          "washed",
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything()
        );
      });

      test("translates and caches new German notes as-is", async () => {
        notesRow(null);
        const result = await getTranslatedRecipe(withNotes("Washed"), "de");
        expect(result.ungroupedIngredients[0].notes).toBe("Washed [de]");
        expect(mergeTranslatedField).toHaveBeenCalledWith(
          "recipe_ingredients",
          "ri1",
          "translated_notes",
          "de",
          expect.any(Function)
        );
      });

      test("lowercases notes translated into English", async () => {
        notesRow(null);
        const german = {
          ...withNotes("Gewaschen"),
          original_language: "de",
          translated_recipe: { en: { title: "x", instructions: [] } },
          ungroupedIngredients: [
            {
              ...withNotes().ungroupedIngredients[0],
              translated_names: { en: { singular_name: "lentil" } },
              notes: "Gewaschen",
            },
          ],
        };
        const result = await getTranslatedRecipe(german, "en");
        expect(result.ungroupedIngredients[0].notes).toBe("gewaschen [en]");
      });

      test("doesn't cache notes when translation fails", async () => {
        notesRow(null);
        translateText.mockImplementation(
          async (text, _l, _c, _s, onFailure) => {
            onFailure?.();
            return text;
          }
        );
        const result = await getTranslatedRecipe(withNotes("washed"), "de");
        expect(result.ungroupedIngredients[0].notes).toBe("washed");
        expect(mergeTranslatedField).not.toHaveBeenCalledWith(
          "recipe_ingredients",
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything()
        );
      });

      test("keeps the original notes when the lookup fails", async () => {
        supabase.from.mockReturnValue(
          mockChain({ data: null, error: new Error("rls") })
        );
        const result = await getTranslatedRecipe(withNotes("washed"), "de");
        expect(result.ungroupedIngredients[0].notes).toBe("washed");
      });

      test("skips the lookup for empty notes", async () => {
        const result = await getTranslatedRecipe(withNotes("  "), "de");
        expect(result.ungroupedIngredients[0].notes).toBe("  ");
        expect(supabase.from).not.toHaveBeenCalled();
      });
    });
  });

  describe("getTranslatedRecipeTitle", () => {
    test("normalises instructions for the original language", async () => {
      const result = await getTranslatedRecipeTitle(recipe, "en");
      expect(result.instructions).toEqual(["Boil.", "Serve!"]);
    });

    test("keeps the casing of German titles", async () => {
      const result = await getTranslatedRecipeTitle(recipe, "de", {
        persist: false,
      });
      expect(result.title).toBe("Lentil soup [de]");
    });

    test("returns the recipe unchanged when translation fails", async () => {
      translateText.mockImplementationOnce(
        async (text, _l, _c, _s, onFailure) => {
          onFailure();
          return text;
        }
      );
      expect(await getTranslatedRecipeTitle(recipe, "de")).toBe(recipe);

      translateText.mockRejectedValueOnce(new Error("down"));
      expect(await getTranslatedRecipeTitle(recipe, "de")).toBe(recipe);
      expect(mergeTranslatedField).not.toHaveBeenCalled();
    });

    test("saves only the title, keeping other cached fields", async () => {
      await getTranslatedRecipeTitle(recipe, "de");
      const build = mergeTranslatedField.mock.calls[0][4];
      expect(build({ notes: "n" })).toEqual({
        notes: "n",
        title: "Lentil soup [de]",
      });
    });
  });

  describe("translateIngredientNames", () => {
    test("returns null without a source name", async () => {
      expect(await translateIngredientNames({ id: "i" }, "de")).toBeNull();
    });

    test("uses the singular when there's no plural or it didn't translate", async () => {
      translateText.mockResolvedValueOnce("salz");
      expect(
        await translateIngredientNames({ id: "i", singular_name: "salt" }, "de")
      ).toEqual({ singular_name: "Salz", plural_name: "Salz" });

      translateText
        .mockResolvedValueOnce("reis")
        .mockResolvedValueOnce("rices");
      expect(
        await translateIngredientNames(
          { id: "i", singular_name: "rice", plural_name: "rices" },
          "de"
        )
      ).toEqual({ singular_name: "Reis", plural_name: "Reis" });
    });

    test("still returns the names when saving fails", async () => {
      mergeTranslatedField.mockRejectedValue(new Error("rls"));
      translateText.mockResolvedValueOnce("salz");
      expect(
        await translateIngredientNames({ id: "i", singular_name: "salt" }, "de")
      ).toEqual({ singular_name: "Salz", plural_name: "Salz" });
      expect(console.warn).toHaveBeenCalled();
    });

    test("returns null when translation throws", async () => {
      translateText.mockRejectedValue(new Error("down"));
      expect(
        await translateIngredientNames({ id: "i", singular_name: "salt" }, "de")
      ).toBeNull();
    });
  });

  describe("updateRecipeTranslations", () => {
    const existing = {
      de: {
        title: "Linsensuppe",
        category: "Suppe",
        notes: "Gut einfrieren",
        source: "Oma",
        instructions: ["Kochen."],
        section_subheadings: ["Teig"],
      },
    };

    test("does nothing without existing translations", async () => {
      queueFrom(supabase.from, { data: { translated_recipe: null } });
      await updateRecipeTranslations("r1", recipe, recipe);
      expect(supabase.from).toHaveBeenCalledTimes(1);

      queueFrom(supabase.from, { data: null, error: new Error("x") });
      await updateRecipeTranslations("r1", recipe, recipe);
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    test("keeps unchanged fields and saved texts", async () => {
      const [, save] = queueFrom(
        supabase.from,
        { data: { translated_recipe: existing } },
        { error: null }
      );
      await updateRecipeTranslations("r1", recipe, recipe);
      expect(translateText).not.toHaveBeenCalled();
      expect(save.update).toHaveBeenCalledWith({ translated_recipe: existing });
    });

    test("retranslates every changed field", async () => {
      const [, save] = queueFrom(
        supabase.from,
        { data: { translated_recipe: existing } },
        { error: null }
      );
      await updateRecipeTranslations("r1", recipe, {
        title: "Pea soup",
        category: "Soups",
        notes: "Thick",
        source: "Me",
        instructions: ["Simmer"],
      });
      expect(save.update.mock.calls[0][0].translated_recipe.de).toEqual({
        title: "Pea soup [de]",
        category: "Soups [de]",
        notes: "Thick [de]",
        source: "Me [de]",
        instructions: ["Simmer [de]."],
        section_subheadings: ["Teig"],
      });
    });

    test("clears removed notes and source", async () => {
      const [, save] = queueFrom(
        supabase.from,
        { data: { translated_recipe: existing } },
        { error: null }
      );
      await updateRecipeTranslations("r1", recipe, {
        ...recipe,
        notes: "",
        source: null,
      });
      const saved = save.update.mock.calls[0][0].translated_recipe.de;
      expect(saved.notes).toBeNull();
      expect(saved.source).toBeNull();
    });

    test("swallows save errors", async () => {
      queueFrom(
        supabase.from,
        { data: { translated_recipe: existing } },
        { error: new Error("rls") }
      );
      await expect(
        updateRecipeTranslations("r1", recipe, recipe)
      ).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to update recipe translations:",
        expect.any(Error)
      );
    });
  });

  describe("updateTranslationOnly", () => {
    test("merges the edit into the language and returns it", async () => {
      const [, save] = queueFrom(
        supabase.from,
        { data: { translated_recipe: { de: { title: "A", notes: "N" } } } },
        { error: null }
      );
      expect(await updateTranslationOnly("r1", "de", { title: "B" })).toEqual({
        title: "B",
        notes: "N",
      });
      expect(save.update).toHaveBeenCalledWith({
        translated_recipe: { de: { title: "B", notes: "N" } },
      });
    });

    test("saves ingredient name overrides and notes", async () => {
      queueFrom(
        supabase.from,
        { data: { translated_recipe: null } },
        { error: null }
      );
      await updateTranslationOnly(
        "r1",
        "de",
        {},
        [{ recipe_ingredient_id: "ri1", name: "Linse", language: "de" }],
        [{ recipe_ingredient_id: "ri2", notes: "gewaschen", language: "de" }]
      );

      const calls = mergeTranslatedField.mock.calls;
      expect(calls[0].slice(0, 4)).toEqual([
        "recipe_ingredients",
        "ri1",
        "name_overrides",
        "de",
      ]);
      expect(calls[0][4]()).toBe("Linse");
      expect(calls[1].slice(0, 4)).toEqual([
        "recipe_ingredients",
        "ri2",
        "translated_notes",
        "de",
      ]);
      expect(calls[1][4]()).toBe("gewaschen");
    });

    test("throws on fetch or save errors", async () => {
      queueFrom(supabase.from, { data: null, error: { message: "gone" } });
      await expect(updateTranslationOnly("r1", "de", {})).rejects.toThrow(
        "Failed to fetch current translations: gone"
      );

      queueFrom(
        supabase.from,
        { data: { translated_recipe: {} } },
        { error: { message: "rls" } }
      );
      await expect(updateTranslationOnly("r1", "de", {})).rejects.toThrow(
        "Failed to update translation: rls"
      );
    });
  });
});
