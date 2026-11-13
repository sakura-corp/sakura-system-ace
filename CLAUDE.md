@AGENTS.md
@PROJETO_STATUS.md

## Avisar a Recepção (começo e fim)

**Ao abrir** (primeiro passo, antes do pedido) e **ao terminar, travar ou precisar de alguém**, mande
**uma linha** com `send_message` (o do claude-code-remote, não o `SendMessage`) pra Recepção do dia de quem abriu (sessão "Recepção DD/MM", ache com
`list_sessions`, `mine: true`, `limit: 25`): "Abri: <tarefa/PR>, vou <o quê>" e "Feito/Travei/Preciso:
<link>; falta <o quê, de quem>". Nada no meio. Detalhe (id no pedido, madrugada, sessão filha, não
achou): `docs/recepcao.md`.
