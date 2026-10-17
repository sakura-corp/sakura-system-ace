// A lista da barra lateral como dado: a barra só desenha o que está aqui.
import type { Pagina } from "../tipos";

/** Os ícones da barra (nomes do lucide-react). A BarraLateral mapeia cada nome pro componente. */
export type NomeDoIcone = "casa" | "lista" | "relogio" | "etiqueta" | "fases" | "relatorio" | "pessoas" | "pessoa" | "maleta" | "cartao" | "grafico" | "loja" | "ajustes";

type Base = {
  id: Pagina;
  rotulo: string;
  icone: NomeDoIcone;
  /** etiqueta pequena ao lado do rótulo, ex.: "exemplo" */
  etiqueta?: string;
};
/** Página que já existe: tem endereço. */
export type ItemQueExiste = Base & { href: string; emBreve?: undefined; dependeDe?: undefined };
/** Página que ainda não existe: aparece apagada, com a frase do que falta. */
export type ItemEmBreve = Base & { emBreve: true; dependeDe: string; href?: undefined };
export type ItemDaNavegacao = ItemQueExiste | ItemEmBreve;
export type GrupoDaNavegacao = {
  id: "topo" | "trabalho" | "equipe" | "empresa" | "rodape";
  titulo?: string;
  itens: ItemDaNavegacao[];
};

export const NAVEGACAO: GrupoDaNavegacao[] = [
  {
    id: "topo",
    itens: [{ id: "inicio", rotulo: "Início", icone: "casa", emBreve: true, dependeDe: "depende da #546" }],
  },
  {
    id: "trabalho",
    titulo: "Trabalho",
    itens: [
      // A barra troca o "/" pelo endereço da leva atual (vem de /api/levas).
      { id: "leva", rotulo: "Leva atual", icone: "lista", href: "/" },
      { id: "levas", rotulo: "Levas anteriores", icone: "relogio", emBreve: true, dependeDe: "depende da #548" },
      { id: "versoes", rotulo: "Versões", icone: "etiqueta", emBreve: true, dependeDe: "depende da leva 2" },
      { id: "fases", rotulo: "Fases da leva", icone: "fases", emBreve: true, dependeDe: "depende do desenho" },
      { id: "relatorio", rotulo: "Relatório da leva", icone: "relatorio", emBreve: true, dependeDe: "depende do desenho" },
    ],
  },
  {
    id: "equipe",
    titulo: "Equipe",
    itens: [
      { id: "sala", rotulo: "Sala", icone: "pessoas", href: "/sala" },
      { id: "pessoas", rotulo: "Pessoas", icone: "pessoa", emBreve: true, dependeDe: "ainda sem tarefa" },
      { id: "escritorio", rotulo: "Escritório", icone: "maleta", href: "/escritorio", etiqueta: "exemplo" },
    ],
  },
  {
    id: "empresa",
    titulo: "Empresa",
    itens: [
      { id: "financeiro", rotulo: "Financeiro", icone: "cartao", emBreve: true, dependeDe: "depende do banco privado" },
      { id: "dre", rotulo: "DRE", icone: "grafico", emBreve: true, dependeDe: "depende do Financeiro" },
      { id: "lojas", rotulo: "Lojas", icone: "loja", emBreve: true, dependeDe: "depende do banco privado" },
    ],
  },
  {
    id: "rodape",
    itens: [{ id: "configuracoes", rotulo: "Configurações", icone: "ajustes", emBreve: true, dependeDe: "ainda sem tarefa" }],
  },
];

/** Os endereços que já existem e não podem mudar nem sumir (decisão da #542). */
export const ENDERECOS_QUE_EXISTEM: Record<"leva" | "sala" | "escritorio", string> = {
  leva: "/",
  sala: "/sala",
  escritorio: "/escritorio",
};

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
      } else if (!item.href || !item.href.startsWith("/")) {
        problemas.push(`"${nome}" existe mas não tem endereço começando com "/".`);
      }
    }
  }
  return problemas;
}
