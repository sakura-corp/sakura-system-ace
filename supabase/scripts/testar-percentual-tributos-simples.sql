-- Sakura System — AutoCenter Edition
-- TESTE da migration 0078 (o percentual dos tributos do Simples, #866). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste (e apaga o que gravou no fim).
--
-- A promessa:
--   • a coluna `percentual_tributos_simples` existe, é numeric(5,2) e aceita
--     vazio (vazio = a nota vai com 0);
--   • a trava aceita 0, 6,5 e 100 — e recusa -1 e 100,01, pela trava com o
--     nome que a tela traduz (src/lib/errors.ts);
--   • rodar a migration de novo não quebra nem duplica a trava.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql
-- (depois da instalação completa), ou `npm run test:sql -- testar-percentual-tributos-simples`.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0078; esta segunda rodada é a de
-- "rodar de novo" (idempotente).
\ir ../migrations/0078_percentual_tributos_simples.sql

do $$
declare
  loja    uuid := '08660000-0000-0000-0000-00000000000a';
  valor   numeric;
  n       int;
  proibido numeric;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 78) then
    raise exception 'FALHOU 1: a 0078 não gravou a versão 78';
  end if;

  -- 2. a coluna existe, numeric(5,2), aceita vazio
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'configuracoes_fiscais_loja'
     and column_name = 'percentual_tributos_simples'
     and data_type = 'numeric'
     and numeric_precision = 5
     and numeric_scale = 2
     and is_nullable = 'YES';
  if n <> 1 then
    raise exception 'FALHOU 2: a coluna percentual_tributos_simples não existe como numeric(5,2) opcional';
  end if;

  -- 3. a trava existe uma vez só (a segunda rodada não duplicou)
  select count(*) into n
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
   where t.relname = 'configuracoes_fiscais_loja'
     and c.conname = 'ck_config_fiscal_percentual_tributos_simples';
  if n <> 1 then
    raise exception 'FALHOU 3: esperava 1 trava ck_config_fiscal_percentual_tributos_simples, achou %', n;
  end if;

  -- ---- preparo -------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja (teste percentual do Simples)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into configuracoes_fiscais_loja (loja_id) values (loja) on conflict (loja_id) do nothing;

  -- 4. linha nova nasce vazia
  select percentual_tributos_simples into valor from configuracoes_fiscais_loja where loja_id = loja;
  if valor is not null then
    raise exception 'FALHOU 4: a linha nova devia nascer vazia, veio %', valor;
  end if;

  -- 5. aceita o que é de verdade: 6,5, 0, 100 e vazio de novo
  update configuracoes_fiscais_loja set percentual_tributos_simples = 6.5 where loja_id = loja;
  select percentual_tributos_simples into valor from configuracoes_fiscais_loja where loja_id = loja;
  if valor is distinct from 6.50 then
    raise exception 'FALHOU 5: gravou 6,5 e voltou %', valor;
  end if;
  update configuracoes_fiscais_loja set percentual_tributos_simples = 0 where loja_id = loja;
  update configuracoes_fiscais_loja set percentual_tributos_simples = 100 where loja_id = loja;
  update configuracoes_fiscais_loja set percentual_tributos_simples = null where loja_id = loja;

  -- 6. recusa o impossível, pela trava certa
  foreach proibido in array array[-1, 100.01]::numeric[] loop
    begin
      update configuracoes_fiscais_loja set percentual_tributos_simples = proibido where loja_id = loja;
      raise exception 'FALHOU 6: a trava deixou passar %', proibido;
    exception
      when check_violation then
        if sqlerrm not like '%ck_config_fiscal_percentual_tributos_simples%' then
          raise exception 'FALHOU 6: esperava a trava ck_config_fiscal_percentual_tributos_simples, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- ---- limpeza ------------------------------------------------------------
  delete from depositos where loja_id = loja;
  delete from configuracoes_garantia where loja_id = loja;
  delete from configuracoes_fiscais_loja where loja_id = loja;
  delete from configuracoes_painel_inicio where loja_id = loja;
  delete from configuracoes_juros_parcelas where loja_id = loja;
  delete from lojas where id = loja;
  delete from auditoria;
end;
$$;

\echo TODAS AS CHECAGENS PASSARAM
