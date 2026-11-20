-- Sakura System — AutoCenter Edition
-- Migration 0087: trocar peça ou serviço de uma OS JÁ FATURADA, com o total
-- igual (tarefa #1145, a "opção A" que a Sofia pediu em 20/11/2026: "As
-- mudanças mesmo que eu tô tendo que editar é peça e serviço mesmo. O valor é
-- uma consequência").
--
-- O PROBLEMA. Depois de faturada, a OS não aceita mais acrescentar nem
-- corrigir item (decisão 5 da 0071): o pagamento já entrou no Caixa (ou virou
-- conta a receber) pelo total daquele momento. Mas na loja acontece de a peça
-- lançada estar errada (marca, medida) ou de um serviço ter sido lançado no
-- lugar de outro, com a OS já faturada e paga. Hoje a saída é abrir uma OS
-- nova, e o estoque fica errado.
--
-- O QUE ESTA MIGRATION CRIA:
--   • a tabela `ordens_servico_trocas`: o histórico de cada troca (quem,
--     quando, por quê, os itens antes e depois e o total);
--   • a função `trocar_itens_os_faturada(...)`, uma transação só, que recebe
--     a LISTA FINAL de itens da OS e:
--       1. trava a linha da OS (`for update`, decisão 1 da 0071);
--       2. só aceita OS faturada (as outras seguem pelo caminho comum);
--       3. só para quem é ADMINISTRADOR DA LOJA da OS (o "gerente": é o mesmo
--          papel que desfaz o fechamento de caixa, 0058);
--       4. recusa se a OS tem nota fiscal (NFC-e ou NFS-e) não cancelada;
--       5. recusa se o caixa do dia da fatura já foi fechado;
--       6. exige o motivo;
--       7. troca os itens (apaga os que saíram, corrige os que ficaram,
--          grava os novos) e confere que o TOTAL é o mesmo do banco antes, no
--          centavo (a mesma conta e a mesma folga de meio centavo da 0086).
--          Mudou → recusa com o código SKTOT e nada é gravado;
--       8. acerta o estoque pela diferença de cada peça: a que saiu volta
--          ("entrada"/"ajuste"), a que entrou baixa ("saida"/"uso_em_os");
--       9. se alguma peça que baixou fica com saldo negativo na loja e quem
--          chamou não disse que sabe disso, recusa com o código SKNEG,
--          listando as peças (a tela avisa antes; isto é a rede de segurança);
--      10. grava o histórico.
--
-- O QUE NÃO MUDA, de propósito: Caixa, contas a receber e a forma de
-- pagamento da OS. O total é o mesmo, então o que foi recebido continua
-- certo. Comissão, custo e os relatórios (Relações, DRE) são recalculados a
-- partir dos itens, então passam a usar a peça nova sozinhos; comissão já
-- paga que mudar aparece como divergência na tela de Comissões (0059).
--
-- POR QUE O DIA DA FATURA VEM DA TELA. O banco não sabe o fuso da loja (a
-- mesma razão do `p_momento` da 0058): o "dia" do fechamento de caixa é o dia
-- no relógio da loja. A tela manda o dia (diaLocal da data de fechamento) e o
-- banco só aceita um dia a até 1 dia da data de fechamento em UTC, pra não
-- dar pra fugir da trava mandando uma data qualquer. Mesmo assim, quem chama
-- é admin da loja, que pode desfazer o fechamento de qualquer jeito.
--
-- A TRAVA DE ANTES CONTINUA. `adicionar_itens_ordem` e `editar_item_ordem`
-- seguem recusando OS faturada: esta função é o ÚNICO caminho, e com as
-- condições acima.
--
-- RODA COMO QUEM CHAMA (`security invoker`, decisão 3 da 0071): a RLS de
-- cada tabela vale como se a pessoa tivesse feito cada passo.
--
-- ORDEM AO SUBIR: migration ANTES da versão do programa que tem o botão. Só
-- acrescenta (tabela e função); a versão anterior continua igual. NÃO tem a
-- linha de versão mínima do programa.
--
-- Idempotente: seguro rodar de novo.

-- ---------------------------------------------------------------------------
-- 1. O histórico
-- ---------------------------------------------------------------------------

create table if not exists ordens_servico_trocas (
  id               uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references ordens_servico (id) on delete cascade,
  loja_id          uuid not null references lojas (id),
  operador_id      uuid references operadores (id) on delete set null default auth.uid(),
  -- Gravado junto (como na auditoria, 0053): o histórico continua dizendo
  -- quem foi mesmo se o login mudar de nome ou sair.
  operador_nome    text,
  motivo           text not null,
  -- [{id, tipo, peca_id, servico_id, tecnico_id, descricao, quantidade, preco_unitario, desconto}]
  itens_antes      jsonb not null default '[]'::jsonb,
  itens_depois     jsonb not null default '[]'::jsonb,
  total            numeric(12,2) not null,
  criado_em        timestamptz not null default now(),
  constraint ck_ordens_servico_trocas_motivo check (length(trim(motivo)) >= 3)
);

comment on table ordens_servico_trocas is
  '#1145. Histórico das trocas de peça/serviço em OS já faturada (total igual): '
  'quem, quando, o motivo e os itens antes e depois. Gravado só por '
  'trocar_itens_os_faturada(); ninguém altera nem apaga.';

create index if not exists ordens_servico_trocas_ordem_idx
  on ordens_servico_trocas (ordem_servico_id, criado_em desc);

alter table ordens_servico_trocas enable row level security;

drop policy if exists "ordens_servico_trocas_leitura" on ordens_servico_trocas;
drop policy if exists "ordens_servico_trocas_insercao" on ordens_servico_trocas;

-- Lê quem lê a OS: da loja, com o módulo OS ou Relações.
create policy "ordens_servico_trocas_leitura" on ordens_servico_trocas
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and ((select operador_tem_permissao('ordens_servico'))
         or (select operador_tem_permissao('relatorios')))
  );

