-- Sakura System — AutoCenter Edition
-- TESTE da migration 0083 (os lotes de importação de clientes e veículos, e o
-- "desfazer", tarefa #457). NÃO é migration, e NUNCA deve ser rodado no
-- Supabase de verdade — grava e apaga dado de teste.
--
-- A promessa:
--   • cada importação é um lote, e a marca do lote fica em `clientes` e
--     `veiculos`;
--   • só o ADMINISTRADOR com o módulo Clientes lê, cria e altera lote; quem
--     tem só Clientes, ou só OS, não alcança (decisão 3 da Sofia); ninguém
--     apaga lote;
--   • `desfazer_importacao` apaga SÓ o que veio daquele lote, e deixa — dizendo
--     qual e por quê — o que já está em uso (decisão 4 da Sofia):
--       - veículo do lote que já tem OS fica, e a OS CONTINUA com o veículo
--         (a chave da OS é `on delete set null`: sem a conferência, apagar o
--         veículo deixaria a OS sem veículo, calado);
--       - cliente com OS, com conta a receber, ou com qualquer outra
--         referência (até de uma tabela que ainda não existe hoje) fica;
--       - cliente com veículo cadastrado à mão depois da importação fica, e o
--         veículo também (a chave do veículo é `on delete cascade`);
--       - cliente cujo veículo do lote ficou, fica;
--   • a conferência enxerga as OS de TODAS as lojas, mesmo quando quem desfaz
--     é admin de uma loja só (é o motivo de a função ser `security definer`);
--   • lote que não existe, ou já desfeito, é recusado em português;
--   • rodar a migration de novo não muda nada.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: `npm run test:sql -- testar-importacao` (ver o cabeçalho de
-- scripts/testar-sql.mjs). Terminou imprimindo "TODAS AS CHECAGENS PASSARAM",
-- passou.

-- ===================================================================
-- PARTE 1 — o cenário, gravado ANTES da segunda rodada da migration
-- ===================================================================

do $$
declare
  loja_a      uuid := '04570000-0000-0000-0000-00000000000a';
  loja_b      uuid := '04570000-0000-0000-0000-00000000000b';
  o_admin     uuid := '04571111-0000-0000-0000-000000000001';  -- admin só da loja A
  o_cli       uuid := '04571111-0000-0000-0000-000000000002';  -- Clientes, não é admin
  o_os        uuid := '04571111-0000-0000-0000-000000000003';  -- só OS
  lote_1      uuid := '04572222-0000-0000-0000-000000000001';
  lote_2      uuid := '04572222-0000-0000-0000-000000000002';
  n           int;
  novo        uuid;
begin
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A da importação', 'Araraquara', 'SP'),
    (loja_b, 'Loja B da importação', 'Araraquara', 'SP');

  insert into auth.users (id) values (o_admin), (o_cli), (o_os);
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin, 'teste_imp_admin', 'Admin da loja A',  true,  array['painel'],                   true),
    (o_cli,   'teste_imp_cli',   'Só Clientes',      false, array['painel','clientes'],        true),
    (o_os,    'teste_imp_os',    'Só OS',            false, array['painel','ordens_servico'],  true);
  insert into operador_lojas (operador_id, loja_id) values
    (o_admin, loja_a), (o_cli, loja_a), (o_os, loja_a);

  -- ---- o caminho do programa: o admin cria o lote e grava pela RLS -------
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin::text, true);

  insert into importacao_lotes (id, nome_arquivo) values (lote_1, 'clientes-antigos.csv');
  -- quem importou e o tipo vêm sozinhos
  select count(*) into n from importacao_lotes
   where id = lote_1 and operador_id = o_admin and tipo = 'clientes'
     and total_linhas = 0 and desfeito_em is null;
  if n <> 1 then
    raise exception 'FALHOU 1: o lote não nasceu com o operador logado, o tipo clientes e zerado';
  end if;

  -- não dá pra criar lote em nome de outra pessoa
  begin
    insert into importacao_lotes (operador_id) values (o_cli);
    raise exception 'FALHOU 1b: o admin criou um lote em nome de outro operador';
  exception when insufficient_privilege then null;
  end;

  -- tipo fora da lista é recusado
  begin
    insert into importacao_lotes (tipo) values ('pecas');
    raise exception 'FALHOU 1c: o lote aceitou um tipo que ainda não existe';
  exception when check_violation then null;
  end;

  insert into clientes (id, nome, importacao_lote_id) values
    ('04573333-0000-0000-0000-000000000001', 'Livre Com Carro',      lote_1),
    ('04573333-0000-0000-0000-000000000002', 'Livre Sem Carro',      lote_1),
    ('04573333-0000-0000-0000-000000000003', 'Ganhou OS',            lote_1),
    ('04573333-0000-0000-0000-000000000004', 'Dono do Carro Com OS', lote_1),
    ('04573333-0000-0000-0000-000000000005', 'Tem Conta',            lote_1),
    ('04573333-0000-0000-0000-000000000006', 'Carro Fora do Lote',   lote_1),
    ('04573333-0000-0000-0000-000000000007', 'Tem Agendamento',      lote_1);

  insert into veiculos (id, cliente_id, placa, importacao_lote_id) values
    ('04574444-0000-0000-0000-000000000001', '04573333-0000-0000-0000-000000000001', 'IMP1A01', lote_1),
    ('04574444-0000-0000-0000-000000000003', '04573333-0000-0000-0000-000000000003', 'IMP1A03', lote_1),
    ('04574444-0000-0000-0000-000000000004', '04573333-0000-0000-0000-000000000004', 'IMP1A04', lote_1);

  -- o programa atualiza os números no fim da gravação
  update importacao_lotes set total_linhas = 9, clientes_criados = 7, veiculos_criados = 4
   where id = lote_1;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FALHOU 1d: o admin não conseguiu atualizar os números do lote';
  end if;

  reset role;

  -- ---- o resto do cenário, como o banco (dono) --------------------------
  -- um cliente que já existia antes da importação
  insert into clientes (id, nome) values ('04573333-0000-0000-0000-0000000000f1', 'Já Existia');
  -- a importação ligou um veículo a ele (o veículo é do lote, o cliente não)
  insert into veiculos (id, cliente_id, placa, importacao_lote_id) values
    ('04574444-0000-0000-0000-0000000000f1', '04573333-0000-0000-0000-0000000000f1', 'IMP1F01', lote_1);
  -- um veículo cadastrado À MÃO, depois, num cliente do lote
  insert into veiculos (id, cliente_id, placa) values
    ('04574444-0000-0000-0000-000000000006', '04573333-0000-0000-0000-000000000006', 'MAO1A06');

  -- OS do cliente "Ganhou OS", sem veículo, na loja A
  insert into ordens_servico (id, numero, loja_id, cliente_id) values
    ('04575555-0000-0000-0000-000000000003', 9301, loja_a, '04573333-0000-0000-0000-000000000003');
  -- o carro do "Dono do Carro Com OS" foi vendido pro "Já Existia", que abriu
  -- OS com ele NA LOJA B — onde o admin que vai desfazer não trabalha
  insert into ordens_servico (id, numero, loja_id, cliente_id, veiculo_id) values
    ('04575555-0000-0000-0000-000000000004', 9302, loja_b,
     '04573333-0000-0000-0000-0000000000f1', '04574444-0000-0000-0000-000000000004');
  -- conta a receber do "Tem Conta", na loja B
  insert into contas_receber (id, loja_id, cliente_id, descricao, valor, vencimento) values
    ('04576666-0000-0000-0000-000000000005', loja_b, '04573333-0000-0000-0000-000000000005',
     'Fiado de teste', 100, '2026-12-01');

  -- uma tabela que ainda não existe no sistema (um agendamento, por exemplo),
  -- com a chave no pior jeito: `on delete set null`, que nunca dá erro. O
  -- desfazer tem de enxergá-la sem ninguém lembrar de mexer na função.
  create table agenda_de_teste_importacao (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid references clientes (id) on delete set null
  );
  insert into agenda_de_teste_importacao (cliente_id) values ('04573333-0000-0000-0000-000000000007');

  -- um segundo lote, que o desfazer do primeiro não pode tocar
  insert into importacao_lotes (id, operador_id) values (lote_2, o_admin);
  insert into clientes (id, nome, importacao_lote_id) values
    ('04573333-0000-0000-0000-0000000000e1', 'De Outro Lote', lote_2);
  insert into veiculos (id, cliente_id, placa, importacao_lote_id) values
    ('04574444-0000-0000-0000-0000000000e1', '04573333-0000-0000-0000-0000000000e1', 'IMP2E01', lote_2);
