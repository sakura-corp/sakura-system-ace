import { useEffect, useMemo, useRef, useState } from "react";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { Modal } from "@/components/Modal";
import { hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  CaixaDeHojeFechadoError,
  CorrecaoMudouError,
  EstoqueNegativoNaTrocaError,
  NotaEmitidaNaCorrecaoError,
  type SituacaoDaCorrecao,
} from "@/lib/ordensServico";
import { CancelarNotaModal } from "@/pages/notas-fiscais/CancelarNotaModal";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  acertosDaCorrecao,
  diferencaDaCorrecao,
  manterOTotal,
  motivoParaNaoTrocar,
  pecasQueFicamNegativas,
  problemaDaTroca,
  problemaDoAcerto,
  resumoDaTroca,
  textoDoAcerto,
  totalDaLista,
  type AcertoDaCorrecao,
  type ItemDaTroca,
} from "@/schemas/trocaFaturada";
import { somarValoresLiquidos, valorLiquidoDoItem } from "@/schemas/valorItem";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { ItemOS, OrdemServico, TipoItemOS } from "@/types/os";
import { FORMA_PAGAMENTO_LABEL, nomeDocumento } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";

/**
 * Corrigir uma OS (ou venda) já faturada: peça, serviço e valor (#1145, #1182).
 *
 * Dois passos: (1) a lista de itens como deve ficar, com o total faturado e o
 * total novo lado a lado; (2) "Conferir e acertar": o que sai, o que entra,
 * Faturado, Total novo e Diferença, como a diferença é acertada (Caixa de
 * hoje, conta a receber ou devolução), o aviso de estoque negativo e o motivo
 * obrigatório. Quem confere tudo de novo, com a OS travada, é o banco
 * (`corrigir_os_faturada`); esta janela só avisa antes.
 */

/** Tudo que a janela manda quando a pessoa confirma. A página junta o resto (hoje, operador). */
export interface ConfirmacaoDaCorrecao {
  itens: ItemDaTroca[];
  motivo: string;
  /** Nulo quando o total não muda. */
  acerto: AcertoDaCorrecao | null;
  formaPagamento: string | null;
  vencimento: string | null;
  /** Uma por janela aberta: a mesma chamada 2 vezes não lança 2 vezes. */
  chave: string;
  aceitaEstoqueNegativo: boolean;
  /** O total que a janela mostrou como faturado. */
  totalFaturado: number;
}

interface Linha {
  chave: string;
  id?: string;
  tipo: TipoItemOS;
  peca_id: string;
  servico_id: string;
  tecnico_id: string;
  descricao: string;
  quantidade: string;
  preco_unitario: string;
  desconto: string;
  custo_unitario: number | null;
}

interface TrocarItensFaturadaModalProps {
  ordem: OrdemServico;
  pecas: PecaJanela[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  saldoPorPeca: Map<string, number>;
  /** Sem o saldo carregado a janela não avisa nada (o banco avisa, com SKNEG). */
  saldoCarregado: boolean;
  /** Busca a situação da OS (conta em aberto, caixa de hoje, comissão) quando a janela abre. */
  buscarSituacao: () => Promise<SituacaoDaCorrecao>;
  /** A nota emitida da OS, pra levar à janela "Cancelar nota" se o banco recusar por causa dela. */
  notaParaCancelar?: NotaFiscalArquivo;
  onConfirmar: (correcao: ConfirmacaoDaCorrecao) => Promise<void>;
  onFechar: () => void;
}

const inputClasse = "rounded-lg border border-borda-campo px-2 py-1.5 text-corpo text-texto";

function numero(texto: string): number {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) ? valor : NaN;
}

function paraLinha(item: ItemOS): Linha {
  return {
    chave: item.id,
    id: item.id,
    tipo: item.tipo,
    peca_id: item.peca_id ?? "",
    servico_id: item.servico_id ?? "",
    tecnico_id: item.tecnico_id ?? "",
    descricao: item.descricao,
    quantidade: String(item.quantidade),
    preco_unitario: String(item.preco_unitario),
    desconto: String(item.desconto),
    custo_unitario: item.custo_unitario ?? null,
  };
}

