// O Financeiro (#654): os totais do mês e o gráfico mês a mês pra todo mundo; a lista e o formulário
// de lançamentos só pra dona (`podeLancar`). Nenhuma conta de dinheiro aqui: tudo vem de logica/financeiro*.ts.
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatarCentavos, mesAnterior, nomeCurtoDoMes } from "../logica/financeiro";
import {
  apagarLancamento,
  barrasDoGrafico,
  diaCurto,
  diaPadraoDoMes,
  enderecoDoMes,
  enviarLancamento,
  mesSeguinteAte,
  textoDoCrescimento,
  valorParaEditar,
  type EstadoDoFinanceiro,
  type FormularioDeLancamento,
  type Lancamento,
  type ListaDaDona,
  type ResultadoDaEscrita,
} from "../logica/financeiroDados";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { ErroDaLeva } from "./TelaDaLeva";

type Pronto = Extract<EstadoDoFinanceiro, { tipo: "pronto" }>;

const CAMPO = "min-h-11 w-full min-w-0 rounded-lg border border-borda bg-cartao px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";
const BOTAO = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";
const BOTAO_CHEIO = `${BOTAO} bg-destaque text-sobre-destaque hover:opacity-90 disabled:opacity-60`;
const BOTAO_VAZIO = `${BOTAO} border border-borda text-texto hover:bg-livre-fundo`;

export function PaginaFinanceiro({
  estado,
  mes,
  agora,
  tentarDeNovo,
  aoMudar,
}: {
  estado: EstadoDoFinanceiro;
  /** O mês da página ("AAAA-MM"). */
  mes: string;
  agora: Date;
  tentarDeNovo: () => void;
  /** Depois de lançar, editar ou apagar: busca de novo. */
  aoMudar: () => Promise<boolean>;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <CabecalhoDaPagina
        trilha="3º · Financeiro"
        titulo="Financeiro"
        explicacao="Quanto entrou, quanto saiu e como o mês se compara aos anteriores."
      />
      {estado.tipo === "pronto" || estado.tipo === "carregando" || estado.tipo === "erro" ? <SeletorDeMes mes={mes} agora={agora} /> : null}
      <div className="mt-6">
        {estado.tipo === "carregando" ? (
          <Esqueleto />
        ) : estado.tipo === "erro" ? (
          <ErroDaLeva mensagem={estado.mensagem} tentarDeNovo={tentarDeNovo} />
        ) : estado.tipo === "sem-banco" ? (
          <p role="status" className="rounded-xl border border-borda bg-cartao px-4 py-6 text-center text-sm text-texto-2">
            O banco do financeiro ainda não foi ligado. Quando for, os totais aparecem aqui.
          </p>
        ) : estado.tipo === "pronto" ? (
          <Conteudo estado={estado} agora={agora} aoMudar={aoMudar} />
        ) : null}
      </div>
    </div>
  );
}

function Esqueleto() {
  const bloco = "rounded-xl bg-livre-fundo motion-safe:animate-pulse";
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Buscando o financeiro…
      </p>
      <div aria-hidden="true">
        <div className={`h-24 ${bloco}`} />
        <div className={`mt-6 h-48 ${bloco}`} />
      </div>
    </div>
  );
}

function SeletorDeMes({ mes, agora }: { mes: string; agora: Date }) {
  const anterior = mesAnterior(mes);
  const seguinte = mesSeguinteAte(mes, agora);
  const link = "inline-flex min-h-11 items-center gap-1 rounded-lg border border-borda px-3 text-sm text-texto hover:bg-livre-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";
  return (
    <nav aria-label="Mês" className="mt-4 flex flex-wrap items-center gap-2">
      <a href={enderecoDoMes(anterior)} className={link}>
        <ChevronLeft aria-hidden="true" className="size-4" />
        <span className="sr-only">Mês anterior: </span>
        {nomeCurtoDoMes(anterior)}
      </a>
      <p className="min-w-[6.5rem] text-center font-serif text-lg font-semibold">{nomeCurtoDoMes(mes)}</p>
      {seguinte !== null ? (
        <a href={enderecoDoMes(seguinte)} className={link}>
          <span className="sr-only">Mês seguinte: </span>
          {nomeCurtoDoMes(seguinte)}
          <ChevronRight aria-hidden="true" className="size-4" />
        </a>
      ) : null}
    </nav>
  );
}

