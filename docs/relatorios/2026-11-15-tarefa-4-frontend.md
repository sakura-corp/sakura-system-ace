# Relatório: tarefa 4 do visual novo (#990), chefe frontend

- **Tarefa**: #990, tarefa 4, a tela-piloto: o Início
- **Chefe**: frontend
- **Data**: 2026-11-15
- **PR**: rascunho contra a `main` (link na descrição da tarefa)
- **Jeito**: sessão filha da coordenadora, com ajudantes

## O que cada agente fez
- ajudante forte (1): a conta da série por dia (`schemas/serieDoMes.ts`) e o teste, teste-primeiro, com mutação.
- ajudante forte (2): revisão adversarial do diff do zero. Achou 4 pontos; 3 foram corrigidos ("Tudo em dia" com módulos parciais, filtro do mês uma vez só, contador de OS lido pelo leitor de tela) e o alinhamento do "e mais N".
- `/code-review` (medio): 8 apontamentos, nenhum defeito de número ou de regra; ficam como sugestões (abaixo).

## Modelos usados
- série por dia e revisão final: forte; telas, testes e fotos: a sessão.

## Sessões filhas
- nenhuma.

## O que testei e VI reprovar
- Série por dia: UTC no lugar de `diaLocal`, sem filtro de mês, sem o `null` do mês vazio, mínimo de dias 2, `<` no lugar de `<=`, ordem invertida: cada uma reprovou o teste certo (relato do ajudante).
- Cartão sem fio: troquei a guarda por "sempre desenha" e o teste reprovou.
- Central: total contando só as linhas à vista, altura de 3 linhas, e "Tudo em dia" com módulos parciais: reprovaram.

## O que passou sem eu ter visto reprovar
- `typecheck`, `lint`, `test` (2194), `test:fusos`, `contraste`, `contraste:telas` (claro e escuro), `largura:telas` (aberto e encolhido).
- A regra de custo uma vez por OS e ticket por OS vem do `resumirMovimentos`, que só reaproveitei.

## O que ficou de fora
- Selo "Em andamento" em "OS abertas" (repete a palavra em toda linha): ponto pra Sofia decidir.
- Animações (tarefa 5), logo e Login (tarefa 6).
- Não abri o programa no Electron/Windows: tudo foi conferido no navegador com o banco de mentira.

## O que depende de alguém
- A Sofia: olhar o Início e dizer se segue pras outras telas. No PC (docs/equipe.md, caso B): clicar cada botão da Central e ver que abre o lugar certo; com um login sem Contas a Pagar, o cartão mostra "—".

## Como eu agi
- A skill ajudou no roteiro e nos limites. Errei: o `data-capa` de foto e o teste de altura precisaram de ajuste; uma varredura de largura longa bloqueou a porta das fotos por vários minutos. Falta na skill: dizer que as varreduras usam a mesma porta (5199) e não rodam juntas.
