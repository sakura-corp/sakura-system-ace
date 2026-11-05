-- Sakura System — AutoCenter Edition
-- Migration 0078: Fornecedores, pedidos de compra e cotações só pra quem tem
-- o módulo — o lote 7 do TR-04.1 (tarefa #880).
--
-- O PROBLEMA. Quem não tem o módulo Fornecedores não vê a tela, mas a RLS de
-- `fornecedores` e `cotacoes_pecas` só exigia login (0039, 0042) e a de
-- `pedidos_compra` e `pedidos_compra_itens` só o acesso à loja (0039): com a
-- chave que está no computador dava pra ler e mexer em tudo pela API. E o
-- preço de compra da cotação e do item do pedido costuma ser o mesmo número
-- do custo da peça, que o lote 5 (0074) escondeu: este lote fecha de vez
-- (docs/licoes.md, item 1).
--
-- QUEM FICA COM O QUÊ (o mesmo padrão dos lotes 4 a 6, Sofia, #782):
--   • `fornecedores` e `cotacoes_pecas` (catálogo da empresa toda): ler e
--     gravar só com Fornecedores (ou admin).
--   • `pedidos_compra` e `pedidos_compra_itens`: só com Fornecedores (ou
--     admin) E na loja dele, como antes; o item herda a loja pelo pedido,
--     pela função `pedido_compra_acessivel` (seção 4).
--
-- NENHUMA JANELA. O mapa de quem lê e grava (#880, 05/11/2026): só as telas
-- de src/pages/fornecedores/ (por src/lib/fornecedores.ts, pedidosCompra.ts e
-- cotacoesPecas.ts), atrás do módulo Fornecedores. A `juntar_pecas` (0067)
-- mexe nos itens de pedido e nas cotações, mas é `security definer` e só de
-- admin: não muda. A entrada da compra no estoque é a porta estreita que a
-- 0074 já abriu pra Fornecedores.
--
-- ORDEM DE SUBIR. Só fecha o que a versão atual do programa já esconde atrás
-- do módulo, então não precisa esperar versão nenhuma: NÃO tem a linha de
-- versão mínima do programa. O botão "Atualizar o banco de todas as
-- empresas" aplica em ordem, então ela entra depois da 0076 (que espera a
-- 0.9.56) e da 0077.
--
-- Os quatro comandos em policies separadas, pelo motivo de sempre (0056):
-- uma `for all` sobrevivente reabriria o que a nova fecha, e comando sem
-- policy filtra a zero linhas sem erro nenhum (§6 item 15). A função de
-- permissão vai sempre dentro de `(select ...)`: assim o Postgres a calcula
-- uma vez por consulta, não uma vez por linha.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. fornecedores: só Fornecedores
-- ===================================================================

drop policy if exists "fornecedores_acesso_autenticados" on fornecedores;
drop policy if exists "fornecedores_leitura" on fornecedores;
drop policy if exists "fornecedores_insercao" on fornecedores;
drop policy if exists "fornecedores_alteracao" on fornecedores;
drop policy if exists "fornecedores_exclusao" on fornecedores;

create policy "fornecedores_leitura" on fornecedores
  for select to authenticated
  using ((select operador_tem_permissao('fornecedores')));

create policy "fornecedores_insercao" on fornecedores
  for insert to authenticated
  with check ((select operador_tem_permissao('fornecedores')));

create policy "fornecedores_alteracao" on fornecedores
  for update to authenticated
  using ((select operador_tem_permissao('fornecedores')))
  with check ((select operador_tem_permissao('fornecedores')));

create policy "fornecedores_exclusao" on fornecedores
  for delete to authenticated
  using ((select operador_tem_permissao('fornecedores')));

-- ===================================================================
-- 2. cotacoes_pecas: só Fornecedores
-- ===================================================================

drop policy if exists "cotacoes_pecas_acesso_autenticados" on cotacoes_pecas;
drop policy if exists "cotacoes_pecas_leitura" on cotacoes_pecas;
drop policy if exists "cotacoes_pecas_insercao" on cotacoes_pecas;
drop policy if exists "cotacoes_pecas_alteracao" on cotacoes_pecas;
drop policy if exists "cotacoes_pecas_exclusao" on cotacoes_pecas;

create policy "cotacoes_pecas_leitura" on cotacoes_pecas
  for select to authenticated
  using ((select operador_tem_permissao('fornecedores')));

create policy "cotacoes_pecas_insercao" on cotacoes_pecas
  for insert to authenticated
  with check ((select operador_tem_permissao('fornecedores')));

create policy "cotacoes_pecas_alteracao" on cotacoes_pecas
  for update to authenticated
  using ((select operador_tem_permissao('fornecedores')))
  with check ((select operador_tem_permissao('fornecedores')));

create policy "cotacoes_pecas_exclusao" on cotacoes_pecas
  for delete to authenticated
  using ((select operador_tem_permissao('fornecedores')));

-- ===================================================================
-- 3. pedidos_compra: só Fornecedores, na loja dele
-- ===================================================================

drop policy if exists "pedidos_compra_acesso_por_loja" on pedidos_compra;
drop policy if exists "pedidos_compra_leitura" on pedidos_compra;
drop policy if exists "pedidos_compra_insercao" on pedidos_compra;
drop policy if exists "pedidos_compra_alteracao" on pedidos_compra;
drop policy if exists "pedidos_compra_exclusao" on pedidos_compra;

create policy "pedidos_compra_leitura" on pedidos_compra
  for select to authenticated
  using ((select operador_tem_permissao('fornecedores')) and operador_tem_acesso_loja(loja_id));

create policy "pedidos_compra_insercao" on pedidos_compra
  for insert to authenticated
  with check ((select operador_tem_permissao('fornecedores')) and operador_tem_acesso_loja(loja_id));

create policy "pedidos_compra_alteracao" on pedidos_compra
  for update to authenticated
  using ((select operador_tem_permissao('fornecedores')) and operador_tem_acesso_loja(loja_id))
  with check ((select operador_tem_permissao('fornecedores')) and operador_tem_acesso_loja(loja_id));

create policy "pedidos_compra_exclusao" on pedidos_compra
  for delete to authenticated
  using ((select operador_tem_permissao('fornecedores')) and operador_tem_acesso_loja(loja_id));

-- ===================================================================
-- 4. pedidos_compra_itens: só Fornecedores, na loja do pedido
-- ===================================================================
-- O item não tem loja própria: ela vem do pedido. Antes (0039) era um
-- `exists` em `pedidos_compra`, que roda com a RLS de quem pergunta — e,
-- agora que o pedido exige o módulo, ele HERDARIA a regra: um teste que tira
-- o módulo da policy do item passaria verde (aconteceu na #880, a mesma
-- lição do lote 6, docs/licoes.md item 1). Como na 0076, a loja vai por uma
-- função `security definer` que só confere a loja, e o módulo fica escrito
-- num lugar só: aqui.

drop policy if exists "pedidos_compra_itens_acesso_por_loja" on pedidos_compra_itens;
drop policy if exists "pedidos_compra_itens_leitura" on pedidos_compra_itens;
drop policy if exists "pedidos_compra_itens_insercao" on pedidos_compra_itens;
drop policy if exists "pedidos_compra_itens_alteracao" on pedidos_compra_itens;
drop policy if exists "pedidos_compra_itens_exclusao" on pedidos_compra_itens;
-- (as policies que usam a função saem antes dela: senão, na segunda rodada,
-- o `drop function` pararia na dependência — §6 item 12)
drop function if exists pedido_compra_acessivel(uuid);

create function pedido_compra_acessivel(p_pedido uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from pedidos_compra pc
     where pc.id = p_pedido
       and operador_tem_acesso_loja(pc.loja_id)
  );
$$;

comment on function pedido_compra_acessivel(uuid) is
  'TR-04.1 lote 7 (0078). Sim se o pedido de compra existe e é de uma loja de '
  'quem pergunta. É a conferência de loja das policies de pedidos_compra_itens '
  '(o item não tem loja própria). Não confere módulo: isso é da policy.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria a função.
revoke all on function pedido_compra_acessivel(uuid) from public, anon;
grant execute on function pedido_compra_acessivel(uuid) to authenticated;

create policy "pedidos_compra_itens_leitura" on pedidos_compra_itens
  for select to authenticated
  using ((select operador_tem_permissao('fornecedores')) and pedido_compra_acessivel(pedido_compra_id));

create policy "pedidos_compra_itens_insercao" on pedidos_compra_itens
  for insert to authenticated
  with check ((select operador_tem_permissao('fornecedores')) and pedido_compra_acessivel(pedido_compra_id));

create policy "pedidos_compra_itens_alteracao" on pedidos_compra_itens
  for update to authenticated
  using ((select operador_tem_permissao('fornecedores')) and pedido_compra_acessivel(pedido_compra_id))
  with check ((select operador_tem_permissao('fornecedores')) and pedido_compra_acessivel(pedido_compra_id));

create policy "pedidos_compra_itens_exclusao" on pedidos_compra_itens
  for delete to authenticated
  using ((select operador_tem_permissao('fornecedores')) and pedido_compra_acessivel(pedido_compra_id));

insert into schema_versao (versao) values (78) on conflict do nothing;
