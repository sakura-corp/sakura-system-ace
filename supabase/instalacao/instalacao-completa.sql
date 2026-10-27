-- ===================================================================
-- Sakura System — AutoCenter Edition
-- INSTALAÇÃO COMPLETA DO BANCO (empresa nova)
-- ===================================================================
--
-- ARQUIVO GERADO AUTOMATICAMENTE — não editar à mão.
-- Para regerar: npm run gerar-instalacao
--
-- Contém as 74 migrations de supabase/migrations/, na ordem.
--
-- Como usar: painel do Supabase → SQL Editor → New query → colar TUDO
-- deste arquivo → Run. Leva alguns segundos.
--
-- Seguro rodar de novo num banco que já tem tudo (todas as migrations são
-- idempotentes) — não apaga nem duplica nada.
--
-- Isto é SÓ a parte do banco. O passo a passo completo de instalar uma
-- loja nova (Auth, primeiro admin, app) está em
-- supabase/instalacao/INSTALAR-LOJA-NOVA.md
-- ===================================================================

-- -------------------------------------------------------------------
-- 0001_clientes_veiculos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0001: clientes e veículos

create extension if not exists "pgcrypto";

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  uf text,
  criado_em timestamptz not null default now()
);

create table if not exists veiculos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  placa text not null,
  marca text,
  modelo text,
  ano int,
  cor text,
  km_atual int,
  criado_em timestamptz not null default now()
);

create index if not exists veiculos_cliente_id_idx on veiculos (cliente_id);


-- -------------------------------------------------------------------
-- 0002_rls_temporario.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0002: libera acesso às tabelas de clientes/veículos
--
-- TEMPORÁRIO: o app ainda não tem login de usuário, então liberamos acesso
-- total pela chave pública (anon/publishable). Quando a autenticação for
-- implementada, substituir estas policies por regras que checam o usuário
-- logado (e, no futuro, a loja/tenant do usuário).

alter table clientes enable row level security;
alter table veiculos enable row level security;

drop policy if exists "clientes_acesso_temporario" on clientes;
create policy "clientes_acesso_temporario" on clientes
  for all
  using (true)
  with check (true);

drop policy if exists "veiculos_acesso_temporario" on veiculos;
create policy "veiculos_acesso_temporario" on veiculos
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0003_pecas.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0003: peças/produtos (com dados fiscais)

create table if not exists pecas (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text,
  descricao text not null,
  unidade text,
  preco_custo numeric(12, 2),
  preco_venda numeric(12, 2),
  ncm text,
  cfop_padrao text,
  cst_ou_csosn text,
  aliquota_icms numeric(5, 2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- TEMPORÁRIO: mesma lógica da migration 0002 — libera acesso pela chave
-- pública até a autenticação de usuário ser implementada.
alter table pecas enable row level security;

drop policy if exists "pecas_acesso_temporario" on pecas;
create policy "pecas_acesso_temporario" on pecas
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0004_estoque_movimentos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0004: movimentações de estoque (entrada/saída)

create table if not exists estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  peca_id uuid not null references pecas (id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade numeric(12, 2) not null check (quantidade > 0),
  motivo text not null check (motivo in ('compra', 'venda', 'ajuste', 'uso_em_os')),
  referencia text,
  criado_em timestamptz not null default now()
);

create index if not exists estoque_movimentos_peca_id_idx on estoque_movimentos (peca_id);

-- TEMPORÁRIO: mesma lógica das migrations anteriores — libera acesso pela
-- chave pública até a autenticação de usuário ser implementada.
alter table estoque_movimentos enable row level security;

drop policy if exists "estoque_movimentos_acesso_temporario" on estoque_movimentos;
create policy "estoque_movimentos_acesso_temporario" on estoque_movimentos
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0005_ordens_servico.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0005: ordens de serviço e seus itens (peças e serviços)

create table if not exists ordens_servico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete restrict,
  veiculo_id uuid references veiculos (id) on delete set null,
  status text not null default 'aberta'
    check (status in ('aberta', 'em_andamento', 'concluida', 'faturada')),
  km_entrada int,
  descricao_problema text,
  forma_pagamento text,
  data_abertura timestamptz not null default now(),
  data_fechamento timestamptz
);

create index if not exists ordens_servico_cliente_id_idx on ordens_servico (cliente_id);

create table if not exists ordens_servico_itens (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references ordens_servico (id) on delete cascade,
  tipo text not null check (tipo in ('peca', 'servico')),
  peca_id uuid references pecas (id),
  descricao text not null,
  quantidade numeric(12, 2) not null check (quantidade > 0),
  preco_unitario numeric(12, 2) not null default 0,
  desconto numeric(12, 2) not null default 0
);

create index if not exists ordens_servico_itens_ordem_id_idx
  on ordens_servico_itens (ordem_servico_id);

-- TEMPORÁRIO: mesma lógica das migrations anteriores — libera acesso pela
-- chave pública até a autenticação de usuário ser implementada.
alter table ordens_servico enable row level security;
alter table ordens_servico_itens enable row level security;

drop policy if exists "ordens_servico_acesso_temporario" on ordens_servico;
create policy "ordens_servico_acesso_temporario" on ordens_servico
  for all
  using (true)
  with check (true);

drop policy if exists "ordens_servico_itens_acesso_temporario" on ordens_servico_itens;
create policy "ordens_servico_itens_acesso_temporario" on ordens_servico_itens
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0006_caixa_movimentos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0006: caixa diário (nasce das OS faturadas + lançamentos manuais)

create table if not exists caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  data timestamptz not null default now(),
  ordem_servico_id uuid references ordens_servico (id),
  tipo text not null check (tipo in ('entrada', 'saida')),
  forma_pagamento text,
  valor numeric(12, 2) not null check (valor >= 0),
  descricao text,
  constraint caixa_movimentos_ordem_id_idx_unique unique (ordem_servico_id)
);

-- TEMPORÁRIO: mesma lógica das migrations anteriores — libera acesso pela
-- chave pública até a autenticação de usuário ser implementada.
alter table caixa_movimentos enable row level security;

drop policy if exists "caixa_movimentos_acesso_temporario" on caixa_movimentos;
create policy "caixa_movimentos_acesso_temporario" on caixa_movimentos
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0007_operadores.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0007: operadores (login com usuário/senha + permissões por módulo)
--
-- Login usa Supabase Auth (e-mail/senha), mas o operador só digita um "usuário"
-- curto — o app monta um e-mail interno (usuario@sakura.local) por baixo dos
-- panos. Esta tabela guarda o perfil (nome, permissões) de cada usuário do
-- Supabase Auth, ligado por id.
--
-- Diferente das outras tabelas (que ainda têm RLS totalmente aberto, ver
-- PROJETO_STATUS.md seção 6.1), esta tabela JÁ tem RLS de verdade baseada em
-- quem está logado, porque ela é a raiz de confiança do sistema de permissões
-- — não faria sentido proteger o resto só na interface se qualquer um pudesse
-- se auto-promover a admin direto pela API.

create table if not exists operadores (
  id uuid primary key references auth.users (id) on delete cascade,
  usuario text not null unique,
  nome text not null,
  admin boolean not null default false,
  permissoes text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table operadores enable row level security;

-- Qualquer pessoa logada pode ler a lista de operadores (necessário pra cada
-- um buscar o próprio perfil ao logar, e pro admin listar todo mundo na tela
-- de Configurações).
drop policy if exists "operadores_leitura_autenticados" on operadores;
create policy "operadores_leitura_autenticados" on operadores
  for select
  using (auth.uid() is not null);

-- Só um operador marcado como admin (e ativo) pode criar, editar ou remover
-- outros operadores.
drop policy if exists "operadores_escrita_admins" on operadores;
create policy "operadores_escrita_admins" on operadores
  for all
  using (
    exists (
      select 1 from operadores admin_atual
      where admin_atual.id = auth.uid()
        and admin_atual.admin = true
        and admin_atual.ativo = true
    )
  )
  with check (
    exists (
      select 1 from operadores admin_atual
      where admin_atual.id = auth.uid()
        and admin_atual.admin = true
        and admin_atual.ativo = true
    )
  );

-- Bootstrap do primeiro admin (rodar manualmente, uma vez, pelo SQL Editor do
-- Supabase — não pelo app, porque a policy acima exige que já exista um admin
-- pra criar outro operador):
--
-- 1. Crie o usuário em Authentication → Users → Add user, com e-mail
--    "SEU_USUARIO@sakura.local" e a senha que quiser. Copie o "User UID".
-- 2. Rode, trocando os valores:
--
-- insert into operadores (id, usuario, nome, admin, permissoes, ativo)
-- values ('COLE_O_USER_UID_AQUI', 'SEU_USUARIO', 'Seu Nome', true, '{}', true);
--
-- insert into operador_lojas (operador_id, loja_id)
-- values ('COLE_O_USER_UID_AQUI', '00000000-0000-0000-0000-000000000001');
--
-- ⚠️  O SEGUNDO insert é obrigatório desde a migration 0031 (multi-loja) e é
-- fácil de esquecer, porque esta migration é bem anterior a ela. Sem o vínculo
-- em `operador_lojas`, o admin entra no sistema mas não enxerga NADA que seja
-- por loja — depósito, configurações do Início, dados fiscais, OS, caixa, tudo
-- vazio — e ninguém consegue nem editar esse operador depois (ver
-- PROJETO_STATUS.md, seção 6, item 23). O backfill da 0031 só cobre operadores
-- que já existiam quando ela rodou, então num banco novo, criado do zero, o
-- primeiro admin sempre precisa deste insert à mão.
--
-- O UUID acima é o da "Loja 1", criada pela própria migration 0031 com id fixo.
-- Passo a passo completo de instalar uma empresa nova:
-- supabase/instalacao/INSTALAR-LOJA-NOVA.md


-- -------------------------------------------------------------------
-- 0008_operadores_fix_rls_recursiva.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0008: corrige recursão infinita na policy de escrita de `operadores`
--
-- A policy "operadores_escrita_admins" (migration 0007) verifica se quem está
-- logado é admin consultando a própria tabela `operadores` — isso faz o
-- Postgres reavaliar a mesma policy dentro da subconsulta, entrando num loop
-- ("infinite recursion detected in policy for relation operadores").
--
-- A correção padrão é fazer essa verificação dentro de uma função
-- `security definer`: ela roda com privilégio de dono da função, então a
-- consulta interna não passa pela RLS de novo, e a recursão para de existir.

create or replace function operador_atual_e_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from operadores
    where id = auth.uid()
      and admin = true
      and ativo = true
  );
$$;

drop policy if exists "operadores_escrita_admins" on operadores;
create policy "operadores_escrita_admins" on operadores
  for all
  using (operador_atual_e_admin())
  with check (operador_atual_e_admin());


-- -------------------------------------------------------------------
-- 0009_clientes_data_nascimento.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0009: data de nascimento do cliente (usada no calendário do Início,
-- pra marcar aniversário de cliente no mês). Idempotente: seguro rodar de novo.

alter table clientes
  add column if not exists data_nascimento date;


-- -------------------------------------------------------------------
-- 0010_pecas_campos_cadastro_completo.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0010: campos novos no cadastro de produto (código de barras,
-- marca, modelo, aplicação e os campos fiscais C.E.S.T. e origem da
-- mercadoria). Idempotente: seguro rodar de novo.

alter table pecas
  add column if not exists codigo_barras text,
  add column if not exists marca text,
  add column if not exists modelo text,
  add column if not exists aplicacao text,
  add column if not exists cest text,
  add column if not exists origem text;


-- -------------------------------------------------------------------
-- 0011_servicos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0011: catálogo de serviços (nome + preço padrão). Usado no
-- módulo "Serviços" e selecionável nos itens de Ordem de Serviço, no lugar
-- de digitar o serviço na mão toda vez.

create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  codigo_interno text,
  descricao text not null,
  preco_padrao numeric(12, 2),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- TEMPORÁRIO: mesma lógica das migrations anteriores (0002, 0003...) —
-- libera acesso pela chave pública; permissão de verdade fica na interface
-- (ver seção 6 do PROJETO_STATUS.md).
alter table servicos enable row level security;

drop policy if exists "servicos_acesso_temporario" on servicos;
create policy "servicos_acesso_temporario" on servicos
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0012_ordens_servico_campos_avancados.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0012: campos novos na Ordem de Serviço, pro redesenho da tela
-- (prazos de previsão/retorno, checklist básico do veículo nesta OS,
-- vendedor responsável e autoria de quem criou/alterou) e um vínculo direto
-- entre item de OS e o catálogo de serviços (migration 0011). Idempotente:
-- seguro rodar de novo.

alter table ordens_servico
  add column if not exists previsao_entrega timestamptz,
  add column if not exists data_retorno timestamptz,
  add column if not exists checklist_direcao_hidraulica boolean not null default false,
  add column if not exists checklist_ar_condicionado boolean not null default false,
  add column if not exists checklist_direcao_eletrica boolean not null default false,
  add column if not exists vendedor_id uuid references operadores (id),
  add column if not exists criado_por_id uuid references operadores (id),
  add column if not exists atualizado_por_id uuid references operadores (id);

alter table ordens_servico_itens
  add column if not exists servico_id uuid references servicos (id);


-- -------------------------------------------------------------------
-- 0013_os_tecnico_parcelas_juros.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0013: ajustes na tela de Ordem de Serviço a pedido do usuário —
-- remove o checklist do veículo (não vingou), adiciona técnico responsável
-- por item (peça/serviço), número de parcelas na OS faturada, e uma tabela
-- de configuração de juros por quantidade de parcelas (editável só pelo
-- admin em Configurações). Idempotente: seguro rodar de novo.

alter table ordens_servico
  drop column if exists checklist_direcao_hidraulica,
  drop column if exists checklist_ar_condicionado,
  drop column if exists checklist_direcao_eletrica;

alter table ordens_servico
  add column if not exists parcelas int not null default 1;

alter table ordens_servico_itens
  add column if not exists tecnico_id uuid references operadores (id);

create table if not exists configuracoes_juros_parcelas (
  numero_parcelas int primary key check (numero_parcelas between 2 and 12),
  juros_percentual numeric(6, 2) not null default 0
);

-- TEMPORÁRIO: mesma lógica das migrations anteriores — libera acesso pela
-- chave pública; permissão de verdade fica na interface (ver seção 6 do
-- PROJETO_STATUS.md). Só admin edita essa tela, mas isso é checado no app.
alter table configuracoes_juros_parcelas enable row level security;

drop policy if exists "configuracoes_juros_parcelas_acesso_temporario" on configuracoes_juros_parcelas;
create policy "configuracoes_juros_parcelas_acesso_temporario" on configuracoes_juros_parcelas
  for all
  using (true)
  with check (true);


-- -------------------------------------------------------------------
-- 0014_os_remove_prazos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0014: remove o card "Prazos" da tela de Ordem de Serviço a
-- pedido do usuário — não vingou. Idempotente: seguro rodar de novo.

alter table ordens_servico
  drop column if exists previsao_entrega,
  drop column if exists data_retorno;


-- -------------------------------------------------------------------
-- 0015_rls_exige_login.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0015: fecha o buraco de segurança documentado desde a migration
-- 0002 — as tabelas de negócio estavam com "using (true)" (qualquer um com a
-- chave anon, mesmo sem logar, lê/escreve tudo pela API do Supabase). Agora
-- todas exigem uma sessão autenticada (auth.uid() is not null). Continua sem
-- reforçar permissão por módulo aqui — isso segue checado só na interface,
-- decisão explícita do usuário (ver PROJETO_STATUS.md, item 1 da seção 6).
-- Idempotente: seguro rodar de novo.

drop policy if exists "clientes_acesso_temporario" on clientes;
drop policy if exists "clientes_acesso_autenticados" on clientes;
create policy "clientes_acesso_autenticados" on clientes
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "veiculos_acesso_temporario" on veiculos;
drop policy if exists "veiculos_acesso_autenticados" on veiculos;
create policy "veiculos_acesso_autenticados" on veiculos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "pecas_acesso_temporario" on pecas;
drop policy if exists "pecas_acesso_autenticados" on pecas;
create policy "pecas_acesso_autenticados" on pecas
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "estoque_movimentos_acesso_temporario" on estoque_movimentos;
drop policy if exists "estoque_movimentos_acesso_autenticados" on estoque_movimentos;
create policy "estoque_movimentos_acesso_autenticados" on estoque_movimentos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "servicos_acesso_temporario" on servicos;
drop policy if exists "servicos_acesso_autenticados" on servicos;
create policy "servicos_acesso_autenticados" on servicos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "ordens_servico_acesso_temporario" on ordens_servico;
drop policy if exists "ordens_servico_acesso_autenticados" on ordens_servico;
create policy "ordens_servico_acesso_autenticados" on ordens_servico
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "ordens_servico_itens_acesso_temporario" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_acesso_autenticados" on ordens_servico_itens;
create policy "ordens_servico_itens_acesso_autenticados" on ordens_servico_itens
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "caixa_movimentos_acesso_temporario" on caixa_movimentos;
drop policy if exists "caixa_movimentos_acesso_autenticados" on caixa_movimentos;
create policy "caixa_movimentos_acesso_autenticados" on caixa_movimentos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "configuracoes_juros_parcelas_acesso_temporario" on configuracoes_juros_parcelas;
drop policy if exists "configuracoes_juros_parcelas_acesso_autenticados" on configuracoes_juros_parcelas;
create policy "configuracoes_juros_parcelas_acesso_autenticados" on configuracoes_juros_parcelas
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0016_categorias_e_garantia.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0016: categoria de produto (tabela própria, reutilizável entre
-- peças — evita erro de digitação e permite renomear uma categoria e
-- refletir em todas as peças de uma vez) e prazo de garantia por peça
-- (usado na tela de Garantias; a garantia em si não vira tabela nova —
-- é calculada a partir da data de fechamento da OS + este prazo).
-- Idempotente: seguro rodar de novo.

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

alter table categorias enable row level security;

drop policy if exists "categorias_acesso_autenticados" on categorias;
create policy "categorias_acesso_autenticados" on categorias
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table pecas add column if not exists categoria_id uuid references categorias (id) on delete set null;
alter table pecas add column if not exists prazo_garantia_dias integer;


-- -------------------------------------------------------------------
-- 0017_contagens_estoque.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0017: contagem/inventário físico de estoque — registra a
-- contagem manual de um produto, o saldo que o sistema calculava no
-- momento e a diferença encontrada. O app gera automaticamente um
-- lançamento de ajuste em estoque_movimentos quando há diferença (mesmo
-- padrão que "Qtde. estoque inicial" já usa no cadastro de produto).
-- Idempotente: seguro rodar de novo.

create table if not exists contagens_estoque (
  id uuid primary key default gen_random_uuid(),
  peca_id uuid not null references pecas (id) on delete cascade,
  quantidade_contada numeric(12, 2) not null,
  saldo_sistema numeric(12, 2) not null,
  diferenca numeric(12, 2) not null,
  observacao text,
  operador_id uuid references operadores (id),
  criado_em timestamptz not null default now()
);

create index if not exists contagens_estoque_peca_id_idx on contagens_estoque (peca_id);

alter table contagens_estoque enable row level security;

drop policy if exists "contagens_estoque_acesso_autenticados" on contagens_estoque;
create policy "contagens_estoque_acesso_autenticados" on contagens_estoque
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0018_configuracoes_garantia.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0018: texto de garantia configurável, usado pelos botões
-- "Imprimir garantia"/"Baixar garantia" na aba Fechamento da OS. Loja única
-- (não multi-loja) — por isso uma tabela "singleton" (1 linha só, id fixo),
-- editável só pelo admin em Configurações. Ver PROJETO_STATUS.md seção 8.1.
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_garantia (
  id smallint primary key default 1,
  texto text not null,
  constraint configuracoes_garantia_singleton check (id = 1)
);

-- A linha padrão abaixo só faz sentido enquanto esta tabela é "singleton"
-- (coluna `id`). A partir da migration 0033 ela vira uma linha POR LOJA
-- (`loja_id`), e a própria 0033 cria as linhas de cada loja. Sem esta guarda,
-- reexecutar a sequência inteira num banco já atualizado quebraria aqui, com
-- "column id does not exist" — ver PROJETO_STATUS.md, seção 6, item 12.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'configuracoes_garantia'
      and column_name = 'id'
  ) then
    insert into configuracoes_garantia (id, texto)
    values (
      1,
      E'Certificado de Garantia\n\n' ||
      E'Cliente: {cliente}\n' ||
      E'Veículo: {veiculo}\n' ||
      E'Data de fechamento: {data}\n\n' ||
      E'Itens cobertos por esta garantia:\n{itens}\n\n' ||
      E'Esta garantia cobre defeitos de fabricação e instalação nos itens acima, ' ||
      E'conforme o prazo de garantia informado no momento da venda de cada peça/serviço.'
    )
    on conflict (id) do nothing;
  end if;
end
$$;

alter table configuracoes_garantia enable row level security;

drop policy if exists "configuracoes_garantia_acesso_autenticados" on configuracoes_garantia;
create policy "configuracoes_garantia_acesso_autenticados" on configuracoes_garantia
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0019_funcionarios.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0019: funcionarios — cadastro leve (nome, cargo, ativo) para
-- pessoal que não precisa de login no sistema, mas precisa ser selecionável
-- como técnico numa peça/serviço da OS ou como vendedor/atendente da OS.
--
-- Todo operador (quem loga no sistema) também é um funcionário por trás dos
-- panos: ao criar/editar um operador, um gatilho espelha automaticamente o
-- registro em funcionarios (ligado por operador_id), então o seletor de
-- técnico/vendedor sempre junta os dois grupos sem exigir cadastro duplicado.
--
-- tecnico_id (ordens_servico_itens) e vendedor_id (ordens_servico) passam a
-- apontar pra funcionarios em vez de operadores — criado_por_id/
-- atualizado_por_id continuam em operadores, porque esses são sobre quem
-- de fato mexeu no sistema (auditoria), não sobre quem presta o serviço.
--
-- Idempotente: seguro rodar de novo.

create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text,
  operador_id uuid unique references operadores (id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table funcionarios enable row level security;

drop policy if exists "funcionarios_acesso_autenticados" on funcionarios;
create policy "funcionarios_acesso_autenticados" on funcionarios
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Espelha todo operador já existente (não duplica se a migration rodar de novo).
insert into funcionarios (nome, operador_id, ativo)
select o.nome, o.id, o.ativo
from operadores o
where not exists (select 1 from funcionarios f where f.operador_id = o.id);

-- Mantém o espelho em dia quando um operador é criado ou tem nome/status alterado.
create or replace function sincroniza_funcionario_operador()
returns trigger as $$
begin
  insert into funcionarios (nome, operador_id, ativo)
  values (new.nome, new.id, new.ativo)
  on conflict (operador_id) do update
    set nome = excluded.nome, ativo = excluded.ativo;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sincroniza_funcionario_operador on operadores;
create trigger trg_sincroniza_funcionario_operador
  after insert or update of nome, ativo on operadores
  for each row execute function sincroniza_funcionario_operador();

-- Repontar ordens_servico_itens.tecnico_id de operadores(id) pra funcionarios(id).
-- Guardado por uma checagem do FK atual: se já foi migrado numa execução
-- anterior, o nome do constraint muda e a condição abaixo não bate de novo.
do $$
declare
  fk_target text;
begin
  select confrelid::regclass::text into fk_target
  from pg_constraint
  where conrelid = 'ordens_servico_itens'::regclass
    and conname = 'ordens_servico_itens_tecnico_id_fkey';

  if fk_target = 'operadores' then
    alter table ordens_servico_itens
      add column tecnico_funcionario_id uuid references funcionarios (id);

    update ordens_servico_itens i
    set tecnico_funcionario_id = f.id
    from funcionarios f
    where f.operador_id = i.tecnico_id;

    alter table ordens_servico_itens drop column tecnico_id;
    alter table ordens_servico_itens rename column tecnico_funcionario_id to tecnico_id;
    alter table ordens_servico_itens
      rename constraint ordens_servico_itens_tecnico_funcionario_id_fkey
      to ordens_servico_itens_tecnico_id_fkey;
  end if;
end $$;

-- Mesma coisa para ordens_servico.vendedor_id.
do $$
declare
  fk_target text;
begin
  select confrelid::regclass::text into fk_target
  from pg_constraint
  where conrelid = 'ordens_servico'::regclass
    and conname = 'ordens_servico_vendedor_id_fkey';

  if fk_target = 'operadores' then
    alter table ordens_servico
      add column vendedor_funcionario_id uuid references funcionarios (id);

    update ordens_servico o
    set vendedor_funcionario_id = f.id
    from funcionarios f
    where f.operador_id = o.vendedor_id;

    alter table ordens_servico drop column vendedor_id;
    alter table ordens_servico rename column vendedor_funcionario_id to vendedor_id;
    alter table ordens_servico
      rename constraint ordens_servico_vendedor_funcionario_id_fkey
      to ordens_servico_vendedor_id_fkey;
  end if;
end $$;


-- -------------------------------------------------------------------
-- 0020_categorias_caixa.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0020: categorias de caixa (aluguel, mercado, limpeza, sucata...)
-- pra classificar lançamentos manuais de entrada/saída no Caixa — usadas
-- pelas abas novas "Entradas" e "Saídas" dentro do módulo Caixa Diário.
-- Idempotente: seguro rodar de novo.

create table if not exists categorias_caixa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  criado_em timestamptz not null default now(),
  unique (nome, tipo)
);

alter table categorias_caixa enable row level security;

drop policy if exists "categorias_caixa_acesso_autenticados" on categorias_caixa;
create policy "categorias_caixa_acesso_autenticados" on categorias_caixa
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table caixa_movimentos
  add column if not exists categoria_id uuid references categorias_caixa (id) on delete set null;


-- -------------------------------------------------------------------
-- 0021_clientes_tipo_pessoa.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0021: tipo de pessoa (física/jurídica) no cadastro de cliente —
-- pedido da usuária pra diferenciar cliente pessoa física (CPF) de pessoa
-- jurídica/empresa (CNPJ). Idempotente: seguro rodar de novo.

alter table clientes
  add column if not exists tipo_pessoa text not null default 'fisica'
  check (tipo_pessoa in ('fisica', 'juridica'));


-- -------------------------------------------------------------------
-- 0022_funcionarios_dados_completos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0022: amplia o cadastro de Funcionários com os campos de RH que a
-- usuária pediu depois de ver o cadastro de um sistema de referência
-- (documentos, endereço/contato, cargo/admissão, família) — dados de saúde
-- (enfermidades/medicamentos) ficaram de fora por escolha explícita dela
-- (dado sensível, mais cuidado de LGPD). Idempotente: seguro rodar de novo.

alter table funcionarios
  -- Documentos e dados pessoais
  add column if not exists cpf text,
  add column if not exists rg text,
  add column if not exists cnh_categoria text,
  add column if not exists cnh_numero text,
  add column if not exists data_nascimento date,
  add column if not exists estado_civil text,
  add column if not exists tipo_sanguineo text,
  -- Endereço e contato
  add column if not exists cep text,
  add column if not exists endereco text,
  add column if not exists numero text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists complemento text,
  add column if not exists telefone text,
  add column if not exists celular text,
  add column if not exists email text,
  -- Cargo e admissão (cargo em si já existia)
  add column if not exists pis text,
  add column if not exists codigo_registro text,
  add column if not exists cbo text,
  add column if not exists salario numeric,
  add column if not exists comissao numeric,
  add column if not exists admissao date,
  add column if not exists data_ferias date,
  -- Família: filiação e cônjuge
  add column if not exists pai text,
  add column if not exists mae text,
  add column if not exists naturalidade text,
  add column if not exists sexo text,
  add column if not exists conjuge_nome text,
  add column if not exists conjuge_nascimento date,
  add column if not exists data_casamento date,
  add column if not exists conjuge_telefone text,
  add column if not exists conjuge_celular text;

-- Família: filhos (lista, um funcionário pode ter vários).
create table if not exists funcionario_filhos (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references funcionarios (id) on delete cascade,
  nome text not null,
  data_nascimento date,
  criado_em timestamptz not null default now()
);

alter table funcionario_filhos enable row level security;

drop policy if exists "funcionario_filhos_acesso_autenticados" on funcionario_filhos;
create policy "funcionario_filhos_acesso_autenticados" on funcionario_filhos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0023_notas_fiscais_xml.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0023: módulo "Notas Fiscais" — guarda os arquivos XML de NFe/NFS-e
-- organizados por mês, com vínculo opcional a uma Ordem de Serviço. A emissão
-- fiscal automática ainda não existe (ver PROJETO_STATUS.md), então por
-- enquanto o upload é manual: a usuária sobe o XML da nota que já emite por
-- fora. Quando a emissão automática for construída, ela pode gravar direto
-- nessa mesma tabela/bucket em vez do upload manual.
--
-- Primeira vez que este projeto usa o Supabase Storage — cria um bucket
-- privado ("notas-fiscais") além da tabela de metadados de sempre.
-- Idempotente: seguro rodar de novo.

insert into storage.buckets (id, name, public)
values ('notas-fiscais', 'notas-fiscais', false)
on conflict (id) do nothing;

drop policy if exists "notas_fiscais_storage_acesso_autenticados" on storage.objects;
create policy "notas_fiscais_storage_acesso_autenticados" on storage.objects
  for all
  using (bucket_id = 'notas-fiscais' and auth.uid() is not null)
  with check (bucket_id = 'notas-fiscais' and auth.uid() is not null);

create table if not exists notas_fiscais_arquivos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('nfe', 'nfse')),
  competencia date not null,
  nome_arquivo text not null,
  storage_path text not null,
  ordem_servico_id uuid references ordens_servico (id) on delete set null,
  operador_id uuid references operadores (id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table notas_fiscais_arquivos enable row level security;

drop policy if exists "notas_fiscais_arquivos_acesso_autenticados" on notas_fiscais_arquivos;
create policy "notas_fiscais_arquivos_acesso_autenticados" on notas_fiscais_arquivos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0024_configuracoes_fiscais_loja.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0024: dados fiscais da loja + preparação para emissão automática
-- de nota fiscal via Focus NFe (ainda não habilitada — falta a usuária
-- assinar um plano e colar o token aqui). Loja única (não multi-loja), por
-- isso uma tabela "singleton" (1 linha só, id fixo), editável só pelo admin
-- em Configurações. Ver PROJETO_STATUS.md seção 8, item 1.
--
-- Também prepara `notas_fiscais_arquivos` (migration 0023) para guardar
-- documentos emitidos automaticamente, não só upload manual de XML — mesma
-- tabela/bucket, só com campos novos pra registrar o retorno do provedor
-- fiscal (número, chave de acesso, status).
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_fiscais_loja (
  id smallint primary key default 1,
  cnpj text,
  razao_social text,
  nome_fantasia text,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario text check (regime_tributario in ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  uf text,
  telefone text,
  email text,
  focus_nfe_token text,
  focus_nfe_ambiente text not null default 'homologacao' check (focus_nfe_ambiente in ('homologacao', 'producao')),
  atualizado_em timestamptz not null default now(),
  constraint configuracoes_fiscais_loja_singleton check (id = 1)
);

-- A linha padrão abaixo só faz sentido enquanto esta tabela é "singleton"
-- (coluna `id`). A partir da migration 0033 ela vira uma linha POR LOJA
-- (`loja_id`), e a própria 0033 cria as linhas de cada loja. Sem esta guarda,
-- reexecutar a sequência inteira num banco já atualizado quebraria aqui, com
-- "column id does not exist" — ver PROJETO_STATUS.md, seção 6, item 12.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'configuracoes_fiscais_loja'
      and column_name = 'id'
  ) then
    insert into configuracoes_fiscais_loja (id)
    values (1)
    on conflict (id) do nothing;
  end if;
end
$$;

alter table configuracoes_fiscais_loja enable row level security;

drop policy if exists "configuracoes_fiscais_loja_acesso_autenticados" on configuracoes_fiscais_loja;
create policy "configuracoes_fiscais_loja_acesso_autenticados" on configuracoes_fiscais_loja
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table notas_fiscais_arquivos
  add column if not exists origem text not null default 'manual'
  check (origem in ('manual', 'automatica'));

alter table notas_fiscais_arquivos add column if not exists numero text;
alter table notas_fiscais_arquivos add column if not exists chave_acesso text;
alter table notas_fiscais_arquivos add column if not exists status text;


-- -------------------------------------------------------------------
-- 0025_contas_pagar.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0025: módulo "Contas a Pagar" — contas mensais (aluguel, etc.)
-- com data de vencimento, diferente das Entradas/Saídas manuais do Caixa
-- (que só registram dinheiro que já saiu). Ao marcar uma conta como paga, o
-- app gera automaticamente uma Saída em caixa_movimentos (mesmo padrão do
-- faturamento de OS) e, se a conta for recorrente, já cria a próxima
-- ocorrência (mesmo valor, vencimento um mês depois). Ver PROJETO_STATUS.md.
-- Idempotente: seguro rodar de novo.

create table if not exists contas_pagar (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric not null,
  vencimento date not null,
  categoria_id uuid references categorias_caixa (id) on delete set null,
  recorrente boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente', 'paga')),
  data_pagamento timestamptz,
  caixa_movimento_id uuid references caixa_movimentos (id) on delete set null,
  operador_id uuid references operadores (id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table contas_pagar enable row level security;

drop policy if exists "contas_pagar_acesso_autenticados" on contas_pagar;
create policy "contas_pagar_acesso_autenticados" on contas_pagar
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0026_configuracoes_painel_inicio.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0026: quais 3 indicadores aparecem nos cartões de tendência da
-- tela Início. Ajuste único pra loja inteira (não por operador) — decisão da
-- usuária: mais simples, todo mundo vê os mesmos cartões. Loja única, por
-- isso tabela "singleton" (1 linha só, id fixo), editável só pelo admin em
-- Configurações. Ver PROJETO_STATUS.md.
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_painel_inicio (
  id smallint primary key default 1,
  cartoes text[] not null default array['vendas_mes', 'lucro_mes', 'ticket_medio_mes'],
  constraint configuracoes_painel_inicio_singleton check (id = 1)
);

-- A linha padrão abaixo só faz sentido enquanto esta tabela é "singleton"
-- (coluna `id`). A partir da migration 0033 ela vira uma linha POR LOJA
-- (`loja_id`), e a própria 0033 cria as linhas de cada loja. Sem esta guarda,
-- reexecutar a sequência inteira num banco já atualizado quebraria aqui, com
-- "column id does not exist" — ver PROJETO_STATUS.md, seção 6, item 12.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'configuracoes_painel_inicio'
      and column_name = 'id'
  ) then
    insert into configuracoes_painel_inicio (id, cartoes)
    values (1, array['vendas_mes', 'lucro_mes', 'ticket_medio_mes'])
    on conflict (id) do nothing;
  end if;
end
$$;

alter table configuracoes_painel_inicio enable row level security;

drop policy if exists "configuracoes_painel_inicio_acesso_autenticados" on configuracoes_painel_inicio;
create policy "configuracoes_painel_inicio_acesso_autenticados" on configuracoes_painel_inicio
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0027_veiculos_tipo.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0027: tipo de veículo (usado pra escolher o ícone certo na seção
-- "Veículos no pátio" do Início). Conjunto simplificado de propósito — carro
-- em 4 carrocerias (hatch/sedã/SUV/picape) + moto como um ícone só (a
-- usuária confirmou que não vale a pena detalhar tipos de moto, já que quase
-- não aparece moto na borracharia). Nenhum veículo já cadastrado quebra:
-- coluna opcional, sem valor default forçado (fica null até alguém escolher
-- ao editar/cadastrar de novo).
-- Idempotente: seguro rodar de novo.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'veiculos' and column_name = 'tipo'
  ) then
    alter table veiculos add column tipo text;
  end if;
end $$;

alter table veiculos drop constraint if exists veiculos_tipo_check;
alter table veiculos add constraint veiculos_tipo_check
  check (tipo is null or tipo in ('hatch', 'sedan', 'suv', 'picape', 'moto'));


-- -------------------------------------------------------------------
-- 0028_merge_relatorios_lucratividade.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0028: o módulo "Lucratividade" foi absorvido dentro de "Relações"
-- (agora com abas Gráficos/Lucratividade, mesmo padrão de Estoque e Caixa
-- Diário). A chave "lucratividade" deixou de existir em MODULOS
-- (src/types/operador.ts) — quem tinha só essa permissão liberada (sem ter
-- "relatorios") precisa ganhar "relatorios" pra não perder acesso.
-- Idempotente: seguro rodar de novo.

update operadores
set permissoes = array_append(permissoes, 'relatorios')
where 'lucratividade' = any(permissoes)
  and not ('relatorios' = any(permissoes));

update operadores
set permissoes = array_remove(permissoes, 'lucratividade')
where 'lucratividade' = any(permissoes);


-- -------------------------------------------------------------------
-- 0029_categorias_servicos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0029: categoria de serviço (tabela própria, mesmo padrão de
-- "categorias" pra peças) — agrupa o catálogo de serviços por área do
-- veículo (Pneus, Suspensão, Amortecedores, Freios, Alinhamento...),
-- selecionável no cadastro de serviço em Configurações → "Categorias de
-- serviço". Tabela separada de "categorias" (que é só pra produtos) —
-- o conceito é diferente, mesmo padrão já usado com "categorias_caixa".
-- Idempotente: seguro rodar de novo.

create table if not exists categorias_servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);

