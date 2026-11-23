// @vitest-environment jsdom
/**
 * O molde de perfil (visual da leva 8, #1085, parte 3/5 #1134): a ficha de
 * uma pessoa ou peça (cliente, veículo, funcionário, produto).
 *
 *     Maria Souza                          [Nova OS]  [⋯]
 *     (16) 99999-0000 · cliente desde 2021
 *     ┌ Gasto no ano ────┐ ┌ OS ──┐ ┌ Última ─┐ ┌ Em aberto ┐
 *     │ R$ 4.210,00      │ │ 12   │ │ 03/11   │ │ R$ 0,00   │
 *     │ +16% contra 2025 │ └──────┘ └─────────┘ └───────────┘
 *     └──────────────────┘
 *     Últimas OS                                  (6 + "Ver todos")
 *
 * O que se prova: o cabeçalho (nome no título da tela, detalhe, a ação
 * principal laranja e o resto no "⋯"); 1 número grande com rótulo e
 * comparação + até 3 de apoio, menores; e as listas embaixo, com 6 linhas e o
 * "Ver todos".
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { LinhaDeLista } from "./LinhaDeLista";
import { MoldePerfil, type PropsDoMoldePerfil } from "./MoldePerfil";

type OS = { id: string; numero: number };
const OS_DA_MARIA: OS[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), numero: 140 + i }));

function Perfil(props: Partial<PropsDoMoldePerfil>) {
  return (
    <MoldePerfil
      nome="Maria Souza"
      detalhe="(16) 99999-0000 · cliente desde 2021"
      acaoPrincipal={{ rotulo: "Nova OS", aoClicar: () => {} }}
      numeroPrincipal={{ rotulo: "Gasto no ano", valor: "R$ 4.210,00", comparacao: "+16% contra 2025" }}
      numerosDeApoio={[
        { rotulo: "Ordens de serviço", valor: "12" },
        { rotulo: "Última visita", valor: "03/11" },
        { rotulo: "Em aberto", valor: "R$ 0,00" },
      ]}
      listas={[
        {
          titulo: "Últimas OS",
          lista: {
            estado: "pronto",
            itens: OS_DA_MARIA,
            chave: (o: OS) => o.id,
            linha: (o: OS) => <LinhaDeLista nome={`OS ${o.numero}`} />,
            vazio: { frase: "Nenhuma OS ainda." },
          },
        },
      ]}
      {...props}
    />
  );
}

describe("MoldePerfil: o cabeçalho", () => {
  it("o nome é o título da tela, com o detalhe embaixo", () => {
    renderizar(<Perfil />);
    const titulo = screen.getByRole("heading", { level: 1, name: "Maria Souza" });
    const detalhe = screen.getByText("(16) 99999-0000 · cliente desde 2021");
    expect(titulo.compareDocumentPosition(detalhe) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("a ação principal é o único botão laranja, e responde ao clique", async () => {
    const aoClicar = vi.fn();
    const { user } = renderizar(<Perfil acaoPrincipal={{ rotulo: "Nova OS", aoClicar }} />);
    const botao = screen.getByRole("button", { name: "Nova OS" });
    expect(botao.className).toMatch(/bg-acao/);
    await user.click(botao);
    expect(aoClicar).toHaveBeenCalledTimes(1);
    const laranjas = screen.getAllByRole("button").filter((b) => /(^|\s)bg-acao(\s|$)/.test(b.className));
    expect(laranjas).toHaveLength(1);
  });

  it("as outras ações ficam no \"⋯\", com o nome de quem é a ficha", async () => {
    const apagar = vi.fn();
    const { user } = renderizar(
      <Perfil outrasAcoes={[{ rotulo: "Editar", aoClicar: () => {} }, { rotulo: "Apagar", aoClicar: apagar, perigosa: true }]} />,
    );
    expect(screen.queryByRole("menuitem", { name: /Apagar/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Mais ações.*Maria Souza/ }));
    await user.click(screen.getByRole("menuitem", { name: /Apagar/ }));
    expect(apagar).toHaveBeenCalledTimes(1);
  });

  it("sem outras ações, não aparece o \"⋯\"", () => {
    renderizar(<Perfil />);
    expect(screen.queryByRole("button", { name: /Mais ações/ })).toBeNull();
  });
});

describe("MoldePerfil: os números", () => {
  it("1 número grande, com rótulo e comparação", () => {
    renderizar(<Perfil />);
    const principal = screen.getByRole("group", { name: "Gasto no ano" });
    expect(principal).toHaveTextContent("R$ 4.210,00");
    expect(principal).toHaveTextContent("+16% contra 2025");
    expect(within(principal).getByText("R$ 4.210,00")).toHaveClass("text-metrica", "tabular-nums");
  });

  it("3 números de apoio, menores que o principal", () => {
    renderizar(<Perfil />);
    for (const rotulo of ["Ordens de serviço", "Última visita", "Em aberto"]) {
      const cartao = screen.getByRole("group", { name: rotulo });
      const numero = cartao.querySelector("[data-numero]");
      expect(numero).toHaveClass("text-destaque", "tabular-nums");
      expect(numero).not.toHaveClass("text-metrica");
    }
  });

  it("o principal vem antes dos de apoio (em cima à esquerda na leitura)", () => {
    renderizar(<Perfil />);
    const principal = screen.getByRole("group", { name: "Gasto no ano" });
    const apoio = screen.getByRole("group", { name: "Ordens de serviço" });
    expect(principal.compareDocumentPosition(apoio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("aceita menos de 3 de apoio", () => {
    renderizar(<Perfil numerosDeApoio={[{ rotulo: "Ordens de serviço", valor: "12" }]} />);
    expect(screen.getByRole("group", { name: "Ordens de serviço" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Última visita" })).toBeNull();
  });

  it("o tipo não deixa passar de 3 números de apoio", () => {
    const quatro = [
      { rotulo: "a", valor: "1" },
      { rotulo: "b", valor: "2" },
      { rotulo: "c", valor: "3" },
      { rotulo: "d", valor: "4" },
    ] as const;
    // @ts-expect-error 1 grande + no máximo 3 de apoio (leva 8).
    const props: Pick<PropsDoMoldePerfil, "numerosDeApoio"> = { numerosDeApoio: quatro };
    expect(props).toBeDefined();
  });
});

describe("MoldePerfil: as listas embaixo", () => {
  it("cada lista tem o título e mostra 6 linhas, com o \"Ver todos\" no fim", () => {
    renderizar(<Perfil />);
    const secao = screen.getByRole("region", { name: "Últimas OS" });
    expect(within(secao).getAllByRole("listitem")).toHaveLength(6);
    expect(within(secao).getByRole("button", { name: "Ver todos (9)" })).toBeInTheDocument();
  });

  it("o \"Ver todos\" chama a tela, quando ela quer abrir a lista em outro lugar", async () => {
    const aoVerTodos = vi.fn();
    const { user } = renderizar(
      <Perfil
        listas={[
          {
            titulo: "Últimas OS",
            aoVerTodos,
            lista: {
              estado: "pronto",
              itens: OS_DA_MARIA,
              chave: (o: OS) => o.id,
              linha: (o: OS) => <LinhaDeLista nome={`OS ${o.numero}`} />,
              vazio: { frase: "Nenhuma OS ainda." },
            },
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Ver todos (9)" }));
    expect(aoVerTodos).toHaveBeenCalledTimes(1);
  });

  it("lista vazia mostra a frase do vazio", () => {
    renderizar(
      <Perfil
        listas={[
          {
            titulo: "Veículos",
            lista: {
              estado: "pronto",
              itens: [] as OS[],
              chave: (o: OS) => o.id,
              linha: (o: OS) => <LinhaDeLista nome={`OS ${o.numero}`} />,
              vazio: { frase: "Nenhum veículo cadastrado." },
            },
          },
        ]}
      />,
    );
    const secao = screen.getByRole("region", { name: "Veículos" });
    expect(secao).toHaveTextContent("Nenhum veículo cadastrado.");
  });
});
