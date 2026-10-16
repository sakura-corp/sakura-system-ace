import type { Tarefa } from "../tipos";

// Leva de mentira (a tarefa 6 troca pelos dados do GitHub). Cobre os 4 estados e tem
// uma pessoa com 2 tarefas em andamento, pra testar o aviso da regra "uma por vez".
// Sem foto: os logins são de mentira, então o Avatar mostra a inicial (a tarefa 6 traz a foto do GitHub).
const avatar = (_login: string) => "";
const url = (n: number) => `https://github.com/sakura-corp/sakura-system-ace/issues/${n}`;

export const nomeDaLevaDeExemplo = "Leva 0";

export const tarefasDeExemplo: Tarefa[] = [
  { numero: 350, titulo: "Painel 1/8: O esqueleto do painel", url: url(350), estado: "feita", dono: { login: "ana-exemplo", avatar: avatar("ana-exemplo") }, estimativaHoras: 3, prUrl: url(424) },
  { numero: 351, titulo: "Painel 2/8: O visual e a tela da leva", url: url(351), estado: "andamento", dono: { login: "bruno-exemplo", avatar: avatar("bruno-exemplo") }, estimativaHoras: 5 },
  { numero: 467, titulo: "Painel 3/8: A sala da Sakura", url: url(467), estado: "andamento", dono: { login: "bruno-exemplo", avatar: avatar("bruno-exemplo") }, estimativaHoras: 8 },
  { numero: 352, titulo: "Painel 4/8: Publicar na Cloudflare", url: url(352), estado: "revisao", dono: { login: "ana-exemplo", avatar: avatar("ana-exemplo") }, estimativaHoras: 3, prUrl: url(430) },
  { numero: 353, titulo: "Painel 5/8: Login pelo GitHub", url: url(353), estado: "livre", estimativaHoras: 6 },
  { numero: 354, titulo: "Painel 6/8: As tarefas de verdade do GitHub", url: url(354), estado: "livre", estimativaHoras: 5 },
  { numero: 355, titulo: "Painel 7/8: Tempo real", url: url(355), estado: "livre", estimativaHoras: 6 },
  { numero: 468, titulo: "Painel 8/8: A sala de verdade, ao vivo", url: url(468), estado: "livre" },
];
