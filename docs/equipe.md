# Manual da equipe

Pra quem entra na equipe da Sakura, em **Windows ou Mac**. As regras valem por cima de tudo e
estão na **seção 0 do `PROJETO_STATUS.md`**; este manual explica como trabalhar com elas.

- **Quem faz o quê**: os três (Gustavo, Lázaro e Tiago) trabalham **no programa das lojas**, com
  o mesmo acesso, sempre contra o **Supabase de teste** (`docs/supabase-de-teste.md`), nunca o
  banco de uma loja (decidido pela Sofia em 19/10/2026; antes o Gustavo era só o painel).
- **Antes de ter acesso ao código**, cada um assina o Termo de Colaboração (detalhe no privado).
- **Programar e ajustar código é com o Claude.** O resto (instalar, rodar comando, testar, abrir
  PR) a pessoa faz, guiada pelo Claude **um passo por vez**.
- **As tarefas** são as issues do GitHub, já planejadas pela Sofia com o Claude dela: o que fazer,
  em quais arquivos, `Estimativa: N h`, "Pronto quando" e o que não fazer. Como a equipe se
  organiza em levas: `docs/painel.md`, "Como a equipe trabalha".
- **A primeira tarefa de todo mundo** é montar o seu caderno, o `segundo-cerebro` (roteiro
  abaixo), antes das tarefas da leva.

## Primeiro dia (computador pronto, sem programar)

**O que precisa ter antes** (os convites e as chaves, a Sofia manda):
- a **conta do Claude Team da Sakura**, pelo convite que chega no **e-mail da Sakura**;
- a **conta do GitHub com o e-mail da Sakura**, com a **verificação em duas etapas** ligada, e o
  convite pra organização `sakura-corp` aceito;
- **quem vai trabalhar no programa das lojas**: o endereço e a chave do **Supabase de teste** e o
  **login de teste** de cada um. Tudo isso chega **só por um link do Bitwarden Send**, que se
  apaga sozinho. **Nunca** por WhatsApp, e-mail, conversa com o Claude nem pelo repositório.
  (Como o banco de teste foi montado está em `docs/supabase-de-teste.md`: é da Sofia, e quem trabalha
  **não roda nada dele**, nem SQL.)

Com isso em mãos, a pessoa instala o **Claude Code no PC** (não a versão pela internet: vai
precisar abrir o programa ou o painel no próprio computador pra testar), entra com a **conta da
Sakura**, e cola isto como **primeira mensagem**, trocando o que está entre colchetes:

> Oi, Claude. Vou trabalhar no projeto **Sakura System**, que está no GitHub no repositório
> **`sakura-corp/sakura-system-ace`**. Meu computador é **[Windows ou Mac]** e eu vou trabalhar
> **[no painel ou no programa das lojas]**. Me guie **um passo por vez**, como se eu nunca tivesse
> feito isso: diga exatamente onde clicar ou o que digitar, o que deve aparecer na tela, e
> **espere eu responder "feito"** antes do próximo passo.
>
> Hoje o objetivo é **só deixar meu computador pronto**, sem programar nada:
> 1. Confira o que já tenho instalado e me ajude a instalar o que faltar: **Git**, **Node.js
>    versão 22** e **GitHub CLI** (o programa `gh`).
> 2. Me ajude a entrar na minha conta do GitHub (a do e-mail da Sakura) pelo GitHub CLI
>    (`gh auth login`, pelo navegador), e a configurar o Git com o **meu nome e o e-mail da
>    Sakura**.
> 3. **Clone** o repositório com `gh repo clone sakura-corp/sakura-system-ace`, numa pasta que você
>    vai me ajudar a escolher. **Não baixe como ZIP.** Precisa ser clonado, pra eu conseguir
>    entregar meu trabalho depois.
> 4. Me explique como abrir o Claude Code **dentro dessa pasta** e espere eu abrir.
> 5. Já dentro da pasta, leia a **seção 0 do `PROJETO_STATUS.md`** e o **`docs/equipe.md`** (e,
>    se eu for do painel, o **`docs/painel.md`**), e me explique em português simples, em poucas
>    linhas, como vai ser o meu trabalho.
> 6. Siga o "Primeiro dia" do `docs/equipe.md` até o fim: instalar as dependências e abrir o
>    programa (ou o painel) no meu computador. **Eu colo as chaves no arquivo**: não me
>    peça pra colar chave nenhuma aqui na conversa.
>
> **Hoje não mude nada no projeto, não crie branch e não pegue tarefa.** Quando tudo estiver
> pronto, diga "tudo pronto" e pare.

