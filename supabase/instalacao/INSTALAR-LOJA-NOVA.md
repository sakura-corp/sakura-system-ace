# Instalar o Sakura System numa empresa nova

Passo a passo pra colocar o sistema rodando pra um cliente novo, do zero.

**Antes de tudo, uma distinção que muda o que você faz:**

- **Empresa nova** (dono diferente, outro CNPJ) → **projeto Supabase novo**, tudo o que está
  neste arquivo. É o caso do amigo do seu pai.
- **Loja nova da mesma empresa** (mesmo dono, segunda unidade) → **não precisa de nada disso**.
  É só Configurações → Lojas → "+ Nova loja" dentro do sistema que já existe, e depois marcar a
  loja nova no cadastro de quem vai ter acesso a ela.

> **Regra de custo (decidida em 28/08/2026):** todos os custos ficam **na sua conta** — Supabase,
> Anthropic, Focus NFe. O dono da loja **não cria conta em lugar nenhum** e nunca vê nenhum desses
> serviços; ele só usa o Sakura System e te paga a mensalidade. Isso é o que justifica a
> mensalidade e o que te deixa dar suporte de verdade. Em troca, o dado dos clientes dele fica sob
> sua responsabilidade — por isso o backup (Parte 1, passo 2) não é opcional.

Tempo estimado: **40 a 60 minutos**, sendo que a parte de nota fiscal (Parte 5) não entra nessa
conta — ela leva dias ou semanas e depende de terceiros.

---

## Parte 1 — Banco de dados (~15 min)

### 1. Criar o projeto no Supabase

Painel do Supabase → **New project**, na **sua** organização.

- **Name**: o nome da empresa (ex: "Auto Center do Zé") — é só pra você se achar depois.
- **Database Password**: gere uma senha forte e **guarde num lugar seguro**. Ela não é usada no
  dia a dia, mas sem ela você não recupera o banco em caso de problema.
- **Region**: **South America (São Paulo)** — mais perto, mais rápido.

### 2. Colocar no plano pago (backup automático)

**Não pule este passo.** O plano grátis **não guarda cópia de segurança**. Se o banco de um
cliente for apagado ou corromper, o dado da loja inteira some e não tem como voltar.

Organization → **Billing** → plano **Pro**.

Duas coisas pra saber:
- O plano grátis parece ter um limite baixo de projetos por organização (algo como 2) — **isso
  ainda não foi confirmado no painel**. Se for esse o caso, como cada empresa é um projeto, você
  bate no teto já na terceira empresa e ela seria paga de qualquer forma. Vale conferir na hora.
- Projeto grátis **pausa sozinho** depois de alguns dias sem uso. Numa loja ativa isso não
  acontece, mas basta o cliente viajar numa semana parada pra dar susto.

Confirme depois em Project Settings → **Database** → **Backups** que aparece cópia diária.

### 3. Criar as tabelas (o arquivo único)

SQL Editor → **New query** → abra `supabase/instalacao/instalacao-completa.sql`, copie **tudo** e
cole → **Run**.

Leva alguns segundos. Vão aparecer vários avisos `NOTICE: ... does not exist, skipping` — **isso é
normal** num banco vazio, não é erro. O que não pode aparecer é `ERROR`.

> Esse arquivo é gerado a partir das migrations por `npm run gerar-instalacao`. Nunca instale
> colando as migrations uma por uma: pular um arquivo ou trocar a ordem não dá erro na hora, só
> quebra depois, na tela do app, de um jeito difícil de ligar à instalação.
>
> É seguro rodar de novo (por exemplo, se a página travou no meio e você não sabe se foi até o
> fim). Testado rodando três vezes seguidas no mesmo banco, sem erro.

### 4. Ajustar o login (2 cliques, obrigatório)

Authentication → **Sign In / Providers** → Email:

- **Enable email provider**: **ligado** — senão dá erro "Email logins are disabled" no login.
- **Confirm email**: **desligado** — senão ninguém consegue entrar. Os e-mails do sistema são
  inventados (`usuario@sakura.local`), não existe caixa de entrada pra confirmar nada.

### 5. Criar o primeiro usuário admin

O primeiro tem que ser na mão, porque o sistema exige um admin pra criar outro.

**a)** Authentication → **Users** → **Add user** → **Create new user**:
- Email: `dono@sakura.local` (o que vier antes do `@` é o que ele digita no login)
- Password: uma senha provisória, **mínimo 6 caracteres** (limite do Supabase, não dá pra baixar)
- **Auto Confirm User**: ligado

Copie o **User UID** que aparece na lista depois de criado.

**b)** SQL Editor → New query → cole trocando os dois valores:

