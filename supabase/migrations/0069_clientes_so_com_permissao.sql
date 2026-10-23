-- Sakura System — AutoCenter Edition
-- Migration 0069: Clientes e Veículos só pra quem tem o módulo Clientes — a
-- segunda metade do lote 4 do TR-04.1 (tarefa #365). A primeira, a 0068, abriu
-- a janela estreita e as funções do balcão; esta FECHA as duas tabelas.
--
-- O PROBLEMA. Quem não tem o módulo Clientes não vê a tela, mas a RLS só
-- exigia login (0015): com a chave que está no computador dava pra pedir pela
-- API o cadastro inteiro (telefone, CPF, endereço, aniversário), e o de TODAS
-- as lojas da empresa, porque `clientes` e `veiculos` são compartilhados.
--
-- O que o balcão continua tendo sem o módulo está na 0068 (a janela, o
-- cadastro rápido e os dados da nota). O cliente "Consumidor" (0064) continua
-- visível pra qualquer logado: é nele que a venda de balcão nasce.
--
-- ORDEM DE SUBIR. Com esta rodada, a versão anterior do programa perde, pra
-- quem não tem Clientes, o nome do cliente nas listas (o `join` em tabela
-- fechada devolve `null` calado, §6 item 69 — medido num PostgREST 12), a
-- emissão de nota e o cadastro rápido. Por isso a linha abaixo: o botão
-- "Atualizar o banco de todas as empresas" espera os computadores chegarem
-- na versão que lê pela janela. Se a versão nova sair com outro número,
-- ajustar aqui.
-- versao-minima-do-programa: 0.9.54
--
-- Os quatro comandos em policies separadas, pelo motivo de sempre (0056):
-- uma `for all` sobrevivente reabriria o que a nova fecha, e comando sem
-- policy filtra a zero linhas sem erro nenhum (§6 item 15).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. clientes: só o módulo (e o Consumidor, pra qualquer um logado)
-- ===================================================================

drop policy if exists "clientes_acesso_temporario" on clientes;
drop policy if exists "clientes_acesso_autenticados" on clientes;
drop policy if exists "clientes_leitura" on clientes;
drop policy if exists "clientes_insercao" on clientes;
drop policy if exists "clientes_alteracao" on clientes;
drop policy if exists "clientes_exclusao" on clientes;

create policy "clientes_leitura" on clientes
  for select to authenticated
  using (
    (select operador_tem_permissao('clientes'))
    or id = '00000000-0000-0000-0000-00000000c000'::uuid
  );

create policy "clientes_insercao" on clientes
  for insert to authenticated
  with check ((select operador_tem_permissao('clientes')));

create policy "clientes_alteracao" on clientes
  for update to authenticated
  using ((select operador_tem_permissao('clientes')))
  with check ((select operador_tem_permissao('clientes')));

create policy "clientes_exclusao" on clientes
  for delete to authenticated
  using ((select operador_tem_permissao('clientes')));

-- ===================================================================
-- 2. veiculos: só o módulo
-- ===================================================================

drop policy if exists "veiculos_acesso_temporario" on veiculos;
drop policy if exists "veiculos_acesso_autenticados" on veiculos;
drop policy if exists "veiculos_leitura" on veiculos;
drop policy if exists "veiculos_insercao" on veiculos;
drop policy if exists "veiculos_alteracao" on veiculos;
drop policy if exists "veiculos_exclusao" on veiculos;

create policy "veiculos_leitura" on veiculos
  for select to authenticated
  using ((select operador_tem_permissao('clientes')));

create policy "veiculos_insercao" on veiculos
  for insert to authenticated
  with check ((select operador_tem_permissao('clientes')));

create policy "veiculos_alteracao" on veiculos
  for update to authenticated
  using ((select operador_tem_permissao('clientes')))
  with check ((select operador_tem_permissao('clientes')));

create policy "veiculos_exclusao" on veiculos
  for delete to authenticated
  using ((select operador_tem_permissao('clientes')));

insert into schema_versao (versao) values (69) on conflict do nothing;
