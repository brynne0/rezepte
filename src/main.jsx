import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
// import { SpeedInsights } from "@vercel/speed-insights/next";

import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { queryClient } from "./lib/queryClient";
import "./lib/i18n";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
