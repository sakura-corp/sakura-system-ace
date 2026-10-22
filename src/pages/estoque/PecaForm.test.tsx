// @vitest-environment jsdom
/**
 * Teste de TELA do cadastro de produto (item TR-07.2 do guia).
 *
 * O que este formulário tem de especial: três campos que se recalculam entre
 * si — custo, margem % e preço final. As contas em si são funções puras já
 * testadas (`precoAPartirDaMargem`/`margemAPartirDoPreco` em `schemas/peca.ts`);
 * o que NÃO estava coberto é a ligação, que aqui não dá pra fazer só com
 * `register` (é `watch` + `setValue` dentro de um `onChange` customizado, ver
 * seção 4 do PROJETO_STATUS). Uma ligação trocada faria o preço de venda ir
 * pro banco calculado em cima do campo errado, sem nada na tela denunciando.
 *
 * Os outros dois testes guardam avisos que existem justamente porque o erro
 * deles é silencioso: preço abaixo do custo (só vira prejuízo repetido) e o
 * CST/CSOSN pré-preenchido com o código que a loja usa (item 47 da seção 6 —
 * o código errado só aparece semanas depois, numa nota recusada).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import { PecaForm } from "./PecaForm";
import type { Categoria } from "@/types/categoria";
import type { Peca } from "@/types/peca";

beforeEach(() => localStorage.clear());

const categorias: Categoria[] = [
  { id: "cat-1", nome: "Pneus", criado_em: "2026-01-01T00:00:00.000Z" },
  { id: "cat-2", nome: "Freios", criado_em: "2026-01-01T00:00:00.000Z" },
];

function montar(
  opcoes: {
    csosnSugerido?: string | null;
    pecasDoCadastro?: Peca[];
    pecaExistente?: Peca;
  } = {},
) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const onAbrirExistente = vi.fn();
  const resultado = renderizar(
    <PecaForm
      pecaExistente={opcoes.pecaExistente}
      pecasDoCadastro={opcoes.pecasDoCadastro}
      onAbrirExistente={onAbrirExistente}
      categorias={categorias}
      regime="simples_nacional"
      csosnSugerido={opcoes.csosnSugerido ?? null}
      onSalvar={onSalvar}
      onCancelar={vi.fn()}
    />,
  );
  return { ...resultado, onSalvar, onAbrirExistente };
}

/**
 * Consulta por rótulo, sempre EXATA. O "?" que explica cada campo fiscal é um
 * <button> com `aria-label="O que é CST / CSOSN?"`, então uma consulta por
 * expressão regular acharia dois elementos com o mesmo texto. E campo
 * obrigatório carrega o asterisco no próprio rótulo ("Descrição *").
 */
const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: true }) as HTMLInputElement;

describe("PecaForm — custo, margem e preço se recalculam entre si", () => {
  it("digitar custo e margem calcula o preço final", async () => {
    const { user } = montar();

    await user.type(campo("Aquisição (custo)"), "100");
    await user.type(campo("Margem %"), "50");

    expect(campo("Preço final")).toHaveValue(150);
  });

  it("digitar o preço final calcula a margem de volta", async () => {
    // O caminho inverso, que é o que a pessoa usa quando já sabe por quanto
    // quer vender e só quer saber quanto está ganhando.
    const { user } = montar();

    await user.type(campo("Aquisição (custo)"), "200");
    await user.clear(campo("Margem %"));
    await user.type(campo("Preço final"), "250");

    expect(campo("Margem %")).toHaveValue(25);
  });

  it("mexer no custo depois recalcula o preço, mantendo a margem escolhida", async () => {
    // O caso que mais acontece de verdade: o fornecedor subiu o preço, e a
    // loja quer manter a mesma margem.
    const { user } = montar();

    await user.type(campo("Aquisição (custo)"), "100");
    await user.type(campo("Margem %"), "20");
    expect(campo("Preço final")).toHaveValue(120);

    await user.clear(campo("Aquisição (custo)"));
    await user.type(campo("Aquisição (custo)"), "150");

    expect(campo("Margem %")).toHaveValue(20);
    expect(campo("Preço final")).toHaveValue(180);
  });
});

