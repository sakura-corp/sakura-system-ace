import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Rede de segurança pra erro de RENDERIZAÇÃO (metade do item TR-08.3).
 *
 * O que ela resolve: até aqui, um erro dentro de um componente derrubava a
 * árvore inteira do React e deixava a janela **em branco** — sem mensagem,
 * sem botão, sem saída a não ser fechar o programa. No balcão, com cliente
 * esperando, isso é o pior desfecho possível: a pessoa não sabe o que
 * aconteceu nem o que fazer, e quando reabre o app o rastro já sumiu.
 *
 * O que ela NÃO resolve, de propósito: erro que acontece dentro de um
 * `onClick` ou de uma promessa (a maioria dos deste app, que são chamadas ao
 * Supabase). Esses nunca chegam aqui — quem os registra é o
 * `registrarErrosDaTela`, e quem os mostra é o `setErro` de cada tela. Um
 * limite de erro do React só pega o que estoura durante a renderização.
 *
 * Dois cuidados no desenho:
 *
 * - **Ela se apaga ao trocar de tela.** Sem isso, "Voltar ao Início" mudaria
 *   a rota e continuaria mostrando a mesma mensagem de erro, porque o estado
 *   do limite não se desfaz sozinho — o botão pareceria quebrado.
 * - **O erro vai pro `erros.log` antes de qualquer coisa.** É exatamente o
 *   caso em que não há console pra olhar depois.
 */

interface Props {
  children: ReactNode;
  /** Muda quando a rota muda: é o que faz o limite se apagar sozinho. */
  chaveDeReinicio: string;
  aoVoltarParaOInicio: () => void;
  aoAbrirDiagnostico: () => void;
}

interface Estado {
  erro: Error | null;
}

class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    const linha = [
      `Erro ao desenhar a tela: ${erro.message}`,
      erro.stack,
      info.componentStack ? `Componentes: ${info.componentStack.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    console.error(linha);
    window.sakuraApp?.registrarErro?.(linha);
  }

  componentDidUpdate(anterior: Props) {
    if (this.state.erro && anterior.chaveDeReinicio !== this.props.chaveDeReinicio) {
      this.setState({ erro: null });
    }
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="sakura-card mx-auto max-w-xl space-y-4 p-8 text-center">
        <h1 className="text-titulo font-semibold text-sakura-purple-dark">
          Alguma coisa quebrou nesta tela
        </h1>
        <p className="text-corpo text-sakura-muted">
          O resto do sistema continua funcionando. O erro foi registrado neste computador — se
          acontecer de novo, abra o Diagnóstico e mande o arquivo pro suporte.
        </p>
        <p className="break-words rounded-xl bg-black/30 p-3 text-meta text-sakura-purple-dark">
          {this.state.erro.message}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={this.props.aoVoltarParaOInicio}
            className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-sobre-acao transition-all hover:bg-sakura-pink"
          >
            Voltar ao Início
          </button>
          <button
            onClick={this.props.aoAbrirDiagnostico}
            className="rounded-xl border border-sakura-borda-campo px-4 py-2 text-corpo font-medium text-sakura-purple-dark transition-all hover:bg-white/10"
          >
            Abrir diagnóstico
          </button>
        </div>
      </div>
    );
  }
}

/** Envolve o limite com o que ele precisa do roteador (classe não usa hook). */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const local = useLocation();
  const navegar = useNavigate();
  return (
    <LimiteDeErro
      chaveDeReinicio={local.pathname}
      aoVoltarParaOInicio={() => navegar("/")}
      aoAbrirDiagnostico={() => navegar("/diagnostico")}
    >
      {children}
    </LimiteDeErro>
  );
}
