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

const NutritionPanel = ({ recipe, multiplier }) => {
  const { t } = useTranslation();

  if (!recipe.nutrition) return null;

  const scaledValue = (raw) => {
    if (raw == null) return null;
    return parseFloat((raw * multiplier).toFixed(1));
  };

  const servingLabel =
    multiplier === 1
      ? t("nutrition_per_serving")
      : `${t("nutrition_per_serving")} x${multiplier}`;

  return (
    <>
      <div className="recipe-subheading">
        <h2>{t("nutritional_info")}:</h2>
        <span className="grey-small">({servingLabel})</span>
      </div>
      <div className="nutrition-table">
        {NUTRITION_FIELDS.map(({ key, labelKey, unit }) => {
          const value = scaledValue(recipe.nutrition[key]);
          if (value == null) return null;
          return (
            <div key={key} className="nutrition-row ">
              <span className="grey-small">{t(labelKey)}</span>
              <span className="nutrition-value">
                {value} {unit}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default NutritionPanel;
