# Relatório: tarefa #620, chefe tester

- **Tarefa**: #620, montar o segundo-cerebro do Tiago
- **Chefe**: tester
- **Data**: 2026-10-19
- **PR**: o desta branch (`claude/peaceful-knuth-2izteh`)

## O que cada agente fez
- sessão mãe: tudo (guiar o roteiro, a entrevista, gravar o caderno, o teste da ida e volta).
  Nenhum ajudante: ajudante não abre caderno.

## Modelos usados
- Forte, como pede a issue. Sem troca por falha (o Tiago trocou de modelo e voltou no meio, sem efeito).

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (sem canal documentado).
- **Ajudantes / sessões filhas**: nenhum.
- **`/goal`**: não usei (roteiro guiado, com o Tiago confirmando cada passo).

## O que mudou
- Só este relatório. O caderno (`tigasss1/segundo-cerebro`) foi gravado direto lá, sem PR, como
  manda o passo 4 do roteiro; nada do conteúdo dele vai aqui.

## Pronto quando (provas)
- [x] **O repositório existe e é privado**: a API do GitHub devolveu `"private": true` para
  `tigasss1/segundo-cerebro`.
- [x] **O `CLAUDE.md` tem até ~3 KB e ele disse "confere"**: `wc -c CLAUDE.md` = `1419`. O "confere"
  veio antes de gravar.
- [x] **A ida e a volta**: o Claude gravou `teste-do-claude.md`; o `Git: Pull` trouxe a nota pro
  Obsidian; o Tiago apagou a nota e o `Git: Commit-and-sync` mandou. No GitHub, o commit
  `vault backup` (autor Tiago Imperatori) apaga a nota. A pasta `.obsidian/` não subiu.
- [x] **Uma sessão nova disse que abriu o caderno**: respondeu que abriu `tigasss1/segundo-cerebro`
  e listou o jeito dele (respostas curtas, um passo por vez, comandos explicados).

## Os passos que estavam diferentes na tela (pra Sofia ajustar o roteiro em `docs/equipe.md`)
1. **Passo 2 (`add_repo`)**: a primeira tentativa foi feita antes de o repositório existir, porque o
   Tiago já tinha instalado o Obsidian e pediu o roteiro inteiro. Ele recusou o pedido de permissão
   que apareceu. Depois do passo 1 deu certo de primeira, sem clique no GitHub. Sugestão: dizer no
   passo 2 que vai aparecer um pedido de permissão na tela e que é pra aprovar.
2. **Passo 6, `gh: command not found`**: o computador dele não tinha a GitHub CLI (o primeiro dia
   não tinha instalado). **Conserto**: `git clone https://github.com/<usuário>/segundo-cerebro.git`,
   que funciona só com o Git. Sugestão: usar o `git clone` no roteiro, que não depende do `gh`.
3. **Passo 10, o primeiro `Git: Commit-and-sync` deu `Author identity unknown`** (`unable to
   auto-detect email address`): o Git não tinha nome nem e-mail configurados. **Conserto**, dentro
   da pasta do caderno: `git config user.name "<nome>"` e `git config user.email
   "<id>+<usuário>@users.noreply.github.com"` (sem `--global`). Usar já o e-mail de fachada evita
   também o `push declined due to email privacy restrictions`. Sugestão: pôr essas duas linhas no
   passo 6, junto do `core.autocrlf`, pra não depender do primeiro dia.
4. **Passo 7**: com outro cofre já aberto, a tela de "Abrir pasta como um cofre" fica em ícone de
   cofre (canto de baixo à esquerda) → **Gerenciar cofres**. O roteiro só descreve a tela de quem
   abre o Obsidian pela primeira vez.
5. **Passo 8**: o plugin Git é por cofre. Quem instalou antes, num outro cofre, precisa instalar de
   novo dentro do `segundo-cerebro`. Sugestão: uma linha avisando, e manter a ordem do roteiro
   (abrir o cofre antes de instalar o plugin).
6. **Ordem**: o Tiago instalou o Obsidian e o plugin antes de começar a sessão. Não atrapalhou,
   só fez o passo 8 ser repetido.

## O que testei e VI reprovar
- A ida e a volta reprovou de verdade uma vez (o `Author identity unknown`) e passou depois do
  conserto, conferido no histórico do GitHub.

## O que passou sem eu ter visto reprovar
- A sessão nova abrir o caderno: só vi passar.

## O que ficou de fora
- Nada da tarefa. O `docs/equipe.md` não foi mexido (o conserto do roteiro é da Sofia).

## O que depende de alguém
- **Sofia**: revisar este PR e decidir os ajustes do roteiro acima.
- **Tiago**: instalar a GitHub CLI, se as próximas tarefas precisarem dela (o primeiro dia pede).

## Onde parou
Tarefa feita. Falta a revisão da Sofia.

## Como eu agi
- **O que a skill me ajudou a fazer**: o roteiro do `docs/equipe.md` tinha os tropeços conhecidos
  (`^[[200~`, `core.autocrlf`, e-mail de fachada), o que adiantou os consertos.
- **Onde eu errei ou tive que adivinhar**: tentei o `add_repo` antes de o repositório existir.
- **O que faltou na skill**: o roteiro supõe o primeiro dia completo (`gh` e identidade do Git).
- **Sugestão de ajuste (opcional)**: os itens 2 e 3 acima.
