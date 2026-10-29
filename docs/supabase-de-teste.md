# O Supabase de teste da equipe ("ssace-teste")

> ## ⛔ ESTE BANCO NUNCA RECEBE DADO DE CLIENTE DE VERDADE
>
> Nada da Pneus Amigão nem de loja nenhuma: nem cliente, nem placa, nem nota, nem planilha
> "só pra testar a importação". Tudo aqui é inventado (`supabase/exemplo/dados-de-exemplo.sql`).
> Quem programa da equipe enxerga **só este banco**. A chave dele vai pelo Bitwarden Send, nunca
> por WhatsApp, e-mail ou repositório.
>
> E o contrário também: **nenhum script de `supabase/exemplo/` vai no banco de uma loja.** Eles têm
> trava (param se o banco tiver token da Focus NFe, nota, ou OS de outra loja), mas a trava é a
> segunda proteção, não a primeira.

**Pra que serve**: os três da equipe, que mexem no programa das lojas (tarefa #474, etapa 4)
precisam de um banco pra rodar o programa com `npm run dev`, cheio de dado com cara de loja, onde
errar não custa nada. É este. Cada um tem um login próprio, **admin neste banco** (desde 29/10/2026,
veja "Teste de permissão", no Passo 6), pra criar sozinho os logins de perfil que um teste pedir.

**Quem faz**: a Sofia, guiada, um passo por vez (uns 40 minutos). O Claude não alcança o painel do
Supabase. **Os scripts precisam estar na `main`** antes (os links abaixo apontam pra ela).

**O que já foi provado** (num Postgres local, `npm run test:sql -- dados-de-exemplo`): os scripts
rodam, rodar duas vezes não duplica nada, as travas param com a mensagem certa, o login da equipe só
enxerga a loja de exemplo, e o "zerar" volta tudo ao começo. **O que não foi provado**: os cliques no
painel do Supabase (as telas podem ter mudado de nome) e o programa aberto contra este banco.

**Situação (19/10/2026)**: os passos 1 a 7 foram feitos pela Sofia, e as telas já estão descritas
como eram nesse dia (a #517). O banco existe, com o esquema na versão 64, a loja de exemplo e quatro
logins (`sofia`, admin; `gustavo`, `lazaro` e `tiago`, sem admin, só a loja de exemplo). **Em 22/10/2026** a Sofia colou de novo o `instalacao-completa.sql`: o esquema está na **67** (com a 0065, a 0066 e a 0067 da leva 3), sem nenhum `ERROR`. **Em 28/10/2026**, colado da branch do PR #818 (a #367): o esquema está na **76**. Com a 0076, login sem o módulo OS não lê as OS, e o código da `main` mostra o lucro do Caixa zerado pra ele até o #818 entrar. **Em 29/10/2026** a Sofia decidiu que a equipe vira admin neste banco, pros testes de permissão (Passo 6, "Teste de permissão"). Os Sends
ficaram prontos, mas ela só manda os links quando o caderno (`segundo-cerebro`) de cada um estiver
pronto; eles vencem em 26/10, e depois disso é só criar um Send novo com o mesmo texto.

---

## Passo 1 — Uma organização grátis, separada

**Por quê**: no Supabase quem paga é a **organização**. Se a sua organização das lojas está no
plano pago, um projeto novo lá dentro **custa a mais** todo mês (cada projeto ganha a própria
máquina). Numa organização separada, no plano grátis, o teste não custa nada.

Painel do Supabase → no topo, o nome da organização → **New organization**:

| Campo | O que colocar |
|---|---|
| Name | `Sakura Teste` |
| Type | Personal (ou o que vier marcado) |
| Plan | **Free** (o de US$ 0) |

Clique em **Create organization**. Deve aparecer a organização nova, vazia.

> Se o painel disser que você já está no limite de projetos grátis: pare e me mande um print. Não
> resolva passando pro plano pago sem a gente conversar.

## Passo 2 — O projeto

Dentro da `Sakura Teste` → **New project**. Se aparecer "You need additional permissions to create
a project" logo depois de criar a organização, é o painel que ainda não percebeu que você é a dona:
**Cancel**, **F5**, e **New project** de novo.

| Campo | O que colocar |
|---|---|
| Organization | `Sakura Teste` (**confira**: não pode ser a organização das lojas) |
| Project name | `ssace-teste` |
| Database Password | clique em **Generate a password** → copie → salve no Bitwarden, item `Supabase ssace-teste – senha do banco` |
| GitHub (optional) | deixar em branco |
| Region | clique em **Need a specific region?** → South America (São Paulo) |
| Enable Data API | **ligado** (o programa conversa com o banco por aqui) |
| Automatically expose new tables | **ligado**, mesmo com o Supabase recomendando desligar: o `instalacao-completa.sql` conta com isso pra liberar as tabelas pro programa (só tem `grant` explícito em uma). Quem protege os dados são as regras de RLS que o próprio script cria |
| Enable automatic RLS | **desligado** (o script cuida disso, tabela por tabela, igual nas lojas) |

Não mexer em **Advanced configuration**. Clique em **Create new project** e espere uns 2 minutos, até sumir o "Setting up project".

**Não fazer**:
- **Não ligar cobrança** nem "Upgrade to Pro" neste projeto ou nesta organização.
- **Não usar** o projeto de nenhuma loja, nem "só por um dia".
- **Não colocar** este projeto no `BACKUP_EMPRESAS` nem no botão "Atualizar o banco de todas as
  empresas": ele não é empresa (como ele recebe migration nova, está no Passo 9).

**Saber**: projeto grátis **pausa sozinho depois de uns 7 dias sem uso**. Se a equipe ficar uma
semana parada, o programa para de conectar; aí é entrar no projeto e clicar em **Restore project**
(os dados ficam). O número certo é o que a tela de preço do Supabase mostrar hoje.

## Passo 3 — Instalar o sistema no banco

1. Abra este link e confira que a **última linha** do texto é um `insert into schema_versao ...`
   (é o jeito de saber que veio inteiro):
   `https://raw.githubusercontent.com/sakura-corp/sakura-system-ace/main/supabase/instalacao/instalacao-completa.sql`
2. Selecione tudo (Ctrl+A), copie.
3. No `ssace-teste`: **SQL Editor** → **New query** → cole → **Run**.

Antes de rodar, o Supabase mostra "Potential issues detected" (operações destrutivas, e a tabela
`travas_resultado` sem RLS): clique em **Run without RLS**. A `travas_resultado` é uma tabela
temporária, que só mostra o resultado das travas e some no fim; o botão verde mexeria no script.

Deve terminar sem nenhuma linha `ERROR`, com uma tabelinha de travas, todas **"criada"**. Pra
confirmar que rodou até o fim: **New query** → `select max(versao) from schema_versao;` → tem que
dar o número da última linha do script (64 em 19/10/2026).

## Passo 4 — Ajustar o login (2 cliques)

**Authentication** → **Sign In / Providers**. Em 19/10/2026 as duas opções ficavam em lugares
diferentes da mesma página:

| Opção | Onde | Como deixar |
|---|---|---|
| Email | lista **Auth Providers**, embaixo | **Enabled** (já vem assim) |
| Confirm email | seção **User Signups**, em cima | **desligado** (os e-mails são inventados, `@sakura.local`; ninguém confirmaria) |
| Allow new users to sign up | seção **User Signups** | **ligado** (a tela de Operadores do programa cria login por aqui) |

**Save changes**: aparece "Successfully updated settings".

## Passo 5 — Os dados de exemplo

1. Abra e confira que o texto termina em `' peças.' as resultado;` (veio inteiro):
   `https://raw.githubusercontent.com/sakura-corp/sakura-system-ace/main/supabase/exemplo/dados-de-exemplo.sql`
2. **SQL Editor** → **New query** → cole → **Run**.

Embaixo deve aparecer: **"Dados de exemplo prontos: 8 clientes, 14 ordens, 12 peças."**

Se aparecer uma frase começando com **"PAREI"**, o script não gravou nada. Leia a frase: quase
sempre é sinal de que você está no projeto errado. Me mande o print.

## Passo 6 — Os logins (um de cada vez)

São quatro: **o seu** e **um pra cada pessoa da equipe** (Gustavo, Lázaro e Tiago). **Todos admin
neste banco** (Sofia, 29/10/2026; antes de 29/10 a equipe era sem admin): veja "Teste de
permissão", no fim deste passo. Dá pra criar as senhas e os usuários
de todos primeiro e depois rodar o `ligar-login.sql` uma vez por pessoa, na mesma aba, trocando só
as três linhas. A senha nasce no Bitwarden e não passa por mais lugar
nenhum.

Pra **cada** pessoa, nesta ordem:

**a) A senha.** No Bitwarden: **New → Login**:

| Campo | O que colocar |
|---|---|
| Name | `SSACE teste – login <usuario>` |
| Username | `<usuario>` (minúsculo, sem acento, sem espaço: ex. o primeiro nome) |
| Password | botão de **gerar senha** (16 caracteres) |

**Save**. Copie a senha.

**b) O login no Supabase.** **Authentication** → **Users** → **Add user** → **Create new user**:

