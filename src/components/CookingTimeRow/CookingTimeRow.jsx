import { useTranslation } from "react-i18next";
import { Trash2, GripVertical, Timer, ChefHat } from "lucide-react";

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

  if (!isEditMode) {
    // View mode - display using category management layout pattern
    return (
      <div className="cooking-time-row">
        <span className="bold-small">{item.ingredient_name}</span>
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
        {item.notes && <p className="item-notes">{item.notes}</p>}
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

        {/* Time Details */}
        <div className="time-details">
          <input
            id={`cooking-time-cook-${sectionId}-${index}-${item.tempId}`}
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
            className="input input--full-width input--edit"
            placeholder={t("cooking_time_minutes", "Cooking Time (minutes)")}
            onWheel={(e) => e.target.blur()}
          />

          <input
            id={`cooking-time-soak-${sectionId}-${index}-${item.tempId}`}
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
            className="input input--full-width input--edit"
            placeholder={t("soaking_time_minutes", "Soaking Time (minutes)")}
            onWheel={(e) => e.target.blur()}
          />
          <input
            id={`cooking-time-notes-${sectionId}-${index}-${item.tempId}`}
            type="text"
            value={item.notes || ""}
            onChange={(e) =>
              handleItemChange(sectionId, item.tempId, "notes", e.target.value)
            }
            onKeyDown={(e) =>
              handleItemFieldEnter?.(e, "notes", sectionId, item.tempId, index)
            }
            className="input input--full-width input--edit"
            placeholder={t("optional_notes", "Optional notes")}
          />
        </div>
      </div>
    </div>
  );
};

export default CookingTimeRow;
