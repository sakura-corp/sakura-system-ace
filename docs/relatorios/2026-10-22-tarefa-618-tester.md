# Relatório: tarefa #618, chefe tester

- **Tarefa**: #618, montar o segundo-cerebro do Gustavo
- **Chefe**: tester
- **Data**: 2026-10-22
- **PR**: o desta branch (`claude/great-ptolemy-x2yikw`)
- **Jeito**: sessão direta

## O que cada agente fez
- sessão mãe: tudo (guiar o roteiro, a entrevista, gravar o caderno, o teste da ida e volta, abrir
  as issues de defeito). Nenhum ajudante: ajudante não abre caderno.

## Modelos usados
- Guiar o roteiro e gravar o caderno: forte, como pede a issue. Sem troca por falha.

## Sessões filhas
- nenhuma (a sessão nova do passo 11 é a prova, não uma filha).

## Gasto
- **Uso da sessão mãe**: 43 respostas; entrada 88, cache criado 76.700, cache lido 4.709.598, saída 20.102 tokens (via arquivo), medido antes de abrir o PR (o PR e o fim do relatório ficam de fora).
- **Ajudantes / sessões filhas**: nenhum.
- **`/goal`**: não usei (roteiro guiado, com o Gustavo confirmando cada passo).

## O que mudou
- Só este relatório. O caderno (`GustavoSakuras/segundo-cerebro`) foi gravado direto lá, sem PR,
  como manda o passo 4 do roteiro; nada do conteúdo dele vai aqui.

## Pronto quando (checklist)
- ✅ **O repositório existe e é privado**: a API do GitHub devolveu `private: true` para
  `GustavoSakuras/segundo-cerebro`.
- ✅ **O `CLAUDE.md` tem até ~3 KB e ele disse "confere"**: `wc -c CLAUDE.md` = `1753`. O
  "confere" veio antes de gravar.
