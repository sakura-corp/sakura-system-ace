-- Sakura System — AutoCenter Edition
-- Migration 0082: o link de avaliação no Google, por loja (#459).
--
-- O PROBLEMA. Avaliação no Google é o que traz cliente novo pra borracharia,
-- e quem pede é o balcão, na hora em que o cliente está satisfeito. Hoje isso
-- depende de alguém lembrar de mandar o link, procurando em outro lugar.
--
-- A DECISÃO (Sofia, 22/10/2026). Um botão "Pedir avaliação" na OS faturada e
-- na venda de balcão, que abre o WhatsApp com o link da loja:
--   • o link fica nas Configurações, um por loja (cada loja tem a própria
--     página no Google);
--   • o botão SÓ aparece quando a loja tem link: sem link, nada muda na tela;
--   • o link precisa começar com https:// (é o que o Google entrega, e um
--     link quebrado na mensagem pro cliente é pior que nenhum).
--
-- POR QUE UMA TABELA SÓ PRA ISSO, e não uma coluna nos Dados fiscais: o link
-- não tem nada de fiscal, e a tela de WhatsApp já é quem cuida das mensagens.
-- O desenho é o da `configuracoes_garantia` (0018): uma linha por loja, com o
-- `loja_id` de chave. A linha só existe quando a loja tem link; apagar o link
-- é apagar a linha. Nada a semear: loja sem linha é loja sem botão.
--
-- QUEM LÊ E GRAVA. Mesma regra das outras configurações por loja
-- (`configuracoes_whatsapp`, 0052): quem tem acesso à loja lê e grava. O "só
-- admin edita" é da tela, como no resto de Configurações.
--
-- ORDEM DE SUBIR. Tabela nova e opcional: esta migration sobe ANTES da versão
-- do programa, como as outras (o programa antigo nem sabe que ela existe). Por
-- isso não declara versão mínima do programa.
--
-- A trava tem nome `ck_<tabela>_<regra>` porque a tela traduz cada uma numa
-- frase em português (src/lib/errors.ts). Tabela nova nasce vazia, então
-- nenhum dado que já existe pode ficar fora da regra.
--
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_avaliacao (
  loja_id uuid primary key references lojas (id),
  link_google text not null,
  atualizado_em timestamptz not null default now()
);

-- O link começa com https://, tem alguma coisa depois e não tem espaço em
-- branco no meio (um espaço quebra o link dentro da mensagem do WhatsApp).
alter table configuracoes_avaliacao
  drop constraint if exists ck_configuracoes_avaliacao_link_https;
alter table configuracoes_avaliacao
  add constraint ck_configuracoes_avaliacao_link_https
  check (link_google ~ '^https://[^[:space:]]+$');

comment on table configuracoes_avaliacao is
  'O link de avaliação no Google de cada loja (#459). Uma linha por loja; sem linha, o botão "Pedir avaliação" não aparece.';

alter table configuracoes_avaliacao enable row level security;

drop policy if exists "configuracoes_avaliacao_acesso_por_loja" on configuracoes_avaliacao;
create policy "configuracoes_avaliacao_acesso_por_loja" on configuracoes_avaliacao
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

insert into schema_versao (versao) values (82) on conflict do nothing;
