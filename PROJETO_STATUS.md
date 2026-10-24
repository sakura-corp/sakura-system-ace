# Sakura System — AutoCenter Edition — Índice do projeto

> ## ⛔ NENHUMA CREDENCIAL, E NADA PESSOAL OU DE PREÇO, NESTE REPOSITÓRIO
>
> O repositório é **público** (precisa ser, pro auto-update funcionar — `docs/licoes.md`, item 21).
> Tudo que está aqui qualquer pessoa lê, e apagar depois não resolve: fica no histórico do Git.
> - **Senha, token, chave, CSC, certificado**: o lugar é o painel do próprio serviço. O CSC da SEFAZ,
>   o token do Giap e a senha do portal da prefeitura já vazaram por aqui (trocados em 19/10, #505).
> - **Assuntos da empresa e pessoais** (sócios e porcentagens, abertura do CNPJ, preço, custo por
>   loja, margem, plano de equipe): vão no repositório **privado** `caranovavidanova/sakura-corp`.
>   Uma loja cliente não pode ler a margem dela aqui. Não é carregado sozinho: quando o assunto for
>   empresa, sócios ou preço, adicionar esse repositório à sessão (`add_repo`) e ler lá.

## 0. Quem está trabalhando? (ler antes de tudo)

A dona do projeto é a **Sofia** (conta do GitHub `caranovavidanova`), e o resto deste arquivo foi
escrito pensando nela. **No começo de toda sessão, conferir quem é**: a conta do GitHub da sessão
(`mcp__github__get_me`, ou `gh api user --jq .login`) ou o e-mail do Git (`git config user.email`).
Se não der pra saber, perguntar.

**Depois, abrir o caderno de quem está trabalhando** (seção 1, item 4): `add_repo`, com escrita,
de `<usuário>/segundo-cerebro` (no Claude do PC, que não tem `add_repo`: a pasta `segundo-cerebro`
na pasta do usuário, a que o Obsidian abre), só o da própria pessoa, e seguir o `CLAUDE.md` de lá,
**a não ser que a tarefa diga `Second brain: não precisa`** (`docs/tarefas.md`). Se não abrir (não
existe ainda, ou a sessão não alcança): avisar, dizer se dá ou não pra fazer a tarefa sem ele e
**perguntar se a pessoa quer seguir**. É aviso, nunca tranca.

**Quando NÃO é a Sofia** (a equipe; manual: `docs/equipe.md`), valem estas regras, e elas passam
na frente de qualquer outra deste arquivo:
- **Escopo**: os três (Gustavo, Lázaro e Tiago), **o programa das lojas**, com o mesmo acesso,
  sempre contra o **Supabase de teste**, nunca o de uma loja (decidido em 19/10/2026; antes o
  Gustavo era só o painel). Mudar isso é com a Sofia, e esta linha muda.
- **Trabalha em branch e abre PR, mas nunca mescla.** Pede a revisão da Sofia no PR e para ali. A
  `main` nem aceita sem a aprovação dela (ruleset `main protegida`).
- **Não publica, não libera e não mexe em banco.** Não dispara o Release, o "Liberar versão" nem o
  "Atualizar o banco". Não roda SQL nem migration em Supabase nenhum, nem no de teste. Migration
  nova pode ser escrita num PR, mas quem aplica é ela.
- **Não mexe em versão publicada, tag, senha (secret), cofre (environment), regra do repositório
  (ruleset) nem configuração**, nem por um workflow novo ou modificado.
- **Não substitui o "Onde parou"**, que é da Sofia. O andamento vai na descrição do PR (o do
  painel, também no `docs/painel.md`).
- **Não adiciona à sessão o repositório privado `caranovavidanova/sakura-corp`** (preço, sócios,
  contratos).
- **Guiar passo a passo, com calma, em tudo que não for programar** (pedido da Sofia, 30/09):
  instalar, rodar comando, testar no navegador, abrir PR, pedir revisão, clicar em qualquer tela.
  Um passo por vez, dizendo onde clicar e o que deve aparecer, e esperando a pessoa confirmar
  antes do próximo. Programar e ajustar código é com o Claude; o resto, a pessoa faz guiada.
- **Quando a pessoa disser o nome ou o número de uma tarefa**: ler a issue inteira, explicar em
  português simples o que ela é, o que o Claude vai fazer sozinho e o que a pessoa vai precisar
  fazer, e só então começar (roteiro completo em `docs/equipe.md`, "Como começar uma tarefa").
- Se a pessoa pedir alguma dessas coisas, explicar que é regra da Sofia e sugerir falar com ela.

**Projetos secundários** (os repositórios privados da `sakura-corp` fora do SSACE; decidido em
22/10/2026, #733): **só nos projetos secundários**, com a proposta aprovada, o Gusta cria as
tarefas, abre e fecha as levas e mescla os PRs (CI verde e uma revisão do Claude antes). Cobrança,
preço, contrato, domínio, publicar pra cliente de verdade e dado de cliente, nunca sem a Sofia.
**No SSACE nada muda**: as regras acima valem inteiras. Fluxo e detalhe: `docs/projetos-secundarios.md`.

## Como esta memória funciona

Este arquivo é **o índice**: carrega sozinho em toda sessão (`CLAUDE.md` importa ele), então fica
em **até 15 KB** (o CI avisa se passar). O resto mora em `docs/` e **só é aberto quando o assunto
pede**:

| Arquivo | O que tem | Abrir quando |
|---|---|---|
| `docs/decisoes.md` | o projeto, as fases, identidade visual, **tabela de decisões técnicas** | antes de qualquer decisão estrutural |
| `docs/estrutura.md` | pastas, padrão de código, **padrão de formulário** (react-hook-form + zod) | antes de criar arquivo/módulo novo |
| `docs/banco.md` | as migrations, cada tabela, multi-loja, RLS | antes de mexer em banco/migration |
| `docs/licoes.md` | as dívidas técnicas e os **padrões de bug** já vividos | ao investigar bug, e antes de mexer em área sensível |
| `docs/modulos.md` | estado de cada tela/módulo hoje | antes de mexer num módulo |
| `docs/pendencias-e-futuro.md` | **"O que depende dela"**; o que não existe; a parte fiscal (playbook por loja nova) | ao planejar, e quando ela perguntar "o que falta?" |
| `docs/operacao.md` | rodar, instalar empresa nova, **publicar/liberar**, backup, atualizar bancos, voltar versão | ao publicar, rodar migration ou instalar loja |
| `docs/historico.md` | estado do Git e os "onde parou" antigos, do mais novo pro mais velho | quando precisar do detalhe de um marco |
| `docs/visao.md` | **pra onde o SSACE vai**, as quatro frentes e a prioridade das tarefas (ondas) | ao planejar funcionalidade nova ou falar do futuro |
| `docs/comparativo-anexar.md` | o concorrente Anexar × o que temos (#386 a #412) | ao planejar funcionalidade nova ou falar de venda |
| `docs/jeito-de-trabalhar.md` | **o método com o Claude**: skills, trancas, afazeres, a fila | ao mexer em skill, gatilho ou tarefa agendada, e na revisão do mês |
| `docs/tarefas.md` | **o modelo único de tarefa**, as etiquetas, **a tabela de modelos** e o que fazer quando o modelo falha | ao escrever ou começar uma tarefa, e quando uma sessão falhar por modelo ou crédito |
| `docs/projetos-secundarios.md` | **os projetos secundários**: o fluxo da proposta, quem faz o quê, as etiquetas | quando o assunto for projeto secundário ou proposta |
| `docs/equipe.md` | **o manual de quem entra na equipe** (Windows e Mac) | quando quem trabalha não é a Sofia |
| `docs/supabase-de-teste.md` | **o banco de teste da equipe** e os dados de exemplo | ao mexer no banco de teste ou em `supabase/exemplo/` |
| `docs/painel.md` | o painel da equipe: levas, decisões técnicas, andamento | ao mexer no painel ou planejar leva |
| `MELHORIAS.md` | o guia de melhorias (TR-/TL-/FN-), 227 KB | só quando ela citar um item |

**Referências antigas continuam valendo**: "item 33 da seção 6" é `docs/licoes.md`; a seção 5 é
`docs/banco.md`, a 7 `docs/modulos.md`, a 8 `docs/pendencias-e-futuro.md`, a 9 `docs/operacao.md`.
A seção 1 de antes de 18/10 (e o arquivo que nasceu dela em 17/10) está no caderno da Sofia.

**Como manter**: ao fim de cada sessão (skill `fechar`), **substituir** o "Onde parou" lá embaixo
por um novo de **no máximo 8 linhas** e mover o antigo pro topo dos marcos em `docs/historico.md`.
O detalhe vai pra tarefa (issue/PR) ou pro `docs/` certo, nunca aqui; **o que depende dela vira
tarefa com a etiqueta `sofia`**. Preferência nova de quem trabalha vai pro caderno da pessoa (seção 1),
nunca aqui.

## 1. Como trabalhar com quem está na tela (o jeito de cada um mora no caderno da pessoa)

1. **Português simples, sempre em português**, sem jargão: ninguém aqui precisa saber programar
   pra entender a resposta.
2. **Fora do código, um passo por vez**: onde clicar, o que deve aparecer, e esperar a pessoa
   confirmar antes do próximo.
3. **Decisão estrutural** (arquitetura, biblioteca, modelagem): opções + recomendação, e esperar
   o "sim" da Sofia. Construir em etapas pequenas, mostrando funcionando.
4. **O caderno de quem está trabalhando**: o repositório privado `<usuário>/segundo-cerebro`, na
   conta do GitHub da própria pessoa (o da Sofia: `caranovavidanova/segundo-cerebro`). É o
   `CLAUDE.md` de lá que diz o jeito da pessoa; quando abrir está na seção 0. O que mudou no jeito
   dela é proposto no fim da sessão (skill `fechar`) e gravado direto lá, sem PR, depois do "confere".

## 2. O projeto em um parágrafo

**Sakura Corp** é a empresa (aberta em 02/10/2026; os detalhes ficam no privado) por trás do
**Sakura System**, uma linha de sistemas de gestão por nicho. O primeiro é o **SSACE — Sakura System AutoCenter Edition**, pra
autocenters/borracharias: app desktop Windows (Electron + React + Vite + TypeScript + Tailwind v4),
dados no Supabase (um projeto por empresa cliente; uma empresa pode ter várias lojas). Rodando de
verdade na borracharia do pai dela ("Pneus Amigão", Araraquara), com NFC-e e NFS-e em produção via
Focus NFe. Fase atual: preparar a venda pra outras empresas (fase 2). Detalhe em `docs/decisoes.md`.

## 3. Regras que valem em toda sessão (o resto está em `docs/decisoes.md` e `docs/estrutura.md`)

- **Git**: branch de trabalho → PR → **mesclar direto na `main`**, sem esperar aprovação (até existir
  uma v1.0). **Só quando quem trabalha é a Sofia** (seção 0); os outros abrem o PR e param. Depois, dizer a ela em português simples o que mudou e o que ela precisa fazer.
- **Migration nova**: idempotente (dropar o nome **final** do objeto antes de criar); termina com
  `insert into schema_versao (versao) values (N) on conflict do nothing;`; sobe
  `VERSAO_ESQUEMA_ESPERADA`; rodar `npm run gerar-instalacao`; ganha um
  `supabase/scripts/testar-*.sql` (termina em `TODAS AS CHECAGENS PASSARAM`) e entra na matriz de
  RLS se mexer em policy. Nunca tirar/renomear coluna em uso na mesma versão que passa a usar a nova.
- **Ordem de subir**: migration **antes** da versão, pelo botão "Atualizar o banco de todas as
  empresas" (ensaiar, depois aplicar). Exceção: migration que declara
  `-- versao-minima-do-programa: X`. Passo a passo em `docs/operacao.md`.
- **Publicar ≠ liberar**: versão nasce no canal de teste; só chega nas lojas pelo workflow
  "Liberar versão para todas as lojas". **Ela testa tudo de uma vez, no fim de semana** (23/10;
  `docs/jeito-de-trabalhar.md`): no meio da semana, PR entra com CI verde e revisão do Claude. Não publicar nem liberar sem ela pedir. Desde 30/09 o
  Release, o Liberar e o Atualizar bancos **esperam a aprovação dela no GitHub** (cofre `lojas`):
  depois de disparar, avisar que ela precisa aprovar, **já com o link direto da rodada** (08/10:
  "cadê o link").
- **Antes de dizer qual é a última versão**, conferir as releases reais no GitHub — este arquivo já
  errou isso.
- **Código**: erro do Supabase → `mensagemDeErro()`; nunca `window.prompt()`; fallback de
  `import.meta.env` com `||`, nunca `??`; conta de dinheiro nunca dentro de tela (`src/schemas/`);
  dia de calendário com `hojeLocal()`/`diaLocal()`, nunca `toISOString().slice`.
- **Validar antes de mesclar**: `npm run typecheck`/`lint`/`test:fusos`/`contraste`; tela mexida →
  olhar renderizada (`contraste:telas` e `largura:telas`); mudança de Electron → `npm run
  test:electron`. **PR grande: uma revisão de código do zero antes de mesclar** (`/code-review`;
  em 03/10 ela achou 2 problemas reais que os testes não pegavam), conferindo cada ponto antes de
  mexer, porque a revisão também erra. Teste só prova o que se viu
  ele reprovar (quebrar de propósito).
- **Validação incerta é aviso, nunca tranca** (`docs/licoes.md`, item 33).
- **Rascunho que só existe no computador da sessão se perde**: quando a sessão fica parada, o
  container pode ser desligado. O que ela ainda vai revisar vai pro repositório antes de ela sair.
- **Endereço**: `sakura-corp/sakura-system-ace` desde 29/09/2026. **Nunca criar um repositório
  `sakura-system-ace` na conta pessoal dela** (quebra o redirecionamento do endereço antigo).

## 4. Onde parou (no máximo 8 linhas; os anteriores estão em `docs/historico.md`)

### 24/10/2026, madrugada: a leva 5 montada e a apresentação preparada (coordenadora)
- **Na `main`**: painel em ordem de prioridade (#776); levantamento do que falta pra apresentar (#777, `apresentacao/o-que-falta-pra-apresentar.md`); dados de mentira sem contradição (#780) e margem com vírgula e barra da OS (#781), pras fotos.
- **Leva 5 = a primeira empresa cliente**, em ordem: #784 textos, #785 PDF, #786 serviços típicos, #706, #787, #366, #367. Leva 6: #454, #456, #372, #459, #708, #699. Contrato e pagamento: no privado (aprovados pelo advogado).
- **Leva 4 aprovada sem testes** (24/10, `docs/relatorios/leva-4.md`): os testes dela ficam pros 10 a 15 dias antes do próximo cliente; a leva 5 é a atual. O Tiago (sem PC até segunda) tem a #784 e a #786, com o selinho novo "pra Tiago, pelo celular" no painel (#794, linha `Reservada pra:`).
- **Depende dela**: revisar e mesclar os PRs da leva 5 (dom. à noite e seg.); responder a #782 até quarta (Lázaro); mandar a apresentação ao cliente na terça 27/10; assinaturas do memorando até 26/10 (#632); publicar a 0.9.55 no próximo dia de teste.
- **Próxima sessão**: revisar os PRs da leva 5 que chegarem (o #785 só depois das fotos de segunda). Abertos de passagem: #790 (pagamento cru no Caixa) e #791 (Lucratividade e margem, `sofia`).
