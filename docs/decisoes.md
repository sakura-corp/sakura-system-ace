# Projeto, identidade visual e decisões técnicas

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 2. O que é o projeto

**Sakura System** é uma linha de sistemas de gestão empresarial por nicho. A primeira edição é o
**SSACE (Sakura System AutoCenter Edition)**, pra autocenters e borracharias. Referência de
mercado: o S3Auto (Comsis), um sistema tradicional e completo, mas de tela densa e datada. O
diferencial do SSACE é ser simples e moderno de usar, sem perder as funções essenciais. Validado o
SSACE, a ideia é fazer outras edições (ex: Supermarket Edition) reaproveitando a base. O concorrente
direto que ela acompanha é o Anexar (`docs/comparativo-anexar.md`).

### Plano de expansão (definido por ela)

Três fases, nessa ordem, sem pressa de pular etapa:

1. **A borracharia do pai dela** ("Pneus Amigão", Araraquara): **feito e em uso real**. Usar de
   verdade é como ela acha os bugs que só aparecem no dia a dia e descobre o que faz falta.
   Cadastro, OS, estoque, caixa, contas, comissões e venda de balcão rodam lá, com **NFC-e e NFS-e
   emitidas em produção pela Focus NFe** (item 1 da seção 8). A atualização chega sozinha
   (canal de teste e "Liberar", seção 9).