alter table categorias_servicos enable row level security;

drop policy if exists "categorias_servicos_acesso_autenticados" on categorias_servicos;
create policy "categorias_servicos_acesso_autenticados" on categorias_servicos
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table servicos
  add column if not exists categoria_id uuid references categorias_servicos (id) on delete set null;


-- -------------------------------------------------------------------
-- 0030_categorias_e_servicos_padrao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0030: categorias de peça, categorias de serviço e um catálogo
-- inicial de serviços — baseado na organização de uma ficha de orçamento de
-- referência (autocenter de pneus/mecânica), só como ponto de partida.
-- Nenhum preço vem preenchido (a usuária define os valores reais depois) e
-- nenhuma "peça" (produto) é criada aqui — cadastrar peça exige dados
-- fiscais (NCM/CFOP/CST-CSOSN/ICMS) reais, que não dá pra adivinhar com
-- segurança a partir de uma ficha de outra loja.
-- Idempotente: seguro rodar de novo (usa "on conflict do nothing" e
-- "where not exists").

insert into categorias (nome) values
  ('Pneus'),
  ('Suspensão'),
  ('Amortecedores'),
  ('Freios'),
  ('Outras Peças')
on conflict (nome) do nothing;

insert into categorias_servicos (nome) values
  ('Pneus'),
  ('Suspensão'),
  ('Amortecedores'),
  ('Freios'),
  ('Alinhamento'),
  ('Outros Serviços')
on conflict (nome) do nothing;

insert into servicos (descricao, categoria_id, preco_padrao, ativo)
select v.descricao, cs.id, null, true
from (
  values
    ('Alinhamento Dianteiro', 'Pneus'),
    ('Balanceamento', 'Pneus'),
    ('Montagem de Pneu', 'Pneus'),
    ('Rodízio de Pneus', 'Pneus'),
    ('Serviço técnico – Suspensão', 'Suspensão'),
    ('Serviço técnico – Amortecedores', 'Amortecedores'),
    ('Retífica de Disco de Freio', 'Freios'),
    ('Higienização de Freio', 'Freios'),
    ('Sangria de Freio', 'Freios'),
    ('Serviço técnico – Freios', 'Freios'),
    ('Alinhamento Traseiro', 'Alinhamento'),
    ('Cambagem Dianteira Direita', 'Alinhamento'),
    ('Cambagem Dianteira Esquerda', 'Alinhamento'),
    ('Caster Dianteiro Direito', 'Alinhamento'),
    ('Caster Dianteiro Esquerdo', 'Alinhamento'),
    ('Eixo Traseiro Completo', 'Alinhamento'),
    ('Serviço técnico – Outros', 'Outros Serviços')
) as v(descricao, categoria_nome)
join categorias_servicos cs on cs.nome = v.categoria_nome
where not exists (
  select 1 from servicos s where s.descricao = v.descricao
);


-- -------------------------------------------------------------------
-- 0031_lojas_e_operador_lojas.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0031: fundação multi-loja, parte 1 — tabela `lojas`, vínculo
-- many-to-many `operador_lojas` (um operador pode ter acesso a mais de uma
-- loja — ex: o dono vendo as duas lojas, um balconista só a dele) e as
-- funções de apoio pra RLS por loja.
--
-- A loja em uso hoje (produção, dados reais) vira a "loja 1", com um UUID
-- fixo e conhecido (não gerado na hora) — assim o backfill é sempre
-- idempotente, mesmo rodando a migration de novo.
--
-- `operadores.admin` continua sendo um único boolean por operador (não uma
-- flag por loja): um "admin só da loja A" é um operador com admin=true e
-- 1 linha em operador_lojas; o dono que administra as duas lojas é um
-- operador com admin=true e 2 linhas. Ver PROJETO_STATUS.md seção 3/6.
--
-- Migrations 0032 e 0033 continuam essa fundação (loja_id nas tabelas
-- operacionais, e as tabelas de configuração viram "1 linha por loja"). A
-- ordem entre as três importa: esta migration precisa rodar inteira antes,
-- porque as próximas dependem das funções e da tabela operador_lojas já
-- populada.
-- Idempotente: seguro rodar de novo.

create table if not exists lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cidade text,
  uf text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Loja 1 = a loja única que já existe hoje. UUID fixo de propósito (não
-- gen_random_uuid()) pra todo o resto desta migration e das próximas poder
-- referenciar essa loja de forma previsível no backfill.
insert into lojas (id, nome)
values ('00000000-0000-0000-0000-000000000001', 'Loja 1')
on conflict (id) do nothing;

alter table lojas enable row level security;

drop policy if exists "lojas_leitura_autenticados" on lojas;
create policy "lojas_leitura_autenticados" on lojas
  for select
  using (auth.uid() is not null);

create table if not exists operador_lojas (
  operador_id uuid not null references operadores (id) on delete cascade,
  loja_id uuid not null references lojas (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (operador_id, loja_id)
);

-- Dá acesso à loja 1 pra todo operador já existente — sem isso, assim que a
-- RLS por loja entrar em vigor (migrations 0032/0033), ninguém conseguiria
-- ver nada.
insert into operador_lojas (operador_id, loja_id)
select o.id, '00000000-0000-0000-0000-000000000001'
from operadores o
where not exists (
  select 1 from operador_lojas ol
  where ol.operador_id = o.id and ol.loja_id = '00000000-0000-0000-0000-000000000001'
);

alter table operador_lojas enable row level security;

drop policy if exists "operador_lojas_leitura_autenticados" on operador_lojas;
create policy "operador_lojas_leitura_autenticados" on operador_lojas
  for select
  using (auth.uid() is not null);

-- As funções abaixo são `security definer` — a consulta interna não passa
-- pela RLS de novo, então checar a própria tabela `operadores`/
-- `operador_lojas` dentro delas não causa recursão infinita. Mesmo motivo
-- documentado na migration 0008 pra `operador_atual_e_admin()`.

-- O operador logado tem acesso (admin ou não) a essa loja?
create or replace function operador_tem_acesso_loja(p_loja_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from operador_lojas
    where operador_id = auth.uid() and loja_id = p_loja_id
  );
$$;

-- O operador logado é admin especificamente dessa loja?
create or replace function operador_e_admin_da_loja(p_loja_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from operador_lojas ol
    join operadores o on o.id = ol.operador_id
    where ol.operador_id = auth.uid()
      and ol.loja_id = p_loja_id
      and o.admin = true
      and o.ativo = true
  );
$$;

-- O operador logado é admin de QUALQUER loja (usado só em INSERT, onde
-- ainda não existe vínculo operador_lojas com o alvo que está sendo criado).
create or replace function operador_atual_e_admin_de_alguma_loja()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from operador_lojas ol
    join operadores o on o.id = ol.operador_id
    where ol.operador_id = auth.uid()
      and o.admin = true
      and o.ativo = true
  );
$$;

-- O operador logado administra o operador-alvo (ou seja: é admin em pelo
-- menos uma loja que o alvo também tem acesso)?
create or replace function operador_administra(p_operador_alvo_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from operador_lojas ol_admin
    join operadores admin_atual on admin_atual.id = ol_admin.operador_id
    join operador_lojas ol_alvo on ol_alvo.loja_id = ol_admin.loja_id
    where ol_admin.operador_id = auth.uid()
      and admin_atual.admin = true
      and admin_atual.ativo = true
      and ol_alvo.operador_id = p_operador_alvo_id
  );
$$;

-- INSERT em lojas: precisa ser admin de pelo menos uma loja (não dá pra
-- exigir "admin daquela loja" porque ela ainda não existe nesse momento).
drop policy if exists "lojas_insercao_admins" on lojas;
create policy "lojas_insercao_admins" on lojas
  for insert
  with check (operador_atual_e_admin_de_alguma_loja());

drop policy if exists "lojas_atualizacao_admins" on lojas;
create policy "lojas_atualizacao_admins" on lojas
  for update
  using (operador_e_admin_da_loja(id))
  with check (operador_e_admin_da_loja(id));

-- Escrita em operador_lojas: só quem já é admin daquela loja específica pode
-- dar/tirar acesso de alguém a ela — é aqui, e não no INSERT de `operadores`,
-- que o limite "admin da loja A não dá acesso à loja B" é reforçado.
drop policy if exists "operador_lojas_escrita_admins" on operador_lojas;
create policy "operador_lojas_escrita_admins" on operador_lojas
  for all
  using (operador_e_admin_da_loja(loja_id))
  with check (operador_e_admin_da_loja(loja_id));

-- `operadores`: leitura continua igual (qualquer logado lê a lista inteira,
-- de todas as lojas — decisão deliberada, ver PROJETO_STATUS.md seção 6).
-- Escrita passa a ser loja-aware: criar exige ser admin de alguma loja;
-- editar/excluir exige administrar especificamente aquele operador-alvo
-- (compartilhar uma loja onde quem está logado é admin).
drop policy if exists "operadores_escrita_admins" on operadores;

drop policy if exists "operadores_insercao_admins" on operadores;
create policy "operadores_insercao_admins" on operadores
  for insert
  with check (operador_atual_e_admin_de_alguma_loja());

drop policy if exists "operadores_atualizacao_admins" on operadores;
create policy "operadores_atualizacao_admins" on operadores
  for update
  using (operador_administra(id))
  with check (operador_administra(id));

drop policy if exists "operadores_exclusao_admins" on operadores;
create policy "operadores_exclusao_admins" on operadores
  for delete
  using (operador_administra(id));


-- -------------------------------------------------------------------
-- 0032_loja_id_tabelas_por_loja.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0032: fundação multi-loja, parte 2 — adiciona `loja_id` nas
-- tabelas operacionais (o que é fisicamente/operacionalmente de uma loja só:
-- estoque, contagem, OS, caixa, contas a pagar, notas fiscais, funcionários)
-- e reescreve a RLS delas pra checar acesso à loja, não só login.
--
-- O que continua compartilhado entre as lojas (clientes, veículos, peças,
-- serviços, categorias) NÃO muda nesta migration — decisão explícita da
-- usuária, ver PROJETO_STATUS.md.
--
-- Toda coluna nova segue nullable → backfill pra loja 1 → not null, nessa
-- ordem, pra nunca deixar a produção real inacessível no meio do caminho.
-- Depende da migration 0031 já ter rodado (funções de apoio + operador_lojas
-- populada). Idempotente: seguro rodar de novo.

-- estoque_movimentos
alter table estoque_movimentos add column if not exists loja_id uuid references lojas (id);
update estoque_movimentos set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
alter table estoque_movimentos alter column loja_id set not null;
create index if not exists estoque_movimentos_loja_id_idx on estoque_movimentos (loja_id);

drop policy if exists "estoque_movimentos_acesso_autenticados" on estoque_movimentos;
drop policy if exists "estoque_movimentos_acesso_por_loja" on estoque_movimentos;
create policy "estoque_movimentos_acesso_por_loja" on estoque_movimentos
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- contagens_estoque
alter table contagens_estoque add column if not exists loja_id uuid references lojas (id);
update contagens_estoque set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
alter table contagens_estoque alter column loja_id set not null;
create index if not exists contagens_estoque_loja_id_idx on contagens_estoque (loja_id);

drop policy if exists "contagens_estoque_acesso_autenticados" on contagens_estoque;
drop policy if exists "contagens_estoque_acesso_por_loja" on contagens_estoque;
create policy "contagens_estoque_acesso_por_loja" on contagens_estoque
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- ordens_servico
alter table ordens_servico add column if not exists loja_id uuid references lojas (id);
update ordens_servico set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
alter table ordens_servico alter column loja_id set not null;
create index if not exists ordens_servico_loja_id_idx on ordens_servico (loja_id);

drop policy if exists "ordens_servico_acesso_autenticados" on ordens_servico;
drop policy if exists "ordens_servico_acesso_por_loja" on ordens_servico;
create policy "ordens_servico_acesso_por_loja" on ordens_servico
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- ordens_servico_itens: não ganha loja_id próprio, herda via ordens_servico.
drop policy if exists "ordens_servico_itens_acesso_autenticados" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_acesso_por_loja" on ordens_servico_itens;
create policy "ordens_servico_itens_acesso_por_loja" on ordens_servico_itens
  for all
  using (
    exists (
      select 1 from ordens_servico os
      where os.id = ordens_servico_itens.ordem_servico_id
        and operador_tem_acesso_loja(os.loja_id)
    )
  )
  with check (
    exists (
      select 1 from ordens_servico os
      where os.id = ordens_servico_itens.ordem_servico_id
        and operador_tem_acesso_loja(os.loja_id)
    )
  );

-- caixa_movimentos: não dá pra herdar de ordens_servico porque existem
-- lançamentos manuais (Entradas/Saídas) sem ordem_servico_id.
alter table caixa_movimentos add column if not exists loja_id uuid references lojas (id);
update caixa_movimentos set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
alter table caixa_movimentos alter column loja_id set not null;
create index if not exists caixa_movimentos_loja_id_idx on caixa_movimentos (loja_id);

drop policy if exists "caixa_movimentos_acesso_autenticados" on caixa_movimentos;
drop policy if exists "caixa_movimentos_acesso_por_loja" on caixa_movimentos;
create policy "caixa_movimentos_acesso_por_loja" on caixa_movimentos
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- contas_pagar
alter table contas_pagar add column if not exists loja_id uuid references lojas (id);
update contas_pagar set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
alter table contas_pagar alter column loja_id set not null;
create index if not exists contas_pagar_loja_id_idx on contas_pagar (loja_id);

drop policy if exists "contas_pagar_acesso_autenticados" on contas_pagar;
drop policy if exists "contas_pagar_acesso_por_loja" on contas_pagar;
create policy "contas_pagar_acesso_por_loja" on contas_pagar
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- notas_fiscais_arquivos (o bucket de Storage em si continua sem segmentação
-- por loja — decisão de escopo documentada no PROJETO_STATUS.md; a tabela de
-- metadados, que é por onde o app sempre lê, já fica isolada corretamente)
alter table notas_fiscais_arquivos add column if not exists loja_id uuid references lojas (id);
update notas_fiscais_arquivos set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
alter table notas_fiscais_arquivos alter column loja_id set not null;
create index if not exists notas_fiscais_arquivos_loja_id_idx on notas_fiscais_arquivos (loja_id);

drop policy if exists "notas_fiscais_arquivos_acesso_autenticados" on notas_fiscais_arquivos;
drop policy if exists "notas_fiscais_arquivos_acesso_por_loja" on notas_fiscais_arquivos;
create policy "notas_fiscais_arquivos_acesso_por_loja" on notas_fiscais_arquivos
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- funcionarios: EXCEÇÃO — loja_id fica nullable de propósito. O gatilho
-- trg_sincroniza_funcionario_operador (migration 0019) cria a linha em
-- funcionarios no momento do INSERT em operadores, antes do app inserir as
-- linhas em operador_lojas daquele operador novo (isso só acontece depois,
-- na mesma função de criação) — se loja_id fosse not null, o gatilho
-- quebraria. src/lib/operadores.ts preenche loja_id logo em seguida, via
-- UPDATE, assim que operador_lojas é populada. Enquanto loja_id está nulo, o
-- funcionário fica invisível pra todo mundo via RLS (comportamento seguro
-- por padrão, não é bug). Funcionários sem login (mecânico sem operador_id)
-- recebem loja_id direto no cadastro pela tela de Funcionários.
alter table funcionarios add column if not exists loja_id uuid references lojas (id);
update funcionarios set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;
create index if not exists funcionarios_loja_id_idx on funcionarios (loja_id);

drop policy if exists "funcionarios_acesso_autenticados" on funcionarios;
drop policy if exists "funcionarios_acesso_por_loja" on funcionarios;
create policy "funcionarios_acesso_por_loja" on funcionarios
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- funcionario_filhos: não ganha loja_id próprio, herda via funcionarios.
drop policy if exists "funcionario_filhos_acesso_autenticados" on funcionario_filhos;
drop policy if exists "funcionario_filhos_acesso_por_loja" on funcionario_filhos;
create policy "funcionario_filhos_acesso_por_loja" on funcionario_filhos
  for all
  using (
    exists (
      select 1 from funcionarios f
      where f.id = funcionario_filhos.funcionario_id
        and operador_tem_acesso_loja(f.loja_id)
    )
  )
  with check (
    exists (
      select 1 from funcionarios f
      where f.id = funcionario_filhos.funcionario_id
        and operador_tem_acesso_loja(f.loja_id)
    )
  );


-- -------------------------------------------------------------------
-- 0033_configuracoes_por_loja.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0033: fundação multi-loja, parte 3 — as tabelas de configuração
-- que hoje são "singleton" (1 linha só, id fixo em 1: configuracoes_garantia,
-- configuracoes_fiscais_loja, configuracoes_painel_inicio) passam a ter
-- 1 linha POR LOJA, trocando a PK de `id smallint` pra `loja_id uuid`.
-- `configuracoes_juros_parcelas` não é singleton (1 linha por
-- numero_parcelas, 2 a 12) — a PK vira composta (loja_id, numero_parcelas).
--
-- Troca de PK não é uma mudança aditiva, então cada tabela usa um bloco
-- guardado (checa o estado atual antes de alterar) pra continuar
-- idempotente — mesmo padrão usado na migration 0019 ao repontar FKs de
-- tecnico_id/vendedor_id. Depende das migrations 0031/0032 já terem
-- rodado. Idempotente: seguro rodar de novo.

-- configuracoes_garantia
alter table configuracoes_garantia add column if not exists loja_id uuid references lojas (id);
update configuracoes_garantia set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'configuracoes_garantia' and column_name = 'id'
  ) then
    alter table configuracoes_garantia alter column loja_id set not null;
    alter table configuracoes_garantia drop constraint configuracoes_garantia_pkey;
    alter table configuracoes_garantia drop constraint if exists configuracoes_garantia_singleton;
    alter table configuracoes_garantia add constraint configuracoes_garantia_pkey primary key (loja_id);
    alter table configuracoes_garantia drop column id;
  end if;
end $$;

drop policy if exists "configuracoes_garantia_acesso_autenticados" on configuracoes_garantia;
drop policy if exists "configuracoes_garantia_acesso_por_loja" on configuracoes_garantia;
create policy "configuracoes_garantia_acesso_por_loja" on configuracoes_garantia
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- configuracoes_fiscais_loja
alter table configuracoes_fiscais_loja add column if not exists loja_id uuid references lojas (id);
update configuracoes_fiscais_loja set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'configuracoes_fiscais_loja' and column_name = 'id'
  ) then
    alter table configuracoes_fiscais_loja alter column loja_id set not null;
    alter table configuracoes_fiscais_loja drop constraint configuracoes_fiscais_loja_pkey;
    alter table configuracoes_fiscais_loja drop constraint if exists configuracoes_fiscais_loja_singleton;
    alter table configuracoes_fiscais_loja add constraint configuracoes_fiscais_loja_pkey primary key (loja_id);
    alter table configuracoes_fiscais_loja drop column id;
  end if;
end $$;

drop policy if exists "configuracoes_fiscais_loja_acesso_autenticados" on configuracoes_fiscais_loja;
drop policy if exists "configuracoes_fiscais_loja_acesso_por_loja" on configuracoes_fiscais_loja;
create policy "configuracoes_fiscais_loja_acesso_por_loja" on configuracoes_fiscais_loja
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- configuracoes_painel_inicio
alter table configuracoes_painel_inicio add column if not exists loja_id uuid references lojas (id);
update configuracoes_painel_inicio set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'configuracoes_painel_inicio' and column_name = 'id'
  ) then
    alter table configuracoes_painel_inicio alter column loja_id set not null;
    alter table configuracoes_painel_inicio drop constraint configuracoes_painel_inicio_pkey;
    alter table configuracoes_painel_inicio drop constraint if exists configuracoes_painel_inicio_singleton;
    alter table configuracoes_painel_inicio add constraint configuracoes_painel_inicio_pkey primary key (loja_id);
    alter table configuracoes_painel_inicio drop column id;
  end if;
end $$;

drop policy if exists "configuracoes_painel_inicio_acesso_autenticados" on configuracoes_painel_inicio;
drop policy if exists "configuracoes_painel_inicio_acesso_por_loja" on configuracoes_painel_inicio;
create policy "configuracoes_painel_inicio_acesso_por_loja" on configuracoes_painel_inicio
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- configuracoes_juros_parcelas: não é singleton — PK vira composta
-- (loja_id, numero_parcelas) em vez de só numero_parcelas.
alter table configuracoes_juros_parcelas add column if not exists loja_id uuid references lojas (id);
update configuracoes_juros_parcelas set loja_id = '00000000-0000-0000-0000-000000000001' where loja_id is null;

do $$
begin
  if not exists (
    select 1 from information_schema.key_column_usage
    where table_name = 'configuracoes_juros_parcelas'
      and column_name = 'loja_id'
      and constraint_name = 'configuracoes_juros_parcelas_pkey'
  ) then
    alter table configuracoes_juros_parcelas alter column loja_id set not null;
    alter table configuracoes_juros_parcelas drop constraint configuracoes_juros_parcelas_pkey;
    alter table configuracoes_juros_parcelas add constraint configuracoes_juros_parcelas_pkey
      primary key (loja_id, numero_parcelas);
  end if;
end $$;

drop policy if exists "configuracoes_juros_parcelas_acesso_autenticados" on configuracoes_juros_parcelas;
drop policy if exists "configuracoes_juros_parcelas_acesso_por_loja" on configuracoes_juros_parcelas;
create policy "configuracoes_juros_parcelas_acesso_por_loja" on configuracoes_juros_parcelas
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));


-- -------------------------------------------------------------------
-- 0034_corrige_rls_criacao_loja.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0034: corrige um bug real de RLS que impedia criar uma loja nova
-- pelo app.
--
-- O que acontecia: `criarLoja()` (src/lib/lojas.ts) faz dois inserts — 1) a
-- loja em si, 2) o vínculo do operador criador em `operador_lojas` (senão
-- ele ficaria sem acesso à loja que acabou de criar). O primeiro insert
-- sempre funcionava (a policy `lojas_insercao_admins` só exige ser admin de
-- QUALQUER loja). O segundo insert sempre FALHAVA: a policy
-- `operador_lojas_escrita_admins` (migration 0031) exigia
-- `operador_e_admin_da_loja(loja_id)`, que checa se já existe uma linha em
-- `operador_lojas` ligando esse operador a essa loja — só que essa é
-- exatamente a linha que o insert está tentando criar (problema do
-- "ovo e a galinha"). Resultado: a loja nova ficava criada (órfã, sem
-- ninguém vinculado a ela) e o app mostrava um erro no segundo passo.
--
-- Correção: divide a policy "for all" em duas (insert vs. update/delete).
-- A de insert ganha um caminho de bootstrap — o próprio operador pode se
-- vincular a uma loja que AINDA não tem ninguém vinculado, desde que ele já
-- seja admin de alguma outra loja (mesma função usada pra permitir o insert
-- em `lojas`). Isso preserva o isolamento entre lojas: só funciona enquanto
-- a loja alvo está "zerada"; depois que ela já tem algum vínculo, só quem já
-- é admin especificamente dela pode mexer (igual antes).
-- Idempotente: seguro rodar de novo.

drop policy if exists "operador_lojas_escrita_admins" on operador_lojas;
drop policy if exists "operador_lojas_insercao" on operador_lojas;
drop policy if exists "operador_lojas_atualizacao" on operador_lojas;
drop policy if exists "operador_lojas_exclusao" on operador_lojas;

create policy "operador_lojas_insercao" on operador_lojas
  for insert
  with check (
    (
      operador_id = auth.uid()
      and operador_atual_e_admin_de_alguma_loja()
      and not exists (
        select 1 from operador_lojas ol_existente
        where ol_existente.loja_id = operador_lojas.loja_id
      )
    )
    or operador_e_admin_da_loja(loja_id)
  );

create policy "operador_lojas_atualizacao" on operador_lojas
  for update
  using (operador_e_admin_da_loja(loja_id))
  with check (operador_e_admin_da_loja(loja_id));

create policy "operador_lojas_exclusao" on operador_lojas
  for delete
  using (operador_e_admin_da_loja(loja_id));

-- Conserta o estrago que o bug acima já pode ter deixado: qualquer loja que
-- ficou "órfã" (criada, mas sem ninguém vinculado, porque o segundo insert
-- sempre falhava) fica invisível pro LojaSwitcher e ninguém consegue nem
-- inativá-la pelo app (a policy de update também exige já ser admin dela).
-- Vincula toda loja órfã a todo admin ativo — mesmo padrão de backfill já
-- usado pra "Loja 1" na migration 0031.
insert into operador_lojas (operador_id, loja_id)
select o.id, l.id
from lojas l
cross join operadores o
where o.admin = true
  and o.ativo = true
  and not exists (
    select 1 from operador_lojas ol where ol.loja_id = l.id
  );


-- -------------------------------------------------------------------
-- 0035_custo_servico.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0035: adiciona custo (ex: mão de obra) ao catálogo de serviços,
-- mesmo padrão já usado em `pecas.preco_custo`. Sem isso, a aba
-- Lucratividade (Relações) calculava a margem de peça certinha, mas
-- considerava o custo de todo item de serviço como zero — subestimando o
-- custo real da loja.
-- Idempotente: seguro rodar de novo.

alter table servicos add column if not exists custo numeric;


-- -------------------------------------------------------------------
-- 0036_contas_receber.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0036: módulo "Contas a Receber" — permite faturar uma OS sem o
-- cliente pagar tudo na hora, controlando o que ainda falta receber
-- (espelha o "Contas a Pagar" que já existe, só que do lado do que a loja
-- tem a receber, não do que ela deve). Ao faturar uma OS escolhendo "a
-- receber" em vez de "recebido agora", o app não lança a Entrada no Caixa
-- na hora — em vez disso cria uma linha aqui, pendente. Marcar como
-- recebido gera a Entrada no Caixa nesse momento (mesmo padrão de
-- `pagarConta`/Contas a Pagar). Criada depois da fundação multi-loja, então
-- já nasce com `loja_id` obrigatório, sem precisar de backfill.
-- Idempotente: seguro rodar de novo.

create table if not exists contas_receber (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas (id),
  cliente_id uuid not null references clientes (id),
  ordem_servico_id uuid references ordens_servico (id) on delete set null,
  descricao text not null,
  valor numeric not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'recebido')),
  data_recebimento timestamptz,
  caixa_movimento_id uuid references caixa_movimentos (id) on delete set null,
  operador_id uuid references operadores (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint contas_receber_ordem_id_unique unique (ordem_servico_id)
);

create index if not exists contas_receber_loja_id_idx on contas_receber (loja_id);

alter table contas_receber enable row level security;

drop policy if exists "contas_receber_acesso_por_loja" on contas_receber;
create policy "contas_receber_acesso_por_loja" on contas_receber
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));


-- -------------------------------------------------------------------
-- 0037_numero_os_status_e_pagamento_split.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0037: três mudanças pedidas pela usuária depois de usar o
-- sistema na prática:
--
-- 1) Ordens de Serviço ganham um número sequencial por loja (1, 2, 3...),
--    em vez de só o UUID (que aparecia como "OS #a0270a6e" — grande e sem
--    sentido pra ela). Numerado por loja via trigger (cada loja começa do 1).
--
-- 2) Simplifica o status da OS: remove "aberta" como estado distinto de
--    "em_andamento" — toda OS nova já nasce "em_andamento" diretamente. As
--    OS que ainda estavam com status "aberta" viram "em_andamento" no
--    backfill. Status possíveis agora: em_andamento, concluida, faturada.
--
-- 3) Permite faturar uma OS em mais de uma forma de pagamento (ex: metade
--    Pix, metade cartão) — remove a trava de "1 lançamento de Caixa por OS"
--    (`caixa_movimentos_ordem_id_idx_unique`), já que agora pode haver um
--    lançamento por forma de pagamento usada.
--
-- 4) Bug real encontrado testando a exclusão de loja pelo app: a migration
--    0031 nunca criou uma policy de RLS pra DELETE em `lojas` (só
--    select/insert/update) — sem policy nenhuma cobrindo o comando, o
--    Postgres simplesmente não deixa nenhuma linha visível pra excluir, e o
--    delete "funciona" sem erro nenhum, mas apaga 0 linhas (nem a loja some,
--    nem aparece mensagem de erro — silencioso, o pior tipo de bug). Cria a
--    policy que faltava, mesma regra de quem pode editar (admin da loja).
--
-- Idempotente: seguro rodar de novo.

-- 1) Número sequencial por loja -----------------------------------------
alter table ordens_servico add column if not exists numero integer;

-- Guarda (docs/licoes.md, item 36): a 0065 (orçamento) muda tudo isto
-- depois — orçamento fica com `numero` vazio, ganha dois status e um gatilho
-- novo. Reaplicando a instalação inteira num banco que já tem orçamento,
-- este trecho numeraria o orçamento, trocaria o gatilho pelo antigo e
-- refaria a trava de status com 3 status, e quebraria. Então ele só roda
-- antes da 0065 existir (sem a coluna `numero_orcamento`).
do $guarda$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ordens_servico'
      and column_name = 'numero_orcamento'
  ) then
    create or replace function definir_numero_ordem_servico()
    returns trigger
    language plpgsql
    as $$
    begin
      if new.numero is null then
        select coalesce(max(numero), 0) + 1 into new.numero
        from ordens_servico
        where loja_id = new.loja_id;
      end if;
      return new;
    end;
    $$;

    drop trigger if exists trigger_definir_numero_ordem_servico on ordens_servico;
    create trigger trigger_definir_numero_ordem_servico
      before insert on ordens_servico
      for each row
      execute function definir_numero_ordem_servico();

    -- Backfill: numera as OS que já existem, por loja, na ordem em que foram
    -- abertas (só toca quem ainda está com numero nulo — seguro rodar de novo).
    with numeradas as (
      select id, row_number() over (partition by loja_id order by data_abertura) as rn
      from ordens_servico
      where numero is null
    )
    update ordens_servico o
    set numero = numeradas.rn
    from numeradas
    where o.id = numeradas.id;

    alter table ordens_servico alter column numero set not null;
  end if;
end $guarda$;

create unique index if not exists ordens_servico_loja_numero_unique
  on ordens_servico (loja_id, numero);

-- 2) Simplifica o status --------------------------------------------------
update ordens_servico set status = 'em_andamento' where status = 'aberta';

-- Mesma guarda: depois da 0065 a trava tem 5 status, não 3.
do $guarda$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ordens_servico'
      and column_name = 'numero_orcamento'
  ) then
    alter table ordens_servico drop constraint if exists ordens_servico_status_check;
    alter table ordens_servico add constraint ordens_servico_status_check
      check (status in ('em_andamento', 'concluida', 'faturada'));
  end if;
end $guarda$;

alter table ordens_servico alter column status set default 'em_andamento';

-- 3) Permite mais de um lançamento de Caixa por OS (split de pagamento) --
alter table caixa_movimentos drop constraint if exists caixa_movimentos_ordem_id_idx_unique;

-- 4) Policy de DELETE que faltava em `lojas` --------------------------------
drop policy if exists "lojas_exclusao_admins" on lojas;
create policy "lojas_exclusao_admins" on lojas
  for delete
  using (operador_e_admin_da_loja(id));


-- -------------------------------------------------------------------
-- 0038_deve_trocar_senha.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0038: redefinição de senha de operador esquecida.
--
-- Como os operadores não têm e-mail de verdade (o login usa só "usuário",
-- o e-mail é inventado por baixo dos panos — ver src/lib/auth.ts), o fluxo
-- padrão de "esqueci minha senha" do Supabase Auth (link por e-mail) não
-- funciona aqui. Em vez disso: um admin gera uma senha temporária pra outro
-- operador (via Edge Function `redefinir-senha-operador`, que usa a service
-- role key — nunca fica no app instalado) e essa coluna marca que, no
-- próximo login, o sistema exige trocar a senha antes de liberar o app.
--
-- Idempotente: seguro rodar de novo.

alter table operadores add column if not exists deve_trocar_senha boolean not null default false;


