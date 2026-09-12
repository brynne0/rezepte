import { useTranslation } from "react-i18next";
import { Trash2, GripVertical, Link, Unlink } from "lucide-react";
import { cn } from "cn";

import { formatQuantityForUnit } from "../../../utils/ingredientFormatting";
import { handleEnterNav } from "../../../utils/enterKeyNavigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const IngredientRow = ({
  ingredient,
  index,
  sectionId,
  validationErrors,
  isEditingTranslation,
  provided,
  snapshot,
  handleIngredientChange,
  handleOpenLinkDropdown,
  removeIngredient,
  getIngredientLink,
  removeIngredientLink,
}) => {
  const { t, i18n } = useTranslation();
  const rawUnits = t("units", { returnObjects: true });
  const units = Array.isArray(rawUnits) ? rawUnits : [];
  const unitOptions = units.filter((unit) => unit.value !== "");
  const linkedRecipe = getIngredientLink(sectionId, ingredient.tempId);

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={cn(
        "flex flex-wrap items-start gap-2 p-2 transition-colors",
        index > 0 && "border-t border-border",
        snapshot.isDragging &&
          "rounded-lg border border-primary/50 bg-card shadow-md"
      )}
    >
      {/* Ingredient Drag Handle */}
      <div
        {...provided.dragHandleProps}
        data-slot="drag-handle"
        style={{ pointerEvents: isEditingTranslation ? "none" : "auto" }}
        className={cn(
          "flex h-8 cursor-grab items-center text-muted-foreground active:cursor-grabbing",
          isEditingTranslation && "opacity-50"
        )}
      >
        <GripVertical size={16} />
      </div>

      <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
        {/* Ingredient Name */}
        <Input
          id={`ingredient-name-${sectionId}-${index}-${ingredient.tempId}`}
          type="text"
          value={ingredient.name || ""}
          onChange={(e) => {
            handleIngredientChange(
              sectionId,
              ingredient.tempId,
              "name",
              e.target.value,
              validationErrors.ingredients ? "ingredients" : null
            );
          }}
          onKeyDown={handleEnterNav}
          data-enter-nav
          onBlur={(e) => {
            const value =
              i18n.language === "de"
                ? e.target.value
                    .split(" ")
                    .map(
                      (word) =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(" ")
                : e.target.value.toLowerCase();

            handleIngredientChange(
              sectionId,
              ingredient.tempId,
              "name",
              value,
              validationErrors.ingredients ? "ingredients" : null
            );
          }}
          aria-invalid={!!validationErrors.ingredients}
          placeholder={t("ingredient_name")}
          className="md:w-56 md:flex-none"
        />

        {/* Ingredient Details */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-1 md:gap-2">
          <Input
            id={`ingredient-quantity-${sectionId}-${index}-${ingredient.tempId}`}
            type="text"
            value={formatQuantityForUnit(ingredient.quantity)}
            onChange={(e) =>
              handleIngredientChange(
                sectionId,
                ingredient.tempId,
                "quantity",
                e.target.value
              )
            }
            onKeyDown={handleEnterNav}
            data-enter-nav
            placeholder={t("quantity")}
            disabled={isEditingTranslation}
            onWheel={(e) => e.target.blur()}
            className="md:w-20 md:flex-none"
          />

          <Combobox
            items={unitOptions}
            value={
              unitOptions.find((unit) => unit.value === ingredient.unit) || null
            }
            onValueChange={(unit) =>
              handleIngredientChange(
                sectionId,
                ingredient.tempId,
                "unit",
                unit ? unit.value : ""
              )
            }
            isItemEqualToValue={(a, b) => a.value === b.value}
            disabled={isEditingTranslation}
          >
            <ComboboxInput
              id={`ingredient-unit-${sectionId}-${index}-${ingredient.tempId}`}
              placeholder={t("unit")}
              disabled={isEditingTranslation}
              showClear
              className="md:w-28"
              onKeyDown={handleEnterNav}
              data-enter-nav
            />
            <ComboboxContent>
              <ComboboxEmpty>{t("no_results")}</ComboboxEmpty>
              <ComboboxList>
                {(unit) => (
                  <ComboboxItem key={unit.value} value={unit}>
                    {unit.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          <Input
            id={`ingredient-notes-${sectionId}-${index}-${ingredient.tempId}`}
            type="text"
            value={ingredient.notes || ""}
            onChange={(e) =>
              handleIngredientChange(
                sectionId,
                ingredient.tempId,
                "notes",
                e.target.value.toLowerCase()
              )
            }
            onKeyDown={handleEnterNav}
            data-enter-nav
            placeholder={t("notes")}
            className="col-span-2 sm:col-span-1 md:flex-1"
          />
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={linkedRecipe ? "ghost-destructive" : "ghost"}
                  size="icon-sm"
                  onClick={() => {
                    if (linkedRecipe) {
                      removeIngredientLink(sectionId, ingredient.tempId);
                    } else {
                      handleOpenLinkDropdown(
                        sectionId,
                        ingredient.tempId,
                        ingredient
                      );
                    }
                  }}
                  aria-label={
                    linkedRecipe ? t("unlink_recipe") : t("link_to_recipe")
                  }
                  disabled={isEditingTranslation}
                >
                  {linkedRecipe ? <Unlink size={16} /> : <Link size={16} />}
                </Button>
              }
            />
            <TooltipContent>
              {linkedRecipe ? t("unlink_recipe") : t("link_to_recipe")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost-destructive"
                  size="icon-sm"
                  onClick={() => removeIngredient(sectionId, ingredient.tempId)}
                  aria-label={t("remove_ingredient")}
                  disabled={isEditingTranslation}
                  data-testid={
                    sectionId === "ungrouped"
                      ? "remove-ingredient-btn"
                      : `remove-section-ingredient-btn-${sectionId}-${ingredient.tempId}`
                  }
                >
                  <Trash2 size={16} />
                </Button>
              }
            />
            <TooltipContent>{t("remove_ingredient")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default IngredientRow;
