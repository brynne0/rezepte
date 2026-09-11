import { describe, test, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInstructionsManagement } from "./useInstructionsManagement";

const setup = (instructions = ["Step 1", "Step 2"]) => {
  let formData = { instructions };
  const setFormData = vi.fn((updater) => {
    formData = typeof updater === "function" ? updater(formData) : updater;
  });

  const { result, rerender } = renderHook(() =>
    useInstructionsManagement({ setFormData })
  );

  return { result, rerender, getFormData: () => formData };
};

describe("useInstructionsManagement", () => {
  test("handleInstructionChange updates the instruction at the given index", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.handleInstructionChange(1, "Updated step");
    });
    rerender();

    expect(getFormData().instructions).toEqual(["Step 1", "Updated step"]);
  });

  test("addInstruction appends an empty instruction", () => {
    const { result, getFormData, rerender } = setup();

    act(() => {
      result.current.addInstruction();
    });
    rerender();

    expect(getFormData().instructions).toEqual(["Step 1", "Step 2", ""]);
  });

  test("removeInstruction removes the instruction at the given index", () => {
    const { result, getFormData, rerender } = setup([
      "Step 1",
      "Step 2",
      "Step 3",
    ]);

    act(() => {
      result.current.removeInstruction(1);
    });
    rerender();

    expect(getFormData().instructions).toEqual(["Step 1", "Step 3"]);
  });
});
