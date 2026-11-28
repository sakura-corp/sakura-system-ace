# Estrutura de pastas e padrões de código

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 4. Estrutura de pastas

Este é o mapa do que **não é óbvio**. Os arquivos seguem o nome da entidade: `clientes` tem
`src/lib/clientes.ts`, `src/types/cliente.ts`, `src/schemas/cliente.ts` e `src/pages/clientes/`.
Pro resto, um `ls` resolve. O que cada tela faz está na seção 7.

### O programa das lojas (`electron/` e `src/`)

- **`electron/main.ts`**: a janela, o atualizador e tudo que a tela pede ao processo principal:
  a chamada autenticada à Focus NFe (fora do CORS, item 29 da seção 6), a conexão com o banco
  (`conexao.json`), o WhatsApp, os registros em disco, o Diagnóstico, o canal de atualização e a
  identidade do computador (`computador.json`).
- **`electron/preload.ts`**: a ponte `window.sakuraApp`. Tudo o que a tela pede ao processo
  principal passa por aqui, e o `main.ts` confere cada pedido (`TR-04.6`, item 18 da seção 6).
- **`src/App.tsx`**: as rotas. Decide o que aparece: Conexão (sem banco escolhido) → Login →
  Trocar senha (quando `operador.deve_trocar_senha`) → o programa. Liga os comportamentos globais
  dos campos (Enter avança, apagar data limpa, número não muda sem digitar).
