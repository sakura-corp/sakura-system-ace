-- Sakura System — AutoCenter Edition
-- Migration 0093: reabrir um orçamento recusado, com motivo e histórico
-- (tarefa #1181; decisões da Sofia em 24/11/2026).
--
-- O PROBLEMA. Desde a 0065, "recusado" é o fim da linha: o gatilho
-- `definir_numero_ordem_servico` recusa qualquer saída de recusado. Na loja,
-- o cliente recusa e volta no dia seguinte aceitando; hoje a saída é fazer
-- outro orçamento, com outro número.
--
-- O QUE ESTA MIGRATION FAZ:
--   1. `ordens_servico_trocas` (0087) vira o HISTÓRICO ÚNICO da OS: ganha a
--      coluna `tipo` ('troca' pro que já existe, 'reabertura', e já
--      'correcao_valor' pra a #1182 não mexer na tabela de novo);
--   2. a policy de inserção do histórico passa a aceitar, além do admin da
--      loja (igual antes), a linha de REABERTURA gravada por quem pode
--      recusar (módulo OS na loja), só por ela mesma e só numa OS que já
--      voltou a ser orçamento;
--   3. a função `reabrir_orcamento(p_ordem, p_motivo, p_validade, p_operador)`,
--      no padrão da 0087 (uma transação, OS travada, pela RLS de quem chama):
--      só da loja de quem chama, só se o status for 'recusado'; volta pra
--      'orcamento' com o MESMO número de orçamento, limpa `motivo_recusa` e
--      `recusado_em`, grava a validade nova e a linha do histórico;
--   4. o gatilho `definir_numero_ordem_servico` (última versão na 0065)
--      aceita recusado → orçamento SÓ vindo dessa função. Um update direto
--      continua recusado pela trava de sempre.
--
-- COMO O GATILHO SABE QUE VEIO DA FUNÇÃO. A função liga, só dentro da
-- transação dela (`set_config(..., true)`), a marca
-- `sakura.reabrir_orcamento` com o id da OS, faz o update e desliga. Pelo
-- PostgREST cada chamada é uma transação própria e não dá pra ligar a marca
-- antes de um update direto; mesmo que desse, ela vale só pra aquela OS.
--
-- NÃO MUDA, de propósito: o jeito de recusar; a aprovação (o "Já aprovar
-- agora" da tela chama a `aprovar_orcamento` de sempre, depois); uma OS já
-- aprovada nunca volta a orçamento (a numeração das OS não pode ter buraco:
-- `ck_ordens_servico_numero_orcamento` e o gatilho seguem proibindo).
-- Reaberto, o orçamento continua fora de todo número (comissão, lucro,
-- caixa): é só orçamento aberto de novo.
--
-- ORDEM AO SUBIR: migration ANTES da versão do programa que tem o botão. Só
-- acrescenta (coluna com padrão, função e uma saída a mais no gatilho); a
-- versão anterior continua igual. NÃO tem a linha de versão mínima do
-- programa.
--
-- Idempotente: seguro rodar de novo.

-- ---------------------------------------------------------------------------
-- 1. O tipo de cada linha do histórico
-- ---------------------------------------------------------------------------

alter table ordens_servico_trocas
  add column if not exists tipo text not null default 'troca';

alter table ordens_servico_trocas drop constraint if exists ck_ordens_servico_trocas_tipo;
alter table ordens_servico_trocas add constraint ck_ordens_servico_trocas_tipo
  check (tipo in ('troca', 'reabertura', 'correcao_valor'));

comment on column ordens_servico_trocas.tipo is
  '#1181. O que aconteceu: troca (peça/serviço em OS faturada, 0087), reabertura '
  '(orçamento recusado reaberto, 0093) ou correcao_valor (#1182).';

comment on table ordens_servico_trocas is
  'O histórico da OS (#1145, #1181): trocas de peça/serviço em OS faturada, reaberturas de '
  'orçamento recusado e correções de valor. Quem, quando, o motivo e os itens antes e depois. '
  'Gravado só pelas funções do banco; ninguém altera nem apaga.';

-- ---------------------------------------------------------------------------
-- 2. Quem grava no histórico
-- ---------------------------------------------------------------------------

drop policy if exists "ordens_servico_trocas_insercao" on ordens_servico_trocas;

-- O admin da loja, como antes (a troca da 0087). E a linha de REABERTURA, por
-- quem pode recusar (módulo OS na loja): só em nome de si mesmo e só numa OS
-- desta loja que já voltou a ser orçamento (a função reabre e grava na mesma
-- transação, então o insert vê a OS já reaberta).
create policy "ordens_servico_trocas_insercao" on ordens_servico_trocas
  for insert to authenticated
  with check (
    exists (
      select 1 from ordens_servico o
       where o.id = ordem_servico_id and o.loja_id = ordens_servico_trocas.loja_id
    )
    and (
      operador_e_admin_da_loja(loja_id)
      or (
        tipo = 'reabertura'
        and operador_id = auth.uid()
        and operador_tem_acesso_loja(loja_id)
        and (select operador_tem_permissao('ordens_servico'))
        and exists (
          select 1 from ordens_servico o
           where o.id = ordem_servico_id and o.status = 'orcamento'
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. O gatilho dos números (substitui o da 0065; só a saída de recusado mudou)
-- ---------------------------------------------------------------------------

create or replace function definir_numero_ordem_servico()
returns trigger
language plpgsql
as $$
declare
  eh_orcamento boolean := new.status in ('orcamento', 'recusado');
begin
  if tg_op = 'INSERT' then
    if eh_orcamento then
      if new.numero_orcamento is null then
        perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
        select coalesce(max(numero_orcamento), 0) + 1 into new.numero_orcamento
        from ordens_servico
        where loja_id = new.loja_id;
      end if;
    elsif new.numero is null then
      perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
      select coalesce(max(numero), 0) + 1 into new.numero
      from ordens_servico
      where loja_id = new.loja_id;
    end if;
  elsif (old.status = 'orcamento' and new.status not in ('orcamento', 'em_andamento', 'recusado'))
     or (old.status = 'recusado' and new.status <> 'recusado'
         -- #1181: recusado → orçamento só pela reabrir_orcamento(), que liga
         -- esta marca com o id DESTA OS, só dentro da transação dela.
         and not (new.status = 'orcamento'
                  and coalesce(current_setting('sakura.reabrir_orcamento', true), '') = old.id::text)) then
    raise exception using
      errcode    = 'check_violation',
      message    = 'new row for relation "ordens_servico" violates check constraint "ck_ordens_servico_transicao_orcamento"',
      detail     = format('Orçamento só vira OS (em_andamento) ou recusado; recusado só volta a orçamento pelo "Reabrir". Pedido: de %s pra %s.',
                          old.status, new.status),
      table      = 'ordens_servico',
      constraint = 'ck_ordens_servico_transicao_orcamento';
  elsif old.status = 'orcamento' and new.status = 'em_andamento' then
    -- Aprovado: a OS começa hoje (ver a 0065). A data do orçamento fica em
    -- orcado_em.
    new.orcado_em := old.data_abertura;
    new.data_abertura := now();
    if new.numero is null then
      perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
      select coalesce(max(numero), 0) + 1 into new.numero
      from ordens_servico
      where loja_id = new.loja_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_definir_numero_ordem_servico on ordens_servico;
create trigger trigger_definir_numero_ordem_servico
  before insert or update of status on ordens_servico
  for each row
  execute function definir_numero_ordem_servico();

-- ---------------------------------------------------------------------------
-- 4. Reabrir
-- ---------------------------------------------------------------------------
-- p_motivo: o texto do histórico, já com a recusa antiga (a tela monta, porque
--   o dia da recusa é no relógio da loja; ver textoDaReabertura).
-- p_validade: a validade nova (a tela sugere hoje + 7).
-- Devolve o id da linha do histórico.

drop function if exists reabrir_orcamento(uuid, text, date, uuid);

create or replace function reabrir_orcamento(
  p_ordem uuid,
  p_motivo text,
  p_validade date,
  p_operador uuid
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem ordens_servico%rowtype;
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_itens jsonb;
  v_total numeric;
  v_linha uuid;
begin
  -- A trava (decisão 1 da 0071). Pela RLS, OS de outra loja nem aparece.
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found then
    raise exception 'Este orçamento não foi encontrado (talvez tenha sido apagado em outro computador). Atualize a lista.';
  end if;

  -- Quem pode recusar pode reabrir: o módulo OS, nesta loja.
  if not (operador_tem_acesso_loja(v_ordem.loja_id) and operador_tem_permissao('ordens_servico')) then
    raise exception 'Você não tem acesso às ordens de serviço desta loja.';
  end if;

  if v_ordem.status <> 'recusado' then
    raise exception 'Este orçamento não está recusado (talvez já tenha sido reaberto em outro computador). Atualize a lista.';
  end if;

  if length(v_motivo) < 3 then
    raise exception 'Diga o motivo da reabertura (por exemplo: "cliente voltou e aceitou").';
  end if;

  if p_validade is null then
    raise exception 'Escolha a nova validade do orçamento.';
  end if;

  -- Volta pra orçamento aberto, com o mesmo número. A marca deixa o gatilho
  -- aceitar a saída de recusado, só pra esta OS e só até o fim do update.
  perform set_config('sakura.reabrir_orcamento', v_ordem.id::text, true);
  update ordens_servico
     set status            = 'orcamento',
         motivo_recusa     = null,
         recusado_em       = null,
         validade          = p_validade,
         atualizado_por_id = p_operador
   where id = v_ordem.id;
  if not found then
    perform set_config('sakura.reabrir_orcamento', '', true);
    raise exception 'Você não tem permissão pra mudar este orçamento.';
  end if;
  perform set_config('sakura.reabrir_orcamento', '', true);

  -- O histórico: quem, quando, por quê, e os itens como estão (nada mudou).
  select coalesce(sum(quantidade * preco_unitario - desconto), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'tipo', tipo, 'peca_id', peca_id, 'servico_id', servico_id, 'tecnico_id', tecnico_id,
           'descricao', descricao, 'quantidade', quantidade,
           'preco_unitario', preco_unitario, 'desconto', desconto) order by id), '[]'::jsonb)
    into v_total, v_itens
    from ordens_servico_itens
   where ordem_servico_id = v_ordem.id;

  insert into ordens_servico_trocas
    (ordem_servico_id, loja_id, tipo, operador_id, operador_nome, motivo, itens_antes, itens_depois, total)
  values (
    v_ordem.id, v_ordem.loja_id, 'reabertura', auth.uid(),
    (select nome from operadores where id = auth.uid()),
    v_motivo, v_itens, v_itens, round(v_total, 2)
  )
  returning id into v_linha;

  return v_linha;
end;
$$;

comment on function reabrir_orcamento(uuid, text, date, uuid) is
  '#1181. Reabre um orçamento RECUSADO: volta pra orcamento com o mesmo número, limpa a '
  'recusa, grava a validade nova e uma linha tipo reabertura no histórico '
  '(ordens_servico_trocas). Quem tem o módulo OS na loja; motivo obrigatório. Única '
  'saída de recusado (o gatilho recusa o update direto). Pela RLS de quem chama.';

revoke all on function reabrir_orcamento(uuid, text, date, uuid) from public, anon;
grant execute on function reabrir_orcamento(uuid, text, date, uuid) to authenticated;

insert into schema_versao (versao) values (93) on conflict do nothing;
