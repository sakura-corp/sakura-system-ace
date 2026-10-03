# Lições: dívidas técnicas e padrões de bug

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 6. Dívidas técnicas / pontos de atenção — IMPORTANTE

1. **Permissão por módulo: no banco só em RH, contas e Caixa; nas outras tabelas, só na tela** — um operador
   logado com permissão só de "Caixa", por exemplo, ainda consegue chamar a API do Supabase
   direto pra mexer em "Clientes" se tentar de propósito. RLS exige **login** pra tudo (fecha o
   acesso sem estar logado), mas não reforça por módulo. **Enquanto quem opera é o pai dela e os
   funcionários da loja dele, isso é risco teórico** — e este documento sempre foi honesto sobre
   isso. Deixa de ser quando o operador for funcionário de uma empresa que só comprou o sistema:
   dá pra exportar o cadastro de clientes inteiro (e o de TODAS as lojas da mesma empresa, já que
   `clientes` e `pecas` são compartilhados) sem deixar rastro, porque a auditoria registra
   escrita, nunca leitura.
   **A etapa 1 de 3 saiu em 13/09/2026** (item `TR-04.1`, migration `0054`): a função
   `operador_tem_permissao(modulo)`, no mesmo padrão de `operador_atual_e_admin()`.
   **A etapa 2 COMEÇOU em 18/09/2026, por uma tabela só** (migration `0056`, item `TR-04.3`):
   `funcionarios` e `funcionario_filhos` são as primeiras a exigir a permissão no banco.
   **O lote 2 saiu em 26/09/2026** (migration `0061`): `contas_pagar` e `contas_receber`.
   **E o lote 3, no mesmo dia** (migration `0062`): `caixa_movimentos`, com portas estreitas
   pra Relações, OS e as duas contas. As outras **continuam como sempre foram** — o parágrafo
   acima segue valendo pra clientes, peças e ordens de serviço.
   **O que falta, e por que é mais difícil** (mapeado em 26/09/2026, tela por tela): as três
   tabelas que sobram — `clientes`/`veiculos`, `pecas`/`estoque_movimentos` e `ordens_servico` —
   são lidas por MUITAS telas, e a principal é o **Início**, que quase todo operador tem (ele lê
   OS, clientes, peças e serviços pra montar calendário e pátio). Além disso o Caixa, as
   Garantias e as Notas Fiscais puxam o nome do cliente e os itens da OS por `join` embutido — e
   `join` em tabela fechada não dá erro, devolve `null` (item 69). **Isso agora pesa mais**: a
   lista do Caixa (e o lucro dela, e Relações) depende desse `join` com a OS e o cliente — fechar
   `ordens_servico` ou `clientes` sem janela deixa o lucro do Caixa zerado pra quem tem só Caixa.
   Então cada uma dessas pede duas decisões dela antes: **o que o Início mostra pra quem não tem
   o módulo** (a regra já existe: `MODULOS_DO_CARTAO` em `schemas/painelInicio.ts`, e o cartão
   vira "—") e **qual janela estreita cada tabela precisa** (ex: o nome do cliente e os itens da
   OS pro Caixa).
   **O que ela precisa saber antes de aprovar as próximas tabelas**: a partir daí, permissão
   errada no cadastro de um operador deixa de ser "o menu some" e passa a ser "a tela abre
   vazia" — e RLS falha em silêncio (item 15 desta seção). É por isso que a etapa 3 do item é um
   teste que prova o bloqueio perfil por perfil, e não um "confia que funcionou".
   **E esse teste já existe, desde 13/09/2026**: é a matriz de RLS (`npm run test:rls`, item
   `TR-07.3`, item 63 desta seção), hoje em 760 células. O diff do `expectativas.csv` **é** a
   revisão: na `0056` ele mostra, em números, o balconista saindo de 1 pra 0 nas oito linhas de
   RH e entrando com 1 na view pública — ou seja, o que ele perdeu e o que ele manteve, lado a
   lado.
   **A lição de desenho que a primeira tabela deixou** (item 69 desta seção): fechar uma tabela
   raramente é só fechar. `funcionarios` tinha uma parte pública de verdade (o nome do técnico
   numa OS), e foi preciso abrir uma janela no mesmo movimento — as próximas tabelas merecem a
   mesma pergunta antes de começar: *o que aqui dentro é público, e quem depende disso hoje?*

2. **Autenticação**: Supabase Auth, login com usuário/senha (ver seção 3). **Redefinir senha de
   operador esquecida** já está implementado (Configurações → Operadores → "Redefinir senha",
   migration `0038` + Edge Function `redefinir-senha-operador`, já publicada na Pneus Amigão — ver
   "Login e permissões" na seção 7 e "Publicar uma Edge Function" na seção 9). **Multi-loja**: a
   fundação já existe (1 projeto Supabase pode servir 2+ lojas, ver seção 5) — o que ainda não
   existe é um site externo de assinatura pra provisionar loja+admin automaticamente pra um
   cliente novo (continua manual, pelo painel do Supabase + tela de Configurações → Lojas).
   **Senha mínima trava em 6 caracteres, sem exceção**: já foi tentado reduzir pra 4 (pedido dela,
   pra digitar mais rápido no balcão) — não dá, o Supabase Auth barra isso mesmo pelo painel
   ("Must be greater or equal to 6"). Não sugerir de novo sem uma mudança de arquitetura de login
   (ex: PIN numérico em vez de senha via Supabase Auth) e sem ela pedir explicitamente.
3. **Uma chave secreta do Supabase (`sb_secret_...`) foi colada no chat pela usuária em algum
   momento**, por engano (só a `anon`/publishable era necessária). Não foi usada nem guardada no
   código. **Não se sabe se ela já trocou** (Settings → API Keys do Supabase): está na lista "O
   que depende dela" da seção 8.
4. **Testes automatizados: o que cobrem e o que não** (Vitest). Cobre principalmente **funções puras de cálculo**
   isoladas dos componentes durante a migração pro `react-hook-form` (juros/parcelas/split de
   pagamento em `schemas/faturamento.ts`, margem de peça em `schemas/peca.ts`, totais de OS/Pedido
   de Compra, saldo de estoque, cotação por fornecedor). **Desde 12/09/2026 também testa TELA**
   (item `TR-07.2`, ver item 62 desta seção): os cinco formulários que mexem em dinheiro são
   montados de verdade com `@testing-library/react` e exercitados a clique e digitação. O que
   continua fora é **qualquer coisa que dependa do Supabase** — nenhum teste fala com o banco, e
   os cinco formulários só puderam ser testados porque recebem tudo por `props`. Desde 11/09/2026 rodam
   nos **dois fusos** (`npm run test:fusos`), porque a máquina de teste usa UTC e é justamente em
   UTC que o pior bug de data deste projeto não aparece (item 48 desta seção). Um deles não testa
   conta nenhuma: `schemas/arquitetura.test.ts` varre `src/pages/` e reprova conta de dinheiro
   escrita dentro de tela (item 49). Achou e corrigiu de brinde um bug
   real de arredondamento de ponto flutuante em `calcularValorCobrado` (`100 * 1.1` podia sair
   `110.00000000000001` em vez de `110`) — e, na varredura de 02/09/2026 (itens 42 a 45), foi
   escrevendo teste pro comportamento esperado que os bugs de desconto na NFC-e apareceram, dois
   deles em lugares que a leitura do código já tinha passado batido.
   **Um teste de verdade fora desse padrão**: a tela de conexão foi validada de ponta
   a ponta no **Electron real** (Playwright + `xvfb-run`, ver item 6 desta seção), inclusive o
   caminho de falha — e ali o sandbox ajuda em vez de atrapalhar, porque a ausência de rede pro
   Supabase reproduz naturalmente o cenário "a checagem reprovou".
   **Desde 17/09/2026 isso deixou de ser script avulso**: virou `npm run test:electron`
   (`scripts/testar-electron.mjs`, 22 checagens), com job próprio no CI. Antes, cada sessão que
   precisava abrir o Electron de verdade escrevia o seu e jogava fora no fim — ou seja, o único
   teste capaz de pegar falha silenciosa de preload nunca sobrevivia pra pegar a falha seguinte.
   Continua fora do `npm test` (precisa de Electron e de tela de mentira, não roda no Windows
   dela).
   **E desde 13/09/2026 a RLS também é conferida por máquina**, fora do `npm test`:
   `npm run test:rls` (item `TR-07.3`) monta um banco do zero, simula cinco papéis e confere as
   760 combinações de tabela × comando × papel — ver `supabase/testes-rls/` e o item 63 desta
   seção. Continua sem falar com o Supabase de verdade: é um Postgres local/do CI.
   **Exceção**: `lib/notaFiscalXmlFornecedor.test.ts` testa
   o parser de XML de verdade
 (precisa de `DOMParser`, uma API de navegador que o ambiente "node"
   padrão do Vitest não tem) — usa jsdom só nesse arquivo, via comentário `// @vitest-environment
   jsdom` no topo do arquivo (`jsdom` virou devDependency só pra isso; o resto dos testes continua
   no ambiente node simples, mais rápido).
