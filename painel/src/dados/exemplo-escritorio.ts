import type { Agente, Equipe, TarefaDoEscritorio } from "../tipos";

// Escritório de agentes: TUDO DE EXEMPLO. Nenhum agente de verdade roda, nenhuma sessão é lançada,
// nenhum token é gasto. Ver docs/painel.md, "Escritório de agentes", pro que falta pra ligar de verdade.

/** Quem está olhando, no exemplo. Os "precisa de você" são de quem tem este login. */
export const QUEM_ESTA_OLHANDO_NO_EXEMPLO = "voce-exemplo";

/** Notas do Cérebro no exemplo (a memória compartilhada). */
export const NOTAS_DO_CEREBRO_NO_EXEMPLO = 128;

const repo = "https://github.com/sakura-corp/sakura-system-ace";

export const equipesDeExemplo: Equipe[] = [
  {
    id: "lojas", nome: "Programa das lojas", cor: "#8FB8F0", lider: "Caixa e OS",
    numeros: { tarefasHoje: [3, 5, 4, 6, 7, 6, 9], rodando: [1, 2, 2, 1, 2, 3, 2], tempoMedioMin: [22, 19, 21, 18, 17, 16, 15] },
    ferramentas: ["GitHub", "Supabase de teste", "Playwright"],
    skills: [{ nome: "gerar-modulo", progresso: 62 }, { nome: "testes de fuso", progresso: 35 }],
  },
  {
    id: "painel", nome: "Painel", cor: "#C98FAE", lider: "Escritório",
    numeros: { tarefasHoje: [2, 2, 3, 4, 3, 5, 6], rodando: [1, 1, 2, 2, 1, 2, 2], tempoMedioMin: [30, 28, 26, 27, 24, 22, 20] },
    ferramentas: ["GitHub", "Playwright", "Cloudflare (em breve)"],
    skills: [{ nome: "fotos da tela", progresso: 80 }, { nome: "revisão de código", progresso: 45 }],
  },
  {
    id: "proximos", nome: "Próximos projetos", cor: "#B9A3F0", lider: "Projeto-modelo",
    numeros: { tarefasHoje: [8, 9, 7, 10, 12, 11, 13], rodando: [1, 1, 1, 2, 1, 1, 1], tempoMedioMin: [6, 5, 6, 5, 4, 4, 4] },
    ferramentas: ["GitHub", "Docs"],
    skills: [{ nome: "projeto-modelo", progresso: 50 }],
  },
  {
    id: "fiscal", nome: "Fiscal e contabilidade", cor: "#7FCBC0", lider: "Conferir XML",
    numeros: { tarefasHoje: [1, 2, 1, 3, 2, 2, 3], rodando: [0, 1, 0, 1, 1, 0, 0], tempoMedioMin: [40, 38, 41, 36, 35, 37, 34] },
    ferramentas: ["Focus NFe (homologação)", "Planilhas"],
    skills: [{ nome: "conferir XML", progresso: 20 }],
  },
  {
    id: "site", nome: "Site", cor: "#9CCB86", lider: "Textos do site",
    numeros: { tarefasHoje: [0, 1, 1, 0, 2, 1, 1], rodando: [0, 0, 1, 0, 0, 1, 0], tempoMedioMin: [25, 25, 23, 24, 22, 21, 22] },
    ferramentas: ["GitHub"],
    skills: [],
  },
  {
    id: "equipe", nome: "Equipe", cor: "#E9B48A", lider: "Tarefas da leva",
    numeros: { tarefasHoje: [2, 3, 2, 4, 4, 5, 4], rodando: [1, 1, 1, 1, 2, 1, 1], tempoMedioMin: [18, 17, 18, 16, 15, 15, 14] },
    ferramentas: ["GitHub", "Docs"],
    skills: [{ nome: "rascunho de tarefa", progresso: 71 }],
  },
];

