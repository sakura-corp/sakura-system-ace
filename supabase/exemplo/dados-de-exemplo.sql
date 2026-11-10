-- Sakura System — AutoCenter Edition
-- ============================================================================
-- DADOS DE EXEMPLO PRO SUPABASE DE TESTE DA EQUIPE
-- ============================================================================
--
-- ⛔ SÓ NO SUPABASE DE TESTE ("ssace-teste"). NUNCA no banco de uma loja.
--    Guia completo: docs/supabase-de-teste.md.
--
-- O QUE ISTO FAZ. Cria uma loja inteira de mentira, a "Autocenter Exemplo
-- (TESTE)", pra quem programa ter o que ver em cada tela: 3 funcionários,
-- 8 clientes (6 pessoas e 2 empresas, mais o "Consumidor" que já vem com a
-- instalação), 9 veículos, 12 peças com custo, preço e estoque, preço nos
-- serviços padrão, 2 fornecedores, 14 ordens de serviço e vendas de balcão (2 antigas, de clientes que "sumiram")
-- em todas as fases (em andamento, concluída, faturada à vista, dividida,
-- parcelada no cartão, a prazo), uma peça avulsa (sem cadastro), 2 orçamentos
-- (um aberto e um recusado), lançamentos de caixa, contas a pagar e a
-- receber (pagas, abertas e atrasadas), 2 fechamentos de caixa, 1 comissão
-- paga, 2 pedidos de compra (um recebido e um aberto) com as cotações, 2
-- contagens de estoque e 1 computador da loja. As datas são contadas a partir do dia
-- em que o script roda, então a loja sempre parece "de agora".
--
-- TUDO É FICTÍCIO. Nome, CPF, CNPJ, telefone, e-mail e endereço foram
-- inventados (os CPFs e CNPJs têm dígito verificador certo só pra parecerem
-- de verdade; os e-mails são @example.com, domínio reservado pra exemplo).
-- A loja NÃO tem token da Focus NFe nem CSC, e fica em "homologacao".
--
-- PODE RODAR DE NOVO. Todo registro tem um ID fixo, que começa com "eeee", e
-- entra com `on conflict do nothing`: rodar duas vezes não duplica nada, e
-- rodar depois de o script ganhar dados novos só acrescenta o que falta.
-- (Testado: supabase/scripts/testar-dados-de-exemplo.sql.)
--
-- A TRAVA. Antes de gravar qualquer coisa, o script confere se o banco tem
-- cara de banco de loja e, se tiver, para com erro e não grava NADA:
--   • tem token da Focus NFe guardado (cofre) ou loja em "producao";
--   • tem nota fiscal registrada;
--   • tem ordem de serviço numa loja que não é a de exemplo;
--   • ainda não tem a loja de exemplo, mas já tem cliente cadastrado
--     (fora o "Consumidor") — ou seja, é um banco que já está em uso.
--
-- COMO RODAR: SQL Editor do projeto "ssace-teste" → New query → colar tudo
-- → Run. Leva poucos segundos. No fim aparece "Dados de exemplo prontos".
-- Pra apagar e recomeçar: supabase/exemplo/apagar-dados-de-exemplo.sql.
--
-- ATENÇÃO: o script põe preço nos 17 serviços padrão que ainda estão sem
-- preço (é catálogo da empresa, não da loja). Isso o "apagar" não desfaz,
-- e não precisa: o banco é de teste.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. A trava
-- ---------------------------------------------------------------------------
do $$
declare
  loja_exemplo constant uuid := 'eeee0001-0000-4000-8000-000000000001';
  consumidor   constant uuid := '00000000-0000-0000-0000-00000000c000';
begin
  if exists (select 1 from segredos_fiscais_loja) then
    raise exception 'PAREI: este banco tem token da Focus NFe guardado. Parece banco de loja de verdade — os dados de exemplo só vão no Supabase de teste.';
  end if;
  if exists (select 1 from configuracoes_fiscais_loja where focus_nfe_ambiente = 'producao') then
    raise exception 'PAREI: este banco tem loja emitindo nota em produção. Os dados de exemplo só vão no Supabase de teste.';
  end if;
  if exists (select 1 from notas_fiscais_arquivos) then
    raise exception 'PAREI: este banco tem nota fiscal registrada. Os dados de exemplo só vão no Supabase de teste.';
  end if;
  if exists (select 1 from ordens_servico where loja_id <> loja_exemplo) then
    raise exception 'PAREI: este banco tem ordem de serviço fora da loja de exemplo. Os dados de exemplo só vão no Supabase de teste.';
  end if;
  if not exists (select 1 from lojas where id = loja_exemplo)
     and exists (select 1 from clientes where id <> consumidor) then
    raise exception 'PAREI: este banco já tem clientes cadastrados e nunca recebeu os dados de exemplo. Os dados de exemplo só vão num Supabase de teste novo.';
  end if;
  if not exists (select 1 from schema_versao) then
    raise exception 'PAREI: o banco ainda não tem o sistema instalado. Rode antes o supabase/instalacao/instalacao-completa.sql.';
  end if;
end $$;

-- Dia e hora "de loja" (horário de Brasília), contados a partir de hoje.
create or replace function pg_temp.ex_quando(dias_atras int, hora text)
returns timestamptz
language sql
stable
as $$
  -- Nunca no futuro: rodando o script cedo de manhã, as linhas "de hoje" com hora mais tarde que agora
  -- ficam 1 minuto atrás (em vez de datadas de daqui a algumas horas).
  select least((((now() at time zone 'America/Sao_Paulo')::date - dias_atras) + hora::time)
                 at time zone 'America/Sao_Paulo',
               now() - interval '1 minute');
$$;

create or replace function pg_temp.ex_dia(dias_atras int)
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date - dias_atras;
$$;

-- Total de uma OS, do mesmo jeito que o programa soma (quantidade × preço − desconto).
create or replace function pg_temp.ex_total(os uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(quantidade * preco_unitario - desconto), 0)
  from ordens_servico_itens where ordem_servico_id = os;
$$;

-- ---------------------------------------------------------------------------
-- 2. A loja, o depósito e as configurações dela
-- ---------------------------------------------------------------------------
insert into lojas (id, nome, cidade, uf, ativo) values
  ('eeee0001-0000-4000-8000-000000000001', 'Autocenter Exemplo (TESTE)', 'São Paulo', 'SP', true)
on conflict do nothing;

insert into depositos (id, loja_id, nome, ativo) values
  ('eeee0002-0000-4000-8000-000000000001', 'eeee0001-0000-4000-8000-000000000001', 'Depósito Principal', true)
on conflict do nothing;

