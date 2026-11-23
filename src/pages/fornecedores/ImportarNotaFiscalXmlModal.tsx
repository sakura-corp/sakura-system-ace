import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Selo } from "@/components/Selo";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { criarFornecedor } from "@/lib/fornecedores";
import { extrairNotaFiscalXml, lerTextoXml, normalizarCnpj } from "@/lib/notaFiscalXmlFornecedor";
import { buscarDadosFiscaisDasPecas, cadastrarPecaRapida } from "@/lib/pecas";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import {
  buscarPedidoDaNota,
  importarNotaFiscalCompra,
  NotaJaImportadaError,
  observacaoDaImportacao,
} from "@/lib/pedidosCompra";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  conferirParcelas,
  contasPagarDaNota,
  motivoParaNaoLancarParcelas,
  sugerirParcelas,
  totalDaNota,
  type ParcelaDaNota,
} from "@/schemas/parcelasDaNotaDeCompra";
import {
  codigoParaPecaImportada,
  csosnMaisUsado,
  motivoCfopIncompativel,
  motivoCodigoIncompativel,
  regimeUsaCsosn,
} from "@/schemas/tributacao";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { RegimeTributario } from "@/types/configuracao";
import type { Deposito } from "@/types/deposito";
import type { Fornecedor } from "@/types/fornecedor";
import type { ItemNotaFiscalXml, NotaFiscalXmlExtraida } from "@/types/notaFiscalXmlFornecedor";
import type { PecaJanela } from "@/types/peca";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

const ID_DO_FORMULARIO = "importar-nota-xml-formulario";

interface ItemRevisao extends ItemNotaFiscalXml {
  incluir: boolean;
  /** "" = cadastrar peça nova; senão, id de uma peça já existente */
  pecaId: string;
  quantidadeEditavel: number;
  precoEditavel: number;
}

interface ImportarNotaFiscalXmlModalProps {
  fornecedores: Fornecedor[];
  pecas: PecaJanela[];
  depositos: Deposito[];
  lojaId: string;
  operadorId: string | null;
  /** Quem não tem Contas a pagar não lança as parcelas (o banco recusaria). */
  podeLancarContas?: boolean;
  onFechar: () => void;
  onImportado: () => Promise<void>;
}

