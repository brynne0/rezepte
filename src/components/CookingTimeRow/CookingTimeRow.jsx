import { useTranslation } from "react-i18next";
import {
  Trash2,
  GripVertical,
  Timer,
  ChefHat,
  Scale,
  ArrowRight,
} from "lucide-react";

const CookingTimeRow = ({
  item,
  index,
  sectionId,
  isEditMode,
  provided,
  snapshot,
  handleItemChange,
  handleItemFieldEnter,
  removeItem,
}) => {
  const { t } = useTranslation();

  const formatTime = (minutes) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  const formatWeight = (weight) => {
    if (!weight) return "";
    return `${weight}g`;
  };

  const getConversionRatio = (dryWeight, cookedWeight) => {
    if (!dryWeight || !cookedWeight || dryWeight === 0) return null;
    const ratio = cookedWeight / dryWeight;
    return `1:${ratio.toFixed(1)}`;
  };

  if (!isEditMode) {
    // View mode - improved card layout
    return (
      <div className="cooking-time-card">
        <div className="cooking-time-header">
          <h4 className="cooking-time-title bold-small">
            {item.ingredient_name}
          </h4>
        </div>

        <div className="cooking-time-details">
          <div className="time-info">
            {item.soaking_time > 0 && (
              <span className="time-badge soaking">
                <Timer size={14} />
                {formatTime(item.soaking_time)} {t("soaking", "soaking")}
              </span>
            )}
            {item.cooking_time > 0 && (
              <span className="time-badge cooking">
                <ChefHat size={14} />
                {formatTime(item.cooking_time)} {t("cooking", "cooking")}
              </span>
            )}
          </div>

          {(item.dry_weight || item.cooked_weight) && (
            <div className="weight-info">
              <span className="weight-badge">
                <Scale size={14} />
                {item.dry_weight && formatWeight(item.dry_weight)}
                {item.dry_weight && item.cooked_weight && (
                  <ArrowRight size={12} className="weight-conversion-arrow" />
                )}
                {item.cooked_weight && formatWeight(item.cooked_weight)}
                {getConversionRatio(item.dry_weight, item.cooked_weight) && (
                  <span className="conversion-ratio">
                    ({getConversionRatio(item.dry_weight, item.cooked_weight)})
                  </span>
                )}
              </span>
            </div>
          )}

          {item.notes && <p className="item-notes">{item.notes}</p>}
        </div>
      </div>
    );
  }

  // Edit mode - display as editable row
  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      className={`cooking-time-row ${snapshot?.isDragging ? "dragging" : ""}`}
    >
      {/* Drag Handle */}
      <div {...provided?.dragHandleProps} className="drag-handle">
        <GripVertical size={16} />
      </div>

      <div className="cooking-time-content">
        {/* Ingredient Name with bin button */}
        <div className="cooking-time-name-row">
          <input
            id={`cooking-time-name-${sectionId}-${index}-${item.tempId}`}
            type="text"
            value={item.ingredient_name || ""}
            onChange={(e) => {
              handleItemChange(
                sectionId,
                item.tempId,
                "ingredient_name",
                e.target.value
              );
            }}
            onKeyDown={(e) =>
              handleItemFieldEnter?.(
                e,
                "ingredient_name",
                sectionId,
                item.tempId,
                index
              )
            }
            className="input input--full-width input--edit"
            placeholder={t("ingredient_name", "Ingredient name")}
          />

          <button
            type="button"
            onClick={() => removeItem(sectionId, item.tempId)}
            className="btn btn-icon btn-icon-remove"
            aria-label={t("delete", "Delete")}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Time and Weight Details */}
        <div className="cooking-time-edit-grid">
          {/* Time inputs - 2 columns */}
          <div className="edit-row-2col">
            <input
              id={`cooking-time-cooking-time-${sectionId}-${index}-${item.tempId}`}
              type="number"
              min="0"
              value={item.cooking_time > 0 ? item.cooking_time : ""}
              onChange={(e) =>
                handleItemChange(
                  sectionId,
                  item.tempId,
                  "cooking_time",
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                handleItemFieldEnter?.(
                  e,
                  "cooking_time",
                  sectionId,
                  item.tempId,
                  index
                )
              }
              className="input input--edit"
              placeholder={t("cooking_time_minutes", "Cooking (min)")}
              onWheel={(e) => e.target.blur()}
            />
            <input
              id={`cooking-time-soaking-time-${sectionId}-${index}-${item.tempId}`}
              type="number"
              min="0"
              value={item.soaking_time > 0 ? item.soaking_time : ""}
              onChange={(e) =>
                handleItemChange(
                  sectionId,
                  item.tempId,
                  "soaking_time",
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                handleItemFieldEnter?.(
                  e,
                  "soaking_time",
                  sectionId,
                  item.tempId,
                  index
                )
              }
              className="input input--edit"
              placeholder={t("soaking_time_minutes", "Soaking (min)")}
              onWheel={(e) => e.target.blur()}
            />
          </div>

          {/* Weight inputs - 2 columns */}
          <div className="edit-row-2col">
            <input
              id={`cooking-time-dry-weight-${sectionId}-${index}-${item.tempId}`}
              type="number"
              min="0"
              value={item.dry_weight > 0 ? item.dry_weight : ""}
              onChange={(e) =>
                handleItemChange(
                  sectionId,
                  item.tempId,
                  "dry_weight",
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                handleItemFieldEnter?.(
                  e,
                  "dry_weight",
                  sectionId,
                  item.tempId,
                  index
                )
              }
              className="input input--edit"
              placeholder={t("dry_weight", "Dry weight (g)")}
              onWheel={(e) => e.target.blur()}
            />
            <input
              id={`cooking-time-cooked-weight-${sectionId}-${index}-${item.tempId}`}
              type="number"
              min="0"
              value={item.cooked_weight > 0 ? item.cooked_weight : ""}
              onChange={(e) =>
                handleItemChange(
                  sectionId,
                  item.tempId,
                  "cooked_weight",
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                handleItemFieldEnter?.(
                  e,
                  "cooked_weight",
                  sectionId,
                  item.tempId,
                  index
                )
              }
              className="input input--edit"
              placeholder={t("cooked_weight", "Cooked weight (g)")}
              onWheel={(e) => e.target.blur()}
            />
          </div>

          {/* Notes input - 1 column */}
          <div className="edit-row-1col">
            <input
              id={`cooking-time-notes-${sectionId}-${index}-${item.tempId}`}
              type="text"
              value={item.notes || ""}
              onChange={(e) =>
                handleItemChange(
                  sectionId,
                  item.tempId,
                  "notes",
                  e.target.value
                )
              }
              onKeyDown={(e) =>
                handleItemFieldEnter?.(
                  e,
                  "notes",
                  sectionId,
                  item.tempId,
                  index
                )
              }
              className="input input--edit"
              placeholder={t("optional_notes", "Optional notes")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookingTimeRow;
