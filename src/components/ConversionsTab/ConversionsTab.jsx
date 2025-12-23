import { useTranslation } from "react-i18next";
import "./ConversionsTab.css";

// Quick reference guide for cooking measurements
const conversions = {
  volume: [
    // Teaspoons & Tablespoons
    "3 tsp = 1 tbsp",
    "4 tbsp = 1/4 cup",

    // To ml
    "1 tsp = 5 ml",
    "1 tbsp = 15 ml",
    "1 fl oz = 30 ml",
    "1 cup = 236 ml",
  ],

  weight: [
    // Ounces & Pounds
    "1 oz = 28 g",
    "1 lb = 454 g",
  ],

  temperature: [
    // Common Baking Temperatures
    "150°C = 300°F",
    "160°C = 320°F",
    "180°C = 350°F",
    "190°C = 375°F",
    "200°C = 400°F",
    "220°C = 425°F",
  ],
};

const ConversionsTab = () => {
  const { t } = useTranslation();

  return (
    <div className="grid">
      {Object.keys(conversions).map((category) => {
        const categoryConversions = conversions[category];
        if (categoryConversions.length === 0) return null;

        return (
          <div key={category}>
            <div className="cookingtime-section-subheading">
              <h3>
                {t(
                  category,
                  category.charAt(0).toUpperCase() + category.slice(1)
                )}
              </h3>
            </div>
            <div>
              {categoryConversions.map((conversion, index) => (
                <div key={index}>{conversion}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversionsTab;
