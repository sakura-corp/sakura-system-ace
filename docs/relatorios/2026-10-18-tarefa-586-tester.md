# Relatório: tarefa #586, chefe tester

- **Tarefa**: #586, as skills entrevista, teste-primeiro e diagnostico disparam sozinhas na hora certa
- **Chefe**: tester
- **Data**: 2026-10-18
- **PR**: aberto a partir da branch `claude/tarefa-586-skills-sozinhas` (o link está na mensagem à coordenadora)

## O que cada agente fez
- Sessão mãe: leu a issue, escreveu as três `description` e as linhas S13 a S15, montou as listas do ensaio, aplicou 3 dos 4 achados da revisão e abriu a #587 pro quarto.
- Ajudante rápido (3 chamadas): o ensaio de disparo. Leu só a lista das skills (nome + descrição) e escolheu a skill de cada um dos 5 pedidos: `e1` (descrições novas, 1ª versão), `e2` (as antigas) e `e3` (as novas, versão final).
- Ajudante forte (revisão final): leu o diff e o corpo das três skills e achou 4 pontos (abaixo).

## Modelos usados
- Ler e planejar, escrever as descrições: forte (sessão mãe), esforço médio
- Ensaio de disparo: rápido (`claude-haiku-5-5`), esforço baixo, 3 vezes
- Revisão final: forte (`claude-opus-5-5`), esforço alto
- Nenhuma troca por falha de modelo.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (arquivo, medido depois do 3º ensaio, antes do relatório e do PR): 17 respostas; entrada 34, cache criado 89.766, cache lido 1.866.369, saída 13.411.
- **Ajudantes** (arquivo): revisão forte, 6 respostas, cache criado 85.317, cache lido 377.057, saída 41; ensaios rápidos, 2 respostas cada, cache criado perto de 63 a 67 mil, cache lido perto de 56 a 60 mil, saída 173 a 246. Pelo aviso: revisão 88.242; ensaios 67.737, 67.830 e 63.878.
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei. O texto foi mandado à coordenadora na mensagem de "começou", mas não chegou colado nesta sessão até o PR; a tarefa andou do jeito de antes.

## Checklist do "Pronto quando" (no PR)
- ✅ **As três `description` dizem a situação de uso e a de não uso, e passam no `yaml.safe_load`**: conferido com Python (entrevista 834 caracteres, teste-primeiro 781, diagnostico 732; todas abaixo de 1024). Começam com "RASCUNHO" e mantêm o `/nome` e os pedidos de antes.
- ✅ **Ensaio**: os 5 pedidos, sem nome de skill, foram:
  1. "Estou pensando em o sistema mandar um lembrete pro cliente quando chegar a hora de trocar o óleo. O que acha?" (ideia aberta)
  2. "Cria a função que calcula o desconto do cartão de fidelidade: 5% a cada 10 compras, no máximo 20%." (código novo)
  3. "O total do caixa às vezes sai diferente da soma das vendas do dia e não sei por quê." (defeito sem causa)
  4. "O botão Excluir da tela de clientes está muito colado no Salvar; afasta um pouco." (ajuste pequeno)
  5. "Na tela de produtos está escrito 'Preço de vneda'; corrige pra 'Preço de venda'." (mudança de texto)

  | Lista | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | `e1`, novas (1ª versão) | entrevista | teste-primeiro | diagnostico | nenhuma | nenhuma |
  | `e3`, novas (versão final) | entrevista | teste-primeiro | diagnostico | nenhuma | nenhuma |
  | `e2`, antigas | nenhuma | nenhuma | nenhuma | nenhuma | nenhuma |

  Com as antigas, o ajudante citou o "Use SÓ quando a pessoa digitar /…" pra recusar as três primeiras.
- ✅ **`typecheck` e `lint`**: `npm run typecheck` sem erro; `npm run lint` com 0 erros e 1 aviso que já existia (`src/contexts/AuthContext.tsx`, fora desta tarefa). O CI fica na descrição do PR.

## O que testei e VI reprovar
- O ensaio de disparo: a "cópia quebrada" é a lista com as três descrições antigas (`e2`). Nela o ajudante não escolheu skill nenhuma nos pedidos 1 a 3; com as novas, escolheu a certa. Então o disparo vem do texto novo.

## O que passou sem eu ter visto reprovar
- Os pedidos 4 e 5 ("nenhuma"): deram "nenhuma" com as antigas e com as novas, então o ensaio não prova que as exclusões novas seguram; só que as novas não passaram a disparar demais nesses dois casos.
- O `yaml.safe_load`: não quebrei o cabeçalho de propósito.

## O que ficou de fora
- O achado 3 da revisão virou a **#587**: o corpo da `teste-primeiro` (seção 1) manda combinar as "costuras" com a pessoa antes de testar; agora que ela dispara sozinha, num bug pequeno a sessão vai parar pra perguntar sobre portas a quem não programa. O corpo estava fora da lista de arquivos.
- Os achados 1, 2 e 4 foram aplicados: a entrevista não diz mais que pedido fechado é "pra fazer na hora" (só defeito e ajuste pequeno, como no índice); não dispara quando ela só pede pra guardar a ideia (isso é a `ideia`); a linha S13 cita "pedido já fechado".

## O que depende de alguém
- **A Sofia, depois de publicar**: numa tarefa de código, ver se a sessão usa a `teste-primeiro` sem ninguém pedir. Não precisa de PC nem de roteiro: é ler a conversa de uma tarefa de código e procurar a skill sendo carregada.
- **A Sofia**: decidir a #587.

## Defeitos abertos
- #587

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o "como ensaiar" da seção 3 deu o ensaio pronto (rápido, que não lê a memória; duas cópias; visto reprovar).
- **Onde eu errei ou tive que adivinhar**: mexi na descrição da entrevista depois do ensaio (achados da revisão) e tive que ensaiar de novo (`e3`). Revisão antes do ensaio teria poupado uma rodada.
- **O que faltou na skill**: o ajudante rápido vê a lista de skills **da própria sessão** (que, na branch, já traz as descrições novas). Um deles comentou isso no ensaio das antigas e respondeu pelo arquivo mesmo assim; no `e3` pedi "ignore qualquer outra lista". Num ensaio de descrição, a lista da sessão pode contaminar o resultado; o que salva é a cópia antiga dar diferente.
- **Sugestão de ajuste (opcional)**: no "como ensaiar" do `chefe-tester`, somar: "ensaio de **descrição** de skill: o pedido manda ignorar a lista de skills da própria sessão, e a revisão vem antes do ensaio".
