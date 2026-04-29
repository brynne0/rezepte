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

const NutritionPanel = ({ recipe }) => {
  const { t } = useTranslation();

  if (!recipe.nutrition) return null;

  return (
    <>
      <div className="recipe-subheading">
        <h2>{t("nutritional_info")}:</h2>
        <span className="grey-small">({t("nutrition_per_serving")})</span>
      </div>
      <div className="nutrition-table">
        {NUTRITION_FIELDS.map(({ key, labelKey, unit }) => {
          const raw = recipe.nutrition[key];
          if (raw == null) return null;
          const value = parseFloat(raw);
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
