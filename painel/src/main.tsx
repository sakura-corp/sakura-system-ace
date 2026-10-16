import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ComLogin } from "./ComLogin";
import "./estilo.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ComLogin />
  </StrictMode>,
);
