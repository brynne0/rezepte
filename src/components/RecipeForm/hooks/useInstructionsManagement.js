import { useCallback } from "react";

export const useInstructionsManagement = ({ setFormData }) => {
  // Handle instruction changes
  const handleInstructionChange = useCallback(
    (index, value) => {
      setFormData((prev) => ({
        ...prev,
        instructions: prev.instructions.map((instruction, i) =>
          i === index ? value : instruction
        ),
      }));
    },
    [setFormData]
  );

  // Add new instruction
  const addInstruction = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ""],
    }));

    // Wait for the new row to actually paint before focusing it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const instructionTextareas = document.querySelectorAll(
          ".instruction-row .input"
        );
        if (instructionTextareas.length > 0) {
          const lastTextarea =
            instructionTextareas[instructionTextareas.length - 1];
          lastTextarea.focus();
          lastTextarea.click();
        }
      });
    });
  }, [setFormData]);

  // Remove instruction
  const removeInstruction = useCallback(
    (index) => {
      setFormData((prev) => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  return {
    handleInstructionChange,
    addInstruction,
    removeInstruction,
  };
};