/** Os agentes de exemplo, com o tempo contado a partir do "agora" recebido. */
export function agentesDeExemplo(agora: Date): Agente[] {
  const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
  const eu = QUEM_ESTA_OLHANDO_NO_EXEMPLO;
  return [
    { id: "a1", nome: "Caixa e OS", equipe: "lojas", modelo: "sonnet", fazendo: "Ajustando o fechamento do caixa", ultimaAtividade: ha(4), rodando: true, url: `${repo}/pulls` },
    { id: "a2", nome: "Notas fiscais", equipe: "lojas", modelo: "opus", fazendo: "PR pronto, pedindo a sua revisão", ultimaAtividade: ha(35), esperandoPor: eu, url: `${repo}/pulls` },
    { id: "a3", nome: "Testes de fuso", equipe: "lojas", modelo: "haiku", fazendo: "Última rodada deu certo", ultimaAtividade: ha(300) },
    { id: "a4", nome: "Tela da leva", equipe: "painel", modelo: "sonnet", fazendo: "Tirando as fotos da tela", ultimaAtividade: ha(2), rodando: true },
    { id: "a5", nome: "Escritório", equipe: "painel", modelo: "opus", fazendo: "Desenhando as salas", ultimaAtividade: ha(1), rodando: true },
    { id: "a6", nome: "Sala", equipe: "painel", modelo: "sonnet", fazendo: "Sem commit há 4 dias", ultimaAtividade: ha(4 * 24 * 60) },
    { id: "a7", nome: "Projeto-modelo", equipe: "proximos", modelo: "sonnet", fazendo: "Montando o esqueleto do projeto novo", ultimaAtividade: ha(6), rodando: true },
    { id: "a8", nome: "Pesquisa de nicho", equipe: "proximos", modelo: "haiku", fazendo: "Esperando a próxima pesquisa", ultimaAtividade: ha(90) },
    { id: "a9", nome: "Conferir XML", equipe: "fiscal", modelo: "sonnet", fazendo: "A última conferência falhou", ultimaAtividade: ha(50), falhou: true },
    { id: "a10", nome: "Planilhas do contador", equipe: "fiscal", modelo: "haiku", fazendo: "Planilha do mês entregue", ultimaAtividade: ha(600) },
    { id: "a11", nome: "Textos do site", equipe: "site", modelo: "sonnet", fazendo: "Sem commit há 5 dias", ultimaAtividade: ha(5 * 24 * 60) },
    { id: "a12", nome: "Publicar site", equipe: "site", modelo: "haiku", fazendo: "Esperando a sua aprovação pra publicar", ultimaAtividade: ha(20), esperandoPor: eu },
    { id: "a13", nome: "Tarefas da leva", equipe: "equipe", modelo: "sonnet", fazendo: "Escrevendo o rascunho da #455", ultimaAtividade: ha(10), rodando: true },
    { id: "a14", nome: "Manual da equipe", equipe: "equipe", modelo: "opus", fazendo: "Manual revisado ontem", ultimaAtividade: ha(20 * 60) },
    { id: "a15", nome: "Banco de teste", equipe: "equipe", modelo: "haiku", fazendo: "Dados de exemplo prontos", ultimaAtividade: ha(8 * 60) },
  ];
}

/** As tarefas do dia, de exemplo. "Feita há N min" é contado a partir do "agora" (e pode cair ontem, se for logo depois da meia-noite). */
export function tarefasDoEscritorioDeExemplo(agora: Date): TarefaDoEscritorio[] {
  const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
  return [
    { id: "t1", titulo: "Fechamento do caixa com troco", equipe: "lojas", situacao: "rodando", progresso: 64 },
    { id: "t2", titulo: "Fotos da tela da leva", equipe: "painel", situacao: "rodando", progresso: 88 },
    { id: "t3", titulo: "Desenho do escritório", equipe: "painel", situacao: "rodando", progresso: 41 },
    { id: "t4", titulo: "Esqueleto do próximo projeto", equipe: "proximos", situacao: "rodando", progresso: 15 },
    { id: "t5", titulo: "Rascunho da tarefa #455", equipe: "equipe", situacao: "rodando", progresso: 52 },
    { id: "t6", titulo: "Revisar o PR das notas fiscais", equipe: "lojas", situacao: "esperando" },
    { id: "t7", titulo: "Publicar a página nova do site", equipe: "site", situacao: "esperando" },
    { id: "t8", titulo: "Planilha do contador de setembro", equipe: "fiscal", situacao: "feita", feitaEm: ha(25) },
    { id: "t9", titulo: "Dados de exemplo do banco de teste", equipe: "equipe", situacao: "feita", feitaEm: ha(70) },
    { id: "t10", titulo: "Testes de fuso", equipe: "lojas", situacao: "feita", feitaEm: ha(120) },
    { id: "t11", titulo: "Manual da equipe revisado", equipe: "equipe", situacao: "feita", feitaEm: ha(26 * 60) },
  ];
}

/** Avisos "ao vivo" de exemplo (texto fixo; nada chega de verdade). */
export const avisosDeExemplo: { equipe: string; texto: string }[] = [
  { equipe: "painel", texto: "Fotos da leva prontas ✓" },
  { equipe: "lojas", texto: "PR das notas fiscais pede revisão" },
  { equipe: "fiscal", texto: "Conferência do XML falhou" },
];
