-- Sakura System — AutoCenter Edition
-- Migration 0091: "De onde veio" — a origem do cliente (#1021).
--
-- O PROBLEMA. A loja não sabe de onde vêm os clientes (anúncio, indicação,
-- passou na frente), e sem isso não dá pra saber se o dinheiro gasto em
-- divulgação volta. O relatório que usa este dado é outra tarefa; aqui nasce
-- só o campo.
--
-- AS DECISÕES (Sofia, na issue #1021):
--   • LISTA FIXA, igual pra toda loja: anuncio_redes (Instagram/Facebook),
--     google, indicacao, passou_na_frente, parceiro, ja_era_cliente, outro.
--     Os rótulos moram num lugar só no programa (src/schemas/origemCliente.ts);
--     o banco aceita só esses valores, ou vazio. Mais um texto curto e
--     opcional, "qual anúncio ou quem indicou" (até 80 letras).
--   • SEMPRE OPCIONAL: vazio é "Não informado" e nunca impede salvar.
--   • NOS DOIS LUGARES: no cliente (de onde ele veio na primeira vez) e em
--     cada OS (de onde veio DESTA vez). O orçamento e a venda de balcão são OS
--     (`status`/`tipo`), então usam as mesmas colunas de `ordens_servico`.
--   • Trocar a origem na OS NÃO muda o cliente. Mas cliente SEM origem que
--     ganha uma OS com origem passa a ter aquela origem.
--   • O "Consumidor" (0064) nunca tem origem: a origem da venda anônima fica
--     só na venda.
--
-- POR QUE A HERANÇA É UM GATILHO, E NÃO O PROGRAMA. Quem tem só o módulo OS
-- não grava em `clientes` (0069): o programa dele não conseguiria passar a
-- origem pro cliente. O gatilho roda com os direitos do dono (security
-- definer) e só faz UMA coisa: preenche a origem do cliente que ainda não tem
-- nenhuma, nunca troca uma que já existe, e nunca no Consumidor. Pior caso de
-- abuso pela API: alguém com OS dá uma origem da lista a um cliente que
-- estava sem nenhuma — o mesmo que ele já faz pelo cadastro rápido.
--
-- O QUE NÃO MUDA. Nenhuma policy (as colunas seguem as regras das tabelas) e
-- nenhuma janela: a `clientes_janela` continua só com id e nome (o teste
-- testar-clientes-permissao.sql trava isso). Quem não tem o módulo Clientes
-- só não vê a sugestão da origem do cliente ao abrir a OS; a herança, que é
-- no banco, vale pra ele também.
--
-- ORDEM DE SUBIR. Só acrescenta colunas opcionais, travas que valem só pra
-- elas e um gatilho; o programa antigo não pede nada disso e continua igual.
-- A versão nova do programa grava as colunas novas ao salvar cliente, OS,
-- orçamento e venda, então esta migration sobe ANTES da versão, como as
-- outras, e não declara versão mínima do programa.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. As colunas
-- ===================================================================

alter table clientes add column if not exists origem text;
alter table clientes add column if not exists origem_detalhe text;
alter table ordens_servico add column if not exists origem text;
alter table ordens_servico add column if not exists origem_detalhe text;

comment on column clientes.origem is
  '#1021 (0091). De onde o cliente veio na PRIMEIRA vez. Valores fixos (ver ck_clientes_origem); vazio = não informado. Nunca preenchido no Consumidor.';
comment on column clientes.origem_detalhe is
  '#1021 (0091). Qual anúncio ou quem indicou (texto livre, opcional, até 80 letras).';
comment on column ordens_servico.origem is
  '#1021 (0091). De onde o cliente veio DESTA vez (OS, orçamento ou venda de balcão). Mesmos valores de clientes.origem; vazio = não informado.';
comment on column ordens_servico.origem_detalhe is
  '#1021 (0091). Qual anúncio ou quem indicou, desta vez (texto livre, opcional, até 80 letras).';

-- ===================================================================
-- 2. As travas (com o nome que a tela traduz, em src/lib/errors.ts)
-- ===================================================================

alter table clientes drop constraint if exists ck_clientes_origem;
alter table clientes
  add constraint ck_clientes_origem
  check (origem is null or origem in (
    'anuncio_redes', 'google', 'indicacao', 'passou_na_frente', 'parceiro', 'ja_era_cliente', 'outro'
  ));

alter table ordens_servico drop constraint if exists ck_ordens_servico_origem;
alter table ordens_servico
  add constraint ck_ordens_servico_origem
  check (origem is null or origem in (
    'anuncio_redes', 'google', 'indicacao', 'passou_na_frente', 'parceiro', 'ja_era_cliente', 'outro'
  ));

alter table clientes drop constraint if exists ck_clientes_origem_detalhe;
alter table clientes
  add constraint ck_clientes_origem_detalhe
  check (origem_detalhe is null or char_length(origem_detalhe) <= 80);

alter table ordens_servico drop constraint if exists ck_ordens_servico_origem_detalhe;
alter table ordens_servico
  add constraint ck_ordens_servico_origem_detalhe
  check (origem_detalhe is null or char_length(origem_detalhe) <= 80);

-- O Consumidor é "ninguém em particular": origem nele seria a de todo mundo.
alter table clientes drop constraint if exists ck_clientes_consumidor_sem_origem;
alter table clientes
  add constraint ck_clientes_consumidor_sem_origem
  check (
    id <> '00000000-0000-0000-0000-00000000c000'::uuid
    or (origem is null and origem_detalhe is null)
  );

-- ===================================================================
-- 3. A herança: cliente sem origem pega a da OS
-- ===================================================================

create or replace function origem_da_ordem_no_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.origem is null
     or new.cliente_id = '00000000-0000-0000-0000-00000000c000'::uuid then
    return new;
  end if;

  -- O detalhe que o cliente já tinha (escrito com a origem em branco) fica;
  -- o da OS só entra se ele não tinha nenhum.
  update clientes
     set origem = new.origem,
         origem_detalhe = coalesce(origem_detalhe, new.origem_detalhe)
   where id = new.cliente_id
     and origem is null;

  return new;
end;
$$;

comment on function origem_da_ordem_no_cliente() is
  '#1021 (0091). Gatilho de ordens_servico: o cliente que ainda não tem origem '
  'ganha a da OS (ou orçamento, ou venda). Nunca troca origem que já existe e '
  'nunca mexe no Consumidor. security definer porque quem tem só o módulo OS '
  'não grava em clientes.';

revoke all on function origem_da_ordem_no_cliente() from public, anon, authenticated;

drop trigger if exists trigger_origem_da_ordem_no_cliente on ordens_servico;
create trigger trigger_origem_da_ordem_no_cliente
  after insert or update of origem, cliente_id on ordens_servico
  for each row execute function origem_da_ordem_no_cliente();

-- ===================================================================
-- 4. O cadastro rápido (0068) passa a gravar a origem
-- ===================================================================

-- Igual à da 0068 em tudo, menos as duas chaves novas. Vazio vira nulo (o
-- programa manda "" quando a pessoa não escolhe), e um valor fora da lista
-- esbarra na trava ck_clientes_origem, como no cadastro completo.
create or replace function cadastrar_cliente_rapido(p_cliente jsonb, p_veiculo jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_veiculo_id uuid;
begin
  if not (operador_tem_permissao('ordens_servico') or operador_tem_permissao('clientes'))
     or not operador_ativo_com_loja() then
    raise exception 'Cadastrar cliente pela OS é só de quem tem o módulo Ordens de Serviço.'
      using errcode = '42501';
  end if;
  if nullif(btrim(p_cliente ->> 'nome'), '') is null then
    raise exception 'Preencha o nome do cliente.';
  end if;

  insert into clientes (nome, telefone, tipo_pessoa, cpf_cnpj, origem, origem_detalhe)
  values (
    p_cliente ->> 'nome',
    p_cliente ->> 'telefone',
    coalesce(p_cliente ->> 'tipo_pessoa', 'fisica'),
    p_cliente ->> 'cpf_cnpj',
    nullif(btrim(p_cliente ->> 'origem'), ''),
    nullif(btrim(p_cliente ->> 'origem_detalhe'), '')
  )
  returning id into v_cliente_id;

  if p_veiculo is not null and jsonb_typeof(p_veiculo) = 'object' then
    v_veiculo_id := cadastrar_veiculo_rapido(v_cliente_id, p_veiculo);
  end if;

  return jsonb_build_object('cliente_id', v_cliente_id, 'veiculo_id', v_veiculo_id);
end;
$$;

comment on function cadastrar_cliente_rapido(jsonb, jsonb) is
  'TR-04.1 lote 4 (0068), com a origem desde a 0091 (#1021). O cadastro rápido '
  'de dentro da OS, do Orçamento e da venda de balcão, pra quem tem OS sem ter '
  'Clientes. Grava só nome, telefone, tipo, CPF/CNPJ e a origem (e o veículo, '
  'se vier); devolve só os ids, nunca o cadastro.';

revoke all on function cadastrar_cliente_rapido(jsonb, jsonb) from public, anon;
grant execute on function cadastrar_cliente_rapido(jsonb, jsonb) to authenticated;

insert into schema_versao (versao) values (91) on conflict do nothing;
