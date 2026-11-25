import { useTranslation } from "react-i18next";
import { Trash2, GripVertical, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";

const OVERNIGHT = "overnight";
const isOvernight = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase() === OVERNIGHT;

const onlyTime = (value) => value.replace(/[^\d.,\s-]/g, "");
const onlyNumber = (value) => value.replace(/[^\d.,]/g, "");

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
    if (!Number.isNaN(numericValue) || /^\d+\s*-\s*\d+$/.test(timeStr)) {
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
    return `x${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}`;
  };

  if (!isEditMode) {
    const soakText = !item.soaking_time
      ? null
      : isOvernight(item.soaking_time)
        ? t("overnight_soak", "Soak overnight")
        : t("soak_time", {
            time: formatTime(item.soaking_time, t("hours_short", "h")),
            defaultValue: "Soak {{time}}",
          });
    const cookText = item.cooking_time
      ? formatTime(item.cooking_time, t("minutes_short", "min"))
      : null;

    let weightText = null;
    if (item.dry_weight || item.cooked_weight) {
      const weightPart = [];
      if (item.dry_weight)
        weightPart.push(`${formatWeight(item.dry_weight)} ${t("dry", "dry")}`);
      if (item.cooked_weight)
        weightPart.push(
          `${formatWeight(item.cooked_weight)} ${t("cooked", "cooked")}`
        );
      weightText = weightPart.join(" → ");
    }
    const ratio = getConversionRatio(item.dry_weight, item.cooked_weight);

    // One row per ingredient: name on the left, cooking time on the right with
    // soaking time underneath it, weights and notes in a grey line below
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 py-2">
        <span className="text-base font-medium [word-break:break-word]">
          {item.ingredient_name}
        </span>

        {(cookText || soakText) && (
          <span className="row-span-2 grid content-start justify-items-end text-right">
            {cookText && (
              <span className="font-medium tabular-nums">{cookText}</span>
            )}
            {soakText && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {soakText}
              </span>
            )}
          </span>
        )}

        {(weightText || item.notes) && (
          <span className="col-start-1 flex flex-wrap items-center gap-x-3.5 gap-y-0.5 text-sm text-muted-foreground">
            {weightText && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Scale className="size-3.5" />
                {weightText}
                {ratio && <span>{ratio}</span>}
              </span>
            )}
            {item.notes && <span className="italic">{item.notes}</span>}
          </span>
        )}
      </div>
    );
  }

  // Edit mode - display as editable row
  const overnight = isOvernight(item.soaking_time);
  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      className={cn(
        "flex items-start gap-2 p-2 transition-colors",
        index > 0 && "border-t border-border",
        snapshot?.isDragging &&
          "rounded-lg border border-border bg-card shadow-md"
      )}
    >
      <div
        {...provided?.dragHandleProps}
        data-slot="drag-handle"
        className="flex h-8 shrink-0 cursor-grab items-center text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
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
            className="flex-1"
            placeholder={t("ingredient_name", "Ingredient name")}
          />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost-destructive"
                  size="icon-sm"
                  onClick={() => removeItem(sectionId, item.tempId)}
                  aria-label={t("delete", "Delete")}
                >
                  <Trash2 size={16} />
                </Button>
              }
            />
            <TooltipContent>{t("delete", "Delete")}</TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            id={`cooking-time-cooking-time-${sectionId}-${index}-${item.tempId}`}
            type="text"
            inputMode="decimal"
            value={item.cooking_time || ""}
            onChange={(e) =>
              handleItemChange(
                sectionId,
                item.tempId,
                "cooking_time",
                onlyTime(e.target.value)
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
            placeholder={t("cooking_time_minutes", "Cooking (min)")}
          />
          <div className="flex items-center gap-2">
            <Input
              id={`cooking-time-soaking-time-${sectionId}-${index}-${item.tempId}`}
              type="text"
              inputMode="decimal"
              value={overnight ? "" : item.soaking_time || ""}
              onChange={(e) =>
                handleItemChange(
                  sectionId,
                  item.tempId,
                  "soaking_time",
                  onlyTime(e.target.value)
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
              placeholder={t("soaking_time_minutes", "Soaking (hrs)")}
              disabled={overnight}
              className="min-w-0 flex-1"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-sm">
              <Checkbox
                checked={overnight}
                onCheckedChange={(checked) =>
                  handleItemChange(
                    sectionId,
                    item.tempId,
                    "soaking_time",
                    checked ? OVERNIGHT : ""
                  )
                }
              />
              {t("overnight", "Overnight")}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            id={`cooking-time-dry-weight-${sectionId}-${index}-${item.tempId}`}
            type="text"
            inputMode="decimal"
            value={item.dry_weight > 0 ? item.dry_weight : ""}
            onChange={(e) =>
              handleItemChange(
                sectionId,
                item.tempId,
                "dry_weight",
                onlyNumber(e.target.value)
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
            placeholder={t("dry_weight", "Dry weight (g)")}
          />
          <Input
            id={`cooking-time-cooked-weight-${sectionId}-${index}-${item.tempId}`}
            type="text"
            inputMode="decimal"
            value={item.cooked_weight > 0 ? item.cooked_weight : ""}
            onChange={(e) =>
              handleItemChange(
                sectionId,
                item.tempId,
                "cooked_weight",
                onlyNumber(e.target.value)
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
            placeholder={t("cooked_weight", "Cooked weight (g)")}
          />
        </div>

        <Input
          id={`cooking-time-notes-${sectionId}-${index}-${item.tempId}`}
          type="text"
          value={item.notes || ""}
          onChange={(e) =>
            handleItemChange(sectionId, item.tempId, "notes", e.target.value)
          }
          onKeyDown={(e) =>
            handleItemFieldEnter?.(e, "notes", sectionId, item.tempId, index)
          }
          placeholder={t("optional_notes", "Optional notes")}
        />
      </div>
    </div>
  );
};

export default CookingTimeRow;
