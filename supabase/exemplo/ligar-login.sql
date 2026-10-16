-- Sakura System — AutoCenter Edition
-- ============================================================================
-- LIGAR UM LOGIN DO SUPABASE DE TESTE A UM OPERADOR DO PROGRAMA
-- ============================================================================
--
-- ⛔ SÓ NO SUPABASE DE TESTE ("ssace-teste"). Guia: docs/supabase-de-teste.md.
--
-- PRA QUE SERVE. O login de verdade (e-mail + senha) mora no Supabase
-- (Authentication → Users). Pro programa deixar a pessoa entrar, esse login
-- precisa virar um OPERADOR (nome, módulos que enxerga) e ser ligado a uma
-- LOJA. É o mesmo que o passo 5b do INSTALAR-LOJA-NOVA.md faz com o primeiro
-- admin, só que sem copiar o "User UID": o script acha o login pelo usuário.
--
-- COMO USAR, uma pessoa por vez:
--   1. Authentication → Users → Add user → Create new user, com o e-mail
--      `<usuario>@sakura.local`, a senha gerada no Bitwarden e
--      "Auto Confirm User" ligado.
--   2. SQL Editor → New query → colar este arquivo → trocar SÓ as três
--      linhas marcadas com  <<< TROCAR  → Run.
--   3. Tem que aparecer "Pronto: <usuario> ligado à loja de exemplo".
--
-- O QUE A PESSOA ENXERGA. Operador comum (NÃO admin), só na loja de exemplo,
-- com os módulos do dia a dia. Fica de fora: Configurações (é só de admin),
-- Notas Fiscais e Funcionários (RH). Se uma tarefa precisar de mais, a
-- Sofia marca o módulo na tela Configurações → Operadores, no próprio
-- programa, entrando com o login de admin dela.
--
-- Nenhuma senha passa por aqui. Rodar de novo com o mesmo usuário não
-- duplica nada (só atualiza nome e módulos).
-- ============================================================================

do $$
declare
  -- ------------------------------------------------------------------------
  v_usuario text    := 'trocar';               -- <<< TROCAR: o que vem antes do @sakura.local
  v_nome    text    := 'Nome da Pessoa';       -- <<< TROCAR: como aparece no programa
  v_admin   boolean := false;                  -- <<< TROCAR: true SÓ pro login da Sofia
  -- ------------------------------------------------------------------------
  v_modulos text[] := array['painel', 'clientes', 'ordens_servico', 'estoque', 'fornecedores',
                            'servicos', 'caixa', 'contas_pagar', 'contas_receber',
                            'relatorios', 'garantias'];
  loja_exemplo constant uuid := 'eeee0001-0000-4000-8000-000000000001';
  loja_1       constant uuid := '00000000-0000-0000-0000-000000000001';
  v_id uuid;
begin
  -- A mesma trava dos dados de exemplo: banco de loja, aqui, não.
  if exists (select 1 from segredos_fiscais_loja)
     or exists (select 1 from configuracoes_fiscais_loja where focus_nfe_ambiente = 'producao')
     or exists (select 1 from notas_fiscais_arquivos) then
    raise exception 'PAREI: este banco tem cara de banco de loja (token, nota em produção ou nota registrada). Este script é só pro Supabase de teste.';
  end if;
  if not exists (select 1 from lojas where id = loja_exemplo) then
    raise exception 'PAREI: a loja de exemplo ainda não existe. Rode antes o supabase/exemplo/dados-de-exemplo.sql.';
  end if;

  -- Só pro teste automático (testar-dados-de-exemplo.sql): ele passa os
  -- valores por aqui em vez de editar o arquivo. No SQL Editor isto fica
  -- vazio e valem as linhas <<< TROCAR lá de cima.
  if coalesce(current_setting('exemplo.usuario', true), '') <> '' then
    v_usuario := current_setting('exemplo.usuario', true);
    v_nome    := current_setting('exemplo.nome', true);
    v_admin   := coalesce(nullif(current_setting('exemplo.admin', true), ''), 'false')::boolean;
  end if;

  v_usuario := lower(btrim(v_usuario));
  if v_usuario = 'trocar' or v_usuario = '' or v_nome = 'Nome da Pessoa' then
    raise exception 'PAREI: faltou trocar o usuário e o nome no começo do script (as linhas com <<< TROCAR).';
  end if;

  select id into v_id from auth.users where lower(email) = v_usuario || '@sakura.local';
  if v_id is null then
    raise exception 'PAREI: não achei o login %@sakura.local. Crie antes em Authentication → Users → Add user (o e-mail tem que ser exatamente esse).', v_usuario;
  end if;

  insert into operadores (id, usuario, nome, admin, permissoes, ativo)
  values (v_id, v_usuario, v_nome, v_admin, case when v_admin then '{}' else v_modulos end, true)
  on conflict (id) do update
    set nome = excluded.nome, admin = excluded.admin, permissoes = excluded.permissoes, ativo = true;

  -- Equipe: só a loja de exemplo. Admin (a Sofia): a de exemplo e a Loja 1.
  insert into operador_lojas (operador_id, loja_id) values (v_id, loja_exemplo)
  on conflict do nothing;
  if v_admin then
    insert into operador_lojas (operador_id, loja_id) values (v_id, loja_1)
    on conflict do nothing;
  end if;

  -- O gatilho da 0019 já criou o funcionário espelho; aqui ele ganha a loja
  -- (é o que o programa faz depois de criar um operador).
  update funcionarios set loja_id = loja_exemplo where operador_id = v_id and loja_id is null;

  raise notice 'Pronto: % ligado à loja de exemplo (%).', v_usuario,
    case when v_admin then 'admin' else 'operador comum' end;
end $$;

-- Quem entra no programa, e em quais lojas (confira se a pessoa apareceu).
select o.usuario, o.nome, o.admin, o.ativo, string_agg(l.nome, ', ' order by l.nome) as lojas
from operadores o
left join operador_lojas ol on ol.operador_id = o.id
left join lojas l on l.id = ol.loja_id
group by o.id
order by o.admin desc, o.usuario;
