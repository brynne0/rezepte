import { describe, test, expect, beforeEach, vi } from "vitest";
import { queueFrom } from "../test-utils/supabaseMock";

vi.mock("../lib/supabase", () => ({
  default: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

import supabase from "../lib/supabase";
import {
  fetchUserCookingTimes,
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
  searchCookingTimes,
  updateCookingTimesOrder,
  createSection,
  removeSection,
} from "./cookingTimesService";

const mockUser = { id: "user-1" };
const dbError = { message: "boom" };

describe("cookingTimesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("fetchUserCookingTimes", () => {
    test("returns the user's items in order", async () => {
      const [chain] = queueFrom(supabase.from, { data: [{ id: 1 }] });
      expect(await fetchUserCookingTimes()).toEqual([{ id: 1 }]);
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(chain.order).toHaveBeenCalledWith("order_index", {
        ascending: true,
      });
    });

    test("returns empty array for null data", async () => {
      queueFrom(supabase.from, { data: null });
      expect(await fetchUserCookingTimes()).toEqual([]);
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(fetchUserCookingTimes()).rejects.toThrow(
        "Failed to fetch cooking times: boom"
      );
    });

    test("throws when signed out", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(fetchUserCookingTimes()).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  describe("createCookingTime", () => {
    test("cleans the data and nulls empty fields", async () => {
      const [chain] = queueFrom(supabase.from, { data: { id: 1 } });
      await createCookingTime(
        { ingredient_name: "  Rice ", cooking_time: "20", notes: "  " },
        "Grains",
        3,
        "de"
      );
      expect(chain.insert).toHaveBeenCalledWith([
        {
          user_id: "user-1",
          ingredient_name: "Rice",
          cooking_time: "20",
          soaking_time: null,
          dry_weight: null,
          cooked_weight: null,
          notes: null,
          section_name: "Grains",
          order_index: 3,
          original_language: "de",
        },
      ]);
    });

    test("uses defaults for section, order and language", async () => {
      const [chain] = queueFrom(supabase.from, { data: { id: 1 } });
      expect(await createCookingTime({ ingredient_name: "Rice" })).toEqual({
        id: 1,
      });
      const row = chain.insert.mock.calls[0][0][0];
      expect(row.section_name).toBeNull();
      expect(row.order_index).toBe(0);
      expect(row.original_language).toBe("en");
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(createCookingTime({ ingredient_name: "x" })).rejects.toThrow(
        "Failed to create cooking time: boom"
      );
    });
  });

  describe("updateCookingTime", () => {
    test("updates only the user's own row", async () => {
      const [chain] = queueFrom(supabase.from, { data: { id: 1 } });
      await updateCookingTime(1, {
        ingredient_name: "Rice",
        notes: " soak first ",
        section_name: "Grains",
        order_index: 2,
      });
      const update = chain.update.mock.calls[0][0];
      expect(update.notes).toBe("soak first");
      expect(update).not.toHaveProperty("original_language");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    test("includes the language switch when given", async () => {
      const [chain] = queueFrom(supabase.from, { data: { id: 1 } });
      await updateCookingTime(1, {
        ingredient_name: "Reis",
        original_language: "de",
        translated_cooking_time: { en: {} },
      });
      expect(chain.update.mock.calls[0][0]).toMatchObject({
        original_language: "de",
        translated_cooking_time: { en: {} },
      });
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(
        updateCookingTime(1, { ingredient_name: "x" })
      ).rejects.toThrow("Failed to update cooking time: boom");
    });
  });

  describe("deleteCookingTime", () => {
    test("deletes the user's row", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      expect(await deleteCookingTime(1)).toBe(true);
      expect(chain.eq).toHaveBeenCalledWith("id", 1);
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(deleteCookingTime(1)).rejects.toThrow(
        "Failed to delete cooking time: boom"
      );
    });
  });

  describe("searchCookingTimes", () => {
    test("searches by ingredient name", async () => {
      const [chain] = queueFrom(supabase.from, { data: [{ id: 1 }] });
      expect(await searchCookingTimes("ric")).toEqual([{ id: 1 }]);
      expect(chain.ilike).toHaveBeenCalledWith("ingredient_name", "%ric%");
    });

    test("returns empty array for null data", async () => {
      queueFrom(supabase.from, { data: null });
      expect(await searchCookingTimes("x")).toEqual([]);
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { data: null, error: dbError });
      await expect(searchCookingTimes("x")).rejects.toThrow(
        "Failed to search cooking times: boom"
      );
    });
  });

  describe("updateCookingTimesOrder", () => {
    test("upserts order and section for each item", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      await updateCookingTimesOrder([
        { id: 1, order_index: 0, section_name: "A", notes: "ignored" },
        { id: 2, order_index: 1 },
      ]);
      expect(chain.upsert).toHaveBeenCalledWith([
        { id: 1, order_index: 0, section_name: "A" },
        { id: 2, order_index: 1, section_name: null },
      ]);
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(updateCookingTimesOrder([])).rejects.toThrow(
        "Failed to update cooking times order"
      );
    });
  });

  describe("createSection", () => {
    test("does nothing without selected items", async () => {
      expect(await createSection("A")).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    test("moves the selected items into the section", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      expect(await createSection("A", [1, 2])).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({ section_name: "A" });
      expect(chain.in).toHaveBeenCalledWith("id", [1, 2]);
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(createSection("A", [1])).rejects.toThrow(
        "Failed to create section"
      );
    });
  });

  describe("removeSection", () => {
    test("ungroups the section's items", async () => {
      const [chain] = queueFrom(supabase.from, { error: null });
      expect(await removeSection("A")).toBe(true);
      expect(chain.update).toHaveBeenCalledWith({ section_name: null });
      expect(chain.eq).toHaveBeenCalledWith("section_name", "A");
    });

    test("throws on error", async () => {
      queueFrom(supabase.from, { error: dbError });
      await expect(removeSection("A")).rejects.toThrow(
        "Failed to remove section"
      );
    });
  });
});
