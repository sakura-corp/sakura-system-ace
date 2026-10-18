// A lista da barra lateral como dado: a barra só desenha o que está aqui.
import type { Pagina } from "../tipos";
import type { Chefe } from "./comecarComClaude";

/** Os ícones da barra (nomes do lucide-react). A BarraLateral mapeia cada nome pro componente. */
export type NomeDoIcone = "casa" | "lista" | "relogio" | "etiqueta" | "fases" | "relatorio" | "pessoas" | "pessoa" | "maleta" | "cartao" | "grafico" | "loja" | "ajustes" | "suporte" | "banco" | "decisoes";

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
/** Os andares do prédio (#591): cada grupo da barra é um andar, de cima pra baixo. */
export type IdDoAndar = "terreo" | "producao" | "comercial" | "financeiro" | "operacao" | "diretoria" | "rodape";
export type GrupoDaNavegacao = {
  id: IdDoAndar;
  titulo?: string;
  /** Os chefes que cuidam do andar; só aparecem na página em breve, nunca na barra. */
  chefes?: Chefe[];
  itens: ItemDaNavegacao[];
};

const SEM_TAREFA = "ainda sem tarefa";

export const NAVEGACAO: GrupoDaNavegacao[] = [
  {
    id: "terreo",
    titulo: "Térreo · Recepção",
    itens: [{ id: "inicio", rotulo: "Início", icone: "casa", href: "/" }],
  },
  {
    id: "producao",
    titulo: "1º · Produção",
    chefes: ["frontend", "backend", "tester"],
    itens: [
      { id: "leva", rotulo: "Leva atual", icone: "lista", href: "/leva" },
      { id: "levas", rotulo: "Levas anteriores", icone: "relogio", emBreve: true, href: "/em-breve/levas", dependeDe: "depende da #548" },
      { id: "fases", rotulo: "Fases da leva", icone: "fases", emBreve: true, href: "/em-breve/fases", dependeDe: "depende do desenho" },
      { id: "relatorio", rotulo: "Relatório da leva", icone: "relatorio", emBreve: true, href: "/em-breve/relatorio", dependeDe: "depende do desenho" },
      { id: "sala", rotulo: "Sala", icone: "pessoas", href: "/sala" },
      { id: "escritorio", rotulo: "Escritório", icone: "maleta", href: "/escritorio", etiqueta: "exemplo" },
      { id: "pessoas", rotulo: "Pessoas", icone: "pessoa", emBreve: true, href: "/em-breve/pessoas", dependeDe: SEM_TAREFA },
    ],
  },
  {
    id: "comercial",
    titulo: "2º · Comercial e pós-venda",
    chefes: ["marketing"],
    itens: [
      { id: "lojas", rotulo: "Lojas", icone: "loja", emBreve: true, href: "/em-breve/lojas", dependeDe: "depende do banco privado" },
      { id: "posvenda", rotulo: "Pós-venda", icone: "suporte", emBreve: true, href: "/em-breve/posvenda", dependeDe: SEM_TAREFA },
    ],
  },
  {
    id: "financeiro",
    titulo: "3º · Financeiro",
    itens: [
      { id: "financeiro", rotulo: "Financeiro", icone: "cartao", emBreve: true, href: "/em-breve/financeiro", dependeDe: "depende do banco privado" },
      { id: "dre", rotulo: "DRE", icone: "grafico", emBreve: true, href: "/em-breve/dre", dependeDe: "depende do Financeiro" },
    ],
  },
  {
    id: "operacao",
    titulo: "4º · Segurança e operação",
    chefes: ["seguranca"],
    itens: [
      { id: "versoes", rotulo: "Versões", icone: "etiqueta", emBreve: true, href: "/em-breve/versoes", dependeDe: "depende da leva 2" },
      { id: "bancos", rotulo: "Bancos e backups", icone: "banco", emBreve: true, href: "/em-breve/bancos", dependeDe: SEM_TAREFA },
    ],
  },
  {
    id: "diretoria",
    titulo: "Cobertura · Diretoria",
    itens: [{ id: "decisoes", rotulo: "Decisões da Sofia", icone: "decisoes", emBreve: true, href: "/em-breve/decisoes", dependeDe: SEM_TAREFA }],
  },
  {
    id: "rodape",
    itens: [{ id: "configuracoes", rotulo: "Configurações", icone: "ajustes", emBreve: true, href: "/em-breve/configuracoes", dependeDe: SEM_TAREFA }],
  },
];

/** O andar que tem o item (o rodapé também); quem desenha decide o que fazer com ele. */
export function andarDoItem(id: string, grupos: GrupoDaNavegacao[] = NAVEGACAO): GrupoDaNavegacao | undefined {
  return grupos.find((g) => g.itens.some((i) => i.id === id));
}

const NOME_DO_CHEFE: Record<Chefe, string> = { frontend: "frontend", backend: "backend", seguranca: "segurança", marketing: "marketing", tester: "tester" };

/** A frase "Quem cuida deste andar: …" da página em breve. */
export function quemCuidaDoAndar(grupo: GrupoDaNavegacao): string {
  const nomes = (grupo.chefes ?? []).map((c) => NOME_DO_CHEFE[c]);
  if (nomes.length === 0) return "Quem cuida deste andar: ainda nenhum chefe.";
  if (nomes.length === 1) return `Quem cuida deste andar: o chefe de ${nomes[0]}.`;
  return `Quem cuida deste andar: os chefes de ${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}.`;
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
    const chefes = grupo.chefes ?? [];
    if (new Set(chefes).size !== chefes.length) problemas.push(`O andar "${grupo.titulo ?? grupo.id}" tem chefe repetido.`);
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
