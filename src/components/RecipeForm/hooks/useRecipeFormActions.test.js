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
  initialFormData = formData,
  initialRecipe = null,
  isEditingTranslation = false,
  recipeLanguage,
  getLanguageSuggestion,
  onRecipeLanguageChange,
  validateForm = vi.fn(() => ({})),
  recipeActionsOverrides = {},
  queryClient = createTestQueryClient(),
} = {}) => {
  const updateRecipeMock = vi.fn().mockResolvedValue({ id: initialRecipe?.id });
  useRecipeActions.mockReturnValue({
    createRecipe: vi.fn().mockResolvedValue({ id: "new-id", slug: "chili" }),
    updateRecipe: updateRecipeMock,
    updateTranslation: vi.fn().mockResolvedValue(),
    deleteRecipe: vi.fn().mockResolvedValue(),
    loading: false,
    error: null,
    ...recipeActionsOverrides,
  });

  const setFormData = vi.fn();
  const setValidationErrors = vi.fn();
  const setSubmitStatus = vi.fn();
  const setUploadingImageIds = vi.fn();
  const setInitialFormData = vi.fn();

  const { result } = renderHook(
    () =>
      useRecipeFormActions({
        formData,
        initialFormData,
        setFormData,
        setValidationErrors,
        setSubmitStatus,
        setUploadingImageIds,
        initialRecipe,
        isEditingTranslation,
        recipeLanguage,
        getLanguageSuggestion,
        onRecipeLanguageChange,
        validateForm,
        setInitialFormData,
      }),
    { wrapper: createQueryClientWrapper(queryClient) }
  );

  return {
    result,
    updateRecipeMock,
    setFormData,
    setValidationErrors,
    setSubmitStatus,
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
    test("in translation mode, sends only changed ingredient names and notes", async () => {
      const updateTranslation = vi.fn().mockResolvedValue();
      const formData = buildFormData({
        ungroupedIngredients: [
          baseIngredient({ recipe_ingredient_id: "ri1", name: "Räuchertofu" }),
          baseIngredient({ tempId: "t2", recipe_ingredient_id: "ri2" }),
        ],
        ingredientSections: [
          {
            id: "s1",
            subheading: "Sauce",
            ingredients: [
              baseIngredient({
                tempId: "t3",
                recipe_ingredient_id: "ri3",
                name: "Tomaten",
                notes: "gehackt",
              }),
            ],
          },
        ],
      });
      const { result } = setup({
        formData,
        isEditingTranslation: true,
        initialRecipe: {
          id: "recipe-1",
          ungroupedIngredients: [
            { recipe_ingredient_id: "ri1", singular_name: "Tofu" },
            { recipe_ingredient_id: "ri2", singular_name: "Tofu" },
          ],
          ingredientSections: [
            {
              id: "s1",
              ingredients: [
                {
                  recipe_ingredient_id: "ri3",
                  name_overrides: [{ language: "en", name: "Tomaten" }],
                  notes: "chopped",
                },
              ],
            },
          ],
        },
        recipeActionsOverrides: { updateTranslation },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(updateTranslation).toHaveBeenCalledWith(
        "recipe-1",
        "en",
        expect.any(Object),
        [{ recipe_ingredient_id: "ri1", name: "Räuchertofu", language: "en" }],
        [{ recipe_ingredient_id: "ri3", notes: "gehackt", language: "en" }]
      );
    });

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

    test("saves a corrected language and re-saves ingredients with it", async () => {
      const formData = buildFormData();
      const { result, updateRecipeMock } = setup({
        formData,
        initialFormData: formData,
        initialRecipe: { id: "recipe-1", original_language: "en" },
        recipeLanguage: "de",
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      const [, payload] = updateRecipeMock.mock.calls[0];
      expect(payload).toHaveProperty("original_language", "de");
      expect(payload).toHaveProperty("ungroupedIngredients");
    });

    test("leaves the language out of the update when it is unchanged", async () => {
      const { result, updateRecipeMock } = setup({
        initialRecipe: { id: "recipe-1", original_language: "en" },
        recipeLanguage: "en",
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      const [, payload] = updateRecipeMock.mock.calls[0];
      expect(payload).not.toHaveProperty("original_language");
    });

    test("omits ingredients and categories from the update payload when unchanged", async () => {
      const formData = buildFormData();
      const { result, updateRecipeMock } = setup({
        formData,
        initialFormData: formData,
        initialRecipe: { id: "recipe-1" },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      const [, payload] = updateRecipeMock.mock.calls[0];
      expect(payload).not.toHaveProperty("ungroupedIngredients");
      expect(payload).not.toHaveProperty("ingredientSections");
      expect(payload).not.toHaveProperty("categories");
    });

    test("includes ingredients and categories in the update payload when changed", async () => {
      const initialFormData = buildFormData();
      const formData = buildFormData({
        categories: ["Dinner", "Vegan"],
        ungroupedIngredients: [baseIngredient({ name: "Seitan" })],
      });
      const { result, updateRecipeMock } = setup({
        formData,
        initialFormData,
        initialRecipe: { id: "recipe-1" },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      const [, payload] = updateRecipeMock.mock.calls[0];
      expect(payload).toHaveProperty("ungroupedIngredients");
      expect(payload).toHaveProperty("categories", ["Dinner", "Vegan"]);
    });

    test("treats reordered categories as unchanged", async () => {
      const formData = buildFormData({ categories: ["Dinner", "Vegan"] });
      const initialFormData = buildFormData({
        categories: ["Vegan", "Dinner"],
      });
      const { result, updateRecipeMock } = setup({
        formData,
        initialFormData,
        initialRecipe: { id: "recipe-1" },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      const [, payload] = updateRecipeMock.mock.calls[0];
      expect(payload).not.toHaveProperty("categories");
    });

    test("shows a toast when saving fails", async () => {
      const updateRecipe = vi.fn().mockRejectedValue(new Error("boom"));
      const { result } = setup({
        initialRecipe: { id: "recipe-1" },
        recipeActionsOverrides: { updateRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "recipe_update_error",
        type: "error",
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("saves a new recipe in the language picked on the form", async () => {
      const createRecipe = vi.fn().mockResolvedValue({ id: "new-id" });
      const { result } = setup({
        recipeLanguage: "de",
        recipeActionsOverrides: { createRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ original_language: "de" }),
        expect.any(Function)
      );
    });

    describe("language check", () => {
      test("asks before saving when the text looks like another language", async () => {
        const createRecipe = vi.fn().mockResolvedValue({ id: "new-id" });
        const { result } = setup({
          recipeLanguage: "en",
          getLanguageSuggestion: () => "de",
          recipeActionsOverrides: { createRecipe },
        });

        await act(async () => {
          await result.current.handleSubmit(fakeSubmitEvent());
        });

        expect(result.current.languageSuggestion).toBe("de");
        expect(createRecipe).not.toHaveBeenCalled();
      });

      test("saves in the suggested language when accepted", async () => {
        const createRecipe = vi.fn().mockResolvedValue({ id: "new-id" });
        const onRecipeLanguageChange = vi.fn();
        const { result } = setup({
          recipeLanguage: "en",
          getLanguageSuggestion: () => "de",
          onRecipeLanguageChange,
          recipeActionsOverrides: { createRecipe },
        });

        await act(async () => {
          await result.current.handleSubmit(fakeSubmitEvent());
        });
        await act(async () => {
          await result.current.resolveLanguageSuggestion(true);
        });

        expect(onRecipeLanguageChange).toHaveBeenCalledWith("de");
        expect(createRecipe).toHaveBeenCalledWith(
          expect.objectContaining({ original_language: "de" }),
          expect.any(Function)
        );
      });

      test("keeps the chosen language when declined, and doesn't ask again", async () => {
        const createRecipe = vi.fn().mockResolvedValue({ id: "new-id" });
        const getLanguageSuggestion = vi.fn(() => "de");
        const { result } = setup({
          recipeLanguage: "en",
          getLanguageSuggestion,
          recipeActionsOverrides: { createRecipe },
        });

        await act(async () => {
          await result.current.handleSubmit(fakeSubmitEvent());
        });
        await act(async () => {
          await result.current.resolveLanguageSuggestion(false);
        });

        expect(createRecipe).toHaveBeenCalledWith(
          expect.objectContaining({ original_language: "en" }),
          expect.any(Function)
        );

        await act(async () => {
          await result.current.handleSubmit(fakeSubmitEvent());
        });
        expect(getLanguageSuggestion).toHaveBeenCalledTimes(1);
      });
    });

    test("falls back to the app language when no recipe language is given", async () => {
      const createRecipe = vi.fn().mockResolvedValue({ id: "new-id" });
      const { result } = setup({ recipeActionsOverrides: { createRecipe } });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(createRecipe).toHaveBeenCalledWith(
        expect.objectContaining({ original_language: "en" }),
        expect.any(Function)
      );
    });

    test("shows a duplicate-title validation error and scrolls to the field instead of a toast", async () => {
      const createRecipe = vi
        .fn()
        .mockRejectedValue(
          new Error(
            'duplicate key value violates unique constraint "unique_user_recipe_title"'
          )
        );
      const { result, setValidationErrors } = setup({
        recipeActionsOverrides: { createRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setValidationErrors).toHaveBeenCalledWith({
        title: "title_already_exists",
      });
      expect(mockToastAdd).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("shows an offline-specific toast when creating fails because the device is offline", async () => {
      const createRecipe = vi.fn().mockRejectedValue(new Error("offline"));
      const { result } = setup({
        recipeActionsOverrides: { createRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "action_requires_internet",
        type: "error",
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test("shows an offline-specific toast when updating fails because the device is offline", async () => {
      const updateRecipe = vi.fn().mockRejectedValue(new Error("offline"));
      const { result } = setup({
        initialRecipe: { id: "recipe-1" },
        recipeActionsOverrides: { updateRecipe },
      });

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "action_requires_internet",
        type: "error",
      });
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
      const { result, setSubmitStatus, setUploadingImageIds } = setup();

      await act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

      expect(setSubmitStatus).toHaveBeenCalledWith(null);
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

  describe("more submit paths", () => {
    const submit = async (result) =>
      act(async () => {
        await result.current.handleSubmit(fakeSubmitEvent());
      });

    test("reports progress and tracks uploading images", async () => {
      const createRecipe = vi.fn(async (_data, onProgress) => {
        onProgress({ completed: 1, total: 4, phase: "recipe" });
        onProgress({
          completed: 3,
          total: 4,
          phase: "images",
          imageId: "img",
          uploading: true,
        });
        onProgress({
          completed: 4,
          total: 4,
          phase: "images",
          imageId: "img",
          uploading: false,
        });
        return { id: "new-id", slug: "chili" };
      });
      const { result, setSubmitStatus, setUploadingImageIds } = setup({
        recipeActionsOverrides: { createRecipe },
      });
      await submit(result);

      expect(setSubmitStatus).toHaveBeenCalledWith(
        expect.objectContaining({ percent: 25, phase: "recipe" })
      );
      const updaters = setUploadingImageIds.mock.calls
        .map(([u]) => u)
        .filter((u) => typeof u === "function");
      const added = updaters[0](new Set());
      expect([...added]).toEqual(["img"]);
      expect([...updaters[1](added)]).toEqual([]);
    });

    test("scrolls to and focuses the first invalid field", async () => {
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        cb();
        return 0;
      });
      document.body.innerHTML =
        '<div data-invalid="true"><input id="title" /></div>';
      const field = document.querySelector("[data-invalid]");
      field.scrollIntoView = vi.fn();

      const { result } = setup({ validateForm: () => ({ title: "x" }) });
      await submit(result);

      expect(field.scrollIntoView).toHaveBeenCalled();
      expect(document.activeElement.id).toBe("title");
      document.body.innerHTML = "";
      vi.restoreAllMocks();
    });

    test("focuses an invalid input directly, or scrolls to the top", async () => {
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        cb();
        return 0;
      });
      document.body.innerHTML =
        '<textarea aria-invalid="true" id="notes"></textarea>';
      document.querySelector("textarea").scrollIntoView = vi.fn();
      const { result } = setup({ validateForm: () => ({ notes: "x" }) });
      await submit(result);
      expect(document.activeElement.id).toBe("notes");

      document.body.innerHTML = "";
      await submit(result);
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
      vi.restoreAllMocks();
    });

    test("asks before saving without a category, then saves on confirm", async () => {
      const createRecipe = vi
        .fn()
        .mockResolvedValue({ id: "new-id", slug: "chili" });
      const { result } = setup({
        formData: buildFormData({ categories: [] }),
        recipeActionsOverrides: { createRecipe },
      });

      await submit(result);
      expect(result.current.showCategoryConfirm).toBe(true);
      expect(createRecipe).not.toHaveBeenCalled();

      act(() => result.current.cancelCategoryConfirm());
      expect(result.current.showCategoryConfirm).toBe(false);

      await act(async () => {
        await result.current.confirmSaveWithoutCategory();
      });
      expect(createRecipe).toHaveBeenCalled();
    });

    test("ignores a second submit while saving", async () => {
      const createRecipe = vi.fn();
      const { result } = setup({
        recipeActionsOverrides: { createRecipe, loading: true },
      });
      await submit(result);
      expect(createRecipe).not.toHaveBeenCalled();
    });

    test("warns when the recipe saved but its images didn't", async () => {
      const { result } = setup({
        recipeActionsOverrides: {
          createRecipe: vi.fn().mockResolvedValue({
            id: "new-id",
            slug: "chili",
            imageUpdateFailed: true,
          }),
        },
      });
      await submit(result);
      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "recipe_saved_image_failed",
        type: "error",
      });
    });

    test("keeps sections that have a subheading or a named ingredient", async () => {
      const createRecipe = vi
        .fn()
        .mockResolvedValue({ id: "new-id", slug: "chili" });
      const { result } = setup({
        formData: buildFormData({
          ingredientSections: [
            {
              id: "a",
              subheading: "Sauce",
              ingredients: [baseIngredient({ name: "" })],
            },
            {
              id: "b",
              subheading: "",
              ingredients: [baseIngredient({ tempId: "t2" })],
            },
            {
              id: "c",
              subheading: " ",
              ingredients: [baseIngredient({ name: " " })],
            },
          ],
        }),
        recipeActionsOverrides: { createRecipe },
      });
      await submit(result);
      expect(
        createRecipe.mock.calls[0][0].ingredientSections.map((s) => s.id)
      ).toEqual(["a", "b"]);
    });
  });
});