-- -------------------------------------------------------------------
-- 0039_fornecedores_pedidos_compra.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0039: módulo de Fornecedores + Pedido de Compra.
--
-- `fornecedores` é catálogo compartilhado entre lojas (mesmo padrão de
-- `clientes`/`pecas`/`servicos` — um fornecedor pode entregar pra mais de
-- uma loja da empresa). `pedidos_compra`/`pedidos_compra_itens` são por
-- loja (cada loja faz os próprios pedidos), mesmo padrão de
-- `ordens_servico`/`ordens_servico_itens`: número sequencial por loja via
-- trigger, itens sem `loja_id` próprio (herdam via `pedido_compra_id`).
--
-- "Receber pedido" (dar entrada no estoque) é feito pelo app conferindo as
-- quantidades chegadas contra o pedido — não é importação de XML de nota
-- fiscal do fornecedor (isso é bem mais complexo, fica pra uma etapa futura
-- separada se um dia for pedida).
--
-- Nota: uma versão anterior e mais simples de `fornecedores` (sem endereço)
-- chegou a ser publicada numa sessão separada — as colunas de endereço são
-- adicionadas via `alter table ... add column if not exists`, não só no
-- `create table`, pra funcionar tanto num banco novo quanto num banco que
-- já tinha essa versão simples.
--
-- Idempotente: seguro rodar de novo.

create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  telefone text,
  email text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Colunas de endereço, adicionadas via `alter` (não só no `create table`
-- acima) porque uma versão mais simples desta tabela — sem endereço — pode
-- já ter sido criada antes desta migration existir; `create table if not
-- exists` sozinho não adicionaria essas colunas num banco que já tem a
-- tabela.
alter table fornecedores add column if not exists cep text;
alter table fornecedores add column if not exists rua text;
alter table fornecedores add column if not exists numero text;
alter table fornecedores add column if not exists bairro text;
alter table fornecedores add column if not exists cidade text;
alter table fornecedores add column if not exists uf text;

alter table fornecedores enable row level security;
drop policy if exists "fornecedores_acesso_autenticados" on fornecedores;
create policy "fornecedores_acesso_autenticados" on fornecedores
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create table if not exists pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  numero integer,
  loja_id uuid not null references lojas (id),
  fornecedor_id uuid not null references fornecedores (id),
  status text not null default 'pendente'
    check (status in ('pendente', 'parcial', 'recebido', 'cancelado')),
  data_pedido date not null default current_date,
  observacao text,
  operador_id uuid references operadores (id),
  criado_em timestamptz not null default now()
);

create index if not exists pedidos_compra_loja_id_idx on pedidos_compra (loja_id);
create index if not exists pedidos_compra_fornecedor_id_idx on pedidos_compra (fornecedor_id);

create or replace function definir_numero_pedido_compra()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null then
    select coalesce(max(numero), 0) + 1 into new.numero
    from pedidos_compra
    where loja_id = new.loja_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_definir_numero_pedido_compra on pedidos_compra;
create trigger trigger_definir_numero_pedido_compra
  before insert on pedidos_compra
  for each row
  execute function definir_numero_pedido_compra();

create unique index if not exists pedidos_compra_loja_numero_unique
  on pedidos_compra (loja_id, numero);

alter table pedidos_compra enable row level security;
drop policy if exists "pedidos_compra_acesso_por_loja" on pedidos_compra;
create policy "pedidos_compra_acesso_por_loja" on pedidos_compra
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

create table if not exists pedidos_compra_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_compra_id uuid not null references pedidos_compra (id) on delete cascade,
  peca_id uuid not null references pecas (id),
  quantidade_pedida numeric(12, 2) not null check (quantidade_pedida > 0),
  preco_unitario numeric(12, 2),
  quantidade_recebida numeric(12, 2) not null default 0
);

create index if not exists pedidos_compra_itens_pedido_id_idx
  on pedidos_compra_itens (pedido_compra_id);

alter table pedidos_compra_itens enable row level security;
drop policy if exists "pedidos_compra_itens_acesso_por_loja" on pedidos_compra_itens;
create policy "pedidos_compra_itens_acesso_por_loja" on pedidos_compra_itens
  for all
  using (
    exists (
      select 1 from pedidos_compra pc
      where pc.id = pedidos_compra_itens.pedido_compra_id
        and operador_tem_acesso_loja(pc.loja_id)
    )
  )
  with check (
    exists (
      select 1 from pedidos_compra pc
      where pc.id = pedidos_compra_itens.pedido_compra_id
        and operador_tem_acesso_loja(pc.loja_id)
    )
  );


-- -------------------------------------------------------------------
-- 0040_auditoria.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0040: trilha de auditoria — "quem mexeu em quê".
--
-- Uma tabela genérica (`auditoria`) recebe uma linha toda vez que um
-- registro é **editado** ou **excluído** numa tabela sensível — via trigger
-- de banco, não chamada manual do app. Isso importa: um trigger pega
-- qualquer alteração não importa por onde ela veio (tela do app, um bug
-- futuro, até uma edição manual pelo SQL Editor do Supabase), diferente de
-- logar "na mão" dentro de cada função do `lib/`, que exigiria lembrar de
-- adicionar em todo lugar e vazaria silenciosamente em qualquer um
-- esquecido.
--
-- Escopo desta primeira leva (dá pra estender depois, é só repetir o bloco
-- de trigger pra outra tabela): `operadores`, `pecas`, `servicos`,
-- `caixa_movimentos`, `contas_pagar`, `contas_receber`, `ordens_servico`,
-- `clientes`, `fornecedores`, `pedidos_compra`, `lojas`. Só
-- **UPDATE/DELETE** (não INSERT) — a criação de um registro já fica
-- registrada nele mesmo (a maioria das tabelas já tem `criado_em`, várias
-- também têm `operador_id`/`criado_por_id`); o que faltava era saber quem
-- mudou ou apagou algo depois de criado, que é o que este módulo cobre.
--
-- Leitura só pra admin (`operador_atual_e_admin()`, já existe desde a
-- migration 0008). Escrita só acontece pelo trigger (função `security
-- definer`, roda com o dono da função — por isso não precisa de policy de
-- insert aqui, um operador comum não consegue gravar direto nesta tabela).
--
-- Idempotente: seguro rodar de novo.

create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('atualizar', 'excluir')),
  operador_id uuid references operadores (id),
  dados_antes jsonb,
  dados_depois jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists auditoria_tabela_registro_idx on auditoria (tabela, registro_id);
create index if not exists auditoria_criado_em_idx on auditoria (criado_em desc);
create index if not exists auditoria_operador_id_idx on auditoria (operador_id);

alter table auditoria enable row level security;
drop policy if exists "auditoria_leitura_admins" on auditoria;
create policy "auditoria_leitura_admins" on auditoria
  for select
  using (operador_atual_e_admin());

create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE') then
    insert into auditoria (tabela, registro_id, acao, operador_id, dados_antes, dados_depois)
    values (tg_table_name, new.id, 'atualizar', auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    insert into auditoria (tabela, registro_id, acao, operador_id, dados_antes, dados_depois)
    values (tg_table_name, old.id, 'excluir', auth.uid(), to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

do $$
declare
  tabela_alvo text;
begin
  foreach tabela_alvo in array array[
    'operadores', 'pecas', 'servicos', 'caixa_movimentos', 'contas_pagar',
    'contas_receber', 'ordens_servico', 'clientes', 'fornecedores',
    'pedidos_compra', 'lojas'
  ]
  loop
    execute format('drop trigger if exists trigger_auditoria on %I', tabela_alvo);
    execute format(
      'create trigger trigger_auditoria after update or delete on %I ' ||
      'for each row execute function registrar_auditoria()',
      tabela_alvo
    );
  end loop;
end;
$$;


-- -------------------------------------------------------------------
-- 0041_depositos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0041: cadastro de Depósito — locais físicos de estoque dentro de
-- uma loja (ex: "Depósito Principal", "Fundos"). Toda loja (já existente ou
-- criada depois desta migration) ganha automaticamente um depósito padrão —
-- nada muda pra quem usa um só lugar físico; só quem criar um depósito
-- extra passa a escolher entre eles.
--
-- `estoque_movimentos` e `contagens_estoque` ganham `deposito_id` (mesmo
-- padrão nullable → backfill → not null das migrations 0031-0033 pra
-- loja_id). O saldo por peça continua sendo a soma de todos os depósitos da
-- loja (calcularSaldoPorPeca, sem mudança) — o saldo por depósito é um
-- cálculo novo (calcularSaldoPorPecaEDeposito), usado na Contagem.
--
-- Idempotente: seguro rodar de novo.

create table if not exists depositos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas (id),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists depositos_loja_id_idx on depositos (loja_id);

-- Toda loja que ainda não tem nenhum depósito ganha um "Depósito Principal"
-- — cobre o backfill de lojas já existentes. Lojas novas passam a ganhar o
-- depósito padrão direto pelo app (lib/lojas.ts → criarLoja()), mas rodar
-- esta migration de novo também cobre qualquer loja criada fora do app.
insert into depositos (loja_id, nome)
select l.id, 'Depósito Principal'
from lojas l
where not exists (select 1 from depositos d where d.loja_id = l.id);

alter table depositos enable row level security;

drop policy if exists "depositos_leitura_por_loja" on depositos;
create policy "depositos_leitura_por_loja" on depositos
  for select
  using (operador_tem_acesso_loja(loja_id));

drop policy if exists "depositos_insercao_admins" on depositos;
create policy "depositos_insercao_admins" on depositos
  for insert
  with check (operador_e_admin_da_loja(loja_id));

drop policy if exists "depositos_atualizacao_admins" on depositos;
create policy "depositos_atualizacao_admins" on depositos
  for update
  using (operador_e_admin_da_loja(loja_id))
  with check (operador_e_admin_da_loja(loja_id));

drop policy if exists "depositos_exclusao_admins" on depositos;
create policy "depositos_exclusao_admins" on depositos
  for delete
  using (operador_e_admin_da_loja(loja_id));

-- estoque_movimentos
alter table estoque_movimentos add column if not exists deposito_id uuid references depositos (id);
update estoque_movimentos em
set deposito_id = (
  select d.id from depositos d
  where d.loja_id = em.loja_id
  order by d.criado_em asc
  limit 1
)
where deposito_id is null;
alter table estoque_movimentos alter column deposito_id set not null;
create index if not exists estoque_movimentos_deposito_id_idx on estoque_movimentos (deposito_id);

-- contagens_estoque
alter table contagens_estoque add column if not exists deposito_id uuid references depositos (id);
update contagens_estoque ce
set deposito_id = (
  select d.id from depositos d
  where d.loja_id = ce.loja_id
  order by d.criado_em asc
  limit 1
)
where deposito_id is null;
alter table contagens_estoque alter column deposito_id set not null;
create index if not exists contagens_estoque_deposito_id_idx on contagens_estoque (deposito_id);


-- -------------------------------------------------------------------
-- 0042_cotacoes_pecas.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0042: cotação de peças por fornecedor — histórico de preço
-- (peça, fornecedor, preço, data) pra comparar antes de decidir onde
-- comprar. Compartilhado entre lojas, mesmo padrão de `pecas`/`fornecedores`
-- (o catálogo é único pra empresa toda).
--
-- Tabela só de histórico (insert-only pelo app): toda vez que um Pedido de
-- Compra é criado com preço numa peça, uma linha nova é gravada aqui
-- sozinha (src/lib/pedidosCompra.ts → criarPedido()) — sem formulário
-- próprio pra preencher. A tela de Pedido de Compra usa
-- melhorCotacaoPorFornecedor() (src/lib/cotacoesPecas.ts) pra mostrar só a
-- cotação mais recente de cada fornecedor.
--
-- Idempotente: seguro rodar de novo.

create table if not exists cotacoes_pecas (
  id uuid primary key default gen_random_uuid(),
  peca_id uuid not null references pecas (id),
  fornecedor_id uuid not null references fornecedores (id),
  preco numeric(12, 2) not null check (preco > 0),
  criado_em timestamptz not null default now()
);

create index if not exists cotacoes_pecas_peca_id_idx on cotacoes_pecas (peca_id);
create index if not exists cotacoes_pecas_fornecedor_id_idx on cotacoes_pecas (fornecedor_id);

alter table cotacoes_pecas enable row level security;
drop policy if exists "cotacoes_pecas_acesso_autenticados" on cotacoes_pecas;
create policy "cotacoes_pecas_acesso_autenticados" on cotacoes_pecas
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);


-- -------------------------------------------------------------------
-- 0043_contas_pagar_recorrente_ate.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0043: fim opcional pra recorrência de Contas a Pagar
-- `contas_pagar.recorrente` já existia (liga/desliga a criação automática da
-- próxima ocorrência ao pagar), mas não tinha como dizer "isso vai só até tal
-- mês" — a conta recorria pra sempre. `recorrente_ate` é opcional: nulo
-- continua recorrendo sem fim (comportamento de sempre); preenchido, para de
-- criar a próxima ocorrência quando o próximo vencimento passar dessa data
-- (ver pagarConta() em src/lib/contasPagar.ts). Ver PROJETO_STATUS.md.
-- Idempotente: seguro rodar de novo.

alter table contas_pagar add column if not exists recorrente_ate date;


-- -------------------------------------------------------------------
-- 0044_dados_fiscais_nfse.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0044: campos extras em configuracoes_fiscais_loja pra emissão de
-- NFS-e (serviço) via Focus NFe — código IBGE do município da loja (exigido
-- pela API como "prestador.codigo_municipio"), código do serviço na lista da
-- LC 116/2003 (item_lista_servico — "14.01", usado como padrão pro app: cobre
-- "manutenção e conservação de veículos", a atividade principal de um
-- autocenter/borracharia), alíquota do ISS e o código tributário do serviço
-- específico do município (varia de cidade pra cidade, opcional — só alguns
-- municípios exigem). Nenhum desses bloqueia a emissão de NFC-e (peças), que
-- não usa nenhum deles. Ver PROJETO_STATUS.md seção 8, item 1.
-- Idempotente: seguro rodar de novo.

alter table configuracoes_fiscais_loja
  add column if not exists codigo_municipio text,
  add column if not exists item_lista_servico text default '14.01',
  add column if not exists aliquota_iss numeric,
  add column if not exists codigo_tributario_municipio text;


-- -------------------------------------------------------------------
-- 0045_clientes_codigo_municipio.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0045: coluna codigo_municipio (IBGE) em clientes, só usada na
-- emissão de NFS-e (identifica o município do tomador do serviço). Antes
-- disso o operador precisava digitar esse código manualmente toda vez que
-- emitia uma NFS-e — agora é preenchido sozinho junto com o resto do
-- endereço, quando o CEP é buscado (o ViaCEP já devolve o código IBGE de
-- graça, ver lib/viaCep.ts), e fica salvo no cadastro do cliente pra não
-- precisar digitar de novo nas próximas emissões pra esse mesmo cliente.
-- Idempotente: seguro rodar de novo.

alter table clientes
  add column if not exists codigo_municipio text;


-- -------------------------------------------------------------------
-- 0046_notas_fiscais_focus_nfe_ref.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0046: coluna focus_nfe_ref em notas_fiscais_arquivos — guarda a
-- referência (`ref`) que a Focus NFe usa pra identificar a nota, gerada na
-- hora da emissão automática (ver montarRefNota() em src/lib/focusNfe.ts).
-- Sem isso salvo, não tinha como cancelar uma nota emitida automaticamente
-- depois — cancelarNFCe()/cancelarNFSe() (lib/focusNfe.ts) exigem esse `ref`,
-- que nunca foi persistido em lugar nenhum antes desta migration. Só
-- preenchida pra notas com origem="automatica"; upload manual de XML não usa.
-- Idempotente: seguro rodar de novo.

alter table notas_fiscais_arquivos
  add column if not exists focus_nfe_ref text;


-- -------------------------------------------------------------------
-- 0047_configuracoes_fiscais_codigo_cnae.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0047: coluna codigo_cnae em configuracoes_fiscais_loja — só usada
-- na emissão de NFS-e. Descoberta testando a emissão de verdade em produção:
-- Araraquara rejeitou a nota com "Preencher a tag cnae e envie novamente" —
-- campo `codigo_cnae` (documentado pela Focus NFe como obrigatório pra NFS-e)
-- que o Sakura System ainda não pedia nem mandava. Vem do Cartão CNPJ da
-- empresa ("Atividade econômica principal"). Idempotente: seguro rodar de novo.

alter table configuracoes_fiscais_loja
  add column if not exists codigo_cnae text;


-- -------------------------------------------------------------------
-- 0048_precisao_das_colunas_de_dinheiro.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0048: declara a precisão das colunas de valor que estavam como
-- `numeric` "solto" (sem precisão nem casas decimais).
--
-- Por que isto importa. Uma auditoria do esquema (guia de melhorias, TR-05.3)
-- confirmou a parte boa: NENHUMA coluna de dinheiro deste banco é
-- `double precision`/`real`, então o erro de ponto flutuante nunca entrou pelo
-- armazenamento. Mas cinco colunas eram `numeric` sem precisão declarada, e
-- `numeric` solto guarda exatamente o que mandarem — inclusive uma cauda de
-- centavo vinda de conta feita em JavaScript, tipo 1234.5600000000002.
--
-- Isso não era teórico: o valor gravado em `contas_receber.valor` ao faturar
-- uma OS vinha de uma soma de pagamentos sem arredondamento
-- (`src/lib/ordensServico.ts`), e somar números já arredondados ainda pode
-- produzir cauda (0.1 + 0.2 dá 0.30000000000000004). O lado do aplicativo foi
-- corrigido junto com esta migration; a coluna passa a ser a segunda linha de
-- defesa, arredondando na entrada mesmo que uma conta nova erre no futuro.
--
-- As casas seguem o que o resto do banco já usa: dinheiro `numeric(12,2)`
-- (igual `pecas.preco_venda`, `caixa_movimentos.valor`, `cotacoes_pecas.preco`)
-- e percentual `numeric(5,2)` (igual `pecas.aliquota_icms`).
--
-- Efeito em dado já gravado: valores com até 2 casas decimais não mudam em
-- nada. Um valor que estivesse com cauda é arredondado pro centavo — que é o
-- que já aparecia na tela de qualquer forma, porque a exibição formata em 2
-- casas. Nenhum valor é truncado: `numeric(12,2)` comporta até
-- 9.999.999.999,99.
--
-- Idempotente: `alter ... type` para o mesmo tipo é aceito sem erro pelo
-- Postgres, então é seguro rodar de novo. A guarda `if exists` cobre um banco
-- que ainda não tenha a coluna.

do $$
begin
  -- Dinheiro: 12 dígitos no total, 2 deles decimais.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contas_pagar'
               and column_name = 'valor') then
    alter table contas_pagar alter column valor type numeric(12,2);
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'contas_receber'
               and column_name = 'valor') then
    alter table contas_receber alter column valor type numeric(12,2);
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'funcionarios'
               and column_name = 'salario') then
    alter table funcionarios alter column salario type numeric(12,2);
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'servicos'
               and column_name = 'custo') then
    alter table servicos alter column custo type numeric(12,2);
  end if;

  -- Percentual: 5 dígitos no total, 2 deles decimais (até 999,99%).
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'configuracoes_fiscais_loja'
               and column_name = 'aliquota_iss') then
    alter table configuracoes_fiscais_loja alter column aliquota_iss type numeric(5,2);
  end if;
end $$;


-- -------------------------------------------------------------------
-- 0049_lembrete_aliquota_competencia.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0049: lembrete da alíquota da competência (NFS-e).
--
-- Toda primeira NFS-e do mês é recusada pela prefeitura enquanto a alíquota
-- daquela competência não for cadastrada no portal dela ("Por gentileza,
-- conclua o cadastro de todas as alíquotas referentes à competência
-- vigente"). É tarefa recorrente do lojista, não do sistema — e já custou uma
-- manhã de trabalho (PROJETO_STATUS.md, seção 8, item 1). As duas colunas
-- abaixo deixam o sistema avisar ANTES de a nota ser recusada:
--
--   competencia_aliquota_confirmada — o mês (sempre no dia 1º, igual à
--   competência da nota fiscal) cuja alíquota já foi cadastrada no portal.
--   Enquanto for diferente do mês corrente, o Início mostra o aviso. É
--   preenchida pelo botão "Já cadastrei" e, sozinha, por toda NFS-e que a
--   prefeitura autorizar no mês (se autorizou, a alíquota está lá).
--
--   aliquota_passo_a_passo — o caminho dentro do portal, em texto editável,
--   porque isso muda de município pra município. Em branco, o app usa o
--   passo a passo de Araraquara (portal Giap) que está no código.
--
-- Idempotente: seguro rodar de novo.

alter table configuracoes_fiscais_loja
  add column if not exists competencia_aliquota_confirmada date,
  add column if not exists aliquota_passo_a_passo text;


-- -------------------------------------------------------------------
-- 0050_categoria_caixa_outros.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0050: semeia a categoria "Outros" em categorias_caixa.
--
-- A categoria do lançamento manual de caixa passou a ser OBRIGATÓRIA no
-- formulário (item TL-27 do guia de melhorias). O motivo está na própria tela
-- de Saídas: como era opcional, ninguém preenchia, e o bloco "Por categoria"
-- virou um balde só — "Sem categoria: R$ 31.000,00", todas as despesas do mês
-- juntas. Categoria opcional é, na prática, relatório por categoria que não
-- existe.
--
-- Por que semear aqui, e por que isso NÃO é detalhe:
--
--   `categorias_caixa` (migration 0020) nunca foi semeada por migration
--   nenhuma — diferente de `categorias` e `categorias_servicos`, que a 0030
--   semeia. Ou seja, um banco recém-instalado tem ZERO categorias de caixa.
--   Exigir a categoria sem garantir que exista pelo menos uma opção deixaria
--   o operador sem conseguir lançar nada no caixa, sem saída pela tela — é a
--   lição do item 33 da seção 6 (validação de que não se tem certeza serve de
--   aviso, nunca de tranca, ainda mais quando guarda a porta de entrada).
--
--   "Outros" é o mínimo pra regra obrigatória ser sempre cumprível: quem não
--   souber onde encaixar um lançamento escolhe "Outros" em vez de ficar
--   travado. As categorias de verdade (Aluguel, Sucata, Mercado...) continuam
--   sendo criadas por quem usa, em Configurações → Categorias de caixa.
--
-- Uma para cada tipo, porque `categorias_caixa` separa entrada de saída e o
-- formulário só oferece as do tipo escolhido — uma "Outros" só de saída
-- deixaria a entrada travada do mesmo jeito.
--
-- NÃO torna a coluna `caixa_movimentos.categoria_id` NOT NULL, de propósito:
-- os lançamentos AUTOMÁTICOS legitimamente não têm categoria (o faturamento
-- de uma OS entra no caixa sem categoria nenhuma, e é assim que deve ser), e
-- o histórico já gravado sem categoria não pode ser recusado pelo banco. A
-- obrigatoriedade é do formulário manual, não da tabela.
--
-- Idempotente: seguro rodar de novo (a tabela tem `unique (nome, tipo)`, e o
-- `on conflict` abaixo só ignora a linha que já existir).

insert into categorias_caixa (nome, tipo)
values ('Outros', 'entrada'),
       ('Outros', 'saida')
on conflict (nome, tipo) do nothing;


-- -------------------------------------------------------------------
-- 0051_pecas_estoque_minimo_e_pneu.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0051: quatro colunas opcionais em `pecas` — o estoque mínimo
-- (item TL-11 do guia de melhorias) e o bloco de pneu (item TL-12).
--
-- 1) estoque_minimo
--
--    É o campo que falta pro sistema responder "o que eu preciso comprar?".
--    Hoje a lista de Produtos mostra o saldo como um número neutro: dá pra
--    ver que sobrou 1, mas não dá pra saber se 1 é pouco. Num autocenter,
--    peça em falta é venda perdida na hora, com o carro parado no pátio —
--    é a pergunta que mais dá dinheiro, e a única que o cadastro não sabia
--    responder.
--
--    numeric(12,2), e não (12,3) como o guia sugeria: TODA quantidade deste
--    banco é numeric(12,2) (estoque_movimentos.quantidade,
--    contagens_estoque.quantidade_contada, ordens_servico_itens.quantidade,
--    pedidos_compra_itens). Um mínimo com três casas decimais compararia
--    com saldos de duas e só criaria uma diferença sem motivo.
--
--    Fica NULL por padrão de propósito: NULL quer dizer "essa peça não tem
--    mínimo definido" e não entra no filtro "abaixo do mínimo" — diferente
--    de zero, que é um mínimo de verdade ("não pode faltar nenhuma"). Zerar
--    todo o catálogo no backfill transformaria cada peça sem saldo num
--    alarme, e alarme que toca pra tudo é alarme que ninguém olha.
--
-- 2) medida / indice_carga_velocidade / dot
--
--    O bloco de pneu. É a peça que essa loja mais vende, o dado está escrito
--    na lateral do pneu, e hoje ele só existe afogado na descrição em texto
--    livre — o que impede responder "tem 175/70 R14?" sem ler peça por peça.
--    Três campos de texto simples, todos opcionais, mostrados na tela só
--    quando a categoria da peça for a de Pneus (a tela decide, não o banco:
--    a categoria é uma linha de `categorias`, que cada empresa nomeia como
--    quiser, então prender isso numa constraint aqui quebraria quem chamar a
--    categoria de outra coisa).
--
--    `medida` guarda o formato da lateral (ex: "175/70 R14"),
--    `indice_carga_velocidade` o índice de carga e velocidade (ex: "84T") e
--    `dot` a semana/ano de fabricação (ex: "3823" = 38ª semana de 2023), que
--    é o que diz se o pneu está velho no estoque.
--
-- `pecas` é compartilhada entre as lojas da mesma empresa (não tem loja_id),
-- então nada aqui precisa de backfill por loja nem de policy nova — a RLS de
-- `pecas` já cobre estas colunas, porque é por tabela, não por coluna.
--
-- Idempotente: seguro rodar de novo (`add column if not exists`).

alter table pecas
  add column if not exists estoque_minimo numeric(12, 2),
  add column if not exists medida text,
  add column if not exists indice_carga_velocidade text,
  add column if not exists dot text;

-- Mínimo negativo não quer dizer nada, e deixar passar viraria uma peça
-- eternamente "abaixo do mínimo" (ou nunca) sem explicação na tela.
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'pecas' and constraint_name = 'pecas_estoque_minimo_nao_negativo'
  ) then
    alter table pecas
      add constraint pecas_estoque_minimo_nao_negativo
      check (estoque_minimo is null or estoque_minimo >= 0);
  end if;
end $$;


-- -------------------------------------------------------------------
-- 0052_modelos_whatsapp.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0052: `configuracoes_whatsapp` — os modelos de mensagem que o
-- sistema abre no WhatsApp (item FN-03 do guia de melhorias).
--
-- Por que existe: o WhatsApp já é o canal por onde essa operação funciona —
-- é por lá que o pai dela manda foto de nota, que ela fala com a
-- contabilidade e com o suporte, e que a senha temporária de um operador é
-- repassada. O sistema era a única parte do fluxo que ignorava isso, e quem
-- precisava cobrar um cliente copiava valor e data na mão, de uma tela pra
-- outra, todo dia.
--
-- Por que os textos ficam no BANCO e não no código: cada loja fala do seu
-- jeito, e o texto que o dono manda pro cliente dele é decisão dele, não
-- minha. É o mesmo caminho já percorrido pelo texto de garantia
-- (`configuracoes_garantia`, migration 0018) — que também nasceu fixo e
-- precisou virar editável.
--
-- Por que uma linha por modelo, e não uma coluna por modelo: assim um modelo
-- novo (orçamento, lembrete de revisão — os dois já previstos no guia) é uma
-- linha, não uma migration. É exatamente a forma de `configuracoes_juros_parcelas`
-- (migration 0033): per-loja, PK composta, várias linhas.
--
-- A linha só existe depois que alguém edita o texto naquela loja: enquanto
-- não existir, vale o modelo padrão que está em `src/schemas/whatsapp.ts`.
-- Ou seja, nada aqui precisa ser semeado, e uma loja recém-instalada já
-- manda mensagem — ao contrário do que aconteceu com as categorias de caixa
-- na migration 0050, onde a tabela vazia deixava a tela sem saída.
--
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_whatsapp (
  loja_id uuid not null references lojas (id),
  chave text not null,
  texto text not null,
  atualizado_em timestamptz not null default now(),
  primary key (loja_id, chave)
);

alter table configuracoes_whatsapp enable row level security;

-- Mesma regra das outras configurações por loja (migration 0033): quem tem
-- acesso à loja lê e grava. O reforço de "só admin edita" é da tela, como no
-- resto de Configurações.
drop policy if exists "configuracoes_whatsapp_acesso_por_loja" on configuracoes_whatsapp;
create policy "configuracoes_whatsapp_acesso_por_loja" on configuracoes_whatsapp
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

-- Registro de que uma mensagem foi ABERTA — nunca "enviada".
--
-- A diferença não é preciosismo: o sistema abre a conversa no WhatsApp com o
-- texto pronto, e daí em diante quem decide é a pessoa (pode editar, pode
-- fechar sem mandar). Gravar "enviada" seria afirmar uma coisa que este
-- sistema não tem como saber, e um dia alguém tomaria uma decisão de cobrança
-- em cima dessa mentira.
--
-- O que isso responde, na prática: "já cobrei esse cliente?". Hoje a resposta
-- mora só na memória de quem cobrou.
--
-- `referencia` é o id do que motivou a mensagem (a conta a receber, a OS, o
-- pedido de compra) — texto e sem FK de propósito, porque aponta pra tabelas
-- diferentes conforme a `chave`, e uma FK por destino faria esta tabela
-- crescer a cada modelo novo.
create table if not exists whatsapp_mensagens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas (id),
  chave text not null,
  referencia text,
  destino text,
  operador_id uuid references operadores (id),
  criado_em timestamptz not null default now()
);

create index if not exists whatsapp_mensagens_referencia_idx
  on whatsapp_mensagens (loja_id, chave, referencia);

alter table whatsapp_mensagens enable row level security;

drop policy if exists "whatsapp_mensagens_acesso_por_loja" on whatsapp_mensagens;
create policy "whatsapp_mensagens_acesso_por_loja" on whatsapp_mensagens
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));


-- -------------------------------------------------------------------
-- 0053_auditoria_completa.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0053: a trilha de auditoria passa a cobrir o que escapava.
--
-- A migration 0040 criou a trilha, mas com três buracos:
--
-- 1. **Só UPDATE/DELETE.** "Quem cadastrou este cliente com esse CPF?" é uma
--    pergunta tão legítima quanto "quem editou", e não tinha resposta.
-- 2. **Cinco tabelas de fora**, sendo a mais grave `ordens_servico_itens`:
--    desde a v0.9.28 dá pra mudar o VALOR de um item de uma OS pela tela, e
--    essa alteração não deixava rastro nenhum. Junto vêm
--    `notas_fiscais_arquivos` (excluir nota é ação séria),
--    `configuracoes_fiscais_loja` e `configuracoes_juros_parcelas` (mexer
--    aqui muda documento fiscal e o que o cliente paga) e `operador_lojas`
--    (dar acesso de alguém a uma loja).
-- 3. **Segredo em texto claro.** `configuracoes_fiscais_loja` guarda o token
--    da Focus NFe. Sem máscara, auditar essa tabela transformaria a própria
--    trilha no lugar novo onde o token fica legível — o contrário do que ela
--    existe pra fazer.
--
-- ATENÇÃO, detalhe que quebraria tudo em silêncio: a função da 0040 grava
-- `new.id`, e TRÊS das tabelas novas NÃO TÊM coluna `id` —
-- `configuracoes_fiscais_loja` tem PK `loja_id` (a 0033 derrubou o `id`),
-- `configuracoes_juros_parcelas` tem PK composta (`loja_id`,
-- `numero_parcelas`) e `operador_lojas` tem PK composta (`operador_id`,
-- `loja_id`). Por isso a função passa a receber, como argumento do trigger,
-- QUAL coluna usar como `registro_id` (padrão: `id`). O resto da chave
-- composta não se perde: a linha inteira continua indo em
-- `dados_antes`/`dados_depois`.
--
-- Idempotente: seguro rodar de novo.

-- ---------------------------------------------------------------------------
-- 1. `acao` passa a aceitar 'criar'
-- ---------------------------------------------------------------------------

alter table auditoria drop constraint if exists auditoria_acao_check;
alter table auditoria add constraint auditoria_acao_check
  check (acao in ('criar', 'atualizar', 'excluir'));

-- ---------------------------------------------------------------------------
-- 2. O operador da trilha deixa de travar a exclusão dele mesmo
--
-- `auditoria.operador_id` referencia `operadores (id)` sem `on delete`, ou
-- seja NO ACTION: enquanto existir uma linha de auditoria apontando pra um
-- operador, esse operador não pode ser excluído — nem pelo painel do
-- Supabase, que é justamente como o PROJETO_STATUS (seção 6, item 23) manda
-- excluir operador órfão. Até aqui isso quase nunca mordia, porque só quem
-- editava ou excluía algo aparecia na trilha. A partir desta migration TODA
-- criação também aparece, então na prática todo operador ativo passa a ter
-- linha aqui — e o caminho de exclusão documentado quebraria.
--
-- `on delete set null` NÃO resolve, e vale saber por quê antes de alguém
-- tentar: a linha de auditoria da exclusão é gravada DEPOIS que o operador
-- some, então um admin que exclui a própria conta faz a gravação estourar na
-- FK — testado, não suposto.
--
-- Então a FK sai. Trilha append-only não deve ter chave estrangeira capaz de
-- bloquear ou reescrever o passado: o dia em que o cadastro muda, o registro
-- histórico tem que continuar contando o que era verdade naquele dia. O
-- "quem" passa a viver em `operador_nome`, gravado no momento do fato — e
-- `operador_id` continua ali, sem FK, porque é por ele que a tela filtra.
-- ---------------------------------------------------------------------------

alter table auditoria add column if not exists operador_nome text;
alter table auditoria drop constraint if exists auditoria_operador_id_fkey;

-- As linhas que já existem (gravadas pela 0040) não têm o nome; como o
-- operador delas ainda está cadastrado, dá pra preencher uma vez.
update auditoria a
  set operador_nome = o.nome
  from operadores o
  where a.operador_id = o.id and a.operador_nome is null;

-- ---------------------------------------------------------------------------
-- 3. Índice que a tela usa (ela filtra por tabela e ordena por data) — a
--    auditoria só cresce, então vale ter antes de precisar.
--    O índice de `criado_em desc` sozinho já existe desde a 0040.
-- ---------------------------------------------------------------------------

create index if not exists auditoria_tabela_criado_em_idx on auditoria (tabela, criado_em desc);

-- ---------------------------------------------------------------------------
-- 4. Máscara de segredo
--
-- Mascara por NOME DE COLUNA, não por tabela: se um dia outra tabela ganhar
-- uma coluna com um desses nomes, ela já nasce protegida. Só substitui o que
-- existe e não é nulo — um token vazio continua aparecendo como vazio, que é
-- informação útil ("estava em branco") e não é segredo nenhum.
-- ---------------------------------------------------------------------------