-- Grava só o admin da loja, e só numa OS dessa mesma loja.
create policy "ordens_servico_trocas_insercao" on ordens_servico_trocas
  for insert to authenticated
  with check (
    operador_e_admin_da_loja(loja_id)
    and exists (
      select 1 from ordens_servico o
       where o.id = ordem_servico_id and o.loja_id = ordens_servico_trocas.loja_id
    )
  );

-- Sem policy de update nem de delete, de propósito (lacunas-de-proposito.csv):
-- o histórico não se altera.

-- ---------------------------------------------------------------------------
-- 2. A troca
-- ---------------------------------------------------------------------------
-- p_itens: a LISTA FINAL de itens da OS. Item com "id" é um que já existe e
-- fica (com os campos que vierem); item sem "id" é novo; item da OS que não
-- está na lista sai.
-- p_dia_da_fatura: o dia da fatura no relógio da loja (ver o cabeçalho).
-- p_aceita_estoque_negativo: a pessoa viu o aviso de estoque e confirmou.
-- Devolve o id do registro do histórico.

drop function if exists trocar_itens_os_faturada(uuid, jsonb, text, date, boolean, uuid);
drop function if exists dinheiro_br(numeric);

-- "R$ 1.234,50", sem depender do idioma do servidor (só pra mensagem de erro).
create or replace function dinheiro_br(p_valor numeric)
returns text
language sql
immutable
security invoker
set search_path = public
as $$
  select 'R$ ' || translate(to_char(round(p_valor, 2), 'FM999,999,990.00'), ',.', '.,');
$$;