5. **Assinatura de código do instalador**: o Windows/SmartScreen avisa "editor desconhecido" no
   instalador (normal sem certificado pago; não impede instalar, só exige "Mais informações →
   Executar assim mesmo"). Reconsiderar comprar um certificado se algum dia distribuir pra muitas
   lojas de terceiros.
6. **Ambiente de sandbox onde o Claude roda (nuvem) não consegue acessar `*.supabase.co`**
   (política de rede bloqueia, erro 403 do proxy). Testes de ponta a ponta contra o Supabase real
   **só podem ser feitos pela usuária, na máquina dela**. Do lado do sandbox, a validação possível
   é: `tsc -b`, `vite build`, `npm run lint`, e screenshots via Playwright + `xvfb-run` (Electron
   real, headless) com dados mockados via `page.route()` interceptando as chamadas REST do
   Supabase. **Pra bugs de caminho de asset**, servir o `dist/` por HTTP não é suficiente — mascara
   problemas de caminho absoluto que só aparecem de verdade com `file://`. Preferir sempre validar
   com o Electron real via `playwright._electron.launch({ executablePath:
   "node_modules/.bin/electron", args: ["dist-electron/main.js"] })` sob `xvfb-run -a`. **Chamadas
   a outros domínios reais também não funcionam no sandbox** (nem simulando um domínio "fake" via
   `.env` — o proxy do ambiente bloqueia a tentativa de tunnel) — pra validar telas que dependem de
   login/dados reais sem essa rede, uma alternativa que funcionou bem foi recriar a estrutura HTML
   isolada (sem app inteiro) reaproveitando o CSS já compilado do `dist/`, pra testes puramente
   visuais/CSS que não dependem de dado real.
   **Melhor que isso: dá pra renderizar o componente React de
   verdade**, não uma imitação em HTML. Receita, pra qualquer componente que receba os dados por
   `props` (ou seja, que não chame o Supabase sozinho — todo `<Modulo>Form.tsx` do app se encaixa):
   criar um `preview-temp.tsx` que monta só esse componente com dados falsos (dentro de um
   `<MemoryRouter>`, senão `BotaoVoltar` quebra) + um `vite.preview.config.ts` mínimo (só
   `react()` + `tailwindcss()` + o alias `@`, **sem** os plugins de Electron), buildar com
   `npx vite build --config vite.preview.config.ts` e tirar screenshot com Playwright. Pega
   layout/contraste/estilo de verdade, com o CSS real do tema. **Duas pegadinhas que custaram duas
   tentativas em branco**: precisa de `base: "./"` no config (senão o asset sai com caminho
   absoluto e não carrega) e precisa **servir por HTTP**, não abrir via `file://` (o Chromium
   bloqueia `<script type="module">` em `file://` por CORS — e o sintoma é uma página branca **sem
   erro nenhum** no console, fácil de confundir com bug do componente). Apagar os arquivos
   temporários depois, não commitar.
   **O sandbox já vem com um cluster Postgres local** instalado
   (`service postgresql start`, usuário `postgres` via `sudo -u postgres psql`) — dá pra validar
   migrations novas de verdade (não só ler o SQL): criar um banco de teste, aplicar um stub mínimo
   de `auth.users`/`auth.uid()`/`storage.buckets`/`storage.objects` (Supabase não existe num
   Postgres comum), rodar as migrations em sequência, inserir dados fake pra simular produção, e
   rodar as migrations novas **duas vezes** pra provar idempotência de verdade — muito mais
   confiável que revisão visual sozinha, e foi assim que um bug real de idempotência (`drop policy
   if exists` cobrindo só o nome antigo, ver item 12) foi pego antes de chegar nela. Além disso,
   `node_modules` não vem pré-instalado neste ambiente — rodar `npm install` (uns 20-30s) antes de
   `npm run build`/`npm run lint`, senão o `tsc` do sandbox cai num binário global desalinhado com
   a versão do projeto (erros estranhos tipo `TS5101` sobre `baseUrl` deprecated). Pra rodar
   Playwright fora do fluxo `npm run dev` normal (ex: só pra tirar um screenshot pontual), o pacote
   `playwright` já vem instalado **globalmente** neste ambiente
   (`/opt/node22/lib/node_modules/playwright`) mesmo sem estar no `package.json` do projeto — útil
   pra scripts avulsos de verificação visual sem mexer nas dependências do projeto.
7. **Vercel**: o repositório tem uma integração de deploy automático na Vercel conectada (de
   quando este repo era um site em Next.js, antes da reescrita como app Electron) — isso faz
   alguns PRs mostrarem um check falhando sem relação com o código. Não dá pra desconectar pelo
   código, só pelo painel da Vercel.
8. **Padrão de bug: fallback com `??` em vez de `||`** — `src/lib/supabase.ts` já teve um bug real
   assim (tela em branco: `.env` copiado do `.env.example` define variáveis como **string vazia**,
   não ausente, e `??` só troca `null`/`undefined`). Sempre usar `||` pra fallback de
   `import.meta.env.VITE_*`.
9. **Padrão de bug: caminho absoluto de asset quebra só no instalador** — `src="/..."` ou
   `url(/...)` funciona em `npm run dev` (Vite serve a partir de `/`) mas quebra no app empacotado
   (Electron carrega via `file://`, onde `/` tenta ler a raiz do disco). Usar sempre
   `import.meta.env.BASE_URL` em vez de caminho absoluto direto. Só aparece testando o instalador
   de verdade, o sandbox com servidor HTTP local não pega esse tipo de bug.
10. **Padrão de bug: campo de formulário "sem digitar"** — sem `color-scheme: light` declarado, o
    Chromium/Electron usa o tema do Windows pra decidir a cor do texto dentro de
    `input`/`select`/`textarea`; com Windows em modo escuro, o texto digitado fica branco sobre
    fundo claro (invisível, mas é digitado normalmente). Corrigido com `color-scheme: light` no
    `:root` de `globals.css`. Se um campo "não aceitar digitação" de novo, confirmar selecionando
    o texto com o mouse antes de investigar outra coisa.
11. **Padrão de bug: ação sem efeito visível (ex: "Excluir")** — sempre confirmar que a função tem
    `try/catch` chamando `setErro(mensagemDeErro(err))`. Sem isso, uma exclusão que falha (ex:
    registro com FK vinculada, bloqueada de propósito) parece "não fazer nada" — o erro real
    nunca aparece em lugar nenhum.
12. **Padrão de bug: migration "idempotente" que não é** — toda migration que reafirma
    "idempotente, seguro rodar de novo" precisa dropar o nome **final** do objeto (policy, etc.)
    antes de criar, não só o nome antigo que está substituindo. Sem isso, rodar a migration uma
    segunda vez trava com "already exists" a partir do primeiro objeto cuja versão nova já existia.
13. **Padrão de bug: `infinite recursion detected in policy` (`42P17`)** — sempre que uma RLS
    policy precisa checar uma condição na mesma tabela que ela protege (ex: "é admin?" consultando
    `operadores` dentro de uma policy de `operadores`), usar uma função `security definer`
    (roda com privilégio do dono da função, não reaciona a mesma policy), nunca uma subconsulta
    direta.
14. **Padrão de bug: CSS "sem camada" vence classe do Tailwind, mesmo com especificidade menor** —
    CSS puro escrito direto em `globals.css`, fora de qualquer `@layer`, tem prioridade **maior**
    que qualquer classe do Tailwind (que fica dentro de `@layer utilities`/`base`/etc.), **não
    importa a especificidade**. Reset "globais" (`*`, `body`, seletores soltos) precisam ficar
    dentro de `@layer base` pra não atropelar utilitários mais específicos — foi assim que a barra
    de rolagem customizada (ver seção 2) ficou duplicada com a nativa por uma sessão inteira.
15. **Padrão de bug: RLS sem policy pra uma operação específica falha *em silêncio*, sem erro** —
    uma tabela pode ter policy de `select`/`insert`/`update` e faltar a de `delete` (ou qualquer
    outra combinação) sem ninguém perceber, porque o Postgres não recusa o comando com uma
    mensagem — ele só filtra a zero linhas visíveis pra aquela operação. Do lado do app, um
    `.delete()` (ou `.update()`) que "roda sem erro" mas não muda nada é indistinguível de "deu
    certo" até alguém checar o banco direto. Encontrado assim: `lojas` tinha policy de update mas
    nunca teve uma de delete (migration 0031 só cobriu select/insert/update), então o botão
    "excluir loja" simplesmente não fazia nada — corrigido na migration 0037. **Lição**: toda vez
    que uma tabela ganha uma ação nova (excluir, reativar, etc.), conferir explicitamente se existe
    policy cobrindo *aquele comando exato* — não basta a tabela já ter RLS habilitada com outras
    policies.
16. **Padrão de bug: dropdown customizado com "seleciona no `onClick`" pode nunca disparar o
    clique** — o `Combobox.tsx` (select com busca, ver seção 4) fechava a lista de opções num
    `onBlur` do input, com `onMouseDown={preventDefault}` nos botões de opção só pra impedir que o
    clique tirasse o foco do input antes da hora. Na prática, o `blur` disparou de qualquer forma
    antes do `click` chegar a acontecer (o app roda dentro do Electron, onde o foco de janela se
    comporta diferente de um navegador comum) — a lista fechava e o botão da opção sumia do DOM
    *entre* o `mousedown` e o `click`, então o clique nunca tinha um elemento pra disparar em cima,
    e a seleção simplesmente não acontecia (sem erro nenhum, só "não fazia nada"). **Lição**: em
    qualquer dropdown customizado (não é só esse — vale pra qualquer coisa parecida no futuro), a
    seleção precisa acontecer no **próprio `onMouseDown`** do item (com `preventDefault()` pra não
    perder o foco), nunca separada num `onClick` posterior — `mousedown` sempre dispara antes de
    qualquer `blur` resultante da mesma interação, então a seleção fica imune a essa corrida.
17. **Reincidência do "campo sem digitar" (item 10), causa nova**: `globals.css` força
    `input, select, textarea { color: #fff }` fora de `@layer` (vira letra branca em todo campo do
    app, prioridade maior que qualquer classe Tailwind — mesma regra do item 14). Isso é correto na
    maioria das telas (cards escuros), mas `LinhaEdicaoLoja` (`LojasSection.tsx`) e
    `LinhaEdicaoDeposito` (`DepositosSection.tsx`) — as duas linhas de edição inline de Loja/Depósito
    — envolviam o formulário num `bg-white/10` (fundo **claro** translúcido, resquício do tema claro
    antigo que sobrou na migração pro tema escuro/neon). Letra branca forçada + fundo quase branco =
    texto invisível, tanto o valor já preenchido quanto o que a usuária digitava — ela relatou como
    "dá pra apagar, mas não dá pra escrever" (o apagar parecia funcionar porque o campo ficava
    "vazio" visualmente do mesmo jeito antes e depois; o digitar "não funcionava" porque o texto novo
    também nascia invisível). Corrigido trocando `bg-white/10` por `bg-black/20` nos dois
    componentes. **Lição**: qualquer fundo `bg-white/*` sobrando de layout antigo é suspeito nº 1
    quando um campo "não aceita digitação" — confirmado que não existe mais nenhum `bg-white/*`
    envolvendo `<input>`/`<select>`/`<textarea>` no restante do app (os `bg-white/*` que sobraram são
    hover de botão/aba/dropdown, sem input dentro, então seguros).

    **Terceira reincidência da mesma família, achada numa varredura sistemática (não por relato
    dela)**: os dois gráficos de Relações (`GraficoBarras.tsx`, `GraficoRadar.tsx`) desenhavam a
    caixinha de valor que aparece ao passar o mouse com `bg-sakura-purple-dark` + `text-white`.
    **A armadilha está no nome do token**: `sakura-purple-dark` era roxo escuro no tema claro
    antigo (letra branca em cima fazia todo sentido) e virou uma cor **clara** (`#e8d5e5`) na
    migração pro tema escuro — ou seja, virou branco sobre branco, contraste **1,39:1** contra o
    mínimo legível de 4,5:1 do WCAG. Corrigido pra `bg-sakura-pink-soft` (`#1a1018`) + borda sutil,
    subindo pra 18,56:1. **Lição maior que o bug**: `bg-white/*` não é o único suspeito — qualquer
    uso de `sakura-purple-dark` como **fundo** é candidato pelo mesmo motivo, e o nome do token
    ativamente engana quem lê o código. Por isso a varredura virou ferramenta permanente:
    **`npm run contraste`** (`scripts/varredura-contraste.mjs`) lê toda string de `className` do
    app e aponta combinação de fundo claro + letra clara (ou fundo escuro + letra escura). Rodar
    depois de qualquer mexida grande de estilo — hoje passa limpo. Ele não enxerga fundo e texto
    declarados em elementos diferentes, então continua valendo olhar a tela; serve pra pegar de
    graça o caso mais comum, que é fundo e cor na mesma classe.
    **Desde 12/09/2026 existe a outra metade**: `npm run contraste:telas`
    (`scripts/varredura-contraste-dom.mjs`, item TR-01.3 do guia) abre o app de verdade, percorre
    as 54 telas e mede a cor que a pessoa **realmente enxerga** — compondo cada fundo translúcido
    com o que está atrás dele até achar um opaco. É justamente o que a varredura por `className`
    não tem como saber, e é onde este app se complica, porque quase toda tela fica dentro de um
    `sakura-card`, que é vidro. Os dois existem, e não um só, porque este é lento (uns 3 minutos,
    precisa de navegador) e aquele é instantâneo.
18. **Padrão de bug: `process.env.npm_package_version` não existe no app empacotado** —
    `VersaoApp.tsx` (canto inferior direito, em toda tela) sempre dependeu dessa variável, que o npm
    só injeta quando o processo é lançado via `npm run ...`. No `.exe` instalado (aberto direto,
    sem `npm` por trás), ela nunca existiu — o número da versão nunca apareceu de verdade pra
    usuária, só passou despercebido até ela usar o instalador real pela primeira vez (antes disso,
    sempre rodava via `npm run dev`). **Corrigido** (`electron/main.ts` + `electron/preload.ts`):
    `main.ts` seta `process.env.SAKURA_APP_VERSION = app.getVersion()` (API do próprio Electron,
    funciona igual em dev e empacotado) antes de criar a janela, e o preload repassa essa variável
    pro app via `contextBridge`. **Cuidado testado e descartado**: a primeira tentativa de correção
    usou `createRequire(import.meta.url)` pra ler `package.json` direto do preload — parecia certo,
    mas quebrava em silêncio (o helper que o Vite gera pra resolver `import.meta.url` num preload
    empacotado como `.mjs` calcula a URL base errado nesse contexto, então o `require` relativo
    nunca achava o arquivo e o preload inteiro parava de rodar **antes** de chegar no
    `contextBridge.exposeInMainWorld` — nem `window.sakuraApp` existia mais). Só foi pego testando
    de verdade com Electron real (`playwright._electron.launch`, ver item 6 da seção 6) — leitura de
    código sozinha não teria achado. **Lição de teste**: `app.getVersion()` só lê a versão certa do
    `package.json` quando o Electron é apontado pra **raiz do app** (onde está o `package.json` com
    o campo `main`) — apontar direto pro arquivo `dist-electron/main.js` (em vez de `.` ou da pasta)
    faz o Electron cair no fallback e devolver a própria versão do Electron, não a do app; só
    descoberto comparando os dois jeitos de lançar o teste.
19. **Padrão de bug: `autoUpdater` roda "no escuro"** — `checkForUpdatesAndNotify()` nunca teve
    nenhum listener de evento, então sucesso, download e erro eram tudo invisível — sem log, sem
    mensagem, nada. Isso vira um problema real na hora de diagnosticar "por que não atualizou":
    nem dá pra abrir o DevTools do processo principal (onde o `autoUpdater` roda) pelo Console do
    renderer, que é uma **outra** parte do processo — e um app aberto por duplo clique não tem
    terminal nenhum visível pra pegar `console.log`. **Corrigido**: `electron/main.ts` agora escreve
    cada evento (`checking-for-update`, `update-available`, `update-not-available`,
    `download-progress`, `update-downloaded`, `error`) num arquivo de texto simples
    (`atualizacoes.log`, em `app.getPath("userData")` — no Windows, algo como
    `%APPDATA%\Sakura System - AutoCenter Edition\atualizacoes.log`) em vez de puxar uma
    dependência nova só pra log. Se um `v0.9.3` não tiver sido instalado sozinho na loja mesmo com
    o build publicado com sucesso no GitHub, esse arquivo (a partir da próxima versão que já tiver
    esse log) é o primeiro lugar pra olhar.
20. **Continuação do item 15 (`excluirLoja()`): faltavam 4 tabelas, não só `depositos`** — a
    correção da sessão anterior (que apaga `depositos` antes da loja) não foi suficiente na prática:
    testando a exclusão de uma loja de teste de verdade (a usuária tentando excluir a "Loja 2"),
    o erro genérico "ainda tem dados vinculados" continuou aparecendo mesmo depois de limpar todo
    dado de negócio e mover os funcionários pra outra loja. Causa: as 4 tabelas de configuração
    "1 linha por loja" da fundação multi-loja (`configuracoes_garantia`,
    `configuracoes_fiscais_loja`, `configuracoes_painel_inicio`, `configuracoes_juros_parcelas`,
    migration 0033) também referenciam `loja_id` sem `ON DELETE CASCADE` — toda loja sempre tem uma
    linha em cada uma (exceto `configuracoes_juros_parcelas`, só criada quando o admin configura um
    juro de verdade), então **qualquer exclusão de loja sempre bateria nesse mesmo bloqueio**, não
    só a de teste. Corrigido generalizando `excluirLoja()` pra apagar as 5 tabelas de configuração
    por loja (`depositos` + as 4 acima) antes de tentar apagar a loja em si — validado de ponta a
    ponta num Postgres local (mesmo cenário: loja com depósito + as 4 configs, exclusão bem
    sucedida sem erro de FK). **Lição**: ao corrigir um bug de "tabela X sem cascade bloqueando Y",
    conferir a lista **completa** de tabelas que referenciam Y do mesmo jeito, não só a que
    apareceu no primeiro relato — meio-corrigir um bug desses é pior que não mexer, porque parece
    resolvido até alguém testar de novo com dado real.
21. **Padrão de bug: auto-update via GitHub Releases não funciona com repositório privado** — a
    `v0.9.5` foi publicada com sucesso (release completa, com `.exe` e `latest.yml`), mas o app
    instalado (`v0.9.4`) não se atualizou sozinho, do mesmo jeito que já tinha acontecido da `v0.9.2`
    pra `v0.9.3`. Causa: o repositório `amigao` (hoje `sakura-system-ace`) era **privado**, e o
    `electron-updater` checa atualização baixando o `latest.yml` da release **sem nenhuma
    autenticação** — confirmado testando direto: `curl` no link de download da release dava **404**
    sem estar logado, exatamente como o app instalado tentaria acessar. Corrigido
    **tornando o repositório público** (Settings → General → "Change visibility") — depois da
    mudança, o mesmo link passou a responder **302** (redireciona pro arquivo) em vez de 404.
    **Alternativas descartadas**: embutir um token de acesso dentro do `.exe` pra continuar privado
    (rejeitado — qualquer pessoa consegue extrair esse token do instalador, dando acesso de leitura
    ao repositório inteiro pra quem tiver o instalador em mãos) e manter um repositório-espelho
    separado só com os binários (mais seguro que o token, mas mais complexo de manter; não usado
    porque não há segredo real dentro do repositório principal — chaves reais como
    `ANTHROPIC_API_KEY` e a chave `sb_secret_...` nunca ficaram commitadas, só a chave
    `anon`/publishable do Supabase, que é feita pra ser pública). **Lição**: `electron-updater` com
    provider `github` **exige repositório público** pra funcionar sem configuração extra — se um dia
    o repositório precisar voltar a ser privado (ex: código sensível de verdade), rever esse
    mecanismo de atualização antes, não depois de publicar uma tag.
22. **Repositório renomeado**: `amigao` → `sakura-system-ace` (pedido da usuária, nome
    antigo era resquício do projeto anterior em Next.js). O GitHub redireciona automaticamente o
    nome antigo pro novo por um tempo (não quebra na hora), mas `package.json` →
    `build.publish.repo` foi atualizado pro nome novo porque é usado ativamente toda
    vez que uma versão é publicada — deixar apontando pro nome antigo arriscaria depender do
    redirecionamento indefinidamente. **Se `git pull`/`git push` local parar de funcionar depois
    dessa mudança**, rodar `git remote set-url origin
    https://github.com/sakura-corp/sakura-system-ace.git` no terminal.
    **Segunda mudança de endereço, 29/09/2026**: ela transferiu o repositório da conta pessoal pra
    organização `sakura-corp` (`caranovavidanova/sakura-system-ace` → `sakura-corp/sakura-system-ace`).
    Mesmo cuidado: `build.publish.owner` foi trocado na `v0.9.47`, e os programas instalados antes
    dela chegam na atualização pelo redirecionamento. **Confirmado na prática**: o PC da casa dela,
    na `0.9.46` e no canal de teste, atualizou sozinho pra `0.9.47` pelo endereço antigo. Esse
    redirecionamento some se alguém criar um repositório `sakura-system-ace` na conta pessoal dela,
    então isso nunca pode ser feito.
23. **Continuação do item 15: operador sem loja vinculada trava "Inativar"/"Excluir" em silêncio** —
    mesma família de bug (RLS sem policy cobrindo o caso vira "botão não faz nada", sem erro).
    Editar/inativar/excluir um operador exige `operador_administra(id)`, que só é verdadeiro se
    quem está logado for admin de **alguma loja que o operador-alvo também tenha acesso**
    (`operador_lojas`, migration 0031). O "Operador Teste" (resíduo de antes da fundação
    multi-loja, só permissão de Início) nunca teve vínculo nenhum em `operador_lojas` — então
    nenhum admin, de nenhuma loja, conseguia mais administrá-lo: o clique em "Inativar" não dava
    erro nenhum, só não mudava nada (update filtrado a 0 linhas pela RLS). **Resolvido excluindo
    esse operador direto pelo painel do Supabase** (Authentication → Users → Delete user) — isso
    ignora a trava de loja (é ação de admin do próprio Supabase) e já arrasta a exclusão da linha
    em `operadores` sozinho, porque `operadores.id` referencia `auth.users(id) on delete cascade`.
    O `funcionarios` espelhado desse operador **não** é apagado junto (a FK
    `funcionarios.operador_id` é `on delete set null`, não cascade) — fica órfão, mas inofensivo;
    dá pra inativar normalmente pela tela de Funcionários, que não tem essa trava de loja. **Não
    foi feita nenhuma mudança de código** — a usuária decidiu não mexer na regra de RLS (o mesmo
    problema pode se repetir no futuro se um admin remover um operador de todas as lojas ao
    editá-lo, deixando-o "órfão" de novo; se isso voltar a acontecer, a solução é a mesma: excluir
    pelo painel do Supabase, não precisa de migration nem correção de RLS a menos que ela peça).
24. **"Importar por foto/PDF" falhava com erro genérico e sem causa visível** — a usuária reportou
    (print da loja de verdade) o erro "Edge Function returned a non-2xx status code" tentando ler
    uma foto `.jfif` de nota de peça. Duas correções aplicadas em `src/lib/iaNotaFiscal.ts`: (a)
    `arquivoParaConteudoNota()` mandava `arquivo.type` direto pra API do Claude sem checar se é um
    dos 4 valores aceitos (`image/jpeg`/`png`/`gif`/`webp`) — um `.jfif` no Windows pode reportar
    `image/pjpeg` ou string vazia, que a API rejeita; agora cai pro `image/jpeg` (compatível com o
    conteúdo real do arquivo) sempre que o tipo não é um dos aceitos nem `application/pdf`. (b)
    `lerNotasFiscais()` lançava só a mensagem genérica do `supabase-js` (`FunctionsHttpError`) sem
    ler o corpo da resposta, que já vinha com o motivo real (mesmo padrão do item 11 — erro
    engolido, ação parece "sem efeito"); agora lê `error.context.json()` antes de desistir.
    **Corrigido no código e já confirmado em parte na prática**: depois da `v0.9.6` chegar
    (auto-update), ela tentou de novo e, em vez do erro genérico de antes, apareceu a mensagem real
    vinda da Anthropic (`"Your credit balance is too low..."`, ver item 25) — prova de que a
    correção do item (b) funcionou (o motivo real agora aparece) e evidência forte de que o (a)
    também funcionou (o pedido chegou até a checagem de crédito da Anthropic, não voltou como
    "media_type inválido"). **Falta só confirmar a leitura de uma nota de verdade** depois que ela
    recarregar o crédito (item 25) — o mecanismo em si (chegar até a IA e ler a resposta) já está
    validado.
25. **Crédito da Anthropic pode acabar sem nenhum uso real no Sakura System, se a mesma chave for
    usada em outro projeto** — logo depois da `v0.9.6` chegar, o "Importar por foto" passou a
    falhar com o erro real da Anthropic: *"Your credit balance is too low to access the Anthropic
    API"*. A usuária tinha colocado US$ 5 de crédito, mas o saldo estava negativo (-US$ 0,06,
    recarga automática desligada) — foi consumido em outro uso da mesma chave da Anthropic, não
    pelo Sakura System. **Não é bug do sistema** — é só um lembrete de que a chave configurada no
    secret `ANTHROPIC_API_KEY` (Supabase → Edge Functions) é a mesma usada em qualquer outro
    projeto/teste que compartilhe essa conta da Anthropic; um consumo em outro lugar derruba o
    crédito do Sakura System sem aviso nenhum na hora. **Hoje não importa**: o "Importar por foto" está
    desligado desde 25/09 (seção 7, Estoque). Se ela religar, conferir o crédito
    (`console.anthropic.com` → Billing) e considerar uma chave só pro Sakura System.
26. **Padrão de bug: filtro client-side descarta linha parcialmente preenchida sem avisar** — em
    `ClienteForm.tsx`, a função que decide quais veículos salvar só mantinha um veículo se o campo
    Placa estivesse preenchido; um carro com Marca/Modelo já digitados mas Placa em branco era
    descartado no clique de "Salvar alterações" sem erro nenhum — parecia ter salvo, mas o veículo
    nunca chegava no banco. O motivo de existir era evitar salvar a linha 100% vazia que todo
    formulário de veículo nasce com; a correção foi trocar "tem placa?" por "tem **qualquer** campo
    preenchido?" (`veiculoTemAlgumDadoPreenchido()` em `schemas/cliente.ts`). **Lição**: um filtro
    client-side que decide "isso conta como preenchido?" olhando só pra UM campo é arriscado quando
    o formulário tem vários campos opcionais — testar o caso de preencher só os outros campos, não
    só o caso feliz de preencher tudo.
27. **Padrão de bug: `.value` de `input[type=date]` fica vazio até a data estar completa** — o
    seletor de data nativo do Chromium só preenche a propriedade `.value` em JS quando as 3
    "caixinhas" (dia/mês/ano) já formam uma data válida; no meio da digitação (ex: só o dia
    preenchido) `.value` já volta `""`, mesmo com algo visível na tela — e o navegador não deixa o
    Backspace apagar cruzando de uma caixinha pra outra (não tem API pra controlar isso). O hook
    novo desta sessão que faz Backspace/Delete limpar o campo de data inteiro
    (`useLimparDataAoApagar.ts`, ver seção 7) tinha um `if (!alvo.value) return` que parecia uma
    guarda inofensiva ("só limpar se tiver algo pra limpar"), mas na prática bloqueava o caso mais
    comum: corrigir um dígito errado ainda no meio de digitar a data. **Lição**: não confiar em
    `.value` pra saber se um campo de data "tem alguma coisa digitada" — só serve pra saber se tem
    uma data **completa e válida**.
