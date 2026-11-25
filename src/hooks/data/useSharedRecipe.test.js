import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSharedRecipe } from "./useSharedRecipe";
import { createQueryClientWrapper } from "../../test-utils/queryClient";
import { fetchSharedRecipe } from "../../services/recipes";
import { getTranslatedRecipe } from "../../services/recipeTranslationService";
import { useAuth } from "./useAuth";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "de" } }),
}));

vi.mock("../../services/recipes", () => ({
  fetchSharedRecipe: vi.fn(),
}));

vi.mock("../../services/recipeTranslationService", () => ({
  getTranslatedRecipe: vi.fn((recipe) => Promise.resolve(recipe)),
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));

const sharedRecipe = { id: 5, title: "Soup", original_language: "en" };

describe("useSharedRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSharedRecipe.mockResolvedValue(sharedRecipe);
  });

  test("keeps the original language for signed-out viewers", async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false });

    const { result } = renderHook(() => useSharedRecipe("tok"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.recipe).toEqual(sharedRecipe));
    expect(fetchSharedRecipe).toHaveBeenCalledWith("tok");
    expect(getTranslatedRecipe).toHaveBeenCalledWith(sharedRecipe, "en");
  });

  test("translates to the app language for signed-in viewers", async () => {
    useAuth.mockReturnValue({ isLoggedIn: true, loading: false });

    const { result } = renderHook(() => useSharedRecipe("tok"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.recipe).toEqual(sharedRecipe));
    expect(getTranslatedRecipe).toHaveBeenCalledWith(sharedRecipe, "de");
  });

  test("does nothing without a token", () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false });

    const { result } = renderHook(() => useSharedRecipe(null), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.recipe).toBeNull();
    expect(fetchSharedRecipe).not.toHaveBeenCalled();
  });

  test("surfaces an inactive link without retrying", async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false });
    fetchSharedRecipe.mockRejectedValue(new Error("SHARED_RECIPE_NOT_FOUND"));

    const { result } = renderHook(() => useSharedRecipe("tok"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() =>
      expect(result.current.error).toBe("SHARED_RECIPE_NOT_FOUND")
    );
    expect(fetchSharedRecipe).toHaveBeenCalledTimes(1);
  });
});
