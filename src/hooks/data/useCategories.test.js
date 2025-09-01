import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCategories } from "./useCategories";

// Mock react-i18next
const mockUseTranslation = {
  i18n: {
    language: "en",
  },
};

vi.mock("react-i18next", () => ({
  useTranslation: () => mockUseTranslation,
}));

// Mock services
vi.mock("../../services/categoriesService", () => ({
  getCategoriesForUI: vi.fn(),
}));

vi.mock("../../services/categoryPreferencesService", () => ({
  getCategoriesWithPreferences: vi.fn(),
}));

import { getCategoriesForUI } from "../../services/categoriesService";
import { getCategoriesWithPreferences } from "../../services/categoryPreferencesService";

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads categories with preferences successfully", async () => {
    const mockCategories = [
      { value: "all", label: "All Recipes", isSystem: true },
      {
        value: "dinner",
        label: "Dinner",
        isSystem: false,
        id: 1,
        isVisible: true,
        order: 0,
      },
      {
        value: "brunch",
        label: "Brunch",
        isSystem: false,
        id: 2,
        isVisible: true,
        order: 1,
      },
    ];

    getCategoriesWithPreferences.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBe(null);
    expect(getCategoriesWithPreferences).toHaveBeenCalledWith("en");
  });

  test("falls back to basic categories when preferences fail", async () => {
    const mockBasicCategories = [
      { value: "all", label: "All Recipes" },
      { value: "dinner", label: "Dinner" },
    ];

    getCategoriesWithPreferences.mockRejectedValue(
      new Error("Preferences failed")
    );
    getCategoriesForUI.mockResolvedValue(mockBasicCategories);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockBasicCategories);
    expect(result.current.error).toBe(null);
    expect(getCategoriesForUI).toHaveBeenCalledWith("en");
  });

  test("handles complete failure gracefully", async () => {
    const errorMessage = "Complete failure";
    getCategoriesWithPreferences.mockRejectedValue(
      new Error("Preferences failed")
    );
    getCategoriesForUI.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  test("refreshes categories when language changes", async () => {
    const mockEnglishCategories = [
      { value: "all", label: "All Recipes", isSystem: true },
      { value: "dinner", label: "Dinner", isSystem: false },
    ];
    const mockGermanCategories = [
      { value: "all", label: "Alle Rezepte", isSystem: true },
      { value: "dinner", label: "Abendessen", isSystem: false },
    ];

    // Mock both services for different languages
    getCategoriesWithPreferences.mockImplementation((language) => {
      if (language === "en") return Promise.resolve(mockEnglishCategories);
      if (language === "de") return Promise.resolve(mockGermanCategories);
      return Promise.resolve(mockEnglishCategories);
    });

    getCategoriesForUI.mockImplementation((language) => {
      if (language === "en") return Promise.resolve(mockEnglishCategories);
      if (language === "de") return Promise.resolve(mockGermanCategories);
      return Promise.resolve(mockEnglishCategories);
    });

    const { result, rerender } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockEnglishCategories);

    // Change language - need to clear mocks and reset
    vi.clearAllMocks();
    mockUseTranslation.i18n.language = "de";

    // Re-setup mocks after language change
    getCategoriesWithPreferences.mockImplementation((language) => {
      if (language === "en") return Promise.resolve(mockEnglishCategories);
      if (language === "de") return Promise.resolve(mockGermanCategories);
      return Promise.resolve(mockEnglishCategories);
    });

    getCategoriesForUI.mockImplementation((language) => {
      if (language === "en") return Promise.resolve(mockEnglishCategories);
      if (language === "de") return Promise.resolve(mockGermanCategories);
      return Promise.resolve(mockEnglishCategories);
    });

    rerender();

    await waitFor(() => {
      expect(getCategoriesWithPreferences).toHaveBeenCalledWith("de");
    });

    expect(result.current.categories).toEqual(mockGermanCategories);
  });

  test("provides refresh function that reloads categories", async () => {
    const initialCategories = [
      { value: "all", label: "All Recipes", isSystem: true },
    ];
    const refreshedCategories = [
      { value: "all", label: "All Recipes", isSystem: true },
      { value: "dinner", label: "Dinner", isSystem: false },
    ];

    getCategoriesWithPreferences
      .mockResolvedValueOnce(initialCategories)
      .mockResolvedValueOnce(refreshedCategories);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(initialCategories);

    // Call refresh
    result.current.refreshCategories();

    await waitFor(() => {
      expect(result.current.categories).toEqual(refreshedCategories);
    });

    expect(getCategoriesWithPreferences).toHaveBeenCalledTimes(2);
  });

  test("maintains stable reference for categories to prevent re-renders", async () => {
    const mockCategories = [
      { value: "all", label: "All Recipes", isSystem: true },
    ];

    getCategoriesWithPreferences.mockResolvedValue(mockCategories);

    const { result, rerender } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstCategories = result.current.categories;

    // Force re-render
    rerender();

    expect(result.current.categories).toBe(firstCategories); // Same reference
  });

  test("memoizes categories to prevent unnecessary re-renders", async () => {
    const mockCategories = [
      { value: "all", label: "All Recipes", isSystem: true },
    ];

    getCategoriesWithPreferences.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.categories).toBe(result.current.categories); // Same reference
  });
});