28. **Padrão de bug: hidden input de `id` manda `""` (não `undefined`) pra um item novo de
    `useFieldArray`** — reportado pela usuária (print da loja de verdade): editar um cliente já
    existente e clicar "+ Adicionar veículo" pra incluir um carro novo dava
    `invalid input syntax for type uuid: ""` ao salvar, sem gravar nada. Causa: o item novo (sem
    `id` de banco ainda) tem um `<input type="hidden">` registrado pelo react-hook-form pro campo
    `id` (ver "Padrão de formulário" na seção 4 — todo item de lista dinâmica com `id` de banco
    precisa desse hidden input); como HTML não tem como um input "não ter valor", o formulário lê
    esse campo como string vazia `""`, não `undefined`. `atualizarCliente()`
    (`src/lib/clientes.ts`) mandava **todos** os veículos pro mesmo `upsert`, inclusive o novo com
    `id: ""` — o Postgres recusa string vazia numa coluna `uuid`. **Corrigido** separando os
    veículos em dois grupos antes de gravar: com `id` vão pro `upsert` de sempre (atualiza); sem
    `id` vão pra um `insert` à parte, sem a chave `id` no payload, deixando o banco gerar o UUID
    sozinho. **Lição**: em qualquer lista dinâmica (`useFieldArray`) com hidden input de `id` (ver
    seção 4), nunca mandar esse campo direto pra um `upsert` sem checar se é string vazia — vale
    conferir os outros módulos que usam esse mesmo padrão (Funcionários/filhos, Ordens de
    Serviço/itens, Pedidos de Compra/itens) se algum tiver o mesmo tipo de fluxo de "editar e
    adicionar item novo" via `upsert` batendo numa coluna `uuid`. Corrigido no código.
    **Continuação (sessão seguinte)**: a mesma correção tinha ficado incompleta — cobria só
    `atualizarCliente()` (editar cliente existente), não `criarCliente()` (cliente novo). Como o
    hidden input de `id` é registrado pra **todo** veículo do formulário, não só em edição, cadastrar
    um cliente **novo** já com um veículo preenchido caía no mesmo erro
    (`invalid input syntax for type uuid: ""`) — `criarCliente()` espalhava `...veiculo` (com
    `id: ""`) direto no `insert()`. A assinatura da função também estava com o tipo errado
    (`veiculos: NovoVeiculo[]`, sem `id`), mascarando o problema: o TypeScript não acusa erro porque
    `ClientesPage.tsx` passa uma variável já tipada `VeiculoFormulario[]` (com `id?: string`) pro
    parâmetro, e checagem de excesso de propriedade só vale pra literais de objeto, não variáveis.
    Corrigido montando o payload do insert campo a campo (mesmo padrão já usado no `insert` de
    veículos novos dentro de `atualizarCliente()`), e corrigido o tipo do parâmetro pra
    `VeiculoFormulario[]`, batendo com a realidade. Reportado pela usuária no chat (sem print, ela
    não conseguiu reproduzir de novo pra capturar — a caixa de veículo "ficou invisível" depois do
    erro, mas não achei nenhum `bg-white`/`bg-*` claro novo em `VeiculosFields.tsx`/`Combobox.tsx`
    que explicasse isso; pode ter sido só o estado visual truncado do próprio erro, vale confirmar
    se voltar a acontecer). Corrigido no código (PR #128, mesclado direto na `main`), **ainda não
    publicado em tag nem confirmado por ela rodando de novo**.
29. **Padrão de bug: `fetch()` direto na tela do Electron pra uma API externa dá "Failed to
    fetch"** — reportado pela usuária testando a emissão de NFS-e de verdade pela primeira vez
    (com o token de homologação): a tela mostrou só `Failed to fetch`, sem detalhe nenhum.
    Causa: a tela do app (processo **renderer** do Electron) é Chromium por baixo — se comporta
    como um navegador comum, inclusive respeitando CORS. APIs feitas pra ser chamadas de servidor
    pra servidor (como a do Focus NFe) normalmente não liberam CORS pra chamada direta de
    navegador, então o `fetch()` é bloqueado **antes** de qualquer resposta chegar — `Failed to
    fetch` é exatamente essa assinatura (diferente de um erro HTTP de verdade, que viria com
    status e corpo). **Corrigido** movendo a chamada de verdade pro **processo principal** do
    Electron (`electron/main.ts`, roda em Node.js — sem CORS, essa restrição é só de navegador),
    exposta pra tela via IPC: `ipcMain.handle("http:fetchComAuth", ...)` no principal,
    `window.sakuraApp.fetchComAuth(...)` repassado pelo preload (`contextBridge`/`ipcRenderer`), e
    `lib/focusNfe.ts` chama essa ponte em vez de `fetch()` direto. **Lição pra qualquer integração
    externa futura** (não só Focus NFe): se for chamar a API de terceiro **direto da tela** (não
    via Edge Function do Supabase, que já roda fora do navegador), primeiro confirmar se aquela
    API libera CORS pra navegador — a maioria das APIs fiscais/financeiras B2B não libera, porque
    são pensadas pra uso servidor-a-servidor. Nesses casos, IPC pro processo principal (esse mesmo
    padrão) é o jeito certo de contornar, não um workaround improvisado.
30. **Padrão de bug: tela "recarrega sozinha" ao voltar de alt-tab, perdendo o que estava sendo
    digitado** — reportado pela usuária: dar alt-tab por só alguns
    segundos e voltar pro app fazia a mesma tela resetar sozinha. Não era o auto-updater (só
    checa uma vez na abertura do app e só instala ao fechar — não bate com "poucos segundos de
    alt-tab", e ela confirmou que é a mesma tela recarregando, não a tela de login voltando).
    Causa real: um comportamento do Chromium (base do Electron) chamado "window occlusion" — ele
    detecta quando a janela fica oculta atrás de outra, mesmo brevemente, e descarta/recarrega a
    página pra economizar recursos (pensado pra navegador com várias abas em segundo plano, não
    faz sentido pra um app desktop de uso o dia todo, sempre em primeiro plano). **Corrigido**
    desligando essa otimização em `electron/main.ts` via dois parâmetros do Chromium
    (`disable-backgrounding-occluded-windows`, `disable-renderer-backgrounding`, setados antes de
    `app.whenReady()`) + `backgroundThrottling: false` no `BrowserWindow`. **Lição de teste**: o
    bug em si é específico de Windows (a detecção de "occlusion" vem do DWM do próprio Windows) —
    não reproduz no sandbox Linux deste ambiente, só dá pra confirmar a correção de verdade
    testando alt-tab na loja. **Junto nesta mesma leva**: um auto-save de rascunho local (a cada
    30s, sem substituir o botão de Salvar) foi adicionado em `OrdemServicoForm.tsx`
    (`src/hooks/useRascunhoFormulario.ts`) como rede de segurança pra esse tipo de perda de
    progresso (e também serve pra fechamento repentino do programa, não só pra esse bug
    específico) — ver "Ordens de Serviço" na seção 7. **Nenhum dos dois foi confirmado por ela
    rodando de verdade ainda** (mesclado na `main`, sem tag publicada).
31. **Padrão de bug: item acrescentado numa OS já faturada deixa o total maior que o valor
    pago** — descoberto testando a NFC-e de verdade na `v0.9.13`: rejeição da SEFAZ *"Total dos
    pagamentos menor que o total da nota"*. Causa: faturar uma OS grava o pagamento no Caixa (ou
    Contas a Receber) com o total **daquele momento**, mas nada impedia continuar clicando
    "+ adicionar item" numa OS já faturada — o total da OS crescia, o valor já pago/lançado ficava
    pra trás, e a NFC-e (que soma os itens atuais) não batia mais com o pagamento (que ficou
    congelado no valor antigo). Não é só um problema de nota fiscal: mesmo sem emitir nada, isso já
    deixava peça baixada do estoque sem entrada correspondente no Caixa. **Decisão tomada com a
    usuária** (duas opções levantadas: tornar o faturamento editável, ou travar item pós-fatura) —
    optou pela trava, por ser bem mais simples e sem risco fiscal (editar faturamento exigiria
    desfazer/refazer Caixa/Contas a Receber, e se a nota já tivesse sido emitida, cancelar e
    reemitir na SEFAZ). **Corrigido**: o "+ adicionar item" some da tela (`ItensFields.tsx`) e a
    tentativa é bloqueada também no código (`OrdensServicoPage.tsx` → `handleSalvarEdicao`) quando
    `status === "faturada"` — precisando de mais peça/serviço depois de faturado, é OS nova. Só
    afeta OS já **faturada**; enquanto só "concluída" (fechou o serviço mas ainda não faturou)
    continua dando pra acrescentar item numa boa, porque o Caixa ainda nem foi gravado nessa hora.
    **Ponto trazido pela usuária junto**: como faturar virou definitivo pra sempre (não dá mais
    pra corrigir esquecendo um item), o botão "Confirmar faturamento" (`FaturamentoCard.tsx`) ganhou
    uma confirmação explícita (`confirm()`, mesmo padrão de exclusões/cancelamentos já usado no
    resto do app) avisando dessa consequência antes de faturar de verdade. **Publicado na
    `v0.9.14`** (build disparado direto pelo `workflow_dispatch` novo, ver "Empacotamento" na
    seção 7 — sem precisar da usuária mexer na tela do GitHub dessa vez).
32. **Padrão de bug: NFC-e de OS com peça E serviço juntos manda o pagamento cheio da OS, não só
    da parte de peça** — descoberto testando de novo na `v0.9.14`, depois de corrigir o item 31:
    rejeição da SEFAZ *"Ausência de troco quando o valor dos pagamentos informados for maior que o
    total da nota"*. Causa: o lançamento de Caixa (gerado ao faturar) cobre a OS **inteira** (peça +
    serviço), mas a NFC-e representa só a parte de peça — `buscarPagamentosParaNota()`
    (`EmitirNotaFiscalModal.tsx`) mandava o valor cheio do lançamento como se fosse só o pagamento
    da peça, então o total pago informado ficava maior que o total da nota sempre que a OS tinha os
    dois tipos de item juntos (só peça, sem serviço, nunca teve esse problema — só afeta OS mista).
    **Corrigido**: escala cada forma de pagamento proporcionalmente (`totalPecas / totalGeralOrdem`),
    com a última linha absorvendo a diferença de arredondamento pra soma bater exatamente com o
    total da nota (mesmo cuidado de arredondamento já usado em `calcularValorCobrado`, ver item 4 da
    seção 6). **Publicado na `v0.9.15`** e em uso desde então.
33. **Padrão de bug: a chave nova do Supabase (`sb_publishable_...`) não pode ir em
    `Authorization: Bearer`** — reportado por ela na primeira vez que usou a tela de conexão nova
    (`v0.9.16`, print da loja): "Testar conexão" acusava *"O endereço respondeu, mas a chave não foi
    aceita"* mesmo com a chave certa, colada do painel. Causa: `testarConexao()`
    (`src/lib/conexao.ts`) mandava a chave nos **dois** cabeçalhos, `apikey` e
    `Authorization: Bearer`. Isso funcionava com o formato **antigo** de chave anon (`eyJ...`, que
    é um JWT de verdade), mas o Supabase trocou pro formato novo `sb_publishable_...`, que é uma
    chave **opaca** — não é JWT, então usá-la como token de portador é recusado com 401. A própria
    documentação deles lista isso como erro comum. **Corrigido** mandando só `apikey`, que vale
    pros dois formatos. **Por que só a tela nova quebrou, e não o app inteiro**: o `supabase-js`
    também monta `Authorization: Bearer <chave>` quando não há sessão, mas o app praticamente não
    faz chamada REST antes do login (login vai pro `/auth/v1/`, que tolera), então nunca batia
    nesse caso — a tela de conexão foi o primeiro lugar a chamar `/rest/v1/` sem sessão.
    **Lição**: ao escrever qualquer checagem de credencial contra uma API, conferir em qual
    cabeçalho aquela credencial deve ir, em vez de mandar nos dois "por garantia" — mandar a mais
    pode ser o que causa a recusa. A tradução de código HTTP pra mensagem virou função pura
    (`mensagemDoTeste`) com teste, já que o sandbox não alcança `supabase.co` pra testar de ponta a
    ponta.

    **A correção acima NÃO resolveu — e o problema maior era outro (`v0.9.17`)**: com só `apikey`,
    o "Testar conexão" continuou reprovando a chave certa (print dela, já rodando a `v0.9.17`).
    Nunca foi possível confirmar por aqui qual era a causa exata, porque **o sandbox não alcança
    `supabase.co`** — ou seja, eu estava adivinhando o formato da requisição às cegas, duas vezes
    seguidas. **O erro de verdade não foi nenhuma das duas tentativas: foi ter feito uma checagem
    incerta virar pré-requisito pra salvar.** Enquanto `testarConexao()` reprovasse, o botão
    "Salvar e entrar" se recusava a gravar — então um palpite errado meu deixou a usuária
    **sem conseguir usar o sistema**, num computador onde a conexão estava certa o tempo todo.
    **Corrigido em duas frentes**: (a) o teste passou a usar o **próprio cliente do `supabase-js`**
    (`cliente.from("lojas").select("id").limit(1)`) em vez de montar a requisição à mão, então
    percorre exatamente o mesmo caminho que o app usa de verdade e não pode reprovar num detalhe
    de cabeçalho que só existia ali; (b) reprovar no teste **nunca mais impede de salvar** — a
    mensagem de erro passa a vir acompanhada de um botão "Salvar assim mesmo"
    (`ConexaoPage.tsx`), e há um limite de 10s na chamada pra não deixar o botão "Testando..."
    pendurado quando a URL está errada. **Lição que vale além deste bug**: uma validação sobre a
    qual não se tem certeza absoluta serve de **aviso, nunca de tranca** — ainda mais quando ela
    guarda a porta de entrada do sistema e o ambiente de desenvolvimento não consegue testá-la de
    verdade. Se a validação falhar, o pior caso tem que ser "a usuária segue em frente avisada",
    não "a usuária fica de fora". Testado no Electron real sob `xvfb`: o caminho de falha (que no
    sandbox acontece naturalmente, por não haver rede pro Supabase) mostra a saída, grava a
    conexão ao clicar nela, e o app destrava pro login.
34. **Padrão de bug: pegar "o dia" de um timestamp com `.slice(0, 10)` pega o dia em UTC, não no
    fuso local** — reportado pela usuária testando NFS-e em produção **à noite**: faturou uma OS
    de teste e ela **sumiu da lista de Ordens de Serviço** logo depois
    de faturar — mas o lançamento apareceu certinho no Caixa Diário, confirmando que o faturamento
    funcionou, só a lista escondeu por engano. Causa: `data_abertura` vem do banco como timestamp
    em UTC; `OrdensServicoPage.tsx` e `LucratividadeSection.tsx` pegavam o "dia" pra comparar com o
    filtro de período fazendo `ordem.data_abertura.slice(0, 10)` — isso pega o dia **em UTC**. O
    filtro "Até" é calculado em hora **local** (`new Date().toLocaleDateString("sv-SE")`). No fuso
    do Brasil (UTC-3), qualquer horário local a partir de ~21h já é o dia seguinte em UTC — então
    uma OS faturada às 22h49, por exemplo, ficava com "dia" = amanhã em UTC, maior que o "Até: hoje"
    calculado em hora local, e caía fora do filtro (só as OS **faturadas** são filtradas por
    período — OS em aberto sempre aparecem, ver comentário no próprio código). **Corrigido**
    convertendo a data com `new Date(dataIso).toLocaleDateString("sv-SE")` antes de comparar —
    mesmo padrão que `DiarioSection.tsx` (Caixa Diário) já usava certo, e por isso o Caixa nunca
    teve esse sintoma. **Lição**: qualquer comparação de "dia" que mistura uma data vinda do banco
    (sempre UTC) com uma data calculada no navegador (sempre fuso local) é suspeita — sempre
    converter as duas pro mesmo fuso antes de comparar, nunca cortar a string do timestamp direto.
    Corrigido na `v0.9.19`.
35. **Padrão de bug: gráfico de Lucro contava só saída manual do Caixa como "Custos", nunca o
    custo de peça/serviço vendido** — reportado pela usuária: em Relações → Gráficos, "Lucro"
    aparecia com o mesmo valor de "Vendas". Causa: `GraficosSection.tsx` calculava "Custos" a
    partir dos lançamentos de **saída manual** no Caixa (aluguel, sucata etc.) — nunca olhava pro
    `preco_custo` da peça nem pro `custo` do serviço vendido em cada OS faturada. Sem nenhuma saída
    manual lançada no período, Custos ficava zerado e Lucro = Vendas sempre, mesmo período com
    vendas de verdade. **Corrigido**: passou a somar também o custo de aquisição de cada OS
    faturada (mesmo cálculo de `custoPorPeca`/`custoPorServico` já usado em
    `OrdensServicoPage.tsx` e `LucratividadeSection.tsx`), deduplicado por OS — importante porque
    uma OS com pagamento dividido em mais de uma forma gera vários `caixa_movimentos`, e contar o
    custo uma vez por lançamento (em vez de uma vez por OS) dobraria o valor. **Lição**: qualquer
    tela nova que precisar de "custo real" (não confundir com saída manual de Caixa, que é despesa
    operacional tipo aluguel) precisa ir buscar em `pecas.preco_custo`/`servicos.custo` via os itens
    da OS — não tem atalho genérico só olhando pro Caixa. `tsc -b`, lint e os 62 testes passando.

36. **Padrão de bug: cada migration é idempotente sozinha, mas a SEQUÊNCIA inteira não era** —
    variação mais sutil do item 12, achada ao gerar o arquivo de instalação única
    (`supabase/instalacao/instalacao-completa.sql`) e rodá-lo duas vezes no mesmo banco. Cada
    migration passava sozinha, mas 3 delas quebravam na reexecução da sequência inteira, todas com
    `column "id" of relation ... does not exist`: `0018`/`0024`/`0026` criam tabelas de
    configuração "singleton" (`id smallint primary key default 1`) e logo em seguida inserem a
    linha padrão usando `id` — só que a migration `0033`, **bem depois**, troca a PK dessas tabelas
    de `id` pra `loja_id` e derruba a coluna `id`. Na segunda passada, o `create table if not
    exists` pula (a tabela já existe, mas no formato NOVO) e o `insert` logo abaixo bate numa coluna
    que não existe mais. **Corrigido** envolvendo os 3 inserts numa guarda `do $$ ... if exists
    (select 1 from information_schema.columns where ... column_name = 'id') then ... end if`, que
    pula a linha padrão quando a tabela já virou "uma por loja" (a própria `0033` cria as linhas de
    cada loja). Validado rodando a instalação inteira **três vezes seguidas** num Postgres local,
    sem erro. **Lição**: "toda migration é idempotente" **não implica** "a sequência inteira é
    re-executável" — uma migration tardia que muda o formato de uma tabela pode invalidar a guarda
    de idempotência de uma migration anterior. Só aparece rodando a sequência completa duas vezes
    no mesmo banco, nunca revisando arquivo por arquivo.
