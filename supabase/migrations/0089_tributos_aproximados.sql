-- Sakura System — AutoCenter Edition
-- Migration 0089: os tributos aproximados na nota, pela alíquota do Simples (#1040).
--
-- O PROBLEMA. A Lei 12.741/2012 (a "Lei da Transparência") manda a nota
-- dizer quanto, mais ou menos, do valor pago é imposto. Pra loja do Simples,
-- o número certo é a alíquota efetiva do Simples do mês, que muda com o
-- faturamento dos últimos 12 meses e que quem calcula é a contabilidade, não
-- o sistema. O serviço e a peça caem em anexos diferentes do Simples (serviço
-- no Anexo III, peça no Anexo I), então são dois números. E a peça com
-- substituição tributária (CSOSN 500) já teve o ICMS pago antes, na compra:
-- esse pedaço não está na alíquota do Simples e entra como uma estimativa à
-- parte.
--
-- A DECISÃO (#1040). Três colunas novas nos Dados fiscais da loja:
--   • `percentual_tributos_pecas`, a alíquota efetiva do Anexo I (peças);
--   • `percentual_estimativa_icms_st`, a estimativa do ICMS-ST, somada só
--     nas peças com CSOSN 500;
--   • `competencia_tributos_confirmada`, o mês (sempre no dia 1º) em que a
--     loja conferiu esses números, do mesmo jeito da
--     `competencia_aliquota_confirmada` (0049): diferente do mês corrente, o
--     Início avisa. É aviso, nunca tranca: a nota sai com o último número
--     salvo.
-- O percentual do SERVIÇO não ganha coluna nova: é a
-- `percentual_tributos_simples` (0078), o mesmo número do Anexo III que já
-- vai no pTotTribSN da NFS-e Nacional.
--
-- Os dois percentuais vão de 0 a 100, com duas casas (a mesma precisão da
-- 0078). Tudo opcional: vazio = a nota sai sem a linha dos tributos, pra não
-- travar a emissão de quem ainda não recebeu os números da contabilidade.
--
-- ORDEM DE SUBIR. Colunas novas e opcionais: esta migration sobe ANTES da
-- versão do programa, como as outras (o programa antigo nem sabe que elas
-- existem). Por isso não declara versão mínima do programa. Era a 0087;
-- renumerada pra 0089 em 18/11 (a 0087 é do #1120 e a 0088 do #1121; aplicar
-- depois delas: o botão de atualizar só roda as de número maior que o do banco).
--
-- As travas têm nome `ck_<tabela>_<regra>` porque a tela traduz cada uma numa
-- frase em português (src/lib/errors.ts). Coluna nova nasce vazia, então
-- nenhum dado que já existe pode ficar fora da regra.
--
-- Idempotente: seguro rodar de novo.

alter table configuracoes_fiscais_loja
  add column if not exists percentual_tributos_pecas numeric(5,2),
  add column if not exists percentual_estimativa_icms_st numeric(5,2),
  add column if not exists competencia_tributos_confirmada date;

alter table configuracoes_fiscais_loja
  drop constraint if exists ck_config_fiscal_percentual_tributos_pecas;
alter table configuracoes_fiscais_loja
  add constraint ck_config_fiscal_percentual_tributos_pecas
  check (percentual_tributos_pecas between 0 and 100);

alter table configuracoes_fiscais_loja
  drop constraint if exists ck_config_fiscal_percentual_estimativa_icms_st;
alter table configuracoes_fiscais_loja
  add constraint ck_config_fiscal_percentual_estimativa_icms_st
  check (percentual_estimativa_icms_st between 0 and 100);

comment on column configuracoes_fiscais_loja.percentual_tributos_pecas is
  'Alíquota efetiva do Simples das peças (Anexo I), de 0 a 100, pros tributos aproximados da nota (Lei 12.741/2012). Vem da contabilidade. Vazio: a nota sai sem a linha.';
comment on column configuracoes_fiscais_loja.percentual_estimativa_icms_st is
  'Estimativa do ICMS-ST, de 0 a 100, somada aos tributos aproximados só nas peças com CSOSN 500. Vem da contabilidade. Vazio: não soma nada.';
comment on column configuracoes_fiscais_loja.competencia_tributos_confirmada is
  'O mês (sempre no dia 1º) em que a loja conferiu os percentuais dos tributos aproximados. Diferente do mês corrente, o Início avisa; a nota sai com o último número salvo.';

insert into schema_versao (versao) values (89) on conflict do nothing;
