import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const el = document.getElementById("root");
if (!el) throw new Error("Root element missing");

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

createRoot(el).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
