-- Sakura System — AutoCenter Edition
-- Migration 0037: três mudanças pedidas pela usuária depois de usar o
-- sistema na prática:
--
-- 1) Ordens de Serviço ganham um número sequencial por loja (1, 2, 3...),
--    em vez de só o UUID (que aparecia como "OS #a0270a6e" — grande e sem
--    sentido pra ela). Numerado por loja via trigger (cada loja começa do 1).
--
-- 2) Simplifica o status da OS: remove "aberta" como estado distinto de
--    "em_andamento" — toda OS nova já nasce "em_andamento" diretamente. As
--    OS que ainda estavam com status "aberta" viram "em_andamento" no
--    backfill. Status possíveis agora: em_andamento, concluida, faturada.
--
-- 3) Permite faturar uma OS em mais de uma forma de pagamento (ex: metade
--    Pix, metade cartão) — remove a trava de "1 lançamento de Caixa por OS"
--    (`caixa_movimentos_ordem_id_idx_unique`), já que agora pode haver um
--    lançamento por forma de pagamento usada.
--
-- 4) Bug real encontrado testando a exclusão de loja pelo app: a migration
--    0031 nunca criou uma policy de RLS pra DELETE em `lojas` (só
--    select/insert/update) — sem policy nenhuma cobrindo o comando, o
--    Postgres simplesmente não deixa nenhuma linha visível pra excluir, e o
--    delete "funciona" sem erro nenhum, mas apaga 0 linhas (nem a loja some,
--    nem aparece mensagem de erro — silencioso, o pior tipo de bug). Cria a
--    policy que faltava, mesma regra de quem pode editar (admin da loja).
--
-- Idempotente: seguro rodar de novo.

-- 1) Número sequencial por loja -----------------------------------------
alter table ordens_servico add column if not exists numero integer;

-- Guarda (docs/licoes.md, item 36): a 0065 (orçamento) muda tudo isto
-- depois — orçamento fica com `numero` vazio, ganha dois status e um gatilho
-- novo. Reaplicando a instalação inteira num banco que já tem orçamento,
-- este trecho numeraria o orçamento, trocaria o gatilho pelo antigo e
-- refaria a trava de status com 3 status, e quebraria. Então ele só roda
-- antes da 0065 existir (sem a coluna `numero_orcamento`).
do $guarda$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ordens_servico'
      and column_name = 'numero_orcamento'
  ) then
    create or replace function definir_numero_ordem_servico()
    returns trigger
    language plpgsql
    as $$
    begin
      if new.numero is null then
        select coalesce(max(numero), 0) + 1 into new.numero
        from ordens_servico
        where loja_id = new.loja_id;
      end if;
      return new;
    end;
    $$;

    drop trigger if exists trigger_definir_numero_ordem_servico on ordens_servico;
    create trigger trigger_definir_numero_ordem_servico
      before insert on ordens_servico
      for each row
      execute function definir_numero_ordem_servico();

    -- Backfill: numera as OS que já existem, por loja, na ordem em que foram
    -- abertas (só toca quem ainda está com numero nulo — seguro rodar de novo).
    with numeradas as (
      select id, row_number() over (partition by loja_id order by data_abertura) as rn
      from ordens_servico
      where numero is null
    )
    update ordens_servico o
    set numero = numeradas.rn
    from numeradas
    where o.id = numeradas.id;

    alter table ordens_servico alter column numero set not null;
  end if;
end $guarda$;

create unique index if not exists ordens_servico_loja_numero_unique
  on ordens_servico (loja_id, numero);

-- 2) Simplifica o status --------------------------------------------------
update ordens_servico set status = 'em_andamento' where status = 'aberta';

-- Mesma guarda: depois da 0065 a trava tem 5 status, não 3.
do $guarda$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ordens_servico'
      and column_name = 'numero_orcamento'
  ) then
    alter table ordens_servico drop constraint if exists ordens_servico_status_check;
    alter table ordens_servico add constraint ordens_servico_status_check
      check (status in ('em_andamento', 'concluida', 'faturada'));
  end if;
end $guarda$;

alter table ordens_servico alter column status set default 'em_andamento';

-- 3) Permite mais de um lançamento de Caixa por OS (split de pagamento) --
alter table caixa_movimentos drop constraint if exists caixa_movimentos_ordem_id_idx_unique;

-- 4) Policy de DELETE que faltava em `lojas` --------------------------------
drop policy if exists "lojas_exclusao_admins" on lojas;
create policy "lojas_exclusao_admins" on lojas
  for delete
  using (operador_e_admin_da_loja(id));
