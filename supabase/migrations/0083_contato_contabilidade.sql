-- Sakura System — AutoCenter Edition
-- Migration 0083: o contato da contabilidade, por loja (#383).
--
-- O PROBLEMA. Todo mês a loja manda pra contabilidade as notas do mês (o
-- pacote do mês). Hoje quem manda precisa procurar o WhatsApp ou o e-mail do
-- escritório em outro lugar, toda vez.
--
-- A DECISÃO (Sofia, 10/11/2026). O contato da contabilidade fica guardado no
-- programa, um por loja (cada loja pode ter o próprio escritório):
--   • nome do escritório (ou da pessoa), obrigatório;
--   • WhatsApp e e-mail, cada um opcional, mas pelo menos UM dos dois: um
--     contato sem nenhum dos dois não serve pra mandar nada, então a tela
--     apaga a linha em vez de gravar pela metade;
--   • o WhatsApp é gravado só com os dígitos (o programa limpa antes).
--
-- POR QUE UMA TABELA SÓ PRA ISSO, e não colunas nos Dados fiscais: o contato
-- não tem nada de fiscal, e quem mexe nele é quem cuida das mensagens. O
-- desenho é o da `configuracoes_avaliacao` (0082): uma linha por loja, com o
-- `loja_id` de chave. A linha só existe quando a loja tem contato; apagar o
-- contato é apagar a linha. Nada a semear: loja sem linha é loja sem contato.
--
-- QUEM LÊ E GRAVA. Mesma regra das outras configurações por loja
-- (`configuracoes_whatsapp`, 0052; `configuracoes_avaliacao`, 0082): quem tem
-- acesso à loja lê e grava. O "só admin edita" é da tela, como no resto de
-- Configurações.
--
-- ORDEM DE SUBIR. Tabela nova e opcional: esta migration sobe ANTES da versão
-- do programa, como as outras (o programa antigo nem sabe que ela existe). Por
-- isso não declara versão mínima do programa.
--
-- As travas têm nome `ck_<tabela>_<regra>` porque a tela traduz cada uma numa
-- frase em português (src/lib/errors.ts). Só trava o que é certo; o resto
-- (se o número existe, se o e-mail chega) não tem como o banco saber. Tabela
-- nova nasce vazia, então nenhum dado que já existe pode ficar fora da regra.
--
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_contabilidade (
  loja_id uuid primary key references lojas (id),
  nome text not null,
  whatsapp text,
  email text,
  atualizado_em timestamptz not null default now()
);

-- O nome não pode ser só espaço e tem no máximo 80 letras.
alter table configuracoes_contabilidade
  drop constraint if exists ck_configuracoes_contabilidade_nome;
alter table configuracoes_contabilidade
  add constraint ck_configuracoes_contabilidade_nome
  check (btrim(nome) <> '' and char_length(nome) <= 80);

-- O WhatsApp, quando houver, é só dígitos, com DDD: de 10 a 13 dígitos
-- (fixo com DDD tem 10; celular, 11; com o 55 do Brasil, 12 ou 13).
alter table configuracoes_contabilidade
  drop constraint if exists ck_configuracoes_contabilidade_whatsapp;
alter table configuracoes_contabilidade
  add constraint ck_configuracoes_contabilidade_whatsapp
  check (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$');

-- O e-mail, quando houver: sem espaço, um @ só, alguma coisa dos dois lados,
-- e no máximo 120 letras.
alter table configuracoes_contabilidade
  drop constraint if exists ck_configuracoes_contabilidade_email;
alter table configuracoes_contabilidade
  add constraint ck_configuracoes_contabilidade_email
  check (email is null or (email ~ '^[^[:space:]@]+@[^[:space:]@]+$' and char_length(email) <= 120));

-- Pelo menos um jeito de falar com a contabilidade.
alter table configuracoes_contabilidade
  drop constraint if exists ck_configuracoes_contabilidade_algum_contato;
alter table configuracoes_contabilidade
  add constraint ck_configuracoes_contabilidade_algum_contato
  check (whatsapp is not null or email is not null);

comment on table configuracoes_contabilidade is
  'O contato da contabilidade de cada loja (#383): nome, WhatsApp (só dígitos) e e-mail, pelo menos um dos dois. Uma linha por loja; sem linha, a loja não cadastrou contato.';

alter table configuracoes_contabilidade enable row level security;

drop policy if exists "configuracoes_contabilidade_acesso_por_loja" on configuracoes_contabilidade;
create policy "configuracoes_contabilidade_acesso_por_loja" on configuracoes_contabilidade
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

insert into schema_versao (versao) values (83) on conflict do nothing;
