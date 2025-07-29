import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// import { SpeedInsights } from "@vercel/speed-insights/next";

import "../src/styles/index.css";
import App from "./App.jsx";
import "./lib/i18n";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
