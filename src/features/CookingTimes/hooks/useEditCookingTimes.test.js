import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditCookingTimes } from "./useEditCookingTimes";
import {
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
  updateCookingTimeTranslations,
} from "../../../services/cookingTimesService";
import { getUserPreferredLanguage } from "../../../services/userService";

vi.mock("../../../services/cookingTimesService", () => ({
  createCookingTime: vi.fn(),
  updateCookingTime: vi.fn(),
  deleteCookingTime: vi.fn(),
  updateCookingTimeTranslations: vi.fn(),
}));

vi.mock("../../../services/userService", () => ({
  getUserPreferredLanguage: vi.fn(),
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

  const { result, rerender } = renderHook(() =>
    useEditCookingTimes({
      isEditMode: true,
      formData,
      setFormData,
      originalData,
      generateTempId,
      loadData,
      t,
    })
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
    getUserPreferredLanguage.mockResolvedValue("en");
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

      const { result } = renderHook(() =>
        useEditCookingTimes({
          isEditMode: true,
          formData,
          setFormData,
          originalData,
          generateTempId: vi.fn(),
          loadData: vi.fn().mockResolvedValue(),
          t: (k) => k,
        })
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

      const { result } = renderHook(() =>
        useEditCookingTimes({
          isEditMode: true,
          formData,
          setFormData: vi.fn(),
          originalData,
          generateTempId: vi.fn(),
          loadData: vi.fn().mockResolvedValue(),
          t: (k) => k,
        })
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

      const { result } = renderHook(() =>
        useEditCookingTimes({
          isEditMode: true,
          formData,
          setFormData: vi.fn(),
          originalData,
          generateTempId: vi.fn(),
          loadData: vi.fn().mockResolvedValue(),
          t: (k) => k,
        })
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

      const { result } = renderHook(() =>
        useEditCookingTimes({
          isEditMode: true,
          formData,
          setFormData: vi.fn(),
          originalData,
          generateTempId: vi.fn(),
          loadData: vi.fn().mockResolvedValue(),
          t: (k) => k,
        })
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

      const { result } = renderHook(() =>
        useEditCookingTimes({
          isEditMode: true,
          formData,
          setFormData: vi.fn(),
          originalData,
          generateTempId: vi.fn(),
          loadData: vi.fn().mockResolvedValue(),
          t: (k) => k,
        })
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
});