```sql
insert into operadores (id, usuario, nome, admin, permissoes, ativo)
values ('COLE_O_USER_UID_AQUI', 'dono', 'Nome do Dono', true, '{}', true);

insert into operador_lojas (operador_id, loja_id)
values ('COLE_O_USER_UID_AQUI', '00000000-0000-0000-0000-000000000001');
```

> ⚠️ **O segundo `insert` é o que mais dá problema — não esqueça dele.** Sem o vínculo com a loja,
> o admin até entra no sistema, mas não enxerga nada que seja por loja: depósito, configurações do
> Início, dados fiscais, ordens de serviço, caixa — tudo vazio. Pior: nem dá pra consertar pela
> tela depois, porque ninguém consegue editar um operador sem loja (só apagando pelo painel do
> Supabase e refazendo).
>
> O UUID longo é o da "Loja 1", que já vem criada pelo arquivo de instalação. É sempre esse mesmo
> número, em qualquer instalação — pode copiar como está.

### 6. Anotar a URL e a chave

Project Settings → **API**:
- **Project URL** (ex: `https://xxxxxxxx.supabase.co`)
- **anon / publishable key**

São esses dois valores que você vai digitar no computador da loja. **Não** use nenhuma chave
marcada como `secret` / `service_role`.

---

## Parte 2 — Deixar o app rodando na loja (~10 min)

1. No computador da loja, baixe o instalador **da versão liberada** por este endereço, que sempre
   entrega a certa:
   `https://github.com/sakura-corp/sakura-system-ace/releases/latest/download/SakuraSystem-Setup.exe`
   - **Não pegue "o de cima" da página de Releases.** Desde o canal de teste (item TR-09.1), a
     versão do topo pode estar marcada **Pre-release** — ainda em teste, só pros computadores de
     teste. A liberada é a marcada **Latest**.
2. O Windows vai avisar "editor desconhecido" — **Mais informações → Executar assim mesmo**.
   É normal, é por não ter certificado pago. Vale avisar antes, pra não assustar.
3. Na primeira abertura o app pede a **conexão**: cole a URL e a chave do passo 6.
   - Se o "Testar conexão" reclamar mas você tiver certeza dos valores, dá pra usar
     **"Salvar assim mesmo"**.
   - Isso é **uma vez por computador**. Se a loja tiver dois PCs, repete em cada um.
4. Entre com o usuário e a senha provisória do passo 5, e **troque a senha na hora**.
5. **Não mexa em "Atualizações deste computador"** (Configurações). Computador novo já nasce no
   canal **normal**, que é o certo pra loja de cliente: ele só recebe versão depois que ela for
   liberada. O canal de teste é só pro seu computador e o da Pneus Amigão.

---

## Parte 3 — Configurar o sistema pra loja (~15 min)

Tudo dentro do app, em **Configurações**:

1. **Lojas** → renomeie a "Loja 1" pro nome de verdade e preencha cidade/UF.
2. **Dados fiscais da loja** → CNPJ, razão social, inscrições, endereço, telefone.
   Preencha mesmo que ainda não vá emitir nota: o cabeçalho do documento de garantia sai daqui.
3. **Operadores** → crie um usuário pra cada funcionário, marcando só os módulos que cada um
   precisa. (Todo operador criado aqui vira automaticamente um funcionário selecionável como
   técnico/vendedor.)
4. **Categorias de produto / serviço / caixa** → já vêm com as padrão; ajuste se a loja usar
   nomes diferentes.
5. **Juros de parcelamento** → se a loja parcela no cartão.
6. **Texto de garantia** e **Cartões do Início** → opcionais, dá pra deixar pra depois.

Já vêm prontos, sem precisar mexer: **17 serviços padrão** (sem preço — a loja preenche os dela),
as categorias padrão e um **"Depósito Principal"**.

O que a loja precisa cadastrar antes de abrir a primeira OS: **peças** (com preço) e o preço dos
**serviços**.

---

## Parte 4 — "Importar por foto" (opcional, ~10 min)

Só se a loja for usar a leitura de nota de fornecedor por foto/PDF. Como o custo é seu, a chave da
Anthropic é sua.

1. `console.anthropic.com` → Settings → API Keys → **Create Key**.
   **Crie uma chave separada por loja** (ex: "Sakura – Auto Center do Zé"). Todas na sua conta,
   mas assim você desliga uma sem derrubar as outras — e enxerga quanto cada loja consome.
2. No projeto Supabase da loja: **Edge Functions** → **Deploy a new function** → **Via Editor** →
   digite o nome `ler-notas-fiscais` **antes** de clicar em Deploy (renomear depois não muda o
   endereço real, e aí o app não acha a função) → apague o exemplo, cole todo o conteúdo de
   `supabase/functions/ler-notas-fiscais/index.ts` → **Deploy function**.
