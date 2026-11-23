import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NutritionSection from "./NutritionSection";
import { emptyNutritionColumn } from "../../../utils/nutritionUtils";

const renderSection = (columns = [{ ...emptyNutritionColumn(), fat: 5 }]) => {
  const onChange = vi.fn();
  render(<NutritionSection columns={columns} onChange={onChange} />);
  return onChange;
};

describe("NutritionSection", () => {
  test("starts open when the recipe has nutrition values", () => {
    render(
      <NutritionSection
        columns={[{ ...emptyNutritionColumn(), fat: 5 }]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("nutrition_fat (g)")).toHaveValue("5");
  });

  test("starts collapsed when the recipe has no nutrition values", () => {
    render(
      <NutritionSection columns={[emptyNutritionColumn()]} onChange={vi.fn()} />
    );

    expect(
      screen.queryByLabelText("nutrition_fat (g)")
    ).not.toBeInTheDocument();
  });

  test("strips letters from a nutrition value", () => {
    const onChange = renderSection();

    fireEvent.change(screen.getByLabelText("nutrition_calories (kcal)"), {
      target: { value: "12abc" },
    });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ calories: "12" }),
    ]);
  });

  test("keeps a decimal comma", () => {
    const onChange = renderSection();

    fireEvent.change(screen.getByLabelText("nutrition_fat (g)"), {
      target: { value: "5,5" },
    });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ fat: "5,5" }),
    ]);
  });

  test("clears the value when only invalid characters are typed", () => {
    const onChange = renderSection();

    fireEvent.change(screen.getByLabelText("nutrition_fat (g)"), {
      target: { value: "abc" },
    });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ fat: null }),
    ]);
  });

  test("uses a decimal keypad on phones", () => {
    renderSection();

    expect(screen.getByLabelText("nutrition_fat (g)")).toHaveAttribute(
      "inputmode",
      "decimal"
    );
  });
});
