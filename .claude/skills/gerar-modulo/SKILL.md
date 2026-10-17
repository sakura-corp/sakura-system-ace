---
name: gerar-modulo
description: Gera o andaime completo (migration SQL, types, lib, página de lista, formulário, e registro de rota/permissão) de um módulo/cadastro novo no Sakura System, seguindo exatamente o padrão de código já estabelecido no projeto. Use sempre que o usuário pedir pra criar um módulo, cadastro ou entidade nova (ex: "Fornecedores", "Depósito", "Categorias de produto", "Garantias") — mesmo que ele não diga a palavra "módulo" ou "skill". Frases como "quero uma tela pra cadastrar X", "preciso de um cadastro de X", "cria uma entidade nova pra X" também devem acionar esta skill. NÃO use pra mudanças pequenas em um módulo que já existe (isso é edição normal, não geração de módulo novo).
---

# Gerar módulo novo — Sakura System

Esta skill existe porque o Sakura System já tem um padrão de código bem estabelecido (documentado no
`PROJETO_STATUS.md`) e repetir esse padrão à mão módulo após módulo é mecânico e sujeito a
esquecimento de algum passo (RLS na tabela nova, registro de permissão, etc). A skill automatiza o
andaime; você continua responsável por revisar o resultado e pelas decisões de modelagem que exigem
julgamento.

O usuário deste projeto **não é programador** — explique tudo em português simples, sem jargão, e
sempre pergunte antes de assumir algo sobre os dados (nomes de campo, tipos, obrigatoriedade). Ver
seção 1 do `PROJETO_STATUS.md` (e `docs/sofia.md`) pra entender como ele gosta de trabalhar: em etapas pequenas e
testáveis, com opções + recomendação antes de decisões estruturais.

## Antes de gerar qualquer código

1. **Leia o `PROJETO_STATUS.md` (índice) e, em `docs/`, `decisoes.md`, `estrutura.md`, `banco.md` e
   `licoes.md` (as antigas seções 3, 4, 5 e 6)** — é onde estão as
   decisões técnicas já tomadas, o padrão de pastas, a modelagem de dados atual e as dívidas técnicas
   conhecidas (sem testes automatizados, etc). Não repita decisões que já foram tomadas (ex: não
   proponha Prisma/ORM — este projeto usa o client `supabase-js` direto). O projeto **já é
   multi-loja** (fundação construída — ver seção 5 do `PROJETO_STATUS.md`, subseção "Multi-loja"):
   decida com o usuário se o módulo novo é **compartilhado** entre lojas (catálogo, tipo
   `pecas`/`servicos`/`categorias`/`clientes`) ou **por loja** (a maioria — tipo
   `estoque_movimentos`/`ordens_servico`/`contas_pagar`). Não assuma sozinho; pergunte, do mesmo
   jeito que pergunta os campos.
2. **Leia os arquivos de referência mais próximos como molde**, não invente um estilo novo:
   - `src/types/servico.ts` e `src/types/peca.ts` — como ficam os tipos.
   - `src/lib/servicos.ts` — como ficam as funções de acesso ao banco.
   - `src/pages/servicos/ServicosPage.tsx` e `ServicoForm.tsx` — como fica a tela (lista + formulário
     simples, sem abas). Se o módulo pedido parecer mais complexo (com sub-seções, tipo "Produtos" +
     "Movimentações" dentro de "Estoque"), avise o usuário que isso é um padrão diferente (abas) e
     pergunte se é isso que ele quer antes de seguir — não decida sozinho.
   - `src/types/operador.ts` (array `MODULOS`) e `src/App.tsx` (rotas) — como registrar o módulo.
   - A migration mais recente em `supabase/migrations/` — pra copiar o comentário padrão de RLS
     temporário e manter a numeração sequencial (olhe o número mais alto já existente e use o
     próximo).

## Descobrir os campos da entidade

