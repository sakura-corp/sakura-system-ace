# Operação: rodar, instalar, publicar, backup

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md` (carrega sozinho em toda sessão);
> este arquivo só é aberto quando o assunto pede. Os números de seção e de item citados aqui
> ("item 33 da seção 6") continuam valendo: a seção 6 é `docs/licoes.md`, a 5 é `docs/banco.md`,
> a 7 é `docs/modulos.md`, a 8 é `docs/pendencias-e-futuro.md` e a 9 é `docs/operacao.md`.

## 9. Como rodar e operar

### Rodar no computador

```bash
git clone https://github.com/sakura-corp/sakura-system-ace.git
cd sakura-system-ace
npm install
cp .env.example .env   # VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (a chave anon/publishable)
npm run dev            # abre o programa no Electron, com DevTools
```

O `.env` só vale no `npm run dev`; o programa instalado pede a conexão na primeira abertura (seção
7). **Quem é da equipe não usa o banco de verdade** (ver `EQUIPE.md` no privado); o painel nem
usa banco.

### Em que versão está o banco de cada empresa

**Hoje só existe uma empresa: a Pneus Amigão, com `0001` a `0064` aplicadas** (26/09/2026). Daqui
pra frente, migration entra **pelo botão "Atualizar o banco de todas as empresas"** (abaixo), nunca
colada à mão no SQL Editor. Pra saber a versão de um banco: a tabela `schema_versao`, a tela de
Diagnóstico ou um ensaio do botão.

**A ordem de sempre**: primeiro o banco, depois a versão do programa (a versão nova pode ler coluna
que só existe depois da migration). A exceção é a migration que declara
`-- versao-minima-do-programa: X` (seção 4): essa espera o programa chegar em X.

**Se um dia precisar colar algo à mão** (migration antiga num banco anterior à `0055`, ou uma Edge
Function): mandar o link `raw.githubusercontent.com/...` e pedir pra ela conferir a **última
linha** antes do Run. Copiar da pré-visualização da conversa cortou a `0057` na linha 100, e o
Postgres recusou com `unterminated dollar-quoted string` (nada foi aplicado).

### Validar uma migration nova (aqui na sessão, antes do PR)

O ambiente da sessão tem Postgres. `supabase/scripts/stub-supabase-local.sql` cria os schemas
`auth` e `storage` e as permissões que o Supabase dá sozinho, inclusive pra simular login e testar
RLS: `set local role authenticated` + `set local "request.jwt.claim.sub"`, **dentro de uma
transação** (fora dela o `set local` não pega e o teste roda como superusuário, que ignora RLS).

```bash
service postgresql start
sudo -u postgres psql -c "alter user postgres password 'postgres'"
npm run test:rls   # a matriz de RLS: obrigatória se a migration mexe em policy
npm run test:sql   # os supabase/scripts/testar-*.sql
```

O `testar-*.sql` novo termina com `raise notice 'TODAS AS CHECAGENS PASSARAM'` (sem a frase, o
runner reprova) e testa **as duas metades**: o que a migration recusa e o que ela ainda precisa
deixar passar. No Windows dela nada disso roda; no CI roda sozinho.

### Instalar uma empresa nova

**O passo a passo completo é o `supabase/instalacao/INSTALAR-LOJA-NOVA.md`**, o checklist que ela
segue ao vender. Não reescrever aqui; o essencial pra uma sessão entender:

- **Banco**: colar **um arquivo só**, `supabase/instalacao/instalacao-completa.sql`, no SQL Editor.
  Ele é gerado das migrations por `npm run gerar-instalacao`, e o `npm test` reprova se estiver
  atrasado. Colar as migrations uma por uma foi abandonado: pular uma não dá erro na hora, só quebra
  depois, na tela.
- **Auth, dois passos manuais** (também documentados na `0007_operadores.sql`):
  1. Authentication → Sign In / Providers: "Enable email provider" **ligado** e "Confirm email"
     **desligado** (os e-mails são inventados; ninguém confirmaria).
  2. Criar o primeiro admin (Authentication → Users → Add user) e rodar o `insert` comentado no fim
     da `0007`, com o "User UID" gerado, **e o vínculo em `operador_lojas`** (item 37 da seção 6: é
     o erro mais fácil de cometer).
- **Edge Functions**: `redefinir-senha-operador` e `focus-nfe` (abaixo). A `ler-notas-fiscais`
  **não** vai nas lojas novas (decisão de 27/09).
- **Backup e botão**: mais um bloco no `BACKUP_EMPRESAS`, **nos dois cofres** (abaixo).
- **Computadores**: instalar pelo `SakuraSystem-Setup.exe` e colar URL e chave do projeto na tela
  de conexão.
- **Nota fiscal**: o playbook do item 1 da seção 8, que é a parte demorada (SEFAZ, prefeitura e a
  contabilidade do cliente).

### Publicar uma Edge Function (a pegadinha do nome)

Painel do projeto → **Edge Functions** → **"Deploy a new function"** → **"Via Editor"** → digitar o
nome (ex: `focus-nfe`) **no campo "Function name" ANTES de clicar em Deploy** → apagar o exemplo,
colar todo o `supabase/functions/<nome>/index.ts` → **Deploy function**.

**O campo "Name" das configurações é só um apelido**: renomear ali não muda o endereço ("Your slug
and endpoint URL will remain the same"). Função publicada com o nome errado tem que ser **apagada e
recriada**. Na dúvida, conferir o endereço nos exemplos de `curl` da tela.

- **`redefinir-senha-operador`**: sem secret (usa as chaves que o Supabase injeta). Teste:
  Configurações → Operadores → "Redefinir senha" → entrar com a senha temporária → aparece "Crie
  uma senha nova".
- **`focus-nfe`** (o porteiro, `TR-04.2`): sem secret (o token vem do cofre no banco). **Tem que
  estar publicada antes de a loja emitir nota.** Conferir: Configurações → Dados fiscais mostra
  "✓ Já existe um token cadastrado" com o campo vazio. Se aparecer:
  - "falta publicar o porteiro" → a função não foi publicada, ou saiu com outro nome;
  - "Token do Focus NFe não configurado" → a loja não tem token: colar em Configurações → Dados
    fiscais;
  - "Você não tem permissão..." → o operador não tem o módulo Ordens de Serviço nem Notas Fiscais
    (cancelar exige Notas Fiscais).
- **`ler-notas-fiscais`** (o "Importar por foto"): **desligado no programa desde 25/09**, a pedido
  dela (`IMPORTAR_POR_FOTO_LIGADO` em `ProdutosSection.tsx`; seção 7, Estoque). Religar é decisão
  dela, e exige o secret `ANTHROPIC_API_KEY` na função (chave criada em `console.anthropic.com`).

**A parte 2 do `TR-04.2`**: uma migration que apaga a cópia antiga do token, que ainda fica na
tabela de configurações (é o que permitiria voltar pra antes da `v0.9.41` sem parar a emissão). A
condição, uma nota emitida e outra cancelada pelo porteiro, foi cumprida em 28/09 (NFS-e 22).
**Fazer quando ela pedir.**

### Backup do banco (`TR-12.1`)

Todo dia às 3h, o `backup-banco.yml` tira uma cópia do banco de **cada empresa**, cifrada, e guarda
**em dois lugares fora do Supabase**: o repositório privado `caranovavidanova/ssace-backups` (anexo
de release) e o Cloudflare R2. Ficam **30 diárias + a primeira de cada um dos últimos 12 meses**.
Dentro de cada cópia: o schema `public` com as permissões, `auth.users` (senão ninguém entra no
banco restaurado) e os XMLs das notas fiscais. A chave que **abre** não está no GitHub (está no
Bitwarden dela).

**Pra que, se o Supabase já faz backup**: o Pro guarda só os **últimos 7 dias**.

**Restaurar**: `RESTAURAR-BACKUP.md`. A primeira tabela manda **não** usar backup na maioria dos
casos: "apaguei uma OS sem querer" se resolve na Auditoria, em minutos.

#### Os secrets: nos cofres (Settings → Environments)

Desde 30/09/2026, em **cofres**, não soltos no repositório. O cofre **`backup`** abre só pra
`main`, sem aprovação (o backup roda sozinho), e guarda os 8 abaixo. O cofre **`lojas`** abre só
pra `main` **e espera a aprovação dela**: é o do Release, do Liberar e do Atualizar bancos, e
guarda uma cópia do `BACKUP_EMPRESAS`. **Trocar o `BACKUP_EMPRESAS` é trocar nos dois.** Os valores
estão no Bitwarden dela, pasta "Sakura System".

| Nome | O que é |
|---|---|
| `BACKUP_CHAVE_PUBLICA` | a chave **pública** do `age` (`age1...`). Só fecha o cadeado |
| `BACKUP_REPO` | `caranovavidanova/ssace-backups` |
| `BACKUP_REPO_TOKEN` | token fine-grained do GitHub, **Contents: Read and write**, só nesse repositório |
| `R2_ENDPOINT` | `https://<account id>.r2.cloudflarestorage.com` (sem o bucket no fim) |
| `R2_BUCKET` | `ssace-backups` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | do token R2 (**Object Read & Write**, só nesse bucket) |
| `BACKUP_EMPRESAS` | a lista de empresas, modelo abaixo |

