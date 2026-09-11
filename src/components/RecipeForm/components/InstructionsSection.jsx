import { useTranslation } from "react-i18next";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "cn";

import { Textarea } from "@/components/ui/textarea";
import { handleEnterNav } from "../../../utils/enterKeyNavigation";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const InstructionsSection = ({
  instructions,
  isEditingTranslation,
  handleInstructionChange,
  removeInstruction,
  addInstruction,
}) => {
  const { t } = useTranslation();

  return (
    <Field>
      <FieldLabel>{t("instructions")}</FieldLabel>

      {instructions.length > 0 && (
        <Droppable droppableId="instructions" type="instruction">
          {(provided, snapshot) => (
            <div
              className={cn(
                "flex flex-col overflow-hidden rounded-lg border border-primary/50 bg-card",
                snapshot.isDraggingOver && "bg-muted/50"
              )}
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
                      className={cn(
                        "flex items-start gap-2 p-2 transition-colors",
                        index > 0 && "border-t border-border",
                        snapshot.isDragging &&
                          "rounded-lg border border-primary/50 bg-card shadow-md"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1 pt-1.5">
                        {/* Step Number */}
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}.
                        </span>

                        {/* Instruction Drag Handle */}
                        <div
                          {...provided.dragHandleProps}
                          data-slot="drag-handle"
                          style={{
                            pointerEvents: isEditingTranslation
                              ? "none"
                              : "auto",
                          }}
                          className={cn(
                            "flex cursor-grab items-center text-muted-foreground active:cursor-grabbing",
                            isEditingTranslation && "opacity-50"
                          )}
                        >
                          <GripVertical size={16} />
                        </div>
                      </div>
                      <Textarea
                        value={instruction}
                        onChange={(e) =>
                          handleInstructionChange(index, e.target.value)
                        }
                        onKeyDown={handleEnterNav}
                        data-enter-nav
                        className="flex-1"
                      />

                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost-destructive"
                              size="icon-sm"
                              onClick={() => removeInstruction(index)}
                              aria-label={t("remove_instruction")}
                              disabled={isEditingTranslation}
                              data-testid="remove-instruction-btn"
                            >
                              <Trash2 size={16} />
                            </Button>
                          }
                        />
                        <TooltipContent>
                          {t("remove_instruction")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addInstruction}
          disabled={isEditingTranslation}
          data-testid="add-instruction-btn"
          data-enter-nav
        >
          <Plus size={16} />
          {t("add_instruction")}
        </Button>
      </div>
    </Field>
  );
};

export default InstructionsSection;
