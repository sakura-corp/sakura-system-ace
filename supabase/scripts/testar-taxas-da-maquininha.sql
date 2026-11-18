-- Sakura System — AutoCenter Edition
-- TESTE da migration 0088 (a taxa da maquininha, #387). NÃO é migration, e
-- NUNCA deve ser rodado no Supabase de verdade — grava dado de teste (e
-- apaga o que gravou no fim).
--
-- A promessa, nas duas metades (quem pode, consegue; quem não pode, não):
--   • A TABELA DE TAXAS DA LOJA: o admin da loja grava, altera e apaga, só
--     na loja dele; quem tem Caixa, Relações ou OS lê, mas não grava; quem
--     não tem nenhum dos três não lê; quem é de outra loja não lê a desta.
--   • A FOTOGRAFIA DA TAXA E AS DATAS: registrar_taxa_do_cartao grava as
--     duas numa transação só, e recusa (sem gravar nada) a soma que não
--     fecha, a forma ou o valor que não são os do lançamento, a quantidade
--     de datas errada e a saída. Quem tem Caixa grava e lê; quem só tem OS
--     grava a taxa de um lançamento de OS da loja dele, mas não lê; quem não
--     tem Caixa nem OS não grava. Ninguém altera nem apaga; apagar o
--     lançamento leva as duas junto.
--   • A pendurada na loja certa: quem trabalha nas DUAS lojas não pendura a
--     taxa de um lançamento da loja B dizendo que é da loja A (lição 73: só
--     quem enxerga os dois lados prova essa trava).
--   • As travas de valor, cada uma pelo nome que a tela traduz.
--   • Rodar a migration de novo não duplica trava nem policy.
--
-- As checagens de "não altera / não apaga" usam o comando SEM filtro e
-- contam com `get diagnostics` (lição 74): um filtro faria o banco aplicar
-- também a regra de leitura, e o teste passaria pela regra errada.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: `npm run test:sql -- testar-taxas-da-maquininha`.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0088; esta segunda rodada é a de
-- "rodar de novo" (idempotente).
\ir ../migrations/0088_taxas_da_maquininha.sql

do $$
declare
  loja_a      uuid := '03870000-0000-0000-0000-00000000000a';
  loja_b      uuid := '03870000-0000-0000-0000-00000000000b';
  o_admin_a   uuid := '0387a000-0000-0000-0000-000000000001';  -- admin só da loja A
  o_caixa     uuid := '0387a000-0000-0000-0000-000000000002';  -- Caixa, loja A
  o_rel       uuid := '0387a000-0000-0000-0000-000000000003';  -- só Relações, loja A
  o_os        uuid := '0387a000-0000-0000-0000-000000000004';  -- só OS, loja A
  o_painel    uuid := '0387a000-0000-0000-0000-000000000005';  -- só Início, loja A
  o_caixa_b   uuid := '0387a000-0000-0000-0000-000000000006';  -- Caixa, só loja B
  o_os_ab     uuid := '0387a000-0000-0000-0000-000000000007';  -- só OS, nas DUAS lojas
  cliente     uuid := '0387c000-0000-0000-0000-000000000001';
  os_a        uuid := '0387d000-0000-0000-0000-00000000000a';
  os_b        uuid := '0387d000-0000-0000-0000-00000000000b';
  mov_debito  uuid := '0387e000-0000-0000-0000-000000000001';  -- débito, sem OS, loja A
  mov_os_a    uuid := '0387e000-0000-0000-0000-000000000002';  -- crédito 3x, da os_a
  mov_solto   uuid := '0387e000-0000-0000-0000-000000000003';  -- crédito, sem OS, loja A
  mov_saida   uuid := '0387e000-0000-0000-0000-000000000004';  -- saída, loja A
  mov_b       uuid := '0387e000-0000-0000-0000-00000000000b';  -- crédito, da os_b, loja B
  mov_tudo    uuid := '0387e000-0000-0000-0000-000000000005';  -- crédito 3x antecipado, loja A
  todos       uuid[];
  n           int;
  trava       text;
  funcao      constant text :=
    'registrar_taxa_do_cartao(uuid, text, integer, numeric, integer, boolean, numeric, numeric, numeric, jsonb)';
begin
  todos := array[o_admin_a, o_caixa, o_rel, o_os, o_painel, o_caixa_b, o_os_ab];

  -- =====================================================================
  -- A. A estrutura
  -- =====================================================================
  if not exists (select 1 from schema_versao where versao = 88) then
    raise exception 'FALHOU A1: a 0088 não gravou a versão 88';
  end if;

  select count(*) into n from pg_class
   where relname in ('configuracoes_taxas_maquininha', 'caixa_taxas_cartao', 'caixa_cartao_a_receber')
     and relrowsecurity;
  if n <> 3 then
    raise exception 'FALHOU A2: esperava as 3 tabelas novas com RLS ligada, achou %', n;
  end if;

  -- As travas e as policies existem uma vez só (a segunda rodada não
  -- duplicou nem quebrou).
  foreach trava in array array[
    'ck_taxas_maquininha_forma', 'ck_taxas_maquininha_parcelas',
    'ck_taxas_maquininha_taxa', 'ck_taxas_maquininha_prazo',
    'ck_caixa_taxas_cartao_condicoes', 'ck_caixa_taxas_cartao_valores',
    'ck_caixa_cartao_a_receber_numero', 'ck_caixa_cartao_a_receber_valor'
  ] loop
    select count(*) into n from pg_constraint where conname = trava;
    if n <> 1 then
      raise exception 'FALHOU A3: esperava 1 trava %, achou %', trava, n;
    end if;
  end loop;

  select count(*) into n from pg_policies
   where tablename = 'configuracoes_taxas_maquininha' and cmd in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if n <> 4 then
    raise exception 'FALHOU A4: a tabela de taxas devia ter 4 policies (uma por comando), tem %', n;
  end if;
  -- As duas da fotografia: só leitura e inserção. Uma `for all` ou uma de
  -- alterar/apagar abriria a reescrita do passado.
  select count(*) into n from pg_policies
   where tablename in ('caixa_taxas_cartao', 'caixa_cartao_a_receber')
     and cmd not in ('SELECT', 'INSERT');
  if n <> 0 then
    raise exception 'FALHOU A5: a fotografia da taxa ganhou % policy(s) além de ler e inserir', n;
  end if;

  -- A função roda como quem chama, e quem não está logado não a chama
  -- (conferido pela permissão, lição 76).
  if exists (select 1 from pg_proc where oid = funcao::regprocedure and prosecdef) then
    raise exception 'FALHOU A6: registrar_taxa_do_cartao virou security definer — ela pularia a RLS';
  end if;
  if has_function_privilege('anon', funcao, 'execute') then
    raise exception 'FALHOU A7: quem não está logado pode chamar registrar_taxa_do_cartao';
  end if;
  if not has_function_privilege('authenticated', funcao, 'execute') then
    raise exception 'FALHOU A8: quem está logado não pode chamar registrar_taxa_do_cartao';
  end if;

  -- =====================================================================
  -- Preparo
  -- =====================================================================
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A de Teste', 'Araraquara', 'SP'),
    (loja_b, 'Loja B de Teste', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  insert into auth.users (id) select unnest(todos) on conflict do nothing;

  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin_a, 'tm_admin_a', 'Admin da A',      true,  array['painel'],                  true),
    (o_caixa,   'tm_caixa',   'Caixa da A',      false, array['painel','caixa'],          true),
    (o_rel,     'tm_rel',     'Só Relações',     false, array['painel','relatorios'],     true),
    (o_os,      'tm_os',      'Só OS',           false, array['painel','ordens_servico'], true),
    (o_painel,  'tm_painel',  'Só Início',       false, array['painel'],                  true),
    (o_caixa_b, 'tm_caixa_b', 'Caixa da B',      false, array['painel','caixa'],          true),
    (o_os_ab,   'tm_os_ab',   'Só OS, nas duas', false, array['painel','ordens_servico'], true)
    on conflict (id) do nothing;

  insert into operador_lojas (operador_id, loja_id) values
    (o_admin_a, loja_a), (o_caixa, loja_a), (o_rel, loja_a), (o_os, loja_a),
    (o_painel, loja_a), (o_caixa_b, loja_b), (o_os_ab, loja_a), (o_os_ab, loja_b)
    on conflict do nothing;

  insert into clientes (id, nome, tipo_pessoa) values (cliente, 'Cliente de Teste', 'fisica')
    on conflict (id) do nothing;

  insert into ordens_servico (id, loja_id, cliente_id, status) values
    (os_a, loja_a, cliente, 'faturada'),
    (os_b, loja_b, cliente, 'faturada')
    on conflict (id) do nothing;

  insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao) values
    (mov_debito, loja_a, null, 'entrada', 'cartao_debito',  100.00, 'Venda no débito'),
    (mov_os_a,   loja_a, os_a, 'entrada', 'cartao_credito', 300.00, 'Faturamento da OS A'),
    (mov_solto,  loja_a, null, 'entrada', 'cartao_credito',  50.00, 'Entrada solta no crédito'),
    (mov_saida,  loja_a, null, 'saida',   'cartao_credito',  80.00, 'Saída no cartão'),
    (mov_b,      loja_b, os_b, 'entrada', 'cartao_credito', 200.00, 'Faturamento da OS B'),
    (mov_tudo,   loja_a, null, 'entrada', 'cartao_credito', 150.00, 'Crédito antecipado');

  -- A tabela da loja B, pra "outra loja não lê a da loja A" ter o que
  -- comparar.
  insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
    values (loja_b, 'cartao_credito', 1, 2.50, 30);

  set local role authenticated;

  -- =====================================================================
  -- B. O admin da loja A: grava, altera e apaga, só na loja dele
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_admin_a::text, true);

  insert into configuracoes_taxas_maquininha
    (loja_id, forma, parcelas, taxa_percentual, prazo_dias, recebe_tudo_de_uma_vez) values
    (loja_a, 'cartao_debito',  1, 1.90,  1, false),
    (loja_a, 'cartao_credito', 1, 3.10, 30, false),
    (loja_a, 'cartao_credito', 3, 4.20, 30, false),
    (loja_a, 'cartao_credito', 6, 4.20, 30, true);

  select count(*) into n from configuracoes_taxas_maquininha;
  if n <> 4 then
    raise exception 'FALHOU B1: o admin da loja A devia ler as 4 taxas da loja dele e leu %', n;
  end if;

  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_b, 'cartao_credito', 2, 9.99, 30);
    raise exception 'FALHOU B2: o admin da loja A gravou a taxa da loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- Sem filtro: só as 4 da loja A podem mudar.
  update configuracoes_taxas_maquininha set atualizado_em = now(); get diagnostics n = row_count;
  if n <> 4 then
    raise exception 'FALHOU B3: o admin da loja A alterou % taxa(s) — esperava as 4 da loja dele', n;
  end if;

  -- =====================================================================
  -- C. O Caixa: lê, não grava
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);

  select count(*) into n from configuracoes_taxas_maquininha;
  if n <> 4 then
    raise exception 'FALHOU C1: o Caixa devia ler as 4 taxas da loja A e leu %', n;
  end if;

  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_credito', 2, 0.01, 30);
    raise exception 'FALHOU C2: o Caixa gravou uma taxa — só o admin da loja grava';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  update configuracoes_taxas_maquininha set taxa_percentual = 0; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU C3: o Caixa alterou % taxa(s)', n; end if;
  delete from configuracoes_taxas_maquininha; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU C4: o Caixa apagou % taxa(s)', n; end if;

  -- =====================================================================
  -- D. Relações e OS leem; o Início não; a outra loja não lê a desta
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_rel::text, true);
  select count(*) into n from configuracoes_taxas_maquininha;
  if n <> 4 then raise exception 'FALHOU D1: Relações devia ler as 4 taxas da loja A e leu %', n; end if;

  perform set_config('request.jwt.claim.sub', o_os::text, true);
  select count(*) into n from configuracoes_taxas_maquininha;
  if n <> 4 then
    raise exception 'FALHOU D2: quem só tem OS devia ler as 4 taxas da loja A (precisa pra faturar) e leu %', n;
  end if;
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_credito', 2, 0.01, 30);
    raise exception 'FALHOU D3: quem só tem OS gravou uma taxa';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', o_painel::text, true);
  select count(*) into n from configuracoes_taxas_maquininha;
  if n <> 0 then
    raise exception 'FALHOU D4: quem só tem o Início (sem Caixa, Relações nem OS) leu % taxa(s)', n;
  end if;

  perform set_config('request.jwt.claim.sub', o_caixa_b::text, true);
  select count(*) into n from configuracoes_taxas_maquininha where loja_id = loja_a;
  if n <> 0 then
    raise exception 'FALHOU D5: o Caixa da loja B leu % taxa(s) da loja A', n;
  end if;
  select count(*) into n from configuracoes_taxas_maquininha;
  if n <> 1 then
    raise exception 'FALHOU D6: o Caixa da loja B devia ler só a taxa da loja dele (1) e leu %', n;
  end if;

  -- =====================================================================
  -- E. A função, pelo Caixa: grava as duas e recusa o que não fecha
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);

  -- E1. Débito de R$ 100 a 1,90%: taxa R$ 1,90, cai R$ 98,10 amanhã.
  perform registrar_taxa_do_cartao(
    mov_debito, 'cartao_debito', 1, 1.90, 1, false, 100.00, 1.90, 98.10,
    jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 1, 'valor', 98.10)));

  select count(*) into n from caixa_taxas_cartao
   where movimento_id = mov_debito and loja_id = loja_a and valor_liquido = 98.10;
  if n <> 1 then raise exception 'FALHOU E1: a fotografia da taxa do débito não foi gravada (ou não pro Caixa ler)'; end if;
  select count(*) into n from caixa_cartao_a_receber
   where movimento_id = mov_debito and loja_id = loja_a and data_prevista = current_date + 1 and valor = 98.10;
  if n <> 1 then raise exception 'FALHOU E2: a data do débito não foi gravada (ou não pro Caixa ler)'; end if;

  -- E3. A soma das datas não fecha com o líquido (faltam 10 centavos): recusa,
  --     e não grava nem a fotografia (as duas ou nenhuma).
  begin
    perform registrar_taxa_do_cartao(
      mov_solto, 'cartao_credito', 1, 3.10, 30, false, 50.00, 1.55, 48.45,
      jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 48.35)));
    raise exception 'FALHOU E3: a função aceitou datas que somam R$ 48,35 com líquido de R$ 48,45';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'A soma%' then
      raise exception 'FALHOU E3: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;
  select count(*) into n from caixa_taxas_cartao where movimento_id = mov_solto;
  if n <> 0 then raise exception 'FALHOU E4: a soma não fechou e mesmo assim a fotografia foi gravada'; end if;

  -- E5. Forma que não é a do lançamento.
  begin
    perform registrar_taxa_do_cartao(
      mov_solto, 'cartao_debito', 1, 1.90, 1, false, 50.00, 0.95, 49.05,
      jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 1, 'valor', 49.05)));
    raise exception 'FALHOU E5: a função aceitou taxa de débito num lançamento de crédito';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'A forma%' then
      raise exception 'FALHOU E5: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;

  -- E6. Valor que não é o do lançamento.
  begin
    perform registrar_taxa_do_cartao(
      mov_solto, 'cartao_credito', 1, 3.10, 30, false, 60.00, 1.86, 58.14,
      jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 58.14)));
    raise exception 'FALHOU E6: a função aceitou um valor cheio diferente do lançamento';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'O valor%' then
      raise exception 'FALHOU E6: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;

  -- E7. Três parcelas sem antecipação pedem três datas; vieram duas.
  begin
    perform registrar_taxa_do_cartao(
      mov_tudo, 'cartao_credito', 3, 4.20, 30, false, 150.00, 6.30, 143.70,
      jsonb_build_array(
        jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 71.85),
        jsonb_build_object('numero', 2, 'data_prevista', current_date + 60, 'valor', 71.85)));
    raise exception 'FALHOU E7: a função aceitou 2 datas pra 3 parcelas';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'As datas%' then
      raise exception 'FALHOU E7: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;

  -- E8. Antecipado ("recebe tudo de uma vez") pede uma data só; vieram três.
  begin
    perform registrar_taxa_do_cartao(
      mov_tudo, 'cartao_credito', 3, 4.20, 30, true, 150.00, 6.30, 143.70,
      jsonb_build_array(
        jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 47.90),
        jsonb_build_object('numero', 2, 'data_prevista', current_date + 60, 'valor', 47.90),
        jsonb_build_object('numero', 3, 'data_prevista', current_date + 90, 'valor', 47.90)));
    raise exception 'FALHOU E8: a função aceitou 3 datas numa venda antecipada';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'As datas%' then
      raise exception 'FALHOU E8: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;

  -- E9. Antecipado certo: uma data, com o líquido inteiro.
  perform registrar_taxa_do_cartao(
    mov_tudo, 'cartao_credito', 3, 4.20, 30, true, 150.00, 6.30, 143.70,
    jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 143.70)));
  select count(*) into n from caixa_cartao_a_receber where movimento_id = mov_tudo;
  if n <> 1 then raise exception 'FALHOU E9: a venda antecipada devia ter 1 data e tem %', n; end if;

  -- E10. Saída não tem taxa de maquininha: nem pela função, nem direto.
  begin
    perform registrar_taxa_do_cartao(
      mov_saida, 'cartao_credito', 1, 3.10, 30, false, 80.00, 2.48, 77.52,
      jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 77.52)));
    raise exception 'FALHOU E10: a função gravou taxa numa saída';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'A taxa do cartão só vale%' then
      raise exception 'FALHOU E10: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values (mov_saida, loja_a, 'cartao_credito', 1, 3.10, 30, 80.00, 2.48, 77.52);
    raise exception 'FALHOU E11: o Caixa pendurou uma taxa numa saída, direto na tabela';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- E12. Ninguém altera nem apaga a fotografia (nem o Caixa, que lê).
  update caixa_taxas_cartao set valor_taxa = 0, valor_liquido = valor_bruto; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU E12: o Caixa alterou % fotografia(s) de taxa', n; end if;
  delete from caixa_taxas_cartao; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU E13: o Caixa apagou % fotografia(s) de taxa', n; end if;
  update caixa_cartao_a_receber set valor = 0; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU E14: o Caixa alterou % data(s) do cartão a receber', n; end if;
  delete from caixa_cartao_a_receber; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU E15: o Caixa apagou % data(s) do cartão a receber', n; end if;

  -- =====================================================================
  -- F. Quem só tem OS: grava a taxa do lançamento de OS, não lê
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_os::text, true);

  -- F1. Crédito 3x de R$ 300 a 4,20%: taxa R$ 12,60, três de R$ 95,80.
  perform registrar_taxa_do_cartao(
    mov_os_a, 'cartao_credito', 3, 4.20, 30, false, 300.00, 12.60, 287.40,
    jsonb_build_array(
      jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 95.80),
      jsonb_build_object('numero', 2, 'data_prevista', current_date + 60, 'valor', 95.80),
      jsonb_build_object('numero', 3, 'data_prevista', current_date + 90, 'valor', 95.80)));

  select count(*) into n from caixa_taxas_cartao;
  if n <> 0 then raise exception 'FALHOU F2: quem só tem OS leu % fotografia(s) de taxa', n; end if;
  select count(*) into n from caixa_cartao_a_receber;
  if n <> 0 then raise exception 'FALHOU F3: quem só tem OS leu % data(s) do cartão a receber', n; end if;

  -- F4. Lançamento sem OS ele nem enxerga: a função diz "não encontrado"…
  begin
    perform registrar_taxa_do_cartao(
      mov_solto, 'cartao_credito', 1, 3.10, 30, false, 50.00, 1.55, 48.45,
      jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 48.45)));
    raise exception 'FALHOU F4: quem só tem OS gravou a taxa de um lançamento que não é de OS';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'O lançamento do Caixa%não foi encontrado%' then
      raise exception 'FALHOU F4: recusou, mas pelo motivo errado: %', sqlerrm;
    end if;
  end;
  -- … e direto na tabela a RLS recusa.
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values (mov_solto, loja_a, 'cartao_credito', 1, 3.10, 30, 50.00, 1.55, 48.45);
    raise exception 'FALHOU F5: quem só tem OS pendurou taxa num lançamento que não é de OS';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- =====================================================================
  -- G. Quem não tem Caixa nem OS não grava
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_rel::text, true);
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values (mov_solto, loja_a, 'cartao_credito', 1, 3.10, 30, 50.00, 1.55, 48.45);
    raise exception 'FALHOU G1: Relações gravou uma taxa de cartão';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  -- Relações lê o que o Caixa e a OS gravaram (débito, antecipado e a OS).
  select count(*) into n from caixa_taxas_cartao;
  if n <> 3 then raise exception 'FALHOU G2: Relações devia ler as 3 fotografias da loja A e leu %', n; end if;
  select count(*) into n from caixa_cartao_a_receber;
  if n <> 5 then raise exception 'FALHOU G3: Relações devia ler as 5 datas da loja A (1 + 1 + 3) e leu %', n; end if;

  perform set_config('request.jwt.claim.sub', o_painel::text, true);
  select count(*) into n from caixa_taxas_cartao;
  if n <> 0 then raise exception 'FALHOU G4: quem só tem o Início leu % fotografia(s)', n; end if;
  select count(*) into n from caixa_cartao_a_receber;
  if n <> 0 then raise exception 'FALHOU G5: quem só tem o Início leu % data(s)', n; end if;
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values (mov_solto, loja_a, 'cartao_credito', 1, 3.10, 30, 50.00, 1.55, 48.45);
    raise exception 'FALHOU G6: quem só tem o Início gravou uma taxa de cartão';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- G7. O Caixa da loja B não lê as da loja A.
  perform set_config('request.jwt.claim.sub', o_caixa_b::text, true);
  select count(*) into n from caixa_taxas_cartao;
  if n <> 0 then raise exception 'FALHOU G7: o Caixa da loja B leu % fotografia(s) da loja A', n; end if;
  select count(*) into n from caixa_cartao_a_receber;
  if n <> 0 then raise exception 'FALHOU G8: o Caixa da loja B leu % data(s) da loja A', n; end if;

  -- =====================================================================
  -- H. A loja certa: quem trabalha nas duas lojas enxerga os dois
  --    lançamentos de OS, e mesmo assim não pendura o da loja B na loja A
  --    (lição 73)
  -- =====================================================================
  reset role;
  -- A fotografia do lançamento da loja B existe (gravada aqui como dono do
  -- banco), pra que a chave estrangeira das datas não seja o que barra: quem
  -- tem de barrar é a RLS.
  insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                  valor_bruto, valor_taxa, valor_liquido)
    values (mov_b, loja_b, 'cartao_credito', 1, 2.50, 30, 200.00, 5.00, 195.00);
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os_ab::text, true);

  begin
    insert into caixa_cartao_a_receber (movimento_id, loja_id, numero, data_prevista, valor)
      values (mov_b, loja_a, 1, current_date + 30, 195.00);
    raise exception 'FALHOU H1: a data de um lançamento da loja B entrou como se fosse da loja A';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- H2. Pela tabela da fotografia: um lançamento novo da loja B, sem taxa
  --     ainda, pendurado como da loja A.
  reset role;
  insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
    values ('0387e000-0000-0000-0000-0000000000b2', loja_b, os_b, 'entrada', 'cartao_credito', 10.00, 'Outra da B');
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os_ab::text, true);
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values ('0387e000-0000-0000-0000-0000000000b2', loja_a, 'cartao_credito', 1, 3.10, 30, 10.00, 0.31, 9.69);
    raise exception 'FALHOU H2: a taxa de um lançamento da loja B entrou como se fosse da loja A';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  -- E na loja certa, a função grava (o loja_id vem do lançamento).
  perform registrar_taxa_do_cartao(
    '0387e000-0000-0000-0000-0000000000b2', 'cartao_credito', 1, 2.50, 30, false, 10.00, 0.25, 9.75,
    jsonb_build_array(jsonb_build_object('numero', 1, 'data_prevista', current_date + 30, 'valor', 9.75)));
  reset role;
  select count(*) into n from caixa_taxas_cartao
   where movimento_id = '0387e000-0000-0000-0000-0000000000b2' and loja_id = loja_b;
  if n <> 1 then raise exception 'FALHOU H3: a função não gravou a taxa na loja do lançamento (B)'; end if;

  -- =====================================================================
  -- I. Apagar o lançamento leva a taxa e as datas junto
  -- =====================================================================
  select count(*) into n from caixa_cartao_a_receber where movimento_id = mov_os_a;
  if n <> 3 then raise exception 'FALHOU I1: a OS devia ter 3 datas gravadas antes de apagar e tem %', n; end if;

  -- Quem apaga é o Caixa, pelo caminho de sempre (ele pode apagar lançamento).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  delete from caixa_movimentos where id = mov_os_a; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU I2: o Caixa não conseguiu apagar o lançamento da OS'; end if;
  reset role;

  select count(*) into n from caixa_taxas_cartao where movimento_id = mov_os_a;
  if n <> 0 then raise exception 'FALHOU I3: o lançamento foi apagado e a fotografia da taxa ficou'; end if;
  select count(*) into n from caixa_cartao_a_receber where movimento_id = mov_os_a;
  if n <> 0 then raise exception 'FALHOU I4: o lançamento foi apagado e % data(s) do cartão ficaram', n; end if;

  -- =====================================================================
  -- J. As travas de valor (como dono do banco: aqui é a trava, não a RLS)
  -- =====================================================================
  -- Débito parcelado não existe.
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_debito', 2, 1.90, 1);
    raise exception 'FALHOU J1: aceitou débito em 2 parcelas';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_taxas_maquininha_parcelas' then
      raise exception 'FALHOU J1: débito em 2 parcelas bateu na trava errada (%)', trava;
    end if;
  end;

  -- 13 parcelas também não.
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_credito', 13, 5.00, 30);
    raise exception 'FALHOU J2: aceitou 13 parcelas';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_taxas_maquininha_parcelas' then
      raise exception 'FALHOU J2: 13 parcelas bateu na trava errada (%)', trava;
    end if;
  end;

  -- Taxa de 100% (ou mais) não; 99,99% sim (a borda).
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_credito', 2, 100, 30);
    raise exception 'FALHOU J3: aceitou taxa de 100%%';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_taxas_maquininha_taxa' then
      raise exception 'FALHOU J3: taxa de 100%% bateu na trava errada (%)', trava;
    end if;
  end;
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_credito', 2, -0.01, 30);
    raise exception 'FALHOU J4: aceitou taxa negativa';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_taxas_maquininha_taxa' then
      raise exception 'FALHOU J4: taxa negativa bateu na trava errada (%)', trava;
    end if;
  end;
  insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
    values (loja_a, 'cartao_credito', 2, 99.99, 30);

  -- Prazo de mais de um ano não; forma que não é cartão não.
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'cartao_credito', 4, 4.20, 366);
    raise exception 'FALHOU J5: aceitou prazo de 366 dias';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_taxas_maquininha_prazo' then
      raise exception 'FALHOU J5: prazo de 366 dias bateu na trava errada (%)', trava;
    end if;
  end;
  begin
    insert into configuracoes_taxas_maquininha (loja_id, forma, parcelas, taxa_percentual, prazo_dias)
      values (loja_a, 'pix', 1, 0.99, 0);
    raise exception 'FALHOU J6: aceitou taxa de maquininha pro Pix';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_taxas_maquininha_forma' then
      raise exception 'FALHOU J6: Pix bateu na trava errada (%)', trava;
    end if;
  end;

  -- Na fotografia: débito parcelado não; líquido que não é cheio − taxa não.
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values (mov_solto, loja_a, 'cartao_debito', 2, 1.90, 1, 50.00, 0.95, 49.05);
    raise exception 'FALHOU J7: a fotografia aceitou débito em 2 parcelas';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_caixa_taxas_cartao_condicoes' then
      raise exception 'FALHOU J7: débito parcelado na fotografia bateu na trava errada (%)', trava;
    end if;
  end;
  begin
    insert into caixa_taxas_cartao (movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
                                    valor_bruto, valor_taxa, valor_liquido)
      values (mov_solto, loja_a, 'cartao_credito', 1, 3.10, 30, 50.00, 1.55, 48.46);
    raise exception 'FALHOU J8: a fotografia aceitou líquido que não é o cheio menos a taxa';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_caixa_taxas_cartao_valores' then
      raise exception 'FALHOU J8: líquido errado bateu na trava errada (%)', trava;
    end if;
  end;

  -- Nas datas: parcela 13 não; valor negativo não.
  begin
    insert into caixa_cartao_a_receber (movimento_id, loja_id, numero, data_prevista, valor)
      values (mov_debito, loja_a, 13, current_date, 1.00);
    raise exception 'FALHOU J9: aceitou a parcela 13';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_caixa_cartao_a_receber_numero' then
      raise exception 'FALHOU J9: parcela 13 bateu na trava errada (%)', trava;
    end if;
  end;
  begin
    insert into caixa_cartao_a_receber (movimento_id, loja_id, numero, data_prevista, valor)
      values (mov_debito, loja_a, 2, current_date, -0.01);
    raise exception 'FALHOU J10: aceitou valor negativo a receber';
  exception when check_violation then
    get stacked diagnostics trava = constraint_name;
    if trava <> 'ck_caixa_cartao_a_receber_valor' then
      raise exception 'FALHOU J10: valor negativo bateu na trava errada (%)', trava;
    end if;
  end;

  -- =====================================================================
  -- K. O admin apaga a tabela da loja dele, e só a dele; e a trilha anotou
  -- =====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin_a::text, true);
  delete from configuracoes_taxas_maquininha; get diagnostics n = row_count;
  if n <> 5 then
    raise exception 'FALHOU K1: o admin da loja A apagou % taxa(s) — esperava as 5 da loja dele', n;
  end if;
  reset role;
  select count(*) into n from configuracoes_taxas_maquininha where loja_id = loja_b;
  if n <> 1 then raise exception 'FALHOU K2: a taxa da loja B sumiu quando o admin da loja A apagou as dele'; end if;

  select count(*) into n from auditoria where tabela = 'configuracoes_taxas_maquininha';
  if n = 0 then raise exception 'FALHOU K3: mexer na tabela de taxas não deixou rastro na auditoria'; end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from caixa_movimentos where loja_id in (loja_a, loja_b);  -- leva taxas e datas
  delete from configuracoes_taxas_maquininha where loja_id in (loja_a, loja_b);
  delete from ordens_servico where loja_id in (loja_a, loja_b);
  delete from clientes where id = cliente;
  delete from funcionarios where operador_id = any (todos);
  delete from operador_lojas where operador_id = any (todos);
  delete from operadores where id = any (todos);
  delete from auth.users where id = any (todos);
  delete from depositos where loja_id in (loja_a, loja_b);
  delete from configuracoes_garantia where loja_id in (loja_a, loja_b);
  delete from configuracoes_fiscais_loja where loja_id in (loja_a, loja_b);
  delete from configuracoes_painel_inicio where loja_id in (loja_a, loja_b);
  delete from lojas where id in (loja_a, loja_b);
  delete from auditoria;

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end;
$$;
