-- Sakura System — AutoCenter Edition
-- TESTE da migration 0072 (serviços padrão da empresa nova, tarefa #787). NÃO
-- é migration, e NUNCA deve ser rodado no Supabase de verdade — grava e apaga
-- dado de teste.
--
-- A promessa:
--   • banco recém-instalado (sem nenhuma OS) recebe os 39 serviços novos e as
--     3 categorias novas, todos sem preço, cada um na categoria certa;
--   • os 17 serviços da 0030 continuam lá, com o mesmo nome, uma vez só;
--   • rodar de novo não duplica nada;
--   • banco EM USO (com pelo menos uma OS) não recebe nada: nem serviço, nem
--     categoria — e o preço de serviço que a loja já preencheu não muda;
--   • nome que já existe com outra maiúscula ou espaço sobrando não entra de
--     novo.
--
-- As rodadas usam o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0072 (o banco do teste nasce sem OS).
-- Apagada a linha 72, a checagem 1 só passa se a rodada abaixo gravar de novo.
delete from schema_versao where versao = 72;

-- PARTE A: banco recém-instalado, rodando a migration mais duas vezes.
\ir ../migrations/0072_servicos_padrao_empresa_nova.sql
\ir ../migrations/0072_servicos_padrao_empresa_nova.sql

do $$
declare
  n int;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 72) then
    raise exception 'FALHOU 1: a 0072 não gravou a versão 72';
  end if;

  -- 2. 17 da 0030 + 39 novos, cada nome uma vez só
  select count(*) into n from servicos;
  if n <> 56 then
    raise exception 'FALHOU 2: esperava 56 serviços (17 + 39), achou %', n;
  end if;
  select count(*) into n from (
    select lower(btrim(descricao)) from servicos group by 1 having count(*) > 1
  ) d;
  if n <> 0 then
    raise exception 'FALHOU 2: % nome(s) de serviço repetido(s)', n;
  end if;

  -- 3. as 6 categorias da 0030 + 3 novas
  select count(*) into n from categorias_servicos;
  if n <> 9 then
    raise exception 'FALHOU 3: esperava 9 categorias de serviço, achou %', n;
  end if;

  -- 4. nenhum serviço com preço, nenhum sem categoria, todos ativos
  select count(*) into n from servicos
  where preco_padrao is not null or categoria_id is null or not ativo;
  if n <> 0 then
    raise exception 'FALHOU 4: % serviço(s) com preço, sem categoria ou inativo(s)', n;
  end if;

  -- 5. amostra da categoria de cada grupo
  select count(*) into n
  from (values
    ('Conserto de pneu furado', 'Pneus'),
    ('Troca de amortecedores (par)', 'Amortecedores'),
    ('Troca de pivô', 'Suspensão'),
    ('Troca de pastilha de freio', 'Freios'),
    ('Troca de óleo do motor', 'Óleo e Filtros'),
    ('Diagnóstico com scanner', 'Elétrica'),
    ('Recarga de gás do ar-condicionado', 'Ar-condicionado'),
    ('Revisão preventiva básica', 'Outros Serviços'),
    -- e os da 0030 ficam onde estavam
    ('Alinhamento Dianteiro', 'Pneus'),
    ('Cambagem Dianteira Direita', 'Alinhamento')
  ) as v(descricao, categoria)
  join servicos s on s.descricao = v.descricao
  join categorias_servicos c on c.id = s.categoria_id and c.nome = v.categoria;
  if n <> 10 then
    raise exception 'FALHOU 5: só % de 10 serviços na categoria certa', n;
  end if;

  -- 6. "Cambagem e caster" não entra: é a soma dos 4 nomes da 0030
  if exists (select 1 from servicos where descricao ilike 'Cambagem e caster%') then
    raise exception 'FALHOU 6: entrou "Cambagem e caster", que já são 4 nomes da 0030';
  end if;

  -- 6b. cada um dos 39 nomes novos, escrito exatamente igual, uma vez só
  select count(*) into n
  from (values
    ('Conserto de pneu furado'),
    ('Conserto de pneu com manchão'),
    ('Vulcanização'),
    ('Desmontagem de pneu'),
    ('Troca de válvula do pneu'),
    ('Calibragem com nitrogênio'),
    ('Troca de estepe ou de roda'),
    ('Desempeno de roda de ferro'),
    ('Desempeno de roda de liga leve'),
    ('Troca de amortecedores (par)'),
    ('Troca de bandeja'),
    ('Troca de pivô'),
    ('Troca de terminal de direção'),
    ('Troca de bieleta'),
    ('Troca de coxim ou kit batente'),
    ('Troca da suspensão dianteira completa'),
    ('Revisão de suspensão'),
    ('Troca de pastilha de freio'),
    ('Troca de disco e pastilha'),
    ('Troca de lona ou sapata e tambor'),
    ('Troca de óleo do motor'),
    ('Troca de filtro de óleo'),
    ('Troca de filtro de ar'),
    ('Troca de filtro de combustível'),
    ('Troca de filtro de cabine'),
    ('Troca de óleo de câmbio'),
    ('Teste de bateria e alternador'),
    ('Troca de bateria'),
    ('Troca de lâmpada'),
    ('Troca de velas'),
    ('Diagnóstico com scanner'),
    ('Higienização do ar-condicionado'),
    ('Recarga de gás do ar-condicionado'),
    ('Troca de correia dentada'),
    ('Troca do líquido de arrefecimento'),
    ('Limpeza de bicos injetores'),
    ('Troca de palhetas'),
    ('Troca de escapamento'),
    ('Revisão preventiva básica')
  ) as v(descricao)
  join servicos s on s.descricao = v.descricao;
  if n <> 39 then
    raise exception 'FALHOU 6b: só % dos 39 nomes novos estão cadastrados exatamente assim', n;
  end if;
