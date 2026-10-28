-- ===================================================================
-- CENÁRIO FIXO DA MATRIZ DE RLS  (item TR-07.3 do guia de melhorias)
-- ===================================================================
--
-- ⚠️  NUNCA rodar isto no Supabase de verdade. Ele APAGA TUDO (truncate em
--     todas as tabelas) e planta dado de teste no lugar. Serve só pro banco
--     descartável que `npm run test:rls` cria e joga fora.
--
-- O que ele monta, e por que cada peça existe:
--
--   • DUAS lojas da MESMA empresa (A e B). Empresa diferente não entra aqui:
--     cada empresa tem projeto Supabase próprio (seção 1 do PROJETO_STATUS),
--     então "vazar pra outra empresa" não é algo que a RLS possa causar.
--
--   • CINCO papéis, que são as colunas do arquivo de expectativas:
--       admin_ab  admin das duas lojas   (o dono/gerente)
--       admin_a   admin só da loja A     (gerente de uma loja só)
--       caixa_a   balconista da loja A, permissão só de Caixa
--       orfao     operador SEM loja nenhuma — o caso do §6 item 23, que
--                 ninguém consegue editar nem inativar pela tela
--       sem_login papel `anon`, sem sessão: é o que a RLS existe pra fechar
--
--   • Uma quantidade PEQUENA e REDONDA de dado em cada tabela, pra que o
--     número na planilha de expectativas se leia sozinho: tabela compartilhada
--     tem 2 linhas; tabela por loja tem 1 na loja A e 1 na loja B. Assim
--     "2,1,1,0,0" quer dizer, lendo da esquerda pra direita, "o dono vê as
--     duas, quem é da loja A vê a dele, o órfão e quem não logou não veem
--     nada" — sem precisar abrir o banco.
--
-- Três decisões que parecem estranhas e não são:
--
--   1. `configuracoes_garantia`, `configuracoes_fiscais_loja`,
--      `configuracoes_painel_inicio` e `segredos_fiscais_loja` têm linha só
--      na loja B, de propósito.
--      A chave primária delas é o `loja_id` sozinho, então, com a loja A já
--      ocupada, a sonda de INSERT bateria na chave duplicada — e um erro de
--      chave se pareceria com "a RLS bloqueou", que é justamente a confusão
--      que este teste existe pra não deixar acontecer.
--   2. `auditoria` recebe uma linha plantada à mão. Sem ela, a leitura daria
--      zero pra todo mundo e o teste não distinguiria admin de balconista.
--   3. Os UUIDs são fixos e falantes (…aa = loja A, …bb = loja B). Facilita
--      ler a saída quando alguma checagem reprova.
-- ===================================================================

-- `replica` desliga trigger e conferência de chave estrangeira. Aqui é só pra
-- o truncate/insert não depender da ordem das tabelas e pra o gatilho de
-- auditoria não encher o banco de linha que não faz parte do cenário.
set session_replication_role = replica;

truncate table
  computadores, schema_versao, auditoria, fechamentos_caixa, comissoes_fechamentos, whatsapp_mensagens, configuracoes_whatsapp,
  configuracoes_juros_parcelas, configuracoes_painel_inicio,
  configuracoes_fiscais_loja, configuracoes_garantia, segredos_fiscais_loja,
  cotacoes_pecas, pedidos_compra_itens, pedidos_compra,
  notas_fiscais_arquivos, contas_receber, contas_pagar,
  contagens_estoque, estoque_movimentos, caixa_movimentos,
  ordens_servico_itens, ordens_servico, funcionario_filhos, funcionarios,
  depositos, veiculos, clientes, pecas, servicos, fornecedores,
  categorias, categorias_servicos, categorias_caixa,
  operador_lojas, operadores, lojas
  restart identity cascade;

truncate table auth.users cascade;

-- ---------- as duas lojas -------------------------------------------------
insert into lojas (id, nome, cidade, uf, ativo) values
  ('11111111-1111-1111-1111-1111111111aa', 'Loja A', 'Araraquara', 'SP', true),
  ('11111111-1111-1111-1111-1111111111bb', 'Loja B', 'Araraquara', 'SP', true);

-- ---------- os quatro operadores que logam -------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'admin_ab@sakura.local'),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'admin_a@sakura.local'),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'caixa_a@sakura.local'),
  ('aaaaaaaa-4444-4444-4444-444444444444', 'orfao@sakura.local');

insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'admin_ab', 'Dona das duas lojas', true,  array['painel'],          true),
  ('aaaaaaaa-2222-2222-2222-222222222222', 'admin_a',  'Gerente da loja A',   true,  array['painel'],          true),
  ('aaaaaaaa-3333-3333-3333-333333333333', 'caixa_a',  'Balconista da loja A',false, array['painel','caixa'],  true),
  ('aaaaaaaa-4444-4444-4444-444444444444', 'orfao',    'Operador sem loja',   false, array['painel','caixa'],  true);

insert into operador_lojas (operador_id, loja_id) values
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-1111111111aa'),
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-1111111111bb'),
  ('aaaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-1111111111aa'),
  ('aaaaaaaa-3333-3333-3333-333333333333', '11111111-1111-1111-1111-1111111111aa');
-- O órfão NÃO ganha linha aqui. É o cenário inteiro dele.

-- ---------- catálogo compartilhado (2 linhas cada) ------------------------
-- Sem `loja_id`: é uma decisão de produto (catálogo único pra empresa toda,
-- seção 3 do PROJETO_STATUS), e a matriz mostra a consequência — inclusive
-- pro órfão, que enxerga tudo isto.
insert into categorias (id, nome) values
  ('dddddddd-0000-0000-0000-0000000000aa', 'Categoria 1'),
  ('dddddddd-0000-0000-0000-0000000000bb', 'Categoria 2');

insert into categorias_servicos (id, nome) values
  ('dddddddd-1111-0000-0000-0000000000aa', 'Serviços 1'),
  ('dddddddd-1111-0000-0000-0000000000bb', 'Serviços 2');

insert into categorias_caixa (id, nome, tipo) values
  ('dddddddd-2222-0000-0000-0000000000aa', 'Entradas diversas', 'entrada'),
  ('dddddddd-2222-0000-0000-0000000000bb', 'Saídas diversas',   'saida');

insert into clientes (id, nome, tipo_pessoa) values
  ('cccccccc-0000-0000-0000-0000000000aa', 'Cliente 1', 'fisica'),
  ('cccccccc-0000-0000-0000-0000000000bb', 'Cliente 2', 'fisica');

insert into veiculos (id, cliente_id, placa) values
  ('cccccccc-1111-0000-0000-0000000000aa', 'cccccccc-0000-0000-0000-0000000000aa', 'AAA1A11'),
  ('cccccccc-1111-0000-0000-0000000000bb', 'cccccccc-0000-0000-0000-0000000000bb', 'BBB2B22');

insert into pecas (id, descricao, ativo) values
  ('eeeeeeee-0000-0000-0000-0000000000aa', 'Peça 1', true),
  ('eeeeeeee-0000-0000-0000-0000000000bb', 'Peça 2', true);

insert into servicos (id, descricao, ativo) values
  ('eeeeeeee-1111-0000-0000-0000000000aa', 'Serviço 1', true),
  ('eeeeeeee-1111-0000-0000-0000000000bb', 'Serviço 2', true);

insert into fornecedores (id, nome, ativo) values
  ('ffffffff-0000-0000-0000-0000000000aa', 'Fornecedor 1', true),
  ('ffffffff-0000-0000-0000-0000000000bb', 'Fornecedor 2', true);

