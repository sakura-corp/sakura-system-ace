// @vitest-environment jsdom
/**
 * Teste de TELA: a aba Fechamento fica FORA do <form> da OS (#1128,
 * comentário de 18/11). O "Cadastrar agora" da janela "Emitir NFC-e" abre o
 * formulário da peça (`PecaForm`, que tem o próprio <form>); desenhado dentro
 * do <form> da OS, era um formulário dentro de outro (HTML inválido) e o
 * "Salvar peça" não fazia nada visível numa OS já faturada.
 *
 * A aba é trocada por um <form> de mentira: aqui só importa ONDE ela é
 * desenhada, e que enviar o formulário dela não envia a OS junto.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { OrdemServicoForm } from "./OrdemServicoForm";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";

const salvarPecaDeMentira = vi.fn();
vi.mock("./FechamentoTab", () => ({
  FechamentoTab: () => (
    <form
      aria-label="Cadastrar peça"
      onSubmit={(e) => {
        e.preventDefault();
        salvarPecaDeMentira();
      }}
    >
      <button type="submit">Salvar peça</button>
    </form>
  ),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: false, permissoes: [] }, lojaAtual: { id: "loja-1" } }),
}));
// O rodapé busca o custo dos itens (lucro previsto, #1087); aqui o banco responde "sem custo".
vi.mock("@/lib/caixa", async (importar) => ({
  ...(await importar<typeof import("@/lib/caixa")>()),
  buscarCustoDasOrdens: async () => new Map(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const funcionarios = [
  { id: "func-1", loja_id: "loja-1", nome: "Carlos", cargo: "Mecânico", ativo: true },
] as unknown as Funcionario[];

const clientes = [
  {
    id: "cliente-1",
    nome: "Maria da Silva",
    tipo_pessoa: "fisica",
    veiculos: [{ id: "veiculo-1", cliente_id: "cliente-1", placa: "ABC1D23", modelo: "Ka", km_atual: 82000 }],
  },
] as unknown as Cliente[];

const faturada = {
  id: "os-1",
  numero: 12,
  numero_orcamento: 7,
  loja_id: "loja-1",
  cliente_id: "cliente-1",
  veiculo_id: "veiculo-1",
  status: "faturada",
  km_entrada: 82000,
  descricao_problema: null,
  data_abertura: "2026-11-18T12:00:00.000Z",
  vendedor_id: null,
  cliente: { nome: "Maria da Silva" },
  itens: [
    {
      id: "item-1", tipo: "peca", peca_id: null, servico_id: null, descricao: "Palheta",
      quantidade: 1, preco_unitario: 80, desconto: 0, custo_unitario: null,
    },
  ],
} as unknown as OrdemServico;

function montar() {
  const onSalvarEdicao = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <OrdemServicoForm
      ordemExistente={faturada}
      abaInicial="fechamento"
      clientes={clientes}
      pecas={[]}
      servicos={[]}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map()}
      saldoCarregado
      onSalvarNova={vi.fn()}
      onSalvarEdicao={onSalvarEdicao}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onEncerrar={vi.fn()}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
    />,
  );
  return { ...resultado, onSalvarEdicao };
}

describe("OrdemServicoForm — a aba Fechamento fica fora do <form> da OS (#1128)", () => {
  it("o formulário da peça não fica dentro do formulário da OS", () => {
    montar();
    const formDaPeca = screen.getByRole("form", { name: "Cadastrar peça" });
    expect(formDaPeca.parentElement?.closest("form")).toBeNull();
  });

  it("'Salvar peça' na aba Fechamento salva a peça, e não a OS", async () => {
    const { user, onSalvarEdicao } = montar();
    await user.click(screen.getByRole("button", { name: "Salvar peça" }));
    expect(salvarPecaDeMentira).toHaveBeenCalledTimes(1);
    expect(onSalvarEdicao).not.toHaveBeenCalled();
  });

});