**O que o Claude faz no passo 6**, pra quem é do **programa das lojas**:
1. Roda `npm install` na pasta do repositório (na primeira vez demora uns minutos). Esse comando
   também liga as **travas de segredo** do Git (`.githooks/`), que barram uma chave antes de ela
   sair do computador.
2. Cria o arquivo **`.env`** copiando o `.env.example` (no Windows, `copy .env.example .env`; no
   Mac, `cp .env.example .env`). Ele tem duas linhas, `VITE_SUPABASE_URL=` e
   `VITE_SUPABASE_ANON_KEY=`.
3. Guia a pessoa a abrir o `.env` num editor de texto (Bloco de Notas no Windows, TextEdit no Mac,
   em modo de texto simples) e colar, depois do `=`, o endereço e a chave do **Supabase de
   teste** que vieram pelo Bitwarden Send. **O `.env` nunca vai pro GitHub**: o `.gitignore` já
   ignora ele, e é por ele que o programa sabe com qual banco falar quando roda no computador de
   quem programa.
4. Roda `npm run dev`: abre a janela do programa (a primeira vez demora). Entra com o **login de
   teste** da pessoa. Se aparecer a tela pedindo o endereço do Supabase, o `.env` ficou errado:
   **não preencher essa tela com nada**, voltar ao passo 3.
5. Confere com a pessoa que os dados que aparecem são os **de exemplo** (nenhum cliente de
   verdade). `Ctrl+C` no terminal fecha o programa.

Pra quem é do **painel**: os comandos estão em `docs/painel.md`, "Como rodar no PC" (o painel tem
a pasta e as dependências dele, e não usa o `.env`).

**No Windows (PowerShell)**, se aparecer *"a execução de scripts foi desabilitada neste
sistema"*, trocar `npm` por **`npm.cmd`** em todos os comandos (ex: `npm.cmd run dev`). Não
precisa mexer na trava de segurança do Windows.

**No Mac**: o programa das lojas é feito pra Windows (impressora, instalador, atualização
automática). Pra programar ele abre igual, mas se alguma coisa só funcionar no Windows, a pessoa
anota na descrição do PR e a Sofia testa no dela.

## A primeira tarefa: o seu caderno (`segundo-cerebro`)

Antes de qualquer tarefa da leva, cada um monta o **seu caderno**: notas que dizem ao Claude **como
trabalhar com você** (como você gosta de explicação, o que já sabe, como prefere os passos). Ele
mora num repositório **privado na sua conta do GitHub** (a do e-mail da Sakura), sempre com o nome
`<seu-usuário>/segundo-cerebro`. Você lê e edita no **Obsidian**, no PC; o Claude abre o caderno
sozinho no começo de toda sessão (seção 0 do `PROJETO_STATUS.md`) e, no fim, propõe o que mudou e
grava lá depois do seu "confere". O da Sofia já existe; este roteiro é o caminho que deu certo
com ela (18/10).

- **A tarefa** tem o seu nome no título e se faz como as outras: botão "Começar com o Claude" do
  painel. O Claude roda na nuvem, mas **você precisa estar no seu computador**: os passos 5 a 10
  são nele. Uns 2 h, quase tudo cliques. O Git veio do primeiro dia.
- **Só você e o seu Claude enxergam o caderno.** Nunca entra nada da empresa (preço, sócios,
  contrato), documento pessoal (CPF, RG, endereço) nem senha.
- **Ninguém cria o caderno por você**: nem a Sofia, nem o Claude (a ligação dele com o GitHub não
  tem permissão; dá `403 Resource not accessible by integration`).
- **Nada é pago**: o Obsidian é grátis. Não ligar o **Obsidian Sync** nem o **Publish**.
- **No celular, não instale o Obsidian** (o plugin do Git é instável lá): no celular, quem lê o
  caderno é o Claude.

Os passos, um por vez (o Claude guia e espera o seu "feito"):

1. **Criar o repositório** (você, no navegador): https://github.com/new, entrando com a conta da
   Sakura. Em **Owner**, a **sua conta** (não a `sakura-corp`); nome `segundo-cerebro`;
   **Private**; marcar **Add a README file**; **Create repository**.
