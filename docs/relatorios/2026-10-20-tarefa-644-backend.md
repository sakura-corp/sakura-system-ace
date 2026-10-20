# Relatório: tarefa #644, chefe backend

- **Tarefa**: #644, Painel: a fase de cada leva, lida do GitHub
- **Chefe**: backend
- **Data**: 2026-10-20
- **PR**: branch `claude/tarefa-644-backend-e739wi` (o link fica na descrição do PR)
- **Jeito**: com ajudantes (um revisor)

## O que cada agente fez
- Sessão mãe: leu a issue, planejou e escreveu `fases.ts`, `levaAtual()`, a consulta do worker, a recusa do pegar
  e os testes (exploração, `faseDaLeva()` e consulta feitas por ela mesma, sem ajudante rápido nem médio).
- Ajudante forte (revisor): leu o diff do zero. Nenhum defeito real. Dois avisos aceitos e já feitos: um PR que
  **apaga** o `leva-N.md` contava como Relatório, e o `docs/painel.md` não dizia que a atual muda também no Início e na Sala.

## Modelos usados
- Planejar, escrever e testar: sessão mãe (forte).
- Revisão final: ajudante forte.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (sem acesso ao arquivo de uso nesta sessão).
- **Ajudantes**: 1 (revisor forte), cerca de 94 mil tokens pelo aviso de fim.
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei

## O que testei e VI reprovar
Primeiro escrevi o teste e vi ele reprovar sem o código. Depois quebrei cada regra de propósito, com `sed`, e vi o teste dela reprovar:
- cada uma das cinco fases e a leva 0 "antes das fases" (`fases.test.ts`): tirei uma regra por vez;
- o `leva-N-testes.md` não conta como relatório: troquei a expressão do caminho;
- a atual é a mais antiga não aprovada, e com todas aprovadas é a maior (`estado.test.ts`): troquei min por max;
- a leva 2 em Montando enquanto a 1 espera aprovação (`tarefas.test.ts`): desliguei o `anteriorPendente` e a leitura do PR;
- o relatório na main aprova a leva: desliguei a leitura da main;
- a tarefa com `defeito` e sem `leva-N` não muda a fase: fiz a etiqueta `defeito` virar uma leva;
- o PR que só apaga o relatório não conta: tirei o filtro `DELETED`;
- o pegar recusa uma leva em Montando, com o motivo (`pegar.test.ts`, `estado.test.ts`): tirei a regra do `levaAceitaPegar`;
- `/api/leva/<n>` traz a fase (`index.test.ts`): tirei a linha que põe a fase.

## O que passou sem eu ter visto reprovar
- `/api/leva/<n>` sem a fase quando a consulta das levas falha (o teste passou de primeira).
- A consulta GraphQL nunca rodou contra o GitHub de verdade: os testes só conferem o texto dela, e o revisor a leu à mão.

## O que ficou de fora
- Nenhuma tela (F2, F3 e F4 da leva 2).
- `painel/worker/index.ts` não estava na lista da issue, mas o item 4 (as rotas) só se faz nele: entrou.
- O resumo (`/api/levas/resumo`) também ganhou a fase, pra a leva atual não sair diferente de `/api/levas`.
- Limites conhecidos: o Relatório olha só os 50 PRs abertos mexidos por último (100 arquivos cada); o resumo vê só as
  20 levas mais novas.

## O que depende de alguém
- **A Sofia**: revisar e mesclar. Não há migration. **Efeito ao publicar**: enquanto não houver `docs/relatorios/leva-1.md`
  na `main`, a atual é a leva 1 em todo lugar, e ninguém pega tarefa da leva 2 (Montando). É o que a issue pede.

## Como eu agi
- A skill me ajudou a seguir o "teste antes e quebrar de propósito".
- Onde adivinhei: o que é Montando (decidi que a leva sem nenhuma tarefa também fica em Montando), e manter o "anterior
  com tarefa aberta ainda aceita pegar", que agora só vale pra leva já aprovada.
- O que faltou na skill: ela fala de banco e de migration, mas a tarefa era do worker do painel (sem banco). Os passos
  `gerar-instalacao`, `test:sql` e `test:rls` não se aplicavam.
