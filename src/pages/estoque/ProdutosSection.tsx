import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { atualizarPeca, atualizarStatusPeca, criarPeca, excluirPeca } from "@/lib/pecas";
import { criarMovimento } from "@/lib/estoque";
import { dataCurta } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { semPontoFinal } from "@/pages/ordens-servico/pecaAvulsaCadastro";
import {
  acharPorCodigoExato,
  movimentoDeEstoqueInicial,
  pecaCasaComBusca,
  precisaComprar,
} from "@/schemas/estoque";
import { csosnMaisUsado } from "@/schemas/tributacao";
import { formatarQuantidade } from "@/schemas/quantidade";
import { margemSobreAVenda } from "@/schemas/peca";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { NovaPeca, Peca } from "@/types/peca";
import { pecaSemCusto } from "@/schemas/avisosOrdemServico";
import { ImportarNotasFiscaisModal } from "./ImportarNotasFiscaisModal";
import { PecaForm } from "./PecaForm";
import { BarraDoEstoque } from "./BarraDoEstoque";
import { lerBarraDoEstoque } from "./barraDoEstoque";
import { useRolarAteOFormulario } from "@/hooks/useRolarAteOFormulario";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { AvisoDeErro } from "@/components/Aviso";
import { useConfirmar } from "@/components/JanelaDeConfirmar";
import { LinhaDeLista } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";

// "Importar por foto/PDF" desligado a pedido dela (25/09/2026), até ela
// decidir o que fazer com a leitura por IA. O código continua todo aqui:
// religar é trocar pra `true` e voltar a cena "13-importar-foto" em
// site/ferramentas/cenas.mjs (a varredura de contraste clica nesse botão).
const IMPORTAR_POR_FOTO_LIGADO = false;