```json
[
  {
    "nome": "pneus-amigao",
    "banco": "postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
    "supabase_url": "https://<ref>.supabase.co",
    "service_role_key": "<a chave service_role, NÃO a anon>"
  }
]
```

**Empresa nova = mais um bloco**, nos dois cofres. Cinco armadilhas, todas já vividas (item 67 da
seção 6):
1. **Conexão do "Session pooler"**, não a "Direct" (IPv6, que o runner não tem) nem a
   "Transaction" (não aguenta o `pg_dump`). Settings → Database → Connection string.
2. **Senha do banco só com letras e números**: símbolo quebra a linha de conexão, e o erro não fala
   em senha. "Reset database password" **não derruba a loja** (que entra pela chave `anon`).
3. **`service_role` e `anon` começam as duas com `eyJ`.** Trocar uma pela outra dá "Bucket not
   found". O job confere e avisa.
4. **A caixa de editar secret no GitHub aparece SEMPRE VAZIA.** Editar é digitar tudo de novo;
   colar um pedaço substitui a lista inteira. Montar no Bloco de Notas e colar pronto.
5. **`supabase_url` é só `https://<código>.supabase.co`**, sem nada depois. Com `/rest/v1/` ou uma
   barra, o Storage responde `PGRST125 "Invalid path"`. O job já corta isso sozinho, com aviso.

