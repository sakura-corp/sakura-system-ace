# Painel da equipe: manual

> Pra quem está construindo o painel, e pro Claude dessa pessoa. **Antes de tudo, a seção 0 do
> `PROJETO_STATUS.md`** ("Quem está trabalhando?"): ela manda mais que este arquivo. As decisões
> abaixo são da Sofia (29 e 30/09/2026). Mudar alguma delas é conversa com ela, não escolha de
> quem está programando.

## O que é, e aonde ele vai

Nas palavras da Sofia (30/09/2026): uma **interface de autogestão**, com um **design parecido com
o do Claude**. Por enquanto ela tem que fazer **toda a linha de produção que já decidimos**, com
**contador de tarefas** e o resto. As expansões serão o **financeiro da Sakura Corp, com DRE**.
Ou seja, **um sistema nosso**, que permita administrar a empresa toda, da forma mais automatizada
possível. E **ligado em tempo real ao GitHub**: tempo real é importante pra organização.

Na prática, hoje:
- O painel **lê o GitHub, não o substitui**: as tarefas são as issues deste repositório
  (`sakura-corp/sakura-system-ace`), e o que o painel mostra vem de lá.
- **Tempo real**: quando alguém pega, entrega ou fecha uma tarefa no GitHub, o painel de todo
  mundo muda sozinho, em segundos, sem recarregar a página.
- **Financeiro e DRE ficam pra depois**, e com um cuidado: dinheiro da empresa **não pode morar
  no GitHub**, que é público. Quando chegar a hora, o financeiro vai precisar de um banco próprio
  e privado; aí sim um Supabase faz sentido. Decidir com a Sofia quando chegar.
- O desenho já nasce preparado pra crescer: uma barra lateral com uma seção por assunto ("Levas"
  hoje; "Financeiro" aparece desativado, escrito "em breve").
- **A sala da Sakura** (decidido pela Sofia em 14/10/2026): uma página em que cada pessoa e cada
  robô (as sessões do Claude e os trabalhos automáticos do GitHub) aparece como um bonequinho
  numa sala, mostrando o que está fazendo e o que **precisa de quem está olhando**. Bem simples
  de desenhar, e cedo na leva 0 (tarefas 3 e 8). Ela vê o que passa pelo GitHub: uma sessão do
  Claude que só conversa, sem branch, não aparece.

**Tudo aqui é público**, porque o repositório é público: o código do painel, as issues, os PRs.
Tarefa, comentário e código nunca levam preço, dado de loja, nome de cliente ou senha.

## Como a equipe trabalha (é isso que o painel mostra)

- **Leva** é o pacote de trabalho do período, com **várias tarefas**, de várias pessoas. Cada
  leva tem uma etiqueta no GitHub: `leva-0`, `leva-1`, `leva-2`…
- **Tarefa** é uma issue com a etiqueta da leva. **Um dono** (o "responsável", *assignee*) e
  **um PR**, que fecha a issue quando entra (`Closes #N` na descrição do PR).
- **Estado de uma tarefa**:
  - **livre** = aberta e sem responsável;
  - **em andamento** = aberta, com responsável, ainda sem PR aberto;
  - **em revisão** = aberta, com um PR aberto que a fecha (`Closes #N`), esperando a Sofia;
  - **feita** = fechada.
- **Pegar tarefa**: a pessoa pega **uma livre** (ninguém distribui), **põe o nome dela antes de
  começar**, e segura **uma por vez**. Só pega outra depois que o PR da atual foi aberto.
- **"Depende de"**: tarefa que diz "Depende de: tarefa X aprovada" só começa **depois que a X
  entrou na `main`** (a Sofia aprovou). Tarefa que depende de algo que a Sofia faz (ligar a
  Cloudflare, criar um app) só começa quando isso aparece em "Andamento", no fim deste arquivo.
