// A lista da barra lateral como dado: a barra só desenha o que está aqui.
import type { Pagina } from "../tipos";

/** Os ícones da barra (nomes do lucide-react). A BarraLateral mapeia cada nome pro componente. */
export type NomeDoIcone = "casa" | "lista" | "relogio" | "etiqueta" | "fases" | "relatorio" | "pessoas" | "pessoa" | "maleta" | "cartao" | "grafico" | "loja" | "ajustes" | "suporte" | "backup" | "coroa";

type Base = {
  id: Pagina;
  rotulo: string;
  icone: NomeDoIcone;
  /** etiqueta pequena ao lado do rótulo, ex.: "exemplo" */
  etiqueta?: string;
};
/** Página que já existe: tem endereço. */
export type ItemQueExiste = Base & { href: string; emBreve?: undefined; dependeDe?: undefined };
/**
 * Página que ainda não existe: aparece apagada, com a frase do que falta, e o endereço leva à
 * página que explica (#544), sempre `/em-breve/<id>`.
 */
export type ItemEmBreve = Base & { emBreve: true; dependeDe: string; href: string };
export type ItemDaNavegacao = ItemQueExiste | ItemEmBreve;
/**
 * Um andar do "prédio" da Sakura (#591): uma área da empresa, com os seus chefes. A barra desenha de cima pra baixo
 * começando pelo Térreo (a ordem de uso). O "rodape" não é andar: guarda as Configurações.
 */
export type GrupoDaNavegacao = {
  id: "terreo" | "producao" | "comercial" | "financeiro" | "seguranca" | "diretoria" | "rodape";
  titulo?: string;
  /** Quem cuida do andar (as funções, como na tabela da #591). Aparece na página "em breve", não na barra. */
  chefes?: string[];
  itens: ItemDaNavegacao[];
};

export const NAVEGACAO: GrupoDaNavegacao[] = [
  {
    id: "terreo",
    titulo: "Térreo · Recepção",
    chefes: [],
    itens: [{ id: "inicio", rotulo: "Início", icone: "casa", href: "/" }],
  },
  {
    id: "producao",
    titulo: "1º · Produção",
    chefes: ["frontend", "backend", "tester"],
    itens: [
      { id: "leva", rotulo: "Leva atual", icone: "lista", href: "/leva" },
      { id: "levas", rotulo: "Levas anteriores", icone: "relogio", href: "/levas" },
      { id: "fases", rotulo: "Fases da leva", icone: "fases", emBreve: true, href: "/em-breve/fases", dependeDe: "depende do desenho" },
      { id: "relatorio", rotulo: "Relatório da leva", icone: "relatorio", href: "/relatorio" },
      { id: "sala", rotulo: "Sala", icone: "pessoas", href: "/sala" },
      { id: "escritorio", rotulo: "Escritório", icone: "maleta", href: "/escritorio", etiqueta: "exemplo" },
      { id: "pessoas", rotulo: "Pessoas", icone: "pessoa", emBreve: true, href: "/em-breve/pessoas", dependeDe: "ainda sem tarefa" },
    ],
  },
  {
    id: "comercial",
    titulo: "2º · Comercial e pós-venda",
    chefes: ["marketing"],
    itens: [
      { id: "lojas", rotulo: "Lojas", icone: "loja", emBreve: true, href: "/em-breve/lojas", dependeDe: "depende do banco privado" },
      { id: "posvenda", rotulo: "Pós-venda", icone: "suporte", emBreve: true, href: "/em-breve/posvenda", dependeDe: "ainda sem tarefa" },
    ],
  },
  {
    id: "financeiro",
    titulo: "3º · Financeiro",
    chefes: [],
    itens: [
      { id: "financeiro", rotulo: "Financeiro", icone: "cartao", href: "/financeiro" },
      { id: "dre", rotulo: "DRE", icone: "grafico", emBreve: true, href: "/em-breve/dre", dependeDe: "depende do Financeiro" },
    ],
  },
  {
    id: "seguranca",
    titulo: "4º · Segurança e operação",
    chefes: ["segurança"],
    itens: [
      { id: "versoes", rotulo: "Versões", icone: "etiqueta", emBreve: true, href: "/em-breve/versoes", dependeDe: "depende da leva 2" },
      { id: "bancos", rotulo: "Bancos e backups", icone: "backup", emBreve: true, href: "/em-breve/bancos", dependeDe: "ainda sem tarefa" },
    ],
  },
  {
    id: "diretoria",
    titulo: "Cobertura · Diretoria",
    chefes: [],
    itens: [{ id: "decisoes", rotulo: "Decisões da Sofia", icone: "coroa", emBreve: true, href: "/em-breve/decisoes", dependeDe: "ainda sem tarefa" }],
  },
  {
    id: "rodape",
    itens: [{ id: "configuracoes", rotulo: "Configurações", icone: "ajustes", emBreve: true, href: "/em-breve/configuracoes", dependeDe: "ainda sem tarefa" }],
  },
];