**Conferir uma vez por mês** (5 minutos): Actions → **Backup do banco** está verde? E baixar a cópia
mais recente e **abrir** (parte 1 do `RESTAURAR-BACKUP.md`). Se uma rodada falhar, o GitHub manda
e-mail: **não é spam**, é o único aviso.

### Atualizar o banco de todas as empresas

O botão que roda, no banco de **cada empresa**, as migrations que faltam (como funciona por dentro:
item 11 da seção 8). Usa o `BACKUP_EMPRESAS` do cofre `lojas`: empresa que está no backup está aqui.

**Pra rodar** (uns 2 minutos, pelo navegador):
1. `github.com/sakura-corp/sakura-system-ace` → **Actions** → **"Atualizar o banco de todas as
   empresas"**.
2. **"Run workflow"**, modo **`ensaiar`** → **"Run workflow"**. A rodada para em **"Waiting"**:
   clicar nela → **"Review deployments"** → marcar **`lojas`** → **"Approve and deploy"** (toda
   rodada pede, até o ensaio). Disparada por API, avisar a ela que precisa aprovar.
3. Bolinha verde → a tabela mostra cada empresa, a versão, o que falta e se passaria. **O ensaio
   não muda nada.**
4. Tudo "✅ passaria" → rodar de novo com **`aplicar`**. No fim, a versão de cada banco.

