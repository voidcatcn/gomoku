import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";

// Tauri bundles the app locally and does not support service workers; only
// browsers should install the PWA.
const isTauri = "__TAURI_INTERNALS__" in window;
if (import.meta.env.PROD && !isTauri && "serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
