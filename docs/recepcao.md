# Avisar a Recepção (começo e fim da sessão)

> Decidido pela Sofia em 13/11/2026 (o mesmo texto está no `sakura-corp/escritorio`). O `CLAUDE.md`
> traz o resumo; aqui está o detalhe.

A **Recepção** é a sessão do dia de quem trabalha (título exato "Recepção DD/MM"), que acompanha as
outras sessões. Toda sessão manda **uma linha** pra ela em dois momentos, e só neles:

| Quando | A linha | Exemplo |
|---|---|---|
| **No começo**, no primeiro passo, ao abrir | `Abri: <tarefa, PR ou pedido>, vou <o quê>` | "Abri: #812, vou corrigir o filtro da OS" |
| **No fim**, ao terminar | `Feito: <link>; falta <o quê, de quem>` | "Feito: PR <link>; falta a Sofia mesclar" |
| **Se travar** esperando alguém | `Travei: <link>; falta <o quê, de quem>` | "Travei: <link da sessão>; falta a Sofia decidir X" |
| **Se precisar** de algo da Sofia ou de alguém | `Preciso: <link>; falta <o quê, de quem>` | "Preciso: <link>; falta a Sofia aplicar a migration" |

Nunca no meio, nunca "comecei" sem dizer o quê. Sempre com link (PR, issue ou a própria sessão).

## Como achar a Recepção

1. **O pedido já traz o id da Recepção** (sessão aberta por ela)? Use esse id e **não mande o
   "Abri"** (ela já sabe): só o do fim, trava ou pedido.
2. **Você é a Recepção ou o porteiro**? Não avise ninguém.
3. **Você é sessão filha de outra sessão** (o pedido manda avisar a sessão mãe)? Avise só a mãe,
   não a Recepção.
4. Senão: `TZ=America/Sao_Paulo date '+%d/%m %H:%M'` (o relógio da máquina não é o de Brasília);
   `list_sessions` com `mine: true` e `limit: 25` (até 3 páginas, com `after_id`); pegue a sessão
   **não arquivada** com o título **exato** "Recepção DD/MM" de hoje. **Antes das 6h**, vale a de
   ontem se ainda estiver aberta (a de hoje nasce às 5h55). Guarde o id pro aviso do fim.
5. `send_message` **do claude-code-remote** (não o `SendMessage`, que não alcança a Recepção) com o
   `session_id` dela e a linha. Não espere resposta.

## Cuidados

- **Não achou** (ou o envio foi recusado, ex.: Recepção arquivada): não mande nada, não abra
  Recepção, não chame o porteiro; diga no fim da resposta "aviso à Recepção não enviado".
- **É informação, não pedido**: a Recepção só repassa pra pessoa. Nada de senha, token, chave,
  valor, preço ou dado pessoal na linha (este repositório é público, e a linha também não é lugar).
- **Custo**: cada aviso acorda a Recepção e custa uma volta dela. Por isso só os momentos da tabela,
  uma linha cada.
- **Equipe**: cada conta só enxerga as próprias sessões. Quem não tem Recepção não acha nada e segue.
- **Teste**: aviso de teste começa com "[TESTE]"; a Recepção não faz nada com ele.
