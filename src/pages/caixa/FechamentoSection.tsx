import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, ArrowUp, Calculator, Check, ChevronDown, TriangleAlert, Undo2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { Botao } from "@/components/Botao";
import { BotaoResumoDono } from "@/components/BotaoResumoDono";
import { useConfirmar } from "@/components/JanelaDeConfirmar";
import { Passos } from "@/components/Passos";
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
  ehPrimeiroFechamento,
  fraseDaDiferenca,
  fundoSugerido,
  NOTAS_DA_GAVETA,
  lancamentosDepoisDoFechamento,
  momentoDoLancamento,
  resumirDiaParaFechamento,
  rotuloDaForma,
  situacaoDaDiferenca,
  somarAGaveta,
  somarDiferencas,
  totaisParaGravar,
} from "@/schemas/fechamentoCaixa";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { ModuloChave } from "@/types/operador";
import { Aviso } from "@/components/Aviso";

interface FechamentoSectionProps {
  lojaId: string;
  movimentos: MovimentoCaixa[];
  /** Custo de cada OS (do banco), pro lucro do resumo pro dono (#397). */
  custoDasOrdens: CustoDoBanco;
  fechamentos: FechamentoCaixa[];
  /** Só admin da loja desfaz — o banco confere de novo (migration 0058). */
  podeDesfazer: boolean;
  onAtualizado: () => Promise<void>;
  /**
   * Avisa quem abriu a janela se há valor digitado no fechamento (#1090): com
   * valor, o Esc e o ✕ perguntam antes de jogar a contagem fora.
   */
  aoMudarRascunho?: (temValorDigitado: boolean) => void;
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
  // A ajuda pra contar as notas (#1090): só ajuda a chegar no contado.
  notas: z.record(z.string(), z.string()),
  moedas: z.string(),
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
  aoMudarRascunho,
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
          primeiroFechamento={ehPrimeiroFechamento(fechamentos, dia)}
          aoMudarRascunho={aoMudarRascunho}
          onAtualizado={onAtualizado}
        />
      )}

      <Historico fechamentos={fechamentos} onEscolher={setDia} />
    </div>
  );
}

/** Os 4 passos do fechamento (#1090), na ordem da conversa no balcão. */
const PASSOS_DO_FECHAMENTO = [
  { nome: "Troco da manhã" },
  { nome: "Contar a gaveta" },
  { nome: "Pix e cartão" },
  { nome: "Conferir e fechar" },
] as const;

/** O botão laranja de cada passo diz pra onde vai (o último é o "Fechar"). */
const PROXIMO = ["Contar a gaveta", "Ver Pix e cartão", "Conferir e fechar"] as const;

