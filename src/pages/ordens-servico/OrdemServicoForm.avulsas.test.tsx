// @vitest-environment jsdom
/**
 * Teste de TELA: a peça cadastrada na janela da aprovação (#655) não se perde
 * quando a pessoa clica "Voltar" e abre a janela de novo (#720, item 1).
 * Antes, a janela esquecia a peça nova: a pessoa cadastrava de novo e a
 * primeira ficava sobrando no cadastro.
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

describe("OrdemServicoForm — peça cadastrada na aprovação não se perde no Voltar (#720)", () => {
  it("fechar e abrir a janela mantém a peça cadastrada como caminho", async () => {
    const onAprovar = vi.fn().mockResolvedValue(undefined);
    const { user } = renderizar(
      <OrdemServicoForm
        modoOrcamento
        ordemExistente={ordem}
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
        onEditarItem={vi.fn()}
        onEncerrar={vi.fn()}
        onAprovar={onAprovar}
        onRecusar={vi.fn()}
        onCadastrarCliente={vi.fn()}
        onCadastrarVeiculo={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));

    await user.click(screen.getByRole("radio", { name: "Cadastrar agora" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar a peça" }));
    await user.click(screen.getByRole("button", { name: "Salvar peça de mentira" }));
    expect(screen.getByText("Peça cadastrada: Palheta nova")).toBeInTheDocument();

    // Voltar e abrir de novo: a peça nova continua lá, sem cadastrar outra.
    await user.click(within(screen.getByRole("dialog", { name: "Peças sem cadastro" })).getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("dialog", { name: "Peças sem cadastro" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));

    expect(screen.getByRole("radio", { name: "Cadastrar agora" })).toBeChecked();
    expect(screen.getByText("Peça cadastrada: Palheta nova")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));
    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone", [{ itemId: "item-1", pecaId: "p-nova" }]);
  });
});
