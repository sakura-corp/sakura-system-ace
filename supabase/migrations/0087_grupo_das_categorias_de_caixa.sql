-- Sakura System — AutoCenter Edition
-- Migration 0087: o grupo de cada categoria de caixa (tarefa #386).
--
-- Por quê. O DRE (o relatório de "quanto a loja ganhou de verdade no mês")
-- precisa saber, de cada saída e de cada entrada do caixa, em que linha ela
-- cai: custo, despesa com pessoal, despesa administrativa... A categoria
-- ("Aluguel", "Sucata", "Mercado") é escolhida pela loja e tem nome livre,
-- então o banco não tem como adivinhar. Esta migration dá a cada categoria
-- um GRUPO, que a loja escolhe uma vez, em Configurações → Categorias de
-- caixa, e o DRE soma por ele.
--
-- DECISÕES (Sofia, tarefa #386):
--   • LISTA FIXA de grupos, guardada como texto (a mesma lista mora em
--     src/schemas/gruposDre.ts, que traduz cada chave pro nome da tela):
--       - só de saída: deducoes_venda, custos, despesas_pessoal,
--         despesas_administrativas, despesas_comerciais,
--         despesas_financeiras, outras_despesas;
--       - só de entrada: outras_receitas, receitas_financeiras;
--       - dos dois tipos: fora_do_resultado (dinheiro que passa pelo caixa
--         mas não é ganho nem gasto, como retirada de sócio) e a_classificar
--         (a loja ainda não escolheu).
--     Duas travas no banco: o grupo tem que ser um da lista
--     (ck_categorias_caixa_grupo) e tem que combinar com o tipo da categoria
--     (ck_categorias_caixa_grupo_do_tipo) — categoria de entrada nunca cai em
--     despesa, e categoria de saída nunca cai em receita.
--   • NADA DE LOJA EM USO É CLASSIFICADO SOZINHO. Toda categoria que já
--     existe fica em "a_classificar", e a loja escolhe. Nenhum lançamento
--     (caixa_movimentos, contas_pagar) é tocado, e nenhuma categoria muda de
--     nome nem de tipo.
--   • SÓ EMPRESA NOVA ganha as categorias semeadas já no grupo certo: as da
--     0050 ("Outros" de entrada e de saída) e as da 0058 ("Quebra de caixa"
--     e "Sobra de caixa"). O sinal de "empresa nova" é o mesmo da 0072
--     (banco sem nenhuma ordem de serviço) e mais um: sem nenhum lançamento
--     de caixa. Mesmo assim, só muda quem ainda está em "a_classificar" —
--     escolha da loja nunca é desfeita.
--   • Sem mudança de policy: a coluna nova segue a policy que a tabela já
--     tem.
--
-- Idempotente: a coluna entra com `if not exists`, cada trava é apagada pelo
-- nome final antes de ser criada, e o acerto da empresa nova só olha quem
-- está em "a_classificar". Rodar de novo não duplica trava nem desfaz grupo
-- escolhido.

alter table categorias_caixa
  add column if not exists grupo text not null default 'a_classificar';

alter table categorias_caixa drop constraint if exists ck_categorias_caixa_grupo;
alter table categorias_caixa add constraint ck_categorias_caixa_grupo
  check (grupo in (
    'deducoes_venda', 'custos', 'despesas_pessoal', 'despesas_administrativas',
    'despesas_comerciais', 'despesas_financeiras', 'outras_despesas',
    'outras_receitas', 'receitas_financeiras',
    'fora_do_resultado', 'a_classificar'
  ));

alter table categorias_caixa drop constraint if exists ck_categorias_caixa_grupo_do_tipo;
alter table categorias_caixa add constraint ck_categorias_caixa_grupo_do_tipo
  check (
    grupo in ('fora_do_resultado', 'a_classificar')
    or (tipo = 'saida' and grupo in (
      'deducoes_venda', 'custos', 'despesas_pessoal', 'despesas_administrativas',
      'despesas_comerciais', 'despesas_financeiras', 'outras_despesas'
    ))
    or (tipo = 'entrada' and grupo in ('outras_receitas', 'receitas_financeiras'))
  );

-- Empresa nova: as quatro categorias semeadas já nascem no grupo certo.
update categorias_caixa c
   set grupo = v.grupo
  from (values
    ('Outros', 'saida', 'outras_despesas'),
    ('Outros', 'entrada', 'outras_receitas'),
    ('Quebra de caixa', 'saida', 'outras_despesas'),
    ('Sobra de caixa', 'entrada', 'outras_receitas')
  ) as v(nome, tipo, grupo)
 where c.nome = v.nome
   and c.tipo = v.tipo
   and c.grupo = 'a_classificar'
   and not exists (select 1 from ordens_servico)
   and not exists (select 1 from caixa_movimentos);

insert into schema_versao (versao) values (87) on conflict do nothing;
