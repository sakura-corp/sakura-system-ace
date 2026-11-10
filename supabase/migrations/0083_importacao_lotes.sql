-- Sakura System — AutoCenter Edition
-- Migration 0083: os lotes de importação de clientes e veículos, e o
-- "desfazer" (tarefa #457, FN-15 parte 1).
--
-- O PROBLEMA. Uma loja que já usa outro sistema não troca pra recadastrar
-- 2.000 clientes na mão. O programa passa a importar a planilha de clientes e
-- veículos que o sistema antigo exporta — e uma importação errada (coluna
-- trocada, arquivo errado) precisa ter volta sem ninguém apagar cliente por
-- cliente.
--
-- O DESENHO.
--   • Cada importação é um LOTE (`importacao_lotes`): quem importou, quando, o
--     nome do arquivo, quantas linhas e quantos clientes/veículos entraram, e
--     se foi desfeito (quando e por quem). Sem `loja_id`: `clientes` e
--     `veiculos` são da empresa inteira, e o lote também.
--   • `clientes` e `veiculos` ganham `importacao_lote_id` (opcional): a marca
--     de "veio daquele lote". Cadastro feito à mão fica com ela vazia.
--   • `desfazer_importacao(lote)` apaga o que veio do lote e DEVOLVE o que não
--     pôde apagar, com o motivo (seção 4).
--   • "Já existe" só pula (decisão 2 da Sofia, 10/11): o lote nunca altera um
--     cliente que já estava lá, então desfazer é só apagar o que ele criou.
--
-- QUEM PODE (decisão 3 da Sofia, 10/11). Importar é gravação em massa de dado
-- pessoal: só o ADMINISTRADOR, com o módulo Clientes. Ler, criar e alterar
-- lote exige as duas coisas; apagar lote, ninguém (o histórico fica, e não há
-- policy de delete — lacuna declarada em supabase/testes-rls/). Os clientes e
-- veículos em si continuam gravados pelas policies que já existem (0069): a
-- marca do lote é só mais uma coluna.
--
-- ORDEM DE SUBIR. Só soma (tabela, coluna opcional, função): o programa
-- antigo nem sabe que elas existem. Por isso NÃO declara versão mínima do
-- programa, e sobe antes da versão, como as outras.
--
-- Idempotente: seguro rodar de novo. A coluna nova usa `add column if not
-- exists` (dropar a coluna apagaria a marca de todo lote já importado); o
-- resto segue a regra de dropar o nome final antes de criar.

-- ===================================================================
-- 1. a tabela dos lotes
-- ===================================================================

create table if not exists importacao_lotes (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null default 'clientes',
  nome_arquivo     text,
  operador_id      uuid default auth.uid() references operadores (id) on delete set null,
  criado_em        timestamptz not null default now(),
  total_linhas     int not null default 0,
  clientes_criados int not null default 0,
  veiculos_criados int not null default 0,
  desfeito_em      timestamptz,
  desfeito_por     uuid references operadores (id) on delete set null
);

-- As partes 2 (peças) e 3 (contas a receber) da importação vão somar tipos a
-- esta lista, cada uma na sua migration.
alter table importacao_lotes drop constraint if exists ck_importacao_lotes_tipo;
alter table importacao_lotes
  add constraint ck_importacao_lotes_tipo check (tipo in ('clientes'));

comment on table importacao_lotes is
  'Cada importação por planilha (#457). Desfazer é pela função desfazer_importacao; o lote nunca é apagado.';

-- ===================================================================
-- 2. a marca do lote em clientes e veículos
-- ===================================================================
-- `on delete set null`: o programa nunca apaga lote, mas, se alguém apagar
-- um pelo SQL Editor, o cliente fica — perde só a marca. Um `cascade` aqui
-- apagaria os clientes junto, calado.

alter table clientes
  add column if not exists importacao_lote_id uuid
  references importacao_lotes (id) on delete set null;
alter table veiculos
  add column if not exists importacao_lote_id uuid
  references importacao_lotes (id) on delete set null;

-- Quase todo cliente tem a marca vazia: o índice só guarda os que têm.
drop index if exists clientes_importacao_lote_id_idx;
create index clientes_importacao_lote_id_idx on clientes (importacao_lote_id)
  where importacao_lote_id is not null;
drop index if exists veiculos_importacao_lote_id_idx;
create index veiculos_importacao_lote_id_idx on veiculos (importacao_lote_id)
  where importacao_lote_id is not null;

-- As duas chaves que apontam pra clientes/veículos e não tinham índice. Sem
-- elas, cada veículo apagado faz o banco ler TODAS as OS (pra cumprir o
-- `on delete set null`), e cada cliente, todas as contas. Medido com 2.000
-- importados contra 20 mil OS: o desfazer caiu de 2,3 s pra 0,27 s. Servem
-- também pra apagar veículo e cliente à mão, e pra ficha do veículo.
drop index if exists ordens_servico_veiculo_id_idx;
create index ordens_servico_veiculo_id_idx on ordens_servico (veiculo_id)
  where veiculo_id is not null;
drop index if exists contas_receber_cliente_id_idx;
create index contas_receber_cliente_id_idx on contas_receber (cliente_id)
  where cliente_id is not null;

-- ===================================================================
-- 3. RLS: só o administrador com o módulo Clientes
-- ===================================================================
-- Uma policy por comando (0056): uma `for all` sobrevivente reabriria o que
-- estas fecham. As funções vão dentro de `(select ...)`: o Postgres as calcula
-- uma vez por consulta, não uma por linha. Sem policy de delete, de propósito.

alter table importacao_lotes enable row level security;

drop policy if exists "importacao_lotes_leitura" on importacao_lotes;
drop policy if exists "importacao_lotes_insercao" on importacao_lotes;
drop policy if exists "importacao_lotes_alteracao" on importacao_lotes;
drop policy if exists "importacao_lotes_exclusao" on importacao_lotes;

create policy "importacao_lotes_leitura" on importacao_lotes
  for select to authenticated
  using ((select operador_tem_permissao('clientes'))
         and (select operador_atual_e_admin_de_alguma_loja()));

-- O lote nasce em nome de quem está logado, nunca de outra pessoa.
create policy "importacao_lotes_insercao" on importacao_lotes
  for insert to authenticated
  with check ((select operador_tem_permissao('clientes'))
              and (select operador_atual_e_admin_de_alguma_loja())
              and operador_id = (select auth.uid()));

create policy "importacao_lotes_alteracao" on importacao_lotes
  for update to authenticated
  using ((select operador_tem_permissao('clientes'))
         and (select operador_atual_e_admin_de_alguma_loja()))
  with check ((select operador_tem_permissao('clientes'))
              and (select operador_atual_e_admin_de_alguma_loja()));

-- ===================================================================
-- 4. desfazer_importacao: apaga o lote e diz o que ficou
-- ===================================================================
-- Decisão 4 da Sofia (10/11): desfaz o que der e lista o que ficou, com o
-- motivo. Devolve
--   { "veiculos_apagados": n, "clientes_apagados": n,
--     "mantidos": [ { "tipo": "cliente"|"veiculo", "id", "nome", "motivo" } ] }
-- ("nome" é o nome do cliente, ou a placa do veículo).
--
-- O PERIGO SÃO AS CHAVES QUE NÃO DÃO ERRO. `veiculos.cliente_id` é `on delete
-- cascade` (0001): apagar um cliente do lote levaria junto um veículo
-- cadastrado à mão depois. `ordens_servico.veiculo_id` é `on delete set null`
-- (0005): apagar um veículo do lote que ganhou OS deixaria a OS sem veículo.
-- Nenhum dos dois avisa. Por isso a função CONFERE POR EXISTÊNCIA antes de
-- apagar, e só pega o `foreign_key_violation` como rede de segurança.
--
-- E A LISTA DE CHAVES VEM DO PRÓPRIO BANCO (pg_constraint), não escrita aqui:
-- hoje são `ordens_servico` (cliente e veículo) e `contas_receber` (cliente),
-- mas uma tabela nova que aponte pra `clientes` ou `veiculos` (agendamento,
-- venda...) entra na conferência sozinha, sem ninguém lembrar desta função. O
-- teste prova isso com uma tabela inventada de `on delete set null`.
--
-- POR QUE `security definer` (docs/licoes.md, itens 13, 69, 74 e 75). Com
-- `security invoker`, a conferência obedeceria à RLS de quem chama — e um
-- admin de uma loja só NÃO ENXERGA a OS da outra loja. A conferência diria
-- "sem OS", o `delete` passaria, e o `on delete set null` (que roda como dono
-- da tabela, por cima da RLS) tiraria o veículo da OS da outra loja, calado.
-- O teste monta exatamente esse caso (checagem 7c). Como `definer` passa por
-- cima da RLS, a função confere a permissão ela mesma, logo na entrada (as
-- mesmas duas regras das policies do lote), só mexe em linha marcada com
-- AQUELE lote, tem `search_path` fixo e não é executável pelo anônimo.
--
-- CORRIDA. Os clientes e veículos do lote são travados (`for update`) antes de
-- conferir: uma OS ou um veículo novo apontando pra eles, gravado ao mesmo
-- tempo, espera o desfazer terminar (e então falha pela chave, porque a linha
-- sumiu) — nunca entra entre a conferência e o `delete`.
--
-- O que fica continua com a marca do lote: dá pra saber de onde veio.

drop function if exists desfazer_importacao(uuid);

create function desfazer_importacao(p_lote uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote              importacao_lotes%rowtype;
  v_mantidos          jsonb := '[]'::jsonb;
  v_veiculos_ficam    uuid[] := '{}';
  v_clientes_ficam    uuid[] := '{}';
  v_veiculos_apagados int := 0;
  v_clientes_apagados int := 0;
  v_ids               uuid[];
  v_motivo            text;
  fk                  record;
  r                   record;
begin
  if not (operador_tem_permissao('clientes') and operador_atual_e_admin_de_alguma_loja()) then
    raise exception 'Só o administrador, com o módulo Clientes, pode desfazer uma importação.'
      using errcode = '42501';
  end if;

  -- a trava do lote também impede dois "desfazer" ao mesmo tempo
  select * into v_lote from importacao_lotes where id = p_lote for update;
  if not found then
    raise exception 'Essa importação não existe.' using errcode = 'P0002';
  end if;
  if v_lote.desfeito_em is not null then
    raise exception 'Essa importação já foi desfeita.';
  end if;

  perform 1 from veiculos where importacao_lote_id = p_lote for update;
  perform 1 from clientes where importacao_lote_id = p_lote for update;

  -- ---- veículos: fica o que alguma tabela aponta ---------------------------
  -- (a OS primeiro, pra que o motivo dela ganhe de um genérico)
  for fk in
    select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'veiculos'::regclass
       and cardinality(c.conkey) = 1
     order by (c.conrelid = 'ordens_servico'::regclass) desc, c.conrelid::regclass::text, a.attname
  loop
    execute format(
      'select coalesce(array_agg(distinct t.%1$I), ''{}'') from %2$s t
        where t.%1$I in (select v.id from veiculos v where v.importacao_lote_id = $1)',
      fk.coluna, fk.tabela)
      into v_ids using p_lote;
    v_motivo := case fk.tabela::text
                  when 'ordens_servico' then 'já tem ordem de serviço'
                  else 'é usado em ' || fk.tabela::text
                end;
    for r in
      select v.id, v.placa from veiculos v
       where v.id = any (v_ids) and not (v.id = any (v_veiculos_ficam))
       order by v.placa
    loop
      v_veiculos_ficam := v_veiculos_ficam || r.id;
      v_mantidos := v_mantidos || jsonb_build_object(
        'tipo', 'veiculo', 'id', r.id, 'nome', r.placa, 'motivo', v_motivo);
    end loop;
  end loop;

  for r in
    select v.id, v.placa from veiculos v
     where v.importacao_lote_id = p_lote and not (v.id = any (v_veiculos_ficam))
     order by v.placa
  loop
    begin
      delete from veiculos where id = r.id;
      v_veiculos_apagados := v_veiculos_apagados + 1;
    exception when foreign_key_violation or restrict_violation then
      v_veiculos_ficam := v_veiculos_ficam || r.id;
      v_mantidos := v_mantidos || jsonb_build_object(
        'tipo', 'veiculo', 'id', r.id, 'nome', r.placa, 'motivo', 'está em uso em outro cadastro');
    end;
  end loop;

  -- ---- clientes: fica o que alguma tabela aponta ---------------------------
  -- (`veiculos` fica de fora daqui: é tratado logo abaixo, com motivo próprio)
  for fk in
    select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'clientes'::regclass
       and c.conrelid <> 'veiculos'::regclass
       and cardinality(c.conkey) = 1
     order by (c.conrelid = 'ordens_servico'::regclass) desc,
              (c.conrelid = 'contas_receber'::regclass) desc,
              c.conrelid::regclass::text, a.attname
  loop
    execute format(
      'select coalesce(array_agg(distinct t.%1$I), ''{}'') from %2$s t
        where t.%1$I in (select c.id from clientes c where c.importacao_lote_id = $1)',
      fk.coluna, fk.tabela)
      into v_ids using p_lote;
    v_motivo := case fk.tabela::text
                  when 'ordens_servico' then 'já tem ordem de serviço'
                  when 'contas_receber' then 'tem conta a receber'
                  else 'é usado em ' || fk.tabela::text
                end;
    for r in
      select c.id, c.nome from clientes c
       where c.id = any (v_ids) and not (c.id = any (v_clientes_ficam))
       order by c.nome
    loop
      v_clientes_ficam := v_clientes_ficam || r.id;
      v_mantidos := v_mantidos || jsonb_build_object(
        'tipo', 'cliente', 'id', r.id, 'nome', r.nome, 'motivo', v_motivo);
    end loop;
  end loop;

  -- cliente com veículo que não veio deste lote (o cascade levaria o veículo)
  for r in
    select c.id, c.nome from clientes c
     where c.importacao_lote_id = p_lote
       and not (c.id = any (v_clientes_ficam))
       and exists (select 1 from veiculos v
                    where v.cliente_id = c.id
                      and v.importacao_lote_id is distinct from p_lote)
     order by c.nome
  loop
    v_clientes_ficam := v_clientes_ficam || r.id;
    v_mantidos := v_mantidos || jsonb_build_object(
      'tipo', 'cliente', 'id', r.id, 'nome', r.nome,
      'motivo', 'tem veículo cadastrado fora da importação');
  end loop;

  -- cliente cujo veículo deste lote ficou (os outros já foram apagados acima)
  for r in
    select c.id, c.nome, string_agg(v.placa, ', ' order by v.placa) as placas
      from clientes c
      join veiculos v on v.cliente_id = c.id
     where c.importacao_lote_id = p_lote
       and not (c.id = any (v_clientes_ficam))
     group by c.id, c.nome
     order by c.nome
  loop
    v_clientes_ficam := v_clientes_ficam || r.id;
    v_mantidos := v_mantidos || jsonb_build_object(
      'tipo', 'cliente', 'id', r.id, 'nome', r.nome,
      'motivo', 'o veículo dele (' || r.placas || ') ficou');
  end loop;

  for r in
    select c.id, c.nome from clientes c
     where c.importacao_lote_id = p_lote and not (c.id = any (v_clientes_ficam))
     order by c.nome
  loop
    begin
      delete from clientes where id = r.id;
      v_clientes_apagados := v_clientes_apagados + 1;
    exception when foreign_key_violation or restrict_violation then
      v_clientes_ficam := v_clientes_ficam || r.id;
      v_mantidos := v_mantidos || jsonb_build_object(
        'tipo', 'cliente', 'id', r.id, 'nome', r.nome, 'motivo', 'está em uso em outro cadastro');
    end;
  end loop;

  update importacao_lotes
     set desfeito_em = now(), desfeito_por = auth.uid()
   where id = p_lote;

  return jsonb_build_object(
    'veiculos_apagados', v_veiculos_apagados,
    'clientes_apagados', v_clientes_apagados,
    'mantidos', v_mantidos);
end;
$$;

comment on function desfazer_importacao(uuid) is
  '#457 (0083). Apaga os veículos e clientes do lote que não estão em uso e '
  'devolve o que ficou, com o motivo. Só admin com o módulo Clientes. '
  'security definer: a conferência precisa ver as OS de todas as lojas.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke, o
-- anônimo chamaria a função (ela recusaria por dentro, mas a porta é o grant).
revoke all on function desfazer_importacao(uuid) from public, anon;
grant execute on function desfazer_importacao(uuid) to authenticated;

insert into schema_versao (versao) values (83) on conflict do nothing;
