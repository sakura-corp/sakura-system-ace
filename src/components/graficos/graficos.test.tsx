// @vitest-environment jsdom
/**
 * A peça comum de gráfico de Relações (#1086) e os 6 desenhos.
 *
 * O que se prova aqui:
 * - nenhum desenho de linha usa curva (só M, L, H e V no caminho);
 * - o gráfico é uma parada só do Tab, e as setas, Home, End e Esc andam de
 *   marca em marca mostrando a dica (a mesma do mouse);
 * - "Ver como tabela" abre com Enter, e o botão diz se está aberto;
 * - o nome do gráfico pro leitor de tela é a frase do título;
 * - prejuízo vem com "−" e ▼ (a cor sozinha não avisa), e "custo não
 *   informado" vem com a palavra e o link.
 */
import { describe, expect, it } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { CartaoDeGrafico } from "./CartaoDeGrafico";
import { temCurva } from "./escala";
import { GraficoColunasPorDia } from "./GraficoColunasPorDia";
import { GraficoDegraus } from "./GraficoDegraus";
import { GraficoMesAcumulado } from "./GraficoMesAcumulado";
import { GraficoPareto } from "./GraficoPareto";
import { GraficoPonte } from "./GraficoPonte";
import { GraficoRanking } from "./GraficoRanking";
import { TabelaDoGrafico } from "./TabelaDoGrafico";

const curto = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

const COLUNAS = [
  { chave: "d1", rotulo: "seg", sub: "17", valor: 1200 },
  { chave: "d2", rotulo: "ter", sub: "18", valor: 900 },
  { chave: "d3", rotulo: "dom", sub: "19", valor: null },
  { chave: "d4", rotulo: "qua", sub: "20", valor: 1500 },
];

function caminhosDa(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("path")).map((p) => p.getAttribute("d") ?? "");
}

describe("nenhum gráfico usa curva", () => {
  it("o mês somando, a ponte, os degraus e as colunas: só retas", () => {
    const { container } = renderizar(
      <div>
        <GraficoMesAcumulado
          atual={[100, 250, 250, 600]}
          anterior={[80, 200, 420, 500, 700, 900]}
          diasNoMes={30}
          nomeAtual="Novembro"
          nomeAnterior="Outubro"
          diferenca="R$ 100 acima"
          formatarCurto={curto}
        />
        <GraficoPonte
          formatarCurto={curto}
          degraus={[
            { chave: "v", rotulo: "Vendido", valor: 1000, tipo: "total", de: 0, ate: 1000 },
            { chave: "c", rotulo: "Custo", valor: 400, tipo: "menos", de: 1000, ate: 600 },
            { chave: "s", rotulo: "Sobrou", valor: 600, tipo: "total", de: 0, ate: 600 },
          ]}
        />
        <GraficoDegraus
          formatarCurto={curto}
          dias={[
            { chave: "a", rotulo: "17/11", entra: 500, sai: 0, saldo: 500 },
            { chave: "b", rotulo: "18/11", entra: 0, sai: 800, saldo: -300 },
            { chave: "c", rotulo: "19/11", entra: 1000, sai: 0, saldo: 700 },
          ]}
          maisBaixo={{ indice: 1, texto: "− R$ 300 em 18/11: aluguel" }}
          fim="R$ 700 em 19/11"
        />
        <GraficoColunasPorDia colunas={COLUNAS} destacar={3} media={{ valor: 1000 }} formatarCurto={curto} />
      </div>,
    );
    const caminhos = caminhosDa(container);
    // As duas linhas do mês e o saldo em degraus, pelo menos.
    expect(caminhos.length).toBeGreaterThanOrEqual(3);
    for (const d of caminhos) expect(temCurva(d), d).toBe(false);
    expect(container.querySelector('[data-linha="saldo"]')?.getAttribute("d")).toMatch(/H.*V/);
  });
});

