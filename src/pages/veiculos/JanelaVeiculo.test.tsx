// @vitest-environment jsdom
/**
 * A janela própria do veículo (#1096): placa primeiro, marca → modelo → ano
 * em lista (sempre aceitando texto livre), o tipo vindo do modelo e a cor em
 * bolinhas, com a prévia do carro respondendo a cada escolha.
 *
 * A janela não fala com o banco: devolve o veículo pelo `aoSalvar`, no mesmo
 * formato do formulário do cliente (`VeiculoFormValues`, tudo texto). Quem
 * grava é o "Salvar cliente", como sempre foi.
 */
import { describe, expect, it, vi } from "vitest";
import { veiculoFormVazio, type VeiculoFormValues } from "@/schemas/cliente";
import { renderizar, screen, within } from "@/testes/tela";
import { JanelaVeiculo } from "./JanelaVeiculo";

const TIPOS_DO_BANCO = ["hatch", "sedan", "suv", "picape", "moto"];

function montar(inicial: VeiculoFormValues = veiculoFormVazio) {
  const aoSalvar = vi.fn();
  const aoCancelar = vi.fn();
  const resultado = renderizar(
    <JanelaVeiculo inicial={inicial} aoSalvar={aoSalvar} aoCancelar={aoCancelar} />,
  );
  return { ...resultado, aoSalvar, aoCancelar };
}

type Usuario = ReturnType<typeof montar>["user"];

/** Os campos de lista são `Combobox`: abrem ao focar e mostram as opções como botões. */
async function abrir(user: Usuario, rotulo: string) {
  const campo = screen.getByRole("combobox", { name: rotulo });
  await user.click(campo);
  return campo;
}

async function escolher(user: Usuario, rotulo: string, opcao: string) {
  const campo = await abrir(user, rotulo);
  await user.clear(campo);
  await user.type(campo, opcao);
  await user.click(screen.getByRole("button", { name: opcao }));
}

/** Digita sem escolher da lista e sai do campo: o texto livre vira o valor. */
async function digitarLivre(user: Usuario, rotulo: string, texto: string) {
  const campo = await abrir(user, rotulo);
  await user.clear(campo);
  await user.type(campo, texto);
  await user.tab();
}

const salvar = (user: Usuario) => user.click(screen.getByRole("button", { name: "Salvar veículo" }));

const opcoesAbertas = () =>
  screen
    .getAllByRole("button")
    .map((botao) => botao.textContent ?? "")
    .filter(Boolean);

