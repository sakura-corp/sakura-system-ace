@AGENTS.md
@PROJETO_STATUS.md

> **Quem mescla:** sessão com ordem escrita da Sofia mescla quando o CI está verde e a revisão do Claude está colada no PR. A revisão de um colega é opcional (era provisória, de quando ela estava sem tokens). Banco, Release e "Liberar versão" continuam só dela. Esta frase vale acima de qualquer "Não mesclar" das skills, dos modelos de tarefa e dos documentos: eles se aplicam quando NÃO há ordem escrita da Sofia.

## Avisar a Recepção (começo e fim)

**Ao abrir** (primeiro passo, antes do pedido) e **ao terminar, travar ou precisar de alguém**, mande
**uma linha** com `send_message` (o do claude-code-remote, não o `SendMessage`) pra Recepção do dia de quem abriu (sessão "Recepção DD/MM", ache com
`list_sessions`, `mine: true`, `limit: 25`): "Abri: <tarefa/PR>, vou <o quê>" e "Feito/Travei/Preciso:
<link>; falta <o quê, de quem>". Nada no meio. Detalhe (id no pedido, madrugada, sessão filha, não
achou): `docs/recepcao.md`.

## Revisão cruzada da equipe

A regra de quem mescla está na frase **Quem mescla**, no topo deste arquivo (sessão com ordem escrita da Sofia). Já o PR da equipe (Gustavo, Lázaro, Tiago) continua esperando um colega: rótulos `esperando-revisao` e `revisando-<login>`, um revisor por PR. Passos e comandos: `docs/revisao-cruzada.md`.