function paraItem(linha: Linha): ItemDaTroca {
  return {
    ...(linha.id ? { id: linha.id } : {}),
    tipo: linha.tipo,
    peca_id: linha.tipo === "peca" ? linha.peca_id || null : null,
    servico_id: linha.tipo === "servico" ? linha.servico_id || null : null,
    tecnico_id: linha.tecnico_id || null,
    descricao: linha.descricao,
    quantidade: numero(linha.quantidade),
    preco_unitario: numero(linha.preco_unitario || "0"),
    desconto: numero(linha.desconto || "0"),
    custo_unitario: linha.tipo === "peca" && linha.peca_id ? null : linha.custo_unitario,
  };
}

function paraItemDoBanco(item: ItemOS): ItemDaTroca {
  return {
    id: item.id,
    tipo: item.tipo,
    peca_id: item.peca_id,
    servico_id: item.servico_id,
    tecnico_id: item.tecnico_id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto: item.desconto,
    custo_unitario: item.custo_unitario ?? null,
  };
}

const ROTULO_DO_ACERTO: Record<AcertoDaCorrecao, string> = {
  conta_aberta: "A conta a receber muda de valor",
  pago_agora: "Cliente paga agora",
  a_receber: "Fica a receber",
  devolvido: "Devolver agora",
};

let proximaChave = 0;

