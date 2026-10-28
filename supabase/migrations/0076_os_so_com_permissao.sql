-- Sakura System — AutoCenter Edition
-- Migration 0076: Ordens de Serviço só pra quem tem o módulo — a segunda
-- metade do lote 6 do TR-04.1 (tarefa #367). A primeira, a 0075, abriu as
-- cinco janelas (Caixa, Comissões, Garantias, Notas e Clientes) e trocou o
-- `exists` das policies de INSERT do Caixa e de Contas a Receber por uma
-- função; esta FECHA as duas tabelas.
--
-- O PROBLEMA. A RLS de `ordens_servico` e `ordens_servico_itens` só exigia o
-- acesso à loja (0032): com a chave que está no computador, qualquer operador
-- da loja lia todas as OS, com observação e custo de peça avulsa, e alterava,
-- faturava ou apagava OS pela API.
--
-- QUEM FICA COM O QUÊ (issue #367):
--   • Ler as duas tabelas inteiras: Ordens de Serviço e Relações. Relações
--     continua lendo direto porque a Lucratividade mostra a OS item a item, e
--     ela já vê o custo de tudo desde a #366.
--   • Gravar (criar, alterar, apagar) OS e itens: só Ordens de Serviço. O
--     gatilho do número (0037/0065) e as funções da 0071 rodam como quem
--     chama, e quem chama tem o módulo — nada muda pra eles.
--   • A loja do item é conferida pela função `ordem_servico_acessivel`, que
--     substitui o `exists` da 0032 (medido mais rápido, seção 2).
--   • O resto lê pela janela da sua tela (0075), e quem só tem Contas a
--     Receber continua lançando no Caixa a entrada de uma conta ligada a uma
--     OS, pela função `ordem_servico_da_loja` (0075).
--
-- ORDEM DE SUBIR. Com esta rodada, a versão anterior do programa perde, pra
-- quem não tem OS, a lista do Caixa com o nome e o total da OS, as comissões,
-- as garantias, o cliente da nota, a ficha do veículo e o Início (que lia
-- `ordens_servico` direto). Por isso a linha abaixo: o botão "Atualizar o
-- banco de todas as empresas" espera os computadores chegarem na versão que
-- lê pelas janelas, a 0.9.56.
--
-- POR QUE NÃO PODE SER A 0.9.55. A 0074 (já na main) espera a 0.9.55 nos
-- computadores, e o robô de atualizar os bancos (`acharCorte`, em
-- scripts/atualizar-bancos.mjs) segura junto todas as migrations que vêm
-- depois dela — a 0075 inclusive. Uma 0.9.55 que lesse pelas janelas
-- precisaria da 0075 no banco antes de chegar nas lojas, e a 0075 só entra
-- depois da 0.9.55 nos computadores: as telas fora da OS quebrariam no meio.
-- Então a ordem é:
--   1. publicar e liberar a 0.9.55 SEM este código (o da #367);
--   2. rodar a 0074 e a 0075 (o botão as solta quando todos estão na 0.9.55);
--   3. publicar e liberar a 0.9.56, que lê pelas janelas;
--   4. rodar esta, a 0076 (o botão a solta quando todos estão na 0.9.56).
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
-- 1. ordens_servico: lê quem tem OS ou Relações; grava só OS
-- ===================================================================

drop policy if exists "ordens_servico_acesso_temporario" on ordens_servico;
drop policy if exists "ordens_servico_acesso_autenticados" on ordens_servico;
drop policy if exists "ordens_servico_acesso_por_loja" on ordens_servico;
drop policy if exists "ordens_servico_leitura" on ordens_servico;
drop policy if exists "ordens_servico_insercao" on ordens_servico;
drop policy if exists "ordens_servico_alteracao" on ordens_servico;
drop policy if exists "ordens_servico_exclusao" on ordens_servico;

create policy "ordens_servico_leitura" on ordens_servico
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('ordens_servico'))
      or (select operador_tem_permissao('relatorios'))
    )
  );

create policy "ordens_servico_insercao" on ordens_servico
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('ordens_servico'))
  );

create policy "ordens_servico_alteracao" on ordens_servico
  for update to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('ordens_servico'))
  )
  with check (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('ordens_servico'))
  );

create policy "ordens_servico_exclusao" on ordens_servico
  for delete to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (select operador_tem_permissao('ordens_servico'))
  );

-- ===================================================================
-- 2. ordens_servico_itens: as mesmas regras, com a loja vinda da OS
-- ===================================================================

-- O item não tem loja_id próprio: a loja é a da OS dele. A 0032 conferia com
-- um `exists` em `ordens_servico` dentro da policy. Medido com 5 mil OS e 20
-- mil itens numa loja, a lista de OS inteira (como o programa pede, num
-- PostgREST 12) levou 3,7 s pra quem tem OS com o `exists` e 3,0 s com esta
-- função — o custo estimado da leitura dos itens cai de 56 mil pra 20 mil,
-- longe do JIT (§6 item 75). Como a função roda com os direitos do dono e
-- não herda RLS nenhuma, ela mesma confere a loja de quem pergunta, e só
-- responde sim/não (não serve pra descobrir de que loja é uma OS). O módulo
-- fica na policy, fora dela.
drop policy if exists "ordens_servico_itens_acesso_temporario" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_acesso_autenticados" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_acesso_por_loja" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_leitura" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_insercao" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_alteracao" on ordens_servico_itens;
drop policy if exists "ordens_servico_itens_exclusao" on ordens_servico_itens;
-- (as policies que usam a função saem antes dela: senão, na segunda rodada,
-- o `drop function` pararia na dependência — §6 item 12)
drop function if exists ordem_servico_acessivel(uuid);

create function ordem_servico_acessivel(p_ordem uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from ordens_servico o
      join operador_lojas ol
        on ol.loja_id = o.loja_id
       and ol.operador_id = auth.uid()
     where o.id = p_ordem
  );
$$;

comment on function ordem_servico_acessivel(uuid) is
  'TR-04.1 lote 6 (0076). Sim se a OS existe e é de uma loja de quem '
  'pergunta. É a conferência de loja das policies de ordens_servico_itens '
  '(o item não tem loja própria). Não confere módulo: isso é da policy.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria a função.
revoke all on function ordem_servico_acessivel(uuid) from public, anon;
grant execute on function ordem_servico_acessivel(uuid) to authenticated;

create policy "ordens_servico_itens_leitura" on ordens_servico_itens
  for select to authenticated
  using (
    (
      (select operador_tem_permissao('ordens_servico'))
      or (select operador_tem_permissao('relatorios'))
    )
    and ordem_servico_acessivel(ordem_servico_id)
  );

create policy "ordens_servico_itens_insercao" on ordens_servico_itens
  for insert to authenticated
  with check (
    (select operador_tem_permissao('ordens_servico'))
    and ordem_servico_acessivel(ordem_servico_id)
  );

create policy "ordens_servico_itens_alteracao" on ordens_servico_itens
  for update to authenticated
  using (
    (select operador_tem_permissao('ordens_servico'))
    and ordem_servico_acessivel(ordem_servico_id)
  )
  with check (
    (select operador_tem_permissao('ordens_servico'))
    and ordem_servico_acessivel(ordem_servico_id)
  );

create policy "ordens_servico_itens_exclusao" on ordens_servico_itens
  for delete to authenticated
  using (
    (select operador_tem_permissao('ordens_servico'))
    and ordem_servico_acessivel(ordem_servico_id)
  );

insert into schema_versao (versao) values (76) on conflict do nothing;