2. **Mais 2 ou 3 lojas de conhecidos do pai dela, também em Araraquara**: **é a fase atual**
   (preparar a venda). Duas empresas estão pra entrar: a de um amigo do pai, com 2 lojas, e outra
   com 1 loja. **Cada empresa (dono diferente) tem o próprio projeto Supabase**, totalmente
   isolado; várias lojas da mesma empresa usam o multi-loja dentro do mesmo projeto (seção 5). Um
   instalador só serve qualquer empresa: cada computador escolhe a conexão na primeira abertura
   ("Conexão com o banco", seção 7). **Pra começar a usar, nada de código**: cada empresa segue o
   `INSTALAR-LOJA-NOVA.md`, e a empresa de 2 lojas é um banco só (a 2ª loja nasce em
   Configurações → Lojas). A parte fiscal vem depois, por CNPJ (playbook no item 1 da seção 8).
   **Recomendado antes da primeira loja de terceiro** (25/09): o contrato e a LGPD (item 10 da
   seção 8), os lotes de permissão que faltam no banco (item 1 da seção 6), a parte 2 do porteiro
   e o Electron atualizado (em andamento desde 03/10, item 14 da seção 8). O que um dono de 2 lojas deve pedir e **não existe**: ver as
   lojas somadas, transferir peça entre elas, preço diferente por loja (seção 5, "Fora de
   escopo"); esperar ele pedir. **Preço, custo e contrato ficam no repositório privado
   `caranovavidanova/sakura-corp`.**
3. **As ~30 lojas de autocenter que o pai dela conhece**: já envolve **outros estados e cidades**,
   e a emissão fiscal muda com isso (ICMS por estado, ISS e portal por município): não assumir que
   o que funciona na Pneus Amigão serve sem ajuste. É aí que entram o site de assinatura (item 2 da
   seção 8) e a decisão de centralizar custos. Não adiantar esse trabalho sem ela pedir.

### Identidade visual (como está hoje)

- **Tema escuro/neon**: rosa e roxo neon sobre fundo quase preto. Tokens `--color-sakura-*` em
  `src/styles/globals.css`: `sakura-pink` `#ff4dce`, `sakura-purple` `#b624ff`, fundo `sakura-bg`
  `#0b070a`, `color-scheme: dark`. Substituiu o tema claro/rosa original (troca feita por ela com
  o Gemini, fora do Claude Code, e confirmada depois de ver rodando).
  - **Cuidado com os nomes**: `sakura-purple-dark` virou um tom **claro** (`#e8d5e5`) e
    `sakura-muted` é `#9e8d9a`; os dois são pra texto sobre fundo escuro. Documento ou exemplo
    antigo que diga "purple-dark é escuro" é do tema anterior. Nunca usar `text-sakura-gray` como
    texto, nem opacidade baixa em cima de `sakura-card`.
  - **Contraste**: conferido por `npm run contraste` (classes) e `npm run contraste:telas` (as 54
    telas renderizadas), itens 17 e 58 da seção 6.
- **Vidro escuro**: blocos arredondados translúcidos (`sakura-card`, com `backdrop-filter: blur` e
  um brilho neon sutil) sobre um fundo escuro com brilho difuso (`sakura-shell-bg`), em quase toda
  tela. **A janela (modal) é a exceção**: painel opaco (`sakura-modal` + `sakura-modal-fundo`),
  porque no vidro o texto da tela de trás atrapalhava a leitura (#361, escolhido por ela em
  03/10/2026). O Login usa `public/sakura-login-bg-premium.png` de fundo. Os cartões do Início mostram só
  valor grande + seta `›`, sem gráfico (seção 7).
- **Barra de rolagem própria** (`src/components/AreaRolavel.tsx`): a nativa do Windows não respeita
  canto arredondado, então ela é escondida e o "polegar" é uma div comum, arrastável. Vale no
  `<main>` (App.tsx) e na `Sidebar`; não no `Modal.tsx`. **Cascata do CSS** (item 14 da seção 6):
  CSS escrito solto no `globals.css`, fora de `@layer`, ganha de qualquer classe do Tailwind;
  reset global (`*`, seletores soltos) vai dentro de `@layer base`.
- **Borda dos campos** (12/09, escolha dela entre fotos de três versões): o token próprio
  `--color-sakura-borda-campo` (branco a 35%), 3,13:1 contra o vidro. É **só dos campos**: o
  `sakura-gray` continua desenhando borda de tabela, card e `iframe`, e os botões ficaram como
  estavam. Login, conexão e troca de senha usam outra classe e foram corrigidos à parte.
- **Campos**: checkbox e rádio usam `accent-color` da paleta. O botão do calendário do
  `input[type=date]` é o ícone nativo com `filter: invert(100%)`, com tamanho e fundo arredondado
  (desde 03/09). **Pegadinha**: o `invert` vale pro elemento inteiro, então a cor de fundo é escrita
  ao contrário (o `rgba(0,0,0,…)` do CSS aparece como cinza claro). A seta do `<select>` continua
  nativa, de propósito (os ~15 selects têm espaçamentos diferentes).
- **Logo**: `public/sakura-icon.svg` (a flor, ícone da janela) e `public/sakura-logo.svg` (só o
  nome, usado no menu por `Logo.tsx`), desenhados à mão, **não** são a arte oficial dela.
  - A logo oficial dela é um SVG grande (~200 caminhos, saído de um traçador de imagem). **Não
    tentar transcrever pelo chat**: numa tentativa antiga "Sakura System" virou "Sal u a System".
    Trocar a logo não é prioridade (item 3 da seção 8).
  - **Anexo que não chega**: às vezes ela anexa um arquivo e ele não aparece na pasta de uploads da
    sessão, só a imagem na conversa. Antes de processar, conferir com
    `find /root/.claude/uploads -type f`. Se não chegou, recriar à mão e mostrar renderizado antes
    de aplicar.

### Apresentação comercial (25/09/2026)

O pai dela pediu uma apresentação pra oferecer o sistema aos amigos donos de autocenter. São 17
slides, num artifact **privado dela** no claude.ai
(`https://claude.ai/artifact/Qgrq6KjoAJigmSXHouXien`), com um roteiro de fala nas anotações de
cada slide. A matéria-prima é o `apresentacao/levantamento-do-sistema.md` (o que o sistema
oferece, marcado como usado na loja, pronto ou com porém), e as fotos das telas saem do
`apresentacao/fotografar-telas-dos-slides.mjs`, com os dados de exemplo ("Auto Center Modelo").
**As regras dela pra qualquer versão futura**:
- formal, em slides, **sem preço**;
- **sem citar a Pneus Amigão pelo nome** (vira "uma autocenter em operação");
- **sem o "Importar por foto"**, **sem a flor de cerejeira** na capa e no encerramento, e **sem
  contato** no último slide (até ela pedir);
- **só prometer o que é verdade hoje**: conferir slide a slide contra o sistema antes de mandar
  (ex: a habilitação fiscal "pode levar algumas semanas"; "atualizações automáticas", sem "já
  testadas em operação"). O quadro "Sem contratos paralelos" só vale enquanto a infraestrutura
  continuar na conta dela.

## 3. Decisões técnicas já tomadas (não reabrir sem motivo forte)

### Base do programa

| Decisão | Escolha | Por quê |
|---|---|---|
| Tipo de app | Desktop Windows, com Electron | Definido por ela desde o início |
| Frontend | React + Vite + TypeScript (não Next.js) | Next.js é pra app com servidor; Electron não precisa |
| Empacotamento Electron | `vite-plugin-electron` + `vite-plugin-electron-renderer` | Um `vite.config.ts` só builda a tela, o processo principal e o preload |
| Estilo | Tailwind CSS v4 (`@tailwindcss/vite`, config via `@theme` no CSS) | Rapidez pra manter a paleta consistente |
| Dados | Supabase (Postgres na nuvem). O app fala direto com o banco, protegido por RLS; **sem servidor próprio** | Multi-loja, app de celular no futuro, e a nota fiscal exige internet de qualquer jeito. Uma arquitetura com API separada (visão de longo prazo de um texto do Gemini) **não** é o plano: só com pedido dela |
| Roteamento | `react-router-dom` com `HashRouter` | O Electron carrega arquivo local (`file://`); o `BrowserRouter` quebraria as rotas |
| Formulários | `react-hook-form` + `zod`, **todo formulário do app já está nesse padrão** | Decisão dela. Padrão detalhado em "Padrão de formulário", seção 4 |
| Versionamento | SemVer. O que cada versão trouxe fica em "Empacotamento" (seção 7); o `CHANGELOG.md` parou na `0.9.2` | Só lançar versão testada |
| Lint | ESLint 9 (flat config) só com `rules-of-hooks` + `exhaustive-deps`, mais a trava de fuso (item 48 da seção 6) | O plugin de hooks v7 traz regras experimentais que reprovariam o padrão "buscar ao abrir a tela" usado em todas as páginas |
| Autenticação | Supabase Auth (e-mail e senha); o operador digita só o **usuário**, e o app monta `usuario@sakura.local` por baixo | Login rápido. Limitações na seção 6 |

### Segurança e permissões

| Decisão | Escolha | Por quê |
|---|---|---|
| Permissão por módulo | Checada **na tela** e, aos poucos, **no banco**, tabela por tabela (`TR-04.1`): RH (`0056`), Contas a Pagar/Receber (`0061`) e Caixa (`0062`) já exigem o módulo. Clientes, peças/estoque e OS ainda não | Começou só na tela por rapidez; o banco entra por lotes, cada um com decisão dela. Item 1 da seção 6 |
| RLS das tabelas de negócio | Exige **login** e acesso à loja em todas; nas tabelas dos lotes acima, exige também o módulo, com "portas estreitas" pra quem precisa de um pedaço (ex: faturar OS lança no Caixa) | O risco mudou com a venda pra terceiros; o reforço começou por dinheiro e RH |
| Token da Focus NFe (25/09, `TR-04.2`) | Mora num **cofre** no banco (`segredos_fiscais_loja`, sem policy nenhuma), e quem usa é o **porteiro**, a Edge Function `focus-nfe`: confere quem pede e só **repassa** a nota que o programa montou. A tela só sabe SE a loja tem token | O token emite e cancela nota no CNPJ da loja e ia até o computador de todo operador. **Tabela, não secret da função**: secret é um por projeto (empresa), e duas lojas com CNPJs diferentes precisam de dois tokens. **Repassar, não remontar**: remontar seria mais uma conta de dinheiro divergindo entre dois lugares. Item 71 da seção 6 |
| Chave da IA (leitura de nota por foto) | Só como secret da Edge Function `ler-notas-fiscais`, nunca no app instalado | Ninguém com acesso ao computador vê a chave |
| Segredos das automações (30/09) | Em **cofres** (environments): `backup` (só `main`) e `lojas` (só `main` + aprovação dela). Valores guardados no Bitwarden dela | Um workflow rodado da branch de um colaborador não recebe segredo de cofre restrito à `main` (item 78 da seção 6) |
| Mudanças na `main` (30/09) | Ruleset **`main protegida`**: PR + 1 aprovação, sem apagar nem force push; Repository admin (ela) isento | Colaborador não mescla sozinho |
| Publicar e liberar versão (30/09) | Release, Liberar e Atualizar bancos **só pelo "Run workflow" na `main`, com a aprovação dela** (cofre `lojas`). O Release não dispara mais por tag; o ruleset **`versões`** impede mudar ou apagar `v*` | Quem aperta não decide sozinho. O furo que sobra (workflow na própria branch) está no item 78 da seção 6; a trava de verdade é um repositório só de versões, pra depois (item 12 da seção 8) |

### Como se trabalha no repositório

| Decisão | Escolha | Por quê |
|---|---|---|
| Fluxo de Git (até existir uma v1.0) | **Quando é ela**: branch de trabalho → PR → **mesclar direto na `main`**, sem esperar aprovação, e depois dizer a ela em português simples o que mudou e o que ela precisa fazer. **Quando é outra pessoa da equipe**: abre o PR, pede a revisão dela e para (seção 0 do `PROJETO_STATUS.md`) | Pedido dela. Revisitar quando existir uma v1.0 |
| Endereço do repositório (29/09) | `sakura-corp/sakura-system-ace`, na organização dela (transferido da conta pessoal) | Base pra equipe. O endereço antigo redireciona, inclusive pro atualizador; por isso **nunca criar um `sakura-system-ace` na conta pessoal dela** |
| Repositório público ou privado (29/09) | **Continua público** por enquanto ("sem custo a mais no momento") | Fechar junto com o CNPJ ou antes do primeiro cliente, e **antes** criar um repositório público só de versões (item 12 da seção 8). O que isso exige está no marco de 29-30/09 do `docs/historico.md` |
| Painel da equipe (29-30/09) | Pasta `painel/` neste repositório, React + Vite, na Cloudflare (Worker + Durable Object, plano grátis), login por GitHub App só pra membros da `sakura-corp`, dados das issues (sem banco próprio), tempo real por webhook | Decisões dela; tudo em `docs/painel.md`. Financeiro/DRE depois, **fora do GitHub** (banco privado) |
| Site de apresentação (28/08) | Pasta `site/`, **HTML e CSS puros, sem build**, pra publicar na Vercel com Root Directory = `site` | Uma página só não justifica outro `node_modules`, e ela consegue editar um texto sem rodar nada. **Parado por decisão dela** (item 9 da seção 8) |
| Preço no site (28/08) | Mostrar **o que está incluído, sem valor** (escolha dela) | A venda é pra conhecidos do pai dela, e o valor pode variar caso a caso |

### Instalação, atualização e lojas

| Decisão | Escolha | Por quê |
|---|---|---|
| Instalador | NSIS + atualização automática pelo GitHub Releases (`electron-builder` + `electron-updater`) | Não reinstalar à mão em cada loja a cada versão |
| Nome do arquivo do instalador (28/08) | Fixo: `SakuraSystem-Setup.exe` (`build.artifactName`) | O endereço `/releases/latest/download/SakuraSystem-Setup.exe` sempre entrega a última versão. Seguro pro auto-update: o `latest.yml` guarda o nome do arquivo |
| Canal de atualização (25/09, `TR-09.1`) | Toda versão nasce como **pré-lançamento** (canal de teste) e só chega nas outras lojas pelo workflow **"Liberar versão para todas as lojas"**. Cada computador escolhe o canal em Configurações → "Atualizações deste computador" (padrão: normal) | Com lojas de terceiros, uma versão ruim viraria vários telefonemas. Usa o `allowPrerelease` do `electron-updater`; o "copiar `latest.yml` entre canais" não funciona com o provedor GitHub. Seção 9 |
| Versão de cada computador (26/09, migration `0063`) | Cada computador tem um número próprio (`computador.json`) e grava no banco, a cada login, versão, canal e loja (tabela `computadores`). Migration que aperta uma regra da versão anterior declara `-- versao-minima-do-programa: X`, e o botão de atualizar os bancos espera os computadores em uso abaixo de X (com uma caixinha pra passar por cima) | Com lojas de terceiros, conferir à mão "alguém ainda está na versão velha?" deixa de ser possível. Registro no login, sem sinal contínuo. Quase toda migration só acrescenta e não precisa esperar ninguém. Escolha dela. Seção 9 |
| Conexão com o Supabase no app instalado | Digitada na primeira abertura e guardada **naquele computador** (`conexao.json`), **não** embutida no build. No `npm run dev`, vale o `.env` | Um instalador só serve qualquer empresa. Embutida, o instalador entregue a um cliente novo apontaria pro banco de outra empresa. Seção 7 |
| Instalação de empresa nova | Um arquivo SQL único (`supabase/instalacao/instalacao-completa.sql`, gerado por `npm run gerar-instalacao`) + o checklist `supabase/instalacao/INSTALAR-LOJA-NOVA.md` | Colar as migrations uma por uma era o maior risco da venda: pular uma não dá erro na hora, só quebra depois na tela. Itens 36 e 37 da seção 6 |
| Multi-loja: um projeto Supabase pode servir 2+ lojas | Tabela de junção `operador_lojas` (muitos-pra-muitos) + `usuario` único **na empresa toda**, não por loja | Um dono pode ter acesso a várias lojas; usuário global evita seletor de loja no login. Seção 5 |
| Multi-loja: o que é compartilhado e o que é por loja | Compartilhado: `clientes`/`veiculos`, `pecas`, `servicos`, as categorias, `fornecedores`. Por loja: estoque, caixa, OS, contas, notas fiscais, funcionários, `pedidos_compra` e as configurações | Pedido dela: catálogo único pra empresa (sem recadastro duplicado; cliente de duas lojas com histórico único) |
| Quem paga a infraestrutura das lojas clientes (28/08) | **Tudo na conta dela**: Supabase, Anthropic e Focus NFe. O dono da loja não cria conta em serviço nenhum | Decisão dela. Justifica a mensalidade e permite dar suporte de verdade; em troca, o dado dos clientes fica sob responsabilidade dela, daí o backup obrigatório |
| Plano do Supabase das lojas clientes (28/08, corrigido em 10/09) | **Pro desde a primeira venda**. A cobrança é **por organização**: US$ 25 com o 1º projeto e ~US$ 10 por projeto a mais | O grátis não guarda cópia automática, aceita no máximo 2 projetos por organização e pausa o projeto depois de 1 semana sem uso. Plano de organizações e valores no repositório privado |
| Leitor de nota fiscal por IA nas lojas novas (27/09) | **Fica fora das primeiras versões**: não se instala a Edge Function nem a chave da Anthropic nelas | Decisão dela: quer trabalhar melhor esse recurso depois. Tira um passo da instalação e um custo por loja. O código continua no app |
| Cadastro mensal da alíquota da NFS-e no portal da prefeitura (26/09) | **Responsabilidade da contabilidade de cada empresa**; o sistema só lembra (faixa no Início, o mês inteiro, só em loja que emite NFS-e) | É cadastro no site da prefeitura, por CNPJ, sem API. Em loja de terceiro, trocar o texto da faixa (Configurações → Dados fiscais) pra dizer a quem avisar |
| Venda de balcão (26/09, `FN-09`, migration `0064`) | Uma OS marcada `tipo = 'venda_balcao'`, **não** um PDV à parte. Cliente que não se identifica vira o cliente fixo **"Consumidor"** (UUID `…c000`); o número é o **mesmo contador** das OS | Reaproveita estoque, caixa, NFC-e e garantia. "Consumidor" foi escolha dela (cliente opcional mexeria em ~20 telas e quebraria a versão anterior). Contador compartilhado pra "OS 3" e "Venda 3" nunca existirem juntas na loja. Seção 7, "Ordens de Serviço" |
