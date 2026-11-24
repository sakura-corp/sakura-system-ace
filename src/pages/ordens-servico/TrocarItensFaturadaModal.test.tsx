// @vitest-environment jsdom
/**
 * Teste de TELA da janela "Corrigir a OS" (#1145, #1182).
 *
 * As promessas: (1) trocar a peça pelo mesmo total chega no "antes e depois"
 * e manda a lista final certa, com o motivo; (2) total diferente chega no
 * "Conferir e acertar" e manda o acerto certo (pago agora, a receber,
 * devolvido, conta em aberto); (3) "Manter o total" zera a diferença; (4) sem
 * motivo não confirma; (5) estoque negativo pede a confirmação; (6) clicar 2
 * vezes não manda 2 vezes, e a chave é uma só por janela; (7) os erros do
 * banco aparecem em português.
 */
import { describe, expect, it, vi, type Mock } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import {
  CaixaDeHojeFechadoError,
  CorrecaoMudouError,
  EstoqueNegativoNaTrocaError,
  NotaEmitidaNaCorrecaoError,
  type SituacaoDaCorrecao,
} from "@/lib/ordensServico";
import {
  TrocarItensFaturadaModal,
  type ConfirmacaoDaCorrecao,
} from "./TrocarItensFaturadaModal";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const pecas = [
  { id: "p1", descricao: "PNEU 175/70 R13", preco_venda: 300 },
  { id: "p2", descricao: "PNEU 175/65 R14", preco_venda: 350 },
].map(
  (p) => ({ ...p, ativo: true, sem_custo: false }) as unknown as PecaJanela,
);

const servicos = [
  { id: "s1", descricao: "Balanceamento", preco_padrao: 50 },
].map((s) => ({ ...s, ativo: true }) as unknown as Servico);

const funcionarios = [
  { id: "f1", nome: "Carlos" },
] as unknown as FuncionarioPublico[];

function ordem(): OrdemServico {
  return {
    id: "os-1",
    numero: 12,
    loja_id: "loja-1",
    status: "faturada",
    data_fechamento: "2026-11-19T15:00:00.000Z",
    itens: [
      {
        id: "i1",
        ordem_servico_id: "os-1",
        tipo: "peca",
        peca_id: "p1",
        servico_id: null,
        tecnico_id: null,
        descricao: "PNEU 175/70 R13",
        quantidade: 2,
        preco_unitario: 300,
        desconto: 0,
      },
    ],
  } as unknown as OrdemServico;
}

const SEM_CONTA: SituacaoDaCorrecao = {
  contaDoFaturamentoEmAberto: null,
  caixaDeHojeFechado: false,
  comissaoDoPeriodoPaga: false,
};

function montar(
  saldo = new Map([
    ["p1", 5],
    ["p2", 5],
  ]),
  onConfirmar: Mock<(c: ConfirmacaoDaCorrecao) => Promise<void>> = vi
    .fn()
    .mockResolvedValue(undefined),
  situacao: Partial<SituacaoDaCorrecao> = {},
  notaParaCancelar?: NotaFiscalArquivo,
) {
  const resultado = renderizar(
    <TrocarItensFaturadaModal
      ordem={ordem()}
      pecas={pecas}
      servicos={servicos}
      funcionarios={funcionarios}
      saldoPorPeca={saldo}
      saldoCarregado
      buscarSituacao={() => Promise.resolve({ ...SEM_CONTA, ...situacao })}
      notaParaCancelar={notaParaCancelar}
      onConfirmar={onConfirmar}
      onFechar={vi.fn()}
    />,
  );
  return { ...resultado, onConfirmar };
}

type Usuario = ReturnType<typeof montar>["user"];

async function trocarPeloPneuCerto(user: Usuario) {
  await user.click(screen.getByDisplayValue("PNEU 175/70 R13"));
  await user.click(screen.getByRole("button", { name: "PNEU 175/65 R14" }));
}

async function mudarPreco(user: Usuario, valor: string) {
  const preco = screen.getByLabelText("Preço unitário");
  await user.clear(preco);
  await user.type(preco, valor);
}

async function irParaOAcerto(user: Usuario) {
  await user.click(screen.getByRole("button", { name: "Conferir a troca" }));
  await screen.findByRole("heading", { name: "Conferir e acertar" });
}

