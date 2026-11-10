import { describe, expect, it, vi } from "vitest";

// O lembrete de retorno (FN-06, #381) lê as OS faturadas pela janela
// `ordens_servico_clientes` e os serviços com intervalo. Aqui só se confere o
// mapeamento pro formato da conta (`schemas/retornos.ts`) e o que se pede ao
// banco; a regra do retorno é testada lá.

const respostas: Record<string, unknown> = {};
const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = [];
function construtor(tabela: string) {
  const anotar =
    (metodo: string) =>
    (...args: unknown[]) => {
      chamadas.push({ tabela, metodo, args });
      return q;
    };
  const q = {
    select: anotar("select"),
    eq: anotar("eq"),
    neq: anotar("neq"),
    order: anotar("order"),
    range: anotar("range"),
    then(ok: (v: unknown) => unknown) {
      return Promise.resolve({ data: respostas[tabela], error: null }).then(ok);
    },
  };
  return q;
}
vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));

const { listarOrdensParaRetornos, listarServicosComIntervalo } = await import("./retornos");
const { CLIENTE_CONSUMIDOR_ID } = await import("@/types/cliente");

const linha = {
  id: "os-1",
  numero: 17,
  loja_id: "loja",
  cliente_id: "cli-a",
  tipo: "os",
  status: "faturada",
  km_entrada: 40_000,
  data_abertura: "2026-06-01T13:00:00Z",
  data_fechamento: "2026-06-01T15:00:00Z",
  veiculo_id: "v1",
  veiculo_placa: "ABC1D23",
  veiculo_marca: "Fiat",
  veiculo_modelo: null,
  itens: [
    {
      id: "it-1",
      tipo: "servico",
      peca_id: null,
      servico_id: "oleo",
      descricao: "Troca de óleo",
      quantidade: 1,
      preco_unitario: 100,
      desconto: 0,
      prazo_garantia_dias: null,
    },
    {
      id: "it-2",
      tipo: "peca",
      peca_id: "p1",
      descricao: "Filtro",
      quantidade: 1,
      preco_unitario: 30,
      desconto: 0,
      prazo_garantia_dias: 90,
    },
  ],
};

describe("listarOrdensParaRetornos", () => {
  it("monta o carro e leva o servico_id de cada item (nulo quando a janela não manda)", async () => {
    respostas.ordens_servico_clientes = [linha];
    const [ordem] = await listarOrdensParaRetornos();
    expect(ordem.veiculo_id).toBe("v1");
    expect(ordem.veiculo).toEqual({ placa: "ABC1D23", marca: "Fiat", modelo: null });
    expect(ordem.km_entrada).toBe(40_000);
    expect(ordem.itens?.map((item) => item.servico_id)).toEqual(["oleo", null]);
    expect(ordem.itens?.[1].peca).toEqual({ prazo_garantia_dias: 90 });
  });

  it("OS sem carro vem com o veículo vazio", async () => {
    respostas.ordens_servico_clientes = [
      { ...linha, veiculo_id: null, veiculo_placa: null, veiculo_marca: null, veiculo_modelo: null, itens: null },
    ];
    const [ordem] = await listarOrdensParaRetornos();
    expect(ordem.veiculo).toBeNull();
    expect(ordem.itens).toEqual([]);
  });

  it("pede só as faturadas, sem o Consumidor, e por páginas", async () => {
    chamadas.length = 0;
    respostas.ordens_servico_clientes = [];
    await listarOrdensParaRetornos();
    const doBanco = chamadas.filter((c) => c.tabela === "ordens_servico_clientes");
    expect(doBanco).toContainEqual({ tabela: "ordens_servico_clientes", metodo: "eq", args: ["status", "faturada"] });
    expect(doBanco).toContainEqual({
      tabela: "ordens_servico_clientes",
      metodo: "neq",
      args: ["cliente_id", CLIENTE_CONSUMIDOR_ID],
    });
    expect(doBanco.some((c) => c.metodo === "range")).toBe(true);
  });
});

describe("listarServicosComIntervalo", () => {
  it("só os que têm intervalo; sem a coluna no banco (antes da 0083), vira nulo e fica de fora", async () => {
    respostas.servicos = [
      { id: "oleo", descricao: "Troca de óleo", intervalo_dias: 180, intervalo_km: 10_000 },
      { id: "alinhamento", descricao: "Alinhamento", intervalo_dias: null, intervalo_km: 10_000 },
      { id: "lavagem", descricao: "Lavagem", intervalo_dias: null, intervalo_km: null },
      { id: "zero", descricao: "Zero", intervalo_dias: 0, intervalo_km: 0 },
      { id: "antigo", descricao: "Banco sem a migration" },
    ];
    expect(await listarServicosComIntervalo()).toEqual([
      { id: "oleo", descricao: "Troca de óleo", intervalo_dias: 180, intervalo_km: 10_000 },
      { id: "alinhamento", descricao: "Alinhamento", intervalo_dias: null, intervalo_km: 10_000 },
    ]);
  });
});
