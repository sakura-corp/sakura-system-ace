import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { buscarClienteEVeiculoDaOrdem } from "@/lib/clientes";
import { buscarConfiguracaoFiscal, confirmarAliquotaCompetencia } from "@/lib/configuracoes";
import { AvisoAliquotaCompetencia } from "@/components/AvisoAliquotaCompetencia";
import { avisoAliquotaCompetencia } from "@/schemas/aliquotaCompetencia";
import { mensagemDeErro } from "@/lib/errors";
import {
  baixarArquivoNota,
  consultarNFCe,
  consultarNFSe,
  emitirNFCe,
  emitirNFSe,
  EsperaVencidaError,
  FocusNfeError,
  refPertenceAOrdem,
  type PagamentoParaNota,
} from "@/lib/focusNfe";
import { listarMovimentosCaixaPorOrdem } from "@/lib/caixa";
import { salvarArquivoEmitido } from "@/lib/notasFiscais";
import { cadastrarPecaDoItem, PecaLigadaSemEstoqueError } from "@/lib/ordensServico";
import { buscarDadosFiscaisDasPecas, listarPecasJanela } from "@/lib/pecas";
import {
  itensQueImpedemNFCe,
  MENSAGEM_PECA_PRECISA_CADASTRO,
  MENSAGEM_PECA_SEM_NCM,
  ratearPagamentos,
} from "@/schemas/faturamento";
import { motivoCodigoIncompativel } from "@/schemas/tributacao";
import type { Cliente } from "@/types/cliente";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { RespostaFocusNfe } from "@/types/focusNfe";
import type { ItemOS, OrdemServico } from "@/types/os";
import { totalPorTipo } from "@/types/os";
import type { PecaDadosFiscais, PecaJanela } from "@/types/peca";
import { CadastroPecaAvulsaModal } from "./CadastroPecaAvulsaModal";

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

// A Focus NFe responde 200 mesmo quando a SEFAZ/prefeitura recusa a nota —
// só "autorizado" é sucesso de verdade.
function erroDaResposta(resposta: RespostaFocusNfe): FocusNfeError {
  const mensagensErros = (resposta.erros ?? [])
    .map((e) => (e.campo ? `${e.campo}: ${e.mensagem}` : e.mensagem))
    .filter((m): m is string => Boolean(m))
    .join(" | ");
  return new FocusNfeError(
    resposta.mensagem_sefaz ??
      (mensagensErros || undefined) ??
      resposta.mensagem ??
      `A nota voltou com status "${resposta.status}".`,
  );
}