/** /leva/3/relatorio → 3 (o relatório da leva 3, #647); outro caminho → null. */
export function relatorioPedido(caminho: string): number | null {
  const achou = /^\/leva\/(\d{1,4})\/relatorio\/?$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** O andar onde um item mora (pra mostrar "quem cuida deste andar"); undefined se o id não está na lista. */
export function andarDoItem(id: string): GrupoDaNavegacao | undefined {
  return NAVEGACAO.find((g) => g.itens.some((i) => i.id === id));
}

/** Como a página "em breve" chama a área de cada chefe (#601): por área e em português, com o artigo que a frase pede. */
const AREA_DO_CHEFE: Record<string, string> = {
  frontend: "das telas",
  backend: "dos dados",
  tester: "dos testes",
  marketing: "do marketing",
  segurança: "da segurança",
};

/**
 * O que a página "em breve" diz sobre quem cuida do andar, como o fim da linha "Quem cuida: …".
 * Com tarefa a frase continua a da tarefa ("…#548" + ", no andar das telas…"); sem tarefa ela começa pelo
 * andar. Andar sem chefe diz que ainda não tem (a linha nunca some).
 */
export function fraseDoAndar(chefes: string[], comTarefa: boolean): string {
  if (chefes.length === 0) return comTarefa ? ". O andar ainda não tem chefe." : "o andar ainda não tem chefe.";
  const areas = chefes.map((c) => AREA_DO_CHEFE[c] ?? `de ${c}`);
  const lista = areas.length === 1 ? areas[0] : `${areas.slice(0, -1).join(", ")} e ${areas[areas.length - 1]}`;
  return comTarefa ? `, no andar ${lista}.` : `o andar ${lista}.`;
}

/** O endereço da página que explica um item em breve (#544). */
export function enderecoEmBreve(id: string): string {
  return `/em-breve/${id}`;
}

/** Uma frase por problema na lista; lista vazia = tudo certo. */
export function problemasDaNavegacao(grupos: GrupoDaNavegacao[]): string[] {
  const problemas: string[] = [];
  const vistos = new Set<string>();
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      const nome = item.rotulo.trim() || `(sem rótulo, id "${item.id}")`;
      if (!item.rotulo.trim()) problemas.push(`Item "${item.id}" está sem rótulo.`);
      if (vistos.has(item.id)) problemas.push(`O id "${item.id}" aparece mais de uma vez.`);
      vistos.add(item.id);
      if (item.emBreve) {
        if (!item.dependeDe || !item.dependeDe.trim()) problemas.push(`"${nome}" está em breve mas não diz do que depende.`);
        if (item.href !== enderecoEmBreve(item.id)) problemas.push(`"${nome}" está em breve mas o endereço não é "${enderecoEmBreve(item.id)}".`);
      } else if (!item.href || !item.href.startsWith("/")) {
        problemas.push(`"${nome}" existe mas não tem endereço começando com "/".`);
      }
    }
  }
  return problemas;
}
