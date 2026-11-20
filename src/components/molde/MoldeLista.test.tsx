// @vitest-environment jsdom
/**
 * O molde de lista do visual da leva 8 (#1085, parte 4/5 #1135): o jeito
 * único de mostrar uma lista (Clientes, Estoque, Contas, Garantias, Notas).
 *
 * O que se prova aqui: a busca em cima (com nome pro leitor de tela, Esc
 * limpa) e os filtros (`Chips`) ao lado; cada linha com o nome em cima e o
 * detalhe embaixo; os três estados que toda lista tem — vazio (frase + botão
 * pra começar), carregando (esqueleto, só depois de 0,4 s, sem a tela pular) e
 * erro (o que fazer, com "Tentar de novo") —; o vazio de uma busca que não
 * achou nada é outro ("Limpar a busca"), e não o "comece cadastrando"; e o
 * "Ver todos" no fim, quando a lista passa do limite.
 */
import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { Chips } from "../Chips";
import { LinhaDeLista } from "./LinhaDeLista";
import { MoldeLista, type PropsDoMoldeLista } from "./MoldeLista";

type Cliente = { id: string; nome: string; cidade: string };

const CLIENTES: Cliente[] = [
  { id: "1", nome: "Maria Souza", cidade: "Araraquara" },
  { id: "2", nome: "João Lima", cidade: "Matão" },
  { id: "3", nome: "Ana Prado", cidade: "Américo Brasiliense" },
];

