import "./env-shim";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initPerformanceMonitoring } from "./performance/monitoring";

document.documentElement.classList.add("light");
initPerformanceMonitoring();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
