import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRecipe } from "./useRecipe";
import { createQueryClientWrapper } from "../../test-utils/queryClient";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

vi.mock("../../services/recipes", () => ({
  fetchRecipe: vi.fn(),
}));

vi.mock("../../services/recipeTranslationService", () => ({
  getTranslatedRecipe: vi.fn((recipe) => Promise.resolve(recipe)),
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../ui/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

const { mockThen, mockEq, mockUpdate, mockFrom } = vi.hoisted(() => {
  const mockThen = vi.fn((onFulfilled) => {
    onFulfilled?.({ error: null });
    return { catch: vi.fn() };
  });
  const mockEq = vi.fn(() => ({ then: mockThen }));
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ update: mockUpdate }));
  return { mockThen, mockEq, mockUpdate, mockFrom };
});

vi.mock("../../lib/supabase", () => ({
  default: { from: mockFrom },
}));

import { fetchRecipe } from "../../services/recipes";
import { useAuth } from "./useAuth";
import { useOnlineStatus } from "../ui/useOnlineStatus";

describe("useRecipe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThen.mockImplementation((onFulfilled) => {
      onFulfilled?.({ error: null });
      return { catch: vi.fn() };
    });
    useAuth.mockReturnValue({
      isLoggedIn: true,
      loading: false,
      user: { id: "user-1" },
    });
    useOnlineStatus.mockReturnValue(true);
  });

  test("returns null recipe while not logged in", async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false, user: null });

    const { result } = renderHook(() => useRecipe("r1"), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.recipe).toBeNull();
    expect(fetchRecipe).not.toHaveBeenCalled();
  });

  test("fetches and returns the translated recipe", async () => {
    fetchRecipe.mockResolvedValue({ id: "r1", user_id: "user-1" });

    const { result } = renderHook(() => useRecipe("r1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.recipe).toEqual({ id: "r1", user_id: "user-1" });
    expect(result.current.error).toBeNull();
  });

  test("surfaces a fetch error", async () => {
    fetchRecipe.mockRejectedValue(new Error("not found"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useRecipe("missing"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe("not found"));
  });

  test("tracks last_viewed_at for an owned recipe while online", async () => {
    fetchRecipe.mockResolvedValue({ id: "r1", user_id: "user-1" });

    renderHook(() => useRecipe("r1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith("recipes"));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ last_viewed_at: expect.any(String) })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "r1");
  });

  test("does not track views while offline", async () => {
    useOnlineStatus.mockReturnValue(false);
    fetchRecipe.mockResolvedValue({ id: "r1", user_id: "user-1" });

    const { result } = renderHook(() => useRecipe("r1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("does not track views for a recipe owned by someone else", async () => {
    fetchRecipe.mockResolvedValue({ id: "r1", user_id: "someone-else" });

    const { result } = renderHook(() => useRecipe("r1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("logs an error when the last_viewed_at update fails", async () => {
    mockThen.mockImplementation((onFulfilled) => {
      onFulfilled?.({ error: new Error("update failed") });
      return { catch: vi.fn() };
    });
    fetchRecipe.mockResolvedValue({ id: "r1", user_id: "user-1" });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderHook(() => useRecipe("r1"), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to update last_viewed_at:",
        expect.any(Error)
      )
    );
  });
});
