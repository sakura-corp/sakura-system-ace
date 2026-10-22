-- Sakura System — AutoCenter Edition
-- TESTE da migration 0066 (peça avulsa no orçamento, tarefa #655). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava e apaga
-- dado de teste, e roda a migration (e a instalação inteira) de novo (\ir).
--
-- A promessa, em duas metades:
--   • o que passa: num orçamento, peça digitada sem cadastro (peca_id vazio)
--     com o custo vazio ("não informado") ou com custo (12,50) ou com custo
--     zero (peça que a loja ganhou); a peça cadastrada e o serviço continuam
--     sendo gravados como antes, sem custo na linha; a coluna nasce SEM
--     padrão (vazio nunca vira zero sozinho); e rodar a 0066 de novo — e a
--     INSTALAÇÃO INTEIRA de novo — com tudo isso gravado não quebra nada nem
--     muda custo nenhum;
--   • o que é recusado: custo negativo, no insert e no update, pela trava
--     `ck_ordens_servico_itens_custo` (pelo nome, que é o que a tela traduz).
--
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql. Os
-- \ir lá embaixo acham os arquivos pelo caminho relativo a este, então rodar
-- pelo `psql -f` (ou `npm run test:sql -- testar-peca-avulsa`), não colando
-- no SQL Editor. Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- ===================================================================
-- Parte 1: o que passa, e o que é recusado
-- ===================================================================

do $$
declare
  loja    uuid := '0c0b0000-0000-0000-0000-00000000000a';
  cliente uuid := '0c0b2222-0000-0000-0000-000000000001';
  peca    uuid := '0c0b5555-0000-0000-0000-000000000001';
  orc     uuid := '0c0b3333-0000-0000-0000-000000000001';
  item_sem_custo  uuid := '0c0b4444-0000-0000-0000-000000000001';
  item_com_custo  uuid := '0c0b4444-0000-0000-0000-000000000002';
  item_custo_zero uuid := '0c0b4444-0000-0000-0000-000000000003';
  item_cadastrada uuid := '0c0b4444-0000-0000-0000-000000000004';
  item_servico    uuid := '0c0b4444-0000-0000-0000-000000000005';
  linha   record;
  padrao  text;
  quantos int;
begin
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja (teste peça avulsa)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into clientes (id, nome) values (cliente, 'Cliente da peça avulsa') on conflict (id) do nothing;
  insert into pecas (id, descricao, preco_custo, preco_venda) values (peca, 'Peça cadastrada (teste)', 30, 50)
    on conflict (id) do nothing;
  insert into ordens_servico (id, loja_id, cliente_id, status, validade)
    values (orc, loja, cliente, 'orcamento', current_date + 7);

  -- ===================================================================
  -- A. A coluna existe, é numeric(12,2) e NÃO tem padrão (vazio ≠ zero)
  -- ===================================================================
  select column_default, data_type, numeric_precision, numeric_scale, is_nullable
    into linha
    from information_schema.columns
   where table_name = 'ordens_servico_itens' and column_name = 'custo_unitario';
  if not found then
    raise exception 'FALHOU: a coluna ordens_servico_itens.custo_unitario não existe';
  end if;
  if linha.column_default is not null then
    raise exception 'FALHOU: custo_unitario não pode ter padrão (vazio = não informado), tem %', linha.column_default;
  end if;
  if linha.data_type <> 'numeric' or linha.numeric_precision <> 12 or linha.numeric_scale <> 2
     or linha.is_nullable <> 'YES' then
    raise exception 'FALHOU: custo_unitario devia ser numeric(12,2) anulável, é % (%,%), nulo: %',
      linha.data_type, linha.numeric_precision, linha.numeric_scale, linha.is_nullable;
  end if;
  if col_description('ordens_servico_itens'::regclass,
       (select attnum from pg_attribute
         where attrelid = 'ordens_servico_itens'::regclass and attname = 'custo_unitario')) is null then
    raise exception 'FALHOU: custo_unitario ficou sem comentário explicando a coluna';
  end if;

  -- ===================================================================
  -- B. Peça avulsa (sem cadastro) com o custo vazio: vale, e fica vazio
  -- ===================================================================
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (item_sem_custo, orc, 'peca', null, 'Bieleta (sem cadastro)', 2, 80);
  select * into linha from ordens_servico_itens where id = item_sem_custo;
  if linha.peca_id is not null or linha.custo_unitario is not null then
    raise exception 'FALHOU: peça avulsa sem custo devia ficar com peca_id e custo vazios, veio peca_id %, custo %',
      linha.peca_id, linha.custo_unitario;
  end if;

  -- ===================================================================
  -- C. Peça avulsa com custo 12,50: grava 12,50 certinho
  -- ===================================================================
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario, custo_unitario)
    values (item_com_custo, orc, 'peca', null, 'Abraçadeira (sem cadastro)', 4, 20, 12.50);
  select * into linha from ordens_servico_itens where id = item_com_custo;
  if linha.custo_unitario is distinct from 12.50 then
    raise exception 'FALHOU: o custo da peça avulsa devia ser 12,50, veio %', linha.custo_unitario;
  end if;

  -- ===================================================================
  -- D. Custo zero de verdade (peça que a loja ganhou) também vale
  -- ===================================================================
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario, custo_unitario)
    values (item_custo_zero, orc, 'peca', null, 'Válvula de brinde (sem cadastro)', 1, 5, 0);
  if (select custo_unitario from ordens_servico_itens where id = item_custo_zero) is distinct from 0 then
    raise exception 'FALHOU: custo zero devia ficar zero';
  end if;

  -- ===================================================================
  -- E. A peça cadastrada e o serviço continuam como antes (sem custo na linha)
  -- ===================================================================
  -- Do jeito que a versão anterior do programa grava: sem a chave nova.
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (item_cadastrada, orc, 'peca', peca, 'Peça cadastrada (teste)', 1, 50);
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, descricao, quantidade, preco_unitario)
    values (item_servico, orc, 'servico', 'Alinhamento', 1, 60);
  select count(*) into quantos from ordens_servico_itens
   where id in (item_cadastrada, item_servico) and custo_unitario is null;
  if quantos <> 2 then
    raise exception 'FALHOU: peça cadastrada e serviço deviam nascer com o custo da linha vazio (% de 2)', quantos;
  end if;

  -- ===================================================================
  -- F. Recusado: custo negativo, no insert
  -- ===================================================================
  begin
    insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario, custo_unitario)
      values (orc, 'peca', null, 'Peça de custo negativo', 1, 10, -0.01);
    raise exception 'FALHOU: aceitou uma peça avulsa com custo negativo';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_itens_custo%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_itens_custo, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- G. Recusado: custo negativo, no update (corrigir uma linha já lançada)
  -- ===================================================================
  begin
    update ordens_servico_itens set custo_unitario = -5 where id = item_com_custo;
    raise exception 'FALHOU: aceitou mudar o custo de uma peça avulsa pra negativo';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_itens_custo%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_itens_custo, veio: %', sqlerrm;
    end if;
  end;
  if (select custo_unitario from ordens_servico_itens where id = item_com_custo) is distinct from 12.50 then
    raise exception 'FALHOU: a tentativa recusada mudou o custo da peça avulsa';
  end if;

  -- E apagar o custo (voltar a "não informado") continua valendo.
  update ordens_servico_itens set custo_unitario = null where id = item_custo_zero;
  update ordens_servico_itens set custo_unitario = 0 where id = item_custo_zero;
