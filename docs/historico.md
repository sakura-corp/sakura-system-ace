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
  "Empacotamento", seção 7). Em 12/10/2026: a `v0.9.51` é a liberada pra todas as lojas (desde
  08/10); banco na `0064`. Da `0.9.51` em diante, as versões moram no
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

### 17/10/2026, tarde (5): a #538 entrou e o painel v2 (#542 a #546) começa antes da leva 1 terminar

**Estado do código**: a loja continua na `v0.9.51`, e o banco na `0064`. Na `main` entraram a #536 (PR #553) e a #538 (PR #554), as duas do painel, que se publica sozinho. Há mudanças pequenas na `main` esperando ela decidir publicar o programa das lojas.

#### Decidido (Sofia, 17/10)
- **A #542 à #546 são feitas agora, pela Sofia com o Claude**, sem esperar a leva 1 terminar. **Não levam etiqueta de leva**: se levassem `leva-2`, o painel trocaria a leva atual e a leva 1 sumiria da tela. Um comentário em cada uma das cinco issues diz isso.
- **A leva 1 fica pra equipe a partir de segunda (19/10)**: #510, #511 e #455, uma pra cada pessoa. Nenhuma delas mexe em `painel/`.
- **Só a #547, a #548 e a #549 continuam na leva 2**, e a etiqueta `leva-2` só entra quando a leva 1 fechar.
- Uma **sessão coordenadora** abre uma sessão por tarefa, na ordem das dependências:
  1. a #542;
  2. a #543 e a #544, juntas;
  3. a #545;
  4. a #546.

  Cada sessão de tarefa abre o próprio PR. Ela mescla cada um antes de a coordenadora abrir as tarefas que dependem dele.

