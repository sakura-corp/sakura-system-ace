-- Sakura System — AutoCenter Edition
-- Migration 0075: as JANELAS das ordens de serviço — primeira metade do lote 6
-- da etapa 2 do TR-04.1 (tarefa #367). Os lotes anteriores: RH (0056), contas
-- (0061), Caixa (0062), Clientes (0068/0069) e Peças (0073/0074). A segunda
-- metade, que FECHA as duas tabelas, é a 0076.
--
-- POR QUE EM DUAS (o mesmo motivo da 0068 e da 0073). Esta só ACRESCENTA
-- (cinco views e uma função) e não muda nada pra versão atual do programa. A
-- versão nova passa a ler por elas — pra todo mundo, inclusive quem tem o
-- módulo OS —, então ela precisa desta migration já aplicada; e a 0076, que
-- fecha a porta, precisa da versão nova já nos computadores. Ordem: 0075 →
-- publicar e liberar a 0.9.56 → 0076. (Esta não declara versão mínima, mas
-- o botão de atualizar os bancos só a solta depois da 0074, que espera a
-- 0.9.55 nos computadores; o porquê de este código não poder sair na 0.9.55
-- está no cabeçalho da 0076.)
--
-- O PROBLEMA. Quem não tem o módulo Ordens de Serviço não vê a tela, mas a
-- RLS de `ordens_servico` e `ordens_servico_itens` só exigia o acesso à loja
-- (0032). Com a chave que está no computador, qualquer operador da loja lia
-- todas as OS (com a observação, o problema relatado pelo cliente, o custo de
-- cada peça avulsa) e podia alterar, faturar ou apagar OS pela API.
--
-- QUEM LÊ OS SEM TER O MÓDULO, E O QUE CADA UM RECEBE (uma janela por tela):
--
--   • CAIXA (e o Início e Relações, que usam a mesma lista): o número, o tipo,
--     o status, o nome do cliente e os itens SÓ com quantidade, preço e
--     desconto — o suficiente pro total da OS (`totalOrdem`). O custo já vem
--     pronto de `custo_das_ordens` (0073). → `ordens_servico_caixa`.
--
--   • FUNCIONÁRIOS (a aba Comissões): só as OS FATURADAS, com vendedor,
--     técnico de cada item e o custo da peça avulsa (a comissão sobre o lucro;
--     Funcionários já vê o custo das peças desde a #366). →
--     `ordens_servico_comissoes`.
--
--   • GARANTIAS: uma linha por PEÇA vendida, com o prazo da peça, a data em
--     que a OS fechou, o cliente e a placa. → `ordens_servico_garantias`.
--
--   • NOTAS FISCAIS: o seletor "OS relacionada" e o nome do cliente da nota
--     arquivada. → `ordens_servico_notas`.
--
--   • CLIENTES: a ficha do veículo e a lista "clientes que sumiram". O que a
--     tela mostra hoje: número, datas, km, veículo e os itens (descrição,
--     quantidade, preço, desconto e o prazo de garantia da peça). →
--     `ordens_servico_clientes`.
--
-- ORÇAMENTO E RECUSADO NÃO SAEM POR JANELA NENHUMA (#379). Toda tela fora
-- da de OS já os tira com `contaNosNumeros` (src/schemas/orcamento.ts); a
-- janela não entrega o que a tela não mostra. O filtro é o mesmo do programa
-- (`STATUS_DE_ORCAMENTO`: 'orcamento' e 'recusado'). Nenhuma conta muda: o
-- Caixa nunca tem lançamento de orçamento (o programa não fatura orçamento,
-- `faturarOrdem`), e a OS faturada não volta a orçamento (a trava
-- `ck_ordens_servico_transicao_orcamento`, 0065).
--
-- A ORDEM DOS ITENS é a mesma de antes: sem `order by`, como o `join`
-- embutido da tela de OS (na prática, a ordem em que foram gravados). Ordenar
-- pelo `id` embaralharia a lista: o `id` é um UUID aleatório.
--
-- NENHUMA CONTA DE DINHEIRO MUDA. As janelas entregam os campos crus de cada
-- item (num array `itens`, em jsonb) e a conta continua onde sempre esteve,
-- no programa (`totalOrdem`, `comissoes.ts`) e na `custo_das_ordens`.
--
-- POR QUE AS VIEWS RODAM COM OS DIREITOS DO DONO (security_invoker = false):
-- medido na 0056 — com a base fechada, a view `security_invoker = true`
-- devolve ZERO linhas. A consequência é a regra de sempre (§6 item 69): o
-- filtro de LOJA e o de MÓDULO têm que estar escritos DENTRO de cada view, e
-- o `revoke` tira a escrita (uma view simples é auto-atualizável e escreveria
-- na tabela por cima das policies). A função de permissão vai sempre dentro
-- de `(select ...)`: assim o Postgres a calcula uma vez por consulta, e não
-- uma vez por linha.
--
-- POR QUE O NOME DO CLIENTE E OS ITENS VÊM COMO COLUNA (e não por `join`
-- embutido do PostgREST): o `join` embutido a partir de uma view atravessaria
-- pra `ordens_servico_itens`, que a 0076 fecha — e `join` em tabela fechada
-- não dá erro, devolve vazio (§6 item 69). Com a subconsulta dentro da view,
-- ela continua simples (sem `group by`), uma linha por OS, e o PostgREST
-- consegue embutir a view pela coluna `id`, que é o `id` de `ordens_servico`
-- (ex.: `ordem_servico:ordens_servico_caixa(numero, itens)` a partir de
-- `caixa_movimentos`).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A janela do Caixa (e do Início e de Relações)
-- ===================================================================

drop view if exists ordens_servico_caixa;

create view ordens_servico_caixa
with (security_invoker = false, security_barrier = true)
as
  select o.id,
         o.loja_id,
         o.numero,
         o.tipo,
         o.status,
         (select c.nome from clientes c where c.id = o.cliente_id) as cliente_nome,
         -- Só o que o total da OS precisa. Sem descrição, sem custo.
         coalesce(
           (select jsonb_agg(jsonb_build_object(
                     'quantidade',     i.quantidade,
                     'preco_unitario', i.preco_unitario,
                     'desconto',       i.desconto))
              from ordens_servico_itens i
             where i.ordem_servico_id = o.id),
           '[]'::jsonb
         ) as itens
    from ordens_servico o
   where o.status not in ('orcamento', 'recusado')
     and operador_tem_acesso_loja(o.loja_id)
     and (
       (select operador_tem_permissao('caixa'))
       or (select operador_tem_permissao('relatorios'))
     );

comment on view ordens_servico_caixa is
  'TR-04.1 lote 6 (0075). As OS do jeito que o Caixa, o Início e Relações '
  'precisam: número, tipo, status, nome do cliente e os itens só com '
  'quantidade, preço e desconto (o total). Sem orçamento nem recusado. '
  'Exige Caixa ou Relações, e só as '
  'lojas de quem pergunta. Roda com os direitos do dono, então NÃO reage à '
  'RLS das tabelas — os dois filtros são o where daqui. Só SELECT. NUNCA '
  'acrescentar custo, descrição, observação nem veículo.';

revoke all on ordens_servico_caixa from anon, authenticated;
grant select on ordens_servico_caixa to authenticated;

-- ===================================================================
-- 2. A janela das comissões (Funcionários): só as faturadas
-- ===================================================================

-- Só `faturada` porque é a única OS que gera comissão (src/schemas/
-- comissoes.ts). Quem cuida da comissão não precisa do que está aberto.
drop view if exists ordens_servico_comissoes;

create view ordens_servico_comissoes
with (security_invoker = false, security_barrier = true)
as
  select o.id,
         o.loja_id,
         o.numero,
         o.tipo,
         o.status,
         o.data_abertura,
         o.data_fechamento,
         o.vendedor_id,
         (select c.nome from clientes c where c.id = o.cliente_id) as cliente_nome,
         coalesce(
           (select jsonb_agg(jsonb_build_object(
                     'id',             i.id,
                     'tipo',           i.tipo,
                     'peca_id',        i.peca_id,
                     'servico_id',     i.servico_id,
                     'quantidade',     i.quantidade,
                     'preco_unitario', i.preco_unitario,
                     'desconto',       i.desconto,
                     'custo_unitario', i.custo_unitario,
                     'tecnico_id',     i.tecnico_id))
              from ordens_servico_itens i
             where i.ordem_servico_id = o.id),
           '[]'::jsonb
         ) as itens
    from ordens_servico o
   where o.status = 'faturada'
     and operador_tem_acesso_loja(o.loja_id)
     and (select operador_tem_permissao('funcionarios'));

comment on view ordens_servico_comissoes is
  'TR-04.1 lote 6 (0075). As OS FATURADAS, com vendedor e os itens com '
  'técnico e custo da peça avulsa — o que a aba Comissões de Funcionários '
  'precisa. Exige Funcionários, e só as lojas de quem pergunta (o where '
  'daqui: a view roda com os direitos do dono). Só SELECT.';

revoke all on ordens_servico_comissoes from anon, authenticated;
grant select on ordens_servico_comissoes to authenticated;

-- ===================================================================
-- 3. A janela das Garantias: uma linha por peça vendida
-- ===================================================================

-- A descrição e o prazo vêm do CADASTRO da peça (o que a tela usa hoje, pela
-- pecas_janela); a peça avulsa (peca_id nulo) e a peça apagada saem com os
-- dois nulos. O `left join` não multiplica linhas: as duas chaves são
-- primárias. Só a peça de OS FECHADA (`data_fechamento`) e que não é
-- orçamento nem recusado: o mesmo corte de `listarItensComGarantia`
-- (src/lib/garantias.ts), que ainda tira, no programa, a peça sem prazo.
drop view if exists ordens_servico_garantias;

create view ordens_servico_garantias
with (security_invoker = false, security_barrier = true)
as
  select i.id,
         i.quantidade,
         i.peca_id,
         p.descricao           as peca_descricao,
         p.prazo_garantia_dias,
         o.id                  as ordem_servico_id,
         o.status              as ordem_status,
         o.data_fechamento     as ordem_data_fechamento,
         o.loja_id,
         (select c.nome from clientes c where c.id = o.cliente_id) as cliente_nome,
         o.veiculo_id,
         v.placa               as veiculo_placa
    from ordens_servico_itens i
    join ordens_servico o on o.id = i.ordem_servico_id
    left join pecas p     on p.id = i.peca_id
    left join veiculos v  on v.id = o.veiculo_id
   where i.tipo = 'peca'
     and o.data_fechamento is not null
     and o.status not in ('orcamento', 'recusado')
     and operador_tem_acesso_loja(o.loja_id)
     and (select operador_tem_permissao('garantias'));

comment on view ordens_servico_garantias is
  'TR-04.1 lote 6 (0075). Uma linha por peça vendida numa OS fechada (sem '
  'orçamento nem recusado): quantidade, a '
  'descrição e o prazo de garantia do cadastro, o status e a data de '
  'fechamento da OS, o cliente e a placa. Exige Garantias, e só as lojas de '
  'quem pergunta (o where daqui). Só SELECT. NUNCA acrescentar custo nem preço.';

revoke all on ordens_servico_garantias from anon, authenticated;
grant select on ordens_servico_garantias to authenticated;

-- ===================================================================
-- 4. A janela das Notas Fiscais: o seletor e o nome do cliente
-- ===================================================================

drop view if exists ordens_servico_notas;

create view ordens_servico_notas
with (security_invoker = false, security_barrier = true)
as
  select o.id,
         o.loja_id,
         o.numero,
         o.tipo,
         o.status,
         o.data_abertura,
         (select c.nome from clientes c where c.id = o.cliente_id) as cliente_nome
    from ordens_servico o
   where o.status not in ('orcamento', 'recusado')
     and operador_tem_acesso_loja(o.loja_id)
     and (select operador_tem_permissao('notas_fiscais'));

comment on view ordens_servico_notas is
  'TR-04.1 lote 6 (0075). As OS pro seletor "OS relacionada" das Notas '
  'Fiscais e o nome do cliente da nota arquivada: número, tipo, status, data '
  'de abertura e cliente. Sem orçamento nem recusado. Exige Notas Fiscais, e '
  'só as lojas de quem pergunta '
  '(o where daqui). Só SELECT. Sem itens nem valores.';

revoke all on ordens_servico_notas from anon, authenticated;
grant select on ordens_servico_notas to authenticated;

-- ===================================================================
-- 5. A janela de Clientes: a ficha do veículo e "clientes que sumiram"
-- ===================================================================

-- Mostra o que essas duas telas mostram hoje (a issue pede pra confirmar com
-- a Sofia se a ficha precisa de tudo isso; enquanto não, nada some da tela).
-- Entra também quem tem OS, porque a ficha do veículo abre pelas duas
-- permissões. O prazo de garantia é o da peça cadastrada (nulo na avulsa).
drop view if exists ordens_servico_clientes;

create view ordens_servico_clientes
with (security_invoker = false, security_barrier = true)
as
  select o.id,
         o.loja_id,
         o.numero,
         o.tipo,
         o.status,
         o.data_abertura,
         o.data_fechamento,
         o.cliente_id,
         (select c.nome from clientes c where c.id = o.cliente_id) as cliente_nome,
         o.veiculo_id,
         o.km_entrada,
         v.placa  as veiculo_placa,
         v.marca  as veiculo_marca,
         v.modelo as veiculo_modelo,
         coalesce(
           (select jsonb_agg(jsonb_build_object(
                     'id',                  i.id,
                     'tipo',                i.tipo,
                     'peca_id',             i.peca_id,
                     'descricao',           i.descricao,
                     'quantidade',          i.quantidade,
                     'preco_unitario',      i.preco_unitario,
                     'desconto',            i.desconto,
                     'prazo_garantia_dias', p.prazo_garantia_dias))
              from ordens_servico_itens i
              left join pecas p on p.id = i.peca_id
             where i.ordem_servico_id = o.id),
           '[]'::jsonb
         ) as itens
    from ordens_servico o
    left join veiculos v on v.id = o.veiculo_id
   where o.status not in ('orcamento', 'recusado')
     and operador_tem_acesso_loja(o.loja_id)
     and (
       (select operador_tem_permissao('clientes'))
       or (select operador_tem_permissao('ordens_servico'))
     );

comment on view ordens_servico_clientes is
  'TR-04.1 lote 6 (0075). As OS do jeito que a ficha do veículo e a lista '
  '"clientes que sumiram" mostram: número, datas, km, cliente, veículo e os '
  'itens com descrição, quantidade, preço, desconto e o prazo de garantia da '
  'peça. Sem orçamento nem recusado. Exige Clientes ou OS, e só as lojas '
  'de quem pergunta (o where '
  'daqui). Só SELECT. NUNCA acrescentar custo nem observação.';

revoke all on ordens_servico_clientes from anon, authenticated;
grant select on ordens_servico_clientes to authenticated;

-- ===================================================================
-- 6. "Esta OS é desta loja?" sem depender de quem pergunta enxergar a OS
-- ===================================================================

-- As policies de INSERT do Caixa (0062) e de Contas a Receber (0061)
-- conferiam com um `exists` em `ordens_servico`, que roda com a RLS de quem
-- grava. Hoje dá certo porque todo mundo da loja enxerga as OS dela. Depois
-- da 0076, quem tem SÓ Contas a Receber deixa de enxergar — e receber uma
-- conta que nasceu de uma OS daria "violates row-level security policy" no
-- lançamento do Caixa. A função roda com os direitos do dono e responde só
-- sim/não; e confere ela mesma que quem pergunta acessa a loja, pra não virar
-- um jeito de sondar OS de outra loja (§6 item 75).
-- As duas policies que usam a função saem ANTES de dropar a função: senão,
-- na segunda rodada, o `drop function` pararia na dependência (§6 item 12).
drop policy if exists "caixa_movimentos_insercao" on caixa_movimentos;
drop policy if exists "contas_receber_insercao" on contas_receber;
drop function if exists ordem_servico_da_loja(uuid, uuid);

create function ordem_servico_da_loja(p_ordem uuid, p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select operador_tem_acesso_loja(p_loja)
     and exists (
           select 1 from ordens_servico
            where id = p_ordem
              and loja_id = p_loja
         );
$$;

comment on function ordem_servico_da_loja(uuid, uuid) is
  'TR-04.1 lote 6 (0075). Sim se a OS existe e é da loja informada, e quem '
  'pergunta acessa essa loja. Usada nas policies de INSERT do Caixa e de '
  'Contas a Receber, que não podem depender de quem grava enxergar a OS.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria a função.
revoke all on function ordem_servico_da_loja(uuid, uuid) from public, anon;
grant execute on function ordem_servico_da_loja(uuid, uuid) to authenticated;

-- As duas policies, iguais às da 0062 e da 0061, trocando só o `exists` pela
-- função. Recriadas inteiras: uma policy não se altera aos pedaços (os
-- `drop` estão lá em cima, antes do da função).
create policy "caixa_movimentos_insercao" on caixa_movimentos
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (
        (select operador_tem_permissao('ordens_servico'))
        and tipo = 'entrada'
        and ordem_servico_id is not null
        and ordem_servico_da_loja(ordem_servico_id, loja_id)
      )
      or (
        (select operador_tem_permissao('contas_pagar'))
        and tipo = 'saida'
        and ordem_servico_id is null
      )
      or (
        (select operador_tem_permissao('contas_receber'))
        and tipo = 'entrada'
        and (
          ordem_servico_id is null
          or ordem_servico_da_loja(ordem_servico_id, loja_id)
        )
      )
    )
  );

create policy "contas_receber_insercao" on contas_receber
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('contas_receber'))
      or (
        (select operador_tem_permissao('ordens_servico'))
        and ordem_servico_id is not null
        and ordem_servico_da_loja(ordem_servico_id, loja_id)
      )
    )
  );

insert into schema_versao (versao) values (75) on conflict do nothing;
