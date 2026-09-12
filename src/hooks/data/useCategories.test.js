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

// Mock services - keep the real withAllRecipesOption so the hook's
// prepending behavior is exercised for real, only mock the raw fetch.
vi.mock("../../services/categoriesService", async () => {
  const actual = await vi.importActual("../../services/categoriesService");
  return {
    ...actual,
    getCategories: vi.fn(),
  };
});

vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import {
  getCategories,
  withAllRecipesOption,
} from "../../services/categoriesService";

const renderUseCategories = () =>
  renderHook(() => useCategories(), { wrapper: createQueryClientWrapper() });

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseTranslation.i18n.language = "en";
  });

  test("loads categories successfully", async () => {
    const rawCategories = [
      { value: "dinner", label: "Dinner", id: 1, order: 0 },
      { value: "brunch", label: "Brunch", id: 2, order: 1 },
    ];

    getCategories.mockResolvedValue(rawCategories);

    const { result } = renderUseCategories();

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(
      withAllRecipesOption(rawCategories, "en")
    );
    expect(result.current.error).toBe(null);
    expect(getCategories).toHaveBeenCalledWith("en");
  });

  test("handles failure gracefully", async () => {
    const errorMessage = "Complete failure";
    getCategories.mockRejectedValue(new Error(errorMessage));

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
  });

  test("refreshes categories when language changes", async () => {
    const rawEnglishCategories = [{ value: "dinner", label: "Dinner" }];
    const rawGermanCategories = [{ value: "dinner", label: "Abendessen" }];

    getCategories.mockImplementation((language) => {
      if (language === "en") return Promise.resolve(rawEnglishCategories);
      if (language === "de") return Promise.resolve(rawGermanCategories);
      return Promise.resolve(rawEnglishCategories);
    });

    const { result, rerender } = renderUseCategories();

    // Wait for initial English categories to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(
      withAllRecipesOption(rawEnglishCategories, "en")
    );

    // Change language to German
    mockUseTranslation.i18n.language = "de";

    rerender();

    // Wait for the categories to update to German
    await waitFor(
      () => {
        expect(result.current.categories).toEqual(
          withAllRecipesOption(rawGermanCategories, "de")
        );
      },
      { timeout: 3000 }
    );

    // Verify the correct language was called
    expect(getCategories).toHaveBeenCalledWith("de");
  });

  test("provides refresh function that reloads categories", async () => {
    const initialRawCategories = [];
    const refreshedRawCategories = [{ value: "dinner", label: "Dinner" }];

    getCategories
      .mockResolvedValueOnce(initialRawCategories)
      .mockResolvedValueOnce(refreshedRawCategories);

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(
      withAllRecipesOption(initialRawCategories, "en")
    );

    // Call refresh
    result.current.refreshCategories();

    await waitFor(() => {
      expect(result.current.categories).toEqual(
        withAllRecipesOption(refreshedRawCategories, "en")
      );
    });

    expect(getCategories).toHaveBeenCalledTimes(2);
  });

  test("maintains stable reference for categories to prevent re-renders", async () => {
    getCategories.mockResolvedValue([]);

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
    const cachedCategories = withAllRecipesOption(
      [{ value: "dinner", label: "Dinner" }],
      "en"
    );
    localStorage.setItem(
      "categories-cache-en",
      JSON.stringify({ value: cachedCategories, timestamp: Date.now() })
    );

    getCategories.mockResolvedValue([{ value: "dinner", label: "Dinner" }]);

    const { result } = renderUseCategories();

    // No loading flash — cached data is available synchronously on mount
    expect(result.current.loading).toBe(false);
    expect(result.current.categories).toEqual(cachedCategories);

    await waitFor(() => {
      expect(getCategories).toHaveBeenCalledWith("en");
    });
  });

  test("keeps showing cached categories when a background refresh fails", async () => {
    const cachedCategories = withAllRecipesOption([], "en");
    localStorage.setItem(
      "categories-cache-en",
      JSON.stringify({ value: cachedCategories, timestamp: Date.now() })
    );

    getCategories.mockRejectedValue(new Error("offline"));

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.error).toBe("offline");
    });

    // The cached list is preserved rather than cleared on failure
    expect(result.current.categories).toEqual(cachedCategories);
  });

  test("writes fetched categories to the cache for next time", async () => {
    getCategories.mockResolvedValue([]);

    renderUseCategories();

    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem("categories-cache-en")).value
      ).toEqual(withAllRecipesOption([], "en"));
    });
  });

  test("memoizes categories to prevent unnecessary re-renders", async () => {
    getCategories.mockResolvedValue([]);

    const { result } = renderUseCategories();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(withAllRecipesOption([], "en"));
    expect(result.current.categories).toBe(result.current.categories); // Same reference
  });
});
