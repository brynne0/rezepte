import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditCookingTimes } from "./useEditCookingTimes";
import {
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
} from "../../../services/cookingTimesService";
import { updateCookingTimeTranslations } from "../../../services/cookingTimesTranslationService";
import { createQueryClientWrapper } from "../../../test-utils/queryClient";

vi.mock("../../../services/cookingTimesService", () => ({
  createCookingTime: vi.fn(),
  updateCookingTime: vi.fn(),
  deleteCookingTime: vi.fn(),
}));

vi.mock("../../../services/cookingTimesTranslationService", () => ({
  updateCookingTimeTranslations: vi.fn(),
}));

vi.mock("../../../hooks/ui/useUnsavedChanges", () => ({
  useUnsavedChanges: vi.fn(() => ({
    isModalOpen: false,
    confirmNavigation: vi.fn(),
    cancelNavigation: vi.fn(),
    message: "",
  })),
}));

const cookingTime = (name, overrides = {}) => ({
  tempId: `t-${name}`,
  ingredient_name: name,
  cooking_time: "",
  soaking_time: "",
  dry_weight: "",
  cooked_weight: "",
  notes: "",
  ...overrides,
});

const setup = (formDataOverrides = {}) => {
  let formData = {
    ungroupedCookingTimes: [cookingTime("Tofu")],
    cookingTimeSections: [
      {
        id: "s1",
        subheading: "Legumes",
        cookingTimes: [cookingTime("Lentils")],
      },
    ],
    ...formDataOverrides,
  };
  const setFormData = vi.fn((updater) => {
    formData = typeof updater === "function" ? updater(formData) : updater;
  });
  const originalData = JSON.parse(JSON.stringify(formData));
  const generateTempId = vi.fn(() => "new-temp-id");
  const loadData = vi.fn().mockResolvedValue();
  const t = (key) => key;

  const { result, rerender } = renderHook(
    () =>
      useEditCookingTimes({
        isEditMode: true,
        formData,
        setFormData,
        originalData,
        generateTempId,
        loadData,
        t,
      }),
    { wrapper: createQueryClientWrapper() }
  );

  return {
    result,
    rerender,
    getFormData: () => formData,
    setFormData,
    loadData,
  };
};

