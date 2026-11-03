import { diaBrasileiro, diaLocal, diasEntre } from "@/lib/datas";
import { formatarMoeda } from "./dinheiro";
import { precisaComprar } from "./estoque";
import { NOTA_LABEL, situacaoDaNota } from "./situacaoFiscal";
import { rotuloDeIdade } from "./painelInicio";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { ModuloChave } from "@/types/operador";
import { nomeDocumento, totalOrdem, type OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";

/**
 * A Central do dia do Início (#454): o que precisa de atenção hoje, do mais
 * urgente pro menos, cada linha com o botão que resolve.
 *
 * É regra, não IA: o "o que entra e em que ordem" mora aqui, como função pura
 * testada, e a tela (`components/CentralDoDia.tsx`) só desenha. É também o
 * esqueleto em que o assistente vai trabalhar depois (#458).
 *
 * Decisões da Sofia em 22/10/2026 (texto da #454): a ordem abaixo; OS parada
 * = 3 dias; conta a pagar vencendo = próximos 3 dias (o cartão do Início
 * continua com os 15 dele); o pacote da contabilidade do dia 1 ao 10. Nada
 * aqui trava ou manda nada sozinho: é aviso.
 */

/** A ordem da lista. Mudar a ordem é decisão da Sofia. */
export const ORDEM_DAS_PENDENCIAS = [
  "nota_com_erro",
  "caixa_sem_fechar",
  "conta_receber_vencida",
  "carro_pronto",
  "conta_pagar_vencendo",
  "os_parada",
  "estoque_baixo",
  "contabilidade_notas",
  "contabilidade_extrato",
] as const;

export type TipoPendencia = (typeof ORDEM_DAS_PENDENCIAS)[number];

/**
 * O módulo que cada linha exige: a mesma regra dos cartões do Início. Sem o
 * módulo, o banco devolve zero linha (sem erro), e zero linha viraria "nada
 * pendente" com cara de verdade, por isso a linha some em vez de ficar vazia.
 */
export const MODULO_DA_PENDENCIA: Record<TipoPendencia, ModuloChave> = {
  nota_com_erro: "notas_fiscais",
  caixa_sem_fechar: "caixa",
  conta_receber_vencida: "contas_receber",
  carro_pronto: "ordens_servico",
  conta_pagar_vencendo: "contas_pagar",
  os_parada: "ordens_servico",
  estoque_baixo: "estoque",
  contabilidade_notas: "notas_fiscais",
  contabilidade_extrato: "caixa",
};

/** OS em andamento há este tanto de dias já é "parada". */
export const DIAS_OS_PARADA = 3;
/** Conta a pagar que vence até este tanto de dias pra frente (a vencida também entra). */
export const DIAS_CONTA_PAGAR_VENCENDO = 3;
/** Até que dia do mês as notas do mês anterior vão pro contador. */
export const ULTIMO_DIA_NOTAS_CONTADOR = 7;
/** Até que dia do mês o extrato do mês anterior vai pro contador. */
export const ULTIMO_DIA_EXTRATO_CONTADOR = 10;
/**
 * Quantos dias pra trás o "caixa sem fechar" procura o último dia com
 * movimento. Uma semana cobre o fim de semana e o feriado; mais que isso já
 * não é "o caixa de ontem", é um buraco antigo, e o lugar dele é o Caixa.
 */
export const DIAS_PRA_TRAS_DO_CAIXA = 7;
/** Quantas linhas de cada tipo a lista mostra; o resto vira "e mais N". */
export const LIMITE_POR_TIPO = 5;

/** Os status da Focus NFe que querem dizer "a nota voltou com problema". */
const STATUS_DE_NOTA_COM_ERRO = new Set(["erro_autorizacao", "erro_cancelamento", "denegado"]);

interface Base {
  /** Única na lista: `<tipo>:<id>`. */
  chave: string;
  titulo: string;
  detalhe: string;
}

export type Pendencia =
  | (Base & { tipo: "nota_com_erro"; nota: NotaFiscalArquivo })
  | (Base & { tipo: "caixa_sem_fechar"; dia: string })
  | (Base & { tipo: "conta_receber_vencida"; conta: ContaReceber })
  | (Base & { tipo: "carro_pronto"; ordem: OrdemServico })
  | (Base & { tipo: "conta_pagar_vencendo"; conta: ContaPagar })
  | (Base & { tipo: "os_parada"; ordem: OrdemServico })
  | (Base & { tipo: "estoque_baixo"; peca: Peca; saldo: number })
  | (Base & { tipo: "contabilidade_notas" })
  | (Base & { tipo: "contabilidade_extrato" });

/**
 * O que a central lê. Cada lista já vem vazia pra quem não tem o módulo dela
 * (a tela nem pergunta ao banco); a regra confere o módulo de novo, pra uma
 * lista que chegou por engano não virar linha.
 */
export interface EntradaCentralDoDia {
  /** Hoje, "YYYY-MM-DD", no fuso de quem usa (`hojeLocal()`). */
  hoje: string;
  notasComErro: NotaFiscalArquivo[];
  movimentos: Pick<MovimentoCaixa, "data">[];
  fechamentos: Pick<FechamentoCaixa, "data">[];
  contasReceber: ContaReceber[];
  ordens: OrdemServico[];
  contasPagar: ContaPagar[];
  pecas: Peca[];
  saldos: Map<string, number>;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "YYYY-MM-DD" somado de N dias, sem passar por UTC. */
function somarDias(dia: string, dias: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return diaLocal(new Date(a, m - 1, d + dias));
}

function diaDaSemana(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  return DIAS_DA_SEMANA[new Date(a, m - 1, d).getDay()];
}

function nomeDoMesAnterior(hoje: string): string {
  const mes = Number(hoje.slice(5, 7)); // 1 a 12
  return MESES[(mes + 10) % 12];
}

/** "dd/mm" de um "YYYY-MM-DD". */
function diaCurto(dia: string): string {
  return diaBrasileiro(dia).slice(0, 5);
}

function quandoVence(vencimento: string, hoje: string): string {
  const dias = diasEntre(hoje, vencimento);
  if (dias < 0) return `venceu em ${diaCurto(vencimento)} (${rotuloDeIdade(-dias)})`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${diaCurto(vencimento)}`;
}

function juntar(...partes: (string | null | undefined)[]): string {
  return partes.filter(Boolean).join(" · ");
}

function notasComErro(e: EntradaCentralDoDia): Pendencia[] {
  return e.notasComErro
    .filter((n) => n.origem === "automatica" && n.status && STATUS_DE_NOTA_COM_ERRO.has(n.status))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
    .map((nota) => ({
      tipo: "nota_com_erro",
      chave: `nota_com_erro:${nota.id}`,
      titulo: `${NOTA_LABEL[nota.tipo]} ${nota.numero ?? ""} com problema`.replace("  ", " "),
      detalhe: juntar(situacaoDaNota(nota).rotulo, nota.ordem_servico?.cliente?.nome),
      nota,
    }));
}

/**
 * O último dia com movimento antes de hoje (até uma semana pra trás), se
 * ninguém fechou o caixa dele. "Ontem" na maioria dos dias; na segunda, o
 * sábado, quando a loja não abre no domingo. Dia sem movimento não pede
 * fechamento.
 */
function caixaSemFechar(e: EntradaCentralDoDia): Pendencia[] {
  const inicio = somarDias(e.hoje, -DIAS_PRA_TRAS_DO_CAIXA);
  let ultimo: string | null = null;
  for (const m of e.movimentos) {
    const dia = diaLocal(m.data);
    if (dia >= e.hoje || dia < inicio) continue;
    if (ultimo === null || dia > ultimo) ultimo = dia;
  }
  if (ultimo === null) return [];
  if (e.fechamentos.some((f) => f.data === ultimo)) return [];

  const ontem = somarDias(e.hoje, -1);
  const qual = ultimo === ontem ? "de ontem" : `de ${diaDaSemana(ultimo)}, ${diaCurto(ultimo)},`;
  return [
    {
      tipo: "caixa_sem_fechar",
      chave: `caixa_sem_fechar:${ultimo}`,
      titulo: `O caixa ${qual} não foi fechado`,
      detalhe: "Teve movimento nesse dia e ninguém fez o fechamento.",
      dia: ultimo,
    },
  ];
}

function contasReceberVencidas(e: EntradaCentralDoDia): Pendencia[] {
  return e.contasReceber
    .filter((c) => c.status === "pendente" && c.vencimento < e.hoje)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .map((conta) => ({
      tipo: "conta_receber_vencida",
      chave: `conta_receber_vencida:${conta.id}`,
      titulo: `Conta vencida: ${conta.cliente?.nome ?? "cliente"}`,
      detalhe: juntar(formatarMoeda(conta.valor), conta.descricao, quandoVence(conta.vencimento, e.hoje)),
      conta,
    }));
}

function placaEModelo(ordem: OrdemServico): string | null {
  const modelo = [ordem.veiculo?.marca, ordem.veiculo?.modelo].filter(Boolean).join(" ");
  return juntar(ordem.veiculo?.placa, modelo) || null;
}

/**
 * OS concluída e ainda não faturada: o carro está pronto e o cliente não veio.
 * A OS não guarda quando foi concluída (`data_fechamento` só nasce no
 * faturamento), então a idade que aparece é a da abertura, e diz isso.
 */
function carrosProntos(e: EntradaCentralDoDia): Pendencia[] {
  return e.ordens
    .filter((o) => o.status === "concluida" && o.tipo !== "venda_balcao")
    .sort((a, b) => a.data_abertura.localeCompare(b.data_abertura))
    .map((ordem) => ({
      tipo: "carro_pronto",
      chave: `carro_pronto:${ordem.id}`,
      titulo: `Carro pronto esperando: ${ordem.cliente?.nome ?? "cliente"}`,
      detalhe: juntar(
        placaEModelo(ordem),
        nomeDocumento(ordem),
        `concluída, OS aberta ${rotuloDeIdade(diasEntre(diaLocal(ordem.data_abertura), e.hoje))}`,
      ),
      ordem,
    }));
}

function contasPagarVencendo(e: EntradaCentralDoDia): Pendencia[] {
  const limite = somarDias(e.hoje, DIAS_CONTA_PAGAR_VENCENDO);
  return e.contasPagar
    .filter((c) => c.status === "pendente" && c.vencimento <= limite)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .map((conta) => ({
      tipo: "conta_pagar_vencendo",
      chave: `conta_pagar_vencendo:${conta.id}`,
      titulo: `Conta a pagar: ${conta.descricao}`,
      detalhe: juntar(formatarMoeda(conta.valor), quandoVence(conta.vencimento, e.hoje)),
      conta,
    }));
}

/**
 * OS em andamento há `DIAS_OS_PARADA` dias ou mais. A OS não guarda a data da
 * última mudança (só `atualizado_por_id`, sem data), então conta da abertura:
 * a mesma conta que já pinta de alerta a idade da OS no bloco "OS abertas".
 */
function osParadas(e: EntradaCentralDoDia): Pendencia[] {
  return e.ordens
    .filter(
      (o) =>
        o.status === "em_andamento" && diasEntre(diaLocal(o.data_abertura), e.hoje) >= DIAS_OS_PARADA,
    )
    .sort((a, b) => a.data_abertura.localeCompare(b.data_abertura))
    .map((ordem) => ({
      tipo: "os_parada",
      chave: `os_parada:${ordem.id}`,
      titulo: `OS parada: ${nomeDocumento(ordem)} · ${ordem.cliente?.nome ?? "cliente"}`,
      detalhe: juntar(
        placaEModelo(ordem),
        `aberta ${rotuloDeIdade(diasEntre(diaLocal(ordem.data_abertura), e.hoje))}, ainda em andamento`,
      ),
      ordem,
    }));
}

/** Quantidade como se escreve no Brasil: 1,5 e não 1.5 (peça vendida em litro). */
function quantidade(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** A mesma regra da lista "o que preciso comprar?" do Estoque (`precisaComprar`). */
function estoqueBaixo(e: EntradaCentralDoDia): Pendencia[] {
  return e.pecas
    .filter((p) => p.ativo !== false)
    .map((peca) => ({ peca, saldo: e.saldos.get(peca.id) ?? 0 }))
    .filter(({ peca, saldo }) => precisaComprar(saldo, peca.estoque_minimo))
    .sort((a, b) => a.saldo - b.saldo || a.peca.descricao.localeCompare(b.peca.descricao))
    .map(({ peca, saldo }) => ({
      tipo: "estoque_baixo",
      chave: `estoque_baixo:${peca.id}`,
      titulo: `Estoque baixo: ${peca.descricao}`,
      detalhe: `tem ${quantidade(saldo)}, o mínimo é ${quantidade(peca.estoque_minimo ?? 0)}`,
      peca,
      saldo,
    }));
}

function prazo(dia: number, ultimo: number): string {
  return dia === ultimo ? "hoje é o último dia" : `até o dia ${ultimo}`;
}

function pacoteDaContabilidade(e: EntradaCentralDoDia): Pendencia[] {
  const dia = Number(e.hoje.slice(8, 10));
  const mes = nomeDoMesAnterior(e.hoje);
  const lista: Pendencia[] = [];
  if (dia <= ULTIMO_DIA_NOTAS_CONTADOR) {
    lista.push({
      tipo: "contabilidade_notas",
      chave: `contabilidade_notas:${e.hoje.slice(0, 7)}`,
      titulo: `Pacote da contabilidade: as notas de ${mes}`,
      detalhe: `Mandar pro contador, ${prazo(dia, ULTIMO_DIA_NOTAS_CONTADOR)}.`,
    });
  }
  if (dia <= ULTIMO_DIA_EXTRATO_CONTADOR) {
    lista.push({
      tipo: "contabilidade_extrato",
      chave: `contabilidade_extrato:${e.hoje.slice(0, 7)}`,
      titulo: `Pacote da contabilidade: o extrato de ${mes}`,
      detalhe: `O extrato do banco, pro contador, ${prazo(dia, ULTIMO_DIA_EXTRATO_CONTADOR)}.`,
    });
  }
  return lista;
}

/**
 * A lista inteira, na ordem decidida, só com as linhas dos módulos que a
 * pessoa tem. Dentro de cada tipo, a mais antiga (ou a mais urgente) primeiro.
 */
export function montarCentralDoDia(
  entrada: EntradaCentralDoDia,
  temModulo: (modulo: ModuloChave) => boolean,
): Pendencia[] {
  const todas = [
    ...notasComErro(entrada),
    ...caixaSemFechar(entrada),
    ...contasReceberVencidas(entrada),
    ...carrosProntos(entrada),
    ...contasPagarVencendo(entrada),
    ...osParadas(entrada),
    ...estoqueBaixo(entrada),
    ...pacoteDaContabilidade(entrada),
  ];
  return todas.filter((p) => temModulo(MODULO_DA_PENDENCIA[p.tipo]));
}

/**
 * Se a central aparece, e se ela é só um pedaço. Quem não tem nenhum dos
 * módulos não vê a central (um "nada pendente" seria mentira); quem tem só
 * alguns vê, e a lista vazia diz que é só das áreas dele.
 */
export function alcanceDaCentral(temModulo: (modulo: ModuloChave) => boolean): {
  mostra: boolean;
  parcial: boolean;
} {
  const modulos = [...new Set(Object.values(MODULO_DA_PENDENCIA))];
  const tem = modulos.filter(temModulo);
  return { mostra: tem.length > 0, parcial: tem.length < modulos.length };
}

export function mensagemDaListaVazia(parcial: boolean): string {
  return parcial ? "Nada pendente hoje nas áreas que você pode ver." : "Nada pendente hoje.";
}

/**
 * No máximo `LIMITE_POR_TIPO` linhas de cada tipo: dez contas vencidas
 * empurrariam o resto da lista pra fora da tela. O que sobra vira "e mais N",
 * com o botão pra tela onde estão todas.
 */
export function limitarPorTipo(
  pendencias: Pendencia[],
  limite = LIMITE_POR_TIPO,
): { visiveis: Pendencia[]; escondidas: Map<TipoPendencia, number> } {
  const contagem = new Map<TipoPendencia, number>();
  const visiveis: Pendencia[] = [];
  const escondidas = new Map<TipoPendencia, number>();
  for (const p of pendencias) {
    const n = (contagem.get(p.tipo) ?? 0) + 1;
    contagem.set(p.tipo, n);
    if (n <= limite) visiveis.push(p);
    else escondidas.set(p.tipo, (escondidas.get(p.tipo) ?? 0) + 1);
  }
  return { visiveis, escondidas };
}

/**
 * Os marcadores da mensagem de cobrança (modelo "cobranca"), os mesmos de
 * Contas a Receber. O vencimento sai por `diaBrasileiro`, sem passar por
 * `Date`: "2026-11-01" lido como `Date` é meia-noite em UTC, e no Brasil vira
 * 31/10 (`docs/licoes.md`, item 42).
 */
export function marcadoresDaCobranca(
  conta: ContaReceber,
  loja: string | null | undefined,
): Record<string, string | null | undefined> {
  return {
    cliente: conta.cliente?.nome,
    valor: formatarMoeda(conta.valor),
    vencimento: diaBrasileiro(conta.vencimento),
    descricao: conta.descricao,
    loja,
  };
}

/** Os marcadores do "Seu carro está pronto" (modelo "carro_pronto"), os mesmos da OS. */
export function marcadoresDoCarroPronto(
  ordem: OrdemServico,
  loja: string | null | undefined,
): Record<string, string | null | undefined> {
  const veiculo = [ordem.veiculo?.marca, ordem.veiculo?.modelo].filter(Boolean).join(" ");
  return {
    cliente: ordem.cliente?.nome,
    veiculo: veiculo || "veículo",
    placa: ordem.veiculo?.placa,
    valor: formatarMoeda(totalOrdem(ordem.itens ?? [])),
    os: nomeDocumento(ordem),
    loja,
  };
}
