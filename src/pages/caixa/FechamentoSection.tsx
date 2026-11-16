import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, Check, TriangleAlert, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Botao } from "@/components/Botao";
import { BotaoResumoDono } from "@/components/BotaoResumoDono";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { diaLocal, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { listarContasPagar } from "@/lib/contasPagar";
import { desfazerFechamentoCaixa, fecharCaixa } from "@/lib/fechamentoCaixa";
import { listarOrdens } from "@/lib/ordensServico";
import { formatarMoeda } from "@/schemas/dinheiro";
import { custoDaOrdemPeloBanco, type CustoDoBanco } from "@/schemas/metricasCaixa";
import { mostraBlocosDeOS } from "@/schemas/painelInicio";
import { numerosDoResumoDono, periodoDoResumo, textoResumoDono } from "@/schemas/whatsapp";
import {
  diferencaDoFechamento,
  fundoSugerido,
  lancamentosDepoisDoFechamento,
  momentoDoLancamento,
  resumirDiaParaFechamento,
  rotuloDaForma,
  situacaoDaDiferenca,
  somarDiferencas,
  totaisParaGravar,
} from "@/schemas/fechamentoCaixa";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { ModuloChave } from "@/types/operador";
import { Aviso } from "./Aviso";

interface FechamentoSectionProps {
  lojaId: string;
  movimentos: MovimentoCaixa[];
  /** Custo de cada OS (do banco), pro lucro do resumo pro dono (#397). */
  custoDasOrdens: CustoDoBanco;
  fechamentos: FechamentoCaixa[];
  /** Só admin da loja desfaz — o banco confere de novo (migration 0058). */
  podeDesfazer: boolean;
  onAtualizado: () => Promise<void>;
}

// Schema pequeno, de um formulário que não é cadastro de entidade — mesmo
// critério do PagarContaModal. A CONTA não mora aqui: é de
// schemas/fechamentoCaixa.ts.
const fechamentoSchema = z.object({
  fundo: z.string().refine((v) => v.trim() === "" || Number(v) >= 0, "O troco não pode ser negativo."),
  contado: z
    .string()
    .refine((v) => v.trim() !== "" && Number(v) >= 0, "Informe quanto tem na gaveta (pode ser zero)."),
  observacao: z.string(),
});
type FechamentoValues = z.infer<typeof fechamentoSchema>;

function diaBonito(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

const campo = "sakura-campo";

/**
 * A diferença de um dia já fechado, num selo com a palavra: "Bateu", "Faltou
 * R$ 12,50", "Sobrou R$ 5,00". Antes a sobra era só um número amarelo, sem
 * sinal e sem ícone (cor sozinha não avisa, regra 4). O valor é o que o banco
 * gravou; aqui só se escolhe a palavra pelo sinal.
 */
function SeloDaDiferenca({ diferenca }: { diferenca: number }) {
  const situacao = situacaoDaDiferenca(diferenca);
  if (situacao === "bateu") return <Selo tipo="ok" palavra="Bateu" />;
  if (situacao === "faltou") return <Selo tipo="perigo" palavra={`Faltou ${formatarMoeda(-diferenca)}`} />;
  return <Selo tipo="atencao" icone={ArrowUp} palavra={`Sobrou ${formatarMoeda(diferenca)}`} />;
}

/**
 * Uma diferença diferente de zero como número com sinal: a falta é o `<Valor>`
 * (▼ e −, em vermelho) e a sobra ganha a seta pra cima e o "+" (antes era só
 * um número amarelo, sem sinal). Serve pro cartão do dia fechado e pra soma do
 * histórico, que é um SALDO de vários dias (faltou 50 num, sobrou 20 noutro:
 * −R$ 30,00), e por isso não leva a palavra "Faltaram", que faria parecer que
 * foi o total que faltou.
 */
function DiferencaComSinal({ diferenca, className = "" }: { diferenca: number; className?: string }) {
  if (diferenca < 0) return <Valor valor={diferenca} className={className} />;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-atencao ${className}`.trim()}>
      <ArrowUp aria-hidden="true" className="size-[1em] shrink-0" strokeWidth={2.5} />+{formatarMoeda(diferenca)}
    </span>
  );
}

export function FechamentoSection({
  lojaId,
  movimentos,
  custoDasOrdens,
  fechamentos,
  podeDesfazer,
  onAtualizado,
}: FechamentoSectionProps) {
  const hoje = hojeLocal();
  const [dia, setDia] = useState(hoje);

  const movimentosDoDia = useMemo(
    () => movimentos.filter((m) => diaLocal(m.data) === dia),
    [movimentos, dia],
  );
  const fechamentoDoDia = fechamentos.find((f) => f.data === dia) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="sakura-rotulo w-44">
          Dia
          <input
            type="date"
            value={dia}
            max={hoje}
            onChange={(e) => e.target.value && setDia(e.target.value)}
            className="sakura-campo sakura-campo-filtro"
          />
        </label>
        <p className="pb-2 text-rotulo text-texto-2">
          Conte o dinheiro da gaveta e compare com o que o sistema espera.
        </p>
      </div>

      {dia > hoje ? (
        <p className="text-corpo text-texto-2">Não dá pra fechar um dia que ainda não chegou.</p>
      ) : fechamentoDoDia ? (
        <FechamentoFeito
          lojaId={lojaId}
          fechamento={fechamentoDoDia}
          movimentos={movimentos}
          custoDasOrdens={custoDasOrdens}
          movimentosDoDia={movimentosDoDia}
          podeDesfazer={podeDesfazer}
          onAtualizado={onAtualizado}
        />
      ) : (
        // `key` pelo dia: trocar de dia remonta o formulário, com o troco
        // sugerido daquele dia e o contado em branco.
        <FecharDia
          key={dia}
          lojaId={lojaId}
          dia={dia}
          hoje={hoje}
          movimentosDoDia={movimentosDoDia}
          fundoInicial={fundoSugerido(fechamentos, dia)}
          onAtualizado={onAtualizado}
        />
      )}

      <Historico fechamentos={fechamentos} onEscolher={setDia} />
    </div>
  );
}

function FecharDia({
  lojaId,
  dia,
  hoje,
  movimentosDoDia,
  fundoInicial,
  onAtualizado,
}: {
  lojaId: string;
  dia: string;
  hoje: string;
  movimentosDoDia: MovimentoCaixa[];
  fundoInicial: number;
  onAtualizado: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FechamentoValues>({
    resolver: zodResolver(fechamentoSchema),
    defaultValues: { fundo: fundoInicial ? String(fundoInicial) : "", contado: "", observacao: "" },
  });

  const fundo = Number(watch("fundo")) || 0;
  const contadoTexto = watch("contado");
  const resumo = resumirDiaParaFechamento(movimentosDoDia, fundo);
  const temContado = contadoTexto.trim() !== "" && Number(contadoTexto) >= 0;
  const diferenca = temContado ? diferencaDoFechamento(resumo.esperado, Number(contadoTexto)) : null;
  const situacao = diferenca === null ? null : situacaoDaDiferenca(diferenca);

  async function aoFechar(valores: FechamentoValues) {
    setErro(null);
    const contado = Number(valores.contado);
    const dif = diferencaDoFechamento(resumo.esperado, contado);
    const consequencia =
      dif === 0
        ? "O caixa bateu certinho — nenhum lançamento será feito."
        : dif < 0
          ? `Faltaram ${formatarMoeda(-dif)}. Isso vira uma Saída "Quebra de caixa" em dinheiro.`
          : `Sobraram ${formatarMoeda(dif)}. Isso vira uma Entrada "Sobra de caixa" em dinheiro.`;
    if (
      !confirm(
        `Fechar o caixa de ${diaBonito(dia)}?\n\n` +
          `Esperado na gaveta: ${formatarMoeda(resumo.esperado)}\n` +
          `Contado: ${formatarMoeda(contado)}\n\n${consequencia}\n\n` +
          "Depois de fechado, só um administrador consegue desfazer.",
      )
    ) {
      return;
    }
    try {
      await fecharCaixa({
        lojaId,
        data: dia,
        fundoTroco: resumo.fundoTroco,
        esperado: resumo.esperado,
        contado,
        totais: totaisParaGravar(resumo),
        observacao: valores.observacao,
        momento: momentoDoLancamento(dia, hoje),
      });
      await onAtualizado();
    } catch (err) {
      console.error("Erro ao fechar o caixa:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoFechar)} className="space-y-5 sakura-card p-6">
      <h2 className="font-titulo text-subtitulo font-semibold text-texto">
        Fechar o caixa de {diaBonito(dia)}
      </h2>

      {erro && (
        <Aviso tipo="perigo" alerta className="text-corpo">
          {erro}
        </Aviso>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-corpo font-semibold text-texto">Dinheiro que devia estar na gaveta</p>
          <label className="flex items-center justify-between gap-3 text-corpo">
            <span className="text-texto-2">Troco que já estava na gaveta ao abrir</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              aria-invalid={errors.fundo ? true : undefined}
              {...register("fundo")}
              className={`${campo} w-36 text-right tabular-nums`}
            />
          </label>
          {errors.fundo && <p className="text-rotulo text-perigo">{errors.fundo.message}</p>}
          <LinhaConta rotulo="+ Entradas em dinheiro" valor={resumo.entradasDinheiro} />
          <LinhaConta rotulo="− Saídas em dinheiro" valor={-resumo.saidasDinheiro} />
          <div className="flex items-center justify-between border-t border-linha-forte pt-3">
            <span className="text-corpo font-semibold text-texto">= Esperado na gaveta</span>
            <Valor valor={resumo.esperado} className="font-titulo text-destaque font-semibold tabular-nums" />
          </div>

          {resumo.semForma.quantidade > 0 && (
            <Aviso tipo="atencao" icone={TriangleAlert} className="text-rotulo">
              {resumo.semForma.quantidade === 1
                ? "1 lançamento está"
                : `${resumo.semForma.quantidade} lançamentos estão`}{" "}
              sem forma de pagamento ({formatarMoeda(resumo.semForma.entradas)} de entrada,{" "}
              {formatarMoeda(resumo.semForma.saidas)} de saída) e não entraram nesta conta. Se foram em
              dinheiro, é provável que a diferença venha daí.
            </Aviso>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="font-semibold text-texto">Quanto tem na gaveta agora (contado)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              autoFocus
              aria-invalid={errors.contado ? true : undefined}
              {...register("contado")}
              className={`${campo} h-12 font-titulo text-destaque font-semibold tabular-nums`}
            />
            {errors.contado && <span className="text-rotulo text-perigo">{errors.contado.message}</span>}
          </label>

          {/* Anunciado ao digitar: quem conta a gaveta olhando pro dinheiro
              ouve se bateu sem tirar o olho dele. A região fica sempre na
              tela (vazia antes do primeiro número): se ela nascesse junto com
              o aviso, o leitor de tela pularia o primeiro. */}
          <div aria-live="polite">
            {situacao && diferenca !== null && (
              <Aviso
                tipo={situacao === "bateu" ? "ok" : situacao === "faltou" ? "perigo" : "atencao"}
                icone={situacao === "bateu" ? Check : situacao === "faltou" ? TriangleAlert : ArrowUp}
                className="text-corpo font-semibold"
              >
                {situacao === "bateu"
                  ? "Bateu certinho."
                  : situacao === "faltou"
                    ? `Faltam ${formatarMoeda(-diferenca)} — vira uma Saída "Quebra de caixa".`
                    : `Sobram ${formatarMoeda(diferenca)} — vira uma Entrada "Sobra de caixa".`}
              </Aviso>
            )}
          </div>

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-texto-2">Observação (se sobrou ou faltou, o que pode ter sido)</span>
            <textarea rows={2} {...register("observacao")} className={campo} />
          </label>
        </div>
      </div>

      {resumo.outrasFormas.length > 0 && (
        <div>
          <p className="mb-2 text-corpo font-semibold text-texto">
            Não passa pela gaveta — confira com o extrato
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumo.outrasFormas.map((f) => (
              <div key={f.forma} className="rounded-xl bg-poco px-4 py-3">
                <p className="text-rotulo font-medium text-texto-2">{f.rotulo}</p>
                <p className="text-corpo font-semibold tabular-nums text-texto">
                  {formatarMoeda(f.entradas)}
                  {f.saidas > 0 && (
                    <span className="block text-rotulo font-normal text-texto-2">
                      saídas: {formatarMoeda(f.saidas)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Botao variante="principal" type="submit" ocupado={isSubmitting}>
          {isSubmitting ? "Fechando..." : `Fechar o caixa de ${diaBonito(dia)}`}
        </Botao>
      </div>
    </form>
  );
}

function LinhaConta({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-corpo">
      <span className="text-texto-2">{rotulo}</span>
      <span className="tabular-nums text-texto">{formatarMoeda(Math.abs(valor))}</span>
    </div>
  );
}

function FechamentoFeito({
  lojaId,
  fechamento,
  movimentos,
  custoDasOrdens,
  movimentosDoDia,
  podeDesfazer,
  onAtualizado,
}: {
  lojaId: string;
  fechamento: FechamentoCaixa;
  movimentos: MovimentoCaixa[];
  custoDasOrdens: CustoDoBanco;
  movimentosDoDia: MovimentoCaixa[];
  podeDesfazer: boolean;
  onAtualizado: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);
  const depois = lancamentosDepoisDoFechamento(movimentosDoDia, fechamento);
  const situacao = situacaoDaDiferenca(fechamento.diferenca);

  async function desfazer() {
    if (
      !confirm(
        `Desfazer o fechamento de ${diaBonito(fechamento.data)}?\n\n` +
          (fechamento.caixa_movimento_id
            ? `O lançamento de ${situacao === "faltou" ? "quebra" : "sobra"} de caixa (${formatarMoeda(Math.abs(fechamento.diferenca))}) também sai do caixa.\n\n`
            : "") +
          "O dia volta a ficar aberto pra ser contado e fechado de novo. Fica registrado na Auditoria quem desfez.",
      )
    ) {
      return;
    }
    setErro(null);
    setDesfazendo(true);
    try {
      await desfazerFechamentoCaixa(fechamento.id);
      await onAtualizado();
    } catch (err) {
      console.error("Erro ao desfazer o fechamento:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setDesfazendo(false);
    }
  }

  // Resumo pro dono (#397), do dia fechado. A diferença é a do fechamento
  // (`diferencaDoFechamento`, a mesma conta que o banco gravou e a tela
  // mostra); OS abertas e contas vencendo são buscadas só na hora do clique e
  // só pra quem tem o módulo (sem ele, a linha sai do texto).
  async function montarResumo({
    modelo,
    loja,
    podeVer,
  }: {
    modelo: Promise<string>;
    loja: string | null;
    podeVer: (modulo: ModuloChave) => boolean;
  }): Promise<string> {
    const [modeloDaLoja, ordens, contas] = await Promise.all([
      modelo,
      mostraBlocosDeOS(podeVer) ? listarOrdens(lojaId) : Promise.resolve([]),
      podeVer("contas_pagar") ? listarContasPagar(lojaId) : Promise.resolve([]),
    ]);
    const [ano, mes, d] = fechamento.data.split("-").map(Number);
    const referencia = new Date(ano, mes - 1, d);
    const hoje = new Date();
    return textoResumoDono({
      loja,
      periodo: periodoDoResumo("dia", referencia, hoje),
      modelo: modeloDaLoja,
      numeros: numerosDoResumoDono({
        periodo: "dia",
        referencia,
        hoje,
        movimentos,
        custoDaOrdem: custoDaOrdemPeloBanco(custoDasOrdens),
        ordens,
        contas,
        podeVer,
        diferencaCaixa: diferencaDoFechamento(fechamento.saldo_sistema, fechamento.valor_contado),
      }),
    });
  }

  return (
    <section className="space-y-4 sakura-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-titulo text-subtitulo font-semibold text-texto">
            <Check aria-hidden="true" className="size-5 shrink-0 text-ok" strokeWidth={2.5} />
            Caixa de {diaBonito(fechamento.data)} fechado
          </h2>
          <p className="text-rotulo text-texto-2">
            {fechamento.operador?.nome ? `por ${fechamento.operador.nome}, ` : ""}
            em {new Date(fechamento.criado_em).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-start gap-2">
          <BotaoResumoDono escolhas={[{ rotulo: "Resumo pro dono", montarTexto: montarResumo }]} />
          {podeDesfazer && (
            <Botao variante="fantasma" icone={<Undo2 />} onClick={desfazer} ocupado={desfazendo}>
              {desfazendo ? "Desfazendo..." : "Desfazer fechamento"}
            </Botao>
          )}
        </div>
      </div>

      {erro && (
        <Aviso tipo="perigo" alerta className="text-corpo">
          {erro}
        </Aviso>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Cartao rotulo="Troco ao abrir" valor={fechamento.fundo_troco} />
        <Cartao rotulo="Esperado na gaveta" valor={fechamento.saldo_sistema} />
        <Cartao rotulo="Contado" valor={fechamento.valor_contado} />
        <div className="rounded-xl bg-poco px-4 py-3">
          <p className="text-rotulo font-medium text-texto-2">
            {situacao === "bateu" ? "Diferença" : situacao === "faltou" ? "Faltou" : "Sobrou"}
          </p>
          <p className="font-titulo text-destaque font-semibold tabular-nums">
            {situacao === "bateu" ? (
              <span className="inline-flex items-center gap-1.5 text-ok">
                <Check aria-hidden="true" className="size-5 shrink-0" strokeWidth={2.5} />
                Bateu
              </span>
            ) : (
              <DiferencaComSinal diferenca={fechamento.diferenca} />
            )}
          </p>
        </div>
      </div>

      {fechamento.observacao && (
        <p className="text-corpo text-texto">
          <span className="text-texto-2">Observação: </span>
          {fechamento.observacao}
        </p>
      )}

      {depois.length > 0 && (
        <Aviso tipo="atencao" icone={TriangleAlert} className="text-corpo">
          <p className="font-semibold">
            {depois.length === 1
              ? "1 lançamento entrou depois do fechamento"
              : `${depois.length} lançamentos entraram depois do fechamento`}{" "}
            — não estavam na conta quando a gaveta foi contada:
          </p>
          <ul className="mt-1 list-inside list-disc text-rotulo">
            {depois.map((m) => (
              <li key={m.id}>
                {new Date(m.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                {m.tipo === "saida" ? "saída" : "entrada"} de {formatarMoeda(m.valor)}
                {m.forma_pagamento ? ` (${rotuloDaForma(m.forma_pagamento)})` : ""}
                {m.descricao ? ` — ${m.descricao}` : ""}
              </li>
            ))}
          </ul>
        </Aviso>
      )}
    </section>
  );
}

function Cartao({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl bg-poco px-4 py-3">
      <p className="text-rotulo font-medium text-texto-2">{rotulo}</p>
      <p className="font-titulo text-destaque font-semibold tabular-nums text-texto">{formatarMoeda(valor)}</p>
    </div>
  );
}

function Historico({
  fechamentos,
  onEscolher,
}: {
  fechamentos: FechamentoCaixa[];
  onEscolher: (dia: string) => void;
}) {
  if (fechamentos.length === 0) {
    return (
      <p className="sakura-card px-[18px] py-4 text-corpo text-texto-2">
        Nenhum dia fechado ainda. Os fechamentos aparecem aqui, com o que faltou ou sobrou em cada um.
      </p>
    );
  }
  const soma = somarDiferencas(fechamentos);
  return (
    <section>
      <h2 className="mb-3 font-titulo text-corpo font-semibold text-texto">Últimos fechamentos</h2>
      <div className="overflow-x-auto sakura-card">
        <table className="sakura-tabela">
          <thead>
            <tr>
              <th>Dia</th>
              <th className="text-right">Esperado</th>
              <th className="text-right">Contado</th>
              {/* À esquerda: é o selo com a palavra ("Faltou R$ 12,50"), não um
                  número pra somar de olho em coluna. */}
              <th className="pl-6!">Diferença</th>
              <th>Quem fechou</th>
            </tr>
          </thead>
          <tbody>
            {fechamentos.map((f) => (
              <tr key={f.id}>
                <td>
                  <button
                    type="button"
                    onClick={() => onEscolher(f.data)}
                    className="min-h-8 font-medium text-acao-clara underline underline-offset-2 hover:text-texto"
                  >
                    {diaBonito(f.data)}
                  </button>
                </td>
                <td className="whitespace-nowrap text-right text-texto">{formatarMoeda(f.saldo_sistema)}</td>
                <td className="whitespace-nowrap text-right text-texto">{formatarMoeda(f.valor_contado)}</td>
                <td className="pl-6!">
                  <SeloDaDiferenca diferenca={f.diferenca} />
                </td>
                <td className="text-texto-2">{f.operador?.nome ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-linha-forte bg-poco font-semibold">
              <td className="text-texto" colSpan={3}>
                Soma das diferenças destes {fechamentos.length} {fechamentos.length === 1 ? "dia" : "dias"}
              </td>
              <td className="pl-6!">
                {soma === 0 ? (
                  <span className="text-texto-2">—</span>
                ) : (
                  <DiferencaComSinal diferenca={soma} className="font-semibold" />
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