export function EmitirNotaFiscalModal({
  ordem,
  tipoNota,
  onFechar,
  onEmitido,
  onItensMudaram,
}: EmitirNotaFiscalModalProps) {
  const { operador, lojaAtual } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [emitindo, setEmitindo] = useState(false);
  const [erro, setErro] = useState("");
  const [configuracaoFiscal, setConfiguracaoFiscal] = useState<ConfiguracaoFiscalLoja | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pecasDaNota, setPecasDaNota] = useState<PecaDadosFiscais[]>([]);
  // O cadastro inteiro da loja, só pro aviso de "peça parecida" no cadastro
  // de uma peça avulsa (#655).
  const [cadastroDaLoja, setCadastroDaLoja] = useState<PecaJanela[]>([]);
  // Peças avulsas que ganharam cadastro nesta janela (id do item → id da
  // peça): a `ordem` que chega por prop só se atualiza quando o pai recarrega.
  const [vinculadas, setVinculadas] = useState<Record<string, string>>({});
  const [itemCadastrando, setItemCadastrando] = useState<ItemOS | null>(null);
  const [codigoMunicipioCliente, setCodigoMunicipioCliente] = useState("");
  const [resultado, setResultado] = useState<RespostaFocusNfe | null>(null);
  const [danfeUrl, setDanfeUrl] = useState<string | null>(null);
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const itensDaOrdem = (ordem.itens ?? []).map((item) =>
    vinculadas[item.id] ? { ...item, peca_id: vinculadas[item.id] } : item,
  );
  const itensPeca = itensDaOrdem.filter((item) => item.tipo === "peca");
  const itensServico = itensDaOrdem.filter((item) => item.tipo === "servico");
  const totalPecas = totalPorTipo(ordem.itens ?? [], "peca");
  const totalServicos = totalPorTipo(ordem.itens ?? [], "servico");
  // Mesma regra que `montarDestinatarioNFCe` usa pra decidir se identifica a
  // empresa na nota — se mudar lá, muda aqui.
  const cnpjClienteValido = (cliente?.cpf_cnpj ?? "").replace(/\D/g, "").length === 14;

  // Nenhuma NFC-e sai com peça faltando nem sem NCM (#655): peça digitada sem
  // cadastro, ou cadastrada sem NCM, trava a emissão até ser resolvida aqui.
  // Só vale depois de carregar as peças — antes disso toda peça pareceria
  // "sem cadastro".
  const itensQueImpedem =
    tipoNota === "NFC-e" && !carregando ? itensQueImpedemNFCe(itensPeca, pecasDaNota) : [];

  // Peça com código de ICMS que não bate com o regime da loja faz a SEFAZ
  // recusar a nota inteira, e a mensagem dela só diz o número do item
  // ("[nItem:1]"), nunca o nome da peça. Conferir aqui transforma isso num
  // aviso com nome e sobrenome, antes de gastar a viagem até a SEFAZ.
  const pecasComProblemaFiscal =
    tipoNota === "NFC-e"
      ? pecasDaNota
          .map((peca) => ({
            descricao: peca.descricao,
            motivo: motivoCodigoIncompativel(
              peca.cst_ou_csosn,
              configuracaoFiscal?.regime_tributario ?? null,
            ),
          }))
          .filter((item): item is { descricao: string; motivo: string } => item.motivo !== null)
      : [];

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        // As peças vêm antes de emitir (não só na hora de montar a nota) pra
        // dar pra conferir o código de ICMS de cada uma e avisar aqui,
        // enquanto ainda dá pra corrigir — ver o aviso mais abaixo.
        const idsDasPecas = (ordem.itens ?? [])
          .filter((item) => item.tipo === "peca")
          .map((item) => item.peca_id)
          .filter((id): id is string => Boolean(id));

        const [config, { cliente: clienteCompleto }, pecas, cadastro] = await Promise.all([
          buscarConfiguracaoFiscal(ordem.loja_id),
          buscarClienteEVeiculoDaOrdem(ordem.id),
          buscarDadosFiscaisDasPecas(idsDasPecas),
          // Só serve ao aviso de peça parecida: se não vier, o cadastro abre igual.
          tipoNota === "NFC-e"
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
  async function aoLigarPeca(item: ItemOS, peca: PecaJanela, recemCadastrada: boolean) {
    setItemCadastrando(null);
    setErro("");
    let avisoEstoque = "";
    try {
      const vinculado = await cadastrarPecaDoItem(item, peca.id, ordem.loja_id, ordem);
      if (!vinculado) {
        setErro(
          "Esta peça já tinha sido ligada a um cadastro (talvez em outro computador). " +
            "Feche esta janela e abra de novo.",
        );
        return;
      }
    } catch (err) {
      // Ligou, mas o estoque não baixou: o item conta como ligado (senão um
      // segundo "Cadastrar agora" criaria a peça duplicada) e a tela diz o
      // que fazer à mão.
      if (!(err instanceof PecaLigadaSemEstoqueError)) {
        console.error("Erro ao ligar a peça ao item da OS:", err);
        setErro(
          recemCadastrada
            ? `A peça foi cadastrada, mas não entrou na OS: ${mensagemDeErro(err)}`
            : `A peça não entrou na OS: ${mensagemDeErro(err)}`,
        );
        return;
      }
      avisoEstoque = err.message;
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
    setCadastroDaLoja((lista) => (lista.some((p) => p.id === peca.id) ? lista : [...lista, peca]));
    if (avisoEstoque) setErro(avisoEstoque);
    // Recarregar a OS fica à parte: se falhar, a peça JÁ entrou na OS.
    try {
      await onItensMudaram?.();
    } catch (err) {
      console.error("Erro ao recarregar a OS depois de ligar a peça:", err);
      setErro(
        `${avisoEstoque ? `${avisoEstoque} ` : ""}` +
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

  async function handleEmitir() {
    if (!configuracaoFiscal || !cliente || !operador || !lojaAtual) return;
    if (itensQueImpedem.length > 0) {
      setErro(MENSAGEM_PECA_PRECISA_CADASTRO);
      return;
    }
    setErro("");
    setEmitindo(true);
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

        resposta = await emitirNFCe({ ordem, itens, cliente, pagamentos, configuracaoFiscal });
      } else {
        if (itensServico.length === 0) {
          throw new Error("Esta OS não tem nenhum item de serviço pra emitir NFS-e.");
        }
        if (!codigoMunicipioCliente.trim()) {
          throw new Error("Informe o código do município do cliente pra emitir a NFS-e.");
        }

        const discriminacao = itensServico.map((item) => item.descricao).join("; ");

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
    } catch (err) {
      if (err instanceof EsperaVencidaError) setRefPendente(err.ref);
      setErro(mensagemDeErro(err));
    } finally {
      setEmitindo(false);
    }
  }

  // Tudo o que vem depois da nota autorizada — vale tanto pra emissão que
  // respondeu na hora quanto pra nota conferida depois pela referência.
  async function concluirEmissao(resposta: RespostaFocusNfe) {
    if (!configuracaoFiscal || !operador || !lojaAtual) return;
    if (resposta.status !== "autorizado") throw erroDaResposta(resposta);

    await salvarArquivoEmitido({
      tipo: tipoNota === "NFC-e" ? "nfe" : "nfse",
      resposta,
      ordemServicoId: ordem.id,
      operadorId: operador.id,
      lojaId: lojaAtual.id,
    });

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
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setConferindo(false);
    }
  }

  function handleRegistrarPorRef() {
    const ref = refDigitada.trim();
    const tipo = tipoNota === "NFC-e" ? "nfce" : "nfse";
    if (ordem.numero === null || !refPertenceAOrdem(ref, ordem.numero, tipo)) {
      setErro(
        `Essa referência não é de uma ${tipoNota} da OS ${ordem.numero}. No painel da Focus ` +
          `NFe, ela fica na coluna "Referência" e começa com "os${ordem.numero}-${tipo}-".`,
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
    link.download = `${tipoNota}-${resultado?.numero ?? resultado?.ref ?? "nota"}.pdf`;
    link.click();
  }

  const focusNfeConfigurado = Boolean(configuracaoFiscal?.focus_nfe_configurado);

  // Esta SIM tranca (#655): peça sem cadastro ou sem NCM não sai na NFC-e, e a SEFAZ não aceita nota sem NCM.
  // Aparece mesmo sem o token do Focus NFe (#742): a loja vê as duas pendências de uma vez.
  const quadroDasPecasQueImpedem = itensQueImpedem.length > 0 && (
    <div className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
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
                className="rounded-lg border border-amber-700 px-3 py-1 font-medium text-amber-900 hover:bg-amber-100"
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
                  className="rounded-lg border border-amber-700 px-3 py-1 font-medium text-amber-900 hover:bg-amber-100"
                >
                  Já preenchi, conferir de novo
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
  const avisoAliquota = avisoAliquotaCompetencia(configuracaoFiscal);

  return (
    <>
    <Modal titulo={`Emitir ${tipoNota}`} onFechar={onFechar}>
      {carregando && <p className="text-corpo text-sakura-muted">Carregando...</p>}

      {!carregando && erro && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-corpo text-red-700">{erro}</p>
      )}

      {!carregando && !resultado && !focusNfeConfigurado && (
        <div className="space-y-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-corpo text-amber-800">
            Falta cadastrar o token do Focus NFe (e os dados fiscais da loja) em Configurações →
            "Dados fiscais da loja" antes de emitir.
          </p>
          {quadroDasPecasQueImpedem}
        </div>
      )}

      {!carregando && !resultado && focusNfeConfigurado && (
        <div className="space-y-3 text-corpo">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-sakura-pink-soft/60 p-3">
            <div>
              <p className="text-rotulo text-sakura-purple-dark/85">Cliente</p>
              <p className="font-medium text-sakura-purple-dark">{ordem.cliente?.nome ?? "—"}</p>
            </div>
            <div>
              <p className="text-rotulo text-sakura-purple-dark/85">
                {tipoNota === "NFC-e" ? "Total de peças" : "Total de serviços"}
              </p>
              <p className="font-medium text-sakura-purple-dark">
                {(tipoNota === "NFC-e" ? totalPecas : totalServicos).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
          </div>

          {tipoNota === "NFS-e" && (
            <label className="flex flex-col gap-1 text-rotulo text-sakura-purple-dark/90">
              Código IBGE do município do cliente
              <input
                value={codigoMunicipioCliente}
                onChange={(e) => setCodigoMunicipioCliente(e.target.value)}
                placeholder={cliente ? `${cliente.cidade ?? ""}/${cliente.uf ?? ""}` : ""}
                className="w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo text-sakura-purple-dark focus:border-sakura-purple"
              />
            </label>
          )}

          {/* A NFC-e já sabe identificar destinatário pessoa jurídica pelo
              CNPJ. O que ela não tem como adivinhar é um CNPJ faltando ou
              incompleto no cadastro do cliente: nesse caso a nota sai como
              "consumidor não identificado" — válido, mas o cliente não usa
              essa nota no crédito dele, e acima de R$10 mil a SEFAZ passa a
              exigir a identificação. Melhor ela saber disso antes de emitir
              do que descobrir depois. */}
          {tipoNota === "NFC-e" && cliente?.tipo_pessoa === "juridica" && !cnpjClienteValido && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
              Este cliente é pessoa jurídica, mas está <strong>sem o CNPJ no cadastro</strong> —
              a nota vai sair como consumidor não identificado. Se ele precisa da nota no nome da
              empresa, cadastre o CNPJ dele em Clientes antes de emitir.
            </p>
          )}

          {quadroDasPecasQueImpedem}

          {/* Aviso, nunca tranca: a lista de códigos válidos envelhece com
              mudança de legislação, e barrar a emissão por causa de um
              palpite daqui seria pior que deixar a SEFAZ decidir (mesma lição
              do item 33 do PROJETO_STATUS.md). O botão de emitir continua
              liberado. */}
          {pecasComProblemaFiscal.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
              <p>
                <strong>
                  {pecasComProblemaFiscal.length === 1
                    ? "Uma peça desta nota está"
                    : `${pecasComProblemaFiscal.length} peças desta nota estão`}{" "}
                  com o código de ICMS que a SEFAZ não aceita pra sua loja
                </strong>{" "}
                — provavelmente a nota vai ser recusada. Dá pra corrigir em Estoque → Produtos →
                Editar, e emitir depois.
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {pecasComProblemaFiscal.map((peca) => (
                  <li key={peca.descricao}>
                    <strong>{peca.descricao}</strong> — {peca.motivo}.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* A prefeitura recusa a primeira NFS-e do mês enquanto a alíquota
              daquela competência não estiver cadastrada no portal dela. Aqui
              é só o lembrete — quem resolve é o portal, e o botão "Já
              cadastrei" fica no Início, onde ela vê antes de precisar. */}
          {tipoNota === "NFS-e" && <AvisoAliquotaCompetencia aviso={avisoAliquota} />}

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
            {configuracaoFiscal?.focus_nfe_ambiente === "homologacao"
              ? "Ambiente de homologação — esta nota é só de teste, sem valor fiscal."
              : "Ambiente de produção — esta nota será emitida de verdade."}
          </p>

          {refPendente && (
            <p className="break-all text-rotulo text-sakura-muted">
              Referência da nota na Focus NFe: {refPendente}
            </p>
          )}

          {/* Nota que saiu na Focus NFe quando esta janela já estava
              fechada (ou o programa foi reiniciado): sem isto, o único
              caminho era o upload manual do XML, que perde a referência — e
              com ela o "Ver PDF" e o cancelamento por aqui. */}
          {!refPendente && (
            <div className="text-rotulo">
              {!mostrarRegistrarPorRef ? (
                <button
                  type="button"
                  onClick={() => setMostrarRegistrarPorRef(true)}
                  className="text-sakura-purple-dark/85 underline hover:text-sakura-purple-dark"
                >
                  A nota já saiu na Focus NFe, mas não apareceu aqui?
                </button>
              ) : (
                <div className="space-y-2 rounded-lg bg-sakura-pink-soft/60 p-3">
                  <label className="flex flex-col gap-1 text-sakura-purple-dark/90">
                    Referência da nota no painel da Focus NFe (coluna "Referência")
                    <input
                      value={refDigitada}
                      onChange={(e) => setRefDigitada(e.target.value)}
                      placeholder={`os${ordem.numero}-${tipoNota === "NFC-e" ? "nfce" : "nfse"}-...`}
                      className="w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo text-sakura-purple-dark focus:border-sakura-purple"
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRegistrarPorRef}
                      disabled={conferindo || !refDigitada.trim()}
                      className="rounded-xl border border-sakura-gray/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10 disabled:opacity-50"
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
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
            >
              {refPendente ? "Fechar" : "Cancelar"}
            </button>
            {refPendente ? (
              <button
                type="button"
                onClick={() => conferirNota(refPendente)}
                disabled={conferindo}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {conferindo ? "Conferindo..." : "Conferir de novo"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEmitir}
                disabled={emitindo || conferindo || itensQueImpedem.length > 0}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {emitindo ? "Emitindo..." : "Confirmar emissão"}
              </button>
            )}
          </div>
        </div>
      )}

      {resultado && (
        <div className="space-y-3 text-corpo">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
            {tipoNota} emitida com sucesso — número {resultado.numero ?? "—"}.
          </p>
          {resultado.chave_nfe && (
            <p className="break-all text-rotulo text-sakura-muted">Chave: {resultado.chave_nfe}</p>
          )}

          {carregandoPreview && (
            <p className="text-corpo text-sakura-muted">Gerando pré-visualização do PDF...</p>
          )}

          {!carregandoPreview && erroPreview && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
              A nota foi emitida e o XML já está salvo em Notas Fiscais, mas não deu pra carregar a
              pré-visualização do PDF: {erroPreview}
            </p>
          )}

          {!carregandoPreview && !erroPreview && !resultado.caminho_danfe && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
              A nota foi emitida e o XML já está salvo em Notas Fiscais — esse tipo de nota não
              trouxe um PDF de pré-visualização.
            </p>
          )}

          {danfeUrl && (
            <iframe
              ref={iframeRef}
              title="Pré-visualização da nota fiscal"
              src={danfeUrl}
              className="h-96 w-full rounded-lg border border-sakura-gray/30 bg-white"
            />
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
            >
              OK
            </button>
            {danfeUrl && (
              <>
                <button
                  type="button"
                  onClick={handleBaixarPdf}
                  className="rounded-xl border border-sakura-gray/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
                >
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90"
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
          onCadastrada={(peca) => aoLigarPeca(itemCadastrando, peca, true)}
          onAbrirExistente={(peca) => aoLigarPeca(itemCadastrando, peca, false)}
          onFechar={() => setItemCadastrando(null)}
        />
      )}
    </>
  );
}
