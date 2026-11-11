import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { Explicacao } from "@/components/Explicacao";
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

const COR_DO_TIPO: Record<TipoPendencia, string> = {
  nota_com_erro: "bg-red-500",
  caixa_sem_fechar: "bg-red-500",
  conta_receber_vencida: "bg-amber-500",
  carro_pronto: "bg-amber-500",
  conta_pagar_vencendo: "bg-amber-500",
  os_parada: "bg-sakura-purple",
  estoque_baixo: "bg-sakura-purple",
  contabilidade_notas: "bg-sakura-gray",
  contabilidade_extrato: "bg-sakura-gray",
};

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

const CLASSE_BOTAO =
  "inline-flex h-8 items-center rounded-lg border border-sakura-borda-campo px-3 text-rotulo " +
  "font-medium text-sakura-purple-dark transition hover:bg-white/10";

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
    const lojaId = lojaAtual.id;
    const mesmaLoja = () => lojaAtualRef.current === lojaId;
    setAvisoPacote(null);
    setPacote({ feitos: 0, total: 0 });
    try {
      const mes = mesDoPacote(hoje);
      const doMes = await listarNotasDoMesParaPacote(lojaId, mes);
      if (!mesmaLoja()) return;
      const { semPdf } = await gerarPacoteContabilidade({
        notas: doMes,
        mes,
        aoProgredir: (feitos, total) => {
          if (mesmaLoja()) setPacote({ feitos, total });
        },
      });
      if (!mesmaLoja()) return;
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
            <button type="button" className={CLASSE_BOTAO} onClick={() => abrirOS(p.ordem)}>
              Abrir a OS
            </button>
          </>
        );
      case "conta_pagar_vencendo":
        return ir("/contas-pagar", "Pagar");
      case "os_parada":
        return (
          <button type="button" className={CLASSE_BOTAO} onClick={() => abrirOS(p.ordem)}>
            Abrir a OS
          </button>
        );
      case "estoque_baixo":
        return podeFornecedores ? (
          ir("/fornecedores", "Pedido de compra")
        ) : (
          ir("/estoque", "Ver no estoque")
        );
      case "contabilidade_notas":
        return (
          <>
            <button type="button" className={CLASSE_BOTAO} onClick={gerarPacote} disabled={pacote !== null}>
              {pacote === null
                ? "Gerar o pacote"
                : pacote.total > 0
                  ? `Buscando PDF ${pacote.feitos} de ${pacote.total}…`
                  : "Preparando..."}
            </button>
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

  function ir(para: string, rotulo: string) {
    return (
      <button type="button" className={CLASSE_BOTAO} onClick={() => navigate(para)}>
        {rotulo}
      </button>
    );
  }

  return (
    <section className="sakura-card p-4" aria-labelledby="central-do-dia-titulo">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 id="central-do-dia-titulo" className="text-corpo font-semibold text-sakura-purple-dark">
          Central do dia
        </h2>
        <Explicacao titulo="Central do dia" texto={EXPLICACAO} />
      </div>

      {erro ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>
      ) : carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : visiveis.length === 0 && !dadosIncompletos ? (
        <p className="text-corpo text-sakura-purple-dark/85">
          {mensagemDaListaVazia(alcance.parcial)}
        </p>
      ) : visiveis.length === 0 ? null : (
        <ul className="divide-y divide-white/10">
          {visiveis.map((p, i) => {
            const ultimoDoTipo = visiveis[i + 1]?.tipo !== p.tipo;
            const sobra = ultimoDoTipo ? escondidas.get(p.tipo) : undefined;
            return (
              <li key={p.chave} className="py-2">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${COR_DO_TIPO[p.tipo]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-corpo font-medium text-sakura-purple-dark">
                      {p.titulo}
                    </p>
                    <p className="truncate text-rotulo text-sakura-muted">{p.detalhe}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
                    {acoes(p)}
                  </div>
                </div>
                {sobra ? (
                  <button
                    type="button"
                    onClick={() => navigate(TELA_DO_TIPO[p.tipo])}
                    className="mt-1 ml-5 text-rotulo font-medium text-sakura-purple-dark underline-offset-2 hover:underline"
                  >
                    e mais {sobra}…
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {!erro && !carregando && dadosIncompletos && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
          Parte do Início não carregou: esta lista pode estar faltando coisa.
        </p>
      )}
    </section>
  );
}