- **`src/contexts/AuthContext.tsx`**: a sessão e o operador logado (`useAuth`).
- **`src/components/`**: peças reaproveitadas. As que têm regra por trás:
  - **as peças do visual novo** (#990; a tabela de como usar cada uma está em
    `docs/referencia/visual-novo/README.md`, seção 6): `Botao.tsx` (com o `LinkBotao`), `Selo.tsx`
    (o aviso com ícone e palavra; sem a palavra não compila), `CartaoNumero.tsx`, `Dica.tsx` (no
    lugar do `title`) e `AvisoQueSome.tsx` (quem avisa é o `avisar()` de `src/lib/avisoQueSome.ts`).
    Tela nova usa a peça, não escreve as classes à mão;
  - **as peças comuns da leva 8** (#1085): ver "Peças comuns e moldes da leva 8", mais abaixo;
  - `Modal.tsx` (a janela por cima da tela); `Combobox.tsx` (select com busca, usado em toda lista
    que vem do banco; `permitirLivre` aceita valor fora da lista, hoje só na Marca do veículo);
  - `AcoesDaLinha.tsx` (botão pro que é do dia a dia + menu de três pontinhos pro que não se
    desfaz, item 51); `Valor.tsx` (negativo com cara de negativo, e `<Variacao>`, item 54);
    `Explicacao.tsx` (o "?" que explica um número);
  - `AvisoVersaoBanco.tsx` (banco atrás do programa: avisa, nunca tranca), `AvisoAliquotaCompetencia.tsx`
    (a alíquota do mês), `AvisoRascunho.tsx` (restaurar rascunho), `ErrorBoundary.tsx` (erro de
    tela vira mensagem com saída pro Início e pro Diagnóstico, e vai pro `erros.log`);
  - `AreaRolavel.tsx` (a barra de rolagem própria, seção 2), `LojaSwitcher.tsx` (trocar de loja,
    só com 2+ lojas), `LinkPlaca.tsx` (a placa que abre a ficha do veículo), `PermissaoRoute.tsx`
    (guarda de rota por módulo), `VersaoApp.tsx`, `BotaoVoltar.tsx`, `BotaoWhatsapp.tsx`.
- **`src/galeria-de-pecas/`**: a mostra das peças do visual novo. **Não faz parte do programa das
  lojas** (nada do programa importa esta pasta); abre por `docs/referencia/visual-novo/pecas.html`.
- **`src/hooks/`**: `useEnterParaProximoCampo`, `useLimparDataAoApagar` (item 27),
  `useNaoMexerNoNumeroSemDigitar` (item 41), `useRascunhoFormulario` (rascunho salvo a cada 30 s;
  `useRascunho` junta salvar e restaurar), `useSituacaoDoEsquema` (compara a versão do banco com a
  esperada, `TR-05.7`) e `useListaPaginada` (a lista por página, ver "Lista que pode crescer").
- **`src/lib/`**: uma por entidade, com o acesso ao Supabase (`listar`, `criar`, `excluir`…); toda
  tabela que é por loja recebe `lojaId` explícito. E a infraestrutura:
  - `supabase.ts` + `conexao.ts` (com qual banco este computador fala), `errors.ts`
    (`mensagemDeErro` e a frase de cada trava `ck_` do banco, `MENSAGEM_DA_TRAVA`), `datas.ts`
    (`hojeLocal()`/`diaLocal()`, itens 34 e 42), `schemaVersao.ts`, `registrarErros.ts`,
    `diagnostico.ts`, `computadores.ts`;
  - `focusNfe.ts`: **monta** a NFC-e e a NFS-e e pede ao porteiro pra repassar (não vê token). As
    notas-modelo dos testes estão em `__ouro__/`;
  - `notaFiscalXmlFornecedor.ts` (lê o XML da nota do fornecedor, sem IA), `iaNotaFiscal.ts`
    (leitura por foto, pela Edge Function), `notaFiscalXml.ts` (recibo pro cliente), `zip.ts` e
    `download.ts`;
  - `depositos.ts` (`buscarDepositoPadraoId()`, usado por todo fluxo que mexe no estoque sem
    perguntar o depósito), `whatsapp.ts` e `modelosWhatsapp.ts`, `viaCep.ts`, `feriados.ts` e
    `calendario.ts`, `marcasVeiculo.ts`, `corVeiculo.ts`, `origemMercadoria.ts`.
- **`src/schemas/`**: os esquemas `zod` de cada formulário, o mapeamento formulário ↔ banco e
  **toda conta de dinheiro, como função pura testada** (`dinheiro.ts`, `faturamento.ts`,
  `metricasCaixa.ts`, `comissoes.ts`, `fechamentoCaixa.ts`, `painelInicio.ts`, `vendaBalcao.ts`…).
  `arquitetura.test.ts` reprova conta de dinheiro escrita dentro de uma tela (item 49).
  `versaoEsquema.ts` tem a `VERSAO_ESQUEMA_ESPERADA`.
- **`src/pages/<modulo>/`**: `<Modulo>Page.tsx` (lista) + `<Modulo>Form.tsx`; formulário grande
  divide os campos em `campos/`. Os nomes que enganam:
  - `painel/` é o **Início**; `relatorios/` é **Relações** (abas Gráficos e Lucratividade);
  - `auditoria/` é só admin, e `diagnostico/` é pra qualquer operador (os dois pelo rodapé do
    menu); `conexao/` não tem rota (o `App.tsx` decide); `veiculos/` é a ficha do veículo (abre
    pela placa, sem entrada no menu);
  - a venda de balcão mora em `ordens-servico/` (`VendaBalcaoForm.tsx`, `VendaBalcaoDetalhe.tsx`).
- **`src/types/`**: as interfaces de cada entidade. **`src/testes/tela.tsx`**: o ajudante dos
  testes de tela. **`src/styles/globals.css`**: a paleta e as regras globais (seção 2).

### O banco (`supabase/`)

- **`migrations/`**: `0001` a `0064`, todas idempotentes, cada uma registrando a própria versão
  (regras em "Padrão de código", abaixo, e na seção 5).
- **`instalacao/`**: `instalacao-completa.sql` (todas as migrations num arquivo só, **gerado** por
  `npm run gerar-instalacao`; nunca editar à mão) e `INSTALAR-LOJA-NOVA.md` (o checklist de venda,
  seção 9).
- **`scripts/`**: SQL que **não** faz parte da sequência.
  - `testar-*.sql`: um por migration que mexe em regra; rodam sozinhos no CI (`npm run test:sql`)
    e terminam em `TODAS AS CHECAGENS PASSARAM`. **Nunca rodar no Supabase real** (gravam e apagam
    dado de teste). O mesmo vale pro `stub-supabase-local.sql`.
  - `limpar-dados-de-teste.sql` (apaga dado de negócio, preserva login e configuração, seção 5) e
    um de uso único já usado (`excluir-os-teste-nfse-producao.sql`).
  - **Nada de dado de cliente de verdade** em script, teste ou exemplo: o repositório é público.
    Em teste, usar nomes, CPF e endereço inventados (ex: "Cliente Exemplo da Silva",
    `123.456.789-09`).
- **`testes-rls/`**: a matriz de RLS (`npm run test:rls`, `TR-07.3`, item 63). Monta um banco do
  zero, simula cinco papéis e confere cada tabela × comando × papel. **`expectativas.csv` é a parte
  que se revisa** (mudança de segurança aparece no diff do PR); `lacunas-de-proposito.csv` lista o
  que não tem policy de propósito. Só roda no CI.
- **`functions/`**: as Edge Functions. `focus-nfe` (o porteiro, `TR-04.2`; sem `import`, pra rodar
  igual no Supabase e no Vitest), `ler-notas-fiscais` (a leitura por foto; fora das lojas novas) e
  `redefinir-senha-operador` (admin gera senha temporária; usa a chave de serviço que o próprio
  Supabase injeta).

### Comandos e automações

| Comando | O que faz |
|---|---|
| `npm run typecheck` / `lint` | TypeScript e ESLint (o lint tem a trava contra cortar o dia em UTC, item 48) |
| `npm test` / `npm run test:fusos` | Os testes; o segundo roda duas vezes, em São Paulo e em UTC (em `.mjs` porque `TZ=x npm test` não funciona no PowerShell dela) |
| `npm run contraste` / `contraste:telas` | Contraste nas classes / nas 54 telas renderizadas, compondo o vidro com o que está atrás (`divida-de-contraste.mjs` só encolhe) |
| `npm run largura:telas` | Abre todas as telas em 1024, 1280, 1366, 1536 e 1600 de largura e reprova conteúdo que passa da janela sem dar pra rolar (`medir-largura.mjs` explica o que conta, #425) |
| `npm run gerar-instalacao` | Regera o `instalacao-completa.sql`; o `npm test` reprova se estiver atrasado |
| `npm run test:sql` / `test:rls` / `test:atualizar-bancos` | Testes com Postgres de verdade. **Só no CI (Linux)** |
| `npm run test:electron` | Abre o programa **no Electron de verdade** e confere a ponte, as travas da janela e a CSP. Único teste que pega preload quebrado em silêncio. Só no CI |
| `npm run checar-versao-electron` | "O Electron ainda recebe correção de segurança?" |
| `npm run comparar:electron -- 36` | Abre todas as telas **dentro de dois Electrons** (o do projeto e o pedido; ou `-- 36 40`) e compara imagem por imagem, mais o que o Chromium faz sozinho nos campos (setas e rodinha no número, digitar a data). Gera um `relatorio.html` com antes, depois e onde mudou. É o teste de laboratório de cada salto do Electron (#385). Leva uns 10 minutos; não está no CI |

| Workflow | O que faz |
|---|---|
| `ci.yml` | Em push na main e em todo PR (PR só de `.md`/`docs/` pula telas, Electron e RLS; segredos roda sempre; todo job tem `timeout-minutes`): typecheck, lint, testes nos dois fusos, contraste, instalação em dia; e os jobs de contraste nas telas, largura nas telas, matriz de RLS (com o botão de bancos e os testes de migration), Electron de verdade e **segredos** (gitleaks + certificado versionado). Não builda o instalador |
| `release.yml` | **Só "Run workflow" na `main`, com a aprovação dela.** Builda e publica a versão como pré-lançamento (canal de teste); o `latest.yml` sobe por último (item 66) |
| `liberar-versao.yml` + `scripts/liberar-versao.mjs` | Libera uma versão pra todas as lojas; confere a release antes e de fora depois. Voltar atrás = liberar a anterior |
| `atualizar-bancos.yml` + `scripts/atualizar-bancos.mjs` | O botão de atualizar os bancos (item 11 da seção 8) |
| `backup-banco.yml` + `scripts/retencao-backup.mjs` | Backup cifrado de cada empresa, todo dia às 3h, em dois lugares. Guarda 30 diárias + a primeira de cada um dos últimos 12 meses, pela regra "guarde as N mais recentes" (nunca "apague o que tem mais de N dias") |
| `electron-desatualizado.yml` | Dia 1 de cada mês roda o `checar-versao-electron`; **fica vermelho enquanto o Electron estiver numa linha sem suporte** (item 14 da seção 8) |

Outros: `scripts/ligar-fuses.mjs` (as "chavinhas" de segurança gravadas no executável, `TR-04.6`),
`.gitleaks.toml` (regras próprias pra chave do Supabase e da Anthropic, itens 49 e 64),
`vitest.config.ts` (separado do Vite; teste mora ao lado do arquivo, `<arquivo>.test.ts`).

### Fora do programa

- **`site/`**: o site de apresentação, **parado** (item 9 da seção 8). `site/ferramentas/` abre o
  programa num navegador com um Supabase de mentira (`banco-falso.mjs` + `dados-demo.mjs`) e serve
  a quatro coisas: as imagens do site, o catálogo das telas, o `contraste:telas` e o
  `largura:telas` (os dois últimos sobem o servidor pelo `servidor-telas.mjs`). Pra passar só por
  algumas cenas, `percorrerTelas` aceita um filtro como segundo argumento. **O navegador é um
  Chromium avulso**, que não muda quando o Electron muda; pra abrir as telas dentro do Electron do
  projeto, `TELAS_NO_ELECTRON=1` (vale pra qualquer varredura) ou o terceiro argumento
  (`{ electron, horaFixa }`), que é o que o `comparar:electron` usa (lição 82).
- **`apresentacao/`**: o levantamento do sistema e o script das fotos da apresentação comercial.
- O painel da equipe não mora mais aqui: saiu na #814 e vive no `sakura-corp/escritorio` (pasta
  `painel/` e `docs/painel.md` de lá).
- **Documentos**: `PROJETO_STATUS.md` + `docs/` (a memória), `MELHORIAS.md` (o guia de melhorias,
  aberto só quando ela cita um item), `ANTES-DA-PRIMEIRA-VENDA.md` (LGPD), `RESTAURAR-BACKUP.md`
  ("deu problema no banco, e agora?"; a primeira tabela manda **não** usar backup na maioria dos
  casos). O `CHANGELOG.md` parou na `0.9.2`.
- **`.claude/skills/gerar-modulo/`**: a skill `/gerar-modulo` (abaixo). **`build/icon.png`**: o
  ícone do instalador. **`.env`** (local, fora do Git): `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY`, usados só no `npm run dev`.

## Padrão de código (seguir em módulo novo)

- Cada entidade tem `types/<entidade>.ts` (interfaces + `Novo<Entidade>`), `lib/<entidade>.ts`
  (funções que usam o cliente `supabase`), `pages/<modulo>/<Modulo>Page.tsx` (lista, com
  carregando e erro) e `<Modulo>Form.tsx`.
- Erro do Supabase **não é `instanceof Error`**: sempre `mensagemDeErro()` de `src/lib/errors.ts`.
- **Lista que pode crescer** (`src/lib/paginacao.ts`): o Supabase corta toda resposta em 1.000
  linhas, sem erro. Lista inteira → `buscarTudoEmPaginas`; filtro por lista de ids (`.in`) →
  `buscarPorIdsEmBlocos` (blocos de 100 ids, senão o endereço fica grande demais). As duas pedem
  ordem total (último `.order()` em `id`). #509 e #498.
  **Lista que a pessoa vê e que cresce** (Clientes desde a #373; as outras entram uma tela por vez):
  `useListaPaginada` (`src/hooks/`). A tela passa uma função que pede ao banco **uma página**
  (`.range(de, ate)`, `.order()` terminando em `id`, o filtro e a busca no servidor, e
  `count: "exact"` pro total); o gancho cuida da página, da ordem guardada por tela, da espera da
  busca e de só gravar a resposta mais nova (#903). Modelo: `listarClientesPagina` em
  `lib/clientes.ts` (inclusive como escapar a busca dentro do `.or()`) e `ClientesPage.tsx`.
- **Nunca `window.prompt()`**: o Electron não suporta. `alert()` funciona; o `confirm()` também,
  mas **sai** (#1079, item 1): perguntar antes de apagar é com a `JanelaDeConfirmar` (abaixo).
- Toda tabela nova precisa de RLS e policy (item 1 da seção 6).
- Valor padrão a partir de `import.meta.env.VITE_*`: usar `||`, nunca `??`. O Vite injeta variável
  ausente como **string vazia** (item 8 da seção 6).
- Conta de dinheiro nunca dentro de tela: vai pra `src/schemas/` (item 49). Dia de calendário com
  `hojeLocal()`/`diaLocal()`, nunca `toISOString().slice` (itens 34 e 48).
- **Migration**:
  - idempotente de verdade: dropar o nome **final** da policy ou objeto antes de criar, não só o
    antigo (item 13);
  - **termina registrando a própria versão**:
    `insert into schema_versao (versao) values (<número>) on conflict do nothing;`. Sem essa linha,
    o aviso de banco desatualizado mente. Sobe junto a `VERSAO_ESQUEMA_ESPERADA`
    (`src/schemas/versaoEsquema.ts`); o `npm test` reprova quem esquecer;
  - **quando aperta uma regra que a versão anterior do programa usava** (a exceção, como a
    `0062`), declara no cabeçalho, numa linha própria: `-- versao-minima-do-programa: 0.9.44`. O
    botão de atualizar os bancos só aplica quando nenhum computador em uso está abaixo disso (seção
    9). Migration que só acrescenta não leva a linha. Versão torta na linha recusa a rodada inteira;
  - ganha um `supabase/scripts/testar-*.sql` e, se mexer em policy, entra na matriz de RLS;
  - nunca tirar nem renomear coluna em uso na mesma versão que passa a usar a nova.

## Peças comuns e moldes da leva 8 (#1085)

Tela nova, ou tela que vai pro visual da leva 8, **usa estas peças e não desenha à mão** abas,
trilha de passos, pergunta de apagar, lista, ficha ou formulário. Cada peça explica o detalhe no
comentário do próprio arquivo; aqui fica **qual usar quando**. As regras de cor, letra e espaço
são as de `docs/referencia/visual-novo/README.md`. Cada tela troca pras peças **na sua tarefa**
(as trilhas A, B e C da leva 8), nunca de carona em outra.

| Peça (em `src/components/`) | Quando usar | Quando NÃO usar |
|---|---|---|
| `Abas.tsx` | trocar de **visão dentro da mesma tela** (Produtos / Movimentações; Ordens / Vendas). É a única aba do programa: o `AbaBotao` antigo saiu | escolher um valor ou filtrar (isso é `Chips`; a "Situação do saldo" dos Relatórios do Estoque e o "Abertos / Recusados" dos Orçamentos ainda são abas e trocam na tarefa da tela); passos em ordem (isso é `Passos`) |
| `Chips.tsx` | escolher **um valor entre poucos, à vista** (período, forma de pagamento, "Tudo / Entradas / Saídas"); `multipla` pra filtro de vários | mais de uns 6 valores (vira `Combobox`); trocar de visão (`Abas`) |
| `Passos.tsx` | tarefa **em ordem, de 3 a 5 passos**, que a pessoa não pode pular (fechar o caixa, fechar a OS). A tela guarda o passo; a trilha só mostra | formulário comum, mesmo comprido (vai em seções do `MoldeFormulario`) |
| `JanelaDeConfirmar.tsx` (e o `useConfirmar()`) | **toda** pergunta antes de apagar, cancelar ou fazer o que não tem volta, no lugar do `confirm()`. Diz o nome do item, o foco começa no "Cancelar", o botão diz o verbo ("Excluir produto"). `tom: "normal"` pra confirmar o que não é apagar (fechar o caixa) | o que se desfaz sozinho (mudar um filtro, abrir uma janela): ali não se pergunta nada |
| `molde/MoldeLista.tsx` + `molde/LinhaDeLista.tsx` | **toda lista de coisas** (clientes, peças, contas, garantias, notas): busca e `Chips` em cima, uma linha por item (nome em cima, detalhe embaixo, **uma** ação + o "⋯"), "Ver todos" quando passa do limite, e os estados prontos: carregando (esqueleto só depois de 0,4 s), vazio de começo (frase + botão), vazio de busca (o que buscou + "Limpar a busca") e erro (a frase do `mensagemDeErro()` + "Tentar de novo"). A tela busca e filtra; o molde só mostra | tabela de números pra comparar coluna com coluna (Relações, Curva ABC) |
| `molde/MoldePerfil.tsx` | **a ficha de uma coisa só** (cliente, veículo, funcionário, peça): o nome como título, **uma** ação laranja, **1 número grande + até 3 de apoio** (o tipo não deixa passar de 3), e as listas embaixo, cada uma um `MoldeLista` de 6 linhas. Os números chegam prontos (conta de dinheiro nunca no molde) | a lista de várias coisas (`MoldeLista`); o painel do dia (Início, Relações) |
| `molde/MoldeFormulario.tsx` + `molde/CampoDoMolde.tsx` | **todo formulário**. **Curto (até uns 6 campos): `em="janela"`** (Esc fecha, foco no primeiro campo). **Longo: `em="pagina"`**, cada seção num `SecaoDoFormulario`, ações no rodapé, e o Esc **não** fecha. O campo é o `CampoDoMolde` (rótulo em cima, "obrigatório" escrito, erro e ajuda embaixo, 48 px). Clicar 2 vezes não salva 2 vezes | — (o padrão abaixo continua valendo: o `useForm`, o esquema e o mapeamento são da tela) |

**No catálogo das telas** (`site/ferramentas/cenas.mjs`, que também alimenta o `contraste:telas` e o
`largura:telas`): as cenas `07-ordens` a `07c-ordens-loja-nova` mostram o `MoldeLista`, a
`LinhaDeLista` e os `Chips` (lista cheia, busca sem resultado, período escolhido e loja sem OS); as
de Ordens (a própria `07-ordens`), Orçamentos, Estoque, Funcionários, Caixa, Fornecedores, Notas e a
Curva ABC das Relações mostram as `Abas`. O erro e o esqueleto do
molde de lista não têm cena (o banco de mentira não falha nem demora numa cena só): estão provados
nos testes do `MoldeLista`. `Passos`, `JanelaDeConfirmar`, `MoldePerfil` e `MoldeFormulario`
ainda não têm cena: o catálogo só fotografa telas de verdade do programa, e nenhuma tela usa essas
peças ainda. Ganham cena quando a primeira tela as usar (as tarefas das trilhas), ou antes, se a
Sofia decidir por uma tela de demonstração (pergunta aberta na #1136).

## Padrão de formulário: `react-hook-form` + `zod` (todo o app já está assim)

Decisão dela (a partir de um plano de refatoração do Gemini): é o jeito **padrão** de fazer
formulário no app, no lugar do antigo `useState` por campo. As regras:

- O esquema `zod` e o mapeamento ficam em `src/schemas/<entidade>.ts`, não junto do componente:
  `<entidade>FormSchema`, `paraValoresFormulario(existente?)` (banco → formulário) e
  `para<Entidade>(valores)` (formulário → banco, `""` vira `null` e texto numérico vira `number`).
- O formulário é um **orquestrador** (`useForm`, abas, `handleSubmit`) e passa os campos pra
  componentes em `<modulo>/campos/<Grupo>Fields.tsx`, que recebem `register` (e `control` só quando
  precisam de `useFieldArray`, como filhos ou veículos).
- `Secao`/`Campo`/`inputClasse` ficam num `<modulo>/campos/FormCompartilhado.tsx` **de cada
  módulo**, de propósito, pra não acoplar dois módulos por causa de um enfeite visual.
- **Item de lista dinâmica que tem `id` no banco** (ex: veículo do cliente) precisa de um
  `<input type="hidden">` registrado pro `id` dentro do `useFieldArray`. Sem ele, adicionar ou
  remover no meio da lista pode perder o `id` e recriar a linha, soltando o que aponta pra ela
  (`ordens_servico.veiculo_id`, ver `VeiculosFields.tsx`).
- **Campos que se recalculam entre si** (custo → margem → preço, em `PecaForm.tsx`) usam `watch()`
  + `setValue()` num `onChange` próprio, com a conta como função pura no schema
  (`precoAPartirDaMargem`/`margemAPartirDoPreco` em `schemas/peca.ts`).
- **Select com valor "sentinela"** que não existe no dado (ex: "Serviço avulso" no item da OS, que é
  `servico_id` vazio) **não pode usar `register()`**: o select "desmarca" sozinho. Deixar controlado
  de verdade (`value={watch(...)}` + `onChange` com `setValue()` traduzindo o sentinela), como em
  `ItemOSRow.tsx`.
- **Janela com formulário nunca é desenhada dentro de outro `<form>`** (#1130): o `Modal` não usa
  portal, então ele fica onde aparece no JSX. Desenhe a janela **depois** do `</form>` da tela (como
  os modais e a aba Fechamento em `OrdemServicoForm.tsx`). Um `<form>` dentro de outro é HTML
  inválido: o "Salvar" de dentro envia o de fora junto, e nada visível acontece (foi assim que uma
  nota travou na loja). **A trava é automática**: todo teste de tela (`@/testes/tela`) reprova se
  aparecer `<form>` dentro de `<form>` (`src/testes/semFormDentroDeForm.ts`); mas ela só vê a
  janela que o teste **abre**.

**Na revisão de PR** (o `/code-review` e quem revisa), conferir também:
- [ ] **Janela com formulário dentro de outro formulário? Tem teste que abre essa janela?** (#1130)

**Skill `/gerar-modulo`** (`.claude/skills/gerar-modulo/SKILL.md`): cria um módulo novo inteiro
(migration, types, lib, página, formulário e registro em `MODULOS`/`App.tsx`) nesse padrão. Usar
sempre que o pedido for "módulo ou cadastro novo", e conferir se o que ela gera segue o padrão de
formulário acima.
