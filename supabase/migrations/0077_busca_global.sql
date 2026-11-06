-- Sakura System — AutoCenter Edition
-- Migration 0077: a BUSCA GERAL do Ctrl+K (tarefa #372).
--
-- O QUE É. Uma caixa só, aberta com Ctrl+K em qualquer tela, que acha
-- veículo pela placa, cliente pelo nome, OS pelo número, peça pela descrição,
-- código ou código de barras, e fornecedor pelo nome ou CNPJ. O programa faz
-- UMA chamada, `buscar_global()`, e recebe até 5 resultados de cada tipo.
--
-- POR QUE UMA FUNÇÃO, E NÃO CINCO CONSULTAS DA TELA. Desde o TR-04.1 as
-- tabelas de clientes, veículos, OS e peças estão fechadas pra quem não tem o
-- módulo (0069, 0074, 0076). A busca precisa olhar as cinco de uma vez, cada
-- uma com a sua regra, e devolver SÓ o que a pessoa pode ver. Escrever essa
-- regra num lugar só, no banco, é o que garante que ninguém acha pela busca o
-- que não acharia pela tela.
--
-- QUEM VÊ O QUÊ (o operador precisa estar ativo e ter alguma loja):
--   • veículo e cliente: quem tem Clientes OU Ordens de Serviço. Sai só o que
--     a janela da 0068 já mostra pra quem tem OS: nome do cliente e placa,
--     marca, modelo e cor do carro. NUNCA telefone, CPF ou endereço.
--   • OS: quem tem Ordens de Serviço, e só da loja aberta no programa (e só se
--     a pessoa tem acesso a ela).
--   • peça: quem tem Estoque. Nunca o custo. Só a peça ativa.
--   • fornecedor: quem tem Fornecedores. Só o fornecedor ativo.
--
-- A FUNÇÃO NÃO CONFIA NA TELA. Ela mesma limpa o termo: tira espaço das
-- pontas, acento e maiúscula pro nome; tira tudo que não é letra ou número
-- pra placa ("abc-1d23" e "ABC1D23" são a mesma); e só procura OS quando o
-- termo é só número (pode ter # e espaço). Termo com menos de 2 letras não
-- procura nada.
--
-- OS ÍNDICES. Sem eles, cada letra digitada leria as tabelas inteiras. Com
-- eles, a placa responde em poucos milissegundos mesmo com dez lojas (medido
-- na tarefa). O nome usa o índice "trigrama" (extensão pg_trgm), que serve
-- pra "contém"; a placa, um índice comum, que serve pra "começa com".
--
-- POR QUE `sem_acento` E NÃO A EXTENSÃO `unaccent`. Índice só aceita função
-- que dá sempre o mesmo resultado (immutable), e a `unaccent` não é. A
-- `sem_acento` é um `translate` simples, com as letras do português.
--
-- ORDEM DE SUBIR. Esta migration só ACRESCENTA (duas funções de apoio, a
-- busca e os índices) e não muda nada pra versão atual do programa. Mas o
-- botão "Atualizar o banco de todas as empresas" segura tudo que vem depois
-- da 0076 até os computadores chegarem na 0.9.56 — esta inclusive. A linha
-- abaixo só deixa isso escrito, pra o aviso do programa ("o banco está
-- atrasado") não acender nas lojas enquanto o botão espera (#757). A tela
-- da busca precisa funcionar (calada) num banco que ainda não tem a função.
-- versao-minima-do-programa: 0.9.56
--
-- Idempotente: seguro rodar de novo. Apaga e recria a busca, os índices e as
-- funções de apoio, nessa ordem (os índices dependem das funções).

-- ===================================================================
-- 1. A extensão do índice trigrama
-- ===================================================================

-- No Supabase as extensões ficam no schema `extensions`; num Postgres comum
-- (o dos testes), ele não existe e a extensão vai pro `public`. Se ela já
-- estiver instalada em qualquer lugar, nada muda.
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    if exists (select 1 from pg_namespace where nspname = 'extensions') then
      create extension pg_trgm with schema extensions;
    else
      create extension pg_trgm;
    end if;
  end if;
end
$$;

-- ===================================================================
-- 2. Apaga o que esta migration cria (pra recriar igual)
-- ===================================================================

drop function if exists buscar_global(text, uuid, integer);

drop index if exists clientes_nome_busca_idx;
drop index if exists fornecedores_nome_busca_idx;
drop index if exists pecas_descricao_busca_idx;
drop index if exists pecas_codigo_interno_busca_idx;
drop index if exists pecas_codigo_barras_idx;
drop index if exists veiculos_placa_busca_idx;
drop index if exists ordens_servico_numero_busca_idx;

drop function if exists sem_acento(text);
drop function if exists placa_normalizada(text);

-- ===================================================================
-- 3. As duas funções de apoio (as mesmas no índice e na busca)
-- ===================================================================

-- "João Peçanha" → "joao pecanha". Minúscula e sem acento.
--
-- SEM `set search_path` DE PROPÓSITO, e com `pg_catalog.` escrito em cada
-- função de dentro: com o `set`, o Postgres não consegue "abrir" a função
-- dentro da consulta e a chama uma vez por linha, com custo — medido com dez
-- lojas, a busca por nome levava mais de 10 vezes mais (135 ms contra 10). Escrevendo o `pg_catalog.`, ninguém troca o
-- `translate` por outro, e a função continua pequena o bastante pra abrir.
create function sem_acento(p_texto text)
returns text
language sql
immutable
parallel safe
as $$
  select pg_catalog.translate(pg_catalog.lower(p_texto),
                              'áàâãäéèêëíìîïóòôõöúùûüçñ',
                              'aaaaaeeeeiiiiooooouuuucn');
$$;

comment on function sem_acento(text) is
  'Busca geral (0077). Minúscula e sem acento, pra "joao" achar "João". '
  'Immutable de propósito: é a expressão dos índices da busca, então NUNCA '
  'mudar o corpo sem recriar os índices (a migration apaga e recria tudo).';

-- "abc-1d23" → "ABC1D23". Só letra e número, em maiúscula.
-- Sem `set search_path`, pelo mesmo motivo da sem_acento.
create function placa_normalizada(p_placa text)
returns text
language sql
immutable
parallel safe
as $$
  select pg_catalog.upper(pg_catalog.regexp_replace(p_placa, '[^A-Za-z0-9]', '', 'g'));
$$;

comment on function placa_normalizada(text) is
  'Busca geral (0077). A placa só com letra e número, em maiúscula, pra '
  '"abc-1d23" achar "ABC1D23". Immutable: é a expressão do índice da placa.';

-- São funções puras (não leem tabela nenhuma), então qualquer um pode usar.
-- A busca, que lê as tabelas, é que fica fechada.

-- ===================================================================
-- 4. Os índices
-- ===================================================================

-- O trigrama precisa do nome da classe de operador com o schema da extensão,
-- que muda entre o Supabase (`extensions`) e o Postgres dos testes (`public`).
do $$
declare
  v_esquema text;
begin
  select n.nspname into v_esquema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pg_trgm';

  execute format(
    'create index clientes_nome_busca_idx on clientes using gin (sem_acento(nome) %I.gin_trgm_ops)',
    v_esquema);
  execute format(
    'create index fornecedores_nome_busca_idx on fornecedores using gin (sem_acento(nome) %I.gin_trgm_ops)',
    v_esquema);
  execute format(
    'create index pecas_descricao_busca_idx on pecas using gin (sem_acento(descricao) %I.gin_trgm_ops)',
    v_esquema);
end
$$;

-- "Começa com": índice comum com text_pattern_ops (o que faz o `like 'ABC%'`
-- usar o índice em qualquer idioma do banco).
create index veiculos_placa_busca_idx
  on veiculos (placa_normalizada(placa) text_pattern_ops);

create index pecas_codigo_interno_busca_idx
  on pecas (lower(codigo_interno) text_pattern_ops);

create index pecas_codigo_barras_idx
  on pecas (codigo_barras);

-- A OS pelo número: o índice da 0037 (loja_id, numero) acha o número
-- exato, mas não o "começa com" (9876 → 98761), que é texto. Sem este, a
-- busca lia todas as OS da loja a cada tecla.
create index ordens_servico_numero_busca_idx
  on ordens_servico (loja_id, (numero::text) text_pattern_ops)
  where numero is not null;

-- Os índices de expressão só ganham estatística com o ANALYZE; sem ela, o
-- Postgres escolhe mal o caminho até o autovacuum passar (medido: a placa
-- lia a tabela de clientes inteira).
analyze clientes;
analyze veiculos;
analyze ordens_servico;
analyze pecas;
analyze fornecedores;

-- ===================================================================
-- 5. A busca
-- ===================================================================

create function buscar_global(p_termo text, p_loja_id uuid, p_limite integer default 5)
returns table (tipo text, id uuid, titulo text, detalhe text, veiculo_id uuid)
language plpgsql
security definer
set search_path = public
stable
as $$
#variable_conflict use_column
declare
  v_limite    integer := least(greatest(coalesce(p_limite, 5), 1), 20);
  v_termo     text    := sem_acento(btrim(coalesce(p_termo, '')));
  -- O termo dentro do `like`, com % e _ escapados: senão "_" acharia tudo.
  v_like      text;
  v_placa     text    := placa_normalizada(coalesce(p_termo, ''));
  v_digitos   text    := regexp_replace(coalesce(p_termo, ''), '\D', '', 'g');
  v_so_numero boolean := regexp_replace(btrim(coalesce(p_termo, '')), '[\s#]', '', 'g') ~ '^[0-9]+$';
  -- CNPJ só quando o termo não tem letra (números, ponto, barra, traço):
  -- senão a placa "ABC1D23" viraria "123" e traria fornecedor pelo CNPJ.
  v_cnpj      boolean := btrim(coalesce(p_termo, '')) ~ '^[0-9./\s-]+$';
  v_barras    text    := btrim(coalesce(p_termo, ''));
  v_clientes  boolean;
  v_os        boolean;
begin
  if not (select operador_ativo_com_loja()) then
    return;
  end if;
  if length(v_termo) < 2 then
    return;
  end if;

  v_like     := replace(replace(replace(v_termo, '\', '\\'), '%', '\%'), '_', '\_');
  v_clientes := (select operador_tem_permissao('clientes'));
  v_os       := (select operador_tem_permissao('ordens_servico'));

  -- ---- veículo, pela placa (começa com) ----------------------------
  if (v_clientes or v_os) and length(v_placa) >= 2 then
    return query
      select 'veiculo'::text,
             v.id,
             v.placa,
             nullif(concat_ws(' · ',
                              nullif(btrim(concat_ws(' ', v.marca, v.modelo)), ''),
                              nullif(btrim(v.cor), ''),
                              c.nome), ''),
             v.id
        from veiculos v
        join clientes c on c.id = v.cliente_id
       where placa_normalizada(v.placa) like v_placa || '%'
       order by placa_normalizada(v.placa), v.id
       limit v_limite;
  end if;

  -- ---- cliente, pelo nome (contém; quem começa com vem antes) --------
  if v_clientes or v_os then
    return query
      select 'cliente'::text,
             a.id,
             a.nome,
             carros.placas,
             carros.primeiro
        from (
          select c.id, c.nome, (sem_acento(c.nome) like v_like || '%') as comeca
            from clientes c
           where sem_acento(c.nome) like '%' || v_like || '%'
             and c.id <> '00000000-0000-0000-0000-00000000c000'
           order by 3 desc, c.nome, c.id
           limit v_limite
        ) a
        left join lateral (
          -- Só as placas: nunca telefone, CPF ou endereço.
          -- Em ordem pela placa limpa: "abc-1d23" e "ABC1D24" ficam juntas
          -- em qualquer idioma do banco.
          select string_agg(v.placa, ', ' order by placa_normalizada(v.placa), v.id) as placas,
                 (array_agg(v.id order by placa_normalizada(v.placa), v.id))[1] as primeiro
            from veiculos v
           where v.cliente_id = a.id
        ) carros on true
       order by a.comeca desc, a.nome, a.id;
  end if;

  -- ---- OS, pelo número, só da loja aberta ---------------------------
  if v_os and v_so_numero and v_digitos <> ''
     and p_loja_id is not null and operador_tem_acesso_loja(p_loja_id) then
    return query
      select 'os'::text,
             o.id,
             o.numero::text,
             concat_ws(' · ',
                       c.nome,
                       v.placa,
                       case o.status
                         when 'em_andamento' then 'Em andamento'
                         when 'concluida'    then 'Concluída'
                         when 'faturada'     then 'Faturada'
                         else o.status
                       end),
             o.veiculo_id
        from ordens_servico o
        join clientes c      on c.id = o.cliente_id
        left join veiculos v on v.id = o.veiculo_id
       where o.loja_id = p_loja_id
         and o.numero is not null
         and o.numero::text like v_digitos || '%'
       -- Pelo tamanho e depois pelo número (12, 120, 121...): dá a mesma
       -- ordem que pelo número, mas sem isto o Postgres preferia andar o
       -- índice da 0037 em ordem e ler todas as OS da loja (medido).
       order by length(o.numero::text), o.numero
       limit v_limite;
  end if;

  -- ---- peça: descrição (contém), código (começa com), código de barras
  if (select operador_tem_permissao('estoque')) then
    return query
      select 'peca'::text,
             p.id,
             p.descricao,
             -- Nunca o custo.
             nullif(concat_ws(' · ',
                              nullif(btrim(p.codigo_interno), ''),
                              nullif(btrim(p.marca), ''),
                              nullif(btrim(p.medida), '')), ''),
             null::uuid
        from pecas p
       -- Só a peça em uso: a desativada continua achável na tela do Estoque
       -- (pedido da Sofia no PR #857).
       where p.ativo
         and (sem_acento(p.descricao) like '%' || v_like || '%'
              or lower(p.codigo_interno) like v_like || '%'
              or p.codigo_barras = v_barras)
       order by (p.codigo_barras = v_barras or lower(p.codigo_interno) like v_like || '%'
                 or sem_acento(p.descricao) like v_like || '%') desc nulls last,
                p.descricao, p.id
       limit v_limite;
  end if;

  -- ---- fornecedor: nome (contém) ou CNPJ (começa com) -----------------
  if (select operador_tem_permissao('fornecedores')) then
    return query
      select 'fornecedor'::text,
             f.id,
             f.nome,
             coalesce(nullif(btrim(f.cnpj), ''),
                      nullif(concat_ws('/', nullif(btrim(f.cidade), ''), nullif(btrim(f.uf), '')), '')),
             null::uuid
        from fornecedores f
       -- Só o fornecedor em uso, como a peça acima (PR #857).
       where f.ativo
         and (sem_acento(f.nome) like '%' || v_like || '%'
              or (v_cnpj and length(v_digitos) >= 2
                  and regexp_replace(coalesce(f.cnpj, ''), '\D', '', 'g') like v_digitos || '%'))
       order by (sem_acento(f.nome) like v_like || '%') desc, f.nome, f.id
       limit v_limite;
  end if;
end;
$$;

comment on function buscar_global(text, uuid, integer) is
  'Busca geral do Ctrl+K (0077). Até p_limite (1 a 20) resultados por tipo: '
  'veiculo e cliente (Clientes ou OS), os (OS, só da loja p_loja_id e com '
  'acesso a ela), peca (Estoque) e fornecedor (Fornecedores). Limpa o termo '
  'sozinha. Nunca devolve telefone, CPF, endereço ou custo: só nome, placa, '
  'marca, modelo, cor, número e status.';

revoke all on function buscar_global(text, uuid, integer) from public, anon;
grant execute on function buscar_global(text, uuid, integer) to authenticated;

insert into schema_versao (versao) values (77) on conflict do nothing;