- **Avisar a Sofia**: no fim de toda tarefa, **pelo GitHub** (o pedido de revisão do PR já avisa)
  **e pelo WhatsApp**: o Claude escreve uma mensagem curta e informal, e a pessoa só copia e manda.
  Também quando não der pra começar uma tarefa por falta da parte dela.
- **Estimativa**: cada tarefa diz no texto quantas horas deve levar, numa linha
  `Estimativa: N h`. O trabalho da equipe é medido em horas por semana, não em dinheiro.
- **Fim da leva**: ela **congela**, todo mundo testa, o Claude da Sofia escreve o relatório, a
  Sofia aprova, e só então vem banco e "Liberar versão". **Bug de loja não espera a leva.**
- **As tarefas nascem nas conversas da Sofia com o Claude dela**, que cria as issues.

## Primeiro dia (de quem entra na equipe)

Antes da primeira tarefa, a pessoa instala o **Claude Code no PC** (não a versão pela internet:
ela vai precisar abrir o painel no navegador pra testar), entra com a conta Claude dela, e cola
isto como **primeira mensagem**. O texto foi aprovado pela Sofia em 30/09/2026 e é o mesmo pra
todo mundo que entrar (o do Gustavo é Windows; pra quem usar Mac, trocar a primeira linha).

> Oi, Claude. Vou trabalhar no projeto **Sakura System**, que está no GitHub no repositório
> **`sakura-corp/sakura-system-ace`**. Meu computador é **Windows**. Me guie **um passo por vez**,
> como se eu nunca tivesse feito isso: diga exatamente onde clicar ou o que digitar, o que deve
> aparecer na tela, e **espere eu responder "feito"** antes do próximo passo.
>
> Hoje o objetivo é **só deixar meu computador pronto**, sem programar nada:
> 1. Confira o que já tenho instalado e me ajude a instalar o que faltar: **Git**, **Node.js
>    versão 22** e **GitHub CLI** (o programa `gh`).
> 2. Me ajude a entrar na minha conta do GitHub pelo GitHub CLI (`gh auth login`, pelo navegador).
> 3. **Clone** o repositório com `gh repo clone sakura-corp/sakura-system-ace`, numa pasta que você
>    vai me ajudar a escolher. **Não baixe como ZIP.** Precisa ser clonado, pra eu conseguir
>    entregar meu trabalho depois.
> 4. Me explique como abrir o Claude Code **dentro dessa pasta** e espere eu abrir.
> 5. Já dentro da pasta, leia a **seção 0 do `PROJETO_STATUS.md`** e o **`docs/painel.md`**, e me
>    explique em português simples, em poucas linhas, como vai ser o meu trabalho.
>
> **Hoje não mude nada no projeto, não crie branch e não pegue tarefa.** Quando tudo estiver
> pronto, diga "tudo pronto" e pare.

## Como começar uma tarefa

