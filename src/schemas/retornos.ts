import { diaLocal, diasEntre } from "@/lib/datas";
import { rodagemEstimada } from "./fichaVeiculo";
import type { ItemDaFicha, OrdemDaFicha } from "./fichaVeiculo";
import { contaNosNumeros } from "./orcamento";
import { ehConsumidor } from "@/types/cliente";
import type { Servico } from "@/types/servico";

/**
 * As contas do lembrete de revisão e retorno do cliente (FN-06, #381): quando
 * cada carro deve voltar pra refazer um serviço (troca de óleo a cada 6 meses
 * ou 10.000 km, alinhamento a cada 90 dias...), e quem a loja deve avisar
 * esta semana.
 *
 * Nenhuma tabela de lembretes: o retorno é calculado na hora a partir das OS
 * faturadas e do intervalo cadastrado em cada serviço. Faturou de novo o
 * mesmo serviço, o retorno antigo some sozinho e o novo nasce da OS nova.
 * Fica aqui, como função pura testada, pela regra de sempre (item 49 de
 * `docs/licoes.md`): conta não mora em tela.
 */

/** O item da OS como a ficha do veículo já usa, mais de que serviço do cadastro ele veio. */
export type ItemParaRetorno = ItemDaFicha & { servico_id?: string | null };

/** A ordem como a ficha do veículo já usa, mais o carro. */
export interface OrdemParaRetorno extends Omit<OrdemDaFicha, "itens"> {
  veiculo_id: string | null;
  veiculo: { placa: string; marca: string | null; modelo: string | null } | null;
  itens?: ItemParaRetorno[];
}

export type ServicoComIntervalo = Pick<Servico, "id" | "descricao" | "intervalo_dias" | "intervalo_km">;

export interface RetornoPrevisto {
  veiculoId: string;
  clienteId: string;
  placa: string;
  /** "Marca Modelo"; sem nenhum dos dois, a placa. */
  veiculo: string;
  servicoId: string;
  /** A descrição do cadastro do serviço (não a digitada no item). */
  servico: string;
  /** A última OS faturada com esse serviço nesse carro: é dela que o retorno nasce. */
  ordemId: string;
  /** O dia (local) em que essa OS foi faturada. */
  ultimoDia: string;
  kmNaUltima: number | null;
  /** O dia previsto pra voltar, "YYYY-MM-DD". */
  prevista: string;
  /** A prevista veio do km (estimativa pela rodagem média), não dos dias. */
  estimadoPeloKm: boolean;
  /** `diasEntre(prevista, hoje)`: positivo = atrasado, 0 = vence hoje, negativo = ainda vai vencer. */
  diasDeAtraso: number;
}

const UM_DIA_MS = 86_400_000;

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * "YYYY-MM-DD" mais N dias (ou menos, se negativo), também em "YYYY-MM-DD".
 *
 * A conta é em UTC de propósito, só como calendário: `Date.UTC` não tem
 * horário de verão nem fuso, então um dia de 23 horas não faz a soma cair no
 * dia errado. Nunca `new Date("YYYY-MM-DD")` com `getDate()` local (itens
 * 34 e 42 de `docs/licoes.md`).
 */
export function somarDias(dia: string, dias: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const resultado = new Date(Date.UTC(ano, mes - 1, d) + dias * UM_DIA_MS);
  return (
    `${resultado.getUTCFullYear()}-${doisDigitos(resultado.getUTCMonth() + 1)}-` +
    doisDigitos(resultado.getUTCDate())
  );
}

const positivo = (n: number | null | undefined): n is number => n != null && n > 0;

function temIntervalo(servico: ServicoComIntervalo): boolean {
  return positivo(servico.intervalo_dias) || positivo(servico.intervalo_km);
}

/** O momento da OS: o faturamento; a abertura só quando a ordem antiga não tem fechamento. */
function momento(ordem: OrdemParaRetorno): string {
  return ordem.data_fechamento ?? ordem.data_abertura;
}

function descreverVeiculo(veiculo: NonNullable<OrdemParaRetorno["veiculo"]>): string {
  return [veiculo.marca, veiculo.modelo].filter(Boolean).join(" ") || veiculo.placa;
}

