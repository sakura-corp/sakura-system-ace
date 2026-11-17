import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Package } from "lucide-react";
import { AreaRolavel } from "@/components/AreaRolavel";
import { Botao } from "@/components/Botao";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { Explicacao } from "@/components/Explicacao";
import { Selo, type TipoDeSelo } from "@/components/Selo";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { listarContasReceber } from "@/lib/contasReceber";
import { listarSaldos } from "@/lib/estoque";
import { listarFechamentosCaixa } from "@/lib/fechamentoCaixa";
import { listarModelosWhatsapp, registrarMensagemAberta, textoDoModelo } from "@/lib/modelosWhatsapp";
import { buscarContatoContabilidade, type ContatoContabilidade } from "@/lib/contabilidade";
import { gerarPacoteContabilidade, listarNotasComErro, listarNotasDoMesParaPacote } from "@/lib/notasFiscais";
import { listarPecas } from "@/lib/pecas";
import {
  alcanceDaCentral,
  limitarPorTipo,
  marcadoresDaCobranca,
  marcadoresDaContabilidade,
  marcadoresDoCarroPronto,
  mensagemDaListaVazia,
  mesDoPacote,
  montarCentralDoDia,
  type Pendencia,
  type TipoPendencia,
} from "@/schemas/centralDoDia";
import { preencherModelo } from "@/schemas/whatsapp";
import type { MovimentoCaixa } from "@/types/caixa";
import type { Cliente } from "@/types/cliente";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { temPermissao, type ModuloChave } from "@/types/operador";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";

/**
 * A Central do dia (#454): o que precisa de atenção hoje, no Início.
 *
 * A regra (o que entra, em que ordem, os limites) mora em
 * `schemas/centralDoDia.ts`; aqui só se busca o que falta e se desenha. As OS,
 * as contas a pagar, os lançamentos do Caixa e os clientes vêm do Início, que
 * já os busca pros blocos dele (cada um só pra quem tem o módulo). Os botões
 * só abrem a ação: quem confirma é a pessoa.
 */

/**
 * O selo de cada linha (regra 4: todo aviso tem ícone e palavra junto da cor).
 * Vermelho é problema (nota com erro, caixa aberto, conta vencida), amarelo é
 * atenção, verde é o que está pronto, cinza é o que não é urgência.
 */
const SELO_DO_TIPO: Record<TipoPendencia, { tipo: TipoDeSelo; palavra: string; icone?: LucideIcon }> = {
  nota_com_erro: { tipo: "perigo", palavra: "Com erro" },
  caixa_sem_fechar: { tipo: "perigo", palavra: "Sem fechar" },
  conta_receber_vencida: { tipo: "perigo", palavra: "Vencida" },
  carro_pronto: { tipo: "ok", palavra: "Pronto" },
  conta_pagar_vencendo: { tipo: "atencao", palavra: "A pagar" },
  os_parada: { tipo: "atencao", palavra: "Parada" },
  estoque_baixo: { tipo: "atencao", palavra: "Baixo", icone: Package },
  contabilidade_notas: { tipo: "neutro", palavra: "Contador", icone: FileText },
  contabilidade_extrato: { tipo: "neutro", palavra: "Contador", icone: FileText },
};

/** A altura de cada linha e quantas cabem à vista: o cartão tem sempre 4 linhas (pedido da Sofia, 14/11). */
const ALTURA_DA_LINHA_PX = 56;
const LINHAS_A_VISTA = 4;
const ALTURA_DO_CARTAO_PX = ALTURA_DA_LINHA_PX * LINHAS_A_VISTA;

/** Pra onde vai o "e mais N" de cada tipo. */
const TELA_DO_TIPO: Record<TipoPendencia, string> = {
  nota_com_erro: "/notas-fiscais",
  caixa_sem_fechar: "/caixa",
  conta_receber_vencida: "/contas-receber",
  carro_pronto: "/ordens-servico",
  conta_pagar_vencendo: "/contas-pagar",
  os_parada: "/ordens-servico",
  estoque_baixo: "/estoque",
  contabilidade_notas: "/notas-fiscais",
  contabilidade_extrato: "/caixa",
};

