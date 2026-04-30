import "./NutritionPanel.css";
import { useTranslation } from "react-i18next";

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

  const isDual = columns.length > 1;

  return (
    <>
      <div className="recipe-subheading">
        <h2>{t("nutritional_info")}:</h2>
      </div>
      {isDual ? (
        <div className="nutrition-dual-table">
          {columns.some((col) => col.label) && (
            <div className="nutrition-dual-header">
              <span />
              {columns.map((col, i) => (
                <span key={i} className="grey-small nutrition-col-title">
                  {col.label}
                </span>
              ))}
            </div>
          )}

          {NUTRITION_FIELDS.map(({ key, labelKey, unit }) => {
            const hasAny = columns.some((col) => col[key] != null);
            if (!hasAny) return null;
            return (
              <div key={key} className="nutrition-dual-row">
                <span className="grey-small">{t(labelKey)}</span>
                {columns.map((col, i) => (
                  <span key={i} className="nutrition-value">
                    {col[key] != null ? `${parseFloat(col[key])} ${unit}` : "–"}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="nutrition-table">
          {columns[0]?.label && (
            <div className="nutrition-col-header-single grey-small">
              {columns[0].label}
            </div>
          )}
          {NUTRITION_FIELDS.map(({ key, labelKey, unit }) => {
            const raw = columns[0][key];
            if (raw == null) return null;
            return (
              <div key={key} className="nutrition-row">
                <span className="grey-small">{t(labelKey)}</span>
                <span className="nutrition-value">
                  {parseFloat(raw)} {unit}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default NutritionPanel;
