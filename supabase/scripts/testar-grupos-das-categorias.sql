-- Sakura System — AutoCenter Edition
-- TESTE da migration 0087 (o grupo de cada categoria de caixa, pro DRE,
-- tarefa #386). NÃO é migration, e NUNCA deve ser rodado no Supabase de
-- verdade — grava e apaga dado de teste.
--
-- A promessa:
--   • a coluna `grupo` existe, obrigatória, começando em "a_classificar", e as
--     duas travas (grupo da lista; grupo que combina com o tipo) existem uma
--     vez só, mesmo rodando a migration de novo;
--   • EMPRESA NOVA (banco sem OS e sem lançamento de caixa): as 4 categorias
--     semeadas (0050 e 0058) já nascem no grupo certo;
--   • as travas recusam grupo fora da lista e grupo do tipo errado, aceitam
--     "fora_do_resultado" e "a_classificar" nos dois tipos, deixam trocar o
--     grupo, e categoria criada sem grupo vira "a_classificar";
--   • rodar de novo não desfaz grupo que a loja escolheu;
--   • BANCO EM USO (com lançamento de caixa, ou com OS): NENHUMA categoria é
--     classificada (nem as semeadas), nenhuma muda de nome ou de tipo, e
--     nenhum lançamento (caixa e contas a pagar) muda uma vírgula.
--
-- As rodadas usam o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: ver o cabeçalho de scripts/testar-sql.mjs
-- (npm run test:sql -- testar-grupos-das-categorias).
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- ===================================================================
-- PARTE A: empresa nova. A instalação completa JÁ rodou a 0087 (o banco do
-- teste nasce sem OS e sem caixa). Sem a linha 87 e sem a coluna, a checagem
-- só passa se as rodadas abaixo fizerem tudo de novo; a segunda rodada é a
-- de "rodar de novo".
-- ===================================================================
alter table categorias_caixa drop column grupo;
delete from schema_versao where versao = 87;

\ir ../migrations/0087_grupo_das_categorias_de_caixa.sql
\ir ../migrations/0087_grupo_das_categorias_de_caixa.sql

do $$
declare
  n     int;
  trava text;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 87) then
    raise exception 'FALHOU 1: a 0087 não gravou a versão 87';
  end if;

  -- 2. a coluna: texto, obrigatória, começando em a_classificar
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'categorias_caixa'
     and column_name = 'grupo'
     and data_type = 'text'
     and is_nullable = 'NO'
     and column_default like '''a_classificar''%';
  if n <> 1 then
    raise exception 'FALHOU 2: esperava categorias_caixa.grupo text not null default a_classificar';
  end if;

  -- 3. as duas travas, uma vez só cada (a segunda rodada não duplicou)
  foreach trava in array array['ck_categorias_caixa_grupo', 'ck_categorias_caixa_grupo_do_tipo'] loop
    select count(*) into n
      from pg_constraint
     where conrelid = 'categorias_caixa'::regclass
       and conname = trava
       and contype = 'c';
    if n <> 1 then
      raise exception 'FALHOU 3: esperava 1 trava %, achou %', trava, n;
    end if;
  end loop;
  select count(*) into n
    from pg_constraint
   where conrelid = 'categorias_caixa'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%grupo%';
  if n <> 2 then
    raise exception 'FALHOU 3: esperava 2 travas sobre o grupo, achou %', n;
  end if;

  -- 4. empresa nova: as 4 semeadas no grupo certo, e são só elas
  select count(*) into n
    from categorias_caixa c
    join (values
      ('Outros', 'saida', 'outras_despesas'),
      ('Outros', 'entrada', 'outras_receitas'),
      ('Quebra de caixa', 'saida', 'outras_despesas'),
      ('Sobra de caixa', 'entrada', 'outras_receitas')
    ) as v(nome, tipo, grupo) on v.nome = c.nome and v.tipo = c.tipo and v.grupo = c.grupo;
  if n <> 4 or (select count(*) from categorias_caixa) <> 4 then
    raise exception 'FALHOU 4: esperava as 4 categorias semeadas no grupo certo, achou % de 4 (total %)',
      n, (select count(*) from categorias_caixa);
  end if;
end $$;

-- ===================================================================
-- PARTE B: as travas e a troca de grupo.
-- ===================================================================
do $$
declare
  saida   uuid := '03860000-0000-0000-0000-0000000000a1';
  entrada uuid := '03860000-0000-0000-0000-0000000000a2';
  valor   text;
begin
  -- 5. categoria criada sem grupo vira a_classificar (é o que a tela antiga faz)
  insert into categorias_caixa (id, nome, tipo) values
    (saida, 'Aluguel (teste #386)', 'saida'),
    (entrada, 'Sucata (teste #386)', 'entrada');
  if (select count(*) from categorias_caixa where id in (saida, entrada) and grupo = 'a_classificar') <> 2 then
    raise exception 'FALHOU 5: categoria criada sem grupo não ficou em a_classificar';
  end if;

  -- 6. grupo fora da lista: recusado pela trava da lista, nos dois tipos
  foreach valor in array array['', 'despesas', 'Custos', 'outra_coisa', 'a classificar'] loop
    begin
      update categorias_caixa set grupo = valor where id = saida;
      raise exception 'FALHOU 6: a trava da lista deixou passar "%" na saída', valor;
    exception
      when check_violation then
        if sqlerrm not like '%"ck_categorias_caixa_grupo"%' then
          raise exception 'FALHOU 6: esperava a trava ck_categorias_caixa_grupo, veio: %', sqlerrm;
        end if;
    end;
    begin
      update categorias_caixa set grupo = valor where id = entrada;
      raise exception 'FALHOU 6: a trava da lista deixou passar "%" na entrada', valor;
    exception
      when check_violation then
        if sqlerrm not like '%"ck_categorias_caixa_grupo"%' then
          raise exception 'FALHOU 6: esperava a trava ck_categorias_caixa_grupo, veio: %', sqlerrm;
        end if;
    end;
  end loop;
  begin
    update categorias_caixa set grupo = null where id = saida;
    raise exception 'FALHOU 6: o grupo aceitou ficar vazio';
  exception
    when not_null_violation then null;
  end;

  -- 7. grupo de saída numa categoria de entrada: recusado pela trava do tipo
  foreach valor in array array[
    'deducoes_venda', 'custos', 'despesas_pessoal', 'despesas_administrativas',
    'despesas_comerciais', 'despesas_financeiras', 'outras_despesas'
  ] loop
    begin
      update categorias_caixa set grupo = valor where id = entrada;
      raise exception 'FALHOU 7: categoria de entrada aceitou o grupo de saída "%"', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_categorias_caixa_grupo_do_tipo%' then
          raise exception 'FALHOU 7: esperava a trava ck_categorias_caixa_grupo_do_tipo, veio: %', sqlerrm;
        end if;
    end;
    -- e na de saída ele entra
    update categorias_caixa set grupo = valor where id = saida;
  end loop;

  -- 8. grupo de entrada numa categoria de saída: recusado pela trava do tipo
  foreach valor in array array['outras_receitas', 'receitas_financeiras'] loop
    begin
      update categorias_caixa set grupo = valor where id = saida;
      raise exception 'FALHOU 8: categoria de saída aceitou o grupo de entrada "%"', valor;
    exception
      when check_violation then
        if sqlerrm not like '%ck_categorias_caixa_grupo_do_tipo%' then
          raise exception 'FALHOU 8: esperava a trava ck_categorias_caixa_grupo_do_tipo, veio: %', sqlerrm;
        end if;
    end;
    -- e na de entrada ele entra
    update categorias_caixa set grupo = valor where id = entrada;
  end loop;
  -- nem criando já com o grupo errado
  begin
    insert into categorias_caixa (nome, tipo, grupo) values ('Errada (teste #386)', 'entrada', 'custos');
    raise exception 'FALHOU 8: criou categoria de entrada no grupo custos';
  exception
    when check_violation then
      if sqlerrm not like '%ck_categorias_caixa_grupo_do_tipo%' then
        raise exception 'FALHOU 8: esperava a trava ck_categorias_caixa_grupo_do_tipo, veio: %', sqlerrm;
      end if;
  end;

  -- 9. fora_do_resultado e a_classificar servem nos dois tipos
  foreach valor in array array['fora_do_resultado', 'a_classificar'] loop
    update categorias_caixa set grupo = valor where id in (saida, entrada);
    if (select count(*) from categorias_caixa where id in (saida, entrada) and grupo = valor) <> 2 then
      raise exception 'FALHOU 9: "%" não ficou gravado nos dois tipos', valor;
    end if;
  end loop;

  -- 10. trocar o grupo funciona (e fica o último escolhido)
  update categorias_caixa set grupo = 'despesas_administrativas' where id = saida;
  update categorias_caixa set grupo = 'custos' where id = saida;
  update categorias_caixa set grupo = 'receitas_financeiras' where id = entrada;
  if (select grupo from categorias_caixa where id = saida) <> 'custos'
     or (select grupo from categorias_caixa where id = entrada) <> 'receitas_financeiras' then
    raise exception 'FALHOU 10: a troca de grupo não ficou gravada';
  end if;

  -- a loja também mudou o grupo de uma semeada
  update categorias_caixa set grupo = 'despesas_administrativas' where nome = 'Outros' and tipo = 'saida';
  -- e "esqueceu" outra semeada em a_classificar
  update categorias_caixa set grupo = 'a_classificar' where nome = 'Sobra de caixa' and tipo = 'entrada';
end $$;

-- 11. rodar de novo (ainda empresa nova) não desfaz o que a loja escolheu
\ir ../migrations/0087_grupo_das_categorias_de_caixa.sql

do $$
begin
  if (select grupo from categorias_caixa where id = '03860000-0000-0000-0000-0000000000a1') <> 'custos'
     or (select grupo from categorias_caixa where id = '03860000-0000-0000-0000-0000000000a2') <> 'receitas_financeiras'
     or (select grupo from categorias_caixa where nome = 'Outros' and tipo = 'saida') <> 'despesas_administrativas' then
    raise exception 'FALHOU 11: rodar a migration de novo desfez o grupo que a loja escolheu';
  end if;
  -- só a que estava em a_classificar volta pro grupo da semente
  if (select grupo from categorias_caixa where nome = 'Sobra de caixa' and tipo = 'entrada') <> 'outras_receitas' then
    raise exception 'FALHOU 11: a semeada em a_classificar não voltou pro grupo certo numa empresa nova';
  end if;
  if (select count(*) from categorias_caixa) <> 6 then
    raise exception 'FALHOU 11: rodar de novo mudou a quantidade de categorias (%)', (select count(*) from categorias_caixa);
  end if;
end $$;

-- ===================================================================
-- PARTE C: banco EM USO, com lançamento de caixa (e ainda SEM nenhuma OS:
-- prova o segundo sinal, o do caixa). Simula um banco antigo: categorias
-- criadas pela loja, lançamentos no caixa e em contas a pagar, e só então
-- a 0087 chega (sem a coluna, sem a linha 87).
-- ===================================================================
insert into lojas (id, nome, cidade, uf)
  values ('03860000-0000-0000-0000-0000000000b1', 'Loja (teste #386)', 'Araraquara', 'SP');
insert into categorias_caixa (id, nome, tipo) values
  ('03860000-0000-0000-0000-0000000000a3', 'Energia (teste #386)', 'saida'),
  ('03860000-0000-0000-0000-0000000000a4', 'Salários (teste #386)', 'saida');
insert into caixa_movimentos (id, loja_id, data, tipo, forma_pagamento, valor, descricao, categoria_id) values
  ('03860000-0000-0000-0000-0000000000c1', '03860000-0000-0000-0000-0000000000b1', '2026-10-05 09:00-03', 'saida', 'pix', 1800.00, 'Aluguel de outubro', '03860000-0000-0000-0000-0000000000a1'),
  ('03860000-0000-0000-0000-0000000000c2', '03860000-0000-0000-0000-0000000000b1', '2026-10-06 10:00-03', 'entrada', 'dinheiro', 40.00, 'Sucata', '03860000-0000-0000-0000-0000000000a2'),
  ('03860000-0000-0000-0000-0000000000c3', '03860000-0000-0000-0000-0000000000b1', '2026-10-07 11:00-03', 'saida', 'dinheiro', 12.50, 'Café', (select id from categorias_caixa where nome = 'Outros' and tipo = 'saida')),
  ('03860000-0000-0000-0000-0000000000c4', '03860000-0000-0000-0000-0000000000b1', '2026-10-08 18:00-03', 'saida', 'dinheiro', 3.00, 'Quebra de caixa — fechamento', (select id from categorias_caixa where nome = 'Quebra de caixa')),
  ('03860000-0000-0000-0000-0000000000c5', '03860000-0000-0000-0000-0000000000b1', '2026-10-09 12:00-03', 'entrada', 'pix', 99.90, 'Sem categoria', null);
insert into contas_pagar (id, loja_id, descricao, valor, vencimento, categoria_id, status, data_pagamento, caixa_movimento_id) values
  ('03860000-0000-0000-0000-0000000000d1', '03860000-0000-0000-0000-0000000000b1', 'Aluguel de outubro', 1800.00, '2026-10-05', '03860000-0000-0000-0000-0000000000a1', 'paga', '2026-10-05 09:00-03', '03860000-0000-0000-0000-0000000000c1'),
  ('03860000-0000-0000-0000-0000000000d2', '03860000-0000-0000-0000-0000000000b1', 'Energia de outubro', 310.40, '2026-10-20', '03860000-0000-0000-0000-0000000000a3', 'pendente', null, null),
  ('03860000-0000-0000-0000-0000000000d3', '03860000-0000-0000-0000-0000000000b1', 'Folha de outubro', 2500.00, '2026-11-05', '03860000-0000-0000-0000-0000000000a4', 'pendente', null, null);

-- O banco antigo não tem a coluna (nem as travas, que caem junto) nem a 87.
alter table categorias_caixa drop column grupo;
delete from schema_versao where versao = 87;

create temp table retrato_antes as
select (select count(*) from caixa_movimentos) as n_caixa,
       (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from caixa_movimentos t) as h_caixa,
       (select count(*) from contas_pagar) as n_pagar,
       (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from contas_pagar t) as h_pagar,
       (select count(*) from categorias_caixa) as n_cat,
       (select md5(string_agg(id::text || '/' || nome || '/' || tipo, '|' order by id)) from categorias_caixa) as h_cat;

\ir ../migrations/0087_grupo_das_categorias_de_caixa.sql

do $$
declare
  antes retrato_antes%rowtype;
  n     int;
begin
  select * into antes from retrato_antes;

  -- 12. a versão e as duas travas voltaram
  if not exists (select 1 from schema_versao where versao = 87) then
    raise exception 'FALHOU 12: a 0087 não gravou a versão 87 no banco em uso';
  end if;
  if (select count(*) from pg_constraint
       where conrelid = 'categorias_caixa'::regclass
         and conname in ('ck_categorias_caixa_grupo', 'ck_categorias_caixa_grupo_do_tipo')) <> 2 then
    raise exception 'FALHOU 12: as duas travas não foram criadas no banco em uso';
  end if;

  -- 13. banco em uso: TODAS em a_classificar, inclusive Outros, Quebra e Sobra
  select count(*) into n from categorias_caixa where grupo <> 'a_classificar';
  if n <> 0 then
    raise exception 'FALHOU 13: no banco em uso (com caixa), % categoria(s) foram classificadas sozinhas: %',
      n, (select string_agg(nome || '/' || tipo || '=' || grupo, ', ') from categorias_caixa where grupo <> 'a_classificar');
  end if;

  -- 14. nenhuma categoria mudou de nome ou de tipo, nem sumiu ou apareceu
  if (select count(*) from categorias_caixa) <> antes.n_cat
     or (select md5(string_agg(id::text || '/' || nome || '/' || tipo, '|' order by id)) from categorias_caixa) <> antes.h_cat then
    raise exception 'FALHOU 14: alguma categoria mudou de nome, de tipo, sumiu ou apareceu';
  end if;

  -- 15. nenhum lançamento mudou: mesma quantidade e o mesmo conteúdo
  if (select count(*) from caixa_movimentos) <> antes.n_caixa
     or (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from caixa_movimentos t) <> antes.h_caixa then
    raise exception 'FALHOU 15: os lançamentos de caixa mudaram';
  end if;
  if (select count(*) from contas_pagar) <> antes.n_pagar
     or (select md5(coalesce(string_agg(t::text, '|' order by t.id), '')) from contas_pagar t) <> antes.h_pagar then
    raise exception 'FALHOU 15: as contas a pagar mudaram';
  end if;
  if antes.n_caixa <> 5 or antes.n_pagar <> 3 then
    raise exception 'FALHOU 15: o retrato não pegou os lançamentos do teste (caixa %, contas %)', antes.n_caixa, antes.n_pagar;
  end if;
end $$;

-- ===================================================================
-- PARTE D: banco EM USO só com OS (sem lançamento de caixa nenhum): prova o
-- primeiro sinal, o da 0072. Mesma simulação de banco antigo.
-- ===================================================================
delete from contas_pagar where id::text like '03860000-%';
delete from caixa_movimentos where id::text like '03860000-%';
insert into clientes (id, nome)
  values ('03860000-0000-0000-0000-0000000000e1', 'Cliente (teste #386)');
insert into ordens_servico (id, loja_id, cliente_id, status)
  values ('03860000-0000-0000-0000-0000000000f1', '03860000-0000-0000-0000-0000000000b1',
          '03860000-0000-0000-0000-0000000000e1', 'orcamento');

alter table categorias_caixa drop column grupo;
delete from schema_versao where versao = 87;

\ir ../migrations/0087_grupo_das_categorias_de_caixa.sql

do $$
declare
  n int;
begin
  if (select count(*) from caixa_movimentos) <> 0 then
    raise exception 'FALHOU 16: o teste devia estar sem lançamento de caixa nenhum';
  end if;
  select count(*) into n from categorias_caixa where grupo <> 'a_classificar';
  if n <> 0 then
    raise exception 'FALHOU 16: no banco em uso (com OS), % categoria(s) foram classificadas sozinhas', n;
  end if;
end $$;

-- 17. rodar de novo no banco em uso não duplica trava nem desfaz a escolha
update categorias_caixa set grupo = 'despesas_pessoal' where id = '03860000-0000-0000-0000-0000000000a4';
\ir ../migrations/0087_grupo_das_categorias_de_caixa.sql

do $$
begin
  if (select grupo from categorias_caixa where id = '03860000-0000-0000-0000-0000000000a4') <> 'despesas_pessoal' then
    raise exception 'FALHOU 17: rodar de novo desfez o grupo escolhido no banco em uso';
  end if;
  if (select count(*) from categorias_caixa where grupo <> 'a_classificar') <> 1 then
    raise exception 'FALHOU 17: rodar de novo no banco em uso classificou categoria sozinha';
  end if;
  if (select count(*) from pg_constraint
       where conrelid = 'categorias_caixa'::regclass
         and conname in ('ck_categorias_caixa_grupo', 'ck_categorias_caixa_grupo_do_tipo')) <> 2 then
    raise exception 'FALHOU 17: rodar de novo duplicou ou perdeu trava';
  end if;
end $$;

-- ---- limpeza ---------------------------------------------------------------
delete from ordens_servico where id = '03860000-0000-0000-0000-0000000000f1';
delete from clientes where id = '03860000-0000-0000-0000-0000000000e1';
delete from categorias_caixa where id::text like '03860000-%';
delete from depositos where loja_id = '03860000-0000-0000-0000-0000000000b1';
delete from configuracoes_garantia where loja_id = '03860000-0000-0000-0000-0000000000b1';
delete from configuracoes_fiscais_loja where loja_id = '03860000-0000-0000-0000-0000000000b1';
delete from configuracoes_painel_inicio where loja_id = '03860000-0000-0000-0000-0000000000b1';
delete from configuracoes_juros_parcelas where loja_id = '03860000-0000-0000-0000-0000000000b1';
delete from lojas where id = '03860000-0000-0000-0000-0000000000b1';
delete from auditoria;

\echo TODAS AS CHECAGENS PASSARAM
