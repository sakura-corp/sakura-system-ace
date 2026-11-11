// @vitest-environment jsdom
/**
 * Teste de TELA da ficha do cliente (#393).
 *
 * As contas estão em schemas/fichaCliente.test.ts, e "cada consulta só com o
 * módulo dela" em lib/fichaCliente.test.ts. O que só a tela prova: que ela
 * pede à leitura só o que a pessoa pode ver, que sem o módulo aparece "—" com
 * a frase (nunca "R$ 0,00"), e que o nome do cliente nas listas abre a ficha.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent, within } from "@/testes/tela";
import type { FichaDoCliente } from "@/lib/fichaCliente";
import type { Operador } from "@/types/operador";

const buscarFichaDoCliente = vi.fn();
vi.mock("@/lib/fichaCliente", () => ({
  buscarFichaDoCliente: (...a: unknown[]) => buscarFichaDoCliente(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const LOJA_A = { id: "loja-a", nome: "Loja Centro", cidade: null, uf: null, ativo: true, criado_em: "" };
const LOJA_B = { id: "loja-b", nome: "Loja Vila", cidade: null, uf: null, ativo: true, criado_em: "" };

let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
let podeAbrirNaLista = true;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: LOJA_A, lojasDisponiveis: [LOJA_A, LOJA_B] }),
}));

const { FichaClientePage } = await import("./FichaClientePage");
const { LinkCliente } = await import("@/components/LinkCliente");

function diaHa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(15, 0, 0, 0);
  return d.toISOString();
}

function diaDeCalendario(diasAFrente: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasAFrente);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const item = (preco: number) => ({
  id: `i-${preco}`,
  tipo: "servico" as const,
  peca_id: null,
  descricao: "Alinhamento",
  quantidade: 1,
  preco_unitario: preco,
  desconto: 0,
});

const os3 = {
  id: "os3",
  numero: 3,
  tipo: "os" as const,
  loja_id: "loja-a",
  cliente_id: "c1",
  status: "faturada" as const,
  km_entrada: 50000,
  data_abertura: diaHa(40),
  data_fechamento: diaHa(40),
  forma_pagamento: "Pix",
  parcelas: 1,
  placa: "ABC1D23",
  itens: [item(250)],
};

const os4 = {
  ...os3,
  id: "os4",
  numero: 4,
  data_abertura: diaHa(10),
  data_fechamento: diaHa(10),
  forma_pagamento: "Cartão de crédito",
  parcelas: 3,
  itens: [item(480)],
};

function ficha(campos: Partial<FichaDoCliente> = {}): FichaDoCliente {
  return {
    cliente: { id: "c1", nome: "Carlos Eduardo Lima", telefone: "(16) 99000-1122" },
    veiculos: [{ id: "v1", placa: "ABC1D23" }],
    ordens: [os3, os4],
    contas: [
      {
        id: "cr4",
        loja_id: "loja-a",
        ordem_servico_id: "os4",
        descricao: "Faturamento da OS 4",
        valor: 480,
        vencimento: diaDeCalendario(-2),
        status: "pendente",
        data_recebimento: null,
      },
      {
        id: "cr9",
        loja_id: "loja-a",
        ordem_servico_id: null,
        descricao: "Conta lançada à mão",
        valor: 70,
        vencimento: diaDeCalendario(15),
        status: "pendente",
        data_recebimento: null,
      },
    ],
    ...campos,
  };
}

function OndeEstou() {
  const local = useLocation();
  return (
    <p>
      Fui pra {local.pathname}, abrir: {(local.state as { abrirOrdemId?: string } | null)?.abrirOrdemId}
    </p>
  );
}

function montar(rota = "/clientes/c1") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/clientes/:id" element={<FichaClientePage />} />
        <Route path="/ordens-servico" element={<OndeEstou />} />
        <Route
          path="/lista"
          element={
            <div onClick={() => (window as unknown as { cliqueNaLinha: boolean }).cliqueNaLinha = true}>
              <span>
                <LinkCliente clienteId="c1" nome="Carlos Eduardo Lima" podeAbrir={podeAbrirNaLista} />
              </span>
              <span>
                <LinkCliente clienteId="00000000-0000-0000-0000-00000000c000" nome="Consumidor" podeAbrir />
              </span>
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  operador = { id: "op", admin: true, permissoes: [] };
  podeAbrirNaLista = true;
  buscarFichaDoCliente.mockReset();
});

describe("FichaClientePage", () => {
  it("com todos os módulos: o que deve (com o atraso), o que comprou e como pagou", async () => {
    buscarFichaDoCliente.mockResolvedValue(ficha());
    montar();

    expect(await screen.findByRole("heading", { name: "Carlos Eduardo Lima" })).toBeInTheDocument();
    expect(buscarFichaDoCliente).toHaveBeenCalledWith("c1", {
      clientes: true,
      ordens: true,
      contasReceber: true,
    });
    // deve 480 + 70; atrasada só a da OS 4
    expect(screen.getByText("R$ 550,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 480,00 atrasado")).toBeInTheDocument();
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    // total comprado 250 + 480
    expect(screen.getByText("R$ 730,00")).toBeInTheDocument();
    // como pagou: a forma e as parcelas de cada OS faturada
    expect(screen.getByRole("cell", { name: "Cartão de crédito" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "3x" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Pix" })).toBeInTheDocument();
    expect(screen.queryByText(/não tem acesso/)).not.toBeInTheDocument();
    // os carros dele, cada um abrindo a ficha do veículo
    expect(screen.getByRole("button", { name: "ABC1D23" })).toBeInTheDocument();
  });

  it("sem Contas a Receber: NÃO pede as contas, e o que deve mostra '—' com a frase, nunca R$ 0,00", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes", "ordens_servico"] };
    buscarFichaDoCliente.mockResolvedValue(ficha({ contas: null }));
    montar();

    await screen.findByRole("heading", { name: "Carlos Eduardo Lima" });
    expect(buscarFichaDoCliente).toHaveBeenCalledWith("c1", {
      clientes: true,
      ordens: true,
      contasReceber: false,
    });
    expect(screen.getAllByText("Você não tem acesso a Contas a Receber.").length).toBeGreaterThan(0);
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
    expect(screen.queryByText("Não deve nada")).not.toBeInTheDocument();
    // as compras continuam aparecendo
    const comprou = screen.getByRole("heading", { name: /O que comprou/ }).closest("section")!;
    expect(within(comprou).getByRole("cell", { name: "OS 4" })).toBeInTheDocument();
  });

  it("sem Ordens de Serviço: 'Como pagou' mostra '—' com a frase, e não há atalho pra OS", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    // a janela de OS não traz forma de pagamento
    const semForma = [os3, os4].map((o) => ({ ...o, forma_pagamento: undefined, parcelas: undefined }));
    buscarFichaDoCliente.mockResolvedValue(ficha({ ordens: semForma, contas: null }));
    montar();

    await screen.findByRole("heading", { name: "Carlos Eduardo Lima" });
    const comoPagou = screen.getByRole("heading", { name: "Como pagou" }).closest("section")!;
    expect(within(comoPagou).getByText("Você não tem acesso a Ordens de Serviço.")).toBeInTheDocument();
    expect(within(comoPagou).queryByText("Pix")).not.toBeInTheDocument();
    expect(within(comoPagou).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir" })).not.toBeInTheDocument();
  });

  it("OS faturada sem a forma gravada: '—' nas parcelas, nunca 'À vista' de palpite", async () => {
    buscarFichaDoCliente.mockResolvedValue(
      ficha({ ordens: [{ ...os3, forma_pagamento: null, parcelas: 1 }], contas: [] }),
    );
    montar();

    await screen.findByRole("heading", { name: "Carlos Eduardo Lima" });
    const comoPagou = screen.getByRole("heading", { name: "Como pagou" }).closest("section")!;
    expect(within(comoPagou).queryByText("À vista")).not.toBeInTheDocument();
  });

  it("'Abrir' leva pra lista de OS pedindo pra abrir aquela ordem", async () => {
    buscarFichaDoCliente.mockResolvedValue(ficha());
    montar();

    await screen.findByRole("heading", { name: "Carlos Eduardo Lima" });
    const comprou = screen.getByRole("heading", { name: /O que comprou/ }).closest("section")!;
    const linhaDaOS4 = within(comprou).getByRole("cell", { name: "OS 4" }).closest("tr")!;
    await userEvent.setup().click(within(linhaDaOS4).getByRole("button", { name: "Abrir" }));
    expect(screen.getByText("Fui pra /ordens-servico, abrir: os4")).toBeInTheDocument();
  });

  it("OS de outra loja: aparece com o nome da loja, sem um 'Abrir' que não abriria", async () => {
    buscarFichaDoCliente.mockResolvedValue(ficha({ ordens: [{ ...os3, loja_id: "loja-b" }, os4] }));
    montar();

    await screen.findByRole("heading", { name: "Carlos Eduardo Lima" });
    const comprou = screen.getByRole("heading", { name: /O que comprou/ }).closest("section")!;
    expect(within(comprou).getAllByRole("button", { name: "Abrir" })).toHaveLength(1);
    expect(within(comprou).getByRole("cell", { name: "Loja Vila" })).toBeInTheDocument();
  });

  it("cliente que não existe: diz isso, sem quebrar", async () => {
    buscarFichaDoCliente.mockResolvedValue(null);
    montar();
    expect(await screen.findByText(/Cliente não encontrado/)).toBeInTheDocument();
  });
});

describe("LinkCliente", () => {
  it("o nome abre a ficha sem disparar o clique da linha; o Consumidor não vira atalho", async () => {
    (window as unknown as { cliqueNaLinha: boolean }).cliqueNaLinha = false;
    buscarFichaDoCliente.mockResolvedValue(ficha());
    montar("/lista");

    expect(screen.queryByRole("button", { name: "Consumidor" })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Carlos Eduardo Lima" }));
    expect(await screen.findByRole("heading", { name: "Carlos Eduardo Lima" })).toBeInTheDocument();
    expect((window as unknown as { cliqueNaLinha: boolean }).cliqueNaLinha).toBe(false);
  });

  it("sem poder abrir a ficha, o nome é só texto, sem atalho", () => {
    podeAbrirNaLista = false;
    montar("/lista");
    expect(screen.getByText("Carlos Eduardo Lima")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carlos Eduardo Lima" })).not.toBeInTheDocument();
  });
});
