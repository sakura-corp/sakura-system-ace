-- Sakura System — AutoCenter Edition
-- Migration 0088: a taxa da maquininha de cartão (tarefa #387).
--
-- O PROBLEMA. Quando o cliente paga no cartão, a loja não recebe o valor
-- cheio: a maquininha fica com uma taxa (um pouco no débito, mais no
-- crédito, mais ainda no parcelado) e o dinheiro cai na conta dias depois
-- (no débito, no dia seguinte; no crédito, 30 dias depois de cada parcela).
-- Hoje o Caixa lança o valor cheio no dia da venda. O lucro aparece maior do
-- que é, e ninguém sabe quanto vai cair na conta em cada dia.
--
-- O QUE ESTA MIGRATION CRIA (três tabelas e uma função):
--
--   1. configuracoes_taxas_maquininha — a tabela de taxas DA LOJA, que o
--      admin preenche em Configurações: pra cada forma (débito ou crédito)
--      e número de parcelas, a taxa em %, em quantos dias cai e se a
--      maquininha paga tudo de uma vez (antecipação) ou parcela por parcela.
--      Loja que não preencheu não tem linha, e o faturamento segue como
--      antes, sem taxa.
--
--   2. caixa_taxas_cartao — uma linha por lançamento de cartão faturado: a
--      taxa e o prazo COMO ESTAVAM no dia da venda, o valor cheio, a taxa em
--      reais e o que sobra pra loja. É uma "fotografia": se a loja mudar a
--      tabela amanhã, a venda de hoje continua com a taxa de hoje. Nunca
--      muda depois de gravada; some junto com o lançamento do Caixa (on
--      delete cascade), que é o jeito de desfazer.
--
--   3. caixa_cartao_a_receber — o que vai cair na conta, uma linha por data
--      (no crédito em 3x sem antecipação, três linhas). É o que a lista
--      "Cartão a receber" mostra. Também nunca muda e some junto com a
--      fotografia (e, portanto, com o lançamento).
--
--   4. registrar_taxa_do_cartao(...) — grava a fotografia e as datas numa
--      transação só: ou entram as duas, ou nenhuma. A conta (quanto é a taxa,
--      em que dia cai cada parcela) é feita pelo programa
--      (src/schemas/taxaMaquininha.ts); a função confere o que dá pra
--      conferir e recusa o que não fecha:
--        • o lançamento existe, é uma ENTRADA, da forma de cartão informada e
--          do mesmo valor cheio (senão a taxa ficaria pendurada no lançamento
--          errado);
--        • a quantidade de datas bate (uma só se a maquininha paga tudo de
--          uma vez; uma por parcela se não), numeradas de 1 em diante;
--        • a soma das datas fecha com o valor líquido (diferença menor que
--          meio centavo).
--      O `loja_id` vem do próprio lançamento, nunca do programa.
--
-- QUEM LÊ E QUEM GRAVA (decisões da tarefa #387):
--
--   • A TABELA DE TAXAS (1): lê quem tem acesso à loja E um destes módulos:
--     Caixa, Relações ou Ordens de Serviço. A OS entra porque quem fatura
--     precisa ler a taxa pra calcular (a decisão de deixar a OS ler está pra
--     ela confirmar). Gravar, alterar e apagar: só o admin daquela loja, como
--     o Pix (0081) — a taxa muda o lucro que aparece pra loja inteira.
--
--   • A FOTOGRAFIA E AS DATAS (2 e 3): lê quem tem acesso à loja E Caixa ou
--     Relações (é dinheiro, como os lançamentos, 0062). Grava quem tem acesso
--     à loja E Caixa ou OS — quem fatura grava a taxa da venda que acabou de
--     lançar —, e só pendurada numa ENTRADA do Caixa da mesma loja. Quem só
--     tem OS grava, mas não lê: a gravação não pede a linha de volta. A
--     conferência "a entrada existe e é desta loja" é um `exists` em
--     caixa_movimentos, que roda com a RLS de quem grava: quem só tem OS
--     enxerga ali só os lançamentos de OS (0062), então só consegue pendurar
--     a taxa num lançamento de OS. É de propósito: não dá pra pendurar taxa
--     em lançamento que a pessoa nem enxerga.
--     Sem policy de alterar nem de apagar: ninguém altera nem apaga pela API.
--     Apagar o lançamento do Caixa leva as duas junto (a cascata da chave
--     estrangeira não passa pela RLS). As lacunas estão declaradas em
--     supabase/testes-rls/lacunas-de-proposito.csv.
--
-- A função roda como QUEM CHAMA (`security invoker`): a RLS das tabelas vale
-- inteira, ela não abre porta nenhuma — é só o "as duas ou nenhuma".
--
-- AUDITORIA. A tabela de taxas entra na trilha (0053), como os juros das
-- parcelas: se a taxa mudar, fica registrado quem mudou, de quanto pra
-- quanto. A fotografia e as datas NÃO entram: nascem junto com um
-- lançamento do Caixa que já é auditado, e nunca mudam.
--
-- AS TRAVAS têm nome `ck_<tabela>_<regra>` porque a tela traduz cada uma
-- numa frase (src/lib/errors.ts). Tabelas novas nascem vazias, então nenhum
-- dado que já existe pode ficar fora da regra. O dinheiro tem o mesmo tipo
-- de caixa_movimentos.valor (numeric(12,2)).
--
-- ORDEM DE SUBIR. Só cria coisa nova: esta migration sobe ANTES da versão do
-- programa, como as outras (o programa antigo nem sabe que ela existe). Por
-- isso não declara versão mínima do programa.
--
-- Idempotente: as tabelas entram com `if not exists`, cada trava, policy,
-- gatilho e a função são apagados pelo nome final antes de serem criados.

-- ---------------------------------------------------------------------------
-- 1. A tabela de taxas da loja
-- ---------------------------------------------------------------------------
create table if not exists configuracoes_taxas_maquininha (
  loja_id uuid not null references lojas (id),
  forma text not null,
  parcelas smallint not null,
  taxa_percentual numeric(5, 2) not null,
  prazo_dias smallint not null,
  recebe_tudo_de_uma_vez boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (loja_id, forma, parcelas)
);

-- Só cartão: Pix, dinheiro e boleto não têm maquininha.
alter table configuracoes_taxas_maquininha drop constraint if exists ck_taxas_maquininha_forma;
alter table configuracoes_taxas_maquininha add constraint ck_taxas_maquininha_forma
  check (forma in ('cartao_debito', 'cartao_credito'));

-- De 1 a 12 parcelas, e débito é sempre à vista (1).
alter table configuracoes_taxas_maquininha drop constraint if exists ck_taxas_maquininha_parcelas;
alter table configuracoes_taxas_maquininha add constraint ck_taxas_maquininha_parcelas
  check (parcelas between 1 and 12 and (forma <> 'cartao_debito' or parcelas = 1));

-- A taxa é um percentual de 0 até menos de 100 (100% seria a maquininha
-- ficar com a venda inteira).
alter table configuracoes_taxas_maquininha drop constraint if exists ck_taxas_maquininha_taxa;
alter table configuracoes_taxas_maquininha add constraint ck_taxas_maquininha_taxa
  check (taxa_percentual >= 0 and taxa_percentual < 100);

-- Em quantos dias cai: de 0 (no mesmo dia) até um ano.
alter table configuracoes_taxas_maquininha drop constraint if exists ck_taxas_maquininha_prazo;
alter table configuracoes_taxas_maquininha add constraint ck_taxas_maquininha_prazo
  check (prazo_dias between 0 and 365);

comment on table configuracoes_taxas_maquininha is
  'A taxa da maquininha de cartão de cada loja (#387): por forma (débito/crédito) e parcelas, a taxa em %, o prazo em dias e se recebe tudo de uma vez. Sem linha, a loja não informou a taxa. Lê quem tem Caixa, Relações ou OS; grava só o admin da loja.';

alter table configuracoes_taxas_maquininha enable row level security;

-- Uma policy por comando (nunca uma `for all`): as policies se somam com OU,
-- e uma `for all` aberta reabriria a escrita.
drop policy if exists "configuracoes_taxas_maquininha_leitura" on configuracoes_taxas_maquininha;
create policy "configuracoes_taxas_maquininha_leitura" on configuracoes_taxas_maquininha
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (select operador_tem_permissao('relatorios'))
      or (select operador_tem_permissao('ordens_servico'))
    )
  );

