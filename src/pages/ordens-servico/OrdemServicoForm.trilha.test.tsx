// @vitest-environment jsdom
/**
 * Teste de TELA da trilha do fechamento da OS (#1088): conferir peças e
 * serviços → receber → nota fiscal → garantia e avisar → pronto.
 *
 * O que fica guardado:
 * - a OS abre mostrando o passo em que parou, tirado só do que está gravado
 *   (status, notas, aviso): é o "fechar o programa e abrir de novo";
 * - um botão laranja só, o do próximo passo, dizendo o que faz;
 * - cada passo leva pra ação de antes (Faturar, Emitir nota, Avisar), nenhuma
 *   sumiu.
 *
 * O painel de cada passo é o `FechamentoTab` de verdade; só o banco e o
 * WhatsApp são de mentira.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { Cliente } from "@/types/cliente";
import type { Funcionario } from "@/types/funcionario";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { ItemOS, OrdemServico, StatusOS } from "@/types/os";

const { listarArquivosDasOrdens, quandoAvisouCarroPronto, abrirConversaWhatsapp } = vi.hoisted(() => ({
  listarArquivosDasOrdens: vi.fn(),
  quandoAvisouCarroPronto: vi.fn(),
  abrirConversaWhatsapp: vi.fn(),
}));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens }));
vi.mock("@/lib/avisoDaOrdem", () => ({ quandoAvisouCarroPronto }));
vi.mock("@/lib/whatsapp", () => ({ abrirConversaWhatsapp }));
vi.mock("@/lib/configuracoes", () => ({ buscarTextoGarantia: async () => "" }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: false, permissoes: [] }, lojaAtual: { id: "loja-1" } }),
}));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
// A janela da nota (a de verdade fala com a Focus NFe): aqui só se vê que abriu e qual.
vi.mock("./EmitirNotaFiscalModal", () => ({
  EmitirNotaFiscalModal: ({ tipoNota }: { tipoNota: string }) => <div role="dialog" aria-label={`Emitir ${tipoNota}`} />,
}));

const { OrdemServicoForm } = await import("./OrdemServicoForm");

beforeEach(() => {
  localStorage.clear();
  listarArquivosDasOrdens.mockReset().mockResolvedValue([]);
  quandoAvisouCarroPronto.mockReset().mockResolvedValue(null);
  abrirConversaWhatsapp.mockReset().mockResolvedValue(undefined);
});

const funcionarios = [
  { id: "func-1", loja_id: "loja-1", nome: "Carlos", cargo: "Mecânico", ativo: true },
] as unknown as Funcionario[];
const clientes = [
  { id: "cliente-1", nome: "Maria da Silva", tipo_pessoa: "fisica", veiculos: [] },
] as unknown as Cliente[];

function ordem(status: StatusOS): OrdemServico {
  const itens: ItemOS[] = [
    {
      id: "item-1", ordem_servico_id: "os-1", tipo: "peca", peca_id: "peca-1", servico_id: null,
      tecnico_id: null, descricao: "PNEU 175/70 R14", quantidade: 2, preco_unitario: 400, desconto: 0,
    },
    {
      id: "item-2", ordem_servico_id: "os-1", tipo: "servico", peca_id: null, servico_id: "s-1",
      tecnico_id: null, descricao: "Alinhamento", quantidade: 1, preco_unitario: 60, desconto: 0,
    },
  ] as unknown as ItemOS[];
  return {
    id: "os-1", numero: 12, loja_id: "loja-1", cliente_id: "cliente-1", veiculo_id: null, status,
    km_entrada: 82000, descricao_problema: null, forma_pagamento: null, parcelas: 1,
    data_abertura: "2026-09-01T12:00:00.000Z",
    data_fechamento: status === "faturada" ? "2026-09-02T12:00:00.000Z" : null,
    vendedor_id: null, criado_por_id: null, atualizado_por_id: null,
    cliente: { nome: "Maria da Silva" }, itens,
  } as unknown as OrdemServico;
}

function nota(tipo: "nfe" | "nfse"): NotaFiscalArquivo {
  return { id: `n-${tipo}`, tipo, status: "autorizado", origem: "manual", ordem_servico_id: "os-1" } as NotaFiscalArquivo;
}

function montar(os: OrdemServico, extra: Partial<Parameters<typeof OrdemServicoForm>[0]> = {}) {
  const props = {
    onEncerrar: vi.fn().mockResolvedValue(undefined),
    onReceber: vi.fn(),
    onCancelar: vi.fn(),
    ...extra,
  };
  const resultado = renderizar(
    <OrdemServicoForm
      ordemExistente={os}
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
      onSalvarEdicao={vi.fn().mockResolvedValue(undefined)}
      onEditarItem={vi.fn().mockResolvedValue(undefined)}
      onCadastrarCliente={vi.fn()}
      onCadastrarVeiculo={vi.fn()}
      {...props}
    />,
  );
  return { ...resultado, ...props };
}

const trilha = () => screen.getByRole("region", { name: "Fechar a OS" });
/** O botão laranja da tela: tem de ser um só. */
function botaoLaranja() {
  const laranjas = screen.getAllByRole("button").filter((b) => /\bbg-acao\b/.test(b.className));
  expect(laranjas).toHaveLength(1);
  return laranjas[0];
}