Se o usuário só disse o nome do módulo (ex: "cria um cadastro de Fornecedores") sem listar os campos,
**pergunte antes de gerar qualquer arquivo**. Não adivinhe a modelagem de dados sozinho — isso é
exatamente o tipo de decisão que o `PROJETO_STATUS.md` (seção 1) diz pra apresentar opções e esperar
confirmação.

Pergunte de um jeito simples, com exemplos concretos baseados em módulos parecidos que já existem no
projeto, tipo:

> "Pra criar o cadastro de Fornecedores, me conta quais informações você quer guardar de cada
> fornecedor. Por exemplo, parecido com o cadastro de Clientes: nome, CNPJ/CPF, telefone, e-mail,
> endereço? Tem algum campo específico de fornecedor, tipo prazo de entrega ou categoria do que ele
> fornece? E esse cadastro precisa de um campo 'Ativo/Inativo' pra poder desativar um fornecedor sem
> apagar o histórico (como Peças e Serviços já têm)?"

Depois de ter a lista de campos, também confirme:
- **Nome do módulo em português** (pro menu lateral e títulos de tela) e o que vira a **chave técnica**
  em inglês/snake_case (ex: "Fornecedores" → `fornecedores`; "Depósito" → `deposito`).
- Se cada linha precisa de status ativo/inativo (like Peças/Serviços) ou não.
- Se tem alguma relação com outra tabela já existente (ex: um Fornecedor pode estar ligado a Peças) —
  se sim, isso pode exigir uma FK e um select na tela, sinalize que é mais trabalho e confirme o
  formato antes de codar.

## Gerar os arquivos

Sempre seguindo o padrão observado em `servicos` (types/lib/pages) e nas regras abaixo, que já foram
aprendidas da forma difícil neste projeto (estão documentadas no `PROJETO_STATUS.md`, mas resumindo
aqui pra não esquecer):

- **Nunca usar `window.prompt()`** — Electron não suporta. Use `alert()`/`confirm()` quando precisar
  confirmar uma ação destrutiva (ex: excluir).
- **Erros do Supabase não são `instanceof Error`** — sempre exibir a mensagem de erro usando
  `mensagemDeErro()` de `src/lib/errors.ts`, nunca um `instanceof Error ? ... : "erro genérico"` na mão.
- **Fallback de variável de ambiente sempre com `||`, nunca `??`** — o Vite injeta variável ausente
  como string vazia, não `undefined`, e `??` não substitui string vazia.
- **Toda tabela nova precisa de RLS habilitada + uma policy.** Se o módulo é **compartilhado** entre
  lojas: `for all using (auth.uid() is not null) with check (auth.uid() is not null)` — mesma policy
  de `pecas`/`clientes`/`categorias` hoje. Se é **por loja**: a tabela ganha coluna
  `loja_id uuid not null references lojas (id)` e a policy vira
  `for all using (operador_tem_acesso_loja(loja_id)) with check (operador_tem_acesso_loja(loja_id))`
  — reaproveite a função `operador_tem_acesso_loja()` já criada na migration `0031`, não recrie.
- Migration idempotente: `create table if not exists`, `add column if not exists`, e **sempre** um
  `drop policy if exists` cobrindo o nome **final** da policy antes de criar (não só um nome antigo
  que esteja sendo substituído) — ver item 12 da seção 6 do `PROJETO_STATUS.md`.

### 1. Migration SQL (`supabase/migrations/00XX_<descricao>.sql`)

Número sequencial seguinte ao último arquivo em `supabase/migrations/`. Cabeçalho no mesmo estilo das
migrations existentes (comentário com nome do projeto + número + descrição curta do que faz).

### 2. `src/types/<entidade>.ts`

Interface principal (id, campos, `criado_em`) + `type Novo<Entidade> = Omit<Entidade, "id" | "criado_em">`.
Se o módulo é **por loja**, a interface ganha `loja_id: string` e o `Novo<Entidade>` também omite
`loja_id` (segue `src/types/estoque.ts` como molde: `Omit<Entidade, "id" | "loja_id" | "criado_em">`)
— quem grava o `loja_id` é a função `criar<Entidade>()` do lib, não o formulário.

### 3. `src/lib/<entidade>.ts`

