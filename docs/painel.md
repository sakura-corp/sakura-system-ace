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
  **Uma leva de cada vez, pra todo mundo**: as tarefas do programa das lojas entram na mesma
  leva que as do painel (decidido pela Sofia em 14/10/2026). Por isso a `leva-0` vai ter também
  as primeiras tarefas do programa, e o painel continua mostrando uma leva só.
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

## Primeiro dia e como começar uma tarefa

Estão no manual da equipe, que vale pro painel e pro programa das lojas, em Windows e Mac:
`docs/equipe.md` ("Primeiro dia" e "Como começar uma tarefa"). Quem é do painel roda o painel
pelos comandos de "Como rodar no PC", abaixo.

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

### Visual da Sala (B, o da Bibi; decidido em 15/10/2026)

A Sala (tarefas 3 e 8) é uma **janela sempre escura dentro do painel**, com visual próprio. O resto do
painel (barra lateral, leva, lista) **continua no estilo claro e calmo** descrito acima. A referência
renderizada, nos dois visuais, está em `docs/referencia/sala-duas-versoes.html` (a coluna **B** vale).
Cada ponto de luz (pessoa, robô do Claude, robô da casa) é um SVG: halo, anel e núcleo, com um
símbolo dentro. **O estado é o jeito de brilhar** e nunca depende só de animação (o anel e o balão
dizem o estado sozinhos).

- **Fonte**: Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`, pelo npm, só dentro da Sala).
- **Fundo da janela**: `#120e12`, com dois brilhos malva nos cantos. **Vidro**: branco a 4,5% com borda a 9% e
  `backdrop-filter: blur(10px)`; sem suporte, cai pra `#1d191d`.
- **Cores** (todas conferidas no contraste WCAG em 15/10: o menor par deu 6,2:1; o "Fundo" é a janela, o "Vidro" é o quadro):

| Papel | Cor | Contraste |
|---|---|---|
| Texto | `#F4ECF0` | 16,5:1 no fundo, 15,0:1 no vidro |
| Texto secundário | `#B7A3AE` | 8,1:1 no fundo, 7,3:1 no vidro |
| Destaque (malva) | `#C98FAE` | 7,3:1 no fundo, 6,6:1 no vidro; texto `#120E12` em cima: 7,3:1 |
| Malva claro / escuro | `#E2B0C9` / `#8E5A77` | só pra brilho e detalhe, nunca pra texto |

| Estado do ponto | Texto do balão | Fundo do balão | Contraste |
|---|---|---|---|
| Trabalhando | `#E2B0C9` | malva `#C98FAE` a 16% | 7,1:1 |
| Precisa de você | `#F2C46B` | âmbar a 14% | 7,8:1 |
| Com erro | `#F59B92` | vermelho a 14% | 6,4:1 |
| Dormindo e livre | `#B7A3AE` | branco a 6% | 6,2:1 |

- **Como brilha**: trabalhando = halo que pulsa devagar; precisa de você = brilho parado com anel;
  com erro = brilho vermelho com anel tracejado; dormindo = quase apagado; livre = brilho fraco.
  Com `prefers-reduced-motion`, o halo do "trabalhando" vira um anel pontilhado fixo.
- **Modo TV**: `/sala?tv` mostra só a sala, grande, pra um segundo monitor.
- **Link**: o cartão e a lista só abrem endereço que começa com `https://github.com/sakura-corp/`.
- **Sem nota por pessoa**: nem ranking nem número de produtividade individual (a Sala mostra o que
  espera cada um, não quanto cada um rendeu).

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

## Escritório de agentes (só de exemplo, 16/10/2026)

A ideia da Sofia (a "fábrica virtual", descrita em `docs/referencia/escritorio-de-agentes.md`) ganhou **uma tela de exemplo**
em `/escritorio`, com o item "Escritório (exemplo)" na barra lateral. **É só a tela**: nenhum agente de verdade roda, nenhuma
sessão é aberta, nenhum token é gasto, nenhuma chave ou login existe. A página diz isso no topo.

