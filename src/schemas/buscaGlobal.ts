import { temPermissao, type Operador } from "@/types/operador";

/**
 * As regras da busca geral do `Ctrl+K` (#372, TR-03.3): o que conta como
 * termo, o que é placa, quem vê cada tipo de resultado e pra onde cada um leva.
 *
 * O banco (`buscar_global`, migration 0077) refaz as mesmas contas por conta
 * própria e também confere a permissão: o daqui é o que a tela usa pra
 * decidir quando buscar e o que mostrar, e uma segunda trava caso o banco
 * devolva um tipo que a pessoa não deveria ver.
 */

export type TipoResultado = "veiculo" | "cliente" | "os" | "peca" | "fornecedor";

/** Uma linha do que a função `buscar_global` devolve. */
export interface ResultadoBusca {
  tipo: TipoResultado;
  id: string;
  titulo: string;
  detalhe: string | null;
  /** Do cliente: o primeiro carro dele (é a ficha que abre pra quem não tem Clientes). */
  veiculo_id: string | null;
}

/** A ordem dos grupos na caixa: placa primeiro, que é o gesto do balcão. */
const ORDEM_DOS_TIPOS: readonly TipoResultado[] = ["veiculo", "cliente", "os", "peca", "fornecedor"];

const ROTULO_DO_TIPO: Record<TipoResultado, string> = {
  veiculo: "Placas",
  cliente: "Clientes",
  os: "Ordens de serviço",
  peca: "Peças",
  fornecedor: "Fornecedores",
};

/** Minúsculo e sem acento: "João" e "joao" são a mesma busca. */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** A placa sem traço, espaço nem minúscula: `abc-1d23` vira `ABC1D23`. */
export function chaveDePlaca(texto: string): string {
  return semAcento(texto).replace(/[^a-z0-9]/g, "").toUpperCase();
}

/** Placa antiga (`ABC1234`) ou Mercosul (`ABC1D23`), com ou sem traço. */
export function parecePlaca(texto: string): boolean {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(chaveDePlaca(texto));
}

/** O termo a buscar, ou `null` enquanto tiver menos de 2 letras. */
export function termoDaBusca(texto: string): string | null {
  const termo = texto.trim();
  if (semAcento(termo).replace(/\s/g, "").length < 2) return null;
  return termo;
}

/** Quais tipos a pessoa pode ver, pelos módulos dela (as mesmas regras do banco). */
export function tiposVisiveis(operador: Operador | null): TipoResultado[] {
  const pode = (tipo: TipoResultado): boolean => {
    switch (tipo) {
      // A ficha do veículo é de Clientes ou de OS (a rota de App.tsx), e o
      // cliente sem o módulo Clientes chega só pela janela estreita (#365).
      case "veiculo":
      case "cliente":
        return temPermissao(operador, "clientes") || temPermissao(operador, "ordens_servico");
      case "os":
        return temPermissao(operador, "ordens_servico");
      case "peca":
        return temPermissao(operador, "estoque");
      case "fornecedor":
        return temPermissao(operador, "fornecedores");
    }
  };
  return ORDEM_DOS_TIPOS.filter(pode);
}

export function filtrarPorPermissao(resultados: ResultadoBusca[], operador: Operador | null): ResultadoBusca[] {
  const visiveis = new Set(tiposVisiveis(operador));
  return resultados.filter((r) => visiveis.has(r.tipo));
}

export interface ItemDoGrupo extends ResultadoBusca {
  /** A posição na lista inteira: é o que as setas ↑ e ↓ percorrem. */
  indice: number;
}

export interface GrupoDeResultados {
  tipo: TipoResultado;
  rotulo: string;
  itens: ItemDoGrupo[];
}

export function agruparResultados(resultados: ResultadoBusca[]): GrupoDeResultados[] {
  let indice = 0;
  const grupos: GrupoDeResultados[] = [];
  for (const tipo of ORDEM_DOS_TIPOS) {
    const doTipo = resultados.filter((r) => r.tipo === tipo);
    if (doTipo.length === 0) continue;
    grupos.push({ tipo, rotulo: ROTULO_DO_TIPO[tipo], itens: doTipo.map((r) => ({ ...r, indice: indice++ })) });
  }
  return grupos;
}

export interface DestinoDaBusca {
  rota: string;
  state?: { abrirOrdemId: string };
}

/** Pra onde o Enter (ou o clique) leva; `null` quando não há tela que a pessoa possa abrir. */
export function destinoDoResultado(resultado: ResultadoBusca, operador: Operador | null): DestinoDaBusca | null {
  switch (resultado.tipo) {
    case "veiculo":
      return { rota: `/veiculos/${resultado.id}` };
    case "cliente":
      if (temPermissao(operador, "clientes")) return { rota: "/clientes" };
      // Sem Clientes, o cadastro não abre (#365): leva pra ficha do carro.
      return resultado.veiculo_id ? { rota: `/veiculos/${resultado.veiculo_id}` } : null;
    case "os":
      return { rota: "/ordens-servico", state: { abrirOrdemId: resultado.id } };
    case "peca":
      return { rota: "/estoque" };
    case "fornecedor":
      return { rota: "/fornecedores" };
  }
}

/** A próxima seleção com ↑ (-1) ou ↓ (+1), dando a volta nas pontas; -1 sem resultado. */
export function moverSelecao(atual: number, total: number, direcao: 1 | -1): number {
  if (total === 0) return -1;
  return (((atual + direcao) % total) + total) % total;
}
