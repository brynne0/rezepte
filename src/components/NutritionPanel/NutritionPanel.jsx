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

const NUTRITION_FIELDS = [
  { key: "calories", labelKey: "nutrition_calories", unit: "kcal" },
  { key: "protein", labelKey: "nutrition_protein", unit: "g" },
  { key: "fat", labelKey: "nutrition_fat", unit: "g" },
  { key: "carbs", labelKey: "nutrition_carbs", unit: "g" },
  { key: "fiber", labelKey: "nutrition_fiber", unit: "g" },
  { key: "sugar", labelKey: "nutrition_sugar", unit: "g" },
  { key: "sodium", labelKey: "nutrition_sodium", unit: "mg" },
];

// Normalise DB value into an array of column objects
const toColumns = (nutrition) => {
  if (!nutrition) return null;
  if (nutrition.columns) return nutrition.columns;
  // Old flat format
  return [{ label: "", ...nutrition }];
};

const NutritionPanel = ({ recipe }) => {
  const { t } = useTranslation();

  const columns = toColumns(recipe.nutrition);
  if (!columns) return null;

  const hasColumnLabels = columns.some((col) => col.label);
  const rows = NUTRITION_FIELDS.filter(({ key }) =>
    columns.some((col) => col[key] != null)
  );

  return (
    <Accordion defaultValue={["nutrition-info"]}>
      <AccordionItem value="nutrition-info">
        <AccordionTrigger>{t("nutritional_info")}:</AccordionTrigger>
        <AccordionContent>
          <Table className="md:w-fit">
            {hasColumnLabels && (
              <TableHeader>
                <TableRow>
                  <TableHead />
                  {columns.map((col, i) => (
                    <TableHead key={i}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {rows.map(({ key, labelKey, unit }) => (
                <TableRow key={key}>
                  <TableCell className="pr-8">{t(labelKey)}</TableCell>
                  {columns.map((col, i) => (
                    <TableCell key={i} className=" text-right font-medium">
                      {col[key] != null
                        ? `${parseFloat(col[key])} ${unit}`
                        : "–"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default NutritionPanel;
