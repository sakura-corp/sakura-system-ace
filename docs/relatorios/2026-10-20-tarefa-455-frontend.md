# Relatório: tarefa #455, chefe frontend

- **Tarefa**: #455, Clientes que sumiram, com a mensagem de volta pronta (FN-11)
- **Chefe**: frontend
- **Data**: 2026-10-20
- **PR**: (preenchido no PR)
- **Jeito**: aberta pela /coordenar

## O que cada agente fez
- Explorador (`ajudante-rapido`): mapeou os botões de WhatsApp e o registro de abertura, a regra de "ver valores", as buscas de OS e os tipos.
- Backend (`ajudante-forte`): escreveu `src/schemas/clientesSumidos.ts` com 22 testes, cada etapa vista reprovar antes, e 8 quebras de propósito.
- Sessão mãe: modelo `cliente_sumido`, busca em `src/lib/clientesSumidos.ts`, tela, teste de tela, fotos e conferências.
- Revisor (`ajudante-forte`): revisão final do diff do zero (resultado em "O que testei").

## Modelos usados
- Planejar, tela e WhatsApp: sessão mãe (forte), esforço do padrão da sessão.
- Explorar: rápido (agente pronto `ajudante-rapido`), esforço do agente.
- Conta (dinheiro): forte (`ajudante-forte`), esforço alto.
- Conferir o "Pronto quando": feito pela mãe (não chamei tester à parte: os testes e as varreduras já eram a conferência, e cada um foi visto reprovar).
- Revisão final: forte (`ajudante-forte`), esforço alto.
- Nenhuma troca por falha de modelo.

## Sessões filhas
- nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe**: ver o fim deste arquivo (medido pelo arquivo, antes do PR).
- **Ajudantes**: 3. Explorador ~92 mil (aviso); conta ~99 mil (aviso); revisor (aviso, ver abaixo).
- **Sessões filhas**: nenhuma.
- **`/goal`**: ligado nesta sessão no meio do trabalho (chegou como comando, antes do PR). Como parou: não sei ao escrever (a coordenadora confere).

## O que testei e VI reprovar
- **A conta** (`clientesSumidos.test.ts`, 22 testes): reprovaram com a função vazia, em três etapas. E pegaram as quebras: contar a "concluída"; `.slice(0, 10)` no lugar de `diaLocal` (o teste de 22h30 de 30/04 em Brasília); `<=` no lugar de `<` no corte dos 6 meses; soma sem `somar` (150,10 + 0,20); `subtrairMeses` sem prender no fim do mês (31/08 → 28/02 e 29/02 bissexto); empate sem desempate; cliente que nunca veio aparecendo. Uma quebra (última ordem comparada só pelo dia) **não** reprovou na primeira vez; o teste foi corrigido e aí reprovou.
- **O modelo de WhatsApp** (`whatsapp.test.ts`): reprovou com "Modelo de WhatsApp desconhecido" antes de o modelo existir.
- **A tela** (`ClientesPage.test.tsx`, 6 testes): os 6 reprovaram antes do filtro existir. Quebras: total sempre visível → reprova "o total gasto some pra quem não pode ver valores"; `{veiculo}` fixo → reprovam os 2 testes da mensagem.

## O que passou sem eu ter visto reprovar
- O teste "quem tem Relações vê o total" (ele só passou; o oposto foi o que vi reprovar).
- `typecheck`, `lint` (1 aviso antigo, em `AuthContext.tsx`), `contraste`, `test:fusos` (892 nos dois fusos), `contraste:telas` e `largura:telas` (62 telas, 5 larguras): verdes.
- As varreduras de tela rodaram com uma **cena temporária** do filtro ligado e dados de exemplo mudados (duas OS antigas faturadas), **sem commit**: a cena não está no PR (`site/ferramentas/` não está na lista da issue).

## O que ficou de fora
- **Cena do filtro no catálogo e nas varreduras** (`site/ferramentas/cenas.mjs` e `dados-demo.mjs`): fora da lista de arquivos; sem ela, as próximas varreduras não olham o filtro ligado. Pergunta pra Sofia no PR.
- **Quem tem OS aberta agora**: só conta ordem faturada (a issue diz isso), então um cliente com o carro no pátio hoje, mas sem nada faturado há 6 meses, aparece como sumido.
- **Ordenar por total pra quem não vê valores**: a lista continua na ordem de quem mais gastou (a ordem não mostra o valor).

## O que depende de alguém
- **A Sofia, depois de publicar**: na loja, conferir que os clientes do filtro e os totais batem com as OS de um cliente conhecido.
- **Teste no PC** (`docs/equipe.md`, "Testar no seu computador o que a sessão da nuvem fez"), caso B (abrir o programa), branch `claude/tarefa-455-clientes-sumidos`: em Clientes, marcar "Só os clientes que sumiram", mudar os meses, clicar "Chamar" num cliente e ver o WhatsApp abrir com o texto; voltar e ver "chamado em".

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a lista de conferências do fim, e o "olhar a tela renderizada" pegou o botão passando da borda em 1024 (o `largura:telas` não reprovou porque a tabela rola dentro do cartão).
- **Onde eu errei ou tive que adivinhar**: não existe permissão "ver valores"; usei a lista que decide o dinheiro no Início (`MODULOS_QUE_LEEM_O_CAIXA`: Caixa ou Relações). "Última visita" = dia do faturamento. Quem nunca veio não aparece.
- **O que faltou na skill**: dizer o que fazer quando a varredura de tela precisa de uma cena nova e `site/ferramentas/` não está na lista de arquivos da issue.
- **Sugestão de ajuste (opcional)**: na `nova-tarefa`, quando a tarefa cria um estado novo de tela, pôr `site/ferramentas/cenas.mjs` (e os dados de exemplo) na lista de arquivos.
