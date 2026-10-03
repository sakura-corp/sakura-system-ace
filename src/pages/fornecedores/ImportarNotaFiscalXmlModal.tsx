import { useEffect, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { criarFornecedor } from "@/lib/fornecedores";
import { extrairNotaFiscalXml, lerTextoXml, normalizarCnpj } from "@/lib/notaFiscalXmlFornecedor";
import { criarPeca } from "@/lib/pecas";
import { importarNotaFiscalCompra } from "@/lib/pedidosCompra";
import {
  codigoParaPecaImportada,
  csosnMaisUsado,
  motivoCodigoIncompativel,
  regimeUsaCsosn,
} from "@/schemas/tributacao";
import type { RegimeTributario } from "@/types/configuracao";
import type { Deposito } from "@/types/deposito";
import type { Fornecedor } from "@/types/fornecedor";
import type { ItemNotaFiscalXml, NotaFiscalXmlExtraida } from "@/types/notaFiscalXmlFornecedor";
import type { Peca } from "@/types/peca";

interface ItemRevisao extends ItemNotaFiscalXml {
  incluir: boolean;
  /** "" = cadastrar peça nova; senão, id de uma peça já existente */
  pecaId: string;
  quantidadeEditavel: number;
  precoEditavel: number;
}

interface ImportarNotaFiscalXmlModalProps {
  fornecedores: Fornecedor[];
  pecas: Peca[];
  depositos: Deposito[];
  lojaId: string;
  operadorId: string | null;
  onFechar: () => void;
  onImportado: () => Promise<void>;
}

function encontrarPecaCorrespondente(item: ItemNotaFiscalXml, pecas: Peca[]): Peca | null {
  if (item.codigo_barras) {
    const porCodigoBarras = pecas.find((p) => p.codigo_barras === item.codigo_barras);
    if (porCodigoBarras) return porCodigoBarras;
  }
  if (item.codigo_interno_xml) {
    const porCodigoInterno = pecas.find((p) => p.codigo_interno === item.codigo_interno_xml);
    if (porCodigoInterno) return porCodigoInterno;
  }
  return null;
}

export function ImportarNotaFiscalXmlModal({
  fornecedores,
  pecas,
  depositos,
  lojaId,
  operadorId,
  onFechar,
  onImportado,
}: ImportarNotaFiscalXmlModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [nota, setNota] = useState<NotaFiscalXmlExtraida | null>(null);
  const [fornecedorEncontrado, setFornecedorEncontrado] = useState<Fornecedor | null>(null);
  const [itens, setItens] = useState<ItemRevisao[] | null>(null);
  const [depositoId, setDepositoId] = useState(depositos[0]?.id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [regime, setRegime] = useState<RegimeTributario | null>(null);
  // O código de ICMS que as peças novas vão receber. Nasce com o que a loja
  // mais usa no próprio cadastro — não com o do fornecedor, que pode ser de
  // outro regime (ver `codigoParaPecaImportada`).
  const [codigoIcmsNovas, setCodigoIcmsNovas] = useState(
    () => csosnMaisUsado(pecas.map((peca) => peca.cst_ou_csosn)) ?? "",
  );

  // O regime da loja decide se o código do fornecedor serve ou não. Falhar
  // aqui não pode derrubar a importação: sem regime, `codigoParaPecaImportada`
  // simplesmente mantém o comportamento antigo (copia o código da nota).
  useEffect(() => {
    buscarConfiguracaoFiscal(lojaId)
      .then((config) => setRegime(config?.regime_tributario ?? null))
      .catch((err) => console.error("Erro ao carregar o regime tributário da loja:", err));
  }, [lojaId]);

  async function handleLer() {
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    try {
      const texto = await lerTextoXml(arquivo);
      const extraida = extrairNotaFiscalXml(texto);
      const cnpjNota = normalizarCnpj(extraida.fornecedor_cnpj);
      const fornecedor = cnpjNota
        ? (fornecedores.find((f) => normalizarCnpj(f.cnpj) === cnpjNota) ?? null)
        : null;

      setNota(extraida);
      setFornecedorEncontrado(fornecedor);
      setItens(
        extraida.itens.map((item) => {
          const pecaCorrespondente = encontrarPecaCorrespondente(item, pecas);
          return {
            ...item,
            incluir: true,
            pecaId: pecaCorrespondente?.id ?? "",
            quantidadeEditavel: item.quantidade,
            precoEditavel: item.preco_unitario,
          };
        }),
      );
    } catch (err) {
      console.error("Erro ao ler XML da nota fiscal:", err);
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

  async function handleImportar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota || !itens || !depositoId) return;
    const selecionados = itens.filter((item) => item.incluir && item.quantidadeEditavel > 0);
    if (selecionados.length === 0) return;

    setSalvando(true);
    setErro(null);
    try {
      let fornecedorId = fornecedorEncontrado?.id ?? null;
      if (!fornecedorId) {
        const fornecedorCriado = await criarFornecedor({
          nome: nota.fornecedor_nome ?? "Fornecedor sem nome",
          cnpj: nota.fornecedor_cnpj,
          telefone: null,
          email: null,
          cep: null,
          rua: null,
          numero: null,
          bairro: null,
          cidade: null,
          uf: null,
          ativo: true,
        });
        fornecedorId = fornecedorCriado.id;
      }

      const itensParaImportar = [];
      for (const item of selecionados) {
        let pecaId = item.pecaId;
        if (!pecaId) {
          const pecaCriada = await criarPeca({
            codigo_interno: null,
            codigo_barras: item.codigo_barras,
            descricao: item.descricao,
            marca: null,
            modelo: null,
            aplicacao: null,
            estoque_minimo: null,
            medida: null,
            indice_carga_velocidade: null,
            dot: null,
            unidade: item.unidade || "UN",
            preco_custo: item.precoEditavel,
            preco_venda: null,
            ncm: item.ncm,
            cest: null,
            cfop_padrao: item.cfop_padrao,
            origem: item.origem,
            cst_ou_csosn: codigoParaPecaImportada(item.cst_ou_csosn, regime, codigoIcmsNovas),
            aliquota_icms: item.aliquota_icms,
            categoria_id: null,
            prazo_garantia_dias: null,
            ativo: true,
          });
          pecaId = pecaCriada.id;
        }
        itensParaImportar.push({
          pecaId,
          quantidade: item.quantidadeEditavel,
          precoUnitario: item.precoEditavel,
        });
      }

      await importarNotaFiscalCompra(
        fornecedorId,
        itensParaImportar,
        depositoId,
        lojaId,
        operadorId,
        nota.numero ? `Importado da NFe nº ${nota.numero}` : "Importado de nota fiscal XML",
      );

      await onImportado();
      onFechar();
    } catch (err) {
      console.error("Erro ao importar nota fiscal XML:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  // Só as peças que vão ser CRIADAS agora (sem `pecaId`) importam aqui: peça
  // já cadastrada mantém o código que ela tem, a importação não mexe nisso.
  const pecasNovasComCodigoDeOutroRegime = (itens ?? []).filter(
    (item) =>
      item.incluir &&
      !item.pecaId &&
      motivoCodigoIncompativel(item.cst_ou_csosn, regime) !== null,
  );

  const quantidadeSelecionada =
    itens?.filter((item) => item.incluir && item.quantidadeEditavel > 0).length ?? 0;

  return (
    <div
      className="sakura-modal-fundo"
      onClick={onFechar}
    >
      <div
        className="sakura-modal max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
              Importar XML de nota fiscal do fornecedor
            </h2>
            <p className="text-corpo text-sakura-muted">
              O arquivo XML que o fornecedor te manda (ou que você baixa no site da Sefaz) —
              diferente da nota que você emite pro cliente. Cria um pedido de compra já recebido,
              com entrada no estoque e cotação registrados sozinhos.
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
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
        )}

        {itens === null && (
          <div className="space-y-4">
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">Arquivo XML da nota</span>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
              />
            </label>
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
                disabled={!arquivo || lendo}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {lendo ? "Lendo..." : "Ler arquivo"}
              </button>
            </div>
          </div>
        )}

        {itens !== null && nota && (
          <form onSubmit={handleImportar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-sakura-gray/30 p-3 text-corpo">
                <span className="text-sakura-purple-dark/70">Fornecedor</span>
                <p className="font-medium text-sakura-purple-dark">
                  {fornecedorEncontrado
                    ? fornecedorEncontrado.nome
                    : (nota.fornecedor_nome ?? "Sem nome no XML")}
                </p>
                {!fornecedorEncontrado && (
                  <p className="mt-1 text-rotulo text-amber-700">
                    Não achei esse CNPJ cadastrado — um fornecedor novo será criado
                    automaticamente ao importar.
                  </p>
                )}
              </div>

              <label className="flex flex-col gap-1 text-corpo">
                <span className="text-sakura-purple-dark/80">
                  Depósito (onde a mercadoria entrou) <span className="text-red-500">*</span>
                </span>
                <select
                  value={depositoId}
                  onChange={(e) => setDepositoId(e.target.value)}
                  className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
                >
                  {depositos.map((deposito) => (
                    <option key={deposito.id} value={deposito.id}>
                      {deposito.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Antes, o código de ICMS do fornecedor era copiado direto pro
                cadastro da peça. Fornecedor do regime normal manda CST, que a
                SEFAZ recusa numa nota do Simples Nacional — e o erro só
                aparecia lá na frente, ao emitir, dizendo "[nItem:1]" sem
                nome de peça nenhum. */}
            {pecasNovasComCodigoDeOutroRegime.length > 0 && (
              <div className="space-y-3">
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
                  {pecasNovasComCodigoDeOutroRegime.length === 1
                    ? "Uma peça nova desta nota vem"
                    : `${pecasNovasComCodigoDeOutroRegime.length} peças novas desta nota vêm`}{" "}
                  com o código de ICMS <strong>do fornecedor</strong>, que não serve pra sua loja
                  {regimeUsaCsosn(regime) ? " (Simples Nacional)" : ""}. Escolha abaixo o código
                  que elas devem receber no seu cadastro — em branco, a peça fica sem código e
                  você preenche depois em Estoque → Produtos.
                </p>
                <label className="flex flex-col gap-1 text-corpo">
                  <span className="text-sakura-purple-dark/80">
                    {regimeUsaCsosn(regime) ? "CSOSN" : "CST"} das peças novas
                  </span>
                  <input
                    value={codigoIcmsNovas}
                    onChange={(e) => setCodigoIcmsNovas(e.target.value)}
                    placeholder={regimeUsaCsosn(regime) ? "Ex: 500" : "Ex: 00"}
                    className="w-32 rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
                  />
                </label>
              </div>
            )}

            {itens.length === 0 ? (
              <p className="text-corpo text-sakura-muted">Não encontrei nenhum item nessa nota.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sakura-gray/30">
                <table className="w-full min-w-[820px] text-left text-tabela">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-2 py-2" />
                      <th className="px-2 py-2 font-medium">Item da nota</th>
                      <th className="px-2 py-2 font-medium">Peça no sistema</th>
                      <th className="px-2 py-2 font-medium">Qtde.</th>
                      <th className="px-2 py-2 font-medium">Preço unit.</th>
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
                          <p className="text-sakura-purple-dark">{item.descricao}</p>
                          <p className="text-sakura-muted">
                            NCM {item.ncm ?? "—"} · CFOP {item.cfop_padrao ?? "—"}
                          </p>
                        </td>
                        <td className="px-2 py-1.5">
                          <Combobox
                            className="w-52"
                            opcoes={pecas.map((peca) => ({
                              valor: peca.id,
                              rotulo: peca.descricao,
                            }))}
                            valor={item.pecaId}
                            onMudar={(v) => atualizarItem(indice, { pecaId: v })}
                            opcaoVazia={`+ Cadastrar peça nova: ${item.descricao}`}
                            placeholder="Selecione a peça"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantidadeEditavel}
                            onChange={(e) =>
                              atualizarItem(indice, {
                                quantidadeEditavel: Number(e.target.value),
                              })
                            }
                            className="w-20 rounded border border-sakura-borda-campo px-1.5 py-1 focus:border-sakura-purple"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precoEditavel}
                            onChange={(e) =>
                              atualizarItem(indice, { precoEditavel: Number(e.target.value) })
                            }
                            className="w-24 rounded border border-sakura-borda-campo px-1.5 py-1 focus:border-sakura-purple"
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
                disabled={quantidadeSelecionada === 0 || !depositoId || salvando}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {salvando ? "Importando..." : `Importar ${quantidadeSelecionada} item(ns)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
