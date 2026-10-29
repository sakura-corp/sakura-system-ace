-- ===================================================================
-- SONDAS DE INSERT DA MATRIZ DE RLS  (item TR-07.3)
-- ===================================================================
--
-- ⚠️  NUNCA rodar no Supabase de verdade — faz parte do banco descartável de
--     `npm run test:rls`, junto com cenario.sql.
--
-- Uma linha por tabela, com a MENOR inserção válida possível apontando pra
-- **loja A** (quando a tabela tem dono). O runner executa cada uma como cada
-- um dos cinco papéis e conta quantas linhas entraram: 1 = a RLS deixou,
-- 0 = a RLS recusou.
--
-- Por que a inserção mínima: qualquer coluna a mais vira chance de o teste
-- falhar por NOT NULL ou CHECK e **parecer** que foi a RLS que bloqueou —
-- que é exatamente a confusão que este teste existe pra evitar. O runner
-- separa os dois casos pelo código de erro do Postgres (42501 é RLS;
-- qualquer outro estoura a rodada em vez de virar um zero silencioso).
--
-- Se uma migration nova criar tabela com RLS, ela precisa de linha aqui —
-- o runner reprova quando encontra tabela sem sonda. Vale pras VIEWS também:
-- uma view simples é auto-atualizável, então escrever por dentro dela é uma
-- pergunta de verdade, e a matriz mede a resposta.
-- ===================================================================

create schema if not exists teste_rls;

drop table if exists teste_rls.sondas;
create table teste_rls.sondas (
  tabela    text primary key,
  insercao  text not null
);

insert into teste_rls.sondas (tabela, insercao) values

-- ---------- catálogo compartilhado ---------------------------------------
('categorias',            $$insert into categorias (nome) values ('Sonda')$$),
('categorias_servicos',   $$insert into categorias_servicos (nome) values ('Sonda')$$),
('categorias_caixa',      $$insert into categorias_caixa (nome, tipo) values ('Sonda', 'entrada')$$),
('clientes',              $$insert into clientes (nome) values ('Cliente sonda')$$),
('veiculos',              $$insert into veiculos (cliente_id, placa) values ('cccccccc-0000-0000-0000-0000000000aa', 'SON1D01')$$),
('pecas',                 $$insert into pecas (descricao) values ('Peça sonda')$$),
('servicos',              $$insert into servicos (descricao) values ('Serviço sonda')$$),
('fornecedores',          $$insert into fornecedores (nome) values ('Fornecedor sonda')$$),
('cotacoes_pecas',        $$insert into cotacoes_pecas (peca_id, fornecedor_id, preco) values ('eeeeeeee-0000-0000-0000-0000000000aa', 'ffffffff-0000-0000-0000-0000000000aa', 1.00)$$),

