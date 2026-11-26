import { describe, test, expect, beforeEach, vi } from "vitest";
import { queueFrom } from "../test-utils/supabaseMock";

vi.mock("../lib/supabase", () => ({
  default: { from: vi.fn() },
}));

vi.mock("./translationCore", async (importOriginal) => ({
  ...(await importOriginal()),
  translateText: vi.fn(),
  mergeTranslatedField: vi.fn(),
}));

vi.mock("./cookingTimesService", () => ({
  fetchUserCookingTimes: vi.fn(),
}));

import supabase from "../lib/supabase";
import { translateText, mergeTranslatedField } from "./translationCore";
import { fetchUserCookingTimes } from "./cookingTimesService";
import {
  getTranslatedCookingTime,
  getTranslatedCookingTimes,
  updateCookingTimeTranslations,
} from "./cookingTimesTranslationService";

const item = {
  id: 1,
  ingredient_name: "Linsen",
  notes: "Gut waschen",
  section_name: "Hülsenfrüchte",
  cooking_time: "ca. 20 Min",
  soaking_time: "2h",
  original_language: "de",
};

// Fake translator: tags text so we can see what was translated
const fakeTranslate = async (text, lang) => `${text} [${lang}]`;

describe("cookingTimesTranslationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    translateText.mockImplementation(fakeTranslate);
  });

  describe("getTranslatedCookingTime", () => {
    test("returns the item unchanged for its own language", async () => {
      expect(await getTranslatedCookingTime(item, "de")).toBe(item);
      expect(translateText).not.toHaveBeenCalled();
    });

    test("falls back to the given original language", async () => {
      const noLang = { ...item, original_language: undefined };
      expect(await getTranslatedCookingTime(noLang, "de", "de")).toBe(noLang);
    });

    test("uses the cached translation when present", async () => {
      const cached = {
        ...item,
        translated_cooking_time: {
          en: {
            ingredient_name: "lentils",
            notes: "wash",
            section_name: "Pulses",
          },
        },
      };
      const result = await getTranslatedCookingTime(cached, "en");
      expect(translateText).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ingredient_name: "lentils",
        cooking_time: "ca. 20 Min",
        isTranslated: true,
        translatedFrom: "de",
        untranslated: { ingredient_name: "Linsen" },
      });
    });

    test("translates, saves and returns a new translation", async () => {
      const result = await getTranslatedCookingTime(item, "en");

      expect(translateText).toHaveBeenCalledWith(
        "Linsen",
        "en",
        "Cooking ingredient"
      );
      expect(result).toMatchObject({
        ingredient_name: "linsen [en]",
        section_name: "hülsenfrüchte [en]",
        notes: "Gut waschen [en]",
        cooking_time: "ca. 20 Min [en]",
        soaking_time: "2h",
        isTranslated: true,
      });

      const [table, id, column, lang, build] =
        mergeTranslatedField.mock.calls[0];
      expect([table, id, column, lang]).toEqual([
        "user_cooking_times",
        1,
        "translated_cooking_time",
        "en",
      ]);
      expect(build().ingredient_name).toBe("linsen [en]");
    });

    test("skips empty fields and numeric times", async () => {
      const sparse = {
        id: 2,
        ingredient_name: "rice",
        cooking_time: "20",
        original_language: "en",
      };
      const result = await getTranslatedCookingTime(sparse, "de");
      expect(translateText).toHaveBeenCalledTimes(1);
      expect(result.notes).toBeNull();
      expect(result.section_name).toBeNull();
      expect(result.cooking_time).toBe("20");
    });

    test("returns the original when translation fails", async () => {
      translateText.mockRejectedValue(new Error("down"));
      expect(await getTranslatedCookingTime(item, "en")).toBe(item);
    });
  });

  describe("getTranslatedCookingTimes", () => {
    test("translates every item", async () => {
      fetchUserCookingTimes.mockResolvedValue([
        item,
        { ...item, id: 2, original_language: "en" },
      ]);
      const result = await getTranslatedCookingTimes("en");
      expect(result[0].isTranslated).toBe(true);
      expect(result[1].isTranslated).toBeUndefined();
    });
  });

  describe("updateCookingTimeTranslations", () => {
    const oldData = {
      ingredient_name: "Linsen",
      notes: "a",
      section_name: "S",
      cooking_time: "20",
      soaking_time: null,
    };

    test("logs and stops when the fetch fails", async () => {
      queueFrom(supabase.from, { data: null, error: { message: "x" } });
      await updateCookingTimeTranslations(1, oldData, oldData);
      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalled();
    });

    test("creates the opposite-language translation when none exist", async () => {
      const [, save] = queueFrom(
        supabase.from,
        {
          data: { translated_cooking_time: null, original_language: null },
          error: null,
        },
        { error: null }
      );
      await updateCookingTimeTranslations(1, oldData, {
        ...oldData,
        notes: null,
        section_name: null,
      });
      const saved = save.update.mock.calls[0][0].translated_cooking_time;
      expect(Object.keys(saved)).toEqual(["de"]);
      expect(saved.de).toMatchObject({
        ingredient_name: "Linsen [de]",
        notes: null,
        section_name: null,
        cooking_time: "20",
      });
    });

    test("only retranslates fields that changed", async () => {
      const existing = {
        en: {
          ingredient_name: "lentils",
          notes: "wash",
          section_name: "pulses",
          cooking_time: "20",
        },
      };
      const [, save] = queueFrom(
        supabase.from,
        {
          data: { translated_cooking_time: existing, original_language: "de" },
          error: null,
        },
        { error: null }
      );
      await updateCookingTimeTranslations(1, oldData, {
        ...oldData,
        cooking_time: "etwa 25",
        soaking_time: "1h",
      });

      expect(translateText).toHaveBeenCalledTimes(1);
      expect(save.update.mock.calls[0][0].translated_cooking_time.en).toEqual({
        ingredient_name: "lentils",
        notes: "wash",
        section_name: "pulses",
        cooking_time: "etwa 25 [en]",
        soaking_time: "1h",
      });
    });

    test("retranslates changed name, notes and section", async () => {
      const existing = {
        en: {
          ingredient_name: "lentils",
          notes: "wash",
          section_name: "pulses",
          cooking_time: "20",
        },
      };
      const [, save] = queueFrom(
        supabase.from,
        {
          data: { translated_cooking_time: existing, original_language: "de" },
          error: null,
        },
        { error: null }
      );
      await updateCookingTimeTranslations(1, oldData, {
        ...oldData,
        ingredient_name: "Bohnen",
        notes: "b",
        section_name: "T",
      });
      expect(
        save.update.mock.calls[0][0].translated_cooking_time.en
      ).toMatchObject({
        ingredient_name: "bohnen [en]",
        notes: "b [en]",
        section_name: "t [en]",
      });
    });

    test("swallows save errors", async () => {
      queueFrom(
        supabase.from,
        {
          data: { translated_cooking_time: {}, original_language: "en" },
          error: null,
        },
        { error: new Error("save failed") }
      );
      await expect(
        updateCookingTimeTranslations(1, oldData, oldData)
      ).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledWith(
        "Failed to update cooking time translations:",
        expect.any(Error)
      );
    });
  });
});
