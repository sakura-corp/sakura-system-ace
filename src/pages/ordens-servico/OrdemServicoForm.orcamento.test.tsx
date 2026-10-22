// @vitest-environment jsdom
/**
 * Teste de TELA do formulário da OS em modo orçamento (#379).
 *
 * Promessas guardadas aqui:
 * 1. Orçamento novo já traz a validade padrão (hoje + 7 dias) e a manda ao salvar.
 * 2. "Aprovar" pede quem aprovou (texto livre) e só então chama `onAprovar`.
 * 3. Orçamento vencido avisa que o preço pode ter mudado, mas DEIXA aprovar.
 * 4. "Recusar" é um clique, com motivo opcional.
 * 5. Orçamento recusado é histórico: sem Aprovar, sem Recusar, sem Salvar.
 * 6. Não aprova com mudança sem salvar (senão ela se perderia), e aprovar
 *    apaga o rascunho do orçamento.
 * 7. O aviso de KM usa só as passagens do veículo escolhido (`buscarOrdensDoVeiculo`).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { validadePadrao } from "@/schemas/orcamento";
import { OrdemServicoForm } from "./OrdemServicoForm";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { OrdemServico } from "@/types/os";

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

function orcamento(extra: Partial<OrdemServico> = {}): OrdemServico {
  return {
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
    itens: [],
    ...extra,
  } as unknown as OrdemServico;
}

function montar(extra: Partial<Parameters<typeof OrdemServicoForm>[0]> = {}) {
  const onSalvarNova = vi.fn().mockResolvedValue(undefined);
  const onAprovar = vi.fn().mockResolvedValue(undefined);
  const onRecusar = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <OrdemServicoForm
      modoOrcamento
      clientes={clientes}
      pecas={[]}
      servicos={[]}
      funcionarios={funcionarios}
      funcionarioAtualId="func-1"
      ordens={[]}
      saldoPorPeca={new Map()}
      saldoCarregado
      onSalvarNova={onSalvarNova}
      onSalvarEdicao={vi.fn().mockResolvedValue(undefined)}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onEncerrar={vi.fn().mockResolvedValue(undefined)}
      onAprovar={onAprovar}
      onRecusar={onRecusar}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      onCancelar={vi.fn()}
      {...extra}
    />,
  );
  return { ...resultado, onSalvarNova, onAprovar, onRecusar };
}

describe("OrdemServicoForm — orçamento novo", () => {
  it("traz a validade padrão e manda a validade ao salvar", async () => {
    const { user, onSalvarNova } = montar();

    expect(screen.getByLabelText("Validade")).toHaveValue(validadePadrao());
    expect(screen.getByRole("heading", { name: "Novo orçamento" })).toBeInTheDocument();

    // O cliente é um Combobox: abre ao receber foco e escolhe no clique da opção.
    await user.click(screen.getByDisplayValue("Selecione o cliente"));
    await user.click(screen.getByRole("button", { name: "Maria da Silva" }));
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    expect(onSalvarNova).toHaveBeenCalledTimes(1);
    expect(onSalvarNova.mock.calls[0][2]).toBe(validadePadrao());
  });
});

describe("OrdemServicoForm — aprovar", () => {
  it("pede quem aprovou e só então aprova", async () => {
    const ordem = orcamento();
    const { user, onAprovar } = montar({ ordemExistente: ordem });

    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    // Ainda não aprovou: abriu a pergunta.
    expect(onAprovar).not.toHaveBeenCalled();

    // Em branco não vale: o registro de quem aprovou é o ponto.
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    expect(onAprovar).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));

    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone");
  });

  it("orçamento no prazo não mostra aviso de preço", async () => {
    const { user } = montar({ ordemExistente: orcamento() });
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(screen.queryByText(/preço pode ter mudado/)).not.toBeInTheDocument();
  });

  it("orçamento vencido avisa que o preço pode ter mudado, mas deixa aprovar", async () => {
    const ordem = orcamento({ validade: "2020-01-01" });
    const { user, onAprovar } = montar({ ordemExistente: ordem });

    expect(screen.getByText("vencido")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(screen.getByText(/preço pode ter mudado/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Quem aprovou?"), "o dono, no balcão");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    expect(onAprovar).toHaveBeenCalledWith(ordem, "o dono, no balcão");
  });

  it("mostra a mensagem do erro quando a aprovação falha", async () => {
    const { user, onAprovar } = montar({ ordemExistente: orcamento() });
    onAprovar.mockRejectedValueOnce(new Error("A OS 9 foi aprovada, mas a baixa não entrou"));

    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));

    expect(await screen.findByText(/foi aprovada, mas a baixa não entrou/)).toBeInTheDocument();
  });
});

describe("OrdemServicoForm — aprovar com mudança sem salvar", () => {
  it("bloqueia a aprovação enquanto houver mudança sem salvar", async () => {
    const { user, onAprovar } = montar({ ordemExistente: orcamento({ descricao_problema: "antes" }) });
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    expect(screen.getByRole("button", { name: "Confirmar aprovação" })).toBeEnabled();

    await user.type(screen.getByLabelText("Observação"), " mudei");

    expect(screen.getByRole("button", { name: "Confirmar aprovação" })).toBeDisabled();
    expect(screen.getByText("Salve as alterações antes de aprovar")).toBeInTheDocument();
    expect(onAprovar).not.toHaveBeenCalled();
  });

  it("sem mudança, aprova e apaga o rascunho do orçamento", async () => {
    localStorage.setItem("rascunho-orcamento-orc-1", JSON.stringify({ descricao_problema: "velho" }));
    const { user, onAprovar } = montar({ ordemExistente: orcamento() });

    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));

    expect(onAprovar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("rascunho-orcamento-orc-1")).toBeNull();
  });
});

describe("OrdemServicoForm — aviso de KM só com o veículo escolhido", () => {
  it("busca as passagens do veículo escolhido e avisa se o KM for menor", async () => {
    const buscarOrdensDoVeiculo = vi.fn().mockResolvedValue([
      { id: "os-9", veiculo_id: "veiculo-1", km_entrada: 90000, data_abertura: "2026-09-01T12:00:00.000Z", status: "faturada" },
    ]);
    const { user } = montar({ buscarOrdensDoVeiculo });

    await user.click(screen.getByDisplayValue("Selecione o cliente"));
    await user.click(screen.getByRole("button", { name: "Maria da Silva" }));
    await user.type(screen.getByLabelText("KM de entrada"), "80000");

    expect(await screen.findByText(/o KM era 90\.000/)).toBeInTheDocument();
    expect(buscarOrdensDoVeiculo).toHaveBeenCalledWith("veiculo-1");
  });
});

describe("OrdemServicoForm — recusar", () => {
  it("recusa com o motivo escolhido", async () => {
    const ordem = orcamento();
    const { user, onRecusar } = montar({ ordemExistente: ordem });

    await user.selectOptions(screen.getByLabelText("Motivo da recusa (opcional)"), "preco");
    await user.click(screen.getByRole("button", { name: "Recusar" }));

    expect(onRecusar).toHaveBeenCalledWith(ordem, "preco");
  });

  it("recusa de um clique, sem motivo", async () => {
    const ordem = orcamento();
    const { user, onRecusar } = montar({ ordemExistente: ordem });

    await user.click(screen.getByRole("button", { name: "Recusar" }));

    expect(onRecusar).toHaveBeenCalledWith(ordem, null);
  });

  it("orçamento recusado é só histórico: sem aprovar, recusar nem salvar", () => {
    montar({
      ordemExistente: orcamento({ status: "recusado", motivo_recusa: "preco" }),
    });

    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recusar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar alterações" })).not.toBeInTheDocument();
    expect(screen.getByText(/Preço/)).toBeInTheDocument();
  });
});

describe("OrdemServicoForm — a OS de sempre não muda", () => {
  it("fora do modo orçamento não tem Validade nem Aprovar", () => {
    montar({ modoOrcamento: false, ordemExistente: undefined });
    expect(screen.queryByLabelText("Validade")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
  });
});

describe("OrdemServicoForm — peça sem cadastro no orçamento (#655)", () => {
  const pecaCadastrada = { id: "peca-1", descricao: "Pneu 175/70 R13", preco_venda: 300 } as never;

  it("no orçamento a peça pode ser digitada sem cadastro, com custo opcional, e vai sem peca_id", async () => {
    const { user, onSalvarNova } = montar({ pecas: [pecaCadastrada] });

    await user.click(screen.getByDisplayValue("Selecione o cliente"));
    await user.click(screen.getByRole("button", { name: "Maria da Silva" }));

    // A linha que o formulário novo já traz nasce como "peça sem cadastro": descrição e custo à vista.
    expect(screen.getByDisplayValue("Peça sem cadastro (digitar abaixo)")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Descrição da peça"), "Palheta 20 polegadas");
    await user.type(screen.getByLabelText("Preço unitário"), "80");
    await user.type(screen.getByLabelText("Custo (opcional)"), "35");
    await user.click(screen.getByRole("button", { name: "Salvar orçamento" }));

    const itens = onSalvarNova.mock.calls[0][1];
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ tipo: "peca", peca_id: null, descricao: "Palheta 20 polegadas", custo_unitario: 35 });
  });

  it("escolhendo uma peça do cadastro, some a descrição e o custo", async () => {
    const { user } = montar({ pecas: [pecaCadastrada] });

    await user.click(screen.getByDisplayValue("Peça sem cadastro (digitar abaixo)"));
    await user.click(screen.getByRole("button", { name: "Pneu 175/70 R13" }));

    expect(screen.queryByPlaceholderText("Descrição da peça")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custo (opcional)")).not.toBeInTheDocument();
  });

  it("fora do orçamento (OS comum) a peça continua só do cadastro", () => {
    montar({ modoOrcamento: false, pecas: [pecaCadastrada] });

    expect(screen.getByDisplayValue("Selecione a peça")).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/Peça sem cadastro/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Descrição da peça")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custo (opcional)")).not.toBeInTheDocument();
  });
});

describe("OrdemServicoForm — corrigir peça já lançada (#655)", () => {
  const avulsa = {
    id: "item-1", tipo: "peca", peca_id: null, servico_id: null, descricao: "Palheta",
    quantidade: 1, preco_unitario: 80, desconto: 0, custo_unitario: 35,
  };
  const cadastrada = { ...avulsa, id: "item-2", peca_id: "peca-1", descricao: "Pneu", custo_unitario: null };

  it("item avulso de uma OS (nascida de orçamento) continua editável como avulso, mostrando o custo", async () => {
    const { user } = montar({
      modoOrcamento: false,
      ordemExistente: orcamento({ status: "em_andamento", numero: 51, itens: [avulsa] as never }),
    });

    expect(screen.getByText(/custo R\$\s*35,00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByPlaceholderText("Descrição da peça")).toHaveValue("Palheta");
    expect(screen.getByLabelText("Custo (opcional)")).toHaveValue(35);
  });

  it("item do cadastro numa OS comum não ganha a opção sem cadastro", async () => {
    const { user } = montar({
      modoOrcamento: false,
      pecas: [{ id: "peca-1", descricao: "Pneu", preco_venda: 300 } as never],
      ordemExistente: orcamento({ status: "em_andamento", numero: 51, itens: [cadastrada] as never }),
    });

    await user.click(screen.getByRole("button", { name: "Editar" }));
    // Abre a lista da peça: a opção "sem cadastro" não existe fora do orçamento.
    await user.click(screen.getByDisplayValue("Pneu"));

    expect(screen.getByRole("button", { name: "Selecione a peça" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Peça sem cadastro/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custo (opcional)")).not.toBeInTheDocument();
  });
});

describe("OrdemServicoForm — aprovar com peça sem cadastro (#655)", () => {
  const avulsa = {
    id: "item-1", tipo: "peca", peca_id: null, servico_id: null, descricao: "Palheta",
    quantidade: 1, preco_unitario: 80, desconto: 0, custo_unitario: null,
  };
  const servico = { ...avulsa, id: "item-2", tipo: "servico", descricao: "Alinhamento" };

  async function ateConfirmar(user: ReturnType<typeof montar>["user"]) {
    await user.click(screen.getByRole("button", { name: "Aprovar" }));
    await user.type(screen.getByLabelText("Quem aprovou?"), "pelo telefone");
    await user.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
  }

  it("com peça avulsa abre a janela em vez de aprovar; só aprova depois de escolher o caminho", async () => {
    const ordem = orcamento({ itens: [avulsa] as never });
    const { user, onAprovar } = montar({ ordemExistente: ordem });

    await ateConfirmar(user);

    expect(screen.getByRole("dialog", { name: "Peças sem cadastro" })).toBeInTheDocument();
    expect(onAprovar).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: "Seguir sem cadastro" }));
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));

    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone", []);
  });

  it("sem peça avulsa (só serviço) aprova direto, sem janela", async () => {
    const ordem = orcamento({ itens: [servico] as never });
    const { user, onAprovar } = montar({ ordemExistente: ordem });

    await ateConfirmar(user);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onAprovar).toHaveBeenCalledWith(ordem, "pelo telefone");
  });

  it("peça já do cadastro não conta como avulsa", async () => {
    const ordem = orcamento({ itens: [{ ...avulsa, peca_id: "peca-1" }] as never });
    const { user, onAprovar } = montar({ ordemExistente: ordem });

    await ateConfirmar(user);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onAprovar).toHaveBeenCalledTimes(1);
  });

  it("se a aprovação falha, o erro aparece dentro da janela e ela continua aberta", async () => {
    const ordem = orcamento({ itens: [avulsa] as never });
    const { user, onAprovar } = montar({ ordemExistente: ordem });
    onAprovar.mockRejectedValueOnce(new Error("A OS 9 foi aprovada, mas a baixa não entrou"));

    await ateConfirmar(user);
    await user.click(screen.getByRole("radio", { name: "Seguir sem cadastro" }));
    await user.click(screen.getByRole("button", { name: "Aprovar orçamento" }));

    const janela = screen.getByRole("dialog", { name: "Peças sem cadastro" });
    expect(await within(janela).findByText(/foi aprovada, mas a baixa não entrou/)).toBeInTheDocument();
  });
});
