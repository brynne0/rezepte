// Small words that only show up in one of the two languages; nouns are left
// out so loanwords like "Topping" or "Pancakes" don't sway the result
const MARKER_WORDS = {
  en: new Set([
    "the",
    "and",
    "with",
    "into",
    "until",
    "for",
    "of",
    "to",
    "then",
    "add",
    "stir",
    "minutes",
    "minute",
    "cup",
    "cups",
    "tablespoon",
    "tablespoons",
    "teaspoon",
    "teaspoons",
    "bake",
    "heat",
    "cook",
    "remove",
    "from",
    "over",
    "about",
    "each",
    "your",
    "it",
    "is",
    "or",
    "a",
    "on",
    "at",
    "chopped",
    "sliced",
    "large",
    "small",
  ]),
  de: new Set([
    "und",
    "die",
    "der",
    "das",
    "den",
    "dem",
    "mit",
    "für",
    "bis",
    "ein",
    "eine",
    "einen",
    "dann",
    "minuten",
    "backen",
    "ist",
    "oder",
    "auf",
    "aus",
    "vom",
    "zum",
    "im",
    "nach",
    "etwa",
    "alles",
    "etwas",
    "noch",
    "nicht",
    "zugeben",
    "unterrühren",
    "kochen",
    "geben",
    "gehackt",
    "große",
    "kleine",
  ]),
};

// Needs this many marker words, with the winner this many times the other
const MIN_MARKERS = 5;
const MIN_RATIO = 3;

// "en", "de", or null when the text is too short or too mixed to tell
export const detectLanguage = (text) => {
  const words = String(text ?? "")
    .toLowerCase()
    .match(/[a-zäöüß]+/g);
  if (!words) return null;

  let en = 0;
  let de = 0;
  for (const word of words) {
    if (MARKER_WORDS.en.has(word)) en++;
    else if (MARKER_WORDS.de.has(word) || /[äöüß]/.test(word)) de++;
  }

  if (en + de < MIN_MARKERS) return null;
  if (en >= de * MIN_RATIO && en > de) return "en";
  if (de >= en * MIN_RATIO && de > en) return "de";
  return null;
};

// All the written text of a recipe form, for detectLanguage
export const recipeFormText = (formData) => {
  const ingredients = [
    ...(formData.ungroupedIngredients || []),
    ...(formData.ingredientSections || []).flatMap((s) => [
      { name: s.subheading },
      ...(s.ingredients || []),
    ]),
  ];
  return [
    formData.title,
    ...ingredients.flatMap((i) => [i.name, i.notes]),
    ...(formData.instructions || []),
    formData.notes,
  ]
    .filter(Boolean)
    .join(" ");
};
