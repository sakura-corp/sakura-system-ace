import { diaLocal } from "@/lib/datas";
import { somar } from "./dinheiro";
import { contaNosNumeros } from "./orcamento";
import { totalOrdem } from "@/types/os";
import type { StatusOS, TipoItemOS, TipoOrdem } from "@/types/os";

/**
 * As contas da lista de "clientes sumidos" (tarefa #455): quem não vem há
 * mais de X meses, quanto já gastou e o que fez na última vez — pra loja
 * mandar um WhatsApp chamando de volta, começando por quem mais gastou.
 *
 * Nenhuma tabela nova: tudo sai de `ordens_servico` e dos itens. Fica aqui,
 * como função pura testada, pela regra de sempre (item 49 de
 * `docs/licoes.md`): conta de dinheiro não mora em tela.
 */

/** A versão enxuta da ordem que a tela de Clientes busca pra esta conta. */

export interface OrdemDoCliente {
  id: string;
  cliente_id: string;
  tipo?: TipoOrdem;
  status: StatusOS;
  data_abertura: string;
  data_fechamento: string | null;
  veiculo?: { placa: string; marca: string | null; modelo: string | null } | null;
  itens?: {
    tipo: TipoItemOS;
    descricao: string;
    quantidade: number;
    preco_unitario: number;
    desconto: number;
  }[];
}

export interface ResumoDoCliente {
  clienteId: string;
  /** Dia da última ordem faturada, no fuso local, como "YYYY-MM-DD". */
  ultimaVisita: string;
  /** Soma de todas as ordens faturadas do cliente, fechada no centavo. */
  totalGasto: number;
  /** Os serviços da última visita ("Alinhamento, Balanceamento"); as peças, se não houve serviço. */
  ultimoServico: string | null;
  /** "Marca Modelo" (ou a placa) do carro da última ordem que tinha carro. */
  veiculo: string | null;
}

function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return ehBissexto(ano) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * "YYYY-MM-DD" menos N meses, também em "YYYY-MM-DD".
 *
 * A conta é toda em texto e números, sem `Date`: `new Date("2026-04-30")`
 * seria meia-noite em UTC, que no Brasil ainda é dia 29 (itens 34 e 42 de
 * `docs/licoes.md`). E o `setMonth` do `Date` "transborda": 31/08 menos 6
 * meses daria 03/03 (porque 31/02 não existe), não 28/02.
 *
 * Quando o dia não existe no mês de chegada, prende no último dia dele:
 * "2026-08-31" menos 6 vira "2026-02-28" (e "2028-02-29" no bissexto).
 */
export function subtrairMeses(dia: string, meses: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  // Conta em "meses desde o ano zero" pra atravessar a virada do ano sem caso especial.
  const total = ano * 12 + (mes - 1) - meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = total - novoAno * 12 + 1;
  const novoDia = Math.min(d, diasNoMes(novoAno, novoMes));
  return `${novoAno}-${doisDigitos(novoMes)}-${doisDigitos(novoDia)}`;
}

/** O momento da visita: o faturamento; a abertura só quando a ordem antiga não tem fechamento. */
function momentoDaVisita(ordem: OrdemDoCliente): string {
  return ordem.data_fechamento ?? ordem.data_abertura;
}

/**
 * Compara pelo instante completo, não pelo dia: duas visitas no mesmo dia
 * têm de dar a última certa. `Date.parse` e não comparação de texto porque o
 * banco pode devolver o horário com "+00:00" em vez de "Z".
 */
function maisRecente(a: OrdemDoCliente, b: OrdemDoCliente): boolean {
  return Date.parse(momentoDaVisita(a)) > Date.parse(momentoDaVisita(b));
}

/**
 * O que foi feito na última visita, pra mensagem e pra lista: os serviços. A
 * venda de balcão só tem peça, então aí entram as peças (senão a linha
 * ficaria vazia pra quem só compra pneu no balcão).
 */
function descreverOrdem(ordem: OrdemDoCliente): string | null {
  const itens = ordem.itens ?? [];
  const servicos = itens.filter((item) => item.tipo === "servico");
  const escolhidos = servicos.length > 0 ? servicos : itens;
  return escolhidos.length > 0 ? escolhidos.map((item) => item.descricao).join(", ") : null;
}

