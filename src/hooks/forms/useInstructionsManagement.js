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

    // Focus on the new instruction text box
    setTimeout(() => {
      const instructionTextareas = document.querySelectorAll(
        ".instruction-row .input"
      );
      if (instructionTextareas.length > 0) {
        const lastTextarea =
          instructionTextareas[instructionTextareas.length - 1];
        lastTextarea.focus();
        lastTextarea.click();
      }
    }, 10);
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

  // Handle Enter key for instruction navigation
  const handleEnter = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const textarea = e.target;
        const instructionRows = Array.from(
          document.querySelectorAll(".instruction-row")
        );
        const currentRow = textarea.closest(".instruction-row");
        const currentIndex = instructionRows.indexOf(currentRow);

        if (currentIndex < instructionRows.length - 1) {
          // Focus next instruction
          const nextRow = instructionRows[currentIndex + 1];
          const nextTextarea = nextRow.querySelector(".input");
          if (nextTextarea) {
            nextTextarea.focus();
            nextTextarea.click();
          }
        } else {
          // Add new instruction if we're on the last one
          addInstruction();
        }
      }
    },
    [addInstruction]
  );

  return {
    handleInstructionChange,
    addInstruction,
    removeInstruction,
    handleEnter,
  };
};
