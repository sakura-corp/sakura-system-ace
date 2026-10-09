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
| `docs/licoes.md` | as dívidas técnicas e os 82 **padrões de bug** já vividos (antiga seção 6) | ao investigar bug, e antes de mexer em área sensível |
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
  `PROJETO_STATUS.md`, não pro WhatsApp dela. **Curta, mas completa** (05/10/2026: "planeja bem a
  pergunta pra não ter que perguntar mais"): tudo o que falta saber numa mensagem só, numerada,
  dizendo o caminho que ela já tentou, pra quem responde não mandar o mesmo de novo. Atendimento
  de WhatsApp que responde genérico costuma ser robô: pedir uma pessoa.
- **Quando ela disser "calma, não entendi"** (05/10/2026): parar e explicar, em poucas linhas, o
  objetivo e a corrente de passos (o que destrava o quê e por que o próximo vem antes) antes do
  próximo clique. Foi o que destravou o certificado da empresa: "o número do pedido só existe
  depois do pedido".
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
- **O que levar ou fazer num órgão** (Poupatempo, cartório, certificadora, banco; 08/10/2026):
  conferir na página oficial antes de responder. Eu disse que o Poupatempo dava lá o formulário
  do nome social, e não dá: foi a busca dela no Google que mostrou, a tempo.
- **Defeito achado de passagem vira tarefa no GitHub na hora** (04/10/2026), no formato da #425
  ("o que acontece", "por quê", "o que fazer", "Pronto quando"), mesmo que o conserto venha
  depois. O **cartão de "tarefa sugerida"** que o app mostra é só um atalho pra abrir outra
  sessão: ele não entra na memória e eu não consigo ver os de outras sessões. Ela perguntou "esses
  defeitos têm que ser documentados, não?!" ao descobrir isso.
- **Sempre que eu aprender uma preferência de trabalho nova**, documentar aqui — não só nas
  decisões técnicas da seção 3, mas qualquer coisa sobre *como* ela quer que eu trabalhe. Sessões
  futuras não têm memória da conversa, só deste arquivo.
- **Este arquivo carrega sozinho em toda sessão nova** — `CLAUDE.md` importa `AGENTS.md` e
  `PROJETO_STATUS.md` (`@AGENTS.md` / `@PROJETO_STATUS.md`), então não é preciso a usuária colar
  ou anexar este arquivo de novo pra eu ter esse contexto. Basta abrir uma sessão nova apontando
  pro repositório `sakura-corp/sakura-system-ace` (era `caranovavidanova/sakura-system-ace` até
  29/09/2026; o endereço antigo redireciona).


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
  "Liberar versão para todas as lojas". Não publicar nem liberar sem ela pedir. Desde 30/09 o
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

## 4. Onde parou (o marco mais recente — os anteriores estão em `docs/historico.md`)



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
