import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Valor } from "@/components/Valor";
import { diaLocal, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { desfazerFechamentoCaixa, fecharCaixa } from "@/lib/fechamentoCaixa";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  diferencaDoFechamento,
  fundoSugerido,
  lancamentosDepoisDoFechamento,
  momentoDoLancamento,
  resumirDiaParaFechamento,
  situacaoDaDiferenca,
  somarDiferencas,
  totaisParaGravar,
} from "@/schemas/fechamentoCaixa";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";

interface FechamentoSectionProps {
  lojaId: string;
  movimentos: MovimentoCaixa[];
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

const campo =
  "rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple";

export function FechamentoSection({
  lojaId,
  movimentos,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          Dia:
          <input
            type="date"
            value={dia}
            max={hoje}
            onChange={(e) => e.target.value && setDia(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
        <p className="text-rotulo text-sakura-muted">
          Conte o dinheiro da gaveta e compare com o que o sistema espera.
        </p>
      </div>

      {dia > hoje ? (
        <p className="text-corpo text-sakura-muted">Não dá pra fechar um dia que ainda não chegou.</p>
      ) : fechamentoDoDia ? (
        <FechamentoFeito
          fechamento={fechamentoDoDia}
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
      <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
        Fechar o caixa de {diaBonito(dia)}
      </h2>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-corpo font-medium text-sakura-purple-dark">Dinheiro que devia estar na gaveta</p>
          <label className="flex items-center justify-between gap-3 text-corpo">
            <span className="text-sakura-purple-dark/85">Troco que já estava na gaveta ao abrir</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              {...register("fundo")}
              className={`${campo} w-36 text-right`}
            />
          </label>
          {errors.fundo && <p className="text-rotulo text-red-400">{errors.fundo.message}</p>}
          <LinhaConta rotulo="+ Entradas em dinheiro" valor={resumo.entradasDinheiro} />
          <LinhaConta rotulo="− Saídas em dinheiro" valor={-resumo.saidasDinheiro} />
          <div className="flex items-center justify-between border-t border-sakura-gray/30 pt-3">
            <span className="text-corpo font-semibold text-sakura-purple-dark">= Esperado na gaveta</span>
            <Valor valor={resumo.esperado} className="text-destaque font-semibold" />
          </div>

          {resumo.semForma.quantidade > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">
              {resumo.semForma.quantidade === 1
                ? "1 lançamento está"
                : `${resumo.semForma.quantidade} lançamentos estão`}{" "}
              sem forma de pagamento ({formatarMoeda(resumo.semForma.entradas)} de entrada,{" "}
              {formatarMoeda(resumo.semForma.saidas)} de saída) e não entraram nesta conta. Se foram em
              dinheiro, é provável que a diferença venha daí.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="font-medium text-sakura-purple-dark">Quanto tem na gaveta agora (contado)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              autoFocus
              {...register("contado")}
              className={`${campo} text-destaque`}
            />
            {errors.contado && <span className="text-rotulo text-red-400">{errors.contado.message}</span>}
          </label>

          {situacao && diferenca !== null && (
            <p
              className={`rounded-lg px-3 py-2 text-corpo font-medium ${
                situacao === "bateu"
                  ? "bg-emerald-50 text-emerald-800"
                  : situacao === "faltou"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-800"
              }`}
            >
              {situacao === "bateu"
                ? "✓ Bateu certinho."
                : situacao === "faltou"
                  ? `▼ Faltam ${formatarMoeda(-diferenca)} — vira uma Saída "Quebra de caixa".`
                  : `▲ Sobram ${formatarMoeda(diferenca)} — vira uma Entrada "Sobra de caixa".`}
            </p>
          )}

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/85">Observação (se sobrou ou faltou, o que pode ter sido)</span>
            <textarea rows={2} {...register("observacao")} className={campo} />
          </label>
        </div>
      </div>

      {resumo.outrasFormas.length > 0 && (
        <div>
          <p className="mb-2 text-corpo font-medium text-sakura-purple-dark">
            Não passa pela gaveta — confira com o extrato
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {resumo.outrasFormas.map((f) => (
              <div key={f.forma} className="rounded-lg bg-black/20 px-4 py-3">
                <p className="text-rotulo text-sakura-muted">{f.rotulo}</p>
                <p className="text-corpo font-semibold text-sakura-purple-dark">
                  {formatarMoeda(f.entradas)}
                  {f.saidas > 0 && (
                    <span className="block text-rotulo font-normal text-sakura-muted">
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Fechando..." : `Fechar o caixa de ${diaBonito(dia)}`}
        </button>
      </div>
    </form>
  );
}

function LinhaConta({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-corpo">
      <span className="text-sakura-purple-dark/85">{rotulo}</span>
      <span className="text-sakura-purple-dark">{formatarMoeda(Math.abs(valor))}</span>
    </div>
  );
}

function FechamentoFeito({
  fechamento,
  movimentosDoDia,
  podeDesfazer,
  onAtualizado,
}: {
  fechamento: FechamentoCaixa;
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

  return (
    <section className="space-y-4 sakura-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
            ✓ Caixa de {diaBonito(fechamento.data)} fechado
          </h2>
          <p className="text-rotulo text-sakura-muted">
            {fechamento.operador?.nome ? `por ${fechamento.operador.nome}, ` : ""}
            em {new Date(fechamento.criado_em).toLocaleString("pt-BR")}
          </p>
        </div>
        {podeDesfazer && (
          <button
            type="button"
            onClick={desfazer}
            disabled={desfazendo}
            className="min-h-8 rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10 disabled:opacity-50"
          >
            {desfazendo ? "Desfazendo..." : "Desfazer fechamento"}
          </button>
        )}
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Cartao rotulo="Troco ao abrir" valor={fechamento.fundo_troco} />
        <Cartao rotulo="Esperado na gaveta" valor={fechamento.saldo_sistema} />
        <Cartao rotulo="Contado" valor={fechamento.valor_contado} />
        <div className="rounded-lg bg-black/20 px-4 py-3">
          <p className="text-rotulo text-sakura-muted">
            {situacao === "bateu" ? "Diferença" : situacao === "faltou" ? "Faltou" : "Sobrou"}
          </p>
          <p className="text-destaque font-semibold">
            {situacao === "bateu" ? (
              <span className="text-sakura-purple-dark">Bateu</span>
            ) : (
              <Valor valor={fechamento.diferenca} />
            )}
          </p>
        </div>
      </div>

      {fechamento.observacao && (
        <p className="text-corpo text-sakura-purple-dark/85">
          <span className="text-sakura-muted">Observação: </span>
          {fechamento.observacao}
        </p>
      )}

      {depois.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          <p className="font-medium">
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
                {m.forma_pagamento ? ` (${m.forma_pagamento})` : ""}
                {m.descricao ? ` — ${m.descricao}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Cartao({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-lg bg-black/20 px-4 py-3">
      <p className="text-rotulo text-sakura-muted">{rotulo}</p>
      <p className="text-destaque font-semibold text-sakura-purple-dark">{formatarMoeda(valor)}</p>
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
      <p className="text-corpo text-sakura-muted">
        Nenhum dia fechado ainda. Os fechamentos aparecem aqui, com o que faltou ou sobrou em cada um.
      </p>
    );
  }
  const soma = somarDiferencas(fechamentos);
  return (
    <section>
      <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Últimos fechamentos</h2>
      <div className="overflow-x-auto sakura-card">
        <table className="w-full text-left text-corpo">
          <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
            <tr>
              <th className="px-4 py-3 font-medium">Dia</th>
              <th className="px-4 py-3 font-medium">Esperado</th>
              <th className="px-4 py-3 font-medium">Contado</th>
              <th className="px-4 py-3 font-medium">Diferença</th>
              <th className="px-4 py-3 font-medium">Quem fechou</th>
            </tr>
          </thead>
          <tbody>
            {fechamentos.map((f) => (
              <tr key={f.id} className="border-t border-sakura-gray/20">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onEscolher(f.data)}
                    className="min-h-8 text-sakura-purple-dark underline-offset-2 hover:underline"
                  >
                    {diaBonito(f.data)}
                  </button>
                </td>
                <td className="px-4 py-3">{formatarMoeda(f.saldo_sistema)}</td>
                <td className="px-4 py-3">{formatarMoeda(f.valor_contado)}</td>
                <td className="px-4 py-3">
                  {f.diferenca === 0 ? "—" : <Valor valor={f.diferenca} classeDeCor="text-amber-300" />}
                </td>
                <td className="px-4 py-3 text-sakura-purple-dark/85">{f.operador?.nome ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-sakura-gray/30 bg-sakura-pink-soft/50 font-semibold text-sakura-purple-dark">
              <td className="px-4 py-3" colSpan={3}>
                Soma das diferenças destes {fechamentos.length} {fechamentos.length === 1 ? "dia" : "dias"}
              </td>
              <td className="px-4 py-3" colSpan={2}>
                {soma === 0 ? "—" : <Valor valor={soma} classeDeCor="text-amber-300" />}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
