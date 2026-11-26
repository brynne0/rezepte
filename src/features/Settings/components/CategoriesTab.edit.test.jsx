import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CategoriesTab from "./CategoriesTab";
import {
  createTestQueryClient,
  createQueryClientWrapper,
} from "../../../test-utils/queryClient";

vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));
vi.mock("../../../lib/supabase", () => ({
  default: { auth: { getUser: vi.fn() }, from: vi.fn() },
}));
vi.mock("../../../services/categoriesService", async (importOriginal) => ({
  ...(await importOriginal()),
  getCategories: vi.fn(),
  saveCategoryOrder: vi.fn(),
  createCategory: vi.fn(),
  updateCategoryName: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock("../../../hooks/data/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));
vi.mock("../../../components/LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div>Loading...</div>,
}));

import {
  getCategories,
  saveCategoryOrder,
  updateCategoryName,
  deleteCategory,
} from "../../../services/categoriesService";

const categories = [
  { id: "1", value: "dinner", label: "Dinner", order: 0 },
  { id: "2", value: "lunch", label: "Lunch", order: 1 },
];

const renderTab = async () => {
  const onUnsavedChangesChange = vi.fn();
  render(
    <CategoriesTab
      t={(key) => key}
      onUnsavedChangesChange={onUnsavedChangesChange}
      resetCategoryFilter={vi.fn()}
    />,
    { wrapper: createQueryClientWrapper(createTestQueryClient()) }
  );
  await screen.findByText("Dinner");
  return { onUnsavedChangesChange };
};

const startEditing = (index = 0) => {
  fireEvent.click(screen.getAllByLabelText("edit_category_name")[index]);
  return screen.getByPlaceholderText("category_name");
};

describe("CategoriesTab editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategories.mockResolvedValue(structuredClone(categories));
    saveCategoryOrder.mockResolvedValue();
    updateCategoryName.mockResolvedValue({});
    deleteCategory.mockResolvedValue(true);
  });

  it("renames a category and saves the rename", async () => {
    const { onUnsavedChangesChange } = await renderTab();
    const input = startEditing();
    expect(input).toHaveValue("Dinner");

    fireEvent.change(input, { target: { value: "  Supper " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Supper")).toBeInTheDocument();
    expect(onUnsavedChangesChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByText("save_category_preferences"));
    await waitFor(() =>
      expect(updateCategoryName).toHaveBeenCalledWith("1", "Supper", {
        en: "Supper",
      })
    );
  });

  it("rejects an empty or duplicate name", async () => {
    await renderTab();
    const input = startEditing();

    fireEvent.change(input, { target: { value: "  " } });
    fireEvent.click(screen.getByLabelText("save_changes"));
    expect(screen.getByText("category_name_required")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "lunch" } });
    fireEvent.click(screen.getByLabelText("save_changes"));
    expect(
      screen.getByText("category_name_already_exists")
    ).toBeInTheDocument();
  });

  it("cancels an edit with Escape or the cancel button", async () => {
    await renderTab();
    let input = startEditing();
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByPlaceholderText("category_name")).toBeNull();
    expect(screen.getByText("Dinner")).toBeInTheDocument();

    input = startEditing(1);
    fireEvent.keyDown(input, { key: "a" });
    fireEvent.click(screen.getByLabelText("cancel"));
    expect(screen.queryByPlaceholderText("category_name")).toBeNull();
  });

  it("requires a name for a new category", async () => {
    await renderTab();
    fireEvent.click(screen.getByText("add_category"));
    fireEvent.click(screen.getByLabelText("save_changes"));
    expect(screen.getByText("category_name_required")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByPlaceholderText("category_name"), {
      key: "Escape",
    });
    expect(screen.queryByPlaceholderText("category_name")).toBeNull();
  });

  it("deletes a category only after confirming, then on save", async () => {
    await renderTab();

    fireEvent.click(screen.getAllByLabelText("delete_category")[0]);
    fireEvent.click(await screen.findByRole("button", { name: "cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText("Dinner")).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText("delete_category")[0]);
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("delete_category_confirmation");
    fireEvent.click(screen.getByRole("button", { name: "delete_category" }));
    await waitFor(() => expect(screen.queryByText("Dinner")).toBeNull());
    expect(deleteCategory).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("save_category_preferences"));
    await waitFor(() => expect(deleteCategory).toHaveBeenCalledWith("1"));
  });
});
