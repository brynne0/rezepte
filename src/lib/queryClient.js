import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days — must stay >= persister maxAge
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      // "online" (the default) skips fetching while navigator.onLine is
      // false, which also skips the service worker's cache fallback.
      networkMode: "offlineFirst",
    },
  },
});
