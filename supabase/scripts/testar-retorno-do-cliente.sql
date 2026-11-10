-- Sakura System — AutoCenter Edition
-- TESTE da migration 0083 (o retorno do cliente, FN-06, #381). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste (dentro de uma transação que é desfeita no fim, então não sobra nada).
--
-- A promessa:
--   • `servicos` ganhou `intervalo_dias` e `intervalo_km`, inteiros e
--     opcionais (sem padrão: serviço sem valor não gera retorno);
--   • `clientes` ganhou `nao_avisar`, obrigatório, padrão falso: cliente novo
--     nasce "pode avisar";
--   • a trava `ck_servicos_intervalo` (com o nome que a tela traduz, em
--     src/lib/errors.ts) recusa intervalo zero ou negativo, em dias e em km,
--     e aceita vazio e positivo;
--   • a migration NÃO preenche intervalo em serviço nenhum, nem mexe no que a
--     loja já preencheu ao rodar de novo;
--   • a janela `ordens_servico_clientes` entrega o `servico_id` de cada item
--     (nulo no serviço digitado à mão), pra quem tem só o módulo Clientes,
--     continua sem orçamento nem recusado, sem custo nem observação, e
--     continua fechada pra quem não tem Clientes nem OS;
--   • rodar a migration de novo não quebra nem duplica a trava.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: `npm run test:sql -- testar-retorno-do-cliente` (ver o
-- cabeçalho de scripts/testar-sql.mjs), depois da instalação completa.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

\set ON_ERROR_STOP 1

begin;

-- ===================================================================
-- Antes da segunda rodada: a instalação completa JÁ rodou a 0083.
-- ===================================================================
do $$
declare
  n int;
begin
  -- 0. a instalação não deu intervalo a serviço nenhum (nem aos que ela
  --    semeia) e não marcou cliente nenhum como "não avisar"
  select count(*) into n from servicos where intervalo_dias is not null or intervalo_km is not null;
  if n <> 0 then
    raise exception 'FALHOU 0: a instalação deixou % serviço(s) com intervalo preenchido', n;
  end if;
  select count(*) into n from clientes where nao_avisar;
  if n <> 0 then
    raise exception 'FALHOU 0: a instalação deixou % cliente(s) com "não avisar"', n;
  end if;

  -- O que a loja já preencheu antes da segunda rodada: tem que sobreviver.
  insert into servicos (id, descricao, ativo, intervalo_dias, intervalo_km) values
    ('03810000-0000-0000-0000-0000000000a1', 'Alinhamento já configurado (#381)', true, 180, 10000),
    ('03810000-0000-0000-0000-0000000000a2', 'Serviço sem intervalo (#381)',     true, null, null);
  insert into clientes (id, nome, nao_avisar) values
    ('03810000-0000-0000-0000-0000000000c1', 'Cliente que pediu silêncio (#381)', true);
end;
$$;

-- A segunda rodada: idempotente, sem erro.
\ir ../migrations/0083_retorno_do_cliente.sql

do $$
declare
  loja      uuid := '03810000-0000-0000-0000-00000000000a';
  o_cli     uuid := '03811111-0000-0000-0000-000000000001';  -- só Clientes
  o_painel  uuid := '03811111-0000-0000-0000-000000000002';  -- só o Início
  cliente   uuid := '03812222-0000-0000-0000-000000000001';
  veiculo   uuid := '03813333-0000-0000-0000-000000000001';
  s_alin    uuid := '03814444-0000-0000-0000-000000000001';
  os_fat    uuid := '03815555-0000-0000-0000-000000000001';  -- faturada
  os_orc    uuid := '03815555-0000-0000-0000-000000000002';  -- orçamento aberto
  item_cad  uuid := '03816666-0000-0000-0000-000000000001';  -- serviço do cadastro
  item_mao  uuid := '03816666-0000-0000-0000-000000000002';  -- serviço digitado à mão
  item_orc  uuid := '03816666-0000-0000-0000-000000000003';  -- serviço do orçamento
  n         int;
  obtido    text;
  valor     int;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 83) then
    raise exception 'FALHOU 1: a 0083 não gravou a versão 83';
  end if;

  -- 2. as colunas, com o tipo, o "pode ficar vazio" e o padrão certos
  select string_agg(format('%s:%s:%s:%s', column_name, data_type, is_nullable,
                           coalesce(column_default, '-')), ',' order by column_name)
    into obtido
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'servicos'
     and column_name in ('intervalo_dias', 'intervalo_km');
  if obtido is distinct from 'intervalo_dias:integer:YES:-,intervalo_km:integer:YES:-' then
    raise exception 'FALHOU 2: as colunas de intervalo em servicos estão [%]', obtido;
  end if;
  select format('%s:%s:%s', data_type, is_nullable, column_default)
    into obtido
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'clientes'
     and column_name = 'nao_avisar';
  if obtido is distinct from 'boolean:NO:false' then
    raise exception 'FALHOU 2: a coluna clientes.nao_avisar está [%]', obtido;
  end if;

  -- 3. a trava existe uma vez só (a segunda rodada não duplicou)
  select count(*) into n
    from pg_constraint c
   where c.conrelid = 'servicos'::regclass
     and c.conname = 'ck_servicos_intervalo';
  if n <> 1 then
    raise exception 'FALHOU 3: esperava 1 trava ck_servicos_intervalo, achou %', n;
  end if;

  -- 4. a segunda rodada não apagou o que a loja já tinha preenchido, nem
  --    inventou intervalo pro serviço vazio
  select count(*) into n from servicos
   where id = '03810000-0000-0000-0000-0000000000a1'
     and intervalo_dias = 180 and intervalo_km = 10000;
  if n <> 1 then
    raise exception 'FALHOU 4: rodar de novo mexeu no intervalo que a loja já tinha preenchido';
  end if;
  select count(*) into n from servicos
   where intervalo_dias is not null or intervalo_km is not null;
  if n <> 1 then
    raise exception 'FALHOU 4: depois da segunda rodada, % serviço(s) com intervalo (esperava só o preenchido no teste)', n;
  end if;
  if not (select nao_avisar from clientes where id = '03810000-0000-0000-0000-0000000000c1') then
    raise exception 'FALHOU 4: rodar de novo desmarcou o "não avisar" de um cliente';
  end if;

  -- ---- preparo -------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja (teste retorno do cliente)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into auth.users (id) values (o_cli), (o_painel) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_cli,    't381_cli',    'Só Clientes', false, array['painel','clientes'], true),
    (o_painel, 't381_painel', 'Só o Início', false, array['painel'],            true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values (o_cli, loja), (o_painel, loja)
    on conflict do nothing;

  -- 5. cliente novo nasce "pode avisar"
  insert into clientes (id, nome) values (cliente, 'Cliente do retorno (#381)');
  if (select nao_avisar from clientes where id = cliente) is distinct from false then
    raise exception 'FALHOU 5: cliente novo não nasceu com nao_avisar = false';
  end if;
  -- e não aceita ficar vazio
  begin
    update clientes set nao_avisar = null where id = cliente;
    raise exception 'FALHOU 5: nao_avisar aceitou ficar vazio';
  exception
    when not_null_violation then null;
  end;

  -- 6. serviço novo nasce sem intervalo (não gera retorno)
  insert into servicos (id, descricao, ativo) values (s_alin, 'Alinhamento de teste (#381)', true);
  if exists (select 1 from servicos where id = s_alin
                and (intervalo_dias is not null or intervalo_km is not null)) then
    raise exception 'FALHOU 6: serviço novo nasceu com intervalo';
  end if;

  -- 7. a trava recusa zero e negativo, em dias e em km, pelo nome certo
  foreach valor in array array[0, -1, -180] loop
    begin
      update servicos set intervalo_dias = valor where id = s_alin;
      raise exception 'FALHOU 7: a trava deixou o intervalo em dias ficar %', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_servicos_intervalo%' then
          raise exception 'FALHOU 7: esperava a trava ck_servicos_intervalo, veio: %', sqlerrm;
        end if;
    end;
    begin
      update servicos set intervalo_km = valor where id = s_alin;
      raise exception 'FALHOU 7: a trava deixou o intervalo em km ficar %', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_servicos_intervalo%' then
          raise exception 'FALHOU 7: esperava a trava ck_servicos_intervalo, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- 7b. e o teto: mais de 10 anos ou de 1 milhão de km (número que só sai de
  -- erro de digitação e estragaria a conta da data prevista)
  begin
    update servicos set intervalo_dias = 3651 where id = s_alin;
    raise exception 'FALHOU 7b: a trava deixou o intervalo em dias passar de 3650';
  exception
    when check_violation then
      if sqlerrm not like '%ck_servicos_intervalo%' then
        raise exception 'FALHOU 7b: esperava a trava ck_servicos_intervalo, veio: %', sqlerrm;
      end if;
  end;
  begin
    update servicos set intervalo_km = 1000001 where id = s_alin;
    raise exception 'FALHOU 7b: a trava deixou o intervalo em km passar de 1.000.000';
  exception
    when check_violation then
      if sqlerrm not like '%ck_servicos_intervalo%' then
        raise exception 'FALHOU 7b: esperava a trava ck_servicos_intervalo, veio: %', sqlerrm;
      end if;
  end;
  update servicos set intervalo_dias = 3650, intervalo_km = 1000000 where id = s_alin;

  -- 8. e aceita positivo e vazio, em qualquer combinação
  update servicos set intervalo_dias = 180, intervalo_km = null  where id = s_alin;
  update servicos set intervalo_dias = null, intervalo_km = 10000 where id = s_alin;
  update servicos set intervalo_dias = 1,   intervalo_km = 1     where id = s_alin;
  update servicos set intervalo_dias = null, intervalo_km = null where id = s_alin;
  update servicos set intervalo_dias = 180, intervalo_km = 10000 where id = s_alin;
  if not exists (select 1 from servicos where id = s_alin and intervalo_dias = 180 and intervalo_km = 10000) then
    raise exception 'FALHOU 8: o intervalo positivo não ficou gravado';
  end if;

  -- ---- uma OS faturada e um orçamento, com serviço do cadastro e à mão ----
  insert into veiculos (id, cliente_id, placa, marca, modelo) values
    (veiculo, cliente, 'TST0381', 'Marca de Teste', 'Modelo de Teste');
  insert into ordens_servico (id, loja_id, cliente_id, veiculo_id, km_entrada,
                              descricao_problema, status, data_fechamento) values
    (os_fat, loja, cliente, veiculo, 45000, 'Observação secreta (#381)', 'faturada', now()),
    (os_orc, loja, cliente, veiculo, 45000, null,                        'orcamento', null);
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, servico_id, descricao,
                                    quantidade, preco_unitario, desconto, custo_unitario) values
    (item_cad, os_fat, 'servico', s_alin, 'Alinhamento',            1, 80.00, 0, null),
    (item_mao, os_fat, 'servico', null,   'Serviço digitado à mão', 1, 30.00, 0, 12.00),
    (item_orc, os_orc, 'servico', s_alin, 'Alinhamento orçado',     1, 80.00, 0, null);

  set local role authenticated;

  -- 9. quem tem só Clientes lê a OS faturada pela janela, com o servico_id
  --    de cada item: o do cadastro aponta pro serviço, o digitado à mão vem
  --    nulo (e com a chave presente)
  perform set_config('request.jwt.claim.sub', o_cli::text, true);
  select count(*) into n
    from ordens_servico_clientes v, jsonb_array_elements(v.itens) e
   where v.id = os_fat
     and (e->>'id')::uuid = item_cad
     and (e->>'servico_id')::uuid = s_alin;
  if n <> 1 then
    raise exception 'FALHOU 9: a janela não entregou o servico_id do serviço do cadastro';
  end if;
  select count(*) into n
    from ordens_servico_clientes v, jsonb_array_elements(v.itens) e
   where v.id = os_fat
     and (e->>'id')::uuid = item_mao
     and e ? 'servico_id'
     and e->'servico_id' = 'null'::jsonb;
  if n <> 1 then
    raise exception 'FALHOU 9: o serviço digitado à mão não veio com servico_id nulo na janela';
  end if;
  -- e o km e o veículo, que a conta do retorno também usa
  select count(*) into n
    from ordens_servico_clientes v
   where v.id = os_fat and v.km_entrada = 45000 and v.veiculo_id = veiculo
     and v.cliente_id = cliente and v.data_fechamento is not null;
  if n <> 1 then
    raise exception 'FALHOU 9: a janela não trouxe o km, o veículo, o cliente e a data da OS faturada';
  end if;

  -- 10. as chaves de cada item: as de antes mais o servico_id, e nada de
  --     custo nem observação
  select string_agg(k, ',' order by k) into obtido
    from (select distinct jsonb_object_keys(e) k
            from ordens_servico_clientes v, jsonb_array_elements(v.itens) e
           where v.id = os_fat) t;
  if obtido is distinct from 'desconto,descricao,id,peca_id,prazo_garantia_dias,preco_unitario,quantidade,servico_id,tipo' then
    raise exception 'FALHOU 10: os itens da janela de clientes têm as chaves [%]', obtido;
  end if;
  select count(*) into n
    from ordens_servico_clientes v
   where v.id = os_fat and v::text like '%Observação secreta%';
  if n <> 0 then
    raise exception 'FALHOU 10: a observação da OS vazou pela janela de clientes';
  end if;

  -- 11. a janela continua sem orçamento
  select count(*) into n from ordens_servico_clientes where id = os_orc;
  if n <> 0 then
    raise exception 'FALHOU 11: a janela de clientes entregou o orçamento';
  end if;

  -- 12. e continua fechada pra quem não tem Clientes nem OS
  perform set_config('request.jwt.claim.sub', o_painel::text, true);
  select count(*) into n from ordens_servico_clientes;
  if n <> 0 then
    raise exception 'FALHOU 12: quem só tem o Início leu % OS na janela de clientes', n;
  end if;

  reset role;

  -- 13. a janela continua do jeito da 0075: dono, barreira e só SELECT
  select coalesce(array_to_string(c.reloptions, ','), '') into obtido
    from pg_class c where c.relname = 'ordens_servico_clientes' and c.relkind = 'v';
  if obtido not like '%security_invoker=false%' or obtido not like '%security_barrier=true%' then
    raise exception 'FALHOU 13: a janela de clientes está com as opções [%]', obtido;
  end if;
  if has_table_privilege('anon', 'public.ordens_servico_clientes', 'SELECT')
     or has_table_privilege('authenticated', 'public.ordens_servico_clientes', 'INSERT')
     or not has_table_privilege('authenticated', 'public.ordens_servico_clientes', 'SELECT') then
    raise exception 'FALHOU 13: os direitos da janela de clientes mudaram (anon sem nada, logado só SELECT)';
  end if;
end;
$$;

rollback;

\echo TODAS AS CHECAGENS PASSARAM
