-- Sakura System — AutoCenter Edition
-- TESTE do TR-04.2, partes 1 e 2 (migrations 0057 e 0070). NÃO é migration,
-- e NUNCA deve ser rodado no Supabase de verdade — grava e apaga dado de
-- teste.
--
-- Prova as promessas do cofre do token da Focus NFe (parte 1, 0057):
--   • ninguém lê o cofre pela API — nem o admin, nem escrevendo direto;
--   • só admin DA LOJA grava o token, e só pela função;
--   • a tela consegue saber "tem token?" sem ver o token;
--   • a regra do porteiro deixa cada papel fazer exatamente o que a tela já
--     deixava (e nada além);
--   • a trilha de auditoria registra a troca sem registrar o token.
--
-- E as da limpeza da coluna antiga (parte 2, 0070, seção E lá embaixo):
--   • depois dela, nenhuma loja tem token em configuracoes_fiscais_loja;
--   • a loja que já tinha token no cofre continua com o DELE (o da coluna
--     não passa por cima), e a que só tinha na coluna ganha no cofre (a rede
--     de segurança) — ninguém para de emitir;
--   • "tem token?" e a regra do porteiro respondem igualzinho a antes;
--   • a auditoria da limpeza não traz o token em claro;
--   • rodar duas vezes não muda nada.
--   A seção E roda o arquivo da migration DE VERDADE (\ir), não uma cópia.
--
-- Como rodar: npm run test:sql -- testar-porteiro-focus-nfe (ver o
-- cabeçalho de scripts/testar-sql.mjs).
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

\set ON_ERROR_STOP 1

do $$
declare
  loja_a   uuid := 'fafa0000-0000-0000-0000-00000000000a';
  loja_b   uuid := 'fafa0000-0000-0000-0000-00000000000b';
  o_admin  uuid := 'fafa1111-0000-0000-0000-000000000001';  -- admin só da loja A
  o_caixa  uuid := 'fafa1111-0000-0000-0000-000000000002';  -- só Caixa
  o_os     uuid := 'fafa1111-0000-0000-0000-000000000003';  -- só Ordens de Serviço
  o_nf     uuid := 'fafa1111-0000-0000-0000-000000000004';  -- só Notas Fiscais
  quantas  int;
  resposta boolean;
  mascarado text;