describe("useEditCookingTimes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("addCookingTime appends a new item to the ungrouped list", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addCookingTime("ungrouped");
    });
    rerender();

    expect(getFormData().ungroupedCookingTimes).toHaveLength(2);
    expect(getFormData().ungroupedCookingTimes[1].tempId).toBe("new-temp-id");
  });

  test("addCookingTime appends a new item to a section", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addCookingTime("s1");
    });
    rerender();

    expect(getFormData().cookingTimeSections[0].cookingTimes).toHaveLength(2);
  });

  test("addSection appends a new section with one empty item", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addSection();
    });
    rerender();

    expect(getFormData().cookingTimeSections).toHaveLength(2);
    expect(getFormData().cookingTimeSections[1].cookingTimes).toHaveLength(1);
  });

  test("removeSection moves its items to ungrouped when it has any", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.removeSection("s1");
    });
    rerender();

    expect(getFormData().cookingTimeSections).toEqual([]);
    expect(getFormData().ungroupedCookingTimes).toHaveLength(2);
    expect(
      getFormData().ungroupedCookingTimes.some((i) => i.tempId === "t-Lentils")
    ).toBe(true);
  });

  test("removeSection just removes an empty section", () => {
    const { result, getFormData, rerender } = setup({
      cookingTimeSections: [
        { id: "s1", subheading: "Empty", cookingTimes: [] },
      ],
    });

    act(() => {
      result.current.removeSection("s1");
    });
    rerender();

    expect(getFormData().cookingTimeSections).toEqual([]);
    expect(getFormData().ungroupedCookingTimes).toHaveLength(1);
  });

  test("handleCookingTimeChange updates an ungrouped item's field", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.handleCookingTimeChange(
        "ungrouped",
        "t-Tofu",
        "cooking_time",
        "15 min"
      );
    });
    rerender();

    expect(getFormData().ungroupedCookingTimes[0].cooking_time).toBe("15 min");
  });

  test("handleSectionChange updates the section subheading", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.handleSectionChange("s1", "subheading", "Beans");
    });
    rerender();

    expect(getFormData().cookingTimeSections[0].subheading).toBe("Beans");
  });

  test("removeCookingTime removes an item from a section", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.removeCookingTime("s1", "t-Lentils");
    });
    rerender();

    expect(getFormData().cookingTimeSections[0].cookingTimes).toEqual([]);
  });

  describe("saveAllChanges", () => {
    test("creates new items that have a name", async () => {
      const { result } = setup({
        ungroupedCookingTimes: [
          { tempId: "t1", ingredient_name: "Tofu", cooking_time: "10 min" },
        ],
        cookingTimeSections: [],
      });

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(createCookingTime).toHaveBeenCalledWith(
        expect.objectContaining({ ingredient_name: "Tofu" }),
        null,
        0,
        "en"
      );
    });

    test("skips items with a blank name", async () => {
      const { result } = setup({
        ungroupedCookingTimes: [{ tempId: "t1", ingredient_name: "   " }],
        cookingTimeSections: [],
      });

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(createCookingTime).not.toHaveBeenCalled();
    });

    test("deletes items that were removed from the original data", async () => {
      const originalData = {
        ungroupedCookingTimes: [
          { id: "orig-1", tempId: "t1", ingredient_name: "Tofu" },
        ],
        cookingTimeSections: [],
      };
      const formData = { ungroupedCookingTimes: [], cookingTimeSections: [] };
      const setFormData = vi.fn();

      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: true,
            formData,
            setFormData,
            originalData,
            generateTempId: vi.fn(),
            loadData: vi.fn().mockResolvedValue(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(deleteCookingTime).toHaveBeenCalledWith("orig-1");
    });

    test("updates an existing item only when a field actually changed", async () => {
      const originalItem = {
        id: "orig-1",
        tempId: "t1",
        ingredient_name: "Tofu",
        cooking_time: "10 min",
        section_name: null,
        order_index: 0,
      };
      const originalData = {
        ungroupedCookingTimes: [originalItem],
        cookingTimeSections: [],
      };
      const formData = {
        ungroupedCookingTimes: [{ ...originalItem, cooking_time: "15 min" }],
        cookingTimeSections: [],
      };

      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: true,
            formData,
            setFormData: vi.fn(),
            originalData,
            generateTempId: vi.fn(),
            loadData: vi.fn().mockResolvedValue(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(updateCookingTime).toHaveBeenCalledWith(
        "orig-1",
        expect.objectContaining({ cooking_time: "15 min" })
      );
    });

    test("updates translations when a translatable field changes", async () => {
      const originalItem = {
        id: "orig-1",
        tempId: "t1",
        ingredient_name: "Tofu",
        cooking_time: "10 min",
        section_name: null,
        order_index: 0,
      };
      const originalData = {
        ungroupedCookingTimes: [originalItem],
        cookingTimeSections: [],
      };
      const formData = {
        ungroupedCookingTimes: [{ ...originalItem, ingredient_name: "Tempeh" }],
        cookingTimeSections: [],
      };

      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: true,
            formData,
            setFormData: vi.fn(),
            originalData,
            generateTempId: vi.fn(),
            loadData: vi.fn().mockResolvedValue(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(updateCookingTimeTranslations).toHaveBeenCalledWith(
        "orig-1",
        originalItem,
        expect.objectContaining({ ingredient_name: "Tempeh" })
      );
    });

    describe("items written in another language", () => {
      // Shown in English (the user's language), stored with a German original
      const germanUntranslated = {
        ingredient_name: "Linsen",
        notes: null,
        section_name: null,
        cooking_time: "20 Min.",
        soaking_time: null,
      };
      const germanItem = {
        id: "de-1",
        tempId: "t-de",
        ingredient_name: "Lentils",
        cooking_time: "20 min",
        section_name: null,
        order_index: 0,
        original_language: "de",
        untranslated: germanUntranslated,
      };

      const saveWith = async (originalItem, editedItem) => {
        const { result } = renderHook(
          () =>
            useEditCookingTimes({
              isEditMode: true,
              formData: {
                ungroupedCookingTimes: [editedItem],
                cookingTimeSections: [],
              },
              setFormData: vi.fn(),
              originalData: {
                ungroupedCookingTimes: [originalItem],
                cookingTimeSections: [],
              },
              generateTempId: vi.fn(),
              loadData: vi.fn().mockResolvedValue(),
              t: (k) => k,
            }),
          { wrapper: createQueryClientWrapper() }
        );
        await act(async () => {
          await result.current.saveAllChanges();
        });
      };

      test("makes the edit the new original and keeps the old one as a translation", async () => {
        await saveWith(germanItem, { ...germanItem, notes: "Rinse first" });

        expect(updateCookingTime).toHaveBeenCalledWith(
          "de-1",
          expect.objectContaining({
            ingredient_name: "Lentils",
            notes: "Rinse first",
            original_language: "en",
            translated_cooking_time: { de: germanUntranslated },
          })
        );
        // Only the changed note needs translating back into German
        expect(updateCookingTimeTranslations).toHaveBeenCalledWith(
          "de-1",
          germanItem,
          expect.objectContaining({ notes: "Rinse first" })
        );
      });

      test("keeps the German wording when the item is only reordered", async () => {
        // Saving renumbers positions, so a stored index of 3 becomes 0
        const movedItem = { ...germanItem, order_index: 3 };
        await saveWith(movedItem, movedItem);

        expect(updateCookingTime).toHaveBeenCalledWith(
          "de-1",
          expect.objectContaining({
            original_language: "en",
            translated_cooking_time: { de: germanUntranslated },
          })
        );
        expect(updateCookingTimeTranslations).not.toHaveBeenCalled();
      });

      test("leaves the language alone for an item already in the user's language", async () => {
        const englishItem = {
          ...germanItem,
          original_language: "en",
          untranslated: undefined,
        };
        await saveWith(englishItem, { ...englishItem, notes: "Rinse first" });

        const [, data] = updateCookingTime.mock.calls[0];
        expect(data).not.toHaveProperty("original_language");
        expect(data).not.toHaveProperty("translated_cooking_time");
      });
    });

    test("does not update translations when only a non-translatable field changes", async () => {
      const originalItem = {
        id: "orig-1",
        tempId: "t1",
        ingredient_name: "Tofu",
        cooking_time: "10 min",
        dry_weight: "100",
        section_name: null,
        order_index: 0,
      };
      const originalData = {
        ungroupedCookingTimes: [originalItem],
        cookingTimeSections: [],
      };
      const formData = {
        ungroupedCookingTimes: [{ ...originalItem, dry_weight: "150" }],
        cookingTimeSections: [],
      };

      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: true,
            formData,
            setFormData: vi.fn(),
            originalData,
            generateTempId: vi.fn(),
            loadData: vi.fn().mockResolvedValue(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(updateCookingTime).toHaveBeenCalled();
      expect(updateCookingTimeTranslations).not.toHaveBeenCalled();
    });

    test("does not update an item when nothing changed", async () => {
      const originalItem = {
        id: "orig-1",
        tempId: "t1",
        ingredient_name: "Tofu",
        cooking_time: "10 min",
        section_name: null,
        order_index: 0,
      };
      const originalData = {
        ungroupedCookingTimes: [originalItem],
        cookingTimeSections: [],
      };
      const formData = {
        ungroupedCookingTimes: [{ ...originalItem }],
        cookingTimeSections: [],
      };

      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: true,
            formData,
            setFormData: vi.fn(),
            originalData,
            generateTempId: vi.fn(),
            loadData: vi.fn().mockResolvedValue(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(updateCookingTime).not.toHaveBeenCalled();
    });

    test("reloads data after saving", async () => {
      const { result, loadData } = setup({
        ungroupedCookingTimes: [],
        cookingTimeSections: [],
      });

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(loadData).toHaveBeenCalled();
    });

    test("shows an alert and resets isSaving when saving fails", async () => {
      createCookingTime.mockRejectedValue(new Error("network error"));
      window.alert = vi.fn();
      const { result } = setup({
        ungroupedCookingTimes: [{ tempId: "t1", ingredient_name: "Tofu" }],
        cookingTimeSections: [],
      });

      await act(async () => {
        await result.current.saveAllChanges();
      });

      expect(window.alert).toHaveBeenCalledWith("network error");
      expect(result.current.isSaving).toBe(false);
    });
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

    test("reorders items within the ungrouped list", () => {
      const { result, getFormData, rerender } = setup({
        ungroupedCookingTimes: [cookingTime("Tofu"), cookingTime("Tempeh")],
      });

      act(() => {
        result.current.handleDragEnd({
          type: "cooking-time-item",
          source: { index: 0, droppableId: "ungrouped" },
          destination: { index: 1, droppableId: "ungrouped" },
        });
      });
      rerender();

      expect(getFormData().ungroupedCookingTimes.map((i) => i.tempId)).toEqual([
        "t-Tempeh",
        "t-Tofu",
      ]);
    });

    test("reorders sections", () => {
      const { result, getFormData, rerender } = setup({
        cookingTimeSections: [
          { id: "s1", subheading: "First", cookingTimes: [] },
          { id: "s2", subheading: "Second", cookingTimes: [] },
        ],
      });

      act(() => {
        result.current.handleDragEnd({
          type: "cooking-time-section",
          source: { index: 0 },
          destination: { index: 1 },
        });
      });
      rerender();

      expect(getFormData().cookingTimeSections.map((s) => s.id)).toEqual([
        "s2",
        "s1",
      ]);
    });
  });

  describe("section edits", () => {
    test("handleCookingTimeChange updates an item in a section", () => {
      const { result, getFormData, rerender } = setup();
      act(() => {
        result.current.handleCookingTimeChange(
          "s1",
          "t-Lentils",
          "cooking_time",
          "25"
        );
      });
      rerender();
      expect(
        getFormData().cookingTimeSections[0].cookingTimes[0]
      ).toMatchObject({ cooking_time: "25" });
      expect(getFormData().ungroupedCookingTimes[0].cooking_time).toBe("");
    });

    test("removeCookingTime removes an ungrouped item", () => {
      const { result, getFormData, rerender } = setup();
      act(() => {
        result.current.removeCookingTime("ungrouped", "t-Tofu");
      });
      rerender();
      expect(getFormData().ungroupedCookingTimes).toEqual([]);
    });

    test("deletes a removed item that was in a section", async () => {
      const formData = { ungroupedCookingTimes: [], cookingTimeSections: [] };
      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: true,
            formData,
            setFormData: vi.fn(),
            originalData: {
              ungroupedCookingTimes: [],
              cookingTimeSections: [
                {
                  id: "s1",
                  subheading: "Legumes",
                  cookingTimes: [{ id: "orig-2", ingredient_name: "Lentils" }],
                },
              ],
            },
            generateTempId: vi.fn(),
            loadData: vi.fn().mockResolvedValue(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await act(async () => {
        await result.current.saveAllChanges();
      });
      expect(deleteCookingTime).toHaveBeenCalledWith("orig-2");
    });
  });

  describe("handleCookingTimeFieldEnter", () => {
    const enter = (extra = {}) => ({
      key: "Enter",
      shiftKey: false,
      preventDefault: vi.fn(),
      ...extra,
    });

    afterEach(() => {
      document.body.innerHTML = "";
    });

    test("ignores other keys and Shift+Enter", () => {
      const { result, setFormData } = setup();
      const shift = enter({ shiftKey: true });
      result.current.handleCookingTimeFieldEnter(
        enter({ key: "a" }),
        "notes",
        "ungrouped",
        "t-Tofu",
        0
      );
      result.current.handleCookingTimeFieldEnter(
        shift,
        "notes",
        "ungrouped",
        "t-Tofu",
        0
      );
      expect(shift.preventDefault).not.toHaveBeenCalled();
      expect(setFormData).not.toHaveBeenCalled();
    });

    test("moves to the next field of the same item", () => {
      document.body.innerHTML =
        '<input id="cooking-time-cooking-time-ungrouped-0-t-Tofu" />';
      const { result } = setup();
      const e = enter();
      result.current.handleCookingTimeFieldEnter(
        e,
        "ingredient_name",
        "ungrouped",
        "t-Tofu",
        0
      );
      expect(e.preventDefault).toHaveBeenCalled();
      expect(document.activeElement.id).toBe(
        "cooking-time-cooking-time-ungrouped-0-t-Tofu"
      );
    });

    test("tolerates a missing next field", () => {
      const { result } = setup();
      expect(() =>
        result.current.handleCookingTimeFieldEnter(
          enter(),
          "cooking_time",
          "ungrouped",
          "t-Tofu",
          0
        )
      ).not.toThrow();
    });

    test("moves from the last field to the next item", () => {
      document.body.innerHTML =
        '<input id="cooking-time-ingredient-name-s1-1-t-Beans" />';
      const { result, setFormData } = setup({
        cookingTimeSections: [
          {
            id: "s1",
            subheading: "Legumes",
            cookingTimes: [cookingTime("Lentils"), cookingTime("Beans")],
          },
        ],
      });
      result.current.handleCookingTimeFieldEnter(
        enter(),
        "notes",
        "s1",
        "t-Lentils",
        0
      );
      expect(document.activeElement.id).toBe(
        "cooking-time-ingredient-name-s1-1-t-Beans"
      );
      expect(setFormData).not.toHaveBeenCalled();
    });

    test("does nothing when the next item's input isn't rendered", () => {
      const { result, setFormData } = setup({
        ungroupedCookingTimes: [cookingTime("Tofu"), { id: "x" }],
      });
      result.current.handleCookingTimeFieldEnter(
        enter(),
        "notes",
        "ungrouped",
        "t-Tofu",
        0
      );
      expect(setFormData).not.toHaveBeenCalled();
    });

    test.each(["ungrouped", "s1", "missing-section"])(
      "adds a new item after the last one (%s)",
      (sectionId) => {
        const { result, setFormData } = setup();
        result.current.handleCookingTimeFieldEnter(
          enter(),
          "notes",
          sectionId,
          "t",
          0
        );
        expect(setFormData).toHaveBeenCalled();
      }
    );
  });

  describe("handleDragEnd between containers", () => {
    const twoSections = {
      ungroupedCookingTimes: [cookingTime("Tofu")],
      cookingTimeSections: [
        {
          id: "s1",
          subheading: "A",
          cookingTimes: [cookingTime("Lentils"), cookingTime("Beans")],
        },
        { id: "s2", subheading: "B", cookingTimes: [cookingTime("Rice")] },
      ],
    };
    const names = (items) => items.map((i) => i.ingredient_name);

    const drag = (from, fromIndex, to, toIndex) => {
      const ctx = setup(twoSections);
      act(() => {
        ctx.result.current.handleDragEnd({
          type: "cooking-time-item",
          source: { droppableId: from, index: fromIndex },
          destination: { droppableId: to, index: toIndex },
        });
      });
      return ctx.getFormData();
    };

    test("reorders within a section", () => {
      const data = drag("s1", 0, "s1", 1);
      expect(names(data.cookingTimeSections[0].cookingTimes)).toEqual([
        "Beans",
        "Lentils",
      ]);
      expect(names(data.cookingTimeSections[1].cookingTimes)).toEqual(["Rice"]);
    });

    test("moves from ungrouped into a section", () => {
      const data = drag("ungrouped", 0, "s2", 0);
      expect(data.ungroupedCookingTimes).toEqual([]);
      expect(names(data.cookingTimeSections[1].cookingTimes)).toEqual([
        "Tofu",
        "Rice",
      ]);
    });

    test("moves from a section to ungrouped", () => {
      const data = drag("s1", 1, "ungrouped", 1);
      expect(names(data.ungroupedCookingTimes)).toEqual(["Tofu", "Beans"]);
      expect(names(data.cookingTimeSections[0].cookingTimes)).toEqual([
        "Lentils",
      ]);
    });

    test("moves between sections", () => {
      const data = drag("s1", 0, "s2", 1);
      expect(names(data.cookingTimeSections[0].cookingTimes)).toEqual([
        "Beans",
      ]);
      expect(names(data.cookingTimeSections[1].cookingTimes)).toEqual([
        "Rice",
        "Lentils",
      ]);
      expect(names(data.ungroupedCookingTimes)).toEqual(["Tofu"]);
    });

    test("ignores drags outside edit mode", () => {
      const setFormData = vi.fn();
      const { result } = renderHook(
        () =>
          useEditCookingTimes({
            isEditMode: false,
            formData: twoSections,
            setFormData,
            originalData: twoSections,
            generateTempId: vi.fn(),
            loadData: vi.fn(),
            t: (k) => k,
          }),
        { wrapper: createQueryClientWrapper() }
      );
      act(() => {
        result.current.handleDragEnd({
          type: "cooking-time-item",
          source: { droppableId: "s1", index: 0 },
          destination: { droppableId: "s2", index: 0 },
        });
      });
      expect(setFormData).not.toHaveBeenCalled();
      expect(result.current.hasUnsavedChanges()).toBe(false);
    });
  });
});
