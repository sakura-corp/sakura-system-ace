import { Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import { Dica } from "@/components/Dica";
import { Explicacao } from "@/components/Explicacao";
import { useConfirmar } from "@/components/JanelaDeConfirmar";
import { Modal } from "@/components/Modal";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { avisar } from "@/lib/avisoQueSome";
import {
  diaAnterior,
  filtrarPorTipo,
  movimentosDoDia,
  movimentosSemCategoria,
  resumirDiaDoCaixa,
  resumirSemCategoria,
  saidasDoMes,
  totalDoFiltro,
  type FiltroDoCaixa,
} from "@/schemas/caixa";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  lancamentosDepoisDoFechamento,
  rotuloDaForma,
  situacaoDaDiferenca,
  totaisPorFormaDePagamento,
} from "@/schemas/fechamentoCaixa";
import {
  custoDaOrdemPeloBanco,
  lucroPorMovimento,
  type CustoDoBanco,
} from "@/schemas/metricasCaixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import { nomeOrdem } from "@/types/os";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { MovimentoCaixa, NovoMovimentoCaixa } from "@/types/caixa";
import { JanelaDoLancamento } from "./CaixaForm";
import { CartaoAReceberSection } from "./CartaoAReceberSection";
import { CategorizarSemCategoria } from "./CategorizarSemCategoria";
import { FechamentoSection } from "./FechamentoSection";

interface DiarioSectionProps {
  /** O dia que a página mostra, "YYYY-MM-DD" (o campo "Dia" do cabeçalho). */
  dia: string;
  lojaId: string;
  movimentos: MovimentoCaixa[];
  custoDasOrdens: CustoDoBanco;
  categorias: CategoriaCaixa[];
  fechamentos?: FechamentoCaixa[];
  /** Só admin da loja desfaz um fechamento. */
  podeDesfazer?: boolean;
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
  /** Recarrega o caixa depois de mexer no que já estava gravado. */
  onAtualizado?: () => Promise<void>;
}

const FILTROS = [
  { valor: "tudo", nome: "Tudo" },
  { valor: "entrada", nome: "Entradas" },
  { valor: "saida", nome: "Saídas" },
] as const;

const MAIORES_CATEGORIAS = 5;

function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * A página do dia: o saldo em destaque com o botão de fechar o caixa, os três
 * números de apoio, a lista do dia (com o filtro colado nela) e, do lado, as
 * formas de pagamento, as saídas do mês e os últimos fechamentos. O
 * lançamento, o fechamento e o cartão a receber abrem em janela.
 */