begin
  -- ---- preparo -------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A do porteiro', 'Araraquara', 'SP'),
    (loja_b, 'Loja B do porteiro', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  insert into auth.users (id) values (o_admin), (o_caixa), (o_os), (o_nf)
    on conflict do nothing;

  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin, 'porteiro_admin', 'Admin da A',  true,  array['painel'],                   true),
    (o_caixa, 'porteiro_caixa', 'Balconista',  false, array['painel','caixa'],           true),
    (o_os,    'porteiro_os',    'Atendente',   false, array['painel','ordens_servico'],  true),
    (o_nf,    'porteiro_nf',    'Fiscal',      false, array['painel','notas_fiscais'],   true)
    on conflict (id) do nothing;

  insert into operador_lojas (operador_id, loja_id) values
    (o_admin, loja_a), (o_caixa, loja_a), (o_os, loja_a), (o_nf, loja_a)
    on conflict do nothing;

  -- Loja B já com um token no cofre (como se o dono das duas tivesse
  -- cadastrado). Ninguém da loja A pode enxergá-lo nem trocá-lo.
  insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
    values (loja_b, 'token-da-loja-b-naopodevazar')
    on conflict (loja_id) do nothing;

  set local role authenticated;

  -- ===================================================================
  -- A. O cofre é invisível, até pro admin
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_admin::text, true);

  -- 1. o admin da loja A grava o token da loja dele
  perform definir_token_focus_nfe(loja_a, '  token-da-loja-a-naopodevazar  ');

  -- 2. ...e mesmo assim não consegue ler de volta
  select count(*) into quantas from segredos_fiscais_loja;
  if quantas <> 0 then
    raise exception 'FALHOU: o admin leu % linha(s) do cofre — ele não pode ler nem o da própria loja', quantas;
  end if;

  -- 3. nem escrever direto na tabela, passando por fora da função
  begin
    insert into segredos_fiscais_loja (loja_id, focus_nfe_token) values (loja_a, 'por-fora');
    raise exception 'FALHOU: deu pra escrever no cofre direto na tabela';
  exception
    when insufficient_privilege then null;  -- é a RLS recusando: esperado
  end;

  -- 4. nem trocar o token de uma loja que não é dele
  begin
    perform definir_token_focus_nfe(loja_b, 'sequestro');
    raise exception 'FALHOU: o admin da loja A trocou o token da loja B';
  exception
    when insufficient_privilege then null;
  end;

  -- 5. token em branco é recusado (apagaria a emissão sem ninguém perceber)
  begin
    perform definir_token_focus_nfe(loja_a, '   ');
    raise exception 'FALHOU: aceitou token em branco';
  exception
    when invalid_parameter_value then null;
  end;

  -- 6. a tela sabe que tem token, sem ver o token
  select loja_tem_token_focus_nfe(loja_a) into resposta;
  if resposta is not true then
    raise exception 'FALHOU: loja_tem_token_focus_nfe devia dizer que a loja A tem token';
  end if;

  -- ===================================================================
  -- B. Quem não é admin não troca token
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_nf::text, true);
  begin
    perform definir_token_focus_nfe(loja_a, 'troca-do-fiscal');
    raise exception 'FALHOU: quem não é admin trocou o token (mesmo tendo Notas Fiscais)';
  exception
    when insufficient_privilege then null;
  end;

  -- 7. "tem token?" só responde sobre a própria loja
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  select loja_tem_token_focus_nfe(loja_b) into resposta;
  if resposta is not false then
    raise exception 'FALHOU: o balconista da loja A descobriu se a loja B tem token';
  end if;

  -- ===================================================================
  -- C. A regra do porteiro, papel por papel
  -- ===================================================================
  -- 8. balconista só-Caixa: nada
  if pode_usar_focus_nfe(loja_a, 'emitir') or pode_usar_focus_nfe(loja_a, 'baixar')
     or pode_usar_focus_nfe(loja_a, 'cancelar') or pode_usar_focus_nfe(loja_a, 'consultar') then
    raise exception 'FALHOU: o balconista só-Caixa pode usar o porteiro';
  end if;

  -- 9. atendente de OS: emite, consulta e baixa — não cancela (é o que a tela
  --    já permite: o cancelamento só existe em Notas Fiscais)
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  if not (pode_usar_focus_nfe(loja_a, 'emitir') and pode_usar_focus_nfe(loja_a, 'consultar')
          and pode_usar_focus_nfe(loja_a, 'baixar')) then
    raise exception 'FALHOU: o atendente de OS perdeu o direito de emitir/consultar/baixar';
  end if;
  if pode_usar_focus_nfe(loja_a, 'cancelar') then
    raise exception 'FALHOU: o atendente de OS (sem Notas Fiscais) consegue cancelar nota';
  end if;

  -- 10. e nada na loja que não é dele
  if pode_usar_focus_nfe(loja_b, 'emitir') then
    raise exception 'FALHOU: o atendente da loja A emite na loja B';
  end if;

  -- 11. quem tem Notas Fiscais cancela
  perform set_config('request.jwt.claim.sub', o_nf::text, true);
  if not (pode_usar_focus_nfe(loja_a, 'cancelar') and pode_usar_focus_nfe(loja_a, 'baixar')) then
    raise exception 'FALHOU: quem tem Notas Fiscais não consegue cancelar/baixar';
  end if;

  -- 12. admin faz tudo; ação inventada, ninguém faz
  perform set_config('request.jwt.claim.sub', o_admin::text, true);
  if not (pode_usar_focus_nfe(loja_a, 'emitir') and pode_usar_focus_nfe(loja_a, 'cancelar')) then
    raise exception 'FALHOU: o admin da loja não consegue emitir/cancelar';
  end if;
  if pode_usar_focus_nfe(loja_a, 'listar_empresas') then
    raise exception 'FALHOU: uma ação que não existe foi autorizada';
  end if;

  reset role;

  -- ===================================================================
  -- D. O que ficou gravado — visto como dono do banco
  -- ===================================================================
  -- 13. o token entrou, sem os espaços em volta
  select count(*) into quantas from segredos_fiscais_loja
   where loja_id = loja_a and focus_nfe_token = 'token-da-loja-a-naopodevazar';
  if quantas <> 1 then
    raise exception 'FALHOU: o token da loja A não ficou gravado como esperado';
  end if;

  -- 14. a loja B continua com o dela
  select count(*) into quantas from segredos_fiscais_loja
   where loja_id = loja_b and focus_nfe_token = 'token-da-loja-b-naopodevazar';
  if quantas <> 1 then
    raise exception 'FALHOU: o token da loja B foi mexido';
  end if;

  -- 15. a auditoria registrou a troca — e mascarou o token
  select dados_depois ->> 'focus_nfe_token' into mascarado
    from auditoria
   where tabela = 'segredos_fiscais_loja' and registro_id = loja_a
   order by criado_em desc
   limit 1;
  if mascarado is distinct from '***' then
    raise exception 'FALHOU: a auditoria do cofre gravou o token sem máscara (%)', coalesce(mascarado, 'nenhuma linha');
  end if;

  -- 16. quem não está logado nem pergunta
  set local role anon;
  begin
    perform loja_tem_token_focus_nfe(loja_a);
    raise exception 'FALHOU: o anon conseguiu chamar loja_tem_token_focus_nfe';
  exception
    when insufficient_privilege then null;
  end;
  begin
    perform pode_usar_focus_nfe(loja_a, 'emitir');
    raise exception 'FALHOU: o anon conseguiu chamar pode_usar_focus_nfe';
  exception
    when insufficient_privilege then null;
  end;
  reset role;

  -- 17. excluir a loja leva o segredo junto (senão a loja nunca mais sai)
  delete from operador_lojas where loja_id = loja_b;
  delete from depositos where loja_id = loja_b;
  delete from configuracoes_garantia where loja_id = loja_b;
  delete from configuracoes_fiscais_loja where loja_id = loja_b;
  delete from configuracoes_painel_inicio where loja_id = loja_b;
  delete from lojas where id = loja_b;
  select count(*) into quantas from segredos_fiscais_loja where loja_id = loja_b;
  if quantas <> 0 then
    raise exception 'FALHOU: o segredo da loja B sobreviveu à exclusão da loja';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from segredos_fiscais_loja where loja_id in (loja_a, loja_b);
  delete from funcionarios where operador_id in (o_admin, o_caixa, o_os, o_nf);
  delete from operador_lojas where operador_id in (o_admin, o_caixa, o_os, o_nf);
  delete from operadores where id in (o_admin, o_caixa, o_os, o_nf);
  delete from auth.users where id in (o_admin, o_caixa, o_os, o_nf);
  delete from depositos where loja_id in (loja_a, loja_b);
  delete from configuracoes_garantia where loja_id in (loja_a, loja_b);
  delete from configuracoes_fiscais_loja where loja_id in (loja_a, loja_b);
  delete from configuracoes_painel_inicio where loja_id in (loja_a, loja_b);
  delete from lojas where id in (loja_a, loja_b);
  delete from auditoria;
