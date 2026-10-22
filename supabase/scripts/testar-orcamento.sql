-- Sakura System — AutoCenter Edition
-- TESTE da migration 0065 (o orçamento como etapa da OS, tarefa #379). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava e apaga
-- dado de teste, e roda a própria migration de novo (\ir).
--
-- A promessa, em duas metades:
--   • o que passa: OS nova e venda de balcão continuam numeradas como antes;
--     o orçamento nasce sem número de OS e com o seu próprio contador por
--     loja (1, 2, 3...); aprovar dá o PRÓXIMO número de OS, sem buraco,
--     mesmo com orçamentos e OS intercalados; recusado continua sem número;
--     e rodar a migration de novo, com tudo isso gravado, não quebra nada;
--   • o que é recusado: orçamento com número de OS; OS sem número; OS
--     numerada voltando a ser orçamento; orçamento sem número de orçamento;
--     motivo de recusa fora da lista; número de orçamento repetido na loja.
--
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql. O
-- \ir lá embaixo acha a migration pelo caminho relativo a este arquivo, então
-- rodar pelo `psql -f` (ou `npm run test:sql -- testar-orcamento`), não colando
-- no SQL Editor. Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- ===================================================================
-- Parte 1: o que passa, e o que é recusado
-- ===================================================================

do $$
declare
  loja       uuid := '0c0a0000-0000-0000-0000-00000000000a';
  loja_b     uuid := '0c0a0000-0000-0000-0000-00000000000b';
  o_balcao   uuid := '0c0a1111-0000-0000-0000-000000000001';  -- só Ordens de Serviço
  cliente    uuid := '0c0a2222-0000-0000-0000-000000000001';
  consumidor uuid := '00000000-0000-0000-0000-00000000c000';
  orc1       uuid := '0c0a3333-0000-0000-0000-000000000001';
  orc2       uuid := '0c0a3333-0000-0000-0000-000000000002';
  orc3       uuid := '0c0a3333-0000-0000-0000-000000000003';
  os_id      uuid;
  n          int;
  quantas    int;
  numeros    int[];
  linha      record;
begin
  insert into lojas (id, nome, cidade, uf) values
    (loja,   'Loja (teste orçamento)',   'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste orçamento)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into auth.users (id) values (o_balcao) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_balcao, 'to_balcao', 'Balconista do orçamento', false, array['painel', 'ordens_servico'], true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values (o_balcao, loja) on conflict do nothing;
  insert into clientes (id, nome) values (cliente, 'Cliente do orçamento') on conflict (id) do nothing;

  -- ===================================================================
  -- A. OS nova continua como antes: número 1, sem nada de orçamento
  -- ===================================================================
  insert into ordens_servico (loja_id, cliente_id) values (loja, cliente)
    returning * into linha;
  if linha.numero is distinct from 1 or linha.status <> 'em_andamento' or linha.tipo <> 'os'
     or linha.numero_orcamento is not null then
    raise exception 'FALHOU: OS nova não nasceu como antes (numero %, status %, numero_orcamento %)',
      linha.numero, linha.status, linha.numero_orcamento;
  end if;

  -- ===================================================================
  -- B. Venda de balcão também: o número seguinte do mesmo contador
  -- ===================================================================
  insert into ordens_servico (loja_id, cliente_id, tipo, status)
    values (loja, consumidor, 'venda_balcao', 'concluida')
    returning numero into n;
  if n is distinct from 2 then
    raise exception 'FALHOU: a venda de balcão devia ser a 2, veio %', n;
  end if;

  -- ===================================================================
  -- C. Orçamento nasce sem número de OS e com o próprio contador (1, 2)
  -- ===================================================================
  insert into ordens_servico (id, loja_id, cliente_id, status, validade)
    values (orc1, loja, cliente, 'orcamento', current_date + 7);
  insert into ordens_servico (id, loja_id, cliente_id, status, validade)
    values (orc2, loja, cliente, 'orcamento', current_date + 7);
  select * into linha from ordens_servico where id = orc1;
  if linha.numero is not null or linha.numero_orcamento is distinct from 1 then
    raise exception 'FALHOU: 1º orçamento: esperava numero vazio e orçamento 1, veio numero % e orçamento %',
      linha.numero, linha.numero_orcamento;
  end if;
  select * into linha from ordens_servico where id = orc2;
  if linha.numero is not null or linha.numero_orcamento is distinct from 2 then
    raise exception 'FALHOU: 2º orçamento: esperava numero vazio e orçamento 2, veio numero % e orçamento %',
      linha.numero, linha.numero_orcamento;
  end if;

  -- ===================================================================
  -- D. Orçamento não gasta número de OS: a próxima OS é a 3
  -- ===================================================================
  insert into ordens_servico (loja_id, cliente_id) values (loja, cliente)
    returning numero into n;
  if n is distinct from 3 then
    raise exception 'FALHOU: depois de dois orçamentos, a OS devia ser a 3, veio %', n;
  end if;

  -- ===================================================================
  -- E. Cada loja conta os seus orçamentos (e as suas OS) do 1
  -- ===================================================================
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_b, cliente, 'orcamento')
    returning numero_orcamento into n;
  if n is distinct from 1 then
    raise exception 'FALHOU: o 1º orçamento da loja B devia ser o 1, veio %', n;
  end if;
  insert into ordens_servico (loja_id, cliente_id) values (loja_b, cliente)
    returning numero into n;
  if n is distinct from 1 then
    raise exception 'FALHOU: a 1ª OS da loja B devia ser a 1, veio %', n;
  end if;

  -- ===================================================================
  -- F. O balconista aprova o orçamento 1: vira a OS 4 (a próxima)
  -- ===================================================================
  -- Do jeito que o programa aprova: só se ainda estiver em orçamento, e como
  -- operador logado (o gatilho procura o maior número passando pela RLS).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_balcao::text, true);

  update ordens_servico
    set status = 'em_andamento', aprovado_por = 'o próprio cliente, pelo telefone', aprovado_em = now()
    where id = orc1 and status = 'orcamento';
  get diagnostics quantas = row_count;
  if quantas <> 1 then
    raise exception 'FALHOU: o balconista não conseguiu aprovar o orçamento (% linhas)', quantas;
  end if;

  -- Aprovar de novo (dois cliques, dois computadores) não acha mais o orçamento.
  update ordens_servico
    set status = 'em_andamento', aprovado_por = 'outro', aprovado_em = now()
    where id = orc1 and status = 'orcamento';
  get diagnostics quantas = row_count;
  if quantas <> 0 then
    raise exception 'FALHOU: aprovou duas vezes o mesmo orçamento';
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);

  select * into linha from ordens_servico where id = orc1;
  if linha.numero is distinct from 4 or linha.status <> 'em_andamento'
     or linha.numero_orcamento is distinct from 1
     or linha.aprovado_por is distinct from 'o próprio cliente, pelo telefone' then
    raise exception 'FALHOU: aprovar devia dar a OS 4 e manter o orçamento 1, veio numero %, orçamento %, aprovado_por %',
      linha.numero, linha.numero_orcamento, linha.aprovado_por;
  end if;

  -- ===================================================================
  -- G. Intercalados: OS nova (5), aprovar o orçamento 2 (6), OS nova (7)
  -- ===================================================================
  insert into ordens_servico (loja_id, cliente_id) values (loja, cliente)
    returning numero into n;
  if n is distinct from 5 then
    raise exception 'FALHOU: depois da aprovação, a OS nova devia ser a 5, veio %', n;
  end if;
  update ordens_servico set status = 'em_andamento' where id = orc2;
  select numero into n from ordens_servico where id = orc2;
  if n is distinct from 6 then
    raise exception 'FALHOU: o 2º orçamento aprovado devia virar a OS 6, veio %', n;
  end if;

  -- ===================================================================
  -- H. Recusado continua sem número — e não gasta número de OS
  -- ===================================================================
  insert into ordens_servico (id, loja_id, cliente_id, status) values (orc3, loja, cliente, 'orcamento');
  update ordens_servico set status = 'recusado', motivo_recusa = 'preco', recusado_em = now()
    where id = orc3 and status = 'orcamento';
  select * into linha from ordens_servico where id = orc3;
  if linha.numero is not null or linha.numero_orcamento is distinct from 3 or linha.status <> 'recusado' then
    raise exception 'FALHOU: o recusado devia ficar sem número e com orçamento 3, veio numero %, orçamento %, status %',
      linha.numero, linha.numero_orcamento, linha.status;
  end if;
  -- Recusa sem motivo também vale (o motivo é opcional).
  insert into ordens_servico (loja_id, cliente_id, status) values (loja, cliente, 'orcamento')
    returning id into os_id;
  update ordens_servico set status = 'recusado', recusado_em = now() where id = os_id;

  insert into ordens_servico (loja_id, cliente_id) values (loja, cliente)
    returning numero into n;
  if n is distinct from 7 then
    raise exception 'FALHOU: depois de um recusado, a OS nova devia ser a 7, veio %', n;
  end if;

  -- Os números de OS da loja: 1 a 7, sem buraco e sem repetir.
  select array_agg(numero order by numero) into numeros
    from ordens_servico where loja_id = loja and numero is not null;
  if numeros is distinct from array[1, 2, 3, 4, 5, 6, 7] then
    raise exception 'FALHOU: os números de OS da loja deviam ser 1 a 7, vieram %', numeros;
  end if;
  select array_agg(numero_orcamento order by numero_orcamento) into numeros
    from ordens_servico where loja_id = loja and numero_orcamento is not null;
  if numeros is distinct from array[1, 2, 3, 4] then
    raise exception 'FALHOU: os números de orçamento da loja deviam ser 1 a 4, vieram %', numeros;
  end if;

  -- ===================================================================
  -- I. Recusado: orçamento com número de OS
  -- ===================================================================
  begin
    insert into ordens_servico (loja_id, cliente_id, status, numero) values (loja, cliente, 'orcamento', 99);
    raise exception 'FALHOU: aceitou um orçamento com número de OS';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_numero_orcamento%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_numero_orcamento, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- J. Recusado: OS sem número (apagar o número de uma OS)
  -- ===================================================================
  begin
    update ordens_servico set numero = null where loja_id = loja and numero = 7;
    raise exception 'FALHOU: aceitou uma OS sem número';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_numero_orcamento%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_numero_orcamento, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- K. Recusado: OS numerada voltando a ser orçamento (nem a recusado)
  -- ===================================================================
  begin
    update ordens_servico set status = 'orcamento' where id = orc1;
    raise exception 'FALHOU: uma OS numerada voltou a ser orçamento';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_numero_orcamento%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_numero_orcamento, veio: %', sqlerrm;
    end if;
  end;
  begin
    update ordens_servico set status = 'recusado' where id = orc2;
    raise exception 'FALHOU: uma OS numerada virou recusado';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_numero_orcamento%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_numero_orcamento, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- L. Recusado: orçamento sem número de orçamento
  -- ===================================================================
  begin
    update ordens_servico set numero_orcamento = null where id = orc3;
    raise exception 'FALHOU: aceitou um orçamento sem número de orçamento';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_numero_orcamento_obrigatorio%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_numero_orcamento_obrigatorio, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- M. Recusado: motivo de recusa fora da lista
  -- ===================================================================
  begin
    update ordens_servico set motivo_recusa = 'caro demais' where id = orc3;
    raise exception 'FALHOU: aceitou um motivo de recusa fora da lista';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_motivo_recusa%' then
      raise exception 'FALHOU: esperava a trava ck_ordens_servico_motivo_recusa, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- N. Recusado: número de orçamento repetido na mesma loja
  -- ===================================================================
  begin
    insert into ordens_servico (loja_id, cliente_id, status, numero_orcamento) values (loja, cliente, 'orcamento', 2);
    raise exception 'FALHOU: aceitou dois orçamentos 2 na mesma loja';
  exception when unique_violation then
    if sqlerrm not like '%ordens_servico_loja_numero_orcamento_unique%' then
      raise exception 'FALHOU: esperava o índice ordens_servico_loja_numero_orcamento_unique, veio: %', sqlerrm;
    end if;
  end;

  -- ===================================================================
  -- O. Recusado: status inventado
  -- ===================================================================
  begin
    insert into ordens_servico (loja_id, cliente_id, status) values (loja, cliente, 'rascunho');
    raise exception 'FALHOU: aceitou um status inventado';
  exception when check_violation then
    if sqlerrm not like '%ordens_servico_status_check%' then
      raise exception 'FALHOU: esperava a trava ordens_servico_status_check, veio: %', sqlerrm;
    end if;
  end;
