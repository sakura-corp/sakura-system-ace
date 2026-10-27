-- Sakura System — AutoCenter Edition
-- Migration 0074: Peças e Estoque só pra quem tem o módulo — a segunda metade
-- do lote 5 do TR-04.1 (tarefa #366). A primeira, a 0073, abriu a janela
-- (`pecas_janela`, `estoque_saldos`) e as funções do balcão; esta FECHA as
-- três tabelas.
--
-- O PROBLEMA. Quem não tem o módulo Estoque não vê a tela, mas a RLS de
-- `pecas` só exigia login (0015) e a de `estoque_movimentos` e
-- `contagens_estoque` só o acesso à loja (0032): com a chave que está no
-- computador dava pra ler o custo de todas as peças, mudar preço, apagar peça
-- e lançar movimento de estoque à vontade.
--
-- QUEM FICA COM O QUÊ (decisões da Sofia, issue #366):
--   • `pecas` inteira, com custo: Estoque, Relações (lucratividade) e
--     Funcionários (comissão sobre o lucro). Escrever direto: só Estoque. Fora
--     dele, cadastro de peça só pela `cadastrar_peca_rapida()` (0073).
--   • `estoque_movimentos` e `contagens_estoque`: só Estoque, na loja dele.
--     A exceção é o INSERT de movimento, com três portas estreitas, todas na
--     loja de quem grava:
--       – OS: a baixa da peça usada (motivo 'uso_em_os'). É o que
--         `adicionar_itens_ordem`, `editar_item_ordem` e `aprovar_orcamento`
--         (0071, que rodam como quem chama) e a venda de balcão gravam;
--       – OS: a devolução ao estoque (entrada com motivo 'ajuste'). É o que a
--         `editar_item_ordem` grava quando a quantidade de um item DIMINUI, e
--         o estoque inicial da peça avulsa que ganha cadastro;
--       – Fornecedores: a entrada da compra (entrada com motivo 'compra').
--     Venda, ajuste de saída e qualquer outro movimento, só com Estoque.
--     Quem não tem Estoque grava SEM `returning` (que exigiria a leitura).
--
-- ORDEM DE SUBIR. Com esta rodada, a versão anterior do programa perde, pra
-- quem não tem Estoque, a lista de peças da OS (lê `pecas` direto), o saldo e
-- a baixa com `returning`. Por isso a linha abaixo: o botão "Atualizar o banco
-- de todas as empresas" espera os computadores chegarem na versão que lê pela
-- janela. Se a versão nova sair com outro número, ajustar aqui.
-- versao-minima-do-programa: 0.9.56
--
-- Os quatro comandos em policies separadas, pelo motivo de sempre (0056):
-- uma `for all` sobrevivente reabriria o que a nova fecha, e comando sem
-- policy filtra a zero linhas sem erro nenhum (§6 item 15). A função de
-- permissão vai sempre dentro de `(select ...)`: assim o Postgres a calcula
-- uma vez por consulta, não uma vez por linha.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. pecas: lê quem tem Estoque, Relações ou Funcionários; escreve só Estoque
-- ===================================================================

drop policy if exists "pecas_acesso_temporario" on pecas;
drop policy if exists "pecas_acesso_autenticados" on pecas;
drop policy if exists "pecas_leitura" on pecas;
drop policy if exists "pecas_insercao" on pecas;
drop policy if exists "pecas_alteracao" on pecas;
drop policy if exists "pecas_exclusao" on pecas;

create policy "pecas_leitura" on pecas
  for select to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('relatorios'))
    or (select operador_tem_permissao('funcionarios'))
  );

create policy "pecas_insercao" on pecas
  for insert to authenticated
  with check ((select operador_tem_permissao('estoque')));

create policy "pecas_alteracao" on pecas
  for update to authenticated
  using ((select operador_tem_permissao('estoque')))
  with check ((select operador_tem_permissao('estoque')));

create policy "pecas_exclusao" on pecas
  for delete to authenticated
  using ((select operador_tem_permissao('estoque')));

-- ===================================================================
-- 2. estoque_movimentos: só Estoque, menos as três portas de INSERT
-- ===================================================================

drop policy if exists "estoque_movimentos_acesso_temporario" on estoque_movimentos;
drop policy if exists "estoque_movimentos_acesso_autenticados" on estoque_movimentos;
drop policy if exists "estoque_movimentos_acesso_por_loja" on estoque_movimentos;
drop policy if exists "estoque_movimentos_leitura" on estoque_movimentos;
drop policy if exists "estoque_movimentos_insercao" on estoque_movimentos;
drop policy if exists "estoque_movimentos_alteracao" on estoque_movimentos;
drop policy if exists "estoque_movimentos_exclusao" on estoque_movimentos;

create policy "estoque_movimentos_leitura" on estoque_movimentos
  for select to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "estoque_movimentos_insercao" on estoque_movimentos
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('estoque'))
      or ((select operador_tem_permissao('ordens_servico')) and motivo = 'uso_em_os')
      or ((select operador_tem_permissao('ordens_servico')) and motivo = 'ajuste' and tipo = 'entrada')
      or ((select operador_tem_permissao('fornecedores')) and motivo = 'compra' and tipo = 'entrada')
    )
  );

create policy "estoque_movimentos_alteracao" on estoque_movimentos
  for update to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  )
  with check (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "estoque_movimentos_exclusao" on estoque_movimentos
  for delete to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

-- ===================================================================
-- 3. contagens_estoque: só Estoque, na loja dele
-- ===================================================================

drop policy if exists "contagens_estoque_acesso_autenticados" on contagens_estoque;
drop policy if exists "contagens_estoque_acesso_por_loja" on contagens_estoque;
drop policy if exists "contagens_estoque_leitura" on contagens_estoque;
drop policy if exists "contagens_estoque_insercao" on contagens_estoque;
drop policy if exists "contagens_estoque_alteracao" on contagens_estoque;
drop policy if exists "contagens_estoque_exclusao" on contagens_estoque;

create policy "contagens_estoque_leitura" on contagens_estoque
  for select to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "contagens_estoque_insercao" on contagens_estoque
  for insert to authenticated
  with check (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "contagens_estoque_alteracao" on contagens_estoque
  for update to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  )
  with check (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

create policy "contagens_estoque_exclusao" on contagens_estoque
  for delete to authenticated
  using (
    (select operador_tem_permissao('estoque'))
    and operador_tem_acesso_loja(loja_id)
  );

insert into schema_versao (versao) values (74) on conflict do nothing;
