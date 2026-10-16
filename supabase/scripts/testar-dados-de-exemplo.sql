-- Sakura System — AutoCenter Edition
-- TESTE dos dados de exemplo do Supabase de teste da equipe
-- (supabase/exemplo/*.sql). NÃO é migration, e NUNCA deve ser rodado no
-- Supabase de verdade — grava e apaga dado de teste.
--
-- A promessa:
--   A. a trava: num banco com cara de loja (cliente cadastrado sem exemplo,
--      token da Focus NFe, nota em produção, OS em outra loja), o script de
--      exemplo para e não grava NADA; o de apagar também não apaga nada;
--   B. o exemplo entra inteiro e do jeito que o programa gravaria (contas
--      batendo com as OS, estoque nunca negativo, CPF/CNPJ com dígito certo,
--      placa no formato, e-mail só @example.com, nenhuma credencial fiscal);
--   C. rodar DUAS vezes não muda nada (nem uma linha a mais, em tabela
--      nenhuma, nem na auditoria);
--   D. o login da equipe (ligar-login.sql) vira operador comum, só na loja
--      de exemplo, e pela RLS enxerga a loja de exemplo e não a Loja 1;
--   E. o "apagar" zera a loja de exemplo sem tirar os logins, e o exemplo
--      volta igualzinho depois.
--
-- Roda os arquivos DE VERDADE (\ir), não uma cópia. Como rodar: ver o
-- cabeçalho de scripts/testar-sql.mjs (npm run test:sql -- dados-de-exemplo).
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

\set ON_ERROR_STOP 1
\set QUIET 1

-- Quantas linhas tem cada tabela do sistema (pra provar "não mudou nada").
create or replace function pg_temp.contagens()
returns table (tabela text, linhas bigint)
language plpgsql
as $$
declare t text;
begin
  for t in select table_name from information_schema.tables
           where table_schema = 'public' and table_type = 'BASE TABLE' order by 1 loop
    tabela := t;
    execute format('select count(*) from %I', t) into linhas;
    return next;
  end loop;
end $$;

create temp table antes_de_tudo as select * from pg_temp.contagens();

-- CPF e CNPJ com dígito verificador certo (o que um sistema de verdade confere).
create or replace function pg_temp.documento_valido(doc text)
returns boolean
language plpgsql
as $$
declare
  d int[];
  s int;
  r int;
  i int;
  pesos1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2];
  pesos2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2];
  n text := regexp_replace(doc, '\D', '', 'g');
begin
  d := array(select substr(n, k, 1)::int from generate_series(1, length(n)) k);
  if length(n) = 11 then
    s := 0; for i in 1..9 loop s := s + d[i] * (11 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    if r <> d[10] then return false; end if;
    s := 0; for i in 1..10 loop s := s + d[i] * (12 - i); end loop;
    r := (s * 10) % 11; if r = 10 then r := 0; end if;
    return r = d[11];
  elsif length(n) = 14 then
    s := 0; for i in 1..12 loop s := s + d[i] * pesos1[i]; end loop;
    r := s % 11; r := case when r < 2 then 0 else 11 - r end;
    if r <> d[13] then return false; end if;
    s := 0; for i in 1..13 loop s := s + d[i] * pesos2[i]; end loop;
    r := s % 11; r := case when r < 2 then 0 else 11 - r end;
    return r = d[14];
  end if;
  return false;
end $$;

-- ===================================================================
-- A. A trava: banco com cara de loja → o exemplo não grava nada
-- ===================================================================
\set ON_ERROR_STOP 0

-- A1. Já tem cliente de verdade e nunca recebeu o exemplo
insert into clientes (id, nome) values ('a1a1a1a1-0000-4000-8000-000000000001', 'Cliente de verdade');
\echo '(A1: o erro "PAREI" logo abaixo é esperado)'
\ir ../exemplo/dados-de-exemplo.sql
delete from clientes where id = 'a1a1a1a1-0000-4000-8000-000000000001';
do $$ begin
  if exists (select 1 from lojas where id = 'eeee0001-0000-4000-8000-000000000001')
     or exists (select 1 from clientes where id::text like 'eeee%') then
    raise exception 'FALHOU (A1): com cliente de verdade no banco, o exemplo gravou mesmo assim';
  end if;
end $$;

-- A2. Tem token da Focus NFe no cofre
insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
  values ('00000000-0000-0000-0000-000000000001', 'token-de-mentira-do-teste');
\echo '(A2: o erro "PAREI" logo abaixo é esperado)'
\ir ../exemplo/dados-de-exemplo.sql
delete from segredos_fiscais_loja;
do $$ begin
  if exists (select 1 from lojas where id = 'eeee0001-0000-4000-8000-000000000001') then
    raise exception 'FALHOU (A2): com token da Focus NFe no banco, o exemplo gravou mesmo assim';
  end if;
end $$;

-- A3. Tem loja emitindo nota em produção
update configuracoes_fiscais_loja set focus_nfe_ambiente = 'producao'
  where loja_id = '00000000-0000-0000-0000-000000000001';
\echo '(A3: o erro "PAREI" logo abaixo é esperado)'
\ir ../exemplo/dados-de-exemplo.sql
update configuracoes_fiscais_loja set focus_nfe_ambiente = 'homologacao'
  where loja_id = '00000000-0000-0000-0000-000000000001';
do $$ begin
  if exists (select 1 from lojas where id = 'eeee0001-0000-4000-8000-000000000001') then
    raise exception 'FALHOU (A3): com nota em produção, o exemplo gravou mesmo assim';
  end if;
end $$;

-- A4. Tem ordem de serviço noutra loja (no Consumidor, que não conta como cliente)
insert into ordens_servico (id, loja_id, cliente_id)
  values ('a4a4a4a4-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-00000000c000');
\echo '(A4: o erro "PAREI" logo abaixo é esperado)'
\ir ../exemplo/dados-de-exemplo.sql
delete from ordens_servico where id = 'a4a4a4a4-0000-4000-8000-000000000001';
do $$ begin
  if exists (select 1 from lojas where id = 'eeee0001-0000-4000-8000-000000000001') then
    raise exception 'FALHOU (A4): com OS em outra loja, o exemplo gravou mesmo assim';
  end if;
end $$;

-- A5. O "ligar login" sem os campos trocados, e antes de existir a loja de exemplo
\echo '(A5: o erro "PAREI" logo abaixo é esperado)'
\ir ../exemplo/ligar-login.sql
do $$ begin
  if exists (select 1 from operadores) then
    raise exception 'FALHOU (A5): o ligar-login criou operador sem loja de exemplo / sem os campos trocados';
  end if;
end $$;

\set ON_ERROR_STOP 1

do $$ begin
  if exists (
    select 1 from pg_temp.contagens() c join antes_de_tudo a using (tabela)
    where c.linhas <> a.linhas and c.tabela <> 'auditoria'
  ) then
    raise exception 'FALHOU (A): as tentativas recusadas deixaram linha sobrando em alguma tabela';
  end if;
end $$;

-- ===================================================================
-- B. O exemplo entra inteiro, e certo
-- ===================================================================
\ir ../exemplo/dados-de-exemplo.sql

do $$
declare
  loja constant uuid := 'eeee0001-0000-4000-8000-000000000001';
  quantas int;
  linha record;
begin
  -- B1. tudo o que foi prometido existe
  for linha in select * from (values
      ('clientes',            (select count(*) from clientes where id::text like 'eeee%'), 8),
      ('veiculos',            (select count(*) from veiculos where id::text like 'eeee%'), 9),
      ('funcionarios',        (select count(*) from funcionarios where loja_id = loja), 3),
      ('pecas',               (select count(*) from pecas where id::text like 'eeee%'), 12),
      ('fornecedores',        (select count(*) from fornecedores where id::text like 'eeee%'), 2),
      ('ordens_servico',      (select count(*) from ordens_servico where loja_id = loja), 12),
      ('ordens_servico_itens',(select count(*) from ordens_servico_itens i join ordens_servico o on o.id = i.ordem_servico_id where o.loja_id = loja), 28),
      ('caixa_movimentos',    (select count(*) from caixa_movimentos where loja_id = loja), 12),
      ('contas_pagar',        (select count(*) from contas_pagar where loja_id = loja), 5),
      ('contas_receber',      (select count(*) from contas_receber where loja_id = loja), 3),
      ('depositos',           (select count(*) from depositos where loja_id = loja), 1)
    ) as v(tabela, achou, esperado) loop
    if linha.achou <> linha.esperado then
      raise exception 'FALHOU (B1): % tem % linhas de exemplo, esperava %', linha.tabela, linha.achou, linha.esperado;
    end if;
  end loop;

  -- B2. todas as fases e os dois tipos
  select count(distinct status) into quantas from ordens_servico where loja_id = loja;
  if quantas <> 3 then
    raise exception 'FALHOU (B2): esperava OS nas 3 fases (em andamento, concluída, faturada), achei %', quantas;
  end if;
  select count(distinct tipo) into quantas from ordens_servico where loja_id = loja;
  if quantas <> 2 then
    raise exception 'FALHOU (B2): esperava OS e venda de balcão, achei % tipo(s)', quantas;
  end if;

  -- B3. nenhuma credencial fiscal, e a loja em homologação
  if exists (select 1 from segredos_fiscais_loja) then
    raise exception 'FALHOU (B3): o exemplo gravou token no cofre';
  end if;
  select * into linha from configuracoes_fiscais_loja where loja_id = loja;
  if linha.focus_nfe_ambiente <> 'homologacao' or coalesce(linha.focus_nfe_token, '') <> '' then
    raise exception 'FALHOU (B3): a loja de exemplo saiu com token ou fora de homologação: %', row_to_json(linha);
  end if;

  -- B4. dado fictício com cara de verdadeiro
  select count(*) into quantas from clientes
    where id::text like 'eeee%' and coalesce(cpf_cnpj, '') <> '' and not pg_temp.documento_valido(cpf_cnpj);
  if quantas > 0 then
    raise exception 'FALHOU (B4): % cliente(s) de exemplo com CPF/CNPJ de dígito errado', quantas;
  end if;
  if exists (select 1 from clientes where id::text like 'eeee%' and tipo_pessoa = 'juridica'
             and length(regexp_replace(cpf_cnpj, '\D', '', 'g')) <> 14)
     or exists (select 1 from clientes where id::text like 'eeee%' and tipo_pessoa = 'fisica'
             and coalesce(cpf_cnpj, '') <> '' and length(regexp_replace(cpf_cnpj, '\D', '', 'g')) <> 11) then
    raise exception 'FALHOU (B4): pessoa física com CNPJ ou jurídica com CPF no exemplo';
  end if;
  if exists (select 1 from funcionarios where loja_id = loja and not pg_temp.documento_valido(cpf))
     or exists (select 1 from fornecedores where id::text like 'eeee%' and cnpj is not null and not pg_temp.documento_valido(cnpj))
     or exists (select 1 from configuracoes_fiscais_loja where loja_id = loja and not pg_temp.documento_valido(cnpj)) then
    raise exception 'FALHOU (B4): funcionário, fornecedor ou a loja de exemplo com documento de dígito errado';
  end if;
  if exists (select 1 from veiculos where id::text like 'eeee%' and placa !~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$') then
    raise exception 'FALHOU (B4): placa fora do formato Mercosul no exemplo';
  end if;
  if exists (select 1 from (
               select email from clientes where id::text like 'eeee%'
               union all select email from funcionarios where loja_id = loja
               union all select email from fornecedores where id::text like 'eeee%'
               union all select email from configuracoes_fiscais_loja where loja_id = loja) e
             where e.email is not null and e.email not like '%@example.com') then
    raise exception 'FALHOU (B4): e-mail de exemplo fora do domínio reservado @example.com';
  end if;

  -- B5. o dinheiro bate: o que entrou no caixa por OS = o total da OS
  --     (as à vista e a recebida); e as a prazo ainda abertas não têm caixa
  for linha in
    select o.numero,
           (select sum(quantidade * preco_unitario - desconto) from ordens_servico_itens where ordem_servico_id = o.id) as total,
           (select coalesce(sum(valor), 0) from caixa_movimentos where ordem_servico_id = o.id) as no_caixa,
           (select status from contas_receber where ordem_servico_id = o.id) as conta
    from ordens_servico o where o.loja_id = loja and o.status = 'faturada'
  loop
    if linha.conta = 'pendente' and linha.no_caixa <> 0 then
      raise exception 'FALHOU (B5): a OS % está a receber mas já tem dinheiro no caixa', linha.numero;
    elsif coalesce(linha.conta, 'recebido') = 'recebido' and linha.no_caixa <> linha.total then
      raise exception 'FALHOU (B5): a OS % tem total % e % no caixa', linha.numero, linha.total, linha.no_caixa;
    end if;
  end loop;
  if exists (select 1 from contas_receber cr join ordens_servico o on o.id = cr.ordem_servico_id
             where cr.valor <> (select sum(quantidade * preco_unitario - desconto) from ordens_servico_itens where ordem_servico_id = o.id)) then
    raise exception 'FALHOU (B5): conta a receber com valor diferente do total da OS';
  end if;
  if not exists (select 1 from contas_receber where loja_id = loja and status = 'pendente'
                 and vencimento < (now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'FALHOU (B5): esperava uma conta a receber atrasada no exemplo';
  end if;
  if not exists (select 1 from contas_pagar where loja_id = loja and status = 'pendente'
                 and vencimento < (now() at time zone 'America/Sao_Paulo')::date) then
    raise exception 'FALHOU (B5): esperava uma conta a pagar atrasada no exemplo';
  end if;
  if exists (select 1 from contas_pagar cp join caixa_movimentos c on c.id = cp.caixa_movimento_id
             where cp.loja_id = loja and (cp.status <> 'paga' or c.valor <> cp.valor or c.tipo <> 'saida')) then
    raise exception 'FALHOU (B5): conta paga sem a saída certa no caixa';
  end if;

  -- B6. estoque: toda peça usada tem baixa, e nenhum saldo fica negativo
  if exists (select 1 from ordens_servico_itens i join ordens_servico o on o.id = i.ordem_servico_id
             where o.loja_id = loja and i.peca_id is not null
               and not exists (select 1 from estoque_movimentos m
                               where m.peca_id = i.peca_id and m.tipo = 'saida' and m.motivo = 'uso_em_os'
                                 and m.quantidade = i.quantidade and m.loja_id = loja)) then
    raise exception 'FALHOU (B6): peça usada em OS sem baixa no estoque';
  end if;
  if exists (select 1 from estoque_movimentos where loja_id = loja group by peca_id
             having sum(case when tipo = 'entrada' then quantidade else -quantidade end) < 0) then
    raise exception 'FALHOU (B6): saldo de estoque negativo no exemplo';
  end if;

  -- B7. todo serviço lançado aponta pro serviço do catálogo
  if exists (select 1 from ordens_servico_itens i join ordens_servico o on o.id = i.ordem_servico_id
             where o.loja_id = loja and i.tipo = 'servico' and i.servico_id is null) then
    raise exception 'FALHOU (B7): item de serviço sem o serviço do catálogo (nome mudou?)';
  end if;
end $$;

create temp table depois_da_primeira as select * from pg_temp.contagens();

-- ===================================================================
-- C. Rodar de novo não muda nada
-- ===================================================================
\ir ../exemplo/dados-de-exemplo.sql

do $$
declare linha record;
begin
  for linha in
    select c.tabela, p.linhas as antes, c.linhas as depois
    from pg_temp.contagens() c join depois_da_primeira p using (tabela)
    where c.linhas <> p.linhas
  loop
    raise exception 'FALHOU (C): a segunda rodada mudou % de % pra % linhas', linha.tabela, linha.antes, linha.depois;
  end loop;
  if (select max(numero) from ordens_servico where loja_id = 'eeee0001-0000-4000-8000-000000000001') <> 12 then
    raise exception 'FALHOU (C): a segunda rodada gastou número de OS';
  end if;
end $$;

-- ===================================================================
-- D. O login da equipe: operador comum, só na loja de exemplo
-- ===================================================================
insert into auth.users (id, email) values
  ('d0d0d0d0-0000-4000-8000-000000000001', 'equipe1@sakura.local'),
  ('d0d0d0d0-0000-4000-8000-000000000002', 'sofia@sakura.local');

set exemplo.usuario = 'equipe1';
set exemplo.nome = 'Pessoa da equipe (teste)';
set exemplo.admin = 'false';
\ir ../exemplo/ligar-login.sql
\ir ../exemplo/ligar-login.sql
set exemplo.usuario = 'sofia';
set exemplo.nome = 'Admin (teste)';
set exemplo.admin = 'true';
\ir ../exemplo/ligar-login.sql
reset exemplo.usuario;

-- Uma OS na Loja 1, que a equipe NÃO pode enxergar.
insert into ordens_servico (id, loja_id, cliente_id)
  values ('d1d1d1d1-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-00000000c000');

do $$
declare linha record;
begin
  select * into linha from operadores where id = 'd0d0d0d0-0000-4000-8000-000000000001';
  if linha.admin or linha.usuario <> 'equipe1' or not linha.ativo
     or 'notas_fiscais' = any(linha.permissoes) or 'funcionarios' = any(linha.permissoes)
     or not 'ordens_servico' = any(linha.permissoes) then
    raise exception 'FALHOU (D): o login da equipe nasceu diferente do combinado: %', row_to_json(linha);
  end if;
  if (select array_agg(loja_id) from operador_lojas where operador_id = linha.id)
     <> array['eeee0001-0000-4000-8000-000000000001'::uuid] then
    raise exception 'FALHOU (D): o login da equipe não ficou SÓ na loja de exemplo';
  end if;
  if (select count(*) from operadores where usuario = 'equipe1') <> 1 then
    raise exception 'FALHOU (D): rodar o ligar-login duas vezes duplicou o operador';
  end if;
  if (select loja_id from funcionarios where operador_id = linha.id) is distinct from 'eeee0001-0000-4000-8000-000000000001' then
    raise exception 'FALHOU (D): o funcionário espelho do login não ganhou a loja de exemplo';
  end if;
  if (select count(*) from operador_lojas where operador_id = 'd0d0d0d0-0000-4000-8000-000000000002') <> 2
     or not (select admin from operadores where id = 'd0d0d0d0-0000-4000-8000-000000000002') then
    raise exception 'FALHOU (D): o login admin não ficou admin nas duas lojas';
  end if;
end $$;

begin;
set local role authenticated;
set local "request.jwt.claim.sub" = 'd0d0d0d0-0000-4000-8000-000000000001';
do $$
declare quantas int;
begin
  select count(*) into quantas from ordens_servico;
  if quantas <> 12 then
    raise exception 'FALHOU (D): pela RLS, a equipe enxerga % OS (esperava as 12 da loja de exemplo, e nenhuma da Loja 1)', quantas;
  end if;
  select count(*) into quantas from caixa_movimentos;
  if quantas <> 12 then
    raise exception 'FALHOU (D): pela RLS, a equipe enxerga % lançamentos de caixa (esperava 12)', quantas;
  end if;
  select count(*) into quantas from clientes where id::text like 'eeee%';
  if quantas <> 8 then
    raise exception 'FALHOU (D): pela RLS, a equipe enxerga % clientes de exemplo (esperava 8)', quantas;
  end if;
end $$;
commit;

-- ===================================================================
-- E. Apagar: zera a loja de exemplo, deixa os logins, e o exemplo volta
-- ===================================================================
-- E1. com cara de loja, o apagar não apaga nada
insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
  values ('00000000-0000-0000-0000-000000000001', 'token-de-mentira-do-teste');
\set ON_ERROR_STOP 0
\echo '(E1: o erro "PAREI" logo abaixo é esperado)'
\ir ../exemplo/apagar-dados-de-exemplo.sql
\set ON_ERROR_STOP 1
delete from segredos_fiscais_loja;
do $$ begin
  if (select count(*) from ordens_servico where loja_id = 'eeee0001-0000-4000-8000-000000000001') <> 12 then
    raise exception 'FALHOU (E1): com token no banco, o apagar apagou mesmo assim';
  end if;
end $$;

-- E2. a OS de mentira da Loja 1 sai (senão a trava do exemplo, com razão, recusa)
delete from ordens_servico where id = 'd1d1d1d1-0000-4000-8000-000000000001';
\ir ../exemplo/apagar-dados-de-exemplo.sql

do $$ begin
  if exists (select 1 from ordens_servico where loja_id = 'eeee0001-0000-4000-8000-000000000001')
     or exists (select 1 from caixa_movimentos where loja_id = 'eeee0001-0000-4000-8000-000000000001')
     or exists (select 1 from clientes where id::text like 'eeee%')
     or exists (select 1 from pecas where id::text like 'eeee%') then
    raise exception 'FALHOU (E2): o apagar deixou dado de exemplo pra trás';
  end if;
  if not exists (select 1 from operador_lojas where operador_id = 'd0d0d0d0-0000-4000-8000-000000000001'
                 and loja_id = 'eeee0001-0000-4000-8000-000000000001')
     or not exists (select 1 from funcionarios where operador_id = 'd0d0d0d0-0000-4000-8000-000000000001') then
    raise exception 'FALHOU (E2): o apagar tirou o login da equipe da loja de exemplo';
  end if;
  if not exists (select 1 from clientes where id = '00000000-0000-0000-0000-00000000c000')
     or not exists (select 1 from lojas where id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'FALHOU (E2): o apagar mexeu no Consumidor ou na Loja 1';
  end if;
end $$;

\ir ../exemplo/dados-de-exemplo.sql

do $$
declare linha record;
begin
  for linha in
    select c.tabela, p.linhas as antes, c.linhas as depois
    from pg_temp.contagens() c join depois_da_primeira p using (tabela)
    where c.linhas <> p.linhas
      and c.tabela not in ('auditoria', 'operadores', 'operador_lojas', 'funcionarios')
  loop
    raise exception 'FALHOU (E3): depois de apagar e rodar de novo, % ficou com % linhas (eram %)', linha.tabela, linha.depois, linha.antes;
  end loop;
  -- funcionários: os 3 de exemplo + os 2 espelhos dos logins
  if (select count(*) from funcionarios where loja_id = 'eeee0001-0000-4000-8000-000000000001') <> 5 then
    raise exception 'FALHOU (E3): esperava 3 funcionários de exemplo + 2 de login na loja de exemplo';
  end if;
end $$;

\echo 'TODAS AS CHECAGENS PASSARAM (trava, exemplo completo, 2 rodadas iguais, login da equipe na RLS, apagar e voltar)'
