import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import IngredientRow from "./IngredientRow";

const unitsByLanguage = {
  en: [
    { value: "", label: "-" },
    { value: "tbsp", label: "tbsp" },
  ],
  de: [
    { value: "", label: "-" },
    { value: "tbsp", label: "EL" },
  ],
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) =>
      key === "units" ? unitsByLanguage[options?.lng ?? "en"] : key,
    i18n: { language: "en" },
  }),
}));

const renderRow = (props = {}) =>
  render(
    <IngredientRow
      ingredient={{ tempId: "t1", name: "Zucker", quantity: "1", unit: "tbsp" }}
      index={0}
      sectionId="ungrouped"
      validationErrors={{}}
      isEditingTranslation={false}
      provided={{ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }}
      snapshot={{ isDragging: false }}
      handleIngredientChange={vi.fn()}
      handleOpenLinkDropdown={vi.fn()}
      removeIngredient={vi.fn()}
      getIngredientLink={() => null}
      removeIngredientLink={vi.fn()}
      {...props}
    />
  );

// The visible unit input (the picker also keeps a hidden field with the raw value)
const unitField = (container) =>
  container.querySelector("#ingredient-unit-ungrouped-0-t1");

describe("IngredientRow units", () => {
  test("shows units in the recipe's language, not the app's", () => {
    const { container } = renderRow({ contentLanguage: "de" });

    expect(unitField(container)).toHaveValue("EL");
  });

  test("falls back to the app language without a recipe language", () => {
    const { container } = renderRow();

    expect(unitField(container)).toHaveValue("tbsp");
  });
});