/** "Marca Modelo" (sem os pedaços que faltam); sem nenhum dos dois, a placa. */
function descreverVeiculo(veiculo: NonNullable<OrdemDoCliente["veiculo"]>): string {
  const nome = [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ");
  return nome || veiculo.placa;
}

/**
 * Um resumo por cliente: quando veio pela última vez, quanto já gastou, o
 * que fez na última vez e com que carro.
 *
 * **Só ordem faturada conta, pra tudo.** É a mesma regra do
 * `totalGastoNoVeiculo` (ficha do veículo): OS em andamento ainda não é
 * dinheiro, e a venda de balcão nasce "concluida" e só vira venda de verdade
 * quando é faturada. Contar a concluída como visita faria um orçamento
 * esquecido esconder o cliente da lista de sumidos.
 *
 * O total é `totalOrdem` (o mesmo "Total" da lista de OS, sem os juros do
 * cartão) somado com `somar`, pra fechar no centavo: 150,10 + 0,20 tem de dar
 * 150,30, não 150,29999999999998.
 *
 * O dia da visita é `diaLocal`, nunca o corte da string: uma OS faturada às
 * 22h30 de 30/04 no Brasil já é 01/05 em UTC (itens 34 e 42 de
 * `docs/licoes.md`).
 *
 * Cliente sem nenhuma ordem faturada fica fora do mapa.
 */
export function resumirPorCliente(ordens: readonly OrdemDoCliente[]): Map<string, ResumoDoCliente> {
  const porCliente = new Map<string, OrdemDoCliente[]>();
  for (const ordem of ordens) {
    // Orçamento (#379) nunca é faturado; a regra única fica escrita mesmo
    // assim, pra ninguém afrouxar o "faturada" sem lembrar dele.
    if (!contaNosNumeros(ordem) || ordem.status !== "faturada") continue;
    const lista = porCliente.get(ordem.cliente_id);
    if (lista) lista.push(ordem);
    else porCliente.set(ordem.cliente_id, [ordem]);
  }

  const resumos = new Map<string, ResumoDoCliente>();
  for (const [clienteId, faturadas] of porCliente) {
    const ultima = faturadas.reduce((atual, ordem) => (maisRecente(ordem, atual) ? ordem : atual));
    // O carro vem da última ordem QUE TEM carro: se a última foi uma venda de
    // balcão, o veículo dele continua sendo o da OS de antes.
    const ultimaComVeiculo = faturadas
      .filter((ordem) => ordem.veiculo)
      .reduce<OrdemDoCliente | null>(
        (atual, ordem) => (atual === null || maisRecente(ordem, atual) ? ordem : atual),
        null,
      );

    resumos.set(clienteId, {
      clienteId,
      ultimaVisita: diaLocal(momentoDaVisita(ultima)),
      totalGasto: somar(faturadas.map((ordem) => totalOrdem(ordem.itens ?? []))),
      ultimoServico: descreverOrdem(ultima),
      veiculo: ultimaComVeiculo?.veiculo ? descreverVeiculo(ultimaComVeiculo.veiculo) : null,
    });
  }
  return resumos;
}

/**
 * Os clientes que não vêm há **mais de** `meses` meses, de quem mais gastou
 * pra quem menos gastou — a ordem em que vale a pena ligar.
 *
 * - "Mais de 6 meses" é estrito: hoje 30/10, quem veio em 30/04 faz 6 meses
 *   hoje e ainda não entra; quem veio em 29/04, entra.
 * - Quem nunca teve ordem faturada não entra: ele não "parou de vir", nunca
 *   veio. (Cadastro feito por orçamento que não fechou, por exemplo.)
 * - Empate no total: quem sumiu há mais tempo primeiro; depois o id, só pra
 *   a lista não trocar de ordem a cada vez que a tela desenha.
 * - `meses` errado (zero, negativo, quebrado) vira um número inteiro de pelo
 *   menos 1. A tela já valida; isto é só rede, pra nunca virar "todo mundo".
 */
export function clientesSumidos<C extends { id: string }>(
  clientes: readonly C[],
  resumos: Map<string, ResumoDoCliente>,
  hoje: string,
  meses: number,
): { cliente: C; resumo: ResumoDoCliente }[] {
  const mesesValidos = Number.isFinite(meses) ? Math.max(1, Math.floor(meses)) : 1;
  const limite = subtrairMeses(hoje, mesesValidos);

  const sumidos: { cliente: C; resumo: ResumoDoCliente }[] = [];
  for (const cliente of clientes) {
    const resumo = resumos.get(cliente.id);
    // Dia em "YYYY-MM-DD": comparar o texto é comparar o calendário.
    if (resumo && resumo.ultimaVisita < limite) sumidos.push({ cliente, resumo });
  }

  return sumidos.sort(
    (a, b) =>
      b.resumo.totalGasto - a.resumo.totalGasto ||
      a.resumo.ultimaVisita.localeCompare(b.resumo.ultimaVisita) ||
      a.cliente.id.localeCompare(b.cliente.id),
  );
}
