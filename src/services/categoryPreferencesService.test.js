import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock supabase first
vi.mock("../lib/supabase", () => ({
  default: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import {
  getUserCategoryPreferences,
  saveUserCategoryPreferences,
  getCategoriesWithPreferences,
} from "./categoryPreferencesService";
import supabase from "../lib/supabase";

describe("categoryPreferencesService", () => {
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("getUserCategoryPreferences", () => {
    test("fetches user category preferences successfully", async () => {
      const mockPreferences = [
        {
          category_id: 1,
          category_value: "dinner",
          is_visible: true,
          display_order: 0,
        },
        {
          category_id: 2,
          category_value: "brunch",
          is_visible: false,
          display_order: 1,
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockPreferences, error: null }),
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await getUserCategoryPreferences();

      expect(supabase.from).toHaveBeenCalledWith("user_category_preferences");
      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(mockQuery.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(result).toEqual(mockPreferences);
    });

    test("throws error when user not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(getUserCategoryPreferences()).rejects.toThrow(
        "User not authenticated"
      );
    });

    test("handles database errors", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };
      supabase.from.mockReturnValue(mockQuery);

      await expect(getUserCategoryPreferences()).rejects.toThrow(
        "Error fetching category preferences: Database error"
      );
    });
  });

  describe("saveUserCategoryPreferences", () => {
    test("saves user category preferences successfully", async () => {
      const mockPreferences = [
        { id: 1, value: "dinner", isVisible: true, order: 0 },
        { id: 2, value: "brunch", isVisible: false, order: 1 },
      ];

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      supabase.from
        .mockReturnValueOnce(mockDeleteQuery) // First call for delete
        .mockReturnValueOnce(mockInsertQuery); // Second call for insert

      const result = await saveUserCategoryPreferences(mockPreferences);

      expect(mockDeleteQuery.delete).toHaveBeenCalled();
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith([
        {
          user_id: mockUser.id,
          category_id: 1,
          category_value: "dinner",
          is_visible: true,
          display_order: 0,
        },
        {
          user_id: mockUser.id,
          category_id: 2,
          category_value: "brunch",
          is_visible: false,
          display_order: 1,
        },
      ]);
      expect(result).toEqual([]);
    });

    test("throws error when user not authenticated", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      await expect(saveUserCategoryPreferences([])).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  describe("getCategoriesWithPreferences", () => {
    test("applies user preferences to categories with correct ordering", async () => {
      const mockUserCategories = [
        {
          category_id: 2,
          category_value: "brunch",
          is_visible: true,
          display_order: 0,
          categories: { id: 2, name: "brunch", is_system: false },
        },
        {
          category_id: 1,
          category_value: "dinner",
          is_visible: true,
          display_order: 1,
          categories: { id: 1, name: "dinner", is_system: false },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: mockUserCategories, error: null }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await getCategoriesWithPreferences("en");

      expect(supabase.from).toHaveBeenCalledWith("user_category_preferences");
      expect(result).toEqual([
        { value: "all", label: "All Recipes", isSystem: true },
        {
          value: "brunch",
          label: "brunch",
          isSystem: false,
          id: 2,
          isVisible: true,
          order: 0,
        },
        {
          value: "dinner",
          label: "dinner",
          isSystem: false,
          id: 1,
          isVisible: true,
          order: 1,
        },
      ]);
    });

    test("handles categories without user preferences (defaults)", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }), // No preferences
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await getCategoriesWithPreferences("en");

      expect(result).toEqual([
        { value: "all", label: "All Recipes", isSystem: true },
      ]);
    });

    test("uses translated category names when available", async () => {
      const mockUserCategories = [
        {
          category_id: 1,
          category_value: "dinner",
          is_visible: true,
          display_order: 0,
          categories: {
            id: 1,
            name: "dinner",
            is_system: false,
            translated_category: { de: "Abendessen", en: "Dinner" },
          },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: mockUserCategories, error: null }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await getCategoriesWithPreferences("de");

      expect(result).toEqual([
        { value: "all", label: "Alle Rezepte", isSystem: true },
        {
          value: "dinner",
          label: "Abendessen",
          isSystem: false,
          id: 1,
          isVisible: true,
          order: 0,
        },
      ]);
    });

    test("handles unauthenticated users gracefully", async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getCategoriesWithPreferences("en");

      expect(result).toEqual([
        { value: "all", label: "All Recipes", isSystem: true },
      ]);
    });

    test("filters out hidden categories", async () => {
      const mockUserCategories = [
        {
          category_id: 2,
          category_value: "brunch",
          is_visible: true,
          display_order: 1,
          categories: { id: 2, name: "brunch", is_system: false },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: mockUserCategories, error: null }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await getCategoriesWithPreferences("en");

      expect(result).toEqual([
        { value: "all", label: "All Recipes", isSystem: true },
        {
          value: "brunch",
          label: "brunch",
          isSystem: false,
          id: 2,
          isVisible: true,
          order: 1,
        },
      ]);
    });

    test("sorts categories by display_order correctly", async () => {
      const mockUserCategories = [
        {
          category_id: 2,
          category_value: "brunch",
          is_visible: true,
          display_order: 0,
          categories: { id: 2, name: "brunch", is_system: false },
        },
        {
          category_id: 3,
          category_value: "baking",
          is_visible: true,
          display_order: 1,
          categories: { id: 3, name: "baking", is_system: false },
        },
        {
          category_id: 1,
          category_value: "dinner",
          is_visible: true,
          display_order: 2,
          categories: { id: 1, name: "dinner", is_system: false },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: mockUserCategories, error: null }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await getCategoriesWithPreferences("en");

      expect(result).toEqual([
        { value: "all", label: "All Recipes", isSystem: true },
        {
          value: "brunch",
          label: "brunch",
          isSystem: false,
          id: 2,
          isVisible: true,
          order: 0,
        },
        {
          value: "baking",
          label: "baking",
          isSystem: false,
          id: 3,
          isVisible: true,
          order: 1,
        },
        {
          value: "dinner",
          label: "dinner",
          isSystem: false,
          id: 1,
          isVisible: true,
          order: 2,
        },
      ]);
    });

    test("handles database errors gracefully", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };

      supabase.from.mockReturnValue(mockQuery);

      await expect(getCategoriesWithPreferences("en")).rejects.toThrow(
        "Error fetching user categories: Database error"
      );
    });

    test("falls back to alphabetical order for categories with same display_order", async () => {
      const mockUserCategories = [
        {
          category_id: 1,
          category_value: "zebra",
          is_visible: true,
          display_order: 0,
          categories: { id: 1, name: "zebra", is_system: false },
        },
        {
          category_id: 2,
          category_value: "apple",
          is_visible: true,
          display_order: 0,
          categories: { id: 2, name: "apple", is_system: false },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi
          .fn()
          .mockResolvedValue({ data: mockUserCategories, error: null }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await getCategoriesWithPreferences("en");

      // Should be sorted alphabetically when display_order is the same
      expect(result[1].value).toBe("apple"); // Comes before zebra alphabetically
      expect(result[2].value).toBe("zebra");
    });
  });
});
