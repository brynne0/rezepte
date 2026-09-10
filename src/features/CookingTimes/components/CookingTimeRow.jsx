import { useTranslation } from "react-i18next";
import { Trash2, GripVertical, Timer, Droplet, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";

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
    return `x${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}`;
  };

  if (!isEditMode) {
    const soakText = item.soaking_time
      ? `${formatTime(item.soaking_time, t("hours_short", "h"))} ${t("soak", "soak")}`
      : null;
    const cookText = item.cooking_time
      ? `${formatTime(item.cooking_time, t("minutes_short", "min"))} ${t("cook", "cook")}`
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

    return (
      <Item
        variant="outline"
        size="sm"
        className="items-start border-primary/50 bg-muted/20"
      >
        <ItemContent>
          <ItemTitle className="text-base">{item.ingredient_name}</ItemTitle>
          {(soakText || cookText) && (
            <ItemDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
              {soakText && (
                <span className="inline-flex items-center gap-1">
                  <Droplet className="size-3.5" />
                  {soakText}
                </span>
              )}
              {cookText && (
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3.5" />
                  {cookText}
                </span>
              )}
            </ItemDescription>
          )}
          {weightText && (
            <ItemDescription className="inline-flex items-center gap-1 text-foreground">
              <Scale className="size-3.5" />
              {weightText}
              {ratio && (
                <Badge variant="outline" className="ml-1">
                  {ratio}
                </Badge>
              )}
            </ItemDescription>
          )}
          {item.notes && (
            <ItemDescription className="italic">{item.notes}</ItemDescription>
          )}
        </ItemContent>
      </Item>
    );
  }

  // Edit mode - display as editable row
  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-primary/50 bg-muted/20 p-3 transition-colors",
        snapshot?.isDragging && "border-ring bg-muted/50 shadow-sm"
      )}
    >
      <div
        {...provided?.dragHandleProps}
        className="mt-2.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
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
            placeholder={t("cooking_time_minutes", "Cooking (min)")}
          />
          <Input
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
            placeholder={t("soaking_time_minutes", "Soaking (hrs)")}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
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
            placeholder={t("dry_weight", "Dry weight (g)")}
            onWheel={(e) => e.target.blur()}
          />
          <Input
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
            placeholder={t("cooked_weight", "Cooked weight (g)")}
            onWheel={(e) => e.target.blur()}
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