/**
 * O carro como entra na mensagem de WhatsApp ("no {veiculo} ({placa})").
 * A placa pode estar vazia no cadastro, e o "veiculo" do retorno é a própria
 * placa quando não há marca nem modelo: sem este ajuste a mensagem sairia
 * "no Fiat Uno ()" ou "no ABC1D23 (ABC1D23)".
 */
export function partesDoVeiculoNaMensagem(retorno: Pick<RetornoPrevisto, "veiculo" | "placa">): {
  veiculo: string;
  placa: string;
} {
  const placa = retorno.placa.trim();
  if (!placa) return { veiculo: retorno.veiculo, placa: "sem placa" };
  if (retorno.veiculo.trim() === placa) return { veiculo: "carro", placa };
  return { veiculo: retorno.veiculo, placa };
}

/**
 * Todos os retornos previstos, um por carro e por serviço com intervalo, sem
 * janela e sem olhar o cadastro do cliente (a ficha do veículo usa assim; a
 * lista da semana passa por `listaDeRetornos`).
 *
 * - Só OS **faturada** conta (orçamento, recusado, em andamento e
 *   concluída, nunca), de carro conhecido, e nunca do Consumidor.
 * - O serviço é reconhecido só pelo `servico_id` do item. Item digitado à mão
 *   não conta, mesmo com a descrição igual: nunca adivinhar pelo texto.
 * - A base é a ÚLTIMA OS faturada daquele carro com aquele serviço, pelo
 *   instante do faturamento (`Date.parse`, não o texto: o banco pode mandar
 *   "+00:00" em vez de "Z"). O dia é `diaLocal`: faturada às 22h30 no Brasil
 *   é daquele dia, não do seguinte em UTC.
 * - Por dias: base + `intervalo_dias`.
 * - Por km: só com o KM anotado na OS base e a rodagem média do carro
 *   estimada (`rodagemEstimada` sobre as OS faturadas dele). Dias até rodar o
 *   intervalo = ceil(intervalo_km ÷ km por dia).
 * - Vale o que vencer primeiro. Empate conta como "pelos dias" (é o dado
 *   certo; o km é estimativa). Sem nenhum dos dois (só km e sem rodagem), o
 *   retorno não sai — a ficha pode explicar pelo `rodagemEstimada`.
 *
 * Saída na ordem da prevista, depois placa e serviço, pra não mudar de ordem
 * a cada vez que a tela desenha.
 */
export function retornosPrevistos(
  ordens: readonly OrdemParaRetorno[],
  servicos: readonly ServicoComIntervalo[],
  hoje: string,
): RetornoPrevisto[] {
  const servicoPorId = new Map(servicos.filter(temIntervalo).map((servico) => [servico.id, servico]));
  const faturadasPorVeiculo = new Map<string, OrdemParaRetorno[]>();
  const ultimas = new Map<string, { ordem: OrdemParaRetorno; veiculoId: string; servico: ServicoComIntervalo }>();

  for (const ordem of ordens) {
    // Orçamento (#379) nunca é faturado; a regra única fica escrita mesmo
    // assim, pra ninguém afrouxar o "faturada" sem lembrar dele.
    if (ordem.status !== "faturada" || !contaNosNumeros(ordem)) continue;
    if (ehConsumidor(ordem.cliente_id)) continue;
    const veiculoId = ordem.veiculo_id;
    if (!veiculoId || !ordem.veiculo) continue;

    const doVeiculo = faturadasPorVeiculo.get(veiculoId);
    if (doVeiculo) doVeiculo.push(ordem);
    else faturadasPorVeiculo.set(veiculoId, [ordem]);

    for (const item of ordem.itens ?? []) {
      if (item.tipo !== "servico" || !item.servico_id) continue;
      const servico = servicoPorId.get(item.servico_id);
      if (!servico) continue;
      const chave = `${veiculoId}|${servico.id}`;
      const atual = ultimas.get(chave);
      if (!atual || Date.parse(momento(ordem)) > Date.parse(momento(atual.ordem))) {
        ultimas.set(chave, { ordem, veiculoId, servico });
      }
    }
  }

  const retornos: RetornoPrevisto[] = [];
  for (const { ordem, veiculoId, servico } of ultimas.values()) {
    const veiculo = ordem.veiculo as NonNullable<OrdemParaRetorno["veiculo"]>;
    const ultimoDia = diaLocal(momento(ordem));

    const pelosDias = positivo(servico.intervalo_dias) ? somarDias(ultimoDia, servico.intervalo_dias) : null;
    let peloKm: string | null = null;
    if (positivo(servico.intervalo_km) && ordem.km_entrada != null) {
      const rodagem = rodagemEstimada(faturadasPorVeiculo.get(veiculoId) ?? []);
      if (rodagem.tipo === "estimada" && rodagem.kmPorMes > 0) {
        const kmPorDia = rodagem.kmPorMes / 30;
        peloKm = somarDias(ultimoDia, Math.ceil(servico.intervalo_km / kmPorDia));
      }
    }
    if (pelosDias === null && peloKm === null) continue;

    // "YYYY-MM-DD": comparar o texto é comparar o calendário.
    const estimadoPeloKm = peloKm !== null && (pelosDias === null || peloKm < pelosDias);
    const prevista = (estimadoPeloKm ? peloKm : pelosDias) as string;
    retornos.push({
      veiculoId,
      clienteId: ordem.cliente_id,
      placa: veiculo.placa,
      veiculo: descreverVeiculo(veiculo),
      servicoId: servico.id,
      servico: servico.descricao,
      ordemId: ordem.id,
      ultimoDia,
      kmNaUltima: ordem.km_entrada,
      prevista,
      estimadoPeloKm,
      diasDeAtraso: diasEntre(prevista, hoje),
    });
  }
  return retornos.sort(compararRetornos);
}

