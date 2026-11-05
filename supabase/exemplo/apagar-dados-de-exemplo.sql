-- Sakura System — AutoCenter Edition
-- ============================================================================
-- ZERAR A LOJA DE EXEMPLO DO SUPABASE DE TESTE
-- ============================================================================
--
-- ⛔ SÓ NO SUPABASE DE TESTE ("ssace-teste"). Guia: docs/supabase-de-teste.md.
--
-- PRA QUE SERVE. Depois de uns dias de teste a loja de exemplo fica cheia de
-- OS, vendas e lançamentos inventados por quem estava programando. Este
-- script apaga o MOVIMENTO da loja de exemplo (o que a equipe criou e o que
-- os dados de exemplo criaram) e o cadastro de exemplo; depois é só rodar
-- de novo o supabase/exemplo/dados-de-exemplo.sql e a loja volta novinha.
--
-- O QUE APAGA:
--   • tudo o que é da loja de exemplo e é movimento: ordens de serviço e
--     vendas (com os itens), caixa, fechamentos, contas a pagar e a receber,
--     estoque (movimentos e contagens), pedidos de compra, comissões,
--     orçamentos, mensagens de WhatsApp registradas;
--   • as cotações das peças e dos fornecedores de exemplo, e o computador
--     de exemplo;
--   • os funcionários SEM login da loja de exemplo;
--   • o cadastro de exemplo (o que tem ID começando com "eeee"): clientes,
--     veículos, peças, fornecedores e categorias de despesa.
--
-- O QUE NÃO APAGA (de propósito):
--   • a própria loja de exemplo, o depósito e as configurações dela;
--   • os logins e o vínculo deles com a loja (ninguém precisa ser ligado de
--     novo) — nem o funcionário que espelha cada login;
--   • a "Loja 1" e qualquer coisa dela;
--   • cadastro que a equipe criou (cliente, peça...) fora do exemplo — fica,
--     e não atrapalha. Cadastro de exemplo que esteja em uso em outra loja
--     também fica (o script pula e conta quantos pulou).
--
-- A TRAVA: se o banco tiver cara de banco de loja (token da Focus NFe, nota
-- em produção ou nota registrada), o script para sem apagar NADA.
-- ============================================================================

begin;

do $$
declare
  loja_exemplo constant uuid := 'eeee0001-0000-4000-8000-000000000001';
  r record;
  pulados int := 0;
begin
  if exists (select 1 from segredos_fiscais_loja)
     or exists (select 1 from configuracoes_fiscais_loja where focus_nfe_ambiente = 'producao')
     or exists (select 1 from notas_fiscais_arquivos) then
    raise exception 'PAREI: este banco tem cara de banco de loja (token, nota em produção ou nota registrada). Nada foi apagado.';
  end if;
  if not exists (select 1 from lojas where id = loja_exemplo) then
    raise exception 'PAREI: este banco não tem a loja de exemplo. Nada foi apagado.';
  end if;

  -- Movimento da loja de exemplo (filho antes do pai).
  delete from whatsapp_mensagens   where loja_id = loja_exemplo;
  delete from contas_pagar          where loja_id = loja_exemplo;
  delete from contas_receber        where loja_id = loja_exemplo;
  delete from fechamentos_caixa     where loja_id = loja_exemplo;
  delete from comissoes_fechamentos where loja_id = loja_exemplo;
  delete from caixa_movimentos      where loja_id = loja_exemplo;
  delete from contagens_estoque     where loja_id = loja_exemplo;
  delete from estoque_movimentos    where loja_id = loja_exemplo;
  delete from pedidos_compra        where loja_id = loja_exemplo;
  delete from ordens_servico        where loja_id = loja_exemplo;  -- leva os itens junto (e os orçamentos)
  -- Cotação não é de loja: sai a das peças e fornecedores de exemplo (senão
  -- ela segura a peça e o fornecedor, que ficariam "em uso").
  delete from cotacoes_pecas
   where id::text like 'eeee%' or peca_id::text like 'eeee%' or fornecedor_id::text like 'eeee%';
  -- O computador inventado pelo exemplo (os de verdade, de quem entrou na
  -- loja de exemplo, ficam: o programa regrava a linha a cada login).
  delete from computadores          where id::text like 'eeee%';

  -- Funcionários sem login da loja de exemplo; o cadastro de exemplo.
  -- Um por um: o que ainda estiver em uso em outro lugar é pulado, sem erro.
  for r in
    select 'funcionarios' as t, id from funcionarios where loja_id = loja_exemplo and operador_id is null
    union all select 'veiculos', id from veiculos where id::text like 'eeee%'
    union all select 'clientes', id from clientes where id::text like 'eeee%'
    union all select 'pecas', id from pecas where id::text like 'eeee%'
    union all select 'fornecedores', id from fornecedores where id::text like 'eeee%'
    union all select 'categorias_caixa', id from categorias_caixa where id::text like 'eeee%'
  loop
    begin
      execute format('delete from %I where id = $1', r.t) using r.id;
    exception when foreign_key_violation then
      pulados := pulados + 1;
    end;
  end loop;

  raise notice 'Loja de exemplo zerada. Cadastros pulados por estarem em uso: %.', pulados;
end $$;

commit;

select 'Loja de exemplo zerada. Agora rode de novo o dados-de-exemplo.sql.' as resultado,
       (select count(*) from ordens_servico where loja_id = 'eeee0001-0000-4000-8000-000000000001') as ordens_que_sobraram;
