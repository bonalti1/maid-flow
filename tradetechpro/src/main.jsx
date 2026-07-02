import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import TradeTechPro from "./TradeTechPro.jsx";

createRoot(document.getElementById("root")).render(<TradeTechPro />);

// Register the offline service worker (PWA installs to the home screen and must
// still open with no signal). Never blocks first paint.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline-first is best-effort */ });
  });
}
