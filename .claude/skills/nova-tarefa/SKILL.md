---
name: nova-tarefa
description: RASCUNHO (a Sofia ainda vai revisar). Escreve ou reescreve uma tarefa (issue) do Sakura System no modelo único de docs/tarefas.md — cabeçalho fixo (Chefe, Ajudantes, Estimativa, Depende de, Sessões filhas), etapas com a categoria de modelo, Pronto quando em duas partes — e mostra o rascunho pra Sofia aprovar antes de criar ou editar. Use quando ela pedir "nova tarefa", "cria a issue", "reescreve a tarefa #N no modelo", "monta a leva N" ou /nova-tarefa.
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

## 2. Escrever no modelo
- O cabeçalho com as **cinco linhas fixas**, nesta ordem, uma por linha.
- **Um chefe só** (o da maior parte do trabalho); os outros em `Ajudantes`, cada um com o porquê.
- **Etapas e modelos**: cada etapa com quem faz e a **categoria** (forte, médio, rápido), nunca o
  nome do modelo. Migration, RLS, dinheiro, nota fiscal, segurança e revisão final: **forte**.
- `Sessões filhas: sim` só com partes independentes, e cada filha com **arquivos que não se cruzam**.
- **Pronto quando** em duas partes: o que a sessão prova no PR, e o que só a Sofia confere depois
  de publicar.
- **Estimativa** em horas.
- Nada de rodapé com o ritual colado: só a última linha do modelo, que aponta a skill.
- **Nada privado** (repositório público).

## 3. Mostrar antes de criar
Mostrar o rascunho à Sofia (várias de uma vez: numa página privada ou num arquivo no PR), com as
etiquetas que vai pôr (`leva-N`, `chefe:<função>`). **Só depois do "pode criar"**: criar ou editar
a issue, pôr as etiquetas e, ao reescrever, **tirar a `guia`** e escrever um comentário curto
"reescrita no modelo de `docs/tarefas.md` em <data>".

## 4. Conferir
- O cabeçalho lê certo (as cinco linhas, com os nomes exatos).
- Cada número de `Depende de` existe.
- A etiqueta `chefe:` bate com a linha `Chefe:`.
