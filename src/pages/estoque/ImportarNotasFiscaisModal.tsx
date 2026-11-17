import { useEffect, useState } from "react";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { useConexao } from "@/hooks/useConexao";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { criarMovimento } from "@/lib/estoque";
import { mensagemDeErro } from "@/lib/errors";
import { lerNotasFiscais } from "@/lib/iaNotaFiscal";
import { OPCOES_ORIGEM } from "@/lib/origemMercadoria";
import { criarPeca } from "@/lib/pecas";
import {
  codigoParaPecaImportada,
  csosnMaisUsado,
  motivoCfopIncompativel,
  motivoCodigoIncompativel,
  regimeUsaCsosn,
} from "@/schemas/tributacao";
import type { Categoria } from "@/types/categoria";
import type { RegimeTributario } from "@/types/configuracao";
import type { ItemNotaFiscalExtraido } from "@/types/itemNotaFiscal";
import type { Peca } from "@/types/peca";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

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
  // #374: aviso perto do botão; o botão continua clicável (aviso, nunca tranca).
  const { semConexao } = useConexao();
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [itens, setItens] = useState<ItemRevisao[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [regime, setRegime] = useState<RegimeTributario | null>(null);

  // O regime da loja decide se o código de ICMS lido na nota do fornecedor
  // serve ou não. Falhar aqui não derruba a importação: sem regime,
  // `codigoParaPecaImportada` mantém o comportamento antigo.
  // #927: só a leitura mais nova do regime vale (a loja pode mudar com a anterior ainda andando).
  const { comecar } = useCargaMaisNova(lojaId);
  useEffect(() => {
    const carga = comecar(lojaId);
    if (!carga) return;
    // O regime da loja anterior não fica valendo enquanto o da nova não chega.
    setRegime(null);
    buscarConfiguracaoFiscal(carga.lojaId)
      .then((config) => {
        if (carga.aindaEhAtual()) setRegime(config?.regime_tributario ?? null);
      })
      .catch((err) => console.error("Erro ao carregar o regime tributário da loja:", err));
  }, [lojaId, comecar]);

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

  // Só aviso, na linha do item (#968): cadastrar continua liberado, e o CFOP
  // não é trocado sozinho. Mesma regra da tela da peça, sem cópia.
  function motivoCfopDoItem(item: ItemRevisao): string | null {
    if (!item.incluir) return null;
    return motivoCfopIncompativel(item.cfop_padrao, item.cst_ou_csosn, regime);
  }

  const motivosCfop = (itens ?? []).map(motivoCfopDoItem);

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
    <Modal
      titulo="Importar produtos por foto ou PDF da nota fiscal"
      descricao="Escolha uma ou mais fotos e/ou PDFs (pode ser mais de uma nota junto) — a IA lê e preenche os campos fiscais de cada item. Revise antes de cadastrar."
      largura="5xl"
      onFechar={onFechar}
    >
      {erro && <AvisoDeErro className="mb-4">{erro}</AvisoDeErro>}

      {itens === null && (
        <div className="space-y-4">
          <label className="sakura-rotulo">
            Fotos ou PDFs das notas
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
              className="sakura-campo h-auto! py-2! text-corpo file:mr-3 file:rounded-lg file:border-0 file:bg-passar file:px-3 file:py-1.5 file:text-rotulo file:font-medium file:text-texto"
            />
          </label>
          {arquivos.length > 0 && (
            <p className="text-corpo text-texto-2">
              {arquivos.length} arquivo(s) selecionado(s).
            </p>
          )}
          {semConexao && (
            <AvisoDeAtencao role="status">
              Sem internet não dá pra ler a nota por foto: a leitura é feita na nuvem.
            </AvisoDeAtencao>
          )}
          <div className="flex justify-end gap-3">
            <Botao variante="fantasma" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao
              variante="principal"
              onClick={handleLer}
              disabled={arquivos.length === 0}
              ocupado={lendo}
            >
              {lendo ? "Lendo..." : "Ler arquivos"}
            </Botao>
          </div>
        </div>
      )}

      {itens !== null && (
        <form onSubmit={handleCadastrar} className="space-y-4">
          {/* Aviso, não tranca: dá pra cadastrar assim mesmo e acertar
              depois em Estoque → Produtos. Só evita a surpresa de descobrir
              isso lá na frente, na recusa da SEFAZ. */}
          {itensComCodigoIncompativel.length > 0 && (
            <AvisoDeAtencao>
              {itensComCodigoIncompativel.length === 1
                ? "Um produto está"
                : `${itensComCodigoIncompativel.length} produtos estão`}{" "}
              sem um <strong>{regimeUsaCsosn(regime) ? "CSOSN" : "CST"}</strong> que sirva pra
              sua loja — a coluna <strong>CST/CSOSN</strong> da tabela é editável, dá pra
              preencher aqui mesmo. Sem isso, a nota fiscal dessas peças vai ser recusada
              quando você for emitir.
            </AvisoDeAtencao>
          )}

          {itens.length === 0 ? (
            <p className="text-corpo text-texto-2">
              Não consegui identificar nenhum produto nessas fotos.
            </p>
          ) : (
            <div className="sakura-card overflow-x-auto">
              <table className="sakura-tabela min-w-[1100px]">
                <thead>
                  <tr>
                    <th className="relative">
                      <span className="sr-only">Incluir</span>
                    </th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>NCM</th>
                    <th>CEST</th>
                    <th>CFOP</th>
                    <th>Origem</th>
                    <th>CST/CSOSN</th>
                    <th>ICMS %</th>
                    <th>Un.</th>
                    <th>Custo</th>
                    <th>Qtde.</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, indice) => (
                    <tr key={indice}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.incluir}
                          onChange={(e) =>
                            atualizarItem(indice, { incluir: e.target.checked })
                          }
                        />
                      </td>
                      <td>
                        <CelulaTexto
                          valor={item.descricao}
                          onChange={(v) => atualizarItem(indice, { descricao: v })}
                          largura="w-48!"
                        />
                        {motivosCfop[indice] && (
                          <p className="mt-1 w-48 rounded-lg bg-atencao/[0.12] px-2 py-1 text-rotulo text-atencao">
                            <strong>CFOP:</strong> {motivosCfop[indice]}. A coluna CFOP é
                            editável; sem acertar, a nota dessa peça pode ser recusada.
                          </p>
                        )}
                      </td>
                      <td>
                        <Combobox
                          className="w-28"
                          tamanho="filtro"
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
                      <td>
                        <CelulaTexto
                          valor={item.ncm ?? ""}
                          onChange={(v) => atualizarItem(indice, { ncm: v })}
                          largura="w-20!"
                        />
                      </td>
                      <td>
                        <CelulaTexto
                          valor={item.cest ?? ""}
                          onChange={(v) => atualizarItem(indice, { cest: v })}
                          largura="w-20!"
                        />
                      </td>
                      <td>
                        <CelulaTexto
                          valor={item.cfop_padrao ?? ""}
                          onChange={(v) => atualizarItem(indice, { cfop_padrao: v })}
                          largura="w-16!"
                        />
                      </td>
                      <td>
                        <select
                          value={item.origem ?? ""}
                          onChange={(e) =>
                            atualizarItem(indice, { origem: e.target.value || null })
                          }
                          className="sakura-campo sakura-campo-filtro w-16! px-1.5!"
                        >
                          <option value="">—</option>
                          {OPCOES_ORIGEM.map((opcao) => (
                            <option key={opcao.valor} value={opcao.valor}>
                              {opcao.valor}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <CelulaTexto
                          valor={item.cst_ou_csosn ?? ""}
                          onChange={(v) => atualizarItem(indice, { cst_ou_csosn: v })}
                          largura="w-16!"
                        />
                      </td>
                      <td>
                        <CelulaNumero
                          valor={item.aliquota_icms}
                          onChange={(v) => atualizarItem(indice, { aliquota_icms: v })}
                          largura="w-16!"
                        />
                      </td>
                      <td>
                        <CelulaTexto
                          valor={item.unidade ?? ""}
                          onChange={(v) => atualizarItem(indice, { unidade: v })}
                          largura="w-14!"
                        />
                      </td>
                      <td>
                        <CelulaNumero
                          valor={item.preco_custo}
                          onChange={(v) => atualizarItem(indice, { preco_custo: v })}
                          largura="w-20!"
                        />
                      </td>
                      <td>
                        <CelulaNumero
                          valor={item.quantidade}
                          onChange={(v) => atualizarItem(indice, { quantidade: v })}
                          largura="w-16!"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Botao variante="fantasma" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="principal"
              disabled={quantidadeSelecionada === 0}
              ocupado={salvando}
            >
              {salvando
                ? "Cadastrando..."
                : `Cadastrar ${quantidadeSelecionada} produto(s)`}
            </Botao>
          </div>
        </form>
      )}
    </Modal>
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
      className={`sakura-campo sakura-campo-filtro px-2! ${largura}`}
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
      className={`sakura-campo sakura-campo-filtro px-2! ${largura}`}
    />
  );
}