end;
$$;

-- ===================================================================
-- E. A parte 2 (0070): a coluna antiga fica vazia e ninguém perde a emissão
-- ===================================================================
-- Três lojas, cada uma num caso:
--   • C: token no cofre E uma cópia diferente na coluna (o caso normal: a
--     0057 copiou, depois o admin trocou pelo cofre). O do cofre tem que
--     ficar;
--   • D: token SÓ na coluna (um computador antigo colou depois da 0057). A
--     rede de segurança tem que levar pro cofre, sem os espaços;
--   • E: coluna com espaços em branco e nada no cofre. Não vira token
--     nenhum, e a coluna fica vazia do mesmo jeito.

do $$
declare
  loja_c  uuid := 'fafa0000-0000-0000-0000-00000000000c';
  loja_d  uuid := 'fafa0000-0000-0000-0000-00000000000d';
  loja_e  uuid := 'fafa0000-0000-0000-0000-00000000000e';
  o_admin uuid := 'fafa2222-0000-0000-0000-000000000001';  -- admin das lojas C e D
  o_caixa uuid := 'fafa2222-0000-0000-0000-000000000002';  -- só Caixa
  o_os    uuid := 'fafa2222-0000-0000-0000-000000000003';  -- só Ordens de Serviço
  o_nf    uuid := 'fafa2222-0000-0000-0000-000000000004';  -- só Notas Fiscais
