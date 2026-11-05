// @vitest-environment jsdom
/**
 * Teste de TELA: o que foi escolhido na janela da aprovação com peça sem
 * cadastro (#655) não se perde quando a pessoa clica "Voltar" e abre a
 * janela de novo (#720, item 1). Antes, a janela esquecia a peça nova: a
 * pessoa cadastrava de novo e a primeira ficava sobrando no cadastro. E o
 * item corrigido depois perde a escolha: a peça de antes pode não ser a dele.
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

beforeEach(() => localStorage.clear());

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

function montar(ordemAberta: OrdemServico) {
  const onAprovar = vi.fn().mockResolvedValue(undefined);
  const onEditarItem = vi.fn().mockResolvedValue(undefined);
  const { user } = renderizar(
    <OrdemServicoForm
      modoOrcamento
      ordemExistente={ordemAberta}
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
    />,
  );
  return { user, onAprovar, onEditarItem };
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

describe("OrdemServicoForm — as escolhas da aprovação não se perdem no Voltar (#720)", () => {
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