/**
 * Preenche o mínimo que o formulário exige pra salvar. Vale registrar o que
 * essa lista revela: são SEIS campos obrigatórios, e cinco deles são fiscais
 * (NCM, C.E.S.T, CFOP, origem e CST/CSOSN). Cadastrar uma peça neste sistema
 * é, na maior parte, preencher documento fiscal — o que explica por que o
 * item TL-12 do guia foi sobre explicar cada um desses campos.
 */
async function preencherObrigatorios(
  user: ReturnType<typeof montar>["user"],
  descricao: string,
) {
  await user.type(campo("Descrição *"), descricao);
  await user.type(campo("NCM *"), "40111000");
  await user.type(campo("C.E.S.T *"), "0100100");
  await user.type(campo("CFOP padrão *"), "5102");
  await user.selectOptions(screen.getByLabelText("Origem *"), "0");
  await user.type(campo("CST / CSOSN *"), "500");
}

describe("PecaForm — os avisos que não travam", () => {
  it("avisa quando o preço final fica abaixo do custo — e deixa salvar assim mesmo", async () => {
    // Vender abaixo do custo existe de verdade (queima de estoque parado),
    // então barrar seria decidir pelo dono da loja. O aviso é pra pegar o
    // dígito faltando, que é o caso comum.
    const { user, onSalvar } = montar();

    await preencherObrigatorios(user, "PNEU 175/70 R14");
    await user.type(campo("Aquisição (custo)"), "200");
    await user.clear(campo("Margem %"));
    await user.type(campo("Preço final"), "80");

    expect(screen.getByText(/abaixo do custo/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Salvar/ }));
    expect(onSalvar).toHaveBeenCalledTimes(1);
  });

  it("não avisa nada quando o preço está acima do custo", async () => {
    const { user } = montar();

    await user.type(campo("Aquisição (custo)"), "100");
    await user.type(campo("Margem %"), "30");

    expect(screen.queryByText(/abaixo do custo/)).not.toBeInTheDocument();
  });
});

describe("PecaForm — o código de ICMS não nasce em branco", () => {
  it("peça nova já vem com o CSOSN que a própria loja mais usa", async () => {
    // É a correção do item 47: a sugestão existia só na importação de XML, ou
    // seja, faltava justo no caminho mais usado — o cadastro à mão.
    montar({ csosnSugerido: "500" });

    expect(campo("CST / CSOSN *")).toHaveValue("500");
  });

  it("sem regime configurado na loja, o campo fica em branco em vez de chutar um código", async () => {
    montar({ csosnSugerido: null });

    expect(campo("CST / CSOSN *")).toHaveValue("");
  });
});