-- ---------- dado de negócio da loja A ------------------------------------
('depositos',             $$insert into depositos (loja_id, nome) values ('11111111-1111-1111-1111-1111111111aa', 'Depósito sonda')$$),
('funcionarios',          $$insert into funcionarios (loja_id, nome) values ('11111111-1111-1111-1111-1111111111aa', 'Funcionário sonda')$$),
('funcionario_filhos',    $$insert into funcionario_filhos (funcionario_id, nome) values ('33333333-0000-0000-0000-0000000000aa', 'Filho sonda')$$),
-- A view do TR-04.3. Ela passa por cima da RLS (security_invoker = false), e
-- o que impede de escrever na tabela base por dentro dela é só o `revoke` da
-- migration 0056 — esta sonda é o que prova que o revoke está lá.
('funcionarios_publico',  $$insert into funcionarios_publico (loja_id, nome) values ('11111111-1111-1111-1111-1111111111aa', 'Sonda pela view')$$),
('clientes_janela',      $$insert into clientes_janela (nome) values ('Sonda pela janela')$$),
('veiculos_janela',      $$insert into veiculos_janela (cliente_id, placa) values ('cccccccc-0000-0000-0000-0000000000aa', 'JAN1E01')$$),
('pecas_janela',          $$insert into pecas_janela (descricao) values ('Sonda pela janela')$$),
-- O saldo (0073) tem GROUP BY: nem o dono escreve por ele. A sonda existe pra
-- a matriz medir isso a cada rodada, como nas outras views.
('estoque_saldos',        $$insert into estoque_saldos (peca_id, loja_id) values ('eeeeeeee-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa')$$),
-- As cinco janelas das OS (0075). As três primeiras são views simples (o
-- Postgres saberia escrever por elas: quem barra é o revoke); as das Garantias
-- e de Clientes têm join e nem o dono escreve por elas.
('ordens_servico_caixa',     $$insert into ordens_servico_caixa (loja_id, numero) values ('11111111-1111-1111-1111-1111111111aa', 901)$$),
('ordens_servico_comissoes', $$insert into ordens_servico_comissoes (loja_id, numero, status) values ('11111111-1111-1111-1111-1111111111aa', 902, 'faturada')$$),
('ordens_servico_garantias', $$insert into ordens_servico_garantias (quantidade) values (1)$$),
('ordens_servico_notas',     $$insert into ordens_servico_notas (loja_id, numero) values ('11111111-1111-1111-1111-1111111111aa', 903)$$),
('ordens_servico_clientes',  $$insert into ordens_servico_clientes (loja_id, numero) values ('11111111-1111-1111-1111-1111111111aa', 904)$$),
('ordens_servico',        $$insert into ordens_servico (numero, loja_id, cliente_id) values (900, '11111111-1111-1111-1111-1111111111aa', 'cccccccc-0000-0000-0000-0000000000aa')$$),
('ordens_servico_itens',  $$insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade) values ('44444444-0000-0000-0000-0000000000aa', 'servico', 'Item sonda', 1)$$),
('caixa_movimentos',      $$insert into caixa_movimentos (loja_id, tipo, valor) values ('11111111-1111-1111-1111-1111111111aa', 'entrada', 1.00)$$),
('fechamentos_caixa',     $$insert into fechamentos_caixa (loja_id, data, saldo_sistema, valor_contado, diferenca) values ('11111111-1111-1111-1111-1111111111aa', current_date, 1.00, 1.00, 0)$$),
('comissoes_fechamentos', $$insert into comissoes_fechamentos (loja_id, funcionario_id, funcionario_nome, periodo_inicio, periodo_fim, valor_calculado, valor_pago, data_pagamento) values ('11111111-1111-1111-1111-1111111111aa', '33333333-0000-0000-0000-0000000000aa', 'Funcionário A', '2026-09-01', '2026-09-30', 1.00, 1.00, '2026-10-05')$$),
('estoque_movimentos',    $$insert into estoque_movimentos (loja_id, deposito_id, peca_id, tipo, quantidade, motivo) values ('11111111-1111-1111-1111-1111111111aa', '22222222-0000-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 'entrada', 1, 'ajuste')$$),
('contagens_estoque',     $$insert into contagens_estoque (loja_id, deposito_id, peca_id, quantidade_contada, saldo_sistema, diferenca) values ('11111111-1111-1111-1111-1111111111aa', '22222222-0000-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 1, 1, 0)$$),
('contas_pagar',          $$insert into contas_pagar (loja_id, descricao, valor, vencimento) values ('11111111-1111-1111-1111-1111111111aa', 'Conta sonda', 1.00, current_date)$$),
('contas_receber',        $$insert into contas_receber (loja_id, cliente_id, descricao, valor, vencimento) values ('11111111-1111-1111-1111-1111111111aa', 'cccccccc-0000-0000-0000-0000000000aa', 'Receber sonda', 1.00, current_date)$$),
('notas_fiscais_arquivos',$$insert into notas_fiscais_arquivos (loja_id, tipo, competencia, nome_arquivo, storage_path) values ('11111111-1111-1111-1111-1111111111aa', 'nfe', date_trunc('month', current_date), 'sonda.xml', 'nfe/sonda.xml')$$),
('pedidos_compra',        $$insert into pedidos_compra (numero, loja_id, fornecedor_id) values (900, '11111111-1111-1111-1111-1111111111aa', 'ffffffff-0000-0000-0000-0000000000aa')$$),
('pedidos_compra_itens',  $$insert into pedidos_compra_itens (pedido_compra_id, peca_id, quantidade_pedida) values ('99999999-0000-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 1)$$),
('whatsapp_mensagens',    $$insert into whatsapp_mensagens (loja_id, chave) values ('11111111-1111-1111-1111-1111111111aa', 'cobranca')$$),

-- ---------- configurações da loja A --------------------------------------
-- As duas de chave composta usam uma chave livre (12 parcelas / outro modelo
-- de mensagem); as três de chave simples usam a loja A, que o cenário deixou
-- de propósito sem linha.
('configuracoes_juros_parcelas', $$insert into configuracoes_juros_parcelas (loja_id, numero_parcelas, juros_percentual) values ('11111111-1111-1111-1111-1111111111aa', 12, 5.0)$$),
('configuracoes_whatsapp',       $$insert into configuracoes_whatsapp (loja_id, chave, texto) values ('11111111-1111-1111-1111-1111111111aa', 'carro_pronto', 'Sonda')$$),
('configuracoes_garantia',       $$insert into configuracoes_garantia (loja_id, texto) values ('11111111-1111-1111-1111-1111111111aa', 'Sonda')$$),
('configuracoes_fiscais_loja',   $$insert into configuracoes_fiscais_loja (loja_id) values ('11111111-1111-1111-1111-1111111111aa')$$),
('configuracoes_painel_inicio',  $$insert into configuracoes_painel_inicio (loja_id, cartoes) values ('11111111-1111-1111-1111-1111111111aa', array['vendas_mes'])$$),
-- O cofre do TR-04.2: nem o admin da loja escreve direto aqui — só pela
-- função definir_token_focus_nfe(). Esta sonda é o que prova isso.
('segredos_fiscais_loja',        $$insert into segredos_fiscais_loja (loja_id, focus_nfe_token) values ('11111111-1111-1111-1111-1111111111aa', 'sonda')$$),

-- ---------- administração -------------------------------------------------
('lojas',          $$insert into lojas (nome) values ('Loja sonda')$$),
('operadores',     $$insert into operadores (id, usuario, nome) values ('00000000-9999-9999-9999-999999999999', 'sonda', 'Operador sonda')$$),
-- Dar à mão acesso da loja A pro operador órfão: é a ação real que esta
-- policy governa, e a que criou o beco sem saída do §6 item 23.
('operador_lojas', $$insert into operador_lojas (operador_id, loja_id) values ('aaaaaaaa-4444-4444-4444-444444444444', '11111111-1111-1111-1111-1111111111aa')$$),
-- A trilha não tem policy de insert pra ninguém, de propósito: só a função
-- de gatilho grava. Esta sonda é o que prova isso a cada rodada.
('auditoria',      $$insert into auditoria (tabela, registro_id, acao) values ('clientes', 'cccccccc-0000-0000-0000-0000000000aa', 'criar')$$),

-- ---------- computadores (ninguém grava direto, nem o dono) --------------
-- Gravar é só por registrar_computador(); esta sonda prova que a tabela em
-- si não aceita insert de ninguém.
('computadores',   $$insert into computadores (id, versao_app, loja_id) values ('cccc0000-0000-0000-0000-0000000000ff', '0.9.44', '11111111-1111-1111-1111-1111111111aa')$$),

-- ---------- versão do esquema (ninguém escreve pela API) ------------------
-- 900 é um número que o cenário não usa: chave duplicada aqui viraria um erro
-- que se parece com "a RLS bloqueou", que é a confusão que este teste evita.
('schema_versao',  $$insert into schema_versao (versao) values (900)$$);
