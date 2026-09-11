import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipeFormActions } from "./useRecipeFormActions";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "../../../test-utils/queryClient";
import { useRecipeActions } from "../../../hooks/data/useRecipeActions";

const mockNavigate = vi.fn();
const { mockToastAdd } = vi.hoisted(() => ({ mockToastAdd: vi.fn() }));

vi.mock("@/components/ui/toast", () => ({
  toast: { add: mockToastAdd },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../../hooks/data/useRecipeActions", () => ({
  useRecipeActions: vi.fn(),
  OFFLINE_ERROR: "offline",
}));

const baseIngredient = (overrides = {}) => ({
  tempId: "t1",
  ingredient_id: "",
  recipe_ingredient_id: "",
  name: "Tofu",
  quantity: "1",
  unit: "block",
  notes: "",
  ...overrides,
});

const buildFormData = (overrides = {}) => ({
  title: "  Vegan Chili  ",
  categories: ["Dinner"],
  servings: "4",
  ungroupedIngredients: [baseIngredient()],
  ingredientSections: [],
  instructions: ["Simmer", ""],
  source: "  https://example.com  ",
  notes: "  tasty  ",
  images: [],
  ingredientLinks: {},
  nutrition_columns: [],
  ...overrides,
});

const setup = ({
  formData = buildFormData(),
  initialRecipe = null,
  isEditingTranslation = false,
  validateForm = vi.fn(() => ({})),
  recipeActionsOverrides = {},
  queryClient = createTestQueryClient(),
} = {}) => {
  useRecipeActions.mockReturnValue({
    createRecipe: vi.fn().mockResolvedValue({ id: "new-id", slug: "chili" }),
    updateRecipe: vi.fn().mockResolvedValue({ id: initialRecipe?.id }),
    updateTranslation: vi.fn().mockResolvedValue(),
    deleteRecipe: vi.fn().mockResolvedValue(),
    loading: false,
    error: null,
    ...recipeActionsOverrides,
  });

  const setFormData = vi.fn();
  const setSubmissionError = vi.fn();
  const setValidationErrors = vi.fn();
  const setIsUploadingImages = vi.fn();
  const setUploadProgress = vi.fn();
  const setUploadingImageIds = vi.fn();
  const setInitialFormData = vi.fn();

  const { result } = renderHook(
    () =>
      useRecipeFormActions({
        formData,
        setFormData,
        setSubmissionError,
        setValidationErrors,
        setIsUploadingImages,
        setUploadProgress,
        setUploadingImageIds,
        initialRecipe,
        isEditingTranslation,
        validateForm,
        setInitialFormData,
      }),
    { wrapper: createQueryClientWrapper(queryClient) }
  );

  return {
    result,
    setFormData,
    setSubmissionError,
    setValidationErrors,
    setIsUploadingImages,
    setUploadProgress,
    setUploadingImageIds,
    setInitialFormData,
  };
};

const fakeSubmitEvent = () => ({ preventDefault: vi.fn() });

describe("useRecipeFormActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
  });

  describe("handleImagesChange", () => {
    test("updates formData images", () => {
      const { result, setFormData } = setup();

      act(() => {
        result.current.handleImagesChange([{ id: "img1" }]);
      });

      expect(setFormData).toHaveBeenCalled();
      const updater = setFormData.mock.calls[0][0];
      expect(updater({ images: [] })).toEqual({
        images: [{ id: "img1" }],
      });
    });
  });

  describe("handleSubmit", () => {
    test("shows validation errors and does not submit when the form is invalid", async () => {
      const validateForm = vi.fn(() => ({ title: "title_required" }));
      const { result, setValidationErrors } = setup({ validateForm });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setValidationErrors).toHaveBeenCalledWith({
        title: "title_required",
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("creates a new recipe and navigates to it when there is no initialRecipe", async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(mockNavigate).toHaveBeenCalledWith("/new-id/chili", {
        replace: true,
      });
    });

    test("updates an existing recipe and navigates back in edit mode", async () => {
      const { result } = setup({
        initialRecipe: { id: "recipe-1" },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    test("sets a submission error and scrolls to top when saving fails", async () => {
      const updateRecipe = vi.fn().mockRejectedValue(new Error("boom"));
      const { result, setSubmissionError } = setup({
        initialRecipe: { id: "recipe-1" },
        recipeActionsOverrides: { updateRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setSubmissionError).toHaveBeenCalledWith("recipe_update_error");
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("shows an offline-specific error when creating fails because the device is offline", async () => {
      const createRecipe = vi.fn().mockRejectedValue(new Error("offline"));
      const { result, setSubmissionError } = setup({
        recipeActionsOverrides: { createRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setSubmissionError).toHaveBeenCalledWith(
        "action_requires_internet"
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("shows an offline-specific error when updating fails because the device is offline", async () => {
      const updateRecipe = vi.fn().mockRejectedValue(new Error("offline"));
      const { result, setSubmissionError } = setup({
        initialRecipe: { id: "recipe-1" },
        recipeActionsOverrides: { updateRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setSubmissionError).toHaveBeenCalledWith(
        "action_requires_internet"
      );
    });

    test("invalidates the categories query on a successful save", async () => {
      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = setup({ queryClient });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["categories"],
      });
    });

    test("resets upload state in a finally block after submission", async () => {
      const {
        result,
        setIsUploadingImages,
        setUploadProgress,
        setUploadingImageIds,
      } = setup();

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setIsUploadingImages).toHaveBeenCalledWith(false);
      expect(setUploadProgress).toHaveBeenCalledWith(null);
      expect(setUploadingImageIds).toHaveBeenCalledWith(new Set());
    });
  });

  describe("handleCancel", () => {
    test("navigates back", () => {
      const { result } = setup();

      act(() => {
        result.current.handleCancel();
      });

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe("handleDelete", () => {
    test("does nothing when there is no initialRecipe", async () => {
      const deleteRecipe = vi.fn();
      const { result } = setup({ recipeActionsOverrides: { deleteRecipe } });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(deleteRecipe).not.toHaveBeenCalled();
    });

    test("deletes the recipe and navigates home on success", async () => {
      const { result } = setup({ initialRecipe: { id: "recipe-1" } });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    test("shows an error toast when deletion fails", async () => {
      const deleteRecipe = vi.fn().mockRejectedValue(new Error("boom"));
      const { result } = setup({
        initialRecipe: { id: "recipe-1" },
        recipeActionsOverrides: { deleteRecipe },
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "delete_recipe_failed",
        type: "error",
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("shows an offline-specific toast when deletion fails because the device is offline", async () => {
      const deleteRecipe = vi.fn().mockRejectedValue(new Error("offline"));
      const { result } = setup({
        initialRecipe: { id: "recipe-1" },
        recipeActionsOverrides: { deleteRecipe },
      });

      await act(async () => {
        await result.current.handleDelete();
      });

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "action_requires_internet",
        type: "error",
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("isOnline", () => {
    test("exposes the current online status", () => {
      const { result } = setup();

      expect(result.current.isOnline).toBe(navigator.onLine);
    });
  });
});
