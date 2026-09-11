import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { registerSW } from "virtual:pwa-register";
// import { SpeedInsights } from "@vercel/speed-insights/next";

import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { queryClient } from "./lib/queryClient";
import "./lib/i18n";
import "./style.css";

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60 * 60 * 1000);
  },
  onRegisterError(error) {
    console.error("SW registration failed:", error);
  },
});

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: "rezepte-query-cache",
});

const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days, matches queryClient gcTime

const persistOptions = {
  persister,
  maxAge: PERSIST_MAX_AGE,
  buster: "v1",
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      ["recipe", "recipes", "categories", "cookingTimes"].includes(
        query.queryKey[0]
      ) && query.state.status === "success",
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </PersistQueryClientProvider>
  </StrictMode>
);