37. **A instrução de criar o primeiro admin ficou desatualizada por 24 migrations, e quebra toda
    instalação nova** — o comentário de bootstrap no fim de `0007_operadores.sql` manda inserir só
    em `operadores`. Isso valia quando foi escrito, mas a migration `0031` (multi-loja) passou a
    exigir também uma linha em `operador_lojas` pra qualquer coisa por loja ficar visível. O
    backfill da `0031` só cobre operadores **que já existiam quando ela rodou** — num banco novo,
    criado do zero, não existe operador nenhum nesse momento, então o primeiro admin criado depois
    **nunca** ganha vínculo. **Comprovado num Postgres local** simulando o login desse admin
    (`set local role authenticated` + `request.jwt.claim.sub`): ele enxerga `depositos: 0`,
    `configuracoes_painel_inicio: 0`, `configuracoes_fiscais_loja: 0` — ou seja, entra no sistema e
    a loja aparece vazia/quebrada. Pior: cai no item 23 desta seção (operador sem loja não pode ser
    editado nem inativado por ninguém), então nem dá pra consertar pela tela — só apagando pelo
    painel do Supabase e refazendo. **Corrigido** adicionando o segundo `insert` ao comentário da
    `0007`, com o aviso do porquê, e documentando no checklist de instalação com destaque. **Lição
    maior**: comentário de bootstrap dentro de uma migration antiga **não é atualizado pelas
    migrations seguintes** — quando uma migration nova muda o que é preciso pra criar o primeiro
    usuário/registro de algo, procurar ativamente as instruções antigas que ficaram para trás.

38. **[RESOLVIDO em 28/08/2026 — ver item 40]** **O cartão "Lucros mês" da tela Início tem o
    MESMO bug do item 35, que só foi corrigido nos gráficos de Relações.**
    Encontrado por acaso ao gerar as imagens do site: com dados de demonstração plausíveis, o
    Início mostrava lucro de 91% sobre as vendas. `PainelPage.tsx` calcula
    `lucrosMes = vendasMes - custosMes`, onde `custosMes` soma **só os lançamentos de saída do
    Caixa** (aluguel, sucata, fornecedor pago) — nunca o `preco_custo` da peça nem o `custo` do
    serviço vendido em cada OS faturada. Ou seja, o número não é lucro: é
    "vendas − despesas operacionais lançadas à mão". Numa loja que não lança despesa manual
    nenhuma, o cartão mostra o **faturamento inteiro como se fosse lucro**. O item 35 corrigiu
    exatamente isso em `GraficosSection.tsx` (somando o custo de aquisição por OS faturada,
    deduplicado por OS — importante porque pagamento dividido gera vários `caixa_movimentos` pra
    mesma OS), mas `PainelPage.tsx` ficou pra trás. Não foi corrigido na hora — foi só
    reportado pra ela, porque muda um número que ela olha todo dia e merece ser uma mudança
    separada, não escondida dentro do trabalho do site. **Lição que se repete**: ao corrigir um
    cálculo de negócio, procurar **todos** os lugares que fazem a mesma conta (mesma família dos
    itens 20 e 28) — `LucratividadeSection.tsx` também vale conferir junto quando isso for
    atacado.

39. **Campo que "para de aceitar digitação" e volta ao normal reiniciando o app — NÃO
    diagnosticado, mas agora tem como investigar.** Relatado por ela usando o sistema de verdade
    (28/08/2026): foi editar o CPF de um cliente, conseguiu **apagar** mas não conseguiu **digitar**
    — a mesma frase do item 17 desta seção, o que puxa naturalmente pra hipótese de "texto
    invisível". **Mas ela fechou e abriu o app e o problema sumiu sozinho — e isso muda o
    diagnóstico inteiro**: cor de texto não se conserta reiniciando, então não é CSS. Também não são
    os dois hooks globais de teclado (`useEnterParaProximoCampo` só trata Enter,
    `useLimparDataAoApagar` só `input[type=date]`), nem o `Combobox` (só mexe no próprio campo), nem
    o autosave de rascunho (só grava no localStorage). Sobra alguma coisa de **estado do app em
    execução** — o candidato mais provável é um erro de JavaScript solto que deixa parte da tela
    morta até a janela reiniciar. **Tentado reproduzir e não deu**: o `ClienteForm` foi renderizado
    de verdade com um cliente existente, primeiro no navegador e depois **dentro do Electron real**
    (`playwright._electron`, ver item 6) — apagar e redigitar o CPF funcionou nos dois, com letra
    branca sobre fundo escuro e nenhum `bg-white/*` por perto. **Nada foi "corrigido" às cegas**, de
    propósito: é exatamente o erro do item 33 (chutar duas vezes numa correção não testável).
    **O que foi feito**: o app passou a registrar erro de tela em arquivo —
    `%APPDATA%\Sakura System - AutoCenter Edition\erros.log`, mesmo espírito do `atualizacoes.log`
    do item 19 (`src/lib/registrarErros.ts` escuta `error` e `unhandledrejection` e manda pro
    processo principal gravar via IPC `log:erroDaTela`). Sem isso, um erro na tela do app instalado
    é 100% invisível: DevTools só abre em modo dev e um app aberto por duplo clique não tem terminal.
    **Se o sintoma voltar, o primeiro passo é pedir esse arquivo pra ela** — validado no Electron
    real (erro solto e promise rejeitada caíram no arquivo com data, mensagem e pilha).

40. **Três telas calculavam "lucro" de jeitos diferentes — e as três estavam erradas** (achado
    28/08/2026, ela pediu pra conferir os números olhando duas telas do sistema em uso real). É a
    conclusão da família dos itens 35 e 38: o mesmo erro reaparecendo em cada tela nova, porque
    cada uma refazia a conta por conta própria. Os três defeitos:
    - **Caixa Diário — "Lucro do dia" contava o lucro da OS uma vez por LANÇAMENTO.** Desde que o
      pagamento dividido existe (migration 0037), uma OS paga em duas formas gera dois
      `caixa_movimentos`; `totalLucro` somava `lucroDoMovimento(m)`, que devolve o lucro da **OS
      inteira**. No dia real dela: R$ 2.603,04 em vez de R$ 1.589,27 — o lucro da OS 3 (R$ 1.013,77)
      contado duas vezes. A coluna "Lucro" da tabela tinha o mesmo problema: repetia o valor cheio
      da OS em cada linha.
    - **Início — "Lucros mês" mostrava o faturamento como lucro** (é o item 38, que estava
      documentado e não corrigido): `custosMes` só somava saída manual do Caixa, nunca o
      `preco_custo` da peça nem o `custo` do serviço. Numa loja que não lança despesa à mão, o
      cartão mostrava Lucro = Vendas (no print dela: R$ 3.165,00 nos dois).
    - **Início — "Ticket médio" dividia por lançamento, não por OS.** `qtdTicket += 1` por
      movimento com `ordem_servico_id`: 3 OS em 4 lançamentos viravam média de R$ 791,25 em vez de
      R$ 1.055,00.
    **Corrigido de uma vez, com a conta num lugar só**: `src/schemas/metricasCaixa.ts` (funções
    puras testadas) — `resumirMovimentos()` devolve entradas, saídas, custo de aquisição
    (deduplicado por OS), lucro e ticket médio por ordem; `lucroPorMovimento()` reparte o lucro da
    OS entre os lançamentos dela, proporcional ao valor pago em cada um, pra a coluna fechar com o
    total; `custoDosItens()`/`mapaCustoPecas()`/`mapaCustoServicos()` são o cálculo de custo
    compartilhado. Caixa Diário, Início e Relações passaram a usar as mesmas funções — as três
    telas agora respondem o mesmo número pro mesmo período, que antes não acontecia.
    **Mudança de definição que vale saber**: "Lucro do dia" no Caixa agora também desconta as
    saídas lançadas à mão (aluguel, sucata), igual o gráfico de Relações já fazia — antes ignorava.
    **Lição (a mesma dos itens 20, 28 e 35, agora com solução estrutural)**: conta de negócio
    repetida em várias telas sempre diverge. Ao precisar de "lucro", "custo real" ou "ticket
    médio" numa tela nova, usar `schemas/metricasCaixa.ts` — não reescrever a conta ali.

41. **Campo numérico mudava de valor sozinho: a seta ↓ do teclado e a setinha do próprio campo**
    (31/08/2026). Ela achou uma peça com estoque de **1,99 UN** (amortecedor traseiro Ford Ka) e
    disse não ter digitado isso. A tela de Movimentações mostrou a origem exata: uma entrada de
    `1.99` com referência "Estoque inicial (cadastro do produto)" — ou seja, veio do campo "Qtde.
    estoque inicial", não de OS nem de importação. Causa: o Chromium trata **ArrowUp/ArrowDown**
    dentro de um `input[type=number]` como "somar/subtrair um step"; como o campo usa
    `step="0.01"`, um toque na seta pra baixo em cima de "2" deixa exatamente **1.99**. E a seta
    pra baixo é o gesto natural de quem quer descer a tela — dentro de um campo ela não rola a
    página, só mexe no número, sem aviso nenhum. A setinha minúscula do spinner, dentro do campo,
    faz o mesmo com um clique torto. **Corrigido** com `hooks/useNaoMexerNoNumeroSemDigitar.ts`
    (global em `App.tsx`, mesmo padrão do Enter/Backspace: bloqueia só as setas em campo numérico,
    digitação intacta) + CSS em `@layer base` escondendo os spinners. Vale pros 32 campos numéricos
    do app, não só a quantidade — o mesmo acidente num preço de venda mudaria 1 centavo sem deixar
    rastro em tela nenhuma.
    **Lição de método, que quase virou o terceiro chute do item 33**: a primeira hipótese foi a
    **rodinha do mouse** (o clássico "wheel muda input number"), e ela estava **errada** — testado
    no Electron real (Chromium 130), a rodinha não mexe mais no valor; o Chromium tirou esse
    comportamento. Só apareceu porque a hipótese foi testada antes de virar correção, e não depois.
    Testar cedo também evitou o inverso: o Chromium **141** avulso do sandbox e o **130** de dentro
    do Electron respondem diferente, então validar comportamento de campo nativo tem que ser no
    Electron do projeto, nunca num Chromium qualquer.

42. **Padrão de bug: `toISOString().slice(0, 10)` grava o dia em UTC, não o dia de quem está
    usando** (achado em 02/09/2026, numa varredura de cálculo pedida por ela). É o item 34 de
    novo, em **três lugares** que ninguém tinha olhado — e todos os três importam justo à noite,
    que é quando ela costuma mexer no sistema (das 21h em diante o UTC já virou amanhã, no fuso do
    Brasil):
    - `lib/notasFiscais.ts` — a **competência da nota fiscal emitida**. Uma nota emitida às 22h do
      dia 31 era arquivada no **mês seguinte**: some da divisão daquele mês na tela de Notas
      Fiscais (e do .zip do mês, ver seção 7), e chega errada pra contabilidade.
    - `lib/focusNfe.ts` — a **data de emissão** mandada pra Focus NFe. Documento fiscal saindo com
      a data de amanhã.
    - `lib/pedidosCompra.ts` — a data do pedido criado ao importar o XML do fornecedor.
    **Corrigido** com um helper único, `src/lib/datas.ts` (`hojeLocal()` / `diaLocal()`), testado
    inclusive com o fuso fixado em `America/Sao_Paulo` — a máquina de teste roda em UTC, onde esse
    erro **não aparece**, então sem fixar o fuso o teste passaria de qualquer jeito. **Lição**:
    `toISOString()` nunca serve pra saber "que dia é hoje" pro usuário; e um teste de fuso que não
    fixa o fuso não testa nada.
43. **Padrão de bug: "mesmo dia do mês que vem" com `new Date(ano, mes, dia)` transborda em vez de
    recusar** (mesma varredura). Em Contas a Pagar, a conta recorrente com vencimento em **29, 30
    ou 31** — que é justo onde caem aluguel e financiamento — pulava um mês inteiro: 31/01 virava
    "31 de fevereiro", que o JavaScript converte pra **03/03**. E não era só um mês perdido: a
    ocorrência seguinte já nascia dia 3, então o vencimento desandava pra sempre. **Corrigido**
    segurando o dia no último dia do mês de destino (31/01 → 28/02), com teste cobrindo ano
    bissexto e virada de ano. **Resíduo conhecido, aceito**: depois de segurar em fevereiro, o dia
    fica preso no 28 — voltar pro 31 exigiria guardar o dia original numa coluna nova. É bem menos
    grave que pular um mês, mas se um dia incomodar, é uma migration pequena.
44. **Padrão de bug: o desconto do item sumia na NFC-e — em três contas diferentes que faziam a
    mesma coisa** (mesma varredura). `montarItemNFCe()` calculava o valor do item como
    `quantidade × preço`, ignorando o `desconto` da linha da OS; o total dos produtos e a base do
    ICMS, calculados à parte no corpo da nota, faziam o mesmo. Consequência: numa OS com desconto
    em peça, a nota valia **mais do que o cliente pagou**, e como os pagamentos informados são
    rateados sobre o total da OS (que **já** desconta), a soma dos pagamentos ficava menor que o
    total da nota — a mesma família de rejeição da SEFAZ dos itens 31 e 32. **Corrigido** com uma
    função só (`valorLiquidoItem`) usada pelos três lugares. O desconto entra **abatido no preço
    unitário**, não num campo separado, porque a SEFAZ confere que "valor bruto = quantidade ×
    unitário" — e porque inventar nome de campo fiscal sem documentação é exatamente o que este
    projeto já decidiu não fazer (ver item 1 da seção 8). **Lição**: sempre que uma conta de
    dinheiro aparece em mais de um lugar, ela vai divergir — é a terceira vez que isso acontece
    aqui (itens 35, 40 e agora este).
45. **Dois erros menores da mesma varredura, corrigidos junto**: (a) o filtro de "este mês" dos
    cartões do Início comparava **só o dia do mês** (`getDate() <= hoje`) depois de checar que não
    era de antes do mês — então um lançamento de 1º de dezembro entrava no cartão de setembro;
    agora compara data inteira. (b) `calcularListaParcelas()` dividia o total pelo número de
    parcelas sem arredondar: R$100 em 3x virava "3x de R$ 33,33", que soma R$ 99,99 na frente do
    cliente. Agora a última parcela absorve a sobra, como faz a maquininha — mesma técnica que o
    rateio de pagamento da nota já usava.

46. **Varredura só da parte fiscal (02/09/2026)** — pedida logo depois da varredura de cálculo.
    Cinco defeitos corrigidos, todos do tipo "falha em silêncio":
    - **Alíquota do ISS em branco virava 0% na nota.** `montarCorpoNFSe()` mandava
      `aliquota_iss ?? 0` sem checar nada — diferente do código do município e do CNAE, que já
      tinham guarda. A prefeitura autorizaria a nota com ISS zerado e o problema só apareceria
      depois, com a contabilidade. Agora a emissão para antes, explicando o que falta.
    - **A `ref` da emissão sumia quando a espera vencia.** A emissão é assíncrona: o sistema manda
      a nota e fica consultando por ~30s. Estourando esse tempo, a mensagem antiga dizia "consulte
      de novo" — **sem dizer o quê**: a `ref` (o único jeito de achar a nota no painel da Focus
      NFe) só existia dentro daquela função e se perdia. Como a nota **pode ter saído autorizada**,
      o caminho natural seria clicar em emitir de novo e acabar com **duas notas válidas pra mesma
      venda**. Agora a `ref` aparece na mensagem, junto com o aviso de conferir antes de reemitir.
    - **Excluir uma nota autorizada não avisava nada.** O botão "Excluir" de Notas Fiscais tratava
      nota emitida pelo sistema como arquivo qualquer: apagava o registro e o XML, **sem desfazer
      nada na SEFAZ** — a nota continua valendo lá fora, o XML (guarda obrigatória de 5 anos) some,
      e a OS volta a aparecer como "falta nota", convidando a emitir a segunda. Agora, só nesse
      caso, a confirmação explica isso e aponta pro botão "Cancelar nota", que é o certo.
    - **Competência da nota emitida gravava o dia da emissão**, enquanto o upload manual grava
      sempre o dia 1º — dois formatos na mesma coluna. Normalizado (`primeiroDiaDoMesLocal()`).
    - **`valor_servicos` e `aliquota` da NFS-e iam como número sem arredondar** — são os únicos
      valores do corpo que não são texto com 2 casas, e soma de item em ponto flutuante pode
      produzir `90.00000000000001`, que iria assim pro XML.
    **Lição comum aos cinco**: a parte fiscal quase nunca falha com erro na tela — ela falha
    autorizando algo errado, ou perdendo o rastro de um documento que já existe lá fora. Ao mexer
    aqui, a pergunta útil não é "isso dá erro?", é "se isso estiver errado, alguém fica sabendo?".

47. **A importação de nota do fornecedor copiava o código de ICMS DELE pro cadastro da loja**
    (09/09/2026, reportado por ela com print). Emitir NFC-e passou a falhar com *"Rejeição:
    Informado CST para emissor do Simples Nacional (CRT=1 ou 4) [nItem:1]"*. Causa: quem é do
    Simples usa **CSOSN** (3 dígitos), quem é do regime normal usa **CST** (2 dígitos) — e tanto
    o "Importar XML de nota fiscal" quanto o "Importar por foto" gravavam em `pecas.cst_ou_csosn`
    o código que veio na nota do **fornecedor**. Fornecedor do regime normal manda CST, a peça
    nasce com um código que a nota dela nunca vai aceitar, e o erro só aparece semanas depois, na
    emissão.
    **Dois agravantes que fizeram isso custar caro**: (a) a mensagem da SEFAZ diz só o número do
    item (`[nItem:1]`), **nunca o nome da peça** — achar qual das peças da OS está errada é
    adivinhação; (b) o campo parecia preenchido, então não havia nada na tela sugerindo problema.
    **Corrigido em três frentes**, com a regra isolada em `src/schemas/tributacao.ts` (funções
    puras, 17 testes): as duas importações deixam de copiar o código do fornecedor quando ele não
    serve pro regime da loja (usam o CSOSN que a **própria loja** mais usa no cadastro dela, ou
    campo em branco — nunca um código inventado por aqui); e a tela de emissão passa a conferir
    antes de mandar, listando **o nome de cada peça** e o motivo. **É aviso, não trava** (mesma
    lição do item 33): a lista de códigos válidos envelhece com mudança de legislação, e barrar a
    emissão por causa de um palpite daqui seria pior que deixar a SEFAZ decidir.
    **Cuidado que apareceu no preview e vale pra qualquer tela nova**: o primeiro desenho colocava
    o campo de CSOSN **dentro** da faixa amarela de aviso (`bg-amber-50`, fundo claro) — e
    `globals.css` força `input { color: #fff }` fora de `@layer`, então o campo nasceu ilegível.
    É a família dos itens 14/17, e o `npm run contraste` **não pega** esse caso (fundo e texto
    ficam em elementos diferentes). Regra prática: **campo de formulário nunca vai dentro de uma
    faixa de aviso clara** — o aviso fica só com o texto, e o campo desce pro fundo escuro do card.

