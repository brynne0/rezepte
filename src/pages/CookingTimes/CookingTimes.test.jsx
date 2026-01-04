import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CookingTimes from "./CookingTimes";
import * as cookingTimesService from "../../services/cookingTimesService";
import * as userService from "../../services/userService";

// Mock services
vi.mock("../../services/cookingTimesService");
vi.mock("../../services/userService");

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: {
      language: "en",
      changeLanguage: vi.fn(),
    },
  }),
}));

vi.mock("../../components/LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

vi.mock("../../components/ConversionsTab/ConversionsTab", () => ({
  default: () => <div data-testid="conversions-tab">Conversions</div>,
}));

vi.mock("../../components/CookingTimeRow/CookingTimeRow", () => ({
  default: ({ item, isEditMode, handleItemChange, sectionId }) => (
    <div data-testid={`cooking-time-${item.tempId || item.id}`}>
      {isEditMode ? (
        <input
          data-testid={`ingredient-name-${item.tempId || item.id}`}
          value={item.ingredient_name}
          onChange={(e) =>
            handleItemChange?.(
              sectionId,
              item.tempId,
              "ingredient_name",
              e.target.value
            )
          }
        />
      ) : (
        <span>{item.ingredient_name}</span>
      )}
    </div>
  ),
}));

// Mock drag and drop library
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) =>
    children(
      {
        innerRef: vi.fn(),
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({ children, draggableId }) =>
    children(
      {
        innerRef: vi.fn(),
        draggableProps: { "data-draggable-id": draggableId },
        dragHandleProps: {},
      },
      { isDragging: false }
    ),
}));

