import { useTranslation } from "react-i18next";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CookingTimeRow from "../CookingTimeRow/CookingTimeRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";

const EditCookingTimes = ({
  formData,
  editingSectionId,
  setEditingSectionId,
  handleDragEnd,
  addSection,
  addCookingTime,
  removeSection,
  handleSectionChange,
  handleCookingTimeChange,
  handleCookingTimeFieldEnter,
  removeCookingTime,
  handleCancelEdit,
  handleSaveEdit,
  showExitEditModeModal,
  handleConfirmExitEditMode,
  handleCancelExitEditMode,
}) => {
  const { t } = useTranslation();

  const renderCookingTimeItem = (
    item,
    index,
    sectionId,
    provided,
    snapshot
  ) => (
    <CookingTimeRow
      key={item.tempId || item.id}
      item={item}
      index={index}
      sectionId={sectionId}
      isEditMode={true}
      provided={provided}
      snapshot={snapshot}
      handleItemChange={handleCookingTimeChange}
      handleItemFieldEnter={handleCookingTimeFieldEnter}
      removeItem={removeCookingTime}
    />
  );

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={addSection}
        >
          <Plus size={16} />
          {t("add_section")}
        </Button>

        {/* Ungrouped Cooking Times */}
        {formData.ungroupedCookingTimes.length > 0 && (
          <Droppable droppableId="ungrouped" type="cooking-time-item">
            {(provided, snapshot) => (
              <div
                className={cn(
                  "flex flex-col gap-2 rounded-lg",
                  snapshot.isDraggingOver && "bg-muted/40"
                )}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {formData.ungroupedCookingTimes.map((item, index) => (
                  <Draggable
                    key={`ungrouped-${index}-${item.tempId || item.id}`}
                    draggableId={`ungrouped-${index}-${item.tempId || item.id}`}
                    index={index}
                    type="cooking-time-item"
                  >
                    {(provided, snapshot) =>
                      renderCookingTimeItem(
                        item,
                        index,
                        "ungrouped",
                        provided,
                        snapshot
                      )
                    }
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}

        {/* Add Cooking Time Button for Ungrouped */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => addCookingTime("ungrouped")}
        >
          <Plus size={16} data-testid="add-cooking-time-btn" />
          {t("add_cooking_time")}
        </Button>

        {/* Cooking Time Sections */}
        {formData.cookingTimeSections.length > 0 && (
          <Droppable droppableId="sections" type="cooking-time-section">
            {(provided) => (
              <div
                className="flex flex-col gap-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {formData.cookingTimeSections.map((section, sectionIndex) => (
                  <Draggable
                    key={section.id}
                    draggableId={section.id}
                    index={sectionIndex}
                    type="cooking-time-section"
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "rounded-xl border border-border bg-muted/20 p-3",
                          snapshot.isDragging && "shadow-md"
                        )}
                      >
                        {/* Section Header */}
                        <div className="mb-3 flex items-center gap-2">
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab text-muted-foreground active:cursor-grabbing"
                          >
                            <GripVertical size={16} />
                          </div>
                          {editingSectionId === section.id ||
                          !section.subheading ? (
                            <Input
                              type="text"
                              value={section.subheading}
                              onChange={(e) =>
                                handleSectionChange(
                                  section.id,
                                  "subheading",
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  section.subheading.trim()
                                ) {
                                  e.preventDefault();
                                  setEditingSectionId(null);
                                }
                              }}
                              onFocus={() => setEditingSectionId(section.id)}
                              onBlur={() => {
                                if (section.subheading.trim()) {
                                  setEditingSectionId(null);
                                }
                              }}
                              autoFocus={editingSectionId === section.id}
                              className="section-title-input flex-1"
                              placeholder={t("section_title")}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingSectionId(section.id)}
                              className="flex-1 truncate text-left font-medium [word-break:break-word]"
                            >
                              {section.subheading}
                            </button>
                          )}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost-destructive"
                                  size="icon-sm"
                                  onClick={() => removeSection(section.id)}
                                  aria-label={t("remove_section")}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              }
                            />
                            <TooltipContent>
                              {t("remove_section")}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Section Cooking Times */}
                        <Droppable
                          droppableId={section.id}
                          type="cooking-time-item"
                        >
                          {(provided, snapshot) => (
                            <div
                              className={cn(
                                "flex flex-col gap-2 rounded-lg",
                                snapshot.isDraggingOver && "bg-muted/40"
                              )}
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                            >
                              {section.cookingTimes.map((item, itemIndex) => (
                                <Draggable
                                  key={`${section.id}-${itemIndex}-${item.tempId || item.id}`}
                                  draggableId={`${section.id}-${itemIndex}-${item.tempId || item.id}`}
                                  index={itemIndex}
                                  type="cooking-time-item"
                                >
                                  {(provided, snapshot) =>
                                    renderCookingTimeItem(
                                      item,
                                      itemIndex,
                                      section.id,
                                      provided,
                                      snapshot
                                    )
                                  }
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        {/* Add Cooking Time Button (like RecipeForm) */}
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => addCookingTime(section.id)}
                          aria-label={t("add_cooking_time")}
                        >
                          <Plus
                            size={16}
                            data-testid="add-section-cooking-time-btn"
                          />
                          {t("add_cooking_time")}
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}

        {/* Action buttons for edit mode */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleCancelEdit}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSaveEdit}
          >
            {t("save_changes", "Save Changes")}
          </Button>
        </div>
      </DragDropContext>

      {/* Exit Edit Mode Modal - for exiting edit mode with unsaved changes */}
      <AlertDialog
        open={showExitEditModeModal}
        onOpenChange={(open) => {
          if (!open) handleCancelExitEditMode();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes_warning")}</AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmExitEditMode}
            >
              {t("leave_page")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditCookingTimes;