-- Dados fiscais FICTÍCIOS, em homologação e SEM token (o token mora no cofre,
-- segredos_fiscais_loja, que este script nunca toca).
insert into configuracoes_fiscais_loja (
  loja_id, cnpj, razao_social, nome_fantasia, regime_tributario,
  cep, rua, numero, bairro, cidade, uf, telefone, email,
  focus_nfe_token, focus_nfe_ambiente, percentual_tributos_simples
) values (
  'eeee0001-0000-4000-8000-000000000001', '11.222.333/0001-81',
  'Autocenter Exemplo Ltda (TESTE)', 'Autocenter Exemplo', 'simples_nacional',
  '01000-000', 'Rua Exemplo', '100', 'Centro', 'São Paulo', 'SP',
  '(11) 90000-0000', 'contato@example.com',
  -- 6,5: percentual de exemplo dos tributos do Simples (#866, migration 0078).
  null, 'homologacao', 6.5
)
on conflict do nothing;

insert into configuracoes_garantia (loja_id, texto)
select 'eeee0001-0000-4000-8000-000000000001', texto
from configuracoes_garantia
where loja_id = '00000000-0000-0000-0000-000000000001'
on conflict do nothing;

insert into configuracoes_painel_inicio (loja_id, cartoes) values
  ('eeee0001-0000-4000-8000-000000000001', '{vendas_mes,lucro_mes,ticket_medio_mes}')
on conflict do nothing;

insert into configuracoes_juros_parcelas (loja_id, numero_parcelas, juros_percentual) values
  ('eeee0001-0000-4000-8000-000000000001', 2, 0),
  ('eeee0001-0000-4000-8000-000000000001', 3, 0),
  ('eeee0001-0000-4000-8000-000000000001', 4, 2.5),
  ('eeee0001-0000-4000-8000-000000000001', 6, 4.9)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Funcionários (sem login: aparecem como técnico e vendedor nas OS)
-- ---------------------------------------------------------------------------
insert into funcionarios (id, loja_id, nome, cargo, cpf, celular, email, cidade, estado,
                          salario, comissao, admissao, ativo) values
  ('eeee0003-0000-4000-8000-000000000001', 'eeee0001-0000-4000-8000-000000000001',
   'Marcos Ribeiro (exemplo)', 'Mecânico', '321.654.987-91', '(11) 90000-0101',
   'marcos.ribeiro@example.com', 'São Paulo', 'SP', 2800, 5, pg_temp.ex_dia(700), true),
  ('eeee0003-0000-4000-8000-000000000002', 'eeee0001-0000-4000-8000-000000000001',
   'Juliana Castro (exemplo)', 'Atendente de balcão', '456.789.123-64', '(11) 90000-0102',
   'juliana.castro@example.com', 'São Paulo', 'SP', 2200, 3, pg_temp.ex_dia(400), true),
  ('eeee0003-0000-4000-8000-000000000003', 'eeee0001-0000-4000-8000-000000000001',
   'Paulo Henrique Souza (exemplo)', 'Alinhador', '741.852.963-55', '(11) 90000-0103',
   'paulo.souza@example.com', 'São Paulo', 'SP', 2500, 5, pg_temp.ex_dia(200), true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Clientes e veículos
-- ---------------------------------------------------------------------------
insert into clientes (id, nome, tipo_pessoa, cpf_cnpj, telefone, email,
                      cep, rua, numero, bairro, cidade, uf, data_nascimento) values
  ('eeee0004-0000-4000-8000-000000000001', 'Ana Paula Ferreira', 'fisica', '111.444.777-35',
   '(11) 90000-0201', 'ana.ferreira@example.com', '01000-001', 'Rua das Acácias', '12', 'Jardim Exemplo', 'São Paulo', 'SP', '1988-03-14'),
  ('eeee0004-0000-4000-8000-000000000002', 'Carlos Eduardo Lima', 'fisica', '123.123.123-87',
   '(11) 90000-0202', 'carlos.lima@example.com', '01000-002', 'Avenida Exemplo', '450', 'Vila Teste', 'São Paulo', 'SP', '1975-11-02'),
  ('eeee0004-0000-4000-8000-000000000003', 'Fernanda Oliveira', 'fisica', '159.357.258-19',
   '(11) 90000-0203', null, null, null, null, null, 'São Paulo', 'SP', null),
  ('eeee0004-0000-4000-8000-000000000004', 'Roberto Alves', 'fisica', '852.741.963-73',
   '(11) 90000-0204', 'roberto.alves@example.com', '01000-004', 'Rua dos Ipês', '88', 'Centro', 'São Paulo', 'SP', '1962-07-21'),
  ('eeee0004-0000-4000-8000-000000000005', 'Mariana Costa', 'fisica', null,
   '(11) 90000-0205', null, null, null, null, null, null, null, null),
  ('eeee0004-0000-4000-8000-000000000006', 'José Antônio Pereira', 'fisica', null,
   '(11) 90000-0206', null, null, null, null, null, 'São Paulo', 'SP', null),
  ('eeee0004-0000-4000-8000-000000000007', 'Transportes Exemplo Ltda', 'juridica', '44.555.666/0001-81',
   '(11) 90000-0207', 'financeiro@example.com', '01000-007', 'Rodovia Exemplo', 'km 10', 'Distrito Industrial', 'São Paulo', 'SP', null),
  ('eeee0004-0000-4000-8000-000000000008', 'Mercadinho Exemplo ME', 'juridica', '77.888.999/0001-81',
   '(11) 90000-0208', null, '01000-008', 'Rua do Comércio', '301', 'Centro', 'São Paulo', 'SP', null)
on conflict do nothing;

-- Placas no formato Mercosul (AAA1A23), inventadas.
insert into veiculos (id, cliente_id, placa, marca, modelo, ano, cor, km_atual, tipo) values
  ('eeee0005-0000-4000-8000-000000000001', 'eeee0004-0000-4000-8000-000000000001', 'EXA1B23', 'Volkswagen', 'Gol', 2016, 'Prata', 98500, 'hatch'),
  ('eeee0005-0000-4000-8000-000000000002', 'eeee0004-0000-4000-8000-000000000001', 'EXA4C56', 'Honda', 'CG 160', 2021, 'Vermelha', 31200, 'moto'),
  ('eeee0005-0000-4000-8000-000000000003', 'eeee0004-0000-4000-8000-000000000002', 'EXB2D34', 'Chevrolet', 'Onix', 2020, 'Branco', 62000, 'hatch'),
  ('eeee0005-0000-4000-8000-000000000004', 'eeee0004-0000-4000-8000-000000000003', 'EXC3E45', 'Jeep', 'Renegade', 2019, 'Preto', 74300, 'suv'),
  ('eeee0005-0000-4000-8000-000000000005', 'eeee0004-0000-4000-8000-000000000004', 'EXD5F67', 'Toyota', 'Corolla', 2018, 'Cinza', 120400, 'sedan'),
  ('eeee0005-0000-4000-8000-000000000006', 'eeee0004-0000-4000-8000-000000000006', 'EXE6G78', 'Fiat', 'Strada', 2022, 'Branco', 41000, 'picape'),
  ('eeee0005-0000-4000-8000-000000000007', 'eeee0004-0000-4000-8000-000000000007', 'EXF7H89', 'Fiat', 'Fiorino', 2021, 'Branco', 88000, 'picape'),
  ('eeee0005-0000-4000-8000-000000000008', 'eeee0004-0000-4000-8000-000000000007', 'EXF8J90', 'Renault', 'Kangoo', 2017, 'Branco', 156000, 'picape'),
  ('eeee0005-0000-4000-8000-000000000009', 'eeee0004-0000-4000-8000-000000000008', 'EXG9K01', 'Hyundai', 'HB20', 2023, 'Azul', 18500, 'hatch')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Fornecedores, peças e preço dos serviços
-- ---------------------------------------------------------------------------
insert into fornecedores (id, nome, cnpj, telefone, email, cidade, uf, ativo) values
  ('eeee0007-0000-4000-8000-000000000001', 'Distribuidora de Pneus Exemplo Ltda', '00.123.456/0001-49',
   '(11) 90000-0301', 'vendas.pneus@example.com', 'São Paulo', 'SP', true),
  ('eeee0007-0000-4000-8000-000000000002', 'Autopeças Exemplo Ltda', null,
   '(11) 90000-0302', 'pedidos@example.com', 'São Paulo', 'SP', true)
on conflict do nothing;

-- A categoria é procurada pelo nome (as padrão da instalação); se alguém
-- renomeou, a peça só fica sem categoria.
insert into pecas (id, codigo_interno, descricao, unidade, preco_custo, preco_venda, ncm,
                   marca, medida, estoque_minimo, prazo_garantia_dias, categoria_id)
select v.id::uuid, v.codigo, v.descricao, 'UN', v.custo, v.venda, v.ncm,
       'Exemplo', v.medida, v.minimo, v.garantia, (select id from categorias where nome = v.categoria)
from (values
  ('eeee0006-0000-4000-8000-000000000001', 'EX-001', 'Pneu 175/70 R14 (exemplo)',      260.00, 389.90, '40111000', '175/70 R14', 4, 365, 'Pneus'),
  ('eeee0006-0000-4000-8000-000000000002', 'EX-002', 'Pneu 185/65 R15 (exemplo)',      300.00, 449.90, '40111000', '185/65 R15', 4, 365, 'Pneus'),
  ('eeee0006-0000-4000-8000-000000000003', 'EX-003', 'Pneu 205/55 R16 (exemplo)',      390.00, 579.90, '40111000', '205/55 R16', 4, 365, 'Pneus'),
  ('eeee0006-0000-4000-8000-000000000004', 'EX-004', 'Pneu moto 90/90-18 (exemplo)',   150.00, 239.90, '40114000', '90/90-18',   2, 365, 'Pneus'),
  ('eeee0006-0000-4000-8000-000000000005', 'EX-005', 'Amortecedor dianteiro (exemplo)', 210.00, 329.90, '87088000', null,        2, 180, 'Amortecedores'),
  ('eeee0006-0000-4000-8000-000000000006', 'EX-006', 'Kit batente e coifa (exemplo)',   45.00,  89.90, '87088000', null,        2,  90, 'Amortecedores'),
  ('eeee0006-0000-4000-8000-000000000007', 'EX-007', 'Pastilha de freio dianteira (exemplo)', 80.00, 149.90, '87083090', null, 3,  90, 'Freios'),
  ('eeee0006-0000-4000-8000-000000000008', 'EX-008', 'Disco de freio (par) (exemplo)', 190.00, 299.90, '87083090', null,        1, 180, 'Freios'),
  ('eeee0006-0000-4000-8000-000000000009', 'EX-009', 'Bieleta (exemplo)',               35.00,  69.90, '87088000', null,        2,  90, 'Suspensão'),
  ('eeee0006-0000-4000-8000-000000000010', 'EX-010', 'Bico de válvula (exemplo)',        2.50,   8.00, '84818099', null,       20,   0, 'Outras Peças'),
  ('eeee0006-0000-4000-8000-000000000011', 'EX-011', 'Palheta limpador 20" (exemplo)',  18.00,  35.00, '85129000', null,        4,  30, 'Outras Peças'),
  ('eeee0006-0000-4000-8000-000000000012', 'EX-012', 'Fluido de freio 500 ml (exemplo)', 14.00,  29.90, '38190000', null,        3,   0, 'Freios')
) as v(id, codigo, descricao, custo, venda, ncm, medida, minimo, garantia, categoria)
on conflict do nothing;

-- O fiscal da peça (#957): sem ele a SEFAZ recusa a NFC-e de teste ("NF-e sem
-- informação de ICMS / ISSQN"). A loja de exemplo é Simples Nacional → CSOSN
-- (regra da #864): pneu (EX-001 a 004) 500 + 5405 (substituição tributária),
-- o resto 102 + 5102.
-- O CEST (#966): o formulário de peça exige, e sem ele editar e salvar uma
-- peça de exemplo dava erro. 7 dígitos, sem ponto, pelo NCM da peça na tabela
-- do Convênio ICMS 142/2018 (pneu de carro 1600100, de moto 1600300, peças da
-- posição 8708 0107500, palheta 0105500, bico de válvula 1007900, fluido de
-- freio 2806300). É dado de mentira; a lista peça por peça está no PR da #966.
-- Só preenche o campo vazio (nunca sobrescreve) e só pega peça com algum vazio,
-- pra segunda rodada não mexer em nada (nem na auditoria).
update pecas p
   set cst_ou_csosn = coalesce(nullif(trim(p.cst_ou_csosn), ''), v.csosn),
       cfop_padrao  = coalesce(nullif(trim(p.cfop_padrao), ''), v.cfop),
       origem       = coalesce(nullif(trim(p.origem), ''), '0'),
       cest         = coalesce(nullif(trim(p.cest), ''), v.cest)
from (values
  ('eeee0006-0000-4000-8000-000000000001', '500', '5405', '1600100'),
  ('eeee0006-0000-4000-8000-000000000002', '500', '5405', '1600100'),
  ('eeee0006-0000-4000-8000-000000000003', '500', '5405', '1600100'),
  ('eeee0006-0000-4000-8000-000000000004', '500', '5405', '1600300'),
  ('eeee0006-0000-4000-8000-000000000005', '102', '5102', '0107500'),
  ('eeee0006-0000-4000-8000-000000000006', '102', '5102', '0107500'),
  ('eeee0006-0000-4000-8000-000000000007', '102', '5102', '0107500'),
  ('eeee0006-0000-4000-8000-000000000008', '102', '5102', '0107500'),
  ('eeee0006-0000-4000-8000-000000000009', '102', '5102', '0107500'),
  ('eeee0006-0000-4000-8000-000000000010', '102', '5102', '1007900'),
  ('eeee0006-0000-4000-8000-000000000011', '102', '5102', '0105500'),
  ('eeee0006-0000-4000-8000-000000000012', '102', '5102', '2806300')
) as v(id, csosn, cfop, cest)
where p.id = v.id::uuid
  and (coalesce(trim(p.cst_ou_csosn), '') = '' or coalesce(trim(p.cfop_padrao), '') = ''
       or coalesce(trim(p.origem), '') = '' or coalesce(trim(p.cest), '') = '');

-- Preço nos serviços padrão, só onde ainda está vazio (nunca sobrescreve).
update servicos s set preco_padrao = v.preco, custo = v.custo
from (values
  ('Alinhamento Dianteiro', 80.00, 10.00),
  ('Alinhamento Traseiro', 70.00, 10.00),
  ('Balanceamento', 15.00, 2.00),
  ('Montagem de Pneu', 20.00, 0.00),
  ('Rodízio de Pneus', 40.00, 0.00),
  ('Serviço técnico – Suspensão', 120.00, 0.00),
  ('Serviço técnico – Amortecedores', 100.00, 0.00),
  ('Serviço técnico – Freios', 90.00, 0.00),
  ('Retífica de Disco de Freio', 60.00, 0.00),
  ('Higienização de Freio', 50.00, 5.00),
  ('Sangria de Freio', 45.00, 0.00),
  ('Serviço técnico – Outros', 50.00, 0.00),
  ('Cambagem Dianteira Direita', 35.00, 0.00),
  ('Cambagem Dianteira Esquerda', 35.00, 0.00),
  ('Caster Dianteiro Direito', 35.00, 0.00),
  ('Caster Dianteiro Esquerdo', 35.00, 0.00),
  ('Eixo Traseiro Completo', 90.00, 10.00),
  -- os da 0072 (tarefa #787): preço de mentira, só mão de obra (perto da faixa de docs/servicos-padrao.md)
  ('Conserto de pneu furado', 35.00, 3.00),
  ('Conserto de pneu com manchão', 35.00, 5.00),
  ('Vulcanização', 70.00, 10.00),
  ('Desmontagem de pneu', 20.00, 0.00),
  ('Troca de válvula do pneu', 15.00, 0.00),
  ('Calibragem com nitrogênio', 15.00, 2.00),
  ('Troca de estepe ou de roda', 20.00, 0.00),
  ('Desempeno de roda de ferro', 60.00, 0.00),
  ('Desempeno de roda de liga leve', 120.00, 0.00),
  ('Troca de amortecedores (par)', 250.00, 0.00),
  ('Troca de bandeja', 120.00, 0.00),
  ('Troca de pivô', 80.00, 0.00),
  ('Troca de terminal de direção', 80.00, 0.00),
  ('Troca de bieleta', 60.00, 0.00),
  ('Troca de coxim ou kit batente', 180.00, 0.00),
  ('Troca da suspensão dianteira completa', 800.00, 0.00),
  ('Revisão de suspensão', 100.00, 0.00),
  ('Troca de pastilha de freio', 120.00, 0.00),
  ('Troca de disco e pastilha', 350.00, 0.00),
  ('Troca de lona ou sapata e tambor', 150.00, 0.00),
  ('Troca de óleo do motor', 60.00, 0.00),
  ('Troca de filtro de óleo', 20.00, 0.00),
  ('Troca de filtro de ar', 30.00, 0.00),
  ('Troca de filtro de combustível', 60.00, 0.00),
  ('Troca de filtro de cabine', 40.00, 0.00),
  ('Troca de óleo de câmbio', 900.00, 300.00),
  ('Teste de bateria e alternador', 40.00, 0.00),
  ('Troca de bateria', 50.00, 0.00),
  ('Troca de lâmpada', 20.00, 0.00),
  ('Troca de velas', 100.00, 0.00),
  ('Diagnóstico com scanner', 150.00, 0.00),
  ('Higienização do ar-condicionado', 110.00, 15.00),
  ('Recarga de gás do ar-condicionado', 250.00, 60.00),
  ('Troca de correia dentada', 500.00, 0.00),
  ('Troca do líquido de arrefecimento', 80.00, 0.00),
  ('Limpeza de bicos injetores', 200.00, 20.00),
  ('Troca de palhetas', 15.00, 0.00),
  ('Troca de escapamento', 120.00, 0.00),
  ('Revisão preventiva básica', 250.00, 0.00)
) as v(descricao, preco, custo)
where s.descricao = v.descricao and s.preco_padrao is null;

-- ---------------------------------------------------------------------------
-- 6. Estoque: a compra inicial de cada peça
-- ---------------------------------------------------------------------------
insert into estoque_movimentos (id, peca_id, tipo, quantidade, motivo, referencia, loja_id, deposito_id, criado_em)
select ('eeee000d-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid,
       ('eeee0006-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'entrada', q, 'compra', 'Compra inicial (exemplo)',
       'eeee0001-0000-4000-8000-000000000001', 'eeee0002-0000-4000-8000-000000000001',
       pg_temp.ex_quando(45, '10:00')
from (values (1, 16), (2, 12), (3, 8), (4, 6), (5, 6), (6, 6), (7, 10), (8, 3),
             (9, 8), (10, 100), (11, 12), (12, 10)) as v(n, q)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 7. Ordens de serviço e vendas de balcão (14, em todas as fases; 2 antigas, de clientes que "sumiram")
-- ---------------------------------------------------------------------------
-- O número vai explícito (1 a 14) pra a segunda rodada não gastar número.
insert into ordens_servico (id, loja_id, numero, tipo, cliente_id, veiculo_id, status, km_entrada,
                            descricao_problema, forma_pagamento, parcelas, vendedor_id,
                            data_abertura, data_fechamento) values
  -- 1: faturada há 30 dias, a prazo, já recebida
  ('eeee0008-0000-4000-8000-000000000001', 'eeee0001-0000-4000-8000-000000000001', 1, 'os',
   'eeee0004-0000-4000-8000-000000000004', 'eeee0005-0000-4000-8000-000000000005', 'faturada', 119800,
   'Barulho na frente ao passar em lombada', 'Pix', 1, 'eeee0003-0000-4000-8000-000000000001',
   pg_temp.ex_quando(30, '08:40'), pg_temp.ex_quando(30, '16:10')),
  -- 2: faturada há 20 dias, Pix
  ('eeee0008-0000-4000-8000-000000000002', 'eeee0001-0000-4000-8000-000000000001', 2, 'os',
   'eeee0004-0000-4000-8000-000000000001', 'eeee0005-0000-4000-8000-000000000001', 'faturada', 97900,
   'Carro puxando pra direita', 'Pix', 1, 'eeee0003-0000-4000-8000-000000000003',
   pg_temp.ex_quando(20, '09:15'), pg_temp.ex_quando(20, '10:30')),
  -- 3: faturada há 15 dias, cartão de crédito em 3x
  ('eeee0008-0000-4000-8000-000000000003', 'eeee0001-0000-4000-8000-000000000001', 3, 'os',
   'eeee0004-0000-4000-8000-000000000002', 'eeee0005-0000-4000-8000-000000000003', 'faturada', 61500,
   'Troca dos 4 pneus', 'Cartão de crédito', 3, 'eeee0003-0000-4000-8000-000000000002',
   pg_temp.ex_quando(15, '13:00'), pg_temp.ex_quando(15, '15:20')),
  -- 4: faturada há 40 dias, a prazo, ATRASADA (venceu há 10 dias)
  ('eeee0008-0000-4000-8000-000000000004', 'eeee0001-0000-4000-8000-000000000001', 4, 'os',
   'eeee0004-0000-4000-8000-000000000002', 'eeee0005-0000-4000-8000-000000000003', 'faturada', 59000,
   'Revisão de freios', 'Dinheiro', 1, 'eeee0003-0000-4000-8000-000000000001',
   pg_temp.ex_quando(40, '08:00'), pg_temp.ex_quando(40, '17:00')),
  -- 5: faturada há 10 dias, empresa, a prazo (vence daqui a 20 dias)
  ('eeee0008-0000-4000-8000-000000000005', 'eeee0001-0000-4000-8000-000000000001', 5, 'os',
   'eeee0004-0000-4000-8000-000000000007', 'eeee0005-0000-4000-8000-000000000007', 'faturada', 87600,
   'Pastilha gasta, pedal baixo', 'Pix', 1, 'eeee0003-0000-4000-8000-000000000001',
   pg_temp.ex_quando(10, '07:50'), pg_temp.ex_quando(10, '12:40')),
  -- 6: venda de balcão há 3 dias, Consumidor, dinheiro
  ('eeee0008-0000-4000-8000-000000000006', 'eeee0001-0000-4000-8000-000000000001', 6, 'venda_balcao',
   '00000000-0000-0000-0000-00000000c000', null, 'faturada', null,
   null, 'Dinheiro', 1, 'eeee0003-0000-4000-8000-000000000002',
   pg_temp.ex_quando(3, '11:05'), pg_temp.ex_quando(3, '11:07')),
  -- 7: faturada há 2 dias, moto, cartão de débito
  ('eeee0008-0000-4000-8000-000000000007', 'eeee0001-0000-4000-8000-000000000001', 7, 'os',
   'eeee0004-0000-4000-8000-000000000001', 'eeee0005-0000-4000-8000-000000000002', 'faturada', 31150,
   'Pneu traseiro careca', 'Cartão de débito', 1, 'eeee0003-0000-4000-8000-000000000002',
   pg_temp.ex_quando(2, '14:00'), pg_temp.ex_quando(2, '14:50')),
  -- 8: concluída ontem, esperando faturar
  ('eeee0008-0000-4000-8000-000000000008', 'eeee0001-0000-4000-8000-000000000001', 8, 'os',
   'eeee0004-0000-4000-8000-000000000003', 'eeee0005-0000-4000-8000-000000000004', 'concluida', 74300,
   'Batida seca na suspensão dianteira', null, 1, 'eeee0003-0000-4000-8000-000000000001',
   pg_temp.ex_quando(1, '08:30'), null),
  -- 9: faturada hoje, dividida em Pix + Dinheiro
  ('eeee0008-0000-4000-8000-000000000009', 'eeee0001-0000-4000-8000-000000000001', 9, 'os',
   'eeee0004-0000-4000-8000-000000000004', 'eeee0005-0000-4000-8000-000000000005', 'faturada', 121050,
   'Balanceamento e troca dos bicos', 'Pix + Dinheiro', 1, 'eeee0003-0000-4000-8000-000000000003',
   pg_temp.ex_quando(0, '08:10'), pg_temp.ex_quando(0, '08:55')),
  -- 10: venda de balcão hoje, cliente identificado, Pix
  ('eeee0008-0000-4000-8000-000000000010', 'eeee0001-0000-4000-8000-000000000001', 10, 'venda_balcao',
   'eeee0004-0000-4000-8000-000000000005', null, 'faturada', null,
   null, 'Pix', 1, 'eeee0003-0000-4000-8000-000000000002',
   pg_temp.ex_quando(0, '09:20'), pg_temp.ex_quando(0, '09:22')),
  -- 11: em andamento hoje
  ('eeee0008-0000-4000-8000-000000000011', 'eeee0001-0000-4000-8000-000000000001', 11, 'os',
   'eeee0004-0000-4000-8000-000000000006', 'eeee0005-0000-4000-8000-000000000006', 'em_andamento', 41000,
   'Rodízio e alinhamento antes de viagem', null, 1, 'eeee0003-0000-4000-8000-000000000003',
   pg_temp.ex_quando(0, '10:00'), null),
  -- 12: em andamento hoje, empresa
  ('eeee0008-0000-4000-8000-000000000012', 'eeee0001-0000-4000-8000-000000000001', 12, 'os',
   'eeee0004-0000-4000-8000-000000000008', 'eeee0005-0000-4000-8000-000000000009', 'em_andamento', 18500,
   'Vibração no volante acima de 80 km/h', null, 1, 'eeee0003-0000-4000-8000-000000000003',
   pg_temp.ex_quando(0, '10:45'), null),
  -- 13: faturada há 200 dias (~6,5 meses), Pix: o cliente 3 "sumiu" (a última vez que veio foi essa)
  ('eeee0008-0000-4000-8000-000000000013', 'eeee0001-0000-4000-8000-000000000001', 13, 'os',
   'eeee0004-0000-4000-8000-000000000003', 'eeee0005-0000-4000-8000-000000000004', 'faturada', 70200,
   'Alinhamento depois de trocar a roda', 'Pix', 1, 'eeee0003-0000-4000-8000-000000000001',
   pg_temp.ex_quando(200, '09:00'), pg_temp.ex_quando(200, '10:30')),
  -- 14: faturada há 330 dias (~11 meses), dinheiro: o cliente 6 também "sumiu"
  ('eeee0008-0000-4000-8000-000000000014', 'eeee0001-0000-4000-8000-000000000001', 14, 'os',
   'eeee0004-0000-4000-8000-000000000006', 'eeee0005-0000-4000-8000-000000000006', 'faturada', 40300,
   'Revisão de freios antes de viajar', 'Dinheiro', 1, 'eeee0003-0000-4000-8000-000000000002',
   pg_temp.ex_quando(330, '08:30'), pg_temp.ex_quando(330, '11:00'))
on conflict do nothing;

-- Os itens. O serviço é procurado pelo nome (os padrão da instalação).
insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, servico_id, descricao,
                                  quantidade, preco_unitario, desconto, tecnico_id)
select v.id::uuid, ('eeee0008-0000-4000-8000-0000000000' || lpad(v.os::text, 2, '0'))::uuid,
       v.tipo,
       case when v.peca is null then null
            else ('eeee0006-0000-4000-8000-0000000000' || lpad(v.peca::text, 2, '0'))::uuid end,
       case when v.tipo = 'servico' then (select id from servicos where descricao = v.descricao limit 1) end,
       coalesce((select descricao from pecas
                  where id = ('eeee0006-0000-4000-8000-0000000000' || lpad(v.peca::text, 2, '0'))::uuid),
                v.descricao),
       v.qtd, v.preco, v.desconto,
       case when v.tecnico is null then null
            else ('eeee0003-0000-4000-8000-0000000000' || lpad(v.tecnico::text, 2, '0'))::uuid end
from (values
  -- OS 1: suspensão
  ('eeee0009-0000-4000-8000-000000000001', 1, 'servico', null::int, 'Serviço técnico – Suspensão', 1, 120.00, 0, 1),
  ('eeee0009-0000-4000-8000-000000000002', 1, 'peca',    9,  null, 2,  69.90, 0, null::int),
  -- OS 2: alinhamento e balanceamento
  ('eeee0009-0000-4000-8000-000000000003', 2, 'servico', null, 'Alinhamento Dianteiro', 1, 80.00, 0, 3),
  ('eeee0009-0000-4000-8000-000000000004', 2, 'servico', null, 'Balanceamento',         4, 15.00, 0, 3),
  -- OS 3: 4 pneus com desconto
  ('eeee0009-0000-4000-8000-000000000005', 3, 'peca',    2,  null, 4, 449.90, 79.60, null),
  ('eeee0009-0000-4000-8000-000000000006', 3, 'servico', null, 'Montagem de Pneu',      4, 20.00, 0, 1),
  ('eeee0009-0000-4000-8000-000000000007', 3, 'servico', null, 'Balanceamento',         4, 15.00, 0, 1),
  -- OS 4: freios
  ('eeee0009-0000-4000-8000-000000000008', 4, 'peca',    7,  null, 1, 149.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000009', 4, 'peca',    12, null, 1,  29.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000010', 4, 'servico', null, 'Serviço técnico – Freios', 1, 90.00, 0, 1),
  ('eeee0009-0000-4000-8000-000000000011', 4, 'servico', null, 'Sangria de Freio',      1, 45.00, 0, 1),
  -- OS 5: freios da empresa
  ('eeee0009-0000-4000-8000-000000000012', 5, 'peca',    7,  null, 1, 149.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000013', 5, 'peca',    8,  null, 1, 299.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000014', 5, 'servico', null, 'Serviço técnico – Freios', 1, 90.00, 0, 1),
  -- Venda 6: palhetas no balcão
  ('eeee0009-0000-4000-8000-000000000015', 6, 'peca',    11, null, 2,  35.00, 0, null),
  -- OS 7: pneu de moto
  ('eeee0009-0000-4000-8000-000000000016', 7, 'peca',    4,  null, 1, 239.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000017', 7, 'servico', null, 'Montagem de Pneu',      1, 20.00, 0, 3),
  -- OS 8: amortecedores (concluída, falta faturar)
  ('eeee0009-0000-4000-8000-000000000018', 8, 'peca',    5,  null, 2, 329.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000019', 8, 'peca',    6,  null, 2,  89.90, 0, null),
  ('eeee0009-0000-4000-8000-000000000020', 8, 'servico', null, 'Serviço técnico – Amortecedores', 1, 100.00, 0, 1),
  -- OS 9: balanceamento e bicos (pagamento dividido)
  ('eeee0009-0000-4000-8000-000000000021', 9, 'servico', null, 'Balanceamento',         4, 15.00, 0, 3),
  ('eeee0009-0000-4000-8000-000000000022', 9, 'peca',    10, null, 4,   8.00, 0, null),
  -- Venda 10: balcão com cliente identificado
  ('eeee0009-0000-4000-8000-000000000023', 10, 'peca',   10, null, 4,   8.00, 0, null),
  ('eeee0009-0000-4000-8000-000000000024', 10, 'peca',   11, null, 1,  35.00, 0, null),
  -- OS 11: em andamento
  ('eeee0009-0000-4000-8000-000000000025', 11, 'servico', null, 'Rodízio de Pneus',     1, 40.00, 0, 3),
  ('eeee0009-0000-4000-8000-000000000026', 11, 'servico', null, 'Alinhamento Dianteiro', 1, 80.00, 0, 3),
  -- OS 12: em andamento
  ('eeee0009-0000-4000-8000-000000000027', 12, 'servico', null, 'Balanceamento',        4, 15.00, 0, 3),
  ('eeee0009-0000-4000-8000-000000000028', 12, 'peca',    3,  null, 1, 579.90, 0, null),
  -- OS 13 e 14 (antigas): só serviço, pra não mexer no estoque
  ('eeee0009-0000-4000-8000-000000000029', 13, 'servico', null, 'Alinhamento Dianteiro', 1, 80.00, 0, 1),
  ('eeee0009-0000-4000-8000-000000000030', 13, 'servico', null, 'Balanceamento',         4, 15.00, 0, 1),
  ('eeee0009-0000-4000-8000-000000000031', 14, 'servico', null, 'Rodízio de Pneus',     1, 40.00, 0, 3),
  ('eeee0009-0000-4000-8000-000000000032', 14, 'servico', null, 'Serviço técnico – Freios', 1, 90.00, 0, 3)
) as v(id, os, tipo, peca, descricao, qtd, preco, desconto, tecnico)
on conflict do nothing;

-- A baixa de estoque de cada peça usada (o programa faz isso ao lançar o item;
-- no orçamento não: lá a peça só sai quando o cliente aprova, e quem baixa é
-- a aprovação no programa; por isso só as OS 1 a 14 do exemplo).
insert into estoque_movimentos (id, peca_id, tipo, quantidade, motivo, referencia, loja_id, deposito_id, criado_em)
select ('eeee000d-0000-4000-8000-0000000002' || right(i.id::text, 2))::uuid,
       i.peca_id, 'saida', i.quantidade, 'uso_em_os',
       case when o.tipo = 'venda_balcao' then 'Venda ' else 'OS ' end || o.numero,
       o.loja_id, 'eeee0002-0000-4000-8000-000000000001', o.data_abertura
from ordens_servico_itens i
join ordens_servico o on o.id = i.ordem_servico_id
where i.id::text like 'eeee0009-%' and i.peca_id is not null
  and o.id::text like 'eeee0008-%' and right(o.id::text, 2)::int <= 14
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 8. Caixa, contas a pagar e contas a receber
-- ---------------------------------------------------------------------------
-- Categorias de despesa (catálogo da empresa; se já existir uma com o mesmo
-- nome, usa a que existe).
insert into categorias_caixa (id, nome, tipo) values
  ('eeee000e-0000-4000-8000-000000000001', 'Aluguel', 'saida'),
  ('eeee000e-0000-4000-8000-000000000002', 'Energia e internet', 'saida'),
  ('eeee000e-0000-4000-8000-000000000003', 'Fornecedores', 'saida')
on conflict do nothing;

insert into caixa_movimentos (id, loja_id, data, ordem_servico_id, tipo, forma_pagamento, valor, descricao, categoria_id)
select v.id::uuid, 'eeee0001-0000-4000-8000-000000000001', pg_temp.ex_quando(v.dias, v.hora),
       case when v.os is null then null
            else ('eeee0008-0000-4000-8000-0000000000' || lpad(v.os::text, 2, '0'))::uuid end,
       v.tipo, v.forma,
       coalesce(v.valor, pg_temp.ex_total(('eeee0008-0000-4000-8000-0000000000' || lpad(v.os::text, 2, '0'))::uuid) - v.menos),
       v.descricao,
       (select id from categorias_caixa where nome = v.categoria and tipo = v.tipo)
from (values
  ('eeee000a-0000-4000-8000-000000000001', 25, '10:00', 1,  'entrada', 'pix',            null::numeric, 0::numeric, 'Faturamento da OS 1', null::text),
  ('eeee000a-0000-4000-8000-000000000002', 20, '09:00', null, 'saida', 'pix',            1800.00, 0, 'Aluguel (exemplo)', 'Aluguel'),
  ('eeee000a-0000-4000-8000-000000000003', 20, '10:30', 2,  'entrada', 'pix',            null, 0, 'Faturamento da OS 2', null),
  ('eeee000a-0000-4000-8000-000000000004', 15, '15:20', 3,  'entrada', 'cartao_credito', null, 0, 'Faturamento da OS 3', null),
  ('eeee000a-0000-4000-8000-000000000005', 3,  '11:07', 6,  'entrada', 'dinheiro',       null, 0, 'Faturamento da Venda 6', null),
  ('eeee000a-0000-4000-8000-000000000006', 2,  '14:50', 7,  'entrada', 'cartao_debito',  null, 0, 'Faturamento da OS 7', null),
  ('eeee000a-0000-4000-8000-000000000007', 8,  '09:30', null, 'saida', 'pix',            99.90, 0, 'Internet (exemplo)', 'Energia e internet'),
  ('eeee000a-0000-4000-8000-000000000008', 0,  '08:55', 9,  'entrada', 'pix',            50.00, 0, 'Faturamento da OS 9', null),
  ('eeee000a-0000-4000-8000-000000000009', 0,  '08:55', 9,  'entrada', 'dinheiro',       null, 50.00, 'Faturamento da OS 9', null),
  ('eeee000a-0000-4000-8000-000000000010', 0,  '09:22', 10, 'entrada', 'pix',            null, 0, 'Faturamento da Venda 10', null),
  ('eeee000a-0000-4000-8000-000000000011', 5,  '16:00', null, 'entrada', 'dinheiro',     40.00, 0, 'Venda de pneus velhos pra reciclagem (exemplo)', 'Outros'),
  ('eeee000a-0000-4000-8000-000000000012', 1,  '17:30', null, 'saida', 'dinheiro',       35.50, 0, 'Café e material de limpeza (exemplo)', 'Outros'),
  ('eeee000a-0000-4000-8000-000000000013', 200, '10:30', 13, 'entrada', 'pix',            null, 0, 'Faturamento da OS 13', null),
  ('eeee000a-0000-4000-8000-000000000014', 330, '11:00', 14, 'entrada', 'dinheiro',       null, 0, 'Faturamento da OS 14', null)
) as v(id, dias, hora, os, tipo, forma, valor, menos, descricao, categoria)
on conflict do nothing;

insert into contas_pagar (id, loja_id, descricao, valor, vencimento, categoria_id, recorrente,
                          status, data_pagamento, caixa_movimento_id)
select v.id::uuid, 'eeee0001-0000-4000-8000-000000000001', v.descricao, v.valor,
       pg_temp.ex_dia(v.venc), (select id from categorias_caixa where nome = v.categoria and tipo = 'saida'),
       v.recorrente, v.status,
       case when v.caixa is null then null else pg_temp.ex_quando(v.venc, '09:00') end,
       v.caixa::uuid
from (values
  ('eeee000b-0000-4000-8000-000000000001', 'Aluguel (exemplo)',  1800.00, 20,  'Aluguel',            true,  'paga',     'eeee000a-0000-4000-8000-000000000002'),
  ('eeee000b-0000-4000-8000-000000000002', 'Aluguel (exemplo)',  1800.00, -10, 'Aluguel',            true,  'pendente', null),
  ('eeee000b-0000-4000-8000-000000000003', 'Energia (exemplo)',   412.37, -5,  'Energia e internet', false, 'pendente', null),
  ('eeee000b-0000-4000-8000-000000000004', 'Boleto Distribuidora de Pneus Exemplo', 3120.00, 2, 'Fornecedores', false, 'pendente', null),
  ('eeee000b-0000-4000-8000-000000000005', 'Internet (exemplo)',   99.90, 8,   'Energia e internet', true,  'paga',     'eeee000a-0000-4000-8000-000000000007')
) as v(id, descricao, valor, venc, categoria, recorrente, status, caixa)
on conflict do nothing;

insert into contas_receber (id, loja_id, cliente_id, ordem_servico_id, descricao, valor, vencimento,
                            status, data_recebimento, caixa_movimento_id)
select v.id::uuid, 'eeee0001-0000-4000-8000-000000000001', o.cliente_id, o.id,
       'Faturamento da OS ' || o.numero, pg_temp.ex_total(o.id), pg_temp.ex_dia(v.venc),
       v.status,
       case when v.caixa is null then null else pg_temp.ex_quando(v.venc, '10:00') end,
       v.caixa::uuid
from (values
  ('eeee000c-0000-4000-8000-000000000001', 1, 25,  'recebido', 'eeee000a-0000-4000-8000-000000000001'),
  ('eeee000c-0000-4000-8000-000000000002', 4, 10,  'pendente', null),
  ('eeee000c-0000-4000-8000-000000000003', 5, -20, 'pendente', null)
) as v(id, os, venc, status, caixa)
join ordens_servico o on o.id = ('eeee0008-0000-4000-8000-0000000000' || lpad(v.os::text, 2, '0'))::uuid
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 9. Peça avulsa, orçamentos, compras, contagem, fechamentos e computador
--    (tarefa #872). Cada bloco grava do jeito que o programa grava; a função
--    ou tela de referência está no comentário de cada um.
-- ---------------------------------------------------------------------------

-- 9a. Peça avulsa (sem cadastro, migration 0066) na OS 8, que está concluída
-- esperando faturar. Peça avulsa não mexe no estoque (baixarEstoqueDasPecas,
-- src/lib/ordensServico.ts), e o custo digitado vai em custo_unitario.
-- Só enquanto a OS 8 não foi faturada (o programa não aceita item em OS
-- faturada, e alguém da equipe pode ter faturado ela no teste).
insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, servico_id, descricao,
                                  quantidade, preco_unitario, desconto, tecnico_id, custo_unitario)
select 'eeee0009-0000-4000-8000-000000000033', o.id, 'peca', null, null,
       'Parafuso de roda (avulso, exemplo)', 4, 6.00, 0, null, 2.50
from ordens_servico o
where o.id = 'eeee0008-0000-4000-8000-000000000008' and o.status in ('em_andamento', 'concluida')
on conflict do nothing;

-- 9b. Orçamentos (migration 0065; criarOrcamento e recusarOrcamento, em
-- src/lib/ordensServico.ts): sem número de OS (o banco dá o número do
-- orçamento, por isso vai vazio) e SEM baixa de estoque — a peça só sai da
-- prateleira quando o cliente aprova. Um aberto e um recusado, com motivo.
-- (Um insert de cada vez, o mais velho primeiro: o número segue a data.)
insert into ordens_servico (id, loja_id, numero, tipo, cliente_id, veiculo_id, status, km_entrada,
                            descricao_problema, vendedor_id, data_abertura, validade,
                            motivo_recusa, recusado_em) values
  ('eeee0008-0000-4000-8000-000000000016', 'eeee0001-0000-4000-8000-000000000001', null, 'os',
   'eeee0004-0000-4000-8000-000000000003', 'eeee0005-0000-4000-8000-000000000004', 'recusado', 74100,
   'Orçamento de amortecedores', 'eeee0003-0000-4000-8000-000000000001',
   pg_temp.ex_quando(6, '10:00'), pg_temp.ex_dia(6) + 7,
   'preco', pg_temp.ex_quando(4, '11:00'))
on conflict do nothing;

insert into ordens_servico (id, loja_id, numero, tipo, cliente_id, veiculo_id, status, km_entrada,
                            descricao_problema, vendedor_id, data_abertura, validade) values
  ('eeee0008-0000-4000-8000-000000000015', 'eeee0001-0000-4000-8000-000000000001', null, 'os',
   'eeee0004-0000-4000-8000-000000000002', 'eeee0005-0000-4000-8000-000000000003', 'orcamento', 63800,
   'Orçamento dos 4 pneus dianteiros e traseiros', 'eeee0003-0000-4000-8000-000000000002',
   pg_temp.ex_quando(1, '15:30'), pg_temp.ex_dia(1) + 7)
on conflict do nothing;

insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, servico_id, descricao,
                                  quantidade, preco_unitario, desconto, tecnico_id)
select v.id::uuid, v.os::uuid, v.tipo,
       v.peca::uuid,
       case when v.tipo = 'servico' then (select id from servicos where descricao = v.descricao limit 1) end,
       coalesce((select descricao from pecas where id = v.peca::uuid), v.descricao),
       v.qtd, v.preco, 0, null
from (values
  -- orçamento aberto: 4 pneus, montagem e balanceamento
  ('eeee0009-0000-4000-8000-000000000034', 'eeee0008-0000-4000-8000-000000000015', 'peca',
   'eeee0006-0000-4000-8000-000000000001', null, 4, 389.90),
  ('eeee0009-0000-4000-8000-000000000035', 'eeee0008-0000-4000-8000-000000000015', 'servico',
   null, 'Montagem de Pneu', 4, 20.00),
  ('eeee0009-0000-4000-8000-000000000036', 'eeee0008-0000-4000-8000-000000000015', 'servico',
   null, 'Balanceamento', 4, 15.00),
  -- orçamento recusado: amortecedores (achou caro)
  ('eeee0009-0000-4000-8000-000000000037', 'eeee0008-0000-4000-8000-000000000016', 'peca',
   'eeee0006-0000-4000-8000-000000000005', null, 2, 329.90),
  ('eeee0009-0000-4000-8000-000000000038', 'eeee0008-0000-4000-8000-000000000016', 'servico',
   null, 'Serviço técnico – Amortecedores', 1, 100.00)
) as v(id, os, tipo, peca, descricao, qtd, preco)
on conflict do nothing;

-- 9c. Pedidos de compra (migration 0039; criarPedido e receberItensPedido,
-- src/lib/pedidosCompra.ts). O número vem do banco. O recebido gera a entrada
-- no estoque de cada item (motivo "compra", referência "Pedido N"); o
-- pendente ainda não. Todo item com preço vira uma cotação (9d).
insert into pedidos_compra (id, loja_id, fornecedor_id, status, data_pedido, observacao, criado_em) values
  ('eeee0012-0000-4000-8000-000000000001', 'eeee0001-0000-4000-8000-000000000001',
   'eeee0007-0000-4000-8000-000000000001', 'recebido', pg_temp.ex_dia(14),
   'Reposição de pneus (exemplo)', pg_temp.ex_quando(14, '09:00'))
on conflict do nothing;

insert into pedidos_compra (id, loja_id, fornecedor_id, status, data_pedido, observacao, criado_em) values
  ('eeee0012-0000-4000-8000-000000000002', 'eeee0001-0000-4000-8000-000000000001',
   'eeee0007-0000-4000-8000-000000000002', 'pendente', pg_temp.ex_dia(2),
   'Freios e um pneu pra comparar preço (exemplo)', pg_temp.ex_quando(2, '16:00'))
on conflict do nothing;

insert into pedidos_compra_itens (id, pedido_compra_id, peca_id, quantidade_pedida, preco_unitario, quantidade_recebida) values
  ('eeee0013-0000-4000-8000-000000000001', 'eeee0012-0000-4000-8000-000000000001',
   'eeee0006-0000-4000-8000-000000000002', 4, 300.00, 4),
  ('eeee0013-0000-4000-8000-000000000002', 'eeee0012-0000-4000-8000-000000000001',
   'eeee0006-0000-4000-8000-000000000003', 4, 390.00, 4),
  ('eeee0013-0000-4000-8000-000000000003', 'eeee0012-0000-4000-8000-000000000002',
   'eeee0006-0000-4000-8000-000000000007', 6, 78.00, 0),
  ('eeee0013-0000-4000-8000-000000000004', 'eeee0012-0000-4000-8000-000000000002',
   'eeee0006-0000-4000-8000-000000000002', 4, 310.00, 0)
on conflict do nothing;

-- A entrada do que chegou (só dos itens com quantidade recebida).
insert into estoque_movimentos (id, peca_id, tipo, quantidade, motivo, referencia, loja_id, deposito_id, criado_em)
select ('eeee000d-0000-4000-8000-0000000003' || right(i.id::text, 2))::uuid,
       i.peca_id, 'entrada', i.quantidade_recebida, 'compra', 'Pedido ' || p.numero,
       p.loja_id, 'eeee0002-0000-4000-8000-000000000001', pg_temp.ex_quando(12, '14:00')
from pedidos_compra_itens i
join pedidos_compra p on p.id = i.pedido_compra_id
where i.id::text like 'eeee0013-%' and i.quantidade_recebida > 0
on conflict do nothing;

-- 9d. Cotações (migration 0042; registrarCotacoes, src/lib/cotacoesPecas.ts):
-- nascem dos itens de pedido com preço. O pneu 185/65 ficou com duas (uma de
-- cada fornecedor), pra a comparação do pedido de compra ter o que mostrar.
insert into cotacoes_pecas (id, peca_id, fornecedor_id, preco, criado_em)
select ('eeee0014-0000-4000-8000-0000000000' || right(i.id::text, 2))::uuid,
       i.peca_id, p.fornecedor_id, i.preco_unitario, p.criado_em
from pedidos_compra_itens i
join pedidos_compra p on p.id = i.pedido_compra_id
where i.id::text like 'eeee0013-%' and i.preco_unitario > 0
on conflict do nothing;

-- 9e. Contagem de estoque (migration 0017; registrarContagem,
-- src/lib/contagens.ts): guarda o saldo que o sistema tinha na hora, o que
-- foi contado e a diferença; diferença diferente de zero vira um movimento de
-- "ajuste". Uma bateu (pneu 185/65) e uma faltou (3 bicos de válvula).
insert into contagens_estoque (id, peca_id, deposito_id, loja_id, quantidade_contada, saldo_sistema,
                               diferenca, observacao, criado_em)
select v.id::uuid, v.peca::uuid, 'eeee0002-0000-4000-8000-000000000001',
       'eeee0001-0000-4000-8000-000000000001',
       greatest(s.saldo + v.delta, 0), s.saldo, greatest(s.saldo + v.delta, 0) - s.saldo, v.obs,
       pg_temp.ex_quando(7, '18:00')
from (values
  ('eeee0015-0000-4000-8000-000000000001', 'eeee0006-0000-4000-8000-000000000002', 0::numeric, null::text),
  ('eeee0015-0000-4000-8000-000000000002', 'eeee0006-0000-4000-8000-000000000010', -3, 'Faltaram 3 (exemplo)')
) as v(id, peca, delta, obs)
cross join lateral (
  select coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end), 0) as saldo
  from estoque_movimentos m
  where m.peca_id = v.peca::uuid
    and m.deposito_id = 'eeee0002-0000-4000-8000-000000000001'
    and m.criado_em < pg_temp.ex_quando(7, '18:00')
) s
on conflict do nothing;

insert into estoque_movimentos (id, peca_id, tipo, quantidade, motivo, referencia, loja_id, deposito_id, criado_em)
select ('eeee000d-0000-4000-8000-0000000004' || right(c.id::text, 2))::uuid,
       c.peca_id, case when c.diferenca > 0 then 'entrada' else 'saida' end, abs(c.diferenca),
       'ajuste', 'Ajuste por contagem de estoque', c.loja_id, c.deposito_id, c.criado_em
from contagens_estoque c
where c.id::text like 'eeee0015-%' and c.diferenca <> 0
on conflict do nothing;

-- 9f. Fechamento de caixa de dois dias passados (migration 0058): pela
-- própria fechar_caixa(), que é o que o programa chama (src/lib/fechamentoCaixa.ts).
-- A conta do "esperado" é a da tela (src/schemas/fechamentoCaixa.ts): fundo de
-- troco + entradas em dinheiro − saídas em dinheiro do dia, com os totais por
-- forma; a diferença (contado − esperado), quando existe, a função lança como
-- "Quebra/Sobra de caixa" no fim daquele dia. Há 5 dias bateu; há 3 dias
-- faltaram R$ 5,00. Só fecha o dia que ainda não foi fechado (um fechamento
-- por loja por dia), então a segunda rodada não lança outra quebra.
-- A forma de pagamento normalizada como a tela faz (chaveDaForma/ehDinheiro).
create or replace function pg_temp.ex_forma(forma text)
returns text
language sql
immutable
as $$
  select case when f in ('dinheiro', 'especie', 'em_especie', 'din') then 'dinheiro' else f end
  from (select regexp_replace(regexp_replace(
                 translate(lower(btrim(forma)), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
                 '\s+de\s+', '_', 'g'), '\s+', '_', 'g') as f) t;
$$;

do $$
declare
  loja constant uuid := 'eeee0001-0000-4000-8000-000000000001';
  f record;
  v_totais jsonb;
  v_esperado numeric(12,2);
begin
  for f in select * from (values
      (5, 100.00::numeric, 0::numeric, null::text),
      (3, 100.00, -5.00, 'Faltou troco de uma venda (exemplo)')
    ) as v(dias, fundo, falta, obs) loop
    continue when exists (select 1 from fechamentos_caixa where loja_id = loja and data = pg_temp.ex_dia(f.dias));

    -- os totais do dia, por forma (o que o programa grava em totais_por_forma)
    select coalesce(jsonb_object_agg(forma, total), '{}'::jsonb) into v_totais
    from (select pg_temp.ex_forma(forma_pagamento) as forma,
                 sum(case when tipo = 'entrada' then valor else -valor end) as total
            from caixa_movimentos
           where loja_id = loja
             and coalesce(btrim(forma_pagamento), '') <> ''
             and (data at time zone 'America/Sao_Paulo')::date = pg_temp.ex_dia(f.dias)
           group by 1) t;
    v_totais := jsonb_build_object('dinheiro', 0) || v_totais;
    v_esperado := f.fundo + (v_totais ->> 'dinheiro')::numeric;

    perform fechar_caixa(loja, pg_temp.ex_dia(f.dias), f.fundo, v_esperado,
                         greatest(v_esperado + f.falta, 0), v_totais, f.obs,
                         pg_temp.ex_quando(f.dias, '23:59'));
  end loop;
end $$;

-- 9g. Comissão paga de um período passado (migration 0059; a tela
-- Funcionários → Comissões, src/schemas/comissoes.ts e comissoesPagas.ts).
-- A conta é a do programa: só OS faturada, pelo dia do faturamento; a base é
-- o lucro (venda − custo), item a item; serviço sem custo fica fora (#836);
-- o vendedor leva pela OS inteira e o técnico pelos itens que executou;
-- a comissão de cada OS é arredondada no centavo. O retrato (snapshot) guarda
-- cada OS, pra a tela comparar com o recálculo — e, com estes dados, bate.
-- Quem: Marcos (5%), de 45 a 16 dias atrás (as OS 1 e 4, como vendedor).
insert into comissoes_fechamentos (id, loja_id, funcionario_id, funcionario_nome, periodo_inicio, periodo_fim,
                                   percentual, valor_calculado, valor_pago, data_pagamento, observacao,
                                   snapshot, criado_em)
with fun as (
  select id, nome, comissao from funcionarios where id = 'eeee0003-0000-4000-8000-000000000001'
),
itens as (
  select o.id as ordem_id, o.numero, o.tipo as tipo_ordem, o.vendedor_id, i.tecnico_id,
         i.quantidade * i.preco_unitario - i.desconto as vendido,
         i.quantidade * coalesce(case when i.tipo = 'servico' then s.custo
                                      when i.peca_id is null then i.custo_unitario
                                      else p.preco_custo end, 0) as custo
  from ordens_servico o
  join ordens_servico_itens i on i.ordem_servico_id = o.id
  left join servicos s on s.id = i.servico_id
  left join pecas p on p.id = i.peca_id
  where o.loja_id = 'eeee0001-0000-4000-8000-000000000001'
    and o.status = 'faturada' and o.numero is not null
    and (coalesce(o.data_fechamento, o.data_abertura) at time zone 'America/Sao_Paulo')::date
        between pg_temp.ex_dia(45) and pg_temp.ex_dia(16)
    and (i.tipo <> 'servico' or coalesce(s.custo, 0) > 0)
),
por_papel as (
  select ordem_id, numero, tipo_ordem, 'vendedor' as papel, sum(vendido - custo) as lucro
    from itens, fun where vendedor_id = fun.id group by 1, 2, 3
  union all
  select ordem_id, numero, tipo_ordem, 'tecnico', sum(vendido - custo)
    from itens, fun where tecnico_id = fun.id group by 1, 2, 3
),
retrato as (
  select r.*, round(r.lucro * fun.comissao / 100, 2) as comissao from por_papel r, fun
)
select 'eeee0010-0000-4000-8000-000000000001', 'eeee0001-0000-4000-8000-000000000001', fun.id, fun.nome,
       pg_temp.ex_dia(45), pg_temp.ex_dia(16), fun.comissao,
       coalesce((select sum(comissao) from retrato), 0),
       coalesce((select sum(comissao) from retrato), 0),
       pg_temp.ex_dia(15), 'Pago em dinheiro (exemplo)',
       coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'ordemId', ordem_id, 'numero', numero,
                   'tipo', case when tipo_ordem = 'venda_balcao' then tipo_ordem end,
                   'papel', papel, 'comissao', comissao)) order by papel desc, numero)
                 from retrato), '[]'::jsonb),
       pg_temp.ex_quando(15, '17:00')
from fun
on conflict do nothing;

-- 9h. Um computador da loja (migration 0063; registrar_computador, que o
-- programa chama a cada login). Inventado: nome, versão e sistema.
insert into computadores (id, nome_maquina, apelido, versao_app, canal, sistema, loja_id,
                          primeiro_acesso, visto_em) values
  ('eeee0011-0000-4000-8000-000000000001', 'BALCAO-EXEMPLO', 'Balcão (exemplo)', '0.9.55', 'normal',
   'Windows 11 (exemplo)', 'eeee0001-0000-4000-8000-000000000001',
   pg_temp.ex_quando(30, '08:00'), pg_temp.ex_quando(1, '17:45'))
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 10. Quem já existe no banco e é admin passa a enxergar a loja de exemplo
-- ---------------------------------------------------------------------------
-- (No Supabase de teste, o único admin é a Sofia. Os logins da equipe são
-- ligados à loja pelo supabase/exemplo/ligar-login.sql.)
insert into operador_lojas (operador_id, loja_id)
select id, 'eeee0001-0000-4000-8000-000000000001' from operadores where admin and ativo
on conflict do nothing;

commit;

select 'Dados de exemplo prontos: ' ||
       (select count(*) from clientes where id::text like 'eeee%') || ' clientes, ' ||
       (select count(*) from ordens_servico where loja_id = 'eeee0001-0000-4000-8000-000000000001'
                                              and numero is not null) || ' ordens, ' ||
       (select count(*) from ordens_servico where loja_id = 'eeee0001-0000-4000-8000-000000000001'
                                              and numero is null) || ' orçamentos, ' ||
       (select count(*) from pecas where id::text like 'eeee%') || ' peças.' as resultado;
