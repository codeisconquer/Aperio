import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import { initTheme } from "./lib/theme";
import "./index.css";
import App from "./App";

initTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
