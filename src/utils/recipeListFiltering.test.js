import { describe, test, expect } from "vitest";
import {
  filterSortPaginateRecipes,
  getSearchableIngredientNames,
} from "./recipeListFiltering";

const flour = {
  ingredients: {
    id: "i1",
    singular_name: "flour",
    plural_name: "flour",
    translated_names: { de: { singular_name: "Mehl", plural_name: "Mehl" } },
  },
};
const onion = {
  name_overrides: { de: "Rote Zwiebel" },
  ingredients: {
    id: "i2",
    singular_name: "onion",
    plural_name: "onions",
    translated_names: {},
  },
};

const recipes = [
  { id: "r1", title: "Bread", recipe_ingredients: [flour] },
  { id: "r2", title: "Salad", recipe_ingredients: [onion] },
];

const search = (searchTerm, language) =>
  filterSortPaginateRecipes({
    recipes,
    searchTerm,
    language,
    category: "all_recipes",
    sortBy: "title_asc",
    page: 1,
    limit: 10,
  }).recipes.map((r) => r.id);

describe("getSearchableIngredientNames", () => {
  test("returns only names for the given language", () => {
    expect(getSearchableIngredientNames([flour], "de")).toEqual(["mehl"]);
    expect(getSearchableIngredientNames([flour], "en")).toEqual(["flour"]);
  });

  test("includes overrides and falls back to English when untranslated", () => {
    expect(getSearchableIngredientNames([onion], "de")).toEqual([
      "rote zwiebel",
      "onion",
      "onions",
    ]);
  });
});

describe("filterSortPaginateRecipes search", () => {
  test("matches by title", () => {
    expect(search("brea", "en")).toEqual(["r1"]);
  });

  test("matches by ingredient in the current language only", () => {
    expect(search("mehl", "de")).toEqual(["r1"]);
    expect(search("flour", "de")).toEqual([]);
    expect(search("flour", "en")).toEqual(["r1"]);
    expect(search("mehl", "en")).toEqual([]);
  });

  test("matches German override", () => {
    expect(search("zwiebel", "de")).toEqual(["r2"]);
  });
});