begin
  insert into lojas (id, nome, cidade, uf) values
    (loja_c, 'Loja C da limpeza', 'Araraquara', 'SP'),
    (loja_d, 'Loja D da limpeza', 'Araraquara', 'SP'),
    (loja_e, 'Loja E da limpeza', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  insert into auth.users (id) values (o_admin), (o_caixa), (o_os), (o_nf)
    on conflict do nothing;

  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin, 'limpeza_admin', 'Admin da C',  true,  array['painel'],                  true),
    (o_caixa, 'limpeza_caixa', 'Balconista',  false, array['painel','caixa'],          true),
    (o_os,    'limpeza_os',    'Atendente',   false, array['painel','ordens_servico'], true),
    (o_nf,    'limpeza_nf',    'Fiscal',      false, array['painel','notas_fiscais'],  true)
    on conflict (id) do nothing;

  insert into operador_lojas (operador_id, loja_id) values
    (o_admin, loja_c), (o_caixa, loja_c), (o_os, loja_c), (o_nf, loja_c),
    (o_admin, loja_d), (o_os, loja_d)
    on conflict do nothing;

  -- o cofre da loja C, como se o admin tivesse trocado pela tela
  insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
    values (loja_c, 'token-do-cofre-c-naopodevazar')
    on conflict (loja_id) do update set focus_nfe_token = excluded.focus_nfe_token;
  delete from segredos_fiscais_loja where loja_id in (loja_d, loja_e);

  -- a coluna antiga, nas três
  insert into configuracoes_fiscais_loja (loja_id, focus_nfe_token) values
    (loja_c, 'token-antigo-c-naopodevazar'),
    (loja_d, '  token-antigo-d-naopodevazar  '),
    (loja_e, '   ')
    on conflict (loja_id) do update set focus_nfe_token = excluded.focus_nfe_token;

  if (select count(*) from configuracoes_fiscais_loja
       where loja_id in (loja_c, loja_d, loja_e) and focus_nfe_token is not null) <> 3 then
    raise exception 'FALHOU (preparo): as três lojas deviam ter algo na coluna antiga';
  end if;

  -- só a auditoria da limpeza interessa daqui pra frente
  delete from auditoria;
end;
$$;

-- O que cada papel podia fazer ANTES da limpeza, pra comparar depois.
create temp table porteiro_antes as
select o.id as operador_id, l.loja_id, a.acao, false as pode
  from (values ('fafa2222-0000-0000-0000-000000000001'::uuid),
               ('fafa2222-0000-0000-0000-000000000002'::uuid),
               ('fafa2222-0000-0000-0000-000000000003'::uuid),
               ('fafa2222-0000-0000-0000-000000000004'::uuid)) o(id)
 cross join (values ('fafa0000-0000-0000-0000-00000000000c'::uuid),
                    ('fafa0000-0000-0000-0000-00000000000d'::uuid)) l(loja_id)
 cross join (values ('emitir'), ('consultar'), ('baixar'), ('cancelar')) a(acao);
alter table porteiro_antes add column tem_token boolean;
grant select, update on porteiro_antes to authenticated;

create or replace function pg_temp.responder_porteiro(p_tabela regclass)
returns void
language plpgsql
as $$
declare
  linha record;
begin
  for linha in execute format('select distinct operador_id from %s', p_tabela) loop
    perform set_config('request.jwt.claim.sub', linha.operador_id::text, true);
    set local role authenticated;
    execute format(
      'update %s set pode = pode_usar_focus_nfe(loja_id, acao), '
      '              tem_token = loja_tem_token_focus_nfe(loja_id) '
      ' where operador_id = $1', p_tabela) using linha.operador_id;
    reset role;
  end loop;
end;
$$;

begin;
select pg_temp.responder_porteiro('porteiro_antes') \g /dev/null
commit;

-- 1ª rodada da migration, o arquivo de verdade
\ir ../migrations/0070_limpar_token_antigo_focus.sql

