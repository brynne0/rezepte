import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AddToMyRecipesModal from "./AddToMyRecipesModal";

vi.mock("@/hooks/data/useCategories", () => ({
  useCategories: () => ({
    categories: [
      { value: "all_recipes", label: "All Recipes" },
      { value: "desserts", label: "Desserts" },
    ],
  }),
}));

describe("AddToMyRecipesModal", () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
    onConfirm.mockClear();
  });

  it("does not render its content when closed", () => {
    render(
      <AddToMyRecipesModal
        open={false}
        onOpenChange={onOpenChange}
        isSaving={false}
        onConfirm={onConfirm}
      />
    );

    expect(
      screen.queryByText("add_to_my_recipes_modal_title")
    ).not.toBeInTheDocument();
  });

  it("renders the category picker and a helper message when nothing is selected", () => {
    render(
      <AddToMyRecipesModal
        open={true}
        onOpenChange={onOpenChange}
        isSaving={false}
        onConfirm={onConfirm}
      />
    );

    expect(
      screen.getByText("add_to_my_recipes_modal_title")
    ).toBeInTheDocument();
    expect(screen.getByText("Desserts")).toBeInTheDocument();
    expect(
      screen.getByText("add_to_my_recipes_select_category")
    ).toBeInTheDocument();
  });

  it("disables the save button until a category is selected", () => {
    render(
      <AddToMyRecipesModal
        open={true}
        onOpenChange={onOpenChange}
        isSaving={false}
        onConfirm={onConfirm}
      />
    );

    const saveButton = screen.getByRole("button", {
      name: "add_to_my_recipes",
    });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByText("Desserts"));

    expect(saveButton).not.toBeDisabled();
  });

  it("calls onConfirm with the selected category names", () => {
    render(
      <AddToMyRecipesModal
        open={true}
        onOpenChange={onOpenChange}
        isSaving={false}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByText("Desserts"));
    fireEvent.click(screen.getByRole("button", { name: "add_to_my_recipes" }));

    expect(onConfirm).toHaveBeenCalledWith(["desserts"]);
  });

  it("disables cancel and save while saving", () => {
    render(
      <AddToMyRecipesModal
        open={true}
        onOpenChange={onOpenChange}
        isSaving={true}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole("button", { name: "cancel" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /add_to_my_recipes/ })
    ).toBeDisabled();
  });

  it("calls onOpenChange when cancelled", () => {
    render(
      <AddToMyRecipesModal
        open={true}
        onOpenChange={onOpenChange}
        isSaving={false}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByText("Desserts"));
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
