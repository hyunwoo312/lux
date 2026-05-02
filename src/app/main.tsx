import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { App } from "@/app/App";
import { applyThemeClass, getStoredTheme } from "@/lib/theme";
import "@/styles/globals.css";

applyThemeClass(getStoredTheme());

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
