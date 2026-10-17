// O texto das páginas "em breve" como dado: o que vai ter ali, do que depende e quem cuida.
// A tela (PaginaEmBreve) só desenha o que está aqui. Fonte: docs/rascunhos/painel-v2.md, seção 2.
import type { Pagina } from "../tipos";
import type { GrupoDaNavegacao } from "./navegacao";

// O endereço mora na navegação (o link da barra); reexportado aqui pra quem só usa as páginas.
export { enderecoEmBreve } from "./navegacao";

export type TextoEmBreve = {
  /** o mesmo id da navegacao.ts */
  id: Pagina;
  /** pra trilha: "Trabalho", "Equipe", "Empresa"; sem grupo no topo e no rodapé */
  grupo?: string;
  /** igual ao rótulo da navegação */
  titulo: string;
  subtitulo: string;
  /** o parágrafo do cartão "Ainda não está pronto" */
  resumo: string;
  vaiMostrar: string[];
  dependeDe: { texto: string; detalhe?: string }[];
  /** a issue que cuida, se houver */
  tarefa?: number;
  /** Financeiro, DRE e Lojas: mostra o aviso de que dinheiro nunca mora no GitHub */
  semDinheiro?: true;
};

export const EM_BREVE: TextoEmBreve[] = [
  {
    id: "inicio",
    titulo: "Início",
    subtitulo: "O que é seu, num lugar só.",
    resumo: "O Início junta o que precisa de você, a sua tarefa e o que mudou hoje. Ele abre quando a lista de tarefas souber quem pegou o quê.",
    vaiMostrar: ["O que precisa de você agora", "A sua tarefa de agora", "A leva atual em uma linha", "O que mudou hoje no repositório"],
    dependeDe: [
      { texto: "A tarefa do Início", detalhe: "É a #546." },
      { texto: "Pegar e largar tarefa pelo painel", detalhe: "É a #538, que já entrou." },
    ],
    tarefa: 546,
  },
  {
    id: "levas",
    grupo: "Trabalho",
    titulo: "Levas anteriores",
    subtitulo: "O que cada leva entregou.",
    resumo: "Aqui ficam as levas que já terminaram, uma a uma. Ainda falta o painel descobrir quando cada leva acabou.",
    vaiMostrar: ["As tarefas de cada leva", "As horas de cada leva", "Quando cada leva terminou"],
    dependeDe: [
      { texto: "A tarefa das levas anteriores", detalhe: "É a #548." },
      { texto: "A data de fim de cada leva", detalhe: "Vem da última tarefa fechada da leva." },
    ],
    tarefa: 548,
  },
  {
    id: "versoes",
    grupo: "Trabalho",
    titulo: "Versões",
    subtitulo: "O que saiu pras lojas.",
    resumo: "Versões mostra o que saiu no canal de teste e o que já foi liberado pras lojas. Os dados já são públicos, falta só a tela.",
    vaiMostrar: ["O que saiu no canal de teste", "O que foi liberado pras lojas", "O que mudou em cada versão"],
    dependeDe: [{ texto: "Uma tarefa da leva 2", detalhe: "Ainda não existe issue." }],
  },
  {
    id: "fases",
    grupo: "Trabalho",
    titulo: "Fases da leva",
    subtitulo: "A leva em etapas.",
    resumo: "Fases da leva mostra em que etapa a leva está: planejar, fazer, congelar, testar e liberar.",
    vaiMostrar: ["A etapa em que a leva está", "O que falta pra passar pra próxima etapa"],
    dependeDe: [
      { texto: "A conversa de desenho da leva 2", detalhe: "Decisão da Sofia." },
      { texto: "Um jeito de marcar a fase", detalhe: "Ainda a decidir." },
    ],
  },
  {
    id: "relatorio",
    grupo: "Trabalho",
    titulo: "Relatório da leva",
    subtitulo: "O fim da leva, por escrito.",
    resumo: "O Relatório da leva traz o que foi feito e onde a Sofia aprova o fim da leva.",
    vaiMostrar: ["O relatório do fim da leva", "A aprovação da Sofia"],
    dependeDe: [
      { texto: "A conversa de desenho da leva 2", detalhe: "Decisão da Sofia." },
      { texto: "Um jeito de guardar a aprovação", detalhe: "Ainda a decidir." },
    ],
  },
  {
    id: "pessoas",
    grupo: "Equipe",
    titulo: "Pessoas",
    subtitulo: "Cada pessoa e o que faz agora.",
    resumo: "Pessoas mostra a tarefa de agora e as horas de cada pessoa na leva. Sem nota e sem ranking.",
    vaiMostrar: ["A tarefa de agora de cada pessoa", "As horas de cada pessoa na leva"],
    dependeDe: [{ texto: "Uma tarefa pra esta página", detalhe: "Ainda não existe. As horas por pessoa (#539) já estão na leva." }],
  },
  {
    id: "financeiro",
    grupo: "Empresa",
    titulo: "Financeiro",
    subtitulo: "As contas da Sakura Corp, num lugar só.",
    resumo: "O Financeiro mostra as contas da Sakura Corp. Ele só abre quando houver um lugar seguro, e privado, pra guardar esses dados.",
    vaiMostrar: ["Entradas e saídas do mês", "Contas a pagar e a receber da Sakura Corp", "O resumo do mês, que alimenta o DRE"],
    dependeDe: [
      { texto: "Escolher o banco privado", detalhe: "Decisão da Sofia." },
      { texto: "Ligar o painel a esse banco", detalhe: "Só depois da escolha." },
    ],
    semDinheiro: true,
  },
  {
    id: "dre",
    grupo: "Empresa",
    titulo: "DRE",
    subtitulo: "O resultado do mês.",
    resumo: "O DRE mostra se a empresa ganhou ou perdeu no mês. Ele nasce do Financeiro, então só abre depois dele.",
    vaiMostrar: ["O resultado do mês", "De onde veio cada parte do resultado"],
    dependeDe: [
      { texto: "O Financeiro pronto", detalhe: "O DRE usa as contas dele." },
      { texto: "O banco privado", detalhe: "Decisão da Sofia." },
    ],
    semDinheiro: true,
  },
  {
    id: "lojas",
    grupo: "Empresa",
    titulo: "Lojas",
    subtitulo: "Cada loja cliente e a versão que usa.",
    resumo: "Lojas mostra, loja por loja, a versão instalada e se o banco está atualizado. Ela só abre quando houver um lugar privado pra guardar os nomes.",
    vaiMostrar: ["A versão instalada em cada loja", "Se o banco de cada loja está atualizado"],
    dependeDe: [
      { texto: "Escolher o banco privado", detalhe: "Decisão da Sofia." },
      { texto: "Ligar o painel a esse banco", detalhe: "Só depois da escolha." },
    ],
    semDinheiro: true,
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    subtitulo: "Do seu jeito.",
    resumo: "Configurações deixa você escolher o tema e os avisos. O que você escolher fica guardado só no seu navegador.",
    vaiMostrar: ["Tema claro, escuro ou automático", "Avisos"],
    dependeDe: [{ texto: "Uma tarefa", detalhe: "Ainda não existe issue." }],
  },
];

