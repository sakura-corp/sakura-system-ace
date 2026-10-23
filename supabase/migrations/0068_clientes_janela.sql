-- Sakura System — AutoCenter Edition
-- Migration 0068: a JANELA de Clientes e Veículos — primeira metade do lote 4
-- da etapa 2 do TR-04.1 (tarefa #365). Os lotes anteriores: RH (0056), contas
-- (0061) e Caixa (0062). A segunda metade, que FECHA as tabelas, é a 0069.
--
-- POR QUE EM DUAS. Esta só ACRESCENTA (duas views e quatro funções) e não
-- muda nada pra versão atual do programa. A versão nova passa a ler por elas
-- — pra todo mundo, inclusive quem tem o módulo —, então ela precisa desta
-- migration já aplicada; e a 0069, que fecha a porta, precisa da versão nova
-- já nos computadores. Numa só, uma das duas ordens quebrava as lojas
-- (achado da revisão final). Ordem: 0068 → publicar e liberar a versão → 0069.
--
-- O PROBLEMA. Quem não tem o módulo Clientes não vê a tela, mas a RLS só
-- exigia login (0015). Com a chave que está no computador, dava pra pedir
-- pela API o cadastro inteiro (telefone, CPF, endereço, aniversário) — e o de
-- TODAS as lojas da empresa, porque `clientes` e `veiculos` são
-- compartilhados (0032).
--
-- O QUE NÃO PODE QUEBRAR JUNTO (decisões da Sofia, 22/10/2026, na issue):
--
--   • A JANELA ESTREITA. Sem Clientes, a pessoa vê só o NOME do cliente e
--     PLACA, MARCA, MODELO, COR e TIPO do veículo — o que a lista de OS, o
--     Caixa, Contas a Receber, Garantias e Notas mostram. São as duas views
--     `clientes_janela` e `veiculos_janela`. Os `join` embutidos do programa
--     (`cliente:clientes_janela(nome)`) passam a apontar pra elas: `join` em
--     tabela fechada não dá erro, devolve `null` calado (§6 item 69), e o
--     nome do cliente sumiria da tela de quem não tem o módulo.
--
--   • ABRIR OS E ORÇAMENTO. Quem tem OS escolhe o cliente e o veículo pela
--     janela, e continua cadastrando cliente e carro novos pelo cadastro
--     rápido — `cadastrar_cliente_rapido()` e `cadastrar_veiculo_rapido()`.
--     Funções, e não uma porta de INSERT na tabela, porque o programa precisa
--     do id de volta, e um insert com `returning` exige também a policy de
--     LEITURA (lição da 0058). Elas aceitam só os campos do cadastro rápido;
--     ficha completa, editar e apagar continuam só do módulo.
--
--   • A NOTA FISCAL (e a garantia impressa). Na hora de emitir, o programa
--     precisa do CPF/CNPJ e do endereço do cliente DAQUELA OS.
--     `cliente_e_veiculo_da_ordem()` entrega o cadastro do cliente e do
--     veículo de UMA OS, pra quem tem acesso à loja dela e o módulo OS (ou
--     Clientes). Nunca uma lista.
--
--   • O CLIENTE "CONSUMIDOR" (0064) continua visível pra todos: é nele que a
--     venda de balcão nasce.
--
--   • O INÍCIO. Os aniversários do calendário vêm do cadastro completo; quem
--     não tem Clientes não pede (é do lado do programa, como na 0061).
--
-- POR QUE AS VIEWS RODAM COM OS DIREITOS DO DONO (security_invoker = false):
-- medido na 0056 — com a base fechada, a view `security_invoker = true`
-- devolve ZERO linhas. A consequência é a regra de sempre (§6 item 69): o
-- filtro de quem pode ler tem que estar escrito DENTRO dela, e o `revoke` lá
-- embaixo tira a escrita (view simples é auto-atualizável). Como clientes não
-- têm loja (são da empresa inteira), o filtro é "operador ativo e com alguma
-- loja" — o mesmo alcance que a tabela tinha antes, menos o órfão (§6 item 23).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A janela estreita: duas views, só leitura
-- ===================================================================

-- Quem pode olhar pela janela: operador ativo, com acesso a alguma loja. O
-- `exists` não depende da linha, então o Postgres o avalia uma vez por
-- consulta (InitPlan), não uma vez por cliente.
create or replace function operador_ativo_com_loja()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from operadores o
      join operador_lojas ol on ol.operador_id = o.id
     where o.id = auth.uid()
       and o.ativo = true
  );