48. **As checagens deixaram de depender de alguém lembrar (11/09/2026).** Até aqui, `tsc`, lint,
    `npm test`, `npm run contraste` e "o `instalacao-completa.sql` está em dia?" eram rodados **à
    mão, sessão a sessão** — o que significa que cada sessão nova (sem memória da conversa
    anterior) podia simplesmente não rodar. Agora há um CI (`.github/workflows/ci.yml`) que roda as
    cinco em todo push e PR. Duas travas novas foram junto, e as duas nasceram de bug real:
    - **Regra de lint contra cortar o dia em UTC** (`eslint.config.js`,
      `no-restricted-syntax`). O bug dos itens 34 e 42 já voltou **quatro vezes** — a correção
      sempre foi trocar os lugares achados, o que nunca impediu o quinto. Agora
      `.toISOString().slice(...)` e cortar exatamente 10 caracteres reprovam o lint.
      **Cuidado ao mexer**: a regra proíbe o GESTO de cortar o dia, **não** o `toISOString()` em
      si — gravar um instante completo em UTC (`data_pagamento`, `data_fechamento`,
      `atualizado_em`) está certo e continua liberado. Proibir `toISOString` inteiro geraria ~10
      falsos positivos e ensinaria a espalhar `eslint-disable`, que é pior que não ter regra. As
      duas ÚNICAS exceções declaradas são `datas.test.ts` e `comissoes.test.ts`, que cortam o dia
      errado de propósito pra provar que o jeito errado erra.
    - **A suíte roda nos dois fusos** (`npm run test:fusos`,
      `scripts/testar-nos-dois-fusos.mjs`). A máquina de teste — aqui e no GitHub — usa UTC, e é
      justamente em UTC que esse bug **não aparece**. Antes, cada teste que se importava precisava
      lembrar de fixar o fuso na mão. **Não trocar por `TZ=x npm test` no `package.json`**: essa
      sintaxe não funciona no PowerShell do Windows, que é onde ela roda os comandos.
    **O que ainda depende dela**: deixar o CI como obrigatório pra mesclar (Settings → Branches)
    só **depois** de ver ele verde algumas vezes — travar o merge antes disso atrapalharia o fluxo
    de mesclar direto na `main`, que é decisão dela (seção 3).

49. **A mesma conta de centavo estava escrita 12 vezes — e uma delas estava errada (11/09/2026).**
    A varredura do guia de melhorias (TR-05.3) começou como uma conferência de tipo de coluna e
    achou três coisas encaixadas:
    - **A boa notícia primeiro**: nenhuma coluna de dinheiro do banco é `double precision` — o erro
      de ponto flutuante nunca entrou pelo armazenamento. Inventário completo na seção 5, pra
      ninguém precisar checar de novo.
    - **O bug**: `valorTotal`, em `faturarOrdem()` (`src/lib/ordensServico.ts`), somava os
      pagamentos com um `reduce` **sem arredondar**, e esse valor ia pro banco em Contas a Receber.
      Somar números **já arredondados** ainda deixa cauda (`0.1 + 0.2` dá `0.30000000000000004`), e
      a coluna `contas_receber.valor` era `numeric` sem casas declaradas, então guardava a cauda
      inteira — testado num Postgres local: `1234.5600000000002` foi gravado com as 13 casas. Não
      dava erro em lugar nenhum e não aparecia na tela (a exibição formata em 2 casas), que é
      exatamente o tipo de defeito que este projeto costuma descobrir tarde.
    - **A causa de fundo**: a expressão `Math.round(valor * 100) / 100` estava escrita **12 vezes
      em 7 arquivos**, sendo 4 delas funções privadas idênticas chamadas `arredondar`, copiadas de
      um arquivo pro outro. É a quarta vez que "conta de dinheiro repetida divergiu" neste projeto
      (itens 35, 40 e 44). Virou `src/schemas/dinheiro.ts` — `paraCentavos`, `deCentavos`,
      `arredondarCentavo` e `somar` —, usado pelos 7 arquivos.
    **Decisão deliberada: a aritmética NÃO mudou.** `arredondarCentavo` faz exatamente a mesma
    conta que já estava espalhada, inclusive o canto conhecido dela (1,005 vira 1,00, não 1,01,
    porque em binário 1,005 fica um fio abaixo da metade). Mudar a regra de arredondamento
    alteraria valor que sai em nota fiscal e em lançamento de caixa — isso é decisão dela, não
    efeito colateral de uma arrumação de código. Há um teste que **fixa** esse comportamento, pra
    que mudá-lo um dia seja escolha visível.
    **Trava pra não voltar**: `src/schemas/arquitetura.test.ts` varre `src/pages/` e reprova conta
    de dinheiro escrita dentro de tela. Ele pega as duas formas do item 40
    (`const lucro = vendas - custos` e `const ticketMedio = total / qtd`) e deixa passar tela que
    só **chama** a função pura. Foi calibrado contra o código real, não no papel: a primeira versão
    passou batido justo na forma mais comum do bug, e acusou dois falsos positivos porque a barra
    de um fecha-tag de JSX (`</td>`) parece uma divisão.
    **Duas telas estão na lista de dívida conhecida do teste**, com nome e sobrenome, porque já
    faziam conta de dinheiro antes dele existir: `relatorios/LucratividadeSection.tsx` (receita,
    custo e margem por item — já apontada no item 38 e nunca movida) e
    `estoque/RelatoriosEstoqueSection.tsx` (valor do estoque = saldo × preço de custo). Mover as
    duas é refatoração de tela (pede preview renderizado), não foi feito aqui. O teste garante que
    a lista **não cresce**, e reprova pedindo pra apagar a entrada se alguém mover a conta — assim
    ela encolhe em vez de envelhecer.
    **Uma conta saiu de dentro da tela nesta leva**: `jurosDasLinhas` (quanto os juros do cartão
    acrescentam no pagamento dividido) morava em `FaturamentoCard.tsx` e virou função pura testada
    em `schemas/faturamento.ts`.

50. **A varredura de segredo automática NÃO pega o tipo de credencial que vazou aqui
    (11/09/2026)** — e é importante não confundir as duas coisas. O CI agora roda `gitleaks`
    (`.gitleaks.toml`), com 3 regras próprias além das de fábrica, porque as de fábrica foram
    **testadas** contra os formatos deste projeto e deixavam passar justamente
    `sb_secret_...` (Supabase) e `sk-ant-...` (Anthropic) — as duas que ele de fato manuseia.
    **Mas**: varrer o histórico completo (414 commits) com as regras de fábrica devolveu
    *"no leaks found"*, mesmo o CSC da SEFAZ, o token do portal Giap e a senha da prefeitura
    estando lá. O motivo é simples e vale entender: essas três são **texto comum**, sem formato
    que as distinga de uma palavra qualquer. Nenhuma ferramenta pega. **Conclusão prática**: a
    varredura é uma rede pra chave de API; a proteção contra colar senha de portal é a regra no
    topo deste arquivo, e trocar as três credenciais continua sendo obrigatório.
    **Duas decisões de desenho, pra não serem "corrigidas" depois**: (a) o CI varre a árvore de
    arquivos **como ela está agora** (`--no-git`), não o histórico — uma checagem que nunca pode
    ficar verde (o histórico já carrega segredo, e reescrever histórico está proibido: quebraria o
    auto-update e invalidaria as releases) é uma checagem que todo mundo aprende a ignorar; (b) há
    um passo separado que reprova se um `.pfx`/`.p12`/`conexao.json` for versionado — certificado
    digital é a identidade fiscal da empresa, e o repositório é público.

51. **Classe do Tailwind vence CSS de `@layer base` — o lado inverso do item 14 (11/09/2026).**
    Ao dar foco de teclado ao app (`TR-02.2`), a regra `:focus-visible` foi escrita em
    `@layer base`, como manda o item 14. Só que existiam **78 `outline-none` espalhados em 37
    arquivos**, nos campos de formulário. Como classe do Tailwind, eles moram na camada
    `utilities`, que vence a `base` **não importa a especificidade** — ou seja, o anel de foco
    funcionaria em tudo, menos justo nos campos onde ele mais importa. Foram removidos (o
    `focus:border-sakura-purple` que acompanhava cada um ficou, agora como reforço).
    **Lição**: o item 14 diz que CSS fora de camada vence classe do Tailwind; o contrário também
    é verdade, e é o caso mais comum — ao escrever regra global em `@layer base`, procurar antes
    a classe utilitária que a anula.

    **Cuidado de portal, da mesma leva**: toda lista do app fica dentro de
    `overflow-hidden sakura-card`, então um menu suspenso posicionado ali dentro nasce
    **recortado**. E `position: fixed` **não** salva: o `backdrop-filter` do `sakura-card` vira
    bloco de contenção pra elemento fixo. Por isso o menu de `AcoesDaLinha.tsx` é renderizado num
    portal pro `<body>`. Vale pra qualquer coisa suspensa que venha a existir dentro de um card.

52. **`Number(undefined)` é `NaN`, e comparador que devolve `NaN` não ordena nada (11/09/2026).**
    O menu de ações novo ordena pra deixar o destrutivo por último — a garantia que o item
    `TR-02.1` inteiro existe pra dar. O comparador era
    `Number(a.tipo === "menu" && a.perigosa) - Number(...)`; quando `perigosa` vem `undefined`,
    aquele `&&` devolve `undefined` e `Number(undefined)` é **`NaN`**, não `0`. Comparador que
    devolve `NaN` faz o `sort` não reordenar nada, e o **"Excluir" nascia em primeiro no menu**,
    bem onde o dedo cai. Corrigido com `=== true`. **Lição de método, mais que de JavaScript**:
    isso passou pela leitura do código e foi pego pelo teste de tela, que conferia justamente a
    promessa do item ("o destrutivo é o último"). Quando uma mudança tem uma promessa em uma
    frase, essa frase vira teste.

53. **Três lições de uma mudança grande e chata (a escala tipográfica, 11/09/2026).** O item
    `TR-01.1` trocou 756 classes de tamanho de fonte em 89 arquivos. O trabalho em si foi
    mecânico; o que valeu aprender foi o resto:
    - **A premissa do guia estava errada, e só o código sabia disso.** Ele pedia tabela em 13px
      "porque estão em 11-12px". Conferido: **25 das 28 tabelas já usavam 14px** — obedecer teria
      ENCOLHIDO justo o que o item veio consertar. O guia é um bom cardápio, mas ele foi escrito a
      partir de PDF e documentação, não do código; quando ele der um número, conferir o número
      antes de aplicar.
    - **Uma mudança de tela quebrou uma FERRAMENTA do repositório, em silêncio.** O `TR-02.1`
      moveu "Cancelar nota" pra dentro do menu de três pontinhos — e o gerador do catálogo de
      telas (`site/ferramentas/gerar-catalogo-telas.mjs`), que clica nesse botão pelo texto,
      passou a falhar naquela cena. Nada no app quebrou, então nada avisou. Só apareceu ao rodar
      o gerador de novo, uma leva depois. **Lição**: ao mudar rótulo ou lugar de um botão,
      `grep` pelo texto dele em `site/ferramentas/` — é onde mora o único teste de tela que
      existe hoje.
    - **O gerador precisa de um `.env` na raiz, mesmo de mentira.** Sem ele, o app abre na tela de
      **conexão** em vez do login e **todas** as 54 cenas falham com timeout no botão de entrar —
      um sintoma que não sugere a causa em nada. O `.env` não é commitado, então toda máquina
      recém-clonada cai nisso. Já está escrito no topo do próprio gerador.
    **E o que de fato protege a escala não é este parágrafo**: é
    `src/schemas/tipografia.test.ts`, que reprova classe de tamanho crua em `src/` apontando
    arquivo e linha. Ele foi conferido plantando um `text-xs` de propósito pra vê-lo reprovar —
    teste de regra que nunca falhou na frente de alguém não prova nada (a primeira versão do teste
    de arquitetura, item 49, passou batido justo na forma mais comum do bug).

54. **Duas cores de texto no mesmo elemento: vence a que o Tailwind escreveu por último NO CSS,
    não a última do `class=` (11/09/2026).** O componente `<Valor>` nasceu pra uma coisa só —
    fazer prejuízo parecer prejuízo no Início — e a primeira versão recebia a cor junto com o
    tamanho, num `className` só: `text-red-400` (do componente) e `text-sakura-purple-dark` (de
    quem chamava) acabavam no mesmo elemento. Resultado: **o prejuízo saiu na tela com a cor de
    sempre**, ou seja, o componente não fazia exatamente aquilo que ele existia pra fazer.
    Leitura de código não pegou; renderizar a tela pegou na primeira olhada.
    É a terceira cara da mesma família (itens 14 e 51): ali era camada — CSS fora de `@layer`
    vence classe do Tailwind, e classe do Tailwind vence `@layer base`; aqui é **ordem dentro da
    mesma camada**, onde a ordem do atributo `class` não conta pra nada.
    **Corrigido** separando a cor do positivo num parâmetro próprio (`classeDeCor`), de modo que
    nunca existam duas. **A trava é teste, não este parágrafo**: `Valor.test.tsx` renderiza o
    componente com `renderToStaticMarkup` (sem navegador, roda no `npm test` normal) e reprova se
    sair mais de uma cor de texto no elemento. Foi conferido reintroduzindo o bug de propósito e
    vendo o teste ficar vermelho.

55. **Tornar um campo obrigatório tem duas metades, e a segunda é a que costuma ficar de fora
    (11/09/2026).** A categoria do lançamento manual de caixa passou a ser exigida (item `TL-27`).
    A metade fácil é a validação; as duas que quase passaram batido:
    - **Garantir que exista o que escolher.** `categorias_caixa` nunca foi semeada por migration
      nenhuma — diferente de `categorias` e `categorias_servicos`, que a `0030` semeia. Um banco
      recém-instalado tem **zero** categorias de caixa, então exigir a categoria, sozinho,
      deixaria o operador sem conseguir lançar nada e sem nada na tela explicando por quê. É o
      item 33 desta seção outra vez (validação incerta vira tranca), só que por falta de dado em
      vez de por engano de código. A regra prática: **ao tornar um campo obrigatório, conferir se
      o cadastro que alimenta ele nasce com alguma linha** — e, se não nascer, semear.
    - **Consertar o passado.** A regra nova só vale pro que vier depois; os R$ 31.000,00 já
      lançados sem categoria continuariam num balde só pra sempre, e o relatório por categoria
      continuaria sem existir na prática — que era exatamente o problema que o item veio resolver.
      Mudar a regra **e** oferecer o conserto do histórico são a mesma tarefa, não duas.

56. **O gerador de catálogo de telas exige um hostname específico no `.env`, não qualquer
    invenção (11/09/2026).** O item 53 já registrava que sem `.env` na raiz as 54 cenas falham.
    Falta a outra metade: o `banco-falso.mjs` intercepta `**demo.supabase.co/**`, então a URL
    precisa ser **exatamente** `https://demo.supabase.co`. Com um hostname inventado qualquer o
    login vaza pra rede de verdade e **36 das 54 cenas falham por timeout**, com um erro de
    console (`ERR_TUNNEL_CONNECTION_FAILED`) que não sugere em nada que a causa é o nome do host.
    Já está escrito no topo do próprio gerador.
    **A lição de método é maior que o detalhe**: a lista de 36 falhas parecia, à primeira vista,
    uma tela quebrada pela mudança em andamento. O que separou uma coisa da outra foi rodar o
    gerador **na árvore limpa** (`git stash`) e ver a falha idêntica — e, depois, rodá-lo **duas
    vezes no mesmo código**, o que revelou que 9 telas diferem entre rodadas só por ruído de
    renderização. Sem essas duas comparações, tanto o falso alarme quanto o ruído seriam lidos
    como regressão.

57. **Devolver o foco pro campo que abriu um modal pode reabrir a lista dele — e o campo
    volta a PARECER vazio (11/09/2026).** O `Modal` devolve o foco pro elemento que o abriu
    (decisão do `TR-02.3`, é o que faz quem usa só teclado continuar de onde parou). No cadastro
    rápido de cliente dentro da OS (item `TL-08`), esse elemento é o campo Cliente — que é um
    `Combobox`, e `Combobox` abre a lista ao receber foco. Resultado: logo depois de cadastrar,
    a lista reabria e o campo mostrava o filtro **vazio**, ou seja, o campo Cliente parecia em
    branco bem no instante em que o recurso precisava parecer que funcionou. Corrigido tirando o
    foco do campo (`blur`) antes de abrir o modal.
    **A lição de método vale mais que o bug**: a primeira correção foi uma "marca pra ignorar o
    próximo foco", que parecia certa e **não funcionou** — o clique que sobra do próprio
    `mousedown` (o botão já saiu do DOM, ver item 16) consumia a marca antes da hora. Só ficou
    claro **medindo** `aria-expanded` a cada etapa no app de verdade, em vez de raciocinar sobre
    a ordem dos eventos. É o item 33 outra vez: chutar duas vezes numa correção não testada é o
    padrão a evitar, e o antídoto é medir cedo.
    **E nada disso apareceria em teste de função pura nem lendo o código** — só rodando o fluxo
    inteiro no app (Playwright + o banco de mentira de `site/ferramentas/banco-falso.mjs`, que
    responde qualquer método HTTP e por isso deixa exercitar até o caminho de gravar).