-- O retrato depois da 1ª rodada, pra provar que a 2ª não muda nada.
create temp table retrato_1 as
select (select count(*) from auditoria) as auditoria,
       (select count(*) from segredos_fiscais_loja) as cofre,
       (select string_agg(loja_id::text || '=' || focus_nfe_token, ',' order by loja_id)
          from segredos_fiscais_loja) as tokens;

-- 2ª rodada: idempotente
\ir ../migrations/0070_limpar_token_antigo_focus.sql

create temp table porteiro_depois as select * from porteiro_antes;
grant select, update on porteiro_depois to authenticated;
begin;
select pg_temp.responder_porteiro('porteiro_depois') \g /dev/null
commit;

do $$
declare
  loja_c  uuid := 'fafa0000-0000-0000-0000-00000000000c';
  loja_d  uuid := 'fafa0000-0000-0000-0000-00000000000d';
  loja_e  uuid := 'fafa0000-0000-0000-0000-00000000000e';
  o_admin uuid := 'fafa2222-0000-0000-0000-000000000001';
  o_caixa uuid := 'fafa2222-0000-0000-0000-000000000002';
  o_os    uuid := 'fafa2222-0000-0000-0000-000000000003';
  o_nf    uuid := 'fafa2222-0000-0000-0000-000000000004';
  quantas int;
  texto   text;
  antes   record;
