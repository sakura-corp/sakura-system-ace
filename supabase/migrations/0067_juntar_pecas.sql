-- Sakura System — AutoCenter Edition
-- Migration 0067: juntar duas peças repetidas numa só (tarefa #656).
--
-- O PROBLEMA. O cadastro de peças é um só pra empresa inteira, e nada impede
-- a mesma peça de nascer duas vezes ("Pneu 175/70 R13" digitado à mão e o
-- mesmo pneu vindo de uma nota importada, com outro nome). Aí o estoque se
-- divide em dois: metade dos movimentos numa peça, metade na outra, e nenhuma
-- das duas mostra o saldo de verdade. Apagar a repetida não resolve — o
-- histórico dela (movimentos, contagens) iria junto, calado, pelo CASCADE.
--
-- O QUE ESTA MIGRATION CRIA: duas funções que o programa chama.
--
--   • resumo_peca_para_juntar(peça) — a PRÉVIA. Antes de confirmar, a tela
--     mostra o que cada peça carrega: quantos movimentos, itens de OS,
--     contagens, itens de pedido de compra e cotações, e o saldo em cada loja.
--     Se a peça aparece numa loja que quem pergunta não administra, a
--     resposta é só "tem N loja(s) que você não administra", sem número
--     nenhum — pra não mostrar o estoque de uma loja a quem não é de lá.
--
--   • juntar_pecas(fica, sai, campos) — a JUNÇÃO. Tudo que apontava pra peça
--     que sai passa a apontar pra peça que fica, a peça que fica pode herdar
--     alguns campos da que sai (os que a pessoa escolher na tela, de uma lista
--     fechada), e a peça que sai é apagada. O saldo fica certo sozinho, porque
--     o estoque é a soma dos movimentos (src/lib/estoque.ts) e os movimentos
--     das duas agora são de uma peça só.
--
-- CINCO DECISÕES QUE VALEM SABER ANTES DE MEXER AQUI:
--
-- 1. TUDO OU NADA. A função inteira é uma transação só: qualquer erro no meio
--    (inclusive um dos `raise` daqui) desfaz tudo o que ela já tinha feito.
--    Nunca sobra metade dos movimentos de um lado e metade do outro.
--
-- 2. SÓ ADMINISTRADOR, E DE TODAS AS LOJAS ONDE QUALQUER DAS DUAS APARECE.
--    Juntar mexe no histórico de estoque de cada loja onde a peça que sai tem
--    movimento, contagem, OS ou pedido, e muda o cadastro da peça que fica,
--    que as lojas dela usam. Quem não administra uma dessas lojas é recusado,
--    com a mensagem dizendo isso, e nada muda. As funções são `security
--    definer` (atravessam a RLS, porque precisam alcançar o histórico inteiro
--    da peça) — por isso a checagem de quem pode é feita aqui dentro, à mão,
--    e o `revoke` lá embaixo tira o acesso de quem não está logado.
--
-- 3. A REDE DE SEGURANÇA. Antes de apagar a peça que sai, a função pergunta ao
--    próprio banco quais tabelas apontam pra `pecas` (pg_constraint) e confere
--    que NENHUMA ainda tem linha da peça que sai. Hoje são cinco, e as cinco
--    são repostas aqui. Mas se um dia nascer uma sexta tabela e ninguém
--    lembrar de pôr ela nesta função, a junção falha INTEIRA, dizendo o nome
--    da tabela — em vez de o CASCADE apagar o histórico dela sem ninguém ver,
--    ou de a junção dar um erro de chave que ninguém entende.
--
-- 4. A AUDITORIA DA JUNÇÃO. O trigger da trilha de auditoria (0053) já
--    registra sozinho, com quem e quando: a peça que sai INTEIRA (ação
--    "excluir"), a peça que fica antes e depois (ação "atualizar" — por isso
--    ela é atualizada SEMPRE, mesmo sem campo escolhido) e cada item de OS que
--    trocou de peça. Só que movimentos, contagens, itens de pedido e cotações
--    não têm trigger de auditoria: depois da junção, nada diria quais linhas
--    eram da peça que sumiu. Por isso a função grava À MÃO mais uma linha
--    ("atualizar" na peça que fica) com tudo o que precisa pra entender — e,
--    se preciso, desfazer à mão — a junção: a peça que saiu inteira, a prévia
--    das duas, os campos trazidos e os ids de cada linha que era da que saiu
--    (pegos ANTES de repor). Ela se reconhece por `"juntada": true` em
--    dados_antes.
--
-- 5. PRÉVIA VELHA NÃO PASSA. A tela mostra a prévia, a pessoa pensa, e só
--    então confirma; nesse meio-tempo outro computador pode ter lançado um
--    movimento. Se o programa mandar a prévia que mostrou (`p_esperado`), a
--    função confere, já com as duas peças travadas, se os números ainda são
--    aqueles — e recusa se não forem, em vez de juntar uma coisa diferente da
--    que a pessoa viu.
--
-- Só acrescenta (duas funções novas): o programa de antes continua igual.
-- Idempotente: seguro rodar de novo.

drop function if exists juntar_pecas(uuid, uuid, text[]);
drop function if exists juntar_pecas(uuid, uuid, text[], jsonb);
drop function if exists resumo_peca_para_juntar(uuid);

-- ---------------------------------------------------------------------------
-- 1. A prévia
-- ---------------------------------------------------------------------------
-- Devolve:
--   {"lojas_sem_acesso": n}                     quando n > 0 (sem mais nada), ou
--   {"lojas_sem_acesso": 0, "movimentos": .., "itens_os": .., "os": ..,
--    "contagens": .., "itens_compra": .., "compras": .., "cotacoes": ..,
--    "estoque": [{"loja_id": .., "loja_nome": .., "saldo": ..}, ...]}
-- `estoque` tem uma linha por loja com movimento da peça, em ordem de nome.
-- O saldo é a mesma conta de calcularSaldoPorPeca (src/lib/estoque.ts):
-- entrada soma, qualquer outro tipo (saída) subtrai.

create or replace function resumo_peca_para_juntar(p_peca uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sem_acesso int;
  v_estoque jsonb;
begin
  if not operador_atual_e_admin() then
    raise exception 'Só um administrador pode juntar peças.';
  end if;

  -- As lojas onde a peça aparece, por qualquer caminho. Loja nula (não
  -- deveria existir) conta como "sem acesso": na dúvida, não mostra.
  select count(*) filter (where loja_id is null or not operador_e_admin_da_loja(loja_id))
    into v_sem_acesso
  from (
    select loja_id from estoque_movimentos where peca_id = p_peca
    union
    select loja_id from contagens_estoque where peca_id = p_peca
    union
    select os.loja_id
      from ordens_servico_itens i
      join ordens_servico os on os.id = i.ordem_servico_id
     where i.peca_id = p_peca
    union
    select pc.loja_id
      from pedidos_compra_itens i
      join pedidos_compra pc on pc.id = i.pedido_compra_id
     where i.peca_id = p_peca
  ) lojas_da_peca;

  if v_sem_acesso > 0 then
    return jsonb_build_object('lojas_sem_acesso', v_sem_acesso);
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object('loja_id', s.loja_id, 'loja_nome', l.nome, 'saldo', s.saldo)
             order by l.nome, s.loja_id
           ),
           '[]'::jsonb
         )
    into v_estoque
  from (
    select loja_id,
           sum(case when tipo = 'entrada' then quantidade else -quantidade end) as saldo
      from estoque_movimentos
     where peca_id = p_peca
     group by loja_id
  ) s
  left join lojas l on l.id = s.loja_id;

  return jsonb_build_object(
    'lojas_sem_acesso', 0,
    'movimentos',   (select count(*) from estoque_movimentos where peca_id = p_peca),
    'itens_os',     (select count(*) from ordens_servico_itens where peca_id = p_peca),
    'os',           (select count(distinct ordem_servico_id) from ordens_servico_itens where peca_id = p_peca),
    'contagens',    (select count(*) from contagens_estoque where peca_id = p_peca),
    'itens_compra', (select count(*) from pedidos_compra_itens where peca_id = p_peca),
    'compras',      (select count(distinct pedido_compra_id) from pedidos_compra_itens where peca_id = p_peca),
    'cotacoes',     (select count(*) from cotacoes_pecas where peca_id = p_peca),
    'estoque',      v_estoque
  );