**Se aparecer ❌:**
- **"não tem a tabela schema_versao"** → banco antes da `0055`: rodar à mão, em ordem, até a
  `0055`. Daí pra frente o botão cuida.
- **"parou na 00NN: ..."** → aquela migration não passa naquele banco, quase sempre por causa de um
  dado dele. Nada mudou em banco nenhum. É conversa, não é pra forçar.
- **"lock timeout"** → a tabela estava ocupada pela loja. Nada mudou; rodar mais tarde (de noite).
- **"MAIS NOVO que a última migration deste código"** → rodado de outra branch. Escolher `main` em
  "Use workflow from".
- **Empresa que não aparece** → falta o bloco dela no `BACKUP_EMPRESAS` do cofre `lojas`.

**Se aparecer ⏸ "passaria, mas espera N computador(es)"**: uma migration que falta exige uma versão
mínima do programa, e um computador usado nos últimos 30 dias está abaixo. A tabela diz qual. Três
saídas:
- **esperar**: o computador se atualiza ao fechar e abrir o programa (e só recebe versão liberada,
  se não for do canal de teste);
- **o computador não existe mais**: Configurações → "Computadores desta empresa" → ⋯ → "Esquecer
  este computador";
- **ele não será afetado** (como em 26/09, quando ninguém na loja tinha o perfil que a `0062`
  quebrava): `aplicar` com **"aplicar mesmo com computadores atrasados"** marcado.

### Onde as versões moram (desde a `0.9.51`)

As versões (instalador, `.blockmap` e `latest.yml`) moram no **`sakura-corp/ssace-versoes`**, um
repositório **público e só de versões**, criado em 08/10/2026. **Só ela escreve lá**: a equipe
tem escrita no código, mas não nas versões. Antes, quem tinha escrita no código conseguia publicar
sem a aprovação dela (item 78 da seção 6). É também o que deixa o código fechar um dia sem quebrar
a atualização automática (item 21).

- **Onde o programa procura**: `build.publish` do `package.json`. Da `0.9.51` em diante, no
  `ssace-versoes`.
- **A chave `TOKEN_VERSOES`**, no cofre `lojas`: chave de granulação fina (fine-grained) da conta
  dela, só pro `ssace-versoes`, com só **Contents: Read and write**. O Release e o Liberar usam
  essa chave pro endereço novo. Ela está no Bitwarden ("GitHub: chave ssace-versoes-publicar").
  **Vence em 09/10/2027.** Pra renovar: em `github.com/settings/personal-access-tokens`, abrir a
  `ssace-versoes-publicar` e clicar em "Regenerate token"; colar a nova no Bitwarden e no cofre
  (Settings → Environments → `lojas` → `TOKEN_VERSOES` → editar). Chave vencida não estraga
  nada: o Release para no primeiro passo, com o motivo escrito.
- **O endereço antigo** (`sakura-system-ace`) **continua recebendo cópia** de cada versão,
  porque os computadores até a `0.9.50` só procuram lá. A cópia é o que leva eles até a `0.9.51`,
  e da `0.9.51` em diante eles passam a procurar no endereço novo. Ela para quando o código fechar
  (esvaziar `ENDERECO_ANTIGO` no `release.yml`). **Antes de fechar**, conferir em Configurações →
  "Computadores desta empresa", em cada empresa, que nenhum computador está abaixo da `0.9.51`.
  Senão ele fica parado pra sempre e só volta reinstalando à mão.
- **O link de baixar o instalador** (o site e o `INSTALAR-LOJA-NOVA.md`) continua no endereço
  antigo **até a `0.9.51` ser liberada**. Antes disso, o endereço novo ainda não tem versão
  liberada e o link daria 404. Depois, trocar pelo novo.

### Publicar uma versão nova (canal de teste)

**Só existe um jeito, desde 30/09/2026**, e é o mesmo pra ela e pra mim:
1. Subir o `"version"` do `package.json` (e rodar `npm install` pra sincronizar o
   `package-lock.json`) → PR → mesclar na `main`. **Sempre antes de disparar**: sem isso, o build
   atualiza a release **anterior** em vez de criar outra.