3. Na função criada → aba **Secrets** → nome `ANTHROPIC_API_KEY`, valor a chave do passo 1.
4. Repita o passo 2 para `redefinir-senha-operador` (conteúdo de
   `supabase/functions/redefinir-senha-operador/index.ts`). Essa **não precisa de secret** — é o
   que permite você redefinir a senha de um funcionário que esqueceu.

Testar: Estoque → Produtos → "Importar por foto/PDF".

---

## Parte 5 — Nota fiscal (etapa separada, dias a semanas)

**Não tente fazer isso junto com a instalação.** Trate como uma segunda etapa de ativação: a loja
começa usando cadastro, OS, estoque e caixa no primeiro dia, e a emissão entra depois — foi
exatamente assim na Pneus Amigão.

O motivo é que essa parte não depende de você nem do sistema: depende da SEFAZ do estado, da
prefeitura da cidade e da contabilidade do cliente. Envolve certificado digital pago, credenciamento
em portal de governo e códigos que só a contabilidade dele pode confirmar.

O passo a passo completo está em **`docs/pendencias-e-futuro.md`, item 1** (a antiga seção 8), no bloco
"Playbook de habilitação fiscal por loja nova".

Quando essa etapa chegar, a parte do **sistema** são dois passos, e levam 5 minutos:

1. **Publicar o porteiro da Focus NFe** — no projeto Supabase da loja: **Edge Functions** →
   **Deploy a new function** → **Via Editor** → digite o nome `focus-nfe` **antes** de clicar em
   Deploy → apague o exemplo, cole todo o conteúdo de `supabase/functions/focus-nfe/index.ts` →
   **Deploy function**. **Não precisa de secret nenhum.** É ele que guarda e usa o token: sem ele,
   a emissão de nota avisa "falta publicar o porteiro".
2. **Colar o token** em Configurações → **Dados fiscais da loja** → "Token de acesso" → Salvar.
   Depois de salvo ele **não aparece mais** na tela — de propósito: o token emite e cancela nota
   no CNPJ da loja, e fica guardado num lugar que nenhum computador lê. Pra trocar, cole o novo.

---

## Depois de entregue

- **Backup**: já é automático (Parte 1, passo 2). Vale conferir uma vez que está aparecendo.
- **Acrescentar a empresa no secret `BACKUP_EMPRESAS`** do GitHub (um bloco a mais na lista —
  modelo em `docs/operacao.md`, "Backup do banco"). É **um bloco por empresa**, não por
  loja. Isso faz duas coisas de uma vez: a cópia de segurança própria de todo dia (a do Supabase
  guarda só 7 dias) e o botão **"Atualizar o banco de todas as empresas"**, que passa a levar as
  migrations novas a este banco junto com os outros. Sem o bloco, a empresa fica de fora dos dois
  — e ninguém avisa. **Cuidado**: a caixa de editar secret aparece sempre vazia; monte a lista
  inteira no Bloco de Notas e cole pronta.
- **Atualização**: uma versão nova chega primeiro só nos computadores marcados como **Teste**
  (Configurações → "Atualizações deste computador"), e nas outras lojas só depois que você rodar o
  "Liberar versão para todas as lojas" (`docs/operacao.md`). Computador de loja nova
  fica no canal **Normal** — não precisa mexer.
- **Suporte**: hoje é por WhatsApp com print. Peça sempre o número da versão, que aparece no canto
  inferior direito de qualquer tela.

## Quando algo der errado

| Sintoma | Causa mais provável |
|---|---|
| Tudo aparece vazio, ou some ao trocar de tela | Faltou o `insert into operador_lojas` (Parte 1, passo 5b) |
| "Email logins are disabled" no login | "Enable email provider" desligado (passo 4) |
| Login aceito mas não entra | "Confirm email" ligado (passo 4) |
| Tela de conexão pedindo os dados de novo | Normal em computador novo — é uma vez por PC |
| "Importar por foto" com erro de crédito | Crédito da Anthropic acabou — recarregue em Billing |
| Emitir nota diz "falta publicar o porteiro" | A Edge Function `focus-nfe` não foi publicada (Parte 5) |
| Botão que "não faz nada", sem erro | Quase sempre é RLS sem policy pra aquela ação (`docs/licoes.md`, item 15) |
| Faixa "o banco desta empresa ainda não foi atualizado" | Uma migration nova não chegou neste banco — rode o "Atualizar o banco de todas as empresas" (`docs/operacao.md`). Se a empresa não aparece na tabela do resultado, falta o bloco dela no `BACKUP_EMPRESAS` |