end $$;

-- ===================================================================
-- Parte 2: rodar a 0066 de novo, e a INSTALAÇÃO INTEIRA de novo
-- ===================================================================
-- A 0066 sozinha (o caso do botão "Atualizar o banco" rodando duas vezes) e
-- a instalação inteira (a equipe recola o arquivo no banco de teste a cada
-- migration — docs/licoes.md, item 36), com as linhas acima gravadas.

\ir ../migrations/0066_peca_avulsa.sql
\ir ../instalacao/instalacao-completa.sql

do $$
declare
  loja    uuid := '0c0b0000-0000-0000-0000-00000000000a';
  cliente uuid := '0c0b2222-0000-0000-0000-000000000001';
  peca    uuid := '0c0b5555-0000-0000-0000-000000000001';
  orc     uuid := '0c0b3333-0000-0000-0000-000000000001';
  item_sem_custo  uuid := '0c0b4444-0000-0000-0000-000000000001';
  item_com_custo  uuid := '0c0b4444-0000-0000-0000-000000000002';
  item_custo_zero uuid := '0c0b4444-0000-0000-0000-000000000003';
  quantas int;
begin
  -- Nenhum custo mudou.
  if (select custo_unitario from ordens_servico_itens where id = item_sem_custo) is not null
     or (select custo_unitario from ordens_servico_itens where id = item_com_custo) is distinct from 12.50
     or (select custo_unitario from ordens_servico_itens where id = item_custo_zero) is distinct from 0 then
    raise exception 'FALHOU: depois de rodar de novo, algum custo de peça avulsa mudou';
  end if;

  -- A trava continua lá, uma vez só, com a mesma regra.
  select count(*) into quantas from pg_constraint
   where conrelid = 'ordens_servico_itens'::regclass and conname = 'ck_ordens_servico_itens_custo';
  if quantas <> 1 then
    raise exception 'FALHOU: depois de rodar de novo, esperava 1 trava ck_ordens_servico_itens_custo, há %', quantas;
  end if;
  begin
    insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario, custo_unitario)
      values (orc, 'peca', null, 'Peça de custo negativo', 1, 10, -1);
    raise exception 'FALHOU: depois de rodar de novo, aceitou custo negativo';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_itens_custo%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_itens_custo, veio: %', sqlerrm;
    end if;
  end;

  if not exists (select 1 from schema_versao where versao = 66) then
    raise exception 'FALHOU: a migration não registrou a versão 66';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from ordens_servico where id = orc;  -- os itens vão junto (on delete cascade)
  delete from pecas where id = peca;
  delete from clientes where id = cliente;
  -- A instalação rodada de novo cria o depósito de cada loja (0041).
  delete from depositos where loja_id = loja;
  delete from lojas where id = loja;

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;
