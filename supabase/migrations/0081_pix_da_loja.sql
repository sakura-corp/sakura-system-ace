-- Sakura System — AutoCenter Edition
-- Migration 0081: a chave Pix da loja (#456).
--
-- O PROBLEMA. Na cobrança (a mensagem de WhatsApp de conta a receber) e no
-- faturamento da OS, o cliente pergunta "qual o Pix?" e alguém dita ou digita
-- a chave na mão, todo dia. A tarefa #456 põe ali o Pix "copia e cola" (e o
-- QR do faturamento), montado pelo próprio programa. Pra montar, o programa
-- precisa saber, por loja: a chave Pix, o nome de quem recebe e a cidade —
-- os três vão dentro do código do Pix (o "BR Code" do Banco Central).
--
-- A DECISÃO. Uma tabela `configuracoes_pix`, uma linha por loja (a chave
-- primária é o `loja_id`, como `configuracoes_garantia`):
--   • `chave`: a chave Pix como a loja cadastrou no banco dela (CPF/CNPJ só
--     com números, e-mail, telefone com +55 ou a chave aleatória). Até 77
--     letras, o limite do campo da chave dentro do BR Code;
--   • `nome_recebedor`: até 25 letras, o limite do BR Code;
--   • `cidade_recebedor`: até 15 letras, o limite do BR Code;
--   • as três travas não deixam campo em branco (só espaço também não vale).
--
-- A SEGURANÇA. A chave Pix é pra onde vai o dinheiro do cliente. Se o
-- balconista pudesse trocá-la pela dele, o cliente pagaria certinho, pra
-- pessoa errada, e ninguém perceberia até fechar o caixa. Por isso:
--   • LER: quem tem acesso à loja (o balconista precisa, pra montar a
--     cobrança e o QR do faturamento);
--   • GRAVAR, ALTERAR e APAGAR: só o admin daquela loja.
-- Uma policy por comando (nunca uma `for all`): as policies se somam com OU,
-- então uma `for all` aberta reabriria a escrita pra todo mundo. E a tabela
-- entra na trilha de auditoria (0053): se a chave mudar, fica registrado
-- quem mudou, o valor antigo e o novo.
--
-- ORDEM DE SUBIR. Tabela nova e opcional: esta migration sobe ANTES da
-- versão do programa, como as outras (o programa antigo nem sabe que ela
-- existe). Por isso não declara versão mínima do programa. E a tela tem que
-- funcionar com a tabela ausente (sem Pix configurado, a cobrança sai como
-- antes, sem o copia e cola).
--
-- As travas têm nome `ck_<tabela>_<regra>` porque a tela traduz cada uma
-- numa frase em português (src/lib/errors.ts). Tabela nova nasce vazia,
-- então nenhum dado que já existe pode ficar fora da regra.
--
-- Idempotente: seguro rodar de novo.

create table if not exists configuracoes_pix (
  loja_id uuid primary key references lojas (id),
  chave text not null,
  nome_recebedor text not null,
  cidade_recebedor text not null,
  atualizado_em timestamptz not null default now()
);

-- As travas: em branco não vale, e o tamanho é o máximo que cabe no BR Code
-- (o tamanho conta o texto inteiro, do jeito que vai pro código do Pix).
alter table configuracoes_pix drop constraint if exists ck_config_pix_chave;
alter table configuracoes_pix
  add constraint ck_config_pix_chave
  check (char_length(btrim(chave)) >= 1 and char_length(chave) <= 77);

alter table configuracoes_pix drop constraint if exists ck_config_pix_nome_recebedor;
alter table configuracoes_pix
  add constraint ck_config_pix_nome_recebedor
  check (char_length(btrim(nome_recebedor)) >= 1 and char_length(nome_recebedor) <= 25);

alter table configuracoes_pix drop constraint if exists ck_config_pix_cidade_recebedor;
alter table configuracoes_pix
  add constraint ck_config_pix_cidade_recebedor
  check (char_length(btrim(cidade_recebedor)) >= 1 and char_length(cidade_recebedor) <= 15);

comment on table configuracoes_pix is
  'A chave Pix da loja, pro Pix copia e cola da cobrança e do faturamento (#456). Uma linha por loja. Todo mundo da loja lê; só o admin da loja grava.';

alter table configuracoes_pix enable row level security;

-- LER: quem tem acesso à loja.
drop policy if exists "configuracoes_pix_leitura" on configuracoes_pix;
create policy "configuracoes_pix_leitura" on configuracoes_pix
  for select to authenticated
  using (operador_tem_acesso_loja(loja_id));

-- GRAVAR, ALTERAR, APAGAR: só o admin daquela loja (a chave é pra onde vai
-- o dinheiro do cliente).
drop policy if exists "configuracoes_pix_insercao" on configuracoes_pix;
create policy "configuracoes_pix_insercao" on configuracoes_pix
  for insert to authenticated
  with check (operador_e_admin_da_loja(loja_id));

drop policy if exists "configuracoes_pix_alteracao" on configuracoes_pix;
create policy "configuracoes_pix_alteracao" on configuracoes_pix
  for update to authenticated
  using (operador_e_admin_da_loja(loja_id))
  with check (operador_e_admin_da_loja(loja_id));

drop policy if exists "configuracoes_pix_exclusao" on configuracoes_pix;
create policy "configuracoes_pix_exclusao" on configuracoes_pix
  for delete to authenticated
  using (operador_e_admin_da_loja(loja_id));

-- A trilha de auditoria (0053): quem trocou a chave, de qual pra qual.
drop trigger if exists trigger_auditoria on configuracoes_pix;
create trigger trigger_auditoria
  after insert or update or delete on configuracoes_pix
  for each row execute function registrar_auditoria('loja_id');

insert into schema_versao (versao) values (81) on conflict do nothing;