end;
$$;

-- A instalação completa JÁ rodou a 0083; esta segunda rodada é a de "rodar
-- de novo", e vem DEPOIS do dado gravado: ela não pode apagar marca nenhuma.
\ir ../migrations/0083_importacao_lotes.sql

-- ===================================================================
-- PARTE 2 — as checagens
-- ===================================================================

do $$
declare
  loja_a      uuid := '04570000-0000-0000-0000-00000000000a';
  o_admin     uuid := '04571111-0000-0000-0000-000000000001';
  o_cli       uuid := '04571111-0000-0000-0000-000000000002';
  o_os        uuid := '04571111-0000-0000-0000-000000000003';
  lote_1      uuid := '04572222-0000-0000-0000-000000000001';
  lote_2      uuid := '04572222-0000-0000-0000-000000000002';
  n           int;
  r           jsonb;
  esperado    jsonb;
  papel       uuid;
begin
  -- ---- 2. rodar de novo não mudou nada -----------------------------------
  if not exists (select 1 from schema_versao where versao = 83) then
    raise exception 'FALHOU 2: a 0083 não gravou a versão 83';
  end if;
  select count(*) into n from clientes where importacao_lote_id = lote_1;
  if n <> 7 then
    raise exception 'FALHOU 2: a segunda rodada mexeu na marca do lote nos clientes (% em vez de 7)', n;
  end if;
  select count(*) into n from veiculos where importacao_lote_id = lote_1;
  if n <> 4 then
    raise exception 'FALHOU 2: a segunda rodada mexeu na marca do lote nos veículos (% em vez de 4)', n;
  end if;
  if (select total_linhas from importacao_lotes where id = lote_1) <> 9 then
    raise exception 'FALHOU 2: a segunda rodada mexeu nos números do lote';
  end if;
  select count(*) into n from pg_policy where polrelid = 'importacao_lotes'::regclass;
  if n <> 3 then
    raise exception 'FALHOU 2: importacao_lotes devia ter 3 policies (ler, criar, alterar) e tem %', n;
  end if;
  select count(*) into n from pg_policy
   where polrelid = 'importacao_lotes'::regclass and polcmd in ('d', '*');
  if n <> 0 then
    raise exception 'FALHOU 2: existe policy que deixa apagar lote';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'importacao_lotes'::regclass) then
    raise exception 'FALHOU 2: a RLS de importacao_lotes está desligada';
  end if;
  select count(*) into n from pg_constraint
   where contype = 'f' and confrelid = 'importacao_lotes'::regclass
     and conrelid in ('clientes'::regclass, 'veiculos'::regclass);
  if n <> 2 then
    raise exception 'FALHOU 2: devia haver 1 chave pro lote em clientes e 1 em veiculos, há %', n;
  end if;
  -- apagar um lote (no SQL Editor) nunca leva cliente junto
  select count(*) into n from pg_constraint
   where contype = 'f' and confrelid = 'importacao_lotes'::regclass and confdeltype <> 'n';
  if n <> 0 then
    raise exception 'FALHOU 2: a chave do lote devia ser on delete set null';
  end if;
  select count(*) into n from pg_index
   where indrelid in ('clientes'::regclass, 'veiculos'::regclass)
     and pg_get_indexdef(indexrelid) like '%(importacao_lote_id)%';
  if n <> 2 then
    raise exception 'FALHOU 2: devia haver 1 índice do lote em clientes e 1 em veiculos, há %', n;
  end if;
  -- os índices das chaves que o desfazer percorre (sem eles, 10× mais lento)
  select count(*) into n from pg_index
   where (indrelid = 'ordens_servico'::regclass and pg_get_indexdef(indexrelid) like '%(veiculo_id)%')
      or (indrelid = 'contas_receber'::regclass and pg_get_indexdef(indexrelid) like '%(cliente_id)%');
  if n <> 2 then
    raise exception 'FALHOU 2: faltou (ou duplicou) o índice de ordens_servico.veiculo_id ou de contas_receber.cliente_id (há %)', n;
  end if;

  -- ---- 3. a função é security definer, com search_path, e o anônimo não chama
  select count(*) into n from pg_proc
   where proname = 'desfazer_importacao' and prosecdef
     and proconfig @> array['search_path=public'];
  if n <> 1 then
    raise exception 'FALHOU 3: desfazer_importacao devia ser uma só, security definer e com search_path';
  end if;
  set local role anon;
  begin
    r := desfazer_importacao(lote_1);
    raise exception 'FALHOU 3: o anônimo chamou desfazer_importacao';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU 3: desfazer_importacao está executável pelo anônimo (faltou o revoke)';
    end if;
  end;
  begin
    select count(*) into n from importacao_lotes;
    if n <> 0 then
      raise exception 'FALHOU 3: o anônimo leu % lote(s)', n;
    end if;
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- ---- 4. sem admin (só Clientes, ou só OS): não lê, não grava, não desfaz
  set local role authenticated;
  foreach papel in array array[o_cli, o_os] loop
    perform set_config('request.jwt.claim.sub', papel::text, true);

    select count(*) into n from importacao_lotes;
    if n <> 0 then
      raise exception 'FALHOU 4: % (sem admin) leu % lote(s)', papel, n;
    end if;
    begin
      insert into importacao_lotes (nome_arquivo) values ('nao-devia.csv');
      raise exception 'FALHOU 4: % (sem admin) criou um lote', papel;
    exception when insufficient_privilege then null;
    end;
    -- sem filtro e sem citar coluna (docs/licoes.md, item 74). Tem de dar
    -- zero linha pela regra de QUAIS linhas (using); um erro aqui quer dizer
    -- que o using deixou passar e só a conferência do valor novo segurou.
    begin
      update importacao_lotes set total_linhas = 0;
      get diagnostics n = row_count;
    exception when insufficient_privilege then
      raise exception 'FALHOU 4: a regra de alteração (using) deixou % (sem admin) chegar nos lotes', papel;
    end;
    if n <> 0 then
      raise exception 'FALHOU 4: % (sem admin) alterou % lote(s)', papel, n;
    end if;
    begin
      r := desfazer_importacao(lote_1);
      raise exception 'FALHOU 4: % (sem admin) desfez o lote', papel;
    exception when others then
      if sqlerrm like 'FALHOU%' then raise; end if;
      if sqlerrm not like '%administrador%' then
        raise exception 'FALHOU 4: a recusa pra % não está em português: %', papel, sqlerrm;
      end if;
    end;
  end loop;

  -- ---- 5. o admin: ninguém apaga lote, nem ele ----------------------------
  perform set_config('request.jwt.claim.sub', o_admin::text, true);
  select count(*) into n from importacao_lotes;
  if n <> 2 then
    raise exception 'FALHOU 5: o admin devia ler os 2 lotes e leu %', n;
  end if;
  delete from importacao_lotes;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU 5: o admin apagou % lote(s) direto na tabela', n;
  end if;

  -- ---- 6. lote que não existe ---------------------------------------------
  begin
    r := desfazer_importacao('04572222-0000-0000-0000-0000000000ff');
    raise exception 'FALHOU 6: desfez um lote que não existe';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like '%não existe%' then
      raise exception 'FALHOU 6: a recusa do lote inexistente não está em português: %', sqlerrm;
    end if;
  end;

  -- nada foi mexido pelas tentativas recusadas
  select count(*) into n from clientes where importacao_lote_id = lote_1;
  if n <> 7 or exists (select 1 from importacao_lotes where desfeito_em is not null) then
    raise exception 'FALHOU 6: uma tentativa recusada mexeu no lote';
  end if;

  -- ---- 7. desfazer o lote 1 ------------------------------------------------
  r := desfazer_importacao(lote_1);
  reset role;

  if (r ->> 'veiculos_apagados')::int <> 3 then
    raise exception 'FALHOU 7: devia apagar 3 veículos (IMP1A01, IMP1A03, IMP1F01) e apagou %: %',
      r ->> 'veiculos_apagados', r;
  end if;
  if (r ->> 'clientes_apagados')::int <> 2 then
    raise exception 'FALHOU 7: devia apagar 2 clientes (os dois "Livre") e apagou %: %',
      r ->> 'clientes_apagados', r;
  end if;

  -- 7a. apagou só o que era do lote e estava livre
  if exists (select 1 from clientes where id in ('04573333-0000-0000-0000-000000000001',
                                                 '04573333-0000-0000-0000-000000000002')) then
    raise exception 'FALHOU 7a: os clientes livres do lote continuam lá';
  end if;
  if exists (select 1 from veiculos where id in ('04574444-0000-0000-0000-000000000001',
                                                 '04574444-0000-0000-0000-000000000003',
                                                 '04574444-0000-0000-0000-0000000000f1')) then
    raise exception 'FALHOU 7a: os veículos livres do lote continuam lá';
  end if;

  -- 7b. o que não era do lote ficou: o cliente que já existia (mesmo com um
  --     veículo do lote ligado a ele), o veículo feito à mão e o outro lote
  if not exists (select 1 from clientes where id = '04573333-0000-0000-0000-0000000000f1') then
    raise exception 'FALHOU 7b: apagou o cliente que já existia antes da importação';
  end if;
  if not exists (select 1 from veiculos where id = '04574444-0000-0000-0000-000000000006') then
    raise exception 'FALHOU 7b: apagou o veículo cadastrado à mão (o cascade do cliente)';
  end if;
  if (select count(*) from clientes where importacao_lote_id = lote_2) <> 1
     or (select count(*) from veiculos where importacao_lote_id = lote_2) <> 1 then
    raise exception 'FALHOU 7b: o desfazer do lote 1 mexeu no lote 2';
  end if;

  -- 7c. o veículo com OS (na loja B) ficou, e a OS continua com ele
  if not exists (select 1 from veiculos where id = '04574444-0000-0000-0000-000000000004') then
    raise exception 'FALHOU 7c: apagou o veículo que tem OS na loja B';
  end if;
  if (select veiculo_id from ordens_servico where id = '04575555-0000-0000-0000-000000000004')
     is distinct from '04574444-0000-0000-0000-000000000004'::uuid then
    raise exception 'FALHOU 7c: a OS da loja B ficou sem o veículo';
  end if;

  -- 7d. os clientes que ficaram, cada um pelo motivo certo, e a lista exata
  esperado := jsonb_build_array(
    jsonb_build_object('tipo', 'cliente', 'id', '04573333-0000-0000-0000-000000000003', 'nome', 'Ganhou OS',            'motivo', 'já tem ordem de serviço'),
    jsonb_build_object('tipo', 'cliente', 'id', '04573333-0000-0000-0000-000000000004', 'nome', 'Dono do Carro Com OS', 'motivo', 'o veículo dele (IMP1A04) ficou'),
    jsonb_build_object('tipo', 'cliente', 'id', '04573333-0000-0000-0000-000000000005', 'nome', 'Tem Conta',            'motivo', 'tem conta a receber'),
    jsonb_build_object('tipo', 'cliente', 'id', '04573333-0000-0000-0000-000000000006', 'nome', 'Carro Fora do Lote',   'motivo', 'tem veículo cadastrado fora da importação'),
    jsonb_build_object('tipo', 'cliente', 'id', '04573333-0000-0000-0000-000000000007', 'nome', 'Tem Agendamento',      'motivo', 'é usado em agenda_de_teste_importacao'),
    jsonb_build_object('tipo', 'veiculo', 'id', '04574444-0000-0000-0000-000000000004', 'nome', 'IMP1A04',              'motivo', 'já tem ordem de serviço')
  );
  if (select jsonb_agg(m order by m ->> 'tipo', m ->> 'id') from jsonb_array_elements(r -> 'mantidos') m)
     is distinct from esperado then
    raise exception 'FALHOU 7d: a lista do que ficou não bate.% veio: % % esperado: %',
      chr(10), r -> 'mantidos', chr(10), esperado;
  end if;
  select count(*) into n from clientes
   where id in ('04573333-0000-0000-0000-000000000003', '04573333-0000-0000-0000-000000000004',
                '04573333-0000-0000-0000-000000000005', '04573333-0000-0000-0000-000000000006',
                '04573333-0000-0000-0000-000000000007');
  if n <> 5 then
    raise exception 'FALHOU 7d: a lista diz que 5 clientes ficaram, mas só % estão no banco', n;
  end if;
  if (select cliente_id from agenda_de_teste_importacao) is distinct from
     '04573333-0000-0000-0000-000000000007'::uuid then
    raise exception 'FALHOU 7d: o agendamento ficou sem o cliente';
  end if;
  -- o "Ganhou OS" ficou, mas o carro dele (do lote, sem OS) saiu: desfaz o resto
  if exists (select 1 from veiculos where cliente_id = '04573333-0000-0000-0000-000000000003') then
    raise exception 'FALHOU 7d: o veículo livre do cliente com OS não foi desfeito';
  end if;

  -- 7e. o lote ficou marcado como desfeito, por quem desfez
  if not exists (select 1 from importacao_lotes
                  where id = lote_1 and desfeito_em is not null and desfeito_por = o_admin) then
    raise exception 'FALHOU 7e: o lote não ficou marcado como desfeito pelo admin';
  end if;
  if exists (select 1 from importacao_lotes where id = lote_2 and desfeito_em is not null) then
    raise exception 'FALHOU 7e: o lote 2 ficou marcado como desfeito';
  end if;

  -- ---- 8. desfazer de novo é recusado ---------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin::text, true);
  begin
    r := desfazer_importacao(lote_1);
    raise exception 'FALHOU 8: desfez o mesmo lote duas vezes';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like '%já foi desfeit%' then
      raise exception 'FALHOU 8: a recusa do lote já desfeito não está em português: %', sqlerrm;
    end if;
  end;
  reset role;

  -- ---- limpeza ---------------------------------------------------------------
  drop table agenda_de_teste_importacao;
  delete from contas_receber where id = '04576666-0000-0000-0000-000000000005';
  delete from ordens_servico where loja_id in (loja_a, '04570000-0000-0000-0000-00000000000b');
  delete from veiculos where cliente_id in (select id from clientes where id::text like '04573333-%');
  delete from clientes where id::text like '04573333-%';
end;
$$;

\echo TODAS AS CHECAGENS PASSARAM
