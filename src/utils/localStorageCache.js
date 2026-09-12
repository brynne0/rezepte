// Reads a JSON value written by writeCachedValue for `key`. Returns undefined
// if missing, corrupt, or unavailable (e.g. private browsing with storage
// disabled). Pass `maxAge` (ms) to also treat entries older than that as a
// miss; omit it to read the cache regardless of age.
export const readCachedValue = (key, maxAge) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return undefined;

    const { value, timestamp } = JSON.parse(stored);
    if (maxAge != null && Date.now() - timestamp > maxAge) return undefined;

    return value;
  } catch {
    return undefined;
  }
};

export const writeCachedValue = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled)
  }
};

export const removeCachedValue = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled)
  }
};