describe("CookingTimes", () => {
  const mockCookingTimesData = [
    {
      id: 1,
      ingredient_name: "Brown Rice",
      cooking_time: 45,
      soaking_time: 30,
      dry_weight: 100,
      cooked_weight: 300,
      notes: "Simmer covered",
      section_name: "Grains",
      order_index: 0,
    },
    {
      id: 2,
      ingredient_name: "Red Lentils",
      cooking_time: 20,
      soaking_time: null,
      dry_weight: 100,
      cooked_weight: 250,
      notes: null,
      section_name: "Legumes",
      order_index: 1,
    },
    {
      id: 3,
      ingredient_name: "Quinoa",
      cooking_time: 15,
      soaking_time: null,
      dry_weight: 100,
      cooked_weight: 300,
      notes: null,
      section_name: null,
      order_index: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cookingTimesService.getTranslatedCookingTimes.mockResolvedValue(
      mockCookingTimesData
    );
    userService.getUserPreferredLanguage.mockResolvedValue("en");
  });

  const renderComponent = (props = {}) => {
    return render(
      <MemoryRouter>
        <CookingTimes isEditMode={false} setIsEditMode={vi.fn()} {...props} />
      </MemoryRouter>
    );
  };

  describe("Loading State", () => {
    it("should show loading spinner while fetching data", () => {
      cookingTimesService.getTranslatedCookingTimes.mockImplementation(
        () => new Promise(() => {})
      );
      renderComponent();
      expect(screen.getByTestId("loading-acorn")).toBeInTheDocument();
    });
  });

  describe("Tab Navigation", () => {
    it("should render cooking times tab by default", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      });
    });

    it("should switch to conversions tab when clicked", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      });

      const conversionsTab = screen.getByText("conversions_tab");
      fireEvent.click(conversionsTab);

      expect(screen.getByTestId("conversions-tab")).toBeInTheDocument();
    });
  });

  describe("Category Filtering", () => {
    it("should display all category filter chips", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });

      expect(screen.getAllByText("Grains").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Legumes").length).toBeGreaterThan(0);
    });

    it("should filter cooking times by selected category", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      });

      const grainsChips = screen.getAllByText("Grains");
      fireEvent.click(grainsChips[0]);

      expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      expect(screen.queryByText("Red Lentils")).not.toBeInTheDocument();
    });

    it("should show all items including ungrouped when All is selected", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      });

      // All items should be visible including ungrouped
      expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      expect(screen.getByText("Red Lentils")).toBeInTheDocument();
      expect(screen.getByText("Quinoa")).toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    it("should show add section button in edit mode", async () => {
      renderComponent({ isEditMode: true });

      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });
    });

    it("should show add cooking time buttons in edit mode", async () => {
      renderComponent({ isEditMode: true });

      await waitFor(() => {
        const addButtons = screen.getAllByTestId(/add.*cooking-time-btn/);
        expect(addButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no cooking times exist", async () => {
      cookingTimesService.getTranslatedCookingTimes.mockResolvedValue([]);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("No cooking times yet")).toBeInTheDocument();
      });
    });

    it("should show add button in empty state", async () => {
      cookingTimesService.getTranslatedCookingTimes.mockResolvedValue([]);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("add_first_cooking_time")).toBeInTheDocument();
      });
    });
  });

  describe("Section Organization", () => {
    it("should display ungrouped items", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Quinoa")).toBeInTheDocument();
      });
    });
  });

  describe("Back Navigation", () => {
    it("should switch to cooking times tab when back is clicked on conversions tab", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      });

      // Switch to conversions tab
      const conversionsTab = screen.getByText("conversions_tab");
      fireEvent.click(conversionsTab);

      expect(screen.getByTestId("conversions-tab")).toBeInTheDocument();

      // Click back
      const backButton = screen.getByLabelText("Go Back");
      fireEvent.click(backButton);

      // Should be back on cooking times tab
      await waitFor(() => {
        expect(screen.getByText("Brown Rice")).toBeInTheDocument();
      });
    });
  });

  describe("Save and Cancel", () => {
    it("should show save and cancel buttons in edit mode", async () => {
      renderComponent({ isEditMode: true });

      await waitFor(() => {
        expect(screen.getByText("cancel")).toBeInTheDocument();
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
      });
    });

    it("should call setIsEditMode(false) when cancel is clicked", async () => {
      const setIsEditMode = vi.fn();
      cookingTimesService.getTranslatedCookingTimes.mockResolvedValue(
        mockCookingTimesData
      );
      renderComponent({ isEditMode: true, setIsEditMode });

      await waitFor(() => {
        expect(screen.getByText("cancel")).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("cancel");
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(setIsEditMode).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("Edit Button Visibility", () => {
    it("should show edit button when cooking times exist and not in edit mode", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText("Edit Mode")).toBeInTheDocument();
      });
    });

    it("should not show edit button when no cooking times exist", async () => {
      cookingTimesService.getTranslatedCookingTimes.mockResolvedValue([]);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("No cooking times yet")).toBeInTheDocument();
      });

      expect(screen.queryByLabelText("Edit Mode")).not.toBeInTheDocument();
    });
  });

  describe("Unsaved Changes Warning", () => {
    it("should not show warning when exiting edit mode without changes", async () => {
      const setIsEditMode = vi.fn();
      renderComponent({ isEditMode: true, setIsEditMode });

      // Wait for data to load - look for add section button instead
      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByLabelText("Go Back");
      fireEvent.click(backButton);

      // Should exit edit mode immediately without showing modal
      await waitFor(() => {
        expect(setIsEditMode).toHaveBeenCalledWith(false);
      });

      // Modal should not appear
      expect(
        screen.queryByText("unsaved_changes_warning")
      ).not.toBeInTheDocument();
    });

    it("should show warning when clicking back with unsaved changes", async () => {
      const setIsEditMode = vi.fn();
      renderComponent({ isEditMode: true, setIsEditMode });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });

      // Find first ingredient input
      const ingredientInputs = screen.getAllByTestId(/ingredient-name-/);
      fireEvent.change(ingredientInputs[0], {
        target: { value: "White Rice" },
      });

      // Click back button
      const backButton = screen.getByLabelText("Go Back");
      fireEvent.click(backButton);

      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText("unsaved_changes_warning")).toBeInTheDocument();
      });

      // Should not have exited edit mode yet
      expect(setIsEditMode).not.toHaveBeenCalled();
    });

    it("should exit edit mode when confirming unsaved changes warning", async () => {
      const setIsEditMode = vi.fn();
      renderComponent({ isEditMode: true, setIsEditMode });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });

      // Find first ingredient input and make a change
      const ingredientInputs = screen.getAllByTestId(/ingredient-name-/);
      fireEvent.change(ingredientInputs[0], {
        target: { value: "White Rice" },
      });

      // Click back button
      const backButton = screen.getByLabelText("Go Back");
      fireEvent.click(backButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText("unsaved_changes_warning")).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByText("leave_page");
      fireEvent.click(confirmButton);

      // Should exit edit mode
      await waitFor(() => {
        expect(setIsEditMode).toHaveBeenCalledWith(false);
      });
    });

    it("should stay in edit mode when canceling unsaved changes warning", async () => {
      const setIsEditMode = vi.fn();
      renderComponent({ isEditMode: true, setIsEditMode });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });

      // Find first ingredient input and make a change
      const ingredientInputs = screen.getAllByTestId(/ingredient-name-/);
      fireEvent.change(ingredientInputs[0], {
        target: { value: "White Rice" },
      });

      // Click back button
      const backButton = screen.getByLabelText("Go Back");
      fireEvent.click(backButton);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText("unsaved_changes_warning")).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByText("stay");
      fireEvent.click(cancelButton);

      // Should NOT exit edit mode
      await waitFor(() => {
        expect(
          screen.queryByText("unsaved_changes_warning")
        ).not.toBeInTheDocument();
      });
      expect(setIsEditMode).not.toHaveBeenCalled();
    });

    it("should show warning when clicking cancel button with unsaved changes", async () => {
      const setIsEditMode = vi.fn();
      renderComponent({ isEditMode: true, setIsEditMode });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });

      // Find first ingredient input and make a change
      const ingredientInputs = screen.getAllByTestId(/ingredient-name-/);
      fireEvent.change(ingredientInputs[0], {
        target: { value: "White Rice" },
      });

      // Click cancel button
      const cancelButton = screen.getByText("cancel");
      fireEvent.click(cancelButton);

      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText("unsaved_changes_warning")).toBeInTheDocument();
      });

      // Should not have exited edit mode yet
      expect(setIsEditMode).not.toHaveBeenCalled();
    });

    it("should not show warning when clicking cancel button without changes", async () => {
      const setIsEditMode = vi.fn();
      renderComponent({ isEditMode: true, setIsEditMode });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("add_section")).toBeInTheDocument();
      });

      // Click cancel button without making changes
      const cancelButton = screen.getByText("cancel");
      fireEvent.click(cancelButton);

      // Should exit edit mode immediately without showing modal
      await waitFor(() => {
        expect(setIsEditMode).toHaveBeenCalledWith(false);
      });

      // Modal should not appear
      expect(
        screen.queryByText("unsaved_changes_warning")
      ).not.toBeInTheDocument();
    });
  });
});