describe("PecaForm — validação", () => {
  it("não salva sem descrição", async () => {
    const { user, onSalvar } = montar();

    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    expect(await screen.findByText("Descrição é obrigatória")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("a quantidade inicial em branco vira nulo, não zero", async () => {
    // Zero é um saldo de verdade; "não informado" é outra coisa. Confundir os
    // dois cria movimentação de estoque fantasma no cadastro da peça.
    const { user, onSalvar } = montar();

    await preencherObrigatorios(user, "PASTILHA DE FREIO");
    await user.click(screen.getByRole("button", { name: /^Salvar/ }));

    expect(onSalvar).toHaveBeenCalledTimes(1);
    const [, quantidadeInicial] = onSalvar.mock.calls[0];
    expect(quantidadeInicial).toBeNull();
  });
});

/**
 * O aviso de peça parecida: só ao cadastrar peça NOVA, e nunca tranca (item 33
 * do docs/licoes.md). A regra de "o que é parecido" é testada à parte, em
 * `schemas/pecaParecida.test.ts`; aqui se confere a tela.
 */
function umaPeca(extra: Partial<Peca>): Peca {
  return {
    id: "p-1",
    codigo_interno: null,
    codigo_barras: null,
    descricao: "PNEU 175/70 R13 PIRELLI",
    marca: null,
    modelo: null,
    aplicacao: null,
    unidade: "UN",
    preco_custo: null,
    preco_venda: null,
    ncm: "40111000",
    cest: "0100100",
    cfop_padrao: "5102",
    origem: "0",
    cst_ou_csosn: "500",
    aliquota_icms: null,
    categoria_id: null,
    prazo_garantia_dias: null,
    estoque_minimo: null,
    medida: null,
    indice_carga_velocidade: null,
    dot: null,
    ativo: true,
    criado_em: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

const salvar = () => screen.getByRole("button", { name: /^Salvar/ });

describe("PecaForm — aviso de peça parecida", () => {
  const cadastrada = umaPeca({});

  it("peça nova repetida mostra o aviso e ainda não grava", async () => {
    const { user, onSalvar } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.click(salvar());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/É a mesma\?/)).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("'Cadastrar mesmo assim' grava a peça digitada", async () => {
    const { user, onSalvar } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.click(salvar());
    await user.click(await screen.findByRole("button", { name: "Cadastrar mesmo assim" }));

    expect(onSalvar).toHaveBeenCalledTimes(1);
    expect(onSalvar.mock.calls[0][0].descricao).toBe("Pneu 175/70 R13 Pirelli");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Cadastrar mesmo assim' leva junto a quantidade inicial digitada", async () => {
    // O aviso guarda o que foi digitado e grava depois: perder a quantidade
    // aqui criaria a peça com estoque zero sem ninguém perceber.
    const { user, onSalvar } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.type(campo("Qtde. estoque inicial"), "4");
    await user.click(salvar());
    await user.click(await screen.findByRole("button", { name: "Cadastrar mesmo assim" }));

    expect(onSalvar.mock.calls[0][1]).toBe(4);
  });

  it("o aviso fica fora do <form>, senão o card do formulário prende a janela", async () => {
    // Renderizado, o fundo do aviso cobria só o card do formulário (que é a
    // "moldura" de position:fixed dentro dele) e não a janela inteira.
    const { user } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.click(salvar());

    expect((await screen.findByRole("dialog")).closest("form")).toBeNull();
  });

  it("enquanto grava pelo 'Cadastrar mesmo assim', não dá pra abrir outra peça", async () => {
    // Abrir a outra no meio da gravação trocaria o formulário, e o fim da
    // gravação fecharia em seguida a peça que acabou de ser aberta.
    const { user, onSalvar } = montar({ pecasDoCadastro: [cadastrada] });
    onSalvar.mockReturnValue(new Promise(() => {}));

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.click(salvar());
    await user.click(await screen.findByRole("button", { name: "Cadastrar mesmo assim" }));

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir a que já existe" })).toBeDisabled();
  });

  it("'Abrir a que já existe' chama a abertura da peça do cadastro, sem gravar", async () => {
    const { user, onSalvar, onAbrirExistente } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.click(salvar());
    await user.click(await screen.findByRole("button", { name: "Abrir a que já existe" }));

    expect(onAbrirExistente).toHaveBeenCalledWith(cadastrada);
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("fechar o aviso volta pro formulário sem gravar e sem perder o que foi digitado", async () => {
    const { user, onSalvar } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "Pneu 175/70 R13 Pirelli");
    await user.click(salvar());
    await user.click(await screen.findByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(campo("Descrição *")).toHaveValue("Pneu 175/70 R13 Pirelli");
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("editar peça que já existe nunca mostra o aviso", async () => {
    // A própria peça está no cadastro e é igual ao que está na tela: se o
    // aviso valesse na edição, ninguém conseguiria salvar uma alteração.
    const { user, onSalvar } = montar({
      pecasDoCadastro: [cadastrada],
      pecaExistente: cadastrada,
    });

    await user.click(salvar());

    await waitFor(() => expect(onSalvar).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("R14 não é parecido com R13: salva direto", async () => {
    const { user, onSalvar } = montar({ pecasDoCadastro: [cadastrada] });

    await preencherObrigatorios(user, "PNEU 175/70 R14 PIRELLI");
    await user.click(salvar());

    expect(onSalvar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mesmo código de barras com nome diferente também avisa", async () => {
    const { user, onSalvar } = montar({
      pecasDoCadastro: [umaPeca({ descricao: "AMORTECEDOR DIANTEIRO", codigo_barras: "7891234567895" })],
    });

    await preencherObrigatorios(user, "PASTILHA DE FREIO");
    await user.type(campo("Código de barras"), "7891234567895");
    await user.click(salvar());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/mesmo código de barras/)).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