create or replace function mascarar_segredos(dados jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  chave text;
  resultado jsonb := dados;
begin
  if resultado is null then
    return null;
  end if;

  foreach chave in array array['focus_nfe_token'] loop
    if resultado ? chave and jsonb_typeof(resultado -> chave) <> 'null' then
      resultado := jsonb_set(resultado, array[chave], to_jsonb('***'::text));
    end if;
  end loop;

  return resultado;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. A função do trigger, agora com INSERT e com a coluna-chave parametrizada
-- ---------------------------------------------------------------------------

create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  coluna_chave text := coalesce(tg_argv[0], 'id');
  antes jsonb;
  depois jsonb;
  alvo uuid;
  quem uuid := auth.uid();
  quem_nome text;
begin
  select nome into quem_nome from operadores where id = quem;
  if tg_op <> 'INSERT' then
    antes := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    depois := to_jsonb(new);
  end if;

  alvo := (coalesce(depois, antes) ->> coluna_chave)::uuid;

  insert into auditoria
    (tabela, registro_id, acao, operador_id, operador_nome, dados_antes, dados_depois)
  values (
    tg_table_name,
    alvo,
    case tg_op
      when 'INSERT' then 'criar'
      when 'UPDATE' then 'atualizar'
      else 'excluir'
    end,
    quem,
    quem_nome,
    mascarar_segredos(antes),
    mascarar_segredos(depois)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Os triggers — as 11 tabelas da 0040 mais as 5 novas.
--    Segundo valor de cada par: a coluna que vira `registro_id`.
-- ---------------------------------------------------------------------------

do $$
declare
  alvo text[];
begin
  foreach alvo slice 1 in array array[
    ['operadores', 'id'],
    ['pecas', 'id'],
    ['servicos', 'id'],
    ['caixa_movimentos', 'id'],
    ['contas_pagar', 'id'],
    ['contas_receber', 'id'],
    ['ordens_servico', 'id'],
    ['clientes', 'id'],
    ['fornecedores', 'id'],
    ['pedidos_compra', 'id'],
    ['lojas', 'id'],
    -- novas nesta migration
    ['ordens_servico_itens', 'id'],
    ['notas_fiscais_arquivos', 'id'],
    ['configuracoes_fiscais_loja', 'loja_id'],
    ['configuracoes_juros_parcelas', 'loja_id'],
    ['operador_lojas', 'operador_id']
  ]
  loop
    execute format('drop trigger if exists trigger_auditoria on %I', alvo[1]);
    execute format(
      'create trigger trigger_auditoria after insert or update or delete on %I ' ||
      'for each row execute function registrar_auditoria(%L)',
      alvo[1], alvo[2]
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Expurgo — trilha de auditoria sem expurgo é a tabela que estoura o
--    banco primeiro, e a partir desta migration ela cresce bem mais rápido
--    (toda criação de registro passa a gerar uma linha).
--
-- NÃO roda sozinha, de propósito: apagar histórico é decisão da dona do
-- sistema, não efeito colateral de uma migration. O padrão sugerido é 24
-- meses; o mínimo que a função aceita é 6, pra um dedo escorregado não
-- levar a trilha inteira junto.
--
-- O `revoke` abaixo é a trava que importa: sem ele, `security definer` +
-- permissão padrão do Postgres deixaria QUALQUER operador logado chamar
-- esta função pela API e apagar a própria pegada. Depois do revoke, só quem
-- tem acesso de dono ao banco (ou seja, o SQL Editor do Supabase) consegue.
--
--   select expurgar_auditoria(24);   -- devolve quantas linhas apagou
-- ---------------------------------------------------------------------------

create or replace function expurgar_auditoria(meses int default 24)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  apagadas bigint;
begin
  if meses is null or meses < 6 then
    raise exception 'Retenção mínima de 6 meses (foi pedido: %)', meses;
  end if;

  delete from auditoria where criado_em < now() - make_interval(months => meses);
  get diagnostics apagadas = row_count;
  return apagadas;
end;
$$;

revoke all on function expurgar_auditoria(int) from public;


-- -------------------------------------------------------------------
-- 0054_operador_tem_permissao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0054: a função que o banco vai usar pra checar permissão de
-- módulo. ETAPA 1 de 3 do item TR-04.1 — só a função, NENHUMA policy usa
-- ela ainda. Nada muda de comportamento ao rodar esta migration.
--
-- O problema que a série inteira resolve: hoje a permissão de módulo é
-- checada só na TELA. Um balconista com permissão só de "Caixa" não vê o
-- menu Clientes — mas a chave `anon` está no computador dele, a sessão é
-- válida, e um `select * from clientes` pela API responde a lista inteira.
-- A RLS exige estar logado e ter acesso à loja; não exige a permissão do
-- módulo. É a diferença entre esconder e proteger (seção 6, item 1).
--
-- Enquanto quem opera é o pai dela e os funcionários da loja dele, isso é
-- risco teórico, e o PROJETO_STATUS sempre foi honesto sobre isso. Quando o
-- operador for funcionário de uma empresa que só comprou o sistema, deixa de
-- ser: dá pra exportar o cadastro de clientes inteiro — e o de TODAS as
-- lojas da mesma empresa, já que `clientes` e `pecas` são compartilhados —
-- sem deixar rastro, porque a auditoria registra escrita, nunca leitura.
--
-- Por que `security definer`: esta função consulta `operadores`, e vai ser
-- chamada de dentro de policies. Sem `security definer` ela reagiria à
-- própria RLS e daria `infinite recursion detected in policy` (42P17) — é o
-- item 13 da seção 6, e o mesmo motivo de `operador_atual_e_admin()`
-- (migration 0008) ser assim.
--
-- Como usar na etapa 2, quando ela chegar — as duas regras não são estilo,
-- são desempenho medido e documentado pelo Supabase:
--
--   create policy "clientes_leitura" on clientes
--     for select
--     to authenticated                              -- não avalia pra anônimo
--     using ((select operador_tem_permissao('clientes')));   -- avalia UMA vez
--
-- O `select` em volta faz o planejador tratar como `initPlan` e rodar a
-- função uma vez por consulta, em vez de uma vez por linha.
--
-- Idempotente: seguro rodar de novo.

create or replace function operador_tem_permissao(modulo text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from operadores
    where id = auth.uid()
      and ativo = true
      and (admin = true or modulo = any (permissoes))
  );
$$;

comment on function operador_tem_permissao(text) is
  'TR-04.1 etapa 1. Verdadeiro se quem está logado é admin ativo, ou se o '
  'módulo está em operadores.permissoes. As chaves válidas são as de MODULOS '
  'em src/types/operador.ts. Usar sempre como (select operador_tem_permissao(...)) '
  'dentro de policy, e com TO authenticated.';


-- -------------------------------------------------------------------
-- 0055_schema_versao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0055: o banco passa a dizer em que versão ele está (item TR-05.7).
--
-- O PROBLEMA. O app instalado não tinha como saber se o banco daquela empresa
-- já recebeu as migrations que a versão nova precisa. Hoje isso funciona por
-- combinação: ela roda o SQL no Editor e só então publica a tag, nessa ordem.
-- Já houve descompasso (a `0046`/`0047` ficaram "ainda não rodadas" por um
-- tempo), e com mais de uma empresa isso deixa de ser exceção e vira rotina:
-- o auto-update chega em todas as lojas no mesmo minuto, e a migration é
-- manual, um projeto Supabase por vez.
--
-- O app novo contra o banco velho falha do pior jeito possível: `column ...
-- does not exist`, numa tela qualquer, sem dizer a ninguém o que fazer.
-- Com esta tabela o app abre, compara e avisa em português qual arquivo falta
-- rodar. É AVISO, nunca tranca (regra do item 33 da seção 6 do PROJETO_STATUS).
--
-- DUAS COISAS QUE VALEM SABER ANTES DE MEXER AQUI:
--
-- 1. A TABELA NÃO É ESCRITA PELO APP. Não existe policy de insert/update/
--    delete pra ninguém, de propósito — mesma decisão da trilha de auditoria.
--    Quem grava é a própria migration, rodando no SQL Editor (dono do banco).
--    Um app capaz de escrever "estou em dia" sobre si mesmo não serviria de
--    nada: bastaria o bug que ele deveria denunciar pra ele mentir.
--
-- 2. O BACKFILL ASSUME O ÓBVIO: quem chegou nesta migration rodou as 54
--    anteriores, porque elas rodam em ordem — e o arquivo de instalação única
--    (`supabase/instalacao/instalacao-completa.sql`) é justamente a ordem
--    inteira, de uma vez. Por isso ele registra de 1 a 55, e não só a 55.
--
-- A PARTIR DAQUI, TODA MIGRATION NOVA REGISTRA A PRÓPRIA LINHA, no final:
--
--     insert into schema_versao (versao) values (56) on conflict do nothing;
--
-- Não é estilo nem capricho: sem essa linha o aviso do app MENTE, dizendo que
-- o banco está atrasado quando ele está em dia — e aviso que mente é pior que
-- aviso nenhum, porque ensina quem usa a ignorar. O `npm test` reprova a
-- migration que esquecer (scripts/gerar-instalacao-completa.test.ts).
--
-- Idempotente: seguro rodar de novo.

create table if not exists schema_versao (
  versao      int primary key,
  aplicada_em timestamptz not null default now()
);

comment on table schema_versao is
  'TR-05.7. Uma linha por migration já aplicada neste banco. O app compara o '
  'maior número daqui com a versão que a build dele exige, e avisa quando o '
  'banco está atrás. Escrita só pelo dono do banco (SQL Editor): não existe '
  'policy de insert/update/delete pra ninguém.';

alter table schema_versao enable row level security;

-- Leitura liberada pra qualquer um logado, inclusive operador sem loja
-- nenhuma: o aviso precisa aparecer antes de qualquer tela, e o número da
-- versão do esquema não é dado de pessoa nenhuma.
drop policy if exists "schema_versao_leitura" on schema_versao;
create policy "schema_versao_leitura"
  on schema_versao
  for select
  to authenticated
  using (true);

-- O backfill descrito no item 2 do cabeçalho.
insert into schema_versao (versao)
select generate_series(1, 55)
on conflict (versao) do nothing;


-- -------------------------------------------------------------------
-- 0056_rh_so_com_permissao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0056: dado de RH só pra quem tem o módulo — item TR-04.3, e a
-- PRIMEIRA tabela da etapa 2 do TR-04.1 (a função de permissão da 0054
-- finalmente sendo usada por uma policy).
--
-- O problema. `funcionarios` guarda salário, comissão, CPF, RG, CNH,
-- filiação, nome do cônjuge — e `funcionario_filhos` guarda nome e
-- nascimento de criança. A TELA esconde tudo isso de quem não tem a
-- permissão "Funcionários"; a RLS não escondia nada: qualquer operador
-- logado com acesso à loja podia pedir a tabela inteira pela API, com a
-- chave que está no computador dele. Salário de colega circulando na loja é
-- briga na hora; CPF/RG/filiação é dado pessoal de terceiro sob a LGPD.
-- Deixar dado de saúde de fora do cadastro (decisão antiga do projeto) só
-- faz sentido se o resto também estiver fechado.
--
-- O que NÃO pode quebrar junto. Todo mundo que abre uma OS precisa escolher
-- técnico e vendedor, e precisa ver o nome do técnico num item já lançado —
-- inclusive o balconista que não tem o módulo. Ou seja: `nome` é público,
-- `salario` não, e a mesma tabela tem os dois.
--
-- Como fica, então:
--   • a TABELA `funcionarios` passa a exigir a permissão do módulo, nos
--     quatro comandos;
--   • a VIEW `funcionarios_publico` entrega só id/nome/cargo/ativo/loja_id/
--     operador_id pra qualquer operador com acesso à loja. É por ela que os
--     seletores de técnico e vendedor passam a ler.
--
-- ⚠️  A RECEITA DO GUIA ESTÁ ERRADA, e vale saber por quê antes de
--     "consertar" isto. O item TR-04.3 pede uma view com
--     `security_invoker = true`. Medido num Postgres 16: com a tabela base
--     fechada pro invocador, a view `security_invoker = true` devolve ZERO
--     linhas — ela obedece à RLS da base, que é justamente o que se quer
--     contornar aqui. Só `security_invoker = false` (o padrão) atravessa,
--     porque aí a view roda com os direitos do dono, que é o dono da tabela
--     e não reage a RLS.
--
--     A consequência disso é a regra desta migration: como a view passa por
--     cima da RLS, **o filtro de loja tem que estar escrito dentro dela**.
--     Sem o `where operador_tem_acesso_loja(...)` abaixo, ela entregaria os
--     funcionários de TODAS as lojas da empresa pra qualquer um.
--
-- Por que os quatro comandos viram policies separadas, e não uma `for all`:
-- policies são permissivas, então uma `for all` sobrevivente daria `select`
-- a quem a nova policy quer barrar. E toda vez que uma tabela ganha comando
-- sem policy, o efeito é filtrar a zero linhas **sem erro nenhum** (§6 item
-- 15) — por isso os quatro estão escritos aqui, um a um, e a matriz de RLS
-- (`npm run test:rls`) reprova se algum sumir.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A tabela base: só com a permissão do módulo
-- ===================================================================
-- O `(select ...)` em volta da função não é estilo: faz o planejador rodar a
-- checagem uma vez por consulta em vez de uma vez por linha (é o que o
-- cabeçalho da 0054 explica).

drop policy if exists "funcionarios_acesso_autenticados" on funcionarios;
drop policy if exists "funcionarios_acesso_por_loja" on funcionarios;
drop policy if exists "funcionarios_leitura" on funcionarios;
drop policy if exists "funcionarios_insercao" on funcionarios;
drop policy if exists "funcionarios_alteracao" on funcionarios;
drop policy if exists "funcionarios_exclusao" on funcionarios;

create policy "funcionarios_leitura" on funcionarios
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  );

create policy "funcionarios_insercao" on funcionarios
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  );

create policy "funcionarios_alteracao" on funcionarios
  for update to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  )
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  );

create policy "funcionarios_exclusao" on funcionarios
  for delete to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  );

-- O gatilho que espelha operador → funcionário (migration 0019) é
-- `security definer`, então continua gravando por cima destas policies: criar
-- um operador novo não passa a exigir o módulo Funcionários. Já o `update`
-- que `criarOperador()` faz em seguida (pra preencher a loja) passa, e isso
-- está certo: só admin cria operador, e admin satisfaz a função de permissão.

-- ===================================================================
-- 2. Os filhos: mesma regra, herdando a loja pelo funcionário
-- ===================================================================
-- Aqui não existe "parte pública": nome e nascimento de filho de funcionário
-- não servem pra nenhuma tela fora do módulo.

drop policy if exists "funcionario_filhos_acesso_autenticados" on funcionario_filhos;
drop policy if exists "funcionario_filhos_acesso_por_loja" on funcionario_filhos;
drop policy if exists "funcionario_filhos_acesso" on funcionario_filhos;

create policy "funcionario_filhos_acesso" on funcionario_filhos
  for all to authenticated
  using (
    (select operador_tem_permissao('funcionarios'))
    and exists (
      select 1 from funcionarios f
      where f.id = funcionario_filhos.funcionario_id
        and operador_tem_acesso_loja(f.loja_id)
    )
  )
  with check (
    (select operador_tem_permissao('funcionarios'))
    and exists (
      select 1 from funcionarios f
      where f.id = funcionario_filhos.funcionario_id
        and operador_tem_acesso_loja(f.loja_id)
    )
  );

-- O `exists` acima consulta `funcionarios`, que agora tem RLS mais apertada.
-- Não vira recursão nem bloqueio extra: quem passa na primeira condição
-- (tem o módulo) também passa na policy de leitura de `funcionarios`.

-- ===================================================================
-- 3. A janela pública: nome e cargo, e mais nada
-- ===================================================================

drop view if exists funcionarios_publico;

create view funcionarios_publico
with (security_invoker = false, security_barrier = true)
as
  select f.id,
         f.loja_id,
         f.nome,
         f.cargo,
         f.operador_id,
         f.ativo
    from funcionarios f
   where operador_tem_acesso_loja(f.loja_id);

comment on view funcionarios_publico is
  'TR-04.3. A parte de `funcionarios` que qualquer operador com acesso à loja '
  'pode ver: o necessário pra escolher técnico e vendedor numa OS. Roda com os '
  'direitos do dono (security_invoker = false), então NÃO reage à RLS da '
  'tabela base — é o where daqui que isola a loja, e tirá-lo abre o cadastro '
  'da empresa inteira. security_barrier impede que um filtro do chamador seja '
  'avaliado antes desse where. Só SELECT é concedido: ela é auto-atualizável, '
  'e sem o revoke abaixo daria pra escrever na tabela base por dentro dela, '
  'passando por cima das policies.';

-- O Supabase concede os quatro comandos sozinho em tudo que nasce no schema
-- public (`alter default privileges`). Sem este revoke, a view viraria uma
-- porta de escrita sem RLS — e uma porta de leitura pro `anon`.
revoke all on funcionarios_publico from anon, authenticated;
grant select on funcionarios_publico to authenticated;

insert into schema_versao (versao) values (56) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0057_cofre_token_focus_nfe.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0057: o token da Focus NFe sai do alcance do operador — item
-- TR-04.2, parte 1 de 2.
--
-- O problema. `configuracoes_fiscais_loja.focus_nfe_token` é uma coluna
-- comum: qualquer operador com acesso à loja — balconista incluído — lê
-- essa coluna pela API, com a chave que está no computador dele. E esse
-- token EMITE E CANCELA NOTA FISCAL NO CNPJ DA LOJA. Nas mãos erradas ele
-- não vaza dado: produz documento fiscal falso ou cancela documento
-- verdadeiro, com consequência tributária pro dono da loja. Era o segredo
-- mais sensível do sistema guardado com menos cuidado que a chave da
-- Anthropic.
--
-- Como fica:
--   • o token passa a morar em `segredos_fiscais_loja`, uma tabela SEM
--     POLICY NENHUMA: nenhum operador lê, nem admin, nem o próprio app. Só
--     a service role (que existe apenas dentro das Edge Functions) enxerga;
--   • quem usa o token é o "porteiro" — a Edge Function `focus-nfe` —, que
--     confere quem está pedindo antes de repassar à Focus NFe;
--   • o admin continua trocando o token pela tela de Configurações, por
--     `definir_token_focus_nfe()`: dá pra ESCREVER, nunca ler de volta;
--   • a tela só precisa saber "esta loja tem token?", e isso é tudo que
--     `loja_tem_token_focus_nfe()` responde.
--
-- ⚠️  POR QUE A COLUNA ANTIGA NÃO SOME AQUI. A regra do projeto (seção 9,
--     "Voltar uma versão"): migration nunca tira coluna em uso na mesma
--     versão que passa a usar a nova. Se a versão do porteiro sair ruim e
--     for preciso voltar pra v0.9.40, aquela versão lê o token da coluna
--     antiga — e emitir nota não pode parar por causa de um rollback.
--     A parte 2 (uma migration seguinte) limpa a coluna antiga, SÓ depois
--     de uma nota emitida e uma cancelada de verdade pelo porteiro. Até lá
--     o token continua copiado lá, legível como sempre foi: a proteção de
--     verdade chega com a parte 2.
--
-- Por que tabela nova, e não um secret da Edge Function como o guia
-- sugeria (decidido com a usuária em 25/09/2026): um secret é um por projeto
-- Supabase, ou seja, um por EMPRESA — e uma empresa com duas lojas em CNPJs
-- diferentes precisaria de dois tokens, a menos que um token da Focus NFe
-- sirva pros dois CNPJs, o que não deu pra confirmar. A tabela guarda um
-- por loja, e continua funcionando se um dia a conta da Focus NFe for
-- unificada: é o mesmo token colado em cada loja.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. O cofre
-- ===================================================================

create table if not exists segredos_fiscais_loja (
  loja_id         uuid primary key references lojas(id) on delete cascade,
  focus_nfe_token text not null,
  atualizado_em   timestamptz not null default now()
);

comment on table segredos_fiscais_loja is
  'TR-04.2. O token da Focus NFe de cada loja. SEM POLICY NENHUMA de '
  'propósito: nenhum operador lê nem escreve aqui pela API. Quem lê é a Edge '
  'Function focus-nfe (service role); quem escreve é '
  'definir_token_focus_nfe(), só admin da loja. Não criar policy de select '
  'aqui — é o que transformaria o cofre de volta numa coluna comum.';

alter table segredos_fiscais_loja enable row level security;

-- Nenhuma policy. Os quatro comandos estão declarados como lacuna
-- proposital em supabase/testes-rls/lacunas-de-proposito.csv, e a matriz de
-- RLS reprova se alguém criar uma.

-- ===================================================================
-- 2. Copiar o token que já existe (pra ninguém precisar colar de novo)
-- ===================================================================
-- `do nothing` no conflito: rodando esta migration de novo depois de o
-- admin ter trocado o token pelo cofre, a cópia antiga não pode passar por
-- cima da nova.

insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
select loja_id, btrim(focus_nfe_token)
  from configuracoes_fiscais_loja
 where focus_nfe_token is not null
   and btrim(focus_nfe_token) <> ''
on conflict (loja_id) do nothing;

-- ===================================================================
-- 3. Escrever sem poder ler: só admin da loja
-- ===================================================================

create or replace function definir_token_focus_nfe(p_loja_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not operador_e_admin_da_loja(p_loja_id) then
    raise exception 'Só um administrador desta loja pode trocar o token da Focus NFe.'
      using errcode = '42501';
  end if;
  if p_token is null or btrim(p_token) = '' then
    raise exception 'O token da Focus NFe não pode ficar em branco.'
      using errcode = '22023';
  end if;

  insert into segredos_fiscais_loja (loja_id, focus_nfe_token, atualizado_em)
  values (p_loja_id, btrim(p_token), now())
  on conflict (loja_id) do update
    set focus_nfe_token = excluded.focus_nfe_token,
        atualizado_em   = now();
end;
$$;

comment on function definir_token_focus_nfe(uuid, text) is
  'TR-04.2. Grava (ou troca) o token da Focus NFe da loja. Só admin ativo da '
  'loja. Não devolve nada — o token não sai do banco por aqui.';

-- ===================================================================
-- 4. A tela só precisa de "tem token?"
-- ===================================================================

create or replace function loja_tem_token_focus_nfe(p_loja_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select operador_tem_acesso_loja(p_loja_id)
     and exists (
       select 1 from segredos_fiscais_loja
        where loja_id = p_loja_id
          and btrim(focus_nfe_token) <> ''
     );
$$;

comment on function loja_tem_token_focus_nfe(uuid) is
  'TR-04.2. Verdadeiro se a loja tem token da Focus NFe no cofre. Só '
  'responde a quem tem acesso à loja; pra qualquer outro, falso.';

-- ===================================================================
-- 5. Quem pode usar o porteiro, e pra quê
-- ===================================================================
-- A regra mora aqui, e não dentro da Edge Function, pra existir num lugar
-- só e poder ser testada num Postgres local (testar-porteiro-focus-nfe.sql).
-- O porteiro chama esta função COMO O OPERADOR que pediu, então o
-- `auth.uid()` lá dentro é quem está no balcão.
--
-- A regra copia o que a tela já permite hoje, pra ninguém perder nada:
--   • emitir, consultar e baixar o PDF/XML: quem abre a aba Fechamento da OS
--     (módulo Ordens de Serviço) ou a tela de Notas Fiscais;
--   • cancelar: só quem tem Notas Fiscais — é a única tela que cancela.
-- Admin ativo passa em tudo (é o que operador_tem_permissao já faz).

create or replace function pode_usar_focus_nfe(p_loja_id uuid, p_acao text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select operador_tem_acesso_loja(p_loja_id)
     and case p_acao
           when 'cancelar' then operador_tem_permissao('notas_fiscais')
           when 'emitir'   then operador_tem_permissao('ordens_servico')
                             or operador_tem_permissao('notas_fiscais')
           when 'consultar' then operador_tem_permissao('ordens_servico')
                             or operador_tem_permissao('notas_fiscais')
           when 'baixar'   then operador_tem_permissao('ordens_servico')
                             or operador_tem_permissao('notas_fiscais')
           else false
         end;
$$;

comment on function pode_usar_focus_nfe(uuid, text) is
  'TR-04.2. A regra do porteiro da Focus NFe. Ações: emitir, consultar, '
  'baixar, cancelar. Qualquer outra resposta é falso.';

-- As três funções são `security definer`. Sem estes revokes, o Postgres dá
-- EXECUTE a PUBLIC e o Supabase dá ao `anon` — e quem não está logado
-- conseguiria ao menos perguntar. Com eles, só quem está logado chama.
revoke all on function definir_token_focus_nfe(uuid, text) from public, anon;
revoke all on function loja_tem_token_focus_nfe(uuid)      from public, anon;
revoke all on function pode_usar_focus_nfe(uuid, text)     from public, anon;
grant execute on function definir_token_focus_nfe(uuid, text) to authenticated;
grant execute on function loja_tem_token_focus_nfe(uuid)      to authenticated;
grant execute on function pode_usar_focus_nfe(uuid, text)     to authenticated;

-- ===================================================================
-- 6. Auditoria: quem trocou o token, e quando — sem o token
-- ===================================================================
-- A máscara da 0053 é por NOME DE COLUNA, e a coluna aqui se chama
-- focus_nfe_token de propósito: o valor sai como '***' na trilha.

drop trigger if exists trigger_auditoria on segredos_fiscais_loja;
create trigger trigger_auditoria
  after insert or update or delete on segredos_fiscais_loja
  for each row execute function registrar_auditoria('loja_id');

insert into schema_versao (versao) values (57) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0058_fechamento_caixa.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0058: fechamento de caixa do dia (item TR-06.4 do guia).
--
-- O PROBLEMA. O Caixa Diário mostrava o movimento do dia, mas não existia o
-- gesto de FECHAR o dia: contar o dinheiro da gaveta, comparar com o que o
-- sistema diz e registrar a diferença. Sem isso, um erro de troco só aparece
-- olhando extrato no fim do mês, quando ninguém lembra do dia — e "faltou
-- dinheiro no caixa hoje?" é uma das perguntas que mais fazem uma loja querer
-- um sistema.
--
-- O DESENHO espelha a Contagem de Estoque, que já funciona e ela já entende:
--   • uma linha por loja por dia, com o que o sistema esperava, o que foi
--     contado e a diferença;
--   • a diferença vira um lançamento de caixa de verdade ("Quebra de caixa"
--     quando falta, "Sobra de caixa" quando sobra), em dinheiro — igual a
--     Contagem gera o ajuste de estoque. Nunca "sumir" com a diferença. E,
--     como o lançamento é em dinheiro, depois de fechado o esperado passa a
--     bater com o contado sozinho;
--   • a CONTA do esperado não mora aqui: ela é de src/schemas/fechamentoCaixa.ts,
--     função pura testada (regra 8 do guia — é a sexta vez que este projeto
--     teria a mesma conta de dinheiro em dois lugares). O banco só guarda o
--     número e a subtração contado − esperado.
--
-- QUATRO DECISÕES QUE VALEM SABER ANTES DE MEXER AQUI:
--
-- 1. FECHAR É UMA FUNÇÃO (`fechar_caixa`), não dois inserts do app. O
--    lançamento da diferença e o registro do fechamento entram na MESMA
--    transação: se o segundo falhar (dois computadores fechando o mesmo dia,
--    por exemplo), o primeiro some junto. Feito pelo app em dois pedidos, uma
--    falha no meio deixaria uma "quebra de caixa" órfã, lançada e sem
--    fechamento. A função é `security invoker`: a RLS das duas tabelas vale
--    como se o próprio operador tivesse feito cada insert.
--
-- 2. NINGUÉM ALTERA um fechamento. Não existe policy de update, de propósito
--    (a matriz de RLS declara isso em lacunas-de-proposito.csv). Contou
--    errado? Desfaz e fecha de novo.
--
-- 3. DESFAZER É SÓ DE ADMIN DA LOJA. Se quem fecha pudesse desfazer, bastaria
--    fechar com falta, desfazer e fechar de novo com o valor "certo" pra a
--    falta sumir. Desfazer apaga o lançamento da diferença junto (mesma
--    transação, `desfazer_fechamento_caixa`), e a trilha de auditoria guarda
--    os dois — quem fechou, com quanto, e quem desfez.
--
-- 4. FECHAR EXIGE A PERMISSÃO DO MÓDULO CAIXA no banco, e não só a tela — a
--    etapa 2 do TR-04.1 aplicada desde o nascimento. Tabela nova não tem
--    comportamento antigo pra quebrar, então não há o que decidir com ela.
--
-- Idempotente: seguro rodar de novo.

create table if not exists fechamentos_caixa (
  id                 uuid primary key default gen_random_uuid(),
  loja_id            uuid not null references lojas(id),
  data               date not null,
  -- o dinheiro que já estava na gaveta ao abrir (o "troco"). Guardado pra
  -- que o próximo fechamento já venha com ele preenchido.
  fundo_troco        numeric(12,2) not null default 0,
  -- o que o sistema esperava encontrar em ESPÉCIE: fundo + entradas em
  -- dinheiro − saídas em dinheiro. Congelado no momento do fechamento.
  saldo_sistema      numeric(12,2) not null,
  valor_contado      numeric(12,2) not null,
  diferenca          numeric(12,2) not null,
  -- Pix, cartão e o resto, pra conferência do extrato — só registro.
  totais_por_forma   jsonb not null default '{}'::jsonb,
  observacao         text,
  caixa_movimento_id uuid references caixa_movimentos(id) on delete set null,
  operador_id        uuid references operadores(id) on delete set null,
  criado_em          timestamptz not null default now(),
  constraint fechamentos_caixa_loja_data_unique unique (loja_id, data),
  constraint ck_fechamentos_caixa_valores check (
    fundo_troco >= 0 and valor_contado >= 0 and diferenca = valor_contado - saldo_sistema
  )
);

comment on table fechamentos_caixa is
  'TR-06.4. Um fechamento por loja por dia: esperado em espécie, contado e a '
  'diferença, que vira um lançamento de caixa (Quebra/Sobra de caixa). Gravado '
  'só por fechar_caixa(); ninguém altera; desfazer é só de admin da loja.';

create index if not exists fechamentos_caixa_loja_data_idx
  on fechamentos_caixa (loja_id, data desc);

alter table fechamentos_caixa enable row level security;

drop policy if exists "fechamentos_caixa_leitura" on fechamentos_caixa;
drop policy if exists "fechamentos_caixa_insercao" on fechamentos_caixa;
drop policy if exists "fechamentos_caixa_exclusao" on fechamentos_caixa;

create policy "fechamentos_caixa_leitura" on fechamentos_caixa
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('caixa'))
  );

create policy "fechamentos_caixa_insercao" on fechamentos_caixa
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('caixa'))
  );

create policy "fechamentos_caixa_exclusao" on fechamentos_caixa
  for delete to authenticated
  using (operador_e_admin_da_loja(loja_id));

-- As duas categorias da diferença. Semeadas aqui pelo mesmo motivo da 0050:
-- `categorias_caixa` nasce vazia num banco novo, e o lançamento da diferença
-- precisa de categoria pra não cair no balde "sem categoria".
insert into categorias_caixa (nome, tipo)
values ('Quebra de caixa', 'saida'),
       ('Sobra de caixa', 'entrada')
on conflict (nome, tipo) do nothing;