describe("TrocarItensFaturadaModal", () => {
  it("troca a peça pelo mesmo total, mostra o antes e depois e manda a lista com o motivo", async () => {
    const { user, onConfirmar } = montar();
    await trocarPeloPneuCerto(user);
    // O preço cobrado fica (não vira o preço de cadastro da peça nova).
    expect(screen.getByLabelText("Preço unitário")).toHaveValue(300);

    await irParaOAcerto(user);
    expect(screen.getByText("Sai")).toBeInTheDocument();
    expect(screen.getByText(/PNEU 175\/70 R13 \(2x\)/)).toBeInTheDocument();
    expect(screen.getByText(/PNEU 175\/65 R14 \(2x\)/)).toBeInTheDocument();
    expect(screen.getByText(/igual ao faturado/)).toBeInTheDocument();

    // Sem motivo não vai.
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Diga o motivo/);

    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        itens: [
          expect.objectContaining({
            id: "i1",
            tipo: "peca",
            peca_id: "p2",
            descricao: "PNEU 175/65 R14",
            quantidade: 2,
            preco_unitario: 300,
          }),
        ],
        motivo: "medida errada",
        acerto: null,
        aceitaEstoqueNegativo: false,
        totalFaturado: 600,
      }),
    );
  });

  it("sem mudança nenhuma não tem o que conferir", () => {
    montar();
    expect(
      screen.getByRole("button", { name: "Conferir a troca" }),
    ).toBeDisabled();
  });

  it("estoque que fica negativo pede a confirmação", async () => {
    const { user, onConfirmar } = montar(
      new Map([
        ["p1", 5],
        ["p2", 1],
      ]),
    );
    await trocarPeloPneuCerto(user);
    await irParaOAcerto(user);

    expect(
      screen.getByText(/PNEU 175\/65 R14 \(fica -1\)/),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/Sei disso/));
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        motivo: "medida errada",
        aceitaEstoqueNegativo: true,
      }),
    );
  });

  it("quando o banco avisa o estoque negativo (saldo velho na tela), pede a confirmação", async () => {
    const onConfirmar = vi
      .fn()
      .mockRejectedValueOnce(
        new EstoqueNegativoNaTrocaError(
          "O estoque ficaria negativo: PNEU 175/65 R14.",
        ),
      )
      .mockResolvedValue(undefined);
    const { user } = montar(undefined, onConfirmar);
    await trocarPeloPneuCerto(user);
    await irParaOAcerto(user);
    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));

    expect(await screen.findByLabelText(/Sei disso/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Sei disso/));
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenLastCalledWith(
      expect.objectContaining({
        motivo: "medida errada",
        aceitaEstoqueNegativo: true,
      }),
    );
  });

  it("pago e o total subiu: 'Cliente paga agora' já vem marcado e manda pago_agora com a forma", async () => {
    const { user, onConfirmar } = montar();
    await mudarPreco(user, "350");
    expect(
      screen.getByRole("button", { name: "Conferir a troca" }),
    ).toBeEnabled();
    await irParaOAcerto(user);

    expect(
      screen.getByRole("radio", { name: /Cliente paga agora/ }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Fica a receber/ }),
    ).not.toBeChecked();
    expect(
      screen.getByText(
        /Lança R\$\s100,00 como Entrada no Caixa de hoje, \d\d\/\d\d\./,
      ),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Motivo/), "serviço a mais");
    // Sem a forma de pagamento não vai.
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/forma de pagamento/);

    await user.selectOptions(
      screen.getByLabelText("Forma de pagamento"),
      "pix",
    );
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        acerto: "pago_agora",
        formaPagamento: "pix",
        vencimento: null,
        totalFaturado: 600,
      }),
    );
  });

  it("'Fica a receber' pede o vencimento e manda a_receber", async () => {
    const { user, onConfirmar } = montar();
    await mudarPreco(user, "350");
    await irParaOAcerto(user);
    await user.click(screen.getByRole("radio", { name: /Fica a receber/ }));
    expect(
      screen.queryByLabelText("Forma de pagamento"),
    ).not.toBeInTheDocument();
    const venc = screen.getByLabelText(/Vencimento/);
    await user.clear(venc);
    await user.type(venc, "2099-12-10");
    await user.type(screen.getByLabelText(/Motivo/), "serviço a mais");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        acerto: "a_receber",
        formaPagamento: null,
        vencimento: "2099-12-10",
      }),
    );
  });

  it("pago e o total desceu: só 'Devolver agora', e o rodapé diz que é Saída", async () => {
    const { user, onConfirmar } = montar();
    await mudarPreco(user, "250");
    await irParaOAcerto(user);

    expect(screen.getByRole("radio", { name: /Devolver agora/ })).toBeChecked();
    expect(
      screen.queryByRole("radio", { name: /Cliente paga agora/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Manter o total/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Saída \(Devolução ao cliente\) no Caixa de hoje/),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Forma de pagamento"),
      "dinheiro",
    );
    await user.type(screen.getByLabelText(/Motivo/), "serviço a menos");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        acerto: "devolvido",
        formaPagamento: "dinheiro",
      }),
    );
  });

  it("conta em aberto: só um texto, sem escolha e sem forma de pagamento", async () => {
    const { user, onConfirmar } = montar(undefined, undefined, {
      contaDoFaturamentoEmAberto: { id: "c1", valor: 600 },
    });
    await mudarPreco(user, "350");
    await irParaOAcerto(user);

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Forma de pagamento"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/passa de R\$\s600,00 para R\$\s700,00/),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Motivo/), "serviço a mais");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({ acerto: "conta_aberta", formaPagamento: null }),
    );
  });

  it("'Manter o total' põe a diferença como desconto e zera a diferença", async () => {
    const { user, onConfirmar } = montar();
    await mudarPreco(user, "350");
    await irParaOAcerto(user);
    await user.click(
      screen.getByRole("button", { name: /Manter o total de R\$\s600,00/ }),
    );

    expect(screen.getByText(/igual ao faturado/)).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText(/nada entra no Caixa/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Motivo/), "a loja não cobra");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        acerto: null,
        itens: [
          expect.objectContaining({ preco_unitario: 350, desconto: 100 }),
        ],
      }),
    );
  });

  it("avisa quando a comissão do período já foi paga", async () => {
    const { user } = montar(undefined, undefined, {
      comissaoDoPeriodoPaga: true,
    });
    await mudarPreco(user, "350");
    await irParaOAcerto(user);
    expect(screen.getByText(/comissão.*já foi paga/i)).toBeInTheDocument();
  });

  it("caixa de hoje fechado: avisa e não deixa corrigir", async () => {
    const { user, onConfirmar } = montar(undefined, undefined, {
      caixaDeHojeFechado: true,
    });
    await mudarPreco(user, "350");
    await irParaOAcerto(user);
    expect(
      screen.getByText(/desfaça o fechamento de hoje/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Corrigir" })).toBeDisabled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("clicar 2 vezes em Corrigir chama uma vez só, com uma chave", async () => {
    const onConfirmar = vi.fn().mockReturnValue(new Promise(() => {}));
    const { user } = montar(undefined, onConfirmar);
    await trocarPeloPneuCerto(user);
    await irParaOAcerto(user);
    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    const botao = screen.getByRole("button", { name: "Corrigir" });
    await user.click(botao);
    await user.click(botao);
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onConfirmar.mock.calls[0][0].chave.length).toBeGreaterThan(10);
  });

  it("depois de um erro, tentar de novo manda a MESMA chave", async () => {
    const onConfirmar = vi
      .fn()
      .mockRejectedValueOnce(new Error("falhou"))
      .mockResolvedValue(undefined);
    const { user } = montar(undefined, onConfirmar);
    await trocarPeloPneuCerto(user);
    await irParaOAcerto(user);
    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(onConfirmar).toHaveBeenCalledTimes(2);
    expect(onConfirmar.mock.calls[1][0].chave).toBe(
      onConfirmar.mock.calls[0][0].chave,
    );
  });

  it("nota emitida: mostra a mensagem e leva à janela de cancelar a nota", async () => {
    const onConfirmar = vi
      .fn()
      .mockRejectedValue(
        new NotaEmitidaNaCorrecaoError("Esta OS tem nota emitida."),
      );
    const nota = {
      id: "n1",
      nome_arquivo: "nfce-1.xml",
    } as unknown as NotaFiscalArquivo;
    const { user } = montar(undefined, onConfirmar, {}, nota);
    await trocarPeloPneuCerto(user);
    await irParaOAcerto(user);
    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(
      await screen.findByText(/Esta OS tem nota emitida/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Cancelar a nota/ }));
    expect(screen.getByText("Cancelar nota fiscal")).toBeInTheDocument();
  });

  it("caixa fechado e OS que mudou (erros do banco) mostram a mensagem", async () => {
    const onConfirmar = vi
      .fn()
      .mockRejectedValueOnce(
        new CaixaDeHojeFechadoError("Desfaça o fechamento de hoje."),
      )
      .mockRejectedValueOnce(
        new CorrecaoMudouError("A OS mudou em outro computador."),
      );
    const { user } = montar(undefined, onConfirmar);
    await trocarPeloPneuCerto(user);
    await irParaOAcerto(user);
    await user.type(screen.getByLabelText(/Motivo/), "medida errada");
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Desfaça o fechamento de hoje/,
    );
    await user.click(screen.getByRole("button", { name: "Corrigir" }));
    expect(
      await screen.findByText(/mudou em outro computador/),
    ).toBeInTheDocument();
  });
});