describe("o cartão de gráfico", () => {
  function montarCartao() {
    return renderizar(
      <CartaoDeGrafico
        id="dia-a-dia"
        nome="Dia a dia"
        titulo="Hoje está R$ 500 acima da média"
        tabela={
          <TabelaDoGrafico
            colunas={[
              { chave: "dia", titulo: "Dia" },
              { chave: "vendido", titulo: "Vendido", numero: true },
            ]}
            linhas={[{ chave: "d1", celulas: { dia: "seg 17", vendido: "R$ 1.200,00" } }]}
          />
        }
        verTodos={{ rotulo: "Ver os 4 dias", conteudo: <p>A lista inteira</p> }}
      >
        <GraficoColunasPorDia colunas={COLUNAS} destacar={3} formatarCurto={curto} />
      </CartaoDeGrafico>,
    );
  }

  it("o gráfico se chama pela frase do título (o que o leitor de tela lê)", () => {
    montarCartao();
    expect(screen.getByRole("figure", { name: "Hoje está R$ 500 acima da média" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hoje está R$ 500 acima da média" })).toBeInTheDocument();
    expect(document.getElementById("dia-a-dia")).not.toBeNull();
  });

  it("é uma parada só do Tab, e as setas, Home, End e Esc andam pelas marcas com a dica", async () => {
    const { user } = montarCartao();
    const marcas = screen.getAllByRole("img");
    expect(marcas).toHaveLength(4);
    expect(marcas.filter((m) => m.getAttribute("tabindex") === "0")).toHaveLength(1);

    await user.tab();
    expect(marcas[0]).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("seg 17: R$ 1.200");
    expect(marcas[0]).toHaveAccessibleName("seg 17: R$ 1.200");

    await user.keyboard("{ArrowRight}");
    expect(marcas[1]).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("ter 18: R$ 900");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tooltip")).toHaveTextContent("dom 19: sem venda");

    await user.keyboard("{End}");
    expect(marcas[3]).toHaveFocus();
    await user.keyboard("{ArrowRight}"); // no fim, fica no fim
    expect(marcas[3]).toHaveFocus();
    await user.keyboard("{Home}");
    expect(marcas[0]).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(marcas[0]).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(marcas[0]).toHaveFocus();

    // Saindo do gráfico, o próximo Tab já é o rodapé (não passa por 4 colunas).
    await user.tab();
    expect(screen.getByRole("button", { name: "Ver como tabela" })).toHaveFocus();
  });

  it("passar o mouse mostra a mesma dica do teclado", async () => {
    const { user } = montarCartao();
    await user.hover(screen.getAllByRole("img")[3]);
    expect(screen.getByRole("tooltip")).toHaveTextContent("qua 20: R$ 1.500");
    await user.unhover(screen.getAllByRole("img")[3]);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("\"Ver como tabela\" abre com Enter, no lugar do gráfico, e volta", async () => {
    const { user } = montarCartao();
    const botao = screen.getByRole("button", { name: "Ver como tabela" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    botao.focus();
    await user.keyboard("{Enter}");
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(botao).toHaveTextContent("Ver como gráfico");
    const tabela = screen.getByRole("table");
    expect(within(tabela).getByRole("cell", { name: "R$ 1.200,00" })).toHaveClass("text-right");
    expect(screen.queryByRole("figure")).toBeNull();

    await user.keyboard("{Enter}");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("figure")).toBeInTheDocument();
  });

  it("\"Ver todos\" abre a lista completa numa janela", async () => {
    const { user } = montarCartao();
    await user.click(screen.getByRole("button", { name: "Ver os 4 dias" }));
    expect(screen.getByRole("dialog", { name: "Dia a dia" })).toHaveTextContent("A lista inteira");
  });
});

describe("cada desenho", () => {
  it("colunas por dia: o dia sem venda aparece com \"—\", e a média vem escrita", () => {
    const { container } = renderizar(
      <GraficoColunasPorDia colunas={COLUNAS} destacar={3} media={{ valor: 1000 }} formatarCurto={curto} />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(within(screen.getAllByRole("img")[2]).getByText("—")).toBeInTheDocument();
    const media = container.querySelector("[data-linha-de-referencia]");
    expect(media).toHaveTextContent("média");
    expect(media).toHaveTextContent("R$ 1.000");
  });

  it("a ponte: o Sobrou negativo vem vermelho, com \"−\" e ▼", () => {
    renderizar(
      <GraficoPonte
        formatarCurto={curto}
        degraus={[
          { chave: "v", rotulo: "Vendido", valor: 1000, tipo: "total", de: 0, ate: 1000 },
          { chave: "c", rotulo: "Custo", valor: 700, tipo: "menos", de: 1000, ate: 300 },
          { chave: "d", rotulo: "Aluguel", valor: -500, tipo: "menos", de: 300, ate: -200 },
          { chave: "s", rotulo: "Sobrou", valor: -200, tipo: "total", de: 0, ate: -200 },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Custo: − R$ 700" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Aluguel: − R$ 500" })).toBeInTheDocument();
    const sobrou = screen.getByRole("img", { name: "Sobrou: − R$ 200 ▼" });
    expect(sobrou.querySelector("rect[style*='perigo']")).not.toBeNull();
  });

  it("o ranking: prejuízo com \"−\" e ▼; custo não informado com a palavra e o link; o teclado anda", async () => {
    const { user } = renderizar(
      <GraficoRanking
        media={38}
        formatarCurto={curto}
        linhas={[
          { chave: "1", nome: "Alinhamento", valor: 4100, percentual: 62, tipo: "servico", custoNaoInformado: false },
          { chave: "2", nome: "Pneu 175", valor: -300, percentual: 0, tipo: "peca", custoNaoInformado: false },
          {
            chave: "3",
            nome: "Válvula",
            valor: 0,
            percentual: null,
            tipo: "peca",
            custoNaoInformado: true,
            acao: <a href="/produtos/3">cadastre o custo da peça</a>,
          },
        ]}
      />,
    );
    expect(screen.getByText("− R$ 300 ▼")).toBeInTheDocument();
    expect(screen.getByText("custo não informado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "cadastre o custo da peça" })).toBeInTheDocument();
    expect(screen.getByText(/média da loja/)).toBeInTheDocument();

    await user.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Alinhamento (serviço): R$ 4.100 · de cada R$ 100, sobram R$ 62");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Pneu 175 (peça): − R$ 300 ▼");
  });

  it("o Pareto: a linha dos 80% fica antes do primeiro B, e o laranja é só do A", () => {
    const { container } = renderizar(
      <GraficoPareto
        formatarCurto={curto}
        grupos={[
          { letra: "A", parte: 81, quantos: 2 },
          { letra: "B", parte: 14, quantos: 1 },
          { letra: "C", parte: 5, quantos: 1 },
        ]}
        itens={[
          { chave: "1", nome: "Pneu", letra: "A", valor: 5000, parte: 50, acumulado: 50 },
          { chave: "2", nome: "Alinhamento", letra: "A", valor: 3100, parte: 31, acumulado: 81 },
          { chave: "3", nome: "Válvula", letra: "B", valor: 1400, parte: 14, acumulado: 95 },
          { chave: "4", nome: "Bico", letra: "C", valor: 500, parte: 5, acumulado: 100 },
        ]}
      />,
    );
    const corte = container.querySelector("[data-corte]");
    expect(corte).toHaveTextContent("↑ aqui passa de 80%");
    expect(corte?.nextElementSibling).toHaveTextContent("Válvula");
    expect(screen.getAllByRole("img")).toHaveLength(7); // 3 grupos + 4 itens
    const laranjas = Array.from(container.querySelectorAll<HTMLElement>("[data-item] > span:first-child")).filter((s) =>
      s.style.background.includes("--color-acao"),
    );
    expect(laranjas).toHaveLength(2);
    expect(container.innerHTML).not.toMatch(/--color-ok|--color-atencao/);
  });

  it("os degraus: o dia mais baixo e o fim do período vêm escritos", () => {
    renderizar(
      <GraficoDegraus
        formatarCurto={curto}
        dias={[
          { chave: "a", rotulo: "17/11", entra: 500, sai: 0, saldo: 500 },
          { chave: "b", rotulo: "18/11", entra: 0, sai: 800, saldo: -300 },
          { chave: "c", rotulo: "19/11", entra: 1000, sai: 0, saldo: 700 },
        ]}
        maisBaixo={{ indice: 1, texto: "− R$ 300 em 18/11: aluguel" }}
        fim="R$ 700 em 19/11"
      />,
    );
    expect(screen.getByText("− R$ 300 em 18/11: aluguel")).toBeInTheDocument();
    expect(screen.getByText("R$ 700 em 19/11")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "18/11: entra R$ 0 · sai R$ 800 · Saldo − R$ 300" })).toBeInTheDocument();
  });

  it("o mês somando: sem o mês anterior, a linha cinza some", () => {
    const { container } = renderizar(
      <GraficoMesAcumulado
        atual={[100, 250]}
        anterior={null}
        diasNoMes={30}
        nomeAtual="Novembro"
        formatarCurto={curto}
      />,
    );
    expect(container.querySelector('[data-linha="anterior"]')).toBeNull();
    expect(container.querySelector('[data-linha="atual"]')).not.toBeNull();
    expect(screen.getByText("Novembro")).toBeInTheDocument();
  });
});
