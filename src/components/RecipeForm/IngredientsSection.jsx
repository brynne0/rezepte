import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "cn";

import IngredientRow from "./IngredientRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const IngredientsSection = ({
  ungroupedIngredients,
  ingredientSections,
  validationErrors,
  isEditingTranslation,
  addSection,
  addIngredient,
  removeSection,
  handleSectionChange,
  handleIngredientChange,
  handleIngredientFieldEnter,
  handleOpenLinkDropdown,
  removeIngredient,
  getIngredientLink,
  removeIngredientLink,
}) => {
  const { t } = useTranslation();
  const [editingSectionId, setEditingSectionId] = useState(null);

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{t("ingredients")}</FieldLabel>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSection}
          disabled={isEditingTranslation}
        >
          <Plus size={16} />
          {t("add_section")}
        </Button>
      </div>

      {/* Ungrouped Ingredients First */}
      {ungroupedIngredients.length > 0 && (
        <Droppable droppableId="ungrouped" type="ingredient">
          {(provided, snapshot) => (
            <div
              className={cn(
                "flex flex-col gap-2",
                snapshot.isDraggingOver && "bg-muted/50"
              )}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {ungroupedIngredients.map((ingredient, index) => (
                <Draggable
                  key={`ungrouped-${index}-${ingredient.tempId}`}
                  draggableId={`ungrouped-${index}-${ingredient.tempId}`}
                  index={index}
                  type="ingredient"
                >
                  {(provided, snapshot) => (
                    <IngredientRow
                      ingredient={ingredient}
                      index={index}
                      sectionId="ungrouped"
                      validationErrors={validationErrors}
                      isEditingTranslation={isEditingTranslation}
                      provided={provided}
                      snapshot={snapshot}
                      handleIngredientChange={handleIngredientChange}
                      handleIngredientFieldEnter={handleIngredientFieldEnter}
                      handleOpenLinkDropdown={handleOpenLinkDropdown}
                      removeIngredient={removeIngredient}
                      getIngredientLink={getIngredientLink}
                      removeIngredientLink={removeIngredientLink}
                    />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}

      {/* Add Ingredient Button for Ungrouped */}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addIngredient("ungrouped")}
          disabled={isEditingTranslation}
        >
          <Plus size={16} data-testid="add-ingredient-btn" />
          {t("add_ingredient")}
        </Button>
      </div>

      {/* Ingredient Sections */}
      {ingredientSections.length > 0 && (
        <Droppable droppableId="sections" type="section">
          {(provided) => (
            <div
              className="flex flex-col gap-2"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {ingredientSections.map((section, sectionIndex) => (
                <Draggable
                  key={section.id}
                  draggableId={section.id}
                  index={sectionIndex}
                  type="section"
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-2",
                        snapshot.isDragging && "shadow-md"
                      )}
                    >
                      {/* Section Header */}
                      <div className="flex items-center gap-2">
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
                            disabled={isEditingTranslation}
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
                                disabled={isEditingTranslation}
                                aria-label={t("remove_section")}
                              >
                                <Trash2 size={16} />
                              </Button>
                            }
                          />
                          <TooltipContent>{t("remove_section")}</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Section Ingredients */}
                      <Droppable droppableId={section.id} type="ingredient">
                        {(provided, snapshot) => (
                          <div
                            className={cn(
                              "flex flex-col gap-2",
                              snapshot.isDraggingOver && "bg-muted/50"
                            )}
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {section.ingredients.map(
                              (ingredient, ingredientIndex) => (
                                <Draggable
                                  key={`${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                  draggableId={`${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                  index={ingredientIndex}
                                  type="ingredient"
                                >
                                  {(provided, snapshot) => (
                                    <IngredientRow
                                      ingredient={ingredient}
                                      index={ingredientIndex}
                                      sectionId={section.id}
                                      validationErrors={validationErrors}
                                      isEditingTranslation={
                                        isEditingTranslation
                                      }
                                      provided={provided}
                                      snapshot={snapshot}
                                      handleIngredientChange={
                                        handleIngredientChange
                                      }
                                      handleIngredientFieldEnter={
                                        handleIngredientFieldEnter
                                      }
                                      handleOpenLinkDropdown={
                                        handleOpenLinkDropdown
                                      }
                                      removeIngredient={removeIngredient}
                                      getIngredientLink={getIngredientLink}
                                      removeIngredientLink={
                                        removeIngredientLink
                                      }
                                    />
                                  )}
                                </Draggable>
                              )
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      {/* Add Ingredient Button */}
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addIngredient(section.id)}
                          disabled={isEditingTranslation}
                        >
                          <Plus
                            size={16}
                            data-testid="add-section-ingredient-btn"
                          />
                          {t("add_ingredient")}
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}

      <FieldError>{validationErrors.ingredients}</FieldError>
    </Field>
  );
};

export default IngredientsSection;
