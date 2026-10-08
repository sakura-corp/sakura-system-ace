# Histórico: estado do Git e os marcos "onde parou" antigos

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 10. Estado do Git

- **Repositório**: `sakura-corp/sakura-system-ace`, **público**, desde 29/09/2026 (transferido da
  conta pessoal dela; o endereço antigo `caranovavidanova/sakura-system-ace` redireciona). Antes
  chamava `amigao` e era um site em Next.js, substituído por completo. Ficou público porque o
  atualizador baixa as versões sem login (item 21 da seção 6); por isso nada de credencial em
  arquivo nenhum, e o que já vazou tem de ser **trocado**, não só apagado.
- **Fluxo**: cada sessão trabalha na branch que o ambiente designa, abre PR contra a `main` e, se
  quem trabalha é ela, **mescla direto** (seção 3 do `PROJETO_STATUS.md`). Os PRs guardam o
  detalhe de cada mudança; aqui fica só o que ajuda uma sessão nova.
- **Versão e banco**: conferir sempre nas releases do GitHub (a tabela de versões está em
  "Empacotamento", seção 7). Em 08/10/2026: a última liberada pra todas as lojas é a `v0.9.47`;
  no canal de teste, a `v0.9.51`; banco na `0064`. Da `0.9.51` em diante, as versões moram no
  `sakura-corp/ssace-versoes` (PR #447; `docs/operacao.md`, "Onde as versões moram").
- **Lição do episódio "duas linhas de trabalho paralelas" (agosto de 2026)**: enquanto uma sessão
  do Claude mesclava Fornecedores simples na `main`, ela tinha no próprio PC, sem commit, um
  trabalho bem maior feito com outra ferramenta de IA (Antigravity: Fornecedores com Pedido de
  Compra, Auditoria, testes, formulários em `react-hook-form` + `zod` e o tema escuro/neon). O
  `git pull` recusou, com razão, e o trabalho foi salvo com `git stash -u` e virou a base
  principal. **Regra**: se um `git pull`/`checkout` mostrar muitos arquivos modificados que a
  sessão não reconhece, é trabalho feito por fora. Nunca descartar: perguntar e usar `git stash`
  antes de qualquer comando que possa apagar.

## Marcos antigos, do mais novo pro mais velho

Cada bloco é o "Onde parou" de uma sessão, como estava quando ela terminou: **os status dentro
deles envelhecem** ("falta", "ainda não"). O que continua valendo foi levado pros arquivos de
`docs/`; o que depende dela está em "O que depende dela", na seção 8. Na dúvida, vale o arquivo de
`docs/`, não o marco.

### 06/10/2026, de manhã: as opções de fechar o código e a abertura esperando

**Estado do código**: nada mudou no código. `main` na **`v0.9.50`** (Electron 36), no canal de
teste desde 04/10 e **no Balcão desde 05/10**; os computadores do canal normal seguem na `0.9.47`.
Banco na **`0064`**. O conserto da rodinha (#436) continua guardado no commit "Rodinha do mouse
não muda mais o campo de número (guardado pra 0.9.51)", na branch `claude/kind-euler-8s461d`
(conferida em 06/10; procurar pelo título, porque o número do commit muda quando ele é
reaplicado). O marco anterior (05/10, a faxina da memória) está no topo de `docs/historico.md`.

#### O que foi feito
- **Abertura da empresa** (no privado, `EMPRESA.md`, "Abertura: o que falta"): o documento da
  conta PJ foi recusado de novo, e o caminho é ela tirar um documento novo (detalhe no
  privado); a 1ª fatura da Focus foi paga; a dúvida da declaração dos Bombeiros no
  licenciamento foi **resolvida** (é o padrão da Contabilizei pro escritório virtual, sem
  correção). **Decidido**: o Claude Team logo depois de 16/10.
- **Fechar o código**: ela perguntou as opções. Conferido em 06/10: em repositório privado,
  ruleset e cofre pedem o plano Team, e a aprovação obrigatória no cofre só existe no Enterprise
  (item 78 de `docs/licoes.md`); ninguém fez cópia (fork) do repositório; nos últimos 30 dias o
  Actions gastou ~5.600 minutos, e o ritmo da última semana daria 11 a 15 mil por mês (o Team
  inclui 3.000; o custo em reais está no privado, `PRECOS-E-CUSTOS.md`). Virou a tarefa **#442**
  (o CI roda duas vezes por commit, não tem limite de tempo, e PR só de memória roda tudo).

#### Esperando a resposta dela (perguntado em 06/10)
1. **Fechar o código: qual opção.** **A**: deixar aberto por enquanto (R$ 0). **B**: fechar com o
   plano Team do GitHub, com as versões num repositório aberto só de versões, uma versão de
   transição liberada em todos os computadores antes, e a aprovação dela trocada por "a automação
   só roda se quem apertou foi ela"; de bônus, fecha o furo de 30/09 (item 78). **C**: fechar no
   plano grátis (as travas param e só 2.000 minutos; não recomendado). **Recomendado: A agora,
   preparando a B**: a #442 de graça, medir de novo, e fechar antes da primeira loja nova, já
   sabendo o custo.
2. **A #442: agora ou depois do teste dela na loja** (07/10)?
3. **Apagar as branches velhas** (mais de 100, de sessões antigas), guardando a da rodinha e as
   que não foram mescladas?

#### Por onde a próxima sessão começa
1. **As respostas acima.**
2. **Como foi o dia dela na loja (07/10) com a `v0.9.50`.** A impressora da loja estava parada: a
   impressão se testa mandando imprimir uma garantia na "Microsoft Print to PDF" (se a janela
   abre e o PDF sai certo, a parte do programa está boa).
3. **Avisos da abertura**, quando ela mandar (o certificado liberado; o documento novo pra conta
   PJ, agendado pra 08/10; o contrato social já chegou em 06/10): pedir pra adicionar o
   `caranovavidanova/sakura-corp` com as palavras certas (seção 1) e seguir "Abertura: o que
   falta" no `EMPRESA.md`. Antes de qualquer clique em tela oficial, o print.
4. **Depois do teste dela**: a `v0.9.51` com o conserto da rodinha (PR com o commit acima,
   `Closes #436`; prova também o atualizador da 36; o mesmo commit corrige o item 41 de
   `docs/licoes.md`), e então o **salto 2 (40)**: faltam as checagens de sempre
   (`test:electron`, `test:fusos`, o empacotado com as chavinhas) e a `v0.9.52`. O salto 3 (44)
   mexe no CI (da 42 em diante o Electron não se baixa sozinho no `npm ci`). O electron-builder 26
   vai num dos saltos; avisar ela em qual antes. Se ela escolher fechar o código, a `v0.9.51`
   pode ser a versão de transição (publicada nos dois lugares).
5. **Ainda vale**: liberar só quando ela pedir; o PR da tarefa 2 do Gustavo (#351), quando vier.
   Com data: a partir de **16/10**, o Claude Team, a TFE e o capital (no privado); **antes de
   1º/11**, perguntar à contabilidade da Pneus Amigão se a NFS-e da loja muda pro Ambiente
   Nacional nessa data (seção 8, "Perguntas pra fora").

### 05/10/2026, à tarde: a abertura destravou e a faxina da memória

**Estado do código**: nada mudou no código desde o marco anterior. `main` na **`v0.9.50`** (só o
Electron 33 → 36), no canal de teste desde 04/10 e **no Balcão desde 05/10**; os computadores do
canal normal seguem na `0.9.47`. Banco na **`0064`**. O conserto da rodinha (#436) continua
guardado no commit "Rodinha do mouse não muda mais o campo de número (guardado pra 0.9.51)", na
branch `claude/kind-euler-8s461d` (conferido em 05/10; o número do commit muda quando ele é
reaplicado, então procurar pelo título). O marco anterior (o Electron começou a subir) está no
topo de `docs/historico.md`.

#### O que foi feito
- **Abertura da empresa** (tudo no privado, `EMPRESA.md`, "Abertura: o que falta"): a
  Contabilizei respondeu as cinco perguntas, umas pelo robô do WhatsApp e outras por pessoas, que
  corrigiram o robô numa delas. O certificado da empresa estava travado por um erro de cadastro
  deles, que estão corrigindo, e vai ser presencial. O licenciamento saiu e vale 5 anos. **Em
  05/10, nada dependia dela**: ela espera três avisos.
- **Faxina da memória** nos dois repositórios, a pedido dela: o que tinha envelhecido foi
  atualizado (pendências, linha do tempo, preços, o rascunho do acordo, a LGPD com a empresa
  aberta), apontadores pra seções antigas foram corrigidos, e as dúvidas que sobraram foram
  perguntadas a ela.

#### Por onde a próxima sessão começa
1. **Avisos da abertura**, quando ela mandar (o certificado liberado, o contrato social, a conta
   PJ aprovada): pedir pra adicionar o `caranovavidanova/sakura-corp` com as palavras certas
   (seção 1) e seguir "Abertura: o que falta" no `EMPRESA.md`. Com o pedido liberado e o contrato
   em mãos, agendar o presencial na Certisign. Antes de qualquer clique em tela oficial, o print.
2. **Como foi o dia dela com a `v0.9.50` no Balcão.** A **impressora da loja estava parada**: a
   impressão se testa mandando imprimir uma garantia na "Microsoft Print to PDF" (se a janela
   abre e o PDF sai certo, a parte do programa está boa).
3. **Depois do teste dela**: a `v0.9.51` com o conserto da rodinha (PR com o commit acima,
   `Closes #436`; prova também o atualizador da 36; o mesmo commit corrige o item 41 de
   `docs/licoes.md`, que hoje ainda diz que a rodinha não mexe no número), e então o **salto 2
   (40)**: o laboratório já passou; faltam as checagens de sempre (`test:electron`, `test:fusos`, o
   empacotado com as chavinhas) e a `v0.9.52`. O salto 3 (44) mexe no CI (da 42 em diante o
   Electron não se baixa sozinho no `npm ci`). O electron-builder 26 vai num dos saltos; avisar
   ela em qual antes.
4. **Ainda vale**: liberar só quando ela pedir; o PR da tarefa 2 do Gustavo (#351), quando vier.
   Com data: a partir de **16/10**, o que depende do dinheiro da empresa (no privado); **antes de
   1º/11**, perguntar à contabilidade da Pneus Amigão se a NFS-e da loja muda pro Ambiente
   Nacional nessa data (seção 8, "Perguntas pra fora").

### 04 e 05/10/2026: o Electron começou a subir (#385), a `v0.9.50` (Electron 36) no Balcão

**Estado do código**: `main` na **`v0.9.50`**, que é **só o Electron 33 → 36**, publicada no
canal de teste em 04/10. **O Balcão atualizou sozinho em 05/10** (Diagnóstico: `0.9.50`, Electron
`36.9.5` / Chromium `136`, Node `22`, Windows 10 Home 22H2; nenhuma linha do Electron até a 46
deixa de rodar no Windows 10). As outras lojas seguem na `0.9.47`. Banco na **`0064`**. O marco
anterior (os cinco bugs de tela) está logo abaixo.

#### O que foi feito
- **Ela escolheu o ritmo**: três saltos, **33 → 36 → 40 → 44**, cada um numa versão sozinha e
  testado na loja antes do próximo. O destino é a 44 porque a 42 perde o suporte ~20/10 (item 14
  de `docs/pendencias-e-futuro.md`).
- **Ferramenta nova, `npm run comparar:electron -- 36`** (PR #434, lição 82): abre as 61 telas
  dentro de dois Electrons e compara "a olho" (sem a suavização das letras) e o comportamento dos
  campos. **33 × 36: nada mudou a olho. 36 × 40 (já rodado, 05/10): as 61 telas idênticas ponto
  por ponto** e os campos iguais. O salto 2 está pronto no laboratório.
- **Dois defeitos achados de passagem, os dois viraram tarefa**:
  - **#436, a rodinha do mouse muda o campo de número** quando a tela não tem mais pra onde rolar
    (2 vira 2,01). **Conserto pronto e guardado** pra `v0.9.51`: o commit "Rodinha do mouse não
    muda mais o campo de número (guardado pra 0.9.51)", na branch `claude/kind-euler-8s461d`, sem
    PR (o número do commit muda quando ele é reaplicado; procurar pelo título). Conferido na 33,
    na 36 e na 40. Se o commit se perdeu, a #436 diz como refazer.
  - **#437, a barrinha de rolagem do app fica com a medida da tela anterior** (visual, pequeno).
- **A abertura da empresa andou** (licenciamento da prefeitura, SenhaWeb) e ela mandou em 05/10
  uma mensagem com cinco perguntas pra Contabilizei: tudo no privado, `EMPRESA.md`, "Abertura: o
  que falta".

#### Por onde a próxima sessão começa
1. **Ela volta com as respostas da Contabilizei** (e a validade do licenciamento): ler o item 6
   de "Abertura: o que falta", no privado, e seguir a ordem combinada lá. Antes de qualquer
   clique em tela oficial, o print.
2. **Como foi o dia dela com a `v0.9.50` no Balcão.** A **impressora da loja estava parada**: a
   impressão se testa mandando imprimir uma garantia na "Microsoft Print to PDF" (se a janela
   abre e o PDF sai certo, a parte do programa está boa).
3. **Depois do teste dela**: a `v0.9.51` com o conserto da rodinha (PR com o commit acima,
   `Closes #436`; prova também o atualizador da 36), e então o **salto 2 (40)**: o laboratório já
   passou; faltam as checagens de sempre (`test:electron`, `test:fusos`, o empacotado com as
   chavinhas) e a `v0.9.52`. O salto 3 (44) mexe no CI (da 42 em diante o Electron não se baixa
   sozinho no `npm ci`). O electron-builder 26 vai num dos saltos; avisar ela em qual antes.
4. **Ainda vale**: liberar pras outras lojas só quando ela pedir. O PR da tarefa 2 do Gustavo
   (#351), quando vier. Com data: a fatura da Focus em **10/10**; a partir de **16/10**, o que
   depende do dinheiro da empresa (no privado).

### 03/10/2026: os cinco bugs de tela (#361, #362, #363, #417, #425) e a `v0.9.49`

**Estado do código**: `main` na **`v0.9.49`**, **publicada só no canal de teste** em 03/10 (ela
aprovou; o instalador e o `latest.yml` conferidos na release). As outras lojas seguem na `0.9.47`.
Banco na **`0064`** (nada de banco nesta leva). Ela viu e achou ótimo. O marco anterior (CNPJ
aberto) está no topo de `docs/historico.md`.

#### O que foi feito (PRs #431 e #432)
- **Notas Fiscais**: coluna "Situação" (Autorizada / Cancelada / Enviada à mão) e o texto do topo
  atualizado (#362, #363).
- **Clientes**: "Ver veículos" no lugar da coluna de placas; carro sem placa aparece como "sem
  placa" (#417).
- **Tabelas largas** (#425): nada mais passa da janela, a tabela rola dentro da própria caixa, e
  a **lista de OS cabe inteira de 1366 pra cima** (versão "B", escolhida por ela pela imagem).
- **Janelas opacas** (#361, versão "sólida", escolhida por ela pela imagem).
- **Varredura nova `npm run largura:telas`**, com job no CI: todas as telas em 1024, 1280, 1366,
  1536 e 1600. Detalhe em `docs/modulos.md` e na lição 81 de `docs/licoes.md`.
- **Revisão de código antes de mesclar**: achou a lista de OS estourando em 1536 (notebook Full HD
  com zoom de 125%) e a folga apertada em 1366; os dois corrigidos antes do merge.

#### Por onde a próxima sessão começa: **atualizar o Electron (#385)**, decidido por ela em 03/10
1. **Ler a #385 e o item 14 de `docs/pendencias-e-futuro.md`**, e rodar `npm run
   checar-versao-electron` pra saber quais linhas recebem correção hoje (em setembro: 42, 43 e 44;
   o programa está na 33).
2. **Antes de mexer, uma decisão dela** (opções + recomendação): a #385 diz "uma linha por vez,
   cada uma sozinha numa versão, testada na loja". Da 33 até uma linha com suporte são uns 9
   saltos, ou seja, 9 versões e 9 testes na loja. Mostrar o custo de cada caminho (todas as linhas
   × saltos maiores com teste mais cuidadoso) e deixar ela escolher.
3. **Em cada salto**: `npm run test:electron`, `test:fusos`, `contraste:telas`, `largura:telas`,
   olhar os formulários renderizados (o item 41 de `docs/licoes.md` foi num campo numérico),
   conferir as chavinhas (`scripts/ligar-fuses.mjs`) e o atualizador. Publicar no teste e ela
   testar no Windows dela e no Balcão antes do próximo salto. Junto de um dos saltos, o
   electron-builder 26 destrava a chavinha de integridade do asar.
4. **Ainda vale**: perguntar como a `v0.9.49` está indo no Balcão; liberar pras outras lojas só
   quando ela pedir. Os avisos da abertura da empresa (pedir pra adicionar o
   `caranovavidanova/sakura-corp`, seção 1) e o PR da tarefa 2 do Gustavo (#351), quando vierem.
   Com data: a fatura da Focus em **10/10**; a partir de **16/10**, o que depende do dinheiro da
   empresa (no privado).

### 02/10/2026: a Sakura Corp tem CNPJ (aberta em um dia)

**Estado do código**: nada mudou no código nesta sessão. `main` na **`v0.9.48`**, **publicada só
no canal de teste** (o Balcão da loja já está nela; as outras lojas seguem na `0.9.47`). Banco na
**`0064`**. O marco anterior (painel no ar, tarefa 1 do Gustavo) está no topo de
`docs/historico.md`.

#### O que foi feito
- **Empresa aberta em 02/10**, tudo no mesmo dia: contrato social conferido com ela página por
  página antes de assinar, assinado pelo gov.br, deferido na Junta, **Simples Nacional** escolhido
  no Módulo Tributário da Receita, CNPJ emitido e cartão CNPJ baixado. O número, como ficou o
  contrato e **o que falta** estão no privado (`EMPRESA.md`, seção "Abertura: o que falta").
- **Esperando outras pessoas** (nada pra ela fazer até chegar aviso): a liberação da conta da
  empresa, a entrevista do certificado digital da empresa e a inscrição na prefeitura. Um cuidado
  anotado no privado: **não desligar a verificação em duas etapas do gov.br** sem conversar antes.
- **Contas de outubro e novembro revistas** com um combinado novo de datas (no privado).
- **Painel**: o processo da tarefa 1 foi conferido (certo dos dois lados). O PR que anotava a
  Cloudflare ligada (#427, de outra sessão) estava parado e foi mesclado. O Gustavo está na
  tarefa 2 (#351); em 03/10 ainda não tinha PR aberto.

#### Por onde a próxima sessão começa
1. **Avisos da abertura**, quando ela mandar (conta liberada, Certisign marcando a entrevista,
   etapa da procuração no gov.br, prefeitura): pedir pra adicionar o `caranovavidanova/sakura-corp`
   (seção 1) e seguir a lista "Abertura: o que falta" do `EMPRESA.md`, um passo por vez, com
   print antes de cada botão que não volta atrás.
2. **PR da tarefa 2 do Gustavo (#351)**, quando ele abrir: conferir o CI, o código e o "Pronto
   quando", explicar em português, e guiar ela a aprovar e mesclar (`docs/painel.md`, "O que a
   Sofia faz"). **Antes da tarefa 3** a Cloudflare já está ligada; **antes da tarefa 4** ela cria
   os dois GitHub Apps com o Claude dela.
3. **A lista "O que depende dela"** (seção 8). Com data: a fatura da Focus em **10/10**; a partir
   de **16/10**, o que depende do dinheiro da empresa (no privado). Liberar a `v0.9.48` e fazer a
   #425 quando ela quiser. Sugestão de começo, se ela perguntar: **trocar as três credenciais
   fiscais expostas**.

### 01/10/2026, à noite: painel no ar, tarefa 1 do Gustavo aprovada, tela larga anotada

**Estado do código**: `main` na **`v0.9.48`**, **publicada só no canal de teste**. O Balcão da
loja já está nela; as outras lojas seguem na `0.9.47`. Banco na **`0064`**. O marco da tarde (a
NFS-e que demorou, consertada e registrada) está no topo de `docs/historico.md`.

#### O que foi feito
- **Painel: tarefa 1 (#350) aprovada e mesclada por ela** (PR #424 do Gustavo; conferido o CI, o
  código e o "Pronto quando"). A **tarefa 2** já pode começar, e o Gustavo foi avisado.
- **Cloudflare ligada**: o painel está no ar em
  **https://sakura-painel.caranovavidanova.workers.dev**, publicando só da `main` e só quando muda
  `painel/`. Como ficou, e o que a tarefa 3 precisa saber, está em `docs/painel.md`
  ("Andamento") e num comentário na #352.
- **Tela larga cortada à direita** (visto na loja, na lista de OS): virou a tarefa **#425**, já
  planejada. Ela pediu **só anotar**, sem fazer agora.
- **6 testes de `test:fusos` reprovam no Windows** (achado do Gustavo; não afeta o app): anotado
  na seção 8.

#### Por onde a próxima sessão começa
1. **PR da tarefa 2 do Gustavo (#351)**, quando ele abrir: conferir o CI, o código e o "Pronto
   quando", explicar em português, e guiar ela a aprovar e mesclar (`docs/painel.md`, "O que a
   Sofia faz"). **Antes da tarefa 4**, ela cria os dois GitHub Apps com o Claude dela.
2. **CNPJ: saiu em 02/10**, já no Simples Nacional (contrato e Módulo Tributário conferidos com
   ela antes de assinar). Próximos passos: cartão CNPJ, conta PJ, licença da prefeitura depois de
   16/10 e a 1ª NFS-e da Pneus Amigão. Número e detalhes no privado.
3. **A lista "O que depende dela"** (seção 8). Com data: a fatura da Focus em 10/10; o que vem do
   CNPJ depois de 16/10 (no privado). Liberar a `v0.9.48` quando ela quiser; a #425 quando ela
   quiser. Sugestão de começo, se ela perguntar: **trocar as três credenciais fiscais expostas**.

### 01/10/2026, à tarde: NFS-e que demorou, consertada e registrada (v0.9.48)

**Estado do código**: `main` na **`v0.9.48`**, **publicada só no canal de teste** (o Balcão da
loja já está nela, conferido em 1º/10); as outras lojas seguem na `0.9.47`. Banco na **`0064`**. O
marco anterior (alíquota, CI do dia 1º, CNPJ) está no topo de `docs/historico.md`.

#### O que foi feito
- **A NFS-e da OS 15 demorou mais que a espera** do sistema, saiu autorizada na Focus logo
  depois, e a OS ficou com "falta NFS-e" sem caminho pra registrar. **Conserto** (#421, `v0.9.48`):
  botão "Conferir de novo" depois da demora, e o link "A nota já saiu na Focus NFe, mas não
  apareceu aqui?" pra registrar pela referência. A NFS-e espera ~60s agora (`docs/licoes.md`,
  item 80). **Usado na loja em 1º/10 e funcionou**: a OS 15 tem as duas notas.
- **A alíquota de outubro está certa**: essa foi a primeira NFS-e do mês e saiu autorizada (o
  "Replicar" cadastra as três atividades; seção 8, parte fiscal).
- **Aprovar no celular**: o app do GitHub não mostra o "Review deployments". Abrir o link da
  rodada no **Safari** (ou no computador). E **nunca tocar em "Cancelar workflow"**.

#### Por onde a próxima sessão começa
1. **CNPJ**: quando chegar o texto do **objeto social** (ou os documentos pra assinar), conferir
   com ela **antes de ela assinar**. O resto da abertura está no privado.
2. **"Revisa o PR da tarefa 350"** (do Gustavo): conferir o CI, o código e o "Pronto quando" da
   #350, explicar em português, e ela decide (`docs/painel.md`, "O que a Sofia faz").
3. **A lista "O que depende dela"** (seção 8). Com data: a fatura da Focus em 10/10; o que vem do
   CNPJ depois de 16/10 (no privado). Liberar a `v0.9.48` quando ela quiser. Sugestão de começo,
   se ela perguntar: **trocar as três credenciais fiscais expostas**.

### 01/10/2026, de manhã: alíquota de outubro, CI do dia 1º, CNPJ andando

Sessão **sem código de app**. **Estado do código**: o app não mudou. `main` na **`v0.9.47`**
(publicada e liberada; o Balcão da loja conferido nela em 1º/10), banco na **`0064`**. O marco
anterior (Gustavo dentro, CNPJ encaminhado) está no topo de `docs/historico.md`.

#### O que foi feito
- **Alíquota de 10/2026 cadastrada** no portal da prefeitura. O "Replicar" provavelmente cadastra
  as três atividades de uma vez (seção 8, parte fiscal). A primeira NFS-e de outubro confirma.
- **Tarefa #417**: na lista de Clientes, as placas viram um "Ver veículos" no estilo do "Ver DANFE"
  (e carro sem placa deixa de virar caixa vazia). Pra ela fazer comigo, junto da #361 a #363.
- **CI quebrado no dia 1º, consertado** (#419): duas armadilhas de data nos testes, não no app
  (`docs/licoes.md`, item 79). **Esperar o CI verde antes de mesclar, mesmo PR só de texto.**
- **CNPJ** (detalhe no privado, `EMPRESA.md`): a prefeitura aprovou a abertura; a conta gov.br
  dela já é nível Ouro; falta o certificado digital do CPF e assinar os documentos.

#### Por onde a próxima sessão começa
1. **CNPJ**: quando chegar o texto do **objeto social** (ou os documentos pra assinar), conferir
   com ela **antes de ela assinar**. O resto da abertura está no privado.
2. **"Revisa o PR da tarefa 350"**: o Gustavo ainda não tinha aberto o PR em 1º/10. Conferir o
   CI, o código e o "Pronto quando" da #350, explicar em português, e ela decide. A parte dela no
   painel vem depois (`docs/painel.md`, "O que a Sofia faz").
3. **Se a primeira NFS-e de outubro for recusada** por alíquota, cadastrar as outras duas
   atividades no portal e corrigir a nota da seção 8.
4. **A lista "O que depende dela"** (seção 8). Com data: a fatura da Focus em 10/10; o que vem do
   CNPJ depois de 16/10 (no privado). Sugestão de começo, se ela perguntar: **trocar as três
   credenciais fiscais expostas**.

### 30/09/2026, fim da noite: Gustavo dentro, CNPJ encaminhado

Sessão **sem código de app**. **Estado do código**: não mudou. `main` na **`v0.9.47`**
(publicada e liberada), banco na **`0064`**. O marco anterior (faxina da memória e tudo o que
falta virou tarefa, #361 a #412) está no topo de `docs/historico.md`.

#### O que foi feito
- **Gustavo (`kalendoscope`) entrou**: membro da `sakura-corp`, **Write** no repositório, convite
  aceito, Claude Code no PC dele (pelo "Primeiro dia" do `docs/painel.md`). Já pegou a **#350**
  (o nome dele está na tarefa); o PR ainda não tinha sido aberto.
- **Empresa e financeiro** (tudo no repositório privado, caranovavidanova/sakura-corp#8 a #11): o
  empréstimo do pai, a contratação da contabilidade e o cadastro da abertura do CNPJ, enviado em
  30/09. Detalhe e pendências no `EMPRESA.md` de lá.

#### Por onde a próxima sessão começa
1. **"Revisa o PR da tarefa 350"**: quando o Gustavo abrir o PR, conferir o CI, o código e o
   "Pronto quando" da #350, explicar em português, e ela decide. Se ela aprovar, eu mesclo. A
   parte dela no painel vem depois (`docs/painel.md`, "O que a Sofia faz"): Cloudflare antes da
   #352, os dois GitHub Apps antes da #353, o webhook antes da #355.
2. **CNPJ**: ela está esperando a resposta da contabilidade por e-mail. Quando chegar o texto do
   **objeto social**, conferir com ela **antes de ela assinar** (o resto está no privado).
3. **Quando ela disser "faz a tarefa N"**: ler a issue inteira, fazer as perguntas do "Precisa da
   Sofia?" antes de começar, e o PR fecha a issue (`Closes #N`); a linha sai da tabela da seção 8.
   Sugestão de ordem, se ela perguntar: os ajustes rápidos (#361 a #363) e depois o
   `docs/comparativo-anexar.md`, "Sugestão de ordem".
4. **A lista "O que depende dela"** (seção 8). Com data (a alíquota de 10/2026
   foi cadastrada em 1º/10): a fatura da Focus em 10/10; o que vem do CNPJ depois de 16/10 (no
   privado).

### 30/09/2026, à noite: faxina da memória e tudo o que falta virou tarefa

Sessão de arrumação, **sem código de app**. **Estado do código**: não mudou. `main` na
**`v0.9.47`** (publicada e liberada), banco na **`0064`**. O marco anterior (30/09: organização,
travas, senhas e o painel) está no topo de `docs/historico.md`.

#### O que foi feito
- **Memória em dia nos dois repositórios**. No privado (caranovavidanova/sakura-corp#7):
  `EQUIPE.md`, `EMPRESA.md` e `PRECOS-E-CUSTOS.md` sem repetição e começando pelo que vale hoje.
  No público (PR #359 e #360): todos os `docs/`, o `MELHORIAS.md` e o `README.md` revisados;
  **"O que depende dela" numa lista só** (seção 8), com o que estava esquecido (atualizar o
  Electron, estornar ao cancelar nota, a chave `sb_secret`); `docs/historico.md` cortado pros
  marcos de 28 a 30/09, a pedido dela.
- **Dados de clientes de verdade saíram do repositório** (nome, CPF e endereço num teste da nota
  fiscal, e um script de uso único). No histórico do Git eles continuam.
- **Testes obrigatórios na `main`**: ela ligou os 5 testes do CI no ruleset `main protegida`.
- **Tudo o que falta virou tarefa no GitHub**, cada uma com o que fazer, onde, "Pronto quando", o
  que não fazer e, quando depende dela, a instrução de **parar e mandar mensagem pra ela** se quem
  estiver fazendo não for ela:
  - #361 a #363: os três ajustes de 28/09 (janelas, situação da nota, texto de Notas Fiscais);
  - #365 a #385 (etiqueta `guia`): o que falta do guia de melhorias, mais o Electron;
  - #386 a #412 (etiqueta `guia`): o que o concorrente tem e nós não, inclusive o **DRE em três
    partes, nesta ordem** (#386, #387, #388). O orçamento rápido entrou na #379 e a assinatura na
    #380. A tabela com todas está na seção 8; o número de cada uma também está em
    `docs/comparativo-anexar.md`.

#### Por onde a próxima sessão começa
1. **Gustavo (`kalendoscope`) já está dentro** (30/09, à noite): membro da `sakura-corp`, **Write**
   no `sakura-system-ace`, convite aceito, seguindo o "Primeiro dia" do `docs/painel.md`. Depois
   ele começa pela #350.
2. **Quando ele abrir um PR**, ela diz *"revisa o PR da tarefa N"*: conferir o CI, o código e o
   "Pronto quando", explicar em português, e ela decide. Se ela aprovar, eu mesclo.
3. **A parte dela no painel**, na hora de cada tarefa (`docs/painel.md`, "O que a Sofia faz"):
   Cloudflare antes da #352, os dois GitHub Apps antes da #353, o webhook antes da #355.
4. **Quando ela disser "faz a tarefa N"**: ler a issue inteira, fazer as perguntas do "Precisa da
   Sofia?" antes de começar, e o PR fecha a issue (`Closes #N`); a linha sai da tabela da seção 8.
   Sugestão de ordem, se ela perguntar: os ajustes rápidos (#361 a #363) e depois o
   `docs/comparativo-anexar.md`, "Sugestão de ordem".
5. **A lista "O que depende dela"** (seção 8). Com data: **1º/10, a alíquota de 10/2026** no
   portal da prefeitura; o CNPJ (contratado em 30/09, sai em 10 a 20 dias; detalhe no privado); a
   fatura da Focus em 10/10.

**Os marcos de 02/09 a 27/09/2026 foram cortados em 30/09/2026, a pedido dela** (eram ~140 KB que
quase ninguém relia). Antes do corte, o que ainda valia foi levado pros arquivos de `docs/`. O
texto inteiro continua no Git: `git show 0505661:docs/historico.md`. Daqui pra frente, quando
este arquivo crescer demais, cortar os marcos mais velhos do mesmo jeito.

### Onde parou em 30/09/2026: repositório na organização, travas, senhas e o painel prontos pra equipe

Sessão de 29 e 30/09. O bloco longo, com tudo o que foi decidido e por quê, está logo abaixo. **Estado do código**: `main` na **`v0.9.47`** (publicada e liberada; só troca o
endereço do atualizador), banco na **`0064`**. Repositório em **`sakura-corp/sakura-system-ace`**,
**público** (decisão dela; o que fechar exige está no histórico e no item 12 da seção 8).

#### O que ficou pronto
- **Endereço novo** (`v0.9.47`): o PC da casa dela atualizou sozinho pelo redirecionamento.
  **Falta conferir o Balcão** na próxima vez que abrirem o programa na loja.
- **Senhas das automações**: as 8 e a `chave-do-backup.txt` estão no **Bitwarden** dela (pasta
  "Sakura System"). Tokens novos, senha do banco resetada, backup verde nos dois destinos.
- **Travas**: cofres `backup` (só `main`) e `lojas` (só `main` + aprovação dela); rulesets
  `main protegida` (PR + 1 aprovação, ela isenta) e `versões` (`v*` não muda nem apaga).
  **Release, Liberar e Atualizar bancos param em "Waiting" até ela aprovar** ("Review
  deployments" → `lojas` → "Approve and deploy"), inclusive quando eu disparo.
  **O `BACKUP_EMPRESAS` fica nos dois cofres.**
- **Risco aceito por ela**: quem tem escrita consegue mexer em versões por um workflow na própria
  branch (item 78 de `docs/licoes.md`). A trava de verdade (repositório só de versões) fica pra
  depois.
- **Memória pra equipe**: a seção 0, no topo deste arquivo.
- **Painel**: `docs/painel.md` (visão, como a equipe trabalha, design, decisões técnicas, "Primeiro
  dia", o caminho da leva 0 e "O que a Sofia faz"). **Leva 0 criada: issues #350 a #355.**

#### Por onde a próxima sessão começa
1. **Convite do Gustavo**: ela vai trazer o usuário dele no GitHub. Guiar passo a passo:
   convidar pra organização `sakura-corp` (membro, que é o que deixa entrar no painel) e dar
   **Write** no `sakura-system-ace` (Settings → Collaborators and teams). Depois ele segue o
   "Primeiro dia" do `docs/painel.md` e começa pela #350.
2. **Quando ele abrir um PR**, ela diz *"revisa o PR da tarefa N"*: eu confiro o CI, o código e o
   "Pronto quando", explico em português e ela decide. Se ela aprovar, eu mesclo.
3. **A parte dela no painel** vem na hora de cada tarefa: ligar a Cloudflare antes da #352, criar
   os dois GitHub Apps antes da #353 (o segredo do app de teste vai pro Gustavo pelo Bitwarden
   Send), ligar o webhook antes da #355. Eu anoto cada uma em "Andamento" do `docs/painel.md`.
4. **Conferir o Balcão na `0.9.47`.**
5. O `EQUIPE.md` do privado ainda fala do `sakura-painel` separado: corrigir quando o privado
   estiver na sessão.

#### Continua valendo do marco de 28/09 (em `docs/historico.md`)
Os testes que faltavam na loja, os três ajustes pendentes (modais com fundo vazando, status da nota
na lista, texto velho em Notas Fiscais) e as datas de outubro: **1º/10, a alíquota de 10/2026 no
portal da prefeitura**; o CNPJ no começo de outubro; a Focus do Solo pro Start; a fatura da Focus em
10/10.

### Onde parou em 29-30/09/2026: organização `sakura-corp`, travas, senhas e o plano do painel

Mesma sessão do comparativo com o Anexar e do exemplo de DRE (esse bloco foi pro topo de
`docs/historico.md`). **Estado do código** no fim: `main` na **`v0.9.47`** (**publicada e liberada**
pra todas as lojas em 29/09), banco na **`0064`**.

#### Decidido por ela (29/09)
- **Organização `sakura-corp` no GitHub**, criada por ela (pertence à conta pessoal dela até
  existir CNPJ), com o app do Claude instalado em todos os repositórios. **O `sakura-system-ace`
  foi transferido pra lá**: o endereço agora é `sakura-corp/sakura-system-ace`, e o antigo
  (`caranovavidanova/sakura-system-ace`) redireciona. Conferido: o `latest.yml` pelo endereço
  antigo responde `301` pro novo.
- **Ficam na conta pessoal**: `caranovavidanova/ssace-backups` e `caranovavidanova/sakura-corp`
  (o privado). **Cuidado com o nome**: a organização `sakura-corp` e o repositório privado
  `sakura-corp` são coisas diferentes. Se o privado for pra organização um dia, **antes** desligar
  a leitura dos membros (senão todo membro lê preço, margem e sócios).
- **Nunca criar na conta pessoal dela um repositório chamado `sakura-system-ace`**: isso quebra o
  redirecionamento, que é por onde os programas instalados procuram atualização até receberem a
  versão com o endereço novo.
- **Gustavo** (tem Claude Pro) entra como colaborador do `sakura-system-ace` pra construir o
  painel da equipe, no PC dele e com os tokens dele. **O acordo provisório não é pré-requisito**
  (isso muda a ordem do marco de 28/09).
- **O painel mora dentro do `sakura-system-ace`**: pasta `painel/`, manual em `docs/painel.md`.
  Isso substitui o repositório separado `sakura-painel` do marco de 28/09. Formato: página web
  React + Vite, tarefas nas **issues do GitHub** com uma etiqueta por leva, login pelo GitHub.
  **1ª versão**: a lista de tarefas da leva e quem está com cada uma.
- O `EQUIPE.md` do privado ainda descreve o `sakura-painel` separado: corrigir quando o privado
  estiver na sessão.

#### Próximos passos, na ordem dela
1. **Trocar o endereço no programa** (`package.json` → `build.publish`, e o endereço reserva em
   `scripts/liberar-versao.mjs`) → versão no canal de teste → ela testa no PC da casa dela →
   liberar pro Balcão. Se algum dos dois não atualizar sozinho, reinstalar à mão.
   **FEITO (29/09)**: a **`v0.9.47`** (só a troca de endereço) foi publicada, o PC da casa dela
   **atualizou sozinho** (então o redirecionamento do endereço antigo funciona pro canal de teste
   também) e ela foi **liberada pra todas as lojas** a pedido dela. **Falta só confirmar** que o
   Balcão chegou na `0.9.47` na próxima vez que o programa for aberto na loja; se não chegar,
   reinstalar à mão pelo link `releases/latest/download/SakuraSystem-Setup.exe` do endereço novo.
2. **Travas**: cofre (environment) `backup` só pra `main`; cofre `lojas` só pra `main` + aprovação
   dela, pros workflows "Liberar versão" e "Atualizar bancos"; `main` só por PR com aprovação (ela
   isenta); só ela cria tag `v*`. **Risco que fica**: quem tem escrita consegue editar uma release
   publicada na mão. Isso fica protegido só pela regra na memória.
   **Os dois cofres: FEITOS (30/09)**, ver "As senhas" abaixo. **Regra 1, `main protegida`: FEITA
   (30/09)**: ruleset na branch padrão, PR obrigatório com 1 aprovação (cai com commit novo, e a do
   último push tem que ser de outra pessoa), sem apagar nem force push; **Repository admin isento
   (Always allow)**. **Regra 2**: o Release passou pelo cofre `lojas` (aprovação dela) e **perdeu o
   gatilho de push de tag**, só "Run workflow" na `main` (PR #342); e o ruleset de tag **`versões`**
   foi criado (`v*`: bloqueia mudar, apagar e force push, não criar; Repository admin isento).
   **PASSO 2 COMPLETO (30/09).** O merge do #342, sem aprovação, confirmou a isenção dela.
   **O risco que fica é maior do que o anotado acima** (achado em 30/09): quem tem escrita no
   repositório consegue, com um workflow modificado **na própria branch**, usar o token automático
   do Actions (`contents: write`) pra **publicar, liberar ou trocar arquivo** de uma versão. As
   travas dos workflows oficiais não alcançam isso; os **secrets dos cofres, sim** (só `main`),
   então banco e backup ficam protegidos de verdade. Por isso "só ela cria tag `v*`" não dá pra ser
   uma regra de tag que bloqueia criação: quem cria a tag é o próprio Release, com esse token, e o
   GitHub não deixa isentá-lo. **Ela aprovou (30/09)** a regra de tag só pra mudar e apagar `v*`, e
   o Release pelo cofre `lojas`. **Decidido por
   ela (30/09)**: aceitar o risco por enquanto; a trava de verdade (as versões num **repositório
   separado, onde colaborador não escreve**, o mesmo "repositório só de versões" de fechar o código)
   fica **pra depois**. Cuidado barato sugerido: o Balcão no canal normal.
3. **Memória**: o trecho "quando quem está trabalhando não é a Sofia" (abre PR e **não mescla**,
   não publica nem libera, não mexe no banco) + `docs/painel.md` + as issues da leva 0.
   **Parte 1 FEITA (30/09)**: é a seção 0, no topo deste arquivo, revisada por ela. Escopo de quem
   não é ela, por enquanto: **só o painel** ("depois todos vão mexer no sistema").
   **Parte 2 FEITA (30/09)**: `docs/painel.md`. Decidido por ela nesta parte: **Cloudflare** (página
   + login, plano grátis; não Supabase), **login pelo GitHub já na 1ª versão** (GitHub App da
   organização, só membros da `sakura-corp`), e nas tarefas **a pessoa pega uma livre, uma por
   vez**. Depois, também decidido: o Claude deles **guia passo a passo, com calma**, em tudo que não
   for programar (virou regra da seção 0); a pessoa só diz *"quero fazer a tarefa #N"* e o Claude
   explica antes de começar; a próxima tarefa só começa depois da anterior **aprovada** ("Depende
   de"); aviso no fim de cada tarefa **pelo GitHub e pelo WhatsApp** (mensagem que o Claude
   escreve); e o "Fim de uma leva". Tudo no `docs/painel.md`.
   **Parte 3 FEITA (30/09, à tarde)**: com o "ok" dela, a etiqueta `leva-0` e as **6 issues
   #350 a #355** foram criadas, bem guiadas, com a visão dela (autogestão, design parecido com o
   do Claude, contador, **tempo real** com webhook + Durable Object da Cloudflare, financeiro/DRE
   depois e fora do GitHub). O caminho da leva e "O que a Sofia faz" estão no `docs/painel.md`.
   A **mensagem do primeiro dia** (o texto que quem entra cola como primeira mensagem no Claude
   Code do PC, aprovado por ela) mora no `docs/painel.md`, seção "Primeiro dia". O Gustavo usa
   **Windows** (ela disse: não precisa perguntar), e ela **não precisa** de mensagem de WhatsApp
   pra mandar pra ele ("já tá tudo esclarecido"). O rascunho temporário foi apagado.
4. **Convidar o Gustavo**: pra organização `sakura-corp` (membro, que é o que deixa entrar no
   painel) e com escrita no `sakura-system-ace`. Falta o usuário dele no GitHub. Depois do
   convite, ele começa pela mensagem do "Primeiro dia" do `docs/painel.md`.

#### Deixar o `sakura-system-ace` privado: decidido que FICA PÚBLICO por enquanto (29/09)
Ela pediu isso no meio do passo 1. Apresentei três caminhos (A: privado com o plano Team, uns
US$ 4 por pessoa/mês; B: privado no gratuito, com o Gustavo trabalhando por fork; C: fechar mais
pra frente) e **ela escolheu C: "sem custo a mais no momento"**. O repositório continua público; a
hora de fechar é junto com o CNPJ ou antes do primeiro cliente, e a decisão volta pra ela. O que
fechar vai exigir, pra não refazer a conta:
- **Atualização**: o atualizador baixa o `latest.yml` sem login, então com o código privado as
  versões precisam morar num **repositório público só de versões** na organização (só o instalador
  e o `latest.yml`, sem código). O workflow Release passa a publicar lá com um token dela restrito
  a esse repositório. A versão de transição sai **nos dois lugares**; só depois de o PC da casa e
  o Balcão estarem nela o código vira privado (item 21 de `docs/licoes.md`: rever o mecanismo
  **antes** de fechar, não depois).
- **Minutos do Actions**: repositório público não paga. Privado no plano gratuito tem uma cota por
  mês (eram 2.000 minutos; conferir na tela de cobrança). Medido em 29/09: cada rodada do CI gasta
  **~12 minutos cobráveis** (5 tarefas), e foram **83 rodadas em 3 dias** (cada PR roda duas vezes,
  no `push` e no `pull_request`). Nesse ritmo passa da cota.
- **As travas do passo 2**: pelo que eu sei dos planos (não deu pra abrir a documentação do GitHub
  desta sessão, conferir), regra de branch/tag e cofre (environment) em repositório **privado**
  pedem o plano **Team**, e "aprovação obrigatória" num cofre privado pede o Enterprise. No
  gratuito, fechar o código tira as travas justamente quando o Gustavo entra.
- **O que fechar NÃO resolve**: o que já vazou no histórico (CSC, token do Giap, senha do portal)
  continua precisando ser trocado, e uma cópia (fork) feita enquanto era público continua pública.

#### Em aberto
- O usuário do Gustavo no GitHub.
- **As senhas (secrets) do GitHub e os cofres: FEITO (29-30/09)**. Ela não tinha guardado os
  valores e pegou todos de novo, **um por um, no Bitwarden** (pasta "Sakura System"): os 8
  secrets + a `chave-do-backup.txt` inteira (Anotação, com "resolicitar senha principal"). Tokens
  **novos**: R2 `backup-ssace-github` e GitHub fine-grained `backup-ssace-30-09-2026`; a senha do
  banco foi **resetada**. Criados os cofres **`backup`** (8 secrets, só `main`, sem aprovação) e
  **`lojas`** (só o `BACKUP_EMPRESAS`, só `main`, **aprovação dela obrigatória**); os workflows
  passaram a usá-los (PR #339). **Testado**: backup verde lendo do cofre, e "Atualizar bancos" em
  `ensaiar` parou em "Waiting", ela aprovou, e passou (Pneus Amigão na `0064`, em dia). Depois
  ela apagou os secrets soltos do repositório, o token R2 antigo (`backup-ssace`, 18/09) e o token
  antigo do GitHub, e o backup rodou verde de novo, **nos dois destinos**, sem eles (30/09 01:23
  UTC). No caminho: três erros de montagem do `BACKUP_EMPRESAS` e uma correção no job (PR #337,
  item 67 de `docs/licoes.md`). **A partir de agora**: todo "Liberar versão" e "Atualizar bancos"
  para em "Waiting" até ela clicar em "Review deployments" → `lojas` → "Approve and deploy",
  inclusive quando eu disparo por API. **Trocar o `BACKUP_EMPRESAS` é trocar nos dois cofres.**

#### Continua valendo do marco de 28/09 (em `docs/historico.md`)
Os testes que faltavam na loja, os três ajustes pendentes (modais com fundo vazando, status da nota
na lista, texto velho em Notas Fiscais) e as datas de outubro (CNPJ, Focus Solo → Start, fatura da
Focus em 10/10, alíquota de 10/2026 no portal em 1º/10).

### Onde parou em 29/09/2026: comparativo com o concorrente e o exemplo de DRE

Sessão de documentação, **sem código de app**. O marco anterior (28/09: testes na loja, os três
ajustes pendentes, a preparação do painel da equipe) está em `docs/historico.md`, e **tudo o que
ele deixou em aberto continua valendo**.

**Estado do código**: não mudou. `main` na **`v0.9.46`** (publicada e liberada), banco na **`0064`**.

- **Comparativo com o Anexar** (`docs/comparativo-anexar.md`): ela mandou 8 prints do site do
  concorrente. Dos 56 recursos que eles anunciam, temos 12, temos em parte 10 e faltam 34. Os que
  mais pesam: orçamento (`FN-01`), checklist com fotos e assinatura (`FN-02`), agenda (`FN-05`),
  devolução (`FN-08`), DRE, curva ABC, fluxo de caixa projetado e o app de celular. **É lista de
  consulta, não plano**: nada é pra construir antes de ela pedir.
- **Exemplo de DRE** (no privado, `sakura-corp`, pasta `dre/`): a explicação de DRE que o pai dela
  escreveu, os números dos prints transcritos e os 2 PDFs. **Os números são de uma das lojas do
  pai dela, tirados do sistema daquela loja: só exemplo de como um DRE funciona, sem relação com
  o SSACE nem com a Pneus Amigão.** Serve de modelo quando o SSACE ganhar o DRE (a seção 4 do
  `dre/README.md` lista o que faltaria: taxa da maquininha, grupos de despesa etc.).

#### Por onde a próxima sessão começa
Igual ao marco de 28/09 (em `docs/historico.md`): perguntar dos testes que faltavam na loja e
juntar com os três ajustes pendentes (modais com fundo vazando, status da nota na lista, texto
velho em Notas Fiscais); depois, o painel da equipe; e as datas de outubro (CNPJ, Focus
Solo → Start, fatura da Focus em 10/10, alíquota de 10/2026 no portal em 1º/10).

### Onde parou em 28/09/2026: testes na loja e preparação do painel da equipe

Sessão de conversa, **sem código de app**. O marco anterior (27/09, à noite: levas, horas, Team,
domínio, e-mail `contato@sakuracorp.com.br` pronto, CNPJ em outubro, custos) está em
`docs/historico.md`; o detalhe privado (equipe, custos, empresa) no `sakura-corp`, em `EQUIPE.md`,
`EMPRESA.md`, `PRECOS-E-CUSTOS.md` e `ACORDO-PROVISORIO.md` (adicionar à sessão quando o assunto for
equipe ou empresa).

**Estado do código**: não mudou. `main` na **`v0.9.46`** (publicada e liberada), banco na **`0064`**.

#### Testes na loja (28/09)
- **Feitos**: o computador da loja aparece como **"Balcão"**, na `0.9.46`, no **canal de teste**.
  O outro da lista (`DESKTOP-PKJ2A3B`, `0.9.44`, teste) deve ser o da casa dela: ela vai abrir o
  programa lá, confirmar e dar um apelido (se o dela tiver outro nome, esse pode ser esquecido).
  **NFS-e emitida e cancelada pelo porteiro** (número 22, aparece "cancelada") → **a parte 2 do
  `TR-04.2` está liberada** (a migration que apaga a cópia antiga do token; só quando ela pedir).
- **Faltavam**: venda de balcão com o leitor, ficha do veículo, Fechamento do Caixa, "Registrar
  pagamento" de comissão, trava do desconto, pagar/desfazer conta, faturar OS (recebido agora e a
  receber). Ela ia juntar o que achar estranho (fotos) pra resolver tudo de uma vez **quando o
  limite de uso dela resetar**.

#### Três ajustes que ela pediu e deixou PENDENTES (não fazer antes de ela pedir)
- **Modais com o fundo vazando**: o texto da tela de trás aparece através do pop-up (ela viu no
  "Nota fiscal" de Notas Fiscais; vale pros outros). Causa: o `Modal` (`src/components/Modal.tsx`)
  usa o `sakura-card`, vidro translúcido (`rgba(20,15,20,0.35)` + blur), sobre uma sobreposição de
  só `bg-black/40`. Caminho provável: painel opaco e sobreposição mais escura; os dois modais com
  sobreposição própria (`ImportarNotaFiscalXmlModal`, `ImportarNotasFiscaisModal`) também. Conferir
  contraste (`npm run contraste` + varredura nas telas) e olhar renderizado.
- **Status da nota na própria lista** de Notas Fiscais (`ArquivosSection.tsx`): "cancelada" só
  aparece dentro do modal. Mostrar o `status` numa coluna ou selo na linha.
- **Texto desatualizado no topo de Notas Fiscais** (`NotasFiscaisPage.tsx`): ainda diz que "a
  emissão automática ainda não existe".

#### O painel da equipe: preparação (nada criado ainda)
Um amigo que já tem o Claude Pro vai começar o painel antes do Team. Ordem combinada (detalhe no
`EQUIPE.md` do `sakura-corp`): **acordo provisório assinado** (rascunho pronto, faltam três
respostas dela) → **planejar a leva 0** com ela (proposta: 1ª versão = lista de tarefas da leva e
quem está com cada uma, lendo do GitHub) → ela cria a **organização `sakura-corp` no GitHub**
(recomendado em vez de conta nova) e, dentro dela, o repositório privado **`sakura-painel`** → eu
ligo o repositório à sessão e escrevo o manual (`CLAUDE.md`) e as tarefas → convite ao amigo
(falta o usuário do GitHub dele). **O `sakura-system-ace` NÃO muda de endereço por enquanto**: os
programas instalados buscam as atualizações em `caranovavidanova/sakura-system-ace`; mudar exige um
plano próprio (junto com a decisão de "fechar o código"). E-mails da equipe: um por pessoa no Zoho
grátis (faltam os nomes); no GitHub, quem já tem conta adiciona o e-mail da Sakura na conta que já
tem, sem criar outra.

#### Por onde a próxima sessão começa
1. **Perguntar como foram os testes que faltavam** e juntar o que ela trouxe com os três ajustes
   pendentes. Bug da loja é pra fazer na hora (quando ela pedir).
2. **O painel**: pegar as três respostas do acordo e gerar o PDF; fechar a leva 0; seguir a ordem
   acima conforme ela for criando a organização e o repositório.
3. **Continua valendo do marco anterior**: Claude Team antes do primeiro cliente (a data é dela);
   **abrir o CNPJ no começo de outubro** (confirmar com ela); trocar a **Focus do Solo pro Start**
   antes do CNPJ da primeira loja nova; primeira fatura da Focus em **10/10**; perguntar à
   contabilidade da Pneus Amigão sobre a migração do Simples pro Ambiente Nacional da NFS-e em
   **1º/11** (se valer, é fato novo pro item 3 do playbook em `docs/pendencias-e-futuro.md`).

Com data: **1º/10/2026**, a alíquota de 10/2026 no portal da prefeitura.
