// @vitest-environment jsdom
/**
 * Teste de TELA: o que foi escolhido na janela da aprovação com peça sem
 * cadastro (#655) não se perde quando a pessoa clica "Voltar" e abre a
 * janela de novo (#720, item 1). Antes, a janela esquecia a peça nova: a
 * pessoa cadastrava de novo e a primeira ficava sobrando no cadastro. E o
 * item corrigido depois perde a escolha: a peça de antes pode não ser a dele.
 *
 * Desde a parte 2 da #720, a peça cadastrada na janela é ligada ao item NA
 * HORA: fechar o orçamento e abrir de novo não deixa ela solta no cadastro.
 * Se ligar falha (sem internet), vale o de antes: a escolha fica guardada e
 * a aprovação liga.
 *
 * O cadastro de peça (o formulário inteiro) é trocado por um botão: aqui só
 * importa o que a janela da aprovação faz com a peça que ele devolve.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { OrdemServicoForm } from "./OrdemServicoForm";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";
import type { PecaJanela } from "@/types/peca";

vi.mock("./CadastroPecaAvulsaModal", () => ({
  CadastroPecaAvulsaModal: ({ onCadastrada }: { onCadastrada: (peca: PecaJanela) => void }) => (
    <button
      type="button"
      onClick={() =>
        onCadastrada({ id: "p-nova", descricao: "Palheta nova", codigo_interno: null, codigo_barras: null, medida: null } as unknown as PecaJanela)
      }
    >
      Salvar peça de mentira
    </button>
  ),
}));

const cadastrarPecaDoItem = vi.fn();
vi.mock("@/lib/ordensServico", async (original) => ({
  ...(await original<typeof import("@/lib/ordensServico")>()),
  cadastrarPecaDoItem: (...a: unknown[]) => cadastrarPecaDoItem(...a),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op" }, lojaAtual: { id: "loja-1" } }),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  cadastrarPecaDoItem.mockResolvedValue(true);
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

const avulsa = {
  id: "item-1", tipo: "peca", peca_id: null, servico_id: null, descricao: "Palheta",
  quantidade: 1, preco_unitario: 80, desconto: 0, custo_unitario: null,
};

const ordem = {
  id: "orc-1",
  numero: null,
  numero_orcamento: 7,
  loja_id: "loja-1",
  cliente_id: "cliente-1",
  veiculo_id: "veiculo-1",
  status: "orcamento",
  validade: "2099-01-01",
  km_entrada: 82000,
  descricao_problema: null,
  data_abertura: "2026-10-20T12:00:00.000Z",
  vendedor_id: null,
  cliente: { nome: "Maria da Silva" },
  itens: [avulsa],
} as unknown as OrdemServico;

function montar(ordemAberta: OrdemServico, onItensMudaram = vi.fn().mockResolvedValue(undefined)) {
  const onAprovar = vi.fn().mockResolvedValue(undefined);
  const onEditarItem = vi.fn().mockResolvedValue(undefined);
  const formulario = (o: OrdemServico) => (
    <OrdemServicoForm
      modoOrcamento
      ordemExistente={o}
      clientes={clientes}
      pecas={[]}
      servicos={[]}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map()}
      saldoCarregado
      onSalvarNova={vi.fn()}
      onSalvarEdicao={vi.fn()}
      onEditarItem={onEditarItem}
      onEncerrar={vi.fn()}
      onAprovar={onAprovar}
      onRecusar={vi.fn()}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
      onItensMudaram={onItensMudaram}
    />
  );
  const { user, rerender } = renderizar(formulario(ordemAberta));
  return {
    user,
    onAprovar,
    onEditarItem,
    onItensMudaram,
    // A tela de Orçamentos recarregou e mandou a ordem nova (mesma chave).
    trocarOrdem: (o: OrdemServico) => rerender(formulario(o)),
  };
}

type Usuario = ReturnType<typeof montar>["user"];

async function abrirJanela(user: Usuario) {
  await user.click(screen.getByRole("button", { name: "Aprovar" }));
  await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
  await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
}

async function cadastrarNaJanela(user: Usuario) {
  await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
  await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
  await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));
  expect(screen.getByText("Peça cadastrada: Palheta nova")).toBeInTheDocument();
}

async function voltarEAbrirDeNovo(user: Usuario) {
  const janela = screen.getByRole("dialog", { name: "Peças sem cadastro" });
  await user.click(within(janela).getByRole("button", { name: "Voltar" }));
  expect(screen.queryByRole("dialog", { name: "Peças sem cadastro" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
}

describe("OrdemServicoForm — a peça cadastrada na aprovação liga ao item na hora (#720)", () => {
  it("cadastrar liga na hora e recarrega; a janela não pede mais nada daquele item", async () => {
    const { user, onAprovar, onItensMudaram } = montar(ordem);
    await abrirJanela(user);
    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));

    expect(cadastrarPecaDoItem).toHaveBeenCalledWith("item-1", "p-nova", "op");
    expect(onItensMudaram).toHaveBeenCalled();
    expect(await screen.findByText(/Não sobrou nenhuma peça sem cadastro/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));
    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone", []);
  });

  it("fechar e abrir o orçamento não deixa a peça solta: o item volta já ligado", async () => {
    const { user, onAprovar, trocarOrdem } = montar(ordem);
    await abrirJanela(user);
    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));
    const janela = await screen.findByRole("dialog", { name: "Peças sem cadastro" });
    await user.click(within(janela).getByRole("button", { name: "Voltar" }));

    // O banco já ligou: o orçamento recarregado vem com a peça no item.
    const ligada = { ...ordem, itens: [{ ...avulsa, peca_id: "p-nova" }] } as unknown as OrdemServico;
    trocarOrdem(ligada);

    // Sem peça avulsa, a aprovação vai direto, sem janela e sem cadastrar de novo.
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    expect(screen.queryByRole("dialog", { name: "Peças sem cadastro" })).not.toBeInTheDocument();
    expect(onAprovar).toHaveBeenCalledWith(ligada, "pelo telefone");
    expect(cadastrarPecaDoItem).toHaveBeenCalledTimes(1);
  });

  it("ligou, mas o orçamento não recarregou: avisa, sem dizer que a peça não entrou", async () => {
    const { user } = montar(ordem, vi.fn().mockRejectedValue(new Error("sem internet")));
    await abrirJanela(user);
    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));

    // Aparece no formulário e dentro da janela (o mesmo erro, como o da aprovação).
    expect(
      await screen.findAllByText(/A peça foi cadastrada e ligada ao item, mas o orçamento não recarregou: sem internet/),
    ).not.toHaveLength(0);
    // Já ligada: a janela não oferece cadastrar de novo.
    expect(screen.queryByRole("radio", { name: "Cadastrar agora" })).not.toBeInTheDocument();
  });
});

// Se ligar na hora falha (sem internet), vale o de antes: a escolha fica
// guardada na janela, e a aprovação é que liga.
describe("OrdemServicoForm — ligar falhou: as escolhas não se perdem no Voltar (#720)", () => {
  beforeEach(() => {
    cadastrarPecaDoItem.mockRejectedValue(new Error("sem internet"));
  });

  it("a peça cadastrada continua como caminho, sem cadastrar outra", async () => {
    const { user, onAprovar } = montar(ordem);
    await abrirJanela(user);
    await cadastrarNaJanela(user);

    await voltarEAbrirDeNovo(user);

    expect(screen.getByRole("radio", { name: "Cadastrar agora" })).toBeChecked();
    expect(screen.getByText("Peça cadastrada: Palheta nova")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));
    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone", [{ itemId: "item-1", pecaId: "p-nova" }]);
  });

  it("vale a última escolha: cadastrou e depois mudou pra 'sem cadastro'", async () => {
    const { user, onAprovar } = montar(ordem);
    await abrirJanela(user);
    await cadastrarNaJanela(user);
    await user.click(screen.getByRole("radio", { name: "Seguir sem cadastro" }));

    await voltarEAbrirDeNovo(user);

    expect(screen.getByRole("radio", { name: "Seguir sem cadastro" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));
    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone", []);
  });

  it("item corrigido depois do Voltar perde a escolha: a peça de antes pode não ser a dele", async () => {
    const { user, onEditarItem } = montar(ordem);
    await abrirJanela(user);
    await cadastrarNaJanela(user);
    const janela = screen.getByRole("dialog", { name: "Peças sem cadastro" });
    await user.click(within(janela).getByRole("button", { name: "Voltar" }));

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const descricao = screen.getByPlaceholderText("Descrição da peça");
    await user.clear(descricao);
    await user.type(descricao, "Disco de freio");
    await user.click(screen.getByRole("button", { name: "Salvar item" }));
    expect(onEditarItem).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    expect(screen.getByRole("radio", { name: "Cadastrar agora" })).not.toBeChecked();
    expect(screen.queryByText("Peça cadastrada: Palheta nova")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar orçamento" })).toBeDisabled();
  });
});
