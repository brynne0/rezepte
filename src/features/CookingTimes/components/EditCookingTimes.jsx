import { useTranslation } from "react-i18next";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CookingTimeRow from "./CookingTimeRow";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog/UnsavedChangesDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import SectionTitleInput from "@/components/SectionTitleInput/SectionTitleInput";

// Drop zone of draggable cooking time rows, for one section or "ungrouped"
const CookingTimeList = ({ sectionId, items, itemHandlers }) => (
  <Droppable droppableId={sectionId} type="cooking-time-item">
    {(provided, snapshot) => (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border bg-card",
          snapshot.isDraggingOver && "bg-muted/50"
        )}
        {...provided.droppableProps}
        ref={provided.innerRef}
      >
        {items.map((item, index) => {
          const dragId = `${sectionId}-${index}-${item.tempId || item.id}`;
          return (
            <Draggable
              key={dragId}
              draggableId={dragId}
              index={index}
              type="cooking-time-item"
            >
              {(itemProvided, itemSnapshot) => (
                <CookingTimeRow
                  item={item}
                  index={index}
                  sectionId={sectionId}
                  isEditMode={true}
                  provided={itemProvided}
                  snapshot={itemSnapshot}
                  {...itemHandlers}
                />
              )}
            </Draggable>
          );
        })}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);

// One draggable section: title, remove button, its rows and an add button
const CookingTimeSection = ({
  section,
  index,
  isEditingTitle,
  setEditingSectionId,
  handleSectionChange,
  removeSection,
  addCookingTime,
  itemHandlers,
}) => {
  const { t } = useTranslation();

  return (
    <Draggable
      draggableId={section.id}
      index={index}
      type="cooking-time-section"
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-2",
            snapshot.isDragging && "shadow-md"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              {...provided.dragHandleProps}
              data-slot="drag-handle"
              className="flex cursor-grab items-center text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </div>
            <SectionTitleInput
              value={section.subheading}
              isEditing={isEditingTitle}
              onChange={(value) =>
                handleSectionChange(section.id, "subheading", value)
              }
              onEditingChange={(editing) =>
                setEditingSectionId(editing ? section.id : null)
              }
            />
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
              <TooltipContent>{t("remove_section")}</TooltipContent>
            </Tooltip>
          </div>

          <CookingTimeList
            sectionId={section.id}
            items={section.cookingTimes}
            itemHandlers={itemHandlers}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => addCookingTime(section.id)}
            aria-label={t("add_cooking_time")}
          >
            <Plus size={16} data-testid="add-section-cooking-time-btn" />
            {t("add_cooking_time")}
          </Button>
        </div>
      )}
    </Draggable>
  );
};

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
  isSaving,
  isOnline,
  showExitEditModeModal,
  handleConfirmExitEditMode,
  handleCancelExitEditMode,
}) => {
  const { t } = useTranslation();

  const itemHandlers = {
    handleItemChange: handleCookingTimeChange,
    handleItemFieldEnter: handleCookingTimeFieldEnter,
    removeItem: removeCookingTime,
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <>
          <Button
            type="button"
            variant="dashed"
            className="w-full"
            onClick={addSection}
          >
            <Plus size={16} />
            {t("add_section")}
          </Button>

          {/* Ungrouped Cooking Times */}
          {formData.ungroupedCookingTimes.length > 0 && (
            <CookingTimeList
              sectionId="ungrouped"
              items={formData.ungroupedCookingTimes}
              itemHandlers={itemHandlers}
            />
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
                    <CookingTimeSection
                      key={section.id}
                      section={section}
                      index={sectionIndex}
                      isEditingTitle={editingSectionId === section.id}
                      setEditingSectionId={setEditingSectionId}
                      handleSectionChange={handleSectionChange}
                      removeSection={removeSection}
                      addCookingTime={addCookingTime}
                      itemHandlers={itemHandlers}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </>

        {/* Action buttons for edit mode */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !isOnline}
                >
                  {isSaving && <Spinner />}
                  {t("save_changes", "Save Changes")}
                </Button>
              }
            />
            <TooltipContent>
              {isOnline
                ? t("save_changes", "Save Changes")
                : t("action_requires_internet")}
            </TooltipContent>
          </Tooltip>
        </div>
      </DragDropContext>

      {/* Exit Edit Mode Modal - for exiting edit mode with unsaved changes */}
      <UnsavedChangesDialog
        open={showExitEditModeModal}
        message={t("unsaved_changes_warning")}
        onLeave={handleConfirmExitEditMode}
        onStay={handleCancelExitEditMode}
      />
    </>
  );
};

export default EditCookingTimes;