| Campo | O que colocar |
|---|---|
| Email | `<usuario>@sakura.local` |
| Password | a senha do Bitwarden |
| Auto Confirm User | **ligado** |

**Create user**. A pessoa aparece na lista.

**c) Ligar o login ao programa.** Abra
`https://raw.githubusercontent.com/sakura-corp/sakura-system-ace/main/supabase/exemplo/ligar-login.sql`,
copie tudo, **SQL Editor** → **New query** → cole. **Antes do Run**, troque só as três linhas
marcadas com `<<< TROCAR`:

| Linha | Pra equipe | Pra você |
|---|---|---|
| `v_usuario` | `'<usuario>'` (o mesmo do e-mail, sem o `@sakura.local`) | `'sofia'` (ou o que você usou) |
| `v_nome` | `'Nome Como Aparece'` | `'Sofia'` |
| `v_admin` | `true` (desde 29/10/2026) | `true` |

**Run**. Embaixo aparece a lista de quem entra no programa e em quais lojas. Todo mundo deve
aparecer com `admin = true` e as duas lojas (a de exemplo e a Loja 1, as duas inventadas).

**Já tem o login criado e só quer virar admin** (a mudança de 29/10)? Só o passo c), com a mesma
pessoa e `v_admin = true`: rodar de novo não duplica nada, só atualiza.

