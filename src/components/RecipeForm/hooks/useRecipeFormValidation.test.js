import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipeFormValidation } from "./useRecipeFormValidation";
import {
  validateRecipeForm,
  validateRecipeTitleUnique,
} from "../../../utils/validation";

vi.mock("../../../utils/validation", () => ({
  validateRecipeForm: vi.fn(),
  validateRecipeTitleUnique: vi.fn(),
}));

vi.mock("../../../utils/stringUtils", () => ({
  toTitleCase: (s) => s,
}));

const setup = ({ formData, initialRecipe = null } = {}) => {
  let validationErrors = {};
  const setValidationErrors = vi.fn((updater) => {
    validationErrors =
      typeof updater === "function" ? updater(validationErrors) : updater;
  });

  const { result, rerender } = renderHook(() =>
    useRecipeFormValidation({
      formData: formData ?? { title: "Soup" },
      setValidationErrors,
      initialRecipe,
    })
  );

  return { result, rerender, getValidationErrors: () => validationErrors };
};

describe("useRecipeFormValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleTitleBlur", () => {
    test("does nothing when the title is blank", async () => {
      const { result } = setup({ formData: { title: "   " } });

      await act(async () => {
        await result.current.handleTitleBlur();
      });

      expect(validateRecipeTitleUnique).not.toHaveBeenCalled();
    });

    test("sets a title error when the title is not unique", async () => {
      validateRecipeTitleUnique.mockResolvedValue("title_already_exists");
      const { result, getValidationErrors, rerender } = setup({
        formData: { title: "Soup" },
      });

      await act(async () => {
        await result.current.handleTitleBlur();
      });
      rerender();

      expect(validateRecipeTitleUnique).toHaveBeenCalledWith(
        "Soup",
        expect.any(Function),
        null
      );
      expect(getValidationErrors().title).toBe("title_already_exists");
    });

    test("does not set an error when the title is unique", async () => {
      validateRecipeTitleUnique.mockResolvedValue(null);
      const { result, getValidationErrors, rerender } = setup({
        formData: { title: "Soup" },
      });

      await act(async () => {
        await result.current.handleTitleBlur();
      });
      rerender();

      expect(getValidationErrors()).toEqual({});
    });

    test("passes the initialRecipe id as excludeId when editing", async () => {
      validateRecipeTitleUnique.mockResolvedValue(null);
      const { result } = setup({
        formData: { title: "Soup" },
        initialRecipe: { id: "recipe-1" },
      });

      await act(async () => {
        await result.current.handleTitleBlur();
      });

      expect(validateRecipeTitleUnique).toHaveBeenCalledWith(
        "Soup",
        expect.any(Function),
        "recipe-1"
      );
    });
  });

  describe("validateForm", () => {
    test("delegates to validateRecipeForm with formData", () => {
      validateRecipeForm.mockReturnValue({ title: "title_required" });
      const formData = { title: "" };
      const { result } = setup({ formData });

      const errors = result.current.validateForm();

      expect(validateRecipeForm).toHaveBeenCalledWith(
        formData,
        expect.any(Function)
      );
      expect(errors).toEqual({ title: "title_required" });
    });
  });

  test("exposes toTitleCase", () => {
    const { result } = setup();
    expect(result.current.toTitleCase("test")).toBe("test");
  });
});
