import { useMemo, useRef, useState } from "react";
import { atualizarPeca, atualizarStatusPeca, criarPeca, excluirPeca } from "@/lib/pecas";
import { criarMovimento } from "@/lib/estoque";
import { mensagemDeErro } from "@/lib/errors";
import {
  acharPorCodigoExato,
  lerSaldo,
  pecaCasaComBusca,
  precisaComprar,
  SITUACAO_SALDO_ROTULO,
  type SituacaoSaldo,
} from "@/schemas/estoque";
import { csosnMaisUsado } from "@/schemas/tributacao";
import { margemAPartirDoPreco } from "@/schemas/peca";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { NovaPeca, Peca } from "@/types/peca";
import { ImportarNotasFiscaisModal } from "./ImportarNotasFiscaisModal";
import { PecaForm } from "./PecaForm";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";

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
  regime: RegimeTributario | null;
  lojaId: string;
  onRecarregar: () => Promise<void>;
}

function formatarPreco(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarQuantidade(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

// Saldo negativo é ERRO DE LANÇAMENTO, não pouco estoque — precisa gritar. O
// relatório de estoque já tratava assim; a lista de Produtos mostrava o mesmo
// número em preto, como se fosse normal (item TL-11 do guia).
//
// Vermelho claro, e não `text-red-600`: o card é escuro, e vermelho escuro
// sobre fundo escuro é a sobra do tema claro antigo que já cegou tela neste
// projeto (PROJETO_STATUS.md, seção 6, itens 14 e 17).
const COR_DO_SALDO: Record<SituacaoSaldo, string> = {
  negativo: "text-red-300",
  zerado: "text-amber-300",
  abaixo_do_minimo: "text-amber-300",
  normal: "",
};

export function ProdutosSection({
  pecas,
  categorias,
  saldos,
  regime,
  lojaId,
  onRecarregar,
}: ProdutosSectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pecaEmEdicao, setPecaEmEdicao] = useState<Peca | null>(null);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [soPrecisaComprar, setSoPrecisaComprar] = useState(false);
  const campoBusca = useRef<HTMLInputElement>(null);

  // O código que a própria loja mais usa — vira a sugestão de uma peça nova,
  // em vez do campo em branco de antes. Sai do cadastro DELA, nunca de um
  // palpite meu (ver schemas/tributacao.ts).
  const csosnSugerido = useMemo(
    () => csosnMaisUsado(pecas.map((peca) => peca.cst_ou_csosn)),
    [pecas],
  );

  const pecasFiltradas = useMemo(
    () =>
      pecas.filter((peca) => {
        if (categoriaFiltro && peca.categoria_id !== categoriaFiltro) return false;
        if (soPrecisaComprar && !precisaComprar(saldos.get(peca.id) ?? 0, peca.estoque_minimo)) {
          return false;
        }
        return pecaCasaComBusca(peca, busca);
      }),
    [pecas, saldos, busca, categoriaFiltro, soPrecisaComprar],
  );

  const quantasPrecisamComprar = useMemo(
    () =>
      pecas.filter((peca) => precisaComprar(saldos.get(peca.id) ?? 0, peca.estoque_minimo)).length,
    [pecas, saldos],
  );

  // O leitor de código de barras se comporta como um teclado: digita o código
  // e aperta Enter. Com correspondência exata, o Enter abre a peça direto —
  // o mesmo campo serve pra busca por texto de sempre.
  function handleTeclaNaBusca(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    const achada = acharPorCodigoExato(pecas, busca);
    if (achada) {
      handleEditar(achada);
      setBusca("");
    }
  }

  async function handleSalvar(peca: NovaPeca, quantidadeInicial: number | null) {
    if (pecaEmEdicao) {
      await atualizarPeca(pecaEmEdicao.id, peca);
    } else {
      const pecaCriada = await criarPeca(peca);
      if (quantidadeInicial && quantidadeInicial > 0) {
        await criarMovimento(
          {
            peca_id: pecaCriada.id,
            tipo: "entrada",
            quantidade: quantidadeInicial,
            motivo: "ajuste",
            referencia: "Estoque inicial (cadastro do produto)",
          },
          lojaId,
        );
      }
    }
    setMostrarFormulario(false);
    setPecaEmEdicao(null);
    await onRecarregar();
  }

  function handleFecharFormulario() {
    setMostrarFormulario(false);
    setPecaEmEdicao(null);
    // Quem fecha o cadastro quase sempre vai procurar a próxima peça — e no
    // balcão isso costuma ser um bipe de leitor, que precisa do campo focado.
    setTimeout(() => campoBusca.current?.focus(), 0);
  }

  function handleEditar(peca: Peca) {
    setPecaEmEdicao(peca);
    setMostrarFormulario(true);
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este produto?")) return;
    try {
      await excluirPeca(id);
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

  return (
    <div className="space-y-6">
      {!mostrarFormulario && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Buscar ou bipar código</span>
              <input
                ref={campoBusca}
                type="search"
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={handleTeclaNaBusca}
                placeholder="Descrição, referência, código, marca ou medida"
                className="w-80 rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
              />
            </label>

            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Categoria</span>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 py-2.5 text-corpo">
              <input
                type="checkbox"
                checked={soPrecisaComprar}
                onChange={(e) => setSoPrecisaComprar(e.target.checked)}
                className="h-4 w-4"
              />
              <span>
                Precisa comprar
                {quantasPrecisamComprar > 0 && (
                  <span className="ml-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-rotulo font-medium text-amber-300">
                    {quantasPrecisamComprar}
                  </span>
                )}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {IMPORTAR_POR_FOTO_LIGADO && (
              <button
                onClick={() => setMostrarImportar(true)}
                className="flex items-center gap-2 rounded-xl border border-sakura-purple/40 px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
              >
                <IconeCamera className="h-4 w-4" />
                Importar por foto/PDF
              </button>
            )}
            <button
              onClick={() => setMostrarFormulario(true)}
              className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
            >
              + Novo produto
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <PecaForm
          pecaExistente={pecaEmEdicao ?? undefined}
          categorias={categorias}
          regime={regime}
          csosnSugerido={csosnSugerido}
          onSalvar={handleSalvar}
          onCancelar={handleFecharFormulario}
        />
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

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      {pecas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhum produto cadastrado ainda.
        </p>
      ) : pecasFiltradas.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhum produto encontrado com esses filtros.
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Unidade</th>
                <th className="px-4 py-3 font-medium">Preço custo</th>
                <th className="px-4 py-3 font-medium">Preço venda</th>
                <th className="px-4 py-3 font-medium">Margem</th>
                <th className="px-4 py-3 font-medium">Estoque atual</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pecasFiltradas.map((peca) => {
                const saldo = saldos.get(peca.id) ?? 0;
                const leitura = lerSaldo(saldo, peca.estoque_minimo);
                const margem = margemAPartirDoPreco(
                  peca.preco_custo?.toString() ?? "",
                  peca.preco_venda?.toString() ?? "",
                );

                return (
                  <tr key={peca.id} className="border-t border-sakura-gray/20">
                    <td className="px-4 py-3">
                      {peca.descricao}
                      {/* A medida só aparece quando NÃO está na descrição: a
                          maioria das peças de pneu já traz a medida no nome
                          ("Pneu 175/70 R14"), e repetir ao lado vira ruído. */}
                      {peca.medida && !peca.descricao.includes(peca.medida) && (
                        <span className="ml-2 text-rotulo text-sakura-muted">{peca.medida}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {categorias.find((c) => c.id === peca.categoria_id)?.nome ?? "—"}
                    </td>
                    <td className="px-4 py-3">{peca.codigo_interno || "—"}</td>
                    <td className="px-4 py-3">{peca.unidade || "—"}</td>
                    <td className="px-4 py-3">{formatarPreco(peca.preco_custo)}</td>
                    <td className="px-4 py-3">{formatarPreco(peca.preco_venda)}</td>
                    <td className="px-4 py-3">{margem === "" ? "—" : `${margem}%`}</td>
                    <td className={`px-4 py-3 font-medium ${COR_DO_SALDO[leitura.situacao]}`}>
                      <span title={SITUACAO_SALDO_ROTULO[leitura.situacao] || undefined}>
                        {formatarQuantidade(saldo)}
                      </span>
                      {peca.estoque_minimo != null && (
                        <span className="ml-1 text-rotulo font-normal text-sakura-muted">
                          / mín. {formatarQuantidade(peca.estoque_minimo)}
                        </span>
                      )}
                      {leitura.situacao === "negativo" && (
                        <span className="ml-2 text-rotulo font-normal">negativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-rotulo font-medium ${
                          peca.ativo
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-sakura-gray/20 text-sakura-muted"
                        }`}
                      >
                        {peca.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AcoesDaLinha
                        descricao={`o produto ${peca.descricao}`}
                        acoes={[
                          { tipo: "editar", aoClicar: () => handleEditar(peca) },
                          {
                            tipo: peca.ativo ? "inativar" : "reativar",
                            aoClicar: () => handleAlternarStatus(peca),
                          },
                          {
                            tipo: "menu",
                            rotulo: "Excluir produto",
                            perigosa: true,
                            aoClicar: () => handleExcluir(peca.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
