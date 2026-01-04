import { useTranslation } from "react-i18next";
import { Trash2, GripVertical } from "lucide-react";

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

  const formatTime = (value, unit) => {
    if (!value) return "";
    const timeStr = String(value).trim();

    // Check if it's a pure number or range like "40-50"
    const numericValue = Number(timeStr);
    if (!isNaN(numericValue) || /^\d+\s*-\s*\d+$/.test(timeStr)) {
      return `${timeStr} ${unit}`;
    }

    // For text like "overnight" or "until tender", return as-is
    return timeStr;
  };

  const formatWeight = (weight) => {
    if (!weight) return "";
    return `${weight}g`;
  };

  const getConversionRatio = (dryWeight, cookedWeight) => {
    if (!dryWeight || !cookedWeight || dryWeight === 0) return null;
    const ratio = cookedWeight / dryWeight;
    const formatted = ratio.toFixed(1);
    // Remove trailing .0 (e.g., 10.0 becomes 10)
    return `×${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}`;
  };

  if (!isEditMode) {
    // View mode - compact inline layout
    const timeParts = [];
    let weightText = null;

    // Soaking time (shown first)
    if (item.soaking_time) {
      timeParts.push(
        `${formatTime(item.soaking_time, t("hours_short", "h"))} ${t("soak", "soak")}`
      );
    }

    // Cooking time
    if (item.cooking_time) {
      timeParts.push(
        `${formatTime(item.cooking_time, t("minutes_short", "min"))} ${t("cook", "cook")}`
      );
    }

    // Weight conversion (separate line)
    if (item.dry_weight || item.cooked_weight) {
      const weightPart = [];
      if (item.dry_weight)
        weightPart.push(`${formatWeight(item.dry_weight)} ${t("dry", "dry")}`);
      if (item.cooked_weight)
        weightPart.push(
          `${formatWeight(item.cooked_weight)} ${t("cooked", "cooked")}`
        );
      const ratio = getConversionRatio(item.dry_weight, item.cooked_weight);
      weightText = weightPart.join(" → ") + (ratio ? ` (${ratio})` : "");
    }

    return (
      <div className="cooking-time-card">
        <div className="cooking-time-name">{item.ingredient_name}</div>
        {timeParts.length > 0 && (
          <div className="cooking-time-info">
            {timeParts.map((part, idx) => (
              <span key={idx}>
                {idx > 0 && " • "}
                {part}
              </span>
            ))}
          </div>
        )}
        {weightText && <div className="cooking-time-info">{weightText}</div>}
        {item.notes && <div className="cooking-time-notes">{item.notes}</div>}
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
              type="text"
              value={item.cooking_time || ""}
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
            />
            <input
              id={`cooking-time-soaking-time-${sectionId}-${index}-${item.tempId}`}
              type="text"
              value={item.soaking_time || ""}
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
              placeholder={t("soaking_time_minutes", "Soaking (hrs)")}
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