function Conteudo({ estado, agora, aoMudar }: { estado: Pronto; agora: Date; aoMudar: () => Promise<boolean> }) {
  const { resumo } = estado;
  const m = resumo.mesAtual;
  return (
    <div className="space-y-8">
      <section aria-labelledby="fin-totais">
        <h2 id="fin-totais" className="sr-only">
          Totais de {nomeCurtoDoMes(estado.mes)}
        </h2>
        <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-4">
          <Cartao rotulo="Entrou" valor={formatarCentavos(m.entrouCentavos)} cor="bg-serie-entrada" />
          <Cartao rotulo="Saiu" valor={formatarCentavos(m.saiuCentavos)} cor="bg-serie-saida" />
          <Cartao rotulo="Saldo" valor={formatarCentavos(m.saldoCentavos)} />
          <Cartao rotulo="Entradas, contra o mês anterior" valor={textoDoCrescimento(m.crescimentoPercentual)} />
        </dl>
      </section>

      <section aria-labelledby="fin-grafico" className="min-w-0 rounded-xl border border-borda bg-cartao p-4">
        <h2 id="fin-grafico" className="font-serif text-xl font-semibold">
          Mês a mês
        </h2>
        <Grafico estado={estado} />
      </section>

      <section aria-labelledby="fin-categorias" className="min-w-0">
        <h2 id="fin-categorias" className="font-serif text-xl font-semibold">
          Saídas por categoria
        </h2>
        {resumo.saidasPorCategoria.length === 0 ? (
          <p className="mt-3 rounded-xl border border-borda bg-cartao px-4 py-4 text-sm text-texto-2">Nenhuma saída neste mês.</p>
        ) : (
          <ul className="mt-3 divide-y divide-borda rounded-xl border border-borda bg-cartao">
            {resumo.saidasPorCategoria.map((s) => (
              <li key={s.categoria} className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 [overflow-wrap:anywhere]">{s.categoria}</span>
                <span className="shrink-0 font-medium tabular-nums">{formatarCentavos(s.saiuCentavos)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {estado.podeLancar && estado.lista ? <Lancamentos mes={estado.mes} lista={estado.lista} agora={agora} aoMudar={aoMudar} /> : null}
    </div>
  );
}

function Cartao({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-borda bg-cartao px-4 py-3">
      <dt className="flex items-center gap-2 text-[13px] text-texto-2">
        {cor ? <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm ${cor}`} /> : null}
        {rotulo}
      </dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">{valor}</dd>
    </div>
  );
}

// ---- O gráfico: colunas lado a lado, feitas à mão, com a mesma régua pras duas séries ----

function Grafico({ estado }: { estado: Pronto }) {
  const barras = barrasDoGrafico(estado.resumo.meses);
  return (
    <div className="mt-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-texto" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-serie-entrada" />
          Entrou
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-serie-saida" />
          Saiu
        </li>
      </ul>
      <div
        role="img"
        aria-label={`Entradas e saídas mês a mês, de ${barras[0]?.nomeCompleto ?? ""} a ${barras.at(-1)?.nomeCompleto ?? ""}. Os números estão na tabela logo abaixo.`}
        className="mt-3 flex items-end gap-1 border-b border-borda"
      >
        {barras.map((b) => (
          <div key={b.mes} title={`${b.nomeCompleto}: entrou ${b.entrouTexto}, saiu ${b.saiuTexto}`} className="flex h-44 min-w-0 flex-1 items-end justify-center gap-0.5">
            <div className="w-2 rounded-t-[4px] bg-serie-entrada min-[480px]:w-3.5" style={{ height: `${b.entrouPct}%` }} />
            <div className="w-2 rounded-t-[4px] bg-serie-saida min-[480px]:w-3.5" style={{ height: `${b.saiuPct}%` }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex gap-1">
        {barras.map((b) => (
          <p key={b.mes} className={`min-w-0 flex-1 text-center text-[11px] ${b.mes === estado.mes ? "font-semibold text-texto" : "text-texto-2"}`}>
            {b.rotulo}
          </p>
        ))}
      </div>
      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-texto underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque">
          Ver os números em tabela
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <caption className="sr-only">Entradas e saídas de cada mês</caption>
          <thead>
            <tr className="text-texto-2">
              <th scope="col" className="py-1.5 pr-2 font-medium">Mês</th>
              <th scope="col" className="py-1.5 pr-2 font-medium">Entrou</th>
              <th scope="col" className="py-1.5 font-medium">Saiu</th>
            </tr>
          </thead>
          <tbody>
            {barras.map((b) => (
              <tr key={b.mes} className="border-t border-borda">
                <th scope="row" className="py-1.5 pr-2 font-normal">{b.nomeCompleto}</th>
                <td className="py-1.5 pr-2 tabular-nums">{b.entrouTexto}</td>
                <td className="py-1.5 tabular-nums">{b.saiuTexto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// ---- Só a dona: a lista e o formulário ----

function Lancamentos({ mes, lista, agora, aoMudar }: { mes: string; lista: ListaDaDona; agora: Date; aoMudar: () => Promise<boolean> }) {
  const [editando, setEditando] = useState<Lancamento | null>(null);
  const [apagando, setApagando] = useState<Lancamento | null>(null);
  const [aviso, setAviso] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const editar = (l: Lancamento) => {
    setAviso("");
    setEditando(l);
    formRef.current?.scrollIntoView?.({ block: "start" });
  };

  return (
    <section aria-labelledby="fin-lancamentos" className="min-w-0 space-y-4">
      <h2 id="fin-lancamentos" className="font-serif text-xl font-semibold">
        Lançamentos do mês
      </h2>
      <div ref={formRef} className="scroll-mt-4">
        <FormularioDeLancamentos
          key={editando?.id ?? "novo"}
          categorias={lista.categorias}
          dia={diaPadraoDoMes(mes, agora)}
          editando={editando}
          aoCancelar={() => setEditando(null)}
          aoSalvar={async (campos) => {
            const r = await enviarLancamento(campos, editando?.id ?? null);
            if (r.tipo === "ok") {
              setEditando(null);
              setAviso(editando ? "Lançamento salvo." : "Lançamento feito.");
              await aoMudar();
            } else if (r.tipo === "fora") await aoMudar();
            return r;
          }}
        />
      </div>
      <p role="status" className="min-h-5 text-sm text-texto-2">
        {aviso}
      </p>
      {lista.lancamentos.length === 0 ? (
        <p className="rounded-xl border border-borda bg-cartao px-4 py-4 text-sm text-texto-2">Nenhum lançamento em {nomeCurtoDoMes(mes)}.</p>
      ) : (
        <ul className="divide-y divide-borda rounded-xl border border-borda bg-cartao">
          {lista.lancamentos.map((l) => (
            <li key={l.id} className="grid min-w-0 gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tabular-nums text-texto-2">{diaCurto(l.data)}</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span aria-hidden="true" className={`size-2.5 rounded-sm ${l.tipo === "entrada" ? "bg-serie-entrada" : "bg-serie-saida"}`} />
                    {l.tipo === "entrada" ? "Entrada" : "Saída"}
                  </span>
                  <span className="[overflow-wrap:anywhere]">{l.categoria}</span>
                </p>
                {l.descricao ? <p className="mt-0.5 text-texto-2 [overflow-wrap:anywhere]">{l.descricao}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="mr-auto font-semibold tabular-nums sm:mr-2">{formatarCentavos(l.valorCentavos)}</span>
                <button type="button" onClick={() => editar(l)} className={`${BOTAO_VAZIO} px-3`}>
                  <Pencil aria-hidden="true" className="size-4" />
                  Editar<span className="sr-only"> lançamento de {diaCurto(l.data)}</span>
                </button>
                <button type="button" onClick={() => setApagando(l)} className={`${BOTAO_VAZIO} px-3`}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Apagar<span className="sr-only"> lançamento de {diaCurto(l.data)}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmarApagar
        lancamento={apagando}
        aoFechar={() => setApagando(null)}
        aoConfirmar={async (l) => {
          const r = await apagarLancamento(l.id);
          if (r.tipo === "ok") {
            setAviso("Lançamento apagado.");
            if (editando?.id === l.id) setEditando(null);
          }
          if (r.tipo !== "erro") await aoMudar();
          return r;
        }}
      />
    </section>
  );
}

function FormularioDeLancamentos({
  categorias,
  dia,
  editando,
  aoCancelar,
  aoSalvar,
}: {
  categorias: ListaDaDona["categorias"];
  dia: string;
  editando: Lancamento | null;
  aoCancelar: () => void;
  aoSalvar: (campos: FormularioDeLancamento) => Promise<ResultadoDaEscrita>;
}) {
  const [campos, setCampos] = useState<FormularioDeLancamento>(() =>
    editando
      ? { data: editando.data, tipo: editando.tipo, valor: valorParaEditar(editando.valorCentavos), categoriaId: String(editando.categoriaId), descricao: editando.descricao }
      : { data: dia, tipo: "saida", valor: "", categoriaId: "", descricao: "" },
  );
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const mudar = (parte: Partial<FormularioDeLancamento>) => setCampos((c) => ({ ...c, ...parte }));

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const r = await aoSalvar(campos);
    setEnviando(false);
    if (r.tipo === "erro") setErro(r.mensagem);
    else if (r.tipo === "ok" && !editando) setCampos({ ...campos, valor: "", descricao: "" });
  };

  const rotulo = "mb-1 block text-[13px] font-medium text-texto-2";
  return (
    <form onSubmit={(e) => void enviar(e)} className="min-w-0 rounded-xl border border-borda bg-cartao p-4" aria-labelledby="fin-form-titulo">
      <h3 id="fin-form-titulo" className="font-medium">
        {editando ? "Editar lançamento" : "Novo lançamento"}
      </h3>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="fin-data" className={rotulo}>
            Dia
          </label>
          <input id="fin-data" type="date" required value={campos.data} onChange={(e) => mudar({ data: e.target.value })} className={CAMPO} />
        </div>
        <fieldset className="min-w-0">
          <legend className={rotulo}>Tipo</legend>
          <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-1">
            {(["entrada", "saida"] as const).map((t) => (
              <label key={t} className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="fin-tipo" value={t} checked={campos.tipo === t} onChange={() => mudar({ tipo: t })} className="size-4 accent-destaque" />
                {t === "entrada" ? "Entrada" : "Saída"}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="min-w-0">
          <label htmlFor="fin-valor" className={rotulo}>
            Valor, em reais
          </label>
          <input id="fin-valor" type="text" inputMode="decimal" autoComplete="off" required placeholder="0,00" value={campos.valor} onChange={(e) => mudar({ valor: e.target.value })} className={CAMPO} />
        </div>
        <div className="min-w-0">
          <label htmlFor="fin-categoria" className={rotulo}>
            Categoria
          </label>
          <select id="fin-categoria" required value={campos.categoriaId} onChange={(e) => mudar({ categoriaId: e.target.value })} className={CAMPO}>
            <option value="">Escolha…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="fin-descricao" className={rotulo}>
            Descrição (opcional)
          </label>
          <input id="fin-descricao" type="text" maxLength={200} value={campos.descricao} onChange={(e) => mudar({ descricao: e.target.value })} className={CAMPO} />
        </div>
      </div>
      {erro ? (
        <p role="alert" className="mt-3 text-sm text-revisao">
          {erro}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={enviando} className={BOTAO_CHEIO}>
          {editando ? "Salvar" : "Lançar"}
        </button>
        {editando ? (
          <button type="button" onClick={aoCancelar} className={BOTAO_VAZIO}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** O diálogo de "apagar?", da própria página (nunca confirm do navegador). Esc e o fundo escurecido cancelam. */
function ConfirmarApagar({ lancamento, aoFechar, aoConfirmar }: { lancamento: Lancamento | null; aoFechar: () => void; aoConfirmar: (l: Lancamento) => Promise<ResultadoDaEscrita> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [erro, setErro] = useState("");
  const [apagando, setApagando] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (lancamento && !d.open) {
      setErro("");
      d.showModal();
    } else if (!lancamento && d.open) d.close();
  }, [lancamento]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="fin-apagar-titulo"
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-2xl bg-cartao p-0 text-texto backdrop:bg-black/40"
    >
      <div className="p-5">
        <h3 id="fin-apagar-titulo" className="font-serif text-xl font-semibold">
          Apagar este lançamento?
        </h3>
        {lancamento ? (
          <p className="mt-2 text-sm text-texto-2 [overflow-wrap:anywhere]">
            {diaCurto(lancamento.data)} · {lancamento.tipo === "entrada" ? "Entrada" : "Saída"} · {lancamento.categoria} · {formatarCentavos(lancamento.valorCentavos)}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-texto-2">Não dá pra desfazer.</p>
        {erro ? (
          <p role="alert" className="mt-3 text-sm text-revisao">
            {erro}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_VAZIO}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={apagando}
            onClick={() => {
              if (!lancamento) return;
              setApagando(true);
              void aoConfirmar(lancamento).then((r) => {
                setApagando(false);
                if (r.tipo === "erro") setErro(r.mensagem);
                else aoFechar();
              });
            }}
            className={BOTAO_CHEIO}
          >
            Apagar
          </button>
        </div>
      </div>
    </dialog>
  );
}
