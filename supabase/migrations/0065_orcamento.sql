-- Sakura System — AutoCenter Edition
-- Migration 0065: o orçamento como etapa da ordem de serviço (tarefa #379).
--
-- O problema. Hoje a loja passa o preço pro cliente "de cabeça" ou abre uma
-- OS só pra mostrar o valor. Se o cliente não volta, fica uma OS de mentira
-- na lista, ocupando um número e — pior — com as peças já baixadas do
-- estoque. Não dá pra saber quantos orçamentos foram feitos nem por que
-- foram recusados.
--
-- O caminho escolhido NÃO é uma tabela de orçamentos à parte: o orçamento é
-- uma ordem de serviço num estado anterior, `status = 'orcamento'`. Quando o
-- cliente aprova, a MESMA linha vira OS (`em_andamento`), com os mesmos
-- itens; quando recusa, vira `recusado` e fica guardada pra consulta. Assim
-- o orçamento aproveita a tela, a impressão e o WhatsApp da OS, sem copiar
-- item de um lado pro outro.
--
-- Três decisões que valem saber:
--
--   • O NÚMERO DA OS só nasce na aprovação. Orçamento tem `numero` vazio e um
--     contador próprio por loja, `numero_orcamento` ("Orçamento 45"). Na
--     aprovação, o gatilho dá o PRÓXIMO número de OS, sem buraco: a "OS 17"
--     continua vindo depois da "OS 16" mesmo que dez orçamentos tenham sido
--     recusados no meio. É o contrário da venda de balcão (0064), que divide
--     o contador com a OS — lá o documento já é uma venda; aqui, um
--     orçamento recusado nunca foi documento nenhum, e um número de OS que
--     pula faz a contabilidade perguntar "cadê a OS 12?".
--
--   • A trava `ck_ordens_servico_numero_orcamento` amarra os dois: `numero`
--     vazio SE E SÓ SE for orçamento ou recusado. Daí sai de graça que uma OS
--     numerada nunca volta a ser orçamento (o número não some), e que nenhuma
--     OS fica sem número.
--
--   • Dois aprovando ao mesmo tempo, na mesma loja, não podem pegar o mesmo
--     número. O gatilho pega uma tranca por loja (`pg_advisory_xact_lock`)
--     antes de procurar o maior número, e solta no fim da transação. A
--     criação de OS comum passa pela mesma tranca — senão uma OS nova e uma
--     aprovação ainda se cruzariam. Antes, quem se cruzava levava erro do
--     índice único; agora espera a vez.
--
-- O estoque NÃO é assunto do banco aqui: quem deixa de baixar peça no
-- orçamento e baixa só na aprovação é o programa (src/lib/ordensServico.ts).
--
-- ⚠️ ORDEM AO SUBIR. A versão anterior do programa não conhece orçamento:
-- ela continua criando OS normalmente com esta migration rodada (o padrão
-- do status não muda), mas se abrir um orçamento criado pela versão nova
-- mostra "OS null" e, ao lançar peça nele, baixa estoque. Por isso a linha
-- abaixo faz o botão "Atualizar o banco de todas as empresas" esperar os
-- computadores chegarem na versão que conhece orçamento.
-- versao-minima-do-programa: 0.9.52
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. Os dois estados novos
-- ===================================================================
-- O padrão continua 'em_andamento': quem não diz o status (a versão
-- anterior) continua criando OS.

alter table ordens_servico drop constraint if exists ordens_servico_status_check;
alter table ordens_servico add constraint ordens_servico_status_check
  check (status in ('orcamento', 'em_andamento', 'concluida', 'faturada', 'recusado'));

alter table ordens_servico alter column status set default 'em_andamento';

-- ===================================================================
-- 2. O número da OS pode ficar vazio (só no orçamento)
-- ===================================================================

alter table ordens_servico alter column numero drop not null;

-- ===================================================================
-- 3. As colunas do orçamento (todas opcionais: a OS de sempre não usa)
-- ===================================================================

alter table ordens_servico add column if not exists numero_orcamento integer;
alter table ordens_servico add column if not exists validade date;
alter table ordens_servico add column if not exists aprovado_por text;
alter table ordens_servico add column if not exists aprovado_em timestamptz;
alter table ordens_servico add column if not exists motivo_recusa text;
alter table ordens_servico add column if not exists recusado_em timestamptz;

comment on column ordens_servico.numero is
  'Número da OS, sequencial por loja. Vazio só enquanto a linha é orçamento '
  '(ou foi recusada): nasce na aprovação, com o próximo número, sem buraco.';
comment on column ordens_servico.numero_orcamento is
  'Número do orçamento, sequencial por loja e separado do número da OS. '
  'Continua na linha depois da aprovação ("Orçamento 45 virou a OS 17").';
comment on column ordens_servico.validade is
  'Até quando o preço do orçamento vale. Quem preenche é o programa (padrão: '
  'hoje + 7 dias). Vencido não tranca nada: só avisa na aprovação.';
comment on column ordens_servico.aprovado_por is
  'Quem aprovou o orçamento, em texto livre (ex.: "o próprio cliente, pelo telefone").';
comment on column ordens_servico.motivo_recusa is
  'Por que o orçamento foi recusado (opcional): preco, prazo, outro_lugar, desistiu ou outro.';

-- ===================================================================
-- 4. As travas
-- ===================================================================
-- Todas soltas e recriadas, pelo item 12 da §6: rodar de novo não pode
-- tropeçar no nome que já existe.

-- numero vazio SE E SÓ SE for orçamento ou recusado.
alter table ordens_servico drop constraint if exists ck_ordens_servico_numero_orcamento;
alter table ordens_servico add constraint ck_ordens_servico_numero_orcamento
  check ((numero is null) = (status in ('orcamento', 'recusado')));

-- todo orçamento tem o número dele.
alter table ordens_servico drop constraint if exists ck_ordens_servico_numero_orcamento_obrigatorio;
alter table ordens_servico add constraint ck_ordens_servico_numero_orcamento_obrigatorio
  check (status not in ('orcamento', 'recusado') or numero_orcamento is not null);

-- motivo da recusa só da lista (a tela mostra Preço, Prazo, Foi em outro
-- lugar, Desistiu, Outro) — ou nenhum.
alter table ordens_servico drop constraint if exists ck_ordens_servico_motivo_recusa;
alter table ordens_servico add constraint ck_ordens_servico_motivo_recusa
  check (motivo_recusa is null or motivo_recusa in ('preco', 'prazo', 'outro_lugar', 'desistiu', 'outro'));

-- dois orçamentos com o mesmo número na mesma loja, nunca. (Linha sem
-- numero_orcamento — a OS de sempre — não conta: vazio não repete vazio.)
create unique index if not exists ordens_servico_loja_numero_orcamento_unique
  on ordens_servico (loja_id, numero_orcamento);

-- ===================================================================
-- 5. O gatilho dos números (substitui o da migration 0037)
-- ===================================================================
-- Três casos:
--   a) nasce orçamento (ou já recusado): ganha o próximo `numero_orcamento`
--      da loja; o `numero` fica vazio — e se vier preenchido, a trava do
--      passo 4 recusa, em vez de o gatilho apagar calado.
--   b) nasce OS ou venda de balcão: como sempre, o próximo `numero`.
--   c) um orçamento passa a ser OS: ganha o próximo `numero` ali, na
--      aprovação. Só nesse caso o gatilho mexe num update — apagar o número
--      de uma OS que já tem continua sendo recusado pela trava.
--
-- E uma trava de caminho, `ck_ordens_servico_transicao_orcamento`: saindo
-- de orçamento, só pra em_andamento (aprovado) ou recusado; recusado não
-- sai mais. Sem ela, um recusado virava OS numerada sem baixar estoque, e
-- um orçamento ia direto pra concluída/faturada. Um CHECK não enxerga o
-- status de antes, então quem confere é o gatilho — com a mesma mensagem
-- de um CHECK de verdade, pra tela traduzir pelo nome (src/lib/errors.ts).

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
     or (old.status = 'recusado' and new.status <> 'recusado') then
    raise exception using
      errcode    = 'check_violation',
      message    = 'new row for relation "ordens_servico" violates check constraint "ck_ordens_servico_transicao_orcamento"',
      detail     = format('Orçamento só vira OS (em_andamento) ou recusado, e recusado não muda mais. Pedido: de %s pra %s.',
                          old.status, new.status),
      table      = 'ordens_servico',
      constraint = 'ck_ordens_servico_transicao_orcamento';
  elsif old.status = 'orcamento' and not eh_orcamento and new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended('ordens_servico.numero:' || new.loja_id::text, 0));
    select coalesce(max(numero), 0) + 1 into new.numero
    from ordens_servico
    where loja_id = new.loja_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_definir_numero_ordem_servico on ordens_servico;
create trigger trigger_definir_numero_ordem_servico
  before insert or update on ordens_servico
  for each row
  execute function definir_numero_ordem_servico();

insert into schema_versao (versao) values (65) on conflict do nothing;