function compararRetornos(a: RetornoPrevisto, b: RetornoPrevisto): number {
  return (
    a.prevista.localeCompare(b.prevista) ||
    a.placa.localeCompare(b.placa) ||
    a.servicoId.localeCompare(b.servicoId)
  );
}

/** Com quantos dias de antecedência o retorno entra na lista "desta semana". */
export const DIAS_DE_ANTECEDENCIA = 7;

export interface RetornoDoCliente<C> {
  retorno: RetornoPrevisto;
  cliente: C;
}

/**
 * A lista de quem avisar: os atrasados e os que vencem nos próximos `dias`.
 *
 * - Some quem pediu pra não ser avisado (`nao_avisar`), quem não está na
 *   lista de clientes recebida e, sempre, o Consumidor. `nao_avisar` vazio
 *   (banco ainda sem a coluna) conta como "pode avisar".
 * - Atrasados: `diasDeAtraso > 0`. Desta semana: prevista de hoje até hoje +
 *   `dias`, inclusive — o que vence hoje entra aqui, não nos atrasados.
 * - Do mais atrasado pro menos (prevista mais antiga primeiro); empate pela
 *   placa e depois pelo serviço.
 */
export function listaDeRetornos<C extends { id: string; nao_avisar?: boolean | null }>(
  retornos: readonly RetornoPrevisto[],
  clientes: readonly C[],
  hoje: string,
  dias = DIAS_DE_ANTECEDENCIA,
): { atrasados: RetornoDoCliente<C>[]; estaSemana: RetornoDoCliente<C>[] } {
  const clientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente]));
  const limite = somarDias(hoje, dias);
  const atrasados: RetornoDoCliente<C>[] = [];
  const estaSemana: RetornoDoCliente<C>[] = [];

  for (const retorno of retornos) {
    if (ehConsumidor(retorno.clienteId)) continue;
    const cliente = clientePorId.get(retorno.clienteId);
    if (!cliente || cliente.nao_avisar) continue;
    if (retorno.diasDeAtraso > 0) atrasados.push({ retorno, cliente });
    else if (retorno.prevista >= hoje && retorno.prevista <= limite) estaSemana.push({ retorno, cliente });
  }

  const ordem = (a: RetornoDoCliente<C>, b: RetornoDoCliente<C>) => compararRetornos(a.retorno, b.retorno);
  return { atrasados: atrasados.sort(ordem), estaSemana: estaSemana.sort(ordem) };
}

/** O próximo retorno do carro (o de prevista mais cedo), pra ficha do veículo; `null` se não tem. */
export function proximoRetornoDoVeiculo(
  retornos: readonly RetornoPrevisto[],
  veiculoId: string,
): RetornoPrevisto | null {
  let proximo: RetornoPrevisto | null = null;
  for (const retorno of retornos) {
    if (retorno.veiculoId !== veiculoId) continue;
    if (proximo === null || retorno.prevista < proximo.prevista) proximo = retorno;
  }
  return proximo;
}
