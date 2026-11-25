# Relatório: tarefa #1033, chefe backend (segunda rodada: renumerar e juntar a main)

- **Tarefa**: #1033, WhatsApp, horário e garantia dos serviços no recibo da nota
- **Chefe**: backend
- **Data**: 2026-11-25
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/1174 (o mesmo da primeira rodada, `2026-11-23-tarefa-1033-backend.md`)
- **Jeito**: sessão direta

## O que cada agente fez
- nenhum. A tarefa já tinha o PR pronto. Faltava o que a Sofia pediu nos comentários de 23, 24 e 25/11:
  trazer a `main` (v0.9.61, migrations até a 0092) e renumerar a migration de 0088 pra **0094**.
  Era trabalho mecânico, e chamar ajudante custaria mais do que fazer direto.

## Modelos usados
- tudo na sessão mãe: forte, esforço baixo (renumerar e resolver conflito, sem código novo)

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (a sessão não tem acesso ao próprio contador)
- **Ajudantes**: nenhum
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei

## O que testei e VI reprovar
- Trava do WhatsApp na 0094: troquei `^[0-9]{10,13}$` por `^[0-9a-z]{1,13}$` e o
  `testar-atendimento-da-loja.sql` reprovou ("FALHOU 8: a trava deixou passar whatsapp = 1695550019a").
  Depois voltei a trava, gerei a instalação de novo e o teste passou.
- O teste "sem buraco na numeração" (`scripts/atualizar-bancos.test.ts`) reprova agora: esperava 93 e
  achou 94. **Isso era esperado**: a 0093 (#1171) ainda não está na `main`, e o aviso da Sofia no PR já
  dizia que seria assim. Passa sozinho quando a #1171 entrar.

## O que passou sem eu ter visto reprovar
- `typecheck`; `lint` (0 erros, 3 avisos que já existiam); `vitest` (3.519 de 3.520, só o da numeração
  falhou); `test:fusos` (só o mesmo teste da numeração, nos dois fusos); `test:sql` (37 testes de
  migration, num Postgres descartável dentro da sessão, nunca no Supabase); `test:rls` (1.120 células,
  56 tabelas e views).
- Não rodei de novo `contraste`, `contraste:telas` nem `largura:telas`: nenhuma tela mudou nesta rodada.
  Na primeira rodada eles passaram.

## O que ficou de fora
- Nada da tarefa. As perguntas da primeira rodada continuam abertas (o modelo do PR #1030).

## O que depende de alguém
- **Sofia**: aplicar a **0094** no `ssace-teste` **depois da 0093** (#1185), pelo "Atualizar o banco de
  todas as empresas" (ensaiar, depois aplicar). Não tem `versao-minima-do-programa`: sobe **antes** da
  versão. A 0094 não usa nada das migrations 0088 a 0093.
- **Mesclar na ordem**: a #1171 (0093) antes deste PR, senão o teste da numeração fica vermelho na `main`.
- **Tiago, no PC**: os 4 itens "No PC de quem fez" da issue, depois que a Sofia aplicar a 0094.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a lista da migration (número, `schema_versao`,
  `VERSAO_ESQUEMA_ESPERADA`, `gerar-instalacao`, teste visto reprovar) virou o checklist da renumeração.
- **Onde eu errei ou tive que adivinhar**: o pedido mandava "terminar com PR aberto", mas o PR já existia.
  Segui os comentários da Sofia no PR em vez de abrir um PR novo repetido.
- **O que faltou na skill**: não diz o que fazer quando a tarefa já tem PR aberto (retomar ou abrir outro).
- **Sugestão de ajuste (opcional)**: no passo 2 da skill, "conferir se a issue já tem PR aberto; se tem,
  retomar ele e ler os comentários".
