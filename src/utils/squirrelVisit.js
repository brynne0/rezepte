// About 1 in ODDS recipes get the seasonal squirrel, same answer all day
const ODDS = 3;

const hash = (str) => {
  let h = 0;
  for (const ch of str) h = (Math.imul(h, 31) + ch.codePointAt(0)) >>> 0;
  return h;
};

export const squirrelVisits = (recipeId, date = new Date()) => {
  if (!recipeId || !globalThis.window?.squirrels?.season) return false;
  return hash(`${recipeId}-${date.toDateString()}`) % ODDS === 0;
};