2. **Deixar o Claude enxergar o caderno** (só depois do passo 1: sem o repositório criado, não
   dá certo): o Claude tenta adicionar o repositório à sessão (`add_repo`, com escrita). **Vai
   aparecer um pedido de permissão na tela: aprovar.** (O Tiago recusou na primeira vez, sem
   querer, e teve que repetir.) Com a Sofia e com o Tiago, foi de primeira depois disso, sem clique
   nenhum no GitHub. Se for recusado:
   em https://github.com/apps/claude/installations/select_target escolha a **sua conta** (não a
   `sakura-corp`) → **Only select repositories** → `segundo-cerebro` → **Install** (ou **Save**,
   se já estava instalado). Se mesmo assim não der, confira em https://claude.ai/connect-github
   que o GitHub ligado é o da conta da Sakura. Depois, o Claude tenta de novo.
3. **Não mandar a pasta do Obsidian**: o Claude grava no caderno um `.gitignore` com a linha
   `.obsidian/`. (Sem isso, o primeiro envio da Sofia levou 255 KB do próprio plugin, e essa pasta
   muda toda hora, até ao trocar de aba.)
4. **A entrevista**: o Claude usa a skill `entrevista` pra conhecer o seu jeito, em rodadas
   curtas, e monta o `CLAUDE.md` do caderno (**até ~3 KB**, o único que carrega sempre) e, se
   precisar, arquivos por assunto. No modelo do da Sofia: título "O caderno de <seu nome>", **"O
   que vale sempre"** (lista curta), **"Os outros arquivos"** (tabela "arquivo → abrir quando") e
   **"Como este caderno é mantido"** (o Claude propõe no fim da sessão, você aprova, ele grava;
   até ~3 KB; nada da empresa, documento pessoal ou senha). Você confere e diz "confere"; o
   Claude grava direto no caderno, sem PR (é o passo 2.5 da skill `fechar`, adiantado: sem o
   caderno gravado, os passos seguintes não têm o que testar).
5. **Instalar o Obsidian**: https://obsidian.md/download.
   - **Windows**: **Windows** → abrir o arquivo baixado → **Sim**.
   - **Mac**: **macOS** → abrir o arquivo `.dmg` → arrastar o Obsidian pra pasta **Aplicativos**
     → abrir pelos Aplicativos (na primeira vez o Mac pergunta se quer mesmo abrir: **Abrir**).

   Ele abre com "Início rápido", "Criar um novo cofre", "Abrir pasta como um cofre" e "Conectar ao
   Obsidian Sync". Não clicar ainda.
6. **Trazer o caderno pro computador**: abrir o terminal (**Windows**: menu Iniciar → `Git Bash`;
   **Mac**: Spotlight, `Cmd + Espaço` → `Terminal`). Ele já abre na pasta do seu usuário. Um
   comando por vez, cada um com Enter:
   - **Baixar o caderno**: `git clone https://github.com/<seu-usuário>/segundo-cerebro.git`
     (não use o `gh repo clone`: ele precisa do GitHub CLI, que pode não estar instalado, e aí dá
     `gh: command not found`). Fica em `C:\Users\<usuário do Windows>\segundo-cerebro` ou
     `/Users/<usuário do Mac>/segundo-cerebro`. Como o caderno é privado, pode abrir uma janela
     do GitHub pedindo pra entrar ou autorizar: entrar com a conta da Sakura e aceitar.
   - **Entrar na pasta do caderno**: `cd segundo-cerebro` (certo = nenhuma resposta). Os comandos
     de baixo valem **só pra essa pasta**, por isso vêm depois deste.
   - **O fim das linhas**: `git config core.autocrlf false` (certo = nenhuma resposta). **No
     Windows isso é obrigatório**: o Git do Windows troca o fim das linhas e o Obsidian salva do
     outro jeito; sem esta linha, o Git acha que você mudou os arquivos e **para de puxar sem
     avisar** (aconteceu com a Sofia em 18/10). No Mac não faz mal.
   - **O seu nome no caderno**: `git config user.name "<seu primeiro nome>"` (certo = nenhuma
     resposta). Sem ele e sem o e-mail de baixo, o primeiro envio do passo 10 dá `Author identity
     unknown` (aconteceu com o Tiago).
   - **Achar o seu e-mail de fachada** (no navegador): https://github.com/settings/emails, com a
     conta da Sakura. Na parte **Keep my email addresses private** aparece um endereço que termina
     em `@users.noreply.github.com` (começa com um número, o seu id, e depois `+<seu-usuário>`).
     Copiar esse endereço inteiro. É ele, e não o e-mail da Sakura, que vai no caderno: assim o
     GitHub não recusa o envio por privacidade.
   - **O e-mail no caderno** (de volta no terminal): `git config user.email "<o e-mail de
     fachada>"` (certo = nenhuma resposta). **Sem `--global`**, de propósito: só vale pro caderno.
   - **Colar no Git Bash**: sempre **botão direito → Paste**. Com **Ctrl + V** aparece `^[[200~` na
     frente e o comando não roda (dá `command not found`); é só colar de novo pelo botão direito.