export function textoEmBreve(id: string): TextoEmBreve | undefined {
  return EM_BREVE.find((t) => t.id === id);
}

/** "/em-breve/financeiro" (com ou sem barra no fim) → "financeiro"; qualquer outro caminho → null. */
export function idDoEmBreve(caminho: string): string | null {
  const m = /^\/em-breve\/([^/]+)\/?$/.exec(caminho);
  return m ? m[1] : null;
}

// Nas páginas da Empresa, nenhum algarismo (nem "1.500", nem "30%") e nenhum "R$": o repositório é público.
const DINHEIRO = /R\$|\d/;

function todosOsTextos(t: TextoEmBreve): string[] {
  return [t.titulo, t.subtitulo, t.resumo, ...t.vaiMostrar, ...t.dependeDe.flatMap((d) => [d.texto, d.detalhe ?? ""])];
}

/** Uma frase por problema; lista vazia = tudo certo. */
export function problemasDoEmBreve(navegacao: GrupoDaNavegacao[], textos: TextoEmBreve[]): string[] {
  const problemas: string[] = [];
  const itens = navegacao.flatMap((g) => g.itens.map((item) => ({ item, grupo: g.id, titulo: g.titulo })));
  const emBreve = itens.filter((x) => x.item.emBreve);
  for (const { item } of emBreve) {
    if (!textos.some((t) => t.id === item.id)) problemas.push(`O item em breve "${item.rotulo}" não tem texto.`);
  }
  for (const t of textos) {
    const achado = emBreve.find((x) => x.item.id === t.id);
    if (!achado) {
      problemas.push(`O texto "${t.id}" não corresponde a nenhum item em breve da navegação.`);
      continue;
    }
    if (achado.item.rotulo !== t.titulo) problemas.push(`O título "${t.titulo}" é diferente do rótulo "${achado.item.rotulo}".`);
    if (t.grupo !== achado.titulo) problemas.push(`A trilha de "${t.titulo}" diz "${t.grupo ?? "(nada)"}", mas o grupo é "${achado.titulo ?? "(nada)"}".`);
    if (achado.grupo === "empresa") {
      if (!t.semDinheiro) problemas.push(`"${t.titulo}" é da Empresa e precisa de semDinheiro.`);
      if (todosOsTextos(t).some((s) => DINHEIRO.test(s))) problemas.push(`"${t.titulo}" tem número de dinheiro no texto.`);
    }
  }
  return problemas;
}
