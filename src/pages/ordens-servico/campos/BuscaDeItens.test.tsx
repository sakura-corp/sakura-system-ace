// @vitest-environment jsdom
/**
 * A busca única de peça e serviço (#1087): um campo só, sem escolher o tipo
 * antes, que serve a OS, o orçamento e a venda de balcão.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { BuscaDeItens } from "./BuscaDeItens";

const pecas = [
  {
    id: "peca-1",
    descricao: "PNEU 175/70 R14",
    codigo_interno: "PN175",
    codigo_barras: "7891111111111",
    marca: "Pirelli",
    modelo: null,
    medida: "175/70 R14",
    unidade: "un",
    preco_venda: 400,
    ativo: true,
  },
  {
    id: "peca-2",
    descricao: "PASTILHA DE FREIO",
    codigo_interno: "PF01",
    codigo_barras: "7892222222222",
    marca: "Fras-le",
    modelo: null,
    medida: null,
    unidade: "jg",
    preco_venda: 180,
    ativo: true,
  },
] as unknown as PecaJanela[];

const servicos = [
  { id: "servico-1", descricao: "Troca de pneu", codigo_interno: "S10", preco_padrao: 50, custo: 0, ativo: true },
  { id: "servico-2", descricao: "Alinhamento", codigo_interno: "S20", preco_padrao: 60, custo: 20, ativo: true },
] as unknown as Servico[];

function montar(extra: Partial<Parameters<typeof BuscaDeItens>[0]> = {}) {
  const onEscolher = vi.fn();
  const onAvulso = vi.fn();
  const tela = renderizar(
    <BuscaDeItens
      pecas={pecas}
      servicos={servicos}
      saldoPorPeca={new Map([["peca-1", 2]])}
      saldoCarregado
      onEscolher={onEscolher}
      onAvulso={onAvulso}
      {...extra}
    />,
  );
  const busca = screen.getByRole("combobox", { name: /Buscar peça/ });
  return { ...tela, busca, onEscolher, onAvulso };
}

describe("BuscaDeItens", () => {
  it("ao abrir, a lista rola pra ficar à vista, acima da barra do total (teste no PC da #1087)", async () => {
    const rolar = vi.fn();
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = rolar;
    try {
      const { user, busca } = montar();
      await user.type(busca, "pneu");
      const lista = screen.getByRole("listbox", { name: "Resultados da busca" });
      expect(rolar).toHaveBeenCalledWith({ block: "nearest" });
      expect(rolar.mock.contexts.at(-1)).toBe(lista);
      // A margem de baixo é o que deixa a lista acima da barra grudada no rodapé.
      expect(lista.className).toMatch(/scroll-mb-/);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("acha peça e serviço juntos, cada um com a palavra Peça ou Serviço, código, saldo e preço", async () => {
    const { user, busca } = montar();
    await user.type(busca, "pneu");

    const opcoes = screen.getAllByRole("option");
    expect(opcoes).toHaveLength(2 + 1); // 2 resultados + o serviço sem cadastro (peça só no orçamento)
    const peca = opcoes.find((o) => within(o).queryByText("PNEU 175/70 R14"))!;
    const servico = opcoes.find((o) => within(o).queryByText("Troca de pneu"))!;
    expect(within(peca).getByText("Peça")).toBeInTheDocument();
    expect(within(peca).getByText(/PN175/)).toBeInTheDocument();
    expect(within(peca).getByText(/saldo 2/)).toBeInTheDocument();
    expect(within(peca).getByText(/R\$\s*400,00/)).toBeInTheDocument();
    expect(within(servico).getByText("Serviço")).toBeInTheDocument();
    expect(within(servico).getByText(/R\$\s*50,00/)).toBeInTheDocument();
  });

  it("o leitor: o código de barras exato + Enter põe a peça direto, limpa o campo e segura o foco", async () => {
    const { user, busca, onEscolher } = montar();
    await user.type(busca, "7891111111111{Enter}");

    expect(onEscolher).toHaveBeenCalledTimes(1);
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ tipo: "peca", id: "peca-1" });
    expect(busca).toHaveValue("");
    expect(busca).toHaveFocus();
  });

  it("Enter numa busca que acha mais de um não põe nada e pede pra escolher na lista", async () => {
    const { user, busca, onEscolher } = montar();
    await user.type(busca, "pneu{Enter}");

    expect(onEscolher).not.toHaveBeenCalled();
    expect(screen.getByText(/Mais de um item parecido/)).toBeInTheDocument();
    expect(busca).toHaveValue("pneu");
  });

  it("Enter com um resultado só põe ele", async () => {
    const { user, busca, onEscolher } = montar();
    await user.type(busca, "alinh{Enter}");
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ tipo: "servico", id: "servico-2" });
  });

  it("as setas descem e sobem no resultado, e o Enter põe o destacado", async () => {
    const { user, busca, onEscolher } = montar();
    await user.type(busca, "pneu");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const destacado = screen.getAllByRole("option").find((o) => o.getAttribute("aria-selected") === "true")!;
    const nome = within(destacado).getByText(/PNEU 175|Troca de pneu/).textContent;
    await user.keyboard("{Enter}");

    expect(onEscolher).toHaveBeenCalledTimes(1);
    const escolhido = onEscolher.mock.calls[0][0];
    expect(nome).toContain(escolhido.descricao);

    // E a seta pra cima volta pro primeiro.
    await user.type(busca, "pneu");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}{Enter}");
    expect(nome).not.toContain(onEscolher.mock.calls[1][0].descricao);
  });

  it("clicar no resultado põe o item", async () => {
    const { user, busca, onEscolher } = montar();
    await user.type(busca, "past");
    await user.click(screen.getByRole("option", { name: /PASTILHA DE FREIO/ }));
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ id: "peca-2" });
  });

  it("Esc limpa a busca", async () => {
    const { user, busca } = montar();
    await user.type(busca, "pneu");
    await user.keyboard("{Escape}");
    expect(busca).toHaveValue("");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("sem resultado: avisa e oferece o serviço sem cadastro; a peça sem cadastro só no orçamento", async () => {
    const { user, busca, onAvulso } = montar();
    await user.type(busca, "xyz");

    expect(screen.getByText(/Nenhuma peça com “xyz”. Procurei no nome, código, marca e medida./)).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Peça sem cadastro/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: /Serviço sem cadastro: "xyz"/ }));
    expect(onAvulso).toHaveBeenCalledWith("servico", "xyz");
  });

  it("no orçamento a peça sem cadastro também aparece, e vale no fim da lista com resultados", async () => {
    const { user, busca, onAvulso } = montar({ permitePecaAvulsa: true });
    await user.type(busca, "pneu");

    const opcoes = screen.getAllByRole("option");
    expect(opcoes[opcoes.length - 2]).toHaveAccessibleName(/Serviço sem cadastro: "pneu"/);
    expect(opcoes[opcoes.length - 1]).toHaveAccessibleName(/Peça sem cadastro: "pneu"/);
    await user.click(opcoes[opcoes.length - 1]);
    expect(onAvulso).toHaveBeenCalledWith("peca", "pneu");
  });

  it("a venda de balcão (sem serviços) só acha peça e não oferece avulso", async () => {
    const { user, busca } = montar({ servicos: undefined });
    await user.type(busca, "pneu");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.queryByRole("option", { name: /sem cadastro/ })).not.toBeInTheDocument();
  });
});