7. **Abrir no Obsidian**: **Abrir** (em "Abrir pasta como um cofre"; **se o Obsidian já abre
   direto num outro cofre** e essa tela não aparece: ícone de cofre no canto de baixo à esquerda →
   **Gerenciar cofres**, e ela aparece) → a pasta `segundo-cerebro`
   do passo 6 (**Windows**: Este Computador → C: → Usuários → `<usuário do Windows>`; **Mac**:
   apertar **Cmd + Shift + H**, que vai pra pasta do seu usuário) → **Selecionar pasta** (no Mac,
   **Abrir**). Aparecem os arquivos do
   caderno na coluna da esquerda. O ícone vermelho riscado no canto de baixo é o Obsidian Sync
   (pago, não usamos): ignorar.
8. **O plugin Git** (só depois do passo 7, com o `segundo-cerebro` aberto): **o plugin é por
   cofre**, então quem já instalou num outro cofre instala de novo aqui dentro. Engrenagem ⚙️
   (canto de baixo à esquerda) → **Plugins não oficiais** (é esse
   o nome em português) → em **Modo restrito**, se o botão disser "Desligar", clicar (se disser
   "Ligar", já está liberado) → **Procurar** → buscar `Git` → o **Git, por Vinzent** (antigo
   "Obsidian Git") → **Instalar** → **Ativar**. Ele fica em "Plugins instalados" com o interruptor
   roxo, e no rodapé do Obsidian aparece `✓ main`.
9. **Puxar e enviar sozinho**: engrenagem → **Plugins não oficiais** → **Git**. As opções estão
   em inglês e em páginas: **Automatic** → `Auto commit-and-sync interval (minutes)` = `10` e
   `Auto pull interval (minutes)` = `10`; setinha `<` → **Sync** → ligar **Pull on startup** (os
   dois "on commit-and-sync" já vêm ligados).
10. **Testar a ida e a volta**: o Claude grava uma nota de teste no caderno; no Obsidian,
    **Ctrl + P** (Mac: **Cmd + P**) → `Git: Pull` → aparece "Pulled 1 file from remote" e a nota.
    Apagar a nota → **Ctrl + P** (Mac: **Cmd + P**) → `Git: Commit-and-sync` → o Claude confere no
    GitHub que ela sumiu. **No primeiro envio, pode abrir uma janela do GitHub pedindo pra entrar ou
    autorizar**: aceitar; o envio fica parado até isso. **Se o `Git: Pull` der** `Your local changes
    to the following files would be overwritten by merge`, faltou a linha do `core.autocrlf` do
    passo 6: parar e pedir ao Claude, que confere com `git diff --stat origin/main` se a diferença é
    só de fim de linha antes de mandar trazer tudo do GitHub. **Se o envio for recusado** com `push declined due to email privacy
    restrictions` ou der `Author identity unknown`: faltaram as linhas do nome e do e-mail de
    fachada do passo 6. Abrir o terminal, rodar `cd segundo-cerebro` e fazer essas linhas do passo
    6; depois, repetir o `Git: Commit-and-sync`.
11. **A prova final**: abrir uma **sessão nova** do Claude na nuvem (https://claude.ai/code, no
    repositório `sakura-corp/sakura-system-ace`) e perguntar "você abriu o meu caderno?". Ela tem
    que dizer que abriu e falar do seu jeito. Se avisar que não abriu, voltar ao passo 2.
12. **Fechar**: o relatório da tarefa vai no PR, como em toda tarefa, **sem nada do conteúdo do
    caderno**, mas com **todo passo que estava diferente na tela** (nome de botão, tropeço e o
    conserto): é assim que este roteiro melhora pra quem vem depois. Pedir a revisão da Sofia.

## Como começar uma tarefa

A pessoa abre o Claude dela **dentro da pasta do repositório** e diz só o nome ou o número da
tarefa (ex: *"quero fazer a tarefa #455"*). A partir daí, o Claude:
1. **Confere quem é** e **abre o caderno da pessoa** (seção 0 do `PROJETO_STATUS.md`; no PC, o
   Claude pede licença pra ler a pasta `segundo-cerebro` na primeira vez: é só aprovar); **lê a
   issue inteira**, os comentários e este manual (e o `docs/painel.md`, se for do painel).
   **Confere o "Depende de"**: se ainda não dá pra começar, explica o motivo, escreve a mensagem
   de WhatsApp pra Sofia e para aqui.
