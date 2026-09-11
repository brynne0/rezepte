import { useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";

import { emptyNutritionColumn } from "../../../utils/nutritionUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NUTRITION_FORM_FIELDS = [
  { key: "calories", labelKey: "nutrition_calories", unit: "kcal", step: "1" },
  { key: "fiber", labelKey: "nutrition_fiber", unit: "g", step: "0.1" },
  { key: "protein", labelKey: "nutrition_protein", unit: "g", step: "0.1" },
  { key: "sodium", labelKey: "nutrition_sodium", unit: "mg", step: "1" },
  { key: "carbs", labelKey: "nutrition_carbs", unit: "g", step: "0.1" },
  { key: "sugar", labelKey: "nutrition_sugar", unit: "g", step: "0.1" },
  { key: "fat", labelKey: "nutrition_fat", unit: "g", step: "0.1" },
];

const NutritionSection = ({ columns, onChange, isEditingTranslation }) => {
  const { t } = useTranslation();
  const [showNutrition, setShowNutrition] = useState(() =>
    columns.some((col) =>
      ["calories", "protein", "fat", "carbs", "fiber", "sugar", "sodium"].some(
        (k) => col[k] != null
      )
    )
  );

  return (
    <Field className={isEditingTranslation ? "opacity-50" : ""}>
      <Accordion
        value={showNutrition ? ["nutrition"] : []}
        onValueChange={(value) => setShowNutrition(value.includes("nutrition"))}
      >
        <AccordionItem value="nutrition">
          <AccordionTrigger>{t("nutritional_info")}</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto">
                <div
                  className="grid items-center gap-x-2 gap-y-2"
                  style={{
                    gridTemplateColumns: `5rem repeat(${columns.length}, minmax(5.5rem, 8rem)) auto`,
                    width: "max-content",
                    minWidth: "100%",
                  }}
                >
                  {/* Label inputs row — aligned with the columns below */}
                  <span />
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={col.label}
                        onChange={(e) => {
                          const updated = columns.map((c, i) =>
                            i === colIdx ? { ...c, label: e.target.value } : c
                          );
                          onChange(updated);
                        }}
                        placeholder={
                          colIdx === 0
                            ? t("nutrition_per_serving")
                            : t("nutrition_column_placeholder")
                        }
                        disabled={isEditingTranslation}
                      />
                      {columns.length > 1 && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  onChange(
                                    columns.filter((_, i) => i !== colIdx)
                                  )
                                }
                                disabled={isEditingTranslation}
                                aria-label={t("nutrition_remove_column")}
                              >
                                <X size={14} />
                              </Button>
                            }
                          />
                          <TooltipContent>
                            {t("nutrition_remove_column")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ))}
                  <span />
                  {/* Data rows */}
                  {NUTRITION_FORM_FIELDS.map(
                    ({ key, labelKey, unit, step }) => (
                      <Fragment key={key}>
                        <span className="text-sm text-muted-foreground">
                          {t(labelKey)}
                        </span>
                        {columns.map((col, colIdx) => (
                          <Input
                            key={`${key}-${colIdx}`}
                            type="number"
                            min="0"
                            step={step}
                            value={col[key] ?? ""}
                            onChange={(e) => {
                              const updated = columns.map((c, i) =>
                                i === colIdx
                                  ? {
                                      ...c,
                                      [key]:
                                        e.target.value === ""
                                          ? null
                                          : e.target.value,
                                    }
                                  : c
                              );
                              onChange(updated);
                            }}
                            placeholder="–"
                            disabled={isEditingTranslation}
                            onWheel={(e) => e.target.blur()}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground">
                          {unit}
                        </span>
                      </Fragment>
                    )
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => onChange([...columns, emptyNutritionColumn()])}
                disabled={isEditingTranslation}
              >
                <Plus size={16} />
                {t("nutrition_add_column")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Field>
  );
};

export default NutritionSection;
