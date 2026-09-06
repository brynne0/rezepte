import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

// Known fields get a translated label and a unit; any other key present in
// the data still renders, just with its raw name and no unit.
const KNOWN_NUTRITION_FIELDS = {
  calories: { labelKey: "nutrition_calories", unit: "kcal" },
  protein: { labelKey: "nutrition_protein", unit: "g" },
  fat: { labelKey: "nutrition_fat", unit: "g" },
  carbs: { labelKey: "nutrition_carbs", unit: "g" },
  fiber: { labelKey: "nutrition_fiber", unit: "g" },
  sugar: { labelKey: "nutrition_sugar", unit: "g" },
  sodium: { labelKey: "nutrition_sodium", unit: "mg" },
};

// Normalise DB value into an array of column objects
const toColumns = (nutrition) => {
  if (!nutrition) return null;
  if (nutrition.columns) return nutrition.columns;
  // Old flat format
  return [{ label: "", ...nutrition }];
};

// Every key present on any column (besides "label") becomes a row, so the
// table isn't limited to a fixed set of nutrients.
const collectNutrientKeys = (columns) => {
  const seen = new Set();
  columns.forEach((col) => {
    Object.keys(col).forEach((key) => {
      if (key !== "label" && col[key] != null) seen.add(key);
    });
  });
  return [...seen];
};

const formatNutrientValue = (value, unit) => {
  const parsed = parseFloat(value);
  const display = Number.isNaN(parsed) ? value : parsed;
  return unit ? `${display} ${unit}` : `${display}`;
};

const NutritionPanel = ({ recipe }) => {
  const { t } = useTranslation();

  const columns = toColumns(recipe.nutrition);
  if (!columns) return null;

  const hasColumnLabels = columns.some((col) => col.label);
  const nutrientKeys = collectNutrientKeys(columns);

  return (
    <Accordion defaultValue={["nutrition-info"]}>
      <AccordionItem value="nutrition-info">
        <AccordionTrigger>
          <h2>{t("nutritional_info")}:</h2>
        </AccordionTrigger>
        <AccordionContent>
          <Table className="md:w-fit">
            {hasColumnLabels && (
              <TableHeader>
                <TableRow>
                  <TableHead />
                  {columns.map((col, i) => (
                    <TableHead key={i} className="text-right">
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {nutrientKeys.map((key) => {
                const field = KNOWN_NUTRITION_FIELDS[key];
                return (
                  <TableRow key={key}>
                    <TableCell className="pr-8">
                      {field ? t(field.labelKey) : key}
                    </TableCell>
                    {columns.map((col, i) => (
                      <TableCell key={i} className="text-right font-medium">
                        {col[key] != null
                          ? formatNutrientValue(col[key], field?.unit)
                          : "–"}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default NutritionPanel;
