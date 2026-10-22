-- Sakura System — AutoCenter Edition
-- Migration 0066: peça avulsa no orçamento, com o custo na própria linha
-- (tarefa #655).
--
-- O problema. No orçamento (0065) a loja muitas vezes ainda não tem a peça
-- cadastrada: vai pedir ao fornecedor só se o cliente aprovar. Cadastrar a
-- peça inteira (com dado fiscal) só pra passar um preço é trabalho jogado
-- fora quando o cliente recusa. Então a peça pode ser digitada SEM cadastro:
-- um item `tipo = 'peca'` com `peca_id` vazio. Isso o banco já aceita desde a
-- 0005 (`peca_id` sempre foi opcional) — não muda nada aqui.
--
-- O que faltava é o CUSTO dessa peça. A peça cadastrada tem o custo dela em
-- `pecas.preco_custo`, e é de lá que a Lucratividade e as comissões tiram.
-- A peça avulsa não tem cadastro, então o custo (se a loja souber) vai na
-- própria linha: a coluna nova `ordens_servico_itens.custo_unitario`.
--
-- Duas decisões que valem saber:
--
--   • VAZIO NÃO É ZERO. `custo_unitario` nulo quer dizer "custo não
--     informado", e por isso a coluna NÃO tem padrão 0. Um zero de mentira
--     faria a peça avulsa aparecer com 100% de lucro na Lucratividade. Zero
--     de verdade (peça que a loja ganhou) continua podendo ser digitado.
--
--   • SÓ UMA TRAVA: custo negativo, nunca (`ck_ordens_servico_itens_custo`,
--     mesmo espírito das travas da 0060). A coluna é nova e nasce vazia em
--     toda linha, então nenhuma loja tem dado que a viole — dá pra criar
--     direto, sem a conferência "só crie se o dado deixar" da 0060.
--
--     E uma trava que ficou de fora, de propósito: "item de serviço não tem
--     `peca_id`". Parece óbvia, mas o formulário da OS manda o `peca_id` da
--     linha sem olhar o tipo (src/schemas/ordemServico.ts, paraItensValidos),
--     então pode existir, num banco de loja, serviço com `peca_id` preenchido
--     — e nenhuma consulta daqui alcança esses bancos pra conferir. Na dúvida,
--     não tranca (docs/licoes.md, item 33: validação incerta é aviso, nunca
--     tranca). Pelo mesmo motivo, o custo na linha também não é proibido em
--     peça cadastrada ou em serviço: quem decide onde ele vale é o programa.
--
-- RLS: nada muda. A coluna é de uma tabela que já tem as policies dela (por
-- linha, herdadas da OS), e uma coluna nova não abre nem fecha linha nenhuma
-- — por isso esta migration não entra na matriz de RLS.
--
-- ORDEM AO SUBIR: a de sempre (migration primeiro), e SEM versão mínima do
-- programa. A versão anterior não conhece a coluna e simplesmente a ignora
-- (lê e grava os itens como sempre). A versão nova só manda a chave
-- `custo_unitario` em peça avulsa — então, se esta migration ainda não tiver
-- rodado, só lançar peça avulsa no orçamento dá erro; o resto funciona.
--
-- Idempotente: seguro rodar de novo.

-- ===================================================================
-- 1. A coluna do custo da peça avulsa (vazia = não informado)
-- ===================================================================

alter table ordens_servico_itens add column if not exists custo_unitario numeric(12, 2);

comment on column ordens_servico_itens.custo_unitario is
  'Custo por unidade digitado na linha da peça avulsa (sem cadastro). Vazio = '
  'custo não informado (nunca vira zero sozinho). O custo da peça cadastrada '
  'continua vindo de pecas.preco_custo.';

-- ===================================================================
-- 2. A trava: custo negativo, nunca
-- ===================================================================
-- Solta e recriada, pelo item 12 da §6: rodar de novo não pode tropeçar no
-- nome que já existe. O nome segue `ck_<tabela>_<regra>` porque a tela
-- traduz cada trava numa frase em português (src/lib/errors.ts).

alter table ordens_servico_itens drop constraint if exists ck_ordens_servico_itens_custo;
alter table ordens_servico_itens add constraint ck_ordens_servico_itens_custo
  check (custo_unitario is null or custo_unitario >= 0);

insert into schema_versao (versao) values (66) on conflict do nothing;