-- ---------------------------------------------------------------------------
-- fechar_caixa — registra o fechamento e o lançamento da diferença juntos.
--
-- p_momento: quando o lançamento da diferença entra no caixa. Nulo = agora
-- (fechando o dia de hoje). Fechando um dia passado, o app manda o fim
-- daquele dia no fuso de quem usa — o banco não sabe o fuso da loja, e o
-- lançamento precisa cair no dia que está sendo fechado.
-- ---------------------------------------------------------------------------
create or replace function fechar_caixa(
  p_loja_id     uuid,
  p_data        date,
  p_fundo_troco numeric,
  p_esperado    numeric,
  p_contado     numeric,
  p_totais      jsonb,
  p_observacao  text,
  p_momento     timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_diferenca  numeric(12,2);
  v_movimento  uuid;
  v_categoria  uuid;
  v_fechamento uuid;
  v_dia        text := to_char(p_data, 'DD/MM/YYYY');
begin
  if p_contado is null or p_contado < 0 then
    raise exception 'O valor contado na gaveta precisa ser zero ou mais.';
  end if;
  if p_fundo_troco is null or p_fundo_troco < 0 then
    raise exception 'O fundo de troco precisa ser zero ou mais.';
  end if;
  if exists (select 1 from fechamentos_caixa where loja_id = p_loja_id and data = p_data) then
    raise exception 'O caixa do dia % já foi fechado.', v_dia;
  end if;

  v_diferenca := round(p_contado, 2) - round(p_esperado, 2);

  if v_diferenca <> 0 then
    select id into v_categoria
      from categorias_caixa
     where nome = case when v_diferenca < 0 then 'Quebra de caixa' else 'Sobra de caixa' end
       and tipo = case when v_diferenca < 0 then 'saida' else 'entrada' end;

    insert into caixa_movimentos (loja_id, data, tipo, forma_pagamento, valor, descricao, categoria_id)
    values (
      p_loja_id,
      coalesce(p_momento, now()),
      case when v_diferenca < 0 then 'saida' else 'entrada' end,
      'dinheiro',
      abs(v_diferenca),
      case when v_diferenca < 0
        then 'Quebra de caixa — fechamento de ' || v_dia
        else 'Sobra de caixa — fechamento de ' || v_dia
      end,
      v_categoria
    )
    returning id into v_movimento;
  end if;

  insert into fechamentos_caixa (
    loja_id, data, fundo_troco, saldo_sistema, valor_contado, diferenca,
    totais_por_forma, observacao, caixa_movimento_id, operador_id
  )
  values (
    p_loja_id, p_data, round(p_fundo_troco, 2), round(p_esperado, 2), round(p_contado, 2),
    v_diferenca, coalesce(p_totais, '{}'::jsonb), nullif(trim(p_observacao), ''),
    v_movimento, auth.uid()
  )
  returning id into v_fechamento;

  return v_fechamento;
end;
$$;

-- ---------------------------------------------------------------------------
-- desfazer_fechamento_caixa — apaga o fechamento e o lançamento da diferença
-- juntos. Só admin da loja consegue, pela policy de delete (a função é
-- security invoker). Sem linha apagada = sem permissão, e isso vira erro em
-- vez de "não fez nada" (§6 item 15 do PROJETO_STATUS).
-- ---------------------------------------------------------------------------
create or replace function desfazer_fechamento_caixa(p_fechamento_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movimento uuid;
begin
  delete from fechamentos_caixa
   where id = p_fechamento_id
  returning caixa_movimento_id into v_movimento;

  if not found then
    raise exception 'Só um administrador desta loja pode desfazer um fechamento de caixa.';
  end if;

  if v_movimento is not null then
    delete from caixa_movimentos where id = v_movimento;
  end if;
end;
$$;

revoke all on function fechar_caixa(uuid, date, numeric, numeric, numeric, jsonb, text, timestamptz) from public, anon;
revoke all on function desfazer_fechamento_caixa(uuid) from public, anon;
grant execute on function fechar_caixa(uuid, date, numeric, numeric, numeric, jsonb, text, timestamptz) to authenticated;
grant execute on function desfazer_fechamento_caixa(uuid) to authenticated;

-- Auditado desde o nascimento: fechar e desfazer são exatamente o tipo de
-- coisa que alguém vai querer saber quem fez.
drop trigger if exists trigger_auditoria on fechamentos_caixa;
create trigger trigger_auditoria
  after insert or update or delete on fechamentos_caixa
  for each row execute function registrar_auditoria('id');

insert into schema_versao (versao) values (58) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0059_comissoes_fechamentos.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0059: comissão paga fica registrada e congelada (item TL-46.1).
--
-- O PROBLEMA. A comissão de cada funcionário é sempre RECALCULADA a partir
-- das OS. Desde a v0.9.28 dá pra corrigir o valor de um item de OS já
-- lançado — então uma correção numa OS antiga muda, retroativamente, uma
-- comissão que já foi paga. E ninguém fica sabendo: a tela simplesmente
-- mostra outro número.
--
-- O DESENHO. Registrar um pagamento grava, junto com o valor pago, um
-- RETRATO das OS que formaram aquele número (`snapshot`). Daí em diante a
-- tela compara o recálculo de hoje com o retrato, e quando divergir MOSTRA
-- (nunca esconde) — é o sinal de que alguém editou uma OS depois do
-- pagamento. O retrato também é o que permite avisar quando uma OS de um
-- período novo já foi paga num período anterior que cruza com ele.
--
-- TRÊS DECISÕES QUE VALEM SABER:
--
-- 1. O NOME do funcionário é gravado junto, e não só o id: registro de
--    pagamento é histórico, e precisa continuar dizendo pra quem foi mesmo se
--    o cadastro mudar ou sair (mesmo motivo do `operador_nome` da auditoria,
--    migration 0053).
-- 2. NINGUÉM ALTERA um registro de pagamento (não existe policy de update,
--    declarado na matriz de RLS). Registrou errado? Um admin da loja desfaz e
--    registra de novo — e a trilha de auditoria guarda os dois.
-- 3. LER E REGISTRAR EXIGEM O MÓDULO FUNCIONÁRIOS no banco — é onde a tela de
--    Comissões mora, e a tabela `funcionarios` já exige o mesmo desde a 0056.
--    Tabela nova não tem comportamento antigo pra quebrar.
--
-- Não lança nada no Caixa, de propósito: comissão costuma sair junto do
-- salário, por Pix ou em dinheiro, e cada loja faz de um jeito. Se for pago
-- em dinheiro da gaveta, é um lançamento manual de saída, como sempre foi.
--
-- Idempotente: seguro rodar de novo.

create table if not exists comissoes_fechamentos (
  id               uuid primary key default gen_random_uuid(),
  loja_id          uuid not null references lojas(id),
  funcionario_id   uuid references funcionarios(id) on delete set null,
  funcionario_nome text not null,
  periodo_inicio   date not null,
  periodo_fim      date not null,
  percentual       numeric(5,2),
  -- o que a tela calculou no momento do pagamento (pode ser negativo: lucro
  -- negativo dá comissão negativa, e isso precisa aparecer, não sumir)
  valor_calculado  numeric(12,2) not null,
  valor_pago       numeric(12,2) not null,
  data_pagamento   date not null,
  observacao       text,
  -- [{ "ordemId", "numero", "papel": "vendedor"|"tecnico", "comissao" }]
  snapshot         jsonb not null default '[]'::jsonb,
  operador_id      uuid references operadores(id) on delete set null,
  criado_em        timestamptz not null default now(),
  constraint comissoes_fechamentos_periodo_unico unique (funcionario_id, periodo_inicio, periodo_fim),
  constraint ck_comissoes_fechamentos_valores check (
    periodo_fim >= periodo_inicio and valor_pago >= 0
  )
);

comment on table comissoes_fechamentos is
  'TL-46.1. Um pagamento de comissão por funcionário por período, com o retrato '
  'das OS que formaram o valor. A tela compara o recálculo com o retrato e avisa '
  'quando uma OS foi editada depois do pagamento. Sem update; desfazer é de admin.';

create index if not exists comissoes_fechamentos_loja_idx
  on comissoes_fechamentos (loja_id, periodo_fim desc);

alter table comissoes_fechamentos enable row level security;

drop policy if exists "comissoes_fechamentos_leitura" on comissoes_fechamentos;
drop policy if exists "comissoes_fechamentos_insercao" on comissoes_fechamentos;
drop policy if exists "comissoes_fechamentos_exclusao" on comissoes_fechamentos;

create policy "comissoes_fechamentos_leitura" on comissoes_fechamentos
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  );

create policy "comissoes_fechamentos_insercao" on comissoes_fechamentos
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('funcionarios'))
  );

create policy "comissoes_fechamentos_exclusao" on comissoes_fechamentos
  for delete to authenticated
  using (operador_e_admin_da_loja(loja_id));

drop trigger if exists trigger_auditoria on comissoes_fechamentos;
create trigger trigger_auditoria
  after insert or update or delete on comissoes_fechamentos
  for each row execute function registrar_auditoria('id');

insert into schema_versao (versao) values (59) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0060_travas_de_dado.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0060: travas que impedem dado impossível (item TR-05.1 do guia).
--
-- O PROBLEMA. O banco aceitava preço negativo, desconto maior que o item,
-- alíquota de 300%, CNPJ pela metade. A validação existia só no formulário,
-- que é a camada que dá pra contornar — e que não vale pro dado que entra por
-- importação de XML, por SQL Editor ou por uma versão velha do app numa loja
-- que não atualizou. Um `check` custa nada e não deixa o impossível existir.
--
-- A DECISÃO QUE MAIS IMPORTA AQUI: CADA TRAVA SÓ É CRIADA SE O DADO QUE JÁ
-- EXISTE DEIXAR. O guia manda conferir, antes de cada trava, se o banco real
-- já tem linha que a violaria — e o que fazer com esse dado é conversa com a
-- dona do sistema, não decisão de migration. Só que este banco é de empresas
-- diferentes, e nenhuma consulta daqui alcança o de verdade. Então a
-- migration faz a conferência sozinha, trava por trava:
--
--   • nenhuma linha fora da regra → a trava é criada;
--   • alguma linha fora da regra → a trava NÃO é criada, nada é alterado, e
--     a migration avisa qual e quantas linhas (raise notice), e mostra tudo
--     numa tabelinha no fim — é o que aparece no SQL Editor depois do Run.
--
-- Ou seja: rodar esta migration NUNCA falha por causa do dado de uma loja, e
-- NUNCA mexe em dado nenhum. O pior caso é "essa trava ficou pra depois".
-- Rodar de novo depois de corrigir o dado cria o que faltou (é idempotente).
--
-- AS DUAS REGRAS QUE O GUIA PEDIA E AQUI SAÍRAM DIFERENTES, DE PROPÓSITO:
--
--   1. Valor de conta a pagar/receber é ">= 0", não "> 0". Uma OS de garantia
--      (retorno, serviço sem cobrança) tem total zero; faturada como "a
--      receber depois", ela cria uma conta a receber de valor zero. Com "> 0",
--      faturar essa OS passaria a dar erro — e isso não dá pra descartar
--      daqui. Negativo, que é o que importa barrar, continua barrado.
--      (`caixa_movimentos.valor >= 0` já existe desde a 0006.)
--
--   2. Data de fechamento da OS pode ser até UM DIA antes da abertura, não
--      "maior ou igual". A abertura é gravada com o relógio do servidor e o
--      faturamento com o relógio do computador da loja; um Windows atrasado
--      alguns minutos, faturando logo depois de abrir, bateria na trava. O que
--      se quer barrar é o absurdo (fechar anos antes de abrir), não o relógio.
--
-- E UMA QUE EXIGIU CUIDADO: CNPJ. Desde julho de 2026 a Receita emite CNPJ
-- ALFANUMÉRICO (letras nas 12 primeiras posições). Por isso a trava conta
-- letras e números, e não só dígitos — uma regra de "14 dígitos" recusaria o
-- CNPJ de toda empresa aberta de julho pra cá.
--
-- Os nomes seguem `ck_<tabela>_<regra>` porque a tela traduz cada um numa
-- frase em português (src/lib/errors.ts). Nome novo aqui = frase nova lá.

-- A conferência "só crie se o dado deixar". Função temporária (pg_temp): some
-- sozinha no fim da sessão, não fica no banco nem pode ser chamada pela API.
create or replace function pg_temp.criar_trava(p_tabela text, p_nome text, p_regra text)
returns text
language plpgsql
as $$
declare
  v_fora bigint;
begin
  if exists (
    select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
     where t.relname = p_tabela and c.conname = p_nome
  ) then
    return 'já existia';
  end if;

  -- Linha em que a regra dá FALSO. Regra que dá nulo (coluna vazia) passa,
  -- que é exatamente como o `check` do Postgres trata.
  execute format('select count(*) from %I where (%s) is false', p_tabela, p_regra) into v_fora;

  if v_fora > 0 then
    raise notice 'trava % NÃO criada: % linha(s) de % estão fora da regra (%). Nada foi alterado.',
      p_nome, v_fora, p_tabela, p_regra;
    return format('NÃO criada — %s linha(s) fora da regra', v_fora);
  end if;

  execute format('alter table %I add constraint %I check (%s)', p_tabela, p_nome, p_regra);
  return 'criada';
end;
$$;

-- (o `client_min_messages` só cala o aviso técnico "table does not exist,
-- skipping" da primeira rodada; os avisos de "NÃO criada" vêm depois e aparecem)
set client_min_messages = warning;
drop table if exists pg_temp.travas_resultado;
create temp table travas_resultado (tabela text, trava text, regra text, resultado text);
reset client_min_messages;

insert into travas_resultado (tabela, trava, regra, resultado)
select t.tabela, t.trava, t.regra, pg_temp.criar_trava(t.tabela, t.trava, t.regra)
from (values
  -- item de OS: preço e desconto nunca negativos, e o desconto nunca maior
  -- que a própria linha (uma linha negativa derruba a nota — §6 item 60)
  ('ordens_servico_itens', 'ck_ordens_servico_itens_preco',      'preco_unitario >= 0'),
  -- (o `greatest` é pra esta não disparar junto com a de preço quando o preço
  -- é que está negativo — a mensagem na tela tem que apontar o campo certo)
  ('ordens_servico_itens', 'ck_ordens_servico_itens_desconto',   'desconto >= 0 and desconto <= greatest(quantidade * preco_unitario, 0)'),
  -- catálogo
  ('pecas',    'ck_pecas_preco_custo',      'preco_custo >= 0'),
  ('pecas',    'ck_pecas_preco_venda',      'preco_venda >= 0'),
  ('pecas',    'ck_pecas_prazo_garantia',   'prazo_garantia_dias >= 0'),
  ('pecas',    'ck_pecas_aliquota_icms',    'aliquota_icms between 0 and 100'),
  ('servicos', 'ck_servicos_preco_padrao',  'preco_padrao >= 0'),
  ('servicos', 'ck_servicos_custo',         'custo >= 0'),
  -- dinheiro a pagar/receber (>= 0: ver o item 1 do cabeçalho)
  ('contas_pagar',   'ck_contas_pagar_valor',   'valor >= 0'),
  ('contas_receber', 'ck_contas_receber_valor', 'valor >= 0'),
  -- pedido de compra
  ('pedidos_compra_itens', 'ck_pedidos_compra_itens_preco',    'preco_unitario >= 0'),
  ('pedidos_compra_itens', 'ck_pedidos_compra_itens_recebida', 'quantidade_recebida >= 0'),
  -- datas da OS (tolerância de um dia: ver o item 2 do cabeçalho)
  ('ordens_servico', 'ck_ordens_servico_datas', 'data_fechamento is null or data_fechamento >= data_abertura - interval ''1 day'''),
  -- configurações
  ('configuracoes_juros_parcelas', 'ck_juros_percentual', 'juros_percentual between 0 and 100'),
  -- ISS é limitado a 5% por lei; a folga até 10 é proposital
  ('configuracoes_fiscais_loja', 'ck_config_fiscal_aliquota_iss', 'aliquota_iss between 0 and 10'),
  ('configuracoes_fiscais_loja', 'ck_config_fiscal_cnpj',
     'cnpj is null or btrim(cnpj) = '''' or length(regexp_replace(upper(cnpj), ''[^0-9A-Z]'', '''', ''g'')) = 14'),
  -- cliente pessoa jurídica: CNPJ inteiro ou nenhum — nunca pela metade, que
  -- faz a SEFAZ recusar a nota inteira
  ('clientes', 'ck_clientes_cnpj_juridica',
     'tipo_pessoa is distinct from ''juridica'' or cpf_cnpj is null or btrim(cpf_cnpj) = '''' or length(regexp_replace(upper(cpf_cnpj), ''[^0-9A-Z]'', '''', ''g'')) = 14')
) as t(tabela, trava, regra);

insert into schema_versao (versao) values (60) on conflict do nothing;

-- O que aparece no SQL Editor depois do Run: uma linha por trava, com o
-- resultado. Se alguma disser "NÃO criada", o dado dela precisa ser olhado —
-- e é pra mandar o print, não pra forçar.
select tabela, trava, resultado from travas_resultado order by (resultado like 'NÃO%') desc, tabela, trava;


-- -------------------------------------------------------------------
-- 0061_contas_so_com_permissao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0061: Contas a Pagar e Contas a Receber só pra quem tem o
-- módulo — o segundo lote da etapa 2 do TR-04.1 (o primeiro foi o RH, na
-- 0056).
--
-- O problema. A TELA escondia as duas listas de quem não tem a permissão;
-- a RLS só exigia acesso à loja. Então um balconista com permissão só de
-- Caixa, usando a chave que está no computador dele, podia pedir pela API a
-- lista inteira do que a loja deve (fornecedor, aluguel, valor, vencimento)
-- e de quem deve pra loja (cliente, valor) — e também criar, pagar ou
-- apagar conta. É a diferença entre esconder e proteger (§6 item 1).
--
-- O que NÃO pode quebrar junto — e foi por isso que o desenho levou mais
-- tempo que a policy. Conferido tela por tela antes de escrever:
--
--   • FATURAR UMA OS "A RECEBER DEPOIS" (módulo Ordens de Serviço) cria a
--     conta a receber. Quem fatura OS pode não ter o módulo Contas a
--     Receber — e faturar não pode parar de funcionar por isso. Então quem
--     tem Ordens de Serviço pode INSERIR, mas só uma conta amarrada a uma OS
--     desta mesma loja: é exatamente o caminho do faturamento, e nada além.
--     Uma cobrança avulsa (sem OS) continua sendo só do módulo.
--     O insert do faturamento não pede a linha de volta (`returning`) — e
--     isso importa: com `returning`, a policy de LEITURA também teria de
--     deixar, e quem só fatura não lê a lista (lição da 0058).
--
--   • A ABA COMISSÕES (módulo Funcionários) lê as contas a receber pra
--     avisar "esta comissão vem de OS que o cliente ainda não pagou". Então
--     quem tem Funcionários também LÊ. Só lê: não cria, não recebe.
--     Janela menor (uma view só com "OS pendente sim/não", como a da 0056)
--     foi considerada e deixada pra quando `ordens_servico` for fechada: hoje
--     a lista de OS, com cliente e valor, continua aberta a qualquer um
--     logado, então a view não esconderia nada que já não esteja à vista.
--
--   • O INÍCIO lê Contas a Pagar pro cartão "Contas a pagar vencendo" e pro
--     calendário. Decisão dela (26/09/2026): quem não tem o módulo NÃO vê —
--     o programa passa a mostrar "—" no cartão, com a explicação, em vez de
--     um R$ 0,00 que parece verdade. Isso é do lado do app; aqui não há
--     exceção nenhuma pro Início.
--
--   • PAGAR / RECEBER lançam no Caixa. Isso continua funcionando porque
--     `caixa_movimentos` ainda não foi fechada. QUANDO FOR (próximo lote),
--     quem tem Contas a Pagar e Contas a Receber precisa continuar podendo
--     lançar ali — anotado aqui pra não virar surpresa.
--
-- Os quatro comandos em policies separadas, pelo mesmo motivo da 0056: uma
-- `for all` sobrevivente daria `select` a quem a policy nova quer barrar, e
-- comando sem policy filtra a zero linhas sem erro nenhum (§6 item 15).
--
-- O `(select ...)` em volta da função faz o planejador avaliá-la uma vez por
-- consulta, não por linha (cabeçalho da 0054). O índice em `loja_id`, que a
-- outra metade da policy usa, já existe nas duas tabelas (0032 e 0036).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. Contas a Pagar: só o módulo, nos quatro comandos
-- ===================================================================

drop policy if exists "contas_pagar_acesso_autenticados" on contas_pagar;
drop policy if exists "contas_pagar_acesso_por_loja" on contas_pagar;
drop policy if exists "contas_pagar_leitura" on contas_pagar;
drop policy if exists "contas_pagar_insercao" on contas_pagar;
drop policy if exists "contas_pagar_alteracao" on contas_pagar;
drop policy if exists "contas_pagar_exclusao" on contas_pagar;

create policy "contas_pagar_leitura" on contas_pagar
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_pagar'))
  );

create policy "contas_pagar_insercao" on contas_pagar
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_pagar'))
  );

create policy "contas_pagar_alteracao" on contas_pagar
  for update to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_pagar'))
  )
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_pagar'))
  );

create policy "contas_pagar_exclusao" on contas_pagar
  for delete to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_pagar'))
  );

-- ===================================================================
-- 2. Contas a Receber: o módulo, mais as duas portas estreitas
-- ===================================================================

drop policy if exists "contas_receber_acesso_por_loja" on contas_receber;
drop policy if exists "contas_receber_leitura" on contas_receber;
drop policy if exists "contas_receber_insercao" on contas_receber;
drop policy if exists "contas_receber_alteracao" on contas_receber;
drop policy if exists "contas_receber_exclusao" on contas_receber;

-- Lê: o módulo, ou Funcionários (a aba Comissões).
create policy "contas_receber_leitura" on contas_receber
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('contas_receber'))
      or (select operador_tem_permissao('funcionarios'))
    )
  );

-- Cria: o módulo; ou Ordens de Serviço, e aí SÓ amarrada a uma OS desta
-- mesma loja (o faturamento "a receber depois"). O `exists` consulta
-- `ordens_servico` com os direitos de quem pede — quem fatura enxerga a OS
-- que está faturando.
create policy "contas_receber_insercao" on contas_receber
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('contas_receber'))
      or (
        (select operador_tem_permissao('ordens_servico'))
        and ordem_servico_id is not null
        and exists (
          select 1 from ordens_servico o
           where o.id = contas_receber.ordem_servico_id
             and o.loja_id = contas_receber.loja_id
        )
      )
    )
  );

-- Recebe (marca como recebido): só o módulo.
create policy "contas_receber_alteracao" on contas_receber
  for update to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_receber'))
  )
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_receber'))
  );

-- Apaga: só o módulo. (Hoje nenhuma tela apaga conta a receber; a policy
-- existe pra que o comando não fique sem dono — §6 item 15.)
create policy "contas_receber_exclusao" on contas_receber
  for delete to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('contas_receber'))
  );

insert into schema_versao (versao) values (61) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0062_caixa_so_com_permissao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0062: os lançamentos do Caixa só pra quem tem o módulo — o
-- terceiro lote da etapa 2 do TR-04.1 (0056 foi o RH, 0061 as contas).
--
-- O problema. `caixa_movimentos` é o dinheiro da loja: cada venda, cada
-- saída, a quebra de caixa do fechamento. A TELA do Caixa só abre pra quem
-- tem a permissão; a RLS só exigia acesso à loja. Então qualquer operador
-- logado, com a chave que está no computador dele, podia pedir a lista
-- inteira pela API — e também lançar, editar e apagar.
--
-- O que NÃO pode quebrar — mapeado tela por tela em 26/09/2026. O Caixa é a
-- tabela mais "atravessada" até aqui: quatro outros módulos gravam ou leem
-- nele, e cada um ganha uma porta ESTREITA, do tamanho do que faz:
--
--   • RELAÇÕES (os gráficos de vendas, custos e lucro) LÊ tudo. Decisão
--     dela (26/09/2026): quem recebe o relatório do dinheiro recebe pra ver
--     esses números. Só lê.
--
--   • ORDENS DE SERVIÇO: faturar "recebido agora" LANÇA a entrada da OS; e a
--     emissão da NFC-e (rateio do pagamento) e o documento de garantia (a
--     forma de pagamento) LEEM os lançamentos da OS. Então quem tem OS lê só
--     os lançamentos ligados a uma OS — os mesmos valores e formas que a
--     lista de OS já mostra — e lança só entrada amarrada a uma OS da mesma
--     loja. Nunca vê aluguel, sangria nem quebra de caixa.
--
--   • CONTAS A PAGAR: pagar LANÇA a saída; "desfazer pagamento" APAGA essa
--     saída. Quem tem o módulo lança saída sem OS, e lê/apaga só o
--     lançamento que está ligado a uma conta a pagar.
--
--   • CONTAS A RECEBER: receber LANÇA a entrada. Quem tem o módulo lança
--     entrada (se ligada a uma OS, da mesma loja) e lê só o lançamento
--     ligado a uma conta a receber.
--
-- O INÍCIO não ganha exceção nenhuma (decisão dela): os cartões Vendas,
-- Custos, Lucro e Ticket médio mostram "—" pra quem não tem Caixa nem
-- Relações. Isso é do lado do app.
--
-- Duas mudanças no app vieram junto, e sem elas as portas acima não
-- bastariam — as duas por causa da mesma regra do Postgres: um comando que
-- pede a linha de volta (`returning`) ou que filtra por coluna passa também
-- pela policy de LEITURA.
--   1. Lançar no Caixa não pede mais a linha de volta: o programa gera o id
--      antes de gravar. Senão quem só paga conta seria barrado ao lançar a
--      saída, porque ainda não "enxerga" a linha que acabou de criar (ela só
--      fica ligada à conta no passo seguinte).
--   2. "Desfazer pagamento" apaga o lançamento ANTES de desligá-lo da conta
--      (a chave estrangeira desliga sozinha, `on delete set null`). Na ordem
--      antiga, a conta era desligada primeiro — e aí quem só tem Contas a
--      Pagar perdia de vista o lançamento e o `delete` apagava zero linhas,
--      em silêncio, deixando uma saída órfã no Caixa (§6 item 15).
--
-- ⚠️ ORDEM AO SUBIR — AO CONTRÁRIO DO DE SEMPRE: a versão do programa que
-- traz essas duas mudanças (0.9.43) chega nos computadores ANTES desta
-- migration rodar. A versão nova funciona com o banco antigo; o contrário
-- não: com esta migration rodada e a v0.9.42 ainda instalada, quem não tem o
-- Caixa e paga ou recebe uma conta leva erro de permissão, e "desfazer
-- pagamento" deixa a saída órfã. (Admin não é afetado — tem todos os
-- módulos.) Entre uma coisa e outra, a faixa "banco desatualizado" aparece;
-- é aviso, nada quebra.
--
-- A linha abaixo foi acrescentada depois (migration 0063): é ela que faz o
-- botão "Atualizar o banco de todas as empresas" esperar os computadores que
-- ainda estão numa versão mais antiga — o que em 26/09/2026 foi conferido à
-- mão. Ela só muda o comportamento do botão; o SQL desta migration é o mesmo.
-- versao-minima-do-programa: 0.9.43
--
-- O fechamento de caixa (0058) continua igual: `fechar_caixa()` já exige o
-- módulo Caixa, e `desfazer_fechamento_caixa()` é de admin.
--
-- Os quatro comandos em policies separadas, pelo motivo de sempre (0056):
-- uma `for all` sobrevivente reabriria o que a nova fecha, e comando sem
-- policy filtra a zero linhas sem erro nenhum.
--
-- Idempotente: seguro rodar de novo.

-- As portas de Contas a Pagar e a Receber perguntam "este lançamento é o de
-- uma conta?", procurando pela coluna de ligação. Sem índice, cada pergunta
-- varreria a tabela de contas inteira.
create index if not exists contas_pagar_caixa_movimento_idx
  on contas_pagar (caixa_movimento_id);
create index if not exists contas_receber_caixa_movimento_idx
  on contas_receber (caixa_movimento_id);

-- A pergunta mora numa função, e não num `exists` escrito dentro da policy,
-- por DESEMPENHO — medido, não suposto. Com o `exists` direto, o planejador
-- somava o custo da RLS das contas em cada linha do Caixa, estimava a lista
-- 30 vezes mais cara, passava do limite do JIT e gastava ~16 ms compilando
-- a consulta a cada abertura da tela (20 mil lançamentos: 76 → 110 ms, pra
-- quem TEM o Caixa, que nem usa essa porta). Com a função: 76 → 78 ms.
--
-- `security definer` pelo motivo de sempre (§6 item 13) — e por isso ela
-- mesma confere que a conta é DA MESMA LOJA do lançamento, o que o `exists`
-- herdava da RLS das contas. Devolve só sim/não, nunca a conta.
create or replace function caixa_movimento_de_conta_pagar(movimento_id uuid, loja uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from contas_pagar
     where caixa_movimento_id = movimento_id
       and loja_id = loja
  );
$$;

create or replace function caixa_movimento_de_conta_receber(movimento_id uuid, loja uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from contas_receber
     where caixa_movimento_id = movimento_id
       and loja_id = loja
  );
$$;

-- Sem os revokes, `security definer` + a permissão padrão do Postgres
-- deixariam quem não está logado perguntar (mesma tranca da 0057).
revoke all on function caixa_movimento_de_conta_pagar(uuid, uuid) from public, anon;
revoke all on function caixa_movimento_de_conta_receber(uuid, uuid) from public, anon;
grant execute on function caixa_movimento_de_conta_pagar(uuid, uuid) to authenticated;
grant execute on function caixa_movimento_de_conta_receber(uuid, uuid) to authenticated;

drop policy if exists "caixa_movimentos_acesso_temporario" on caixa_movimentos;
drop policy if exists "caixa_movimentos_acesso_autenticados" on caixa_movimentos;
drop policy if exists "caixa_movimentos_acesso_por_loja" on caixa_movimentos;
drop policy if exists "caixa_movimentos_leitura" on caixa_movimentos;
drop policy if exists "caixa_movimentos_insercao" on caixa_movimentos;
drop policy if exists "caixa_movimentos_alteracao" on caixa_movimentos;
drop policy if exists "caixa_movimentos_exclusao" on caixa_movimentos;

-- Lê: Caixa ou Relações (tudo); OS (só o que é de OS); Contas a Pagar e a
-- Receber (só o lançamento ligado a uma conta delas).
create policy "caixa_movimentos_leitura" on caixa_movimentos
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (select operador_tem_permissao('relatorios'))
      or (
        (select operador_tem_permissao('ordens_servico'))
        and ordem_servico_id is not null
      )
      or (
        (select operador_tem_permissao('contas_pagar'))
        and caixa_movimento_de_conta_pagar(id, loja_id)
      )
      or (
        (select operador_tem_permissao('contas_receber'))
        and caixa_movimento_de_conta_receber(id, loja_id)
      )
    )
  );

-- Lança: Caixa (qualquer lançamento); OS (entrada de uma OS da mesma loja);
-- Contas a Pagar (saída sem OS); Contas a Receber (entrada — se de uma OS,
-- da mesma loja).
create policy "caixa_movimentos_insercao" on caixa_movimentos
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (
        (select operador_tem_permissao('ordens_servico'))
        and tipo = 'entrada'
        and ordem_servico_id is not null
        and exists (
          select 1 from ordens_servico o
           where o.id = caixa_movimentos.ordem_servico_id
             and o.loja_id = caixa_movimentos.loja_id
        )
      )
      or (
        (select operador_tem_permissao('contas_pagar'))
        and tipo = 'saida'
        and ordem_servico_id is null
      )
      or (
        (select operador_tem_permissao('contas_receber'))
        and tipo = 'entrada'
        and (
          ordem_servico_id is null
          or exists (
            select 1 from ordens_servico o
             where o.id = caixa_movimentos.ordem_servico_id
               and o.loja_id = caixa_movimentos.loja_id
          )
        )
      )
    )
  );

-- Edita (hoje: categorizar lançamentos em lote): só o Caixa.
create policy "caixa_movimentos_alteracao" on caixa_movimentos
  for update to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('caixa'))
  )
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('caixa'))
  );

-- Apaga: o Caixa; e Contas a Pagar, só a saída que ainda está ligada a uma
-- conta dela (o "desfazer pagamento").
create policy "caixa_movimentos_exclusao" on caixa_movimentos
  for delete to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (
        (select operador_tem_permissao('contas_pagar'))
        and caixa_movimento_de_conta_pagar(id, loja_id)
      )
    )
  );

insert into schema_versao (versao) values (62) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0063_computadores.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0063: cada computador diz ao banco em que versão está.
--
-- O problema. Até aqui, "em que versão está cada computador da loja?" não
-- tinha resposta. O programa se atualiza sozinho, mas só quando é fechado e
-- aberto de novo — e um computador que ficou ligado três dias, ou um notebook
-- que só abre de vez em quando, fica pra trás sem ninguém saber. Isso já
-- pesou uma vez: a migration 0062 quebraria a v0.9.42 pra quem paga conta sem
-- ter o Caixa, e a única saída foi conferir À MÃO que não havia operador
-- daquele perfil na loja. Com lojas de outras empresas, conferir à mão deixa
-- de ser possível.
--
-- Como fica:
--   • cada computador ganha uma identidade própria, criada por ele mesmo na
--     primeira vez que abre (um arquivo `computador.json` na pasta de dados
--     do app) — é o `id` desta tabela;
--   • a cada login, o programa grava aqui a versão dele, o canal de
--     atualização, o sistema operacional, a loja e quem entrou — pela função
--     `registrar_computador()`, nunca direto na tabela;
--   • o admin vê a lista em Configurações → "Computadores desta empresa",
--     dá um apelido pra cada um ("Balcão", "Notebook da Carol") e pode
--     "esquecer" um computador que não existe mais;
--   • o botão "Atualizar o banco de todas as empresas" lê esta tabela antes
--     de aplicar uma migration que exige uma versão mínima do programa, e
--     espera os computadores atrasados (ver scripts/atualizar-bancos.mjs).
--
-- O que esta tabela NÃO guarda, de propósito: nada de negócio — nenhum
-- valor, nenhum cliente, nenhuma OS. É o carimbo "este computador, nesta
-- versão, foi visto em tal dia". O nome da máquina é o nome que o Windows dá
-- a ela (ex: "DESKTOP-7GH2K1"), que já aparece na rede da loja.
--
-- Limite conhecido, aceito: um operador logado que descubra o `id` de outro
-- computador consegue gravar por cima da linha dele. O `id` é um UUID
-- aleatório que só o admin enxerga, e o estrago possível é mentir a versão de
-- um computador — nenhum dado da loja fica exposto por isso.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A tabela
-- ===================================================================

create table if not exists computadores (
  id              uuid primary key,
  nome_maquina    text not null default '',
  apelido         text,
  versao_app      text not null,
  canal           text not null default 'normal',
  sistema         text,
  loja_id         uuid references lojas(id) on delete set null,
  operador_id     uuid references operadores(id) on delete set null,
  primeiro_acesso timestamptz not null default now(),
  visto_em        timestamptz not null default now()
);

comment on table computadores is
  'Um computador por linha, com a versão do programa em que ele estava da '
  'última vez que alguém entrou nele. Gravado só por registrar_computador(). '
  'Lido pelo admin (Configurações) e pelo botão de atualizar os bancos, que '
  'espera os computadores atrasados antes de uma migration que exige versão '
  'mínima.';

