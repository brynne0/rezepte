import { useTranslation } from "react-i18next";
import { Trash2, GripVertical, Link, X } from "lucide-react";

import { formatQuantityForUnit } from "../../utils/ingredientFormatting";
import Selector from "../Selector/Selector";

const IngredientRow = ({
  ingredient,
  index,
  sectionId,
  validationErrors,
  isEditingTranslation,
  provided,
  snapshot,
  handleIngredientChange,
  handleIngredientFieldEnter,
  handleOpenLinkDropdown,
  removeIngredient,
  getIngredientLink,
  removeIngredientLink,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`ingredient-row ${snapshot.isDragging ? "dragging" : ""}`}
    >
      {/* Ingredient Drag Handle */}
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

      <div className="ingredient-content">
        {/* Ingredient Name */}
        <input
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
          onKeyDown={(e) =>
            handleIngredientFieldEnter(
              e,
              "name",
              sectionId,
              ingredient.tempId,
              index
            )
          }
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
          className={`input input--full-width input--edit ${
            validationErrors.ingredients ? "input--error" : ""
          }`}
          placeholder={t("ingredient_name")}
        />

        {/* Ingredient Details */}
        <div className="ingredient-details">
          <div className={isEditingTranslation ? "translation-disabled" : ""}>
            <input
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
              onKeyDown={(e) =>
                handleIngredientFieldEnter(
                  e,
                  "quantity",
                  sectionId,
                  ingredient.tempId,
                  index
                )
              }
              className="input input--full-width input--edit"
              placeholder={t("quantity")}
              disabled={isEditingTranslation}
              onWheel={(e) => e.target.blur()}
            />
          </div>

          <div className={isEditingTranslation ? "translation-disabled" : ""}>
            <Selector
              id={`ingredient-unit-${sectionId}-${index}-${ingredient.tempId}`}
              value={ingredient.unit || ""}
              onChange={(value) =>
                handleIngredientChange(
                  sectionId,
                  ingredient.tempId,
                  "unit",
                  value
                )
              }
              onKeyDown={(e) =>
                handleIngredientFieldEnter(
                  e,
                  "unit",
                  sectionId,
                  ingredient.tempId,
                  index
                )
              }
              type="unit"
              className="input--full-width"
              disabled={isEditingTranslation}
            />
          </div>

          <input
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
            onKeyDown={(e) =>
              handleIngredientFieldEnter(
                e,
                "notes",
                sectionId,
                ingredient.tempId,
                index
              )
            }
            className="input input--full-width input--edit"
            placeholder={t("notes")}
          />
        </div>

        <div className="flex-row">
          <button
            type="button"
            onClick={() => {
              const linkedRecipe = getIngredientLink(
                sectionId,
                ingredient.tempId
              );
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
            className={`btn btn-icon ${
              getIngredientLink(sectionId, ingredient.tempId)
                ? "btn-icon-link linked"
                : "btn-icon-link"
            } ${isEditingTranslation ? "translation-disabled" : ""}`}
            aria-label={
              getIngredientLink(sectionId, ingredient.tempId)
                ? t("unlink_recipe")
                : t("link_to_recipe")
            }
            disabled={isEditingTranslation}
          >
            <Link size={16} className="link-default" />
            <X size={16} className="link-hover" />
          </button>

          <button
            type="button"
            onClick={() => removeIngredient(sectionId, ingredient.tempId)}
            className={`btn btn-icon btn-icon-remove ${
              isEditingTranslation ? "translation-disabled" : ""
            }`}
            aria-label={t("remove_ingredient")}
            disabled={isEditingTranslation}
            data-testid={
              sectionId === "ungrouped"
                ? "remove-ingredient-btn"
                : `remove-section-ingredient-btn-${sectionId}-${ingredient.tempId}`
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientRow;
