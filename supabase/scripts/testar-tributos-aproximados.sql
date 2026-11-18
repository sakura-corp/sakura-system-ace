-- Sakura System — AutoCenter Edition
-- TESTE da migration 0089 (os tributos aproximados na nota, #1040). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste (e apaga o que gravou no fim).
--
-- A promessa:
--   • as colunas `percentual_tributos_pecas` e `percentual_estimativa_icms_st`
--     existem, são numeric(5,2) e aceitam vazio (vazio = a nota sai sem a
--     linha); a `competencia_tributos_confirmada` existe, é date e aceita
--     vazio;
--   • cada trava aceita 0, 100 e vazio — e recusa -1 e 100,01, pela trava com
--     o nome que a tela traduz (src/lib/errors.ts);
--   • rodar a migration de novo não quebra nem duplica as travas;
--   • a versão 89 fica registrada.
--
-- Os números do teste são de mentira (repositório público).
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql
-- (depois da instalação completa), ou `npm run test:sql -- testar-tributos-aproximados`.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0089; esta segunda rodada é a de
-- "rodar de novo" (idempotente). E roda mais uma, pra garantir.
\ir ../migrations/0089_tributos_aproximados.sql
\ir ../migrations/0089_tributos_aproximados.sql

do $$
declare
  loja     uuid := '10400000-0000-0000-0000-00000000000a';
  valor    numeric;
  dia      date;
  n        int;
  proibido numeric;
  coluna   text;
  trava    text;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 89) then
    raise exception 'FALHOU 1: a 0089 não gravou a versão 89';
  end if;

  -- 2. os dois percentuais existem, numeric(5,2), aceitam vazio
  foreach coluna in array array['percentual_tributos_pecas', 'percentual_estimativa_icms_st'] loop
    select count(*) into n
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'configuracoes_fiscais_loja'
       and column_name = coluna
       and data_type = 'numeric'
       and numeric_precision = 5
       and numeric_scale = 2
       and is_nullable = 'YES';
    if n <> 1 then
      raise exception 'FALHOU 2: a coluna % não existe como numeric(5,2) opcional', coluna;
    end if;
  end loop;

  -- 3. a competência existe, é date, aceita vazio
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'configuracoes_fiscais_loja'
     and column_name = 'competencia_tributos_confirmada'
     and data_type = 'date'
     and is_nullable = 'YES';
  if n <> 1 then
    raise exception 'FALHOU 3: a coluna competencia_tributos_confirmada não existe como date opcional';
  end if;

  -- 4. cada trava existe uma vez só (as rodadas a mais não duplicaram)
  foreach trava in array array[
    'ck_config_fiscal_percentual_tributos_pecas',
    'ck_config_fiscal_percentual_estimativa_icms_st'
  ] loop
    select count(*) into n
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
     where t.relname = 'configuracoes_fiscais_loja'
       and c.conname = trava;
    if n <> 1 then
      raise exception 'FALHOU 4: esperava 1 trava %, achou %', trava, n;
    end if;
  end loop;

  -- ---- preparo -------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja (teste tributos aproximados)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into configuracoes_fiscais_loja (loja_id) values (loja) on conflict (loja_id) do nothing;

  -- 5. linha nova nasce vazia nas três
  if exists (
    select 1 from configuracoes_fiscais_loja
     where loja_id = loja
       and (percentual_tributos_pecas is not null
            or percentual_estimativa_icms_st is not null
            or competencia_tributos_confirmada is not null)
  ) then
    raise exception 'FALHOU 5: a linha nova devia nascer vazia nas três colunas novas';
  end if;

  -- 6. peças: aceita 0, 100, um número com duas casas e vazio
  update configuracoes_fiscais_loja set percentual_tributos_pecas = 12.34 where loja_id = loja;
  select percentual_tributos_pecas into valor from configuracoes_fiscais_loja where loja_id = loja;
  if valor is distinct from 12.34 then
    raise exception 'FALHOU 6: gravou 12,34 nas peças e voltou %', valor;
  end if;
  update configuracoes_fiscais_loja set percentual_tributos_pecas = 0 where loja_id = loja;
  update configuracoes_fiscais_loja set percentual_tributos_pecas = 100 where loja_id = loja;
  update configuracoes_fiscais_loja set percentual_tributos_pecas = null where loja_id = loja;

  -- 7. ICMS-ST: aceita 0, 100, um número com duas casas e vazio
  update configuracoes_fiscais_loja set percentual_estimativa_icms_st = 43.21 where loja_id = loja;
  select percentual_estimativa_icms_st into valor from configuracoes_fiscais_loja where loja_id = loja;
  if valor is distinct from 43.21 then
    raise exception 'FALHOU 7: gravou 43,21 no ICMS-ST e voltou %', valor;
  end if;
  update configuracoes_fiscais_loja set percentual_estimativa_icms_st = 0 where loja_id = loja;
  update configuracoes_fiscais_loja set percentual_estimativa_icms_st = 100 where loja_id = loja;
  update configuracoes_fiscais_loja set percentual_estimativa_icms_st = null where loja_id = loja;

  -- 8. peças: recusa o impossível, pela trava certa
  foreach proibido in array array[-1, 100.01]::numeric[] loop
    begin
      update configuracoes_fiscais_loja set percentual_tributos_pecas = proibido where loja_id = loja;
      raise exception 'FALHOU 8: a trava das peças deixou passar %', proibido;
    exception
      when check_violation then
        if sqlerrm not like '%ck_config_fiscal_percentual_tributos_pecas%' then
          raise exception 'FALHOU 8: esperava a trava ck_config_fiscal_percentual_tributos_pecas, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- 9. ICMS-ST: recusa o impossível, pela trava certa
  foreach proibido in array array[-1, 100.01]::numeric[] loop
    begin
      update configuracoes_fiscais_loja set percentual_estimativa_icms_st = proibido where loja_id = loja;
      raise exception 'FALHOU 9: a trava do ICMS-ST deixou passar %', proibido;
    exception
      when check_violation then
        if sqlerrm not like '%ck_config_fiscal_percentual_estimativa_icms_st%' then
          raise exception 'FALHOU 9: esperava a trava ck_config_fiscal_percentual_estimativa_icms_st, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- 10. a competência guarda o dia 1º do mês e volta a vazio
  update configuracoes_fiscais_loja set competencia_tributos_confirmada = date '2026-11-01' where loja_id = loja;
  select competencia_tributos_confirmada into dia from configuracoes_fiscais_loja where loja_id = loja;
  if dia is distinct from date '2026-11-01' then
    raise exception 'FALHOU 10: gravou 01/11/2026 na competência e voltou %', dia;
  end if;
  update configuracoes_fiscais_loja set competencia_tributos_confirmada = null where loja_id = loja;

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