export function DiarioSection({
  dia,
  lojaId,
  movimentos,
  custoDasOrdens,
  categorias,
  fechamentos = [],
  podeDesfazer = false,
  onSalvar,
  onAtualizado = async () => {},
}: DiarioSectionProps) {
  const [filtro, setFiltro] = useState<FiltroDoCaixa>("tudo");
  const [lancando, setLancando] = useState<{ tipo: "entrada" | "saida" } | null>(null);
  const [fechamentoAberto, setFechamentoAberto] = useState(false);
  const [cartaoAberto, setCartaoAberto] = useState(false);
  const [categorizando, setCategorizando] = useState(false);
  const [vendoTodasAsSaidas, setVendoTodasAsSaidas] = useState(false);
  const { confirmar, janela: janelaDeConfirmar } = useConfirmar();

  const hoje = hojeLocal();
  const ehHoje = dia === hoje;
  const custoDaOrdem = useMemo(() => custoDaOrdemPeloBanco(custoDasOrdens), [custoDasOrdens]);

  const doDia = useMemo(() => movimentosDoDia(movimentos, dia), [movimentos, dia]);
  const resumo = useMemo(() => resumirDiaDoCaixa(doDia, custoDaOrdem), [doDia, custoDaOrdem]);
  const saldoDeOntem = useMemo(
    () => resumirDiaDoCaixa(movimentosDoDia(movimentos, diaAnterior(dia)), custoDaOrdem).saldo,
    [movimentos, dia, custoDaOrdem],
  );
  const formasDoDia = useMemo(() => totaisPorFormaDePagamento(doDia), [doDia]);
  const saidasMes = useMemo(() => saidasDoMes(movimentos, dia), [movimentos, dia]);
  // Lucro de cada linha: numa OS paga em duas formas, o lucro da OS é
  // repartido entre os lançamentos (senão o total contaria duas vezes).
  const lucros = useMemo(() => lucroPorMovimento(doDia, custoDaOrdem), [doDia, custoDaOrdem]);

  const lista = useMemo(() => filtrarPorTipo(doDia, filtro), [doDia, filtro]);

  const fechamentoDeHoje = fechamentos.find((f) => f.data === hoje) ?? null;
  const fechamentoDoDia = fechamentos.find((f) => f.data === dia) ?? null;
  const idsDepoisDoFechamento = useMemo(
    () => new Set(lancamentosDepoisDoFechamento(doDia, fechamentoDoDia).map((m) => m.id)),
    [doDia, fechamentoDoDia],
  );
  const ultimosFechamentos = useMemo(
    () => [...fechamentos].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)).slice(0, 3),
    [fechamentos],
  );

  const tipoDoFiltro = filtro === "tudo" ? null : filtro;
  const semCategoria = tipoDoFiltro ? movimentosSemCategoria(movimentos, tipoDoFiltro) : [];
  const resumoSemCategoria = tipoDoFiltro
    ? resumirSemCategoria(movimentos, tipoDoFiltro)
    : { quantidade: 0, total: 0 };
  const categoriasDoFiltro = categorias.filter((c) => c.tipo === tipoDoFiltro);

  async function pedirLancamento() {
    // Lançar depois do fechamento não é proibido (aviso, nunca tranca): mas é
    // o que faz a gaveta deixar de bater com o que foi contado, então pede
    // confirmação e o lançamento aparece marcado.
    if (fechamentoDeHoje) {
      const certo = await confirmar({
        acao: "Lançar depois do fechamento",
        explicacao: `O caixa de hoje já foi fechado às ${horaDe(fechamentoDeHoje.criado_em)}. Este lançamento vai aparecer marcado como feito depois do fechamento.`,
        botao: "Lançar mesmo assim",
        tom: "normal",
      });
      if (!certo) return;
    }
    setLancando({ tipo: filtro === "saida" ? "saida" : "entrada" });
  }

  async function salvarLancamento(movimento: NovoMovimentoCaixa) {
    await onSalvar(movimento);
    setLancando(null);
    avisar("Lançamento registrado");
  }

  function escolherFiltro(novo: FiltroDoCaixa) {
    setFiltro(novo);
    setCategorizando(false);
  }

  const quando = ehHoje ? "hoje" : "neste dia";
  const textoVazio =
    filtro === "entrada"
      ? `Nenhuma entrada ${quando}`
      : filtro === "saida"
        ? `Nenhuma saída ${quando}`
        : `Nenhum lançamento ${quando}`;

  const categoriasDoMes = saidasMes.porCategoria;
  const categoriasMostradas = vendoTodasAsSaidas
    ? categoriasDoMes
    : categoriasDoMes.slice(0, MAIORES_CATEGORIAS);

  return (
    <>
      {/* As janelas ficam FORA dos elementos `@container`: a contenção deles
          vira o bloco de referência do `position: fixed`, e a janela nasceria
          presa dentro da coluna. */}
      <div className="@container">
      <div className="flex flex-col gap-6 @4xl:flex-row @4xl:items-start">
        {/* ---------------------------------------------------- principal */}
        <div className="@container min-w-0 flex-1 space-y-6">
          <section className="sakura-card p-6" aria-label="Saldo do dia">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-rotulo font-medium text-texto-2">Saldo do dia</p>
                  <Explicacao titulo="Saldo do dia" texto={EXPLICA.saldo} />
                </div>
                <p className="mt-2 whitespace-nowrap font-titulo text-capa-curto font-bold tracking-[-0.02em] tabular-nums">
                  <Valor valor={resumo.saldo} />
                </p>
                <p className="mt-2 text-corpo text-texto-2">
                  {ehHoje ? "Ontem" : "Dia anterior"}:{" "}
                  <Valor valor={saldoDeOntem} classeDeCor="text-texto-2" className="font-medium tabular-nums" />
                </p>
              </div>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {fechamentoDoDia && (
                  <Selo tipo="ok" palavra={`Fechado às ${horaDe(fechamentoDoDia.criado_em)}`} />
                )}
                {ehHoje && !fechamentoDoDia ? (
                  <Botao variante="principal" tamanho="grande" onClick={() => setFechamentoAberto(true)}>
                    Fechar o caixa de hoje
                  </Botao>
                ) : (
                  <Botao onClick={() => setFechamentoAberto(true)}>Ver o fechamento</Botao>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 @xl:grid-cols-3">
            <NumeroDeApoio titulo="Dinheiro na gaveta" explicacao={EXPLICA.gaveta}>
              <Valor valor={resumo.gaveta} />
            </NumeroDeApoio>
            <NumeroDeApoio titulo="Pix e cartão" explicacao={EXPLICA.pixECartao}>
              <Valor valor={resumo.pixECartao} />
            </NumeroDeApoio>
            {/* Dia de prejuízo existe e precisa parecer prejuízo: o <Valor> põe
                o "−", a seta e a cor. */}
            <NumeroDeApoio titulo="Lucro do dia" explicacao={EXPLICA.lucro}>
              <Valor valor={resumo.lucro} />
            </NumeroDeApoio>
          </div>

          {categorizando && tipoDoFiltro && (
            <CategorizarSemCategoria
              tipo={tipoDoFiltro}
              movimentos={semCategoria}
              categorias={categoriasDoFiltro}
              onConcluir={async () => {
                await onAtualizado();
                setCategorizando(false);
              }}
              onCancelar={() => setCategorizando(false)}
            />
          )}

          <section className="sakura-card min-w-0 p-6" aria-label="Lançamentos do dia">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <h2 className="font-titulo text-subtitulo font-semibold text-texto">Lançamentos do dia</h2>
              <Chips rotulo="Mostrar" opcoes={FILTROS} valor={filtro} aoEscolher={escolherFiltro} />
              <Botao className="ml-auto" icone={<Plus />} onClick={pedirLancamento}>
                Novo lançamento
              </Botao>
            </div>

            {resumoSemCategoria.quantidade > 0 && !categorizando && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-atencao/[0.12] px-4 py-3">
                <p className="flex min-w-0 flex-1 basis-80 items-start gap-2 text-corpo text-atencao">
                  <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">
                    {resumoSemCategoria.quantidade === 1
                      ? "1 lançamento antigo está sem categoria"
                      : `${resumoSemCategoria.quantidade} lançamentos antigos estão sem categoria`}
                    , somando {formatarMoeda(resumoSemCategoria.total)} — eles ficam de fora do resumo
                    por categoria.
                  </span>
                </p>
                <Botao onClick={() => setCategorizando(true)} disabled={categoriasDoFiltro.length === 0}>
                  Categorizar agora
                </Botao>
              </div>
            )}

            {lista.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-4 py-8 text-center">
                <p className="text-corpo text-texto-2">{textoVazio}</p>
                <Botao onClick={pedirLancamento}>Lançar agora</Botao>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="sakura-tabela">
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Lançamento</th>
                      <th>Cliente</th>
                      <th>Forma</th>
                      <th className="text-right">Valor</th>
                      <th className="text-right">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((m) => {
                      const lucro = lucros.get(m.id) ?? null;
                      const saida = m.tipo === "saida";
                      return (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap text-texto-2">{horaDe(m.data)}</td>
                          <td className="text-texto">
                            <span className="font-medium">
                              {m.ordem_servico_id
                                ? m.ordem_servico?.numero
                                  ? nomeOrdem(m.ordem_servico.numero, m.ordem_servico.tipo)
                                  : "OS"
                                : m.categoria?.nome || m.descricao || "Lançamento manual"}
                            </span>
                            {idsDepoisDoFechamento.has(m.id) && (
                              <Dica texto="Entrou depois de o caixa do dia ser fechado — não estava na gaveta quando ela foi contada.">
                                <span tabIndex={0} className="ml-2 inline-flex rounded-full align-middle">
                                  <Selo tipo="atencao" palavra="Depois do fechamento" />
                                  {/* A explicação também no texto, pro leitor de
                                      tela ouvir lendo a linha (a dica só aparece
                                      com o mouse ou o foco). */}
                                  <span className="sr-only">
                                    : entrou depois de o caixa do dia ser fechado, não estava na gaveta
                                    quando ela foi contada.
                                  </span>
                                </span>
                              </Dica>
                            )}
                          </td>
                          <td className="text-texto">{m.ordem_servico?.cliente?.nome ?? "—"}</td>
                          <td className="text-texto-2">
                            {m.forma_pagamento ? rotuloDaForma(m.forma_pagamento) : "—"}
                          </td>
                          <td
                            className={`whitespace-nowrap text-right font-semibold tabular-nums ${
                              saida ? "text-perigo" : "text-ok"
                            }`}
                          >
                            {saida ? "− " : "+ "}
                            {formatarMoeda(m.valor)}
                          </td>
                          <td className="whitespace-nowrap text-right tabular-nums text-texto-2">
                            {lucro !== null ? <Valor valor={lucro} classeDeCor="text-texto-2" /> : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-linha-forte bg-poco font-semibold">
                      <td className="text-texto" colSpan={4}>
                        Total
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        <Valor valor={totalDoFiltro(lista)} />
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {filtro === "tudo" ? <Valor valor={resumo.lucro} /> : null}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ----------------------------------------------------- lateral */}
        <aside className="w-full min-w-0 space-y-6 @4xl:w-80 @4xl:shrink-0">
          <section className="sakura-card p-6">
            <h2 className="font-titulo text-corpo font-semibold text-texto">Formas de pagamento do dia</h2>
            {formasDoDia.length === 0 ? (
              <p className="mt-3 text-corpo text-texto-2">Nada recebido neste dia.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {formasDoDia.map(([forma, valor]) => (
                  <li key={forma} className="flex items-baseline justify-between gap-4 text-corpo">
                    <span className="min-w-0 text-texto-2">{forma}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-texto">
                      {formatarMoeda(valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sakura-card p-6">
            <h2 className="font-titulo text-corpo font-semibold text-texto">Saídas do mês</h2>
            {saidasMes.total === 0 ? (
              <p className="mt-3 text-corpo text-texto-2">Nenhuma saída neste mês.</p>
            ) : (
              <>
                <p className="mt-2 font-titulo text-destaque font-semibold tabular-nums text-perigo">
                  − {formatarMoeda(saidasMes.total)}
                </p>
                <ul className="mt-3 space-y-2">
                  {categoriasMostradas.map(([nome, valor]) => (
                    <li key={nome} className="flex items-baseline justify-between gap-4 text-corpo">
                      <span className="min-w-0 text-texto-2">{nome}</span>
                      <span className="shrink-0 tabular-nums text-texto">{formatarMoeda(valor)}</span>
                    </li>
                  ))}
                </ul>
                {categoriasDoMes.length > MAIORES_CATEGORIAS && (
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    className="mt-3"
                    onClick={() => setVendoTodasAsSaidas((v) => !v)}
                  >
                    {vendoTodasAsSaidas ? "Ver só as maiores" : "Ver todas"}
                  </Botao>
                )}
              </>
            )}
          </section>

          <section className="sakura-card p-6">
            <h2 className="font-titulo text-corpo font-semibold text-texto">Últimos fechamentos</h2>
            {ultimosFechamentos.length === 0 ? (
              <p className="mt-3 text-corpo text-texto-2">Nenhum fechamento ainda.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {ultimosFechamentos.map((f) => {
                  const situacao = situacaoDaDiferenca(f.diferenca);
                  const valor = formatarMoeda(Math.abs(f.diferenca));
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-4 text-corpo">
                      <span className="min-w-0 text-texto-2">{diaBrasileiro(f.data)}</span>
                      {situacao === "bateu" ? (
                        <Selo tipo="ok" palavra="Bateu" />
                      ) : situacao === "faltou" ? (
                        <Selo tipo="perigo" palavra={`Faltou ${valor}`} />
                      ) : (
                        <Selo tipo="atencao" palavra={`Sobrou ${valor}`} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <Botao variante="fantasma" tamanho="pequeno" className="mt-3" onClick={() => setFechamentoAberto(true)}>
              Ver fechamentos
            </Botao>
          </section>

          <Botao className="w-full justify-center" onClick={() => setCartaoAberto(true)}>
            Cartão a receber
          </Botao>
        </aside>
      </div>
      </div>

      {lancando && (
        <JanelaDoLancamento
          categorias={categorias}
          tipoInicial={lancando.tipo}
          onSalvar={salvarLancamento}
          onFechar={() => setLancando(null)}
        />
      )}
      {fechamentoAberto && (
        <Modal titulo="Fechamento do caixa" largura="4xl" onFechar={() => setFechamentoAberto(false)}>
          <FechamentoSection
            lojaId={lojaId}
            movimentos={movimentos}
            custoDasOrdens={custoDasOrdens}
            fechamentos={fechamentos}
            podeDesfazer={podeDesfazer}
            onAtualizado={onAtualizado}
          />
        </Modal>
      )}
      {cartaoAberto && (
        <Modal titulo="Cartão a receber" largura="4xl" onFechar={() => setCartaoAberto(false)}>
          <CartaoAReceberSection key={lojaId} lojaId={lojaId} />
        </Modal>
      )}
      {janelaDeConfirmar}
    </>
  );
}

/** Um número de apoio: menor que o saldo, num cartão fino. */
function NumeroDeApoio({
  titulo,
  explicacao,
  children,
}: {
  titulo: string;
  explicacao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sakura-card min-w-0 px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="text-rotulo font-medium text-texto-2">{titulo}</p>
        <Explicacao titulo={titulo} texto={explicacao} />
      </div>
      <p className="mt-1 whitespace-nowrap font-titulo text-destaque font-semibold tabular-nums">
        {children}
      </p>
    </div>
  );
}

/**
 * A frase do "?" de cada número: o que ele quer dizer, em palavras de balcão.
 * Só texto: a conta mora em `schemas/`.
 */
const EXPLICA = {
  saldo:
    "Entradas menos saídas do dia. Pix e cartão também entram aqui: não é o dinheiro da gaveta.",
  gaveta:
    "O que entrou menos o que saiu em dinheiro neste dia, sem o troco da manhã. A conferência com o que está na gaveta é no fechamento do caixa.",
  pixECartao: "O que entrou neste dia por Pix e cartão, e não pela gaveta.",
  lucro:
    "Entradas menos saídas, menos o custo das peças e dos serviços das ordens e vendas de balcão que receberam neste dia. Fica vermelho, com a seta pra baixo, quando o dia deu prejuízo.",
};
