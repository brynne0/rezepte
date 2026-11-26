import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../../services/recipes", () => ({ fetchRecipes: vi.fn() }));
vi.mock("../../../services/recipeTranslationService", () => ({
  getTranslatedRecipeTitle: vi.fn(async (recipe, lang) => ({
    ...recipe,
    title: `${recipe.title} (${lang})`,
  })),
}));

import { fetchRecipes } from "../../../services/recipes";
import RecipeLinkDropdown from "./RecipeLinkDropdown";

const recipes = [
  { id: "1", title: "Pesto" },
  { id: "2", title: "Pasta" },
  { id: "3", title: "Current" },
];

const renderDropdown = (props = {}) => {
  const onClose = vi.fn();
  const onSelectRecipe = vi.fn();
  const utils = render(
    <RecipeLinkDropdown
      isOpen
      onClose={onClose}
      onSelectRecipe={onSelectRecipe}
      currentRecipeId="3"
      {...props}
    />
  );
  return { ...utils, onClose, onSelectRecipe };
};

describe("RecipeLinkDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchRecipes.mockResolvedValue(recipes);
  });

  test("lists translated recipes except the current one", async () => {
    renderDropdown();
    expect(screen.getByText("loading_recipes")).toBeInTheDocument();
    expect(await screen.findByText("Pesto (en)")).toBeInTheDocument();
    expect(screen.getByText("Pasta (en)")).toBeInTheDocument();
    expect(screen.queryByText(/Current/)).toBeNull();
  });

  test("filters by search term and shows a no-match message", async () => {
    renderDropdown();
    await screen.findByText("Pesto (en)");
    const search = screen.getByPlaceholderText("search_recipes");

    fireEvent.change(search, { target: { value: "PAS" } });
    expect(screen.queryByText("Pesto (en)")).toBeNull();
    expect(screen.getByText("Pasta (en)")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText("no_recipes_found")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: " " } });
    expect(screen.getByText("Pesto (en)")).toBeInTheDocument();
  });

  test("selecting a recipe links it and closes", async () => {
    const { onSelectRecipe, onClose } = renderDropdown();
    fireEvent.click(await screen.findByText("Pasta (en)"));
    expect(onSelectRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2" })
    );
    expect(onClose).toHaveBeenCalled();
  });

  test("shows an empty state when loading fails", async () => {
    fetchRecipes.mockRejectedValue(new Error("offline"));
    renderDropdown();
    expect(await screen.findByText("no_recipes_available")).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  test("closes on Escape and resets when reopened", async () => {
    const { onClose, rerender } = renderDropdown();
    await screen.findByText("Pesto (en)");
    fireEvent.change(screen.getByPlaceholderText("search_recipes"), {
      target: { value: "pas" },
    });

    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    rerender(
      <RecipeLinkDropdown
        isOpen={false}
        onClose={onClose}
        onSelectRecipe={vi.fn()}
      />
    );
    rerender(
      <RecipeLinkDropdown isOpen onClose={onClose} onSelectRecipe={vi.fn()} />
    );
    expect(await screen.findByPlaceholderText("search_recipes")).toHaveValue(
      ""
    );
  });
});
