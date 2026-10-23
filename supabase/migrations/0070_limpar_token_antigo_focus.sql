-- Sakura System — AutoCenter Edition
-- Migration 0070: apagar a cópia antiga do token da Focus NFe — item TR-04.2,
-- parte 2 de 2 (tarefa #368).
--
-- O problema. Desde a 0057 o token mora no cofre `segredos_fiscais_loja`, que
-- nenhum operador lê, e quem emite e cancela é o porteiro (Edge Function
-- `focus-nfe`). Mas a cópia de antes continuou em
-- `configuracoes_fiscais_loja.focus_nfe_token`, uma coluna comum: qualquer
-- operador da loja, balconista incluído, ainda lia o token pela API, com a
-- chave que está no computador dele. Ou seja, o cofre só protegia de verdade
-- depois desta parte 2.
--
-- Por que agora. A 0057 combinou limpar a coluna só depois de uma nota
-- emitida e uma cancelada de verdade pelo porteiro. Isso foi cumprido em
-- 28/09/2026 (NFS-e 22, emitida e cancelada na loja).
--
-- O que esta migration faz:
--   1. REDE DE SEGURANÇA: copia pro cofre o token de qualquer loja que ainda
--      só o tenha na coluna (por exemplo, colado por um computador antigo
--      depois da 0057). Se a loja já tem token no cofre, o do cofre fica: a
--      cópia antiga nunca passa por cima (mesma regra da seção 2 da 0057);
--   2. apaga o conteúdo da coluna antiga (fica `null`);
--   3. deixa um comentário na coluna dizendo que ela está vazia de propósito.
--
-- A COLUNA NÃO SAI AQUI. Pela regra de "Voltar uma versão"
-- (docs/operacao.md), coluna em uso não some na mesma versão que deixa de ser
-- usada. Ela sai numa migration seguinte, quando nenhum computador antigo
-- puder mais escrever nela.
--
-- ORDEM DE SUBIR. Abaixo da v0.9.41 o programa lê o token desta coluna e
-- chama a Focus NFe direto: com a coluna vazia, esse computador para de
-- emitir nota. Por isso a linha abaixo — o botão "Atualizar o banco de todas
-- as empresas" espera todos os computadores em uso estarem na v0.9.41 ou
-- mais nova (a que passou a emitir pelo porteiro).
-- versao-minima-do-programa: 0.9.41
--
-- A trilha de auditoria (0053) registra o `update` abaixo com a coluna
-- mascarada: `focus_nfe_token` sai como '***' no "antes" e `null` no
-- "depois". O token não cai na tabela `auditoria`.
--
-- Idempotente: seguro rodar de novo (a segunda vez não acha nada pra copiar
-- nem pra apagar).

-- ===================================================================
-- 1. Rede de segurança: nenhuma loja perde a emissão
-- ===================================================================

insert into segredos_fiscais_loja (loja_id, focus_nfe_token)
select loja_id, btrim(focus_nfe_token)
  from configuracoes_fiscais_loja
 where focus_nfe_token is not null
   and btrim(focus_nfe_token) <> ''
on conflict (loja_id) do nothing;

-- ===================================================================
-- 2. Apagar a cópia antiga
-- ===================================================================

update configuracoes_fiscais_loja
   set focus_nfe_token = null
 where focus_nfe_token is not null;

-- ===================================================================
-- 3. Avisar quem olhar a coluna
-- ===================================================================

comment on column configuracoes_fiscais_loja.focus_nfe_token is
  'TR-04.2. VAZIA DE PROPÓSITO desde a migration 0070: o token da Focus NFe '
  'mora no cofre segredos_fiscais_loja (0057) e quem usa é o porteiro '
  '(Edge Function focus-nfe). Não gravar nada aqui — qualquer operador da '
  'loja lê esta coluna. Ela sai numa versão seguinte.';

insert into schema_versao (versao) values (70) on conflict do nothing;
