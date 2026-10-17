# Manual da equipe

Pra quem entra na equipe da Sakura, em **Windows ou Mac**. As regras valem por cima de tudo e
estão na **seção 0 do `PROJETO_STATUS.md`**; este manual explica como trabalhar com elas.

- **Quem faz o quê**: o Gustavo trabalha **só no painel** (`painel/`, com o manual dele em
  `docs/painel.md`); os outros dois, **no programa das lojas** (o resto do repositório), sempre
  contra o **Supabase de teste**, nunca o banco de uma loja.
- **Antes de ter acesso ao código**, cada um assina o Termo de Colaboração (detalhe no privado).
- **Programar e ajustar código é com o Claude.** O resto (instalar, rodar comando, testar, abrir
  PR) a pessoa faz, guiada pelo Claude **um passo por vez**.
- **As tarefas** são as issues do GitHub, já planejadas pela Sofia com o Claude dela: o que fazer,
  em quais arquivos, `Estimativa: N h`, "Pronto quando" e o que não fazer. Como a equipe se
  organiza em levas: `docs/painel.md`, "Como a equipe trabalha".

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

## Como começar uma tarefa

A pessoa abre o Claude dela **dentro da pasta do repositório** e diz só o nome ou o número da
tarefa (ex: *"quero fazer a tarefa #455"*). A partir daí, o Claude:
1. **Confere quem é** (seção 0 do `PROJETO_STATUS.md`) e **lê a issue inteira**, os comentários e
   este manual (e o `docs/painel.md`, se for do painel). **Confere o "Depende de"**: se ainda não
   dá pra começar, explica o motivo, escreve a mensagem de WhatsApp pra Sofia e para aqui.
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
- **O que o chefe faz**: lê a tarefa inteira, programa/escreve/testa, roda as conferências, abre o
  PR e **para**. Nunca mescla, nunca publica, nunca roda SQL, nunca mexe em senha, cofre ou regras.
- **O que você revisa**: o relatório (o que cada ajudante fez, o que foi testado **e visto
  reprovar**, o que ficou de fora, o que depende de alguém) e o PR. Se o relatório pedir teste no
  PC, o Claude guia você um passo por vez. Depois, pede a revisão da Sofia.
- **Se a cota acabar no meio**: o chefe grava "onde parou" na descrição do PR ou da tarefa, e outra
  sessão retoma dali.
- As skills estão em `.claude/skills/chefe-*`. Melhoria nelas é **proposta**; a Sofia aprova.

## O dia a dia

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