describe("OrdemServicoForm — a trilha do fechamento (#1088)", () => {
  it("OS aberta: a trilha mostra 'conferir' e o botão diz o próximo passo", async () => {
    const { user, onEncerrar } = montar(ordem("em_andamento"));
    expect(within(trilha()).getByText(/Passo 1 de 4/)).toBeInTheDocument();
    const atual = within(trilha()).getByRole("listitem", { current: "step" });
    expect(atual).toHaveTextContent("Conferir peças e serviços");
    expect(botaoLaranja()).toHaveTextContent("Encerrar e receber");
    await user.click(botaoLaranja());
    expect(onEncerrar).toHaveBeenCalledTimes(1);
  });

  it("concluída: passo 2 de 4, o número grande é o a receber, e o botão abre o Faturar", async () => {
    const os = ordem("concluida");
    const { user, onReceber } = montar(os);
    expect(within(trilha()).getByText(/Passo 2 de 4/)).toBeInTheDocument();
    const receber = screen.getByRole("region", { name: "Receber" });
    expect(within(receber).getByText("A receber").nextElementSibling).toHaveTextContent(/R\$\s*860,00/);
    expect(botaoLaranja()).toHaveTextContent(/^Receber R\$\s*860,00$/);
    await user.click(botaoLaranja());
    expect(onReceber).toHaveBeenCalledWith(os);
  });

  it("faturada sem nota: passo 3 de 4, 'Emitir NFC-e' abre a janela da nota", async () => {
    const { user } = montar(ordem("faturada"));
    expect(await within(trilha()).findByText(/Passo 3 de 4/)).toBeInTheDocument();
    // Os passos feitos têm ✓ e a palavra "feito" (cor nunca sozinha).
    expect(within(trilha()).getAllByText(/\(feito/)).toHaveLength(2);
    expect(botaoLaranja()).toHaveTextContent("Emitir NFC-e");
    // A outra nota (NFS-e) tem o botão dela, discreto.
    expect(screen.getByRole("button", { name: "Emitir NFS-e" }).className).not.toMatch(/bg-acao/);
    await user.click(botaoLaranja());
    expect(screen.getByRole("dialog", { name: "Emitir NFC-e" })).toBeInTheDocument();
  });

  it("nota emitida (as duas): passo 4 de 4, garantia e avisar; Avisar abre o WhatsApp e a OS fica pronta", async () => {
    listarArquivosDasOrdens.mockResolvedValue([nota("nfe"), nota("nfse")]);
    const aoAbrir = vi.fn();
    const { user } = montar(ordem("faturada"), {
      avisoCarroPronto: { telefone: "16999990000", texto: "Seu carro está pronto", aoAbrir },
    });
    expect(await within(trilha()).findByText(/Passo 4 de 4/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver garantia" })).toBeInTheDocument();
    expect(botaoLaranja()).toHaveTextContent("Avisar o cliente");

    await user.click(botaoLaranja());
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith("16999990000", "Seu carro está pronto");
    expect(aoAbrir).toHaveBeenCalledTimes(1);
    // O fim claro: o resumo e o "Pronto".
    expect(await within(trilha()).findByText(/Tudo feito/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resumo do fechamento" })).toHaveTextContent(/Faturada: total R\$\s*860,00/);
    expect(botaoLaranja()).toHaveTextContent("Pronto");
  });

  it("WhatsApp não abriu (telefone sem DDD): o erro aparece no passo e a OS não anda", async () => {
    listarArquivosDasOrdens.mockResolvedValue([nota("nfe"), nota("nfse")]);
    abrirConversaWhatsapp.mockRejectedValue(new Error("Telefone sem DDD"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = montar(ordem("faturada"), {
      avisoCarroPronto: { telefone: "9999", texto: "x", aoAbrir: vi.fn() },
    });
    await within(trilha()).findByText(/Passo 4 de 4/);
    await user.click(botaoLaranja());
    expect(await screen.findByText("Telefone sem DDD")).toBeInTheDocument();
    expect(within(trilha()).getByText(/Passo 4 de 4/)).toBeInTheDocument();
  });

  it("fechar e abrir de novo: a OS já avisada abre no resumo (pronto), sem pedir nada de novo", async () => {
    listarArquivosDasOrdens.mockResolvedValue([nota("nfe"), nota("nfse")]);
    quandoAvisouCarroPronto.mockResolvedValue("2026-09-02T15:00:00.000Z");
    const { user, onCancelar } = montar(ordem("faturada"));
    expect(await within(trilha()).findByText(/Tudo feito/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resumo do fechamento" })).toHaveTextContent(/Cliente avisado em/);
    await user.click(botaoLaranja());
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("sem como avisar (sem o módulo Clientes): o passo termina no 'Concluir'", async () => {
    listarArquivosDasOrdens.mockResolvedValue([nota("nfe"), nota("nfse")]);
    const { user } = montar(ordem("faturada"));
    await within(trilha()).findByText(/Passo 4 de 4/);
    expect(botaoLaranja()).toHaveTextContent("Concluir");
    await user.click(botaoLaranja());
    expect(await within(trilha()).findByText(/Tudo feito/)).toBeInTheDocument();
  });

  it("clicar num passo feito mostra ele; 'Voltar pro passo atual' volta", async () => {
    const { user } = montar(ordem("faturada"));
    await within(trilha()).findByText(/Passo 3 de 4/);
    await user.click(within(trilha()).getByRole("button", { name: /Conferir peças e serviços.*voltar/ }));
    // Os Detalhes (os itens), sem o botão do passo: ele é do passo atual.
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Emitir NFC-e" })).toBeNull();
    await user.click(within(trilha()).getByRole("button", { name: /Voltar pro passo atual/ }));
    await waitFor(() => expect(botaoLaranja()).toHaveTextContent("Emitir NFC-e"));
  });

  // Achado da revisão: a OS faturada nascia com o passo "nota" (as notas
  // ainda não tinham chegado) e, quando chegavam, a troca de passo jogava pra
  // fora dos Detalhes quem tinha aberto a OS por "Abrir a OS".
  it("aberta em Detalhes, a OS já fechada continua nos Detalhes quando as notas chegam", async () => {
    listarArquivosDasOrdens.mockResolvedValue([nota("nfe"), nota("nfse")]);
    quandoAvisouCarroPronto.mockResolvedValue("2026-09-02T15:00:00.000Z");
    montar(ordem("faturada"), { abaInicial: "detalhes" });
    // Nem por um instante o passo errado com o botão dele.
    expect(screen.queryByRole("button", { name: "Emitir NFC-e" })).toBeNull();
    expect(await within(trilha()).findByText(/Tudo feito/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Resumo do fechamento" })).toBeNull();
  });

  // Achado da revisão: na aba Fechamento de antes, a OS concluída já deixava
  // emitir a nota e ver a garantia antes de receber. Continua dando.
  it("concluída: dá pra adiantar a nota e a garantia, discretas, antes de receber", async () => {
    montar(ordem("concluida"));
    expect(await screen.findByRole("button", { name: "Emitir NFC-e" })).not.toHaveClass("bg-acao");
    expect(screen.getByRole("button", { name: "Emitir NFS-e" }).className).not.toMatch(/bg-acao/);
    expect(screen.getByRole("button", { name: "Ver garantia" })).toBeInTheDocument();
    expect(botaoLaranja()).toHaveTextContent(/^Receber/);
  });

  // Achado da revisão: abrir outra OS na mesma tela (busca do Ctrl+K) levava
  // junto o "concluído sem avisar" da anterior.
  it("outra OS aberta na mesma tela não herda o 'Concluir' da anterior", async () => {
    listarArquivosDasOrdens.mockResolvedValue([nota("nfe"), nota("nfse")]);
    const { user, rerender } = montar(ordem("faturada"));
    await within(trilha()).findByText(/Passo 4 de 4/);
    await user.click(botaoLaranja());
    expect(await within(trilha()).findByText(/Tudo feito/)).toBeInTheDocument();

    const outra = { ...ordem("faturada"), id: "os-2", numero: 13 } as OrdemServico;
    rerender(
      <OrdemServicoForm
        ordemExistente={outra}
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
        onSalvarEdicao={vi.fn().mockResolvedValue(undefined)}
        onEditarItem={vi.fn().mockResolvedValue(undefined)}
        onEncerrar={vi.fn()}
        onCadastrarCliente={vi.fn()}
        onCadastrarVeiculo={vi.fn()}
        onCancelar={vi.fn()}
      />,
    );
    expect(await within(trilha()).findByText(/Passo 4 de 4/)).toBeInTheDocument();
  });

  it("orçamento não tem trilha", () => {
    montar(ordem("orcamento"), { modoOrcamento: true });
    expect(screen.queryByRole("region", { name: "Fechar a OS" })).toBeNull();
  });
});
