import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CategoriesTab from "./CategoriesTab";

// Mock supabase
vi.mock("../../lib/supabase", () => ({
  default: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock services
vi.mock("../../services/categoryPreferencesService", () => ({
  getAllCategoriesForManagement: vi.fn(),
  saveUserCategoryPreferences: vi.fn(),
}));

vi.mock("../../services/categoriesService", () => ({
  createCategory: vi.fn(),
  updateCategoryName: vi.fn(),
}));

// Mock components
vi.mock("../../components/LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

vi.mock("../../components/ConfirmationModal/ConfirmationModal", () => ({
  default: function ConfirmationModal({ isOpen, onClose, onConfirm, message }) {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-modal">
        <p>{message}</p>
        <button onClick={onClose} data-testid="modal-cancel">
          Cancel
        </button>
        <button onClick={onConfirm} data-testid="modal-confirm">
          Confirm
        </button>
      </div>
    );
  },
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && typeof options === "object") {
        return `${key}_${JSON.stringify(options)}`;
      }
      return key;
    },
    i18n: {
      language: "en",
    },
  }),
}));

describe("CategoriesTab - Adding Categories", () => {
  let mockGetAllCategoriesForManagement;
  let mockSaveUserCategoryPreferences;
  let mockCreateCategory;
  let mockSupabase;
  let mockUser = { id: "user-123" };

  const mockProps = {
    t: (key) => key,
    saveMessage: "",
    setSaveMessage: vi.fn(),
    onUnsavedChangesChange: vi.fn(),
    refreshCategories: vi.fn(),
    resetCategoryFilter: vi.fn(),
  };

  const mockExistingCategories = [
    {
      id: "1",
      value: "dinner",
      label: "Dinner",
      isSystem: true,
      isVisible: true,
      order: 0,
    },
    {
      id: "2",
      value: "lunch",
      label: "Lunch",
      isSystem: true,
      isVisible: true,
      order: 1,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked modules
    const categoryPreferencesService = await import(
      "../../services/categoryPreferencesService"
    );
    const categoriesService = await import("../../services/categoriesService");
    const supabase = await import("../../lib/supabase");

    mockGetAllCategoriesForManagement =
      categoryPreferencesService.getAllCategoriesForManagement;
    mockSaveUserCategoryPreferences =
      categoryPreferencesService.saveUserCategoryPreferences;
    mockCreateCategory = categoriesService.createCategory;
    mockSupabase = supabase.default;

    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
    mockGetAllCategoriesForManagement.mockResolvedValue(mockExistingCategories);
    mockSaveUserCategoryPreferences.mockResolvedValue([]);
    mockCreateCategory.mockResolvedValue({ id: "3", name: "breakfast" });

    // Setup supabase query mocks for database category checks
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue({ message: "No rows" }), // Default: category doesn't exist
    };
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe("Add Category Button", () => {
    it("renders add category button", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });
    });

    it("shows temporary category input when add button is clicked", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("add_category"));

      expect(screen.getByPlaceholderText("category_name")).toBeInTheDocument();
      expect(screen.queryByText("add_category")).not.toBeInTheDocument();
    });

    it("focuses input field when adding new category", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("add_category"));

      const input = screen.getByPlaceholderText("category_name");
      expect(input).toHaveFocus();
    });
  });

  describe("Category Input Validation", () => {
    beforeEach(async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("add_category"));
    });

    it("shows error when trying to save empty category name", async () => {
      const saveButton = screen.getByRole("button", { name: "save_changes" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("category_name_required")).toBeInTheDocument();
      });
    });

    it("shows error when trying to add duplicate local category", async () => {
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Dinner" } });

      const saveButton = screen.getByRole("button", { name: "save_changes" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText("category_name_already_exists")
        ).toBeInTheDocument();
      });
    });

    it("clears error when user starts typing", async () => {
      const input = screen.getByPlaceholderText("category_name");

      // First trigger an error
      const saveButton = screen.getByRole("button", { name: "save_changes" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("category_name_required")).toBeInTheDocument();
      });

      // Then start typing
      fireEvent.change(input, { target: { value: "New Category" } });

      expect(
        screen.queryByText("category_name_required")
      ).not.toBeInTheDocument();
    });
  });

  describe("Database Category Detection", () => {
    it("adds existing database category to user preferences when found", async () => {
      // Mock finding existing category in database
      const existingCategory = {
        id: "4",
        name: "snacks",
        is_system: false,
        translated_category: { en: "Snacks" },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: existingCategory }),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("add_category"));

      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "snacks" } });

      const saveButton = screen.getByRole("button", { name: "save_changes" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith("categories");
        expect(screen.getByText("Snacks")).toBeInTheDocument();
      });

      // Should not show add button anymore (not in adding mode)
      expect(screen.getByText("add_category")).toBeInTheDocument();
    });

    it("creates new temporary category when not found in database", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("add_category"));

      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "New Category" } });

      const saveButton = screen.getByRole("button", { name: "save_changes" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("New Category")).toBeInTheDocument();
      });

      // Should exit adding mode
      expect(screen.getByText("add_category")).toBeInTheDocument();
    });
  });

  describe("Category Management Actions", () => {
    beforeEach(async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("add_category"));
    });

    it("saves category with check button", async () => {
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });

      const saveButton = screen.getByRole("button", { name: "save_changes" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      expect(mockProps.onUnsavedChangesChange).toHaveBeenCalledWith(true);
    });

    it("cancels adding category with X button", () => {
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });

      const cancelButton = screen.getByRole("button", { name: "cancel" });
      fireEvent.click(cancelButton);

      expect(
        screen.queryByPlaceholderText("category_name")
      ).not.toBeInTheDocument();
      expect(screen.getByText("add_category")).toBeInTheDocument();
    });

    it("handles Enter key to save category", async () => {
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });
    });

    it("handles Escape key to cancel adding", () => {
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(
        screen.queryByPlaceholderText("category_name")
      ).not.toBeInTheDocument();
      expect(screen.getByText("add_category")).toBeInTheDocument();
    });
  });

  describe("Multiple Category Addition", () => {
    it("can add multiple categories in one session", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Add first category
      fireEvent.click(screen.getByText("add_category"));
      const input1 = screen.getByPlaceholderText("category_name");
      fireEvent.change(input1, { target: { value: "Breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      // Add second category
      fireEvent.click(screen.getByText("add_category"));
      const input2 = screen.getByPlaceholderText("category_name");
      fireEvent.change(input2, { target: { value: "Snacks" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Snacks")).toBeInTheDocument();
      });

      expect(screen.getAllByText(/Breakfast|Snacks/)).toHaveLength(2);
    });

    it("prevents duplicate categories in same session", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Add first category
      fireEvent.click(screen.getByText("add_category"));
      let input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      // Try to add same category again
      fireEvent.click(screen.getByText("add_category"));
      input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(
          screen.getByText("category_name_already_exists")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Category Persistence", () => {
    it("creates categories in database when preferences are saved", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Add a new category
      fireEvent.click(screen.getByText("add_category"));
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      // Save preferences
      const savePrefsButton = screen.getByText("save_category_preferences");
      fireEvent.click(savePrefsButton);

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith("breakfast", {
          en: "Breakfast",
        });
      });

      await waitFor(() => {
        expect(mockSaveUserCategoryPreferences).toHaveBeenCalled();
        expect(mockProps.refreshCategories).toHaveBeenCalled();
        expect(mockProps.resetCategoryFilter).toHaveBeenCalled();
      });
    });

    it("shows success message after saving", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Add and save category
      fireEvent.click(screen.getByText("add_category"));
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      const savePrefsButton = screen.getByText("save_category_preferences");
      fireEvent.click(savePrefsButton);

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalled();
        expect(mockProps.setSaveMessage).toHaveBeenCalledWith(
          "category_preferences_saved"
        );
      });
    });

    it("handles creation errors gracefully", async () => {
      mockCreateCategory.mockRejectedValue(new Error("Database error"));

      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Add a category
      fireEvent.click(screen.getByText("add_category"));
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      // Try to save preferences
      const savePrefsButton = screen.getByText("save_category_preferences");
      fireEvent.click(savePrefsButton);

      await waitFor(() => {
        expect(mockProps.setSaveMessage).toHaveBeenCalledWith(
          "category_preferences_error"
        );
      });
    });
  });

  describe("UI State Management", () => {
    it("notifies parent of unsaved changes when adding category", async () => {
      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Initially no unsaved changes
      expect(mockProps.onUnsavedChangesChange).toHaveBeenCalledWith(false);

      // Start adding category
      fireEvent.click(screen.getByText("add_category"));

      expect(mockProps.onUnsavedChangesChange).toHaveBeenCalledWith(true);
    });

    it("shows loading state during operations", async () => {
      mockCreateCategory.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<CategoriesTab {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText("add_category")).toBeInTheDocument();
      });

      // Add category and save preferences
      fireEvent.click(screen.getByText("add_category"));
      const input = screen.getByPlaceholderText("category_name");
      fireEvent.change(input, { target: { value: "Breakfast" } });
      fireEvent.click(screen.getByRole("button", { name: "save_changes" }));

      await waitFor(() => {
        expect(screen.getByText("Breakfast")).toBeInTheDocument();
      });

      const savePrefsButton = screen.getByText("save_category_preferences");
      fireEvent.click(savePrefsButton);

      // Should show saving state
      expect(screen.getByText("saving")).toBeInTheDocument();
    });
  });
});