drop policy if exists "configuracoes_taxas_maquininha_insercao" on configuracoes_taxas_maquininha;
create policy "configuracoes_taxas_maquininha_insercao" on configuracoes_taxas_maquininha
  for insert to authenticated
  with check (operador_e_admin_da_loja(loja_id));

drop policy if exists "configuracoes_taxas_maquininha_alteracao" on configuracoes_taxas_maquininha;
create policy "configuracoes_taxas_maquininha_alteracao" on configuracoes_taxas_maquininha
  for update to authenticated
  using (operador_e_admin_da_loja(loja_id))
  with check (operador_e_admin_da_loja(loja_id));

drop policy if exists "configuracoes_taxas_maquininha_exclusao" on configuracoes_taxas_maquininha;
create policy "configuracoes_taxas_maquininha_exclusao" on configuracoes_taxas_maquininha
  for delete to authenticated
  using (operador_e_admin_da_loja(loja_id));

-- A trilha de auditoria (0053): quem mudou a taxa, de quanto pra quanto. A
-- chave é composta, então o `registro_id` é o loja_id (como os juros das
-- parcelas); a forma e as parcelas vão na linha inteira, antes e depois.
drop trigger if exists trigger_auditoria on configuracoes_taxas_maquininha;
create trigger trigger_auditoria
  after insert or update or delete on configuracoes_taxas_maquininha
  for each row execute function registrar_auditoria('loja_id');