A pessoa abre o Claude dela e diz só o nome ou o número da tarefa (ex: *"quero fazer a tarefa
#12"*). A partir daí, o Claude:
1. **Confere quem é** (seção 0 do `PROJETO_STATUS.md`) e **lê a issue inteira** e este manual.
   **Confere o "Depende de"**: se ainda não dá pra começar, explica o motivo, escreve a mensagem
   de WhatsApp pra Sofia e para aqui.
2. **Explica em português simples**, antes de mexer em qualquer coisa:
   - o que é a tarefa e pra que ela serve no painel;
   - o que o Claude vai fazer sozinho (o código);
   - o que a pessoa vai precisar fazer (instalar, testar, abrir o PR), e quanto tempo deve levar.
3. **Guia a pessoa a pôr o nome dela na tarefa** no GitHub, se ainda não pôs, passo a passo.
4. Programa. Sempre que a pessoa precisar fazer alguma coisa que não seja só esperar o código
   (rodar um comando, abrir o navegador, testar, clicar numa tela), o Claude **guia um passo por
   vez, com calma**: onde clicar, o que digitar, o que deve aparecer, e espera ela confirmar
   antes do próximo passo. Nada de despejar dez passos de uma vez.
5. No fim, confere o "Pronto quando" da tarefa com a pessoa, item por item, e guia a abertura do
   PR (com `Closes #N`) e o pedido de revisão da Sofia. **Não mescla.**
6. Escreve a mensagem de WhatsApp pra Sofia (ex: *"Oi Sofia! Terminei a tarefa 2 (visual do
   painel). O PR é o #58, tá esperando sua revisão."*), e a pessoa manda.

## Design (parecido com o do Claude)

Inspiração de estilo, não cópia: **nada de logotipo, nome, fonte proprietária ou ícone da
Anthropic ou do Claude**. O que se copia é o jeito: calmo, claro, muito espaço, tipografia boa.
- **Layout**: barra lateral fixa à esquerda (no celular vira uma barra no topo), conteúdo no meio
  com largura máxima de ~960 px, cartões com borda fina e cantos de 12 px, sem sombra forte, sem
  vidro nem neon (o visual do programa das lojas não vale aqui).
- **Fontes** (grátis, instaladas pelo npm, sem CDN): **Inter** na interface
  (`@fontsource-variable/inter`) e **Source Serif 4** nos títulos
  (`@fontsource-variable/source-serif-4`). Ícones: `lucide-react`.
- **Cores**: claro por padrão, escuro quando o computador estiver no modo escuro
  (`prefers-color-scheme`). Todas as combinações abaixo foram conferidas: passam no contraste
  WCAG AA (4,5:1 ou mais pra texto).

| Papel | Claro | Escuro |
|---|---|---|
| Fundo | `#FAF9F5` | `#1F1E1D` |
| Cartão / superfície | `#FFFFFF` | `#2A2927` |
| Borda | `#E6E3DA` | `#3A3936` |
| Texto | `#1F1E1D` | `#F2F0EA` |
| Texto secundário | `#6B6963` | `#A8A59C` |
| Destaque (rosa Sakura, escurecido pra ler bem) | `#B8237F` (texto branco em cima) | `#F07CC4` (texto `#1F1E1D` em cima) |

| Estado da tarefa | Claro (texto / fundo) | Escuro (texto / fundo) |
|---|---|---|
| Livre | `#5F5D57` / `#EFEDE6` | `#C9C6BD` / `#34332F` |
| Em andamento | `#A81F74` / `#FBE7F3` | `#F59BD2` / `#43243A` |
| Em revisão | `#7A4F00` / `#FBEFD9` | `#F2C46B` / `#3F3322` |
| Feita | `#2B6534` / `#E4F1E6` | `#8FD19C` / `#233A28` |

**Estados da sala** (tarefas 3 e 8): reaproveitam as cores acima, mais uma de erro, conferida no
contraste em 14/10 (5,75:1 no claro e 6,76:1 no escuro).

| Estado do bonequinho | Usa as cores de | Claro (texto / fundo) | Escuro (texto / fundo) |
|---|---|---|---|
| Trabalhando | Em andamento | `#A81F74` / `#FBE7F3` | `#F59BD2` / `#43243A` |
| Precisa de você | Em revisão | `#7A4F00` / `#FBEFD9` | `#F2C46B` / `#3F3322` |
| Com erro | (nova) | `#B42318` / `#FDECEA` | `#F59B92` / `#45201D` |
| Dormindo e livre | Livre | `#5F5D57` / `#EFEDE6` | `#C9C6BD` / `#34332F` |

## Decisões técnicas (já tomadas)

- **Onde mora**: na pasta `painel/` deste repositório, como **projeto separado**, com
  `package.json` e `node_modules` próprios. O painel não importa nada de `src/` (o programa das
  lojas), e o programa não importa nada do painel.
  - O `tsconfig.json` da raiz já olha só `src` e `electron`.
  - O **primeiro PR do painel** acrescenta `painel/` aos `ignores` do `eslint.config.js` da raiz e
    confere que o CI da raiz continua verde. O painel não pode quebrar o CI do programa das lojas.
- **Tecnologia**: React + Vite + TypeScript, a mesma do programa das lojas.
- **Onde fica no ar**: na **Cloudflare**, no plano grátis. A página e a parte do login ficam no
  mesmo lugar (um Worker com os arquivos da página). A conta da Cloudflare é da Sofia: **quem
  mexe na configuração dela é a Sofia**.
  - A publicação sai **só da `main`**.
  - Se as prévias de PR forem ligadas um dia, elas **não recebem** o segredo do login. Código
    que ainda não foi revisado não pode ter acesso a ele.
- **Login pelo GitHub, já na 1ª versão**:
  - É feito por um **GitHub App da organização `sakura-corp`**, e não por um "OAuth App".
    Motivo: o GitHub App deixa limitar o que o login pode fazer (só as issues deste
    repositório), e o OAuth App daria acesso a todos os repositórios públicos da pessoa.
  - **Quem cria o GitHub App é a Sofia**, com passo a passo, quando a tarefa do login chegar.
  - O **segredo do app** (*client secret*) fica **só na Cloudflare**, nunca no repositório.
  - **Só entra quem for membro da organização `sakura-corp`**. O painel confere pela API do
    GitHub, com o token de quem está entrando.
  - O token da pessoa não vai pra lugar nenhum além do navegador dela e da API do GitHub, e
    nunca aparece em log.
- **Dados**: vêm da **API do GitHub**, com o token de quem está logado. **Sem banco próprio.**

## 1ª versão (leva 0)

1. **No ar na Cloudflare**, atualizando sozinho a cada mudança do painel na `main`.
2. **Login pelo GitHub**, só pra membros da `sakura-corp`.
3. **A leva atual**: o contador (livres, em andamento, em revisão, feitas, horas) e a lista das
   tarefas agrupadas por estado, com os dados de verdade das issues.
4. **Tempo real**: o painel de todo mundo muda sozinho quando uma tarefa muda no GitHub.
5. **A sala da Sakura**: as pessoas e os robôs como bonequinhos, ao vivo (ver "O que é").

As 8 tarefas da leva 0, com o passo a passo de cada uma, são as issues **#350, #351, #467, #352,
#353, #354, #355 e #468**, nesta ordem, com a etiqueta `leva-0` (as 6 primeiras criadas em
30/09/2026; as duas da sala, #467 e #468, em 14/10, quando as antigas foram renumeradas de "x/6"
pra "x/8"). Nesta leva uma depende da outra, então **a próxima só
começa depois que a anterior foi aprovada pela Sofia e entrou na `main`**.