58. **A cor que o Tailwind v4 entrega NÃO é `rgb()` — e uma medição que supõe isso erra em todas
    as telas sem dar erro em lugar nenhum (12/09/2026).** A primeira versão da varredura de
    contraste no DOM (item TR-01.3) lia a cor com uma expressão regular procurando
    `rgb(...)`/`rgba(...)`. Parecia óbvio, e está errado: no Tailwind v4, toda cor com opacidade
    — `text-sakura-purple-dark/80`, `bg-black/40`, que é quase tudo neste app — chega do
    `getComputedStyle` como **`oklab(0.89 0.026 -0.014 / 0.8)`**. A regex não casava, devolvia
    "transparente", e a composição de letra sobre fundo dava letra e fundo IGUAIS. Resultado:
    **183 reprovações, todas com exatamente 1:1, em todas as 54 telas** — um relatório que parecia
    catastrófico e não continha uma única informação verdadeira.
    **Corrigido** deixando o próprio navegador ler a cor: pinta num canvas de 1 pixel e lê o
    pixel que saiu (`scripts/medir-contraste.mjs`). Entende oklab, oklch, `color-mix` e o que mais
    vier, porque é o mesmo código que pinta a tela. Depois disso os números viraram específicos e
    plausíveis, e a lista caiu de 183 para uma mão cheia.
    **A lição de método é a que vale**: o erro não foi a regex, foi eu quase ter levado o
    relatório adiante. O que salvou foi olhar para a FORMA do resultado antes do conteúdo —
    "todas as 183 dão exatamente 1:1" não é um achado, é uma confissão de que o medidor está
    quebrado. Número redondo demais, repetido demais, em lugares demais: desconfie do
    instrumento antes da tela.

59. **Ferramenta que sobe o próprio servidor tem que RECUSAR uma porta já ocupada — e o
    "aquecido" engana (12/09/2026).** Dois enganos seguidos, na mesma varredura, os dois com o
    mesmo sintoma inútil (`TimeoutError` em 36 das 54 telas):
    - **Porta ocupada por um estranho.** O config das telas usa `strictPort`, então, com a porta
      já tomada, o servidor novo simplesmente não sobe — e a varredura passa a medir as telas
      servidas por *outro* servidor (um `npm run dev` esquecido, ou o da rodada anterior que não
      morreu porque `npx` é só um intermediário e matar ele deixa o `vite` vivo). Esse servidor
      estranho não tem as variáveis do Supabase de mentira, então o app esconde os botões de
      cadastrar, e as cenas "falham" sem nada explicar. Corrigido em duas pontas: a varredura
      **para e explica** se já tem alguém respondendo na porta, e mata o GRUPO de processos no
      fim, não só o `npx`.
    - **Tempo curto demais a frio.** Com o servidor já aquecido de uma rodada anterior, as 54
      telas passavam; a frio — que é como o CI sempre roda — tudo a partir da oitava cena
      estourava os 8s de espera por botão, porque o servidor de desenvolvimento compila cada tela
      na PRIMEIRA visita. Subiu pra 30s, que é teto e não espera: não deixa nada mais lento
      quando está tudo certo.
    **Lição**: "passou aqui" não quer dizer nada quando o passe dependeu de estado deixado pela
    rodada anterior. Antes de acreditar num verde, rodar uma vez do zero — servidor novo, cache
    apagado. É irmã da lição do item 56 (comparar rodadas antes de ler falha como regressão), do
    outro lado: lá era desconfiar do vermelho, aqui é desconfiar do verde.

60. **Duas contas que repartiam dinheiro deixavam a última linha negativa — e os testes de
    exemplo não pegavam (12/09/2026, item `TR-06.1` do guia).** Os dois bugs mais caros deste
    projeto são da mesma família: uma soma que precisa fechar exatamente. Os testes existentes
    cobriam casos escolhidos à mão; mil casos gerados por propriedade (`fast-check`) acharam
    **três defeitos reais** em duas funções, em menos de um segundo:
    - **`ratearPagamentos` podia devolver linha negativa.** É a função que reparte o pagamento
      da OS sobre o total da NFC-e. Com o pagamento dividido em várias formas e um total de
      destino bem menor que o pago, cada linha arredondava pra cima e a última — que absorvia
      toda a diferença — estourava pra baixo. **Alcançável com OS plausível**: R$ 900 de mão de
      obra + R$ 0,05 de peça, pago em três formas, mandava `−R$ 0,01` pra nota. Valor negativo
      é rejeição na emissão — a mesma família dos itens 31 e 32, que já custaram duas rejeições
      de verdade. Já existia um teste chamado *"nunca gera valor negativo"*, escrito justamente
      pra isso: ele cobria **duas** linhas, e o defeito só aparece com três ou mais.
    - **`calcularListaParcelas` também**: R$ 0,03 em 5x deixava a última parcela em −R$ 0,01.
    - **E espalhava centavo**: R$ 1,14 em 12x saía com onze parcelas de R$ 0,10 e uma de
      R$ 0,04 — seis centavos fora das outras. Com valor realista também acontece (R$ 1.000,06
      em 12x dava dois centavos de diferença).
    **A causa era a mesma nas duas**, e é o padrão do item 49: arredondar cada pedaço e jogar
    **toda** a sobra na última linha acumula o erro de N−1 pedaços num só. Virou uma função só,
    `repartirEmCentavos` (`schemas/dinheiro.ts`), que reparte em centavos inteiros com maior
    resto primeiro.
    **A correção não mudou nada do que já aparecia na tela**, de propósito: no empate o centavo
    vai pro pedaço mais à direita, então R$ 100 em 3x continua saindo 33,33 / 33,33 / 33,34 —
    como a maquininha mostra e como o teste de exemplo antigo já fixava. Os 407 testes que
    existiam antes continuam passando sem nenhuma alteração.
    **Lição de método**: o teste de exemplo que cobria exatamente essa preocupação existia e
    passava — ele só não tinha imaginado a terceira linha. É a diferença entre "testei o que
    pensei" e "testei a regra". Onde a regra couber numa frase ("a soma fecha exatamente",
    "nenhuma linha é negativa"), essa frase vira propriedade, não exemplo.
    **Um limite ficou documentado em vez de escondido**: `valorLiquidoItem` fica negativo se o
    desconto do item for maior que a linha. Não foi posto um clamp em zero — isso faria a nota
    sair com valor que não corresponde à OS. A correção certa é a constraint do item `TR-05.1`,
    que ainda não foi feita (precisa de migration e de conferir o banco real antes).

61. **O corpo da nota fiscal virou arquivo versionado — e a regra é que mudá-lo é uma DECISÃO
    (12/09/2026, item `TR-06.3` do guia).** A parte fiscal deste projeto tem um histórico ruim e
    um sintoma característico: ela quase nunca falha com erro na tela, falha autorizando algo
    errado (é o resumo do item 46). O que faltava era um jeito de VER o que muda no JSON que sai
    daqui, antes de ele chegar na SEFAZ.
    Agora `src/lib/focusNfe.golden.test.ts` monta seis notas — NFC-e de consumidor não
    identificado, de pessoa física, de pessoa jurídica, com desconto, mista com pagamento
    dividido, e uma NFS-e completa — e compara cada uma com um arquivo guardado em
    `src/lib/__ouro__/*.json`. Qualquer mexida no corpo aparece como diff no PR, campo a campo.
    **Três cuidados que valem entender antes de mexer nesses arquivos:**
    - **O relógio é fixado** (`vi.setSystemTime`) no meio-dia UTC, não em qualquer hora: a NFS-e
      manda a data de hoje (`hojeLocal()`), e meio-dia é o único horário que dá o mesmo dia em
      `America/Sao_Paulo` e em UTC — os dois fusos em que a suíte roda (item 48).
    - **Os campos estranhos estão explicados no cabeçalho do arquivo de teste**, um por um: as
      alíquotas de IBS/CBS fixadas por lei pra 2026, o indicador `"9"` sem inscrição estadual, o
      desconto abatido no preço unitário (a SEFAZ confere `bruto = qtd × unitário`), o preço
      unitário com 10 casas, a `forma_pagamento: "0"` mesmo com cartão parcelado. Sem isso, o
      próximo a ler o JSON acha que é erro e "conserta".
    - **Atualizar um arquivo de ouro nunca é o conserto de um teste vermelho.** Se o snapshot
      mudou, ou a mudança é intencional (e aí o diff é a revisão) ou é um bug indo pra nota
      fiscal. O mecanismo foi conferido quebrando a `cbs_aliquota` de propósito — a mesma
      alteração que gerou a rejeição 1026 de verdade —, e cinco dos seis arquivos ficaram
      vermelhos.

62. **Os cinco formulários que mexem em dinheiro passaram a ter teste de TELA (12/09/2026, item
    `TR-07.2`).** Até aqui o projeto testava só função pura — o que deixava de fora exatamente a
    costura onde os bugs deste app acontecem: a conta estava certa e a tela não a usava, ou usava
    com o campo errado. São 42 testes em `FaturamentoCard`, `ClienteForm`, `PecaForm`,
    `ContaPagarForm` e `OrdemServicoForm`, todos de comportamento (clicam e digitam como a pessoa
    faria), e cada um guardando uma promessa que já foi quebrada de verdade ou que a tela existe
    pra dar. Ferramentas em `src/testes/tela.tsx`; jsdom declarado por arquivo, como já se fazia
    em `notaFiscalXmlFornecedor.test.ts`.
    **Cada teste foi conferido quebrando o código de propósito** — um teste de regra que nunca
    falhou na frente de alguém não prova nada (a lição do item 53). Voltar o filtro de veículo
    pra "tem placa?" reprova o teste do item 26; tirar a trava de item pós-fatura reprova o do
    item 31; trocar a ligação custo→preço reprova o do `PecaForm`.
    **Quatro coisas aprendidas escrevendo isso, que valem pro próximo teste de tela:**
    - **`Combobox` vazio não tem placeholder**: com `opcaoVazia`, o rótulo vazio é o VALOR do
      input, então a consulta certa é `getByDisplayValue("Selecione a peça")`, não
      `getByPlaceholderText`. Perdi duas rodadas nisso.
    - **Consultar por posição (`getAllByRole("combobox")[4]`) é frágil**: a posição muda quando a
      OS ganha um item. Consultar pelo que aparece na tela sobrevive.
    - **O `min="0.01"` do HTML barra antes do zod**: em Contas a Pagar, o valor zero é recusado
      pelo próprio navegador, então a frase do zod nunca aparece na tela. As duas travas existem
      e concordam — mas um teste que espera a mensagem do zod falha sem que nada esteja errado.
    - **O input escondido de `id` do `useFieldArray` não é o que preserva o id.** Apagá-lo não
      quebra nenhum dos testes de veículo: nesta versão do react-hook-form o valor do item vive
      no estado do formulário, com ou sem campo registrado. Isso NÃO é um convite a removê-lo (a
      convenção da seção 4 pode estar guardando outro caminho, tipo restaurar rascunho) — é só
      pra ninguém achar que aqueles testes provam algo sobre ele.
    **O que ficou de fora, de propósito**: nenhum destes testes fala com o Supabase. Todos os
    cinco formulários recebem o que precisam por `props`, então o que se testa é o formulário —
    o que acontece depois do `onSalvar` continua sem cobertura, e continua sendo o tipo de coisa
    que só a usuária pega usando.

