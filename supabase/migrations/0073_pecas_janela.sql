-- Sakura System — AutoCenter Edition
-- Migration 0073: a JANELA de Peças e Estoque — primeira metade do lote 5 da
-- etapa 2 do TR-04.1 (tarefa #366). Os lotes anteriores: RH (0056), contas
-- (0061), Caixa (0062) e Clientes (0068/0069). A segunda metade, que FECHA as
-- tabelas, é a 0074.
--
-- POR QUE EM DUAS (o mesmo motivo da 0068). Esta só ACRESCENTA (duas views e
-- três funções) e não muda nada pra versão atual do programa. A versão nova
-- passa a ler por elas — pra todo mundo, inclusive quem tem o módulo —, então
-- ela precisa desta migration já aplicada; e a 0074, que fecha a porta,
-- precisa da versão nova já nos computadores. Ordem: 0073 → publicar e
-- liberar a versão → 0074.
--
-- O PROBLEMA. Quem não tem o módulo Estoque não vê a tela, mas a RLS de
-- `pecas` só exigia login (0015), e a de `estoque_movimentos` e
-- `contagens_estoque` só o acesso à loja (0032). Com a chave que está no
-- computador, qualquer balconista pedia pela API o CUSTO de todas as peças
-- (a margem da loja inteira), alterava preço, apagava peça e lançava
-- movimento de estoque à vontade.
--
-- O QUE NÃO PODE QUEBRAR JUNTO (decisões da Sofia na issue #366):
--
--   • VENDER, ORÇAR E EMITIR NOTA SEM O MÓDULO. Quem tem OS (ou Fornecedores,
--     ou Notas) escolhe a peça pela janela `pecas_janela`: código, descrição,
--     unidade, PREÇO DE VENDA, garantia e se está ativa. NUNCA o custo.
--
--   • O SALDO. A OS e a venda de balcão mostram quanto tem na prateleira. Em
--     vez de ler os movimentos (que passam a ser do módulo), o programa lê a
--     view `estoque_saldos`: um número por peça por loja, só das lojas de
--     quem pergunta. É a mesma conta de `calcularSaldoPorPeca`
--     (src/lib/estoque.ts): entrada soma, saída subtrai.
--
--   • O LUCRO DO CAIXA E DO INÍCIO. Quem tem Caixa (ou OS, ou o Início) vê o
--     lucro do dia, que precisa do custo de cada OS. `custo_das_ordens()`
--     devolve UM número por OS (nunca o custo de cada peça), com a mesma
--     regra de `custoUnitarioDoItem` (src/schemas/orcamento.ts).
--
--   • A NOTA FISCAL. NCM, CEST, CFOP, origem, CST e ICMS das peças da nota:
--     `dados_fiscais_das_pecas()`, pra uma lista de peças. Sem custo.
--
--   • CADASTRAR PEÇA DE DENTRO DA OS E DE FORNECEDORES. A peça avulsa que
--     ganha cadastro (#655) e a peça nova da nota de entrada (XML) passam por
--     `cadastrar_peca_rapida()`. Função, e não porta de INSERT na tabela,
--     porque o programa precisa do id de volta, e um insert com `returning`
--     exige também a policy de LEITURA (lição da 0058). Devolve só o id.
--
-- POR QUE AS VIEWS RODAM COM OS DIREITOS DO DONO (security_invoker = false):
-- medido na 0056 — com a base fechada, a view `security_invoker = true`
-- devolve ZERO linhas. A consequência é a regra de sempre (§6 item 69): o
-- filtro de quem pode ler tem que estar escrito DENTRO dela, e o `revoke` lá
-- embaixo tira a escrita (a `pecas_janela` é view simples, auto-atualizável).
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A janela das peças: só o que o balcão precisa, nunca o custo
-- ===================================================================

drop view if exists pecas_janela;

create view pecas_janela
with (security_invoker = false, security_barrier = true)
as
  select p.id,
         p.codigo_interno,
         p.codigo_barras,
         p.descricao,
         p.unidade,
         p.preco_venda,
         p.prazo_garantia_dias,
         p.ativo,
         p.marca,
         p.modelo,
         p.medida,
         -- SE falta o custo (em branco ou zero, a regra do avisoPecaSemCusto),
         -- nunca QUANTO é: é o que mantém o aviso "peça sem preço de custo"
         -- na OS e no balcão sem entregar o número.
         coalesce(p.preco_custo, 0) = 0 as sem_custo
    from pecas p
   where (select operador_ativo_com_loja());

comment on view pecas_janela is
  'TR-04.1 lote 5 (0073). A parte de `pecas` que quem não tem o módulo '
  'Estoque pode ver: código, descrição, marca, modelo, medida, unidade, preço '
  'de venda, garantia, se está ativa e se está sem custo (sim/não, nunca o valor). Roda com os direitos do dono, então NÃO reage à RLS da '
  'tabela — é o where daqui que barra quem não é operador ativo com loja. '
  'Só SELECT é concedido: sem o revoke abaixo daria pra escrever na tabela '
  'por dentro dela. NUNCA acrescentar preco_custo.';

revoke all on pecas_janela from anon, authenticated;
grant select on pecas_janela to authenticated;

-- ===================================================================
-- 2. O saldo de cada peça, por loja (só as lojas de quem pergunta)
-- ===================================================================

-- O filtro de loja é escrito à mão (a view não reage à RLS de
-- estoque_movimentos): as lojas ligadas a quem está logado, e só se ele está
-- ativo. A subconsulta não depende da linha, então o Postgres a resolve uma
-- vez por consulta.
drop view if exists estoque_saldos;

create view estoque_saldos
with (security_invoker = false, security_barrier = true)
as
  select m.peca_id,
         m.loja_id,
         sum(case m.tipo when 'entrada' then m.quantidade else -m.quantidade end) as saldo
    from estoque_movimentos m
   where m.loja_id in (
           select ol.loja_id
             from operador_lojas ol
             join operadores o on o.id = ol.operador_id
            where ol.operador_id = auth.uid()
              and o.ativo
         )
   group by m.peca_id, m.loja_id;

comment on view estoque_saldos is
  'TR-04.1 lote 5 (0073). O saldo de cada peça em cada loja (entrada soma, '
  'saída subtrai — a conta de calcularSaldoPorPeca), só das lojas de quem '
  'está logado e ativo. Roda com os direitos do dono: o filtro de loja é o '
  'where daqui. Só SELECT. Nunca acrescentar custo nem o movimento em si.';

revoke all on estoque_saldos from anon, authenticated;
grant select on estoque_saldos to authenticated;

-- ===================================================================
-- 3. O custo de cada OS (o lucro do Caixa e do Início)
-- ===================================================================

-- Um número por OS, nunca o custo de cada peça. A conta é a de
-- `custoUnitarioDoItem` (src/schemas/orcamento.ts), item a item:
--   • serviço → custo do cadastro do serviço (0 se não tem, ou se o item
--     não aponta pra serviço nenhum);
--   • peça avulsa (peca_id nulo, #655) → o custo digitado no item; sem ele,
--     conta 0 e a OS sai com custo_completo = false;
--   • peça do cadastro → preco_custo da peça (0 se não tem, ou se a peça foi
--     apagada).
-- custo = soma de quantidade × unitário. Toda OS da lista que quem chama
-- alcança volta numa linha, mesmo sem item (custo 0, completo).
drop function if exists custo_das_ordens(uuid[]);

create function custo_das_ordens(p_ordens uuid[])
returns table (ordem_servico_id uuid, custo double precision, custo_completo boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
       (select operador_tem_permissao('caixa'))
    or (select operador_tem_permissao('relatorios'))
    or (select operador_tem_permissao('ordens_servico'))
    or (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('funcionarios'))
  ) then
    raise exception 'O custo das ordens é só de quem tem Caixa, Ordens de Serviço, Estoque, Relações ou Funcionários.'
      using errcode = '42501';
  end if;

  return query
    select o.id,
           -- Em double precision DE PROPÓSITO, não em numeric: é a conta que o
           -- programa sempre fez (JavaScript), e o lucro tem que dar o mesmo
           -- de antes, centavo por centavo. Em numeric, 4,5 × 32,33 dá
           -- 145,485 exatos; no programa dava 145,48499999999998, e o lucro
           -- arredondado mudava 1 centavo em cerca de 6% das OS com quantidade
           -- quebrada (achado da revisão final; testar-pecas-permissao.sql, 26b).
           coalesce(sum(
             i.quantidade::double precision *
             (case
               when i.tipo = 'servico' then coalesce(s.custo, 0)
               when i.peca_id is null  then coalesce(i.custo_unitario, 0)
               else coalesce(p.preco_custo, 0)
             end)::double precision
           ), 0),
           coalesce(bool_and(not (i.tipo = 'peca' and i.peca_id is null and i.custo_unitario is null)), true)
      from ordens_servico o
      left join ordens_servico_itens i on i.ordem_servico_id = o.id
      left join servicos s on i.tipo = 'servico' and s.id = i.servico_id
      left join pecas p    on i.tipo <> 'servico' and p.id = i.peca_id
     where o.id = any (p_ordens)
       and operador_tem_acesso_loja(o.loja_id)
     group by o.id;
end;
$$;

comment on function custo_das_ordens(uuid[]) is
  'TR-04.1 lote 5 (0073). O custo de cada OS da lista (soma de quantidade × '
  'custo unitário, a regra de custoUnitarioDoItem), só das OS das lojas que '
  'quem chama acessa. custo_completo = false quando alguma peça avulsa está '
  'sem custo. Exige Caixa, OS, Estoque, Relações ou Funcionários. Nunca '
  'devolve o custo de uma peça, só o total da ordem.';

-- ===================================================================
-- 4. Os dados fiscais das peças da nota (sem custo)
-- ===================================================================

drop function if exists dados_fiscais_das_pecas(uuid[]);

create function dados_fiscais_das_pecas(p_pecas uuid[])
returns table (
  id uuid,
  codigo_interno text,
  codigo_barras text,
  descricao text,
  unidade text,
  ncm text,
  cest text,
  cfop_padrao text,
  origem text,
  cst_ou_csosn text,
  aliquota_icms numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (
       (select operador_tem_permissao('ordens_servico'))
    or (select operador_tem_permissao('notas_fiscais'))
    or (select operador_tem_permissao('fornecedores'))
    or (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('relatorios'))
    or (select operador_tem_permissao('funcionarios'))
  ) or not (select operador_ativo_com_loja()) then
    raise exception 'Os dados fiscais das peças são só de quem tem Ordens de Serviço, Notas Fiscais, Fornecedores ou Estoque.'
      using errcode = '42501';
  end if;

  return query
    select p.id, p.codigo_interno, p.codigo_barras, p.descricao, p.unidade,
           p.ncm, p.cest, p.cfop_padrao, p.origem, p.cst_ou_csosn,
           p.aliquota_icms::numeric
      from pecas p
     where p.id = any (p_pecas);
end;
$$;

comment on function dados_fiscais_das_pecas(uuid[]) is
  'TR-04.1 lote 5 (0073). NCM, CEST, CFOP, origem, CST/CSOSN e alíquota de '
  'ICMS das peças pedidas, pra emitir a nota. Exige OS, Notas Fiscais, '
  'Fornecedores, Estoque, Relações ou Funcionários, e operador ativo com '
  'loja. NUNCA acrescentar preco_custo.';

-- ===================================================================
-- 5. O cadastro rápido de peça (OS e Fornecedores)
-- ===================================================================

-- Aceita as colunas do cadastro (`NovaPeca` em src/types/peca.ts: tudo menos
-- id e criado_em); qualquer outra chave é ignorada. Devolve só o id: o
-- programa já tem o resto, e quem não tem Estoque não pode ler a peça de
-- volta (é isso que o `returning` de um insert direto exigiria).
drop function if exists cadastrar_peca_rapida(jsonb);

create function cadastrar_peca_rapida(p_peca jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_peca pecas%rowtype;
  v_id uuid;
begin
  if not (
       (select operador_tem_permissao('estoque'))
    or (select operador_tem_permissao('ordens_servico'))
    or (select operador_tem_permissao('fornecedores'))
  ) or not (select operador_ativo_com_loja()) then
    raise exception 'Cadastrar peça fora do Estoque é só de quem tem Ordens de Serviço ou Fornecedores.'
      using errcode = '42501';
  end if;
  if p_peca is null or jsonb_typeof(p_peca) <> 'object'
     or nullif(btrim(p_peca ->> 'descricao'), '') is null then
    raise exception 'Preencha a descrição da peça.';
  end if;

  v_peca := jsonb_populate_record(null::pecas, p_peca);

  insert into pecas (
    codigo_interno, codigo_barras, descricao, marca, modelo, aplicacao,
    unidade, preco_custo, preco_venda, ncm, cest, cfop_padrao, origem,
    cst_ou_csosn, aliquota_icms, categoria_id, prazo_garantia_dias,
    estoque_minimo, medida, indice_carga_velocidade, dot, ativo
  )
  values (
    v_peca.codigo_interno, v_peca.codigo_barras, v_peca.descricao, v_peca.marca,
    v_peca.modelo, v_peca.aplicacao, v_peca.unidade, v_peca.preco_custo,
    v_peca.preco_venda, v_peca.ncm, v_peca.cest, v_peca.cfop_padrao, v_peca.origem,
    v_peca.cst_ou_csosn, v_peca.aliquota_icms, v_peca.categoria_id,
    v_peca.prazo_garantia_dias, v_peca.estoque_minimo, v_peca.medida,
    v_peca.indice_carga_velocidade, v_peca.dot, coalesce(v_peca.ativo, true)
  )
  returning pecas.id into v_id;

  return v_id;
end;
$$;

comment on function cadastrar_peca_rapida(jsonb) is
  'TR-04.1 lote 5 (0073). Cadastra UMA peça (as colunas de NovaPeca) pra quem '
  'tem Estoque, OS ou Fornecedores — a peça avulsa que ganha cadastro e a '
  'peça nova da nota de entrada. Devolve só o id, nunca a peça.';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC: sem o revoke,
-- o anônimo chamaria as funções.
revoke all on function custo_das_ordens(uuid[]) from public, anon;
revoke all on function dados_fiscais_das_pecas(uuid[]) from public, anon;
revoke all on function cadastrar_peca_rapida(jsonb) from public, anon;
grant execute on function custo_das_ordens(uuid[]) to authenticated;
grant execute on function dados_fiscais_das_pecas(uuid[]) to authenticated;
grant execute on function cadastrar_peca_rapida(jsonb) to authenticated;

insert into schema_versao (versao) values (73) on conflict do nothing;
