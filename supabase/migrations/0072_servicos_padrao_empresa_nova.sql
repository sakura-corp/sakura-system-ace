-- Sakura System — AutoCenter Edition
-- Migration 0072: lista maior de serviços padrão pra empresa nova (tarefa #787).
--
-- A 0030 cadastra 17 serviços (quase todos de pneu, alinhamento e freio). Esta
-- acrescenta mais 39, da pesquisa da tarefa #786 (docs/servicos-padrao.md),
-- e 3 categorias de serviço que faltavam: Óleo e Filtros, Elétrica e
-- Ar-condicionado. O resto encaixa nas 6 categorias da 0030.
--
-- DECISÕES (Sofia, 23 e 27/10/2026):
--   • SÓ EMPRESA NOVA. Tudo aqui só entra num banco SEM NENHUMA ordem de
--     serviço — o banco que acabou de ser instalado. Num banco em uso a
--     migration não faz nada, então o botão "Atualizar o banco de todas as
--     empresas" não mexe no cadastro de serviços de loja nenhuma.
--   • SEM PREÇO, igual à 0030: `preco_padrao` fica vazio. A faixa de preço
--     da pesquisa é só referência pra loja preencher.
--   • NOME CURTO, sem a explicação entre parênteses da pesquisa: é o nome
--     que aparece na OS e na nota.
--   • Nenhum dos 17 nomes da 0030 é renomeado nem cadastrado de novo. A
--     linha "Cambagem e caster" da pesquisa NÃO entra: ela é a soma dos 4
--     nomes por lado que a 0030 já tem.
--
-- Idempotente: rodar de novo não duplica (o nome é comparado sem diferença
-- de maiúscula e de espaço nas pontas).

insert into categorias_servicos (nome)
select v.nome
from (values ('Óleo e Filtros'), ('Elétrica'), ('Ar-condicionado')) as v(nome)
where not exists (select 1 from ordens_servico)
on conflict (nome) do nothing;

insert into servicos (descricao, categoria_id, preco_padrao, ativo)
select v.descricao, cs.id, null, true
from (
  values
    -- borracharia
    ('Conserto de pneu furado', 'Pneus'),
    ('Conserto de pneu com manchão', 'Pneus'),
    ('Vulcanização', 'Pneus'),
    ('Desmontagem de pneu', 'Pneus'),
    ('Troca de válvula do pneu', 'Pneus'),
    ('Calibragem com nitrogênio', 'Pneus'),
    ('Troca de estepe ou de roda', 'Pneus'),
    ('Desempeno de roda de ferro', 'Pneus'),
    ('Desempeno de roda de liga leve', 'Pneus'),
    -- suspensão e amortecedores
    ('Troca de amortecedores (par)', 'Amortecedores'),
    ('Troca de bandeja', 'Suspensão'),
    ('Troca de pivô', 'Suspensão'),
    ('Troca de terminal de direção', 'Suspensão'),
    ('Troca de bieleta', 'Suspensão'),
    ('Troca de coxim ou kit batente', 'Suspensão'),
    ('Troca da suspensão dianteira completa', 'Suspensão'),
    ('Revisão de suspensão', 'Suspensão'),
    -- freios
    ('Troca de pastilha de freio', 'Freios'),
    ('Troca de disco e pastilha', 'Freios'),
    ('Troca de lona ou sapata e tambor', 'Freios'),
    -- óleo e filtros
    ('Troca de óleo do motor', 'Óleo e Filtros'),
    ('Troca de filtro de óleo', 'Óleo e Filtros'),
    ('Troca de filtro de ar', 'Óleo e Filtros'),
    ('Troca de filtro de combustível', 'Óleo e Filtros'),
    ('Troca de filtro de cabine', 'Óleo e Filtros'),
    ('Troca de óleo de câmbio', 'Óleo e Filtros'),
    -- elétrica e bateria
    ('Teste de bateria e alternador', 'Elétrica'),
    ('Troca de bateria', 'Elétrica'),
    ('Troca de lâmpada', 'Elétrica'),
    ('Troca de velas', 'Elétrica'),
    ('Diagnóstico com scanner', 'Elétrica'),
    -- ar-condicionado
    ('Higienização do ar-condicionado', 'Ar-condicionado'),
    ('Recarga de gás do ar-condicionado', 'Ar-condicionado'),
    -- outros
    ('Troca de correia dentada', 'Outros Serviços'),
    ('Troca do líquido de arrefecimento', 'Outros Serviços'),
    ('Limpeza de bicos injetores', 'Outros Serviços'),
    ('Troca de palhetas', 'Outros Serviços'),
    ('Troca de escapamento', 'Outros Serviços'),
    ('Revisão preventiva básica', 'Outros Serviços')
) as v(descricao, categoria_nome)
-- `left join`: se a categoria não existir (a loja apagou), o serviço entra
-- do mesmo jeito, sem categoria.
left join categorias_servicos cs on cs.nome = v.categoria_nome
where not exists (select 1 from ordens_servico)
  and not exists (
    select 1 from servicos s
    where lower(btrim(s.descricao)) = lower(btrim(v.descricao))
  );

insert into schema_versao (versao) values (72) on conflict do nothing;