begin
  -- 18. a coluna antiga ficou vazia em TODA linha (não só nas lojas do teste)
  select count(*) into quantas from configuracoes_fiscais_loja where focus_nfe_token is not null;
  if quantas <> 0 then
    raise exception 'FALHOU: % linha(s) de configuracoes_fiscais_loja ainda têm focus_nfe_token depois da 0070', quantas;
  end if;

  -- 19. a loja C continua com o token DO COFRE (o da coluna não passou por cima)
  select focus_nfe_token into texto from segredos_fiscais_loja where loja_id = loja_c;
  if texto is distinct from 'token-do-cofre-c-naopodevazar' then
    raise exception 'FALHOU: o cofre da loja C mudou na limpeza (a cópia antiga passou por cima?)';
  end if;

  -- 20. a rede de segurança: a loja D, que só tinha na coluna, ganhou no cofre
  select focus_nfe_token into texto from segredos_fiscais_loja where loja_id = loja_d;
  if texto is distinct from 'token-antigo-d-naopodevazar' then
    raise exception 'FALHOU: a loja D tinha token só na coluna antiga e ficou sem token no cofre (rede de segurança) — ela pararia de emitir';
  end if;

  -- 21. espaço em branco não vira token
  if exists (select 1 from segredos_fiscais_loja where loja_id = loja_e) then
    raise exception 'FALHOU: a coluna da loja E só tinha espaços e virou um token no cofre';
  end if;

  -- 22. o porteiro responde igualzinho a antes, papel por papel. O "tem
  --     token?" também, menos na loja D: antes ela NÃO tinha no cofre (só
  --     na coluna, que o porteiro não lê) e agora tem — é a rede de
  --     segurança, conferida no 23.
  if exists (select 1 from porteiro_antes where loja_id = loja_d and tem_token) then
    raise exception 'FALHOU (preparo): a loja D já tinha token no cofre antes da 0070 — o teste da rede de segurança não prova nada';
  end if;
  for antes in
    select a.operador_id, a.loja_id, a.acao, a.pode, a.tem_token,
           d.pode as pode_depois, d.tem_token as tem_token_depois
      from porteiro_antes a
      join porteiro_depois d using (operador_id, loja_id, acao)
     where a.pode is distinct from d.pode
        or (a.loja_id <> loja_d and a.tem_token is distinct from d.tem_token)
  loop
    raise exception 'FALHOU: depois da limpeza, o operador % na loja % (%) mudou de pode=%/tem_token=% pra pode=%/tem_token=%',
      antes.operador_id, antes.loja_id, antes.acao, antes.pode, antes.tem_token,
      antes.pode_depois, antes.tem_token_depois;
  end loop;

  -- 23. ...e o que ele responde é o certo: as lojas C e D têm token, o admin
  --     e o atendente emitem e cancelam/emitem como antes, o balconista não
  if exists (select 1 from porteiro_depois
              where operador_id in (o_admin, o_os) and tem_token is not true) then
    raise exception 'FALHOU: loja_tem_token_focus_nfe deixou de dizer que a loja tem token';
  end if;
  if not (select pode from porteiro_depois where operador_id = o_admin and loja_id = loja_c and acao = 'emitir')
     or not (select pode from porteiro_depois where operador_id = o_admin and loja_id = loja_c and acao = 'cancelar')
     or not (select pode from porteiro_depois where operador_id = o_admin and loja_id = loja_d and acao = 'emitir')
     or not (select pode from porteiro_depois where operador_id = o_os and loja_id = loja_d and acao = 'emitir')
     or not (select pode from porteiro_depois where operador_id = o_nf and loja_id = loja_c and acao = 'cancelar') then
    raise exception 'FALHOU: depois da limpeza o porteiro parou de deixar emitir/cancelar quem podia';
  end if;
  if (select pode from porteiro_depois where operador_id = o_os and loja_id = loja_c and acao = 'cancelar')
     or exists (select 1 from porteiro_depois where operador_id = o_caixa and pode) then
    raise exception 'FALHOU: depois da limpeza o porteiro deixa alguém fazer o que não podia';
  end if;

  -- 24. a auditoria registrou a limpeza, com o token mascarado no "antes"
  select count(*) into quantas from auditoria
   where tabela = 'configuracoes_fiscais_loja'
     and registro_id in (loja_c, loja_d, loja_e)
     and acao = 'atualizar'
     and dados_antes ->> 'focus_nfe_token' = '***'
     and dados_depois ->> 'focus_nfe_token' is null;
  if quantas <> 3 then
    raise exception 'FALHOU: esperava 3 linhas de auditoria da limpeza com o token mascarado, achei %', quantas;
  end if;

  -- 25. e o token não aparece EM LUGAR NENHUM da trilha (nem a cópia levada
  --     pro cofre pela rede de segurança)
  select count(*) into quantas from auditoria
   where coalesce(dados_antes::text, '') || coalesce(dados_depois::text, '') like '%naopodevazar%';
  if quantas <> 0 then
    raise exception 'FALHOU: % linha(s) de auditoria têm o token em claro', quantas;
  end if;

  -- 26. a 2ª rodada não mudou nada: nem auditoria nova, nem cofre
  if (select auditoria from retrato_1) <> (select count(*) from auditoria) then
    raise exception 'FALHOU: rodar a 0070 de novo gravou % linha(s) a mais na auditoria (não é idempotente)',
      (select count(*) from auditoria) - (select auditoria from retrato_1);
  end if;
  if (select tokens from retrato_1) is distinct from
     (select string_agg(loja_id::text || '=' || focus_nfe_token, ',' order by loja_id) from segredos_fiscais_loja) then
    raise exception 'FALHOU: rodar a 0070 de novo mexeu no cofre';
  end if;

  -- 27. a coluna ficou com o aviso (e a migration se registrou)
  if coalesce(col_description('configuracoes_fiscais_loja'::regclass,
       (select attnum from pg_attribute where attrelid = 'configuracoes_fiscais_loja'::regclass
          and attname = 'focus_nfe_token')), '') not like '%VAZIA DE PROPÓSITO%' then
    raise exception 'FALHOU: a coluna focus_nfe_token ficou sem o comentário de "vazia de propósito"';
  end if;
  if not exists (select 1 from schema_versao where versao = 70) then
    raise exception 'FALHOU: a 0070 não se registrou em schema_versao';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from segredos_fiscais_loja where loja_id in (loja_c, loja_d, loja_e);
  delete from funcionarios where operador_id in (o_admin, o_caixa, o_os, o_nf);
  delete from operador_lojas where operador_id in (o_admin, o_caixa, o_os, o_nf);
  delete from operadores where id in (o_admin, o_caixa, o_os, o_nf);
  delete from auth.users where id in (o_admin, o_caixa, o_os, o_nf);
  delete from depositos where loja_id in (loja_c, loja_d, loja_e);
  delete from configuracoes_garantia where loja_id in (loja_c, loja_d, loja_e);
  delete from configuracoes_fiscais_loja where loja_id in (loja_c, loja_d, loja_e);
  delete from configuracoes_painel_inicio where loja_id in (loja_c, loja_d, loja_e);
  delete from lojas where id in (loja_c, loja_d, loja_e);
  delete from auditoria;

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end;
$$;