-- ---------------------------------------------------------------------------
-- 2. A fotografia da taxa de cada lançamento de cartão
-- ---------------------------------------------------------------------------
create table if not exists caixa_taxas_cartao (
  movimento_id uuid primary key references caixa_movimentos (id) on delete cascade,
  loja_id uuid not null references lojas (id),
  forma text not null,
  parcelas smallint not null,
  taxa_percentual numeric(5, 2) not null,
  prazo_dias smallint not null,
  recebe_tudo_de_uma_vez boolean not null default false,
  valor_bruto numeric(12, 2) not null,
  valor_taxa numeric(12, 2) not null,
  valor_liquido numeric(12, 2) not null,
  criado_em timestamptz not null default now()
);

-- As mesmas regras da tabela de taxas, numa trava só (a fotografia copia uma
-- linha de lá).
alter table caixa_taxas_cartao drop constraint if exists ck_caixa_taxas_cartao_condicoes;
alter table caixa_taxas_cartao add constraint ck_caixa_taxas_cartao_condicoes
  check (
    forma in ('cartao_debito', 'cartao_credito')
    and parcelas between 1 and 12
    and (forma <> 'cartao_debito' or parcelas = 1)
    and taxa_percentual >= 0 and taxa_percentual < 100
    and prazo_dias between 0 and 365
  );

-- Nada negativo, e o líquido é exatamente o cheio menos a taxa.
alter table caixa_taxas_cartao drop constraint if exists ck_caixa_taxas_cartao_valores;
alter table caixa_taxas_cartao add constraint ck_caixa_taxas_cartao_valores
  check (
    valor_bruto >= 0
    and valor_taxa >= 0
    and valor_liquido >= 0
    and valor_liquido = valor_bruto - valor_taxa
  );

comment on table caixa_taxas_cartao is
  'A taxa da maquininha de cada lançamento de cartão do Caixa (#387), como estava no dia da venda. Nunca muda; some junto com o lançamento. Lê quem tem Caixa ou Relações; grava quem tem Caixa ou OS (pela função registrar_taxa_do_cartao).';

alter table caixa_taxas_cartao enable row level security;

drop policy if exists "caixa_taxas_cartao_leitura" on caixa_taxas_cartao;
create policy "caixa_taxas_cartao_leitura" on caixa_taxas_cartao
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (select operador_tem_permissao('relatorios'))
    )
  );

