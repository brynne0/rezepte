/**
 * Capitalizes the first letter of each word in a string
 * @param {string} str - The string to convert to title case
 * @returns {string} The title-cased string
 */
export const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
