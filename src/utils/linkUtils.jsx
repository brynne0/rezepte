// Matches URLs starting with http(s):// or www.
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

// Trailing punctuation is almost never part of the URL itself (e.g. "see www.example.com."
// or "(www.example.com)"), so strip it before using the match as an href.
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)\]}]+$/;

const normalizeUrl = (url) => {
  const trimmed = url.replace(TRAILING_PUNCTUATION_REGEX, "");
  return trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;
};

// Finds the first URL anywhere in a string of text.
export const extractFirstUrl = (text) => {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  return match ? normalizeUrl(match[0]) : null;
};

// Splits text into an array of strings and clickable <a> elements for any URLs found.
export const linkifyText = (text) => {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (part.match(URL_REGEX)) {
      return (
        <a
          key={index}
          href={normalizeUrl(part)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-red break-all underline-offset-2 hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