drop policy if exists "caixa_taxas_cartao_insercao" on caixa_taxas_cartao;
create policy "caixa_taxas_cartao_insercao" on caixa_taxas_cartao
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (select operador_tem_permissao('ordens_servico'))
    )
    and exists (
      select 1 from caixa_movimentos m
       where m.id = caixa_taxas_cartao.movimento_id
         and m.loja_id = caixa_taxas_cartao.loja_id
         and m.tipo = 'entrada'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. O que vai cair na conta, uma linha por data
-- ---------------------------------------------------------------------------
create table if not exists caixa_cartao_a_receber (
  id uuid primary key default gen_random_uuid(),
  movimento_id uuid not null references caixa_taxas_cartao (movimento_id) on delete cascade,
  loja_id uuid not null references lojas (id),
  numero smallint not null,
  data_prevista date not null,
  valor numeric(12, 2) not null,
  unique (movimento_id, numero)
);

-- Parcela de 1 a 12.
alter table caixa_cartao_a_receber drop constraint if exists ck_caixa_cartao_a_receber_numero;
alter table caixa_cartao_a_receber add constraint ck_caixa_cartao_a_receber_numero
  check (numero between 1 and 12);

-- Nunca negativo. Zero é aceito de propósito: uma venda de poucos centavos
-- em 12x pode ter parcela de R$ 0,00 na conta de centavos, e recusar ali
-- faria a taxa inteira da venda não ser gravada.
alter table caixa_cartao_a_receber drop constraint if exists ck_caixa_cartao_a_receber_valor;
alter table caixa_cartao_a_receber add constraint ck_caixa_cartao_a_receber_valor
  check (valor >= 0);

-- A lista "Cartão a receber" busca por loja, a partir de um dia.
create index if not exists caixa_cartao_a_receber_loja_data_idx
  on caixa_cartao_a_receber (loja_id, data_prevista);

comment on table caixa_cartao_a_receber is
  'O que a maquininha vai depositar de cada lançamento de cartão (#387), uma linha por data. Nunca muda; some junto com o lançamento. Lê quem tem Caixa ou Relações; grava quem tem Caixa ou OS (pela função registrar_taxa_do_cartao).';

alter table caixa_cartao_a_receber enable row level security;

drop policy if exists "caixa_cartao_a_receber_leitura" on caixa_cartao_a_receber;
create policy "caixa_cartao_a_receber_leitura" on caixa_cartao_a_receber
  for select to authenticated
  using (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (select operador_tem_permissao('relatorios'))
    )
  );