describe("JanelaVeiculo — marca → modelo → ano → tipo", () => {
  it("escolher a marca filtra os modelos: só os da marca aparecem", async () => {
    const { user } = montar();

    await escolher(user, "Marca", "Fiat");
    await abrir(user, "Modelo");

    const opcoes = opcoesAbertas();
    expect(opcoes).toContain("Uno");
    expect(opcoes).toContain("Strada");
    expect(opcoes).not.toContain("Gol");
    expect(opcoes).not.toContain("Onix");
  });

  it("o modelo filtra os anos e escolhe o tipo sozinho", async () => {
    const { user, aoSalvar } = montar();

    await escolher(user, "Marca", "Fiat");
    await escolher(user, "Modelo", "Strada");

    // O tipo veio do modelo: a picape ficou marcada, sem ninguém clicar.
    expect(screen.getByRole("radio", { name: "Picape" })).toBeChecked();

    await abrir(user, "Ano");
    const anos = opcoesAbertas().filter((texto) => /^\d{4}$/.test(texto)).map(Number);
    expect(anos.length).toBeGreaterThan(5);
    // Do mais novo pro mais velho, e nenhum antes de a Strada existir (1998).
    expect([...anos].sort((a, b) => b - a)).toEqual(anos);
    expect(Math.min(...anos)).toBeGreaterThanOrEqual(1998);

    await user.click(screen.getByRole("button", { name: "2015" }));
    await salvar(user);

    expect(aoSalvar).toHaveBeenCalledTimes(1);
    expect(aoSalvar.mock.calls[0][0]).toMatchObject({
      marca: "Fiat",
      modelo: "Strada",
      ano: "2015",
      tipo: "picape",
    });
  });

  it("clicar em outro desenho troca o tipo que veio do modelo", async () => {
    const { user, aoSalvar } = montar();

    await escolher(user, "Marca", "Fiat");
    await escolher(user, "Modelo", "Strada");
    await user.click(screen.getByRole("radio", { name: "SUV" }));
    await salvar(user);

    expect(aoSalvar.mock.calls[0][0].tipo).toBe("suv");
  });

  it("texto livre continua aceito em marca, modelo e ano", async () => {
    const { user, aoSalvar } = montar();

    await digitarLivre(user, "Marca", "Gurgel");
    await abrir(user, "Modelo");
    // Marca fora da lista: nenhum modelo pra sugerir, mas dá pra digitar.
    expect(opcoesAbertas()).not.toContain("Uno");
    await digitarLivre(user, "Modelo", "BR-800");
    await digitarLivre(user, "Ano", "1990");
    await user.click(screen.getByRole("radio", { name: "Hatch" }));
    await salvar(user);

    expect(aoSalvar.mock.calls[0][0]).toMatchObject({
      marca: "Gurgel",
      modelo: "BR-800",
      ano: "1990",
      tipo: "hatch",
    });
  });

  it("o ano só aceita número (no máximo 4 algarismos)", async () => {
    const { user, aoSalvar } = montar();

    await digitarLivre(user, "Ano", "20a15x");
    await salvar(user);

    expect(aoSalvar.mock.calls[0][0].ano).toBe("2015");
  });
});

describe("JanelaVeiculo — o tipo salvo é sempre um dos 5 que o banco aceita", () => {
  it("cada desenho clicável salva um dos 5 tipos, e só eles existem", async () => {
    const { user, aoSalvar } = montar();

    const radios = screen.getAllByRole("radio").filter((r) => r.getAttribute("name")?.endsWith("tipo"));
    expect(radios).toHaveLength(5);

    for (const radio of radios) {
      await user.click(radio);
      await salvar(user);
    }
    const salvos = aoSalvar.mock.calls.map(([valores]) => valores.tipo);
    expect(salvos).toHaveLength(5);
    expect(new Set(salvos)).toEqual(new Set(TIPOS_DO_BANCO));
  });

  it("um tipo que o banco não aceita (vindo de fora) sai vazio, nunca do jeito que veio", async () => {
    const { user, aoSalvar } = montar({ ...veiculoFormVazio, placa: "ABC1D23", tipo: "caminhao" });

    await salvar(user);

    expect(aoSalvar.mock.calls[0][0].tipo).toBe("");
  });
});

