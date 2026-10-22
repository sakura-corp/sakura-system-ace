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
- **Financeiro**: dinheiro da empresa **não pode morar no GitHub**, que é público. **Decidido em
  19/10 (#652): fica no Cloudflare D1**, o banco da própria Cloudflare onde o painel mora (sem conta
  nem chave nova). A Sofia digita os lançamentos; a equipe vê os totais e os gráficos, só ela vê
  cada lançamento, e o corte é feito no worker (#654, leva 2). O DRE vem depois.
- O desenho já nasce preparado pra crescer: a barra lateral tem seis andares (veja "Os andares", abaixo)
  e o rodapé com Configurações e quem entrou, um ícone por item, e as funções
  futuras já no lugar, apagadas, com cadeado e a linha do que falta ("depende da #546", "depende
  do banco privado"). A lista mora em `painel/src/logica/navegacao.ts`, como dado: a barra só
  desenha o que está lá, e um teste confere que todo "em breve" diz do que depende e que nenhum
  endereço que existe (`/`, `/sala`, `/escritorio`) sumiu (#542).
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
  **Pelo painel** (#538): o botão **"Pegar tarefa"** no cartão da tarefa livre põe o nome da pessoa
  no GitHub, com o login dela. O worker confere tudo de novo na hora, e o botão vem desligado, dizendo
  o porquê, quando a tarefa:
  - tem dono;
  - não está numa leva aberta (a atual, ou uma anterior que ainda tem tarefa aberta; decidido em 19/10);
  - está incompleta;
  - espera uma dependência;
  - ou é de quem já está com outra em andamento (em qualquer leva aberta; a página só vê a leva da tela, o worker
    confere todas).

  O **"Começar com o Claude"** só aparece pra quem pegou. **"Largar"** devolve a tarefa: só o dono,
  e só enquanto não abriu o PR. Ninguém põe outra pessoa numa tarefa pelo painel. Se o worker recusar (ex.: alguém
  pegou antes), o motivo aparece no cartão e o painel busca a leva de novo.
- **"Depende de"**: tarefa que diz "Depende de: #X" só começa **depois que a X foi fechada como
  concluída** (normalmente pelo PR que entrou na `main`; decidido pela Sofia em 17/10). Tarefa que depende de algo que a Sofia faz (ligar a
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
- **Layout**: barra lateral fixa à esquerda (abaixo de 768 px vira a barra de baixo com a folha "Mais"; o tablet,
  mesmo em pé, ainda mostra a barra do lado, então a barra de baixo e o "Mais" só se conferem no celular), conteúdo no meio
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

| Gráfico do Financeiro (#654) | Claro | Escuro |
|---|---|---|
| Entrou | `#1F7A3D` | `#34A15A` |
| Saiu | `#B8237F` | `#D9559F` |

As duas séries têm cor própria porque o verde de "Feita" é escuro demais pra ficar ao lado do rosa num gráfico
(conferido com o validador da skill `dataviz`, inclusive pra daltônico).

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

## Os andares (#591, 18/10/2026)

O painel é o "prédio" da Sakura: cada **andar** é uma área da empresa, com os seus chefes (as skills `chefe-*`). Os
antigos grupos da barra (Trabalho, Equipe, Empresa) viraram andares. **Só a estrutura**: o desenho de prédio
(isométrico, rolar de andar) é leva própria, depois da Sala ao vivo (#468).

| Andar | Itens | Chefes |
|---|---|---|
| Térreo · Recepção | Início | — |
| 1º · Produção | Leva atual, Levas anteriores, Fases da leva, Relatório da leva, Sala, Escritório, Pessoas | frontend, backend, tester |
| 2º · Comercial e pós-venda | Lojas, Pós-venda (em breve) | marketing |
| 3º · Financeiro | Financeiro, DRE | — |
| 4º · Segurança e operação | Versões, Bancos e backups (em breve) | segurança |
| Cobertura · Diretoria | Decisões da Sofia (em breve; vai ser a lista `sofia`) | — |

Configurações continua no rodapé (não é andar).

- **Ordem na barra**: de cima pra baixo começando pelo Térreo (a ordem de uso), não do topo do prédio.
- **Onde mora**: tudo em `painel/src/logica/navegacao.ts` (id, título e `chefes` de cada andar; `andarDoItem()` acha o andar
  de um item). A barra do computador e a folha "Mais" do celular só desenham o título que está lá, então os nomes são
  iguais. A folha mostra 5 andares: o Térreo só tem o Início, que já está na barra de baixo, e andar vazio some.
- **Chefes na página "em breve"**, não na barra: a linha "Quem cuida deste andar" (`PaginaEmBreve`). Andar sem chefe
  diz "ainda sem chefe"; a linha não some. Configurações (rodapé) não tem a linha.
- **A trilha da página "em breve"** (`grupo` em `emBreve.ts`) é o título do andar, e um teste confere que é igual ao da
  navegação.
- **Dinheiro**: a regra "sem algarismo e com o aviso" vale por item (Financeiro, DRE e Lojas), não por andar. A Lojas
  mudou pro 2º andar e não perdeu a proteção; o Pós-venda, que mora no mesmo andar, não é afetado.
- **Endereços**: nenhum mudou. Os três itens novos usam `/em-breve/posvenda`, `/em-breve/bancos` e `/em-breve/decisoes`.
- **Fora desta tarefa** (de propósito): o conteúdo de verdade dos andares novos (pós-venda, sinais de saída, bancos), a barra
  marcando "Leva atual" no "em breve" (#560) e a área segura do iPhone (#561).

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
- **Tempo real** (#355), em 5 linhas:
  1. O GitHub avisa o worker (`POST /api/webhook`, `painel/worker/webhook.ts`): a assinatura
     `X-Hub-Signature-256` é conferida antes de tudo (401 se não bater), e só passa evento deste repositório.
  2. Passam `issues`, `pull_request` e `label` (com o número da tarefa, quando há) e `workflow_run`, `push`,
     `create` e `delete` (só o tipo, pra Sala da #468). O aviso **não leva dado nenhum da tarefa**.
  3. Um Durable Object, `SalaDoPainel` (`painel/worker/sala.ts`, uma sala só, com SQLite e WebSocket com
     hibernação), repassa o aviso a todos os painéis abertos em `GET /api/tempo-real` (só com sessão).
  4. A página (`painel/src/logica/tempoReal.ts`, `useTempoReal()`) busca a leva de novo a cada aviso de tarefa
     (juntando avisos de 1 s), reconecta sozinha (1, 2, 5, 10, até 30 s) e, de reserva, busca a cada 2 minutos
     e quando a janela volta ao foco.
  5. O hook devolve `estado` (`aovivo`, `reconectando`, `desatualizado`: mais de 2 minutos sem busca com
     sucesso) e `ultimaAtualizacao`; a barra lateral mostra o ponto e a Sala da #468 vai usar os dois.

- **A Sala de verdade** (#468), de onde vem cada bonequinho (`GET /api/sala`, `painel/worker/dadosDaSala.ts`; três buscas
  independentes, com o token de quem está logado):
  1. **Robôs do Claude**: uma consulta GraphQL nos branches `claude/` (`refs(refPrefix: "refs/heads/claude/")`), com a data do
     último commit e o PR aberto (número, título, link, revisões pedidas). Quando o PR entra, o GitHub apaga o branch e o robô sai.
  2. **Robôs da casa**: `actions/runs` (as últimas 100); fica a rodada mais nova de cada trabalho. Os 6 trabalhos fixos
     (`ROBOS_DA_CASA`) sempre aparecem: um que não está nas últimas 100 é buscado sozinho (`workflows/<arquivo>/runs?per_page=1`).
     Rodada `waiting`: `pending_deployments` diz, pelo `current_user_can_approve`, se **quem olha** pode aprovar ("precisa de você").
  3. **Pessoas**: os responsáveis das tarefas da leva atual (a mesma consulta da #354), com a foto do GitHub.
  - A resposta é `{ entradas, falhas, leva }`. O **estado** (trabalhando, dormindo, precisa…) **não** vem do worker: sai de
    `montarSala()` (`src/logica/sala.ts`) na página, que recalcula a cada minuto sem buscar. O worker só diz o que viu.
  - **Só dado de verdade**: se uma das três buscas falhar, `falhas` diz qual (`pessoa`, `claude` ou `casa`) e a página mostra
    "não consegui ler isto do GitHub" com "Tentar de novo", nunca "livre". Falhando as três, é 502 e a página mostra o erro.
  - **Tempo real**: a Sala escuta `issues`, `pull_request`, `label`, `workflow_run`, `push`, `create` e `delete`, junta avisos
    de 1 s e busca de novo. A linha do topo (e do `/sala?tv`) diz **"ao vivo · atualizado há N s"**, **"reconectando…"** ou
    **"desatualizado há N min"** (mais de 2 min sem busca com sucesso).
  - O link do "precisa de você" abre a própria rodada (onde se aprova) ou o PR; só `https://github.com/sakura-corp/` vira link.
  - Os dados de exemplo (`src/dados/exemplo-sala.ts`) só aparecem no `npm run dev` sem o worker; logado, nunca.
- **Levas anteriores (#548)**: rota própria, **`/api/levas/resumo`**, pra não pesar o `/api/levas` (que continua leve:
  só nome e abertas, e é usado pela barra lateral em toda página, pela Sala e pelo pegar tarefa). O resumo devolve, por
  leva, `total`, `feitas` (**fechada de qualquer jeito**, coerente com a tela da leva; se a Sofia quiser, dá pra contar
  só as COMPLETED), `horas` (a soma das estimativas; tarefa sem estimativa conta 0) e `terminouEm` (o `closedAt` mais
  novo; **null enquanto houver tarefa aberta**). É **uma consulta GraphQL só**, com as **20 etiquetas `leva-N` criadas
  por último** (com 20, a página avisa "mostrando as 20 mais novas") e até 100 tarefas por leva (passou disso,
  `cortada`: horas e data das 100 primeiras). Nada é guardado fora do GitHub. A página é `/levas`
  (`PaginaDasLevas.tsx`), uma linha por leva, da mais nova pra mais velha, levando a `/leva/<n>`; leva sem tarefa
  diz "sem tarefas ainda". Lá o resumo é o **único pedido depois do `/api/eu`**: a barra lateral usa as levas dele
  (têm número, nome e abertas), sem um `/api/levas` em paralelo (com o token vencido, renovaria duas vezes).
- **"O que mudou hoje" no Início (#549)**: rota **`/api/novidades`** (só com sessão), lida na hora com o token de quem
  está logado; **nada é guardado** (nem na sala). São **dois pedidos REST**: a lista de eventos do repositório
  (`/events?per_page=100`, só `IssuesEvent` e `PullRequestEvent`: abriu, fechou, reabriu, pegou/largou, entregou,
  mesclou) e as rodadas do Actions (`/actions/runs?per_page=50`, só as terminadas que passaram ou falharam). **A lista de
  eventos do GitHub não traz rodada nenhuma**, por isso o segundo pedido (a issue dizia só "eventos"). Se as rodadas
  falharem, o resto sai igual com o aviso (`falhas: ["rodadas"]`); se os eventos falharem, 502. O worker manda só os
  dois últimos dias; **"hoje" é decidido na página, no fuso do computador**, no máximo 15, da mais nova pra mais velha.
  A frase é montada na página (`src/logica/novidades.ts`) só do tipo, do número e de quem fez; o título vai à parte e só
  vira link se for `https://github.com/sakura-corp/`. **O formato de hoje da lista do GitHub** (visto em 20/10): o PR
  vem enxuto (sem título, sem link, sem `merged`), a mesclagem chega como `action: "merged"`, e o `unassigned` vem com
  `assignee: null` (a frase fica "tirou o responsável da #N"). Sem `html_url`, o link é montado do número. **Limites**:
  a lista de eventos do GitHub atrasa de 30 s a algumas horas (o tempo real pede de novo junto com a sala, mas o
  evento pode ainda não estar lá); é uma página só de 100 eventos (num dia cheio, o começo do dia pode faltar).
  **Conferências repetidas (#667)**: das rodadas da mesma conferência (pelo nome) no mesmo PR, fica só a mais nova
  de hoje (a que diz se passou ou falhou agora), juntando **antes** do corte em 15; rodada sem PR (ex.: na `main`, agendada ou manual) continua
  uma por linha. É na página (`novidadesDeHoje()`), o worker manda todas.

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
tarefa 4 (#352) no ar         → PR → Sofia aprova e confere o endereço no ar (feito)
                                                       + Sofia cria os apps de login (o de verdade, feito)
tarefa 5 (#353) login         → PR → Sofia aprova (feito)
tarefa 6 (#354) dados         → PR → Sofia aprova (feito)
                                                       + Sofia liga o aviso automático (webhook), antes da 7 (feito)
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
- **Antes da tarefa 5**: ~~criar o GitHub App "Sakura Painel" e cadastrar os segredos na Cloudflare~~
  (feito em 16/10; como ficou está em "Andamento"). **Falta só o app de teste**, quando alguém da
  equipe for mexer no login no PC: criar o **"Sakura Painel (teste)"** igual ao de verdade (mesmas
  permissões, instalado só no `sakura-system-ace`), com o Redirect URI
  `http://localhost:8787/api/login/volta`, e passar o client secret dele pelo **Bitwarden Send**
  (um link cifrado que se apaga sozinho), nunca por mensagem.
- **Antes da tarefa 7**: ~~no "Sakura Painel", ligar o webhook e cadastrar `GITHUB_WEBHOOK_SECRET` na
  Cloudflare~~ (feito em 17/10; como ficou está em "Andamento"). Endereço `https://<painel>/api/webhook`,
  eventos **Issues, Pull request, Label, Workflow runs, Push, Create e Delete** (os quatro últimos são da
  sala, e já vão juntos pra não mexer duas vezes).
- **Depois do painel**: a conferência automática (CI) do painel, feita pelo Claude dela.

A **leva 1** (montada em 17/10) tem três tarefas do painel (#536 cabeçalho, #538 pegar tarefa,
#539 horas por pessoa) e três do programa (#510, #511, #455). **Fases da leva** e **relatório e
aprovação** ficaram pra leva 2: cada uma pede uma conversa de desenho com a Sofia antes. Depois vem
o financeiro.

## Regras pra quem trabalha no painel (resumo da seção 0)

- Numa tarefa do painel, mexe **só no painel**: a pasta `painel/` e este arquivo (mais as 3 linhas
  da raiz que a tarefa #350 manda mudar). Se precisar mexer fora disso, avisa a Sofia antes. (Desde
  19/10/2026 os três da equipe trabalham no programa das lojas; ver a seção 0.)
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

**O que tem (tudo de exemplo)**: a vista de cima, escura, com o visual da Sala; 6 salas (Programa das lojas, Painel, Próximos projetos, Fiscal
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
| Próximos projetos | `#B9A3F0` (lilás) | 8,7:1 / 7,9:1 |
| Fiscal e contabilidade | `#7FCBC0` (verde-água) | 10,2:1 / 9,3:1 |
| Site | `#9CCB86` (verde) | 10,3:1 / 9,3:1 |
| Equipe | `#E9B48A` (pêssego) | 10,4:1 / 9,4:1 |

**Desenho decidido pela Sofia (16/10/2026)**: as salas ficam **em roda** em volta do Cérebro (como já está); o **nome do agente
aparece no mapa**, embaixo do ponto de luz (feito em 16/10/2026; nome que não cabe no espaço da sala termina com reticências, e o nome inteiro fica na dica do ponto e na lista de texto);
as **6 cores das equipes** da tabela acima ficam como estão.

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

### Como os agentes de verdade vão funcionar (combinado com a Sofia, 16/10/2026)

Conversa de alinhamento: **o desenho está decidido, nada foi construído**. Isto vale mais que a "Recomendação (não decidida)" acima.

**O fluxo**
1. A Sofia e o Claude escrevem a tarefa, já completa (formato da equipe), e ela vai pro GitHub.
2. Ela aparece no painel. A pessoa clica em **começar**.
3. O painel leva a pessoa a uma sessão do Claude **na nuvem, no login dela**, com o **chefe da área** daquela tarefa.
4. O chefe chama os agentes específicos (cada um com as suas skills); eles devolvem o resultado **pro chefe**.
5. **A tarefa sempre termina na sessão do chefe**: PR aberto e relatório pronto, e a pessoa só revisa.

**Regras**
- **Cada pessoa gasta a própria cota.** Não existe cota juntada: o limite do Team é por pessoa. O chefe e os agentes de uma tarefa gastam a cota de **quem clicou**, e agentes em paralelo gastam proporcionalmente mais.
- **Nuvem primeiro.** Sessão no PC só pra testar o programa vendo funcionar.
- **O chefe só encerra com PR aberto e relatório**, dizendo o que cada agente fez. Se a cota acabar no meio, grava **onde parou** na descrição do PR ou na tarefa, pra outra sessão retomar. Nunca mescla, nunca publica (regra da equipe, seção 0).
- **A pessoa decide.** Nada executa sem ela mandar, e o painel só leva tarefas já escritas, nunca texto livre.
- **Evolução de skill é proposta**: o agente propõe, ela aprova. Consertar skill que falhou segue valendo na hora.
- **Plano mínimo, se o painel não abrir a sessão direto**: o painel mostra o **número da tarefa** (e o link), a pessoa abre o Claude dela, e a tarefa manda abrir o chefe.

**Pesquisa de como o painel liga a pessoa à sessão (16/10/2026, só documentação oficial da Anthropic)**

| Caminho | O que faz | Serve? |
|---|---|---|
| **Link pré-preenchido** de `claude.ai/code` | `?prompt=...&repositories=sakura-corp/sakura-system-ace&environment=...` abre o formulário já com o texto, o repositório e o ambiente. **Não envia sozinho**: a pessoa aperta Enter. A documentação cita "um botão no seu gerenciador de tarefas" como o uso previsto. | **Sim, é o 1º passo.** Cota da própria pessoa, sem credencial nenhuma no painel. Cobre também o plano mínimo: o mesmo botão mostra o número da tarefa. |
| **Rotina com gatilho de API** (`/fire`) | O painel chamaria uma rotina por HTTP. | **Não.** A rotina é da conta de quem a criou: gasta a cota dessa conta e os commits e PRs saem no nome dela. Quebra o "cada um gasta a sua". |
| **Remote Control** | Controla do celular ou navegador uma sessão que já roda num PC. | **Não pra isso.** Quem inicia é a pessoa, no PC; não há API pra abrir de fora. |
| **`claude -p "..." --cloud <sessão>`** | Manda mensagem pra sessão que já existe, pelo terminal. | Útil depois, mas pede o CLI e o login da pessoa: não sai do navegador. |
| **Projetos** do Claude Code | Uma conversa que coordena várias sessões em paralelo e junta o resultado (parecido com chefe + agentes). | **Ainda não:** beta só em Pro e Max, **não está no Team**. Reavaliar quando chegar. |

**Chefe e agentes**: o jeito mais simples e que já existe é o chefe usar **subagentes dentro da própria sessão** (mesma cota, mesma máquina, o resultado volta pro chefe sozinho). Sessões separadas só se uma tarefa precisar. Os "agent teams" são experimentais e vêm desligados.

**A conferir quando ela assinar o Team (segunda, 19/10)**
- **O assento precisa incluir Claude Code** (a documentação manda o Owner atribuir um assento que inclua; a página dos assentos premium cita o Claude Code como parte do premium). Conferir o que o assento padrão inclui antes de convidar a equipe.
- O Owner liga o conector do GitHub (Configurações da organização, Conectores) e, se quiser, o "Quick setup"; **cada pessoa** conecta o próprio GitHub e cria o ambiente `Default`.
- Se liga os **créditos de uso** (custo extra quando a cota acaba).
- Reler a Política de Uso e a página de limites: a regra de sessão automática já mudou de planos antes.

**Próximo passo: FEITO em 17/10/2026** (branch `chefes/botao-comecar`): botão **"Começar com o Claude"** no cartão da tarefa.
Os chefes são **por função, 5**: `frontend`, `backend`, `seguranca`, `marketing`, `tester` (decidido pela Sofia em 17/10).
A tarefa ganha a etiqueta `chefe:<função>` no GitHub (as etiquetas **ainda não existem**: criar é com ela); sem etiqueta, ou com função
desconhecida, o texto manda o Claude perguntar à pessoa qual chefe usar. **Em aberto**: as skills `chefe-<função>` (outra sessão cuida);
sem elas o chefe não é achado; e o botão **ainda não foi testado com o login dela** (a consulta nova foi conferida contra o esquema público do GitHub, não rodou de verdade).

**Modelo único de tarefa e sessão mãe (rascunho de 17/10/2026)**: toda tarefa que o botão abre segue `docs/tarefas.md` (cabeçalho fixo `Chefe:`, `Ajudantes:`, `Estimativa:`, `Depende de:`, `Sessões filhas:`) e o ritual da skill `ritual-de-tarefa`. Provado em 17/10: uma sessão consegue abrir outra já no modelo escolhido e receber mensagem dela; uma sessão aberta num modelo sem crédito (Fable) aparece como **falhou**, com o motivo, em segundos. Pro painel ler o cabeçalho (mostrar chefe e estimativa, desligar o botão com `Depende de` aberto, avisar "tarefa incompleta"): é a tarefa #536 (leva 1).

**Pra quem fizer a #352 (publicar)**: o endereço `/escritorio` só abre direto se o Worker devolver o `index.html` pra caminhos
que não são arquivo (no `wrangler.jsonc`, `assets.not_found_handling: "single-page-application"`). Hoje o `npm run dev` e o
`npm run preview` já fazem isso sozinhos.

## O Financeiro (#654)

- **Onde mora o dinheiro**: no **Cloudflare D1** `FINANCEIRO` (decisão #652), **nunca no GitHub**. No repositório só ficam
  a estrutura (`painel/migrations/0001_financeiro.sql`: as tabelas `categorias` e `lancamentos`, e as seis categorias
  iniciais) e o código. Valor sempre em **centavos inteiros**; o banco recusa zero, negativo, quebrado, tipo errado, dia
  fora do formato `AAAA-MM-DD` e categoria que não existe.
- **Quem vê o quê (o corte é no worker, `painel/worker/financeiro.ts`)**:
  - Todo mundo que entrou no painel: `GET /api/financeiro/resumo` devolve **só os totais** (o mês, mês a mês, saídas por
    categoria do mês) e `podeLancar`. Nenhum lançamento, dia, descrição ou login sai daí, nem escondido na página.
  - Só a dona: `GET/POST /api/financeiro/lancamentos` e `PUT/DELETE /api/financeiro/lancamentos/<id>`. Os outros levam 403
    sem dado nenhum. Escrita só vindo da própria página (`Origin`).
  - **Quem é a dona** vem da variável `DONA_DO_FINANCEIRO` do `wrangler.jsonc` (o login do GitHub, sem diferenciar
    maiúscula). **Vazia ou faltando: ninguém é dona** (falha fechada). Sem o banco ligado, as rotas dizem 503.
- **A conta** (totais, mês a mês, crescimento) é a função pura `resumoFinanceiro` em `painel/src/logica/financeiro.ts`; o
  mês atual é o de São Paulo. A página fica em `/financeiro`; o DRE continua "em breve", dependendo do Financeiro.
- **Testes**: `painel/worker/financeiro.test.ts` roda o SQL num SQLite em memória (o mesmo motor do D1) com a migration de
  verdade, e a rota pelo `worker.fetch`. O painel **não tem CI**: rodar `npx tsc -b` e `npx vitest run` em `painel/` à mão.

### Ligar o banco (é da Sofia, uma vez só)
1. Na Cloudflare: **Storage & Databases → D1 SQL Database → Create**, nome `sakura-financeiro`, local automático.
2. Copiar o **Database ID** da página do banco (não é segredo) e pôr no `painel/wrangler.jsonc`, em `d1_databases`
   (`binding: "FINANCEIRO"`, `database_name`, `database_id`, `migrations_dir: "migrations"`), num PR. A variável
   `DONA_DO_FINANCEIRO` (em `vars`, o login do GitHub da dona) já está lá desde a #654; sem ela ninguém lança.
3. **Aplicar a migration** (antes de mesclar esse PR): no PC, dentro de `painel/`,
   `npx wrangler d1 migrations apply sakura-financeiro --remote` (a primeira vez pede `npx wrangler login`). Sem o PC: na
   página do banco, aba **Console**, colar o SQL **sem os comentários** e rodar. O Console junta tudo numa linha só, e
   um `--` apaga o resto dela ("No SQL statements detected"; aconteceu em 20/10). Rodar de novo não estraga nada.
   Conferir com `SELECT id, nome FROM categorias ORDER BY ordem;` (6 linhas, sem valor nenhum).
4. Mesclar: a Cloudflare publica sozinha. Abrir `/financeiro`, lançar um valor de teste, ver o total, e apagar.

**Feito em 20/10/2026**: o banco `sakura-financeiro` foi criado pela Sofia e as tabelas, aplicadas pelo Console (passos 1 a
3). Como foi pelo Console, o `wrangler` não sabe que a `0001` já rodou: se um dia alguém usar `d1 migrations apply`, ela
roda de novo, sem estragar nada (é toda `IF NOT EXISTS`/`OR IGNORE`).

## Fim de uma leva

Quando a última tarefa da leva é aprovada:
1. O Claude de quem fez a última escreve o aviso de WhatsApp pra Sofia: a leva terminou.
2. A leva **congela**: ninguém começa tarefa nova.
3. **Todo mundo testa** o que a leva entregou, com a lista de testes que o Claude da Sofia manda.
   O que parecer estranho vira uma issue nova (com print), e a Sofia decide o que fazer.
4. O Claude da Sofia escreve o **relatório da leva**, a Sofia aprova, e os dois planejam a
   próxima. Até as tarefas dela aparecerem, não tem tarefa pra pegar.
   O relatório segue o modelo de cinco partes de **`docs/relatorios/modelo-leva.md`**: é o arquivo
   `docs/relatorios/leva-N.md`, num PR, e aprovar é a Sofia mesclar. O painel mostra ele em
   `/leva/N/relatorio` (#647).

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
| `npm run dev:worker` | roda a página **e** o worker juntos (`wrangler dev`), em `http://localhost:8787`, do jeito que fica na Cloudflare. Precisa de um `npm run build` antes, porque ele serve a pasta `dist`. `http://localhost:8787/api/saude` responde `{"ok":true}` |

**No ar**: **https://sakura-painel.caranovavidanova.workers.dev** (o Início, desde a #546), mais `/leva` (a leva
atual), `/leva/<n>`, `/sala`, `/sala?tv`, `/escritorio`, `/em-breve/<id>` e `/api/saude`. Quem publica é a Cloudflare, sozinha, a cada mudança em `painel/` na `main`
(não existe script de publicar). O que ela usa está em `painel/wrangler.jsonc`: o worker
(`painel/worker/index.ts`) só responde `/api/*`; o resto é a página, e caminho que não é arquivo recebe o
`index.html`.

- **No Windows (PowerShell)**, se aparecer *"a execução de scripts foi desabilitada neste
  sistema"*, trocar `npm` por **`npm.cmd`** em todos os comandos (ex: `npm.cmd run dev`). Não
  precisa mexer na trava de segurança do Windows.
- O **Vitest está fixo na versão `4.1.10`**, inclusive em `overrides`. Não trocar por `^4...`:
  um complemento opcional dele puxa o Vitest 5, e o `npm install` quebra com o erro
  `Cannot read properties of null (reading 'edgesOut')`.
- **O login no PC** (#353): o `npm run dev` sozinho não tem worker, então mostra o painel de exemplo
  sem login. Pra testar o login de verdade, use o `npm run dev:worker` com o app **de teste** e um
  arquivo `painel/.dev.vars` (o Git já ignora ele; **nunca** colar o conteúdo em tarefa, PR ou
  conversa). Ele tem três linhas, no formato `NOME=valor`:
  - `GITHUB_APP_CLIENT_ID=`, o Client ID do "Sakura Painel (teste)" (troca o do app de verdade,
    que está no `wrangler.jsonc`);
  - `GITHUB_APP_CLIENT_SECRET=`, o client secret do app de teste, que a Sofia manda pelo Bitwarden Send;
  - `CHAVE_DA_SESSAO=`, uma senha qualquer **sua**, de 32 caracteres ou mais (letras e números),
    gerada no Bitwarden. Não precisa ser a da Cloudflare, e não deve.

  Sem esse arquivo, o `npm run dev:worker` mostra a tela de entrada, e o botão responde "login não
  configurado". Pra testar o tempo real no PC, uma quarta linha: `GITHUB_WEBHOOK_SECRET=` (uma senha **só
  de teste**, nunca a de verdade); sem ela, `/api/webhook` responde 503.

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
- **16/10/2026, à noite**: **tarefa 4 (#352) feita: o painel está no ar.** PR #488, mesclado pela Sofia pelo celular. A
  Cloudflare publicou sozinha, e a Sofia conferiu no celular: `/api/saude` responde `{"ok":true}`, e `/sala`, `/sala?tv` e
  `/escritorio` abrem direto. **A próxima é a tarefa 5 (#353, login)**, que depende da Sofia criar os dois GitHub Apps (ver
  "O que a Sofia faz").
- **16/10/2026, mais tarde**: **app de login criado** pela Sofia: o GitHub App **"Sakura Painel"** da `sakura-corp`
  (Client ID `Iv23liveky5fWf6C7oO2`, que não é segredo e está no `wrangler.jsonc`), com as permissões da #353
  (Actions, Contents, Pull requests e Metadata só leitura; Issues leitura e escrita; Members da organização só
  leitura), "Expire user authorization tokens" ligado, webhook desligado, instalado **só** no `sakura-system-ace`.
  Redirect URI: `https://sakura-painel.caranovavidanova.workers.dev/api/login/volta`. Os segredos
  `GITHUB_APP_CLIENT_SECRET` e `CHAVE_DA_SESSAO` estão na Cloudflare (só em Production) e no Bitwarden dela. A chave
  privada que o GitHub exige pra instalar foi gerada e apagada: o painel não usa. **O app de teste não foi
  criado** (a Sofia testa sozinha no endereço público, por enquanto); ver "O que a Sofia faz".
- **16/10/2026, à noite**: **tarefa 5 (#353), o login, feita pela Sofia com o Claude dela** (PR #490, mesclado; a
  Sofia entrou, saiu e entrou de novo no endereço público). **A tarefa 6 (#354) já pode começar.** O worker ganhou
  `/api/login`, `/api/login/volta`, `/api/eu` e `/api/sair` (`painel/worker/sessao.ts` e `github.ts`); a página
  mostra a tela de entrada pra quem não entrou, e a foto, o nome e "Sair" no canto da barra lateral. Ao renovar o
  token (a cada 8 h), o worker confere de novo se a pessoa ainda é da `sakura-corp`. **Pra #354**: toda rota com
  dados passa por `sessaoAtual()`, e devolve os `cookies` dela na resposta. Cuidado com duas chamadas ao mesmo
  tempo com o token vencido: o GitHub aceita cada `refresh` uma vez só, e a segunda derruba a sessão (fazer a
  página pedir `/api/eu` antes das outras resolve).
- **16/10/2026, mais tarde à noite**: **tarefa 6 (#354), as tarefas de verdade, feita pela Sofia com o Claude dela** (PR
  #492, mesclado; **testado por ela no endereço público**: a `leva-0` de verdade, 6 feitas e 2 livres). O worker ganhou `/api/levas` (as etiquetas `leva-N`, com quantas tarefas abertas cada uma
  tem, e qual é a atual) e `/api/leva/<n>` (uma consulta GraphQL; devolve no formato `Tarefa`), em `painel/worker/tarefas.ts`.
  As regras (estado, estimativa, leva atual) estão em `painel/src/logica/estado.ts`; a busca da página, em
  `painel/src/logica/dados.ts`, pede **uma rota depois da outra**, sempre depois do `/api/eu` (o `refresh` vale uma vez só).
  A leva atual abre em `/`; as outras em `/leva/<n>`, pela barra lateral. Se o GitHub recusar o token (401), a sessão é
  apagada e a página mostra "Sua sessão acabou". As consultas foram conferidas contra o esquema público do GitHub, mas
  **só rodaram de verdade no endereço público**, com o login dela. A Sala e o Escritório continuam de exemplo. **A tarefa 7
  (#355) depende da Sofia ligar o webhook** (ver "O que a Sofia faz").
- **16/10/2026, mutirão (branch `mutirao/painel-pequenos`)**: dois pequenos do "Onde parou". **(1) "Sair" com nome comprido**:
  reproduzido renderizado (320 px): o nome empurrava o "Sair" pra linha de baixo e ainda alargava a barra lateral. Agora o
  nome encolhe com reticências (com o nome inteiro na dica) e o "Sair" não encolhe nem desce; a mensagem "Não deu pra sair"
  ficou numa linha própria. **(2) Nome do agente no mapa do Escritório**, embaixo do ponto de luz (regra `abreviarNome`
  em `painel/src/logica/escritorio.ts`). Os dois testes novos foram vistos reprovar. Não mexi na regra de "issue fechada
  como não planejada" (pergunta pendente da Sofia), nem na #355 e #468.
- **17/10/2026, botão "Começar com o Claude"** (branch `chefes/botao-comecar`, PR aberto, **esperando a revisão da Sofia**). A
  regra é uma função pura, `painel/src/logica/comecarComClaude.ts`: monta `https://claude.ai/code?prompt=...&repositories=sakura-corp/sakura-system-ace`,
  **sem** `environment` (é de cada pessoa) e **sem texto livre**: o único dado variável é o número da tarefa (inteiro positivo; outro
  valor não gera link). O formato do link foi **conferido na documentação oficial** (`code.claude.com/docs/en/web-quickstart`, seção
  "Pre-fill sessions": `prompt`, `repositories`, `environment`; não envia sozinho). O worker (`painel/worker/tarefas.ts`) passou a pedir
  `labels(first: 30) { nodes { name } }` e devolve só `chefe` (uma das 5 funções), nunca a lista de etiquetas. A consulta foi validada
  com o pacote `graphql` contra `@octokit/graphql-schema` (e reprova com um campo errado). O botão abre em aba nova com
  `rel="noopener noreferrer"`, só pra endereço que passe `linkDoClaude()` (`claude.ai/code`), e não aparece em tarefa feita. Sem chave
  nova, sem rota nova, sem credencial. Testes novos **vistos reprovar** (sem codificar, número sem validar, chefe desconhecido
  aceito, `environment` no link, texto sem corte, botão em tarefa feita). Olhado renderizado em 320 px e 1000 px, claro e escuro:
  contraste do botão 5,86 (claro) e 6,65 (escuro), sem rolagem lateral. O cartão deixou de ser um link só: o título leva ao GitHub e o botão é um
  segundo link ao lado (um link dentro de outro não vale). **Observação**: em 1000 px o botão toma espaço e títulos longos ficam cortados
  (o nome inteiro está na dica).
- **17/10/2026, defeito: o link pode abrir o Claude sem a mensagem + plano B "Copiar texto"** (branch `chefes/copiar-texto`, PR aberto,
  **esperando a revisão da Sofia**). **O defeito**: a Sofia, no celular, tocou em "Começar com o Claude", o Claude abriu e **nenhuma
  mensagem apareceu no campo**. O formato do link está certo segundo a documentação oficial (`code.claude.com/docs/en/web-quickstart`,
  "Pre-fill sessions": `prompt` e `repositories`), então a causa provável é o app do Claude no celular (ou um redirecionamento de
  login) abrir o endereço **sem levar os parâmetros**. **Causa CONFIRMADA pela Sofia, no aparelho dela (17/10)**: o link **funciona aberto pelo navegador do celular** (o texto aparece no campo); só falha quando abre pelo **app do Claude**, que ignora os parâmetros. **Jeito recomendado no celular**: abrir pelo navegador (Safari/Chrome) ou usar "Copiar texto". Não dá pra reproduzir daqui; a confirmação veio dela. **Plano B**: ao
  lado do botão, **"Copiar texto"**, que copia o **mesmo texto** que o link leva (`textoDaTarefa()`, a mesma regra de chefe/etiqueta;
  o link passou a usar a mesma função, e um teste decodifica o `prompt` do link e compara). Depois de copiar, o botão mostra "Copiado"
  por 4 segundos (e avisa o leitor de tela). Se a área de transferência não existir ou for recusada (`copiarTexto()`, em
  `painel/src/logica/copiarTexto.ts`), aparece o texto num campo já selecionado, pra copiar à mão. Em tarefa feita não aparece nenhum
  dos dois. Em tela estreita (celular) aparece também uma dica curta: "No celular, se o texto não aparecer, abra pelo navegador ou use Copiar texto." **O formato do link não mudou.** Os botões têm 44 px de altura e ficam numa linha própria **abaixo do título** (em 1000 px
  os dois botões lado a lado espremiam o título; agora ele volta a aparecer inteiro). Olhado renderizado em 320 px e 1000 px, claro e
  escuro, copiando com sucesso e com falha: sem rolagem lateral. Testes novos **vistos reprovar** (texto copiado diferente, falha que
  não cai no plano B, texto do link diferente do copiado, botão em tarefa feita). **Ainda não provado**: que "Copiar texto" funciona
  no celular dela (a área de transferência do celular não foi testada; o caminho pelo navegador já foi).
- **17/10/2026, webhook ligado** (pela Sofia, no PC, guiada pelo Claude): no GitHub App "Sakura Painel" o webhook
  foi ligado em `https://sakura-painel.caranovavidanova.workers.dev/api/webhook`, com os eventos Issues, Pull
  request, Label, Workflow run, Push, Create e Delete e um segredo gerado no Bitwarden. O mesmo segredo está na
  Cloudflare como `GITHUB_WEBHOOK_SECRET` (Secret, só em Production). **A tarefa 7 (#355) já pode começar.**
  O primeiro "ping" do GitHub volta com erro até a #355 entrar na `main` (a rota ainda não existia): esperado.
- **17/10/2026, tarefa 7 (#355), tempo real, feita pelo chefe de backend** (branch `claude/serene-goodall-en04xq`,
  PR aberto, **esperando a revisão da Sofia**). Como funciona está em "Decisões técnicas". Arquivos:
  `painel/worker/webhook.ts` (assinatura e escolha dos eventos), `painel/worker/sala.ts` (o Durable Object),
  rotas `/api/webhook` e `/api/tempo-real` em `painel/worker/index.ts`, `wrangler.jsonc` (binding `SALA` e a
  migration `new_sqlite_classes`), e na página `painel/src/logica/tempoReal.ts`, `useTempoReal.ts` e o ponto
  "ao vivo" na barra lateral. Testes novos **vistos reprovar** (14 quebras de propósito, todas pegas). Rodado
  de verdade no `wrangler dev` (workerd com a sala real): dois painéis recebem o aviso assinado, assinatura
  errada leva 401 e ninguém recebe. Num navegador de verdade a página mudou sozinha em ~1,4 s, juntou 3 avisos
  em 1 busca, ignorou `push`, mostrou "reconectando…" com o servidor fora e voltou a "ao vivo". **Falta ver**:
  o teste do "Pronto quando" com o GitHub de verdade (dois navegadores, pôr o nome numa tarefa), só possível
  depois de publicar. A primeira publicação com o Durable Object aplica a migration `v1` sozinha.
- **17/10/2026, tarefa 7 (#355) mesclada (PR #531) e testada ao vivo pela Sofia**: com o painel aberto em dois navegadores,
  pôr o nome dela na #468 e tirar mudou os dois em 4 a 5 segundos, sem recarregar, e o "ao vivo" ficou verde nos dois. Em
  "Recent Deliveries" do app, todas as entregas depois da publicação voltaram verdes; as vermelhas são de antes (a rota
  `/api/webhook` ainda não existia). Assinatura errada recusada (401) só foi provada no teste local. **A tarefa 8 (#468) já
  pode começar.**
- **17/10/2026, tarefa 8 (#468), a sala de verdade, feita pelo chefe de frontend** (branch `claude/tarefa-468-chefe-9viy7r`, PR aberto,
  **esperando a revisão da Sofia**). De onde vem cada bonequinho está em "Decisões técnicas" ("A Sala de verdade"). Arquivos:
  `painel/worker/dadosDaSala.ts` (as três buscas), rota `GET /api/sala` em `painel/worker/index.ts`, `buscarRest` em `github.ts`; na página,
  `src/logica/salaDados.ts` e `src/useSala.ts` (a busca), `avisoDaSala` e `textoDaConexao` em `src/logica/tempoReal.ts`, a Sala em
  `src/componentes/sala/Sala.tsx` (esqueleto, aviso de grupo que falhou, foto do GitHub, linha de conexão). Testes novos **vistos reprovar**
  (14 quebras de propósito, todas pegas). **Olhado renderizado** no Chromium com o GitHub e o WebSocket simulados (fotos
  `docs/referencia/fotos-painel/sala-468-*.png`): branch novo apareceu em ~1,3 s e saiu em ~1,3 s sem recarregar; com a "internet" derrubada
  a linha foi a "reconectando…" e, depois de 2 min, a "desatualizado há 2 min", e voltou a "ao vivo" sozinha; grupo que falha mostra o aviso e
  o "Tentar de novo"; celular de 375 px sem rolagem lateral. **Falta ver com o GitHub de verdade** (só possível depois de publicar): as três
  buscas com o login dela, o `current_user_can_approve` numa rodada esperando de verdade (Liberar/Publicar/Atualizar bancos) e um branch
  `claude/` novo aparecendo pelo webhook. Se o webhook `create` chegar antes de a API do GitHub enxergar o branch, a sala só o mostra na
  próxima busca (até 2 min, ou no próximo aviso). Pelo que consigo ver, o app "Sakura Painel" já tem as permissões que as buscas pedem (Actions
  e Contents lidos, Pull requests lidos); se alguma busca vier com "não consegui ler isto do GitHub" no endereço público, é por aí que se confere.
- **17/10/2026, leva 0 terminada**: a tarefa 8 (#468) entrou pelo PR #533, e as 8 tarefas da leva 0 estão feitas. Daqui em diante, toda tarefa segue o **modelo único** de `docs/tarefas.md` (cabeçalho com `Chefe:`, `Ajudantes:`, `Estimativa:`, `Depende de:`, `Sessões filhas:`) e o ritual da skill `ritual-de-tarefa`. A leva 1 é montada pela skill `nova-tarefa`, com a Sofia aprovando os rascunhos.
- **17/10/2026, leva 1 montada** (a Sofia escolheu a opção enxuta e aprovou os rascunhos): **#536** o cartão lê o cabeçalho (5 h),
  **#538** pegar e largar tarefa (6 h, depende da #536), **#539** horas por pessoa (3 h), e do programa **#510** janelas de
  importação no Modal (3 h), **#511** testes no Windows (2 h) e **#455** clientes que sumiram (6 h). Total 25 h, todas no modelo
  único, com `leva-1` e `chefe:`. Decidido junto: o "Começar com o Claude" aparece só pra quem pegou a tarefa; horas por pessoa
  contadas na leva; na #455, 6 meses e o texto padrão da issue. **Fases da leva** e **relatório e aprovação** ficaram pra leva 2.
  **A #536, a #539 e as três do programa já podem começar; a #538 espera a #536.**
- **17/10/2026, à noite: painel v2 planejado, nada construído** (branch `claude/painel-v2-planejamento`, PR aberto). Pedido dela: organizar as abas, deixar mais claro e profissional e adiantar as abas das funções futuras. O
  retrato de hoje, a nova organização (cinco grupos: Início; Trabalho; Equipe; Empresa; rodapé, com os "em breve" dizendo do que
  dependem) e as perguntas estão em `docs/rascunhos/painel-v2.md`; as referências em `docs/referencia/painel-v2/referencias.md`; três
  versões visuais com dados de exemplo em `docs/referencia/painel-v2/versao-a|b|c/` (todas conferidas: contraste AA, sem rolagem lateral);
  e 8 rascunhos de tarefa (V2-1 a V2-8, 32 h) em `docs/rascunhos/painel-v2-tarefas.md`, **sem issue criada**. **Escolhido pela Sofia em 17/10, de
  madrugada: versão A, com o celular da B (barra fixa embaixo); a `/` vira o Início; aba Lojas em breve; nome "Sakura Corp"; quadro
  depois; as tarefas entram na leva 2.** Falta ela aprovar os rascunhos antes de virarem issue. As tarefas que mexem no cartão e na tela da leva esperam a #536, a #538 e a #539. **Nenhuma linha de `painel/` mudou.**
- **17/10/2026, madrugada: as 8 tarefas do painel v2 viraram issues** (aprovadas pela Sofia): **#542** barra lateral nova (4 h),
  **#543** celular com a barra embaixo (3 h), **#544** páginas "em breve" (3 h), **#545** cabeçalho de página (2 h), **#546** Início
  (6 h), **#547** a leva redesenhada (6 h), **#548** levas anteriores (4 h), **#549** "O que mudou hoje" (4 h). Total 32 h, todas no modelo
  único, com `chefe:`. **Ainda sem `leva-2`**: o painel mostra como atual a maior leva com tarefa aberta (`levaAtual()`, em
  `painel/src/logica/estado.ts`), então pôr a etiqueta agora tiraria a leva 1 da tela. **Quando a leva 1 terminar, pôr `leva-2` nas 8.**
- **17/10/2026, #539 horas por pessoa: feita** (PR #552, mesclado pela Sofia em 17/10). A tela da leva ganhou o quadro "Horas por pessoa":
  login, horas entregues (tarefas feitas), horas segurando (em andamento ou em revisão) e "N sem estimativa" quando houver, contadas
  na leva pela linha `Estimativa:` de cada tarefa. Tarefa sem dono não entra. O contador antigo não mudou. Olhado em 320 e 1000 px,
  claro e escuro, sem rolagem lateral. Relatório em `docs/relatorios/2026-10-17-tarefa-539-frontend.md`.
- **17/10/2026, #536 o cartão lê o cabeçalho: feita** (PR #553, mesclado pela Sofia em 17/10). O cartão mostra chefe e ajudantes numa
  linha própria. Com um número do `Depende de` ainda aberto, o botão aparece desligado com "Espera #N" (sem o "Copiar texto"); sem as
  cinco linhas do cabeçalho, "tarefa incompleta". O worker faz uma consulta só pros números de fora da leva, montada só com inteiros
  validados (no máximo 50); se ela falhar, contam como abertos e a leva sai igual. Dependência só libera quando foi **fechada como
  concluída** (Sofia, 17/10; "não planejada" ou duplicada continua "Espera #N"). Tarefa incompleta mostra o que falta à vista. Relatório em
  `docs/relatorios/2026-10-17-tarefa-536-frontend.md`. **Depois que entrar na `main`, a #538 pode começar.**
- **17/10/2026, #538 pegar e largar tarefa: PR aberto, esperando a revisão da Sofia.** Rotas `POST /api/tarefa/<n>/pegar` e
  `/largar` no worker, que só aceitam pedidos vindos da própria página (`Origin`), com sessão e número válido, e conferem tudo de
  novo no GitHub na hora (leva atual, dono, cabeçalho, dependências, "uma por vez"), escrevendo só o login de quem pediu. As regras
  olham todos os responsáveis da issue (até 10). Corrida com outra pessoa: quem chegou depois sai. Duas abas da mesma pessoa: ela
  fica só com a tarefa de número menor. Se a saída falhar, o aviso diz. No cartão: "Pegar tarefa" na livre (desligado com o motivo
  quando não dá); "Começar com o Claude", "Copiar texto" e "Largar" (com "Largar mesmo?") só pro dono. Numa recusa, o painel busca
  a leva de novo e o motivo acompanha o cartão (Sofia, 17/10). Olhado e clicado em 320 e 1000 px, claro e escuro. Relatório em
  `docs/relatorios/2026-10-17-tarefa-538-backend.md`. **A Sofia confere depois de publicar**: pegar uma tarefa no endereço
  público, tentar pegar uma segunda, e largar.
- **17/10/2026, tarde: o painel v2 (#542 a #546) começa já, sem esperar a leva 1** (decisão da Sofia). As cinco tarefas são
  feitas por ela com o Claude: uma sessão coordenadora abre uma sessão por tarefa, na ordem #542 → #543 e #544 juntas → #545 →
  #546, e ela mescla cada PR antes de a próxima começar. **Elas não levam etiqueta de leva**: com `leva-2`, o painel passaria a
  mostrar a leva 2 como atual (`levaAtual()`) e a leva 1 sumiria da tela. A leva 1 continua com a equipe a partir de segunda
  (19/10): #510, #511 e #455, uma por pessoa; nenhuma delas mexe em `painel/`. **Só a #547, a #548 e a #549 ficam pra leva 2**, e a
  etiqueta entra quando a leva 1 fechar.
- **17/10/2026, #542 a barra lateral nova: PR aberto, esperando a revisão da Sofia.** Cinco grupos no visual da versão A, ícone
  em todo item, o item atual com fundo suave e uma barrinha rosa (acabou o bloco rosa cheio). Em breve, apagados e sem abrir
  página ainda (é a #544): Início (#546), Levas anteriores (#548), Versões, Fases e Relatório da leva, Pessoas,
  Financeiro, DRE, Lojas e Configurações. Só a leva atual aparece no grupo Trabalho; quem abre uma leva antiga
  (`/leva/0`) vê ela logo abaixo, marcada como a página atual. No celular a barra continua um bloco no topo, só com os
  itens que existem, até a #543. A tela de entrada diz "Painel da Sakura Corp". Relatório em
  `docs/relatorios/2026-10-17-tarefa-542-frontend.md`. **A Sofia confere depois de publicar**: a barra nova com o login
  dela, e o "ao vivo" verde.
- **17/10/2026, #544 as páginas "em breve": PR aberto, esperando a revisão da Sofia.** Cada item em breve da barra
  agora é um link (apagado, com cadeado e a frase do que falta) pra `/em-breve/<id>`. A página diz o que vai ter ali,
  do que depende e qual tarefa cuida, quando há uma. Os textos ficam em `painel/src/logica/emBreve.ts`, e um teste
  confere que todo item em breve tem página. Financeiro, DRE e Lojas avisam que dinheiro (e nome de cliente) nunca
  mora no GitHub e não têm **algarismo nenhum**: o teste reprova qualquer número. Endereço desconhecido mostra
  "Página não encontrada". A Sofia autorizou mexer no `BarraLateral.tsx` pra virar link. Relatório em
  `docs/relatorios/2026-10-17-tarefa-544-frontend.md`. **A Sofia confere depois de publicar**: clicar em "Financeiro"
  abre a página que explica.
- **17/10/2026, #543 a navegação do celular: mesclada (PR #558).** Abaixo de 768 px a barra lateral
  some e aparece uma barra fixa embaixo: Início, Leva, Sala, Pessoas e Mais, lidos da lista da #542 (Início e Pessoas
  apagados, em breve). O "Mais" abre uma folha que sobe de baixo com o resto da lista (inclusive os em breve, com a frase
  do que falta), o "ao vivo" e o "Sair"; fecha com "Fechar", Esc ou toque no fundo, prende o foco e devolve ele ao "Mais".
  O conteúdo ganhou espaço no fim pra barra não cobrir nada; no `/sala?tv` não tem barra. Olhado em 320 e 375 px, claro e
  escuro. Relatório em `docs/relatorios/2026-10-17-tarefa-543-frontend.md`. **A Sofia confere depois de publicar**: no
  celular dela, a barra aparece embaixo e o "Mais" abre e fecha.
- **17/10/2026, #545 o cabeçalho de página: mesclado (PR #559).** A Sala, o Escritório e as
  páginas "em breve" começam igual: trilha ("Equipe / Sala"), título grande em serifa, uma linha de explicação e as
  ações à direita (`painel/src/componentes/CabecalhoDaPagina.tsx`, desenho da versão A). Na Sala a ação é "Modo TV";
  o `/sala?tv` continua sem cabeçalho. Um teste confere um só `<h1>` por página. Com autorização da Sofia, na
  janela da Sala (`Sala.tsx`) o título virou "Agora" (`<h2>`) fora do modo TV, como na referência. Relatório em
  `docs/relatorios/2026-10-17-tarefa-545-frontend.md`. **Depois de publicar**: nada pra conferir.
- **17/10/2026, #546 a página Início: mesclada (PR #563).** A `/` agora é o Início ("o que é
  meu"): "Precisa de você", com a mesma regra da Sala (`montarSala()`, então os dois sempre batem); "A sua tarefa",
  com os botões da #538 (Começar com o Claude, Copiar texto, Largar); e a leva atual em uma linha. A leva atual mudou
  pra `/leva` (`/leva/<n>` continua igual), e o "Início" da barra deixou de ser "em breve". A junção mora em
  `painel/src/logica/inicio.ts`; a página escuta os mesmos avisos de tempo real da Sala. Fora da lista da issue, com
  autorização da Sofia (17/10, pela coordenadora): a navegação (`navegacao.ts`, `emBreve.ts`, as duas barras, a página "em breve") e o
  `export` do cartão de tarefa em `ListaDeTarefas.tsx`. Relatório em `docs/relatorios/2026-10-17-tarefa-546-frontend.md`.
  **A Sofia confere depois de publicar**: com o login dela, o Início mostra o mesmo "precisa de você" da Sala.
  Sobras das tarefas anteriores viraram a #560 ("Leva atual" marcada numa página "em breve" que não existe) e a #561
  (área segura do iPhone na barra de baixo).
- **18/10/2026**: **acabamentos dos andares (#601, com a #560 e a #561)**: a barra do PC rola só a
  lista dos andares, e Configurações e o usuário ficam sempre à vista; na folha "Mais" do celular,
  Configurações ganhou uma linha de separação da Cobertura; as duas linhas "Quem cuida" viraram uma
  só, com os chefes por área em português; `/em-breve/<id que não existe>` não marca item na barra
  (#560); e a meta `viewport` tem `viewport-fit=cover`, com as áreas seguras dos lados (#561).
- **19/10/2026, noite: a leva 2 montada** (Sofia aprovou os rascunhos de `docs/rascunhos/leva-2-painel-tarefas.md`). Além da
  #547, #548 e #549: **#644** a fase de cada leva (5 h), **#645** as fases na tela (4 h), **#646** a fase Testando (4 h), **#647** a
  página do Relatório e o modelo de cinco partes (5 h), **#648** Decisões da Sofia (3 h), **#649** Versões (4 h), **#650** Pessoas (3 h).
  **Fases e Relatório** (entrevista com a Sofia): Montando, Trabalhando, Testando, Relatório, Aprovada, lidas sozinhas do GitHub;
  o relatório é `docs/relatorios/leva-N.md` num PR, e aprovar é ela mesclar; defeito do teste nasce com a etiqueta `defeito` (criada
  em 19/10), sem `leva-N`; **a leva atual passa a ser a mais antiga ainda não aprovada** (#644), e a seguinte fica em Montando. A
  leva 0 é "antes das fases"; a leva 1 estreia as fases. **Até a leva 2 fechar, o programa das lojas não ganha tarefa nova**
  (a #510 e a #455 terminam com quem está nelas). A `leva-2` entra quando a leva 1 fechar.
- **19/10/2026, fim da noite: a `leva-2` posta** (Sofia, depois de uma entrevista sobre a ordem até o fim do mês): as 10 do
  painel (#644 a #650, #547 a #549) mais o **financeiro (#654)**, no Cloudflare D1 (decisão #652). A regra "o programa espera
  a leva 1 fechar" caiu. Como o painel abre na maior leva com tarefa aberta, **quem ainda tem tarefa da leva 1** (os cadernos
  #618 e #619, a #510 e a #455) entra por `/leva/1`. Depois da leva 2, o painel para e vem o programa das lojas (a leva 3:
  #653, #379, #655, #656).
- **19/10/2026, mais tarde: as outras levas na barra lateral** (pedido da Sofia: com a leva 2 posta, a leva 1 sumiu da
  tela e ninguém via as 4 tarefas abertas dela). A barra do PC e a folha "Mais" do celular listam as outras levas logo
  abaixo de "Leva atual", da mais nova pra mais velha, com "(N abertas)" quando ainda têm tarefa. É um atalho até a
  página das levas (#548), que continua na leva 2 com o resumo (total, horas, quando terminou).
- **20/10/2026: as outras levas saíram da barra lateral** (Sofia: "agora que tem a aba Levas anteriores, não precisa
  mais"). A barra do PC e a folha "Mais" mostram só "Leva atual" e "Levas anteriores"; numa leva antiga (`/leva/1`), o
  destaque vai pras "Levas anteriores" (`paginaDestacada()`, em `BarraLateral.tsx`).
- **19/10/2026, mais tarde: dá pra pegar tarefa de leva anterior** (Sofia): com a leva 2 posta, as tarefas abertas
  da leva 1 apareciam com o botão desligado ("não está na leva atual"). A regra agora é `levaAceitaPegar()`
  (`painel/src/logica/estado.ts`): a atual, ou uma anterior que ainda tem tarefa aberta. O worker lê todas as levas
  abertas pra decidir, e a "uma por vez" vale entre elas.
- **20/10/2026: a `leva-3` espera a leva 2 fechar** (Sofia). Na conferência do dia, nenhuma tarefa das levas 1 e 2 tinha
  dono: a leva 1 com 4 abertas (#618, #619, #510, #455) e a leva 2 com as 11. Como o painel abre na maior leva com tarefa
  aberta (`levaAtual()`), pôr a `leva-3` agora tiraria a leva 2 da tela. As quatro tarefas (#653, #379, #655, #656) já estão
  no modelo único; **a etiqueta entra quando a leva 2 fechar.**
- **20/10/2026: a tela da leva redesenhada na versão A (#547, PR #663 do Tiago, mesclado; conferido pela Sofia no endereço público em 20/10).** O contador
  numa faixa só com a barra dentro, "Horas por pessoa" como cartão (com barrinha só de desenho), a lista compacta (uma
  linha por tarefa; no computador, colunas Nº/Tarefa/Estado/Chefe/Quem/Horas) e o `CabecalhoDaPagina` (#545). "Pegar
  tarefa" fica na coluna Quem e em contorno: o rosa sobrou só no "Começar com o Claude" de quem olha. A dica do celular
  aparece uma vez na tela da leva (o Início continua com a dele). Os grupos por estado viraram uma lista só, na mesma
  ordem. Nenhuma regra mudou. Fotos: `docs/referencia/fotos-painel/leva-547-*`.
- **20/10/2026, Levas anteriores (#548)**, com o Tiago (PR #664, mesclado): o item "Levas anteriores"
  deixou de ser "em breve" e abre `/levas`; o resumo de cada leva saiu numa rota separada, `/api/levas/resumo`, pra não
  pesar a barra, a Sala e o pegar (ver "Decisões técnicas"); "feitas" = fechada de qualquer jeito, como na tela da leva. O endereço
  antigo `/em-breve/levas` agora dá "Página não encontrada". Fotos: `docs/relatorios/fotos/2026-10-20-tarefa-548/`.
  **Decidido pela Sofia (20/10)**: a rota separada fica; "feitas" continua contando toda tarefa fechada; `/em-breve/levas`
  pode dar "Página não encontrada". Conferido por ela no endereço público em 20/10 (a leva 0 com 8 de 8 e a data certa).
- **20/10/2026, "O que mudou hoje" no Início (#549)**, com o Tiago (PR #666, mesclado pela Sofia em 20/10): um
  bloco novo no Início, abaixo da leva (no celular, por último), com a linha do tempo do dia (ver "Decisões técnicas").
  Mexeu também no `src/App.tsx` (buscar `/api/novidades` e os dados de exemplo), que não estava na lista da issue.
  Fotos: `docs/relatorios/fotos/2026-10-20-tarefa-549/`. Conferido pela Sofia no endereço público em 20/10.
  **Decidido pela Sofia (20/10)**: as conferências repetidas do mesmo PR viram uma linha só, a mais nova (tarefa #667,
  leva 2); o nome da conferência continua na frase.
- **20/10/2026, A fase de cada leva (#644)**, com o Tiago (PR #671, mesclado pela Sofia em 20/10; conferido por ela no endereço público): o worker diz a fase
  de cada leva (Montando, Trabalhando, Testando, Relatório, Aprovada) lendo o GitHub, em `/api/levas`, `/api/levas/resumo`
  e `/api/leva/<n>`; a leva atual passou a ser **a mais antiga não aprovada** (a leva 0 conta como aprovada), e o pegar
  recusa tarefa de leva em Montando. Sem tela. **Efeito na hora**: nenhum, porque o relatório da leva 1
  (`docs/relatorios/leva-1.md`, PR #672) entrou antes: a leva 1 ficou Aprovada, a atual continua a 2 (Trabalhando) e as 4
  abertas da leva 1 continuam pegáveis. Sem o relatório, a atual voltaria a ser a 1 e a leva 2 ficaria em Montando. As duas
  escolhas que o Tiago fez sozinho (leva vazia = Montando; "anterior com tarefa aberta aceita pegar" só pra leva aprovada)
  esperam a Sofia na #674. Limite: o Relatório olha só os 50 PRs abertos mexidos por último (100 arquivos cada).
- **20/10/2026, a leva 1 aprovada** (relatório `docs/relatorios/leva-1.md`, PR #672, mesclado pela Sofia): 5 de 9 feitas,
  18 h de 31 h. É a primeira leva com fases, mas sem a rodada de testes com lista (a fase Testando nasceu com ela já
  andando). As 4 abertas (#618, #619, #510, #455) ficam na leva 1 até a Sofia decidir (#673).
- **20/10/2026, As fases na tela (#645)**, com o Tiago (PR #688, mesclado pela Sofia em 21/10 e conferido por ela no iPhone): no topo da tela da leva,
  as cinco fases em linha (a atual acesa em rosa, as passadas em verde com ✓; no celular, só a atual e "fase N de 5"; se não
  couberem, quebram a linha, nunca cortam o nome); a leva em Montando mostra as tarefas com o aviso "esperando a aprovação da
  leva atual" (a mais antiga sem aprovação); a leva 0 só acende a Aprovada e diz "de antes das fases, sem relatório". No Início, a linha "Leva N: <fase>", que leva pra `/leva`. Na
  Sala (e no "precisa de você" do Início), com a leva atual em Relatório, o ponto da Sofia diz "relatório da leva N" e, **pra
  ela**, fica em "precisa de você" (pros outros, o ponto mostra o texto no estado normal; o "precisa" continua sendo de quem
  olha). No modo TV (`/sala?tv`) não aparece: lá a leva não é buscada.
  Também consertou a página, que jogava fora a `fase` do `/api/leva/<n>`. Mexeu fora da lista da issue em `App.tsx`,
  `sala/Sala.tsx`, `logica/dados.ts`, `logica/fases.ts` e `tipos.ts` (o porquê está no relatório). Fotos:
  `docs/relatorios/fotos/tarefa-645/`. O link do relatório abre a lista de PRs abertos (o PR exato precisaria vir do worker).
- **20/10/2026, o Financeiro (#654)**, chefe backend com ajudantes (PR desta tarefa): a página `/financeiro` com os totais e
  o gráfico mês a mês pra todos, e a lista e o formulário só pra dona (`DONA_DO_FINANCEIRO`); o corte é no worker. O banco D1
  `sakura-financeiro` foi criado e as tabelas aplicadas pela Sofia em 20/10. Mexeu fora da lista da issue, com o sim dela:
  `painel/migrations/0001_financeiro.sql`, os testes ao lado de cada arquivo novo, `App.tsx` e os testes das páginas "em
  breve"; e, sem pedir antes (no PR, o porquê), `emBreve.ts` (o texto "em breve" do Financeiro saiu) e `estilo.css` (as
  duas cores do gráfico). O DRE continua
  em breve. Relatório: `docs/relatorios/2026-10-20-tarefa-654-backend.md`. **A Sofia confere depois de publicar**: lançar um
  mês de verdade e conferir os totais; pedir pra alguém da equipe abrir e confirmar que vê só os totais.
- **20/10/2026, A fase Testando (#646)**, com o Tiago (PR aberto, esperando a revisão da Sofia): com a leva em Testando, a
  tela da leva mostra no topo, grande, o aviso **"Leva congelada: não pegue tarefa nova."**; embaixo, **"O que testar"**, o
  texto de `docs/relatorios/leva-N-testes.md` da `main` mostrado como texto puro (um `<script>` aparece escrito e não roda;
  sem o arquivo: "A lista de testes ainda não foi escrita."; passando de 20 mil caracteres, corta e avisa); e **"Defeitos
  achados"**, as issues abertas com `defeito` criadas desde que a última tarefa da leva fechou (um defeito que entrou na leva
  e fechou não conta; se a leva ficou em Montando esperando a anterior, o "desde" é esse fechamento mesmo; link só pra
  `https://github.com/sakura-corp/`; olha os 50 defeitos abertos mais novos e avisa se pode haver mais). Rota nova no worker:
  `/api/leva/<n>/testes` (`painel/worker/testes.ts`), um pedido só ao GitHub. A lista é buscada ao abrir a tela da leva
  (não muda sozinha com o tempo real). Fotos: `docs/relatorios/fotos/tarefa-646/`.
- **21/10/2026, o Relatório da leva (#647)**, com o Tiago (PR aberto, esperando a revisão da Sofia): o item "Relatório da
  leva" saiu do "em breve" e abre `/relatorio` (a leva em Relatório; sem nenhuma, a última aprovada com relatório; senão a
  atual). O relatório de uma leva fica em `/leva/<n>/relatorio`; o endereço antigo `/em-breve/relatorio` abre a mesma
  página. Com o PR aberto: "Esperando a aprovação da Sofia", o link do PR e o texto do PR; com o arquivo na `main`:
  "Aprovado" e o texto da `main`; a leva 0: "antes das fases", sem relatório. O texto aparece como texto puro (nada roda).
  A página diz quem abriu o PR; com mais de um PR mexendo no arquivo, vale o da equipe atualizado por último, e um PR de
  alguém de fora da sakura-corp (o repositório é público) só aparece se não houver outro, com o aviso "de fora". Quando a
  fase da leva muda (a Sofia mesclou), a página busca o relatório de novo.
  Sem botão de aprovar: aprovar é mesclar. Rota nova no worker: `/api/leva/<n>/relatorio` (`painel/worker/relatorio.ts`),
  um pedido só ao GitHub. O modelo de cinco partes mora em `docs/relatorios/modelo-leva.md`.
  A Sofia confirmou a ordem que a barra abre. No iPhone, o texto puro (com `#`, `**` e as tabelas cruas) ficou difícil
  de ler: a **#689** (sem leva ainda) passa a mostrar formatado com `react-markdown` + `remark-gfm`, sem `rehype-raw`
  (nada do texto roda), biblioteca aprovada por ela em 21/10.
- **21/10/2026, as Decisões da Sofia (#648)**, com o Tiago (PR #691, mesclado em 21/10; antes, esta sessão consertou o prazo de fim de dezembro em
  issue aberta em janeiro, que agora é do ano anterior, e trocou o texto do selo, a pedido da Sofia): o item "Decisões da
  Sofia" (Cobertura) saiu do "em breve" e abre `/decisoes`; o endereço antigo `/em-breve/decisoes` abre a mesma página. A
  lista são as issues abertas com a etiqueta `sofia` (no máximo 100), a mais antiga em cima: o título (link pro GitHub, em
  aba nova), o número e há quantos dias está aberta (dia de calendário de quem olha). Um prazo no título ("Até 26/10") fica
  destacado quando faltam 3 dias ou menos ("Vence em 3 dias (24/10)", "Vence amanhã", "Vence hoje", "Venceu ontem",
  "Venceu há N dias"; antes disso, discreto: "vence em 25/10"). Todo mundo logado vê. Nenhum botão
  escreve no GitHub (nem fechar nem responder). Rota nova no worker: `/api/decisoes` (`painel/worker/decisoes.ts`), um
  pedido só ao GitHub. A lista é buscada ao abrir a página (não muda sozinha com o tempo real). Fotos:
  `docs/relatorios/fotos/tarefa-648/`.
- **21/10/2026, as Versões (#649)**, com o Tiago (PR #693, revisado e mesclado pela Sofia em 21/10): o item "Versões" (4º andar) saiu
  do "em breve" e abre `/versoes`; o endereço antigo `/em-breve/versoes` abre a mesma página. A lista são as últimas 20
  releases do `sakura-corp/ssace-versoes`, a mais nova em cima (pelo número da versão), com a data e o link da release.
  **No canal de teste** = release marcada como pré-lançamento; **Liberada** = sem a marca; a que o GitHub dá como "a mais
  recente" (a que o Liberar marca) ganha o selo **"Nas lojas hoje"**; se ela for mais antiga que as 20 (muita versão de
  teste depois, ou voltou pra uma antiga), aparece à parte, acima da lista, e nunca some. Rascunho não aparece. Só lê: nenhum botão de
  publicar, liberar ou voltar. Rota nova no worker: `/api/versoes` (`painel/worker/versoes.ts`), um pedido só ao GitHub,
  com o token de quem está logado. **Conferido pela Sofia no iPhone em 21/10**: o login do painel lê o `ssace-versoes`
  (público) mesmo com o app instalado só no `sakura-system-ace`, e a página mostrou a `v0.9.51` como "Nas lojas hoje",
  que é a "mais recente" do GitHub (a única release lá até 21/10; as anteriores moram no endereço antigo, e a página não
  olha lá). Se um dia o login não ler, a página diz isso ("O login do painel não consegue ler as versões", com "Tentar de
  novo"), em vez de uma lista vazia. Fotos: `docs/relatorios/fotos/tarefa-649/`.
- **21/10/2026, as Pessoas (#650)**, com o Tiago (PR #695, mesclado pela Sofia): o item "Pessoas" (1º andar)
  saiu do "em breve" e abre `/pessoas`; o endereço antigo `/em-breve/pessoas` abre a mesma página. Cada pessoa com tarefa
  na leva atual (os mesmos dados da Sala, sem consulta nova): a foto e o login do GitHub e a tarefa que está segurando
  agora (link pra issue, em aba nova), ou "Sem tarefa". Em ordem alfabética do login. **Sem nota por pessoa**: nem horas,
  nem contagem, nem ranking (as horas continuam só no quadro da tela da leva). Muda sozinha com o tempo real, como a Sala.
  Fotos: `docs/relatorios/fotos/tarefa-650/`. Conferido no ar pela Sofia: só aparece quem tem tarefa na leva, então a frase do
  topo virou "Quem tem tarefa nesta leva e o que está fazendo agora." (PR #697); a equipe inteira é a #699 (lista fixa, #698).
  A Cloudflare publicou a mescla da #695 com uns 15 min de atraso, sem deixar o aviso no GitHub (o normal é 1 a 2 min).
  Se acontecer de novo: esperar; o "Retry build" refaz o commit antigo (o aviso no topo do `painel/wrangler.jsonc`).
- **21/10/2026, as conferências repetidas (#667)**, chefe backend com o Tiago (PR #702, aprovado pela Sofia e mesclado em 21/10):
  no "O que mudou hoje" do Início, as rodadas da mesma conferência no mesmo PR viram uma linha só, a mais nova; rodada
  sem PR continua uma por linha; junta antes do corte em 15. Só `painel/src/logica/novidades.ts` e o teste. Relatório:
  `docs/relatorios/2026-10-21-tarefa-667-backend.md`. **A Sofia confere depois de publicar**: no Início, cada PR com
  uma linha de conferência só.
- **21/10/2026, noite: a `leva-3` posta** (Sofia): a etiqueta entrou nas quatro do programa das lojas (#653, #379, #655,
  #656), com a leva 2 já sem tarefa aberta. Pela regra da #644, a leva 2 continua a atual até o relatório dela ser aprovado;
  a 3 fica em Montando e ninguém pega tarefa dela antes disso. A Sofia controla o ritmo.
- **22/10/2026: o Gustavo trocou de conta do GitHub** (Sofia): entrou na `sakura-corp` a conta nova, `GustavoSakuras`
  (com 2FA), e a antiga, `kalendoscope`, já não tem acesso (fora dos membros e dos colaboradores de fora). Não havia tarefa
  nem PR aberto na conta antiga; o caderno dele (#618) nasce na conta nova. Na lista da equipe da #699, vale o login novo.
- **21/10/2026, noite: a leva 2 aprovada** (Sofia mesclou o relatório `docs/relatorios/leva-2.md`, PR #704): 12 de 12
  tarefas, 55 h. Ela decidiu pular a rodada de testes com lista (já tinha conferido cada página no ar); a fase Testando
  estreia na leva 3, que passou a ser a atual.
- **22/10/2026: as levas 4 e 5 postas** (Sofia, entrevista): **leva 4** = #706, #708, #365, #368, #385, mais as pequenas do
  painel (#699, #689, #684); **leva 5** = #454, #456, #372, #459. As duas ficam em Montando e entram sozinhas, uma depois da
  outra, quando ela aprovar a anterior (#644). A #365, a #368, a #385 e as quatro da leva 5 estão no modelo antigo: **reescrever
  com a `nova-tarefa` antes de a leva delas virar a atual**. As tarefas de banco são da equipe; a Sofia decide antes e aplica a
  migration. **A leva 6 fica reservada pra um projeto novo da Sakura**, com as três pessoas nele; o plano mora fora deste
  repositório. Fora das levas por enquanto: #366, #367, #457, #520 e o resto da primeira onda (#397, #381, #382, #383).
- **22/10/2026: o relatório da leva aparece formatado** (#689, Gustavo, PR aberto esperando a Sofia): títulos, negrito,
  citações, listas e tabelas, com `react-markdown` + `remark-gfm` e **sem** `rehype-raw`. HTML do arquivo continua escrito
  (nunca roda), link só da sakura-corp, imagem não aparece, tabela larga rola dentro da caixa (375 px sem rolagem lateral).
