# Sakura System — AutoCenter Edition — Índice do projeto

> ## ⛔ NENHUMA CREDENCIAL, E NADA PESSOAL OU DE PREÇO, NESTE REPOSITÓRIO
>
> O repositório é **público** (precisa ser, pro auto-update funcionar — `docs/licoes.md`, item 21).
> Tudo que está aqui qualquer pessoa lê, e apagar depois não resolve: fica no histórico do Git.
> - **Senha, token, chave, CSC, certificado**: o lugar é o painel do próprio serviço. O CSC da SEFAZ,
>   o token do Giap e a senha do portal da prefeitura já vazaram por aqui e precisam ser trocados.
> - **Assuntos da empresa e pessoais** (sócios e porcentagens, abertura do CNPJ, preço, custo por
>   loja, margem, plano de equipe): vão no repositório **privado** `caranovavidanova/sakura-corp`.
>   Uma loja cliente não pode ler a margem dela aqui. Não é carregado sozinho: quando o assunto for
>   empresa, sócios ou preço, adicionar esse repositório à sessão (`add_repo`) e ler lá.

## 0. Quem está trabalhando? (ler antes de tudo)

A dona do projeto é a **Sofia** (conta do GitHub `caranovavidanova`), e o resto deste arquivo foi
escrito pensando nela. **No começo de toda sessão, conferir quem é**: a conta do GitHub da sessão
(`mcp__github__get_me`, ou `gh api user --jq .login`) ou o e-mail do Git (`git config user.email`).
Se não der pra saber, perguntar.

**Quando NÃO é a Sofia** (hoje, o Gustavo, que constrói o painel da equipe; depois, outras pessoas
da equipe), valem estas regras, e elas passam na frente de qualquer outra deste arquivo:
- **Escopo, por enquanto: só o painel** (pasta `painel/` e `docs/painel.md`). Depois todos vão
  mexer no sistema; quando isso mudar, é a Sofia quem avisa, e esta linha muda.
- **Trabalha em branch e abre PR, mas nunca mescla.** Pede a revisão da Sofia no PR e para ali. A
  `main` nem aceita sem a aprovação dela (ruleset `main protegida`).
- **Não publica, não libera e não mexe em banco.** Não dispara o Release, o "Liberar versão" nem o
  "Atualizar o banco". Não roda SQL nem migration no Supabase de loja nenhuma. Migration nova pode
  ser escrita num PR, mas quem aplica é ela.
- **Não mexe em versão publicada, tag, senha (secret), cofre (environment), regra do repositório
  (ruleset) nem configuração**, nem por um workflow novo ou modificado.
- **Não substitui o "Onde parou"**, que é da Sofia. O andamento do painel vai no `docs/painel.md`
  e na descrição do PR.
- **Não adiciona à sessão o repositório privado `caranovavidanova/sakura-corp`** (preço, sócios,
  contratos).
- **Guiar passo a passo, com calma, em tudo que não for programar** (pedido da Sofia, 30/09):
  instalar, rodar comando, testar no navegador, abrir PR, pedir revisão, clicar em qualquer tela.
  Um passo por vez, dizendo onde clicar e o que deve aparecer, e esperando a pessoa confirmar
  antes do próximo. Programar e ajustar código é com o Claude; o resto, a pessoa faz guiada.
- **Quando a pessoa disser o nome ou o número de uma tarefa**: ler a issue inteira, explicar em
  português simples o que ela é, o que o Claude vai fazer sozinho e o que a pessoa vai precisar
  fazer, e só então começar (roteiro completo em `docs/painel.md`, "Como começar uma tarefa").
- Se a pessoa pedir alguma dessas coisas, explicar que é regra da Sofia e sugerir falar com ela.

## Como esta memória funciona (reorganizada em 27/09/2026)

Este arquivo é **o índice**: carrega sozinho em toda sessão (`CLAUDE.md` importa ele), então precisa
continuar **pequeno** (~20 KB). Antes ele tinha 650 KB e gastava ~180 mil tokens só pra abrir uma
sessão. O resto mora em `docs/` e **só é aberto quando o assunto pede**:

