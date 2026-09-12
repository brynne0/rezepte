import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFriendRecipes } from "./useFriendRecipes";
import { createQueryClientWrapper } from "../../../test-utils/queryClient";

const mockUseTranslation = {
  i18n: { language: "en" },
  t: (key) => key,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => mockUseTranslation,
}));

vi.mock("../../../services/friendsService", () => ({
  getUserByUsername: vi.fn(),
  checkFriendship: vi.fn(),
  getFriendProfile: vi.fn(),
  fetchFriendRecipes: vi.fn(),
}));

vi.mock("../../../services/recipeTranslationService", () => ({
  getTranslatedRecipeTitle: vi.fn((recipe) => Promise.resolve(recipe)),
}));

const mockUseOnlineStatus = vi.fn(() => true);
vi.mock("../../../hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

import {
  getUserByUsername,
  checkFriendship,
  getFriendProfile,
  fetchFriendRecipes,
} from "../../../services/friendsService";
import { getTranslatedRecipeTitle } from "../../../services/recipeTranslationService";

const renderUseFriendRecipes = (username) =>
  renderHook(() => useFriendRecipes(username), {
    wrapper: createQueryClientWrapper(),
  });

describe("useFriendRecipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTranslation.i18n.language = "en";
    mockUseOnlineStatus.mockReturnValue(true);
  });

  test("loads a friend's profile and recipes once the friendship is confirmed", async () => {
    getUserByUsername.mockResolvedValue({ id: "friend-1", username: "alice" });
    checkFriendship.mockResolvedValue(true);
    getFriendProfile.mockResolvedValue({
      id: "friend-1",
      username: "alice",
      first_name: "Alice",
    });
    fetchFriendRecipes.mockResolvedValue([
      { id: "r1", title: "Soup", categories: ["dinner"] },
    ]);

    const { result } = renderUseFriendRecipes("alice");

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notFriends).toBe(false);
    expect(result.current.friend.first_name).toBe("Alice");
    expect(result.current.recipes).toEqual([
      { id: "r1", title: "Soup", categories: ["dinner"] },
    ]);
    expect(result.current.friendCategories.map((c) => c.value)).toEqual([
      "all_recipes",
      "dinner",
    ]);
  });

  test("reports notFriends without fetching profile or recipes", async () => {
    getUserByUsername.mockResolvedValue({ id: "friend-1", username: "alice" });
    checkFriendship.mockResolvedValue(false);

    const { result } = renderUseFriendRecipes("alice");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notFriends).toBe(true);
    expect(getFriendProfile).not.toHaveBeenCalled();
    expect(fetchFriendRecipes).not.toHaveBeenCalled();
  });

  test("surfaces an error when the username can't be found", async () => {
    getUserByUsername.mockRejectedValue(new Error("User not found"));

    const { result } = renderUseFriendRecipes("nobody");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("User not found");
    expect(result.current.notFriends).toBe(false);
  });

  test("reports a distinct offline error instead of a raw message when offline", async () => {
    mockUseOnlineStatus.mockReturnValue(false);
    getUserByUsername.mockRejectedValue(new Error("Network error"));

    const { result } = renderUseFriendRecipes("alice");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("offline");
  });

  test("switching language re-translates recipes without refetching the friend, friendship, or raw recipes", async () => {
    getUserByUsername.mockResolvedValue({ id: "friend-1", username: "alice" });
    checkFriendship.mockResolvedValue(true);
    getFriendProfile.mockResolvedValue({ id: "friend-1", first_name: "Alice" });
    fetchFriendRecipes.mockResolvedValue([{ id: "r1", title: "Soup" }]);

    const { result, rerender } = renderUseFriendRecipes("alice");

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getUserByUsername).toHaveBeenCalledTimes(1);
    expect(checkFriendship).toHaveBeenCalledTimes(1);
    expect(fetchFriendRecipes).toHaveBeenCalledTimes(1);
    const translationCallsBefore = getTranslatedRecipeTitle.mock.calls.length;

    mockUseTranslation.i18n.language = "de";
    rerender();

    await waitFor(() => {
      expect(getTranslatedRecipeTitle.mock.calls.length).toBeGreaterThan(
        translationCallsBefore
      );
    });

    // The friend lookup, friendship check, and raw recipe fetch are not
    // re-run just because the language changed.
    expect(getUserByUsername).toHaveBeenCalledTimes(1);
    expect(checkFriendship).toHaveBeenCalledTimes(1);
    expect(fetchFriendRecipes).toHaveBeenCalledTimes(1);
  });
});