drop policy if exists "caixa_cartao_a_receber_insercao" on caixa_cartao_a_receber;
create policy "caixa_cartao_a_receber_insercao" on caixa_cartao_a_receber
  for insert to authenticated
  with check (
    operador_tem_acesso_loja(loja_id)
    and (
      (select operador_tem_permissao('caixa'))
      or (select operador_tem_permissao('ordens_servico'))
    )
    and exists (
      select 1 from caixa_movimentos m
       where m.id = caixa_cartao_a_receber.movimento_id
         and m.loja_id = caixa_cartao_a_receber.loja_id
         and m.tipo = 'entrada'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. A função que grava as duas de uma vez
-- ---------------------------------------------------------------------------
drop function if exists registrar_taxa_do_cartao(
  uuid, text, integer, numeric, integer, boolean, numeric, numeric, numeric, jsonb
);

create or replace function registrar_taxa_do_cartao(
  p_movimento uuid,
  p_forma text,
  p_parcelas integer,
  p_taxa_percentual numeric,
  p_prazo_dias integer,
  p_recebe_tudo_de_uma_vez boolean,
  p_valor_bruto numeric,
  p_valor_taxa numeric,
  p_valor_liquido numeric,
  -- [{"numero":1,"data_prevista":"2026-12-18","valor":97.00}, ...]
  p_recebimentos jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_mov caixa_movimentos%rowtype;
  v_quantas_esperadas integer;
  v_quantas integer;
  v_numeros integer[];
  v_soma numeric;
begin
  -- O lançamento, com a RLS de quem chama: quem não enxerga recebe "não
  -- encontrado" e nada é gravado.
  select * into v_mov from caixa_movimentos where id = p_movimento;
  if not found then
    raise exception 'O lançamento do Caixa desta venda não foi encontrado, então a taxa do cartão não foi registrada.';
  end if;
  if v_mov.tipo <> 'entrada' then
    raise exception 'A taxa do cartão só vale pra uma entrada do Caixa.';
  end if;
  if v_mov.forma_pagamento is distinct from p_forma then
    raise exception 'A forma de pagamento da taxa (%) não é a do lançamento do Caixa (%).',
      p_forma, coalesce(v_mov.forma_pagamento, 'nenhuma');
  end if;
  if p_valor_bruto is null or abs(v_mov.valor - p_valor_bruto) >= 0.005 then
    raise exception 'O valor da taxa do cartão (%) não é o do lançamento do Caixa (%).',
      p_valor_bruto, v_mov.valor;
  end if;

  -- As datas: uma só se a maquininha paga tudo de uma vez; uma por parcela
  -- se não. Numeradas de 1 em diante, sem buraco nem repetição.
  if p_recebimentos is null or jsonb_typeof(p_recebimentos) <> 'array' then
    raise exception 'Faltaram as datas em que o cartão vai cair.';
  end if;
  v_quantas_esperadas := case when coalesce(p_recebe_tudo_de_uma_vez, false) then 1 else p_parcelas end;
  select count(*), array_agg(r.numero order by r.numero), sum(round(r.valor, 2))
    into v_quantas, v_numeros, v_soma
    from jsonb_to_recordset(p_recebimentos) as r(numero integer, data_prevista date, valor numeric);
  if v_quantas is distinct from v_quantas_esperadas
     or v_numeros is distinct from array(select generate_series(1, v_quantas)) then
    raise exception 'As datas do cartão não batem com as parcelas: esperava %, vieram %.',
      v_quantas_esperadas, v_quantas;
  end if;

  -- A soma das datas fecha com o líquido.
  if p_valor_liquido is null or v_soma is null or abs(v_soma - p_valor_liquido) >= 0.005 then
    raise exception 'A soma do que vai cair do cartão (%) não fecha com o valor líquido (%).',
      v_soma, p_valor_liquido;
  end if;

  -- O loja_id vem do lançamento, nunca de quem chama. Sem `returning`: quem
  -- só tem OS grava, mas não lê estas tabelas.
  insert into caixa_taxas_cartao (
    movimento_id, loja_id, forma, parcelas, taxa_percentual, prazo_dias,
    recebe_tudo_de_uma_vez, valor_bruto, valor_taxa, valor_liquido
  ) values (
    v_mov.id, v_mov.loja_id, p_forma, p_parcelas, p_taxa_percentual, p_prazo_dias,
    coalesce(p_recebe_tudo_de_uma_vez, false), p_valor_bruto, p_valor_taxa, p_valor_liquido
  );

  insert into caixa_cartao_a_receber (movimento_id, loja_id, numero, data_prevista, valor)
  select v_mov.id, v_mov.loja_id, r.numero, r.data_prevista, r.valor
    from jsonb_to_recordset(p_recebimentos) as r(numero integer, data_prevista date, valor numeric);
end;
$$;

comment on function registrar_taxa_do_cartao(
  uuid, text, integer, numeric, integer, boolean, numeric, numeric, numeric, jsonb
) is
  'Grava a taxa da maquininha de um lançamento de cartão e as datas em que ele cai, numa transação só (#387). Roda como quem chama: a RLS das tabelas vale.';

revoke all on function registrar_taxa_do_cartao(
  uuid, text, integer, numeric, integer, boolean, numeric, numeric, numeric, jsonb
) from public, anon;
grant execute on function registrar_taxa_do_cartao(
  uuid, text, integer, numeric, integer, boolean, numeric, numeric, numeric, jsonb
) to authenticated;

insert into schema_versao (versao) values (88) on conflict do nothing;