describe("JanelaVeiculo — veículo já cadastrado", () => {
  it("abre e salva sem perder nada, mesmo com modelo, cor e placa em texto solto", async () => {
    const antigo: VeiculoFormValues = {
      id: "veiculo-antigo",
      placa: "ABC-1234",
      marca: "Ford",
      modelo: "Ka Sport 1.0 flex (o do seu Zé)",
      ano: "2009",
      cor: "Prata metálico",
      tipo: "hatch",
      km_atual: "150000",
    };
    const { user, aoSalvar } = montar(antigo);

    expect(screen.getByRole("heading", { name: "Editar veículo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Placa")).toHaveValue("ABC-1234");
    // A cor fora das bolinhas fica em "Outra", com o texto do jeito que estava.
    expect(screen.getByRole("radio", { name: "Outra" })).toBeChecked();
    expect(screen.getByLabelText("Qual cor?")).toHaveValue("Prata metálico");

    await salvar(user);

    expect(aoSalvar).toHaveBeenCalledTimes(1);
    expect(aoSalvar.mock.calls[0][0]).toEqual(antigo);
  });

  it("marca de fora da lista, sem ano e sem tipo, também volta igual", async () => {
    const antigo: VeiculoFormValues = {
      id: "veiculo-2",
      placa: "",
      marca: "Gurgel",
      modelo: "Tocantins",
      ano: "",
      cor: "",
      tipo: "",
      km_atual: "",
    };
    const { user, aoSalvar } = montar(antigo);

    await salvar(user);

    expect(aoSalvar.mock.calls[0][0]).toEqual(antigo);
  });
});

describe("JanelaVeiculo — placa, cor e a prévia", () => {
  it("a placa vem primeiro, com o foco, e sobe em maiúsculas sem traço nem espaço", async () => {
    const { user, aoSalvar } = montar();

    const placa = screen.getByLabelText("Placa");
    expect(placa).toHaveFocus();
    await user.type(placa, "abc-1d 23");
    expect(placa).toHaveValue("ABC1D23");

    await salvar(user);
    expect(aoSalvar.mock.calls[0][0].placa).toBe("ABC1D23");
  });

  it("placa fora do padrão só avisa, e salva assim mesmo", async () => {
    const { user, aoSalvar } = montar();

    await user.type(screen.getByLabelText("Placa"), "AB12");
    expect(screen.getByText(/3 letras/)).toBeInTheDocument();

    await salvar(user);
    expect(aoSalvar.mock.calls[0][0].placa).toBe("AB12");
  });

  it("escolher a bolinha vermelha pinta a prévia de vermelho e salva o nome da cor", async () => {
    const { user, aoSalvar } = montar();

    await user.click(screen.getByRole("radio", { name: "Vermelho" }));

    const previa = screen.getByRole("figure", { name: "Como o carro aparece no pátio" });
    expect(within(previa).getByRole("img")).toHaveAccessibleName(/vermelho/i);

    await salvar(user);
    expect(aoSalvar.mock.calls[0][0].cor).toBe("Vermelho");
  });

  it("\"Outra\" cor: o texto digitado é o que salva", async () => {
    const { user, aoSalvar } = montar();

    await user.click(screen.getByRole("radio", { name: "Outra" }));
    await user.type(screen.getByLabelText("Qual cor?"), "Azul Netuno");
    await salvar(user);

    expect(aoSalvar.mock.calls[0][0].cor).toBe("Azul Netuno");
  });

  it("passar por uma bolinha e voltar pra \"Outra\" não apaga a cor que estava escrita", async () => {
    const { user, aoSalvar } = montar({ ...veiculoFormVazio, placa: "ABC1D23", cor: "Prata metálico" });

    await user.click(screen.getByRole("radio", { name: "Vinho" }));
    await user.click(screen.getByRole("radio", { name: "Outra" }));
    expect(screen.getByLabelText("Qual cor?")).toHaveValue("Prata metálico");

    await salvar(user);
    expect(aoSalvar.mock.calls[0][0].cor).toBe("Prata metálico");
  });

  it("o KM aceita no máximo 7 algarismos (o banco guarda até uns 2 bilhões)", async () => {
    const { user, aoSalvar } = montar();

    await user.type(screen.getByLabelText("KM atual"), "123456789012");
    await salvar(user);

    expect(aoSalvar.mock.calls[0][0].km_atual).toBe("1234567");
  });

  it("modelo digitado em minúsculas vira o nome do catálogo", async () => {
    const { user, aoSalvar } = montar();

    await escolher(user, "Marca", "Fiat");
    await digitarLivre(user, "Modelo", "strada");
    await salvar(user);

    expect(aoSalvar.mock.calls[0][0]).toMatchObject({ modelo: "Strada", tipo: "picape" });
  });

  it("Cancelar fecha sem salvar", async () => {
    const { user, aoSalvar, aoCancelar } = montar();

    await user.type(screen.getByLabelText("Placa"), "ABC1D23");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(aoSalvar).not.toHaveBeenCalled();
  });
});
