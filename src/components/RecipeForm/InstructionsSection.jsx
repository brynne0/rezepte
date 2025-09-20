import { useTranslation } from "react-i18next";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

import AutoResizeTextArea from "../AutoResizeTextArea/AutoResizeTextArea";

const InstructionsSection = ({
  instructions,
  isEditingTranslation,
  handleInstructionChange,
  handleEnter,
  removeInstruction,
  addInstruction,
}) => {
  const { t } = useTranslation();

  return (
    <div className="form-group">
      <label className="form-header ">
        <h3>{t("instructions")}</h3>
      </label>

      <Droppable droppableId="instructions" type="instruction">
        {(provided, snapshot) => (
          <div
            className={`flex-column instructions-list ${
              snapshot.isDraggingOver ? "drag-over" : ""
            }`}
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {instructions.map((instruction, index) => (
              <Draggable
                key={index}
                draggableId={`instruction-${index}`}
                index={index}
                type="instruction"
                isDragDisabled={isEditingTranslation}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`instruction-row ${
                      snapshot.isDragging ? "dragging" : ""
                    }`}
                  >
                    <div className="flex-column">
                      {/* Step Number */}
                      <span className="step-number">{index + 1}.</span>

                      {/* Instruction Drag Handle */}
                      <div
                        {...provided.dragHandleProps}
                        className={`drag-handle ${
                          isEditingTranslation ? "translation-disabled" : ""
                        }`}
                        style={{
                          pointerEvents: isEditingTranslation ? "none" : "auto",
                        }}
                      >
                        <GripVertical size={16} />
                      </div>
                    </div>
                    <AutoResizeTextArea
                      value={instruction}
                      onChange={(e) =>
                        handleInstructionChange(index, e.target.value)
                      }
                      onKeyDown={handleEnter}
                      className="input input--full-width input--textarea input--edit "
                    />

                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className={`btn btn-icon btn-icon-remove ${
                        isEditingTranslation ? "translation-disabled" : ""
                      }`}
                      aria-label={t("remove_instruction")}
                      disabled={isEditingTranslation}
                    >
                      <Trash2 size={16} data-testid="remove-instruction-btn" />
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <div className="action-buttons-icon">
        <button
          type="button"
          onClick={addInstruction}
          className={`btn btn-icon btn-icon-green ${
            isEditingTranslation ? "translation-disabled" : ""
          }`}
          disabled={isEditingTranslation}
        >
          <Plus
            size={16}
            data-testid="add-instruction-btn"
            aria-label={t("add_instruction")}
          />
        </button>
      </div>
    </div>
  );
};

export default InstructionsSection;
