import { vi } from "vitest";

const chainMethods = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "in",
  "or",
  "not",
  "ilike",
  "order",
  "limit",
  "range",
];

const EMPTY_RESULT = Object.freeze({ data: null, error: null });

// Chainable Supabase query builder: a resolved promise with query methods attached
export const mockChain = (resolvedValue = EMPTY_RESULT) => {
  const chain = Object.assign(Promise.resolve(resolvedValue), {
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
  });
  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  return chain;
};

// Queue one chain per supabase.from() call, in order; returns the chains
export const queueFrom = (from, ...resolvedValues) => {
  const chains = resolvedValues.map(mockChain);
  for (const chain of chains) from.mockReturnValueOnce(chain);
  return chains;
};
