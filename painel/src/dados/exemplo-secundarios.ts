import type { Projeto, Proposta, RespostaDaLevaDoProjeto, Tarefa } from "../tipos";

// Projetos secundários de mentira (#731), pra página abrir no `npm run dev` sem login nem worker.
// Logins de mentira e sem foto: o Avatar mostra a inicial.
const avatar = "";
const issue = (repo: string, n: number) => `https://github.com/sakura-corp/${repo}/issues/${n}`;

export const propostasDeExemplo: Proposta[] = [
  { numero: 1, titulo: "Controle de ar-condicionado das lojas", url: issue("secundarios", 1), estado: "aprovada", aberta: false, atualizadaEm: "2026-10-18T12:00:00.000Z" },
  { numero: 2, titulo: "Site da loja com agendamento", url: issue("secundarios", 2), estado: "em-entrevista", aberta: true, atualizadaEm: "2026-10-20T12:00:00.000Z" },
  { numero: 3, titulo: "Aplicativo de pontos para clientes", url: issue("secundarios", 3), estado: "esperando-sofia", aberta: true, atualizadaEm: "2026-10-21T12:00:00.000Z" },
  { numero: 4, titulo: "Painel de metas da equipe", url: issue("secundarios", 4), estado: "com-sugestoes", aberta: true, atualizadaEm: "2026-10-21T15:00:00.000Z" },
  { numero: 5, titulo: "Robô de cobrança por mensagem", url: issue("secundarios", 5), estado: "recusada", aberta: false, atualizadaEm: "2026-10-12T12:00:00.000Z" },
  { numero: 6, titulo: "Ideia solta, ainda sem etiqueta de estado", url: issue("secundarios", 6), estado: null, aberta: true, atualizadaEm: "2026-10-22T12:00:00.000Z" },
];

export const projetosDeExemplo: Projeto[] = [
  {
    repositorio: "ar-condicionado",
    nome: "ar-condicionado",
    descricao: "Controle e histórico de manutenção dos aparelhos de ar-condicionado das lojas.",
    url: "https://github.com/sakura-corp/ar-condicionado",
    levas: [{ numero: 1, nome: "Leva 1", abertas: 3 }],
    atual: 1,
  },
  {
    repositorio: "site-da-loja",
    nome: "site-da-loja",
    descricao: "Site público da loja, com horários e agendamento.",
    url: "https://github.com/sakura-corp/site-da-loja",
    levas: [{ numero: 1, nome: "Leva 1", abertas: 0 }],
    atual: null,
  },
];

const dono = (login: string) => ({ login, avatar });
const tarefa = (n: number, t: Omit<Tarefa, "numero" | "url" | "repositorio">): Tarefa => ({ numero: n, url: issue("ar-condicionado", n), repositorio: "ar-condicionado", ...t });

export const levaDeExemploDoProjeto: RespostaDaLevaDoProjeto = {
  repositorio: "ar-condicionado",
  levas: [{ numero: 1, nome: "Leva 1", abertas: 3 }],
  atual: 1,
  leva: {
    numero: 1,
    cortada: false,
    tarefas: [
      tarefa(1, { titulo: "Cadastro dos aparelhos", estado: "feita", dono: dono("ana-exemplo"), estimativaHoras: 3, chefe: "frontend" }),
      tarefa(2, { titulo: "Histórico de manutenção", estado: "andamento", dono: dono("bruno-exemplo"), estimativaHoras: 5, chefe: "backend" }),
      tarefa(3, { titulo: "Aviso de revisão vencida", estado: "revisao", dono: dono("ana-exemplo"), estimativaHoras: 2, chefe: "frontend" }),
      tarefa(4, { titulo: "Relatório mensal por loja", estado: "livre", estimativaHoras: 4, chefe: "backend" }),
    ],
  },
};