### O caminho da leva 0
```
tarefa 1 (#350) projeto       → PR → Sofia aprova
tarefa 2 (#351) visual        → PR → Sofia aprova      + Sofia liga a Cloudflare (feito)
tarefa 3 (#467) a sala        → PR → Sofia aprova
tarefa 4 (#352) no ar         → PR → Sofia aprova e confere o endereço no ar
                                                       + Sofia cria os apps de login
tarefa 5 (#353) login         → PR → Sofia aprova
tarefa 6 (#354) dados         → PR → Sofia aprova      + Sofia liga o aviso automático (webhook)
tarefa 7 (#355) tempo real    → PR → Sofia aprova
tarefa 8 (#468) sala ao vivo  → PR → Sofia aprova  →  fim da leva 0 (ver "Fim de uma leva")
```

### O que a Sofia faz (com o Claude dela guiando, na hora de cada tarefa)

Cada coisa que ela faz, o Claude dela **anota em "Andamento" do `docs/painel.md`** (ex:
"01/10: Cloudflare ligada"). É ali que o Claude de quem programa confere se pode começar.

- **A cada PR do Gustavo**: o Claude dela confere o CI, o código e o "Pronto quando", e explica em
  português. Ela aprova pelo GitHub (no computador, ou no Safari se for no celular):
  1. no PR, aba **"Files changed"** → botão verde **"Submit review"** → **"Approve"** →
     **"Submit review"**;
  2. depois, na aba **"Conversation"**: setinha ▾ do **"Merge pull request"** →
     **"Squash and merge"** → **"Confirm squash and merge"**.

  Depois disso, o Claude dela anota em "Andamento" que a próxima tarefa pode começar.
