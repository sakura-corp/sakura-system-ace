// @vitest-environment jsdom
/**
 * Teste de TELA do cadastro de conta a pagar (item TR-07.2 do guia).
 *
 * É o formulário mais curto dos cinco, mas carrega a decisão mais cara: marcar
 * "conta mensal recorrente" faz o sistema criar sozinho a próxima ocorrência
 * toda vez que a conta é paga, pra sempre. O campo "Recorrente até" existe
 * justamente pra dar um fim a isso (migration 0043) — e ele só aparece depois
 * de marcar o recorrente, o que é uma ligação entre dois campos que nenhum
 * teste de função pura enxerga.
 *
 * O outro teste guarda uma sutileza de `paraNovaContaPagar`: preencher o "até
 * quando" e DEPOIS desmarcar o recorrente não pode deixar a data pra trás.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import {
  contaPagarFormSchema,
  contaPagarFormVazio,
} from "@/schemas/contaPagar";
import { ContaPagarForm } from "./ContaPagarForm";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";

const categorias: CategoriaCaixa[] = [
  {
    id: "cat-1",
    nome: "Aluguel",
    tipo: "saida",
    grupo: "a_classificar",
    criado_em: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-2",
    nome: "Sucata",
    tipo: "entrada",
    grupo: "a_classificar",
    criado_em: "2026-01-01T00:00:00.000Z",
  },
];

function montar() {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const resultado = renderizar(
    <ContaPagarForm
      categorias={categorias}
      onSalvar={onSalvar}
      onCancelar={vi.fn()}
    />,
  );
  return { ...resultado, onSalvar };
}

const marcarRecorrente = (user: ReturnType<typeof montar>["user"]) =>
  user.click(screen.getByRole("checkbox", { name: /Conta mensal recorrente/ }));

async function preencherBasico(user: ReturnType<typeof montar>["user"]) {
  await user.type(screen.getByLabelText(/Descrição/), "Aluguel");
  await user.type(screen.getByLabelText(/Valor/), "2500");
  await user.type(screen.getByLabelText(/Vencimento/), "2026-10-31");
}

describe("ContaPagarForm — recorrência", () => {
  it('o "Recorrente até" só existe depois de marcar a conta como recorrente', async () => {
    const { user } = montar();
    expect(screen.queryByLabelText(/Recorrente até/)).not.toBeInTheDocument();

    await marcarRecorrente(user);

    expect(screen.getByLabelText(/Recorrente até/)).toBeInTheDocument();
    // E o campo diz o que acontece deixando em branco — sem isso, "opcional"
    // não informa que o padrão é repetir pra sempre.
    expect(screen.getByText(/sem data pra parar/)).toBeInTheDocument();
  });

  it("salva o limite escolhido quando a conta é recorrente", async () => {
    const { user, onSalvar } = montar();
    await preencherBasico(user);
    await marcarRecorrente(user);
    await user.type(screen.getByLabelText(/Recorrente até/), "2027-03-01");

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));

    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        recorrente: true,
        recorrente_ate: "2027-03-01",
      }),
    );
  });

  it("recorrente sem limite vai com o até-quando nulo, não com string vazia", async () => {
    // `recorrente_ate` é uma coluna date: "" não é uma data, e o Postgres
    // recusaria. Nulo é o que quer dizer "repete sem data pra parar".
    const { user, onSalvar } = montar();
    await preencherBasico(user);
    await marcarRecorrente(user);

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));

    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ recorrente: true, recorrente_ate: null }),
    );
  });

  it("desmarcar o recorrente descarta o limite que já tinha sido digitado", async () => {
    // O campo some da tela ao desmarcar, mas o valor continua no formulário —
    // gravar um "recorrente até" numa conta que não é recorrente deixaria um
    // dado mentindo no banco, esperando pra confundir alguém depois.
    const { user, onSalvar } = montar();
    await preencherBasico(user);
    await marcarRecorrente(user);
    await user.type(screen.getByLabelText(/Recorrente até/), "2027-03-01");
    await marcarRecorrente(user);

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));

    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ recorrente: false, recorrente_ate: null }),
    );
  });
});

describe("ContaPagarForm — o resto do formulário", () => {
  it("a categoria só oferece as de SAÍDA", async () => {
    // Conta a pagar é dinheiro saindo; oferecer "Sucata" (entrada) aqui
    // encheria o relatório por categoria de lançamento no balde errado.
    const { user } = montar();

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("button", { name: "Aluguel" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sucata" }),
    ).not.toBeInTheDocument();
  });

  it("não salva sem descrição, sem valor e sem vencimento — e diz cada motivo", async () => {
    const { user, onSalvar } = montar();

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));

    expect(
      await screen.findByText("Descrição é obrigatória."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Informe um valor maior que zero."),
    ).toBeInTheDocument();
    expect(screen.getByText("Vencimento é obrigatório.")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("não aceita valor zero", async () => {
    // Zero passaria por "preenchido" numa checagem ingênua de campo vazio, e
    // uma conta de R$ 0,00 no caixa não quer dizer nada.
    //
    // Uma descoberta deste teste, que vale saber antes de mexer no campo:
    // quem barra o zero aqui NÃO é a mensagem do zod — é o `min="0.01"` do
    // próprio `<input type="number">`. O navegador recusa o envio antes de o
    // `handleSubmit` rodar, então a frase "Informe um valor maior que zero."
    // nunca chega a aparecer na tela: o que a pessoa vê é o balãozinho nativo
    // do Chromium. As duas travas existem e concordam; a de baixo (zod) é a
    // que continua valendo se o `min` sair do HTML um dia.
    const { user, onSalvar } = montar();
    await user.type(screen.getByLabelText(/Descrição/), "Aluguel");
    await user.type(screen.getByLabelText(/Valor/), "0");
    await user.type(screen.getByLabelText(/Vencimento/), "2026-10-31");

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));

    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("e o zod também recusa o zero, mesmo sem o min do HTML", async () => {
    // A trava de baixo, testada direto: é ela que continua valendo se o
    // atributo `min` sair do campo numa mexida de estilo.
    expect(
      contaPagarFormSchema.safeParse({
        ...contaPagarFormVazio,
        descricao: "Aluguel",
        valor: "0",
        vencimento: "2026-10-31",
      }).success,
    ).toBe(false);
  });

  it("o valor chega como número, não como texto", async () => {
    const { user, onSalvar } = montar();
    await preencherBasico(user);

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));

    const [conta] = onSalvar.mock.calls[0];
    expect(conta.valor).toBe(2500);
    expect(conta.vencimento).toBe("2026-10-31");
  });
});