#### O que depende dela
1. **Mesclar os PRs da #542 à #546**, um por vez, conforme a sessão coordenadora avisar, e conferir no endereço do painel o "Depois de publicar" de cada um. A #538 também está nessa lista: pegar uma tarefa, tentar uma segunda e largar.
2. **No Team (19/10)**: conferir que a equipe tem os três modelos da tabela e consegue abrir sessões filhas (comentário na #474). A equipe então pega a #510, a #511 e a #455.
3. Aprovar ou ajustar a sugestão do relatório da #355 pra skill `chefe-backend`, e as sugestões de "Como eu agi" dos relatórios da #536 e da #538 pro ritual. Provar o "Copiar texto" do painel no celular.
4. **Publicar a próxima versão** no canal de teste e testar no programa instalado: só quando ela pedir.
5. Conferir as issues com `label:sofia` (https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aopen+label%3Asofia) e as do privado. Assuntos da empresa (Team, lançamento, Pix) ficam no privado.
6. A #442: medir o CI por volta de 23/10. O aviso automático de conversa comprida ainda não foi visto funcionando (#471).

### 17/10/2026, madrugada (4): a leva 1 montada e o painel v2 sendo planejado de noite

**Estado do código**: igual ao marco anterior (loja na `v0.9.51`, banco na `0064`, mudanças pequenas na `main` esperando ela decidir publicar). Só mudou documentação.

#### A leva 1 (montada e aprovada em 17/10)
- **Painel**: #536 o cartão lê o cabeçalho (5 h), #538 pegar e largar tarefa (6 h, espera a #536), #539 horas por pessoa (3 h). **Programa**: #510 janelas no Modal (3 h), #511 testes no Windows (2 h), #455 clientes que sumiram (6 h). Total 25 h, todas no modelo único, com `leva-1` e `chefe:`. Detalhe em `docs/painel.md`, "Andamento".
- Decidido junto: o "Começar com o Claude" aparece **só pra quem pegou**; horas por pessoa **contadas na leva**; na #455, **6 meses** e o texto padrão da issue.
- **Leva 2**: "fases da leva" e "relatório e aprovação" pedem uma conversa de desenho com ela antes.

#### O painel v2, de noite (sem ela)
- A pedido dela, foi aberta uma **sessão mãe** pra planejar as abas, os dados e o visual do painel, com as abas das funções futuras em "em breve", referências e **duas ou três versões visuais em páginas de exemplo** (sessão `session_0158Dwe3s7gWC25Ktu1Hifij`). Tudo num **PR só, não mesclado**, sem mexer no código de `painel/` (a leva 1 mexe nos mesmos arquivos, e o painel publica sozinho da `main`). No máximo **6 sessões filhas**, 3 ao mesmo tempo, por causa da cota do Pro.

#### O que depende dela
1. ~~De manhã: o PR do painel v2~~: **feito** (ela mesclou o #541 e o #550 em 17/10; as tarefas são as #542 a #549, sem `leva-2` até a leva 1 terminar).
2. **No Team (19/10)**: conferir que a equipe tem os três modelos da tabela e consegue abrir sessões filhas (comentário na #474). Aí a equipe pega a leva 1; a #536 é a que mais destrava.
3. Aprovar ou ajustar a sugestão do relatório da #355 pra skill `chefe-backend`; provar o "Copiar texto" do painel no celular.
4. **Publicar a próxima versão** no canal de teste e testar no instalado: só com ela pedindo.
5. Conferir `label:sofia` (https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aopen+label%3Asofia) e as do privado; empresa (Team, lançamento, Pix): no privado.
6. A #442: medir o CI ~23/10. O aviso automático de conversa comprida ainda não foi visto (#471).

### 17/10/2026, madrugada (3): o modelo único de tarefa e a sessão mãe

**Estado do código**: igual ao marco anterior (loja na `v0.9.51`, banco na `0064`, mudanças pequenas na `main` esperando ela decidir publicar). **A leva 0 do painel terminou**: a #468 (sala ao vivo) entrou pelo PR #533.

#### O modelo único de tarefa (PR #534, mesclado em 17/10)
- **Toda tarefa segue `docs/tarefas.md`**: cabeçalho fixo (`Chefe:`, `Ajudantes:`, `Estimativa:`, `Depende de:`, `Sessões filhas:`), etapas com a **categoria** do modelo (forte, médio, rápido), "Pronto quando" no PR e depois de publicar. Decisão que falta vira issue `sofia` no `Depende de`.
- **Sessão mãe, híbrido** (skill `ritual-de-tarefa`): ajudantes dentro da sessão por padrão; sessão filha só se a issue pedir. **Provado em 17/10**: filha no Haiku respondeu à mãe; filha no Fable falhou em segundos por crédito, e a mãe viu o motivo.
- **Modelos**: uma tabela só, com reserva; **o Fable fica fora** até todo mundo ter crédito. Sessão que falhar: `/model claude-opus-5-5` e "Tentar novamente", sem mexer na issue.
- **Reescrever só ao entrar numa leva** (skill `nova-tarefa`, ela aprova o rascunho). O **resumo de segunda** (fixado no Opus) agora lista as tarefas fora do modelo.

#### O que depende dela
1. ~~Montar a leva 1~~ (feito em 17/10: #536, #538, #539, #510, #511, #455; `docs/painel.md`, "Andamento"). Próximo: a equipe pega as tarefas depois do Team; "fases da leva" e "relatório" pedem conversa de desenho pra leva 2.
2. **No Team (19/10)**: conferir que a equipe tem os três modelos da tabela e consegue abrir sessões filhas (comentário na #474).
3. Aprovar ou ajustar a sugestão do relatório da #355 pra skill `chefe-backend`; provar o "Copiar texto" do painel no celular.
4. **Publicar a próxima versão** no canal de teste e testar no instalado: só com ela pedindo.
5. Conferir `label:sofia` (https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aopen+label%3Asofia) e as do privado; empresa (Team, lançamento, Pix): no privado.
6. A #442: medir o CI ~23/10. O aviso automático de conversa comprida ainda não foi visto (#471).

### 17/10/2026, de madrugada (2): o tempo real no ar e o 1º chefe de verdade

**Estado do código**: a `main` tem mudanças pequenas **ainda não publicadas na loja** (a loja segue na `v0.9.51`, banco na `0064`, sem migration): criar operador no instalado (#482), barra de rolagem (#437), listas acima de 1.000 linhas e o painel. Entram na próxima versão, **quando ela decidir publicar**. O **painel** (Cloudflare) já publicou sozinho a #355. Do mutirão de 16/10 o detalhe está em `docs/historico.md`.

#### O tempo real do painel (#355, feita e testada ao vivo, 17/10)
- **Feita pelo `chefe-backend`** (PR #531, mesclado). O GitHub avisa o worker (webhook com assinatura conferida), uma sala (Durable Object) repassa a todos os painéis abertos, e a página busca de novo sozinha; ponto "ao vivo" na barra lateral. Como funciona, em 5 linhas: `docs/painel.md`.
- **Webhook ligado por ela** (17/10, no PC, passo a passo): app "Sakura Painel", segredo só no Bitwarden e na Cloudflare (`GITHUB_WEBHOOK_SECRET`). **Testado por ela com dois navegadores**: o painel mudou nos dois em 4 a 5 s, sem recarregar. Entregas do app verdes desde a publicação.
- **A próxima da leva 0 é a #468 (sala ao vivo, 6 h)**, já destravada. Sem etiqueta de chefe; sugestão: `chefe-frontend` liderando, chamando o backend pra parte de dados. O `useTempoReal()` já devolve `estado` e `ultimaAtualizacao` pra ela usar.

#### Os chefes por função (decidido por ela, 17/10)
- **5 chefes**: `chefe-frontend`, `chefe-backend`, `chefe-seguranca`, `chefe-marketing`, `chefe-tester` (`.claude/skills/`, #526). Tarefa com etiqueta `chefe:<função>` (as 5 já existem no GitHub). Tarefa que mistura funções: um chefe lidera e chama os outros dentro da própria sessão (a cota é de quem clicou). Candidatos a chefe depois: Fiscal e Qualidade.
- **Botão "Começar com o Claude"** (#527) abriu a sessão da #355 com a tarefa e o repositório certos. **Funciona no navegador do celular; o app do Claude ignora o texto.** O plano B **"Copiar texto"** (#529) entrou na `main`, mas **ainda não foi provado no celular**.
- **Relatórios dos chefes** (#528): cada chefe grava `docs/relatorios/AAAA-MM-DD-tarefa-N-<chefe>.md` no PR, com "Como eu agi"; a skill `revisor-de-chefes` propõe melhorias nas skills **só em PR aberto, que ela aprova** (revisão do mês, R1). **O 1º relatório de verdade é o da #355** (`docs/relatorios/2026-10-17-tarefa-355-backend.md`); ele **propõe** acrescentar na `chefe-backend` um item sobre Worker/webhook ("rodar no `wrangler dev` e provar com chamada real") e um aviso contra `pkill -f` com texto do próprio comando. **Falta ela aprovar** (não vale sozinha). Repositório público: relatório nunca leva preço, sócios, dado pessoal ou da empresa.
- **Resumo de segunda de manhã** (A2 da #472): toda segunda às **9h29** (Brasília), com aviso no celular; só lê. 1º disparo: 19/10.
- Tarefas da **empresa** viraram issues `sofia` no repositório **privado** (#99 a #108).

#### O que depende dela
1. **Decidir o chefe da #468** (sugestão: `chefe-frontend`) e **abrir a sessão dela** (próxima da leva 0). Provar o "Copiar texto" no celular, e aprovar ou ajustar a sugestão pra skill `chefe-backend` (acima).
2. **Publicar a próxima versão** no canal de teste e **testar no instalado** (operador, lista grande, barra de rolagem): só com ela pedindo.
3. **Conferir** `label:sofia` (público: https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aopen+label%3Asofia) e as do privado.
4. O `/fechar` rodou de verdade em 17/10 e funcionou; **o aviso automático de conversa comprida ainda não foi visto** (#471). A #442 reaberta: falta medir o CI uma semana depois (~23/10) e anotar no privado.
5. **Empresa**: Claude Team na segunda 19/10, desmembrar o lançamento em novembro, o Pix de 16/11: tudo no privado.
6. **A Bibi** não mudou; o andamento dela mora só no repositório dela.

### 17/10/2026, madrugada: os chefes por função, o botão no painel e os relatórios

**Estado do código**: a `main` tem mudanças pequenas **ainda não publicadas** (a loja segue na `v0.9.51`, banco na `0064`, sem migration): criar operador no instalado (#482), barra de rolagem (#437), listas acima de 1.000 linhas, e o painel (botão "Começar com o Claude"). Entram na próxima versão, **quando ela decidir publicar**. Do mutirão de 16/10 (7 PRs, CI novo da #442 em uso) o detalhe está em `docs/historico.md`.

#### Os chefes por função (decidido por ela, 17/10; continuação da conversa sobre os agentes do Escritório)
- **5 chefes**: `chefe-frontend`, `chefe-backend`, `chefe-seguranca`, `chefe-marketing`, `chefe-tester` (`.claude/skills/`, #526, aprovadas por ela). Sala do Escritório = o projeto; chefe = a função. Tarefa com etiqueta `chefe:<função>` (as 5 etiquetas já existem no GitHub; criadas por ela, 17/10). Tarefa que mistura funções: um chefe lidera e chama os outros dentro da própria sessão (a cota é de quem clicou). Candidatos a chefe depois: Fiscal e Qualidade.
- **Botão "Começar com o Claude"** no cartão da tarefa (#527): abre `claude.ai/code` com o texto e o repositório já preenchidos; quem aperta Enter é a pessoa. **Limite confirmado por ela (17/10)**: **funciona no navegador do celular; o app do Claude ignora o texto.** Plano B em andamento no PR **#529** ("Copiar texto" + dica só no celular).
- **Relatórios dos chefes** (#528): cada chefe grava `docs/relatorios/AAAA-MM-DD-tarefa-N-<chefe>.md` no PR, com a parte "Como eu agi"; a skill `revisor-de-chefes` lê a pasta e propõe melhorias nas skills **só em PR aberto, que ela aprova**; entra na revisão do mês (R1). Repositório público: relatório nunca leva preço, sócios, dado pessoal ou da empresa. **Nada disto foi rodado numa tarefa de verdade ainda**: o 1º uso é o teste.
- **Resumo de segunda de manhã** (A2 da #472): **criado**, toda segunda às **9h29** (Brasília), com aviso no celular; só lê. 1º disparo: 19/10. Na sessão nova ele pede de novo o acesso de leitura ao privado; se recusado, resume só o público.
- Tarefas da **empresa** viraram issues `sofia` no repositório **privado** (#99 a #108).

#### O que depende dela
1. **Aprovar ou ajustar o PR #529** (se ainda aberto) e **testar o botão** no painel pelo navegador do celular, numa tarefa com etiqueta `chefe:...`. O 1º chefe de verdade grava o 1º relatório.
2. **As duas tarefas que existem hoje na leva-0 não dão pra começar ainda**: a **#355 (tempo real, 6 h)** depende de ela ligar o webhook do app "Sakura Painel" e cadastrar o `GITHUB_WEBHOOK_SECRET` na Cloudflare (`docs/painel.md`, "O que a Sofia faz"; guiar pelo celular, um passo por vez); a **#468 (sala ao vivo)** depende da #355. Sugestão: a #355 é a primeira tarefa pra testar os chefes (`chefe:backend`).
3. **Publicar a próxima versão** no canal de teste e **testar no instalado** (operador, lista grande, barra de rolagem): só com ela pedindo.
4. **Conferir** `label:sofia` (público: https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aopen+label%3Asofia) e as do privado.
5. **Rodar o `/fechar`** numa sessão comprida e ver se o aviso aparece (#471). A #442 reaberta: falta medir o CI uma semana depois (~23/10) e anotar no privado.
6. **Empresa**: Claude Team na segunda 19/10, desmembrar o lançamento em novembro, o Pix de 16/11: tudo no privado.
7. **A Bibi** não mudou; o andamento dela mora só no repositório dela.

### 16/10/2026, noite: o mutirão das pendências (sem a Sofia)

**Estado do código**: a `main` tem 4 mudanças pequenas **ainda não publicadas** (a loja segue na `v0.9.51`, banco na `0064`, sem migration): criar operador no instalado (#482), barra de rolagem (#437), listas que passam de 1.000 linhas (paginação) e o painel ("Sair" e nome do agente). Entram na próxima versão, **quando ela decidir publicar**.

#### O que foi feito (a chefe abriu 5 sessões filhas; cada uma abriu PR, a chefe validou e mesclou)
- **#495** (fecha #482): `criarOperador` usa a conexão salva (`conexaoAtual()`), não o endereço de mentira. Teste visto reprovar. **Não testado no instalado.**
- **#522** (fecha #437): a barra de rolagem acompanha o conteúdo. Reproduzido num Chromium, 61 telas idênticas.
- **#509**: `buscarTudoEmPaginas()` (`src/lib/paginacao.ts`) e 13 listas (clientes, ordens, peças, caixa, estoque, contas, pedidos, notas...) agora vêm em páginas de 1.000, com `id` de desempate. Visto reprovar com 2.500 linhas. Ficou de fora a #498.
- **#512**: painel, o "Sair" não desce de linha e o nome do agente aparece no mapa.
- **#496** (fecha #471): a skill `/fechar` e o aviso de conversa comprida (gatilho `UserPromptSubmit`, `scripts/aviso-conversa-comprida.mjs`). A chefe trocou a janela de 200 mil pra **1 milhão de tokens** (a das sessões na nuvem); com 200 mil o aviso saía com ~7%. **Não provado dentro do app** que o gatilho dispara.
- **#521** (parte pública da #472): etiqueta **`sofia`** e 20 tarefas com ela (a lista "O que depende dela" virou a busca `label:sofia`). Os assuntos da empresa ficaram **só pelo nome** ("no privado").
- **#523** (fecha #442, itens 1 a 3): `timeout-minutes` em todo job, uma rodada por commit e PR só de documentação sem telas/Electron/RLS (job `mudancas` + `if:`, sem `paths-ignore`). **Limite da prova**: a regra `main protegida` não foi exercitada de verdade; o primeiro PR só de `.md` depois dele confirma.

#### O que depende dela (um passo por vez, guiar pelo celular)
1. **Publicar a próxima versão** no canal de teste quando quiser, e **testar no instalado**: criar um operador (#482), uma lista grande, a barra de rolagem. Publicar e liberar só com ela pedindo.
2. **Conferir a busca `label:sofia`** (https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aopen+label%3Asofia): o que falta da lista antiga; **criar no privado as issues da empresa**; escolher o **horário do resumo de segunda** (A2 da #472, ainda não criado).
3. **Rodar o `/fechar`** numa sessão e ver se o aviso de conversa comprida aparece (#471). Se não aparecer, vira lição em `docs/licoes.md`.
4. **#442**: o item 4 (medir de novo uma semana depois, ~23/10, e anotar no privado) fica pra ela; e conferir que o primeiro PR só de `.md` fica mesclável.
5. **A Bibi**: não mudou hoje; o andamento dela mora só no repositório dela (a memória da Bibi não vem pra cá).
6. **Empresa**: o que saiu da conversa com o contador está no repositório privado.

#### Continua valendo do marco anterior
A conversa sobre os agentes do Escritório (alinhamento, não construção); o Claude Team na segunda, 19/10, e a TFE (no privado); a tarefa 7 do painel (#355, depende do webhook e do `GITHUB_WEBHOOK_SECRET` dela); a equipe começando na segunda; a fila #472 (A2).

### 16/10/2026, mais tarde à noite (2): o painel com as tarefas de verdade (#354)

**Estado do código**: o programa das lojas não mudou (`v0.9.51`, banco na `0064`). O painel
(**https://sakura-painel.caranovavidanova.workers.dev**) agora mostra **as issues de verdade** da `leva-0`:
estado, dono com foto, horas e o contador. PR **#492** (fecha a **#354**), mesclado por ela. **Testado por ela no
endereço público**: 6 feitas e 2 livres, 29 h de 41 h, as fotos do GitHub.

#### O que foi feito
- **O worker** ganhou `/api/levas` e `/api/leva/<n>` (`painel/worker/tarefas.ts`), com uma consulta GraphQL cada,
  pelo token da sessão. As regras (estado, estimativa, leva atual) ficaram em `painel/src/logica/estado.ts`. A
  página pede as rotas uma depois da outra, sempre depois do `/api/eu` (`painel/src/logica/dados.ts`). Leva atual
  em `/`, as outras em `/leva/<n>`. 143 testes, os novos vistos falhar. A revisão do zero achou 4 pontos reais,
  consertados antes de mesclar; os que ficaram como estão estão explicados no PR #492.
- **Lição**: a sessão na nuvem **não consegue** fazer pergunta ao GitHub com o login dela (e a trava recusou usar o
  token da sessão pra isso). Por isso as consultas foram **conferidas contra o esquema público do GitHub**
  (`octokit/graphql-schema`, com o `graphql` do npm) antes de mesclar, e a prova final foi ela no endereço público.
  Funcionou de primeira.

#### Por onde a próxima sessão começa
0. **A conversa sobre os agentes do Escritório** (ela pediu pra próxima sessão, 16/10): a ideia dela é ter **vários
   agentes bem específicos**, cada um com as suas skills, **liderados por um chefe de cada área** do escritório
   virtual; ela **fala só com os chefes**, não com os "funcionários"; e os agentes **evoluem as skills sozinhos**.
   É **conversa de alinhamento, não construção**: trazer opções e recomendação, e ela revisa antes de virar decisão
   (seção 1). Pontos de partida: as opções A, B e C de "de onde vêm os agentes" e a conferência das regras de uso das
   assinaturas (`docs/painel.md`, "Escritório de agentes"; `docs/referencia/escritorio-de-agentes.md`), e o filtro
   "isso tira trabalho de verdade?" pra skill nova (`docs/jeito-de-trabalhar.md`).
1. **Assuntos da empresa, com ela em casa** (no privado; adicionar o `caranovavidanova/sakura-corp`, que ela
   autorizou com escrita em 16/10): a TFE (como pagar), a pergunta ao contador sobre o dinheiro do empréstimo que
   entrou, e o **Claude Team, que ela assina na segunda, 19/10**.
2. **Painel, tarefa 7 (#355, tempo real)**: **depende dela** ligar o webhook no app "Sakura Painel" e cadastrar o
   `GITHUB_WEBHOOK_SECRET` na Cloudflare (`docs/painel.md`, "O que a Sofia faz"). Guiar pelo celular, um passo por vez.
3. **Pequeno, quando ela quiser**: o teste "pegar uma tarefa e recarregar" (se ela não fez); o "Sair" que desce de
   linha com nome comprido; o nome do agente no mapa do Escritório; e, se ela quiser, issue fechada como "não
   planejada" deixar de contar como feita (hoje conta, pela regra da #354).
4. **Ainda vale** do marco de 16/10 de manhã (`docs/historico.md`): a equipe começa na segunda (Termos, convites,
   Supabase de teste guiado, revisão do manual e dos rascunhos), a #482 e a fila #471 → #472.

### 16/10/2026, mais tarde à noite: o login do painel no ar e testado (#353)

**Estado do código**: o programa das lojas não mudou (`v0.9.51`, banco na `0064`). O painel
(**https://sakura-painel.caranovavidanova.workers.dev**) agora **pede login pelo GitHub** e só deixa entrar quem
é da `sakura-corp`: PR **#490** (fecha a **#353**), mesclado por ela. **Testado por ela no endereço público**:
entrou com a conta dela (foto, nome e "Sair" na barra lateral), saiu e entrou de novo direto.

#### O que foi feito
- **A parte dela, guiada passo a passo**: o GitHub App **"Sakura Painel"** na `sakura-corp` (Client ID no
  `wrangler.jsonc`, não é segredo), instalado só no `sakura-system-ace`; os segredos `GITHUB_APP_CLIENT_SECRET` e
  `CHAVE_DA_SESSAO` na Cloudflare (só Production) e no Bitwarden dela. **O app de teste não foi criado**: ela testa
  sozinha por enquanto, e não mandou nada pro Gustavo. Detalhe em `docs/painel.md`, "Andamento".
- **O código**: `painel/worker/sessao.ts` (cookie cifrado AES-GCM, 30 dias), `github.ts` e as rotas `/api/login`,
  `/api/login/volta`, `/api/eu`, `/api/sair`; a tela de entrada e o "Sair". 95 testes, os novos vistos falhar.
  A revisão do zero achou 6 pontos reais, todos consertados antes de mesclar.
- **Lições** (as duas do GitHub e da Cloudflare de hoje, pra próxima configuração): o GitHub mudou as telas do
  app (o "Callback URL" virou **"Redirect URI"**; as senhas ficam em **"Credentials"**, com "Client secrets" e
  "Key pairs"); e o **Bitwarden ofereceu "Atualizar credencial existente"** nas senhas do R2 ao colar um segredo
  na Cloudflare: avisar ela pra fechar no X, sempre que colar senha num site.

#### Por onde a próxima sessão começa
1. **Assuntos da empresa, com ela em casa** (no privado; adicionar o `caranovavidanova/sakura-corp`, que ela
   autorizou com escrita em 16/10): a TFE (como pagar), a pergunta ao contador sobre o dinheiro do empréstimo que
   entrou, e o **Claude Team, que ela assina na segunda, 19/10**.
2. **Painel, tarefa 6 (#354, as tarefas de verdade do GitHub)**: não depende de nada dela. Toda rota nova passa
   por `sessaoAtual()` (ver o "Andamento" de 16/10 no `docs/painel.md`).
3. **Pequeno, quando ela quiser**: na barra lateral, o "Sair" desce pra linha de baixo quando o nome é comprido
   (o dela); e o nome do agente no mapa do Escritório.
4. **Ainda vale** do marco de 16/10 de manhã (`docs/historico.md`): a equipe começa na segunda (Termos, convites,
   Supabase de teste guiado, revisão do manual e dos rascunhos), a #482 e a fila #471 → #472.

### 16/10/2026, à noite: o painel no ar (#352)

**Estado do código**: o programa das lojas não mudou (`v0.9.51`, banco na `0064`). O **painel está no ar** em
**https://sakura-painel.caranovavidanova.workers.dev**: PR **#488** (fecha a **#352**), mesclado por ela pelo celular.
A Cloudflare publica sozinha a cada mudança em `painel/` na `main`.

#### O que foi feito
- **#352**: `painel/wrangler.jsonc` (`sakura-painel`, `workers_dev: true`, `preview_urls: false`, `binding: "ASSETS"`,
  `not_found_handling: "single-page-application"`, `run_worker_first: ["/api/*"]`) e `painel/worker/index.ts`
  (`/api/saude` → `{"ok":true}`). Script `npm run dev:worker`; sem script de publicar.
- **Provado**: testes do worker vistos falhar de propósito; as 6 rotas no `wrangler dev`; o `wrangler deploy --dry-run`
  pegou que faltava o `binding` (consertado); CI verde (12 verificações). **No ar, conferido por ela no celular**:
  `/api/saude`, `/sala`, `/sala?tv`, `/escritorio`.
- **As 3 perguntas do Escritório, respondidas**: salas **em roda**; **nome do agente no mapa** (ainda não feito:
  entra quando ela pedir a próxima mexida no Escritório); **as 6 cores ficam**. Em `docs/painel.md`.
- **Lição**: a trava de segredos do `git push` compara com a `origin/main` local. Se a sessão começou sem ela (HEAD
  solto), a trava acusa arquivos antigos que já estão na `main`; um `git fetch origin main` resolve.

#### Por onde a próxima sessão começa
1. **Assuntos da empresa, com ela em casa** (no privado; adicionar o `caranovavidanova/sakura-corp`, que ela autorizou
   com escrita em 16/10): a TFE (como pagar; talvez uma mensagem curta), a pergunta ao contador sobre como registrar o
   dinheiro do empréstimo que entrou, e o **Claude Team, que ela assina na segunda, 19/10**.
2. **Painel, tarefa 5 (#353, login)**: antes, ela cria os dois GitHub Apps na `sakura-corp` (`docs/painel.md`, "O que
   a Sofia faz"), guiada passo a passo.
3. **Ainda vale** do marco de 16/10 de manhã (`docs/historico.md`): a equipe começa na segunda (Termos, convites,
   Supabase de teste guiado, revisão do manual e dos rascunhos), a #482 e a fila #471 → #472.

### 16/10/2026, à tarde: a base do painel na `main` (leva, Escritório de exemplo, Sala)

**Estado do código**: o programa das lojas não mudou (`v0.9.51`, banco na `0064`). No **painel** entraram
3 PRs, mesclados por ela pelo celular: **#484** (tela da leva, **fecha a #351**), **#485** (Escritório de
agentes, só exemplo) e **#486** (a Sala, **fecha a #467**). A Cloudflare publica o painel sozinha a cada
mudança em `painel/` na `main`.

#### O que foi feito
- **#351**: a tela olhada renderizada (claro, escuro, 375 px, tela grande) e consertada; teste das horas
  reforçado (não pegava uma conta quebrada). Fotos em `docs/referencia/fotos-painel/`.
- **Escritório de agentes** (`/escritorio`): a ideia da "fábrica virtual" como **tela de exemplo**, sem
  agente, sessão, token nem chave de verdade. As opções pra ligar de verdade (A ler o GitHub, B sessões do
  Claude Code, C serviço próprio; **recomendação A**, sem decidir) e o aviso de **conferir as regras das
  assinaturas antes de automatizar** estão no `docs/painel.md`, seção "Escritório de agentes". As
  referências novas dela (3D, prédio com andares, "descanso") estão descritas, sem imagem, em
  `docs/referencia/escritorio-de-agentes.md`.
- **#467, a Sala** (`/sala` e `/sala?tv`): visual B, cartão, lista, modo TV. Regras de tempo e de link
  comuns em `painel/src/logica/tempo.ts` e `link.ts`.
- **Provado**: 50 testes do painel, cada regra vista falhar de propósito; fotos Playwright; CI verde nos 3.
  **Não provado**: nada aberto num PC ou celular de verdade.
- **Memória consertada**: o PR #483 tinha cortado o fim da seção 3 e o título desta seção 4 (recuperados).
- **Lição de mesclar PRs empilhados** (16/10): ao mesclar o de baixo com "squash", o de cima fica com
  conflito; o Claude junta a `main` na branch (fica com o lado da branch, que já contém tudo) e ela mescla
  o próximo. Tocar em "Excluir branch" faz o GitHub apontar o próximo PR pra `main` sozinho.
- **Empresa** (detalhe só no privado, `EMPRESA.md`): a 1ª metade do empréstimo caiu na conta PJ em 16/10.

#### Por onde a próxima sessão começa
1. **#352, publicar o painel na Cloudflare** (`wrangler.jsonc` com `name: "sakura-painel"`, `workers_dev:
   true`, `preview_urls: false` e `assets.not_found_handling: "single-page-application"`, pra `/sala` e
   `/escritorio` abrirem direto). PR → guiar ela a mesclar **pelo celular, com links diretos**.
2. **Assuntos da empresa, com ela em casa** (no privado; adicionar o `caranovavidanova/sakura-corp`): a TFE
   (como pagar; talvez uma mensagem), a pergunta ao contador sobre como registrar o dinheiro que entrou, e o
   Claude Team, que ela assina **na segunda, 19/10**.
3. **3 perguntas sobre o desenho do Escritório**, ainda sem resposta: salas em roda ou em fileiras; nome do
   agente no mapa; as 6 cores das equipes.
4. **Ainda vale** do marco anterior (`docs/historico.md`, 16/10 de manhã): a equipe começa na segunda (Termos,
   convites, Supabase de teste guiado, revisão do manual e dos rascunhos), a #482 e a fila #471 → #472.

### 16/10/2026: a parte do Claude pra equipe começar na segunda (manual, tarefas, banco de teste)

**Estado do código**: a `main` continua na **`v0.9.51`** (banco na `0064`); nada do programa das lojas mudou
(só documentos, rascunhos e scripts do banco de teste). O **PR deste marco** juntou 3 trabalhos feitos em
paralelo e revisados do zero (a revisão achou 8 pontos; os reais foram consertados).

#### O que foi feito
- **A regra nova da seção 0** e o **manual da equipe** (`docs/equipe.md`, Windows e Mac): o Gustavo no painel; os
  outros dois no programa das lojas, **sempre contra o Supabase de teste**. Ficaram todas as proibições (nunca
  mescla, não publica nem libera, não mexe em banco de loja, versão, tag, secret, ruleset...). **Decisão**: ninguém
  da equipe roda SQL nem migration, **nem no de teste** (a Sofia monta e mantém).
- **Os 3 rascunhos de tarefa** em `docs/rascunhos/leva-0-programa.md`, prontos pra colar como issue: **#455**
  (clientes que sumiram, 6 h), **#459** (pedir avaliação no Google, 4 h) e a **1ª parte da #457** (importar
  clientes de CSV, 12 h em 2 PRs, que vira **issue nova ligada à #457**, sem editar a #457). **Nenhuma issue foi criada
  nem editada.**
- **O banco de teste da equipe**: `supabase/exemplo/` (**loja fictícia "Autocenter Exemplo (TESTE)"**: 8 clientes,
  9 veículos, 12 peças, **14 ordens** em todas as fases, caixa, contas), `ligar-login.sql`, `apagar-dados-de-exemplo.sql`,
  o teste `supabase/scripts/testar-dados-de-exemplo.sql` (entra no `npm run test:sql` e no CI) e o guia
  **`docs/supabase-de-teste.md`**. Tem **trava**: o exemplo se recusa a rodar em banco com cara de banco de loja.
- **Achado de passagem**: criar operador no programa instalado provavelmente não funciona (usa um endereço de mentira
  do Supabase): **#482**.
- **A revisão** conferiu cada ponto no código. Consertados: o exemplo não tinha cliente que "sumiu" (ganhou as OS 13 e
  14, de 200 e 330 dias atrás, pra a #455 poder ser conferida), 5 serviços do catálogo sem preço, linhas "de hoje" que
  ficavam no futuro se o script rodasse cedo (o teste agora reprova isso), a paginação (`listarClientes` não pagina e o
  Supabase corta em **1.000 linhas**: os rascunhos da #455 e da #457 agora exigem ler em páginas), e a contradição "o
  botão de importar é só de admin, mas os logins da equipe não são" (virou pergunta pra Sofia). Descartado, com motivo:
  a trava do exemplo também barra quem salvou token de homologação no banco de teste (a equipe não tem o módulo de
  Notas Fiscais; está no guia, na tabela de erros).
- **Provado**: `npm run test:sql` (os **12** testes, vistos reprovar quando o exemplo é quebrado de propósito), `typecheck`,
  `lint` e **844** testes do vitest.
- **NÃO provado**: nada foi rodado num Supabase de verdade (os cliques do guia vêm de `INSTALAR-LOJA-NOVA.md` e podem ter
  mudado); ninguém seguiu o manual num PC, **nem num Mac** (o programa abrir no Mac com `npm run dev` é suposição); o
  programa aberto contra o exemplo não foi olhado; as estimativas de horas dos rascunhos são palpite; os limites do plano
  grátis do Supabase (2 projetos, pausa depois de uns 7 dias) vêm de sites de terceiros.

#### O que depende dela
1. **Revisar** o `docs/equipe.md` (principalmente a mensagem nova do "Primeiro dia") e os **rascunhos** das tarefas;
   depois criar as issues (etiqueta `leva-0`; a da parte 1 da #457 como sub-issue da #457).
2. **Decidir**: os textos padrão das 2 mensagens de WhatsApp; "X meses" padrão = 6?; o link de avaliação dentro do texto
   (sem migration) serve?; a importação vai pras lojas sem "desfazer"?; **o banco de teste ganha um login administrador**
   (pra testar a importação)?; confirmar "nem SQL no Supabase de teste".
3. **Criar o Supabase de teste, guiada** (`docs/supabase-de-teste.md`): organização grátis "Sakura Teste", projeto
   `ssace-teste`, instalar, o exemplo, os 3 logins, os Sends. Conferir antes o plano grátis.
4. Decidir se o `ssace-teste` entra no botão "Atualizar o banco de todas as empresas" (mexe no cofre; recomendo não).

#### Por onde a próxima sessão começa
1. **Segunda 19/10, a equipe começa**: os Termos assinados (antes de qualquer acesso ao código), o Claude Team, os
   convites (só depois do Termo), a verificação em duas etapas na organização (**só depois do "sim" do Gustavo**) e o
   "Primeiro dia". Faltam o usuário do GitHub do Lázaro e do Tiago. Antes do Primeiro dia: o item 3 acima (o Supabase de
   teste) e a revisão do manual.
2. **A #482** (criar operador no instalado) e **a fila**: #471 → #472, uma sessão cada.
3. **Ainda vale**: a contabilidade (1ª nota ~17/10 a 01/11, XML × "OFX", o cabeçalho das planilhas pra #457), o capital e a
   TFE depois de 16/10, o Balcão na `v0.9.51`, o salto 2 do Electron, a #442 e o "Texto de garantia".

### 15/10/2026: a #470 pronta e provada, as caixas de e-mail da equipe e o visual da Sala

**Estado do código**: a `main` continua na **`v0.9.51`** (banco na `0064`); nada de programa das lojas mudou.
Os PRs **#477**, **#478** e **#479** foram mesclados. A **#470 está fechada**.

#### O que foi feito
- **#470, segredo barrado antes de sair do computador (fechada)**: *push protection* do GitHub (ligada por
  ela), **ganchos do git** em `.githooks/` (barram chave com formato e certificado; só avisam de "cara
  de senha") e o gatilho do Claude. O **1º teste numa sessão nova falhou** (o gatilho do Claude roda antes
  do comando inteiro e não via arquivo criado no mesmo comando do commit); o gancho do git fechou o furo
  e o **2º teste passou**. 15 testes, vistos reprovar. Detalhe e limites no item 50 de `docs/licoes.md`.
- **Equipe**: as 5 caixas do Zoho foram criadas (as 5 licenças em uso) e as senhas provisórias foram
  entregues em particular. Os nomes e as horas ficam no privado (`EQUIPE.md`).
- **A Sala da Sakura**: ela escolheu o **visual B** (o da Bibi) **só pra Sala**; o resto do painel
  continua claro e calmo. **#467 (agora 8 h), #468 e #355 foram atualizadas**, a #351 recebeu um
  comentário pro Gustavo, e o `docs/painel.md` ganhou a seção "Visual da Sala" (cores com contraste
  conferido). A referência é `docs/referencia/sala-duas-versoes.html`.
- **A Bibi não vira escritório da empresa**: continua pessoal, num repositório privado dela. O que
  se aprendeu com ela entrou nas tarefas da Sala; nada da memória da Bibi veio pra cá.

#### Por onde a próxima sessão começa
0. **O plano combinado em 16/10 (a equipe começar na segunda, 19/10)**: ela quer **assinar na
   segunda**. **No fim de semana**, numa sessão do SSACE: (a) a parte do Claude na etapa 4 da #474:
   os dados de exemplo e um login pra cada um no banco de teste, a regra nova da seção 0, o manual
   da equipe pro programa das lojas, e as tarefas #455, #459 e a 1ª parte da #457 no formato da
   equipe, **como rascunho pra ela revisar**; (b) com ela, guiada: criar o Supabase de teste
   (conferir antes se cabe no plano grátis). **Na segunda**: os Termos, o Claude Team e os convites,
   a verificação em duas etapas (depois do "sim" do Gustavo), os dois novos convidados (só depois do
   Termo) e o "Primeiro dia". Perguntar a ela se o texto do Termo já está pronto (fica no privado).
1. **A #474, etapa 1**: faltam o usuário do GitHub do Lázaro e do Tiago, e saber se o Gustavo usa duas
   etapas (antes de ligar a obrigatoriedade na organização). O Termo de cada um vem antes do convite.
2. **A partir de 16/10**: as contas (etapa 2 da #474): Claude Team e a verificação em duas etapas.
3. **Depois, a fila**: #471 → #472, uma sessão cada.
4. **Ainda vale** do marco anterior: a contabilidade (1ª nota ~17/10 a 01/11, XML × "OFX", o
   cabeçalho das planilhas pra #457), o capital e a TFE depois de 16/10, o Balcão na `v0.9.51`, o salto 2
   do Electron, a #442 e o "Texto de garantia".

### 14/10/2026, à noite (2): o plano até a equipe começar

**Estado do código**: nada mudou no código nesta sessão. Na última conferência (13/10), a `main`
estava na **`v0.9.51`**, liberada pra todas as lojas em 08/10, e o banco na **`0064`**. O marco
anterior (o jeito de trabalhar com o Claude) está no topo de `docs/historico.md`.

#### O que foi feito
- **O plano do que falta até a equipe começar**, aprovado por ela, virou a tarefa
  [#474](https://github.com/sakura-corp/sakura-system-ace/issues/474), em 5 etapas: já; contas;
  papéis assinados; o programa pronto pra equipe; começar. Resumo em `docs/pendencias-e-futuro.md`
  ("A equipe no programa das lojas").
- **As 5 decisões dela**:
  1. o Termo de Colaboração é assinado **antes** do acesso ao código (o Gustavo assina junto);
  2. é **o mesmo Termo pra todos**;
  3. primeiro, **uma tarefa de aquecimento pra cada um** (#455 e #459); depois, a 1ª parte da
     #457 (importar clientes de uma planilha qualquer);
  4. as tarefas do programa **entram na `leva-0`**, junto com as do painel (`docs/painel.md`);
  5. **verificação em duas etapas obrigatória** na organização do GitHub.
- No privado, as decisões foram anotadas no `EQUIPE.md` (e o "mesmo acordo pra todos" saiu do
  que falta decidir em `contratos/README.md`).

#### Por onde a próxima sessão começa
1. **A #474, etapa 1**: a mensagem pros três (o rascunho está na conversa de 14/10; se perdeu,
   refazer: nome do e-mail, usuário do GitHub, Windows ou Mac, horas por semana, e a #351 pro
   Gustavo), a cessão dela e a **#470**, que precisa estar pronta antes de os novos começarem.
2. **Depois de 16/10**: as contas (etapa 2 da #474).
3. **Depois, a fila**: #471 → #472, uma sessão cada.
4. **Ficou pra depois, por decisão dela**: arquivar as sessões antigas (A4) e arrumar o PC
   (`docs/jeito-de-trabalhar.md`, no fim). O **marketing** fica pra uma conversa própria.
5. **Ainda vale** do marco anterior:
   - **abertura**: agora é com a contabilidade (1ª nota ~17/10 a 01/11);
   - a contabilidade (XML × "OFX") e o cabeçalho das planilhas pra #457;
   - o capital, o Claude Team e a TFE depois de 16/10;
   - o Balcão na `v0.9.51`, o salto 2 do Electron, a #442 e o "Texto de garantia".

### 14/10/2026, à noite: o jeito de trabalhar com o Claude, e a sala da Sakura no painel

**Estado do código**: nada mudou no código nesta sessão. Na última conferência (13/10), a `main`
estava na **`v0.9.51`**, liberada pra todas as lojas em 08/10, e o banco na **`0064`**. O marco
anterior (13 e 14/10) está no topo de `docs/historico.md`.

#### O que foi feito
- **Uma conversa sobre como trabalhar com o Claude**: onde trabalhar, sessões, skills, agentes,
  trancas, o que mostrar na tela. Tudo aprovado por ela e anotado em
  **`docs/jeito-de-trabalhar.md`**: as gavetas e a fila.
- **A fila virou tarefa**: [#470](https://github.com/sakura-corp/sakura-system-ace/issues/470)
  (T1, segredo barrado antes de sair do computador) →
  [#471](https://github.com/sakura-corp/sakura-system-ace/issues/471) (o `/fechar` e o aviso de
  conversa comprida) → [#472](https://github.com/sakura-corp/sakura-system-ace/issues/472) (o
  que depende dela vira tarefa, e o resumo da segunda). O resto vira tarefa quando chegar a vez.
- **A sala da Sakura entrou na leva 0 do painel**: #467 (a 3ª tarefa, com dados de exemplo) e
  #468 (a última, ao vivo). As antigas foram renumeradas pra "x/8" (PR #469, `docs/painel.md`).
- A seção 1 do índice foi corrigida (ela usa o app no desktop e o celular de controle; plano Pro)
  e ganhou duas preferências: uma sessão por assunto, e "o que se repete vira proposta de skill".

#### Por onde a próxima sessão começa
1. **O próximo assunto, pedido por ela**: **o que precisa estar pronto até a equipe começar**,
   do e-mail de cada um (inclusive o dela) até eles programarem, e **como vai ser a organização
   na prática** (por quais tarefas começar). Já se sabe que entram nessa conta:
   - o Claude Team, as caixas no Zoho e os nomes dos e-mails;
   - os acordos assinados (na ordem do privado, `contratos/README.md`);
   - o Supabase de teste e a regra da seção 0 ("só o painel");
   - o **T1** e o **T2** de `docs/jeito-de-trabalhar.md`;
   - as tarefas da onda 1 escritas no formato da equipe.

   Ler o `EQUIPE.md` do privado antes.
2. **Depois, a fila**: #470 → #471 → #472, uma sessão cada.
3. **Ficou pra depois, por decisão dela**: arquivar as sessões antigas (A4) e arrumar o PC
   (`docs/jeito-de-trabalhar.md`, no fim). O **marketing** fica pra uma conversa própria.
4. **Ainda vale** do marco anterior:
   - **abertura**: agora é com a contabilidade (1ª nota ~17/10 a 01/11);
   - **assinaturas**: começam pela cessão dela;
   - perguntar ao Gustavo como está a #351;
   - a contabilidade (XML × "OFX") e o cabeçalho das planilhas pra #457;
   - o capital, o Claude Team e a TFE depois de 16/10;
   - o Balcão na `v0.9.51`, o salto 2 do Electron, a #442 e o "Texto de garantia".

### 13 e 14/10/2026: assuntos da empresa com a equipe, e a equipe no programa das lojas

**Estado do código**: nada mudou no código. `main` na **`v0.9.51`**, liberada pra todas as lojas
em 08/10; banco na **`0064`**. O marco anterior (12 e 13/10) está no topo de `docs/historico.md`.

#### O que foi feito
- **Assuntos da empresa com a equipe**, decididos e revisados pelo advogado em 14/10: ficam **no
  privado** (`EMPRESA.md` e `contratos/README.md` do `caranovavidanova/sakura-corp`).
- **A equipe vai mexer também no programa das lojas** (decidido em 13/10): uma pessoa no painel e
  duas no programa, com tarefas da onda 1 de `docs/visao.md`, primeiro as que deixam a entrada de
  loja nova mais rápida (ex.: a #457). Detalhe no privado, `EQUIPE.md`.
- **O painel estava parado em 13/10**: a tarefa 2 (#351) com o Gustavo desde 01/10, sem PR.

#### Por onde a próxima sessão começa
1. **Abertura da empresa: a parte dela terminou em 14/10** (detalhe no privado, `EMPRESA.md`).
   Agora é com a contabilidade; a 1ª nota pra Pneus Amigão deve sair entre ~17/10 e 01/11.
   **Assinaturas, na ordem do privado** (`contratos/README.md`): começa pela cessão dela.
2. **Antes de abrir o programa das lojas pra equipe**: criar um **Supabase de teste** e mudar a
   regra da seção 0 ("só o painel"), que é dela.
3. **Antes do Claude Team** (logo depois de 16/10): o nome de cada um no e-mail
   `@sakuracorp.com.br` e as caixas no Zoho.
4. Perguntar ao Gustavo como está a #351.
5. **Ainda vale** do marco anterior: a contabilidade (XML × "OFX"); o cabeçalho das planilhas pra
   #457; o capital e o Claude Team depois de 16/10; o
   Balcão na `v0.9.51`; o salto 2 do Electron; a #442; o "Texto de garantia"; a TFE.

### 12 e 13/10/2026: a visão de futuro, a prioridade das tarefas e os contratos

**Estado do código**: nada mudou no código. `main` na **`v0.9.51`**, liberada pra todas as lojas
em 08/10; banco na **`0064`**. O marco anterior (08/10) está no topo de `docs/historico.md`.

#### O que foi feito
- **A visão dela, documentada e aprovada** (`docs/visao.md`), a partir do artigo "Services: The
  New Software" (Sequoia): um programa só pra loja inteira, o máximo automático, integração com o
  WhatsApp e, mais pra frente, um assistente de IA. Os princípios que ela confirmou: **a IA
  sugere, a pessoa confirma**, com a dinâmica do assistente muito bem planejada antes de qualquer
  código; e **muitas funções, cada uma simples** (automatizar é tirar trabalho). O WhatsApp que
  manda sozinho (número e custo) ela adiou.
- **A prioridade em ondas, sem custo primeiro**, aprovada por ela. **6 tarefas novas** (#454
  Central do dia, #455 Clientes que sumiram, #456 Pix copia e cola, #457 Importar do sistema
  antigo, #458 Desenho do assistente, #459 Pedir avaliação no Google) e **42 tarefas** com a
  linha de prioridade (a #385 também com o andamento do Electron).
- **As lojas da fase 2 usam outro sistema**, que exporta planilhas: a importação (#457) subiu
  pra onda 1 e precisa ser compatível com tudo.
- **A contabilidade da Pneus Amigão respondeu (13/10)** as três perguntas (seção 8, "Perguntas
  pra fora"):
  - a NFC-e com CSOSN 500 está certa;
  - o Ambiente Nacional já recebe as notas da loja, e eles avisam se mudar até 1º/11;
  - pro pacote do mês, eles querem as notas até o dia 7 e o **extrato do banco** até o dia 10. A
    #383 encolheu pra isso.
- **Os contratos** (no privado, `contratos/README.md`): o das lojas (com a parte da LGPD do
  `ANTES-DA-PRIMEIRA-VENDA.md`), o da equipe e a cessão do código dela pra empresa. Escritos e
  **revisados pelo advogado** no mesmo dia.

#### Por onde a próxima sessão começa
1. **Contabilidade**: confirmar que as notas vão em XML (a mensagem diz "OFX"); e, até 1º/11, o
   manual deles se o Ambiente Nacional mudar alguma coisa.
2. **Pra #457**: o nome do sistema que as lojas usam e a primeira linha (o cabeçalho) de cada
   planilha exportada, **sem dado de cliente**.
3. **Abertura** (no privado): a **conta PJ abriu em 13/10** (falta ver o cartão e transferir o
   capital depois de 16/10); a entrevista do certificado em **14/10, 14h**; depois, a procuração
   no e-CAC. Pedir pra adicionar o `caranovavidanova/sakura-corp` com as palavras certas (seção 1).
4. **Contratos** (no privado, `contratos/README.md`, "O que ainda falta"):
   - assinar a **cessão dela** primeiro, pela empresa com o certificado e-CNPJ, que sai depois de
     14/10;
   - o WhatsApp e o horário do suporte;
   - o **acordo de vesting ou memorando com os amigos**, que o advogado pediu pra não demorar.
5. **Quando ela quiser construir**: a onda 1 de `docs/visao.md`.
6. **Ainda vale**:
   - o Balcão pegar a `v0.9.51` (conferir no Diagnóstico);
   - o salto 2 do Electron (40);
   - a #442;
   - o "Texto de garantia" da loja;
   - o PR da tarefa 2 do Gustavo (#351);
   - a partir de **16/10**: o Claude Team, a TFE e o capital.

### 08/10/2026: a `v0.9.51` saiu e foi liberada, e as versões têm endereço próprio

**Estado do código**: `main` na **`v0.9.51`**, publicada em 08/10 nos dois endereços
(`ssace-versoes` e a cópia no `sakura-system-ace`) e **liberada pra todas as lojas no mesmo dia**
(o canal normal saiu da `0.9.47` direto pra ela). **O PC dela já está nela** (conferido no
Diagnóstico); o Balcão pega quando abrirem o programa na loja. Banco na **`0064`**. O marco
anterior (06/10) está no topo de `docs/historico.md`.

#### O que foi feito
- **Teste da `v0.9.50` na loja: aprovado** (08/10): versão certa, uso normal, notas certas e
  impressão (o recibo de comissão pela "Microsoft Print to PDF"). A garantia não deu pra testar:
  **a loja não tem o "Texto de garantia" configurado** (Configurações), e sem ele o programa não
  imprime.
- **Fechar o código: escolhida a B sem pagar.** Ela criou o **`sakura-corp/ssace-versoes`**
  (público, base role Read, só ela escreve) e a chave **`TOKEN_VERSOES`** (granulação fina, só
  esse repositório, só Contents, **vence em 09/10/2027**; no Bitwarden e no cofre `lojas`).
- **A `v0.9.51` (PR #447)** levou:
  - **as versões no endereço novo**: o Release prova que a chave escreve, publica no
    `ssace-versoes` (um commit `VERSAO.txt` por versão) e copia pro antigo; o Liberar libera nos
    dois; o programa procura no novo;
  - **a rodinha (#436)**.
  
  Passou por uma revisão de código do zero, que achou e corrigiu problemas reais: rodar o Release
  de novo mexia no endereço bom, o canal de teste podia ver as versões fora de ordem, e o Liberar
  não conseguia segurar os computadores antigos. Detalhe em `docs/operacao.md`, "Onde as versões
  moram". A chave funcionou de primeira.
- **Liberada pra todas as lojas** (08/10, a pedido dela), levando junto a 0.9.48, a 0.9.49 e a
  0.9.50. Conferido: a `0.9.51` é a versão das lojas nos dois endereços, e o
  `releases/latest/download` do `ssace-versoes` entrega ela. **O link de baixar o instalador**
  (site e `INSTALAR-LOJA-NOVA.md`) passou pro endereço novo.
- **Faxina das branches**: um botão de uso único que ela apertou (PR #449) tirou 132 das 136, e
  ela apagou as últimas à mão; **só sobrou a `main`**. O botão já saiu do código, e ficou ligado o
  "Automatically delete head branches": a branch some sozinha quando o PR entra.
- **#442 (enxugar o CI)**: ela deixou pendente.
- **Abertura** (no privado): a CIN com o nome social saiu em 09/10 e já foi mandada ao banco; a
  entrevista do certificado em 14/10, 14h; a senha de emissão salva.

#### Por onde a próxima sessão começa
1. **O Balcão pegar a `v0.9.51`** ao abrirem o programa na loja (conferir no Diagnóstico). No PC
   dela, a rodinha foi testada e está certa (08/10).
2. **Avisos da abertura**, quando ela mandar:
   - a resposta do banco sobre a conta PJ (a CIN foi mandada em 09/10);
   - a entrevista de 14/10: depois, a senha de emissão no painel;
   - a procuração no e-CAC.
   
   Pra isso, pedir pra adicionar o `caranovavidanova/sakura-corp` com as palavras certas
   (seção 1).
3. **Ainda vale**:
   - o salto 2 do Electron (40), agora que a 0.9.51 provou o atualizador da 36;
   - a #442, quando ela quiser;
   - o "Texto de garantia" da loja, quando ela e o pai decidirem;
   - o PR da tarefa 2 do Gustavo (#351), quando vier;
   - a partir de **16/10**: o Claude Team, a TFE e o capital;
   - **antes de 1º/11**: perguntar à contabilidade da Pneus Amigão sobre o Ambiente Nacional da
     NFS-e.

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
