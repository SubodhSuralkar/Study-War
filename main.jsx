import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Hide the boot splash screen after React's first paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (window.__hideBootScreen) window.__hideBootScreen();
  });
});