Funções `listar<Entidade>s`, `criar<Entidade>`, `excluir<Entidade>` (e `atualizarStatus<Entidade>` se
tiver campo `ativo`), usando o client `supabase` de `src/lib/supabase.ts`. Mesma assinatura/estilo de
`src/lib/servicos.ts` (compartilhado) ou `src/lib/estoque.ts` (por loja — `listar*` recebe
`lojaId: string` e filtra com `.eq("loja_id", lojaId)`; `criar*` recebe `lojaId` e grava
`{ ...dados, loja_id: lojaId }`).

### 4. `src/pages/<modulo>/<Modulo>Page.tsx` + `<Modulo>Form.tsx`

Lista com estado de carregamento/erro e aviso de "Supabase não configurado" (`isSupabaseConfigured`)
igual todo módulo já tem. Formulário controlado. Classes Tailwind do design system (`sakura-purple`,
`sakura-purple-dark`, `sakura-pink-soft`, `sakura-gray`, cards `rounded-2xl border border-sakura-gray/30
bg-white`) — copie o visual de `ServicosPage.tsx`/`ServicoForm.tsx`, não invente um estilo novo. Se o
módulo é **por loja**: a página lê `lojaAtual` de `useAuth()` (`src/contexts/AuthContext.tsx`),
recarrega quando `lojaAtual?.id` muda, e mostra um aviso amigável ("seu usuário não tem loja
atribuída, fale com o administrador") quando `lojaAtual` é `null` — copie o padrão de
`EstoquePage.tsx`/`OrdensServicoPage.tsx`.

### 5. Registrar o módulo

- `src/types/operador.ts`: acrescente `{ chave: "<entidade>", label: "<Nome em português>", rota:
  "/<entidade>" }` no array `MODULOS`, na posição que fizer sentido no menu (perto de módulos
  relacionados).
- `src/App.tsx`: importe a página nova e adicione uma `<Route>` envolta em
  `<PermissaoRoute modulo="<entidade>">`, seguindo o padrão das rotas existentes.
- **Não mexa no `Sidebar.tsx`** — ele já itera `MODULOS` automaticamente, não precisa de código novo lá.
- **Não mexa no `ConfiguracoesPage.tsx`/`OperadorForm.tsx`** — eles também iteram `MODULOS`
  automaticamente pras permissões por operador.

## Depois de gerar

1. Rode `npm run build` (tsc + vite build) e `npm run lint`. Se der erro, corrija antes de reportar
   como pronto — não entregue código que não compila.
2. Reporte pro usuário em português simples e direto:
   - O que foi criado (lista curta dos arquivos, sem despejar código).
   - Que o menu lateral já deve mostrar o módulo novo (pra quem tiver permissão).
   - **O passo manual que falta**: rodar a migration nova no Supabase (SQL Editor → colar o conteúdo
     do arquivo → Run), do mesmo jeito que os módulos anteriores precisaram.
   - Convide o usuário a testar (`npm run dev`) e avisar se algum campo ficou diferente do que ele
     queria — é mais rápido ajustar agora do que depois de ele já ter cadastrado dados de verdade.

## Limitações conhecidas (avise o usuário se cair nesses casos)

- Não gera módulos com **abas** (tipo Estoque com "Produtos"/"Movimentações") automaticamente — isso é
  um padrão mais complexo; se o pedido parecer precisar disso, pergunte e trate como um passo separado.
- Não decide sozinho sobre **relacionamentos com outras tabelas** (FKs) além do óbvio — confirme com o
  usuário antes.
- Não mexe em RLS "de verdade" por permissão de módulo (ex: bloquear quem só tem acesso a "Caixa" de
  chamar a API de "Clientes" direto) — a tabela nova recebe RLS por login + loja (se for por loja),
  igual todas as outras tabelas de negócio têm hoje, mas permissão por módulo continua checada só na
  interface (ver dívida técnica item 1 da seção 6 do `PROJETO_STATUS.md`). Isso é consistente com o
  resto do projeto, não é um bug da skill.
