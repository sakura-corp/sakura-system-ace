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

**Pra que serve**: os dois da equipe que vão mexer no programa das lojas (tarefa #474, etapa 4)
precisam de um banco pra rodar o programa com `npm run dev`, cheio de dado com cara de loja, onde
errar não custa nada. É este. Cada um tem um login próprio, só com os módulos do dia a dia.

**Quem faz**: a Sofia, guiada, um passo por vez (uns 40 minutos). O Claude não alcança o painel do
Supabase. **Os scripts precisam estar na `main`** antes (os links abaixo apontam pra ela).

**O que já foi provado** (num Postgres local, `npm run test:sql -- dados-de-exemplo`): os scripts
rodam, rodar duas vezes não duplica nada, as travas param com a mensagem certa, o login da equipe só
enxerga a loja de exemplo, e o "zerar" volta tudo ao começo. **O que não foi provado**: os cliques no
painel do Supabase (as telas podem ter mudado de nome) e o programa aberto contra este banco.

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

Dentro da `Sakura Teste` → **New project**:

| Campo | O que colocar |
|---|---|
| Organization | `Sakura Teste` (**confira**: não pode ser a organização das lojas) |
| Project name | `ssace-teste` |
| Database Password | clique em **Generate a password** → copie → salve no Bitwarden, item `Supabase ssace-teste – senha do banco` |
| Region | South America (São Paulo) |

Clique em **Create new project** e espere uns 2 minutos, até sumir o "Setting up project".

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

Deve terminar sem nenhuma linha `ERROR`. Avisos `NOTICE: ... does not exist, skipping` são normais.

## Passo 4 — Ajustar o login (2 cliques)

**Authentication** → **Sign In / Providers** → **Email**:

| Opção | Como deixar |
|---|---|
| Enable email provider | **ligado** |
| Confirm email | **desligado** (os e-mails são inventados, `@sakura.local`; ninguém confirmaria) |

**Save**.

## Passo 5 — Os dados de exemplo

1. Abra e confira que o texto termina em `' peças.' as resultado;` (veio inteiro):
   `https://raw.githubusercontent.com/sakura-corp/sakura-system-ace/main/supabase/exemplo/dados-de-exemplo.sql`
2. **SQL Editor** → **New query** → cole → **Run**.

Embaixo deve aparecer: **"Dados de exemplo prontos: 8 clientes, 12 ordens, 12 peças."**

Se aparecer uma frase começando com **"PAREI"**, o script não gravou nada. Leia a frase: quase
sempre é sinal de que você está no projeto errado. Me mande o print.

## Passo 6 — Os três logins (um de cada vez)

São três: **o seu** (admin, pra mexer em Configurações quando uma tarefa pedir) e **um pra cada
pessoa da equipe** que mexe no programa. A senha nasce no Bitwarden e não passa por mais lugar
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
| `v_admin` | `false` | `true` |

**Run**. Embaixo aparece a lista de quem entra no programa e em quais lojas. A pessoa da equipe deve
aparecer com `admin = false` e **só** a loja `Autocenter Exemplo (TESTE)`; você, com `admin = true`
e as duas lojas.

**O que a pessoa da equipe enxerga**: Início, Clientes, Ordens de Serviço, Estoque, Fornecedores,
Serviços, Caixa, Contas a Pagar e a Receber, Relações e Garantias. **Não enxerga**: Configurações
(só admin), Notas Fiscais e Funcionários. Se uma tarefa precisar de um módulo a mais, você marca em
**Configurações → Operadores**, entrando no programa com o seu login de teste.

> Por que não criar os logins pela tela **Configurações → Operadores** do programa? Porque, olhando
> o código em 16/10, essa tela parece só funcionar no `npm run dev` e não no programa instalado (ela
> lê o endereço do banco do `.env`, que o instalado não tem). Ainda não foi testado; está anotado
> pra virar tarefa. Pelo Supabase + script funciona nos dois.

## Passo 7 — Entregar a chave pra cada pessoa

**Project Settings** → **API** (ou **API Keys**). Você vai precisar de duas coisas:

| O quê | Onde está | Vai pra equipe? |
|---|---|---|
| Project URL | `https://xxxxxxxx.supabase.co` | sim |
| anon / publishable key | a chave marcada **anon** ou **publishable** | sim |
| service_role / secret | a chave marcada **secret** | **NUNCA**. Nem você precisa dela pra isto |

No Bitwarden: **Send** → **New Send** → **Text**, um por pessoa:

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

**Quando sair migration nova**: colar de novo o `instalacao-completa.sql` (Passo 3) no
`ssace-teste`. É seguro rodar de novo. Faça isso **antes** de a equipe testar o PR que depende da
migration. (Pôr o teste no botão "Atualizar o banco de todas as empresas" seria mexer no cofre, e
fica pra você decidir se vale.)

**Começar do zero de verdade** (raro): Project Settings → General → **Delete project**, e refazer
do Passo 2. Os logins somem junto; refaça o Passo 6 e mande Sends novos.

**Alguém saiu da equipe**: Authentication → Users → a pessoa → **Delete user**. Ela deixa de
entrar na hora.

## Se der erro

| O que aparece | O que é |
|---|---|
| `PAREI: este banco tem token da Focus NFe...` / `...nota em produção` / `...nota fiscal registrada` | você está no projeto de uma loja. Não rode nada; troque pro `ssace-teste` |
| `PAREI: este banco já tem clientes cadastrados e nunca recebeu os dados de exemplo` | idem, ou um banco que já foi usado. Me mande o print |
| `PAREI: a loja de exemplo ainda não existe` | rode o Passo 5 antes do Passo 6 |
| `PAREI: faltou trocar o usuário e o nome` | troque as linhas `<<< TROCAR` do `ligar-login.sql` |
| `PAREI: não achei o login <usuario>@sakura.local` | o e-mail do Passo 6b está diferente (um espaço a mais, outro domínio, outro usuário) |
| `Email logins are disabled` no programa | o Passo 4 não foi salvo |
| o programa não conecta depois de uma semana parado | projeto pausado: entrar no projeto → **Restore project** |