function ListaDeItens({ titulo, itens }: { titulo: string; itens: ItemDaTroca[] }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg bg-poco p-3">
      <p className="mb-1 text-rotulo font-medium text-texto/85">{titulo}</p>
      {itens.length === 0 ? (
        <p className="text-rotulo text-texto-2">Nada.</p>
      ) : (
        <ul className="space-y-1 text-corpo text-texto">
          {itens.map((item, i) => (
            <li key={item.id ?? `novo-${i}`} className="flex justify-between gap-3">
              <span>
                {item.tipo === "peca" ? "Peça" : "Serviço"} — {item.descricao} ({item.quantidade}x)
              </span>
              <span className="shrink-0">{formatarMoeda(valorLiquidoDoItem(item))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrocarItensFaturadaModal({
  ordem,
  pecas,
  servicos,
  funcionarios,
  saldoPorPeca,
  saldoCarregado,
  buscarSituacao,
  notaParaCancelar,
  onConfirmar,
  onFechar,
}: TrocarItensFaturadaModalProps) {
  const antes = useMemo(() => (ordem.itens ?? []).map(paraItemDoBanco), [ordem.itens]);
  const [linhas, setLinhas] = useState<Linha[]>(() => (ordem.itens ?? []).map(paraLinha));
  const [passo, setPasso] = useState<"editar" | "confirmar">("editar");
  const [motivo, setMotivo] = useState("");
  const [aceitaNegativo, setAceitaNegativo] = useState(false);
  const [bancoAvisouNegativo, setBancoAvisouNegativo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // O estado só muda no próximo desenho: o ref segura o 2º clique rápido.
  const enviandoRef = useRef(false);
  // A chave do pedido: a MESMA enquanto o pedido for o mesmo (clique duplo, ou
  // tentar de novo depois de a resposta se perder: o banco não lança 2 vezes);
  // NOVA quando a pessoa muda a lista, o acerto, a forma, o vencimento ou o
  // motivo (senão o banco devolveria a correção antiga sem aplicar a nova).
  const ultimoPedido = useRef<{ assinatura: string; chave: string } | null>(null);
  const hoje = useMemo(() => hojeLocal(), []);
  const [situacao, setSituacao] = useState<SituacaoDaCorrecao | null>(null);
  const [erroDaSituacao, setErroDaSituacao] = useState<string | null>(null);
  const [acertoEscolhido, setAcertoEscolhido] = useState<AcertoDaCorrecao | null>(null);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [vencimento, setVencimento] = useState(hoje);
  const [notaEmitida, setNotaEmitida] = useState<string | null>(null);
  const [cancelandoNota, setCancelandoNota] = useState(false);

  useEffect(() => {
    let cancelado = false;
    buscarSituacao()
      .then((s) => {
        if (!cancelado) setSituacao(s);
      })
      .catch((err) => {
        console.error("Erro ao buscar a situação da OS:", err);
        if (!cancelado) setErroDaSituacao(mensagemDeErro(err));
      });
    return () => {
      cancelado = true;
    };
    // Só na abertura da janela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const depois = linhas.map(paraItem);
  const problema = problemaDaTroca(antes, depois);
  const totalFaturado = somarValoresLiquidos(antes);
  const totalNovo = totalDaLista(depois);
  const nomePorPeca = useMemo(() => new Map(pecas.map((p) => [p.id, p.descricao])), [pecas]);
  const negativas = saldoCarregado
    ? pecasQueFicamNegativas(antes, depois, saldoPorPeca, nomePorPeca)
    : [];
  const avulsasDeAntes = useMemo(
    () => new Set(antes.filter((i) => i.tipo === "peca" && !i.peca_id).map((i) => i.id)),
    [antes],
  );
  const { saem, entram } = resumoDaTroca(antes, depois);
  const diferenca = totalNovo === null ? 0 : diferencaDaCorrecao(antes, depois);
  const contaEmAberto = situacao?.contaDoFaturamentoEmAberto ?? null;
  const aReceberDeCorrecoes = situacao?.aReceberDeCorrecoes ?? 0;
  const { opcoes: opcoesDeAcerto, padrao: acertoPadrao } = acertosDaCorrecao({
    diferenca,
    contaDoFaturamentoEmAberto: contaEmAberto !== null,
    aReceberDeCorrecoes,
  });
  const acerto = acertoEscolhido && opcoesDeAcerto.includes(acertoEscolhido) ? acertoEscolhido : acertoPadrao;
  const problemaDoPasso2 = problemaDoAcerto({
    diferenca,
    contaDoFaturamentoEmAberto: contaEmAberto !== null,
    aReceberDeCorrecoes,
    acerto,
    formaPagamento,
    vencimento,
    hoje,
  });
  const travaDoCaixa = situacao
    ? motivoParaNaoTrocar({
        faturada: true,
        gerente: true,
        temNota: false,
        caixaDeHojeFechado: situacao.caixaDeHojeFechado,
      })
    : null;
  const atalhoManterTotal = manterOTotal(antes, depois);
  const precisaConfirmarEstoque = negativas.length > 0 || bancoAvisouNegativo !== null;

  // Mudou a lista: a confirmação de estoque dada antes não vale pra ela.
  function esquecerConfirmacao() {
    setAceitaNegativo(false);
    setBancoAvisouNegativo(null);
  }

  function mudar(chave: string, mudanca: Partial<Linha>) {
    esquecerConfirmacao();
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  function aoMudarTipo(chave: string, tipo: TipoItemOS) {
    mudar(chave, { tipo, peca_id: "", servico_id: "", descricao: "", custo_unitario: null });
  }

  function aoMudarPeca(chave: string, pecaId: string) {
    const peca = pecas.find((p) => p.id === pecaId);
    // O preço NÃO muda sozinho: a troca é com o total igual, então o preço que
    // vale é o que foi cobrado. Quem quiser, ajusta à mão.
    mudar(chave, { peca_id: pecaId, descricao: peca?.descricao ?? "", custo_unitario: null });
  }

  function aoMudarServico(chave: string, servicoId: string) {
    const servico = servicos.find((s) => s.id === servicoId);
    mudar(chave, { servico_id: servicoId, descricao: servico?.descricao ?? "" });
  }

  function acrescentar() {
    esquecerConfirmacao();
    proximaChave += 1;
    setLinhas((atuais) => [
      ...atuais,
      {
        chave: `nova-${proximaChave}`,
        tipo: "peca",
        peca_id: "",
        servico_id: "",
        tecnico_id: "",
        descricao: "",
        quantidade: "1",
        preco_unitario: "0",
        desconto: "0",
        custo_unitario: null,
      },
    ]);
  }

  function manterOTotalFaturado() {
    if (!atalhoManterTotal) return;
    esquecerConfirmacao();
    setLinhas((atuais) =>
      atuais.map((l, i) => ({ ...l, desconto: String(atalhoManterTotal[i]?.desconto ?? l.desconto) })),
    );
    setAcertoEscolhido(null);
  }

  async function confirmar() {
    if (enviandoRef.current) return;
    setErro(null);
    if (!situacao) {
      setErro("Ainda carregando a situação da OS. Espere um instante.");
      return;
    }
    if (travaDoCaixa) {
      setErro(travaDoCaixa);
      return;
    }
    if (motivo.trim().length < 3) {
      setErro('Diga o motivo da correção (por exemplo: "medida do pneu estava errada").');
      return;
    }
    if (problemaDoPasso2) {
      setErro(problemaDoPasso2);
      return;
    }
    if (precisaConfirmarEstoque && !aceitaNegativo) {
      setErro("Confirme que sabe que o estoque vai ficar negativo, ou volte e troque a peça.");
      return;
    }
    const formaDoPedido = acerto === "pago_agora" || acerto === "devolvido" ? formaPagamento : null;
    const vencimentoDoPedido = acerto === "a_receber" ? vencimento : null;
    const acertoDoPedido = diferenca === 0 ? null : acerto;
    const assinatura = JSON.stringify([depois, motivo.trim(), acertoDoPedido, formaDoPedido, vencimentoDoPedido]);
    if (ultimoPedido.current?.assinatura !== assinatura) {
      ultimoPedido.current = { assinatura, chave: crypto.randomUUID() };
    }
    const chave = ultimoPedido.current.chave;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      await onConfirmar({
        itens: depois,
        motivo: motivo.trim(),
        acerto: acertoDoPedido,
        formaPagamento: formaDoPedido,
        vencimento: vencimentoDoPedido,
        chave,
        aceitaEstoqueNegativo: aceitaNegativo,
        totalFaturado,
      });
    } catch (err) {
      console.error("Erro ao corrigir a OS faturada:", err);
      if (err instanceof EstoqueNegativoNaTrocaError) {
        // O aviso amarelo já diz isso, com a caixinha: sem repetir no vermelho.
        setBancoAvisouNegativo(err.message);
        setErro(null);
      } else if (err instanceof NotaEmitidaNaCorrecaoError) {
        setNotaEmitida(err.message);
        setErro(null);
      } else if (err instanceof CaixaDeHojeFechadoError || err instanceof CorrecaoMudouError) {
        setNotaEmitida(null);
        setErro(err.message);
      } else {
        setErro(mensagemDeErro(err));
      }
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const rodape =
    passo === "editar" ? (
      <>
        <Botao variante="fantasma" onClick={onFechar}>
          Cancelar
        </Botao>
        <Botao variante="principal" disabled={problema !== null} onClick={() => setPasso("confirmar")}>
          Conferir a troca
        </Botao>
      </>
    ) : (
      <>
        <Botao
          variante="fantasma"
          onClick={() => {
            esquecerConfirmacao();
            setPasso("editar");
          }}
          disabled={enviando}
        >
          Voltar
        </Botao>
        <Botao
          variante="principal"
          onClick={confirmar}
          disabled={enviando || !situacao || travaDoCaixa !== null}
        >
          {enviando ? "Corrigindo..." : "Corrigir"}
        </Botao>
      </>
    );

  return (
    <>
    <Modal
      titulo={`Corrigir a ${nomeDocumento(ordem)}`}
      descricao={`${ordem.tipo === "venda_balcao" ? "A venda" : "A OS"} já foi faturada: dá pra corrigir peça, serviço e valor. O dia da fatura não muda; se o total mudar, a diferença é acertada no Caixa de hoje.`}
      largura="4xl"
      total={{ rotulo: "Faturado", valor: formatarMoeda(totalFaturado) }}
      rodape={rodape}
      notaDoRodape={
        passo === "editar" ? (
          <span>
            Total novo: <strong>{totalNovo === null ? "—" : formatarMoeda(totalNovo)}</strong>
          </span>
        ) : situacao ? (
          <span>
            {textoDoAcerto({
              acerto,
              diferenca,
              hoje,
              vencimento,
              valorDaConta: contaEmAberto?.valor,
              aReceberDeCorrecoes,
            })}
          </span>
        ) : undefined
      }
      onFechar={onFechar}
    >
      {passo === "editar" ? (
        <div className="space-y-3">
          {linhas.map((linha) => (
            <div key={linha.chave} className="space-y-2 rounded-lg border border-linha p-3">
              <div className="flex gap-2">
                <select
                  aria-label="Tipo do item"
                  value={linha.tipo}
                  onChange={(e) => aoMudarTipo(linha.chave, e.target.value as TipoItemOS)}
                  className={`w-28 shrink-0 ${inputClasse}`}
                >
                  <option value="peca">Peça</option>
                  <option value="servico">Serviço</option>
                </select>
                {linha.tipo === "peca" ? (
                  <Combobox
                    tamanho="filtro"
                    className="flex-1"
                    opcoes={pecas.map((p) => ({ valor: p.id, rotulo: p.descricao }))}
                    valor={linha.peca_id}
                    onMudar={(v) => aoMudarPeca(linha.chave, v)}
                    opcaoVazia={
                      linha.id && avulsasDeAntes.has(linha.id)
                        ? `Sem cadastro: ${linha.descricao}`
                        : "Selecione a peça"
                    }
                    placeholder="Selecione a peça"
                  />
                ) : (
                  <Combobox
                    tamanho="filtro"
                    className="flex-1"
                    opcoes={servicos.map((s) => ({ valor: s.id, rotulo: s.descricao }))}
                    valor={linha.servico_id}
                    onMudar={(v) => aoMudarServico(linha.chave, v)}
                    opcaoVazia="Serviço avulso (digitar abaixo)"
                    placeholder="Serviço avulso (digitar abaixo)"
                  />
                )}
                <Botao
                  variante="fantasma"
                  tamanho="pequeno"
                  onClick={() => {
                    esquecerConfirmacao();
                    setLinhas((atuais) => atuais.filter((l) => l.chave !== linha.chave));
                  }}
                >
                  Tirar
                </Botao>
              </div>

              {linha.tipo === "servico" && !linha.servico_id && (
                <input
                  type="text"
                  aria-label="Descrição do serviço"
                  placeholder="Descrição do serviço"
                  value={linha.descricao}
                  onChange={(e) => mudar(linha.chave, { descricao: e.target.value })}
                  className={`w-full ${inputClasse}`}
                />
              )}

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Quantidade
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={linha.quantidade}
                    onChange={(e) => mudar(linha.chave, { quantidade: e.target.value })}
                    className={inputClasse}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Preço unitário
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.preco_unitario}
                    onChange={(e) => mudar(linha.chave, { preco_unitario: e.target.value })}
                    className={inputClasse}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Desconto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.desconto}
                    onChange={(e) => mudar(linha.chave, { desconto: e.target.value })}
                    className={inputClasse}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-0.5 text-rotulo text-texto/90">
                  Técnico
                  <Combobox
                    tamanho="filtro"
                    opcoes={funcionarios.map((f) => ({ valor: f.id, rotulo: f.nome }))}
                    valor={linha.tecnico_id}
                    onMudar={(v) => mudar(linha.chave, { tecnico_id: v })}
                    opcaoVazia="Sem técnico definido"
                    placeholder="Sem técnico definido"
                  />
                </label>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <Botao tamanho="pequeno" onClick={acrescentar}>
              + adicionar item
            </Botao>
          </div>

          {problema && <AvisoDeAtencao>{problema}</AvisoDeAtencao>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <ListaDeItens titulo="Sai" itens={saem} />
            <ListaDeItens titulo="Entra" itens={entram} />
          </div>

          <h3 className="text-corpo font-semibold text-texto">Conferir e acertar</h3>
          <div className="rounded-lg border border-linha p-3 text-corpo text-texto">
            <p>
              Faturado <strong>{formatarMoeda(totalFaturado)}</strong> → Total novo{" "}
              <strong>{formatarMoeda(totalNovo ?? totalFaturado)}</strong> = Diferença{" "}
              <strong>
                {diferenca > 0 ? "+" : diferenca < 0 ? "−" : ""}
                {formatarMoeda(Math.abs(diferenca))}
              </strong>
              {diferenca === 0 && " (igual ao faturado)"}
            </p>
            {diferenca === 0 && (
              <p className="mt-1 text-rotulo text-texto-2">
                O pagamento, o Caixa e a conta a receber não mudam. A peça que sai volta pro estoque e a que
                entra baixa.
              </p>
            )}
            {atalhoManterTotal && (
              <div className="mt-2">
                <Botao tamanho="pequeno" onClick={manterOTotalFaturado}>
                  Manter o total de {formatarMoeda(totalFaturado)}
                </Botao>
                <span className="ml-2 text-rotulo text-texto-2">
                  (a loja não cobra a diferença: ela vira desconto nos itens)
                </span>
              </div>
            )}
          </div>

          {!situacao && !erroDaSituacao && (
            <p className="text-rotulo text-texto-2">Carregando a situação da OS...</p>
          )}
          {erroDaSituacao && <AvisoDeErro>{erroDaSituacao}</AvisoDeErro>}
          {travaDoCaixa && <AvisoDeErro>{travaDoCaixa}</AvisoDeErro>}
          {situacao?.comissaoDoPeriodoPaga && (
            <AvisoDeAtencao>
              A comissão do período desta OS já foi paga. Corrigir os itens muda a comissão que ela
              deveria ter dado: confira com quem fecha a comissão antes de confirmar.
            </AvisoDeAtencao>
          )}

          {diferenca !== 0 && contaEmAberto && (
            <p className="text-corpo text-texto">
              A conta a receber desta OS ainda está em aberto: ela muda de valor sozinha, sem você escolher
              nada.
            </p>
          )}
          {diferenca < 0 && !contaEmAberto && opcoesDeAcerto.includes("conta_aberta") && (
            <p className="text-corpo text-texto">
              Esta OS ainda tem {formatarMoeda(aReceberDeCorrecoes)} a receber de uma correção anterior: a
              diferença abate essa conta, e nada sai do Caixa.
            </p>
          )}
          {diferenca !== 0 && opcoesDeAcerto.length === 0 && problemaDoPasso2 && (
            <AvisoDeErro>{problemaDoPasso2}</AvisoDeErro>
          )}
          {opcoesDeAcerto.length > 0 && !contaEmAberto && !opcoesDeAcerto.includes("conta_aberta") && (
            <fieldset className="space-y-1">
              <legend className="mb-1 text-rotulo font-medium text-texto/85">Como acertar a diferença</legend>
              {opcoesDeAcerto.map((opcao) => (
                <label key={opcao} className="flex items-center gap-2 text-corpo text-texto">
                  <input
                    type="radio"
                    name="acerto-da-correcao"
                    checked={acerto === opcao}
                    onChange={() => setAcertoEscolhido(opcao)}
                  />
                  {ROTULO_DO_ACERTO[opcao]}
                </label>
              ))}
            </fieldset>
          )}
          {(acerto === "pago_agora" || acerto === "devolvido") && (
            <label className="flex flex-col gap-1 text-rotulo text-texto/90">
              Forma de pagamento
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className={inputClasse}
              >
                <option value="">Escolha a forma</option>
                {Object.entries(FORMA_PAGAMENTO_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
          )}
          {acerto === "a_receber" && (
            <label className="flex flex-col gap-1 text-rotulo text-texto/90">
              Vencimento da diferença
              <input
                type="date"
                value={vencimento}
                min={hoje}
                onChange={(e) => setVencimento(e.target.value)}
                className={inputClasse}
              />
            </label>
          )}

          {precisaConfirmarEstoque && (
            <AvisoDeAtencao>
              <p>
                {negativas.length > 0
                  ? `O estoque vai ficar negativo: ${negativas
                      .map((n) => `${n.descricao} (fica ${n.saldoDepois})`)
                      .join(", ")}.`
                  : bancoAvisouNegativo}
              </p>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aceitaNegativo}
                  onChange={(e) => setAceitaNegativo(e.target.checked)}
                />
                Sei disso e quero seguir assim
              </label>
            </AvisoDeAtencao>
          )}

          <label className="flex flex-col gap-1 text-rotulo text-texto/90">
            Motivo da correção (obrigatório)
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ex.: a medida do pneu estava errada"
              className={inputClasse}
            />
          </label>

          {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
          {notaEmitida && (
            <AvisoDeErro>
              <p>{notaEmitida}</p>
              {notaParaCancelar && (
                <div className="mt-2">
                  <Botao tamanho="pequeno" onClick={() => setCancelandoNota(true)}>
                    Cancelar a nota
                  </Botao>
                </div>
              )}
            </AvisoDeErro>
          )}
        </div>
      )}
    </Modal>
    {cancelandoNota && notaParaCancelar && (
      <CancelarNotaModal
        arquivo={notaParaCancelar}
        onFechar={() => setCancelandoNota(false)}
        onCancelado={onFechar}
      />
    )}
    </>
  );
}