63. **A RLS passou a ser conferida por máquina, e três armadilhas apareceram no caminho
    (13/09/2026, item `TR-07.3`).** Existe agora `npm run test:rls`
    (`supabase/testes-rls/`): um banco descartável montado do zero, cinco papéis simulados, e as
    **640 combinações** de tabela × comando × papel conferidas contra um arquivo declarado
    (`expectativas.csv`). Detalhe de uso no README da pasta; o que se aprendeu construindo é isto:
    - **`session_replication_role = replica` desliga gatilho e chave estrangeira e NÃO desliga
      RLS** (conferido, não suposto). É o que torna a sonda de DELETE possível: sem isso, apagar
      um cliente que tem veículo daria erro de chave, e esse erro se pareceria com "a RLS
      bloqueou" — exatamente a confusão que o teste existe pra evitar.
    - **O erro 42501 chega por dois motivos opostos, e confundi-los faria o teste passar pelo
      motivo errado.** `violates row-level security policy` é a RLS recusando (resultado legítimo:
      zero linhas); `permission denied for table` é falta de `GRANT`, ou seja, banco montado
      errado. A primeira versão tratava os dois como "bloqueado", o que teria dado verde num
      cenário em que a RLS nem chegou a ser exercida. Isso descobriu, de brinde, que o
      `stub-supabase-local.sql` **não dava permissão de tabela ao `anon`** — e o Supabase de
      verdade dá. Sem a correção, todo o teste de "sem login" passaria pelo GRANT, nunca pela RLS.
    - **A checagem de "comando sem policy nenhuma" não achava lacuna nenhuma, em banco nenhum.**
      A consulta usava `cmd` como apelido do comando alvo, e `pg_policies` **tem** uma coluna
      chamada `cmd`: dentro da subconsulta o nome de dentro ganha do de fora, a condição virava
      `p.cmd in (p.cmd, 'ALL')` — sempre verdadeira. Só apareceu porque a lista de lacunas
      declaradas ficou vermelha reclamando do contrário ("a `auditoria` agora tem policy de
      insert"), ou seja, foi a **checagem cruzada** que denunciou, não a principal.
    **Cada uma das sete checagens foi conferida quebrando o código de propósito** e vendo o teste
    ficar vermelho: furo de RLS numa tabela por loja, policy de DELETE sumindo (o bug real do item
    15), sonda com coluna errada, tabela nova com RLS sem sonda, tabela nova sem linha no
    `expectativas.csv`, `GRANT` faltando, e expectativa falando de tabela que não existe. É a
    lição do item 53: teste de regra que nunca falhou na frente de alguém não prova nada — e aqui
    valia dobrado, porque a matriz bateu 640 de 640 na primeira rodada de verdade, e "acertou
    tudo de primeira" é motivo pra desconfiar do instrumento (item 58), não pra comemorar.

64. **A varredura de segredo pegou as credenciais de MENTIRA de um teste — e estava certa
    (13/09/2026).** O teste da máscara do Diagnóstico (item 63) precisa de credenciais no
    **formato de verdade**: testar com "senha123" não provaria nada, porque é justamente o formato
    que a máscara reconhece. Resultado: o job "segredos" do CI ficou vermelho na `main`, com três
    achados — a chave da Anthropic, um JWT e um token genérico, todos inventados.
    **A correção não foi liberar o arquivo.** Liberar o caminho inteiro tiraria do radar justamente
    o arquivo onde credencial de teste é rotina — e um dia entraria uma de verdade ali. A liberação
    é pelo **conteúdo**: só passa a string que diz literalmente `naopodevazar`
    (`.gitleaks.toml`, `[allowlist] regexes`). **Conferido dos dois lados**: com a liberação, uma
    chave `sk-ant-` realista colada nesse mesmo arquivo de teste continua sendo pega.
    **Duas coisas aprendidas rodando, que não estavam no papel:**
    - **O gitleaks ignora segredo obviamente falso.** A primeira tentativa de provar que a
      liberação era estreita plantou `sk-ant-api03-abcdefghij...0123456789` — e **não foi pega**,
      não por causa da liberação, mas porque a lista de palavras de fábrica do gitleaks descarta
      sequência óbvia. Ou seja: a prova quase deu um falso "está tudo bem". Pra provar que uma
      varredura pega alguma coisa, o corpo de prova precisa parecer de verdade.
    - **A varredura só roda no CI, não em `npm test`** — então este tipo de vermelho só aparece
      depois do push. Vale rodar `gitleaks detect --no-git --source .` à mão antes de mesclar
      qualquer coisa que escreva credencial de exemplo (o binário não é dependência do projeto;
      baixar a versão fixada em `ci.yml` leva segundos).

65. **Endurecer o Electron: sete coisas que só apareceram medindo (17/09/2026, item
    `TR-04.6`).** A auditoria de segurança do processo principal tinha, de todos os itens do guia,
    a maior chance de quebrar o app inteiro sem ninguém ver — e quase quebrou, de um jeito
    conhecido:
    - **A trava que não travava: `??` no lugar de `||`, outra vez.** `ORIGEM_DA_TELA` (a origem
      de onde a tela pode carregar, usada pra recusar navegação e pra validar quem fala por IPC)
      nasceu com `VITE_DEV_SERVER_URL ?? ...`. Variável de ambiente ausente chega como string
      **vazia**, e `??` só troca `null`/`undefined` — então a constante virava `""` e o
      `startsWith("")` **aprovava qualquer endereço**. É exatamente o item 8 desta seção, sete
      anos-luz depois, e a lição é a mesma: uma trava escrita e nunca exercitada não é uma trava.
      Quem pegou foi o teste novo do Electron, na primeira rodada.
    - **O instrumento mentiu duas vezes, em direções opostas.** (a) Testar a CSP com `eval()`
      via Playwright dá "passou" sempre — o `evaluate` entra pelo canal de depuração, que **não
      passa pela CSP**; a medição honesta é inserir um `<script>` no documento. (b) Ler os fuses
      comparando o valor com `'1'` dá "tudo desligado" sempre — o que vem é o **código do
      caractere** (48/49), não o dígito. Nos dois casos o número era redondo demais, que é o
      sinal do item 58.
    - **Desligar o `sandbox` quebra o preload inteiro, em silêncio.** Descoberto por mutação:
      com `sandbox: false`, `window.sakuraApp` some — a ponte não existe, e o sintoma é a tela
      funcionando "quase tudo". Ou seja, `sandbox: true` não é só endurecimento, é **requisito**
      pro preload deste app rodar. Não mexer ali achando que é conservadorismo.
    - **O fuse que desliga `--inspect` impede o Playwright de dirigir o app EMPACOTADO.** Não é
      defeito: é o fuse fazendo o que promete. Consequência prática: `npm run test:electron`
      roda sobre `electron .` (o do `node_modules`, sem fuses), e a prova de que o instalador
      abre com as chavinhas é outra — rodar o binário e conferir que ele cria a pasta de dados e
      sobe renderer/GPU. Quem tentar automatizar o `.exe` instalado vai esbarrar nisto.
    - **`'unsafe-inline'` em `style-src` é obrigatório, e foi medido.** Sem ele o `style={{...}}`
      do React para de aplicar — some a barra de rolagem customizada, o menu de ações sai do
      lugar — e o `<style>` dentro do documento de garantia/recibo (que vai por `srcdoc`) deixa
      de valer. Em `script-src` ele **não** entra, que é onde custaria caro.
    - **`connect-src` não pode ser "o banco configurado".** A tela de conexão testa um endereço
      que a pessoa acabou de digitar, e num computador recém-instalado não existe banco nenhum
      configurado — travar ali repetiria o erro do item 33, de deixar a usuária do lado de fora.
      A permissão é "qualquer projeto Supabase" mais o endereço desta máquina.
    - **Um teste frouxo por uma palavra.** As checagens da ponte procuravam `/recusado/i`, e
      **duas** mensagens diferentes têm essa palavra: a da ponte ("endereço recusado") e a da
      validação de remetente ("pedido recusado"). Com isso, o caso em que o IPC parasse de
      funcionar **por inteiro** ficaria verde. Corrigido procurando a frase exata e, mais
      importante, somando uma checagem **positiva**: a tela legítima continua sendo atendida.
    **Cada uma das 22 checagens foi conferida quebrando o código de propósito** (nove mutações,
    todas ficaram vermelhas na checagem certa) — a mesma disciplina dos itens 53, 62 e 63.

66. **A publicação da `v0.9.38` quebrou o canal de atualização de TODAS as lojas — e o
    instalador estava perfeito o tempo todo (17/09/2026).** É o pior tipo de falha deste projeto:
    ninguém dá erro, nada quebra na tela, e a consequência só apareceria no dia em que uma
    correção urgente precisasse chegar na loja e não chegasse.
    **O que aconteceu**: três builds seguidas subiram o instalador inteiro e íntegro (conferido
    depois byte a byte contra o digest do próprio GitHub), o GitHub devolveu **resposta vazia** no
    fim da subida de ~82 MB, e o publicador embutido do electron-builder morreu no `JSON.parse`
    dessa resposta (`⨯ Unexpected end of JSON input`, `builder-util-runtime/httpExecutor.ts:206`)
    — **antes de subir o `latest.yml`**. A release `v0.9.38` ficou publicada, marcada como "mais
    recente", com o instalador e **sem** o arquivo que diz ao app instalado que ela existe.
    Efeito: `releases/latest/download/latest.yml` passou a devolver **404**, e toda loja parou de
    conseguir se atualizar — inclusive as que estavam na `v0.9.37`, que é uma versão sadia.
    **Três coisas que valem mais que o bug:**
    (a) **"O build falhou" e "nada foi publicado" não são a mesma coisa.** A intuição de sempre é
    que build vermelha não deixa rastro; aqui ela deixou o rastro mais perigoso possível — meia
    release. Ao ver uma Release falhar, **olhar o que ficou publicado** antes de concluir
    qualquer coisa.
    (b) **A ordem dos arquivos É a trava de segurança.** O `latest.yml` anuncia a versão; o
    instalador é o que ela promete. Subir o anúncio antes do arquivo deixaria todas as lojas
    tentando baixar algo que não existe — bem pior que o que aconteceu. Por acidente a ordem
    estava certa; agora está **de propósito**, com o instalador conferido pelo tamanho publicado
    antes de o anúncio subir.
    (c) **Retentar não era o conserto.** Rodar de novo (foi rodado três vezes) reproduzia a mesma
    falha, porque o defeito não é a subida — é o tratamento da resposta dela. Consertar de
    verdade foi **tirar essa etapa do publicador do electron-builder** e fazer o `release.yml`
    publicar arquivo por arquivo com `gh`, com tentativa repetida e conferência do que ficou lá.
    **Duas coisas que só apareceram tentando consertar**, e que valem pra qualquer sessão futura:
    - **Desta sessão não dá pra mexer em release nem subir arquivo por API.** As duas chamadas
      são recusadas (`Creating, editing, or deleting releases is not permitted for this session
      type`, e o proxy exige `Content-Type: application/json`, o que impede subir `.yml`/`.exe`).
      Ou seja: **o conserto de uma release estragada tem que passar pelo workflow** — não adianta
      planejar apagar, marcar como pré-lançamento ou subir o arquivo que falta na mão.
    - **`--publish never` continua gerando o `latest.yml`** (conferido rodando um build de
      verdade, não suposto — era a única dúvida que inviabilizaria o desenho novo).
    **A trava é o teste, não este parágrafo**: a lógica de publicação foi exercitada com um `gh`
    de mentira nos quatro cenários — tudo certo, instalador que não sobe, instalador que sobe
    **truncado**, e só o `latest.yml` falhando. Nos três de falha o `latest.yml` **não** é
    publicado, que é a promessa inteira. E o primeiro teste "achou um bug" que era do próprio
    teste (o `gh` de mentira não aplicava o filtro `--jq`) — item 58 outra vez: desconfie do
    instrumento antes da tela.
    **Desfecho, no mesmo dia**: com o desenho novo o build publicou os três arquivos em **2
    minutos** (contra os 20+ que falhavam), e a conferência de ponta a ponta passou — baixando o
    instalador do endereço que o app usa (`releases/latest/download/`) e comparando a impressão
    digital com a que o `latest.yml` anuncia: **idênticas**. Canal de atualização de volta, na
    própria `v0.9.38`.

67. **O primeiro backup de verdade falhou, e as duas causas são armadilhas de bash e de
    empacotamento, não de lógica (18/09/2026).** O item `TR-12.1` foi testado localmente de
    ponta a ponta antes de subir — e mesmo assim a primeira execução no GitHub falhou. Vale
    pelas três lições:
    - **`pg_dump` de `/usr/bin` escolhe a versão sozinho, e escolhe errado.** Ele é um atalho
      (`pg_wrapper`) que decide qual versão chamar; com o 16 e o 17 instalados lado a lado, ele
      pegou o **16** contra um Supabase **17.6**, e o dump morreu com `server version mismatch`.
      A correção é chamar pelo caminho completo (`/usr/lib/postgresql/17/bin/pg_dump`), resolvido
      na instalação. **Quando o Supabase subir pra 18, é só trocar o número no `apt-get`** — mas
      o sintoma, se alguém esquecer, é este mesmo.
    - **Dentro de `if ! ( ... )` o bash DESLIGA o `set -e`.** Esta é a grave, e vale muito além
      deste workflow. O `pg_dump` falhou **duas vezes** e o script seguiu adiante: montou a
      pasta, empacotou, cifrou. O `set -euo pipefail` estava lá, escrito, dentro do subshell — e
      não valia nada, porque um comando cujo resultado está sendo **testado** não dispara
      `errexit`, e isso vale pro subshell inteiro. A correção é rodar o subshell **solto** e ler
      o `$?` depois (com `set +e` em volta). Conferido rodando os dois padrões lado a lado num
      bash de verdade — um continua depois do erro, o outro para.
    - **O que NÃO falhou é o que vale guardar**: a checagem de *"o dump saiu pequeno demais
      (2 linhas) — isso não é um banco inteiro"* barrou o pacote antes de ele subir. Sem ela, o
      backup do dia seria um arquivo **vazio, cifrado e bem-arrumado nos dois destinos**, com o
      job verde — e a descoberta viria no dia do aperto. É o padrão deste projeto (itens 11, 15,
      33, 46): a pergunta útil não é "isso dá erro?", é "**se isso estiver errado, alguém fica
      sabendo?**". Toda etapa que produz um arquivo merece uma pergunta assim.
    **Lição de método, que se repete**: testar o ciclo num Postgres local provou a *lógica*
    (dump, cifra, restaura, confere) e não tinha como provar o *ambiente* (qual `pg_dump` o
    runner escolhe, como o bash se comporta no `if`). Teste local e primeira rodada de verdade
    respondem perguntas diferentes — e é por isso que a primeira execução de qualquer coisa
    agendada precisa ser disparada à mão e **olhada**, não deixada pro horário dela.
    **Complemento de 29/09/2026 (troca de todos os secrets do backup)**: três rodadas falharam
    seguidas, cada uma por um erro de montagem do `BACKUP_EMPRESAS` na mão, e cada mensagem
    apontava pra outro lugar: `invalid integer value "postgresql:" for connection option "port"`
    (a linha de conexão colada no lugar da senha), `fe_sendauth: no password supplied` (senha
    vazia entre o `:` e o `@`) e `PGRST125 Invalid path` (o `supabase_url` com um pedaço a mais
    no fim). O último virou correção no job: tirar as barras do fim e cortar um `/rest/v1`. Na
    rodada que passou, o aviso de `/rest/v1` **não** apareceu, então o que sobrava era
    provavelmente só a barra final: a correção cobriu uma causa que o diagnóstico não tinha
    visto, e fica registrado pra não contar como confirmado o que não foi. Os dois primeiros
    ficam como tradução do erro, porque a linha de conexão é segredo e o log deste repositório
    é público.

68. **Um campo vazio se disfarçou de "bucket não existe" por três rodadas (18/09/2026).** Ainda
    no `TR-12.1`: com o banco já sendo copiado direito, os 18 XMLs de nota fiscal falhavam
    **todos**, sempre com a mesma resposta do Supabase — `Bucket not found` / `NoSuchBucket`.
    A causa real era o secret `BACKUP_EMPRESAS` **não ser um JSON válido**: sem conseguir lê-lo,
    o endereço do Supabase e a chave saíam **vazios**, e um pedido pra endereço nenhum volta
    como "esse bucket não existe".
    **Por que isso enganou tanto, e é o que vale guardar**: o sintoma apontava com confiança pro
    lugar errado. O Storage do Supabase responde `Bucket not found` também pra quem **não tem
    permissão de ver o bucket** — ele esconde a existência em vez de dizer "você não pode". Isso
    é decisão de segurança deles, e tem o efeito colateral de mandar quem investiga caçar
    permissão e nome de bucket, que é exatamente o que aconteceu aqui.
    **O que resolveu não foi adivinhar melhor, foi o job dizer o que ele tinha em mãos**: o
    papel lido de dentro da própria chave (`papel = service_role`) e a lista de buckets
    (`buckets = notas-fiscais`). Com esses dois respondendo "certo", só sobrou o campo que
    ninguém estava olhando. **A regra que fica**: quando uma API esconde a causa por segurança,
    pare de interrogar a resposta e faça o chamador **declarar o que ele é e o que está usando**.
    **Três armadilhas menores da mesma investigação:**
    - **A caixa de editar um secret no GitHub aparece SEMPRE VAZIA** — ele nunca mostra o que
      está guardado. Quem vê isso entende "cole aqui o que quer trocar", e colar um pedaço
      **substitui o valor inteiro**. Foi assim que a lista virou uma chave solta. Não é
      desatenção de quem usa: é a tela convidando ao erro.
    - **`jq: parse error` não é mensagem pra quem não programa.** O secret é editado à mão toda
      vez que uma empresa nova entra, então errar uma aspa é rotina, não exceção — a conferência
      de formato, em português, roda antes de tudo.
    - **Faltavam limites de tempo.** Sem `--max-time` no download e `timeout-minutes` no job,
      uma conexão travada deixaria o backup pendurado até o limite de **6 horas** do GitHub: o
      backup do dia não acontece e **nada aparece como falha**.

69. **Fechar uma tabela é também abrir uma janela — e a receita do guia pra isso estava errada
    (18/09/2026, item `TR-04.3`).** Foi a primeira tabela da etapa 2 do `TR-04.1`, e quatro
    coisas apareceram que valem pras próximas:
    - **A view que o guia manda usar não funciona.** Ele pede `security_invoker = true`.
      Medido num Postgres 16, com a tabela base fechada pro invocador: essa view devolve
      **zero** linha, porque ela obedece à RLS da base — exatamente o que se queria contornar.
      Só `security_invoker = false` atravessa. É o item 53 desta seção outra vez: o guia é um
      bom cardápio, mas quando ele dá uma receita técnica, medir vem antes de aplicar. E o
      experimento custou dois minutos, contra um desenho inteiro construído errado.
    - **A view que atravessa a RLS vira dois buracos novos, e os dois são silenciosos.**
      (a) Sem o `where` de loja escrito **dentro** dela, ela entrega o cadastro de todas as
      lojas da empresa. (b) Uma view simples é **auto-atualizável**: sem revogar
      insert/update/delete, dá pra escrever na tabela base por dentro dela, passando por cima
      das policies. Medido: tirando só o `revoke`, a matriz acusa 11 células — inclusive
      `sem_login`, o **anônimo**, conseguindo inserir. Nenhum dos dois dá erro em lugar nenhum.
    - **`join` embutido em tabela fechada não dá erro: devolve `null`.** A lista de OS trazia o
      nome do técnico por `tecnico:funcionarios(nome)`. Fechar a tabela teria apagado o
      "técnico: Fulano" da tela e do documento de garantia **do balconista**, calado, sem nada
      indicando o motivo — e o item existe justamente pra não atrapalhar quem monta OS. Os
      nomes passaram a vir de uma consulta à view, costurada em `schemas/ordemServico.ts`
      (função pura, testada). **Repontar o `join` pra view seria mais curto** e provavelmente
      funcionaria — PostgREST costuma inferir relação através de view —, mas isso não dá pra
      testar daqui, e é o item 33 desta seção: onde não se pode medir, escolher o caminho que
      não depende de acertar.
    - **O teste precisa medir as duas metades, ou ele passa pelo motivo errado.** Uma policy
      que barrasse *todo mundo* passaria num teste que só confere "o balconista não vê". Por
      isso `supabase/scripts/testar-rh-permissao.sql` confere também que quem TEM o módulo
      continua lendo salário e filhos, e que o balconista ainda enxerga a lista pra montar OS.
      As cinco mutações (tirar a permissão da policy, tirar o `where` da view, tirar o
      `revoke`, deixar o salário escapar pra view, e trancar demais) foram rodadas de propósito
      e ficaram vermelhas na checagem certa.

70. **Canal de teste: o nome óbvio da API era a armadilha, e a receita do guia não servia pro
    GitHub (25/09/2026, item `TR-09.1`).** Três coisas que só apareceram lendo e rodando o código
    da própria biblioteca, que é o que o guia pedia ("confira na documentação atual, a API já
    mudou entre versões maiores"):
    - **`autoUpdater.channel = "..."` liga `allowDowngrade` sozinho** no `electron-updater` 6 —
      está escrito no setter, em `AppUpdater.js`. Ou seja, o jeito com cara de certo de dizer
      "este computador é do canal de teste" faria o computador **aceitar instalar uma versão mais
      velha por cima da atual**, numa loja, sem ninguém ter pedido. Por isso o canal vira só
      `allowPrerelease`, e um teste reprova quem escrever `autoUpdater.channel =` no `main.ts`.
    - **A receita do guia ("copiar o `latest.yml` do canal beta pro estável") não funciona com o
      provedor GitHub.** Com ele, os dois canais olham pra MESMA release — a que o GitHub chama
      de "mais recente" — e só mudam o nome do arquivo que procuram lá dentro. Uma release sem
      `latest.yml` (só com `beta.yml`) não seria "ainda não liberada": seria **erro** no
      computador de toda loja normal, a cada abertura. O mecanismo que já existe é a marca de
      **pré-lançamento** do próprio GitHub: o endereço "mais recente" nunca responde uma release
      marcada assim, e com `allowPrerelease` ligado a biblioteca lê o feed e pega a primeira.
      Conferido rodando o `GitHubProvider` instalado contra um GitHub de mentira
      (`src/schemas/canalAtualizacao.test.ts`) — se uma atualização da biblioteca mudar a regra,
      é ali que fica vermelho, não numa loja.
    - **Fora do instalador, a biblioteca pula a busca sem emitir evento nenhum** — então a linha
      "Procurando atualização" nunca aparece no teste do Electron, e a primeira versão da checagem
      falhou por isso, não por defeito do app. O canal passou a ser registrado no momento em que é
      configurado (`Abrindo no canal de atualização: ...`), o que também é o certo pra loja: se a
      busca falhar antes de começar, "em que canal este computador estava?" continua respondido.
    **E o que o teste pegou de brinde no checklist de instalação**: ele mandava baixar "o
    instalador mais recente" da página de Releases. Com o canal de teste, o topo daquela página
    pode ser uma versão **ainda em teste** — a loja nova começaria justamente onde não devia.
    Agora ele aponta pro endereço da versão liberada.

71. **O token da Focus NFe saiu do computador — e a parte difícil não foi esconder, foi não
    virar outra coisa (25/09/2026, item `TR-04.2`).** O token emite e cancela nota no CNPJ da
    loja, e ia inteiro pra memória de todo computador, balconista incluído. Agora mora num cofre
    que ninguém lê (`segredos_fiscais_loja`, migration `0057`) e quem usa é o **porteiro**, a Edge
    Function `focus-nfe`. Cinco coisas que valem saber antes de mexer aqui:
    - **O porteiro repassa, não remonta.** A nota continua sendo montada no programa
      (`montarCorpoNFCe`/`montarCorpoNFSe`, com o teste-ouro, que passou sem mudar um byte).
      Remontar dentro da Edge Function seria a sexta vez deste projeto de uma conta de dinheiro
      morando em dois lugares (itens 35, 40, 44, 49 e 60) — e aqui o preço seria nota recusada.
      O que o porteiro faz é só conferir: permissão (como o operador), **CNPJ da nota igual ao da
      loja**, nota registrada por esta loja antes de cancelar, e o ambiente vindo do cadastro, não
      do pedido. A conferência do CNPJ parece zelo hoje e é o que torna seguro o "token
      compartilhado" do item 6 da seção 8: com uma conta só na Focus NFe, sem ela um operador
      poderia emitir em nome de outra empresa cliente.
    - **Baixar o PDF/XML não aceita endereço de quem pede.** O porteiro consulta a nota e segue o
      caminho que a PRÓPRIA Focus NFe devolveu. Se aceitasse o caminho do pedido, ele viraria um
      jeito de chamar qualquer endereço da API com o token junto — `/v2/empresas`, por exemplo,
      que num token de conta principal cria e altera empresa.
    - **O `select("*")` teria desfeito tudo em silêncio.** A coluna antiga continua existindo até
      a parte 2 (pra uma volta de versão funcionar), então `buscarConfiguracaoFiscal()` com
      asterisco traria o token de volta pra memória do computador — sem erro, sem aviso, e com a
      tela funcionando perfeitamente. Por isso a lista de colunas é escrita uma a uma.
    - **`supabase.functions.invoke` devolve texto quando a resposta não é JSON** — um PDF viria
      corrompido. Por isso o porteiro sempre responde JSON, com o arquivo em base64. Pesa uns 30%
      a mais num arquivo que é pequeno, e evita escrever um cliente HTTP à parte.
    - **O teste do "segredo não sai" passou na primeira versão com um vazamento plantado.** Ele
      cobria seis caminhos, e um token escrito de propósito na mensagem de "loja sem CNPJ" passou
      batido — só uma das nove mutações sobreviveu, e foi justo a do segredo. Ampliado pra passar
      por **todo** caminho de recusa: mensagem de erro montada com o valor errado é exatamente
      como segredo costuma vazar. É a lição do item 53 outra vez, no lugar onde ela mais custaria.
    **O que ficou pra parte 2, e por quê**: limpar a coluna antiga (numa migration nova — a `0058` acabou sendo o fechamento de caixa) e tirar a
    ponte `http:fetchComAuth` do Electron, que ficou sem uso (ela não tem mais token nenhum pra
    carregar, mas ponte sem uso é superfície à toa). As duas só depois de ela emitir **e**
    cancelar uma nota de verdade pelo porteiro — até lá, voltar pra `v0.9.40` precisa continuar
    emitindo nota.

72. **Uma trava de banco que não pode consultar o banco de verdade tem que se conferir sozinha
    (25/09/2026, item `TR-05.1`).** O guia pede, antes de cada `check`, uma consulta no banco
    real pra saber se já existe linha que ele recusaria — e daqui não se alcança banco real
    nenhum, e com três empresas seriam três consultas. A saída foi a migration fazer a conferência
    ela mesma (`pg_temp.criar_trava` na `0060`): conta as linhas fora da regra e só cria a trava
    se não houver nenhuma; havendo, **avisa e não mexe em nada**. É a regra do item 33 aplicada a
    migration: o pior caso tem que ser "essa trava ficou pra depois", nunca "a atualização do
    banco parou no meio" nem "o dado da loja foi alterado sem ninguém decidir".
    **Três coisas que só apareceram testando:**
    - **A regra "da forma que o guia escreveu" barraria casos de verdade.** Conta de valor zero
      (OS de garantia), OS faturada por um computador com o relógio atrasado, e CNPJ com letras.
      Por isso o teste da `0060` tem duas metades: o impossível é recusado **e** o
      estranho-mas-verdadeiro é aceito. Uma trava que barra o caso real é tranca.
    - **Duas travas disparando pelo mesmo erro apontam o campo errado.** Com preço negativo, a
      trava do desconto (`desconto <= quantidade × preço`) também disparava, e a tela diria
      "desconto" quando o problema era o preço. Daí o `greatest(..., 0)` na regra do desconto.
    - **A trava sozinha piorava um caso: a OS nova.** O item vai pro banco depois da OS; com o
      banco recusando o item, a OS nasceria **sem** ele. Por isso o formulário confere a mesma
      regra (`problemaDoItem`, em `schemas/ordemServico.ts`) antes de gravar qualquer coisa — e o
      teste de tela prova que um desconto de R$ 500 num item de R$ 400 não chega a salvar.

73. **Trava em dobro só se prova com quem enxerga os dois lados (26/09/2026, migration
    `0061`).** A porta do faturamento em `contas_receber` confere que a OS é da **mesma loja**
    da conta. Tirando essa conferência de propósito, o teste **continuou verde** — porque o
    operador do teste era de uma loja só, e a RLS de `ordens_servico` já escondia dele a OS da
    outra loja; o `exists` da policy dava falso de qualquer jeito. A conferência só passa a fazer
    diferença pra quem trabalha nas **duas** lojas e enxerga as duas OS — e foi esse operador que
    faltava no teste (checagem 8b). **Lição**: numa trava que repete outra trava, o teste precisa
    de alguém que passe pela primeira, senão ele prova a primeira duas vezes. É a lição do item 53
    outra vez — foi a mutação que achou, não a leitura.
    **Pegadinha de ferramenta, da mesma sessão**: `pkill -f "vite --config site/ferramentas"`
    mata também o próprio shell que o executa (o texto do comando contém o padrão), e o comando
    morre com código 144 sem mensagem nenhuma. Pra parar o servidor das telas, procurar o PID com
    `ps aux | grep vite` e matar pelo número.

74. **Um filtro no `update`/`delete` faz o banco aplicar TAMBÉM a regra de leitura — e aí o
    teste da regra de escrita passa pelo motivo errado (26/09/2026, migration `0062`).** A regra
    do Postgres: quando o comando precisa LER a linha — um `where` que cita coluna, ou um
    `returning` que devolve coluna —, a policy de `select` vale junto com a de `update`/`delete`.
    O teste da porta "Contas a Pagar apaga a saída da própria conta" fazia
    `delete ... where id = <aluguel>` e esperava zero. Deu zero — mas porque a regra de LEITURA
    já escondia o aluguel dessa pessoa, não porque a de EXCLUSÃO barrava. Tirando de propósito a
    conferência da conta na regra de exclusão, o teste **continuou verde**.
    **O jeito certo**: comando **sem filtro** e contar com `get diagnostics quantas = row_count`
    (`delete from caixa_movimentos;` tem de apagar exatamente as linhas que a regra de exclusão
    permite, nem uma a mais). Os dois testes de permissão (`testar-contas-permissao.sql` e
    `testar-caixa-permissao.sql`) passaram a ser assim nas checagens de "não altera / não apaga".
    **Medido, não suposto**: `returning 1` (sem coluna) **não** acionou a regra de leitura — o
    teste antigo das contas, que usava isso, pegava a mutação de `update` aberto. O que aciona é
    citar coluna. **E a mesma regra decidiu duas mudanças no app** (ver `0062` na seção 5): o
    insert do Caixa deixou de pedir a linha de volta, e o `delete` do "desfazer pagamento" (que
    tem `where id` e `returning id`) passou a rodar enquanto o lançamento ainda está ligado à
    conta — senão a regra de leitura o esconderia e ele apagaria zero linhas.

75. **Um `exists` dentro da policy deixou a lista do Caixa 45% mais lenta sem ninguém usar a
    porta dele — por causa do JIT (26/09/2026, migration `0062`).** A primeira versão da `0062`
    perguntava "este lançamento é de uma conta?" com um `exists` sobre `contas_pagar` escrito na
    própria policy. Medido com 20 mil lançamentos por loja, pra quem TEM o Caixa (e que por isso
    nem chega a essa parte da regra — o plano mostrava a subconsulta como "never executed"):
    **76 → 110 ms**. O motivo não estava no plano, estava na estimativa: o `exists` carregava a
    RLS das contas pra dentro da conta do planejador, que estimou a consulta **30× mais cara**
    (6.384 → 193.730), passou do `jit_above_cost` (100.000) e compilou a consulta a cada abertura
    (~16 ms de "Emission" na seção JIT do `explain analyze`). Com `set jit = off` a diferença
    sumia (76 → 78 ms) — foi o que separou "a regra é lenta" de "o custo estimado é que mudou".
    **Corrigido** trocando o `exists` por uma função `security definer` pequena
    (`caixa_movimento_de_conta_pagar/receber`): custo estimado 16.300, sem JIT, 76–77 ms.
    **Cuidado que veio junto**: função `security definer` não herda a RLS das contas, então ela
    mesma confere a loja, e os `revoke` de `anon` são obrigatórios (as duas coisas têm checagem
    no teste, 33 a 37). **O preço**: quem só tem Contas a Pagar ficaria mais lento se listasse o
    Caixa inteiro (85 → 155 ms, uma chamada de função por linha) — e nenhuma tela dele faz isso:
    ele só apaga um lançamento pelo id. **Lição pras próximas policies**: medir com o JIT ligado
    (é o padrão do Postgres; não dá pra saber daqui se o Supabase liga), e olhar o custo
    ESTIMADO, não só o tempo — um salto grande no custo é o aviso antes de o JIT aparecer.

76. **Três testes que mediam outra coisa, achados quebrando o código de propósito (26/09/2026,
    migration `0063`).** Nenhum deles é bug do sistema; todos são bug do TESTE, do tipo que deixa
    passar exatamente o que ele existia pra pegar:
    - **O "anônimo" herdava a identidade do balconista.** Dentro de uma transação de teste, o
      `set_config('request.jwt.claim.sub', ...)` do passo anterior continua valendo depois do
      `set local role anon` — então a checagem "sem login não chama a função" chegava na função
      COM o `auth.uid()` do balconista. Dando ao `anon` a permissão de chamar (a mutação), o teste
      **continuou verde**. Corrigido limpando o `sub` antes e, mais importante, conferindo a
      permissão diretamente (`has_function_privilege('anon', ...)`): a tranca que se quer provar
      é o `revoke`, não o comportamento da função. Vale pra todo teste futuro que simule "sem
      login" depois de ter simulado alguém.
    - **`now()` é o mesmo instante na transação inteira.** "Registrar de novo atualiza o visto
      em" nunca poderia passar num teste que roda numa transação só — os dois registros teriam o
      mesmo horário. O teste empurra a primeira passagem um dia pra trás, que é o caso real (cada
      login é uma transação).
    - **Teste que estoura em vez de dizer FALHOU.** No teste do Electron, a quebra de propósito
      ("não gravar o `computador.json`") derrubou o script inteiro com um `SyntaxError` do
      `JSON.parse` — vermelho, mas sem dizer qual promessa quebrou, e escondendo as outras
      checagens. Ler o arquivo agora nunca estoura: a checagem diz FALHOU e o teste segue.
    **A lição comum**: o teste só prova o que se viu ele reprovar. Os três passaram na primeira
    rodada, e "passou de primeira" continua sendo motivo pra desconfiar (itens 53, 58 e 73).

77. **Duas armadilhas de teste da venda de balcão (26/09/2026, migration `0064`)**, as duas
    achadas quebrando o código de propósito:
    - **O atalho global do Enter é invisível no jsdom.** `useEnterParaProximoCampo` só
      considera campo com `offsetParent !== null`, e o jsdom não calcula layout — pra ele
      `offsetParent` é sempre `null`. Resultado: o teste "o Enter do leitor de código de barras
      não pula de campo" passou **com o `stopPropagation` tirado** (a mutação), porque o atalho
      nunca fazia nada. Corrigido simulando `offsetParent` só naquele teste
      (`VendaBalcaoForm.test.tsx`). Vale pra qualquer teste futuro que dependa desse atalho.
    - **`pkill -f` com o texto do servidor mata o próprio shell** (é o item 73 outra vez):
      parar o vite das telas se faz pelo PID, ou conferindo com `curl` que a porta 5199 caiu.
    **E uma coisa de desenho que vale pra quem mexer na venda**: o React 17+ escuta eventos na
    raiz, então um `e.stopPropagation()` no `onKeyDown` impede o evento de chegar no `document`
    — é o que faz o Enter do leitor ficar na busca em vez de pular de campo.

78. **Travas do GitHub contra quem tem escrita: o que protege de verdade e o que não (29-30/09/2026).**
    Aprendido ao preparar o repositório pro primeiro colaborador (o Gustavo), com a organização
    `sakura-corp` no plano grátis e o repositório público.
    - **Protege de verdade**: segredo dentro de um **cofre (environment) restrito à `main`**. Um
      workflow modificado e rodado a partir da branch de alguém não recebe esse segredo. Banco e
      backup ficam protegidos assim. E um **ruleset na `main`** (PR + aprovação) impede mesclar
      sozinho.
    - **Não protege**: quem tem escrita pode rodar um workflow **modificado na própria branch**
      com o token automático do Actions (`contents: write`). Com ele dá pra **criar ou editar
      release, subir arquivo e mudar a marca de pré-lançamento**, ou seja, publicar e liberar sem
      passar pela aprovação. A aprovação do cofre `lojas` só vale pro workflow oficial. A trava
      de verdade é as versões morarem num **repositório onde o colaborador não escreve**.
    - **Ruleset de tag que bloqueia CRIAR `v*` quebra o Release**, porque quem cria a tag é o
      próprio workflow, com esse token, e o GitHub não deixa isentá-lo da regra. Por isso o
      ruleset `versões` só bloqueia mudar e apagar.
    - **Cofre com aprovação obrigatória e ruleset são grátis em repositório público.** Em
      repositório privado, pelo que se sabia em 29/09 (sem ter conseguido abrir a documentação do
      GitHub), pedem plano pago. **Conferir antes de fechar o código.**
    - **Na hora de montar, três escorregões reais**:
      - o nome do cofre é o do cofre (`backup`), e não o de um segredo: ela criou um environment
        chamado `BACKUP_EMPRESAS` por engano;
      - o token do R2 se cria **dentro do R2** ("Account API Tokens"), e não em "My Profile → API
        Tokens", que não gera Access Key ID nem Secret;
      - "Prevent self-review" no cofre `lojas` tem que ficar **desmarcado**, senão ela não
        consegue aprovar o que ela mesma disparou.
    - **Ordem que evitou susto**:
      1. criar os cofres com os valores novos;
      2. ligar `environment:` nos workflows (segredo do cofre vence o solto de mesmo nome);
      3. rodar o backup e um ensaio;
      4. só então apagar os segredos soltos e os tokens antigos;
      5. rodar o backup de novo.

79. **A varredura de telas quebrou no dia 1º do mês, sem ninguém ter mexido no app (01/10/2026,
    PR #419).** Duas armadilhas de data nos testes, que só aparecem na virada do mês:
    - **Fração de dia some no `setDate`**: nos dados de demonstração, `dia(-0.1)` queria dizer
      "hoje, mais cedo", mas `setDate` joga a fração fora e caía em **ontem**. No dia 1º, ontem é
      o mês passado, e a venda de balcão sumiu da lista (que mostra o mês corrente). Corrigido no
      próprio `dia()` de `site/ferramentas/dados-demo.mjs`.
    - **Dívida de contraste por cor exata**: o dia apagado do mês vizinho no calendário muda de
      cor quando é feriado (o fundo rosa entra na mistura). Só aparece quando um feriado cai na
      sobra visível (Finados no calendário de outubro, 1º/1 no de dezembro).
    - **Lição de processo**: PR "só de documentação" também roda o CI inteiro, e o CI depende da
      data. **Esperar o verde antes de mesclar, sempre**; nesse dia dois PRs de texto foram
      mesclados com o CI ainda rodando, e a quebra só apareceu por e-mail depois.

80. **NFS-e autorizada na Focus NFe, mas "falta NFS-e" no sistema (01/10/2026, OS 15).** A
    prefeitura demorou mais que os 30s de espera; a tela mostrou o aviso de demora e parou ali. A
    nota saiu autorizada logo depois, e o sistema não tinha caminho nenhum pra registrá-la: o
    aviso dizia "avise pra registrarmos aqui", e a única saída era o upload manual do XML, que
    perde a referência (sem "Ver PDF" nem cancelamento pelo sistema).
    - **Conserto**: a espera vencida virou um erro próprio (`EsperaVencidaError`, em
      `src/lib/focusNfe.ts`) que leva a `ref` junto. A janela de emissão troca o "Confirmar
      emissão" por **"Conferir de novo"**, que consulta pela `ref` e registra a nota quando sair.
      E, pra nota que saiu com a janela já fechada, o link **"A nota já saiu na Focus NFe, mas não
      apareceu aqui?"** registra pela referência do painel da Focus NFe (coluna "Referência"),
      conferindo que ela é daquela OS e daquele tipo (`refPertenceAOrdem`).
    - **A NFS-e espera o dobro** (20 consultas, ~60s; a NFC-e continua com 10): prefeitura é mais
      lenta que a SEFAZ. E o aviso agora diz "a prefeitura", não "a SEFAZ".
    - **Regra**: toda chamada que ENVIA algo e depois espera a resposta precisa de um caminho pra
      retomar a espera mais tarde, com o identificador do que foi enviado. Desistir de esperar não
      é o mesmo que a coisa não ter acontecido.

81. **Lista de OS passando do lado direito da janela, sem rolagem (visto na loja em 01/10/2026,
    #425).** No Balcão (1366 de largura), "Faturar" e "Fechamento" ficavam fora da tela; a lista
    ia até 1627px. Em 1024 (o mínimo da janela), mais 15 telas passavam.
    - **Causa**: o `<main>` do `App.tsx` é item de uma linha flex e não tinha `min-w-0`. Item flex
      tem largura mínima automática = a do filho mais largo, então ele crescia até a tabela; o
      contêiner de fora (`overflow-hidden`) cortava o resto. E toda tabela morava num
      `overflow-hidden sakura-card`, que também corta.
    - **Por que ninguém viu**: as telas só eram olhadas em monitor largo, e as imagens do catálogo
      e a varredura de contraste rodam em 1600px.
    - **Conserto**: `min-w-0` no `<main>`; envoltório das tabelas com `overflow-x-auto`; o item da
      OS em grade de 2 ou 4 colunas (4 a partir de 1280 de janela). E a varredura **`npm run
      largura:telas`**, no CI, que abre cada tela em 1024, 1280, 1366, 1536 e 1600.
    - **Regra**: item flex que pode receber conteúdo largo leva `min-w-0`; caixa em volta de
      tabela é `overflow-x-auto`, nunca `overflow-hidden`. Tela nova se olha também em 1024.

82. **As varreduras de tela não enxergavam o Electron (achado em 03/10/2026, ao começar a #385).**
    O `contraste:telas`, o `largura:telas` e o catálogo abrem o app num **Chromium avulso** (o do
    Playwright), que é o mesmo com qualquer Electron instalado. Ou seja: subir o Electron e rodar
    essas varreduras não prova nada sobre o Chromium novo, e a lista de "o que rodar em cada
    salto" pedia justamente elas.
    - **Conserto**: `percorrer-telas.mjs` abre as telas dentro de um Electron quando pedido
      (`TELAS_NO_ELECTRON=1`, ou `{ electron }` no terceiro argumento), com um processo principal
      mínimo (`site/ferramentas/electron-telas.mjs`). E **`npm run comparar:electron -- 36`**
      percorre as telas no Electron do projeto e no pedido, com o relógio parado no mesmo
      instante, e compara imagem por imagem, mais o que o Chromium faz sozinho nos campos.
    - **O ruído é zero**: o Electron 33 contra ele mesmo deu as 61 telas idênticas ponto por
      ponto. Qualquer diferença entre duas versões é do Chromium, não da medição.
    - **Mas toda versão do Chromium muda a suavização do contorno das letras**: no 33 × 36,
      todas as 61 telas mudaram (até 0,5% dos pontos), sem nada que se enxergue. Por isso cada
      tela tem duas medidas: "cru" e **"a olho"** (as duas imagens passam por um desfoque de 1,5
      ponto antes, o que apaga o contorno e mantém o resto; pegou uma barra de 6 pontos).
    - **Duas armadilhas da primeira rodada**: a sessão de mentira caiu bem na hora da foto (saiu
      a tela de login); e a barra de rolagem desenhada pelo app (`AreaRolavel`) às vezes guarda a
      medida da tela anterior, então a foto dependia da ordem das telas. A ferramenta repete a
      cena quando a foto sai sem o menu lateral e manda um `resize` antes de cada foto.
    - **Na primeira rodada ela já achou um defeito antigo**: a rodinha do mouse **muda** o campo
      de número (ver o item 41, corrigido).
    - **Regra**: teste de comportamento do Chromium roda no Electron do projeto. Um Chromium
      qualquer responde outra coisa (o item 41 já tinha visto isso com o 141 do sandbox).
