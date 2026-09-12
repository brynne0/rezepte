import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipeActions, OFFLINE_ERROR } from "./useRecipeActions";

vi.mock("../../services/recipes", () => ({
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

vi.mock("../../services/recipeTranslationService", () => ({
  updateTranslationOnly: vi.fn(),
}));

vi.mock("../ui/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "../../services/recipes";
import { updateTranslationOnly } from "../../services/recipeTranslationService";
import { useOnlineStatus } from "../ui/useOnlineStatus";

describe("useRecipeActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOnlineStatus.mockReturnValue(true);
  });

  describe("while online", () => {
    test("createRecipe delegates to the service and returns its result", async () => {
      createRecipe.mockResolvedValue({ id: "r1" });
      const { result } = renderHook(() => useRecipeActions());

      let created;
      await act(async () => {
        created = await result.current.createRecipe({ title: "Soup" });
      });

      expect(createRecipe).toHaveBeenCalledWith({ title: "Soup" }, null);
      expect(created).toEqual({ id: "r1" });
      expect(result.current.error).toBeNull();
    });

    test("updateRecipe delegates to the service", async () => {
      updateRecipe.mockResolvedValue({ id: "r1" });
      const { result } = renderHook(() => useRecipeActions());

      await act(async () => {
        await result.current.updateRecipe("r1", { title: "Soup" });
      });

      expect(updateRecipe).toHaveBeenCalledWith("r1", { title: "Soup" }, null);
    });

    test("deleteRecipe delegates to the service", async () => {
      deleteRecipe.mockResolvedValue();
      const { result } = renderHook(() => useRecipeActions());

      await act(async () => {
        await result.current.deleteRecipe("r1");
      });

      expect(deleteRecipe).toHaveBeenCalledWith("r1");
    });

    test("updateTranslation delegates to the service", async () => {
      updateTranslationOnly.mockResolvedValue();
      const { result } = renderHook(() => useRecipeActions());

      await act(async () => {
        await result.current.updateTranslation("r1", "de", { title: "Suppe" });
      });

      expect(updateTranslationOnly).toHaveBeenCalledWith(
        "r1",
        "de",
        { title: "Suppe" },
        [],
        []
      );
    });

    test("sets an error message and rethrows when the service call fails", async () => {
      createRecipe.mockRejectedValue(new Error("server exploded"));
      const { result } = renderHook(() => useRecipeActions());

      let thrown;
      await act(async () => {
        try {
          await result.current.createRecipe({ title: "Soup" });
        } catch (err) {
          thrown = err;
        }
      });

      expect(thrown.message).toBe("server exploded");
      expect(result.current.error).toBe("server exploded");
      expect(result.current.loading).toBe(false);
    });

    test("clearError resets the error state", async () => {
      createRecipe.mockRejectedValue(new Error("boom"));
      const { result } = renderHook(() => useRecipeActions());

      await act(async () => {
        await result.current.createRecipe({}).catch(() => {});
      });
      expect(result.current.error).toBe("boom");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("while offline", () => {
    beforeEach(() => {
      useOnlineStatus.mockReturnValue(false);
    });

    test("createRecipe throws OFFLINE_ERROR without calling the service", async () => {
      const { result } = renderHook(() => useRecipeActions());

      await expect(
        act(async () => {
          await result.current.createRecipe({ title: "Soup" });
        })
      ).rejects.toThrow(OFFLINE_ERROR);

      expect(createRecipe).not.toHaveBeenCalled();
    });

    test("updateRecipe throws OFFLINE_ERROR without calling the service", async () => {
      const { result } = renderHook(() => useRecipeActions());

      await expect(
        act(async () => {
          await result.current.updateRecipe("r1", { title: "Soup" });
        })
      ).rejects.toThrow(OFFLINE_ERROR);

      expect(updateRecipe).not.toHaveBeenCalled();
    });

    test("deleteRecipe throws OFFLINE_ERROR without calling the service", async () => {
      const { result } = renderHook(() => useRecipeActions());

      await expect(
        act(async () => {
          await result.current.deleteRecipe("r1");
        })
      ).rejects.toThrow(OFFLINE_ERROR);

      expect(deleteRecipe).not.toHaveBeenCalled();
    });

    test("updateTranslation throws OFFLINE_ERROR without calling the service", async () => {
      const { result } = renderHook(() => useRecipeActions());

      await expect(
        act(async () => {
          await result.current.updateTranslation("r1", "de", {});
        })
      ).rejects.toThrow(OFFLINE_ERROR);

      expect(updateTranslationOnly).not.toHaveBeenCalled();
    });

    test("does not toggle the loading state when rejected as offline", async () => {
      const { result } = renderHook(() => useRecipeActions());

      await act(async () => {
        await result.current.createRecipe({}).catch(() => {});
      });

      expect(result.current.loading).toBe(false);
    });
  });
});
