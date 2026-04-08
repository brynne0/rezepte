import { describe, test, expect, beforeEach, vi } from "vitest";

// Creates a chainable Supabase query builder that resolves to `resolvedValue`
// when awaited. Every method returns `this` so chains of any length work.
const mockChain = (resolvedValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    then: (resolve, reject) =>
      Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return chain;
};

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
  getUserByUsername,
  checkFriendship,
  getFriendProfile,
  fetchFriendRecipes,
} from "./friendsService";
import supabase from "../lib/supabase";

const mockUser = { id: "user-1" };

describe("Friends Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("searchUsers", () => {
    test("returns empty array for query shorter than 3 characters", async () => {
      expect(await searchUsers("")).toEqual([]);
      expect(await searchUsers("ab")).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    test("throws when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(searchUsers("alice")).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("returns empty array when RPC finds no users", async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      expect(await searchUsers("alice")).toEqual([]);
    });

    test("annotates results with friendshipStatus none when no friendship exists", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice" }],
        error: null,
      });
      supabase.from.mockReturnValue(mockChain({ data: [], error: null }));

      const results = await searchUsers("alice");
      expect(results).toEqual([
        { id: "user-2", username: "alice", friendshipStatus: "none" },
      ]);
    });

    test("annotates with pending_sent when current user sent the request", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice" }],
        error: null,
      });
      supabase.from.mockReturnValue(
        mockChain({
          data: [
            {
              requester_id: "user-1",
              addressee_id: "user-2",
              status: "pending",
            },
          ],
          error: null,
        })
      );

      const [result] = await searchUsers("alice");
      expect(result.friendshipStatus).toBe("pending_sent");
    });

    test("annotates with pending_received when other user sent the request", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice" }],
        error: null,
      });
      supabase.from.mockReturnValue(
        mockChain({
          data: [
            {
              requester_id: "user-2",
              addressee_id: "user-1",
              status: "pending",
            },
          ],
          error: null,
        })
      );

      const [result] = await searchUsers("alice");
      expect(result.friendshipStatus).toBe("pending_received");
    });

    test("annotates with accepted when friendship is accepted", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice" }],
        error: null,
      });
      supabase.from.mockReturnValue(
        mockChain({
          data: [
            {
              requester_id: "user-1",
              addressee_id: "user-2",
              status: "accepted",
            },
          ],
          error: null,
        })
      );

      const [result] = await searchUsers("alice");
      expect(result.friendshipStatus).toBe("accepted");
    });

    test("throws when RPC returns an error", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error("rpc failed"),
      });
      await expect(searchUsers("alice")).rejects.toThrow("rpc failed");
    });
  });

  describe("sendFriendRequest", () => {
    test("inserts a pending friendship row", async () => {
      supabase.from.mockReturnValue(mockChain({ error: null }));

      await sendFriendRequest("user-2");

      expect(supabase.from).toHaveBeenCalledWith("friendships");
      const chain = supabase.from.mock.results[0].value;
      expect(chain.insert).toHaveBeenCalledWith({
        requester_id: "user-1",
        addressee_id: "user-2",
        status: "pending",
      });
    });

    test("throws when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(sendFriendRequest("user-2")).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("throws when insert returns an error", async () => {
      supabase.from.mockReturnValue(
        mockChain({ error: new Error("insert failed") })
      );
      await expect(sendFriendRequest("user-2")).rejects.toThrow(
        "insert failed"
      );
    });
  });

  describe("acceptFriendRequest", () => {
    test("updates friendship status to accepted", async () => {
      supabase.from.mockReturnValue(mockChain({ error: null }));

      await acceptFriendRequest("user-2");

      expect(supabase.from).toHaveBeenCalledWith("friendships");
      const chain = supabase.from.mock.results[0].value;
      expect(chain.update).toHaveBeenCalledWith({ status: "accepted" });
    });

    test("throws when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(acceptFriendRequest("user-2")).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("throws when update returns an error", async () => {
      supabase.from.mockReturnValue(
        mockChain({ error: new Error("update failed") })
      );
      await expect(acceptFriendRequest("user-2")).rejects.toThrow(
        "update failed"
      );
    });
  });

  describe("removeFriendship", () => {
    test("deletes the friendship row", async () => {
      supabase.from.mockReturnValue(mockChain({ error: null }));

      await removeFriendship("user-2");

      expect(supabase.from).toHaveBeenCalledWith("friendships");
      const chain = supabase.from.mock.results[0].value;
      expect(chain.delete).toHaveBeenCalled();
    });

    test("throws when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(removeFriendship("user-2")).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("throws when delete returns an error", async () => {
      supabase.from.mockReturnValue(
        mockChain({ error: new Error("delete failed") })
      );
      await expect(removeFriendship("user-2")).rejects.toThrow("delete failed");
    });
  });

  describe("getFriends", () => {
    test("returns empty array when user has no accepted friendships", async () => {
      supabase.from.mockReturnValue(mockChain({ data: [], error: null }));
      expect(await getFriends()).toEqual([]);
    });

    test("calls get_friend_profiles with correct IDs derived from both sides", async () => {
      supabase.from.mockReturnValue(
        mockChain({
          data: [
            { requester_id: "user-1", addressee_id: "user-2" },
            { requester_id: "user-3", addressee_id: "user-1" },
          ],
          error: null,
        })
      );
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice", first_name: "Alice" }],
        error: null,
      });

      const result = await getFriends();

      expect(supabase.rpc).toHaveBeenCalledWith("get_friend_profiles", {
        friend_ids: ["user-2", "user-3"],
      });
      expect(result).toEqual([
        { id: "user-2", username: "alice", first_name: "Alice" },
      ]);
    });

    test("throws when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(getFriends()).rejects.toThrow("User not authenticated");
    });
  });

  describe("getPendingRequests", () => {
    test("returns empty array when no pending requests", async () => {
      supabase.from.mockReturnValue(mockChain({ data: [], error: null }));
      expect(await getPendingRequests()).toEqual([]);
    });

    test("calls get_profiles_by_ids with requester IDs", async () => {
      supabase.from.mockReturnValue(
        mockChain({
          data: [{ requester_id: "user-2" }, { requester_id: "user-3" }],
          error: null,
        })
      );
      supabase.rpc.mockResolvedValueOnce({
        data: [
          { id: "user-2", username: "alice" },
          { id: "user-3", username: "bob" },
        ],
        error: null,
      });

      const result = await getPendingRequests();

      expect(supabase.rpc).toHaveBeenCalledWith("get_profiles_by_ids", {
        user_ids: ["user-2", "user-3"],
      });
      expect(result).toHaveLength(2);
    });

    test("throws when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(getPendingRequests()).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  describe("getUserByUsername", () => {
    test("returns first result from RPC", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice" }],
        error: null,
      });

      const result = await getUserByUsername("alice");
      expect(result).toEqual({ id: "user-2", username: "alice" });
      expect(supabase.rpc).toHaveBeenCalledWith("get_user_by_username", {
        uname: "alice",
      });
    });

    test("throws when user is not found", async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      await expect(getUserByUsername("ghost")).rejects.toThrow(
        "User not found"
      );
    });

    test("throws when RPC returns an error", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error("rpc failed"),
      });
      await expect(getUserByUsername("alice")).rejects.toThrow("rpc failed");
    });
  });

  describe("checkFriendship", () => {
    test("returns true when an accepted friendship exists", async () => {
      const chain = mockChain(null);
      chain.maybeSingle.mockResolvedValue({
        data: { id: "friendship-1" },
        error: null,
      });
      supabase.from.mockReturnValue(chain);

      expect(await checkFriendship("user-2")).toBe(true);
    });

    test("returns false when no friendship exists", async () => {
      const chain = mockChain(null);
      chain.maybeSingle.mockResolvedValue({ data: null, error: null });
      supabase.from.mockReturnValue(chain);

      expect(await checkFriendship("user-2")).toBe(false);
    });

    test("returns false when user is not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      expect(await checkFriendship("user-2")).toBe(false);
    });
  });

  describe("getFriendProfile", () => {
    test("returns profile when RPC returns data", async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [{ id: "user-2", username: "alice", first_name: "Alice" }],
        error: null,
      });

      const result = await getFriendProfile("user-2");
      expect(result).toEqual({
        id: "user-2",
        username: "alice",
        first_name: "Alice",
      });
      expect(supabase.rpc).toHaveBeenCalledWith("get_friend_profiles", {
        friend_ids: ["user-2"],
      });
    });

    test("returns null when RPC returns empty array", async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      expect(await getFriendProfile("user-2")).toBeNull();
    });
  });

  describe("fetchFriendRecipes", () => {
    test("returns recipes with mapped categories array", async () => {
      supabase.from.mockReturnValue(
        mockChain({
          data: [
            {
              id: "recipe-1",
              title: "Pasta",
              recipe_categories: [
                { categories: { name: "italian" } },
                { categories: { name: "dinner" } },
              ],
            },
          ],
          error: null,
        })
      );

      const result = await fetchFriendRecipes("user-2");
      expect(result[0].categories).toEqual(["italian", "dinner"]);
    });

    test("returns empty categories array when recipe has none", async () => {
      supabase.from.mockReturnValue(
        mockChain({
          data: [{ id: "recipe-1", title: "Pasta", recipe_categories: [] }],
          error: null,
        })
      );

      const [result] = await fetchFriendRecipes("user-2");
      expect(result.categories).toEqual([]);
    });

    test("returns empty array when friend has no recipes", async () => {
      supabase.from.mockReturnValue(mockChain({ data: [], error: null }));
      expect(await fetchFriendRecipes("user-2")).toEqual([]);
    });

    test("throws when query returns an error", async () => {
      supabase.from.mockReturnValue(
        mockChain({ data: null, error: new Error("query failed") })
      );
      await expect(fetchFriendRecipes("user-2")).rejects.toThrow(
        "query failed"
      );
    });
  });
});
