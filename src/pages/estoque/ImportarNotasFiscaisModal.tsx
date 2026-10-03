import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { criarMovimento } from "@/lib/estoque";
import { mensagemDeErro } from "@/lib/errors";
import { lerNotasFiscais } from "@/lib/iaNotaFiscal";
import { OPCOES_ORIGEM } from "@/lib/origemMercadoria";
import { criarPeca } from "@/lib/pecas";
import {
  codigoParaPecaImportada,
  csosnMaisUsado,
  motivoCodigoIncompativel,
  regimeUsaCsosn,
} from "@/schemas/tributacao";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { ItemNotaFiscalExtraido } from "@/types/itemNotaFiscal";
import type { Peca } from "@/types/peca";

interface ItemRevisao extends ItemNotaFiscalExtraido {
  incluir: boolean;
  categoria_id: string | null;
}

interface ImportarNotasFiscaisModalProps {
  categorias: Categoria[];
  /** Só pra descobrir o código de ICMS que a loja mais usa no próprio cadastro. */
  pecas: Peca[];
  lojaId: string;
  onFechar: () => void;
  onImportado: () => Promise<void>;
}

export function ImportarNotasFiscaisModal({
  categorias,
  pecas,
  lojaId,
  onFechar,
  onImportado,
}: ImportarNotasFiscaisModalProps) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [itens, setItens] = useState<ItemRevisao[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [regime, setRegime] = useState<RegimeTributario | null>(null);

  // O regime da loja decide se o código de ICMS lido na nota do fornecedor
  // serve ou não. Falhar aqui não derruba a importação: sem regime,
  // `codigoParaPecaImportada` mantém o comportamento antigo.
  useEffect(() => {
    buscarConfiguracaoFiscal(lojaId)
      .then((config) => setRegime(config?.regime_tributario ?? null))
      .catch((err) => console.error("Erro ao carregar o regime tributário da loja:", err));
  }, [lojaId]);

  async function handleLer() {
    if (arquivos.length === 0) return;
    setLendo(true);
    setErro(null);
    try {
      const extraidos = await lerNotasFiscais(arquivos);
      // A nota lida é do FORNECEDOR: o código de ICMS que vem nela é o do
      // regime dele, não o da loja. Copiar isso direto pro cadastro já fez
      // a SEFAZ recusar uma NFC-e ("Informado CST para emissor do Simples
      // Nacional"), então aqui ele já entra corrigido pro padrão da loja —
      // e a coluna CST/CSOSN da tabela continua editável.
      const padraoDaLoja = csosnMaisUsado(pecas.map((peca) => peca.cst_ou_csosn));
      setItens(
        extraidos.map((item) => ({
          ...item,
          cst_ou_csosn: codigoParaPecaImportada(item.cst_ou_csosn, regime, padraoDaLoja),
          incluir: true,
          categoria_id: null,
        })),
      );
    } catch (err) {
      console.error("Erro ao ler notas fiscais:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setLendo(false);
    }
  }

  function atualizarItem(indice: number, mudanca: Partial<ItemRevisao>) {
    setItens((atual) =>
      atual === null
        ? atual
        : atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)),
    );
  }

  const itensComCodigoIncompativel = (itens ?? []).filter(
    (item) => item.incluir && motivoCodigoIncompativel(item.cst_ou_csosn, regime) !== null,
  );

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!itens) return;
    const selecionados = itens.filter((item) => item.incluir);
    if (selecionados.length === 0) return;
    setSalvando(true);
    setErro(null);
    try {
      for (const item of selecionados) {
        const pecaCriada = await criarPeca({
          codigo_interno: null,
          codigo_barras: item.codigo_barras,
          descricao: item.descricao,
          marca: item.marca,
          modelo: item.modelo,
          aplicacao: null,
          estoque_minimo: null,
          medida: null,
          indice_carga_velocidade: null,
          dot: null,
          unidade: item.unidade || "UN",
          preco_custo: item.preco_custo,
          preco_venda: null,
          ncm: item.ncm,
          cest: item.cest,
          cfop_padrao: item.cfop_padrao,
          origem: item.origem,
          cst_ou_csosn: item.cst_ou_csosn,
          aliquota_icms: item.aliquota_icms,
          categoria_id: item.categoria_id,
          prazo_garantia_dias: null,
          ativo: true,
        });
        if (item.quantidade && item.quantidade > 0) {
          await criarMovimento(
            {
              peca_id: pecaCriada.id,
              tipo: "entrada",
              quantidade: item.quantidade,
              motivo: "compra",
              referencia: "Importado por foto de nota fiscal",
            },
            lojaId,
          );
        }
      }
      await onImportado();
      onFechar();
    } catch (err) {
      console.error("Erro ao cadastrar produtos importados:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  const quantidadeSelecionada = itens?.filter((item) => item.incluir).length ?? 0;

  return (
    <div
      className="sakura-modal-fundo"
      onClick={onFechar}
    >
      <div
        className="sakura-modal max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
              Importar produtos por foto ou PDF da nota fiscal
            </h2>
            <p className="text-corpo text-sakura-muted">
              Escolha uma ou mais fotos e/ou PDFs (pode ser mais de uma nota junto) — a
              IA lê e preenche os campos fiscais de cada item. Revise antes de cadastrar.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-sakura-purple-dark/85 hover:bg-sakura-gray/10 hover:text-sakura-purple-dark"
          >
            ✕
          </button>
        </div>

        {erro && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">
            {erro}
          </p>
        )}

        {itens === null && (
          <div className="space-y-4">
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Fotos ou PDFs das notas</span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
              />
            </label>
            {arquivos.length > 0 && (
              <p className="text-corpo text-sakura-muted">
                {arquivos.length} arquivo(s) selecionado(s).
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onFechar}
                className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLer}
                disabled={arquivos.length === 0 || lendo}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {lendo ? "Lendo..." : "Ler arquivos"}
              </button>
            </div>
          </div>
        )}

        {itens !== null && (
          <form onSubmit={handleCadastrar} className="space-y-4">
            {/* Aviso, não tranca: dá pra cadastrar assim mesmo e acertar
                depois em Estoque → Produtos. Só evita a surpresa de descobrir
                isso lá na frente, na recusa da SEFAZ. */}
            {itensComCodigoIncompativel.length > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
                {itensComCodigoIncompativel.length === 1
                  ? "Um produto está"
                  : `${itensComCodigoIncompativel.length} produtos estão`}{" "}
                sem um <strong>{regimeUsaCsosn(regime) ? "CSOSN" : "CST"}</strong> que sirva pra
                sua loja — a coluna <strong>CST/CSOSN</strong> da tabela é editável, dá pra
                preencher aqui mesmo. Sem isso, a nota fiscal dessas peças vai ser recusada
                quando você for emitir.
              </p>
            )}

            {itens.length === 0 ? (
              <p className="text-corpo text-sakura-muted">
                Não consegui identificar nenhum produto nessas fotos.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sakura-gray/30">
                <table className="w-full min-w-[1100px] text-left text-tabela">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-2 py-2" />
                      <th className="px-2 py-2 font-medium">Descrição</th>
                      <th className="px-2 py-2 font-medium">Categoria</th>
                      <th className="px-2 py-2 font-medium">NCM</th>
                      <th className="px-2 py-2 font-medium">CEST</th>
                      <th className="px-2 py-2 font-medium">CFOP</th>
                      <th className="px-2 py-2 font-medium">Origem</th>
                      <th className="px-2 py-2 font-medium">CST/CSOSN</th>
                      <th className="px-2 py-2 font-medium">ICMS %</th>
                      <th className="px-2 py-2 font-medium">Un.</th>
                      <th className="px-2 py-2 font-medium">Custo</th>
                      <th className="px-2 py-2 font-medium">Qtde.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, indice) => (
                      <tr key={indice} className="border-t border-sakura-gray/20">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={item.incluir}
                            onChange={(e) =>
                              atualizarItem(indice, { incluir: e.target.checked })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaTexto
                            valor={item.descricao}
                            onChange={(v) => atualizarItem(indice, { descricao: v })}
                            largura="w-48"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Combobox
                            className="w-28"
                            opcoes={categorias.map((categoria) => ({
                              valor: categoria.id,
                              rotulo: categoria.nome,
                            }))}
                            valor={item.categoria_id ?? ""}
                            onMudar={(v) => atualizarItem(indice, { categoria_id: v || null })}
                            opcaoVazia="Sem categoria"
                            placeholder="Sem categoria"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaTexto
                            valor={item.ncm ?? ""}
                            onChange={(v) => atualizarItem(indice, { ncm: v })}
                            largura="w-20"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaTexto
                            valor={item.cest ?? ""}
                            onChange={(v) => atualizarItem(indice, { cest: v })}
                            largura="w-20"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaTexto
                            valor={item.cfop_padrao ?? ""}
                            onChange={(v) => atualizarItem(indice, { cfop_padrao: v })}
                            largura="w-16"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={item.origem ?? ""}
                            onChange={(e) =>
                              atualizarItem(indice, { origem: e.target.value || null })
                            }
                            className="w-16 rounded border border-sakura-borda-campo px-1.5 py-1 focus:border-sakura-purple"
                          >
                            <option value="">—</option>
                            {OPCOES_ORIGEM.map((opcao) => (
                              <option key={opcao.valor} value={opcao.valor}>
                                {opcao.valor}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaTexto
                            valor={item.cst_ou_csosn ?? ""}
                            onChange={(v) => atualizarItem(indice, { cst_ou_csosn: v })}
                            largura="w-16"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaNumero
                            valor={item.aliquota_icms}
                            onChange={(v) => atualizarItem(indice, { aliquota_icms: v })}
                            largura="w-16"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaTexto
                            valor={item.unidade ?? ""}
                            onChange={(v) => atualizarItem(indice, { unidade: v })}
                            largura="w-14"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaNumero
                            valor={item.preco_custo}
                            onChange={(v) => atualizarItem(indice, { preco_custo: v })}
                            largura="w-20"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CelulaNumero
                            valor={item.quantidade}
                            onChange={(v) => atualizarItem(indice, { quantidade: v })}
                            largura="w-16"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onFechar}
                className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={quantidadeSelecionada === 0 || salvando}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {salvando
                  ? "Cadastrando..."
                  : `Cadastrar ${quantidadeSelecionada} produto(s)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CelulaTexto({
  valor,
  onChange,
  largura,
}: {
  valor: string;
  onChange: (valor: string) => void;
  largura: string;
}) {
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      className={`${largura} rounded border border-sakura-borda-campo px-1.5 py-1 focus:border-sakura-purple`}
    />
  );
}

function CelulaNumero({
  valor,
  onChange,
  largura,
}: {
  valor: number | null;
  onChange: (valor: number | null) => void;
  largura: string;
}) {
  return (
    <input
      type="number"
      step="0.01"
      value={valor ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`${largura} rounded border border-sakura-borda-campo px-1.5 py-1 focus:border-sakura-purple`}
    />
  );
}