// As props a mais de cada teste (o tipo exato, com o par filtroAtivo/aoLimparFiltros, é provado no teste de compilação).
function Lista(props: Partial<PropsDoMoldeLista<Cliente>> & { filtroAtivo?: boolean; aoLimparFiltros?: () => void }) {
  return (
    <MoldeLista<Cliente>
      rotulo="Clientes"
      estado="pronto"
      itens={CLIENTES}
      chave={(c) => c.id}
      linha={(c) => <LinhaDeLista nome={c.nome} detalhe={c.cidade} />}
      vazio={{ frase: "Nenhum cliente cadastrado ainda.", acao: { rotulo: "Cadastrar cliente", aoClicar: () => {} } }}
      {...(props as object)}
    />
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("MoldeLista: a lista pronta", () => {
  it("mostra uma linha por item, com o nome em cima e o detalhe embaixo", () => {
    renderizar(<Lista />);
    const lista = screen.getByRole("list", { name: "Clientes" });
    const linhas = within(lista).getAllByRole("listitem");
    expect(linhas).toHaveLength(3);
    expect(linhas[0]).toHaveTextContent("Maria Souza");
    expect(linhas[0]).toHaveTextContent("Araraquara");
    // O nome vem antes do detalhe na ordem de leitura.
    const texto = linhas[0].textContent ?? "";
    expect(texto.indexOf("Maria Souza")).toBeLessThan(texto.indexOf("Araraquara"));
  });

  it("não fica ocupada nem mostra erro", () => {
    renderizar(<Lista />);
    expect(screen.getByRole("list", { name: "Clientes" })).not.toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("MoldeLista: a busca e os filtros", () => {
  function ComBusca({ aoMudar }: { aoMudar?: (v: string) => void }) {
    const [texto, setTexto] = useState("");
    const [cidade, setCidade] = useState<string>("todas");
    const itens = CLIENTES.filter(
      (c) =>
        c.nome.toLowerCase().includes(texto.toLowerCase()) && (cidade === "todas" || c.cidade === cidade),
    );
    return (
      <Lista
        itens={itens}
        busca={{
          valor: texto,
          aoMudar: (v) => {
            setTexto(v);
            aoMudar?.(v);
          },
          rotulo: "Buscar cliente",
          dica: "Nome ou telefone",
        }}
        filtros={
          <Chips
            rotulo="Cidade"
            opcoes={[
              { valor: "todas", nome: "Todas" },
              { valor: "Matão", nome: "Matão" },
            ]}
            valor={cidade}
            aoEscolher={setCidade}
          />
        }
        filtroAtivo={cidade !== "todas"}
        // Só os filtros: a busca, o molde apaga sozinho.
        aoLimparFiltros={() => setCidade("todas")}
      />
    );
  }

  it("busca + filtro sem resultado: o botão limpa os DOIS e devolve o foco pra busca", async () => {
    const { user } = renderizar(<ComBusca />);
    await user.click(screen.getByRole("button", { name: "Matão" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "Maria");
    await user.click(screen.getByRole("button", { name: "Limpar a busca e os filtros" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("searchbox", { name: "Buscar cliente" })).toHaveValue("");
    expect(screen.getByRole("searchbox", { name: "Buscar cliente" })).toHaveFocus();
  });

  it("anuncia ao leitor de tela quantos achou", async () => {
    const { user } = renderizar(<ComBusca />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "jo");
    expect(screen.getByRole("status")).toHaveTextContent("1 encontrado.");
    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "zzz");
    expect(screen.getByRole("status")).toHaveTextContent("Nada encontrado.");
  });

  it("Esc com a busca vazia segue em frente (fecha a janela em volta); com texto, não", async () => {
    const aoTeclarFora = vi.fn();
    const { user } = renderizar(
      <div onKeyDown={(e) => e.key === "Escape" && aoTeclarFora()}>
        <ComBusca />
      </div>,
    );
    const campo = screen.getByRole("searchbox", { name: "Buscar cliente" });
    await user.type(campo, "jo");
    await user.keyboard("{Escape}");
    expect(aoTeclarFora).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(aoTeclarFora).toHaveBeenCalledTimes(1);
  });

  it("filtro ligado sem quem o desligue não compila", () => {
    // @ts-expect-error: `filtroAtivo` sem `aoLimparFiltros`, o "Limpar" não limparia nada.
    const props: PropsDoMoldeLista<Cliente> = {
      rotulo: "Clientes",
      estado: "pronto",
      itens: [],
      chave: (c: Cliente) => c.id,
      linha: () => null,
      vazio: { frase: "" },
      filtroAtivo: true,
    };
    expect(props.filtroAtivo).toBe(true);
  });

  it("a busca tem nome pro leitor de tela e filtra o que a tela mandar", async () => {
    const { user } = renderizar(<ComBusca />);
    const campo = screen.getByRole("searchbox", { name: "Buscar cliente" });
    expect(campo).toHaveAttribute("placeholder", "Nome ou telefone");
    await user.type(campo, "jo");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("João Lima");
  });

  it("Esc na busca apaga o que foi digitado", async () => {
    const { user } = renderizar(<ComBusca />);
    const campo = screen.getByRole("searchbox", { name: "Buscar cliente" });
    await user.type(campo, "jo");
    await user.keyboard("{Escape}");
    expect(campo).toHaveValue("");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("os filtros (Chips) aparecem junto da busca e filtram", async () => {
    const { user } = renderizar(<ComBusca />);
    await user.click(screen.getByRole("button", { name: "Matão" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("busca sem resultado diz o que buscou e oferece limpar, não o 'comece cadastrando'", async () => {
    const { user } = renderizar(<ComBusca />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "zzz");
    expect(screen.queryByText("Nenhum cliente cadastrado ainda.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cadastrar cliente" })).toBeNull();
    expect(screen.getByText(/Nada encontrado com/)).toHaveTextContent("zzz");
    await user.click(screen.getByRole("button", { name: /Limpar a busca/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("filtro sem resultado (sem texto na busca) também oferece limpar", async () => {
    function SoFiltro() {
      const [ligado, setLigado] = useState(true);
      return (
        <Lista itens={ligado ? [] : CLIENTES} filtroAtivo={ligado} aoLimparFiltros={() => setLigado(false)} />
      );
    }
    const { user } = renderizar(<SoFiltro />);
    expect(screen.queryByText("Nenhum cliente cadastrado ainda.")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Limpar/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("MoldeLista: vazio", () => {
  it("frase + botão pra começar", async () => {
    const aoClicar = vi.fn();
    const { user } = renderizar(
      <Lista itens={[]} vazio={{ frase: "Nenhum cliente cadastrado ainda.", acao: { rotulo: "Cadastrar cliente", aoClicar } }} />,
    );
    expect(screen.getByText("Nenhum cliente cadastrado ainda.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cadastrar cliente" }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});

describe("MoldeLista: carregando", () => {
  it("não pisca nada nos primeiros 0,4 s, e depois mostra o esqueleto", () => {
    vi.useFakeTimers();
    renderizar(<Lista estado="carregando" itens={[]} />);
    const area = screen.getByRole("list", { name: "Clientes" });
    expect(area).toHaveAttribute("aria-busy", "true");
    expect(area.querySelectorAll("[data-esqueleto]")).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(area.querySelectorAll("[data-esqueleto]").length).toBeGreaterThan(0);
  });

  it("reserva o lugar das linhas desde o começo (a tela não pula)", () => {
    vi.useFakeTimers();
    renderizar(<Lista estado="carregando" itens={[]} linhasNoEsqueleto={4} />);
    // As linhas falsas ficam escondidas do leitor de tela (ele ouve o "Carregando"),
    // por isso a conta é pelo HTML, e não pelo papel de item de lista.
    const area = screen.getByLabelText("Clientes");
    expect(area.querySelectorAll("li")).toHaveLength(4);
    expect(area.querySelectorAll("li")[0]).toHaveClass("min-h-16");
  });

  it("recarregando uma lista que já tem linhas, elas ficam (só marcadas como ocupada)", () => {
    vi.useFakeTimers();
    renderizar(<Lista estado="carregando" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const lista = screen.getByRole("list", { name: "Clientes" });
    expect(lista).toHaveAttribute("aria-busy", "true");
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
    expect(lista.querySelectorAll("[data-esqueleto]")).toHaveLength(0);
  });

  it("avisa o leitor de tela que está carregando, sem mostrar o vazio", () => {
    renderizar(<Lista estado="carregando" itens={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(/Carregando/);
    expect(screen.queryByText("Nenhum cliente cadastrado ainda.")).toBeNull();
  });
});

describe("MoldeLista: erro", () => {
  it("diz o que aconteceu e o que fazer, com o botão de tentar de novo", async () => {
    const tentarDeNovo = vi.fn();
    const { user } = renderizar(
      <Lista estado="erro" itens={[]} erro={{ mensagem: "Sem conexão com a internet.", tentarDeNovo }} />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("Sem conexão com a internet.");
    await user.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
    expect(tentarDeNovo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Nenhum cliente cadastrado ainda.")).toBeNull();
  });

  it("depois do 'Tentar de novo', o foco fica na lista, e não no começo da tela", async () => {
    function Recarrega() {
      const [estado, setEstado] = useState<"erro" | "carregando">("erro");
      return (
        <Lista
          estado={estado}
          itens={[]}
          erro={{ mensagem: "Sem conexão.", tentarDeNovo: () => setEstado("carregando") }}
        />
      );
    }
    const { user } = renderizar(<Recarrega />);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toContainElement(screen.getByLabelText("Clientes"));
  });

  it("sem 'Tentar de novo', ainda diz o que fazer", () => {
    renderizar(<Lista estado="erro" itens={[]} erro={{ mensagem: "Sem conexão." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/entre de novo/);
  });
});

describe("MoldeLista: Ver todos", () => {
  const MUITOS: Cliente[] = Array.from({ length: 8 }, (_, i) => ({
    id: String(i),
    nome: `Cliente ${i + 1}`,
    cidade: "Araraquara",
  }));

  it("passando do limite, mostra só o limite e o 'Ver todos' com a conta", async () => {
    const { user } = renderizar(<Lista itens={MUITOS} limite={5} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: "Ver todos (8)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /Ver todos/ })).toBeNull();
    // O botão sumiu: o foco vai pra lista, e não pro começo da tela.
    expect(screen.getByRole("list", { name: "Clientes" })).toHaveFocus();
  });

  it("aberto o 'Ver todos', mudar a busca volta a cortar", async () => {
    function ComBusca() {
      const [texto, setTexto] = useState("");
      const itens = MUITOS.filter((c) => c.nome.includes(texto));
      return <Lista itens={itens} limite={5} busca={{ valor: texto, aoMudar: setTexto, rotulo: "Buscar cliente" }} />;
    }
    const { user } = renderizar(<ComBusca />);
    await user.click(screen.getByRole("button", { name: "Ver todos (8)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    await user.type(screen.getByRole("searchbox", { name: "Buscar cliente" }), "Cliente");
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Ver todos (8)" })).toBeInTheDocument();
  });

  it("aberto o 'Ver todos', trocar um filtro ligado por outro também volta a cortar (revisão do Tiago no #1140)", async () => {
    // Duas cidades com o mesmo tanto de clientes: "tem filtro ligado" não
    // muda, só QUAL filtro. A lista tem que voltar a cortar mesmo assim.
    const DUAS: Cliente[] = [
      ...Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, nome: `Matão ${i + 1}`, cidade: "Matão" })),
      ...Array.from({ length: 8 }, (_, i) => ({ id: `a${i}`, nome: `Araraquara ${i + 1}`, cidade: "Araraquara" })),
    ];
    function ComFiltro() {
      const [cidade, setCidade] = useState("Matão");
      return (
        <Lista
          itens={DUAS.filter((c) => c.cidade === cidade)}
          limite={5}
          filtros={
            <Chips
              rotulo="Cidade"
              opcoes={[
                { valor: "Matão", nome: "Matão" },
                { valor: "Araraquara", nome: "Araraquara" },
              ]}
              valor={cidade}
              aoEscolher={setCidade}
            />
          }
          filtroAtivo
          aoLimparFiltros={() => setCidade("Matão")}
        />
      );
    }
    const { user } = renderizar(<ComFiltro />);
    await user.click(screen.getByRole("button", { name: "Ver todos (8)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: "Araraquara" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Araraquara 1");
  });

  it("aberto o 'Ver todos', a lista recarregar com os mesmos itens não fecha", async () => {
    function Recarrega() {
      const [versao, setVersao] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setVersao((v) => v + 1)}>
            Recarregar
          </button>
          <Lista itens={MUITOS.map((c) => ({ ...c, cidade: `${c.cidade} ${versao}` }))} limite={5} />
        </>
      );
    }
    const { user } = renderizar(<Recarrega />);
    await user.click(screen.getByRole("button", { name: "Ver todos (8)" }));
    await user.click(screen.getByRole("button", { name: "Recarregar" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
  });

  it("com aoVerTodos, o botão chama a tela (pra abrir a lista inteira em outro lugar)", async () => {
    const aoVerTodos = vi.fn();
    const { user } = renderizar(<Lista itens={MUITOS} limite={5} aoVerTodos={aoVerTodos} />);
    await user.click(screen.getByRole("button", { name: "Ver todos (8)" }));
    expect(aoVerTodos).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("sem passar do limite, não tem 'Ver todos'", () => {
    renderizar(<Lista limite={5} />);
    expect(screen.queryByRole("button", { name: /Ver todos/ })).toBeNull();
  });
});
