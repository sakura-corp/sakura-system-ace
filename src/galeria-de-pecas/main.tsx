// A mostra das peças do visual novo (#990). NÃO faz parte do programa das
// lojas: nada do programa importa esta pasta, então ela não entra no
// instalador. Só abre pelo servidor de desenvolvimento, em
// docs/referencia/visual-novo/pecas.html.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "../styles/globals.css";
import { AvisosQueSomem } from "@/components/AvisoQueSome";
import { aplicarTemaGuardado } from "@/lib/tema";
import { GaleriaDePecas } from "./GaleriaDePecas";

aplicarTemaGuardado();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <AvisosQueSomem />
      <GaleriaDePecas />
    </MemoryRouter>
  </StrictMode>,
);
