import { describe, test, expect } from "vitest";
import { detectLanguage, recipeFormText } from "./detectLanguage";

describe("detectLanguage", () => {
  test("recognises an English recipe", () => {
    expect(
      detectLanguage(
        "Lentil Soup. Heat the oil in a pot, then add the onion and cook for 5 minutes. Stir in the lentils with the stock until soft."
      )
    ).toBe("en");
  });

  test("recognises a German recipe", () => {
    expect(
      detectLanguage(
        "Linsensuppe. Das Öl in einem Topf erhitzen, dann die Zwiebel zugeben und 5 Minuten kochen. Die Linsen mit der Brühe weich kochen."
      )
    ).toBe("de");
  });

  test("is not fooled by English loanwords in a German recipe", () => {
    expect(
      detectLanguage(
        "Pancakes mit Topping. Den Teig für die Pancakes in einer Pfanne backen und mit dem Crumble und Ahornsirup servieren."
      )
    ).toBe("de");
  });

  test("returns null when there is too little text", () => {
    expect(detectLanguage("Pasta")).toBeNull();
    expect(detectLanguage("")).toBeNull();
    expect(detectLanguage(undefined)).toBeNull();
  });

  test("returns null when the text is mixed", () => {
    expect(
      detectLanguage("the and with for of und die der mit für")
    ).toBeNull();
  });
});

describe("recipeFormText", () => {
  test("joins title, ingredients, sections, instructions and notes", () => {
    const text = recipeFormText({
      title: "Soup",
      ungroupedIngredients: [{ name: "salt", notes: "to taste" }],
      ingredientSections: [
        { subheading: "Topping", ingredients: [{ name: "cream" }] },
      ],
      instructions: ["Stir well"],
      notes: "Serve hot",
    });

    expect(text).toBe("Soup salt to taste Topping cream Stir well Serve hot");
  });
});