function encontrarPecaCorrespondente(item: ItemNotaFiscalXml, pecas: PecaJanela[]): PecaJanela | null {
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
  podeLancarContas = false,
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
  // #1020: as parcelas da nota, que viram contas a pagar. O sistema sugere
  // (das duplicatas), a pessoa confere e edita, e só então grava.
  const [parcelas, setParcelas] = useState<ParcelaDaNota[]>([]);
  const [lancarContas, setLancarContas] = useState(podeLancarContas);
  const [categoriaId, setCategoriaId] = useState("");
  const [categoriasSaida, setCategoriasSaida] = useState<CategoriaCaixa[]>([]);
  // A mesma nota (pela chave de acesso) já entrou num pedido: não importa de novo.
  const [pedidoDaNota, setPedidoDaNota] = useState<number | null>(null);
  const [naoDeuPraConferir, setNaoDeuPraConferir] = useState(false);
  // O pedido entrou, mas as contas a pagar não: o que dizer à pessoa.
  const [resultadoParcial, setResultadoParcial] = useState<string | null>(null);

  useEffect(() => {
    if (!podeLancarContas) return;
    let cancelado = false;
    listarCategoriasCaixa()
      .then((categorias) => {
        if (!cancelado) setCategoriasSaida(categorias.filter((c) => c.tipo === "saida"));
      })
      .catch((err) => console.error("Erro ao carregar as categorias de saída:", err));
    return () => {
      cancelado = true;
    };
  }, [podeLancarContas]);
  // O código de ICMS que as peças novas vão receber. Nasce com o que a loja
  // mais usa no próprio cadastro — não com o do fornecedor, que pode ser de
  // outro regime (ver `codigoParaPecaImportada`).
  // A janela de peças não traz o código fiscal: ele vem de
  // `buscarDadosFiscaisDasPecas` (#366) e só preenche se a pessoa ainda não
  // escolheu outro.
  const [codigoIcmsNovas, setCodigoIcmsNovas] = useState("");
  useEffect(() => {
    let cancelado = false;
    buscarDadosFiscaisDasPecas(pecas.map((peca) => peca.id))
      .then((fiscais) => {
        if (cancelado) return;
        const maisUsado = csosnMaisUsado(fiscais.map((f) => f.cst_ou_csosn)) ?? "";
        setCodigoIcmsNovas((atual) => atual || maisUsado);
      })
      .catch((err) => console.error("Erro ao carregar o código fiscal mais usado:", err));
    return () => {
      cancelado = true;
    };
  }, [pecas]);

  // O regime da loja decide se o código do fornecedor serve ou não. Falhar
  // aqui não pode derrubar a importação: sem regime, `codigoParaPecaImportada`
  // simplesmente mantém o comportamento antigo (copia o código da nota).
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
      setParcelas(sugerirParcelas(extraida));
      setPedidoDaNota(null);
      setNaoDeuPraConferir(false);
      if (extraida.chave_acesso) {
        try {
          const jaImportada = await buscarPedidoDaNota(extraida.chave_acesso);
          setPedidoDaNota(jaImportada?.numero ?? null);
        } catch (err) {
          // Aviso, nunca tranca: a importação confere de novo antes de gravar.
          console.error("Erro ao conferir se a nota já foi importada:", err);
          setNaoDeuPraConferir(true);
        }
      }
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

  function atualizarParcela(indice: number, mudanca: Partial<ParcelaDaNota>) {
    setParcelas((atual) => atual.map((p, i) => (i === indice ? { ...p, ...mudanca } : p)));
  }

  async function handleImportar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota || !itens || !depositoId || pedidoDaNota !== null) return;
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
          const pecaCriadaId = await cadastrarPecaRapida({
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
          pecaId = pecaCriadaId;
        }
        itensParaImportar.push({
          pecaId,
          quantidade: item.quantidadeEditavel,
          precoUnitario: item.precoEditavel,
        });
      }

      const vaiLancar = lancarContasAgora && motivoParcelas === null;
      const contas = vaiLancar
        ? contasPagarDaNota(parcelas, {
            numeroNota: nota.numero,
            fornecedorNome:
              fornecedorEncontrado?.nome ?? nota.fornecedor_nome ?? "Fornecedor sem nome",
            categoriaId,
          })
        : [];

      const resultado = await importarNotaFiscalCompra(
        fornecedorId,
        itensParaImportar,
        depositoId,
        lojaId,
        operadorId,
        observacaoDaImportacao(nota.numero, nota.chave_acesso),
        { chaveAcesso: nota.chave_acesso, contas },
      );

      await onImportado();

      // A pessoa precisa saber exatamente o que entrou e o que não entrou.
      const pedidoEntrou = `O pedido ${resultado.pedido.numero}, a entrada no estoque e a cotação foram gravados.`;
      if (resultado.erroContas) {
        setResultadoParcial(
          `${pedidoEntrou} As contas a pagar desta nota NÃO foram lançadas (${resultado.erroContas}). ` +
            "Lance as parcelas à mão em Contas a pagar; não importe a nota de novo.",
        );
        return;
      }
      if (lancarContasAgora && motivoParcelas !== null) {
        setResultadoParcial(
          `${pedidoEntrou} As contas a pagar NÃO foram lançadas: ${motivoParcelas} ` +
            "Lance as parcelas à mão em Contas a pagar.",
        );
        return;
      }
      onFechar();
    } catch (err) {
      console.error("Erro ao importar nota fiscal XML:", err);
      if (err instanceof NotaJaImportadaError) setPedidoDaNota(pedidoDaNota ?? -1);
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

  // O CFOP da nota vai pro cadastro da peça nova junto com o CSOSN que ela
  // vai receber; se os dois não combinam, a NFC-e dessa peça volta recusada
  // (#968). Só aviso: importar continua liberado, e o CFOP não é trocado.
  // Peça já cadastrada fica de fora: a importação não mexe no que ela tem.
  function motivoCfopDoItem(item: ItemRevisao): string | null {
    if (!item.incluir || item.quantidadeEditavel <= 0 || item.pecaId) return null;
    return motivoCfopIncompativel(
      item.cfop_padrao,
      codigoParaPecaImportada(item.cst_ou_csosn, regime, codigoIcmsNovas),
      regime,
    );
  }

  const motivosCfop = (itens ?? []).map(motivoCfopDoItem);

  const quantidadeSelecionada =
    itens?.filter((item) => item.incluir && item.quantidadeEditavel > 0).length ?? 0;

  const lancarContasAgora = podeLancarContas && lancarContas;
  const motivoParcelas = motivoParaNaoLancarParcelas(parcelas);
  const conferencia = nota ? conferirParcelas(parcelas, totalDaNota(nota)) : null;

  return (
    <Modal
      titulo="Importar XML de nota fiscal do fornecedor"
      descricao="O arquivo XML que o fornecedor te manda (ou que você baixa no site da Sefaz) — diferente da nota que você emite pro cliente. Cria um pedido de compra já recebido, com entrada no estoque e cotação registrados sozinhos."
      largura="4xl"
      onFechar={onFechar}
      // Os botões ficam no rodapé da janela, fora da parte que rola: numa nota
      // com muitos itens, "Importar" está sempre à vista. No segundo passo o
      // `form` liga o botão ao formulário de dentro; o que ele faz é o mesmo.
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            {resultadoParcial !== null ? "Fechar" : "Cancelar"}
          </Botao>
          {resultadoParcial !== null ? null : itens === null ? (
            <Botao variante="principal" onClick={handleLer} disabled={!arquivo} ocupado={lendo}>
              {lendo ? "Lendo..." : "Ler arquivo"}
            </Botao>
          ) : nota ? (
            <Botao
              type="submit"
              form={ID_DO_FORMULARIO}
              variante="principal"
              disabled={quantidadeSelecionada === 0 || !depositoId || pedidoDaNota !== null}
              ocupado={salvando}
            >
              {salvando ? "Importando..." : `Importar ${quantidadeSelecionada} item(ns)`}
            </Botao>
          ) : null}
        </>
      }
    >
      {erro && <AvisoDeErro className="mb-4">{erro}</AvisoDeErro>}

      {resultadoParcial !== null && <AvisoDeAtencao>{resultadoParcial}</AvisoDeAtencao>}

      {itens === null && (
        <div className="space-y-4">
          <label className="sakura-rotulo">
            Arquivo XML da nota
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="sakura-campo h-auto! py-2! text-corpo file:mr-3 file:rounded-lg file:border-0 file:bg-passar file:px-3 file:py-1.5 file:text-rotulo file:font-medium file:text-texto"
            />
          </label>
        </div>
      )}

      {itens !== null && nota && resultadoParcial === null && (
        <form id={ID_DO_FORMULARIO} onSubmit={handleImportar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-linha p-3 text-corpo">
              <span className="text-rotulo font-medium text-texto-2">Fornecedor</span>
              <p className="font-medium text-texto">
                {fornecedorEncontrado
                  ? fornecedorEncontrado.nome
                  : (nota.fornecedor_nome ?? "Sem nome no XML")}
              </p>
              {!fornecedorEncontrado && (
                <div className="mt-2">
                  <Selo tipo="atencao" palavra="Fornecedor novo" icone={UserPlus} />
                  <p className="mt-1 text-rotulo text-atencao">
                    Não achei esse CNPJ cadastrado — um fornecedor novo será criado
                    automaticamente ao importar.
                  </p>
                </div>
              )}
            </div>

            <label className="sakura-rotulo">
              <span>Depósito (onde a mercadoria entrou) <span className="text-perigo">*</span></span>
              <select
                value={depositoId}
                onChange={(e) => setDepositoId(e.target.value)}
                className="sakura-campo"
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
          {pedidoDaNota !== null && (
            <AvisoDeErro>
              Esta nota já foi importada
              {pedidoDaNota > 0 ? ` (Pedido ${pedidoDaNota})` : ""}. Importar de novo lançaria o
              estoque e as contas a pagar em dobro.
            </AvisoDeErro>
          )}
          {naoDeuPraConferir && (
            <AvisoDeAtencao>
              Não deu pra conferir se esta nota já foi importada. Se você já importou, cancele.
            </AvisoDeAtencao>
          )}

          {pecasNovasComCodigoDeOutroRegime.length > 0 && (
            <div className="space-y-3">
              <AvisoDeAtencao>
                {pecasNovasComCodigoDeOutroRegime.length === 1
                  ? "Uma peça nova desta nota vem"
                  : `${pecasNovasComCodigoDeOutroRegime.length} peças novas desta nota vêm`}{" "}
                com o código de ICMS <strong>do fornecedor</strong>, que não serve pra sua loja
                {regimeUsaCsosn(regime) ? " (Simples Nacional)" : ""}. Escolha abaixo o código
                que elas devem receber no seu cadastro — em branco, a peça fica sem código e
                você preenche depois em Estoque → Produtos.
              </AvisoDeAtencao>
              <label className="sakura-rotulo">
                {regimeUsaCsosn(regime) ? "CSOSN" : "CST"} das peças novas
                <input
                  value={codigoIcmsNovas}
                  onChange={(e) => setCodigoIcmsNovas(e.target.value)}
                  placeholder={regimeUsaCsosn(regime) ? "Ex: 500" : "Ex: 00"}
                  className="sakura-campo w-32 text-corpo"
                />
              </label>
            </div>
          )}

          {itens.length === 0 ? (
            <p className="text-corpo text-texto-2">Não encontrei nenhum item nessa nota.</p>
          ) : (
            <div className="sakura-card overflow-x-auto">
              <table className="sakura-tabela min-w-[820px]">
                <thead>
                  <tr>
                    <th className="relative">
                      <span className="sr-only">Incluir</span>
                    </th>
                    <th>Item da nota</th>
                    <th>Peça no sistema</th>
                    <th>Qtde.</th>
                    <th>Preço unit.</th>
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
                        <p className="text-texto">{item.descricao}</p>
                        <p className="text-texto-2">
                          NCM {item.ncm ?? "—"} · CFOP {item.cfop_padrao ?? "—"}
                        </p>
                        {motivosCfop[indice] && (
                          <p className="mt-1 rounded-lg bg-atencao/[0.12] px-2 py-1 text-rotulo text-atencao">
                            <strong>CFOP:</strong> {motivosCfop[indice]}. A nota fiscal dessa
                            peça pode ser recusada; dá pra importar assim e acertar depois em
                            Estoque → Produtos.
                          </p>
                        )}
                      </td>
                      <td>
                        <Combobox
                          className="w-52"
                          tamanho="filtro"
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
                      <td>
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
                          className="sakura-campo sakura-campo-filtro w-20! px-2!"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.precoEditavel}
                          onChange={(e) =>
                            atualizarItem(indice, { precoEditavel: Number(e.target.value) })
                          }
                          className="sakura-campo sakura-campo-filtro w-24! px-2!"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="space-y-3 rounded-xl border border-linha p-3">
            <h3 className="text-corpo font-medium text-texto">Contas a pagar desta nota</h3>
            {!podeLancarContas ? (
              <p className="text-rotulo text-texto-2">
                Você não tem acesso a Contas a pagar: as parcelas desta nota não serão lançadas.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <label className="flex items-center gap-2 text-corpo text-texto">
                    <input
                      type="checkbox"
                      checked={lancarContas}
                      onChange={(e) => setLancarContas(e.target.checked)}
                    />
                    Lançar em Contas a pagar
                  </label>
                  {lancarContas && (
                    <label className="sakura-rotulo">
                      Categoria
                      <select
                        value={categoriaId}
                        onChange={(e) => setCategoriaId(e.target.value)}
                        className="sakura-campo w-56"
                      >
                        <option value="">Sem categoria</option>
                        {categoriasSaida.map((categoria) => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {lancarContas && (
                  <>
                    <div className="sakura-card overflow-x-auto">
                      <table className="sakura-tabela">
                        <thead>
                          <tr>
                            <th>Parcela</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcelas.map((parcela, indice) => (
                            <tr key={indice}>
                              <td>
                                {indice + 1}/{parcelas.length}
                                {parcela.numero ? (
                                  <span className="text-texto-2"> · nº {parcela.numero}</span>
                                ) : null}
                              </td>
                              <td>
                                <input
                                  type="date"
                                  aria-label={`Vencimento da parcela ${indice + 1}`}
                                  value={parcela.vencimento}
                                  onChange={(e) =>
                                    atualizarParcela(indice, { vencimento: e.target.value })
                                  }
                                  className="sakura-campo sakura-campo-filtro w-40!"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  aria-label={`Valor da parcela ${indice + 1}`}
                                  value={parcela.valor}
                                  onChange={(e) =>
                                    atualizarParcela(indice, {
                                      valor: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="sakura-campo sakura-campo-filtro w-28! px-2!"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {conferencia && !conferencia.bate && (
                      <AvisoDeAtencao>
                        As parcelas somam {formatarMoeda(conferencia.soma)}, e a nota é de{" "}
                        {formatarMoeda(conferencia.total)} (diferença de{" "}
                        {formatarMoeda(Math.abs(conferencia.diferenca))}). Confira antes de
                        importar; dá pra lançar assim mesmo.
                      </AvisoDeAtencao>
                    )}
                    {motivoParcelas && (
                      <AvisoDeAtencao>
                        {motivoParcelas} Sem isso, as contas a pagar não serão lançadas (o
                        pedido e o estoque entram mesmo assim).
                      </AvisoDeAtencao>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </form>
      )}
    </Modal>
  );
}
