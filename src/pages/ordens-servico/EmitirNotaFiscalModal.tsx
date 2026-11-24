import { useEffect, useRef, useState } from "react";
import { valoresParaGuardar, type ValoresGuardadosDaNota } from "@/schemas/reciboNotaFiscal";
import { useConexao } from "@/hooks/useConexao";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { buscarClienteEVeiculoDaOrdem } from "@/lib/clientes";
import { buscarConfiguracaoFiscal, confirmarAliquotaCompetencia } from "@/lib/configuracoes";
import { AvisoAliquotaCompetencia } from "@/components/AvisoAliquotaCompetencia";
import { avisoAliquotaCompetencia } from "@/schemas/aliquotaCompetencia";
import { avisoLimiteNFCeSemDestinatario } from "@/schemas/limiteNFCe";
import {
  avisoLimiteDepoisDaRecusa,
  ehRejeicaoDeDestinatario,
  fraseRejeicaoDeDestinatario,
  mensagemCruaDaRejeicao,
  textoParaCopiarOErro,
} from "@/schemas/rejeicaoNFCe";
import { extensaoDaNota } from "@/schemas/danfe";
import { mensagemDeErro } from "@/lib/errors";
import {
  baixarArquivoNota,
  consultarNFCe,
  consultarNFSe,
  destinatarioIdentificadoNFCe,
  emitirNFCe,
  emitirNFSe,
  EsperaVencidaError,
  refPertenceAOrdem,
  valorTotalNFCe,
  type PagamentoParaNota,
} from "@/lib/focusNfe";
import { listarMovimentosCaixaPorOrdem } from "@/lib/caixa";
import { salvarArquivoEmitido } from "@/lib/notasFiscais";
import { cadastrarPecaDoItem } from "@/lib/ordensServico";
import { AVISO_PECA_SOBROU } from "./escolhasAvulsas";
import { buscarDadosFiscaisDasPecas, listarPecasJanela } from "@/lib/pecas";
import {
  itensQueImpedemNFCe,
  MENSAGEM_PECA_PRECISA_CADASTRO,
  MENSAGEM_PECA_SEM_NCM,
  ratearPagamentos,
} from "@/schemas/faturamento";
import { pecasAvulsas } from "@/schemas/orcamento";
import { resumoDosServicos } from "@/schemas/discriminacaoNFSe";
import { motivoCfopIncompativel, motivoCodigoIncompativel } from "@/schemas/tributacao";
import { ehConsumidor, type Cliente } from "@/types/cliente";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { RespostaFocusNfe } from "@/types/focusNfe";
import type { ItemOS, OrdemServico } from "@/types/os";
import { totalPorTipo } from "@/types/os";
import type { PecaDadosFiscais, PecaJanela } from "@/types/peca";
import { CadastroPecaAvulsaModal } from "./CadastroPecaAvulsaModal";
import { AvisoDeAtencao, AvisoDeCerto, AvisoDeErro } from "@/components/Aviso";

interface EmitirNotaFiscalModalProps {
  ordem: OrdemServico;
  tipoNota: "NFC-e" | "NFS-e";
  onFechar: () => void;
  onEmitido: () => void;
  /**
   * Uma peça avulsa ganhou cadastro por aqui (#655): quem abriu a janela
   * recarrega a OS, senão ela continuaria mostrando a peça como avulsa.
   */
  onItensMudaram?: () => void | Promise<void>;
}

// Venda de balcão de autocenter é sempre presencial/à vista do lado da nota
// — quando não há lançamento de Caixa vinculado (faturamento "a receber
// depois"), não dá pra saber o meio de pagamento real ainda, então cai num
// código genérico ("99" — Outros) só pra não travar a emissão.
//
// O lançamento de Caixa cobre a OS inteira (peça + serviço juntos), mas a
// NFC-e representa só a parte de peça — por isso o valor de cada forma de
// pagamento é rateado proporcionalmente, senão o total pago informado fica
// maior que o total da nota e a SEFAZ rejeita por falta de "troco".
async function buscarPagamentosParaNota(
  ordemId: string,
  totalNota: number,
): Promise<PagamentoParaNota[]> {
  const movimentos = await listarMovimentosCaixaPorOrdem(ordemId);
  const pagamentos = ratearPagamentos(
    movimentos.map((m) => ({
      formaPagamento: m.forma_pagamento ?? "outros",
      valor: m.valor,
    })),
    totalNota,
  );

  // Sem lançamento de Caixa vinculado (faturamento "a receber depois"), não
  // há forma de pagamento real pra informar — cai no código genérico.
  return pagamentos.length > 0 ? pagamentos : [{ formaPagamento: "outros", valor: totalNota }];
}

// A nota voltou recusada: leva a resposta junto, pra janela reconhecer a
// rejeição do destinatário (#1112) sem depender da frase.
class NotaRecusadaError extends Error {
  constructor(
    message: string,
    public resposta: RespostaFocusNfe,
  ) {
    super(message);
    this.name = "NotaRecusadaError";
  }
}

// A Focus NFe responde 200 mesmo quando a SEFAZ/prefeitura recusa a nota —
// só "autorizado" é sucesso de verdade.
function erroDaResposta(resposta: RespostaFocusNfe): NotaRecusadaError {
  const mensagensErros = (resposta.erros ?? [])
    .map((e) => (e.campo ? `${e.campo}: ${e.mensagem}` : e.mensagem))
    .filter((m): m is string => Boolean(m))
    .join(" | ");
  return new NotaRecusadaError(
    resposta.mensagem_sefaz ??
      (mensagensErros || undefined) ??
      resposta.mensagem ??
      `A nota voltou com status "${resposta.status}".`,
    resposta,
  );
}

