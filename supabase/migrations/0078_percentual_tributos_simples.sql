-- Sakura System — AutoCenter Edition
-- Migration 0078: o percentual dos tributos do Simples, por loja (#866).
--
-- O PROBLEMA. A NFS-e Nacional (a da loja do Simples, PR #839) exige o grupo
-- totTrib: sem ele o Ambiente Nacional recusa a nota (ensaio de 03/11). Pro
-- optante do Simples, o que vai ali é o pTotTribSN, o percentual aproximado
-- dos tributos que a empresa paga no Simples. Esse número muda de empresa pra
-- empresa (depende da faixa do faturamento) e quem sabe é a contabilidade, não
-- o sistema. Até aqui o programa mandava 0 fixo, provisório.
--
-- A DECISÃO (Sofia, 04/11/2026). Uma coluna nos Dados fiscais da loja:
--   • `percentual_tributos_simples`, de 0 a 100, com duas casas — a mesma
--     precisão da `aliquota_iss` (0048);
--   • opcional: vazio manda 0 na nota, pra não travar a emissão de quem
--     ainda não recebeu o número da contabilidade;
--   • só é usada na NFS-e Nacional, e só pela loja do Simples. NFC-e e a
--     NFS-e municipal não leem.
--
-- ORDEM DE SUBIR. Coluna nova e opcional: esta migration sobe ANTES da
-- versão do programa, como as outras (o programa antigo nem sabe que ela
-- existe). Por isso não declara versão mínima do programa.
--
-- A trava tem nome `ck_<tabela>_<regra>` porque a tela traduz cada uma numa
-- frase em português (src/lib/errors.ts). Coluna nova nasce vazia, então
-- nenhum dado que já existe pode ficar fora da regra.
--
-- Idempotente: seguro rodar de novo.

alter table configuracoes_fiscais_loja
  add column if not exists percentual_tributos_simples numeric(5,2);

alter table configuracoes_fiscais_loja
  drop constraint if exists ck_config_fiscal_percentual_tributos_simples;
alter table configuracoes_fiscais_loja
  add constraint ck_config_fiscal_percentual_tributos_simples
  check (percentual_tributos_simples between 0 and 100);

comment on column configuracoes_fiscais_loja.percentual_tributos_simples is
  'Percentual aproximado dos tributos do Simples (pTotTribSN da NFS-e Nacional), de 0 a 100. Vem da contabilidade. Vazio: a nota vai com 0.';

insert into schema_versao (versao) values (78) on conflict do nothing;