**O que a pessoa da equipe enxerga**: tudo, como você, porque é admin **só neste banco** (nas lojas,
ninguém da equipe tem login). Inclusive Configurações → Operadores, que é o que resolve o teste de
permissão (abaixo).

**Teste de permissão** (Sofia, 29/10/2026). Muita tarefa pede "testar com um login só com o módulo X"
(ex.: o #818 pedia um login só com Caixa, um só com Garantias e um só com Notas Fiscais). Antes, só
você conseguia montar esses logins, e a pessoa ficava parada te esperando. Agora quem testa monta
sozinho, **pelo próprio programa**, no `npm run dev`: **Configurações → + Novo operador** (a parte dos operadores),
com só o módulo que o teste pede, e entra com ele. Não é SQL nem migration: a regra "a equipe não
roda SQL" continua igual. O passo a passo pra pessoa está no `docs/equipe.md` ("Teste de
permissão"). Os combinados:
- **Teste de permissão é sempre com o login do perfil, nunca com o próprio** (admin vê tudo, e o
  teste passaria sem provar nada).
- O nome do login de perfil começa com o da pessoa (`gustavo-caixa`, `tiago-notas`), pra um não
  mexer no do outro no meio de um teste.
- **Ninguém salva token da Focus NFe neste banco** sem falar com você: com token guardado, os scripts
  de `supabase/exemplo/` param de propósito (a tabela de erros, no fim).
- Se alguém bagunçar o exemplo, o "zerar" (Passo 9) volta tudo, e os logins continuam valendo.

**Se uma tarefa pedir um login administrador**: é o próprio login da pessoa (já é admin aqui).

> A tela **Configurações → Operadores** lê o endereço do banco da mesma conexão do resto do programa
> (`src/lib/operadores.ts`, `criarClienteTemporario`), então funciona no `npm run dev` da equipe.
> Os quatro logins da equipe continuam sendo criados pelo Supabase + `ligar-login.sql` (os passos
> acima), porque é por eles que a equipe entra pela primeira vez.

## Passo 7 — Entregar a chave pra cada pessoa

**Project Settings** (a engrenagem, embaixo no menu da esquerda) → **API Keys**. Use a aba
**Legacy anon, service_role API keys** e a chave **anon** (`eyJ…`): é a mesma que as lojas usam.
A **publishable** (`sb_publishable_…`) também funciona com o programa, mas não é a das lojas.
Você vai precisar de duas coisas:

| O quê | Onde está | Vai pra equipe? |
|---|---|---|
| Project URL | `https://xxxxxxxx.supabase.co` | sim |
| anon / publishable key | a chave marcada **anon** ou **publishable** | sim |
| service_role / secret | a chave marcada **secret** | **NUNCA**. Nem você precisa dela pra isto |

No Bitwarden: **Send** → **New Send** → **Text**, um por pessoa. O Send **não** está no botão
**Adicionar** do cofre (esse cria item guardado): na extensão é o ícone **Send** na barra de baixo; no
site, **Send** no menu da esquerda. Em português: **Send nome**, **Texto para compartilhar**,
**Ocultar texto por padrão**, **Número máximo de acessos**.

| Campo | O que colocar |
|---|---|
| Name | `SSACE teste – <usuario>` |
| Text | as 4 linhas abaixo, preenchidas |
| Deletion date | 7 dias |
| Maximum access count | 2 |
| Hide text by default | ligado |

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=a-chave-anon-ou-publishable
usuario: <usuario>
senha: <a senha do Bitwarden>
```

Copie o link do Send e mande pra pessoa (o link pode ir por WhatsApp; o texto, não).

## Passo 8 — Como cada pessoa aponta o programa pro banco de teste

No computador dela, dentro da pasta do `sakura-system-ace` (o manual da equipe tem o passo a passo
de instalar):

1. Copiar o modelo: `cp .env.example .env` (no Windows: `copy .env.example .env`).
2. Abrir o `.env` e colar as **duas primeiras linhas** do Send (`VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`).
3. Conferir que o Git não vai levar esse arquivo: `git check-ignore .env` tem que responder `.env`.
   (Ele está no `.gitignore`, assim como `.env.local` e qualquer `.env.*`.)
4. `npm run dev` → o programa abre → entrar com o usuário e a senha do Send.

Deve aparecer a loja **Autocenter Exemplo (TESTE)** com OS em andamento, vendas do dia e contas
atrasadas. O `.env` só vale no `npm run dev`; ninguém da equipe instala o programa das lojas
apontando pra banco nenhum.

## Passo 9 — Manter

**Zerar e recomeçar** (quando a loja de exemplo ficar bagunçada de tanto teste): SQL Editor →
cole e rode `supabase/exemplo/apagar-dados-de-exemplo.sql`, depois rode de novo o
`dados-de-exemplo.sql` (Passo 5). O Supabase vai avisar que a consulta apaga dados
("destructive operation"): é esperado, confirme. Os logins continuam valendo; ninguém precisa ser ligado de novo.
O que a equipe cadastrou fora do exemplo (um cliente novo, por exemplo) fica, e não atrapalha.

**Rodar o exemplo de novo sem "zerar"** só acrescenta o que falta, e **só se ninguém mexeu nas ordens de
exemplo**. Se a equipe apagou uma OS de exemplo ou abriu uma nova no meio (o número dela pode coincidir
com o de uma do exemplo), o script pode parar com erro: aí use o "zerar e recomeçar" acima.

**Quando sair migration nova**: colar de novo o `instalacao-completa.sql` (Passo 3) no
`ssace-teste`. É seguro rodar de novo. Faça isso **antes** de a equipe testar o PR que depende da
migration. (O teste fica **fora** do botão "Atualizar o banco de todas as empresas": decidido pela Sofia em
19/10/2026, #517.)

**Migration que ainda está num PR** (não chegou na `main`): o link do Passo 3 traz a instalação
**da `main`**, sem ela. Use o mesmo endereço trocando `main` pelo nome da branch do PR, por exemplo
`https://raw.githubusercontent.com/sakura-corp/sakura-system-ace/<branch-do-pr>/supabase/instalacao/instalacao-completa.sql`.
Antes, confira que a branch está em dia com a `main` (senão falta migration de outro PR) e que a
última linha traz o número **novo** (`values (71)`, por exemplo). Feito assim pela primeira vez em
27/10/2026, na 0071 do PR #802.

**Começar do zero de verdade** (raro): Project Settings → General → **Delete project**, e refazer
do Passo 2. Os logins somem junto; refaça o Passo 6 e mande Sends novos.

**Alguém saiu da equipe**: Authentication → Users → a pessoa → **Delete user**. Ela deixa de
entrar na hora.

## Se der erro

| O que aparece | O que é |
|---|---|
| `PAREI: este banco tem token da Focus NFe...` / `...nota em produção` / `...nota fiscal registrada` | você está no projeto de uma loja. Não rode nada; troque pro `ssace-teste` |
| `PAREI: este banco já tem clientes cadastrados e nunca recebeu os dados de exemplo` | idem, ou um banco que já foi usado. Me mande o print |
| `PAREI: este banco tem token da Focus NFe guardado` (e você sabe que é o `ssace-teste`) | você, como admin, salvou um token de **homologação** pra testar nota fiscal. Os scripts de exemplo e o `ligar-login.sql` param de propósito quando acham token, porque não sabem se é banco de loja. Me chame: a gente tira o token do teste (ou decide o que fazer) antes de rodar de novo |
| `PAREI: este banco tem ordem de serviço fora da loja de exemplo` | no `ssace-teste`, alguém abriu OS na "Loja 1" (é por isso que a equipe só tem a loja de exemplo). Me chame: a gente apaga essa OS e roda de novo |
| `PAREI: a loja de exemplo ainda não existe` | rode o Passo 5 antes do Passo 6 |
| `PAREI: faltou trocar o usuário e o nome` | troque as linhas `<<< TROCAR` do `ligar-login.sql` |
| `PAREI: não achei o login <usuario>@sakura.local` | o e-mail do Passo 6b está diferente (um espaço a mais, outro domínio, outro usuário) |
| `Email logins are disabled` no programa | o Passo 4 não foi salvo |
| `Invalid API key` na tela de login | não é o usuário nem a senha: o endereço (`VITE_SUPABASE_URL`) ou a chave (`VITE_SUPABASE_ANON_KEY`) do `.env` está errado. Confira letra por letra com o Send (em 29/10 foi um erro de digitação na URL) e rode o `npm run dev` de novo. Se o problema fosse o login, a mensagem seria `Invalid login credentials` |
| o programa não conecta depois de uma semana parado | projeto pausado: entrar no projeto → **Restore project** |