$$;

comment on function operador_ativo_com_loja() is
  'TR-04.1 lote 4 (0068). Verdadeiro se quem está logado é operador ativo com '
  'acesso a pelo menos uma loja. É o filtro das views clientes_janela e '
  'veiculos_janela, que rodam com os direitos do dono e não reagem à RLS.';

revoke all on function operador_ativo_com_loja() from public, anon;
grant execute on function operador_ativo_com_loja() to authenticated;

drop view if exists clientes_janela;

create view clientes_janela
with (security_invoker = false, security_barrier = true)
as
  select c.id,
         c.nome
    from clientes c
   where (select operador_ativo_com_loja());

comment on view clientes_janela is
  'TR-04.1 lote 4 (0068). A parte de `clientes` que quem não tem o módulo '
  'Clientes pode ver: só o nome. Roda com os direitos do dono, então NÃO '
  'reage à RLS da tabela — é o where daqui que barra quem não é operador. '
  'Só SELECT é concedido: sem o revoke abaixo daria pra escrever na tabela '
  'por dentro dela. Nunca acrescentar telefone, CPF, endereço ou aniversário.';

revoke all on clientes_janela from anon, authenticated;
grant select on clientes_janela to authenticated;

drop view if exists veiculos_janela;

create view veiculos_janela
with (security_invoker = false, security_barrier = true)
as
  select v.id,
         v.cliente_id,
         v.placa,
         v.marca,
         v.modelo,
         v.cor,
         v.tipo
    from veiculos v
   where (select operador_ativo_com_loja());

comment on view veiculos_janela is
  'TR-04.1 lote 4 (0068). A parte de `veiculos` que quem não tem o módulo '
  'Clientes pode ver: placa, marca, modelo, cor e tipo. Mesmas regras da '
  'clientes_janela (direitos do dono, filtro aqui dentro, só SELECT).';

revoke all on veiculos_janela from anon, authenticated;
grant select on veiculos_janela to authenticated;

-- ===================================================================
-- 2. O cadastro rápido da OS, do Orçamento e da venda de balcão
-- ===================================================================