2. **Explica em português simples**, antes de mexer em qualquer coisa:
   - o que é a tarefa e pra que ela serve na loja (ou no painel);
   - o que o Claude vai fazer sozinho (o código);
   - o que a pessoa vai precisar fazer (testar, abrir o PR), e quanto tempo deve levar.
3. **Guia a pessoa a pôr o nome dela na tarefa** no GitHub, se ainda não pôs, passo a passo.
4. Busca a versão mais nova da `main` (`git pull`) e cria a **branch da tarefa**.
5. Programa, seguindo as regras de código da seção 3 do `PROJETO_STATUS.md` e o
   `docs/estrutura.md`. Antes de mexer num módulo, lê o que o `docs/modulos.md` diz dele. Sempre
   que a pessoa precisar fazer alguma coisa que não seja só esperar o código (rodar um comando,
   testar, clicar numa tela), o Claude **guia um passo por vez, com calma**: onde clicar, o que
   digitar, o que deve aparecer, e espera ela confirmar antes do próximo passo. Nada de despejar
   dez passos de uma vez.
6. No fim, faz as conferências (abaixo), confere o "Pronto quando" da tarefa com a pessoa, item
   por item, e guia a abertura do PR e o pedido de revisão da Sofia. **Não mescla.**
7. Escreve a mensagem de WhatsApp pra Sofia (ex: *"Oi Sofia! Terminei a tarefa #455 (clientes
   que sumiram). O PR é o #490, tá esperando sua revisão."*), e a pessoa manda.

## Começar uma tarefa com o chefe (rascunho, a Sofia ainda aprova)

Cada tarefa tem uma etiqueta `chefe:<função>` (frontend, backend, seguranca, marketing ou tester).
O painel monta um link que abre uma sessão do Claude **na nuvem, no seu login**, com o texto
"Você é o chefe de <função>: use a skill `chefe-<função>`. Leia a issue inteira...". A cota usada é a sua.

- **O que você vê**: o Claude explica a tarefa em português simples, diz o que faz sozinho e o que
  vai precisar de você. Depois trabalha (chamando ajudantes por dentro da própria sessão) e, no fim,
  mostra o **PR aberto e um relatório**.
- **Cole o `/goal` que ele mostrar na primeira mensagem**: com ele, a sessão vai sozinha até o PR,
  sem você mandar "continua" (turno = cada resposta do Claude), e para no limite de turnos escrito
  nele ou quando precisar de você. Se passar do limite ou ficar repetindo, digite `/goal clear`.
- **O que o chefe faz**: lê a tarefa inteira, programa/escreve/testa, roda as conferências, abre o
  PR e **para**. Nunca mescla, nunca publica, nunca roda SQL, nunca mexe em senha, cofre ou regras.
- **O que você revisa**: o relatório (o que cada ajudante fez, o que foi testado **e visto
  reprovar**, o que ficou de fora, o que depende de alguém) e o PR. Se o relatório pedir teste no
  PC, o Claude guia você um passo por vez. Depois, pede a revisão da Sofia.
- **O relatório fica no PR**: o chefe grava o relatório num arquivo em `docs/relatorios/` (sem
  senha, CPF, preço ou dado pessoal; o repositório é público).
- **Se a sessão falhar logo no começo** com aviso de crédito, limite ou modelo indisponível (ex.:
  "requires usage credits"): digite `/model claude-opus-5-5`, Enter, e clique em **"Tentar
  novamente"**. Não mexa na issue. O passo a passo inteiro está em `docs/tarefas.md`, "Quando o
  modelo falha".
- **Como a tarefa anda é sempre igual** (skill `ritual-de-tarefa`): a sessão que você abriu é a
  **sessão mãe**; ela chama ajudantes e, se a tarefa pedir, outras sessões (as filhas), junta tudo e
  fecha com um PR só e o relatório.
- **Se a cota acabar no meio**: o chefe grava "onde parou" na descrição do PR ou da tarefa, e outra
  sessão retoma dali.
- As skills estão em `.claude/skills/chefe-*`. Melhoria nelas é **proposta**; a Sofia aprova.

## O dia a dia

