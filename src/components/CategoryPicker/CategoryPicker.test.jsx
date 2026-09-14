import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CategoryPicker from "./CategoryPicker";

const categories = [
  { value: "all_recipes", label: "All Recipes" },
  { value: "desserts", label: "Desserts" },
  { value: "main-dishes", label: "Main Dishes" },
];

describe("CategoryPicker", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it("renders category chips excluding all_recipes", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={[]}
        onChange={onChange}
      />
    );

    expect(screen.queryByText("All Recipes")).not.toBeInTheDocument();
    expect(screen.getByText("Desserts")).toBeInTheDocument();
    expect(screen.getByText("Main Dishes")).toBeInTheDocument();
  });

  it("marks selected categories as pressed", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={["desserts"]}
        onChange={onChange}
      />
    );

    expect(screen.getByText("Desserts").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("Main Dishes").closest("button")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onChange with the toggled selection when a chip is clicked", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={["desserts"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("Main Dishes"));

    expect(onChange.mock.calls[0][0]).toEqual(["desserts", "main-dishes"]);
  });

  it("shows an input for a new category name when add_category is clicked", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("add_category"));

    expect(screen.getByPlaceholderText("category_name")).toBeInTheDocument();
  });

  it("adds the typed category to the selection without calling any service", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={["desserts"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("add_category"));
    fireEvent.change(screen.getByPlaceholderText("category_name"), {
      target: { value: "Brunch" },
    });
    fireEvent.click(screen.getByText("add_category"));

    expect(screen.getByText("Brunch")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(["desserts", "Brunch"]);
  });

  it("shows a required error when saving an empty category name", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("add_category"));
    fireEvent.click(screen.getByText("add_category"));

    expect(screen.getByText("category_name_required")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a duplicate error when the category name already exists", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("add_category"));
    fireEvent.change(screen.getByPlaceholderText("category_name"), {
      target: { value: "Desserts" },
    });
    fireEvent.click(screen.getByText("add_category"));

    expect(
      screen.getByText("category_name_already_exists")
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels the add-category flow on Escape", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={[]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText("add_category"));
    const input = screen.getByPlaceholderText("category_name");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByPlaceholderText("category_name")
    ).not.toBeInTheDocument();
  });

  it("hides the add-category control and disables toggles when disabled", () => {
    render(
      <CategoryPicker
        categories={categories}
        selected={["desserts"]}
        onChange={onChange}
        disabled
      />
    );

    expect(screen.queryByText("add_category")).not.toBeInTheDocument();
    expect(screen.getByText("Desserts").closest("button")).toBeDisabled();
  });
});
