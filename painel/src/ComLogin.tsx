import { useEffect, useState } from "react";
import App from "./App";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";
import { interpretarEu, mensagemDoErro, paginaPraVoltar, type EstadoDoLogin } from "./logica/login";

/**
 * Antes do painel, o login (#353): pergunta ao worker quem está logado (/api/eu).
 * Quem não entrou vê só a tela de entrada. A conferência que vale é a do worker: as rotas
 * com dados de verdade (#354) também exigem a sessão.
 */
export function ComLogin() {
  const [estado, setEstado] = useState<EstadoDoLogin>({ tipo: "carregando" });

  useEffect(() => {
    let vivo = true;
    fetch("/api/eu", { headers: { accept: "application/json" } })
      .then(interpretarEu)
      .catch((): EstadoDoLogin => ({ tipo: "indisponivel" }))
      .then((novo) => {
        if (vivo) setEstado(novo);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const volta = paginaPraVoltar(window.location.pathname, window.location.search);
  if (estado.tipo === "carregando") return <TelaDeEntrada carregando />;
  if (estado.tipo === "dentro") return <App usuario={estado.usuario} />;
  // No PC, só com o `npm run dev` (sem o worker), não tem login: mostra o painel de exemplo.
  if (estado.tipo === "indisponivel" && import.meta.env.DEV) return <App />;
  if (estado.tipo === "indisponivel") {
    return <TelaDeEntrada volta={volta} erro="Não deu pra conferir o login agora. Recarregue a página daqui a pouco." />;
  }
  return <TelaDeEntrada volta={volta} erro={mensagemDoErro(window.location.search)} />;
}