function IconeCamera({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

interface ProdutosSectionProps {
  pecas: Peca[];
  categorias: Categoria[];
  saldos: Map<string, number>;
  /** A saída mais nova de cada peça (`criado_em`), pra coluna "última saída". */
  ultimaSaida?: Map<string, string>;
  regime: RegimeTributario | null;
  lojaId: string;
  onRecarregar: () => Promise<void>;
  /**
   * O aviso do estoque inicial que não entrou (#909). Mora no `EstoquePage`,
   * não aqui: a recarga depois de salvar troca esta seção por "Carregando..."
   * e ela volta zerada, levando junto um aviso guardado nela.
   */
  avisoEstoqueInicial: string | null;
  onAvisoEstoqueInicial: (aviso: string | null) => void;
  /** Clicar no nome abre o perfil da peça (#1093). */
  onAbrirPeca?: (peca: Peca) => void;
  /**
   * O "Comprar" da linha leva à Sugestão de compra. Sem ele (quem não tem
   * Fornecedores, onde a sugestão mora), a linha não oferece o botão.
   */
  onComprar?: () => void;
  /** Abre já editando esta peça (o "Editar" do perfil da peça). */
  editarAoAbrir?: Peca | null;
  /**
   * Avisa que o `editarAoAbrir` já foi usado, pra quem guarda o pedido
   * apagá-lo. Sem isso, cada recarga (que monta a seção de novo) reabria o
   * formulário com a peça de ANTES da edição (revisão final da #1093).
   */
  onEditarAoAbrirUsado?: () => void;
}

function formatarPreco(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Situacao = "todos" | "comprar" | "inativos";

export function ProdutosSection({
  pecas,
  categorias,
  saldos,
  ultimaSaida,
  regime,
  lojaId,
  onRecarregar,
  avisoEstoqueInicial,
  onAvisoEstoqueInicial,
  onAbrirPeca,
  onComprar,
  editarAoAbrir = null,
  onEditarAoAbrirUsado,
}: ProdutosSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(editarAoAbrir !== null);
  const [pecaEmEdicao, setPecaEmEdicao] = useState<Peca | null>(editarAoAbrir);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { confirmar, janela } = useConfirmar();

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("todos");
  // O campo de busca é do molde de lista: acha-se ele por dentro desta caixa.
  const caixaDaLista = useRef<HTMLDivElement>(null);
  const caixaDoFormulario = useRolarAteOFormulario(
    mostrarFormulario ? (pecaEmEdicao?.id ?? "nova") : null,
  );

  function focarBusca() {
    caixaDaLista.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  }

  // No balcão a busca costuma ser um bipe de leitor: o campo já nasce focado.
  useEffect(() => {
    if (!mostrarFormulario) focarBusca();
    if (editarAoAbrir) onEditarAoAbrirUsado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O código que a própria loja mais usa — vira a sugestão de uma peça nova,
  // em vez do campo em branco de antes. Sai do cadastro DELA, nunca de um
  // palpite meu (ver schemas/tributacao.ts).
  const csosnSugerido = useMemo(
    () => csosnMaisUsado(pecas.map((peca) => peca.cst_ou_csosn)),
    [pecas],
  );

  // Reativou a última inativa com o filtro "Inativos" ligado: o chip some, e o
  // filtro não pode ficar preso escondendo a lista.
  const temInativa = pecas.some((peca) => !peca.ativo);
  const situacaoNaTela: Situacao = situacao === "inativos" && !temInativa ? "todos" : situacao;

  const pecasFiltradas = useMemo(
    () =>
      pecas.filter((peca) => {
        if (categoriaFiltro && peca.categoria_id !== categoriaFiltro) return false;
        // Igual ao número do chip: só as ativas (a inativa nem tem o "Comprar").
        if (
          situacaoNaTela === "comprar" &&
          (!peca.ativo || !precisaComprar(saldos.get(peca.id) ?? 0, peca.estoque_minimo))
        ) {
          return false;
        }
        if (situacaoNaTela === "inativos" && peca.ativo) return false;
        return pecaCasaComBusca(peca, busca);
      }),
    [pecas, saldos, busca, categoriaFiltro, situacaoNaTela],
  );

  // O número que decide a tela: quantas peças ativas estão no mínimo ou abaixo.
  const ativas = useMemo(() => pecas.filter((peca) => peca.ativo), [pecas]);
  const quantasPrecisamComprar = useMemo(
    () => ativas.filter((peca) => precisaComprar(saldos.get(peca.id) ?? 0, peca.estoque_minimo)).length,
    [ativas, saldos],
  );
  const quantasComMinimo = useMemo(() => ativas.filter((peca) => peca.estoque_minimo != null).length, [ativas]);
  const quantasNegativas = useMemo(
    () => ativas.filter((peca) => (saldos.get(peca.id) ?? 0) < 0).length,
    [ativas, saldos],
  );
  const quantasInativas = pecas.length - ativas.length;

  // O leitor de código de barras se comporta como um teclado: digita o código
  // e aperta Enter. Com correspondência exata, o Enter abre a peça direto —
  // o mesmo campo serve pra busca por texto de sempre. O campo é do molde: o
  // Enter sobe até a caixa da lista e é pego aqui.
  function handleTeclaNaLista(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== "Enter") return;
    const alvo = evento.target as HTMLElement;
    if (!(alvo instanceof HTMLInputElement) || alvo.type !== "search") return;
    evento.preventDefault();
    const achada = acharPorCodigoExato(pecas, busca);
    if (achada) {
      handleEditar(achada);
      setBusca("");
    }
  }

  async function handleSalvar(peca: NovaPeca, quantidadeInicial: number | null) {
    setErro(null);
    onAvisoEstoqueInicial(null);
    if (pecaEmEdicao) {
      await atualizarPeca(pecaEmEdicao.id, peca);
    } else {
      // Se a peça não foi criada, o erro sobe e o formulário fica aberto.
      const pecaCriada = await criarPeca(peca);
      const estoqueInicial = movimentoDeEstoqueInicial(pecaCriada.id, quantidadeInicial);
      if (estoqueInicial) {
        // A peça já existe: se só o estoque inicial falha, o erro NÃO sobe
        // (senão o formulário fica aberto e um novo "Salvar" cria outra peça
        // igual). Fecha e avisa pra lançar a entrada à mão (#909).
        try {
          await criarMovimento(estoqueInicial, lojaId);
        } catch (err) {
          console.error("Erro ao lançar o estoque inicial da peça:", err);
          onAvisoEstoqueInicial(
            `Peça cadastrada, mas o estoque inicial não entrou (${semPontoFinal(mensagemDeErro(err))}). ` +
              "Lance a entrada em Estoque → Movimentações.",
          );
        }
      }
    }
    setMostrarFormulario(false);
    setPecaEmEdicao(null);
    // O `carregar` do EstoquePage captura o próprio erro e nunca falha pra fora.
    await onRecarregar();
  }

  function handleFecharFormulario() {
    setMostrarFormulario(false);
    setPecaEmEdicao(null);
    // Quem fecha o cadastro quase sempre vai procurar a próxima peça — e no
    // balcão isso costuma ser um bipe de leitor, que precisa do campo focado.
    setTimeout(focarBusca, 0);
  }

  function handleEditar(peca: Peca) {
    setPecaEmEdicao(peca);
    setMostrarFormulario(true);
  }

  async function handleExcluir(peca: Peca) {
    const sim = await confirmar({
      acao: "Excluir o produto",
      item: peca.descricao,
      explicacao: "Ele sai do cadastro. Isso não tem volta: se só parou de vender, prefira Inativar.",
      botao: "Excluir produto",
    });
    if (!sim) return;
    try {
      await excluirPeca(peca.id);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao excluir produto:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleAlternarStatus(peca: Peca) {
    try {
      await atualizarStatusPeca(peca.id, !peca.ativo);
      await onRecarregar();
    } catch (err) {
      console.error("Erro ao atualizar status do produto:", err);
      setErro(mensagemDeErro(err));
    }
  }

  function linhaDaPeca(peca: Peca) {
    const saldo = saldos.get(peca.id) ?? 0;
    const barra = lerBarraDoEstoque(saldo, peca.estoque_minimo);
    const margem = margemSobreAVenda(peca.preco_custo?.toString() ?? "", peca.preco_venda?.toString() ?? "");
    const categoria = categorias.find((c) => c.id === peca.categoria_id)?.nome;
    // A medida só entra quando NÃO está na descrição: a maioria das peças de
    // pneu já traz a medida no nome ("Pneu 175/70 R14"), e repetir vira ruído.
    const medida = peca.medida && !peca.descricao.includes(peca.medida) ? peca.medida : null;
    const partes = [
      medida,
      categoria,
      peca.codigo_interno ? `cód. ${peca.codigo_interno}` : null,
      `venda ${formatarPreco(peca.preco_venda)}`,
      margem === "" ? null : `margem ${formatarQuantidade(Number(margem))}%`,
    ].filter((parte): parte is string => !!parte);
    const saida = ultimaSaida?.get(peca.id);

    return (
      <LinhaDeLista
        nome={peca.descricao}
        descricao={`o produto ${peca.descricao}`}
        detalhe={
          <>
            {!peca.ativo && (
              <span className="mr-2 inline-flex align-middle">
                <Selo tipo="neutro" palavra="Inativo" />
              </span>
            )}
            {partes.join(" · ")}
          </>
        }
        aoAbrir={onAbrirPeca ? () => onAbrirPeca(peca) : undefined}
        lado={
          <div className="flex items-center gap-6">
            <BarraDoEstoque saldo={saldo} estoqueMinimo={peca.estoque_minimo} />
            {/* Some na janela estreita: a barra e o "Comprar" são o principal. */}
            <div className="hidden w-24 text-right text-rotulo text-texto-2 @4xl:block">
              <span className="block">última saída</span>
              <span className="block font-medium text-texto tabular-nums">{saida ? dataCurta(saida) : "—"}</span>
            </div>
            {/* A UMA ação da linha mora aqui, e não no `acao` do molde: o lugar
                dela fica reservado em toda linha (com ou sem o botão), e a barra
                e a última saída batem em coluna de uma linha pra outra. */}
            {onComprar && (
              <div className="flex w-24 justify-end">
                {barra.precisaComprar && peca.ativo && (
                  <Botao
                    variante="secundario"
                    tamanho="medio"
                    onClick={onComprar}
                    aria-label={`Comprar — o produto ${peca.descricao}`}
                  >
                    Comprar
                  </Botao>
                )}
              </div>
            )}
          </div>
        }
        mais={[
          { rotulo: "Editar", aoClicar: () => handleEditar(peca) },
          { rotulo: peca.ativo ? "Inativar" : "Reativar", aoClicar: () => handleAlternarStatus(peca) },
          { rotulo: "Excluir produto", perigosa: true, aoClicar: () => handleExcluir(peca) },
        ]}
      />
    );
  }

  const filtroAtivo = situacaoNaTela !== "todos" || categoriaFiltro !== "";

  return (
    <div className="space-y-6">
      {janela}
      {!mostrarFormulario && (
        <div className="flex flex-wrap items-stretch gap-4">
          {/* 1 número grande (o que decide) + 2 de apoio. */}
          <div className="min-w-0 flex-[1.6] basis-64">
            <CartaoNumero
              titulo="Abaixo do mínimo"
              explicacao="Peças ativas no estoque mínimo ou abaixo dele: é hora de comprar. Peça sem mínimo cadastrado não entra."
              variacao={
                <span className="text-rotulo text-texto-2">
                  de {quantasComMinimo} {quantasComMinimo === 1 ? "peça" : "peças"} com mínimo
                </span>
              }
            >
              <span className={quantasPrecisamComprar > 0 ? "text-perigo" : "text-texto"}>
                {quantasPrecisamComprar} {quantasPrecisamComprar === 1 ? "peça" : "peças"}
              </span>
            </CartaoNumero>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <CartaoNumero titulo="Produtos ativos">{ativas.length}</CartaoNumero>
          </div>
          <div className="min-w-0 flex-1 basis-40">
            <CartaoNumero
              titulo="Saldo negativo"
              explicacao="Saiu peça que não entrou: erro de lançamento. Confira na Contagem."
            >
              <span className={quantasNegativas > 0 ? "text-perigo" : "text-texto"}>{quantasNegativas}</span>
            </CartaoNumero>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {IMPORTAR_POR_FOTO_LIGADO && (
              <Botao icone={<IconeCamera />} onClick={() => setMostrarImportar(true)}>
                Importar por foto/PDF
              </Botao>
            )}
            <Botao variante="principal" tamanho="grande" icone={<Plus />} onClick={() => setMostrarFormulario(true)}>
              Novo produto
            </Botao>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div ref={caixaDoFormulario} className="scroll-mt-4">
        {/* key: sem ela o formulário não troca os valores ao abrir outra peça
            (defaultValues só valem na montagem), p.ex. pelo "Abrir a que já existe". */}
        <PecaForm
          key={pecaEmEdicao?.id ?? "nova"}
          pecasDoCadastro={pecas.map((p) => ({ ...p, sem_custo: pecaSemCusto(p.preco_custo) }))}
          onAbrirExistente={(achada) => {
            const completa = pecas.find((p) => p.id === achada.id);
            if (completa) handleEditar(completa);
          }}
          pecaExistente={pecaEmEdicao ?? undefined}
          categorias={categorias}
          regime={regime}
          csosnSugerido={csosnSugerido}
          onSalvar={handleSalvar}
          onCancelar={handleFecharFormulario}
        />
        </div>
      )}

      {mostrarImportar && (
        <ImportarNotasFiscaisModal
          categorias={categorias}
          pecas={pecas}
          lojaId={lojaId}
          onFechar={() => setMostrarImportar(false)}
          onImportado={onRecarregar}
        />
      )}

      {avisoEstoqueInicial && <AvisoDeErro>{avisoEstoqueInicial}</AvisoDeErro>}

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {/* `@container`: a coluna "última saída" só aparece quando a lista é larga. */}
      <div ref={caixaDaLista} onKeyDown={handleTeclaNaLista} className="@container min-w-0">
        <MoldeLista
          rotulo="Produtos"
          estado="pronto"
          itens={pecasFiltradas}
          chave={(peca) => peca.id}
          linha={linhaDaPeca}
          limite={50}
          busca={
            pecas.length > 0
              ? {
                  valor: busca,
                  aoMudar: setBusca,
                  rotulo: "Buscar ou bipar código",
                  dica: "Descrição, referência, código, marca ou medida",
                }
              : undefined
          }
          filtros={
            pecas.length > 0 && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <Chips
                  rotulo="Situação"
                  valor={situacaoNaTela}
                  aoEscolher={setSituacao}
                  opcoes={[
                    { valor: "todos", nome: "Todos" },
                    { valor: "comprar", nome: `Comprar (${quantasPrecisamComprar})` },
                    ...(quantasInativas > 0 ? [{ valor: "inativos" as const, nome: `Inativos (${quantasInativas})` }] : []),
                  ]}
                />
                {categorias.length > 0 && (
                  <select
                    aria-label="Categoria"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                    className="sakura-campo sakura-campo-filtro !h-10 !w-48"
                  >
                    <option value="">Todas as categorias</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )
          }
          filtroAtivo={filtroAtivo}
          aoLimparFiltros={() => {
            setSituacao("todos");
            setCategoriaFiltro("");
          }}
          vazio={{
            frase: "Nenhum produto cadastrado ainda.",
            acao: { rotulo: "Cadastrar o primeiro produto", aoClicar: () => setMostrarFormulario(true) },
          }}
        />
      </div>
    </div>
  );
}