// A SEFAZ recusou o CPF/CNPJ do destinatário? Pela resposta que voltou na
// consulta, ou pelo corpo do erro quando a Focus recusou na hora (#1112).
function rejeicaoDeDestinatario(erro: unknown): RespostaFocusNfe | null {
  const resposta =
    erro instanceof NotaRecusadaError
      ? erro.resposta
      : erro && typeof erro === "object"
        ? (erro as { corpo?: unknown }).corpo
        : null;
  return ehRejeicaoDeDestinatario(resposta) ? (resposta as RespostaFocusNfe) : null;
}

export function EmitirNotaFiscalModal({
  ordem,
  tipoNota,
  onFechar,
  onEmitido,
  onItensMudaram,
}: EmitirNotaFiscalModalProps) {
  // #374: aviso perto do botão; o botão continua clicável (aviso, nunca tranca).
  const { semConexao } = useConexao();
  const { operador, lojaAtual } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [emitindo, setEmitindo] = useState(false);
  const [erro, setErro] = useState("");
  const [configuracaoFiscal, setConfiguracaoFiscal] = useState<ConfiguracaoFiscalLoja | null>(null);
  // A configuração não veio (ex.: sem internet): não dá pra dizer que falta o token (#374).
  const [configuracaoNaoVeio, setConfiguracaoNaoVeio] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pecasDaNota, setPecasDaNota] = useState<PecaDadosFiscais[]>([]);
  // O cadastro inteiro da loja, só pro aviso de "peça parecida" no cadastro
  // de uma peça avulsa (#655).
  const [cadastroDaLoja, setCadastroDaLoja] = useState<PecaJanela[]>([]);
  // Peças avulsas que ganharam cadastro nesta janela (id do item → id da
  // peça): a `ordem` que chega por prop só se atualiza quando o pai recarrega.
  const [vinculadas, setVinculadas] = useState<Record<string, string>>({});
  const [itemCadastrando, setItemCadastrando] = useState<ItemOS | null>(null);
  const [avisosEstoqueInicial, setAvisosEstoqueInicial] = useState<Record<string, string>>({});
  const [codigoMunicipioCliente, setCodigoMunicipioCliente] = useState("");
  const [resultado, setResultado] = useState<RespostaFocusNfe | null>(null);
  const [danfeUrl, setDanfeUrl] = useState<string | null>(null);
  // O tipo do arquivo da nota (PDF ou HTML, #1113): decide a extensão ao baixar.
  const [danfeTipo, setDanfeTipo] = useState("");
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [erroPreview, setErroPreview] = useState("");
  // Nota enviada cuja resposta não chegou a tempo (ver EsperaVencidaError).
  // Enquanto ela existe, o botão de emitir some: emitir de novo daria duas
  // notas pra mesma venda.
  const [refPendente, setRefPendente] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);
  // Pra nota que saiu na Focus NFe com esta janela já fechada: registra pela
  // referência que aparece no painel dela.
  const [mostrarRegistrarPorRef, setMostrarRegistrarPorRef] = useState(false);
  const [refDigitada, setRefDigitada] = useState("");
  // A SEFAZ recusou o CPF/CNPJ do cliente (#1112): no lugar do erro cru, a
  // frase de balcão e o "Emitir sem identificar o cliente".
  const [recusaDoDestinatario, setRecusaDoDestinatario] = useState<RespostaFocusNfe | null>(null);
  const [erroCopiado, setErroCopiado] = useState<"" | "copiado" | "falhou">("");
  // O último envio foi pelo "Emitir sem identificar o cliente"? O "Conferir de
  // novo" de uma nota que demorou precisa saber se ela foi com o documento.
  const ultimoEnvioSemCliente = useRef(false);
  // NFS-e: o valor e os serviços DESTE envio (#1142), pra guardar junto da
  // nota quando ela sair. Só vale pro envio feito nesta janela: o "Conferir"
  // de uma referência digitada não sabe o que foi mandado e não guarda nada.
  const valoresDoEnvio = useRef<ValoresGuardadosDaNota | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const itensDaOrdem = (ordem.itens ?? []).map((item) =>
    vinculadas[item.id] ? { ...item, peca_id: vinculadas[item.id] } : item,
  );
  const itensPeca = itensDaOrdem.filter((item) => item.tipo === "peca");
  const itensServico = itensDaOrdem.filter((item) => item.tipo === "servico");
  const totalPecas = totalPorTipo(ordem.itens ?? [], "peca");
  const totalServicos = totalPorTipo(ordem.itens ?? [], "servico");
  // O cliente (CPF ou CNPJ) sai identificado na nota? A resposta é a regra de
  // `montarDestinatarioNFCe`, sem cópia (#881).
  const clienteIdentificado = destinatarioIdentificadoNFCe(cliente);
  // Acima do limite da UF a SEFAZ costuma exigir o cliente identificado (#881).
  // Só depois de carregar o cliente: antes disso toda nota pareceria "sem CPF".
  // O mesmo total que vai na nota (cada linha arredondada antes de somar).
  const totalDaNFCe = valorTotalNFCe(
    itensPeca.map((item) => ({
      quantidade: item.quantidade,
      precoUnitario: item.preco_unitario,
      desconto: item.desconto,
    })),
  );
  const avisoLimite =
    tipoNota === "NFC-e" && cliente
      ? avisoLimiteNFCeSemDestinatario(totalDaNFCe, clienteIdentificado)
      : null;
  // O aviso do limite pra nota que vai sair SEM o cliente depois da recusa do
  // destinatário (#1112): acima do limite, a SEFAZ também recusaria.
  const avisoLimiteSemCliente = tipoNota === "NFC-e" ? avisoLimiteDepoisDaRecusa(totalDaNFCe) : null;

  // Nenhuma NFC-e sai com peça faltando nem sem NCM (#655): peça digitada sem
  // cadastro, ou cadastrada sem NCM, trava a emissão até ser resolvida aqui.
  // Só vale depois de carregar as peças — antes disso toda peça pareceria
  // "sem cadastro". Se não deu pra carregar (ex.: sem internet), também não (#374).
  const itensQueImpedem =
    tipoNota === "NFC-e" && !carregando && !configuracaoNaoVeio
      ? itensQueImpedemNFCe(itensPeca, pecasDaNota)
      : [];

  // Peça com código de ICMS que não bate com o regime da loja faz a SEFAZ
  // recusar a nota inteira, e a mensagem dela só diz o número do item
  // ("[nItem:1]"), nunca o nome da peça. Conferir aqui transforma isso num
  // aviso com nome e sobrenome, antes de gastar a viagem até a SEFAZ.
  // O CFOP que não combina com o CSOSN (5102 numa peça com CSOSN 500) também
  // faz a SEFAZ recusar, e a peça antiga pode estar assim sem nunca ter sido
  // aberta no Estoque (#968). Mesma regra da tela da peça, sem cópia.
  const regimeDaLoja = configuracaoFiscal?.regime_tributario ?? null;
  const pecasComProblemaFiscal =
    tipoNota === "NFC-e"
      ? pecasDaNota
          .map((peca) => ({
            descricao: peca.descricao,
            motivos: [
              motivoCodigoIncompativel(peca.cst_ou_csosn, regimeDaLoja),
              // O mesmo CFOP que vai na nota: sem CFOP no cadastro, a nota
              // sai com 5102 (`montarItem`, em lib/focusNfe.ts).
              motivoCfopIncompativel(peca.cfop_padrao ?? "5102", peca.cst_ou_csosn, regimeDaLoja),
            ].filter((motivo): motivo is string => motivo !== null),
          }))
          .filter((item) => item.motivos.length > 0)
      : [];

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");
      setConfiguracaoNaoVeio(false);
      try {
        // As peças vêm antes de emitir (não só na hora de montar a nota) pra
        // dar pra conferir o código de ICMS de cada uma e avisar aqui,
        // enquanto ainda dá pra corrigir — ver o aviso mais abaixo.
        const idsDasPecas = (ordem.itens ?? [])
          .filter((item) => item.tipo === "peca")
          .map((item) => item.peca_id)
          .filter((id): id is string => Boolean(id));
        const temPecaAvulsa = pecasAvulsas(ordem.itens ?? []).length > 0;

        const [config, { cliente: clienteCompleto }, pecas, cadastro] = await Promise.all([
          buscarConfiguracaoFiscal(ordem.loja_id),
          buscarClienteEVeiculoDaOrdem(ordem.id),
          buscarDadosFiscaisDasPecas(idsDasPecas),
          // Só serve ao aviso de peça parecida do cadastro da peça avulsa: sem
          // peça avulsa nem carrega (#720). Se não vier, o cadastro abre igual.
          tipoNota === "NFC-e" && temPecaAvulsa
            ? listarPecasJanela().catch((err) => {
                console.error("Erro ao carregar o cadastro de peças:", err);
                return [] as PecaJanela[];
              })
            : Promise.resolve([] as PecaJanela[]),
        ]);
        setCadastroDaLoja(cadastro);
        setConfiguracaoFiscal(config);
        setCliente(clienteCompleto);
        setPecasDaNota(pecas);
        if (clienteCompleto?.codigo_municipio) {
          setCodigoMunicipioCliente(clienteCompleto.codigo_municipio);
        }
      } catch (err) {
        setConfiguracaoNaoVeio(true);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordem.id, ordem.loja_id, ordem.cliente_id]);

  // A peça avulsa ganhou uma peça do cadastro (#655) — uma recém-cadastrada
  // ou, pelo aviso de peça parecida, uma que já existia: o item passa a
  // apontar pra ela (e baixa o estoque, se a ordem já é OS), a janela confere
  // a nota de novo e o pai recarrega a OS.
  async function aoLigarPeca(
    item: ItemOS,
    peca: PecaJanela,
    recemCadastrada: boolean,
    avisoEstoque: string | null = null,
  ) {
    setItemCadastrando(null);
    setErro("");
    // A peça foi cadastrada, mas o estoque inicial não entrou (#909): avisa,
    // sem travar a emissão, e liga a peça do mesmo jeito. Um aviso por peça:
    // ligar a próxima não apaga o da anterior.
    if (avisoEstoque) {
      setAvisosEstoqueInicial((a) => ({ ...a, [item.id]: `${peca.descricao}: ${avisoEstoque}` }));
    }
    // A peça entra na lista da loja já: se o vínculo abaixo falhar, o próximo
    // "Cadastrar agora" oferece ela pelo aviso de peça parecida, em vez de
    // cadastrar outra igual (PR #717, ponto 1).
    setCadastroDaLoja((lista) => (lista.some((p) => p.id === peca.id) ? lista : [...lista, peca]));
    const naoEntrou = recemCadastrada
      ? "A peça foi cadastrada (já está no cadastro), mas não entrou na OS"
      : "A peça não entrou na OS";
    if (!operador) {
      setErro(`${naoEntrou}: o login caiu. Entre de novo e tente outra vez.`);
      return;
    }
    try {
      // O banco liga e, se a ordem já é OS, baixa, tudo ou nada (#803): se
      // der erro, a peça NÃO ficou ligada.
      const vinculado = await cadastrarPecaDoItem(item.id, peca.id, operador.id);
      if (!vinculado) {
        // A peça que a pessoa acabou de cadastrar sobrou no cadastro (#720):
        // a tela diz, e quem decide se ela sobrou mesmo é a pessoa.
        setErro(
          recemCadastrada
            ? `${AVISO_PECA_SOBROU} Feche esta janela e abra de novo.`
            : "Este item já tinha sido ligado a uma peça do cadastro, ou foi apagado (talvez em outro " +
                "computador). Feche esta janela e abra de novo.",
        );
        return;
      }
    } catch (err) {
      console.error("Erro ao ligar a peça ao item da OS:", err);
      setErro(`${naoEntrou}: ${mensagemDeErro(err)}`);
      return;
    }
    setVinculadas((v) => ({ ...v, [item.id]: peca.id }));
    // A janela de peças não traz o NCM: os dados fiscais da peça ligada vêm
    // do banco (a nota confere o NCM e o código de ICMS deles).
    try {
      const fiscais = await buscarDadosFiscaisDasPecas([peca.id]);
      setPecasDaNota((lista) => [...lista.filter((p) => p.id !== peca.id), ...fiscais]);
    } catch (err) {
      // Sem os dados fiscais o item fica travado como "sem NCM": diz o porquê.
      setErro(`A peça foi ligada, mas não deu pra buscar o NCM dela: ${mensagemDeErro(err)}`);
    }
    // Recarregar a OS fica à parte: se falhar, a peça JÁ entrou na OS.
    try {
      await onItensMudaram?.();
    } catch (err) {
      console.error("Erro ao recarregar a OS depois de ligar a peça:", err);
      setErro(
        `${recemCadastrada ? "A peça foi cadastrada e ligada à OS" : "A peça foi ligada à OS"}, ` +
          `mas a OS não recarregou: ` +
          `${mensagemDeErro(err)}. Feche e abra a OS de novo pra ver.`,
      );
    }
  }

  // Depois de preencher o NCM de uma peça no Estoque: busca as peças de novo.
  async function conferirPecasDeNovo() {
    setErro("");
    setCarregando(true);
    try {
      const ids = itensPeca.map((item) => item.peca_id).filter((id): id is string => Boolean(id));
      setPecasDaNota(ids.length > 0 ? await buscarDadosFiscaisDasPecas(ids) : []);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }

  async function handleEmitir({ semDestinatario = false }: { semDestinatario?: boolean } = {}) {
    if (!configuracaoFiscal || !cliente || !operador || !lojaAtual) return;
    if (itensQueImpedem.length > 0) {
      setErro(MENSAGEM_PECA_PRECISA_CADASTRO);
      return;
    }
    setErro("");
    setEmitindo(true);
    ultimoEnvioSemCliente.current = semDestinatario;
    try {
      let resposta: RespostaFocusNfe;
      if (tipoNota === "NFC-e") {
        const pecas = await buscarDadosFiscaisDasPecas(
          itensPeca.map((item) => item.peca_id).filter((id): id is string => Boolean(id)),
        );
        const itens = itensPeca
          .map((item) => {
            const peca = pecas.find((p) => p.id === item.peca_id);
            // Nunca descarta a peça calado: nota sem ela sairia com valor a
            // menos (#655). A tela já trava antes; esta é a última guarda.
            if (!peca) throw new Error(MENSAGEM_PECA_PRECISA_CADASTRO);
            return {
              peca,
              quantidade: item.quantidade,
              precoUnitario: item.preco_unitario,
              desconto: item.desconto,
            };
          });

        if (itens.length === 0) {
          throw new Error("Esta OS não tem nenhum item de peça pra emitir NFC-e.");
        }

        const pagamentos = await buscarPagamentosParaNota(ordem.id, totalPecas);

        const dados = { ordem, itens, cliente, pagamentos, configuracaoFiscal };
        // Sem a opção, a chamada é a mesma de sempre (#1112).
        resposta = semDestinatario
          ? await emitirNFCe(dados, { semDestinatario: true })
          : await emitirNFCe(dados);
      } else {
        if (itensServico.length === 0) {
          throw new Error("Esta OS não tem nenhum item de serviço pra emitir NFS-e.");
        }
        if (!codigoMunicipioCliente.trim()) {
          throw new Error("Informe o código do município do cliente pra emitir a NFS-e.");
        }

        // Resumo da OS, uma linha por serviço (#1040); a frase dos tributos
        // aproximados entra no fim, em lib/focusNfe.ts.
        const discriminacao = resumoDosServicos(itensServico, totalServicos);
        valoresDoEnvio.current = valoresParaGuardar(itensServico);

        resposta = await emitirNFSe({
          ordem,
          discriminacao,
          valorServicos: totalServicos,
          cliente,
          codigoMunicipioCliente: codigoMunicipioCliente.trim(),
          configuracaoFiscal,
        });
      }

      await concluirEmissao(resposta);
      setRecusaDoDestinatario(null);
    } catch (err) {
      if (err instanceof EsperaVencidaError) setRefPendente(err.ref);
      mostrarErroDaEmissao(err, !semDestinatario && clienteIdentificado);
    } finally {
      setEmitindo(false);
    }
  }

  // Recusa do destinatário na NFC-e vira a frase de balcão (#1112); qualquer
  // outro erro aparece cru, como sempre (aviso, nunca tranca: se o texto da
  // SEFAZ mudar, nada piora).
  //
  // `foiComCliente`: a nota foi com o CPF/CNPJ? Se não foi, a recusa não é "a
  // SEFAZ não reconhece o documento", e oferecer "emitir sem identificar"
  // repetiria a mesma nota e a mesma recusa, em ciclo.
  function mostrarErroDaEmissao(err: unknown, foiComCliente: boolean) {
    // Erro que não é resposta da Focus (ex.: a internet caiu antes de pedir a
    // nota): a recusa que está na tela continua valendo, e o botão também.
    const respostaDaFocus =
      err instanceof NotaRecusadaError ||
      Boolean(err && typeof err === "object" && (err as { corpo?: unknown }).corpo);
    if (recusaDoDestinatario && !respostaDaFocus && !(err instanceof EsperaVencidaError)) {
      setErro(mensagemDeErro(err));
      return;
    }
    const recusa = tipoNota === "NFC-e" && foiComCliente ? rejeicaoDeDestinatario(err) : null;
    setRecusaDoDestinatario(recusa);
    setErroCopiado("");
    setErro(recusa ? "" : mensagemDeErro(err));
  }

  async function copiarOErro() {
    if (!recusaDoDestinatario) return;
    try {
      await navigator.clipboard.writeText(
        textoParaCopiarOErro(recusaDoDestinatario, recusaDoDestinatario.ref, cliente),
      );
      setErroCopiado("copiado");
    } catch {
      setErroCopiado("falhou");
    }
  }

  // Tudo o que vem depois da nota autorizada — vale tanto pra emissão que
  // respondeu na hora quanto pra nota conferida depois pela referência.
  async function concluirEmissao(resposta: RespostaFocusNfe) {
    if (!configuracaoFiscal || !operador || !lojaAtual) return;
    if (resposta.status !== "autorizado") throw erroDaResposta(resposta);

    // Daqui em diante a nota JÁ ESTÁ autorizada na SEFAZ/prefeitura. Se o
    // registro dela aqui falhar, a janela fica no "Conferir de novo" (que
    // consulta pela `ref` e registra) — nunca volta pro "Confirmar emissão",
    // que daria duas notas pra mesma venda. Tentar de novo é seguro: o
    // salvarArquivoEmitido apaga o arquivo se o registro não entrar.
    try {
      await salvarArquivoEmitido({
        tipo: tipoNota === "NFC-e" ? "nfe" : "nfse",
        resposta,
        ordemServicoId: ordem.id,
        operadorId: operador.id,
        lojaId: lojaAtual.id,
        valores: tipoNota === "NFS-e" ? valoresDoEnvio.current : null,
      });
    } catch (erroAoSalvar) {
      if (!resposta.ref) throw erroAoSalvar;
      setRefPendente(resposta.ref);
      // A nota saiu: a recusa de antes (#1112) não vale mais, só o "Conferir de novo".
      setRecusaDoDestinatario(null);
      throw new Error(
        "A nota saiu autorizada, mas não consegui registrá-la aqui no sistema " +
          `(${mensagemDeErro(erroAoSalvar)}) — não emita de novo. Clique em "Conferir de novo" ` +
          "pra registrar.",
      );
    }

    setResultado(resposta);
    onEmitido();

    if (tipoNota === "NFS-e") {
      try {
        await confirmarAliquotaCompetencia(lojaAtual.id, avisoAliquota.competencia);
      } catch (erroAliquota) {
        // Falhar aqui não estraga nada: a nota já saiu. No pior caso o
        // aviso do Início continua aparecendo até ela clicar em "Já
        // cadastrei" — nunca o contrário.
        console.error("Erro ao marcar a alíquota da competência como cadastrada:", erroAliquota);
      }
    }

    if (resposta.caminho_danfe && resposta.ref) {
      setCarregandoPreview(true);
      try {
        const blob = await baixarArquivoNota(
          configuracaoFiscal.loja_id,
          tipoNota === "NFC-e" ? "nfce" : "nfse",
          resposta.ref,
          "danfe",
        );
        setDanfeTipo(blob.type);
        setDanfeUrl(URL.createObjectURL(blob));
      } catch (erroPreviewCapturado) {
        setErroPreview(mensagemDeErro(erroPreviewCapturado));
      } finally {
        setCarregandoPreview(false);
      }
    }
  }

  // Pergunta de novo à Focus NFe por uma nota já enviada. Autorizada, ela é
  // registrada como se tivesse respondido na hora; ainda processando, nada
  // muda; recusada, a referência é esquecida e dá pra emitir de novo.
  async function conferirNota(ref: string) {
    if (!configuracaoFiscal) return;
    setErro("");
    setConferindo(true);
    try {
      const lojaId = configuracaoFiscal.loja_id;
      const consultada =
        tipoNota === "NFC-e" ? await consultarNFCe(ref, lojaId) : await consultarNFSe(ref, lojaId);
      const resposta = { ...consultada, ref: consultada.ref ?? ref };
      if (resposta.status === "processando_autorizacao") {
        setRefPendente(ref);
        setErro(
          `${tipoNota === "NFC-e" ? "A SEFAZ" : "A prefeitura"} ainda não respondeu. A nota ` +
            'continua sendo processada — espere mais um pouco e clique em "Conferir de novo".',
        );
        return;
      }
      if (resposta.status !== "autorizado") {
        setRefPendente(null);
        throw erroDaResposta(resposta);
      }
      await concluirEmissao(resposta);
      setRefPendente(null);
      setRecusaDoDestinatario(null);
    } catch (err) {
      mostrarErroDaEmissao(err, clienteIdentificado && !ultimoEnvioSemCliente.current);
    } finally {
      setConferindo(false);
    }
  }

  function handleRegistrarPorRef() {
    const ref = refDigitada.trim();
    valoresDoEnvio.current = null;
    const tipo = tipoNota === "NFC-e" ? "nfce" : "nfse";
    if (ordem.numero === null || !refPertenceAOrdem(ref, ordem.numero, tipo)) {
      setErro(
        `Essa referência não é de uma ${tipoNota} da OS ${ordem.numero}. No painel da Focus ` +
          `NFe, ela fica na coluna "Referência" e começa com "os${ordem.numero}-${tipo}-"` +
          (tipo === "nfse" ? ` (ou "os${ordem.numero}-nfsen-", na nota pelo Padrão Nacional).` : "."),
      );
      return;
    }
    conferirNota(ref);
  }

  useEffect(() => {
    return () => {
      if (danfeUrl) URL.revokeObjectURL(danfeUrl);
    };
  }, [danfeUrl]);

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  function handleBaixarPdf() {
    if (!danfeUrl) return;
    const link = document.createElement("a");
    link.href = danfeUrl;
    link.download = `${tipoNota}-${resultado?.numero ?? resultado?.ref ?? "nota"}.${extensaoDaNota(danfeTipo)}`;
    link.click();
  }

  const focusNfeConfigurado = Boolean(configuracaoFiscal?.focus_nfe_configurado);

  // Esta SIM tranca (#655): peça sem cadastro ou sem NCM não sai na NFC-e, e a SEFAZ não aceita nota sem NCM.
  // Aparece mesmo sem o token do Focus NFe (#742): a loja vê as duas pendências de uma vez.
  const quadroDasPecasQueImpedem = itensQueImpedem.length > 0 && (
    <AvisoDeAtencao className="text-rotulo">
      <p>
        <strong>Esta nota não pode sair ainda.</strong>
      </p>
      <ul className="mt-1 space-y-2">
        {itensQueImpedem.map(({ item, motivo }) => (
          <li key={item.id} className="space-y-1">
            <p>
              <strong>{item.descricao}</strong> —{" "}
              {motivo === "avulsa" ? MENSAGEM_PECA_PRECISA_CADASTRO : MENSAGEM_PECA_SEM_NCM}
            </p>
            {motivo === "avulsa" ? (
              <button
                type="button"
                onClick={() => setItemCadastrando(item)}
                className="rounded-lg border border-atencao/50 px-3 py-1 font-medium text-atencao hover:bg-atencao/[0.2]"
              >
                Cadastrar agora
              </button>
            ) : (
              <>
                <p>
                  Abra Estoque → Produtos, edite a peça e preencha o NCM. Depois volte aqui.
                </p>
                <button
                  type="button"
                  onClick={conferirPecasDeNovo}
                  className="rounded-lg border border-atencao/50 px-3 py-1 font-medium text-atencao hover:bg-atencao/[0.2]"
                >
                  Já preenchi, conferir de novo
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </AvisoDeAtencao>
  );
  const avisoAliquota = avisoAliquotaCompetencia(configuracaoFiscal);

  return (
    <>
    <Modal titulo={`Emitir ${tipoNota}`} onFechar={onFechar}>
      {carregando && <p className="text-corpo text-texto-2">Carregando...</p>}

      {!carregando && erro && (
        <AvisoDeErro className="mb-3 text-corpo">{erro}</AvisoDeErro>
      )}

      {/* #1112: a SEFAZ recusou o CPF/CNPJ do cliente. Amarelo, não vermelho:
          não é erro da loja (o cadastro pode estar certo, e o CNPJ só ainda
          não chegou na base da SEFAZ). A rejeição crua fica embaixo, menor,
          pra quem for falar com o suporte. */}
      {!carregando && !resultado && recusaDoDestinatario && (
        <AvisoDeAtencao role="alert" className="mb-3 text-corpo">
          <p className="font-medium">{fraseRejeicaoDeDestinatario(cliente)}</p>
          <div className="mt-2 text-rotulo text-texto-2">
            <p className="font-medium">Detalhe da SEFAZ</p>
            <p className="break-words">{mensagemCruaDaRejeicao(recusaDoDestinatario)}</p>
            <button
              type="button"
              onClick={copiarOErro}
              className="mt-1 min-h-10 underline hover:text-texto"
            >
              Copiar o erro
            </button>
            {erroCopiado === "copiado" && (
              <span role="status" className="ml-2">
                Copiado, sem o nome e o documento do cliente.
              </span>
            )}
            {erroCopiado === "falhou" && (
              <span role="status" className="ml-2">
                Não deu pra copiar: tire um print desta janela.
              </span>
            )}
          </div>
        </AvisoDeAtencao>
      )}

      {!carregando &&
        Object.entries(avisosEstoqueInicial).map(([itemId, aviso]) => (
          <AvisoDeAtencao key={itemId} className="mb-3 text-corpo">
            {aviso}
          </AvisoDeAtencao>
        ))}

      {/* #374: aviso, nunca tranca; aparece mesmo quando a configuração não veio. */}
      {!carregando && !resultado && semConexao && (
        <AvisoDeAtencao role="status" className="mb-3 text-rotulo">
          Sem internet a nota não sai: a SEFAZ e a prefeitura precisam receber. Espere a conexão
          voltar pra emitir.
        </AvisoDeAtencao>
      )}

      {!carregando && !resultado && !configuracaoNaoVeio && !focusNfeConfigurado && (
        <div className="space-y-3">
          <AvisoDeAtencao className="text-corpo">
            Falta cadastrar o token do Focus NFe (e os dados fiscais da loja) em Configurações →
            "Dados fiscais da loja" antes de emitir.
          </AvisoDeAtencao>
          {quadroDasPecasQueImpedem}
        </div>
      )}

      {!carregando && !resultado && focusNfeConfigurado && (
        <div className="space-y-3 text-corpo">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-cartao/60 p-3">
            <div>
              <p className="text-rotulo text-texto/85">Cliente</p>
              <p className="font-medium text-texto">{ordem.cliente?.nome ?? "—"}</p>
            </div>
            <div>
              <p className="text-rotulo text-texto/85">
                {tipoNota === "NFC-e" ? "Total de peças" : "Total de serviços"}
              </p>
              <p className="font-medium text-texto">
                {(tipoNota === "NFC-e" ? totalPecas : totalServicos).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          </div>

          {tipoNota === "NFS-e" && (
            <label className="flex flex-col gap-1 text-rotulo text-texto/90">
              Código da cidade do cliente (IBGE)
              <input
                value={codigoMunicipioCliente}
                onChange={(e) => setCodigoMunicipioCliente(e.target.value)}
                placeholder={cliente ? `${cliente.cidade ?? ""}/${cliente.uf ?? ""}` : ""}
                className="w-full rounded-lg border border-borda-campo px-3 py-2 text-corpo text-texto focus:border-acao"
              />
            </label>
          )}

          {/* A NFC-e já sabe identificar destinatário pessoa jurídica pelo
              CNPJ. O que ela não tem como adivinhar é um CNPJ faltando ou
              incompleto no cadastro do cliente: nesse caso a nota sai como
              "consumidor não identificado" — válido, mas o cliente não usa
              essa nota no crédito dele, e acima de R$10 mil a SEFAZ passa a
              exigir a identificação (o aviso do limite logo abaixo, #881). Melhor ela saber disso antes de emitir
              do que descobrir depois. */}
          {tipoNota === "NFC-e" && cliente?.tipo_pessoa === "juridica" && !clienteIdentificado && (
            <AvisoDeAtencao className="text-rotulo">
              Este cliente é pessoa jurídica, mas está <strong>sem o CNPJ no cadastro</strong> —
              a nota vai sair como consumidor não identificado. Se ele precisa da nota no nome da
              empresa, cadastre o CNPJ dele em Clientes antes de emitir.
            </AvisoDeAtencao>
          )}

          {/* Aviso, nunca tranca (docs/licoes.md, item 33): pessoa física sem CPF
              completo no cadastro sai como "consumidor não identificado", sem o
              nome dela. A regra é a de `destinatarioIdentificadoNFCe`, sem cópia
              (#881, #950). "Consumidor" e venda sem cliente não avisam: ali não
              identificado é o esperado. */}
          {tipoNota === "NFC-e" &&
            cliente?.tipo_pessoa === "fisica" &&
            !ehConsumidor(cliente.id) &&
            !clienteIdentificado && (
              <AvisoDeAtencao className="text-rotulo">
                Este cliente está <strong>sem o CPF completo no cadastro</strong>: a nota vai sair
                como consumidor não identificado, sem o nome dele. Se ele quer a nota no nome dele,
                cadastre o CPF (11 números) em Clientes antes de emitir.
              </AvisoDeAtencao>
            )}

          {/* Aviso, nunca tranca (#881): o limite pode mudar por UF e por
              legislação, e quem decide é a SEFAZ. */}
          {avisoLimite && (
            <AvisoDeAtencao className="text-rotulo">
              {avisoLimite}
            </AvisoDeAtencao>
          )}

          {quadroDasPecasQueImpedem}

          {/* Aviso, nunca tranca: a lista de códigos válidos envelhece com
              mudança de legislação, e barrar a emissão por causa de um
              palpite daqui seria pior que deixar a SEFAZ decidir (mesma lição
              do item 33 do PROJETO_STATUS.md). O botão de emitir continua
              liberado. */}
          {pecasComProblemaFiscal.length > 0 && (
            <AvisoDeAtencao className="text-rotulo">
              <p>
                <strong>
                  {pecasComProblemaFiscal.length === 1
                    ? "Uma peça desta nota está"
                    : `${pecasComProblemaFiscal.length} peças desta nota estão`}{" "}
                  com o código de ICMS ou o CFOP que a SEFAZ não aceita pra sua loja
                </strong>{" "}
                — provavelmente a nota vai ser recusada. Dá pra corrigir em Estoque → Produtos →
                Editar, e emitir depois.
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {pecasComProblemaFiscal.map((peca) => (
                  <li key={peca.descricao}>
                    <strong>{peca.descricao}</strong> — {peca.motivos.join("; ")}.
                  </li>
                ))}
              </ul>
            </AvisoDeAtencao>
          )}

          {/* A prefeitura recusa a primeira NFS-e do mês enquanto a alíquota
              daquela competência não estiver cadastrada no portal dela. Aqui
              é só o lembrete — quem resolve é o portal, e o botão "Já
              cadastrei" fica no Início, onde ela vê antes de precisar. */}
          {tipoNota === "NFS-e" && <AvisoAliquotaCompetencia aviso={avisoAliquota} />}

          {/* #1112: o que muda ao emitir sem identificar, junto do botão. */}
          {recusaDoDestinatario && (
            <div className="space-y-2 text-rotulo text-texto/90">
              <p>
                A nota sai como consumidor não identificado. Ela vale normalmente, mas o cliente
                não vai ter a nota no nome {cliente?.tipo_pessoa === "fisica" ? "dele" : "da empresa"}.
              </p>
              {/* Acima do limite da UF, a nota sem o cliente também seria
                  recusada (#881). Aviso, não tranca. */}
              {avisoLimiteSemCliente && (
                <AvisoDeAtencao className="text-rotulo">{avisoLimiteSemCliente}</AvisoDeAtencao>
              )}
              {/* A NF-e modelo 55 ainda não existe no sistema (#409): só o texto. */}
              {cliente?.tipo_pessoa === "juridica" && (
                <p>
                  Se ele precisa da nota no nome da empresa, o documento certo é a NF-e (modelo
                  55), que o sistema ainda não emite. Fale com quem cuida do sistema.
                </p>
              )}
            </div>
          )}

          <AvisoDeAtencao className="text-rotulo">
            {configuracaoFiscal?.focus_nfe_ambiente === "homologacao"
              ? "Ambiente de homologação — esta nota é só de teste, sem valor fiscal."
              : "Ambiente de produção — esta nota será emitida de verdade."}
          </AvisoDeAtencao>

          {refPendente && (
            <p className="break-all text-rotulo text-texto-2">
              Referência da nota na Focus NFe: {refPendente}
            </p>
          )}

          {/* Nota que saiu na Focus NFe quando esta janela já estava
              fechada (ou o programa foi reiniciado): sem isto, o único
              caminho era o upload manual do XML, que perde a referência — e
              com ela o "Ver PDF" e o cancelamento por aqui. */}
          {!refPendente && !recusaDoDestinatario && (
            <div className="text-rotulo">
              {!mostrarRegistrarPorRef ? (
                <button
                  type="button"
                  onClick={() => setMostrarRegistrarPorRef(true)}
                  className="text-texto/85 underline hover:text-texto"
                >
                  A nota já saiu na Focus NFe, mas não apareceu aqui?
                </button>
              ) : (
                <div className="space-y-2 rounded-lg bg-cartao/60 p-3">
                  <label className="flex flex-col gap-1 text-texto/90">
                    Referência da nota no painel da Focus NFe (coluna "Referência")
                    <input
                      value={refDigitada}
                      onChange={(e) => setRefDigitada(e.target.value)}
                      placeholder={`os${ordem.numero}-${tipoNota === "NFC-e" ? "nfce" : "nfse"}-...`}
                      className="w-full rounded-lg border border-borda-campo px-3 py-2 text-corpo text-texto focus:border-acao"
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRegistrarPorRef}
                      disabled={conferindo || !refDigitada.trim()}
                      className="rounded-xl border border-linha-forte px-4 py-2 text-corpo font-medium text-texto hover:bg-passar disabled:opacity-50"
                    >
                      {conferindo ? "Conferindo..." : "Registrar esta nota"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="min-h-10 rounded-xl px-4 py-2 text-corpo font-medium text-texto/90 hover:bg-passar"
            >
              {refPendente ? "Fechar" : "Cancelar"}
            </button>
            {refPendente ? (
              <button
                type="button"
                onClick={() => conferirNota(refPendente)}
                disabled={conferindo}
                className="rounded-xl bg-acao px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
              >
                {conferindo ? "Conferindo..." : "Conferir de novo"}
              </button>
            ) : recusaDoDestinatario ? (
              // O "Confirmar emissão" some: ele só repetiria a recusa (#1112).
              <button
                type="button"
                onClick={() => handleEmitir({ semDestinatario: true })}
                disabled={emitindo || conferindo || itensQueImpedem.length > 0}
                className="min-h-12 rounded-xl bg-acao px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
              >
                {emitindo ? "Emitindo..." : "Emitir sem identificar o cliente"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleEmitir()}
                disabled={emitindo || conferindo || itensQueImpedem.length > 0}
                className="rounded-xl bg-acao px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
              >
                {emitindo ? "Emitindo..." : "Confirmar emissão"}
              </button>
            )}
          </div>
        </div>
      )}

      {resultado && (
        <div className="space-y-3 text-corpo">
          <AvisoDeCerto>
            {tipoNota} emitida com sucesso — número {resultado.numero ?? "—"}.
          </AvisoDeCerto>
          {resultado.chave_nfe && (
            <p className="break-all text-rotulo text-texto-2">Chave: {resultado.chave_nfe}</p>
          )}

          {carregandoPreview && (
            <p className="text-corpo text-texto-2">Gerando pré-visualização do PDF...</p>
          )}

          {!carregandoPreview && erroPreview && (
            <AvisoDeAtencao className="text-rotulo">
              A nota foi emitida e o XML já está salvo em Notas Fiscais, mas não deu pra carregar a
              pré-visualização do PDF: {erroPreview}
            </AvisoDeAtencao>
          )}

          {!carregandoPreview && !erroPreview && !resultado.caminho_danfe && (
            <AvisoDeAtencao className="text-rotulo">
              A nota foi emitida e o XML já está salvo em Notas Fiscais — esse tipo de nota não
              trouxe um PDF de pré-visualização.
            </AvisoDeAtencao>
          )}

          {danfeUrl && (
            <iframe
              ref={iframeRef}
              title="Pré-visualização da nota fiscal"
              src={danfeUrl}
              className="h-96 w-full rounded-lg border border-linha bg-white"
            />
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-texto/90 hover:bg-passar"
            >
              OK
            </button>
            {danfeUrl && (
              <>
                <button
                  type="button"
                  onClick={handleBaixarPdf}
                  className="rounded-xl border border-linha-forte px-4 py-2 text-corpo font-medium text-texto hover:bg-passar"
                >
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="rounded-xl bg-acao px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90"
                >
                  Imprimir
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
      {itemCadastrando && (
        <CadastroPecaAvulsaModal
          item={itemCadastrando}
          pecas={cadastroDaLoja}
          lojaId={ordem.loja_id}
          onCadastrada={(peca, aviso) => aoLigarPeca(itemCadastrando, peca, true, aviso)}
          onAbrirExistente={(peca) => aoLigarPeca(itemCadastrando, peca, false)}
          onFechar={() => setItemCadastrando(null)}
        />
      )}
    </>
  );
}
