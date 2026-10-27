// @vitest-environment jsdom
/**
 * Teste de TELA da venda de balcão (item FN-09), no mesmo padrão dos
 * formulários que mexem em dinheiro (item TR-07.2). Cada teste guarda uma
 * promessa da tela, não um detalhe de implementação:
 *   • o leitor de código de barras põe a peça, e passar de novo soma;
 *   • com várias peças parecidas, o Enter não chuta uma;
 *   • o que chega no `onRegistrar` é o que a pessoa viu (Consumidor, peças,
 *     total, pagamento);
 *   • venda no Consumidor não oferece "a receber depois";
 *   • as peças ficam travadas enquanto o pagamento está aberto.
 */
import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { ReactNode } from "react";
import { useEnterParaProximoCampo } from "@/hooks/useEnterParaProximoCampo";
import { renderizar, screen, within } from "@/testes/tela";
import { VendaBalcaoForm } from "./VendaBalcaoForm";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { Cliente } from "@/types/cliente";
import type { PecaJanela } from "@/types/peca";

const pecas = [
  {
    id: "palheta",
    descricao: 'Palheta 20"',
    codigo_interno: "PAL20",
    codigo_barras: "7891234567890",
    marca: "Bosch",
    preco_venda: 35,
    preco_custo: 18,
  },
  {
    id: "palheta-22",
    descricao: 'Palheta 22"',
    codigo_interno: "PAL22",
    codigo_barras: "7891234567891",
    marca: "Bosch",
    preco_venda: 38,
    preco_custo: 19,
  },
  {
    id: "bateria",
    descricao: "Bateria 60Ah",
    codigo_interno: "BAT60",
    codigo_barras: "7890000000001",
    marca: "Moura",
    preco_venda: 520,
    preco_custo: 390,
  },
].map((p) => ({ modelo: null, medida: null, ativo: true, ...p }) as unknown as PecaJanela);

