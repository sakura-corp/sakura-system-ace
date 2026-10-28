import type { PecaJanela } from "@/types/peca";
import type { StatusOS } from "@/types/os";
import { contaNosNumeros } from "./orcamento";

/**
 * Os avisos da abertura de OS (item TL-08 do guia de melhorias).
 *
 * Todos aqui são **aviso, nunca trava**: nenhum deles pode impedir de salvar
 * a OS. É a regra do item 33 da seção 6 do PROJETO_STATUS.md — validação
 * sobre a qual não se tem certeza absoluta serve de aviso, e o pior caso tem
 * que ser "a usuária segue em frente avisada", não "a usuária fica de fora".
 *
 * Aqui isso vale em dobro: o carro está no pátio e o cliente esperando. Um
 * KM digitado errado, uma peça sem custo ou um saldo furado são coisas pra
 * apontar na hora — não pra barrar a venda.
 *
 * Ficam em `src/schemas/` como função pura testada, e não dentro da tela,
 * pela mesma razão de sempre (seção 6, item 40): regra repetida em tela
 * diverge. Assim a mesma frase pode aparecer na abertura da OS e em qualquer
 * tela futura que precise dela.
 */

function numeroPtBr(valor: number): string {
  return valor.toLocaleString("pt-BR");
}

/** Lê um campo de formulário numérico; devolve null quando não dá um número. */
function paraNumeroOuNulo(valor: string): number | null {
  if (valor.trim() === "") return null;
  const numero = Number(valor);
  return Number.isNaN(numero) ? null : numero;
}

interface OrdemParaKm {
  id: string;
  veiculo_id: string | null;
  km_entrada: number | null;
  data_abertura: string;
  /** Orçamento (aberto ou recusado) não é passagem do carro (#379). */
  status?: StatusOS;
}

interface VeiculoParaKm {
  id: string;
  km_atual: number | null;
}

/**
 * O KM mais recente que o sistema conhece daquele veículo.
 *
 * Escolha deliberada: **a OS mais recente ganha**, e o `km_atual` do cadastro
 * do veículo só entra quando o carro nunca passou por uma OS. O caminho
 * óbvio-mas-errado seria pegar o MAIOR de todos — o problema é que um erro de
 * digitação (um "999999" num dia corrido) ficaria colado pra sempre, fazendo
 * o aviso de "KM menor" disparar em toda OS seguinte até alguém descobrir por
 * quê. Pegando o mais recente, um engano atrapalha uma vez só.
 *
 * `ignorarOrdemId` existe pra edição: a própria OS aberta na tela não pode
 * servir de referência pra ela mesma.
 */
export function ultimoKmConhecido(
  veiculoId: string,
  veiculos: VeiculoParaKm[],
  ordens: OrdemParaKm[],
  ignorarOrdemId?: string,
): number | null {
  if (!veiculoId) return null;

  const anteriores = ordens
    .filter(
      (ordem) =>
        ordem.veiculo_id === veiculoId &&
        ordem.km_entrada != null &&
        (ordem.status == null || contaNosNumeros({ status: ordem.status })) &&
        ordem.id !== ignorarOrdemId,
    )
    .sort((a, b) => b.data_abertura.localeCompare(a.data_abertura));

  if (anteriores.length > 0) return anteriores[0].km_entrada;

  return veiculos.find((veiculo) => veiculo.id === veiculoId)?.km_atual ?? null;
}

/**
 * KM de entrada menor que o da última passagem do carro quase sempre é
 * dígito faltando — e é justamente o dado que sustenta o histórico do
 * veículo. Avisa; não impede de salvar (odômetro trocado e carro guinchado
 * existem).
 */
export function avisoKmMenor(kmDigitado: string, ultimoKm: number | null): string | null {
  if (ultimoKm == null) return null;
  const km = paraNumeroOuNulo(kmDigitado);
  if (km == null || km >= ultimoKm) return null;

  return (
    `Na última passagem deste veículo o KM era ${numeroPtBr(ultimoKm)}. ` +
    `Confira se não faltou um dígito — normalmente o KM só sobe.`
  );
}

/**
 * Saldo insuficiente pra quantidade lançada.
 *
 * O sistema deixa o saldo ficar negativo de propósito (venda no balcão não
 * pode esperar conferência de estoque), mas o relatório de estoque trata
 * saldo negativo como sinal de erro de lançamento — então é melhor avisar na
 * origem, enquanto ainda é fácil consertar, do que descobrir no inventário.
 *
 * `saldo` indefinido significa peça sem nenhuma movimentação registrada, o
 * que é saldo zero de verdade — não "desconhecido".
 */
export function avisoSaldoInsuficiente(
  quantidadeDigitada: string,
  saldo: number | undefined,
): string | null {
  const quantidade = paraNumeroOuNulo(quantidadeDigitada);
  if (quantidade == null || quantidade <= 0) return null;

  const saldoAtual = saldo ?? 0;
  if (quantidade <= saldoAtual) return null;

  const faltando = quantidade - saldoAtual;
  return (
    `Saldo em estoque: ${numeroPtBr(saldoAtual)}. ` +
    `Lançando ${numeroPtBr(quantidade)}, o estoque fica negativo em ${numeroPtBr(faltando)}.`
  );
}

/**
 * Peça sem preço de custo cadastrado infla o lucro da OS, a comissão do
 * funcionário e a aba Lucratividade. A tela de Comissões já avisa disso
 * depois do mês fechado; avisar na hora do lançamento é o que dá chance de
 * consertar.
 *
 * Custo zero conta como "sem custo", igual à regra que a tela de Comissões já
 * usa (`contarItensSemCusto` em `schemas/comissoes.ts`) — peça comprada de
 * graça não existe, então zero aqui é sempre cadastro faltando.
 */
/** A mesma regra do `sem_custo` da `pecas_janela` (0073): custo em branco ou zero. */
export function pecaSemCusto(precoCusto: number | null): boolean {
  return precoCusto == null || precoCusto === 0;
}

// `sem_custo` vem da janela de peças (`pecas_janela`, migration 0073): o banco
// diz SE falta o custo (em branco ou zero), nunca quanto é (#366).
export function avisoPecaSemCusto(peca: Pick<PecaJanela, "sem_custo"> | undefined): string | null {
  if (!peca || !peca.sem_custo) return null;

  return (
    "Esta peça está sem preço de custo cadastrado — o lucro desta OS e a comissão " +
    "vão sair maiores do que são de verdade. Dá pra cadastrar o custo em Estoque → Produtos."
  );
}