end $$;

-- PARTE B: banco EM USO. Tira os serviços e as categorias novas, preenche um
-- preço (como a loja faria) e abre uma OS. A migration não pode trazer nada.
delete from servicos where descricao not in (
  'Alinhamento Dianteiro', 'Balanceamento', 'Montagem de Pneu', 'Rodízio de Pneus',
  'Serviço técnico – Suspensão', 'Serviço técnico – Amortecedores',
  'Retífica de Disco de Freio', 'Higienização de Freio', 'Sangria de Freio',
  'Serviço técnico – Freios', 'Alinhamento Traseiro', 'Cambagem Dianteira Direita',
  'Cambagem Dianteira Esquerda', 'Caster Dianteiro Direito', 'Caster Dianteiro Esquerdo',
  'Eixo Traseiro Completo', 'Serviço técnico – Outros'
);
delete from categorias_servicos where nome in ('Óleo e Filtros', 'Elétrica', 'Ar-condicionado');
update servicos set preco_padrao = 35 where descricao = 'Balanceamento';

insert into lojas (id, nome, cidade, uf)
  values ('07870000-0000-0000-0000-0000000000a1', 'Loja (teste #787)', 'Araraquara', 'SP');
insert into clientes (id, nome)
  values ('07870000-0000-0000-0000-0000000000c1', 'Cliente (teste #787)');
insert into ordens_servico (id, loja_id, cliente_id, status)
  values ('07870000-0000-0000-0000-0000000000f1', '07870000-0000-0000-0000-0000000000a1',
          '07870000-0000-0000-0000-0000000000c1', 'orcamento');

\ir ../migrations/0072_servicos_padrao_empresa_nova.sql

do $$
declare
  n int;
begin
  -- 7. nenhum serviço novo
  select count(*) into n from servicos;
  if n <> 17 then
    raise exception 'FALHOU 7: banco com OS ficou com % serviços (esperava os 17 de antes)', n;
  end if;

  -- 8. nenhuma categoria nova
  select count(*) into n from categorias_servicos;
  if n <> 6 then
    raise exception 'FALHOU 8: banco com OS ficou com % categorias (esperava as 6 de antes)', n;
  end if;

  -- 9. o preço da loja não mudou
  if (select preco_padrao from servicos where descricao = 'Balanceamento') is distinct from 35 then
    raise exception 'FALHOU 9: o preço do Balanceamento mudou';
  end if;
end $$;

-- PARTE C: sem a OS de novo, e com um dos nomes novos já cadastrado pela loja
-- com outra maiúscula e espaço sobrando.
delete from ordens_servico where id = '07870000-0000-0000-0000-0000000000f1';
insert into servicos (descricao) values ('  troca de BATERIA ');

\ir ../migrations/0072_servicos_padrao_empresa_nova.sql

do $$
declare
  n int;
begin
  -- 10. entram os outros 38, e a bateria não duplica
  select count(*) into n from servicos;
  if n <> 56 then
    raise exception 'FALHOU 10: esperava 56 serviços (17 + 1 da loja + 38), achou %', n;
  end if;
  select count(*) into n from servicos where lower(btrim(descricao)) = 'troca de bateria';
  if n <> 1 then
    raise exception 'FALHOU 10: "Troca de bateria" ficou % vez(es)', n;
  end if;

  -- 11. e o preço da loja continua sem mudar
  if (select preco_padrao from servicos where descricao = 'Balanceamento') is distinct from 35 then
    raise exception 'FALHOU 11: o preço do Balanceamento mudou';
  end if;
end $$;

\echo TODAS AS CHECAGENS PASSARAM
