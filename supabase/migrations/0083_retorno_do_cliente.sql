-- Sakura System — AutoCenter Edition
-- Migration 0083: o retorno do cliente (lembrete de revisão, FN-06, #381).
--
-- O PROBLEMA. O sistema sabe o que foi feito em cada carro, quando e com que
-- KM, mas não usa isso pra chamar o cliente de volta na hora da próxima
-- revisão (alinhamento a cada 10 mil km ou 6 meses, por exemplo).
--
-- A DECISÃO (Sofia, 10/11/2026). O "retorno previsto" é CALCULADO NA HORA pelo
-- programa, a partir das OS faturadas e do intervalo de cada serviço, como os
-- "clientes que sumiram" (#455): sem tabela nova e sem RLS nova. O banco só
-- precisa guardar três coisas:
--   • em `servicos`, o intervalo opcional, em dias e em km. Sem valor = o
--     serviço não gera retorno. NENHUM serviço ganha intervalo aqui: quem quer
--     o lembrete preenche no cadastro de Serviços;
--   • em `clientes`, o "não avisar" (padrão falso): cliente marcado nunca
--     entra na lista de retornos, nem na dos que sumiram;
--   • na janela `ordens_servico_clientes` (0075), o `servico_id` de cada item,
--     pra conta saber qual serviço do cadastro foi feito (o serviço digitado à
--     mão, sem cadastro, vem com `servico_id` nulo e não gera retorno).
--
-- POR QUE A JANELA E NÃO A TABELA. Quem tem só o módulo Clientes não lê
-- `ordens_servico_itens` (0075); a lista de Retornos mora em Clientes e lê
-- pela mesma janela da ficha do veículo. O `servico_id` não é custo nem
-- observação (o que a janela nunca pode entregar): é só "qual serviço".
--
-- ORDEM DE SUBIR. Só acrescenta colunas opcionais (com padrão) e uma chave a
-- mais dentro do jsonb da janela: o programa antigo não pede nenhuma delas e
-- continua funcionando igual. Por isso sobe ANTES da versão do programa, como
-- as outras, e não declara versão mínima do programa.
--
-- A trava tem nome `ck_<tabela>_<regra>` porque a tela traduz cada uma numa
-- frase em português (src/lib/errors.ts). As colunas nascem vazias, então
-- nenhum serviço que já existe fica fora da regra.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. O intervalo do serviço (em dias e em km), opcional
-- ===================================================================

alter table servicos add column if not exists intervalo_dias integer;
alter table servicos add column if not exists intervalo_km integer;

-- Cada um maior que zero, ou vazio. Zero ou negativo faria o carro "voltar"
-- no mesmo dia (ou antes) e encheria a lista de retorno falso.
alter table servicos drop constraint if exists ck_servicos_intervalo;
alter table servicos
  add constraint ck_servicos_intervalo
  check (
    (intervalo_dias is null or intervalo_dias between 1 and 3650)
    and (intervalo_km is null or intervalo_km between 1 and 1000000)
  );

comment on column servicos.intervalo_dias is
  'FN-06 (0083). A cada quantos dias o cliente deve voltar pra este serviço (6 meses = 180). Vazio = este serviço não gera retorno pelo tempo.';
comment on column servicos.intervalo_km is
  'FN-06 (0083). A cada quantos km o cliente deve voltar pra este serviço. Vazio = este serviço não gera retorno pelo KM. A previsão pelo KM é sempre uma estimativa.';

-- ===================================================================
-- 2. "Não mandar lembrete pra este cliente"
-- ===================================================================

alter table clientes add column if not exists nao_avisar boolean not null default false;

comment on column clientes.nao_avisar is
  'FN-06 (0083). O cliente pediu pra não receber mensagem da loja: nunca entra na lista de retornos nem na de clientes que sumiram.';

-- ===================================================================
-- 3. A janela de Clientes passa a dizer QUAL serviço foi feito
-- ===================================================================

-- Igual à da 0075 em tudo, menos o `servico_id` dentro de cada item. As
-- colunas da view não mudam (só o conteúdo do jsonb `itens`), por isso dá pra
-- trocar no lugar, sem derrubar.
create or replace view ordens_servico_clientes
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
                     'servico_id',          i.servico_id,
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
  'TR-04.1 lote 6 (0075), servico_id na 0083 (FN-06). As OS do jeito que a '
  'ficha do veículo, a lista "clientes que sumiram" e a lista de retornos '
  'mostram: número, datas, km, cliente, veículo e os itens com descrição, '
  'quantidade, preço, desconto, o serviço do cadastro (servico_id) e o prazo '
  'de garantia da peça. Sem orçamento nem recusado. Exige Clientes ou OS, e '
  'só as lojas de quem pergunta (o where daqui). Só SELECT. NUNCA acrescentar '
  'custo nem observação.';

revoke all on ordens_servico_clientes from anon, authenticated;
grant select on ordens_servico_clientes to authenticated;

insert into schema_versao (versao) values (83) on conflict do nothing;