-- As travas moram em blocos `do` pra rodar de novo sem erro de "já existe".
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_computadores_versao') then
    -- Só "números.números.números": é o que deixa comparar versão no banco
    -- (`string_to_array(versao_app, '.')::int[]`) sem um texto qualquer
    -- estourar a consulta do botão de atualizar os bancos.
    alter table computadores add constraint ck_computadores_versao
      check (versao_app ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_computadores_canal') then
    alter table computadores add constraint ck_computadores_canal
      check (canal in ('normal', 'teste'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_computadores_tamanhos') then
    -- Quem grava aqui é qualquer operador logado (pela função). Sem limite de
    -- tamanho, dava pra encher a tabela com um texto de megabytes.
    alter table computadores add constraint ck_computadores_tamanhos
      check (char_length(nome_maquina) <= 100
             and (apelido is null or char_length(apelido) <= 60)
             and (sistema is null or char_length(sistema) <= 200));
  end if;
end;
$$;

create index if not exists computadores_visto_em_idx on computadores (visto_em desc);

alter table computadores enable row level security;

-- ===================================================================
-- 2. Quem enxerga e quem esquece: o admin da loja em que o computador
--    foi visto por último
-- ===================================================================
-- Computador sem loja (a loja foi excluída, ou ele nunca chegou a entrar
-- numa) fica visível pra qualquer admin — senão viraria uma linha que
-- ninguém consegue ver nem apagar, o beco do §6 item 23.
--
-- INSERT e UPDATE não têm policy, de propósito: gravar é só por
-- registrar_computador() e trocar o apelido é só por
-- definir_apelido_computador(). Os dois estão declarados como lacuna em
-- supabase/testes-rls/lacunas-de-proposito.csv.

drop policy if exists computadores_select on computadores;
create policy computadores_select on computadores
  for select to authenticated
  using (
    operador_e_admin_da_loja(loja_id)
    or (loja_id is null and operador_atual_e_admin_de_alguma_loja())
  );

drop policy if exists computadores_delete on computadores;
create policy computadores_delete on computadores
  for delete to authenticated
  using (
    operador_e_admin_da_loja(loja_id)
    or (loja_id is null and operador_atual_e_admin_de_alguma_loja())
  );

-- ===================================================================
-- 3. Registrar: qualquer operador logado, sobre o computador em que está
-- ===================================================================
-- Chamado pelo programa logo depois do login. `security definer` porque o
-- balconista precisa gravar a linha do computador dele sem poder LER a
-- tabela (a lista de computadores é assunto de admin).
--
-- O apelido e o primeiro acesso nunca são tocados aqui: o apelido é do admin,
-- e o primeiro acesso é o que diz há quanto tempo aquele computador existe.

create or replace function registrar_computador(
  p_id           uuid,
  p_nome_maquina text,
  p_versao       text,
  p_canal        text,
  p_sistema      text,
  p_loja_id      uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not exists (select 1 from operadores where id = auth.uid() and ativo) then
    raise exception 'Só um operador ativo, logado, registra o computador.'
      using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'O computador precisa de uma identidade.' using errcode = '22023';
  end if;
  if p_loja_id is not null and not operador_tem_acesso_loja(p_loja_id) then
    raise exception 'Você não tem acesso a esta loja.' using errcode = '42501';
  end if;

  insert into computadores as c
    (id, nome_maquina, versao_app, canal, sistema, loja_id, operador_id, visto_em)
  values
    (p_id,
     left(coalesce(btrim(p_nome_maquina), ''), 100),
     btrim(p_versao),
     coalesce(p_canal, 'normal'),
     left(nullif(btrim(p_sistema), ''), 200),
     p_loja_id,
     auth.uid(),
     now())
  on conflict (id) do update
    set nome_maquina = excluded.nome_maquina,
        versao_app   = excluded.versao_app,
        canal        = excluded.canal,
        sistema      = excluded.sistema,
        loja_id      = excluded.loja_id,
        operador_id  = excluded.operador_id,
        visto_em     = now();
end;
$$;

comment on function registrar_computador(uuid, text, text, text, text, uuid) is
  'Grava (ou atualiza) a linha deste computador: versão, canal, sistema, '
  'loja e quem entrou. Chamado pelo programa a cada login. Não devolve nada.';

-- ===================================================================
-- 4. Apelido: só quem enxerga o computador
-- ===================================================================

create or replace function definir_apelido_computador(p_id uuid, p_apelido text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from computadores where id = p_id;
  if not found then
    raise exception 'Computador não encontrado.' using errcode = '22023';
  end if;
  if not (operador_e_admin_da_loja(v_loja)
          or (v_loja is null and operador_atual_e_admin_de_alguma_loja())) then
    raise exception 'Só um administrador da loja dá nome aos computadores.'
      using errcode = '42501';
  end if;

  update computadores
     set apelido = left(nullif(btrim(p_apelido), ''), 60)
   where id = p_id;
end;
$$;

comment on function definir_apelido_computador(uuid, text) is
  'Dá (ou tira, com texto em branco) o apelido de um computador. Só admin da '
  'loja em que ele foi visto por último.';

-- As duas funções são `security definer`. Sem estes revokes, o Postgres dá
-- EXECUTE a PUBLIC e o Supabase dá ao `anon` — e quem não está logado
-- conseguiria ao menos chamar (a própria função recusaria, mas a porta não
-- precisa existir).
revoke all on function registrar_computador(uuid, text, text, text, text, uuid) from public, anon;
revoke all on function definir_apelido_computador(uuid, text) from public, anon;
grant execute on function registrar_computador(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function definir_apelido_computador(uuid, text) to authenticated;

-- Sem auditoria, de propósito: esta linha muda a CADA login, e a trilha
-- ficaria cheia de "atualizou computador" escondendo o que importa.

insert into schema_versao (versao) values (63) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0064_venda_balcao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0064: venda de balcão (item FN-09 do guia de melhorias).
--
-- O problema. Tudo passava por ordem de serviço, e uma OS exige cliente e
-- nasce "em andamento". Vender um pneu, uma bateria ou um par de palhetas pra
-- quem não vai deixar o carro obrigava a abrir uma OS de mentira (poluindo a
-- lista de OS e o ticket médio), lançar direto no caixa (sem baixar estoque e
-- sem NFC-e) ou não registrar.
--
-- O caminho escolhido NÃO é um módulo de PDV à parte: a venda de balcão é uma
-- ordem de serviço marcada com `tipo = 'venda_balcao'`. Assim, baixa de
-- estoque, caixa, contas a receber, NFC-e, garantia e comissão continuam
-- funcionando exatamente como já funcionam — nada disso foi reescrito. O que
-- muda é só o que a tela faz com a marca: a venda tem uma tela própria, curta,
-- e aparece separada das OS na lista e fora do ticket médio.
--
-- Duas decisões que valem saber:
--
--   • O NÚMERO é o mesmo contador das OS (o gatilho da migration 0037 não
--     muda). Uma venda pode ser a "Venda 17" entre a "OS 16" e a "OS 18".
--     A alternativa — um contador próprio — deixaria dois documentos com o
--     mesmo número na mesma loja ("OS 3" e "Venda 3"), e esse número aparece
--     sozinho em lugares que não dizem o tipo (movimentação de estoque,
--     referência de nota, conversa com a contabilidade). Número único vale
--     mais que número sem pulo.
--
--   • Cliente que não se identifica vira o cliente fixo "Consumidor" (decisão
--     dela, 26/09/2026, entre "Consumidor fixo" e "cliente opcional"). Tornar
--     `cliente_id` opcional mexeria em umas 20 telas e quebraria os
--     computadores ainda na versão anterior ao abrir uma venda sem cliente.
--     Com o Consumidor, a regra em uso não muda. O programa esconde esse
--     cliente do cadastro e das listas de escolha, e NUNCA manda documento
--     dele na NFC-e — mesmo que alguém grave um CPF nele pela API.
--
-- Rodar antes ou depois da versão nova do programa: tanto faz pra quem já
-- está usando. A versão anterior continua funcionando (só mostra a venda como
-- se fosse uma OS); a versão nova sem esta migration funciona em tudo, menos
-- em registrar uma venda de balcão (e a faixa de "banco desatualizado" avisa).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A marca: OS ou venda de balcão
-- ===================================================================

alter table ordens_servico
  add column if not exists tipo text not null default 'os';

alter table ordens_servico drop constraint if exists ck_ordens_servico_tipo;
alter table ordens_servico
  add constraint ck_ordens_servico_tipo check (tipo in ('os', 'venda_balcao'));

comment on column ordens_servico.tipo is
  '''os'' = ordem de serviço de sempre; ''venda_balcao'' = venda de peça no '
  'balcão, sem veículo, que nasce concluída e é faturada na mesma tela. As '
  'duas usam o mesmo contador de número por loja.';

-- ===================================================================
-- 2. O cliente "Consumidor"
-- ===================================================================
-- UUID fixo, no mesmo espírito da "Loja 1" (migration 0031): é assim que o
-- programa sabe qual é ele sem precisar procurar pelo nome. `clientes` é
-- compartilhada entre as lojas da empresa, então é um Consumidor só.

insert into clientes (id, nome, tipo_pessoa)
values ('00000000-0000-0000-0000-00000000c000', 'Consumidor', 'fisica')
on conflict (id) do nothing;

insert into schema_versao (versao) values (64) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0065_orcamento.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0065: o orçamento como etapa da ordem de serviço (tarefa #379).
--
-- O problema. Hoje a loja passa o preço pro cliente "de cabeça" ou abre uma
-- OS só pra mostrar o valor. Se o cliente não volta, fica uma OS de mentira
-- na lista, ocupando um número e — pior — com as peças já baixadas do
-- estoque. Não dá pra saber quantos orçamentos foram feitos nem por que
-- foram recusados.
--
-- O caminho escolhido NÃO é uma tabela de orçamentos à parte: o orçamento é
-- uma ordem de serviço num estado anterior, `status = 'orcamento'`. Quando o
-- cliente aprova, a MESMA linha vira OS (`em_andamento`), com os mesmos
-- itens; quando recusa, vira `recusado` e fica guardada pra consulta. Assim
-- o orçamento aproveita a tela, a impressão e o WhatsApp da OS, sem copiar
-- item de um lado pro outro.
--
-- Três decisões que valem saber:
--
--   • O NÚMERO DA OS só nasce na aprovação. Orçamento tem `numero` vazio e um
--     contador próprio por loja, `numero_orcamento` ("Orçamento 45"). Na
--     aprovação, o gatilho dá o PRÓXIMO número de OS, sem buraco: a "OS 17"
--     continua vindo depois da "OS 16" mesmo que dez orçamentos tenham sido
--     recusados no meio. É o contrário da venda de balcão (0064), que divide
--     o contador com a OS — lá o documento já é uma venda; aqui, um
--     orçamento recusado nunca foi documento nenhum, e um número de OS que
--     pula faz a contabilidade perguntar "cadê a OS 12?".
--
--   • A trava `ck_ordens_servico_numero_orcamento` amarra os dois: `numero`
--     vazio SE E SÓ SE for orçamento ou recusado. Daí sai de graça que uma OS
--     numerada nunca volta a ser orçamento (o número não some), e que nenhuma
--     OS fica sem número.
--
--   • Dois aprovando ao mesmo tempo, na mesma loja, não podem pegar o mesmo
--     número. O gatilho pega uma tranca por loja (`pg_advisory_xact_lock`)
--     antes de procurar o maior número, e solta no fim da transação. A
--     criação de OS comum passa pela mesma tranca — senão uma OS nova e uma
--     aprovação ainda se cruzariam. Antes, quem se cruzava levava erro do
--     índice único; agora espera a vez.
--
-- O estoque NÃO é assunto do banco aqui: quem deixa de baixar peça no
-- orçamento e baixa só na aprovação é o programa (src/lib/ordensServico.ts).
--
-- ⚠️ ORDEM AO SUBIR. A versão anterior do programa não conhece orçamento:
-- ela continua criando OS normalmente com esta migration rodada (o padrão
-- do status não muda), mas se abrir um orçamento criado pela versão nova
-- mostra "OS null" e, ao lançar peça nele, baixa estoque. Por isso a linha
-- abaixo faz o botão "Atualizar o banco de todas as empresas" esperar os
-- computadores chegarem na versão que conhece orçamento.
-- versao-minima-do-programa: 0.9.52
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. Os dois estados novos
-- ===================================================================
-- O padrão continua 'em_andamento': quem não diz o status (a versão
-- anterior) continua criando OS.

alter table ordens_servico drop constraint if exists ordens_servico_status_check;
alter table ordens_servico add constraint ordens_servico_status_check
  check (status in ('orcamento', 'em_andamento', 'concluida', 'faturada', 'recusado'));

alter table ordens_servico alter column status set default 'em_andamento';

-- ===================================================================
-- 2. O número da OS pode ficar vazio (só no orçamento)
-- ===================================================================

alter table ordens_servico alter column numero drop not null;

-- ===================================================================
-- 3. As colunas do orçamento (todas opcionais: a OS de sempre não usa)
-- ===================================================================

alter table ordens_servico add column if not exists numero_orcamento integer;
alter table ordens_servico add column if not exists validade date;
alter table ordens_servico add column if not exists aprovado_por text;
alter table ordens_servico add column if not exists aprovado_em timestamptz;
alter table ordens_servico add column if not exists motivo_recusa text;
alter table ordens_servico add column if not exists recusado_em timestamptz;
alter table ordens_servico add column if not exists orcado_em timestamptz;

comment on column ordens_servico.numero is
  'Número da OS, sequencial por loja. Vazio só enquanto a linha é orçamento '
  '(ou foi recusada): nasce na aprovação, com o próximo número, sem buraco.';
comment on column ordens_servico.numero_orcamento is
  'Número do orçamento, sequencial por loja e separado do número da OS. '
  'Continua na linha depois da aprovação ("Orçamento 45 virou a OS 17").';
comment on column ordens_servico.validade is
  'Até quando o preço do orçamento vale. Quem preenche é o programa (padrão: '
  'hoje + 7 dias). Vencido não tranca nada: só avisa na aprovação.';
comment on column ordens_servico.aprovado_por is
  'Quem aprovou o orçamento, em texto livre (ex.: "o próprio cliente, pelo telefone").';
comment on column ordens_servico.orcado_em is
  'Quando o orçamento foi feito. Só na OS que nasceu de orçamento: na aprovação, '
  'o gatilho guarda aqui a data_abertura antiga e põe a da aprovação em data_abertura.';
comment on column ordens_servico.motivo_recusa is
  'Por que o orçamento foi recusado (opcional): preco, prazo, outro_lugar, desistiu ou outro.';

-- ===================================================================
-- 4. As travas
-- ===================================================================
-- Todas soltas e recriadas, pelo item 12 da §6: rodar de novo não pode
-- tropeçar no nome que já existe.

-- numero vazio SE E SÓ SE for orçamento ou recusado.
alter table ordens_servico drop constraint if exists ck_ordens_servico_numero_orcamento;
alter table ordens_servico add constraint ck_ordens_servico_numero_orcamento
  check ((numero is null) = (status in ('orcamento', 'recusado')));

-- todo orçamento tem o número dele.
alter table ordens_servico drop constraint if exists ck_ordens_servico_numero_orcamento_obrigatorio;
alter table ordens_servico add constraint ck_ordens_servico_numero_orcamento_obrigatorio
  check (status not in ('orcamento', 'recusado') or numero_orcamento is not null);

-- motivo da recusa só da lista (a tela mostra Preço, Prazo, Foi em outro
-- lugar, Desistiu, Outro) — ou nenhum.
alter table ordens_servico drop constraint if exists ck_ordens_servico_motivo_recusa;
alter table ordens_servico add constraint ck_ordens_servico_motivo_recusa
  check (motivo_recusa is null or motivo_recusa in ('preco', 'prazo', 'outro_lugar', 'desistiu', 'outro'));

-- dois orçamentos com o mesmo número na mesma loja, nunca. (Linha sem
-- numero_orcamento — a OS de sempre — não conta: vazio não repete vazio.)
create unique index if not exists ordens_servico_loja_numero_orcamento_unique
  on ordens_servico (loja_id, numero_orcamento);

-- ===================================================================
-- 5. O gatilho dos números (substitui o da migration 0037)
-- ===================================================================
-- Três casos:
--   a) nasce orçamento (ou já recusado): ganha o próximo `numero_orcamento`
--      da loja; o `numero` fica vazio — e se vier preenchido, a trava do
--      passo 4 recusa, em vez de o gatilho apagar calado.
--   b) nasce OS ou venda de balcão: como sempre, o próximo `numero`.
--   c) um orçamento passa a ser OS: ganha o próximo `numero` ali, na
--      aprovação, e a data da aprovação vira a `data_abertura` (a do
--      orçamento vai pra `orcado_em`). Só nesse caso o gatilho mexe num
--      update — apagar o número de uma OS que já tem continua sendo recusado
--      pela trava (um CHECK, que vale em todo update).
--
-- No update, o gatilho só roda quando o comando mexe no `status` (`update of
-- status`): é o único caso em que ele tem o que fazer.
--
-- E uma trava de caminho, `ck_ordens_servico_transicao_orcamento`: saindo
-- de orçamento, só pra em_andamento (aprovado) ou recusado; recusado não
-- sai mais. Sem ela, um recusado virava OS numerada sem baixar estoque, e
-- um orçamento ia direto pra concluída/faturada. Um CHECK não enxerga o
-- status de antes, então quem confere é o gatilho — com a mesma mensagem
-- de um CHECK de verdade, pra tela traduzir pelo nome (src/lib/errors.ts).

create or replace function definir_numero_ordem_servico()
returns trigger
language plpgsql
as $$
declare
  eh_orcamento boolean := new.status in ('orcamento', 'recusado');
begin
  if tg_op = 'INSERT' then
    if eh_orcamento then
      if new.numero_orcamento is null then
        perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
        select coalesce(max(numero_orcamento), 0) + 1 into new.numero_orcamento
        from ordens_servico
        where loja_id = new.loja_id;
      end if;
    elsif new.numero is null then
      perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
      select coalesce(max(numero), 0) + 1 into new.numero
      from ordens_servico
      where loja_id = new.loja_id;
    end if;
  elsif (old.status = 'orcamento' and new.status not in ('orcamento', 'em_andamento', 'recusado'))
     or (old.status = 'recusado' and new.status <> 'recusado') then
    raise exception using
      errcode    = 'check_violation',
      message    = 'new row for relation "ordens_servico" violates check constraint "ck_ordens_servico_transicao_orcamento"',
      detail     = format('Orçamento só vira OS (em_andamento) ou recusado, e recusado não muda mais. Pedido: de %s pra %s.',
                          old.status, new.status),
      table      = 'ordens_servico',
      constraint = 'ck_ordens_servico_transicao_orcamento';
  elsif old.status = 'orcamento' and new.status = 'em_andamento' then
    -- Aprovado: a OS começa hoje. A Lucratividade, o Início ("aberta há 20
    -- dias"), a lista de OS e a ficha do veículo contam pela data_abertura;
    -- com a data do orçamento, uma OS aprovada hoje caía no mês passado. A
    -- data do orçamento não se perde: fica em orcado_em.
    new.orcado_em := old.data_abertura;
    new.data_abertura := now();
    if new.numero is null then
      perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
      select coalesce(max(numero), 0) + 1 into new.numero
      from ordens_servico
      where loja_id = new.loja_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_definir_numero_ordem_servico on ordens_servico;
create trigger trigger_definir_numero_ordem_servico
  before insert or update of status on ordens_servico
  for each row
  execute function definir_numero_ordem_servico();

insert into schema_versao (versao) values (65) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0066_peca_avulsa.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0066: peça avulsa no orçamento, com o custo na própria linha
-- (tarefa #655).
--
-- O problema. No orçamento (0065) a loja muitas vezes ainda não tem a peça
-- cadastrada: vai pedir ao fornecedor só se o cliente aprovar. Cadastrar a
-- peça inteira (com dado fiscal) só pra passar um preço é trabalho jogado
-- fora quando o cliente recusa. Então a peça pode ser digitada SEM cadastro:
-- um item `tipo = 'peca'` com `peca_id` vazio. Isso o banco já aceita desde a
-- 0005 (`peca_id` sempre foi opcional) — não muda nada aqui.
--
-- O que faltava é o CUSTO dessa peça. A peça cadastrada tem o custo dela em
-- `pecas.preco_custo`, e é de lá que a Lucratividade e as comissões tiram.
-- A peça avulsa não tem cadastro, então o custo (se a loja souber) vai na
-- própria linha: a coluna nova `ordens_servico_itens.custo_unitario`.
--
-- Duas decisões que valem saber:
--
--   • VAZIO NÃO É ZERO. `custo_unitario` nulo quer dizer "custo não
--     informado", e por isso a coluna NÃO tem padrão 0. Um zero de mentira
--     faria a peça avulsa aparecer com 100% de lucro na Lucratividade. Zero
--     de verdade (peça que a loja ganhou) continua podendo ser digitado.
--
--   • SÓ UMA TRAVA: custo negativo, nunca (`ck_ordens_servico_itens_custo`,
--     mesmo espírito das travas da 0060). A coluna é nova e nasce vazia em
--     toda linha, então nenhuma loja tem dado que a viole — dá pra criar
--     direto, sem a conferência "só crie se o dado deixar" da 0060.
--
--     E uma trava que ficou de fora, de propósito: "item de serviço não tem
--     `peca_id`". Parece óbvia, mas o formulário da OS manda o `peca_id` da
--     linha sem olhar o tipo (src/schemas/ordemServico.ts, paraItensValidos),
--     então pode existir, num banco de loja, serviço com `peca_id` preenchido
--     — e nenhuma consulta daqui alcança esses bancos pra conferir. Na dúvida,
--     não tranca (docs/licoes.md, item 33: validação incerta é aviso, nunca
--     tranca). Pelo mesmo motivo, o custo na linha também não é proibido em
--     peça cadastrada ou em serviço: quem decide onde ele vale é o programa.
--
-- RLS: nada muda. A coluna é de uma tabela que já tem as policies dela (por
-- linha, herdadas da OS), e uma coluna nova não abre nem fecha linha nenhuma
-- — por isso esta migration não entra na matriz de RLS.
--
-- ORDEM AO SUBIR: a de sempre (migration primeiro), e SEM versão mínima do
-- programa. A versão anterior não conhece a coluna e simplesmente a ignora
-- (lê e grava os itens como sempre). A versão nova só manda a chave
-- `custo_unitario` em peça avulsa — então, se esta migration ainda não tiver
-- rodado, só lançar peça avulsa no orçamento dá erro; o resto funciona.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A coluna do custo da peça avulsa (vazia = não informado)
-- ===================================================================

alter table ordens_servico_itens add column if not exists custo_unitario numeric(12, 2);

comment on column ordens_servico_itens.custo_unitario is
  'Custo por unidade digitado na linha da peça avulsa (sem cadastro). Vazio = '
  'custo não informado (nunca vira zero sozinho). O custo da peça cadastrada '
  'continua vindo de pecas.preco_custo.';

-- ===================================================================
-- 2. A trava: custo negativo, nunca
-- ===================================================================
-- Solta e recriada, pelo item 12 da §6: rodar de novo não pode tropeçar no
-- nome que já existe. O nome segue `ck_<tabela>_<regra>` porque a tela
-- traduz cada trava numa frase em português (src/lib/errors.ts).

alter table ordens_servico_itens drop constraint if exists ck_ordens_servico_itens_custo;
alter table ordens_servico_itens add constraint ck_ordens_servico_itens_custo
  check (custo_unitario is null or custo_unitario >= 0);

insert into schema_versao (versao) values (66) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0067_juntar_pecas.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0067: juntar duas peças repetidas numa só (tarefa #656).
--
-- O PROBLEMA. O cadastro de peças é um só pra empresa inteira, e nada impede
-- a mesma peça de nascer duas vezes ("Pneu 175/70 R13" digitado à mão e o
-- mesmo pneu vindo de uma nota importada, com outro nome). Aí o estoque se
-- divide em dois: metade dos movimentos numa peça, metade na outra, e nenhuma
-- das duas mostra o saldo de verdade. Apagar a repetida não resolve — o
-- histórico dela (movimentos, contagens) iria junto, calado, pelo CASCADE.
--
-- O QUE ESTA MIGRATION CRIA: duas funções que o programa chama.
--
--   • resumo_peca_para_juntar(peça) — a PRÉVIA. Antes de confirmar, a tela
--     mostra o que cada peça carrega: quantos movimentos, itens de OS,
--     contagens, itens de pedido de compra e cotações, e o saldo em cada loja.
--     Se a peça aparece numa loja que quem pergunta não administra, a
--     resposta é só "tem N loja(s) que você não administra", sem número
--     nenhum — pra não mostrar o estoque de uma loja a quem não é de lá.
--
--   • juntar_pecas(fica, sai, campos) — a JUNÇÃO. Tudo que apontava pra peça
--     que sai passa a apontar pra peça que fica, a peça que fica pode herdar
--     alguns campos da que sai (os que a pessoa escolher na tela, de uma lista
--     fechada), e a peça que sai é apagada. O saldo fica certo sozinho, porque
--     o estoque é a soma dos movimentos (src/lib/estoque.ts) e os movimentos
--     das duas agora são de uma peça só.
--
-- CINCO DECISÕES QUE VALEM SABER ANTES DE MEXER AQUI:
--
-- 1. TUDO OU NADA. A função inteira é uma transação só: qualquer erro no meio
--    (inclusive um dos `raise` daqui) desfaz tudo o que ela já tinha feito.
--    Nunca sobra metade dos movimentos de um lado e metade do outro.
--
-- 2. SÓ ADMINISTRADOR, E DE TODAS AS LOJAS ONDE QUALQUER DAS DUAS APARECE.
--    Juntar mexe no histórico de estoque de cada loja onde a peça que sai tem
--    movimento, contagem, OS ou pedido, e muda o cadastro da peça que fica,
--    que as lojas dela usam. Quem não administra uma dessas lojas é recusado,
--    com a mensagem dizendo isso, e nada muda. As funções são `security
--    definer` (atravessam a RLS, porque precisam alcançar o histórico inteiro
--    da peça) — por isso a checagem de quem pode é feita aqui dentro, à mão,
--    e o `revoke` lá embaixo tira o acesso de quem não está logado.
--
-- 3. A REDE DE SEGURANÇA. Antes de apagar a peça que sai, a função pergunta ao
--    próprio banco quais tabelas apontam pra `pecas` (pg_constraint) e confere
--    que NENHUMA ainda tem linha da peça que sai. Hoje são cinco, e as cinco
--    são repostas aqui. Mas se um dia nascer uma sexta tabela e ninguém
--    lembrar de pôr ela nesta função, a junção falha INTEIRA, dizendo o nome
--    da tabela — em vez de o CASCADE apagar o histórico dela sem ninguém ver,
--    ou de a junção dar um erro de chave que ninguém entende.
--
-- 4. A AUDITORIA DA JUNÇÃO. O trigger da trilha de auditoria (0053) já
--    registra sozinho, com quem e quando: a peça que sai INTEIRA (ação
--    "excluir"), a peça que fica antes e depois (ação "atualizar" — por isso
--    ela é atualizada SEMPRE, mesmo sem campo escolhido) e cada item de OS que
--    trocou de peça. Só que movimentos, contagens, itens de pedido e cotações
--    não têm trigger de auditoria: depois da junção, nada diria quais linhas
--    eram da peça que sumiu. Por isso a função grava À MÃO mais uma linha
--    ("atualizar" na peça que fica) com tudo o que precisa pra entender — e,
--    se preciso, desfazer à mão — a junção: a peça que saiu inteira, a prévia
--    das duas, os campos trazidos e os ids de cada linha que era da que saiu
--    (pegos ANTES de repor). Ela se reconhece por `"juntada": true` em
--    dados_antes.
--
-- 5. PRÉVIA VELHA NÃO PASSA. A tela mostra a prévia, a pessoa pensa, e só
--    então confirma; nesse meio-tempo outro computador pode ter lançado um
--    movimento. Se o programa mandar a prévia que mostrou (`p_esperado`), a
--    função confere, já com as duas peças travadas, se os números ainda são
--    aqueles e se os campos das duas peças (preço, descrição...) ainda são os
--    que a pessoa comparou — e recusa se não forem, em vez de juntar uma coisa
--    diferente da que a pessoa viu.
--
-- Só acrescenta (duas funções novas): o programa de antes continua igual.
-- Idempotente: seguro rodar de novo.

drop function if exists juntar_pecas(uuid, uuid, text[]);
drop function if exists juntar_pecas(uuid, uuid, text[], jsonb);
drop function if exists resumo_peca_para_juntar(uuid);

-- ---------------------------------------------------------------------------
-- 1. A prévia
-- ---------------------------------------------------------------------------
-- Devolve:
--   {"lojas_sem_acesso": n}                     quando n > 0 (sem mais nada), ou
--   {"lojas_sem_acesso": 0, "movimentos": .., "itens_os": .., "os": ..,
--    "contagens": .., "itens_compra": .., "compras": .., "cotacoes": ..,
--    "estoque": [{"loja_id": .., "loja_nome": .., "saldo": ..}, ...]}
-- `estoque` tem uma linha por loja com movimento da peça, em ordem de nome.
-- O saldo é a mesma conta de calcularSaldoPorPeca (src/lib/estoque.ts):
-- entrada soma, qualquer outro tipo (saída) subtrai.

create or replace function resumo_peca_para_juntar(p_peca uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sem_acesso int;
  v_estoque jsonb;
begin
  if not operador_atual_e_admin() then
    raise exception 'Só um administrador pode juntar peças.';
  end if;

  -- As lojas onde a peça aparece, por qualquer caminho. Loja nula (não
  -- deveria existir) conta como "sem acesso": na dúvida, não mostra.
  select count(*) filter (where loja_id is null or not operador_e_admin_da_loja(loja_id))
    into v_sem_acesso
  from (
    select loja_id from estoque_movimentos where peca_id = p_peca
    union
    select loja_id from contagens_estoque where peca_id = p_peca
    union
    select os.loja_id
      from ordens_servico_itens i
      join ordens_servico os on os.id = i.ordem_servico_id
     where i.peca_id = p_peca
    union
    select pc.loja_id
      from pedidos_compra_itens i
      join pedidos_compra pc on pc.id = i.pedido_compra_id
     where i.peca_id = p_peca
  ) lojas_da_peca;

  if v_sem_acesso > 0 then
    return jsonb_build_object('lojas_sem_acesso', v_sem_acesso);
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object('loja_id', s.loja_id, 'loja_nome', l.nome, 'saldo', s.saldo)
             order by l.nome, s.loja_id
           ),
           '[]'::jsonb
         )
    into v_estoque
  from (
    select loja_id,
           sum(case when tipo = 'entrada' then quantidade else -quantidade end) as saldo
      from estoque_movimentos
     where peca_id = p_peca
     group by loja_id
  ) s
  left join lojas l on l.id = s.loja_id;

  return jsonb_build_object(
    'lojas_sem_acesso', 0,
    'movimentos',   (select count(*) from estoque_movimentos where peca_id = p_peca),
    'itens_os',     (select count(*) from ordens_servico_itens where peca_id = p_peca),
    'os',           (select count(distinct ordem_servico_id) from ordens_servico_itens where peca_id = p_peca),
    'contagens',    (select count(*) from contagens_estoque where peca_id = p_peca),
    'itens_compra', (select count(*) from pedidos_compra_itens where peca_id = p_peca),
    'compras',      (select count(distinct pedido_compra_id) from pedidos_compra_itens where peca_id = p_peca),
    'cotacoes',     (select count(*) from cotacoes_pecas where peca_id = p_peca),
    'estoque',      v_estoque
  );
end;
$$;

comment on function resumo_peca_para_juntar(uuid) is
  '#656. Prévia de juntar peças: o que a peça carrega (movimentos, itens de OS, '
  'contagens, itens de compra, cotações e saldo por loja). Só admin; se a peça '
  'aparece em loja que ele não administra, devolve só {"lojas_sem_acesso": n}.';

-- ---------------------------------------------------------------------------
-- 2. A junção
-- ---------------------------------------------------------------------------
-- Devolve a prévia da peça que ficou (resumo_peca_para_juntar(p_fica)), pra
-- tela mostrar o resultado.
--
-- `p_esperado` (opcional): a prévia que a tela mostrou, no formato
--   {"fica": <resumo_peca_para_juntar(p_fica)> + {"peca": <a peça como a tela viu>},
--    "sai":  <resumo_peca_para_juntar(p_sai)>  + {"peca": <a peça como a tela viu>}}
-- Se vier, são conferidos movimentos, itens_os, contagens, itens_compra,
-- cotacoes e o saldo de cada loja (por loja_id, como número: 6 e "6.00" são
-- iguais), e cada campo que pode ser trazido (v_permitidos) das duas peças.
-- Qualquer diferença, ou `peca` faltando, recusa a junção. Nulo: não confere
-- (o caminho de quem chama sem prévia, como o SQL Editor).

create or replace function juntar_pecas(
  p_fica uuid,
  p_sai uuid,
  p_campos_da_que_sai text[] default '{}',
  p_esperado jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Os campos que a peça que fica pode herdar da que sai. Fica de fora o que
  -- não é "dado da peça": id, criado_em e ativo (ativo tem regra própria:
  -- se qualquer uma das duas estava ativa, a que fica fica ativa).
  v_permitidos constant text[] := array[
    'codigo_interno', 'codigo_barras', 'descricao', 'marca', 'modelo',
    'aplicacao', 'unidade', 'preco_custo', 'preco_venda', 'ncm', 'cest',
    'cfop_padrao', 'origem', 'cst_ou_csosn', 'aliquota_icms', 'categoria_id',
    'prazo_garantia_dias', 'estoque_minimo', 'medida',
    'indice_carga_velocidade', 'dot'
  ];
  v_campo text;
  v_copias text := '';
  v_achadas int;
  v_resumo_sai jsonb;
  v_resumo_fica jsonb;
  v_ref record;
  v_resta boolean;
  v_lado text;
  v_atual jsonb;
  v_previa jsonb;
  v_mudou boolean;
  v_peca_vista jsonb;
  v_peca_agora jsonb;
  v_campos jsonb;
  v_ids jsonb;
  v_peca_sai jsonb;
begin
  if not operador_atual_e_admin() then
    raise exception 'Só um administrador pode juntar peças.';
  end if;

  if p_fica is null or p_sai is null then
    raise exception 'Escolha as duas peças: a que fica e a que vai sumir.';
  end if;

  if p_fica = p_sai then
    raise exception 'Escolha duas peças diferentes: não dá pra juntar uma peça com ela mesma.';
  end if;

  -- Lista fechada: o nome do campo vira pedaço de SQL logo abaixo, então
  -- nada fora desta lista passa. `distinct` porque o mesmo campo duas vezes
  -- daria erro no update.
  for v_campo in
    select distinct c from unnest(coalesce(p_campos_da_que_sai, '{}'::text[])) as c
  loop
    if v_campo is null or not (v_campo = any (v_permitidos)) then
      raise exception 'O campo "%" não pode ser trazido da peça que vai sumir.', coalesce(v_campo, '(vazio)');
    end if;
    v_copias := v_copias || format('%I = s.%I, ', v_campo, v_campo);
  end loop;
  v_campos := to_jsonb(array(
    select distinct c from unnest(coalesce(p_campos_da_que_sai, '{}'::text[])) as c order by 1
  ));

  -- Trava as duas peças até o fim (ninguém edita nem junta elas ao mesmo
  -- tempo). Em ordem de id, pra duas junções cruzadas não se travarem.
  perform 1 from pecas where id in (p_fica, p_sai) order by id for update;

  select count(*) into v_achadas from pecas where id in (p_fica, p_sai);
  if v_achadas <> 2 then
    raise exception 'Uma das peças não existe mais (pode ter sido apagada ou já juntada). Recarregue a tela e tente de novo.';
  end if;

  -- A peça que sai leva o histórico de cada loja onde aparece: quem não
  -- administra alguma delas não junta. (A mesma conta da prévia.)
  v_resumo_sai := resumo_peca_para_juntar(p_sai);
  if (v_resumo_sai ->> 'lojas_sem_acesso')::int > 0 then
    raise exception 'A peça que vai sumir tem histórico em % loja(s) que você não administra. Só quem administra todas essas lojas pode juntar estas peças.',
      (v_resumo_sai ->> 'lojas_sem_acesso')::int;
  end if;

  -- E a que fica também: o cadastro dela muda (campos escolhidos), e ela é a
  -- mesma peça que as outras lojas dela usam.
  v_resumo_fica := resumo_peca_para_juntar(p_fica);
  if (v_resumo_fica ->> 'lojas_sem_acesso')::int > 0 then
    raise exception 'A peça que fica tem histórico em % loja(s) que você não administra. Só quem administra todas essas lojas pode juntar estas peças.',
      (v_resumo_fica ->> 'lojas_sem_acesso')::int;
  end if;

  -- A prévia que a tela mostrou ainda vale? (decisão 5 do cabeçalho)
  if p_esperado is not null then
    foreach v_lado in array array['fica', 'sai'] loop
      v_atual := case v_lado when 'fica' then v_resumo_fica else v_resumo_sai end;
      v_previa := p_esperado -> v_lado;
      begin
        select exists (
                 select 1
                   from unnest(array['movimentos', 'itens_os', 'contagens', 'itens_compra', 'cotacoes']) as k
                  where (v_previa ->> k)::numeric is distinct from (v_atual ->> k)::numeric
               )
            or exists (
                 select 1
                   from (select e ->> 'loja_id' as loja, (e ->> 'saldo')::numeric as saldo
                           from jsonb_array_elements(coalesce(v_previa -> 'estoque', '[]'::jsonb)) e) p
                   full join
                        (select e ->> 'loja_id' as loja, (e ->> 'saldo')::numeric as saldo
                           from jsonb_array_elements(v_atual -> 'estoque') e) a
                     on a.loja = p.loja
                  where p.saldo is distinct from a.saldo
               )
          into v_mudou;
      exception when others then
        -- prévia num formato que não dá pra ler (número torto, estoque que
        -- não é lista): não dá pra garantir que é a mesma, então não junta.
        v_mudou := true;
      end;
      if v_mudou then
        raise exception 'Os números das peças mudaram desde a prévia (alguém mexeu nelas agora há pouco). Confira a prévia de novo antes de juntar.';
      end if;

      -- E os campos que a tela mostrou pra escolher (`peca`): o update logo
      -- abaixo copia o valor de AGORA da peça que sai, então, se alguém mudou
      -- o preço de 250 pra 280 com a tela aberta, a pessoa escolheria
      -- "R$ 250,00" e ficaria gravado 280. Campo que hoje é número compara
      -- como número (250 e "250.00" são iguais); o resto, como texto ("0012"
      -- não é "12"). Sem `peca` na prévia, não dá pra garantir: recusa.
      v_peca_vista := v_previa -> 'peca';
      select to_jsonb(p) into v_peca_agora from pecas p
       where p.id = case v_lado when 'fica' then p_fica else p_sai end;
      begin
        v_mudou := v_peca_vista is null
          or jsonb_typeof(v_peca_vista) <> 'object'
          or exists (
               select 1
                 from unnest(v_permitidos) as k
                where case jsonb_typeof(v_peca_agora -> k)
                        when 'number' then (v_peca_vista ->> k)::numeric is distinct from (v_peca_agora ->> k)::numeric
                        else (v_peca_vista ->> k) is distinct from (v_peca_agora ->> k)
                      end
             );
      exception when others then
        v_mudou := true;
      end;
      if v_mudou then
        raise exception 'Os dados das peças mudaram desde a prévia (alguém mexeu nelas agora há pouco). Confira a prévia de novo antes de juntar.';
      end if;
    end loop;
  end if;

  -- O que era da peça que sai, guardado ANTES de repor (decisão 4).
  select to_jsonb(p) into v_peca_sai from pecas p where p.id = p_sai;
  v_ids := jsonb_build_object(
    'ids_movimentos',   (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from estoque_movimentos   where peca_id = p_sai),
    'ids_itens_os',     (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from ordens_servico_itens where peca_id = p_sai),
    'ids_itens_compra', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from pedidos_compra_itens where peca_id = p_sai),
    'ids_cotacoes',     (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from cotacoes_pecas       where peca_id = p_sai),
    'ids_contagens',    (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from contagens_estoque    where peca_id = p_sai)
  );

  -- A peça que fica: os campos escolhidos vêm da que sai, e ativo é "ou".
  -- Atualizada sempre, mesmo sem campo escolhido, pra trilha de auditoria
  -- guardar como ela estava antes e depois da junção.
  execute format(
    'update pecas f set %s ativo = (f.ativo or s.ativo) from pecas s where f.id = $1 and s.id = $2',
    v_copias
  ) using p_fica, p_sai;

  -- Tudo que apontava pra peça que sai passa a apontar pra que fica.
  update estoque_movimentos   set peca_id = p_fica where peca_id = p_sai;
  update contagens_estoque    set peca_id = p_fica where peca_id = p_sai;
  update ordens_servico_itens set peca_id = p_fica where peca_id = p_sai;
  update pedidos_compra_itens set peca_id = p_fica where peca_id = p_sai;
  update cotacoes_pecas       set peca_id = p_fica where peca_id = p_sai;

  -- A rede de segurança (decisão 3 do cabeçalho): pergunta ao banco TODAS as
  -- tabelas que apontam pra `pecas`, não só as cinco acima.
  for v_ref in
    select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'pecas'::regclass
       and array_length(c.conkey, 1) = 1
  loop
    execute format('select exists (select 1 from %s where %I = $1)', v_ref.tabela, v_ref.coluna)
      into v_resta using p_sai;
    if v_resta then
      raise exception 'A tabela "%" ainda tem registro da peça que vai sumir, e esta função não sabe mexer nela. Nada foi alterado. (Avise o suporte: a tabela precisa entrar em juntar_pecas.)',
        v_ref.tabela;
    end if;
  end loop;

  -- A linha da junção na trilha de auditoria (decisão 4 do cabeçalho).
  insert into auditoria
    (tabela, registro_id, acao, operador_id, operador_nome, dados_antes, dados_depois)
  values (
    'pecas',
    p_fica,
    'atualizar',
    auth.uid(),
    (select nome from operadores where id = auth.uid()),
    jsonb_build_object(
      'juntada', true,
      'peca_que_saiu', v_peca_sai,
      'resumo_fica', v_resumo_fica,
      'resumo_sai', v_resumo_sai,
      'campos_da_que_sai', v_campos
    ) || v_ids,
    (select to_jsonb(p) from pecas p where p.id = p_fica)
  );

  delete from pecas where id = p_sai;

  return resumo_peca_para_juntar(p_fica);
end;
$$;

comment on function juntar_pecas(uuid, uuid, text[], jsonb) is
  '#656. Junta a peça p_sai na p_fica: repõe peca_id em todo o histórico, copia '
  'os campos escolhidos (lista fechada), ativo = fica ou sai, grava a junção na '
  'auditoria (com os ids do que era de p_sai) e apaga p_sai. Tudo ou nada; só '
  'admin de todas as lojas onde as duas aparecem; recusa se p_esperado (a prévia '
  'que a tela mostrou) não bate mais, ou se sobrar qualquer tabela apontando pra '
  'p_sai. Devolve resumo_peca_para_juntar(p_fica).';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC (e o Supabase ao
-- `anon`) deixaria quem não está logado ao menos chamar. Só quem está logado.
revoke all on function resumo_peca_para_juntar(uuid) from public, anon;
revoke all on function juntar_pecas(uuid, uuid, text[], jsonb) from public, anon;
grant execute on function resumo_peca_para_juntar(uuid) to authenticated;
grant execute on function juntar_pecas(uuid, uuid, text[], jsonb) to authenticated;

insert into schema_versao (versao) values (67) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0068_clientes_janela.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0068: a JANELA de Clientes e Veículos — primeira metade do lote 4
-- da etapa 2 do TR-04.1 (tarefa #365). Os lotes anteriores: RH (0056), contas
-- (0061) e Caixa (0062). A segunda metade, que FECHA as tabelas, é a 0069.
--
-- POR QUE EM DUAS. Esta só ACRESCENTA (duas views e quatro funções) e não
-- muda nada pra versão atual do programa. A versão nova passa a ler por elas
-- — pra todo mundo, inclusive quem tem o módulo —, então ela precisa desta
-- migration já aplicada; e a 0069, que fecha a porta, precisa da versão nova
-- já nos computadores. Numa só, uma das duas ordens quebrava as lojas
-- (achado da revisão final). Ordem: 0068 → publicar e liberar a versão → 0069.
--
-- O PROBLEMA. Quem não tem o módulo Clientes não vê a tela, mas a RLS só
-- exigia login (0015). Com a chave que está no computador, dava pra pedir
-- pela API o cadastro inteiro (telefone, CPF, endereço, aniversário) — e o de
-- TODAS as lojas da empresa, porque `clientes` e `veiculos` são
-- compartilhados (0032).
--
-- O QUE NÃO PODE QUEBRAR JUNTO (decisões da Sofia, 22/10/2026, na issue):
--
--   • A JANELA ESTREITA. Sem Clientes, a pessoa vê só o NOME do cliente e
--     PLACA, MARCA, MODELO, COR e TIPO do veículo — o que a lista de OS, o
--     Caixa, Contas a Receber, Garantias e Notas mostram. São as duas views
--     `clientes_janela` e `veiculos_janela`. Os `join` embutidos do programa
--     (`cliente:clientes_janela(nome)`) passam a apontar pra elas: `join` em
--     tabela fechada não dá erro, devolve `null` calado (§6 item 69), e o
--     nome do cliente sumiria da tela de quem não tem o módulo.
--
--   • ABRIR OS E ORÇAMENTO. Quem tem OS escolhe o cliente e o veículo pela
--     janela, e continua cadastrando cliente e carro novos pelo cadastro
--     rápido — `cadastrar_cliente_rapido()` e `cadastrar_veiculo_rapido()`.
--     Funções, e não uma porta de INSERT na tabela, porque o programa precisa
--     do id de volta, e um insert com `returning` exige também a policy de
--     LEITURA (lição da 0058). Elas aceitam só os campos do cadastro rápido;
--     ficha completa, editar e apagar continuam só do módulo.
--
--   • A NOTA FISCAL (e a garantia impressa). Na hora de emitir, o programa
--     precisa do CPF/CNPJ e do endereço do cliente DAQUELA OS.
--     `cliente_e_veiculo_da_ordem()` entrega o cadastro do cliente e do
--     veículo de UMA OS, pra quem tem acesso à loja dela e o módulo OS (ou
--     Clientes). Nunca uma lista.
--
--   • O CLIENTE "CONSUMIDOR" (0064) continua visível pra todos: é nele que a
--     venda de balcão nasce.
--
--   • O INÍCIO. Os aniversários do calendário vêm do cadastro completo; quem
--     não tem Clientes não pede (é do lado do programa, como na 0061).
--
-- POR QUE AS VIEWS RODAM COM OS DIREITOS DO DONO (security_invoker = false):
-- medido na 0056 — com a base fechada, a view `security_invoker = true`
-- devolve ZERO linhas. A consequência é a regra de sempre (§6 item 69): o
-- filtro de quem pode ler tem que estar escrito DENTRO dela, e o `revoke` lá
-- embaixo tira a escrita (view simples é auto-atualizável). Como clientes não
-- têm loja (são da empresa inteira), o filtro é "operador ativo e com alguma
-- loja" — o mesmo alcance que a tabela tinha antes, menos o órfão (§6 item 23).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A janela estreita: duas views, só leitura
-- ===================================================================

-- Quem pode olhar pela janela: operador ativo, com acesso a alguma loja. O
-- `exists` não depende da linha, então o Postgres o avalia uma vez por
-- consulta (InitPlan), não uma vez por cliente.
create or replace function operador_ativo_com_loja()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from operadores o
      join operador_lojas ol on ol.operador_id = o.id
     where o.id = auth.uid()
       and o.ativo = true
  );
$$;

comment on function operador_ativo_com_loja() is
  'TR-04.1 lote 4 (0068). Verdadeiro se quem está logado é operador ativo com '
  'acesso a pelo menos uma loja. É o filtro das views clientes_janela e '
  'veiculos_janela, que rodam com os direitos do dono e não reagem à RLS.';

revoke all on function operador_ativo_com_loja() from public, anon;
grant execute on function operador_ativo_com_loja() to authenticated;

drop view if exists clientes_janela;

create view clientes_janela
with (security_invoker = false, security_barrier = true)
as
  select c.id,
         c.nome
    from clientes c
   where (select operador_ativo_com_loja());

comment on view clientes_janela is
  'TR-04.1 lote 4 (0068). A parte de `clientes` que quem não tem o módulo '
  'Clientes pode ver: só o nome. Roda com os direitos do dono, então NÃO '
  'reage à RLS da tabela — é o where daqui que barra quem não é operador. '
  'Só SELECT é concedido: sem o revoke abaixo daria pra escrever na tabela '
  'por dentro dela. Nunca acrescentar telefone, CPF, endereço ou aniversário.';

revoke all on clientes_janela from anon, authenticated;
grant select on clientes_janela to authenticated;

drop view if exists veiculos_janela;

create view veiculos_janela
with (security_invoker = false, security_barrier = true)
as
  select v.id,
         v.cliente_id,
         v.placa,
         v.marca,
         v.modelo,
         v.cor,
         v.tipo
    from veiculos v
   where (select operador_ativo_com_loja());

comment on view veiculos_janela is
  'TR-04.1 lote 4 (0068). A parte de `veiculos` que quem não tem o módulo '
  'Clientes pode ver: placa, marca, modelo, cor e tipo. Mesmas regras da '
  'clientes_janela (direitos do dono, filtro aqui dentro, só SELECT).';

revoke all on veiculos_janela from anon, authenticated;
grant select on veiculos_janela to authenticated;

-- ===================================================================
-- 2. O cadastro rápido da OS, do Orçamento e da venda de balcão
-- ===================================================================

-- Os campos aceitos são os das três janelinhas de cadastro rápido
-- (CadastroRapidoModais.tsx): nome e telefone; tipo e CPF/CNPJ (a venda de
-- balcão pede, pra nota); e o veículo. Qualquer outra chave é ignorada — o
-- resto do cadastro é do módulo Clientes.
create or replace function cadastrar_veiculo_rapido(p_cliente_id uuid, p_veiculo jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (operador_tem_permissao('ordens_servico') or operador_tem_permissao('clientes'))
     or not operador_ativo_com_loja() then
    raise exception 'Cadastrar veículo pela OS é só de quem tem o módulo Ordens de Serviço.'
      using errcode = '42501';
  end if;
  -- O Consumidor é "ninguém em particular" (0064): carro nele seria de todo mundo.
  if p_cliente_id = '00000000-0000-0000-0000-00000000c000'::uuid then
    raise exception 'O cliente Consumidor não tem veículo. Cadastre o cliente de verdade.';
  end if;
  if nullif(btrim(p_veiculo ->> 'placa'), '') is null then
    raise exception 'Preencha pelo menos a placa do veículo.';
  end if;

  insert into veiculos (cliente_id, placa, marca, modelo, ano, cor, tipo, km_atual)
  values (
    p_cliente_id,
    p_veiculo ->> 'placa',
    p_veiculo ->> 'marca',
    p_veiculo ->> 'modelo',
    (p_veiculo ->> 'ano')::int,
    p_veiculo ->> 'cor',
    p_veiculo ->> 'tipo',
    (p_veiculo ->> 'km_atual')::int
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function cadastrar_cliente_rapido(p_cliente jsonb, p_veiculo jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_veiculo_id uuid;
begin
  if not (operador_tem_permissao('ordens_servico') or operador_tem_permissao('clientes'))
     or not operador_ativo_com_loja() then
    raise exception 'Cadastrar cliente pela OS é só de quem tem o módulo Ordens de Serviço.'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_cliente ->> 'nome'), '') is null then
    raise exception 'Preencha o nome do cliente.';
  end if;

  insert into clientes (nome, telefone, tipo_pessoa, cpf_cnpj)
  values (
    p_cliente ->> 'nome',
    p_cliente ->> 'telefone',
    coalesce(p_cliente ->> 'tipo_pessoa', 'fisica'),
    p_cliente ->> 'cpf_cnpj'
  )
  returning id into v_cliente_id;

  if p_veiculo is not null and jsonb_typeof(p_veiculo) = 'object' then
    v_veiculo_id := cadastrar_veiculo_rapido(v_cliente_id, p_veiculo);
  end if;

  return jsonb_build_object('cliente_id', v_cliente_id, 'veiculo_id', v_veiculo_id);
end;
$$;

comment on function cadastrar_cliente_rapido(jsonb, jsonb) is
  'TR-04.1 lote 4 (0068). O cadastro rápido de dentro da OS, do Orçamento e da '
  'venda de balcão, pra quem tem OS sem ter Clientes. Grava só nome, telefone, '
  'tipo e CPF/CNPJ (e o veículo, se vier); devolve só os ids, nunca o cadastro.';

comment on function cadastrar_veiculo_rapido(uuid, jsonb) is
  'TR-04.1 lote 4 (0068). Acrescenta UM veículo a um cliente, pelo cadastro '
  'rápido da OS. Devolve só o id.';

-- ===================================================================
-- 3. Os dados do cliente e do veículo de UMA OS (nota fiscal e garantia)
-- ===================================================================

-- Pede a OS com os direitos de quem chama? Não: a função é security definer,
-- então a checagem de loja é feita aqui, à mão, com a mesma função da RLS.
-- Fica de fora do cliente só o que nem a nota nem a garantia usam
-- (aniversário e data do cadastro).
create or replace function cliente_e_veiculo_da_ordem(p_ordem_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ordem ordens_servico%rowtype;
begin
  if not (operador_tem_permissao('ordens_servico') or operador_tem_permissao('clientes')) then
    raise exception 'Os dados do cliente da OS são só de quem tem o módulo Ordens de Serviço.'
      using errcode = '42501';
  end if;

  select * into v_ordem from ordens_servico where id = p_ordem_id;
  if not found or not operador_tem_acesso_loja(v_ordem.loja_id) then
    raise exception 'Esta OS não existe ou é de uma loja que você não acessa.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'cliente', (
      select to_jsonb(c) - 'data_nascimento' - 'criado_em'
        from clientes c where c.id = v_ordem.cliente_id
    ),
    'veiculo', (
      select to_jsonb(v)
        from veiculos v where v.id = v_ordem.veiculo_id
    )
  );
end;
$$;

comment on function cliente_e_veiculo_da_ordem(uuid) is
  'TR-04.1 lote 4 (0068). O cadastro do cliente e do veículo de UMA OS, pra '
  'emitir a nota (CPF/CNPJ e endereço) e imprimir a garantia. Exige o módulo '
  'OS (ou Clientes) e acesso à loja da OS. Nunca devolve lista.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria as funções.
revoke all on function cadastrar_cliente_rapido(jsonb, jsonb) from public, anon;
revoke all on function cadastrar_veiculo_rapido(uuid, jsonb) from public, anon;
revoke all on function cliente_e_veiculo_da_ordem(uuid) from public, anon;
grant execute on function cadastrar_cliente_rapido(jsonb, jsonb) to authenticated;
grant execute on function cadastrar_veiculo_rapido(uuid, jsonb) to authenticated;
grant execute on function cliente_e_veiculo_da_ordem(uuid) to authenticated;

insert into schema_versao (versao) values (68) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0069_clientes_so_com_permissao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0069: Clientes e Veículos só pra quem tem o módulo Clientes — a
-- segunda metade do lote 4 do TR-04.1 (tarefa #365). A primeira, a 0068, abriu
-- a janela estreita e as funções do balcão; esta FECHA as duas tabelas.
--
-- O PROBLEMA. Quem não tem o módulo Clientes não vê a tela, mas a RLS só
-- exigia login (0015): com a chave que está no computador dava pra pedir pela
-- API o cadastro inteiro (telefone, CPF, endereço, aniversário), e o de TODAS
-- as lojas da empresa, porque `clientes` e `veiculos` são compartilhados.
--
-- O que o balcão continua tendo sem o módulo está na 0068 (a janela, o
-- cadastro rápido e os dados da nota). O cliente "Consumidor" (0064) continua
-- visível pra qualquer logado: é nele que a venda de balcão nasce.
--
-- ORDEM DE SUBIR. Com esta rodada, a versão anterior do programa perde, pra
-- quem não tem Clientes, o nome do cliente nas listas (o `join` em tabela
-- fechada devolve `null` calado, §6 item 69 — medido num PostgREST 12), a
-- emissão de nota e o cadastro rápido. Por isso a linha abaixo: o botão
-- "Atualizar o banco de todas as empresas" espera os computadores chegarem
-- na versão que lê pela janela. Se a versão nova sair com outro número,
-- ajustar aqui.
-- versao-minima-do-programa: 0.9.54
--
-- Os quatro comandos em policies separadas, pelo motivo de sempre (0056):
-- uma `for all` sobrevivente reabriria o que a nova fecha, e comando sem
-- policy filtra a zero linhas sem erro nenhum (§6 item 15).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. clientes: só o módulo (e o Consumidor, pra qualquer um logado)
-- ===================================================================

drop policy if exists "clientes_acesso_temporario" on clientes;
drop policy if exists "clientes_acesso_autenticados" on clientes;
drop policy if exists "clientes_leitura" on clientes;
drop policy if exists "clientes_insercao" on clientes;
drop policy if exists "clientes_alteracao" on clientes;
drop policy if exists "clientes_exclusao" on clientes;

create policy "clientes_leitura" on clientes
  for select to authenticated
  using (
    (select operador_tem_permissao('clientes'))
    or id = '00000000-0000-0000-0000-00000000c000'::uuid
  );

create policy "clientes_insercao" on clientes
  for insert to authenticated
  with check ((select operador_tem_permissao('clientes')));

create policy "clientes_alteracao" on clientes
  for update to authenticated
  using ((select operador_tem_permissao('clientes')))
  with check ((select operador_tem_permissao('clientes')));

create policy "clientes_exclusao" on clientes
  for delete to authenticated
  using ((select operador_tem_permissao('clientes')));

-- ===================================================================
-- 2. veiculos: só o módulo
-- ===================================================================

drop policy if exists "veiculos_acesso_temporario" on veiculos;
drop policy if exists "veiculos_acesso_autenticados" on veiculos;
drop policy if exists "veiculos_leitura" on veiculos;
drop policy if exists "veiculos_insercao" on veiculos;
drop policy if exists "veiculos_alteracao" on veiculos;
drop policy if exists "veiculos_exclusao" on veiculos;

create policy "veiculos_leitura" on veiculos
  for select to authenticated
  using ((select operador_tem_permissao('clientes')));

create policy "veiculos_insercao" on veiculos
  for insert to authenticated
  with check ((select operador_tem_permissao('clientes')));

create policy "veiculos_alteracao" on veiculos
  for update to authenticated
  using ((select operador_tem_permissao('clientes')))
  with check ((select operador_tem_permissao('clientes')));

create policy "veiculos_exclusao" on veiculos
  for delete to authenticated
  using ((select operador_tem_permissao('clientes')));

insert into schema_versao (versao) values (69) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0070_limpar_token_antigo_focus.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0070: apagar a cópia antiga do token da Focus NFe — item TR-04.2,
-- parte 2 de 2 (tarefa #368).
--
-- O problema. Desde a 0057 o token mora no cofre `segredos_fiscais_loja`, que
-- nenhum operador lê, e quem emite e cancela é o porteiro (Edge Function
-- `focus-nfe`). Mas a cópia de antes continuou em
-- `configuracoes_fiscais_loja.focus_nfe_token`, uma coluna comum: qualquer
-- operador da loja, balconista incluído, ainda lia o token pela API, com a
-- chave que está no computador dele. Ou seja, o cofre só protegia de verdade
-- depois desta parte 2.
--
-- Por que agora. A 0057 combinou limpar a coluna só depois de uma nota
-- emitida e uma cancelada de verdade pelo porteiro. Isso foi cumprido em
-- 28/09/2026 (NFS-e 22, emitida e cancelada na loja).
--
-- O que esta migration faz:
--   1. REDE DE SEGURANÇA: copia pro cofre o token de qualquer loja que ainda
--      só o tenha na coluna (por exemplo, colado por um computador antigo
--      depois da 0057). Se a loja já tem token no cofre, o do cofre fica: a
--      cópia antiga nunca passa por cima (mesma regra da seção 2 da 0057);
--   2. apaga o conteúdo da coluna antiga (fica `null`);
--   3. deixa um comentário na coluna dizendo que ela está vazia de propósito.
--
-- A COLUNA NÃO SAI AQUI. Pela regra de "Voltar uma versão"
-- (docs/operacao.md), coluna em uso não some na mesma versão que deixa de ser
-- usada. Ela sai numa migration seguinte, quando nenhum computador antigo
-- puder mais escrever nela.
--
-- ORDEM DE SUBIR. Abaixo da v0.9.41 o programa lê o token desta coluna e
-- chama a Focus NFe direto: com a coluna vazia, esse computador para de
-- emitir nota. Por isso a linha abaixo — o botão "Atualizar o banco de todas
-- as empresas" espera os computadores em uso estarem na v0.9.41 ou mais nova
-- (a que passou a emitir pelo porteiro). O botão só enxerga computador que
-- se registra na tabela `computadores` (0063), e um programa parado na
-- v0.9.40 é velho demais pra se registrar: ele não aparece lá. Antes de
-- aplicar, conferir à mão que nenhum computador da empresa ficou nessa versão.
-- versao-minima-do-programa: 0.9.41
--
-- A trilha de auditoria (0053) registra o `update` abaixo com a coluna
-- mascarada: `focus_nfe_token` sai como '***' no "antes" e `null` no
-- "depois". O token não cai na tabela `auditoria`.
--
-- Idempotente: seguro rodar de novo (a segunda vez não acha nada pra copiar
-- nem pra apagar).

-- ===================================================================
-- 1. Rede de segurança: nenhuma loja perde a emissão
-- ===================================================================

insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
select loja_id, btrim(focus_nfe_token)
  from configuracoes_fiscais_loja
 where focus_nfe_token is not null
   and btrim(focus_nfe_token) <> ''
on conflict (loja_id) do nothing;

-- ===================================================================
-- 2. Apagar a cópia antiga
-- ===================================================================

update configuracoes_fiscais_loja
   set focus_nfe_token = null
 where focus_nfe_token is not null;

-- ===================================================================
-- 3. Avisar quem olhar a coluna
-- ===================================================================

comment on column configuracoes_fiscais_loja.focus_nfe_token is
  'TR-04.2. VAZIA DE PROPÓSITO desde a migration 0070: o token da Focus NFe '
  'mora no cofre segredos_fiscais_loja (0057) e quem usa é o porteiro '
  '(Edge Function focus-nfe). Não gravar nada aqui — qualquer operador da '
  'loja lê esta coluna. Ela sai numa versão seguinte.';

insert into schema_versao (versao) values (70) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0071_item_trava_na_aprovacao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0071: item que entra no orçamento na hora da aprovação não pode
-- escapar do estoque (tarefa #706).
--
-- O PROBLEMA. Dois computadores com o mesmo orçamento aberto: o A acrescenta
-- um pneu enquanto o B aprova. Até aqui quem fazia tudo era o programa
-- (src/lib/ordensServico.ts), em pedidos separados ao banco:
--   • acrescentar item: lia o status da ordem ("é orçamento? então não
--     baixa") e SÓ DEPOIS gravava o item;
--   • aprovar: mudava o status pra OS e SÓ DEPOIS lia os itens pra baixar.
-- Se a aprovação do B cai entre a leitura e a gravação do A, o pneu entra
-- numa OS já aprovada sem baixar: o A achou que era orçamento, e o B leu os
-- itens antes de o pneu existir. O pneu sai da prateleira e nunca sai do
-- estoque. Com a ordem trocada (o A lê "já é OS" e o B lê os itens depois de
-- o pneu gravar) o pneu baixaria DUAS vezes. A correção de item tinha o
-- mesmo buraco. É raro (precisa cair no mesmo instante), mas quando cai
-- ninguém percebe até a contagem do estoque não bater.
--
-- O QUE ESTA MIGRATION CRIA: três funções que o programa chama no lugar dos
-- pedidos separados, cada uma uma transação só:
--
--   • adicionar_itens_ordem(ordem, itens, operador) — grava os itens e, se a
--     ordem já é OS, baixa as peças deles;
--   • editar_item_ordem(item, patch, operador) — corrige um item e, se a
--     ordem já é OS, lança só a diferença no estoque;
--   • aprovar_orcamento(ordem, aprovado_por, operador, vínculos) — vira OS,
--     liga as peças avulsas que ganharam cadastro (#655) e baixa as peças.
--
-- QUATRO DECISÕES QUE VALEM SABER ANTES DE MEXER AQUI:
--
-- 1. A TRAVA É A LINHA DA ORDEM. As três começam com `select ... from
--    ordens_servico where id = ... for update`: a linha da ordem fica presa
--    até o fim da transação. Quem chega depois ESPERA a vez — e, quando
--    entra, relê o status já com o que o outro gravou. Então ou o pneu entra
--    antes (e a aprovação, que lê os itens depois de travar, baixa ele) ou
--    entra depois (e vê "já é OS" e baixa sozinho). Nunca no meio. Não há
--    tranca nova nem tabela nova: é a trava de linha comum do Postgres, que
--    some sozinha no commit ou no erro.
--
-- 2. TUDO OU NADA. Erro em qualquer passo desfaz a função inteira: não sobra
--    item gravado sem a baixa dele, nem orçamento aprovado com metade das
--    peças baixadas. Por isso, sem depósito ativo na loja, aprovar um
--    orçamento com peça FALHA inteiro (continua orçamento) — antes a OS
--    ficava aprovada e a baixa falhava depois. A única exceção, de
--    propósito, são os vínculos de peça avulsa na aprovação (decisão 4).
--
-- 3. RODAM COMO QUEM CHAMA (`security invoker`). Não atravessam a RLS: quem
--    não enxerga a ordem pela RLS de hoje recebe "não encontrada" (ou null,
--    na aprovação) e nada é gravado. Nenhuma policy muda aqui.
--
-- 4. VÍNCULO QUE FALHA NÃO DERRUBA A APROVAÇÃO. Igual ao programa de antes
--    (#655): cada vínculo roda num bloco próprio (`begin ... exception`); se
--    um falha por peça apagada ou id inválido (só esses erros; qualquer outro
--    derruba a aprovação inteira), o item fica avulso — sem
--    baixa, o que é coerente —, os outros seguem, a aprovação vale, e a
--    função devolve quais itens não foram ligados, pra tela avisar.
--
-- 5. OS FATURADA NÃO ACEITA ITEM. Acrescentar e corrigir recusam a OS já
--    faturada, conferida depois da trava: o pagamento já entrou no Caixa pelo
--    total de antes, e outro computador pode ter faturado com a tela aberta.
--
-- As regras de "nome do documento" (a referência do movimento: "Orçamento
-- 45", "OS 17", "Venda 17") e de "depósito padrão" (o depósito ativo mais
-- antigo da loja) são as mesmas do programa (nomeDocumento em
-- src/types/os.ts e buscarDepositoPadraoId em src/lib/depositos.ts), escritas
-- uma vez cada numa função pequena aqui embaixo, pras três usarem.
--
-- ORDEM AO SUBIR: tanto faz. Só acrescenta funções; a versão anterior do
-- programa continua funcionando igual (com o mesmo risco raro de antes), por
-- isso esta migration NÃO tem a linha de versão mínima do programa.
--
-- Idempotente: seguro rodar de novo.

drop function if exists adicionar_itens_ordem(uuid, jsonb, uuid);
drop function if exists editar_item_ordem(uuid, jsonb, uuid);
drop function if exists aprovar_orcamento(uuid, text, uuid, jsonb);
drop function if exists nome_documento_ordem(text, integer, integer, text);
drop function if exists deposito_padrao_da_loja(uuid);

-- ---------------------------------------------------------------------------
-- 0. As duas pequenas
-- ---------------------------------------------------------------------------

-- O nome do documento, igual a nomeDocumento (src/types/os.ts): sem número de
-- OS, ou ainda orçamento/recusado → "Orçamento N"; senão "OS N" (ou "Venda N"
-- na venda de balcão).
create or replace function nome_documento_ordem(
  p_status text,
  p_numero integer,
  p_numero_orcamento integer,
  p_tipo text
)
returns text
language sql
immutable
security invoker
set search_path = public
as $$
  select case
    when p_numero is null or p_status in ('orcamento', 'recusado')
      then trim('Orçamento ' || coalesce(p_numero_orcamento::text, ''))
    else (case when p_tipo = 'venda_balcao' then 'Venda ' else 'OS ' end) || p_numero::text
  end;
$$;

comment on function nome_documento_ordem(text, integer, integer, text) is
  '#706. O nome do documento ("Orçamento 45", "OS 17", "Venda 17"), igual a '
  'nomeDocumento (src/types/os.ts). Usado como referência do movimento de estoque.';

-- O depósito padrão da loja, igual a buscarDepositoPadraoId
-- (src/lib/depositos.ts): o ativo mais antigo. Sem nenhum, recusa com a mesma
-- mensagem do programa. Pela RLS de quem chama (depósito de loja que a pessoa
-- não enxerga não conta).
create or replace function deposito_padrao_da_loja(p_loja uuid)
returns uuid
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_deposito uuid;
begin
  select id into v_deposito
    from depositos
   where loja_id = p_loja
     and ativo
   order by criado_em
   limit 1;
  if v_deposito is null then
    raise exception 'Nenhum depósito ativo encontrado pra essa loja. Cadastre ou reative um depósito em Configurações antes de continuar.';
  end if;
  return v_deposito;
end;
$$;

comment on function deposito_padrao_da_loja(uuid) is
  '#706. O depósito ativo mais antigo da loja (igual a buscarDepositoPadraoId, '
  'src/lib/depositos.ts); sem nenhum, recusa com a mensagem do programa.';

-- ---------------------------------------------------------------------------
-- 1. Acrescentar itens numa ordem (orçamento ou OS)
-- ---------------------------------------------------------------------------
-- p_itens: lista de itens no formato NovoItemOS (tipo, peca_id, servico_id,
-- tecnico_id, descricao, quantidade, preco_unitario, desconto e, opcional,
-- custo_unitario). Lista vazia só marca quem mexeu por último.
-- Em orçamento (ou recusado) não baixa nada: quem baixa é a aprovação.

create or replace function adicionar_itens_ordem(
  p_ordem uuid,
  p_itens jsonb,
  p_operador uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem ordens_servico%rowtype;
  v_pecas ordens_servico_itens[];
  v_deposito uuid;
begin
  -- A trava (decisão 1 do cabeçalho).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found then
    raise exception 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.';
  end if;

  -- OS faturada não aceita item: o pagamento já entrou no Caixa pelo total
  -- de antes. A tela esconde o botão, mas outro computador pode ter faturado
  -- com ela aberta; com a trava, a situação lida aqui é a de verdade.
  if v_ordem.status = 'faturada' then
    raise exception 'Esta OS já foi faturada (talvez em outro computador): não dá mais pra acrescentar ou corrigir peça ou serviço nela. Atualize a OS.';
  end if;

  -- p_itens é lido uma vez só: o insert devolve as peças do cadastro que
  -- gravou (já com a quantidade como ficou na tabela), e é delas que sai o
  -- estoque. preco_unitario e desconto têm padrão 0 na tabela; item que não
  -- disser fica com o padrão, como num insert comum.
  with gravados as (
    insert into ordens_servico_itens
      (ordem_servico_id, tipo, peca_id, servico_id, tecnico_id, descricao,
       quantidade, preco_unitario, desconto, custo_unitario)
    select p_ordem, i.tipo, i.peca_id, i.servico_id, i.tecnico_id, i.descricao,
           i.quantidade, coalesce(i.preco_unitario, 0), coalesce(i.desconto, 0), i.custo_unitario
      from jsonb_populate_recordset(null::ordens_servico_itens, coalesce(p_itens, '[]'::jsonb)) i
    returning *
  )
  select array_agg(g order by g.id) into v_pecas
    from gravados g
   where g.tipo = 'peca' and g.peca_id is not null;

  -- Já é OS: as peças do cadastro saem do estoque agora, um movimento por
  -- item (como o programa sempre fez). Peça avulsa e serviço não mexem.
  if v_ordem.status not in ('orcamento', 'recusado') and v_pecas is not null then
    v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
    insert into estoque_movimentos
      (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    select i.peca_id, v_deposito, 'saida', i.quantidade, 'uso_em_os',
           nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo),
           v_ordem.loja_id
      from unnest(v_pecas) i;
  end if;

  update ordens_servico set atualizado_por_id = p_operador where id = p_ordem;
end;
$$;

comment on function adicionar_itens_ordem(uuid, jsonb, uuid) is
  '#706. Acrescenta itens (lista de NovoItemOS) numa ordem, com a linha da ordem '
  'travada (for update) até o fim; se a ordem já é OS, baixa as peças do cadastro '
  'na mesma transação ("saida", "uso_em_os", referência = nome do documento). '
  'Em orçamento/recusado não baixa. Pela RLS de quem chama.';

-- ---------------------------------------------------------------------------
-- 2. Corrigir um item já lançado
-- ---------------------------------------------------------------------------
-- p_patch: só os campos que mudam (o resto fica como está no banco). id e
-- ordem_servico_id nunca mudam, mesmo que venham no patch.
-- O "antes" da conta do estoque é o item do BANCO, relido depois da trava —
-- não o que a tela tinha, que pode estar velho.

create or replace function editar_item_ordem(
  p_item uuid,
  p_patch jsonb,
  p_operador uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem_id uuid;
  v_ordem ordens_servico%rowtype;
  v_original ordens_servico_itens%rowtype;
  v_novo ordens_servico_itens%rowtype;
  v_deposito uuid;
  v_dif record;
begin
  select ordem_servico_id into v_ordem_id from ordens_servico_itens where id = p_item;
  if v_ordem_id is not null then
    -- A trava (decisão 1 do cabeçalho).
    select * into v_ordem from ordens_servico where id = v_ordem_id for update;
  end if;
  if v_ordem_id is null or v_ordem.id is null then
    raise exception 'Este item não foi encontrado (talvez tenha sido apagado em outro computador). Atualize a OS.';
  end if;

  -- OS faturada não aceita item: o pagamento já entrou no Caixa pelo total
  -- de antes. A tela esconde o botão, mas outro computador pode ter faturado
  -- com ela aberta; com a trava, a situação lida aqui é a de verdade.
  if v_ordem.status = 'faturada' then
    raise exception 'Esta OS já foi faturada (talvez em outro computador): não dá mais pra acrescentar ou corrigir peça ou serviço nela. Atualize a OS.';
  end if;

  -- Só agora, com a ordem presa, o item como está. O `for update` do item
  -- cobre também quem mexe nele sem passar por aqui (a versão anterior do
  -- programa): a conta parte sempre da última versão gravada.
  select * into v_original
    from ordens_servico_itens
   where id = p_item and ordem_servico_id = v_ordem_id
     for update;
  if not found then
    raise exception 'Este item não foi encontrado (talvez tenha sido apagado em outro computador). Atualize a OS.';
  end if;

  v_novo := jsonb_populate_record(v_original, coalesce(p_patch, '{}'::jsonb));

  -- O item vai antes do estoque (tudo na mesma transação de qualquer jeito).
  -- O `returning` traz o que ficou gravado (quantidade já com 2 casas), que
  -- é o que a conta do estoque usa.
  update ordens_servico_itens
     set tipo           = v_novo.tipo,
         peca_id        = v_novo.peca_id,
         servico_id     = v_novo.servico_id,
         tecnico_id     = v_novo.tecnico_id,
         descricao      = v_novo.descricao,
         quantidade     = v_novo.quantidade,
         preco_unitario = v_novo.preco_unitario,
         desconto       = v_novo.desconto,
         custo_unitario = v_novo.custo_unitario
   where id = p_item
  returning * into v_novo;

  -- Já é OS: lança só a diferença, peça por peça (a mesma conta de
  -- diferencasDeEstoque em src/lib/ordensServico.ts). Mudou só o preço: nada.
  -- Saiu mais peça: "saida"/"uso_em_os". Voltou peça pra prateleira:
  -- "entrada"/"ajuste" (não existe "des-uso em OS").
  if v_ordem.status not in ('orcamento', 'recusado') then
    for v_dif in
      select d.peca_id, sum(d.quantidade) as diferenca
        from (
          select v_novo.peca_id as peca_id, v_novo.quantidade as quantidade
           where v_novo.tipo = 'peca' and v_novo.peca_id is not null
          union all
          select v_original.peca_id, -v_original.quantidade
           where v_original.tipo = 'peca' and v_original.peca_id is not null
        ) d
       group by d.peca_id
      having sum(d.quantidade) <> 0
       order by d.peca_id
    loop
      if v_deposito is null then
        v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
      end if;
      insert into estoque_movimentos
        (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
      values (
        v_dif.peca_id,
        v_deposito,
        case when v_dif.diferenca > 0 then 'saida' else 'entrada' end,
        abs(v_dif.diferenca),
        case when v_dif.diferenca > 0 then 'uso_em_os' else 'ajuste' end,
        nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo)
          || ' (correção de item)',
        v_ordem.loja_id
      );
    end loop;
  end if;

  update ordens_servico set atualizado_por_id = p_operador where id = v_ordem_id;
end;
$$;

comment on function editar_item_ordem(uuid, jsonb, uuid) is
  '#706. Corrige um item (p_patch = só os campos que mudam), com a linha da ordem '
  'travada (for update) e o item relido do banco depois da trava; se a ordem já é '
  'OS, lança só a diferença por peça na mesma transação (mais peça: saida/uso_em_os; '
  'menos: entrada/ajuste; referência "<documento> (correção de item)"). Pela RLS de quem chama.';

-- ---------------------------------------------------------------------------
-- 3. Aprovar o orçamento
-- ---------------------------------------------------------------------------
-- p_vinculos (#655): [{"item_id": ..., "peca_id": ...}, ...] — as peças
-- avulsas que ganham cadastro na aprovação.
--
-- Devolve null se a ordem não existe (ou a pessoa não enxerga) ou já não é
-- orçamento (outro computador aprovou ou recusou antes): nada muda. Senão:
--   {"ordem": <a linha já aprovada, com o número de OS>,
--    "nao_ligados": [{"id": .., "descricao": ..}, ...]}   ('[]' se nenhum)

create or replace function aprovar_orcamento(
  p_ordem uuid,
  p_aprovado_por text,
  p_operador uuid,
  p_vinculos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem ordens_servico%rowtype;
  v_vinculo jsonb;
  v_nao_ligados text[] := '{}';
  v_lista jsonb;
  v_deposito uuid;
begin
  -- A trava (decisão 1 do cabeçalho).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found or v_ordem.status <> 'orcamento' then
    return null;
  end if;

  -- Vira OS. O gatilho da 0065 dá o próximo número e a data de abertura.
  update ordens_servico
     set status            = 'em_andamento',
         aprovado_por      = nullif(trim(p_aprovado_por), ''),
         aprovado_em       = now(),
         atualizado_por_id = p_operador
   where id = p_ordem
     and status = 'orcamento'
  returning * into v_ordem;
  -- Segunda proteção: com a trava acima isto nunca acontece, mas se um dia a
  -- trava sair, a segunda aprovação cai aqui em vez de aprovar de novo.
  if not found then
    return null;
  end if;

  -- Os vínculos, cada um no seu bloco (decisão 4 do cabeçalho). Só pega item
  -- desta ordem que ainda é peça avulsa: nunca troca a peça de um item do
  -- cadastro nem põe peça num serviço.
  for v_vinculo in
    select e from jsonb_array_elements(coalesce(p_vinculos, '[]'::jsonb)) e
  loop
    begin
      update ordens_servico_itens
         set peca_id = (v_vinculo ->> 'peca_id')::uuid
       where id = (v_vinculo ->> 'item_id')::uuid
         and ordem_servico_id = p_ordem
         and tipo = 'peca'
         and peca_id is null;
    -- Só os erros esperados de um vínculo (peça apagada, id que não é uuid).
    -- Qualquer outro derruba a aprovação inteira, em vez de virar "não ligado".
    exception when foreign_key_violation or invalid_text_representation then
      v_nao_ligados := v_nao_ligados || (v_vinculo ->> 'item_id');
    end;
  end loop;

  -- A baixa: os itens como estão AGORA no banco (depois dos vínculos), um
  -- movimento por item de peça do cadastro, com o nome da OS já aprovada.
  if exists (
    select 1 from ordens_servico_itens
     where ordem_servico_id = p_ordem and tipo = 'peca' and peca_id is not null
  ) then
    v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
    insert into estoque_movimentos
      (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    select i.peca_id, v_deposito, 'saida', i.quantidade, 'uso_em_os',
           nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo),
           v_ordem.loja_id
      from ordens_servico_itens i
     where i.ordem_servico_id = p_ordem
       and i.tipo = 'peca'
       and i.peca_id is not null;
  end if;

  -- Os não ligados que ainda existem (item apagado em outro computador não
  -- tem peça pra avisar), na ordem em que vieram.
  select coalesce(
           jsonb_agg(jsonb_build_object('id', i.id, 'descricao', i.descricao)
                     order by array_position(v_nao_ligados, i.id::text)),
           '[]'::jsonb
         )
    into v_lista
    from ordens_servico_itens i
   where i.ordem_servico_id = p_ordem
     and i.id::text = any (v_nao_ligados);

  return jsonb_build_object('ordem', to_jsonb(v_ordem), 'nao_ligados', v_lista);
end;
$$;

comment on function aprovar_orcamento(uuid, text, uuid, jsonb) is
  '#706. Aprova o orçamento com a linha da ordem travada (for update): vira '
  'em_andamento (o gatilho da 0065 numera), liga as peças avulsas de p_vinculos '
  '(cada uma no seu bloco: a que falha não para a aprovação) e baixa as peças do '
  'cadastro lidas depois dos vínculos, tudo na mesma transação. Devolve null se '
  'não achou ou já não é orçamento; senão {"ordem": .., "nao_ligados": [{"id","descricao"}]}. '
  'Pela RLS de quem chama.';

-- O Postgres dá EXECUTE a PUBLIC (e o Supabase ao `anon`) em toda função
-- nova. Mesmo rodando como quem chama, só quem está logado.
revoke all on function nome_documento_ordem(text, integer, integer, text) from public, anon;
revoke all on function deposito_padrao_da_loja(uuid) from public, anon;
revoke all on function adicionar_itens_ordem(uuid, jsonb, uuid) from public, anon;
revoke all on function editar_item_ordem(uuid, jsonb, uuid) from public, anon;
revoke all on function aprovar_orcamento(uuid, text, uuid, jsonb) from public, anon;
grant execute on function nome_documento_ordem(text, integer, integer, text) to authenticated;
grant execute on function deposito_padrao_da_loja(uuid) to authenticated;
grant execute on function adicionar_itens_ordem(uuid, jsonb, uuid) to authenticated;
grant execute on function editar_item_ordem(uuid, jsonb, uuid) to authenticated;
grant execute on function aprovar_orcamento(uuid, text, uuid, jsonb) to authenticated;

insert into schema_versao (versao) values (71) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0072_servicos_padrao_empresa_nova.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0072: lista maior de serviços padrão pra empresa nova (tarefa #787).
--
-- A 0030 cadastra 17 serviços (quase todos de pneu, alinhamento e freio). Esta
-- acrescenta mais 39, da pesquisa da tarefa #786 (docs/servicos-padrao.md),
-- e 3 categorias de serviço que faltavam: Óleo e Filtros, Elétrica e
-- Ar-condicionado. O resto encaixa nas 6 categorias da 0030.
--
-- DECISÕES (Sofia, 23 e 27/10/2026):
--   • SÓ EMPRESA NOVA. Tudo aqui só entra num banco SEM NENHUMA ordem de
--     serviço — o banco que acabou de ser instalado. Num banco em uso a
--     migration não faz nada, então o botão "Atualizar o banco de todas as
--     empresas" não mexe no cadastro de serviços de loja nenhuma.
--   • SEM PREÇO, igual à 0030: `preco_padrao` fica vazio. A faixa de preço
--     da pesquisa é só referência pra loja preencher.
--   • NOME CURTO, sem a explicação entre parênteses da pesquisa: é o nome
--     que aparece na OS e na nota.
--   • Nenhum dos 17 nomes da 0030 é renomeado nem cadastrado de novo. A
--     linha "Cambagem e caster" da pesquisa NÃO entra: ela é a soma dos 4
--     nomes por lado que a 0030 já tem.
--
-- Idempotente: rodar de novo não duplica (o nome é comparado sem diferença
-- de maiúscula e de espaço nas pontas).

insert into categorias_servicos (nome)
select v.nome
from (values ('Óleo e Filtros'), ('Elétrica'), ('Ar-condicionado')) as v(nome)
where not exists (select 1 from ordens_servico)
on conflict (nome) do nothing;

insert into servicos (descricao, categoria_id, preco_padrao, ativo)
select v.descricao, cs.id, null, true
from (
  values
    -- borracharia
    ('Conserto de pneu furado', 'Pneus'),
    ('Conserto de pneu com manchão', 'Pneus'),
    ('Vulcanização', 'Pneus'),
    ('Desmontagem de pneu', 'Pneus'),
    ('Troca de válvula do pneu', 'Pneus'),
    ('Calibragem com nitrogênio', 'Pneus'),
    ('Troca de estepe ou de roda', 'Pneus'),
    ('Desempeno de roda de ferro', 'Pneus'),
    ('Desempeno de roda de liga leve', 'Pneus'),
    -- suspensão e amortecedores
    ('Troca de amortecedores (par)', 'Amortecedores'),
    ('Troca de bandeja', 'Suspensão'),
    ('Troca de pivô', 'Suspensão'),
    ('Troca de terminal de direção', 'Suspensão'),
    ('Troca de bieleta', 'Suspensão'),
    ('Troca de coxim ou kit batente', 'Suspensão'),
    ('Troca da suspensão dianteira completa', 'Suspensão'),
    ('Revisão de suspensão', 'Suspensão'),
    -- freios
    ('Troca de pastilha de freio', 'Freios'),
    ('Troca de disco e pastilha', 'Freios'),
    ('Troca de lona ou sapata e tambor', 'Freios'),
    -- óleo e filtros
    ('Troca de óleo do motor', 'Óleo e Filtros'),
    ('Troca de filtro de óleo', 'Óleo e Filtros'),
    ('Troca de filtro de ar', 'Óleo e Filtros'),
    ('Troca de filtro de combustível', 'Óleo e Filtros'),
    ('Troca de filtro de cabine', 'Óleo e Filtros'),
    ('Troca de óleo de câmbio', 'Óleo e Filtros'),
    -- elétrica e bateria
    ('Teste de bateria e alternador', 'Elétrica'),
    ('Troca de bateria', 'Elétrica'),
    ('Troca de lâmpada', 'Elétrica'),
    ('Troca de velas', 'Elétrica'),
    ('Diagnóstico com scanner', 'Elétrica'),
    -- ar-condicionado
    ('Higienização do ar-condicionado', 'Ar-condicionado'),
    ('Recarga de gás do ar-condicionado', 'Ar-condicionado'),
    -- outros
    ('Troca de correia dentada', 'Outros Serviços'),
    ('Troca do líquido de arrefecimento', 'Outros Serviços'),
    ('Limpeza de bicos injetores', 'Outros Serviços'),
    ('Troca de palhetas', 'Outros Serviços'),
    ('Troca de escapamento', 'Outros Serviços'),
    ('Revisão preventiva básica', 'Outros Serviços')
) as v(descricao, categoria_nome)
-- `left join`: se a categoria não existir (a loja apagou), o serviço entra
-- do mesmo jeito, sem categoria.
left join categorias_servicos cs on cs.nome = v.categoria_nome
where not exists (select 1 from ordens_servico)
  and not exists (
    select 1 from servicos s
    where lower(btrim(s.descricao)) = lower(btrim(v.descricao))
  );

insert into schema_versao (versao) values (72) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0073_pecas_janela.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0073: a JANELA de Peças e Estoque — primeira metade do lote 5 da
-- etapa 2 do TR-04.1 (tarefa #366). Os lotes anteriores: RH (0056), contas
-- (0061), Caixa (0062) e Clientes (0068/0069). A segunda metade, que FECHA as
-- tabelas, é a 0074.
--
-- POR QUE EM DUAS (o mesmo motivo da 0068). Esta só ACRESCENTA (duas views e
-- três funções) e não muda nada pra versão atual do programa. A versão nova
-- passa a ler por elas — pra todo mundo, inclusive quem tem o módulo —, então
-- ela precisa desta migration já aplicada; e a 0074, que fecha a porta,
-- precisa da versão nova já nos computadores. Ordem: 0073 → publicar e
-- liberar a versão → 0074.
--
-- O PROBLEMA. Quem não tem o módulo Estoque não vê a tela, mas a RLS de
-- `pecas` só exigia login (0015), e a de `estoque_movimentos` e
-- `contagens_estoque` só o acesso à loja (0032). Com a chave que está no
-- computador, qualquer balconista pedia pela API o CUSTO de todas as peças
-- (a margem da loja inteira), alterava preço, apagava peça e lançava
-- movimento de estoque à vontade.
--
-- O QUE NÃO PODE QUEBRAR JUNTO (decisões da Sofia na issue #366):
--
--   • VENDER, ORÇAR E EMITIR NOTA SEM O MÓDULO. Quem tem OS (ou Fornecedores,
--     ou Notas) escolhe a peça pela janela `pecas_janela`: código, descrição,
--     unidade, PREÇO DE VENDA, garantia e se está ativa. NUNCA o custo.
--
--   • O SALDO. A OS e a venda de balcão mostram quanto tem na prateleira. Em
--     vez de ler os movimentos (que passam a ser do módulo), o programa lê a
--     view `estoque_saldos`: um número por peça por loja, só das lojas de
--     quem pergunta. É a mesma conta de `calcularSaldoPorPeca`
--     (src/lib/estoque.ts): entrada soma, saída subtrai.
--
--   • O LUCRO DO CAIXA E DO INÍCIO. Quem tem Caixa (ou OS, ou o Início) vê o
--     lucro do dia, que precisa do custo de cada OS. `custo_das_ordens()`
--     devolve UM número por OS (nunca o custo de cada peça), com a mesma
--     regra de `custoUnitarioDoItem` (src/schemas/orcamento.ts).
--
--   • A NOTA FISCAL. NCM, CEST, CFOP, origem, CST e ICMS das peças da nota:
--     `dados_fiscais_das_pecas()`, pra uma lista de peças. Sem custo.
--
--   • CADASTRAR PEÇA DE DENTRO DA OS E DE FORNECEDORES. A peça avulsa que
--     ganha cadastro (#655) e a peça nova da nota de entrada (XML) passam por
--     `cadastrar_peca_rapida()`. Função, e não porta de INSERT na tabela,
--     porque o programa precisa do id de volta, e um insert com `returning`
--     exige também a policy de LEITURA (lição da 0058). Devolve só o id.
--
-- POR QUE AS VIEWS RODAM COM OS DIREITOS DO DONO (security_invoker = false):
-- medido na 0056 — com a base fechada, a view `security_invoker = true`
-- devolve ZERO linhas. A consequência é a regra de sempre (§6 item 69): o
-- filtro de quem pode ler tem que estar escrito DENTRO dela, e o `revoke` lá
-- embaixo tira a escrita (a `pecas_janela` é view simples, auto-atualizável).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A janela das peças: só o que o balcão precisa, nunca o custo
-- ===================================================================

drop view if exists pecas_janela;

create view pecas_janela
with (security_invoker = false, security_barrier = true)
as
  select p.id,
         p.codigo_interno,
         p.codigo_barras,
         p.descricao,
         p.unidade,
         p.preco_venda,
         p.prazo_garantia_dias,
         p.ativo,
         p.marca,
         p.modelo,
         p.medida,
         -- SE falta o custo (em branco ou zero, a regra do avisoPecaSemCusto),
         -- nunca QUANTO é: é o que mantém o aviso "peça sem preço de custo"
         -- na OS e no balcão sem entregar o número.
         coalesce(p.preco_custo, 0) = 0 as sem_custo
    from pecas p
   where (select operador_ativo_com_loja());

comment on view pecas_janela is
  'TR-04.1 lote 5 (0073). A parte de `pecas` que quem não tem o módulo '
  'Estoque pode ver: código, descrição, marca, modelo, medida, unidade, preço '
  'de venda, garantia, se está ativa e se está sem custo (sim/não, nunca o valor). Roda com os direitos do dono, então NÃO reage à RLS da '
  'tabela — é o where daqui que barra quem não é operador ativo com loja. '
  'Só SELECT é concedido: sem o revoke abaixo daria pra escrever na tabela '
  'por dentro dela. NUNCA acrescentar preco_custo.';

revoke all on pecas_janela from anon, authenticated;
grant select on pecas_janela to authenticated;

-- ===================================================================
-- 2. O saldo de cada peça, por loja (só as lojas de quem pergunta)
-- ===================================================================

-- O filtro de loja é escrito à mão (a view não reage à RLS de
-- estoque_movimentos): as lojas ligadas a quem está logado, e só se ele está
-- ativo. A subconsulta não depende da linha, então o Postgres a resolve uma
-- vez por consulta.
drop view if exists estoque_saldos;

create view estoque_saldos
with (security_invoker = false, security_barrier = true)
as
  select m.peca_id,
         m.loja_id,
         sum(case m.tipo when 'entrada' then m.quantidade else -m.quantidade end) as saldo
    from estoque_movimentos m
   where m.loja_id in (
           select ol.loja_id
             from operador_lojas ol
             join operadores o on o.id = ol.operador_id
            where ol.operador_id = auth.uid()
              and o.ativo
         )
   group by m.peca_id, m.loja_id;

comment on view estoque_saldos is
  'TR-04.1 lote 5 (0073). O saldo de cada peça em cada loja (entrada soma, '
  'saída subtrai — a conta de calcularSaldoPorPeca), só das lojas de quem '
  'está logado e ativo. Roda com os direitos do dono: o filtro de loja é o '
  'where daqui. Só SELECT. Nunca acrescentar custo nem o movimento em si.';

revoke all on estoque_saldos from anon, authenticated;
grant select on estoque_saldos to authenticated;

-- ===================================================================
-- 3. O custo de cada OS (o lucro do Caixa e do Início)
-- ===================================================================

-- Um número por OS, nunca o custo de cada peça. A conta é a de
-- `custoUnitarioDoItem` (src/schemas/orcamento.ts), item a item:
--   • serviço → custo do cadastro do serviço (0 se não tem, ou se o item
--     não aponta pra serviço nenhum);
--   • peça avulsa (peca_id nulo, #655) → o custo digitado no item; sem ele,
--     conta 0 e a OS sai com custo_completo = false;
--   • peça do cadastro → preco_custo da peça (0 se não tem, ou se a peça foi
--     apagada).
-- custo = soma de quantidade × unitário. Toda OS da lista que quem chama
-- alcança volta numa linha, mesmo sem item (custo 0, completo).
drop function if exists custo_das_ordens(uuid[]);

create function custo_das_ordens(p_ordens uuid[])
returns table (ordem_servico_id uuid, custo numeric, custo_completo boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
       (select operador_tem_permissao('caixa'))
    or (select operador_tem_permissao('relatorios'))
    or (select operador_tem_permissao('ordens_servico'))
    or (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('funcionarios'))
  ) then
    raise exception 'O custo das ordens é só de quem tem Caixa, Ordens de Serviço, Estoque, Relações ou Funcionários.'
      using errcode = '42501';
  end if;

  return query
    select o.id,
           coalesce(sum(
             i.quantidade *
             case
               when i.tipo = 'servico' then coalesce(s.custo, 0)
               when i.peca_id is null  then coalesce(i.custo_unitario, 0)
               else coalesce(p.preco_custo, 0)
             end
           ), 0)::numeric,
           coalesce(bool_and(not (i.tipo = 'peca' and i.peca_id is null and i.custo_unitario is null)), true)
      from ordens_servico o
      left join ordens_servico_itens i on i.ordem_servico_id = o.id
      left join servicos s on i.tipo = 'servico' and s.id = i.servico_id
      left join pecas p    on i.tipo <> 'servico' and p.id = i.peca_id
     where o.id = any (p_ordens)
       and operador_tem_acesso_loja(o.loja_id)
     group by o.id;
end;
$$;

comment on function custo_das_ordens(uuid[]) is
  'TR-04.1 lote 5 (0073). O custo de cada OS da lista (soma de quantidade × '
  'custo unitário, a regra de custoUnitarioDoItem), só das OS das lojas que '
  'quem chama acessa. custo_completo = false quando alguma peça avulsa está '
  'sem custo. Exige Caixa, OS, Estoque, Relações ou Funcionários. Nunca '
  'devolve o custo de uma peça, só o total da ordem.';

-- ===================================================================
-- 4. Os dados fiscais das peças da nota (sem custo)
-- ===================================================================

drop function if exists dados_fiscais_das_pecas(uuid[]);

create function dados_fiscais_das_pecas(p_pecas uuid[])
returns table (
  id uuid,
  codigo_interno text,
  codigo_barras text,
  descricao text,
  unidade text,
  ncm text,
  cest text,
  cfop_padrao text,
  origem text,
  cst_ou_csosn text,
  aliquota_icms numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
       (select operador_tem_permissao('ordens_servico'))
    or (select operador_tem_permissao('notas_fiscais'))
    or (select operador_tem_permissao('fornecedores'))
    or (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('relatorios'))
    or (select operador_tem_permissao('funcionarios'))
  ) or not (select operador_ativo_com_loja()) then
    raise exception 'Os dados fiscais das peças são só de quem tem Ordens de Serviço, Notas Fiscais, Fornecedores ou Estoque.'
      using errcode = '42501';
  end if;

  return query
    select p.id, p.codigo_interno, p.codigo_barras, p.descricao, p.unidade,
           p.ncm, p.cest, p.cfop_padrao, p.origem, p.cst_ou_csosn,
           p.aliquota_icms::numeric
      from pecas p
     where p.id = any (p_pecas);
end;
$$;

comment on function dados_fiscais_das_pecas(uuid[]) is
  'TR-04.1 lote 5 (0073). NCM, CEST, CFOP, origem, CST/CSOSN e alíquota de '
  'ICMS das peças pedidas, pra emitir a nota. Exige OS, Notas Fiscais, '
  'Fornecedores, Estoque, Relações ou Funcionários, e operador ativo com '
  'loja. NUNCA acrescentar preco_custo.';

-- ===================================================================
-- 5. O cadastro rápido de peça (OS e Fornecedores)
-- ===================================================================

-- Aceita as colunas do cadastro (`NovaPeca` em src/types/peca.ts: tudo menos
-- id e criado_em); qualquer outra chave é ignorada. Devolve só o id: o
-- programa já tem o resto, e quem não tem Estoque não pode ler a peça de
-- volta (é isso que o `returning` de um insert direto exigiria).
drop function if exists cadastrar_peca_rapida(jsonb);

create function cadastrar_peca_rapida(p_peca jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_peca pecas%rowtype;
  v_id uuid;
begin
  if not (
       (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('ordens_servico'))
    or (select operador_tem_permissao('fornecedores'))
  ) or not (select operador_ativo_com_loja()) then
    raise exception 'Cadastrar peça fora do Estoque é só de quem tem Ordens de Serviço ou Fornecedores.'
      using errcode = '42501';
  end if;
  if p_peca is null or jsonb_typeof(p_peca) <> 'object'
     or nullif(btrim(p_peca ->> 'descricao'), '') is null then
    raise exception 'Preencha a descrição da peça.';
  end if;

  v_peca := jsonb_populate_record(null::pecas, p_peca);

  insert into pecas (
    codigo_interno, codigo_barras, descricao, marca, modelo, aplicacao,
    unidade, preco_custo, preco_venda, ncm, cest, cfop_padrao, origem,
    cst_ou_csosn, aliquota_icms, categoria_id, prazo_garantia_dias,
    estoque_minimo, medida, indice_carga_velocidade, dot, ativo
  )
  values (
    v_peca.codigo_interno, v_peca.codigo_barras, v_peca.descricao, v_peca.marca,
    v_peca.modelo, v_peca.aplicacao, v_peca.unidade, v_peca.preco_custo,
    v_peca.preco_venda, v_peca.ncm, v_peca.cest, v_peca.cfop_padrao, v_peca.origem,
    v_peca.cst_ou_csosn, v_peca.aliquota_icms, v_peca.categoria_id,
    v_peca.prazo_garantia_dias, v_peca.estoque_minimo, v_peca.medida,
    v_peca.indice_carga_velocidade, v_peca.dot, coalesce(v_peca.ativo, true)
  )
  returning pecas.id into v_id;

  return v_id;
end;
$$;

comment on function cadastrar_peca_rapida(jsonb) is
  'TR-04.1 lote 5 (0073). Cadastra UMA peça (as colunas de NovaPeca) pra quem '
  'tem Estoque, OS ou Fornecedores — a peça avulsa que ganha cadastro e a '
  'peça nova da nota de entrada. Devolve só o id, nunca a peça.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria as funções.
revoke all on function custo_das_ordens(uuid[]) from public, anon;
revoke all on function dados_fiscais_das_pecas(uuid[]) from public, anon;
revoke all on function cadastrar_peca_rapida(jsonb) from public, anon;
grant execute on function custo_das_ordens(uuid[]) to authenticated;
grant execute on function dados_fiscais_das_pecas(uuid[]) to authenticated;
grant execute on function cadastrar_peca_rapida(jsonb) to authenticated;

insert into schema_versao (versao) values (73) on conflict do nothing;


-- -------------------------------------------------------------------
-- 0074_pecas_so_com_permissao.sql
-- -------------------------------------------------------------------

-- Sakura System — AutoCenter Edition
-- Migration 0074: Peças e Estoque só pra quem tem o módulo — a segunda metade
-- do lote 5 do TR-04.1 (tarefa #366). A primeira, a 0073, abriu a janela
-- (`pecas_janela`, `estoque_saldos`) e as funções do balcão; esta FECHA as
-- três tabelas.
--
-- O PROBLEMA. Quem não tem o módulo Estoque não vê a tela, mas a RLS de
-- `pecas` só exigia login (0015) e a de `estoque_movimentos` e
-- `contagens_estoque` só o acesso à loja (0032): com a chave que está no
-- computador dava pra ler o custo de todas as peças, mudar preço, apagar peça
-- e lançar movimento de estoque à vontade.
--
-- QUEM FICA COM O QUÊ (decisões da Sofia, issue #366):
--   • `pecas` inteira, com custo: Estoque, Relações (lucratividade) e
--     Funcionários (comissão sobre o lucro). Escrever direto: só Estoque. Fora
--     dele, cadastro de peça só pela `cadastrar_peca_rapida()` (0073).
--   • `estoque_movimentos` e `contagens_estoque`: só Estoque, na loja dele.
--     A exceção é o INSERT de movimento, com três portas estreitas, todas na
--     loja de quem grava:
--       – OS: a baixa da peça usada (motivo 'uso_em_os'). É o que
--         `adicionar_itens_ordem`, `editar_item_ordem` e `aprovar_orcamento`
--         (0071, que rodam como quem chama) e a venda de balcão gravam;
--       – OS: a devolução ao estoque (entrada com motivo 'ajuste'). É o que a
--         `editar_item_ordem` grava quando a quantidade de um item DIMINUI, e
--         o estoque inicial da peça avulsa que ganha cadastro;
--       – Fornecedores: a entrada da compra (entrada com motivo 'compra').
--     Venda, ajuste de saída e qualquer outro movimento, só com Estoque.
--     Quem não tem Estoque grava SEM `returning` (que exigiria a leitura).
--
-- ORDEM DE SUBIR. Com esta rodada, a versão anterior do programa perde, pra
-- quem não tem Estoque, a lista de peças da OS (lê `pecas` direto), o saldo e
-- a baixa com `returning`. Por isso a linha abaixo: o botão "Atualizar o banco
-- de todas as empresas" espera os computadores chegarem na versão que lê pela
-- janela. Se a versão nova sair com outro número, ajustar aqui.
-- versao-minima-do-programa: 0.9.56
--
-- Os quatro comandos em policies separadas, pelo motivo de sempre (0056):
-- uma `for all` sobrevivente reabriria o que a nova fecha, e comando sem
-- policy filtra a zero linhas sem erro nenhum (§6 item 15). A função de
-- permissão vai sempre dentro de `(select ...)`: assim o Postgres a calcula
-- uma vez por consulta, não uma vez por linha.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. pecas: lê quem tem Estoque, Relações ou Funcionários; escreve só Estoque
-- ===================================================================

drop policy if exists "pecas_acesso_temporario" on pecas;
drop policy if exists "pecas_acesso_autenticados" on pecas;
drop policy if exists "pecas_leitura" on pecas;
drop policy if exists "pecas_insercao" on pecas;
drop policy if exists "pecas_alteracao" on pecas;
drop policy if exists "pecas_exclusao" on pecas;

create policy "pecas_leitura" on pecas
  for select to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('relatorios'))
    or (select operador_tem_permissao('funcionarios'))
  );

create policy "pecas_insercao" on pecas
  for insert to authenticated
  with check ((select operador_tem_permissao('estoque')));

create policy "pecas_alteracao" on pecas
  for update to authenticated
  using ((select operador_tem_permissao('estoque')))
  with check ((select operador_tem_permissao('estoque')));

create policy "pecas_exclusao" on pecas
  for delete to authenticated
  using ((select operador_tem_permissao('estoque')));

-- ===================================================================
-- 2. estoque_movimentos: só Estoque, menos as três portas de INSERT
-- ===================================================================

drop policy if exists "estoque_movimentos_acesso_temporario" on estoque_movimentos;
drop policy if exists "estoque_movimentos_acesso_autenticados" on estoque_movimentos;
drop policy if exists "estoque_movimentos_acesso_por_loja" on estoque_movimentos;
drop policy if exists "estoque_movimentos_leitura" on estoque_movimentos;
drop policy if exists "estoque_movimentos_insercao" on estoque_movimentos;
drop policy if exists "estoque_movimentos_alteracao" on estoque_movimentos;
drop policy if exists "estoque_movimentos_exclusao" on estoque_movimentos;

create policy "estoque_movimentos_leitura" on estoque_movimentos
  for select to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "estoque_movimentos_insercao" on estoque_movimentos
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('estoque'))
      or ((select operador_tem_permissao('ordens_servico')) and motivo = 'uso_em_os')
      or ((select operador_tem_permissao('ordens_servico')) and motivo = 'ajuste' and tipo = 'entrada')
      or ((select operador_tem_permissao('fornecedores')) and motivo = 'compra' and tipo = 'entrada')
    )
  );

create policy "estoque_movimentos_alteracao" on estoque_movimentos
  for update to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  )
  with check (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "estoque_movimentos_exclusao" on estoque_movimentos
  for delete to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

-- ===================================================================
-- 3. contagens_estoque: só Estoque, na loja dele
-- ===================================================================

drop policy if exists "contagens_estoque_acesso_autenticados" on contagens_estoque;
drop policy if exists "contagens_estoque_acesso_por_loja" on contagens_estoque;
drop policy if exists "contagens_estoque_leitura" on contagens_estoque;
drop policy if exists "contagens_estoque_insercao" on contagens_estoque;
drop policy if exists "contagens_estoque_alteracao" on contagens_estoque;
drop policy if exists "contagens_estoque_exclusao" on contagens_estoque;

create policy "contagens_estoque_leitura" on contagens_estoque
  for select to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "contagens_estoque_insercao" on contagens_estoque
  for insert to authenticated
  with check (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "contagens_estoque_alteracao" on contagens_estoque
  for update to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  )
  with check (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "contagens_estoque_exclusao" on contagens_estoque
  for delete to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

insert into schema_versao (versao) values (74) on conflict do nothing;
