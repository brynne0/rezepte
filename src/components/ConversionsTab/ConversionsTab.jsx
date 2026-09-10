import { useTranslation } from "react-i18next";
import { Beaker, Scale, Thermometer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Quick reference guide for cooking measurements
const conversions = {
  volume: {
    icon: Beaker,
    items: [
      // Teaspoons & Tablespoons
      "3 tsp = 1 tbsp",
      "4 tbsp = 1/4 cup",
      "1 cup = 16 tbsp",

      // To ml
      "1 tsp = 5 ml",
      "1 tbsp = 15 ml",
      "1 cup = 236 ml",
    ],
  },

  weight: {
    icon: Scale,
    items: [
      // Ounces & Pounds
      "1 oz = 28 g",
      "1 lb = 454 g",

      "canned_translation",
    ],
  },

  temperature: {
    icon: Thermometer,
    items: [
      // Common Baking Temperatures
      "150°C = 300°F",
      "160°C = 320°F",
      "180°C = 350°F",
      "190°C = 375°F",
      "200°C = 400°F",
      "220°C = 425°F",
    ],
  },
};

const ConversionsTab = () => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Object.entries(conversions).map(([category, data]) => {
        if (data.items.length === 0) return null;

        return (
          <Card
            key={category}
            size="sm"
            className="border-primary/50 bg-muted/20"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <data.icon className="size-4 text-muted-foreground" />
                {t(
                  category,
                  category.charAt(0).toUpperCase() + category.slice(1)
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5 text-sm text-foreground">
              {data.items.map((conversion, index) => (
                <div key={index}>
                  {conversion.includes("=") && !conversion.includes("°")
                    ? conversion
                    : t(conversion, conversion)}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ConversionsTab;