const clientes = [
  { id: "cliente-1", nome: "Ana Souza", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09", veiculos: [] },
] as unknown as Cliente[];

const CLIENTES_JANELA_ANA = { id: "cliente-1", nome: "Ana Souza", tipo_pessoa: "fisica", cpf_cnpj: null, veiculos: [] };

function montar(sobrescrever: Partial<Parameters<typeof VendaBalcaoForm>[0]> = {}) {
  const onRegistrar = vi.fn().mockResolvedValue(undefined);
  const tela = renderizar(
    <VendaBalcaoForm
      clientes={clientes}
      pecas={pecas}
      funcionarios={[{ id: "func-1", nome: "Carlos", cargo: null, operador_id: "op-1", loja_id: "l", ativo: true }]}
      funcionarioAtualId="func-1"
      saldoPorPeca={new Map([["palheta", 10], ["bateria", 0]])}
      saldoCarregado
      jurosParcelas={[]}
      onRegistrar={onRegistrar}
      onCadastrarCliente={vi.fn()}
      onCancelar={vi.fn()}
      {...sobrescrever}
    />,
  );
  const busca = screen.getByPlaceholderText(/Código de barras/);
  return { ...tela, onRegistrar, busca };
}

/** O app de verdade liga o "Enter pula de campo" pra tela inteira (App.tsx). */
function ComAtalhoDoEnter({ children }: { children: ReactNode }) {
  useEnterParaProximoCampo();
  return <>{children}</>;
}

function linhas() {
  return screen.queryAllByRole("row").slice(1); // tira o cabeçalho
}

describe("VendaBalcaoForm", () => {
  it("o leitor põe a peça pelo código de barras, e passar de novo soma na mesma linha", async () => {
    const { user, busca } = montar();
    expect(busca).toHaveFocus();

    await user.type(busca, "7891234567890{Enter}");
    expect(linhas()).toHaveLength(1);
    expect(screen.getByLabelText(/Quantidade de Palheta 20/)).toHaveValue(1);
    expect(busca).toHaveValue("");
    expect(busca).toHaveFocus();

    await user.type(busca, "7891234567890{Enter}");
    expect(linhas()).toHaveLength(1);
    expect(screen.getByLabelText(/Quantidade de Palheta 20/)).toHaveValue(2);
    expect(screen.getByText("Total R$ 70,00")).toBeInTheDocument();
  });

  it("com o atalho global do Enter ligado, o leitor continua na busca pra próxima peça", async () => {
    // Sem segurar o Enter, o atalho do app (Enter pula de campo) levaria o
    // foco pra quantidade, e a segunda peça passada no leitor cairia lá.
    //
    // O atalho só considera campo VISÍVEL (`offsetParent !== null`), e o
    // jsdom não calcula layout — pra ele todo campo é invisível, e o atalho
    // nunca faria nada, deixando este teste verde por engano. Por isso o
    // `offsetParent` é simulado aqui, só neste teste.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return this.parentNode;
      },
    });
    onTestFinished(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, "offsetParent", original);
    });

    const { user } = renderizar(
      <ComAtalhoDoEnter>
        <VendaBalcaoForm
          clientes={clientes}
          pecas={pecas}
          funcionarios={[]}
          funcionarioAtualId=""
          saldoPorPeca={new Map()}
          saldoCarregado={false}
          jurosParcelas={[]}
          onRegistrar={vi.fn()}
          onCadastrarCliente={vi.fn()}
          onCancelar={vi.fn()}
        />
      </ComAtalhoDoEnter>,
    );
    const busca = screen.getByPlaceholderText(/Código de barras/);
    await user.type(busca, "BAT60{Enter}7891234567890{Enter}");
    expect(busca).toHaveFocus();
    expect(linhas()).toHaveLength(2);
  });

  it("com várias peças parecidas, o Enter não chuta: mostra a lista pra escolher", async () => {
    const { user, busca } = montar();
    await user.type(busca, "palheta{Enter}");

    expect(linhas()).toHaveLength(0);
    expect(screen.getByText(/Mais de uma peça parecida/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Palheta 22"/ }));
    expect(screen.getByLabelText(/Quantidade de Palheta 22/)).toHaveValue(1);
  });

  it("avisa quando a venda deixa o estoque negativo, sem impedir", async () => {
    const { user, busca } = montar();
    await user.type(busca, "BAT60{Enter}");
    expect(screen.getByText(/o estoque fica negativo em 1/)).toBeInTheDocument();
  });

  it("não vai pro pagamento sem peça nenhuma", async () => {
    const { user, onRegistrar } = montar();
    await user.click(screen.getByRole("button", { name: "Ir para o pagamento" }));
    expect(screen.getByText(/Passe o leitor ou procure uma peça pra começar/)).toBeInTheDocument();
    expect(screen.queryByText("Confirmar venda")).not.toBeInTheDocument();
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it("no Consumidor, registra com o que a pessoa viu e não oferece 'a receber depois'", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user, busca, onRegistrar } = montar();
    await user.type(busca, "7891234567890{Enter}7891234567890{Enter}BAT60{Enter}");
    await user.click(screen.getByRole("button", { name: "Ir para o pagamento" }));

    expect(screen.queryByText("A receber depois")).not.toBeInTheDocument();
    expect(screen.getByText(/Venda no Consumidor é recebida na hora/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar venda" }));

    expect(onRegistrar).toHaveBeenCalledTimes(1);
    const [venda, itens, pagamento] = onRegistrar.mock.calls[0];
    expect(venda).toEqual({ cliente_id: CLIENTE_CONSUMIDOR_ID, vendedor_id: "func-1" });
    expect(itens.map((i: { peca_id: string; quantidade: number; tipo: string }) => [i.peca_id, i.quantidade, i.tipo])).toEqual([
      ["palheta", 2, "peca"],
      ["bateria", 1, "peca"],
    ]);
    expect(pagamento).toEqual({
      pagamentos: [{ formaPagamento: "pix", valor: 590 }],
      parcelas: 1,
      previsaoRecebimento: null,
    });
  });

  it("sem o módulo Clientes não afirma que o cliente está sem CPF (o CPF só não chega pela janela)", async () => {
    // Migration 0068: pela janela vem só o nome, então `cpf_cnpj` chega null
    // mesmo quando o cadastro tem CPF — e a nota o busca na hora de emitir.
    const { user } = montar({
      podeVerCadastro: false,
      clientes: [{ ...CLIENTES_JANELA_ANA }] as never,
    });
    await user.click(screen.getByDisplayValue(/Consumidor/));
    await user.click(screen.getByRole("button", { name: "Ana Souza" }));
    expect(screen.getByText("A nota sai no CPF/CNPJ do cadastro dele, se tiver.")).toBeInTheDocument();
    expect(screen.queryByText(/está sem CPF\/CNPJ no cadastro/)).not.toBeInTheDocument();
  });

  it("com cliente de verdade, 'a receber depois' volta a existir", async () => {
    const { user, busca } = montar();
    await user.click(screen.getByDisplayValue(/Consumidor/));
    await user.click(screen.getByRole("button", { name: "Ana Souza" }));
    expect(screen.getByText("A nota sai no CPF dele.")).toBeInTheDocument();

    await user.type(busca, "BAT60{Enter}");
    await user.click(screen.getByRole("button", { name: "Ir para o pagamento" }));
    expect(screen.getByText("A receber depois")).toBeInTheDocument();
  });

  it("com o pagamento aberto as peças travam, e 'Mudar as peças' destrava", async () => {
    const { user, busca } = montar();
    await user.type(busca, "BAT60{Enter}");
    await user.click(screen.getByRole("button", { name: "Ir para o pagamento" }));

    expect(screen.getByLabelText(/Quantidade de Bateria/)).toBeDisabled();
    expect(busca).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Mudar as peças" }));
    expect(screen.getByLabelText(/Quantidade de Bateria/)).toBeEnabled();
    expect(screen.queryByText("Confirmar venda")).not.toBeInTheDocument();
  });

  it("tirar a peça da venda tira a linha e o valor", async () => {
    const { user, busca } = montar();
    await user.type(busca, "BAT60{Enter}");
    const linha = linhas()[0];
    await user.click(within(linha).getByRole("button", { name: /Tirar Bateria/ }));
    expect(linhas()).toHaveLength(0);
    expect(screen.getByText("Total R$ 0,00")).toBeInTheDocument();
  });
});