end $$;

-- ===================================================================
-- Parte 2: rodar a migration de novo, com tudo isso gravado
-- ===================================================================
-- Os orçamentos, os recusados e as OS aprovadas acima têm que passar pelas
-- travas recriadas, e nenhum número pode mudar.

\ir ../migrations/0065_orcamento.sql

do $$
declare
  loja     uuid := '0c0a0000-0000-0000-0000-00000000000a';
  loja_b   uuid := '0c0a0000-0000-0000-0000-00000000000b';
  o_balcao uuid := '0c0a1111-0000-0000-0000-000000000001';
  cliente  uuid := '0c0a2222-0000-0000-0000-000000000001';
  orc1     uuid := '0c0a3333-0000-0000-0000-000000000001';
  orc3     uuid := '0c0a3333-0000-0000-0000-000000000003';
  n        int;
  numeros  int[];
begin
  select array_agg(numero order by numero) into numeros
    from ordens_servico where loja_id = loja and numero is not null;
  if numeros is distinct from array[1, 2, 3, 4, 5, 6, 7] then
    raise exception 'FALHOU: depois de rodar de novo, os números de OS mudaram: %', numeros;
  end if;
  if (select numero from ordens_servico where id = orc1) is distinct from 4
     or (select numero from ordens_servico where id = orc3) is not null then
    raise exception 'FALHOU: depois de rodar de novo, o aprovado ou o recusado mudou de número';
  end if;

  -- E o gatilho recriado continua dando os próximos: OS 8 e orçamento 5.
  insert into ordens_servico (loja_id, cliente_id) values (loja, cliente) returning numero into n;
  if n is distinct from 8 then
    raise exception 'FALHOU: depois de rodar de novo, a OS nova devia ser a 8, veio %', n;
  end if;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja, cliente, 'orcamento')
    returning numero_orcamento into n;
  if n is distinct from 5 then
    raise exception 'FALHOU: depois de rodar de novo, o orçamento novo devia ser o 5, veio %', n;
  end if;

  if (select max(versao) from schema_versao) < 65 then
    raise exception 'FALHOU: a migration não registrou a versão 65';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from ordens_servico where loja_id in (loja, loja_b);
  delete from operador_lojas where operador_id = o_balcao;
  delete from operadores where id = o_balcao;
  delete from clientes where id = cliente;
  delete from lojas where id in (loja, loja_b);

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;
