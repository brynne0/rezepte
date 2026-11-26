import { describe, test, expect, beforeEach, vi } from "vitest";
import { queueFrom } from "../test-utils/supabaseMock";

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock("./imageService", () => ({
  deleteAllUserImages: vi.fn(),
}));

import supabase from "../lib/supabase";
import { deleteAllUserImages } from "./imageService";
import {
  updateUserPreferredLanguage,
  getUserProfile,
  checkUsernameExists,
  checkEmailExists,
  checkUsernameExistsForSignup,
  checkEmailExistsForSignup,
  updateUserProfile,
  deleteUserAccount,
} from "./userService";

const mockUser = { id: "user-1" };
const dbError = new Error("boom");

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  describe("updateUserPreferredLanguage", () => {
    test("updates the current user's language", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      expect(await updateUserPreferredLanguage("de")).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({ preferred_language: "de" });
      expect(chain.eq).toHaveBeenCalledWith("id", "user-1");
    });

    test("rethrows errors", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(updateUserPreferredLanguage("de")).rejects.toBe(dbError);
    });

    test("throws when signed out", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(updateUserPreferredLanguage("de")).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  describe("getUserProfile", () => {
    test("returns null when signed out", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      expect(await getUserProfile()).toBeNull();
    });

    test("returns the profile", async () => {
      queueFrom(supabase.from, { data: { username: "b" }, error: null });
      expect(await getUserProfile()).toEqual({ username: "b" });
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(getUserProfile()).rejects.toBe(dbError);
    });
  });

  describe.each([
    ["checkUsernameExists", checkUsernameExists, "username"],
    ["checkEmailExists", checkEmailExists, "email"],
  ])("%s", (_name, fn, column) => {
    test("excludes the current user and reports a match", async () => {
      const [chain] = queueFrom(supabase.from, {
        data: [{ id: "x" }],
        error: null,
      });
      expect(await fn("val")).toBe(true);
      expect(chain.eq).toHaveBeenCalledWith(column, "val");
      expect(chain.neq).toHaveBeenCalledWith("id", "user-1");
    });

    test("reports no match", async () => {
      queueFrom(supabase.from, { data: [], error: null });
      expect(await fn("val")).toBe(false);
    });

    test("rethrows errors", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(fn("val")).rejects.toBe(dbError);
    });
  });

  describe.each([
    ["checkUsernameExistsForSignup", checkUsernameExistsForSignup, "username"],
    ["checkEmailExistsForSignup", checkEmailExistsForSignup, "email"],
  ])("%s", (_name, fn, column) => {
    test("reports a match without needing a session", async () => {
      const [chain] = queueFrom(supabase.from, {
        data: [{ id: "x" }],
        error: null,
      });
      expect(await fn("val")).toBe(true);
      expect(chain.eq).toHaveBeenCalledWith(column, "val");
      expect(chain.neq).not.toHaveBeenCalled();
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
    });

    test("reports no match", async () => {
      queueFrom(supabase.from, { data: [], error: null });
      expect(await fn("val")).toBe(false);
    });

    test("rethrows errors", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(fn("val")).rejects.toBe(dbError);
    });
  });

  describe("updateUserProfile", () => {
    test("applies the updates", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      expect(await updateUserProfile({ username: "new" })).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({ username: "new" });
    });

    test("rethrows errors", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(updateUserProfile({})).rejects.toBe(dbError);
    });
  });

  describe("deleteUserAccount", () => {
    test("deletes images, the profile row, then signs out", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      expect(await deleteUserAccount()).toBe(true);
      expect(deleteAllUserImages).toHaveBeenCalledWith("user-1");
      expect(chain.delete).toHaveBeenCalled();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    test("continues when image deletion fails", async () => {
      deleteAllUserImages.mockRejectedValue(new Error("storage"));
      queueFrom(supabase.from, { error: null });
      expect(await deleteUserAccount()).toBe(true);
    });

    test("succeeds even if sign out fails", async () => {
      supabase.auth.signOut.mockResolvedValue({ error: new Error("x") });
      queueFrom(supabase.from, { error: null });
      expect(await deleteUserAccount()).toBe(true);
    });

    test("throws when the profile delete fails", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(deleteUserAccount()).rejects.toBe(dbError);
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
  });
});