- ✅ **A ida e a volta**: o Claude gravou `Nota de teste do Claude.md`; o `Git: Pull` trouxe a
  nota pro Obsidian (print dele); ele apagou e o `Git: Commit-and-sync` mandou. No GitHub, o commit
  `vault backup` (autor: o Gustavo, com o e-mail de fachada) apaga a nota. A pasta `.obsidian/` não
  subiu. Mas o mesmo envio levou junto o `CLAUDE.md` e o `.gitignore` com fim de linha CRLF (ver
  passo 6 abaixo, #710); a sessão converteu de volta pra LF e o `Git: Pull` seguinte trouxe
  "Pulled 2 files from remote", sem erro.
- ✅ (com ressalva) **Uma sessão nova disse que abriu o caderno**: perguntada "você abriu o meu
  caderno?", respondeu **"Ainda não tinha aberto ... Agora está aberto e lido"** e listou o jeito
  dele certo (português simples e curto, um passo por vez, menos pergunta, Windows e celular). O
  acesso funciona, mas **ela não abriu sozinha no começo**, como a seção 0 do `PROJETO_STATUS.md`
  manda: só abriu quando ele perguntou (e uma leitura das instruções deu "Falhou" antes de dar
  certo). Com o Tiago (#620), a sessão disse que já tinha aberto. Não abri issue: a pergunta foi
  a primeira mensagem da sessão, então não dá pra saber se ela teria aberto antes de começar uma
  tarefa de verdade. Fica o aviso pra Sofia.
- ✅ **O relatório no PR**, sem nada do conteúdo do caderno, com os passos diferentes abaixo.

## Os passos que estavam diferentes na tela (pra Sofia ajustar o roteiro em `docs/equipe.md`)
1. **Passo 2 (`add_repo`)**: **não apareceu pedido de permissão nenhum**; a sessão recebeu direto
   "not found ... or this session's GitHub credential doesn't have access". Deu certo depois do
   caminho "Se for recusado" (instalar o app do Claude na conta dele, só no `segundo-cerebro`).
   Provável causa: conta do GitHub nova, sem o app instalado. Issue **#711**.
2. **Passo 6, `git clone` deu `remote: Repository not found` / `fatal: ... not found`**, sem abrir
   janela de login. O PC tinha outra credencial do GitHub guardada (ou nenhuma que valesse), e pra
   outra conta um repositório privado parece não existir. **Conserto que funcionou na hora**:
   `git clone https://<usuário>@github.com/<usuário>/segundo-cerebro.git` (o usuário no endereço
   força o login certo). Issue **#711**.
3. **Passo 6, o `core.autocrlf false` depois do clone não evita o CRLF**: o Git do Windows já troca
   o fim de linha na hora do clone; desligar depois faz o Git ver os arquivos como mudados, e o
   primeiro `Git: Commit-and-sync` mandou `CLAUDE.md` e `.gitignore` inteiros em CRLF ("Committed
   para 3 arquivos" em vez de 1). Conferido: `git diff -w --ignore-cr-at-eol` só mostrava a nota
   apagada. **Conserto proposto**: `git clone -c core.autocrlf=false ...`. Issue **#710**.
4. **Passo 6, o e-mail de fachada**: a sessão montou o endereço (`<id>+<usuário>@users.noreply...`)
   a partir do id da conta (`get_me`), sem a pessoa abrir a página de e-mails. Funcionou (o commit
   do passo 10 saiu com ele). Sugestão: o roteiro pode dizer que o Claude monta esse endereço.
5. **Passo 10, o print do Obsidian confundiu**: ele mandou o print com a nota já na coluna da
   esquerda e "não entendi". A nota chegou (a ida funcionou), mas o aviso "Pulled 1 file" já tinha
   sumido. Apareceu também um arquivo **"Sem título" (BASE)**, criado sem querer pelo botão "Nova
   base" da tela vazia; foi apagado junto com a nota. Sugestão: no passo 10, "se a nota já está na
   coluna da esquerda, a ida funcionou" e "não clique nos botões do meio da tela".
6. **Passos 5, 7, 8 e 9**: iguais ao roteiro.

## O que testei e VI reprovar
- O `git clone` reprovou (`Repository not found`) e passou com o usuário no endereço.
- A ida e a volta "passou" mas com efeito errado (os 3 arquivos em CRLF); vi pelo `git log --stat`
  e pelo `file` (CRLF), consertei e vi o `Git: Pull` seguinte passar limpo.
- O `add_repo` reprovou e passou depois de instalar o app.

## O que passou sem eu ter visto reprovar
- A sessão nova ler o caderno certo: só vi passar (e com a ressalva de não ter aberto sozinha).

## O que ficou de fora
- Nada da tarefa. O `docs/equipe.md` não foi mexido (o conserto do roteiro é da Sofia: #710, #711).
- Não rodei `typecheck`/`lint`/`test:fusos`/`contraste`: o PR só traz este relatório, nenhum código.

## O que depende de alguém
- **Sofia**: revisar este PR e decidir os ajustes do roteiro (#710, #711, e os itens 4 e 5 acima);
  e ver se a sessão nova não abrir o caderno sozinha (checklist acima) pede ajuste na seção 0.
- **Gustavo**: na próxima tarefa, conferir que a sessão abre o caderno no começo; se não abrir,
  pedir "abre o meu caderno".

## Defeitos abertos
- https://github.com/sakura-corp/sakura-system-ace/issues/710
- https://github.com/sakura-corp/sakura-system-ace/issues/711

## Onde parou
Terminei. Falta a revisão da Sofia.

## Como eu agi
- **O que a skill me ajudou a fazer**: pouco; a tarefa é um roteiro guiado, não teste de código. O
  que ajudou foi o roteiro do `docs/equipe.md` e o relatório da #620 (os tropeços do Tiago).
- **Onde eu errei ou tive que adivinhar**: no passo 6 ele disse "feito" no clone que tinha falhado, e
  eu passei os três comandos seguintes; o erro só apareceu no print da resposta seguinte. Melhor
  pedir o print (ou a última linha) do clone, não só o "feito". A entrevista teve uma rodada só: ele aceitou todas
  as recomendações ("apenas trabalhe"), então "Windows" entrou por recomendação e foi confirmado
  pelos prints, não por pergunta direta.
- **O que faltou na skill**: a `chefe-tester` não fala de tarefa que é roteiro com a pessoa (sem
  código): as regras de "quebrar de propósito" e os comandos do fim não se aplicam, e isso podia
  estar dito.
- **Sugestão de ajuste (opcional)**: na `chefe-tester`, uma linha: "tarefa de roteiro guiado (ex.:
  caderno): o 'vi reprovar' é o passo que falhou na tela e passou depois do conserto; sem código,
  os comandos do fim não rodam".
