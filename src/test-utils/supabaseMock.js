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

// Chainable Supabase query builder that resolves to `resolvedValue` when awaited
export const mockChain = (resolvedValue = { data: null, error: null }) => {
  const chain = {
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    then: (resolve, reject) =>
      Promise.resolve(resolvedValue).then(resolve, reject),
  };
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