**O que tem (tudo de exemplo)**: a vista de cima, escura, com o visual da Sala; 6 salas (Programa das lojas, Painel, Bibi, Fiscal
e contabilidade, Site, Equipe) em roda em volta do **Cérebro**, com caminhos até ele; os agentes como pontos de luz, com os
**mesmos estados e o mesmo jeito de brilhar da Sala** (#467); a barra do topo (Escritório, Tarefas, Cérebro; Agenda "em breve");
o painel da sala (Visão geral e Tarefas; Agenda e Ajustes "em breve"); o quadro do dia (Rodando, Esperando você com Aprovar e
Revisar **desativados**, Feitas hoje); avisos "ao vivo" fixos; a legenda "Roda em". Tudo o que está no desenho está também na
lista de texto, que é o que o celular mostra. **Ficou de fora**: minimapa e zoom (não cabiam sem exagero), bonequinhos andando
e sub-agentes aparecendo.

**Regras**, em `painel/src/logica/escritorio.ts`, com testes: o estado de cada agente (precisa de você > com erro > trabalhando >
dormindo > livre; trabalhando = rodando com atividade há menos de 2 h; dormindo = 3 dias ou mais, **tempo corrido**, nunca
dia de calendário), as contagens ("N agentes · M rodando"), a ordem, o quadro do dia ("feitas hoje" = mesmo dia no fuso do
computador) e o filtro de link (só `https://github.com/sakura-corp/`). Os tipos `EstadoBonequinho` e `TipoBonequinho` em
`painel/src/tipos.ts` são os da #467, pra Sala usar os mesmos.

**Cores das equipes** (só na borda e no fundo da sala e nas etiquetas; o estado nunca é dito pela cor da equipe). Todas
conferidas contra o fundo da janela (`#120e12`) e o vidro sem suporte (`#1d191d`); passam até como texto:

| Equipe | Cor | Contraste |
|---|---|---|
| Programa das lojas | `#8FB8F0` (azul) | 9,4:1 no fundo, 8,5:1 no vidro |
| Painel | `#C98FAE` (malva, o destaque) | 7,3:1 / 6,6:1 |
| Bibi | `#B9A3F0` (lilás) | 8,7:1 / 7,9:1 |
| Fiscal e contabilidade | `#7FCBC0` (verde-água) | 10,2:1 / 9,3:1 |
| Site | `#9CCB86` (verde) | 10,3:1 / 9,3:1 |
| Equipe | `#E9B48A` (pêssego) | 10,4:1 / 9,4:1 |

**Pra ligar de verdade falta decidir de onde vêm os agentes** (a decisão é da Sofia; aqui só as opções):

| Opção | Como | A favor | Contra |
|---|---|---|---|
| **A. Ler o GitHub** | cada branch `claude/...`, PR e rodada do GitHub vira um agente, pelo mesmo caminho da Sala ao vivo (#468) | não custa nada a mais; o painel já vai ler isso; não guarda chave nova | só **mostra**: não cria nem comanda agente; sessão que só conversa, sem branch, não aparece |
| **B. As ferramentas de sessão do Claude Code** | o painel pede pra listar, criar e mandar mensagem a sessões na nuvem | é o que daria pra "criar o agente e escolher as skills" de dentro do painel | precisa de uma peça com credencial fora do navegador (o painel só tem o Worker da Cloudflare); gasta a cota das assinaturas; **regras de uso a conferir** |
| **C. Um serviço próprio** | um programa rodando fora do painel (ex.: com o Agent SDK), pago por uso da API | controle total do que cada agente faz | custo por token, que não é o da assinatura; mais uma coisa pra manter no ar |

**Recomendação (não decidida)**: começar pela **A**, junto com a #468, porque é de graça e não guarda segredo novo; deixar
"criar e comandar agentes" (B ou C) pra depois de **conferir as regras de uso das assinaturas** (Pro e Team) sobre sessões
automáticas e sobre usar a cota de uma pessoa pra trabalho disparado por outra. Antes de qualquer automação, essa
conferência vem primeiro.

**Pra quem fizer a #352 (publicar)**: o endereço `/escritorio` só abre direto se o Worker devolver o `index.html` pra caminhos
que não são arquivo (no `wrangler.jsonc`, `assets.not_found_handling: "single-page-application"`). Hoje o `npm run dev` e o
`npm run preview` já fazem isso sozinhos.

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
- **14/10/2026, à noite**: **as tarefas do programa das lojas vão entrar na `leva-0`** (decisão
  da Sofia), quando os outros dois da equipe começarem (o plano é a #474). Pro painel, isso não
  muda nada no desenho: a tela da leva mostra todas as tarefas com a etiqueta `leva-0`, do
  painel e do programa. A ordem "uma de cada vez" vale só entre as tarefas do painel.
- **15/10/2026**: **visual da Sala decidido: o B, o da Bibi** (a Sofia escolheu olhando as duas versões
  lado a lado, `docs/referencia/sala-duas-versoes.html`). Só a Sala muda; o resto do painel
  continua claro e calmo. Cada ponto de luz passa a ter o estado no jeito de brilhar. **Tarefas
  atualizadas**: **#467** (estimativa de 6 h pra **8 h**: visual B, regra de tempo sem pegadinha, filtro de
  link, modo TV, foto da tela no PR), **#468** (estado da conexão de verdade, "só dado de verdade" quando
  uma busca falha) e **#355** (o `useTempoReal()` devolve `estado` e `ultimaAtualizacao`). A **#351**
  (com o Gustavo) **não mudou**; ele recebeu um comentário com dois acréscimos pequenos (o "em breve"
  do Financeiro diz do que depende; foto da tela no PR). Nenhuma linha de código do painel mudou.
- **16/10/2026**: **a Sofia assumiu a #351** (o Gustavo foi avisado na issue; não havia branch nem PR dele). A
  tela da leva, com dados de exemplo, ficou pronta e foi **olhada renderizada** (Playwright, claro e escuro, 375 px e
  tela grande; fotos em `docs/referencia/fotos-painel/`). Consertado ao olhar: o título quebrava "Leva / 0" no
  celular (agora "Painel da Sakura" em cima e "Leva 0" grande), títulos longos eram cortados no celular (agora
  quebram linha), os grupos "Livre (4)"/"Feita (1)" viraram "Livres"/"Feitas", o contorno de foco das linhas da
  lista ficava escondido (agora aparece inteiro) e o exemplo não pede mais foto de usuário de mentira ao GitHub.
  O teste das horas **não pegava** uma conta quebrada de propósito; ganhou um caso e agora pega. **PR aberto, esperando
  a revisão da Sofia. A #467 começa depois que ele entrar na `main`.**
- **16/10/2026, mais tarde**: **Escritório de agentes, só de exemplo**, em `/escritorio` (seção "Escritório de agentes"
  acima), em PR separado, em cima do PR da #351. Nada de verdade ligado. **Depende da Sofia**: escolher de onde vêm os
  agentes reais (A, B ou C) e conferir as regras de uso das assinaturas antes de automatizar sessões.
- **16/10/2026, à tarde**: **a Sala (#467), com dados de exemplo**, em `/sala` (e `/sala?tv`), em PR separado, em cima do
  PR do Escritório (a Sofia pediu pra continuar construindo a base enquanto estava no trabalho). As regras de tempo e de link
  ficaram em `painel/src/logica/tempo.ts` e `link.ts`, usadas pela Sala e pelo Escritório. **A ordem de revisão é: #351,
  depois o Escritório, depois a Sala.** A #352 (publicar) só começa depois que a #467 entrar na `main`.
- **16/10/2026, fim da tarde**: **#351 e #467 aprovadas e mescladas pela Sofia** (PRs #484 e #486), e o Escritório de
  exemplo também (#485). **A tarefa 4 (#352) já pode começar.** No `wrangler.jsonc` dela, além do que está no item de
  01/10, pôr `assets.not_found_handling: "single-page-application"`, pra `/sala`, `/sala?tv` e `/escritorio` abrirem
  direto.
