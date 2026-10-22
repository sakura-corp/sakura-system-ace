// @vitest-environment jsdom
/**
 * Teste de TELA do "Juntar peças repetidas" (#656).
 *
 * As contas (prévia, campos diferentes) já são testadas em
 * `schemas/juntarPecas.test.ts`. Aqui se guarda a LIGAÇÃO: que a tela lista
 * os pares, mostra a frase, manda pro banco só os campos que a pessoa
 * escolheu, e não deixa juntar quando o banco diz que falta acesso.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { Peca } from "@/types/peca";
import type { ResumoPecaJuntar } from "@/schemas/juntarPecas";

vi.mock("@/lib/pecas", () => ({
  listarPecas: vi.fn(),
  resumoPecaParaJuntar: vi.fn(),
  juntarPecas: vi.fn(),
  buscarPecasPorIds: vi.fn(),
}));

import { buscarPecasPorIds, juntarPecas, listarPecas, resumoPecaParaJuntar } from "@/lib/pecas";
import { pecaVista } from "@/schemas/juntarPecas";
import { JuntarPecasModal } from "./JuntarPecasModal";

function peca(extra: Partial<Peca>): Peca {
  return {
    id: "x",
    descricao: "Pneu 175/70 R13 Pirelli",
    codigo_barras: null,
    codigo_interno: null,
    marca: null,
    modelo: null,
    unidade: "UN",
    categoria_id: null,
    estoque_minimo: 0,
    prazo_garantia_dias: null,
    aplicacao: null,
    preco_custo: null,
    preco_venda: null,
    ncm: null,
    cest: null,
    cfop_padrao: null,
    origem: null,
    cst_ou_csosn: null,
    aliquota_icms: null,
    medida: null,
    indice_carga_velocidade: null,
    dot: null,
    ativo: true,
    criado_em: "2026-01-01T00:00:00.000Z",
    ...extra,
  } as Peca;
}

const velha = peca({ id: "a", codigo_barras: "789", preco_venda: 100, criado_em: "2026-01-01T00:00:00.000Z" });
const nova = peca({ id: "b", codigo_barras: "789", preco_venda: 120, criado_em: "2026-02-01T00:00:00.000Z", ativo: false });

function resumo(extra: Partial<ResumoPecaJuntar>): ResumoPecaJuntar {
  return {
    lojas_sem_acesso: 0, movimentos: 0, itens_os: 0, os: 0, contagens: 0,
    itens_compra: 0, compras: 0, cotacoes: 0,
    estoque: [{ loja_id: "l1", loja_nome: "Matriz", saldo: 4 }],
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listarPecas).mockResolvedValue([velha, nova]);
  vi.mocked(resumoPecaParaJuntar).mockImplementation(async (id) =>
    id === "a" ? resumo({}) : resumo({ os: 12, compras: 3, contagens: 1, estoque: [{ loja_id: "l1", loja_nome: "Matriz", saldo: 2 }] }),
  );
  vi.mocked(juntarPecas).mockResolvedValue(resumo({}));
  vi.mocked(buscarPecasPorIds).mockResolvedValue([velha, nova]);
});

function montar() {
  const onJuntado = vi.fn().mockResolvedValue(undefined);
  const r = renderizar(<JuntarPecasModal categorias={[]} onFechar={vi.fn()} onJuntado={onJuntado} />);
  return { ...r, onJuntado };
}

async function abrirPar(user: ReturnType<typeof montar>["user"]) {
  await user.click(await screen.findByRole("button", { name: /Conferir/ }));
  await screen.findByText(/Estoque 4 \+ 2 = 6/);
}

describe("JuntarPecasModal", () => {
  it("lista o par suspeito com o motivo e a peça inativa marcada", async () => {
    montar();
    expect(screen.getByText("Procurando peças repetidas…")).toBeInTheDocument();
    expect(await screen.findByText("Motivo: mesmo código de barras")).toBeInTheDocument();
    expect(screen.getByText("Pneu 175/70 R13 Pirelli (inativa)")).toBeInTheDocument();
  });

  it("se a busca falha, não diz que está tudo certo e deixa tentar de novo", async () => {
    vi.mocked(listarPecas).mockRejectedValueOnce(new Error("sem internet"));
    const { user } = montar();
    expect(await screen.findByRole("alert")).toHaveTextContent(/sem internet/);
    expect(screen.queryByText(/Está tudo certo/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Motivo: mesmo código de barras")).toBeInTheDocument();
  });

  it("sem pares, diz que não achou", async () => {
    vi.mocked(listarPecas).mockResolvedValue([velha]);
    montar();
    expect(await screen.findByText(/Não achei peças repetidas/)).toBeInTheDocument();
  });

  it("mostra a frase da prévia e manda só o campo escolhido ao juntar", async () => {
    const { user, onJuntado } = montar();
    await abrirPar(user);
    expect(screen.getByText(/12 OS, 3 compras e 1 contagem passam pra/)).toBeInTheDocument();

    // A que fica é a mais antiga ("a"). Pega o preço de venda da que sai.
    const grupo = screen.getByRole("group", { name: "Preço venda" });
    // Preço em reais, como no resto do programa (e não "120").
    expect(grupo).toHaveTextContent(/R\$\s?100,00/);
    expect(grupo).toHaveTextContent(/R\$\s?120,00/);
    await user.click(grupo.querySelectorAll<HTMLInputElement>("input")[1]);

    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Sim, juntar" }));

    // Junto vai o que a pessoa VIU na prévia: se o banco mudou desde então,
    // ele recusa em vez de juntar com números diferentes dos mostrados.
    await waitFor(() =>
      expect(juntarPecas).toHaveBeenCalledWith("a", "b", ["preco_venda"], {
        fica: { ...resumo({}), peca: pecaVista(velha) },
        sai: {
          ...resumo({ os: 12, compras: 3, contagens: 1, estoque: [{ loja_id: "l1", loja_nome: "Matriz", saldo: 2 }] }),
          // e os campos como a pessoa viu: o banco recusa se o preço mudou desde então
          peca: expect.objectContaining({ preco_venda: 120, descricao: "Pneu 175/70 R13 Pirelli" }),
        },
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/Pronto/);
    await waitFor(() => expect(onJuntado).toHaveBeenCalled());
  });

  it("prévia velha recusada: busca a prévia de novo, mostra os números novos e junta com eles", async () => {
    vi.mocked(juntarPecas).mockRejectedValueOnce(
      new Error("Os números das peças mudaram desde a prévia (alguém mexeu nelas agora há pouco). Confira a prévia de novo antes de juntar."),
    );
    const { user } = montar();
    await abrirPar(user);

    // enquanto a tela estava aberta, outro computador lançou estoque da "b" e mudou o preço dela
    const novaDepois = { ...nova, preco_venda: 130 };
    vi.mocked(buscarPecasPorIds).mockResolvedValue([velha, novaDepois]);
    vi.mocked(resumoPecaParaJuntar).mockImplementation(async (id) =>
      id === "a" ? resumo({}) : resumo({ os: 12, compras: 3, contagens: 1, estoque: [{ loja_id: "l1", loja_nome: "Matriz", saldo: 5 }] }),
    );

    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Sim, juntar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/mudaram desde a prévia/);
    expect(screen.getByRole("alert")).toHaveTextContent(/números de agora/);
    // a prévia mostrada é a nova, e o preço também
    expect(await screen.findByText(/Estoque 4 \+ 5 = 9/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Preço venda" })).toHaveTextContent(/R\$\s?130,00/);

    vi.mocked(juntarPecas).mockClear();
    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Sim, juntar" }));
    await waitFor(() =>
      expect(juntarPecas).toHaveBeenCalledWith("a", "b", expect.any(Array), {
        fica: expect.objectContaining({ os: 0 }),
        sai: expect.objectContaining({ estoque: [{ loja_id: "l1", loja_nome: "Matriz", saldo: 5 }], peca: expect.objectContaining({ preco_venda: 130 }) }),
      }),
    );
  });

  it("prévia velha e a peça sumiu (outro computador já juntou): volta pra lista e procura de novo", async () => {
    vi.mocked(juntarPecas).mockRejectedValueOnce(new Error("Os dados das peças mudaram desde a prévia (alguém mexeu nelas agora há pouco)."));
    const { user } = montar();
    await abrirPar(user);
    vi.mocked(buscarPecasPorIds).mockResolvedValue([velha]);
    vi.mocked(listarPecas).mockResolvedValue([velha]);
    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Sim, juntar" }));
    expect(await screen.findByText(/Não achei peças repetidas/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/não existe mais/);
  });

  it("outro erro ao juntar: não busca a prévia de novo", async () => {
    vi.mocked(juntarPecas).mockRejectedValueOnce(new Error("sem internet"));
    const { user } = montar();
    await abrirPar(user);
    vi.mocked(resumoPecaParaJuntar).mockClear();
    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Sim, juntar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/sem internet/);
    expect(resumoPecaParaJuntar).not.toHaveBeenCalled();
    expect(buscarPecasPorIds).not.toHaveBeenCalled();
  });

  it("não junta sem a confirmação final", async () => {
    const { user } = montar();
    await abrirPar(user);
    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Não, voltar" }));
    expect(juntarPecas).not.toHaveBeenCalled();
  });

  it("trocar quem fica inverte os lados", async () => {
    const { user } = montar();
    await abrirPar(user);
    await user.click(screen.getByRole("button", { name: /Trocar/ }));
    await screen.findByRole("button", { name: "Juntar estas duas" });
    await user.click(screen.getByRole("button", { name: "Juntar estas duas" }));
    await user.click(screen.getByRole("button", { name: "Sim, juntar" }));
    await waitFor(() =>
      expect(juntarPecas).toHaveBeenCalledWith("b", "a", expect.any(Array), {
        // trocou quem fica: os resumos trocam junto
        fica: expect.objectContaining({ os: 12 }),
        sai: expect.objectContaining({ os: 0 }),
      }),
    );
  });

  it("sem acesso a todas as lojas, mostra a frase e não oferece juntar", async () => {
    vi.mocked(resumoPecaParaJuntar).mockResolvedValue(resumo({ lojas_sem_acesso: 1 }));
    const { user } = montar();
    await user.click(await screen.findByRole("button", { name: /Conferir/ }));
    expect(await screen.findByText(/loja que você não administra/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Juntar estas duas" })).not.toBeInTheDocument();
  });
});