insert into cotacoes_pecas (id, peca_id, fornecedor_id, preco) values
  ('ffffffff-1111-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 'ffffffff-0000-0000-0000-0000000000aa', 10.00),
  ('ffffffff-1111-0000-0000-0000000000bb', 'eeeeeeee-0000-0000-0000-0000000000bb', 'ffffffff-0000-0000-0000-0000000000bb', 20.00);

-- ---------- dado de negócio: 1 na loja A, 1 na loja B ---------------------
insert into depositos (id, loja_id, nome, ativo) values
  ('22222222-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'Depósito A', true),
  ('22222222-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'Depósito B', true);

insert into funcionarios (id, loja_id, nome, ativo) values
  ('33333333-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'Funcionário A', true),
  ('33333333-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'Funcionário B', true);

-- Um pagamento de comissão de AGOSTO em cada loja: a sonda de INSERT registra
-- setembro, pra não bater na trava de um registro por funcionário por período.
insert into comissoes_fechamentos (id, loja_id, funcionario_id, funcionario_nome, periodo_inicio, periodo_fim, valor_calculado, valor_pago, data_pagamento) values
  ('33333333-1111-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', '33333333-0000-0000-0000-0000000000aa', 'Funcionário A', '2026-08-01', '2026-08-31', 10.00, 10.00, '2026-09-05'),
  ('33333333-1111-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', '33333333-0000-0000-0000-0000000000bb', 'Funcionário B', '2026-08-01', '2026-08-31', 10.00, 10.00, '2026-09-05');

insert into funcionario_filhos (id, funcionario_id, nome) values
  ('33333333-1111-0000-0000-0000000000aa', '33333333-0000-0000-0000-0000000000aa', 'Filho A'),
  ('33333333-1111-0000-0000-0000000000bb', '33333333-0000-0000-0000-0000000000bb', 'Filho B');

-- FATURADAS, e o item é uma PEÇA, desde a 0075 (#367): as janelas das
-- Comissões (só faturada) e das Garantias (uma linha por peça) dariam zero
-- pra todo mundo com uma OS aberta de serviço, e a matriz não distinguiria o
-- dono de quem não é da loja nelas.
insert into ordens_servico (id, numero, loja_id, cliente_id, status, data_fechamento) values
  ('44444444-0000-0000-0000-0000000000aa', 1, '11111111-1111-1111-1111-1111111111aa', 'cccccccc-0000-0000-0000-0000000000aa', 'faturada', now()),
  ('44444444-0000-0000-0000-0000000000bb', 1, '11111111-1111-1111-1111-1111111111bb', 'cccccccc-0000-0000-0000-0000000000bb', 'faturada', now());

insert into ordens_servico_itens (id, ordem_servico_id, tipo, descricao, quantidade, preco_unitario) values
  ('44444444-1111-0000-0000-0000000000aa', '44444444-0000-0000-0000-0000000000aa', 'peca', 'Item da OS da loja A', 1, 100.00),
  ('44444444-1111-0000-0000-0000000000bb', '44444444-0000-0000-0000-0000000000bb', 'peca', 'Item da OS da loja B', 1, 100.00);

insert into caixa_movimentos (id, loja_id, tipo, valor, descricao) values
  ('55555555-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'entrada', 100.00, 'Movimento da loja A'),
  ('55555555-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'entrada', 100.00, 'Movimento da loja B');

-- Fechamento de ONTEM nas duas lojas: a sonda de INSERT fecha HOJE, pra não
-- bater na trava de um fechamento por loja por dia.
insert into fechamentos_caixa (id, loja_id, data, saldo_sistema, valor_contado, diferenca) values
  ('55555555-1111-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', current_date - 1, 100.00, 100.00, 0),
  ('55555555-1111-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', current_date - 1, 100.00, 100.00, 0);

insert into estoque_movimentos (id, loja_id, deposito_id, peca_id, tipo, quantidade, motivo) values
  ('66666666-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', '22222222-0000-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 'entrada', 1, 'compra'),
  ('66666666-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', '22222222-0000-0000-0000-0000000000bb', 'eeeeeeee-0000-0000-0000-0000000000bb', 'entrada', 1, 'compra');

insert into contagens_estoque (id, loja_id, deposito_id, peca_id, quantidade_contada, saldo_sistema, diferenca) values
  ('66666666-1111-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', '22222222-0000-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 1, 1, 0),
  ('66666666-1111-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', '22222222-0000-0000-0000-0000000000bb', 'eeeeeeee-0000-0000-0000-0000000000bb', 1, 1, 0);

insert into contas_pagar (id, loja_id, descricao, valor, vencimento) values
  ('77777777-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'Conta da loja A', 50.00, current_date),
  ('77777777-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'Conta da loja B', 50.00, current_date);

insert into contas_receber (id, loja_id, cliente_id, descricao, valor, vencimento) values
  ('77777777-1111-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'cccccccc-0000-0000-0000-0000000000aa', 'A receber da loja A', 50.00, current_date),
  ('77777777-1111-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'cccccccc-0000-0000-0000-0000000000bb', 'A receber da loja B', 50.00, current_date);

insert into notas_fiscais_arquivos (id, loja_id, tipo, competencia, nome_arquivo, storage_path) values
  ('88888888-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'nfe', date_trunc('month', current_date), 'a.xml', 'nfe/a.xml'),
  ('88888888-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'nfe', date_trunc('month', current_date), 'b.xml', 'nfe/b.xml');

insert into pedidos_compra (id, numero, loja_id, fornecedor_id, status) values
  ('99999999-0000-0000-0000-0000000000aa', 1, '11111111-1111-1111-1111-1111111111aa', 'ffffffff-0000-0000-0000-0000000000aa', 'pendente'),
  ('99999999-0000-0000-0000-0000000000bb', 1, '11111111-1111-1111-1111-1111111111bb', 'ffffffff-0000-0000-0000-0000000000bb', 'pendente');

insert into pedidos_compra_itens (id, pedido_compra_id, peca_id, quantidade_pedida) values
  ('99999999-1111-0000-0000-0000000000aa', '99999999-0000-0000-0000-0000000000aa', 'eeeeeeee-0000-0000-0000-0000000000aa', 1),
  ('99999999-1111-0000-0000-0000000000bb', '99999999-0000-0000-0000-0000000000bb', 'eeeeeeee-0000-0000-0000-0000000000bb', 1);

insert into whatsapp_mensagens (id, loja_id, chave, destino) values
  ('aaaa0000-0000-0000-0000-0000000000aa', '11111111-1111-1111-1111-1111111111aa', 'cobranca', '5516999990000'),
  ('aaaa0000-0000-0000-0000-0000000000bb', '11111111-1111-1111-1111-1111111111bb', 'cobranca', '5516999990001');

-- ---------- configurações por loja ---------------------------------------
-- Estas duas têm chave composta, então sobra espaço na loja A pra sonda de
-- INSERT usar outra parcela / outra chave. Recebem linha nas duas lojas.
insert into configuracoes_juros_parcelas (loja_id, numero_parcelas, juros_percentual) values
  ('11111111-1111-1111-1111-1111111111aa', 2, 1.5),
  ('11111111-1111-1111-1111-1111111111bb', 2, 1.5);

insert into configuracoes_whatsapp (loja_id, chave, texto) values
  ('11111111-1111-1111-1111-1111111111aa', 'cobranca', 'Texto da loja A'),
  ('11111111-1111-1111-1111-1111111111bb', 'cobranca', 'Texto da loja B');

-- E estas quatro têm o `loja_id` como chave primária inteira: recebem linha SÓ
-- na loja B, pra deixar a loja A livre pra sonda de INSERT (ver o item 1 do
-- cabeçalho). É por isso que a leitura delas na matriz é "1,0,0,0,0".
insert into configuracoes_garantia (loja_id, texto) values
  ('11111111-1111-1111-1111-1111111111bb', 'Garantia da loja B');

insert into configuracoes_fiscais_loja (loja_id, cnpj, razao_social) values
  ('11111111-1111-1111-1111-1111111111bb', '00000000000000', 'Loja B Ltda');

insert into configuracoes_painel_inicio (loja_id, cartoes) values
  ('11111111-1111-1111-1111-1111111111bb', array['vendas_mes']);

-- O cofre do token da Focus NFe (TR-04.2). Tem linha na loja B pra que o
-- "0" do dono na leitura queira dizer "a tabela recusou", e não "estava
-- vazia" — o dono tem acesso à loja B em toda outra tabela da matriz.
insert into segredos_fiscais_loja (loja_id, focus_nfe_token) values
  ('11111111-1111-1111-1111-1111111111bb', 'token-de-mentira-naopodevazar');

-- ---------- um computador em cada loja (migration 0063) -------------------
-- A leitura e o "esquecer" são do admin da loja em que o computador foi
-- visto por último — então é uma tabela DA LOJA, com a exceção de que nem o
-- dono grava direto: é só por registrar_computador().
insert into computadores (id, nome_maquina, versao_app, loja_id) values
  ('cccc0000-0000-0000-0000-0000000000aa', 'PC-LOJA-A', '0.9.44', '11111111-1111-1111-1111-1111111111aa'),
  ('cccc0000-0000-0000-0000-0000000000bb', 'PC-LOJA-B', '0.9.44', '11111111-1111-1111-1111-1111111111bb');

-- ---------- duas linhas de versão de esquema ------------------------------
-- A migration 0055 planta uma linha por migration já aplicada, então esta
-- tabela nasce com dezenas de linhas e ganharia mais uma a cada migration
-- nova. O cenário fixa DUAS, como em toda tabela compartilhada, pra que o
-- número no expectativas.csv signifique segurança e não "quantas migrations
-- existem hoje" — senão o arquivo que se revisa mudaria por um motivo que
-- não tem nada a ver com quem pode ver o quê, e é assim que se aprende a
-- ignorar um diff.
insert into schema_versao (versao) values (1), (2);

-- ---------- uma linha de auditoria, pra a leitura distinguir admin --------
insert into auditoria (id, tabela, registro_id, acao, operador_id, operador_nome) values
  ('bbbb0000-0000-0000-0000-0000000000aa', 'clientes',
   'cccccccc-0000-0000-0000-0000000000aa', 'atualizar',
   'aaaaaaaa-1111-1111-1111-111111111111', 'Dona das duas lojas');

reset session_replication_role;
