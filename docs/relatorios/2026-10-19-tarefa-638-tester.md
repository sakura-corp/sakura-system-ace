# Relatório: tarefa #638, chefe tester

- **Tarefa**: #638, manual da equipe: testar no PC o que a sessão da nuvem fez (e quando usar o Send)
- **Chefe**: tester
- **Data**: 2026-10-19
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/639
- **Jeito**: aberta pela /coordenar

## O que cada agente fez
- Sessão mãe: leu a issue, o comentário da Sofia na #511 (versão provisória do caso A) e o manual;
  escreveu a seção nova, a linha do Send no "Primeiro dia" e as linhas dos dois chefes; aplicou a
  revisão; rodou as conferências e o ensaio.
- Ajudante forte (revisão final, esforço alto): achou 4 pontos de segurança do Send e 7 de Windows/Mac
  e coerência. Conferi cada um e entraram quase todos (lista abaixo).
- Ajudantes rápidos (ensaio `e1` e `e2`): escreveram a mensagem que mandariam pra pessoa testar a
  #510 no PC, lendo só a skill (abaixo).

## Checklist do "Pronto quando" (no PR)
- ✅ **A seção nova, um passo por vez, casos A e B, Windows e Mac**: `docs/equipe.md`, "Testar no seu
  computador o que a sessão da nuvem fez", depois de "Começar uma tarefa com o chefe", passos 1 a 7
  da issue (Git Bash e Terminal; `npm.cmd` só no PowerShell; `cp -n`, `notepad`/`open -e`).
- ✅ **O "Primeiro dia" diz quando o Send é preciso, e que a chave nunca vai pra conversa nem pro
  GitHub**: logo abaixo do item do Bitwarden Send (chave e endereço só no `.env`, login só na tela).
- ✅ **O chefe-tester e o chefe-frontend apontam pra seção, sem copiar os passos**: uma linha cada
  (3 e 2 linhas de texto), dizendo "só o caso, a branch e o que rodar ou clicar".
- ⏳ **O CI verde**: na descrição do PR, depois que rodar. Localmente: `typecheck`, `lint`,
  `test:fusos` (dois fusos) e `contraste` passaram.

## O que a revisão mudou (conferido um por um)
- Entrou: aviso da tela que pede o endereço do Supabase (não preencher); `cp -n` (não apaga um
  `.env` que já existe); print sem chave, endereço nem login; a linha do Send cita o endereço e o
  login; regra única "se aparecer *error*, *fatal* ou *would be overwritten*, não apague nada";
  `git pull` na `main` antes de ver reprovar; `npm install` de novo quando a tarefa mexe no
  `package.json`; `npm.cmd` só se aparecer o erro de scripts; barra `/` no Git Bash; como abrir o
  `.env` pelo terminal; o "Primeiro dia" separa `copy` (PowerShell) de `cp` (Git Bash e Mac); o
  "Começar uma tarefa com o chefe" aponta pra seção nova; "nunca peça a chave" nos dois chefes.
- Não entrou: trocar `npm install` por `npm ci` (o resto do manual usa `npm install`; o caso do
  `package-lock.json` mudado cai na regra do "would be overwritten").

## Ensaio da skill mexida (chefe-tester)
Cabeçalho das duas cópias passa no `yaml.safe_load`. Nome neutro (`conferente`), arquivos `e1` e
`e2`; `e2` sem as 3 linhas novas. Pedido: "terminou a #510, a pessoa está no Windows e precisa
abrir o programa no PC; escreva a mensagem".
- **e1** (com a linha): apontou pra seção do `docs/equipe.md`, não copiou os passos e disse "não me
  mande chave, endereço nem login".
- **e2** (sem a linha): inventou um roteiro ("puxe a branch e abra o programa de teste") sem dizer
  como, nem o terminal, nem o `.env`.
- **Diferença confirmada**: o comportamento vem da linha nova. Mas o `e1` deixou a pessoa
  "escolher o caso A ou B" em vez de dizer qual: a skill diz "diga só o caso", e o ajudante rápido
  não leu o manual pra saber que abrir o programa é o B. Consertado nesta tarefa (abaixo).

## O que testei e VI reprovar
- A linha nova da skill: sem ela (`e2`), a mensagem não aponta pra seção nem proíbe pedir a chave.

## O que passou sem eu ter visto reprovar
- `typecheck`, `lint`, `test:fusos`, `contraste` (só texto mudou; nada que eles meçam).
- Os comandos do Windows e do Mac: conferidos por leitura (eu e a revisão), não rodados num Windows
  nem num Mac.

## O que ficou de fora
- Nada da lista da issue. Não mexi no caderno nem no `ritual-de-tarefa`.

## O que depende de alguém
- **Depois de publicar** (a Sofia confere): a próxima pessoa que testar no PC (a #510 ou a #455)
  segue a seção sem travar. Não há roteiro extra: o roteiro é a própria seção.

## Defeitos abertos
- Nenhum.

## Modelos usados
- Planejar e escrever: sessão mãe, forte (Opus), esforço médio.
- Revisão final: `ajudante-forte` (Opus), esforço alto.
- Ensaio `e1` e `e2`: `ajudante-rapido` (Haiku), esforço baixo.
- Nenhuma troca por falha.

## Sessões filhas
- Nenhuma.

## Gasto
- **Uso da sessão mãe** (arquivo, medido antes do relatório e do PR): 24 respostas; entrada 50,
  cache criado 91.974, cache lido 2.803.310, saída 13.737.
- **Ajudantes** (arquivo): revisor forte 6 respostas, cache criado 83.347, cache lido 338.450 (pelo
  aviso: 87.105); `e1` e `e2` 2 respostas cada, cache criado ~51,7 mil, cache lido 46.631 (pelo
  aviso: ~53 mil cada).
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei; o texto foi mandado à coordenadora (um `/goal` por mensagem não liga).

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o ensaio com duas cópias mostrou que a linha nova muda o
  comportamento; a revisão forte achou o aviso da tela do endereço, que eu tinha esquecido.
- **Onde eu errei ou tive que adivinhar**: na primeira versão copiei o "copy" do Windows sem notar
  que o Git Bash não tem `copy`; e mandei conferir só "a chave" no print, sem o endereço e o login.
- **O que faltou na skill**: nada pra esta tarefa.
- **Sugestão de ajuste (opcional)**: nenhuma. A falha do ensaio (o `e1` deixou a pessoa escolher
  o caso) era da linha que eu mesma escrevi, então já consertei: os dois chefes agora dizem o
  critério ("A: só comando de teste; B: abrir o programa"). Não reensaiei depois do conserto.
