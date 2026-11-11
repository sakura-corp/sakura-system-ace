-- Sakura System — AutoCenter Edition
-- TESTE da migration 0083 (o contato da contabilidade, #383). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste (e apaga o que gravou no fim).
--
-- A promessa:
--   • a tabela `configuracoes_contabilidade` existe, com o `loja_id` de chave
--     (uma linha por loja), o nome obrigatório e WhatsApp e e-mail opcionais;
--   • cada trava aceita o valor certo e recusa o errado, pela trava com o
--     nome que a tela traduz (src/lib/errors.ts):
--       - nome: não pode ser só espaço nem passar de 80 letras;
--       - WhatsApp: só dígitos, de 10 a 13;
--       - e-mail: um @ com algo dos dois lados, sem espaço, até 120 letras;
--       - pelo menos um dos dois (WhatsApp ou e-mail);
--   • apagar o contato é apagar a linha;
--   • a RLS está ligada, com a policy de acesso por loja;
--   • rodar a migration de novo não quebra nem duplica trava nem policy.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql
-- (depois da instalação completa), ou `npm run test:sql -- testar-contato-contabilidade`.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0083; esta segunda rodada é a de
-- "rodar de novo" (idempotente).
\ir ../migrations/0083_contato_contabilidade.sql

do $$
declare
  loja     uuid := '03830000-0000-0000-0000-00000000000a';
  n        int;
  valor    text;
  trava    text;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 83) then
    raise exception 'FALHOU 1: a 0083 não gravou a versão 83';
  end if;

  -- 2. as colunas: nome obrigatório, WhatsApp e e-mail opcionais, e o
  --    loja_id é a chave inteira
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'configuracoes_contabilidade'
     and data_type = 'text'
     and ((column_name = 'nome' and is_nullable = 'NO')
       or (column_name in ('whatsapp', 'email') and is_nullable = 'YES'));
  if n <> 3 then
    raise exception 'FALHOU 2: esperava nome (obrigatório), whatsapp e email (opcionais) como text, achou % de 3', n;
  end if;
  if (select array_agg(a.attname::text)
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
       where i.indrelid = 'configuracoes_contabilidade'::regclass
         and i.indisprimary) is distinct from array['loja_id'] then
    raise exception 'FALHOU 2: a chave de configuracoes_contabilidade devia ser só o loja_id';
  end if;

  -- 3. as quatro travas e a policy existem uma vez só (a segunda rodada não
  --    duplicou), e a RLS está ligada
  foreach trava in array array[
    'ck_configuracoes_contabilidade_nome',
    'ck_configuracoes_contabilidade_whatsapp',
    'ck_configuracoes_contabilidade_email',
    'ck_configuracoes_contabilidade_algum_contato'
  ] loop
    select count(*) into n
      from pg_constraint c
     where c.conrelid = 'configuracoes_contabilidade'::regclass
       and c.conname = trava;
    if n <> 1 then
      raise exception 'FALHOU 3: esperava 1 trava %, achou %', trava, n;
    end if;
  end loop;
  select count(*) into n
    from pg_policies
   where tablename = 'configuracoes_contabilidade'
     and policyname = 'configuracoes_contabilidade_acesso_por_loja'
     and cmd = 'ALL';
  if n <> 1 or (select count(*) from pg_policies where tablename = 'configuracoes_contabilidade') <> 1 then
    raise exception 'FALHOU 3: esperava só a policy configuracoes_contabilidade_acesso_por_loja (for all)';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'configuracoes_contabilidade'::regclass) then
    raise exception 'FALHOU 3: a RLS de configuracoes_contabilidade está desligada';
  end if;

  -- ---- preparo -------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja (teste contato da contabilidade)', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  -- 4. loja nova não tem contato
  if exists (select 1 from configuracoes_contabilidade where loja_id = loja) then
    raise exception 'FALHOU 4: a loja nova já nasceu com contato da contabilidade';
  end if;

  -- 5. aceita um contato completo, e a data de atualização vem sozinha
  insert into configuracoes_contabilidade (loja_id, nome, whatsapp, email)
    values (loja, 'Escritório Exemplo', '16999990000', 'contato@exemplo.com.br');
  if (select atualizado_em from configuracoes_contabilidade where loja_id = loja) is null then
    raise exception 'FALHOU 5: atualizado_em veio vazio';
  end if;

  -- 6. uma linha por loja: a segunda vira chave duplicada
  begin
    insert into configuracoes_contabilidade (loja_id, nome, email)
      values (loja, 'Outro escritório', 'outro@exemplo.com.br');
    raise exception 'FALHOU 6: a loja ficou com dois contatos';
  exception
    when unique_violation then null;
  end;

  -- 7. o nome: aceita o certo, recusa só espaço e mais de 80 letras
  foreach valor in array array['E', repeat('a', 80), 'Contabilidade São José'] loop
    update configuracoes_contabilidade set nome = valor where loja_id = loja;
  end loop;
  foreach valor in array array['', '   ', repeat('a', 81)] loop
    begin
      update configuracoes_contabilidade set nome = valor where loja_id = loja;
      raise exception 'FALHOU 7: a trava do nome deixou passar "%"', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_configuracoes_contabilidade_nome%' then
          raise exception 'FALHOU 7: esperava a trava ck_configuracoes_contabilidade_nome, veio: %', sqlerrm;
        end if;
    end;
  end loop;
  begin
    update configuracoes_contabilidade set nome = null where loja_id = loja;
    raise exception 'FALHOU 7: o nome aceitou ficar vazio';
  exception
    when not_null_violation then null;
  end;

  -- 8. o WhatsApp: aceita 10 a 13 dígitos e vazio (com e-mail), recusa o resto
  foreach valor in array array['1633334444', '16999990000', '551699999000', '5516999990000'] loop
    update configuracoes_contabilidade set whatsapp = valor where loja_id = loja;
  end loop;
  update configuracoes_contabilidade set whatsapp = null where loja_id = loja;
  foreach valor in array array[
    '163333444',          -- 9 dígitos: falta o DDD
    '55169999900001',     -- 14 dígitos
    '(16) 99999-0000',    -- com máscara: a lib grava só os dígitos
    '16 999990000',
    '+5516999990000',
    ''
  ] loop
    begin
      update configuracoes_contabilidade set whatsapp = valor where loja_id = loja;
      raise exception 'FALHOU 8: a trava do WhatsApp deixou passar "%"', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_configuracoes_contabilidade_whatsapp%' then
          raise exception 'FALHOU 8: esperava a trava ck_configuracoes_contabilidade_whatsapp, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- 9. o e-mail: aceita o certo e vazio (com WhatsApp), recusa o resto
  update configuracoes_contabilidade set whatsapp = '16999990000' where loja_id = loja;
  foreach valor in array array['a@b', 'contato@exemplo.com.br', repeat('a', 108) || '@exemplo.com'] loop
    update configuracoes_contabilidade set email = valor where loja_id = loja;
  end loop;
  update configuracoes_contabilidade set email = null where loja_id = loja;
  foreach valor in array array[
    'contato.exemplo.com.br',      -- sem @
    '@exemplo.com.br',             -- nada antes do @
    'contato@',                    -- nada depois do @
    'contato@@exemplo.com.br',     -- dois @
    'conta to@exemplo.com.br',     -- espaço no meio
    ' contato@exemplo.com.br',     -- espaço na ponta
    repeat('a', 109) || '@exemplo.com',  -- 121 letras
    ''
  ] loop
    begin
      update configuracoes_contabilidade set email = valor where loja_id = loja;
      raise exception 'FALHOU 9: a trava do e-mail deixou passar "%"', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_configuracoes_contabilidade_email%' then
          raise exception 'FALHOU 9: esperava a trava ck_configuracoes_contabilidade_email, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- 10. pelo menos um dos dois: só e-mail serve, só WhatsApp serve, nenhum não
  update configuracoes_contabilidade set whatsapp = null, email = 'contato@exemplo.com.br' where loja_id = loja;
  update configuracoes_contabilidade set whatsapp = '16999990000', email = null where loja_id = loja;
  begin
    update configuracoes_contabilidade set whatsapp = null, email = null where loja_id = loja;
    raise exception 'FALHOU 10: o contato ficou sem WhatsApp e sem e-mail';
  exception
    when check_violation then
      if sqlerrm not like '%ck_configuracoes_contabilidade_algum_contato%' then
        raise exception 'FALHOU 10: esperava a trava ck_configuracoes_contabilidade_algum_contato, veio: %', sqlerrm;
      end if;
  end;

  -- 11. apagar o contato é apagar a linha
  delete from configuracoes_contabilidade where loja_id = loja;
  if exists (select 1 from configuracoes_contabilidade where loja_id = loja) then
    raise exception 'FALHOU 11: o contato não foi apagado';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from configuracoes_contabilidade where loja_id = loja;
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