-- Os campos aceitos são os das três janelinhas de cadastro rápido
-- (CadastroRapidoModais.tsx): nome e telefone; tipo e CPF/CNPJ (a venda de
-- balcão pede, pra nota); e o veículo. Qualquer outra chave é ignorada — o
-- resto do cadastro é do módulo Clientes.
create or replace function cadastrar_veiculo_rapido(p_cliente_id uuid, p_veiculo jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (operador_tem_permissao('ordens_servico') or operador_tem_permissao('clientes'))
     or not operador_ativo_com_loja() then
    raise exception 'Cadastrar veículo pela OS é só de quem tem o módulo Ordens de Serviço.'
      using errcode = '42501';
  end if;
  -- O Consumidor é "ninguém em particular" (0064): carro nele seria de todo mundo.
  if p_cliente_id = '00000000-0000-0000-0000-00000000c000'::uuid then
    raise exception 'O cliente Consumidor não tem veículo. Cadastre o cliente de verdade.';
  end if;
  if nullif(btrim(p_veiculo ->> 'placa'), '') is null then
    raise exception 'Preencha pelo menos a placa do veículo.';
  end if;

  insert into veiculos (cliente_id, placa, marca, modelo, ano, cor, tipo, km_atual)
  values (
    p_cliente_id,
    p_veiculo ->> 'placa',
    p_veiculo ->> 'marca',
    p_veiculo ->> 'modelo',
    (p_veiculo ->> 'ano')::int,
    p_veiculo ->> 'cor',
    p_veiculo ->> 'tipo',
    (p_veiculo ->> 'km_atual')::int
  )
  returning id into v_id;

  return v_id;
end;
$$;

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

  insert into clientes (nome, telefone, tipo_pessoa, cpf_cnpj)
  values (
    p_cliente ->> 'nome',
    p_cliente ->> 'telefone',
    coalesce(p_cliente ->> 'tipo_pessoa', 'fisica'),
    p_cliente ->> 'cpf_cnpj'
  )
  returning id into v_cliente_id;

  if p_veiculo is not null and jsonb_typeof(p_veiculo) = 'object' then
    v_veiculo_id := cadastrar_veiculo_rapido(v_cliente_id, p_veiculo);
  end if;

  return jsonb_build_object('cliente_id', v_cliente_id, 'veiculo_id', v_veiculo_id);
end;
$$;

comment on function cadastrar_cliente_rapido(jsonb, jsonb) is
  'TR-04.1 lote 4 (0068). O cadastro rápido de dentro da OS, do Orçamento e da '
  'venda de balcão, pra quem tem OS sem ter Clientes. Grava só nome, telefone, '
  'tipo e CPF/CNPJ (e o veículo, se vier); devolve só os ids, nunca o cadastro.';

comment on function cadastrar_veiculo_rapido(uuid, jsonb) is
  'TR-04.1 lote 4 (0068). Acrescenta UM veículo a um cliente, pelo cadastro '
  'rápido da OS. Devolve só o id.';

-- ===================================================================
-- 3. Os dados do cliente e do veículo de UMA OS (nota fiscal e garantia)
-- ===================================================================

-- Pede a OS com os direitos de quem chama? Não: a função é security definer,
-- então a checagem de loja é feita aqui, à mão, com a mesma função da RLS.
-- Fica de fora do cliente só o que nem a nota nem a garantia usam
-- (aniversário e data do cadastro).
create or replace function cliente_e_veiculo_da_ordem(p_ordem_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_ordem ordens_servico%rowtype;
begin
  if not (operador_tem_permissao('ordens_servico') or operador_tem_permissao('clientes')) then
    raise exception 'Os dados do cliente da OS são só de quem tem o módulo Ordens de Serviço.'
      using errcode = '42501';
  end if;

  select * into v_ordem from ordens_servico where id = p_ordem_id;
  if not found or not operador_tem_acesso_loja(v_ordem.loja_id) then
    raise exception 'Esta OS não existe ou é de uma loja que você não acessa.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'cliente', (
      select to_jsonb(c) - 'data_nascimento' - 'criado_em'
        from clientes c where c.id = v_ordem.cliente_id
    ),
    'veiculo', (
      select to_jsonb(v)
        from veiculos v where v.id = v_ordem.veiculo_id
    )
  );
end;
$$;

comment on function cliente_e_veiculo_da_ordem(uuid) is
  'TR-04.1 lote 4 (0068). O cadastro do cliente e do veículo de UMA OS, pra '
  'emitir a nota (CPF/CNPJ e endereço) e imprimir a garantia. Exige o módulo '
  'OS (ou Clientes) e acesso à loja da OS. Nunca devolve lista.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria as funções.
revoke all on function cadastrar_cliente_rapido(jsonb, jsonb) from public, anon;
revoke all on function cadastrar_veiculo_rapido(uuid, jsonb) from public, anon;
revoke all on function cliente_e_veiculo_da_ordem(uuid) from public, anon;
grant execute on function cadastrar_cliente_rapido(jsonb, jsonb) to authenticated;
grant execute on function cadastrar_veiculo_rapido(uuid, jsonb) to authenticated;
grant execute on function cliente_e_veiculo_da_ordem(uuid) to authenticated;

insert into schema_versao (versao) values (68) on conflict do nothing;
