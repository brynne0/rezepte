import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("pluralize", () => ({
  default: { isPlural: vi.fn() },
}));

vi.mock("../lib/supabase", () => ({
  default: {
    from: vi.fn(),
  },
}));

import supabase from "../lib/supabase";
import { setRecipePrivate } from "./recipes";

describe("setRecipePrivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("updates the recipe's private column", async () => {
    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    supabase.from.mockReturnValue(mockQuery);

    const result = await setRecipePrivate("recipe-1", true);

    expect(supabase.from).toHaveBeenCalledWith("recipes");
    expect(mockQuery.update).toHaveBeenCalledWith({ private: true });
    expect(mockQuery.eq).toHaveBeenCalledWith("id", "recipe-1");
    expect(result).toBe(true);
  });

  test("throws when the update fails", async () => {
    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
    };
    supabase.from.mockReturnValue(mockQuery);

    await expect(setRecipePrivate("recipe-1", false)).rejects.toThrow(
      "Update failed"
    );
  });
});