- **Antes da tarefa 1**: ~~criar a etiqueta `leva-0` e as issues~~ (feito em 30/09) e ~~convidar o Gustavo~~ (feito em 30/09).
- **Antes da tarefa 4**: ~~na Cloudflare, ligar o repositório ("Workers Builds")~~ (feito em
  01/10; como ficou está em "Andamento").
- **Antes da tarefa 5**: criar os dois GitHub Apps na `sakura-corp`, com as permissões da #353
  (inclusive **Actions** e **Contents**, só leitura, que a sala usa), e cadastrar
  `GITHUB_APP_CLIENT_SECRET` e `CHAVE_DA_SESSAO` na Cloudflare. Passar o segredo do app **de
  teste** pro Gustavo pelo **Bitwarden Send** (um link cifrado que se apaga sozinho), nunca por mensagem.
- **Antes da tarefa 7**: no "Sakura Painel", ligar o webhook (endereço
  `https://<painel>/api/webhook`, eventos **Issues, Pull request, Label, Workflow runs, Push,
  Create e Delete**; os quatro últimos são da sala, e já vão juntos pra não mexer duas vezes) e cadastrar
  `GITHUB_WEBHOOK_SECRET` na Cloudflare.
- **Depois do painel**: a conferência automática (CI) do painel, feita pelo Claude dela.

A **leva 1** é a linha de produção completa (botão de pegar tarefa, fases da leva, horas por
pessoa, relatório e aprovação); depois vem o financeiro.

## Regras pra quem trabalha no painel (resumo da seção 0)