const EXPLICACAO =
  "O que precisa de atenção hoje, do mais urgente pro menos: nota com problema, caixa sem " +
  "fechar, conta a receber vencida, carro pronto esperando o cliente, conta a pagar dos " +
  "próximos 3 dias, OS em andamento há 3 dias ou mais, peça no estoque mínimo e, do dia 1 ao " +
  "10, o pacote da contabilidade. Cada linha só aparece pra quem tem o módulo dela. Os botões " +
  "só abrem a tela certa; nada é feito sozinho.";

export function CentralDoDia({
  ordens,
  contasPagar,
  movimentos,
  clientes,
  dadosIncompletos = false,
}: {
  ordens: OrdemServico[];
  contasPagar: ContaPagar[];
  movimentos: MovimentoCaixa[];
  /** Pro telefone do WhatsApp; vazia pra quem não tem o módulo Clientes. */
  clientes: Cliente[];
  /**
   * O Início não conseguiu carregar as OS, as contas a pagar ou o Caixa. Aí a
   * lista não pode dizer "nada pendente": ela só não sabe.
   */
  dadosIncompletos?: boolean;
}) {
  const { lojaAtual, operador } = useAuth();
  const navigate = useNavigate();
  const pode = (m: ModuloChave) => temPermissao(operador, m);
  const podeNotas = pode("notas_fiscais");
  const podeCaixa = pode("caixa");
  const podeReceber = pode("contas_receber");
  const podeEstoque = pode("estoque");
  const podeClientes = pode("clientes");
  const podeOS = pode("ordens_servico");
  const podeFornecedores = pode("fornecedores");
  const alcance = alcanceDaCentral(pode);

  const [notas, setNotas] = useState<NotaFiscalArquivo[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoCaixa[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [saldos, setSaldos] = useState<Map<string, number>>(() => new Map());
  const [modelos, setModelos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // `undefined` = ainda não buscou; `null` = a loja não tem contato.
  const [contato, setContato] = useState<ContatoContabilidade | null | undefined>(undefined);
  const [pacote, setPacote] = useState<{ feitos: number; total: number } | null>(null);
  const [avisoPacote, setAvisoPacote] = useState<{ erro: boolean; texto: string } | null>(null);
  // A loja de agora: o pacote que termina depois de uma troca de loja não
  // mexe na tela da loja nova (mesmo padrão do #974).
  const lojaAtualRef = useRef(lojaAtual?.id);
  useEffect(() => {
    lojaAtualRef.current = lojaAtual?.id;
    setPacote(null);
    setAvisoPacote(null);
  }, [lojaAtual?.id]);

  useEffect(() => {
    // Troca de loja no meio da busca: a resposta atrasada da loja anterior
    // não pode sobrescrever a desta.
    let cancelado = false;
    async function carregar() {
      setErro(null);
      if (!lojaAtual || !alcance.mostra) {
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        const lojaId = lojaAtual.id;
        const [n, f, cr, p, s, m] = await Promise.all([
          podeNotas ? listarNotasComErro(lojaId) : Promise.resolve([]),
          podeCaixa ? listarFechamentosCaixa(lojaId, 10) : Promise.resolve([]),
          podeReceber ? listarContasReceber(lojaId) : Promise.resolve([]),
          podeEstoque ? listarPecas() : Promise.resolve([]),
          podeEstoque ? listarSaldos(lojaId) : Promise.resolve(new Map<string, number>()),
          (podeClientes && (podeReceber || podeOS)) || podeNotas
            ? // Sem os modelos da loja, vale o texto padrão: não derruba a lista.
              listarModelosWhatsapp(lojaId).catch((err) => {
                console.error("Erro ao carregar os modelos de WhatsApp:", err);
                return {};
              })
            : Promise.resolve({}),
        ]);
        if (cancelado) return;
        setNotas(n);
        setFechamentos(f);
        setContasReceber(cr);
        setPecas(p);
        setSaldos(s);
        setModelos(m);
      } catch (err) {
        if (cancelado) return;
        console.error("Erro ao carregar a Central do dia:", err);
        setErro(mensagemDeErro(err));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [lojaAtual, alcance.mostra, podeNotas, podeCaixa, podeReceber, podeEstoque, podeClientes, podeOS]);

  const hoje = hojeLocal();
  const pendencias = useMemo(
    () =>
      montarCentralDoDia(
        {
          hoje,
          notasComErro: notas,
          movimentos: podeCaixa ? movimentos : [],
          fechamentos,
          contasReceber,
          ordens,
          contasPagar,
          pecas,
          saldos,
        },
        (m) => temPermissao(operador, m),
      ),
    [hoje, notas, movimentos, podeCaixa, fechamentos, contasReceber, ordens, contasPagar, pecas, saldos, operador],
  );

  // O contato da contabilidade só é buscado quando a linha do pacote está na
  // lista (dia 1 a 7, com o módulo Notas fiscais), e uma vez por loja.
  const lojaDoContatoId = lojaAtual?.id;
  const temLinhaDoPacote = pendencias.some((p) => p.tipo === "contabilidade_notas");
  useEffect(() => {
    if (!lojaDoContatoId || !temLinhaDoPacote) return;
    let cancelado = false;
    setContato(undefined);
    buscarContatoContabilidade(lojaDoContatoId)
      .then((c) => {
        if (!cancelado) setContato(c);
      })
      .catch((err) => {
        // Sem o contato, a linha cai no "cadastrar o contato": não derruba a lista.
        console.error("Erro ao carregar o contato da contabilidade:", err);
        if (!cancelado) setContato(null);
      });
    return () => {
      cancelado = true;
    };
  }, [lojaDoContatoId, temLinhaDoPacote]);

  if (!alcance.mostra) return null;

  async function gerarPacote() {
    if (!lojaAtual) return;
    const loja = { id: lojaAtual.id, nome: lojaAtual.nome };
    const lojaId = loja.id;
    const mesmaLoja = () => lojaAtualRef.current === lojaId;
    setAvisoPacote(null);
    setPacote({ feitos: 0, total: 0 });
    try {
      const mes = mesDoPacote(hoje);
      const doMes = await listarNotasDoMesParaPacote(lojaId, mes);
      if (!mesmaLoja()) return;
      // `aindaValido`: trocou de loja enquanto os PDFs vinham, o .zip da
      // loja anterior não baixa (revisão do #1003; a tela já se cuidava, o
      // download não).
      const { semPdf, baixado } = await gerarPacoteContabilidade({
        loja,
        notas: doMes,
        mes,
        aoProgredir: (feitos, total) => {
          if (mesmaLoja()) setPacote({ feitos, total });
        },
        aindaValido: mesmaLoja,
      });
      if (!baixado || !mesmaLoja()) return;
      setAvisoPacote({
        erro: false,
        texto:
          semPdf > 0
            ? `Pacote baixado. ${semPdf} nota${semPdf === 1 ? "" : "s"} sem PDF (o LEIA-ME diz quais).`
            : "Pacote baixado.",
      });
    } catch (err) {
      console.error("Erro ao gerar o pacote da contabilidade:", err);
      if (mesmaLoja()) setAvisoPacote({ erro: true, texto: mensagemDeErro(err) });
    } finally {
      if (mesmaLoja()) setPacote(null);
    }
  }

  const { visiveis, escondidas } = limitarPorTipo(pendencias);
  const telefoneDe = (clienteId: string | undefined) =>
    clientes.find((c) => c.id === clienteId)?.telefone ?? null;

  function abrirOS(ordem: OrdemServico) {
    navigate("/ordens-servico", { state: { abrirOrdemId: ordem.id } });
  }

  function acoes(p: Pendencia) {
    switch (p.tipo) {
      case "nota_com_erro":
        return ir("/notas-fiscais", "Ver a nota");
      case "caixa_sem_fechar":
        return ir("/caixa", "Fechar o caixa");
      case "conta_receber_vencida":
        return (
          <>
            {/* Sem o módulo Clientes o telefone não chega: o botão diria
                "cadastro sem telefone", que é mentira, então some (igual a
                Contas a Receber). */}
            {podeClientes && (
              <BotaoWhatsapp
                telefone={telefoneDe(p.conta.cliente_id)}
                texto={preencherModelo(
                  textoDoModelo(modelos, "cobranca"),
                  marcadoresDaCobranca(p.conta, lojaAtual?.nome),
                )}
                rotulo="Cobrar"
                titulo="Abrir a conversa no WhatsApp com a cobrança pronta"
                aoAbrir={() => {
                  if (!lojaAtual) return;
                  registrarMensagemAberta(
                    lojaAtual.id,
                    "cobranca",
                    p.conta.id,
                    telefoneDe(p.conta.cliente_id),
                    operador?.id ?? null,
                  );
                }}
              />
            )}
            {ir("/contas-receber", "Receber")}
          </>
        );
      case "carro_pronto":
        return (
          <>
            {podeClientes && (
              <BotaoWhatsapp
                telefone={telefoneDe(p.ordem.cliente_id)}
                texto={preencherModelo(
                  textoDoModelo(modelos, "carro_pronto"),
                  marcadoresDoCarroPronto(p.ordem, lojaAtual?.nome),
                )}
                rotulo="Avisar"
                titulo="Abrir a conversa no WhatsApp avisando que o carro está pronto"
                aoAbrir={() => {
                  if (!lojaAtual) return;
                  registrarMensagemAberta(
                    lojaAtual.id,
                    "carro_pronto",
                    p.ordem.id,
                    telefoneDe(p.ordem.cliente_id),
                    operador?.id ?? null,
                  );
                }}
              />
            )}
            <Botao tamanho="pequeno" onClick={() => abrirOS(p.ordem)}>
              Abrir a OS
            </Botao>
          </>
        );
      case "conta_pagar_vencendo":
        return ir("/contas-pagar", "Pagar");
      case "os_parada":
        return (
          <Botao tamanho="pequeno" onClick={() => abrirOS(p.ordem)}>
            Abrir a OS
          </Botao>
        );
      case "estoque_baixo":
        // A linha só aparece pra quem tem Estoque; com Fornecedores também, vai
        // direto à Sugestão de compra (a aba só existe pra quem tem os dois).
        return podeFornecedores ? (
          ir("/fornecedores", "Sugestão de compra", { aba: "sugestao" })
        ) : (
          ir("/estoque", "Ver no estoque")
        );
      case "contabilidade_notas":
        return (
          <>
            <Botao tamanho="pequeno" onClick={gerarPacote} disabled={pacote !== null} ocupado={pacote !== null}>
              {pacote === null
                ? "Gerar o pacote"
                : pacote.total > 0
                  ? `Buscando PDF ${pacote.feitos} de ${pacote.total}…`
                  : "Preparando..."}
            </Botao>
            {contato?.whatsapp ? (
              <BotaoWhatsapp
                telefone={contato.whatsapp}
                texto={preencherModelo(
                  textoDoModelo(modelos, "contabilidade"),
                  marcadoresDaContabilidade(contato.nome, lojaAtual?.nome, mesDoPacote(hoje)),
                )}
                rotulo="Abrir conversa"
                titulo="Abrir a conversa no WhatsApp com a mensagem pronta (o pacote .zip você anexa)"
                aoAbrir={() => {
                  if (!lojaAtual) return;
                  registrarMensagemAberta(
                    lojaAtual.id,
                    "contabilidade",
                    mesDoPacote(hoje),
                    contato.whatsapp,
                    operador?.id ?? null,
                  );
                }}
              />
            ) : contato === undefined || !operador?.admin ? null : (
              <button
                type="button"
                onClick={() => navigate("/configuracoes")}
                className="text-rotulo font-medium text-sakura-purple-dark underline underline-offset-2"
              >
                cadastrar o WhatsApp do contador
              </button>
            )}
            {avisoPacote && (
              <p
                role={avisoPacote.erro ? "alert" : "status"}
                className={`basis-full text-right text-rotulo ${avisoPacote.erro ? "text-red-300" : "text-emerald-300"}`}
              >
                {avisoPacote.texto}
              </p>
            )}
          </>
        );
      case "contabilidade_extrato":
        // O extrato é do banco, não do programa: não há tela que resolva.
        return null;
    }
  }

  function ir(para: string, rotulo: string, state?: { aba: string }) {
    return (
      <Botao tamanho="pequeno" onClick={() => navigate(para, { state })}>
        {rotulo}
      </Botao>
    );
  }

  const total = pendencias.length;
  const semNada = !erro && !carregando && visiveis.length === 0 && !dadosIncompletos;

  return (
    <>
      <section
        className="sakura-card grid overflow-hidden md:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]"
        aria-labelledby="central-do-dia-titulo"
      >
        {/* A capa: a marca, o total e o que ele quer dizer. O total é de TODAS as
            pendências, não só das linhas à vista: ninguém acha que só existem as 4. */}
        <div
          data-capa-central
          className="sakura-capa-central sakura-grao flex flex-col justify-between p-6"
          style={{ minHeight: ALTURA_DO_CARTAO_PX }}
        >
          <div className="relative z-[2] flex items-center justify-between gap-2">
            <h2
              id="central-do-dia-titulo"
              className="text-meta font-bold uppercase tracking-[0.2em] text-texto"
            >
              Central do dia
            </h2>
            <Explicacao titulo="Central do dia" texto={EXPLICACAO} />
          </div>
          <div className="relative z-[2]">
            {erro || carregando || (visiveis.length === 0 && dadosIncompletos) ? (
              <p className="font-titulo text-capa font-extrabold">
                {carregando ? "…" : "—"}
              </p>
            ) : semNada ? (
              // Com só parte dos módulos a pessoa não sabe da loja inteira: a capa não afirma
              // "Tudo em dia" (a lista ao lado já diz "nas áreas que você pode ver").
              <p className="font-titulo text-capa-curto font-extrabold">
                {alcance.parcial ? "Nada pendente" : "Tudo em dia"}
              </p>
            ) : (
              <>
                <p data-total-da-central className="font-titulo text-capa font-extrabold">
                  {total}
                </p>
                <p className="mt-2 text-subtitulo font-semibold leading-snug">
                  {total === 1 ? "coisa pede" : "coisas pedem"} a sua atenção hoje
                </p>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0" style={{ height: ALTURA_DO_CARTAO_PX }}>
          {erro ? (
            <p className="m-5 rounded-xl bg-perigo/[0.13] px-3 py-2 text-perigo">{erro}</p>
          ) : carregando ? (
            <p className="p-5 text-corpo text-texto-2">Carregando...</p>
          ) : semNada ? (
            <p className="flex h-full items-center px-6 text-corpo text-texto-2">
              {mensagemDaListaVazia(alcance.parcial)}
            </p>
          ) : visiveis.length === 0 ? null : (
            <AreaRolavel>
              <ul>
                {visiveis.map((p, i) => {
                  const ultimoDoTipo = visiveis[i + 1]?.tipo !== p.tipo;
                  const sobra = ultimoDoTipo ? escondidas.get(p.tipo) : undefined;
                  const selo = SELO_DO_TIPO[p.tipo];
                  return (
                    <li key={p.chave} className="border-b border-linha last:border-b-0">
                      <div
                        data-linha-da-central
                        className="flex items-center gap-3 px-5"
                        style={{ height: ALTURA_DA_LINHA_PX }}
                      >
                        <span className="w-[6.75rem] shrink-0">
                          <Selo tipo={selo.tipo} palavra={selo.palavra} icone={selo.icone} />
                        </span>
                        <div className="min-w-0 flex-1" title={`${p.titulo} — ${p.detalhe}`}>
                          <p className="truncate text-corpo font-semibold text-texto">{p.titulo}</p>
                          <p className="truncate text-rotulo text-texto-2">{p.detalhe}</p>
                        </div>
                        <div className="flex shrink-0 items-center justify-end gap-2 pr-2">
                          {acoes(p)}
                        </div>
                      </div>
                      {sobra ? (
                        <button
                          type="button"
                          onClick={() => navigate(TELA_DO_TIPO[p.tipo])}
                          className="mb-2 ml-[8.75rem] text-rotulo font-medium text-texto-2 underline-offset-2 hover:text-texto hover:underline"
                        >
                          e mais {sobra}…
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </AreaRolavel>
          )}
        </div>
      </section>

      {!erro && !carregando && dadosIncompletos && (
        <p className="rounded-xl bg-atencao/[0.12] px-3 py-2 text-rotulo text-atencao">
          Parte do Início não carregou: esta lista pode estar faltando coisa.
        </p>
      )}
    </>
  );
}