**As três portas** (aprovadas pela Sofia em 18/10): tudo entra por uma delas, e por nenhuma outra.
1. **Ideia solta** (um vídeo, um print, um "e se…"): digite `/ideia`. Vira uma issue curta com a
   etiqueta `ideia`, lida na revisão do mês. Ideia sobre empresa, dinheiro, preço, sócios, dado
   pessoal ou senha não entra aqui: leve direto pra Sofia. Print não sobe, só a descrição em texto.
2. **Planejar**: só a Sofia, com o Claude, pela skill `nova-tarefa`.
3. **Fazer**: o botão "Começar com o Claude" do painel (o chefe da tarefa, depois o PR e o relatório).

- **Uma branch e um PR por tarefa**, com `Closes #N` na descrição. Commits pequenos, com mensagem
  em português dizendo o que mudou.
- **Antes do PR, o Claude roda as conferências** do programa das lojas (as mesmas que o GitHub
  roda sozinho depois, no CI):

  | Comando | O que confere |
  |---|---|
  | `npm run typecheck` | os tipos do TypeScript |
  | `npm run lint` | as regras de escrita do código |
  | `npm run test:fusos` | os testes automáticos, rodados em dois fusos horários (pega erro de dia de calendário) |
  | `npm run contraste` | o contraste das cores, pelo código |
  | `npm run contraste:telas` e `npm run largura:telas` | quando a tarefa mexe numa tela: abrem o programa e medem cor e largura de verdade (precisam do Playwright, que o Claude instala só pra rodar, sem salvar no projeto) |

  Mudou alguma coisa do Electron (`electron/`)? Também `npm run test:electron`. O painel tem as
  conferências dele (`docs/painel.md`).
- **Testar com os próprios olhos**, no programa aberto com `npm run dev` e o banco de teste: o
  Claude diz o que clicar e o que deve aparecer. O que a pessoa viu (ou o print) vai na descrição
  do PR.
- **O PR**: título curto em português, descrição com o que mudou, como foi testado e o que **não**
  foi testado. Pede a revisão da **Sofia** e **para**. Enquanto ela não revisa, a pessoa pode
  pegar outra tarefa da leva, sem mexer no PR que está esperando.
- **Ela pediu mudança no PR**: o Claude ajusta na mesma branch, roda as conferências de novo,
  envia e pede a revisão de novo.
- **O CI ficou vermelho** (o "X" no PR): o Claude lê o erro, conserta e envia. Nunca desligar ou
  pular um teste pra ficar verde.

## O que nunca fazer (e a quem perguntar)

As regras completas são as da seção 0 do `PROJETO_STATUS.md`. Em resumo, **nunca**:
- **mesclar** um PR (nem o próprio), nem mexer direto na `main`;
- **publicar ou liberar** versão, nem disparar o "Atualizar o banco";
- **rodar SQL ou migration** em Supabase nenhum, **nem no de teste**. Se a tarefa precisar de
  migration, ela vem escrita no PR, e quem aplica é a Sofia;
- usar o banco de uma loja (o `.env` aponta **só** pro Supabase de teste);
- mexer em versão publicada, tag, senha (secret), cofre (environment), regra do repositório
  (ruleset) ou configuração, nem por um workflow novo ou modificado;
- pôr no repositório **senha, chave, token, certificado**, nome civil, CPF, endereço, preço ou
  dado de cliente de verdade. **O repositório é público**: qualquer pessoa lê, e apagar depois não
  resolve. As travas de segredo do Git barram as chaves conhecidas, mas não pegam tudo;
- mexer no "Onde parou" do `PROJETO_STATUS.md` (é da Sofia);
- adicionar à sessão o repositório privado da empresa.

**Dúvida, ou a tarefa pede alguma dessas coisas?** Para e pergunta pra **Sofia**, pelo WhatsApp:
o Claude escreve a mensagem curta, a pessoa só copia e manda. Dúvida sobre o código, o Claude
responde; dúvida sobre **o que** a tarefa quer, é com a Sofia.

## Tamanho da leva

Todo PR da equipe espera a **Sofia revisar**, e ela revisa os três. Por isso:
- a leva tem **só as tarefas que cabem no tempo dela de revisar**; quando a leva acaba, ela
  congela, todo mundo testa e só então vem a próxima (`docs/painel.md`, "Fim de uma leva");
- **um PR pequeno por tarefa**: uma tarefa que cresceu demais vira duas (o Claude avisa a pessoa,
  e a pessoa avisa a Sofia), em vez de um PR enorme;
- PR esperando revisão **não é atraso de ninguém**: é o ritmo combinado.
