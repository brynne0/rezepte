import { describe, test, expect, afterEach } from "vitest";
import { squirrelVisits } from "./squirrelVisit";

const day = new Date(2026, 11, 10);
const ids = Array.from({ length: 300 }, (_, i) => `recipe-${i}`);
const inSeason = () =>
  (window.squirrels = { season: "reindeer", drawings: {} });

describe("squirrelVisits", () => {
  afterEach(() => {
    delete window.squirrels;
  });

  test("never visits outside a season", () => {
    window.squirrels = { season: "", drawings: {} };
    expect(ids.some((id) => squirrelVisits(id, day))).toBe(false);
  });

  test("visits some recipes, not all, during a season", () => {
    inSeason();
    const visited = ids.filter((id) => squirrelVisits(id, day)).length;
    expect(visited).toBeGreaterThan(50);
    expect(visited).toBeLessThan(150);
  });

  test("same answer all day for a recipe", () => {
    inSeason();
    const evening = new Date(2026, 11, 10, 22);
    ids.forEach((id) =>
      expect(squirrelVisits(id, evening)).toBe(squirrelVisits(id, day))
    );
  });

  test("no recipe id, no squirrel", () => {
    inSeason();
    expect(squirrelVisits(undefined, day)).toBe(false);
  });
});
