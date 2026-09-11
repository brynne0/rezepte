import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useUserProfile } from "./useUserProfile";
import { createQueryClientWrapper } from "../../test-utils/queryClient";

vi.mock("../../services/userService", () => ({
  getUserProfile: vi.fn(),
}));

vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));

import { getUserProfile } from "../../services/userService";
import { useAuth } from "./useAuth";

const CACHE_KEY = "user-profile-cache-user-1";

describe("useUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue({ user: { id: "user-1" } });
  });

  test("fetches and returns the profile for the logged in user", async () => {
    getUserProfile.mockResolvedValue({ id: "user-1", username: "brynne" });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual({
      id: "user-1",
      username: "brynne",
    });
    expect(result.current.error).toBeNull();
  });

  test("does not fetch when there is no logged in user", () => {
    useAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    expect(getUserProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
  });

  test("seeds from the cached profile before the fetch resolves", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        value: { id: "user-1", username: "cached" },
        timestamp: Date.now(),
      })
    );
    let resolveFetch;
    getUserProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.profile).toEqual({
      id: "user-1",
      username: "cached",
    });

    await act(async () => {
      resolveFetch({ id: "user-1", username: "fresh" });
    });

    await waitFor(() =>
      expect(result.current.profile).toEqual({
        id: "user-1",
        username: "fresh",
      })
    );
  });

  test("writes the fetched profile to the localStorage cache", async () => {
    getUserProfile.mockResolvedValue({ id: "user-1", username: "brynne" });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(cached.value).toEqual({ id: "user-1", username: "brynne" });
  });

  test("surfaces a fetch error while keeping any cached profile as data", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        value: { id: "user-1", username: "cached" },
        timestamp: Date.now(),
      })
    );
    getUserProfile.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBe("network down"));

    expect(result.current.profile).toEqual({
      id: "user-1",
      username: "cached",
    });
  });

  test("setProfile applies an updater function and updates the cache", async () => {
    getUserProfile.mockResolvedValue({ id: "user-1", username: "brynne" });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setProfile((prev) => ({ ...prev, username: "renamed" }));
    });

    await waitFor(() =>
      expect(result.current.profile.username).toBe("renamed")
    );

    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(cached.value.username).toBe("renamed");
  });

  test("refreshProfile invalidates the query so it refetches", async () => {
    getUserProfile.mockResolvedValue({ id: "user-1", username: "brynne" });

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    getUserProfile.mockClear();
    getUserProfile.mockResolvedValue({ id: "user-1", username: "updated" });

    act(() => {
      result.current.refreshProfile();
    });

    await waitFor(() =>
      expect(result.current.profile.username).toBe("updated")
    );
  });
});
