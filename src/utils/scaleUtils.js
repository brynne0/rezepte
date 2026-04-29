import { parseFraction, formatQuantity } from "./fractionUtils";

// Scale up: if scaled value >= threshold, convert to bigger unit
const UNIT_UP = {
  tsp: { threshold: 3, factor: 1 / 3, unit: "tbsp" },
  tbsp: { threshold: 4, factor: 1 / 16, unit: "cup/s" },
  ml: { threshold: 1000, factor: 1 / 1000, unit: "l" },
  g: { threshold: 1000, factor: 1 / 1000, unit: "kg" },
};

// Scale down: if scaled value < threshold, convert to smaller unit
const UNIT_DOWN = {
  "cup/s": { threshold: 0.25, factor: 16, unit: "tbsp" },
  tbsp: { threshold: 1 / 3, factor: 3, unit: "tsp" },
  l: { threshold: 0.1, factor: 1000, unit: "ml" },
  kg: { threshold: 0.1, factor: 1000, unit: "g" },
};

function convertUnit(value, unit) {
  let up = UNIT_UP[unit];
  while (up && value >= up.threshold) {
    value *= up.factor;
    unit = up.unit;
    up = UNIT_UP[unit];
  }

  let down = UNIT_DOWN[unit];
  while (down && value > 0 && value < down.threshold) {
    value *= down.factor;
    unit = down.unit;
    down = UNIT_DOWN[unit];
  }

  return { value, unit };
}

/**
 * Scale an ingredient's quantity and apply unit conversions where applicable.
 * Returns { quantity, unit } with the scaled values.
 */
export function scaleIngredient(quantity, unit, multiplier) {
  if (!quantity || multiplier === 1) return { quantity, unit };

  const str = quantity.toString().trim();

  // Handle ranges like "1-2", "1/2 - 1", "2–3"
  const rangeMatch = str.match(/^(.+?)\s*([-–—])\s*(.+)$/);
  if (rangeMatch) {
    const [, startStr, sep, endStr] = rangeMatch;
    const startVal = parseFraction(startStr.trim());
    const endVal = parseFraction(endStr.trim());
    if (typeof startVal === "number" && typeof endVal === "number") {
      // Scale both ends but keep the original unit (unit conversion is ambiguous for ranges)
      return {
        quantity: `${formatQuantity(startVal * multiplier)} ${sep} ${formatQuantity(endVal * multiplier)}`,
        unit,
      };
    }
    return { quantity, unit };
  }

  // Strip a leading ~ (approximately) prefix and reattach after scaling
  const approxMatch = str.match(/^(~)\s*(.+)$/);
  const prefix = approxMatch ? "~" : "";
  const valueStr = approxMatch ? approxMatch[2] : str;

  // Parse single quantity value
  const parsed = parseFraction(valueStr);
  if (typeof parsed !== "number") return { quantity, unit };

  const rawValue = parsed * multiplier;
  const { value, unit: convertedUnit } = convertUnit(
    Math.round(rawValue * 10000) / 10000,
    unit || ""
  );

  return {
    quantity: prefix + formatQuantity(value),
    unit: convertedUnit || unit,
  };
}

// Common multiplier steps for recipes without a servings count
const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 6, 8];

export function getNextMultiplierStep(current, direction) {
  if (direction === 1) {
    const next = MULTIPLIER_STEPS.find((s) => s > current);
    return next ?? MULTIPLIER_STEPS[MULTIPLIER_STEPS.length - 1];
  } else {
    const prev = [...MULTIPLIER_STEPS].reverse().find((s) => s < current);
    return prev ?? MULTIPLIER_STEPS[0];
  }
}

export function formatMultiplierLabel(multiplier) {
  const labels = {
    0.25: "1/4x",
    0.5: "1/2x",
    0.75: "3/4x",
    1: "1x",
    1.5: "1.5x",
    2: "2x",
    2.5: "2.5x",
    3: "3x",
    4: "4x",
    6: "6x",
    8: "8x",
  };
  return labels[multiplier] ?? `${multiplier}x`;
}