2. Disparar o **Release** na `main`: pela tela (Actions → Release → Run workflow) ou por API
   (`mcp__github__actions_run_trigger`, `method: "run_workflow"`, `workflow_id: "release.yml"`,
   `ref: "main"`). A rodada **para em "Waiting" até ela aprovar** (cofre `lojas`): avisar.
   **Pelo celular**, o app do GitHub não mostra o botão "Review deployments": mandar ela abrir o
   link da rodada no **Safari** (ou no computador), e avisar pra **não tocar em "Cancelar
   workflow"**, que é o único botão que o app mostra ali (aconteceu em 1º/10/2026).
3. Conferir com `mcp__github__get_release_by_tag` (`owner: "sakura-corp"`, `repo:
   "ssace-versoes"`, `tag: "vX.Y.Z"`; a sessão pode precisar do `add_repo` pra ler esse
   repositório) até aparecerem o `.exe` **e** o `latest.yml` (10 a 15 minutos, porque sobe nos
   dois endereços). `prerelease: true` é o certo: é o canal de teste.

A tag nasce dentro do workflow, com o número do `package.json`. Não existe mais publicar por
`git push` de tag nem pela tela `releases/new` (os dois já causaram incidentes, seção 7,
"Empacotamento"). O ruleset `versões` impede mudar ou apagar `v*`. **Número de versão que já
circulou nunca se reusa**: cada leva que precisa chegar no programa instalado ganha número novo.

**Como o workflow publica** (desde 17/09): o electron-builder só **builda** (`--publish never`); o
`gh` sobe **arquivo por arquivo**, conferindo o tamanho, e o `latest.yml` **por último**. A ordem é
a trava: o `latest.yml` é o anúncio, e anunciar antes do instalador deixou a `v0.9.38` pela metade
e o canal de todas as lojas quebrado (item 66 da seção 6). Não inverter e não juntar num comando só.
Desde a `0.9.51`, isso roda **duas vezes**: primeiro no `ssace-versoes`, depois no endereço antigo
(ver "Onde as versões moram"). Se o novo falha, o antigo nem recebe.

**Se o build falhar, NÃO concluir que nada foi publicado.** Conferir a release: precisa ter
`SakuraSystem-Setup.exe` **e** `latest.yml`. Sem o `latest.yml`, o canal está quebrado mesmo com a
release parecendo normal (sintoma: `releases/latest/download/latest.yml` dá 404). O conserto é
**rodar o Release de novo** (ele completa o que faltar, sem queimar número). Daqui da sessão não dá
pra mexer em release nem subir arquivo.

O instalador aparece em `github.com/sakura-corp/ssace-versoes/releases` (até a `0.9.50`, só em
`github.com/sakura-corp/sakura-system-ace/releases`). O Windows avisa
"editor desconhecido" (sem certificado pago): "Mais informações → Executar assim mesmo". O
`VITE_SUPABASE_*` **não** vai no build: embutido, o instalador de um cliente apontaria pro banco de
outra empresa.

### Liberar uma versão pra todas as lojas (`TR-09.1`)

Toda versão nasce no **canal de teste**; as outras lojas ficam na anterior até ela **liberar**.
Liberar não refaz nada: é a mesma versão, só muda quem recebe. **Nunca liberar sem ela pedir**:
decidir que uma versão rodou o bastante é justamente a decisão que o canal devolve a ela.

**Quem fica em qual canal** (Configurações → "Atualizações deste computador", só admin): **teste**
é o computador dela e o da Pneus Amigão ("Balcão"); **normal** é todo o resto (computador novo já
nasce normal). Cuidado barato sugerido: passar o Balcão pro normal (item 12 da seção 8).

**Pra liberar** (2 minutos): Actions → **"Liberar versão para todas as lojas"** → "Run workflow",
escrever a versão (ex: `v0.9.47`) → aprovar em "Review deployments" → `lojas` → "Approve and
deploy". Verde: "✅ vX.Y.Z liberada para todas as lojas", e as lojas recebem ao abrir o programa.
Por API: `workflow_id: "liberar-versao.yml"`, `ref: "main"`, `inputs: { "versao": "vX.Y.Z" }`.