function FecharDia({
  lojaId,
  dia,
  hoje,
  movimentosDoDia,
  fundoInicial,
  primeiroFechamento,
  aoMudarRascunho,
  onAtualizado,
}: {
  lojaId: string;
  dia: string;
  hoje: string;
  movimentosDoDia: MovimentoCaixa[];
  fundoInicial: number;
  primeiroFechamento: boolean;
  aoMudarRascunho?: (temValorDigitado: boolean) => void;
  onAtualizado: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [passo, setPasso] = useState(0);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [fechando, setFechando] = useState(false);
  const { confirmar, janela } = useConfirmar();
  const proximoId = useId();
  const fecharId = useId();
  const fundoRef = useRef<HTMLInputElement | null>(null);
  const contadoRef = useRef<HTMLInputElement | null>(null);
  const {
    register,
    watch,
    trigger,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FechamentoValues>({
    resolver: zodResolver(fechamentoSchema),
    defaultValues: {
      fundo: fundoInicial ? String(fundoInicial) : "",
      contado: "",
      observacao: "",
      notas: NOTAS_VAZIAS,
      moedas: "",
    },
  });

  const fundo = Number(watch("fundo")) || 0;
  const contadoTexto = watch("contado");
  const notas = watch("notas");
  const moedas = watch("moedas");
  const resumo = resumirDiaParaFechamento(movimentosDoDia, fundo);
  const temContado = contadoTexto.trim() !== "" && Number(contadoTexto) >= 0;
  const diferenca = temContado ? diferencaDoFechamento(resumo.esperado, Number(contadoTexto)) : null;

  // A ajuda pra contar as notas (opcional): a soma vai pro campo do contado.
  // A conta mora em schemas/fechamentoCaixa.ts (somarAGaveta).
  const contagem = somarAGaveta(notasPelaNota(notas), moedas);
  const algoNaAjuda = Object.values(notas).some((v) => v.trim() !== "") || moedas.trim() !== "";
  useEffect(() => {
    if (!ajudaAberta || !algoNaAjuda) return;
    setValue("contado", String(contagem.total), { shouldDirty: true, shouldValidate: true });
  }, [ajudaAberta, algoNaAjuda, contagem.total, setValue]);

  // Quem abriu a janela pergunta antes de fechar com valor digitado (Esc).
  useEffect(() => {
    aoMudarRascunho?.(isDirty);
  }, [isDirty, aoMudarRascunho]);
  const aoMudarRascunhoRef = useRef(aoMudarRascunho);
  aoMudarRascunhoRef.current = aoMudarRascunho;
  useEffect(() => () => aoMudarRascunhoRef.current?.(false), []);

  // O foco vai pro que se faz no passo: o campo do troco, o campo do contado,
  // e nos dois últimos o botão laranja (Enter segue). Depois do quadro de
  // agora: a janela em volta põe o foco no ✕ ao abrir, e ela vem depois.
  useEffect(() => {
    const t = setTimeout(() => {
      const alvo =
        passo === 0
          ? fundoRef.current
          : passo === 1
            ? contadoRef.current
            : document.getElementById(passo === 2 ? proximoId : fecharId);
      alvo?.focus();
    });
    return () => clearTimeout(t);
  }, [passo, proximoId, fecharId]);

  async function avancar() {
    if (passo === 0 && !(await trigger("fundo"))) return;
    if (passo === 1 && !(await trigger("contado"))) return;
    setPasso((p) => Math.min(p + 1, PASSOS_DO_FECHAMENTO.length - 1));
  }

  async function aoFechar(valores: FechamentoValues) {
    setErro(null);
    const contado = Number(valores.contado);
    const dif = diferencaDoFechamento(resumo.esperado, contado);
    const certo = await confirmar({
      acao: `Fechar o caixa de ${diaBonito(dia)}`,
      explicacao: (
        <>
          <p>
            {dif === 0
              ? "Bateu certinho: nenhum lançamento é feito."
              : `${fraseDaDiferenca(dif).frase}: ${consequenciaDaDiferenca(dif)}.`}
          </p>
          <p className="mt-2">Depois de fechado, só um administrador consegue desfazer.</p>
        </>
      ),
      botao: "Fechar caixa",
      tom: "normal",
    });
    if (!certo) return;
    setFechando(true);
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
    } finally {
      setFechando(false);
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (passo < PASSOS_DO_FECHAMENTO.length - 1) void avancar();
    else void handleSubmit(aoFechar)(evento);
  }

  // Enter no campo do passo já segue pro próximo (sem isto, o Enter do
  // programa inteiro levaria o foco pro botão, e precisaria de outro Enter).
  function enterSegue(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    evento.stopPropagation();
    void avancar();
  }

  const fundoCampo = register("fundo");
  const contadoCampo = register("contado");

  return (
    <>
      <form onSubmit={aoEnviar} noValidate className="sakura-card space-y-6 p-6">
        <div className="space-y-4">
          <h2 className="font-titulo text-subtitulo font-semibold text-texto">Fechar o caixa de {diaBonito(dia)}</h2>
          <Passos
            rotulo="Fechar o caixa"
            passos={PASSOS_DO_FECHAMENTO}
            atual={passo}
            aoVoltar={(indice) => setPasso(indice)}
          />
        </div>

        {erro && (
          <Aviso tipo="perigo" role="alert" className="text-corpo">
            {erro}
          </Aviso>
        )}

        <div className="min-h-72">
          {passo === 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="sakura-rotulo">
                  Troco que já estava na gaveta ao abrir
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    aria-invalid={errors.fundo ? true : undefined}
                    {...fundoCampo}
                    ref={(el) => {
                      fundoCampo.ref(el);
                      fundoRef.current = el;
                    }}
                    onKeyDown={enterSegue}
                    className={`${campo} h-12 text-right font-titulo text-destaque font-semibold tabular-nums`}
                  />
                </label>
                {errors.fundo && <p className="text-rotulo text-perigo">{errors.fundo.message}</p>}
                {primeiroFechamento ? (
                  <Aviso tipo="info" className="text-rotulo">
                    Primeiro fechamento: diga quanto tinha na gaveta ao abrir, o troco da manhã. Nos próximos, o
                    programa já traz o do último fechamento.
                  </Aviso>
                ) : (
                  <p className="text-rotulo text-texto-2">
                    Já vem o troco do último fechamento. Mude se hoje começou com outro valor.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-xl bg-poco p-4">
                <p className="text-corpo font-semibold text-texto">Dinheiro que devia estar na gaveta</p>
                <LinhaConta rotulo="Troco ao abrir" valor={resumo.fundoTroco} />
                <LinhaConta rotulo="+ Entradas em dinheiro" valor={resumo.entradasDinheiro} />
                <LinhaConta rotulo="− Saídas em dinheiro" valor={-resumo.saidasDinheiro} />
                <div className="flex items-center justify-between gap-4 border-t border-linha-forte pt-2">
                  <span className="text-corpo font-semibold text-texto">= Devia ter na gaveta</span>
                  <span className="font-titulo text-destaque font-semibold tabular-nums text-texto">
                    {formatarMoeda(resumo.esperado)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0 space-y-4">
                <label className="sakura-rotulo">
                  Quanto tem na gaveta agora (contado)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    readOnly={ajudaAberta && algoNaAjuda}
                    aria-invalid={errors.contado ? true : undefined}
                    {...contadoCampo}
                    ref={(el) => {
                      contadoCampo.ref(el);
                      contadoRef.current = el;
                    }}
                    onKeyDown={enterSegue}
                    className={`${campo} h-12 text-right font-titulo text-destaque font-semibold tabular-nums`}
                  />
                </label>
                {errors.contado && <p className="text-rotulo text-perigo">{errors.contado.message}</p>}

                <AjudaDasNotas
                  aberta={ajudaAberta}
                  aoAlternar={() => setAjudaAberta((a) => !a)}
                  contagem={contagem}
                  registrar={register}
                />
              </div>

              <div className="min-w-0 space-y-4">
                {/* Anunciado ao digitar: quem conta a gaveta olhando pro
                    dinheiro ouve se bateu sem tirar o olho dele. A região fica
                    sempre na tela (vazia antes do primeiro número): se ela
                    nascesse junto com o aviso, o leitor de tela pularia o
                    primeiro. */}
                <div aria-live="polite">
                  {diferenca !== null && <DiferencaGrande diferenca={diferenca} esperado={resumo.esperado} />}
                </div>
                {diferenca === null && (
                  <div className="rounded-xl border border-linha px-4 py-4">
                    <p className="text-rotulo text-texto-2">Devia ter na gaveta</p>
                    <p className="font-titulo text-metrica font-semibold tabular-nums text-texto">
                      {formatarMoeda(resumo.esperado)}
                    </p>
                    <p className="mt-1 text-rotulo text-texto-2">
                      Conte o dinheiro e digite ao lado: a diferença aparece aqui.
                    </p>
                  </div>
                )}

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
            </div>
          )}

          {passo === 2 && (
            <div className="space-y-4">
              <p className="text-corpo text-texto-2">
                Pix e cartão não passam pela gaveta. Confira com o extrato do banco e da maquininha: eles não mudam a
                conta da gaveta.
              </p>
              {resumo.outrasFormas.length > 0 ? (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {resumo.outrasFormas.map((f) => (
                    <li key={f.forma} className="rounded-xl border border-linha px-4 py-3">
                      <p className="text-rotulo font-medium text-texto-2">{f.rotulo}</p>
                      <p className="text-right font-titulo text-destaque font-semibold tabular-nums text-texto">
                        {formatarMoeda(f.entradas)}
                      </p>
                      {f.saidas > 0 && (
                        <p className="text-right text-rotulo tabular-nums text-texto-2">
                          saídas: {formatarMoeda(f.saidas)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-linha px-4 py-4 text-corpo text-texto-2">
                  Neste dia não entrou Pix nem cartão. Pode seguir.
                </p>
              )}
            </div>
          )}

          {passo === 3 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0 space-y-4">
                {diferenca !== null && <DiferencaGrande diferenca={diferenca} esperado={resumo.esperado} />}
              </div>
              <div className="min-w-0 space-y-4">
                <div className="space-y-2 rounded-xl bg-poco p-4">
                  <LinhaConta rotulo="Troco ao abrir" valor={resumo.fundoTroco} />
                  <LinhaConta rotulo="Devia ter na gaveta" valor={resumo.esperado} />
                  <LinhaConta rotulo="Contado" valor={Number(contadoTexto) || 0} />
                </div>
                <label className="sakura-rotulo">
                  Observação (se sobrou ou faltou, o que pode ter sido)
                  <textarea rows={3} {...register("observacao")} className={campo} />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-linha pt-4">
          {passo > 0 ? (
            <Botao variante="fantasma" icone={<ArrowLeft />} onClick={() => setPasso((p) => p - 1)}>
              Voltar
            </Botao>
          ) : (
            <span />
          )}
          {passo < PASSOS_DO_FECHAMENTO.length - 1 ? (
            <Botao id={proximoId} variante="principal" tamanho="grande" type="submit" icone={<ArrowRight />}>
              {PROXIMO[passo]}
            </Botao>
          ) : (
            <Botao id={fecharId} variante="principal" tamanho="grande" type="submit" ocupado={fechando}>
              {fechando ? "Fechando..." : `Fechar o caixa de ${diaBonito(dia)}`}
            </Botao>
          )}
        </div>
      </form>
      {janela}
    </>
  );
}

/** O que acontece com a diferença, em palavras (o lançamento que o banco faz). */
function consequenciaDaDiferenca(diferenca: number): string {
  return diferenca < 0
    ? 'vira uma Saída "Quebra de caixa" em dinheiro'
    : 'vira uma Entrada "Sobra de caixa" em dinheiro';
}

/**
 * O número que decide o fechamento (#1090): a diferença, grande e em
 * palavras, contra o que devia estar na gaveta. Bateu em verde com ✓, falta
 * em vermelho com o triângulo e o "−", sobra em amarelo com a seta e o "+":
 * a palavra e o ícone dizem o mesmo que a cor.
 */
function DiferencaGrande({ diferenca, esperado }: { diferenca: number; esperado: number }) {
  const { situacao, frase } = fraseDaDiferenca(diferenca);
  const aparencia =
    situacao === "bateu"
      ? { Icone: Check, cor: "text-ok", fundo: "bg-ok/[0.12]" }
      : situacao === "faltou"
        ? { Icone: TriangleAlert, cor: "text-perigo", fundo: "bg-perigo/[0.13]" }
        : { Icone: ArrowUp, cor: "text-atencao", fundo: "bg-atencao/[0.12]" };
  const { Icone } = aparencia;
  return (
    <div className={`rounded-xl px-4 py-4 ${aparencia.fundo}`}>
      <p className={`flex items-center gap-2 font-titulo text-metrica font-semibold tabular-nums ${aparencia.cor}`}>
        <Icone aria-hidden="true" className="size-7 shrink-0" strokeWidth={2.5} />
        <span className="min-w-0">{frase}</span>
      </p>
      <p className="mt-2 text-rotulo text-texto-2">
        contra {formatarMoeda(esperado)} que devia ter na gaveta
        {situacao !== "bateu" && (
          <>
            {" "}
            (<DiferencaComSinal diferenca={diferenca} className="font-semibold" />)
          </>
        )}
      </p>
      <p className={`mt-1 text-rotulo font-medium ${aparencia.cor}`}>
        {situacao === "bateu" ? "Nenhum lançamento é feito." : `A diferença ${consequenciaDaDiferenca(diferenca)}.`}
      </p>
    </div>
  );
}

/** Os campos das notas usam a chave "n100" (o "100" sozinho o formulário leria como posição de lista). */
const NOTAS_VAZIAS: Record<string, string> = Object.fromEntries(NOTAS_DA_GAVETA.map((n) => [`n${n}`, ""]));

function notasPelaNota(notas: Record<string, string>): Record<string, string> {
  return Object.fromEntries(NOTAS_DA_GAVETA.map((n) => [String(n), notas[`n${n}`] ?? ""]));
}

/**
 * A ajuda opcional pra contar as notas (#1090): quantas de 200, 100, 50…,
 * em coluna, com o valor de cada linha alinhado à direita e a soma no fim. A
 * soma vai sozinha pro campo do contado.
 */
function AjudaDasNotas({
  aberta,
  aoAlternar,
  contagem,
  registrar,
}: {
  aberta: boolean;
  aoAlternar: () => void;
  contagem: ReturnType<typeof somarAGaveta>;
  registrar: UseFormRegister<FechamentoValues>;
}) {
  const corpoId = useId();
  return (
    <div className="rounded-xl border border-linha">
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={corpoId}
        onClick={aoAlternar}
        className="flex min-h-10 w-full items-center gap-2 rounded-xl px-4 py-2 text-left text-corpo font-medium text-texto hover:bg-passar"
      >
        <Calculator aria-hidden="true" className="size-4 shrink-0 text-texto-2" />
        <span className="min-w-0 flex-1">Ajuda pra contar as notas</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-texto-2 transition-transform duration-(--duration-botao) motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`}
        />
      </button>
      {aberta && (
        <div id={corpoId} className="space-y-2 border-t border-linha px-4 py-3">
          {contagem.linhas.map((linha) => (
            <div key={linha.nota} className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,7rem)] items-center gap-2">
              <label htmlFor={`${corpoId}-n${linha.nota}`} className="text-corpo text-texto-2">
                Notas de {formatarMoeda(linha.nota).replace(/,00$/, "")}
              </label>
              <input
                id={`${corpoId}-n${linha.nota}`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="0"
                {...registrar(`notas.n${linha.nota}`)}
                className={`${campo} text-right tabular-nums`}
              />
              <span className="text-right text-corpo tabular-nums text-texto">{formatarMoeda(linha.valor)}</span>
            </div>
          ))}
          <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,7rem)] items-center gap-2">
            <label htmlFor={`${corpoId}-moedas`} className="text-corpo text-texto-2">
              Moedas (o valor)
            </label>
            <input
              id={`${corpoId}-moedas`}
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              {...registrar("moedas")}
              className={`${campo} text-right tabular-nums`}
            />
            <span className="text-right text-corpo tabular-nums text-texto">{formatarMoeda(contagem.moedas)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-linha-forte pt-2">
            <span className="text-corpo font-semibold text-texto">Soma da gaveta</span>
            <span className="text-corpo font-semibold tabular-nums text-texto">{formatarMoeda(contagem.total)}</span>
          </div>
        </div>
      )}
    </div>
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
  const { confirmar, janela } = useConfirmar();
  const depois = lancamentosDepoisDoFechamento(movimentosDoDia, fechamento);
  const situacao = situacaoDaDiferenca(fechamento.diferenca);

  async function desfazer() {
    const certo = await confirmar({
      acao: "Desfazer o fechamento de",
      item: diaBonito(fechamento.data),
      explicacao: (
        <>
          {fechamento.caixa_movimento_id && (
            <p className="mb-2">
              O lançamento de {situacao === "faltou" ? "quebra" : "sobra"} de caixa (
              {formatarMoeda(Math.abs(fechamento.diferenca))}) também sai do caixa.
            </p>
          )}
          <p>O dia volta a ficar aberto pra ser contado e fechado de novo. Fica registrado na Auditoria quem desfez.</p>
        </>
      ),
      botao: "Desfazer fechamento",
    });
    if (!certo) return;
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

  // O fim do fechamento (#1090, pico-fim): "Caixa fechado" com o ✓, o dia,
  // quem fechou, e o "Resumo pro dono" logo ao lado.
  return (
    <section className="space-y-4 sakura-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-titulo text-subtitulo font-semibold text-texto">
            <Check aria-hidden="true" className="size-5 shrink-0 text-ok" strokeWidth={2.5} />
            Caixa fechado
          </h2>
          <p className="text-rotulo text-texto-2">
            {diaBonito(fechamento.data)}, {fechamento.operador?.nome ? `por ${fechamento.operador.nome}, ` : ""}
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
        <Aviso tipo="perigo" role="alert" className="text-corpo">
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
      {janela}
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
