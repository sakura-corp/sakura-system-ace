-- Sakura System — AutoCenter Edition
-- Migration 0088: o atendimento da loja, por loja (#1033).
--
-- O PROBLEMA. O recibo e as mensagens pro cliente não dizem como falar com a
-- loja, quando ela abre nem quanto tempo vale a garantia do serviço. Quem
-- quer saber liga, ou fica sem saber.
--
-- A DECISÃO (Sofia, 13/11/2026). Três informações nas Configurações, uma
-- linha por loja (cada loja tem o próprio WhatsApp e o próprio horário):
--   • o WhatsApp da loja, só os números, com DDD (10 a 13 dígitos: fixo,
--     celular, e com o 55 do país na frente);
--   • o horário de funcionamento, num texto curto e livre (até 80 letras,
--     cabe numa linha do recibo);
--   • a garantia dos serviços, que é UM prazo só da loja, em dias (não é por
--     serviço nem por peça).
-- Cada uma é opcional: campo vazio no recibo = a linha não aparece. Por isso
-- as três colunas aceitam ficar vazias (null), e a trava só confere o que foi
-- preenchido.
--
-- O DESENHO é o da `configuracoes_avaliacao` (0082): uma linha por loja, com
-- o `loja_id` de chave. Loja sem linha é loja com tudo vazio; nada a semear.
--
-- QUEM LÊ E GRAVA. Mesma regra das outras configurações por loja
-- (`configuracoes_whatsapp`, 0052; `configuracoes_avaliacao`, 0082): quem tem
-- acesso à loja lê e grava. O "só admin edita" é da tela, como no resto de
-- Configurações. Sem auditoria, como a 0082.
--
-- ORDEM DE SUBIR. Tabela nova e opcional: esta migration sobe ANTES da versão
-- do programa, como as outras (o programa antigo nem sabe que ela existe). Por
-- isso não declara versão mínima do programa.
--
-- Cada trava tem nome `ck_<tabela>_<regra>` porque a tela traduz cada uma numa
-- frase em português (src/lib/errors.ts). Tabela nova nasce vazia, então
-- nenhum dado que já existe pode ficar fora da regra.
--
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_atendimento (
  loja_id uuid primary key references lojas (id),
  whatsapp text,
  horario_funcionamento text,
  garantia_servico_dias integer,
  atualizado_em timestamptz not null default now()
);

-- O WhatsApp: só números, de 10 a 13 dígitos (sem máscara, sem espaço, sem +).
alter table configuracoes_atendimento
  drop constraint if exists ck_configuracoes_atendimento_whatsapp;
alter table configuracoes_atendimento
  add constraint ck_configuracoes_atendimento_whatsapp
  check (whatsapp ~ '^[0-9]{10,13}$');

-- O horário: não pode ser só espaço (aí era pra ficar vazio) e cabe numa
-- linha do recibo.
alter table configuracoes_atendimento
  drop constraint if exists ck_configuracoes_atendimento_horario;
alter table configuracoes_atendimento
  add constraint ck_configuracoes_atendimento_horario
  check (btrim(horario_funcionamento) <> '' and char_length(horario_funcionamento) <= 80);

-- A garantia: de 1 dia a 10 anos.
alter table configuracoes_atendimento
  drop constraint if exists ck_configuracoes_atendimento_garantia;
alter table configuracoes_atendimento
  add constraint ck_configuracoes_atendimento_garantia
  check (garantia_servico_dias between 1 and 3650);

comment on table configuracoes_atendimento is
  'O atendimento de cada loja (#1033): WhatsApp, horário de funcionamento e garantia dos serviços em dias. Uma linha por loja; campo vazio não aparece no recibo.';

alter table configuracoes_atendimento enable row level security;

drop policy if exists "configuracoes_atendimento_acesso_por_loja" on configuracoes_atendimento;
create policy "configuracoes_atendimento_acesso_por_loja" on configuracoes_atendimento
  for all
  using (operador_tem_acesso_loja(loja_id))
  with check (operador_tem_acesso_loja(loja_id));

insert into schema_versao (versao) values (88) on conflict do nothing;
