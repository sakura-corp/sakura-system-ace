// @vitest-environment jsdom
/**
 * Teste de TELA da ficha do veículo (item FN-04).
 *
 * As contas estão em schemas/fichaVeiculo.test.ts. O que só a tela prova é a
 * costura: que ela mostra o que as contas dizem, que a linha do tempo vem da
 * mais recente pra mais antiga, que o atalho "Abrir OS" só aparece quando dá
 * pra abrir de verdade (OS da loja ativa, operador com o módulo), e que a
 * placa nas listas abre a ficha sem abrir junto o que a linha abriria.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "@/testes/tela";
import type { FichaDoVeiculo } from "@/lib/veiculos";
import type { Operador } from "@/types/operador";

const buscarFichaDoVeiculo = vi.fn();
vi.mock("@/lib/veiculos", () => ({
  buscarFichaDoVeiculo: (...a: unknown[]) => buscarFichaDoVeiculo(...a),
}));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {} }));

const LOJA_A = { id: "loja-a", nome: "Loja Centro", cidade: null, uf: null, ativo: true, criado_em: "" };
const LOJA_B = { id: "loja-b", nome: "Loja Vila", cidade: null, uf: null, ativo: true, criado_em: "" };

let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: LOJA_A, lojasDisponiveis: [LOJA_A, LOJA_B] }),
}));

const { FichaVeiculoPage } = await import("./FichaVeiculoPage");
const { LinkPlaca } = await import("@/components/LinkPlaca");

function diaHa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(15, 0, 0, 0);
  return d.toISOString();
}

function ficha(ordens: FichaDoVeiculo["ordens"]): FichaDoVeiculo {
  return {
    veiculo: {
      id: "v1",
      cliente_id: "c1",
      placa: "RTA-4B71",
      marca: "Volkswagen",
      modelo: "Gol",
      ano: 2019,
      cor: "prata",
      tipo: "hatch",
      km_atual: 70000,
      criado_em: "",
      cliente: { id: "c1", nome: "Ricardo Menezes", telefone: "(16) 99000-1122" },
    },
    ordens,
  };
}

const ordemAntiga = {
  id: "os97",
  numero: 97,
  loja_id: "loja-a",
  cliente_id: "c1",
  status: "faturada" as const,
  km_entrada: 74320,
  data_abertura: diaHa(200),
  data_fechamento: diaHa(200),
  itens: [
    {
      id: "i1",
      tipo: "peca" as const,
      peca_id: "p1",
      descricao: "Pneu 175/70 R14",
      quantidade: 4,
      preco_unitario: 300,
      desconto: 0,
      peca: { prazo_garantia_dias: 90 },
    },
  ],
};

const ordemRecente = {
  id: "os143",
  numero: 143,
  loja_id: "loja-a",
  cliente_id: "c1",
  status: "faturada" as const,
  km_entrada: 84210,
  data_abertura: diaHa(10),
  data_fechamento: diaHa(10),
  itens: [
    {
      id: "i2",
      tipo: "peca" as const,
      peca_id: "p5",
      descricao: "Bateria 60Ah",
      quantidade: 1,
      preco_unitario: 549,
      desconto: 49,
      peca: { prazo_garantia_dias: 365 },
    },
  ],
};

function OndeEstou() {
  const local = useLocation();
  return <p>Tela de OS, abrir: {(local.state as { abrirOrdemId?: string } | null)?.abrirOrdemId}</p>;
}

function montar() {
  return render(
    <MemoryRouter initialEntries={["/veiculos/v1"]}>
      <Routes>
        <Route path="/veiculos/:id" element={<FichaVeiculoPage />} />
        <Route path="/ordens-servico" element={<OndeEstou />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  operador = { id: "op", admin: true, permissoes: [] };
  buscarFichaDoVeiculo.mockReset();
});

describe("FichaVeiculoPage", () => {
  it("mostra o carro, o dono, o total faturado e a garantia que ainda vale", async () => {
    buscarFichaDoVeiculo.mockResolvedValue(ficha([ordemAntiga, ordemRecente]));
    montar();

    expect(await screen.findByRole("heading", { name: "RTA-4B71" })).toBeInTheDocument();
    expect(buscarFichaDoVeiculo).toHaveBeenCalledWith("v1", true);
    expect(screen.getByText("Ricardo Menezes")).toBeInTheDocument();
    // 4 × 300 + (549 − 49)
    expect(screen.getByText("R$ 1.700,00")).toBeInTheDocument();
    // o KM da visita mais recente, não o do cadastro
    expect(screen.getByText("84.210 km")).toBeInTheDocument();
    // a bateria (365 dias) ainda vale; o pneu (90 dias, há 200) não
    expect(screen.getByRole("cell", { name: "Bateria 60Ah" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Pneu 175/70 R14" })).not.toBeInTheDocument();
    expect(screen.getByText(/Mais uma peça deste carro já saiu da garantia/)).toBeInTheDocument();
  });

  it("põe a visita mais recente no topo do histórico", async () => {
    buscarFichaDoVeiculo.mockResolvedValue(ficha([ordemAntiga, ordemRecente]));
    montar();

    await screen.findByRole("heading", { name: "RTA-4B71" });
    const visitas = screen.getAllByText(/^OS \d+ · /).map((el) => el.textContent);
    expect(visitas[0]).toMatch(/^OS 143/);
    expect(visitas[1]).toMatch(/^OS 97/);
  });

  it("'Abrir OS' leva pra lista de OS pedindo pra abrir aquela ordem", async () => {
    buscarFichaDoVeiculo.mockResolvedValue(ficha([ordemRecente]));
    montar();

    await userEvent.setup().click(await screen.findByRole("button", { name: "Abrir OS" }));
    expect(screen.getByText("Tela de OS, abrir: os143")).toBeInTheDocument();
  });

  it("com OS de outra loja, não oferece um 'Abrir' que não abriria", async () => {
    // A lista de OS só carrega a loja ativa: o atalho numa OS da outra loja
    // levaria pra uma lista em que ela não está.
    buscarFichaDoVeiculo.mockResolvedValue(
      ficha([{ ...ordemAntiga, loja_id: "loja-b" }, ordemRecente]),
    );
    montar();

    await screen.findByRole("heading", { name: "RTA-4B71" });
    expect(screen.getAllByRole("button", { name: "Abrir OS" })).toHaveLength(1);
    // passou em duas lojas: cada visita diz de qual
    expect(screen.getByText(/OS 97 · .* · Loja Vila/)).toBeInTheDocument();
  });

  it("quem só tem Clientes vê a ficha, mas sem o atalho pra OS", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    buscarFichaDoVeiculo.mockResolvedValue(ficha([ordemRecente]));
    montar();

    await screen.findByRole("heading", { name: "RTA-4B71" });
    expect(screen.queryByRole("button", { name: "Abrir OS" })).not.toBeInTheDocument();
  });

  it("aponta o KM que desceu em relação à visita anterior", async () => {
    buscarFichaDoVeiculo.mockResolvedValue(
      ficha([ordemAntiga, { ...ordemRecente, km_entrada: 8421 }]),
    );
    montar();

    expect(await screen.findByText(/KM menor que o da visita anterior/)).toBeInTheDocument();
    // e por isso não arrisca uma rodagem média
    expect(screen.getByText(/confira antes de tirar uma média/)).toBeInTheDocument();
  });

  it("quem não tem o módulo Clientes pede a ficha pela janela estreita e a tela não quebra com ano, KM e telefone vazios", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    const f = ficha([]);
    f.veiculo = {
      ...f.veiculo,
      ano: null,
      km_atual: null,
      cliente: { id: "c1", nome: "Ricardo Menezes", telefone: null },
    };
    buscarFichaDoVeiculo.mockResolvedValue(f);
    montar();

    expect(await screen.findByRole("heading", { name: "RTA-4B71" })).toBeInTheDocument();
    expect(buscarFichaDoVeiculo).toHaveBeenCalledWith("v1", false);
    expect(screen.getByText("Ricardo Menezes")).toBeInTheDocument();
    expect(screen.getByText("Nenhum KM anotado ainda")).toBeInTheDocument();
    // O telefone nem chega pela janela: dizer "sem telefone" seria mentira.
    expect(screen.queryByText("Sem telefone cadastrado")).not.toBeInTheDocument();
  });

  it("diz em português quando o veículo não existe mais", async () => {
    buscarFichaDoVeiculo.mockResolvedValue(null);
    montar();
    expect(await screen.findByText(/Veículo não encontrado/)).toBeInTheDocument();
  });
});

describe("LinkPlaca", () => {
  it("abre a ficha sem disparar o clique da linha em que mora", async () => {
    const cliqueNaLinha = vi.fn();
    render(
      <MemoryRouter initialEntries={["/ordens-servico"]}>
        <Routes>
          <Route
            path="/ordens-servico"
            element={
              <div onClick={cliqueNaLinha}>
                <LinkPlaca veiculoId="v1" placa="RTA-4B71" />
              </div>
            }
          />
          <Route path="/veiculos/:id" element={<p>ficha aberta</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "RTA-4B71" }));
    expect(screen.getByText("ficha aberta")).toBeInTheDocument();
    expect(cliqueNaLinha).not.toHaveBeenCalled();
  });
});