- Mexe **só no painel**: a pasta `painel/` e este arquivo (mais as 3 linhas da raiz que a
  tarefa #350 manda mudar). Se precisar mexer fora disso, avisa a Sofia antes.
- Branch → PR → **pede a revisão da Sofia** e para. **Nunca mescla.**
- Não publica, não libera, não mexe em banco, versão, tag, secret, cofre, ruleset nem
  configuração do repositório. Nem por um workflow novo.
- Não mexe no "Onde parou" do `PROJETO_STATUS.md`, que é da Sofia. O andamento vai na seção
  "Andamento" abaixo e na descrição do PR.
- Um PR por tarefa, com `Closes #N`.

## Fim de uma leva

Quando a última tarefa da leva é aprovada:
1. O Claude de quem fez a última escreve o aviso de WhatsApp pra Sofia: a leva terminou.
2. A leva **congela**: ninguém começa tarefa nova.
3. **Todo mundo testa** o que a leva entregou, com a lista de testes que o Claude da Sofia manda.
   O que parecer estranho vira uma issue nova (com print), e a Sofia decide o que fazer.
4. O Claude da Sofia escreve o **relatório da leva**, a Sofia aprova, e os dois planejam a
   próxima. Até as tarefas dela aparecerem, não tem tarefa pra pegar.

## Como rodar no PC

Precisa do **Node 22**. Todos os comandos rodam **dentro da pasta `painel`**, que tem as
dependências dela, separadas das do programa das lojas:

| Comando | O que faz |
|---|---|
| `cd painel` | entra na pasta do painel |
| `npm install` | instala as dependências (só na primeira vez, ou quando o `package.json` mudar) |
| `npm run dev` | abre o painel em `http://localhost:5173`, e a página se atualiza sozinha a cada mudança. `Ctrl+C` no terminal para |
| `npm run build` | confere os tipos e monta a versão final na pasta `painel/dist` |
| `npm run typecheck` | só confere os tipos |
| `npm test` | roda os testes do painel |

- **No Windows (PowerShell)**, se aparecer *"a execução de scripts foi desabilitada neste
  sistema"*, trocar `npm` por **`npm.cmd`** em todos os comandos (ex: `npm.cmd run dev`). Não
  precisa mexer na trava de segurança do Windows.
- O **Vitest está fixo na versão `4.1.10`**, inclusive em `overrides`. Não trocar por `^4...`:
  um complemento opcional dele puxa o Vitest 5, e o `npm install` quebra com o erro
  `Cannot read properties of null (reading 'edgesOut')`.
- A configuração do login no PC entra aqui na tarefa 5 (o arquivo `painel/.dev.vars`, que o Git
  já ignora).

## Andamento

*Aqui também o Claude da Sofia anota cada parte que é dela (ex: "Cloudflare ligada", "apps de
login criados", "webhook ligado"), com a data. É onde quem programa confere se pode começar.*

- **30/09/2026**: manual criado e **leva 0 criada** (issues #350 a #355). Nenhuma linha de código
  do painel ainda.
- **30/09/2026, à noite**: **Gustavo (`kalendoscope`) convidado e dentro**: membro da `sakura-corp`
  e **Write** no `sakura-system-ace`, convite aceito. Ele está seguindo o "Primeiro dia" (Claude
  Code no PC). **A tarefa #350 já pode começar.**
- **01/10/2026**: tarefa 1 (#350) feita pelo Gustavo: o projeto do painel existe em `painel/`
  (Vite + React + TypeScript + Tailwind), com uma página "Painel da Sakura" e um teste.
  **Aprovada e mesclada pela Sofia em 01/10 (PR #424). A tarefa 2 já pode começar.** A parte da
  Sofia na Cloudflare só é necessária antes da tarefa 4 (#352, renumerada em 14/10).
- **01/10/2026**: **Cloudflare ligada.** Worker **`sakura-painel`**, no ar em
  **https://sakura-painel.caranovavidanova.workers.dev**. Por enquanto mostra a página da tarefa 1:
  a Cloudflare publicou a página mesmo sem o `wrangler.jsonc`. Como ficou:
  - a tela de criar não tinha o campo da pasta, então a pasta vai dentro dos comandos e o
    "Root directory" fica `/`. Build: `cd painel && npm ci && npm run build`. Deploy:
    `cd painel && npx wrangler deploy`;
  - publica **só da `main`**: "Builds for non-production branches" está desligado, e a chave
    "Preview" do endereço também;
  - **Build watch paths**: só `painel/*`, então mudança no programa das lojas não dispara
    publicação do painel;
  - **pra tarefa 4 (#352)**: o `name` do `wrangler.jsonc` tem que ser `sakura-painel`, o mesmo da
    Cloudflare. Pôr também `"workers_dev": true` e `"preview_urls": false`, pra cada publicação
    não religar a prévia nem desligar o endereço (a chave do endereço veio desligada no
    começo);
  - **a tarefa 4 (#352) já pode começar depois que a 3 (#467) for aprovada.**
- **14/10/2026**: **a sala da Sakura entrou na leva 0** (decisão da Sofia): duas tarefas novas,
  **#467** (a sala com dados de exemplo, logo depois do visual) e **#468** (a sala de verdade, ao
  vivo, no fim). As antigas foram renumeradas pra "x/8": a #352 virou a 4, a #353 a 5, a #354 a 6
  e a #355 a 7. A #353 ganhou as permissões **Actions** e **Contents** (ler) e a #355 passou a
  repassar também os avisos de robô e de branch. **A ordem continua uma de cada vez: a #467
  começa depois que a #351 for aprovada.**