| Arquivo | O que tem | Abrir quando |
|---|---|---|
| `docs/decisoes.md` | o que é o projeto, plano de expansão (fases 1-3), identidade visual, **tabela de decisões técnicas** (antiga seção 2 e 3) | antes de qualquer decisão estrutural |
| `docs/estrutura.md` | pastas, padrão de código, **padrão de formulário** (react-hook-form + zod) (antiga seção 4) | antes de criar arquivo/módulo novo |
| `docs/banco.md` | as migrations `0001`-`0064`, cada tabela, multi-loja, RLS (antiga seção 5) | antes de mexer em banco/migration |
| `docs/licoes.md` | as dívidas técnicas e os 81 **padrões de bug** já vividos (antiga seção 6) | ao investigar bug, e antes de mexer em área sensível |
| `docs/modulos.md` | estado de cada tela/módulo hoje (antiga seção 7) | antes de mexer num módulo |
| `docs/pendencias-e-futuro.md` | **"O que depende dela", numa lista só**; o que não existe; parte fiscal (playbook por loja nova); linha do tempo (antiga seção 8) | ao planejar próximo passo, e quando ela perguntar "o que falta?" |
| `docs/operacao.md` | rodar, instalar empresa nova, **publicar/liberar versão**, backup, atualizar bancos, voltar versão (antigas seções 9 e 11) | ao publicar, rodar migration ou instalar loja |
| `docs/historico.md` | estado do Git e os marcos "onde parou" antigos, do mais novo pro mais velho (antiga seção 10) | quase nunca |
| `docs/comparativo-anexar.md` | o que o concorrente Anexar anuncia × o que temos, e a tarefa de cada coisa que falta (#386 a #412) | ao planejar funcionalidade nova ou falar de venda |
| `docs/painel.md` | o painel da equipe: o que é, como a equipe trabalha (levas, tarefas), decisões técnicas, 1ª versão, andamento | ao mexer no painel ou planejar leva |
| `MELHORIAS.md` | o guia de melhorias (TR-/TL-/FN-), 227 KB | só quando ela citar um item |

**Referências antigas continuam valendo**: código e documentos citam "item 33 da seção 6" — a seção 6
é `docs/licoes.md`, a 5 é `docs/banco.md`, a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md`,
a 9 é `docs/operacao.md`. A numeração dos itens não mudou.

**Como manter**: ao fim de cada sessão, **substituir** o bloco "Onde parou" lá embaixo pelo novo e
mover o antigo pro topo dos marcos em `docs/historico.md`. Detalhe de módulo, migration ou bug novo
vai pro arquivo de `docs/` certo, nunca aqui. **O que fica dependendo dela vai pra lista "O que
depende dela" da seção 8** (e sai de lá quando for feito), não só pro "Onde parou": marco antigo
envelhece e ninguém relê. Se este índice passar de ~30 KB, é hora de enxugar.

## 1. Quem é a usuária e como trabalhar com ela

- Sem experiência prévia em programação. **Explicar decisões técnicas em linguagem simples**, sem
  assumir conhecimento de jargão.
- Antes de decisões estruturais importantes (arquitetura, bibliotecas, modelagem de dados),
  **apresentar opções + recomendação e esperar confirmação** — não decidir sozinho.
- Construir em **etapas pequenas e testáveis**. Mostrar funcionando antes de avançar.
- A usuária testa em uma máquina Windows local (terminal integrado do VS Code / PowerShell). Ela
  copia e cola os comandos que eu forneço — eu não tenho acesso à máquina dela.
- **Instalador Windows**: ela baixa e instala primeiro na **própria máquina dela** (não a da
  borracharia) pra testar antes de levar pra loja de verdade — bom lembrar disso ao dar
  instruções de instalação/teste, não assumir que já está testando no ambiente de produção.
- **A borracharia é do pai dela** — ela é quem constrói o sistema, mas quem vai operar no dia a
  dia é o pai (e funcionários da loja dele). A primeira versão "de verdade" só vai pra lá quando
  ela achar que está pronta o suficiente (ver decisão sobre nota fiscal/lançamento na seção 8).
- Nome: **Sofia** (conta do GitHub `caranovavidanova`). E-mail: caranovavidanova@gmail.com.
  **Nunca presumir o nome dela por outra fonte**: em 29/09 uma sessão chamou ela de "Carol" por
  engano, porque esse nome apareceu no plano que ela mandou.
- **A organização atual de módulos/abas no menu lateral e dentro de cada tela** (ex: Caixa com
  abas Diário/Entradas/Saídas, "Contas a Pagar" como módulo próprio) **é provisória** — a usuária
  disse explicitamente que pretende repensar essa organização melhor no futuro. Não tratar a
  posição/formato atual de nenhum módulo como definitivo nem resistir a reorganizar quando ela
  pedir — é esperado que isso mude.
- **Fluxo de configuração de serviços externos**: quando um recurso novo depende de uma conta
  paga de terceiro (Anthropic, Focus NFe), a usuária cria a própria conta/chave e cola no lugar
  certo — ela mesma paga o próprio uso, sem exigir que eu tenha acesso a nada disso. Ela pede
  ajuda passo a passo com prints de tela (ver seção 9).
- Quando ela manda um print de uma tela de configuração (Supabase, GitHub etc.) e pergunta "qual
  desses" ou "assim?", ela geralmente já está no meio do passo a passo que eu dei — vale conferir
  o print com atenção antes de responder, às vezes tem um detalhe (nome errado, campo a mais) que
  muda o resultado.
- **Mensagem que ela vai mandar pra outra pessoa** (contabilidade, suporte da Focus NFe, cliente):
  escrever **curta e informal**, do jeito que uma pessoa fala — não recapitular todo o contexto
  técnico. Se existe um print ou e-mail que já explica o problema, é ele que carrega a parte
  técnica, e a mensagem fica só: *"preciso de ajuda com isso / o print explica / vocês fazem pra
  mim? / preciso receber X de volta"*. Ela rejeitou explicitamente uma primeira versão longa e
  formal ("quero mais humano, mais simples, sem precisar desse contexto todo"). Vale pra qualquer
  texto que sai da nossa conversa pro mundo — o cuidado com contexto completo é pro
  `PROJETO_STATUS.md`, não pro WhatsApp dela.
- **"Estou pensando em fazer X com você no fim de semana" é PLANO, não autorização pra começar
  agora** (aprendido em 28/08/2026, do jeito ruim). Ela disse "to pensando em pegar firme esse fim
  de semana com você pra fazer um site" — eu tratei como sinal verde, alinhei três decisões por
  perguntas e construí o site inteiro na mesma sessão. A resposta dela: *"na verdade nem precisava
  ter feito site ainda"*. Nada foi perdido (ficou guardado pra quando ela quiser), mas foi trabalho
  grande feito na hora errada, sem ela por perto pra ir opinando. **Regra pra sessões futuras**:
  quando ela descrever intenção futura ("estou pensando em", "semana que vem", "quando der"),
  responder alinhando e **perguntar se é pra começar agora** antes de construir. Responder as
  perguntas de alinhamento dela **não** é o mesmo que ela mandar executar. Vale principalmente pra
  coisa grande e nova (um site, um módulo) — correção de bug e ajuste pequeno que ela relatou
  continuam sendo pra fazer na hora.
- **Conversa de alinhamento: ela revisa antes de eu documentar** (27/09/2026). Em conversa de
  planejamento, ela prefere que eu junte no fim o que foi decidido, o que está aberto e o que vou
  anotar, e ela confirma antes. O que ela mandar "deixar na gaveta" é anotado como adiado, não
  como decidido.
- **Configuração longa, com várias telas ou senhas** (30/09/2026): ela prefere **um item por vez**,
  com uma tabela "campo → o que colocar" pra cada tela, esperando ela dizer "salvei" antes do
  próximo. Foi assim com as 9 senhas no Bitwarden, e funcionou. Quando ela manda print, conferir
  o print antes de seguir (foi o print que mostrou o cofre criado com o nome errado).
- **Tarefas pra equipe saem já planejadas** (30/09/2026): o papel da equipe é programar e
  ajustar, e o planejamento é dela comigo. Cada tarefa diz o que fazer, em quais arquivos, com o
  que, o "Pronto quando" e o que não fazer. Ela revisa o rascunho antes de virar issue.
- **Mudança de aparência se decide por imagem, não por número** (12/09/2026): mostrar a mesma
  tela renderizada em duas ou três versões e deixar ela escolher. Foi assim com a borda dos campos
  e com ícone × palavra nas ações das listas. Em 03/10 as fotos foram numa página privada
  (Artifact), com o jeito de responder escrito no topo ("janela: sólida", "lista: B"), e ela
  respondeu em duas palavras.
- **Faxina da memória** (30/09/2026): ela quer a memória enxuta e clara: **apagar o que não
  acrescenta** (história de "como foi feito", "nesta sessão", status que envelheceu) e
  **esclarecer** o que ficou ambíguo ou contraditório. O que é decisão ou lição fica; o texto antigo
  continua no histórico do Git.
- **Repositório privado na sessão** (30/09/2026): a trava de segurança da sessão recusa adicionar
  o `caranovavidanova/sakura-corp` sem autorização explícita. Pedir com todas as letras ("posso
  adicionar o sakura-corp com permissão de escrita?"); escolher uma opção num menu não conta.
- **Documento ou tela oficial que não tem volta** (contrato, Receita, banco, certificado;
  02/10/2026): ela manda o PDF ou o print **antes** de cada botão de assinar ou enviar, eu confiro
  e explico em português simples, e só então ela clica. Foi assim a abertura inteira do CNPJ, num
  dia, sem erro. Os dados pessoais que aparecem nesses documentos (nome civil, CPF, RG, endereço)
  **nunca** vão pra memória, nem pra privada.
- **Sempre que eu aprender uma preferência de trabalho nova**, documentar aqui — não só nas
  decisões técnicas da seção 3, mas qualquer coisa sobre *como* ela quer que eu trabalhe. Sessões
  futuras não têm memória da conversa, só deste arquivo.
- **Este arquivo carrega sozinho em toda sessão nova** — `CLAUDE.md` importa `AGENTS.md` e
  `PROJETO_STATUS.md` (`@AGENTS.md` / `@PROJETO_STATUS.md`), então não é preciso a usuária colar
  ou anexar este arquivo de novo pra eu ter esse contexto. Basta abrir uma sessão nova apontando
  pro repositório `sakura-corp/sakura-system-ace` (era `caranovavidanova/sakura-system-ace` até
  29/09/2026; o endereço antigo redireciona).


## 2. O projeto em um parágrafo

**Sakura Corp** é a empresa (ainda só um nome) por trás do **Sakura System**, uma linha de sistemas
de gestão por nicho. O primeiro é o **SSACE — Sakura System AutoCenter Edition**, pra
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
  "Liberar versão para todas as lojas". Não publicar nem liberar sem ela pedir. Desde 30/09 o
  Release, o Liberar e o Atualizar bancos **esperam a aprovação dela no GitHub** (cofre `lojas`):
  depois de disparar, avisar que ela precisa aprovar.
- **Antes de dizer qual é a última versão**, conferir as releases reais no GitHub — este arquivo já
  errou isso.
- **Código**: erro do Supabase → `mensagemDeErro()`; nunca `window.prompt()`; fallback de
  `import.meta.env` com `||`, nunca `??`; conta de dinheiro nunca dentro de tela (`src/schemas/`);
  dia de calendário com `hojeLocal()`/`diaLocal()`, nunca `toISOString().slice`.
- **Validar antes de mesclar**: `npm run typecheck`/`lint`/`test:fusos`/`contraste`; tela mexida →
  olhar renderizada; mudança de Electron → `npm run test:electron`. Teste só prova o que se viu
  ele reprovar (quebrar de propósito).
- **Validação incerta é aviso, nunca tranca** (`docs/licoes.md`, item 33).
- **Rascunho que só existe no computador da sessão se perde**: quando a sessão fica parada, o
  container pode ser desligado. O que ela ainda vai revisar vai pro repositório antes de ela sair.
- **Endereço**: `sakura-corp/sakura-system-ace` desde 29/09/2026. **Nunca criar um repositório
  `sakura-system-ace` na conta pessoal dela** (quebra o redirecionamento do endereço antigo).

## 4. Onde parou (o marco mais recente — os anteriores estão em `docs/historico.md`)



### 03/10/2026: os cinco bugs de tela (#361, #362, #363, #417, #425)

**Estado do código**: tudo no PR #431 (a mesclar com o ok dela nas fotos). `main` na **`v0.9.48`**,
**publicada só no canal de teste**; nenhuma versão nova publicada. Banco na **`0064`** (nada de
banco nesta leva). O marco anterior (CNPJ aberto) está no topo de `docs/historico.md`.

#### O que foi feito
- **Notas Fiscais**: coluna "Situação" (Autorizada / Cancelada / Enviada à mão) e o texto do topo
  atualizado (#362, #363).
- **Clientes**: "Ver veículos" no lugar da coluna de placas; carro sem placa aparece como "sem
  placa" (#417).
- **Tabelas largas** (#425): nada mais passa da janela, a tabela rola dentro da própria caixa, e
  a **lista de OS cabe inteira em 1366** (versão "B", escolhida por ela pela imagem).
- **Janelas opacas** (#361, versão "sólida", escolhida por ela pela imagem).
- **Varredura nova `npm run largura:telas`**, com job no CI: todas as telas em 1024, 1280, 1366, 1536 e 1600.
  Detalhe em `docs/modulos.md` e na lição 81 de `docs/licoes.md`.
- **Como ela escolheu**: uma página privada com as fotos de cada versão (Artifact), e ela
  respondeu "sólida e B". Funcionou bem pra decisão de aparência.

#### Por onde a próxima sessão começa
1. **PR #431**: se ainda estiver aberto, mesclar quando ela der o ok nas fotos. Depois, se ela
   quiser, publicar uma versão no canal de teste com essas telas (só quando ela pedir).
2. **Avisos da abertura da empresa**, quando ela mandar: pedir pra adicionar o
   `caranovavidanova/sakura-corp` (seção 1) e seguir "Abertura: o que falta" do `EMPRESA.md`.
3. **PR da tarefa 2 do Gustavo (#351)**, quando ele abrir (`docs/painel.md`, "O que a Sofia faz").
4. **A lista "O que depende dela"** (seção 8): a fatura da Focus em **10/10**; a partir de
   **16/10**, o que depende do dinheiro da empresa (no privado); liberar a `v0.9.48`. Sugestão,
   se ela perguntar o que fazer: **trocar as três credenciais fiscais expostas**, ou o grupo 2 de
   tarefas que não mexe no banco (atualizar o Electron #385, busca com Ctrl+K #372, listas com
   páginas #373).