**Vermelho = nada foi liberado.** Antes, ele confere que a versão está inteira (instalador,
`latest.yml` e a impressão digital batendo). Quase sempre o conserto é rodar o Release de novo
naquela versão e liberar outra vez.

**Os dois endereços**: libera primeiro no `ssace-versoes` (a versão tem que estar lá) e depois no
endereço antigo, se ela estiver lá também. O resumo da rodada lista onde liberou. Se o novo deu
certo e o antigo falhou, rodar o Liberar de novo com a mesma versão (liberar duas vezes não
estraga nada).

**Quando liberar**: depois de uns dias no teste sem reclamação. Correção urgente pode sair publicada
e liberada em seguida, sabendo que aí o teste não protegeu nada. **Uma versão pode ficar no teste
pra sempre**: se a seguinte corrige, libera-se direto a seguinte.

### Voltar uma versão (quando a que saiu está ruim)

> **Ainda não ensaiado numa release de verdade** (escrito em 13/09/2026). Ensaiar é decisão dela,
> num dia calmo.

**O `electron-updater` só anda pra frente** (`allowDowngrade` desligado de propósito): apagar a
release ruim não desfaz nada em quem já atualizou. Por isso, duas metades:

1. **Estancar** (quem ainda não pegou): como a versão nasce no teste, normalmente só chegou em dois
   computadores. Se foi liberada, rodar o **Liberar com a versão boa anterior**: ela volta a ser a
   de todas as lojas. Apagar a release **e a tag** (lugares separados no GitHub) tira a versão
   também do teste, mas apaga o registro: só se ela for perigosa. **Voltar pra uma versão de
   antes da `0.9.51` pelo Liberar não dá**: ela não existe no `ssace-versoes`, e o Liberar recusa.
   Aí o caminho é o 2, abaixo.
2. **Desfazer** (quem já pegou): **publicar uma versão NOVA com o código da antiga**. Se a `0.9.35`
   saiu ruim e a `0.9.34` era boa: `git revert` do que a `0.9.35` trouxe (ou
   `git checkout v0.9.34 -- .`), `package.json` na `0.9.36`, PR, merge, Release. A loja recebe a
   `0.9.36`, que por dentro é a `0.9.34`.
   - **Emergência, uma máquina só**: baixar o instalador da release boa e instalar por cima. O
     `conexao.json`, o `erros.log` e o `atualizacoes.log` ficam em
     `%APPDATA%\Sakura System - AutoCenter Edition\` e sobrevivem. Releases antes da `v0.9.22` têm
     o instalador com o número no nome.

**O banco não volta junto**: migration rodada continua rodada. O código antigo vai rodar em cima do
banco novo, e isso só funciona porque migration **acrescenta**, nunca tira. Daí a regra:

> **Migration nunca tira nem renomeia coluna em uso na mesma versão que passa a usar a nova**
> (13/09/2026). Troca de coluna vira duas versões: **v1** acrescenta a nova e escreve nas duas;
> **v2**, só depois de todas as lojas atualizadas, remove a velha. A única exceção do passado, a
> `0033` (tirou o `id` das configurações ao trocar pra `loja_id`), só deu certo porque havia uma
> loja e uma máquina, e é por isso que três migrations anteriores precisam de guarda (item 36 da
> seção 6).

## 11. Trabalhando de outro computador

Código no GitHub e banco no Supabase: dá pra continuar de qualquer computador com internet. Em
cada computador novo, clonar, `npm install` e criar o `.env` (nunca vai pro Git):

```bash
git clone https://github.com/sakura-corp/sakura-system-ace.git
cd sakura-system-ace
npm install
cp .env.example .env   # VITE_SUPABASE_URL=https://rlgdjiowvnfzsedehyga.supabase.co
                       # VITE_SUPABASE_ANON_KEY=<chave anon, em Settings -> API no Supabase>
npm run dev
```
