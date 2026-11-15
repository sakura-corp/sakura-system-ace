import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { registrarErrosDaTela } from "./lib/registrarErros";
import { BarraDaJanela } from "./components/BarraDaJanela";
import { aplicarBarraDaJanela } from "./lib/barraDaJanela";
import { aplicarTemaGuardado } from "./lib/tema";
// As duas letras do programa, embutidas (arquivos .woff2 dentro do instalador):
// ele roda sem internet, e em PC sem a Inter instalada caía na letra do Windows.
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./styles/globals.css";

registrarErrosDaTela();
// Antes de desenhar a primeira tela, pra ela já nascer no tema escolhido
// neste computador (escuro, se ninguém escolheu).
aplicarTemaGuardado();
aplicarBarraDaJanela();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BarraDaJanela />
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
