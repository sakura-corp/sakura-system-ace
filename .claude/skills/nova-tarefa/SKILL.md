---
name: nova-tarefa
description: RASCUNHO (a Sofia ainda vai revisar). Escreve ou reescreve uma tarefa (issue) do Sakura System no modelo único de docs/tarefas.md — cabeçalho fixo (Chefe, Ajudantes, Estimativa, Depende de, Sessões filhas, e Second brain quando não precisa, e Prioridade quando a Sofia der a ordem), etapas com a categoria de modelo, Pronto quando em duas partes — e mostra o rascunho pra Sofia aprovar antes de criar ou editar. Use quando ela pedir "nova tarefa", "cria a issue", "reescreve a tarefa #N no modelo", "monta a leva N" ou /nova-tarefa.
model: opus
effort: medium
---

# Nova tarefa (ou reescrever uma) — Sakura System

Fale **sempre em português simples**. O formato, as etiquetas e a tabela de modelos estão em
`docs/tarefas.md`: leia antes. **Só a Sofia** cria ou edita tarefa por aqui (seção 0 do
`PROJETO_STATUS.md`); a equipe pode pedir um rascunho, mas quem aprova e cria é ela.

## 1. Juntar o que a tarefa precisa
1. Se for reescrever: ler a issue inteira e os comentários, e o que ela cita (`MELHORIAS.md`,
   `docs/visao.md`, `docs/modulos.md` do módulo).
2. Procurar no código (ajudante **rápido**, só lê) os arquivos que mudam, pra lista "Arquivos" ser
   de verdade, com caminho certo.
3. Separar **o que já está decidido** do que falta. **Cada decisão que falta vira uma issue
   `sofia` própria** (curta: a pergunta, as opções, a recomendação), e entra no `Depende de`.
4. Perguntar à Sofia: **"essa tarefa precisa do second brain?"** (o caderno de quem vai fazer, seção
   0 do `PROJETO_STATUS.md`). Recomendar "precisa" (o padrão, sem linha nenhuma); "não precisa"
   só pra tarefa pequena demais (trocar um texto, conferir um número, ajuste de uma linha).
   Várias tarefas de uma vez: uma pergunta só, com a recomendação de cada uma.

## 2. Escrever no modelo
- O cabeçalho com as **cinco linhas fixas**, nesta ordem, uma por linha. Se a Sofia disse que não
  precisa do second brain, uma sexta logo abaixo: `Second brain: não precisa` (com estas palavras).
- **`Prioridade: N`** (opcional, #776): só quando a Sofia disser a ordem das tarefas da leva. Vem
  por último no cabeçalho, no mesmo bloco; N inteiro de 1 a 999, 1 é a mais importante. Nunca inventar a
  ordem: sem a ordem dela, sem a linha. Escrita errada não tranca nada (o painel ignora), mas confira.
- **Um chefe só** (o da maior parte do trabalho); os outros em `Ajudantes`, cada um com o porquê.
- **Etapas e modelos**: cada etapa com quem faz e a **categoria** (forte, médio, rápido), nunca o
  nome do modelo. Migration, RLS, dinheiro, nota fiscal, segurança e revisão final: **forte**.
- `Sessões filhas: sim` só com partes independentes, e cada filha com **arquivos que não se cruzam**.
- **Pronto quando** em três partes: o que a sessão prova no PR; o que **quem fez testa no próprio
  PC** antes do PR (passo a passo, no Supabase de teste); e o mínimo que só a Sofia confere depois
  de publicar, no dia de teste do fim de semana (impressora, nota de verdade, `.exe`), em passos
  exatos. Tudo que dá pra testar no PC de quem fez sai da parte dela.
- **Estimativa** em horas.
- Nada de rodapé com o ritual colado: só a última linha do modelo, que aponta a skill.
- **Nada privado** (repositório público).

## 3. Mostrar antes de criar
Mostrar o rascunho à Sofia (várias de uma vez: numa página privada ou num arquivo no PR), com as
etiquetas que vai pôr (`leva-N`, `chefe:<função>`). **Só depois do "pode criar"**: criar ou editar
a issue, pôr as etiquetas e, ao reescrever, **tirar a `guia`** e escrever um comentário curto
"reescrita no modelo de `docs/tarefas.md` em <data>".

## 4. Conferir
- O cabeçalho lê certo (as cinco linhas, com os nomes exatos; a sexta, se houver, é exatamente
  `Second brain: não precisa`; a `Prioridade`, se houver, é um número inteiro de 1 a 999).
- Cada número de `Depende de` existe.
- A etiqueta `chefe:` bate com a linha `Chefe:`.