end;
$$;

comment on function resumo_peca_para_juntar(uuid) is
  '#656. Prévia de juntar peças: o que a peça carrega (movimentos, itens de OS, '
  'contagens, itens de compra, cotações e saldo por loja). Só admin; se a peça '
  'aparece em loja que ele não administra, devolve só {"lojas_sem_acesso": n}.';

-- ---------------------------------------------------------------------------
-- 2. A junção
-- ---------------------------------------------------------------------------
-- Devolve a prévia da peça que ficou (resumo_peca_para_juntar(p_fica)), pra
-- tela mostrar o resultado.
--
-- `p_esperado` (opcional): a prévia que a tela mostrou, no formato
--   {"fica": <resumo_peca_para_juntar(p_fica)>, "sai": <resumo_peca_para_juntar(p_sai)>}
-- Se vier, são conferidos movimentos, itens_os, contagens, itens_compra,
-- cotacoes e o saldo de cada loja (por loja_id, como número: 6 e "6.00" são
-- iguais). Qualquer diferença recusa a junção. Nulo: não confere (o caminho
-- de quem chama sem prévia, como o SQL Editor).

create or replace function juntar_pecas(
  p_fica uuid,
  p_sai uuid,
  p_campos_da_que_sai text[] default '{}',
  p_esperado jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Os campos que a peça que fica pode herdar da que sai. Fica de fora o que
  -- não é "dado da peça": id, criado_em e ativo (ativo tem regra própria:
  -- se qualquer uma das duas estava ativa, a que fica fica ativa).
  v_permitidos constant text[] := array[
    'codigo_interno', 'codigo_barras', 'descricao', 'marca', 'modelo',
    'aplicacao', 'unidade', 'preco_custo', 'preco_venda', 'ncm', 'cest',
    'cfop_padrao', 'origem', 'cst_ou_csosn', 'aliquota_icms', 'categoria_id',
    'prazo_garantia_dias', 'estoque_minimo', 'medida',
    'indice_carga_velocidade', 'dot'
  ];
  v_campo text;
  v_copias text := '';
  v_achadas int;
  v_resumo_sai jsonb;
  v_resumo_fica jsonb;
  v_ref record;
  v_resta boolean;
  v_lado text;
  v_atual jsonb;
  v_previa jsonb;
  v_mudou boolean;
  v_campos jsonb;
  v_ids jsonb;
  v_peca_sai jsonb;
begin
  if not operador_atual_e_admin() then
    raise exception 'Só um administrador pode juntar peças.';
  end if;

  if p_fica is null or p_sai is null then
    raise exception 'Escolha as duas peças: a que fica e a que vai sumir.';
  end if;

  if p_fica = p_sai then
    raise exception 'Escolha duas peças diferentes: não dá pra juntar uma peça com ela mesma.';
  end if;

  -- Lista fechada: o nome do campo vira pedaço de SQL logo abaixo, então
  -- nada fora desta lista passa. `distinct` porque o mesmo campo duas vezes
  -- daria erro no update.
  for v_campo in
    select distinct c from unnest(coalesce(p_campos_da_que_sai, '{}'::text[])) as c
  loop
    if v_campo is null or not (v_campo = any (v_permitidos)) then
      raise exception 'O campo "%" não pode ser trazido da peça que vai sumir.', coalesce(v_campo, '(vazio)');
    end if;
    v_copias := v_copias || format('%I = s.%I, ', v_campo, v_campo);
  end loop;
  v_campos := to_jsonb(array(
    select distinct c from unnest(coalesce(p_campos_da_que_sai, '{}'::text[])) as c order by 1
  ));

  -- Trava as duas peças até o fim (ninguém edita nem junta elas ao mesmo
  -- tempo). Em ordem de id, pra duas junções cruzadas não se travarem.
  perform 1 from pecas where id in (p_fica, p_sai) order by id for update;

  select count(*) into v_achadas from pecas where id in (p_fica, p_sai);
  if v_achadas <> 2 then
    raise exception 'Uma das peças não existe mais (pode ter sido apagada ou já juntada). Recarregue a tela e tente de novo.';
  end if;

  -- A peça que sai leva o histórico de cada loja onde aparece: quem não
  -- administra alguma delas não junta. (A mesma conta da prévia.)
  v_resumo_sai := resumo_peca_para_juntar(p_sai);
  if (v_resumo_sai ->> 'lojas_sem_acesso')::int > 0 then
    raise exception 'A peça que vai sumir tem histórico em % loja(s) que você não administra. Só quem administra todas essas lojas pode juntar estas peças.',
      (v_resumo_sai ->> 'lojas_sem_acesso')::int;
  end if;

  -- E a que fica também: o cadastro dela muda (campos escolhidos), e ela é a
  -- mesma peça que as outras lojas dela usam.
  v_resumo_fica := resumo_peca_para_juntar(p_fica);
  if (v_resumo_fica ->> 'lojas_sem_acesso')::int > 0 then
    raise exception 'A peça que fica tem histórico em % loja(s) que você não administra. Só quem administra todas essas lojas pode juntar estas peças.',
      (v_resumo_fica ->> 'lojas_sem_acesso')::int;
  end if;

  -- A prévia que a tela mostrou ainda vale? (decisão 5 do cabeçalho)
  if p_esperado is not null then
    foreach v_lado in array array['fica', 'sai'] loop
      v_atual := case v_lado when 'fica' then v_resumo_fica else v_resumo_sai end;
      v_previa := p_esperado -> v_lado;
      begin
        select exists (
                 select 1
                   from unnest(array['movimentos', 'itens_os', 'contagens', 'itens_compra', 'cotacoes']) as k
                  where (v_previa ->> k)::numeric is distinct from (v_atual ->> k)::numeric
               )
            or exists (
                 select 1
                   from (select e ->> 'loja_id' as loja, (e ->> 'saldo')::numeric as saldo
                           from jsonb_array_elements(coalesce(v_previa -> 'estoque', '[]'::jsonb)) e) p
                   full join
                        (select e ->> 'loja_id' as loja, (e ->> 'saldo')::numeric as saldo
                           from jsonb_array_elements(v_atual -> 'estoque') e) a
                     on a.loja = p.loja
                  where p.saldo is distinct from a.saldo
               )
          into v_mudou;
      exception when others then
        -- prévia num formato que não dá pra ler (número torto, estoque que
        -- não é lista): não dá pra garantir que é a mesma, então não junta.
        v_mudou := true;
      end;
      if v_mudou then
        raise exception 'Os números das peças mudaram desde a prévia (alguém mexeu nelas agora há pouco). Confira a prévia de novo antes de juntar.';
      end if;
    end loop;
  end if;

  -- O que era da peça que sai, guardado ANTES de repor (decisão 4).
  select to_jsonb(p) into v_peca_sai from pecas p where p.id = p_sai;
  v_ids := jsonb_build_object(
    'ids_movimentos',   (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from estoque_movimentos   where peca_id = p_sai),
    'ids_itens_os',     (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from ordens_servico_itens where peca_id = p_sai),
    'ids_itens_compra', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from pedidos_compra_itens where peca_id = p_sai),
    'ids_cotacoes',     (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from cotacoes_pecas       where peca_id = p_sai),
    'ids_contagens',    (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from contagens_estoque    where peca_id = p_sai)
  );

  -- A peça que fica: os campos escolhidos vêm da que sai, e ativo é "ou".
  -- Atualizada sempre, mesmo sem campo escolhido, pra trilha de auditoria
  -- guardar como ela estava antes e depois da junção.
  execute format(
    'update pecas f set %s ativo = (f.ativo or s.ativo) from pecas s where f.id = $1 and s.id = $2',
    v_copias
  ) using p_fica, p_sai;

  -- Tudo que apontava pra peça que sai passa a apontar pra que fica.
  update estoque_movimentos   set peca_id = p_fica where peca_id = p_sai;
  update contagens_estoque    set peca_id = p_fica where peca_id = p_sai;
  update ordens_servico_itens set peca_id = p_fica where peca_id = p_sai;
  update pedidos_compra_itens set peca_id = p_fica where peca_id = p_sai;
  update cotacoes_pecas       set peca_id = p_fica where peca_id = p_sai;

  -- A rede de segurança (decisão 3 do cabeçalho): pergunta ao banco TODAS as
  -- tabelas que apontam pra `pecas`, não só as cinco acima.
  for v_ref in
    select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'pecas'::regclass
       and array_length(c.conkey, 1) = 1
  loop
    execute format('select exists (select 1 from %s where %I = $1)', v_ref.tabela, v_ref.coluna)
      into v_resta using p_sai;
    if v_resta then
      raise exception 'A tabela "%" ainda tem registro da peça que vai sumir, e esta função não sabe mexer nela. Nada foi alterado. (Avise o suporte: a tabela precisa entrar em juntar_pecas.)',
        v_ref.tabela;
    end if;
  end loop;

  -- A linha da junção na trilha de auditoria (decisão 4 do cabeçalho).
  insert into auditoria
    (tabela, registro_id, acao, operador_id, operador_nome, dados_antes, dados_depois)
  values (
    'pecas',
    p_fica,
    'atualizar',
    auth.uid(),
    (select nome from operadores where id = auth.uid()),
    jsonb_build_object(
      'juntada', true,
      'peca_que_saiu', v_peca_sai,
      'resumo_fica', v_resumo_fica,
      'resumo_sai', v_resumo_sai,
      'campos_da_que_sai', v_campos
    ) || v_ids,
    (select to_jsonb(p) from pecas p where p.id = p_fica)
  );

  delete from pecas where id = p_sai;

  return resumo_peca_para_juntar(p_fica);
end;
$$;

comment on function juntar_pecas(uuid, uuid, text[], jsonb) is
  '#656. Junta a peça p_sai na p_fica: repõe peca_id em todo o histórico, copia '
  'os campos escolhidos (lista fechada), ativo = fica ou sai, grava a junção na '
  'auditoria (com os ids do que era de p_sai) e apaga p_sai. Tudo ou nada; só '
  'admin de todas as lojas onde as duas aparecem; recusa se p_esperado (a prévia '
  'que a tela mostrou) não bate mais, ou se sobrar qualquer tabela apontando pra '
  'p_sai. Devolve resumo_peca_para_juntar(p_fica).';

-- `security definer` + o EXECUTE que o Postgres dá a PUBLIC (e o Supabase ao
-- `anon`) deixaria quem não está logado ao menos chamar. Só quem está logado.
revoke all on function resumo_peca_para_juntar(uuid) from public, anon;
revoke all on function juntar_pecas(uuid, uuid, text[], jsonb) from public, anon;
grant execute on function resumo_peca_para_juntar(uuid) to authenticated;
grant execute on function juntar_pecas(uuid, uuid, text[], jsonb) to authenticated;

insert into schema_versao (versao) values (67) on conflict do nothing;