create or replace function trocar_itens_os_faturada(
  p_ordem uuid,
  p_itens jsonb,
  p_motivo text,
  p_dia_da_fatura date,
  p_aceita_estoque_negativo boolean,
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
  v_antes jsonb;
  v_depois jsonb;
  v_total_antes numeric;
  v_total_depois numeric;
  v_ids_lista uuid[];
  v_item jsonb;
  v_original ordens_servico_itens%rowtype;
  v_novo ordens_servico_itens%rowtype;
  v_deposito uuid;
  v_referencia text;
  v_dif record;
  v_negativas text;
  v_troca uuid;
begin
  -- 1. A trava (decisão 1 da 0071).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found then
    raise exception 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.';
  end if;

  -- 2. Só OS faturada: as outras corrigem item pelo caminho comum.
  if v_ordem.status <> 'faturada' then
    raise exception 'Esta OS ainda não foi faturada: corrija os itens direto na OS.';
  end if;

  -- 3. Só o gerente (admin da loja da OS).
  if not operador_e_admin_da_loja(v_ordem.loja_id) then
    raise exception 'Só quem é gerente (administrador da loja) pode trocar peça ou serviço de uma OS já faturada.';
  end if;

  -- 4. Nota fiscal emitida (não cancelada) bloqueia, sem discussão: a nota
  -- mostraria outra peça.
  if exists (
    select 1 from notas_fiscais_arquivos
     where ordem_servico_id = v_ordem.id
       and coalesce(status, '') <> 'cancelado'
  ) then
    raise exception 'Esta OS já tem nota fiscal emitida: não dá pra trocar peça ou serviço, porque a nota ficaria diferente da OS.';
  end if;

  -- 5. Caixa do dia da fatura já fechado bloqueia.
  if p_dia_da_fatura is null
     or v_ordem.data_fechamento is null
     or abs(p_dia_da_fatura - (v_ordem.data_fechamento at time zone 'UTC')::date) > 1 then
    raise exception 'Não deu pra saber o dia da fatura desta OS. Atualize a OS e tente de novo.';
  end if;
  if exists (
    select 1 from fechamentos_caixa
     where loja_id = v_ordem.loja_id and data = p_dia_da_fatura
  ) then
    raise exception 'O caixa do dia % já foi fechado. Desfaça o fechamento desse dia no Caixa antes de trocar os itens.',
      to_char(p_dia_da_fatura, 'DD/MM/YYYY');
  end if;

  -- 6. O motivo.
  if length(v_motivo) < 3 then
    raise exception 'Diga o motivo da troca (por exemplo: "medida do pneu estava errada").';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A OS precisa continuar com pelo menos um item.';
  end if;

  -- 7. Os itens como estão AGORA no banco (presos até o fim).
  perform 1 from ordens_servico_itens where ordem_servico_id = v_ordem.id for update;

  select coalesce(sum(quantidade * preco_unitario - desconto), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'tipo', tipo, 'peca_id', peca_id, 'servico_id', servico_id, 'tecnico_id', tecnico_id,
           'descricao', descricao, 'quantidade', quantidade,
           'preco_unitario', preco_unitario, 'desconto', desconto) order by id), '[]'::jsonb)
    into v_total_antes, v_antes
    from ordens_servico_itens
   where ordem_servico_id = v_ordem.id;

  -- Os ids da lista precisam ser desta OS, e cada um uma vez só.
  select coalesce(array_agg((e ->> 'id')::uuid), '{}')
    into v_ids_lista
    from jsonb_array_elements(p_itens) e
   where nullif(e ->> 'id', '') is not null;
  if (select count(distinct x) from unnest(v_ids_lista) x) <> coalesce(array_length(v_ids_lista, 1), 0) then
    raise exception 'A lista de itens veio com um item repetido. Atualize a OS e tente de novo.';
  end if;
  if exists (
    select 1 from unnest(v_ids_lista) x
     where not exists (select 1 from ordens_servico_itens i where i.id = x and i.ordem_servico_id = v_ordem.id)
  ) then
    raise exception 'Um dos itens não é mais desta OS (talvez tenha mudado em outro computador). Atualize a OS e tente de novo.';
  end if;

  -- Sai o que não está na lista.
  delete from ordens_servico_itens
   where ordem_servico_id = v_ordem.id
     and not (id = any (v_ids_lista));

  -- Corrige os que ficam e grava os novos.
  for v_item in select e from jsonb_array_elements(p_itens) e loop
    if nullif(v_item ->> 'id', '') is not null then
      select * into v_original from ordens_servico_itens where id = (v_item ->> 'id')::uuid;
      v_novo := jsonb_populate_record(v_original, v_item - 'id' - 'ordem_servico_id');
      update ordens_servico_itens
         set tipo           = v_novo.tipo,
             peca_id        = v_novo.peca_id,
             servico_id     = v_novo.servico_id,
             tecnico_id     = v_novo.tecnico_id,
             descricao      = v_novo.descricao,
             quantidade     = v_novo.quantidade,
             preco_unitario = v_novo.preco_unitario,
             desconto       = v_novo.desconto,
             custo_unitario = v_novo.custo_unitario
       where id = v_original.id;
    else
      v_novo := jsonb_populate_record(null::ordens_servico_itens, v_item - 'id');
      insert into ordens_servico_itens
        (ordem_servico_id, tipo, peca_id, servico_id, tecnico_id, descricao,
         quantidade, preco_unitario, desconto, custo_unitario)
      values
        (v_ordem.id, v_novo.tipo, v_novo.peca_id, v_novo.servico_id, v_novo.tecnico_id, v_novo.descricao,
         v_novo.quantidade, coalesce(v_novo.preco_unitario, 0), coalesce(v_novo.desconto, 0), v_novo.custo_unitario);
    end if;
  end loop;

  select coalesce(sum(quantidade * preco_unitario - desconto), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'tipo', tipo, 'peca_id', peca_id, 'servico_id', servico_id, 'tecnico_id', tecnico_id,
           'descricao', descricao, 'quantidade', quantidade,
           'preco_unitario', preco_unitario, 'desconto', desconto) order by id), '[]'::jsonb)
    into v_total_depois, v_depois
    from ordens_servico_itens
   where ordem_servico_id = v_ordem.id;

  -- O total precisa ser o mesmo (a mesma folga de meio centavo da 0086).
  if abs(v_total_depois - v_total_antes) > 0.005 then
    raise exception 'O total mudaria de % para %. Por enquanto, numa OS faturada só dá pra trocar peça ou serviço mantendo o mesmo total; mudar o valor vem numa próxima etapa.',
      dinheiro_br(v_total_antes), dinheiro_br(v_total_depois)
      using errcode = 'SKTOT';
  end if;

  -- Peça sem cadastro (avulsa, 0066) só se já estava na OS assim: a peça
  -- nova ou trocada tem que ser do cadastro, que é a que mexe no estoque.
  if exists (
    select 1 from jsonb_array_elements(v_depois) d
     where d ->> 'tipo' = 'peca' and nullif(d ->> 'peca_id', '') is null
       and not exists (
         select 1 from jsonb_array_elements(v_antes) a
          where a ->> 'id' = d ->> 'id' and a ->> 'tipo' = 'peca' and nullif(a ->> 'peca_id', '') is null
       )
  ) then
    raise exception 'Escolha a peça do cadastro em cada linha de peça.';
  end if;

  -- 8. O estoque, pela diferença de cada peça do cadastro (a mesma conta do
  -- editar_item_ordem da 0071, agora com a OS inteira).
  v_referencia := nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo)
                  || ' (troca depois de faturada)';
  for v_dif in
    select d.peca_id, sum(d.quantidade) as diferenca
      from (
        select (e ->> 'peca_id')::uuid as peca_id, (e ->> 'quantidade')::numeric as quantidade
          from jsonb_array_elements(v_depois) e
         where e ->> 'tipo' = 'peca' and nullif(e ->> 'peca_id', '') is not null
        union all
        select (e ->> 'peca_id')::uuid, -(e ->> 'quantidade')::numeric
          from jsonb_array_elements(v_antes) e
         where e ->> 'tipo' = 'peca' and nullif(e ->> 'peca_id', '') is not null
      ) d
     group by d.peca_id
    having sum(d.quantidade) <> 0
     order by d.peca_id
  loop
    if v_deposito is null then
      v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
    end if;
    insert into estoque_movimentos
      (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    values (
      v_dif.peca_id,
      v_deposito,
      case when v_dif.diferenca > 0 then 'saida' else 'entrada' end,
      abs(v_dif.diferenca),
      case when v_dif.diferenca > 0 then 'uso_em_os' else 'ajuste' end,
      v_referencia,
      v_ordem.loja_id
    );

    -- 9. Peça que baixou e ficou negativa, sem a pessoa ter confirmado.
    if v_dif.diferenca > 0 and not coalesce(p_aceita_estoque_negativo, false) then
      if (select coalesce(sum(case tipo when 'entrada' then quantidade else -quantidade end), 0)
            from estoque_movimentos
           where peca_id = v_dif.peca_id and loja_id = v_ordem.loja_id) < 0 then
        v_negativas := concat_ws(', ', v_negativas,
          (select descricao from pecas where id = v_dif.peca_id));
      end if;
    end if;
  end loop;

  if v_negativas is not null then
    raise exception 'O estoque ficaria negativo: %. Confira e confirme de novo se quiser seguir assim.', v_negativas
      using errcode = 'SKNEG';
  end if;

  -- 10. O histórico, e quem mexeu por último.
  insert into ordens_servico_trocas
    (ordem_servico_id, loja_id, operador_id, operador_nome, motivo, itens_antes, itens_depois, total)
  values (
    v_ordem.id, v_ordem.loja_id, auth.uid(),
    (select nome from operadores where id = auth.uid()),
    v_motivo, v_antes, v_depois, round(v_total_depois, 2)
  )
  returning id into v_troca;

  update ordens_servico set atualizado_por_id = p_operador where id = v_ordem.id;

  return v_troca;
end;
$$;

comment on function trocar_itens_os_faturada(uuid, jsonb, text, date, boolean, uuid) is
  '#1145. Troca peça/serviço de uma OS FATURADA, com a OS travada, mantendo o total '
  '(senão SKTOT e nada grava). Só admin da loja; recusa com nota fiscal não cancelada, '
  'com o caixa do dia da fatura fechado e sem motivo. Acerta o estoque pela diferença de '
  'cada peça (saída negativa sem confirmação: SKNEG) e grava o histórico em '
  'ordens_servico_trocas. Caixa e contas a receber não mudam. Pela RLS de quem chama.';

revoke all on function trocar_itens_os_faturada(uuid, jsonb, text, date, boolean, uuid) from public, anon;
grant execute on function trocar_itens_os_faturada(uuid, jsonb, text, date, boolean, uuid) to authenticated;

insert into schema_versao (versao) values (87) on conflict do nothing;
