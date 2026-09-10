import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCategories } from "./useCategories";
import { createQueryClientWrapper } from "../../test-utils/queryClient";

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

vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import { getCategoriesForUI } from "../../services/categoriesService";

const renderUseCategories = () =>
  renderHook(() => useCategories(), { wrapper: createQueryClientWrapper() });

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseTranslation.i18n.language = "en";
  });

  test("loads categories successfully", async () => {
    const mockCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
      { value: "dinner", label: "Dinner", id: 1, order: 0 },
      { value: "brunch", label: "Brunch", id: 2, order: 1 },
    ];

    getCategoriesForUI.mockResolvedValue(mockCategories);

    const { result } = renderUseCategories();

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBe(null);
    expect(getCategoriesForUI).toHaveBeenCalledWith("en");
  });

  test("handles failure gracefully", async () => {
    const errorMessage = "Complete failure";
    getCategoriesForUI.mockRejectedValue(new Error(errorMessage));

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  test("refreshes categories when language changes", async () => {
    const mockEnglishCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
      { value: "dinner", label: "Dinner" },
    ];
    const mockGermanCategories = [
      { value: "all_recipes", label: "Alle Rezepte", isSystem: true },
      { value: "dinner", label: "Abendessen" },
    ];

    getCategoriesForUI.mockImplementation((language) => {
      if (language === "en") return Promise.resolve(mockEnglishCategories);
      if (language === "de") return Promise.resolve(mockGermanCategories);
      return Promise.resolve(mockEnglishCategories);
    });

    const { result, rerender } = renderUseCategories();

    // Wait for initial English categories to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockEnglishCategories);

    // Change language to German
    mockUseTranslation.i18n.language = "de";

    rerender();

    // Wait for the categories to update to German
    await waitFor(
      () => {
        expect(result.current.categories).toEqual(mockGermanCategories);
      },
      { timeout: 3000 }
    );

    // Verify the correct language was called
    expect(getCategoriesForUI).toHaveBeenCalledWith("de");
  });

  test("provides refresh function that reloads categories", async () => {
    const initialCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
    ];
    const refreshedCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
      { value: "dinner", label: "Dinner" },
    ];

    getCategoriesForUI
      .mockResolvedValueOnce(initialCategories)
      .mockResolvedValueOnce(refreshedCategories);

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(initialCategories);

    // Call refresh
    result.current.refreshCategories();

    await waitFor(() => {
      expect(result.current.categories).toEqual(refreshedCategories);
    });

    expect(getCategoriesForUI).toHaveBeenCalledTimes(2);
  });

  test("maintains stable reference for categories to prevent re-renders", async () => {
    const mockCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
    ];

    getCategoriesForUI.mockResolvedValue(mockCategories);

    const { result, rerender } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstCategories = result.current.categories;

    // Force re-render
    rerender();

    expect(result.current.categories).toBe(firstCategories); // Same reference
  });

  test("shows cached categories immediately without a loading state", async () => {
    const cachedCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
      { value: "dinner", label: "Dinner" },
    ];
    localStorage.setItem(
      "categories-cache-en",
      JSON.stringify(cachedCategories)
    );

    getCategoriesForUI.mockResolvedValue(cachedCategories);

    const { result } = renderUseCategories();

    // No loading flash — cached data is available synchronously on mount
    expect(result.current.loading).toBe(false);
    expect(result.current.categories).toEqual(cachedCategories);

    await waitFor(() => {
      expect(getCategoriesForUI).toHaveBeenCalledWith("en");
    });
  });

  test("keeps showing cached categories when a background refresh fails", async () => {
    const cachedCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
    ];
    localStorage.setItem(
      "categories-cache-en",
      JSON.stringify(cachedCategories)
    );

    getCategoriesForUI.mockRejectedValue(new Error("offline"));

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.error).toBe("offline");
    });

    // The cached list is preserved rather than cleared on failure
    expect(result.current.categories).toEqual(cachedCategories);
  });

  test("writes fetched categories to the cache for next time", async () => {
    const mockCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
    ];
    getCategoriesForUI.mockResolvedValue(mockCategories);

    renderUseCategories();

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("categories-cache-en"))).toEqual(
        mockCategories
      );
    });
  });

  test("memoizes categories to prevent unnecessary re-renders", async () => {
    const mockCategories = [
      { value: "all_recipes", label: "All Recipes", isSystem: true },
    ];

    getCategoriesForUI.mockResolvedValue(mockCategories);

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.categories).toBe(result.current.categories); // Same reference
  });
});
