import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFriendsData } from "./useFriendsData";
import { createQueryClientWrapper } from "../../test-utils/queryClient";

vi.mock("../../services/friendsService", () => ({
  getFriends: vi.fn(),
  getPendingRequests: vi.fn(),
  getSentRequests: vi.fn(),
  acceptFriendRequest: vi.fn(),
  removeFriendship: vi.fn(),
}));

import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  acceptFriendRequest,
  removeFriendship,
} from "../../services/friendsService";

const renderUseFriendsData = () =>
  renderHook(() => useFriendsData(), { wrapper: createQueryClientWrapper() });

describe("useFriendsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFriends.mockResolvedValue([{ id: "f1", username: "alice" }]);
    getPendingRequests.mockResolvedValue([{ id: "p1", username: "bob" }]);
    getSentRequests.mockResolvedValue([{ id: "s1", username: "carol" }]);
    acceptFriendRequest.mockResolvedValue();
    removeFriendship.mockResolvedValue();
  });

  test("loads and combines friends, pending, and sent requests", async () => {
    const { result } = renderUseFriendsData();

    expect(result.current.isLoadingData).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingData).toBe(false);
    });

    expect(result.current.friends).toEqual([{ id: "f1", username: "alice" }]);
    expect(result.current.pendingRequests).toEqual([
      { id: "p1", username: "bob" },
    ]);
    expect(result.current.sentRequests).toEqual([
      { id: "s1", username: "carol" },
    ]);
  });

  test("accepting a request refetches the friends data", async () => {
    const { result } = renderUseFriendsData();
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    getFriends.mockResolvedValue([
      { id: "f1", username: "alice" },
      { id: "p1", username: "bob" },
    ]);
    getPendingRequests.mockResolvedValue([]);

    await act(async () => {
      await result.current.acceptFriendRequest("p1");
    });

    expect(acceptFriendRequest.mock.calls[0][0]).toBe("p1");
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
      expect(result.current.pendingRequests).toEqual([]);
    });
  });

  test("removing a friend refetches the friends data", async () => {
    const { result } = renderUseFriendsData();
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    getFriends.mockResolvedValue([]);

    await act(async () => {
      await result.current.removeFriendship("f1");
    });

    expect(removeFriendship.mock.calls[0][0]).toBe("f1");
    await waitFor(() => {
      expect(result.current.friends).toEqual([]);
    });
  });

  test("refetch reloads friends data on demand", async () => {
    const { result } = renderUseFriendsData();
    await waitFor(() => expect(result.current.isLoadingData).toBe(false));

    expect(getFriends).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(getFriends).toHaveBeenCalledTimes(2);
  });
});
