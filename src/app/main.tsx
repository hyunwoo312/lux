import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { App } from "@/app/App";
import { AppErrorBoundary } from "@/app/AppErrorBoundary";
import { applyThemeClass, getStoredMode, resolveTheme } from "@/lib/theme";
import { applyAccentClass, getStoredAccent } from "@/stores/useAccentStore";
import { pruneSettledRemovals } from "@/widgets/core/instanceRemoval";
import "@/styles/globals.css";

applyThemeClass(resolveTheme(getStoredMode()));
applyAccentClass(getStoredAccent());
pruneSettledRemovals();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </AppErrorBoundary>
  </StrictMode>,
);
