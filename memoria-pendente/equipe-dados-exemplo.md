# Memória pendente — Supabase de teste da equipe (sessão filha, 16/10/2026)

Branch: `claude/equipe-dados-exemplo`. Parte da #474, etapa 4 ("Supabase de teste ... com dados de
exemplo e um login pra cada um").

## O que foi feito
- `supabase/exemplo/dados-de-exemplo.sql`: cria a loja **"Autocenter Exemplo (TESTE)"** com dados
  fictícios: 3 funcionários sem login, 8 clientes (6 PF, 2 PJ, CPF/CNPJ com dígito certo), 9
  veículos (placa Mercosul), 12 peças com custo/preço/estoque, preço nos serviços padrão que estavam
  sem preço, 2 fornecedores, 12 OS/vendas em todas as fases (em andamento, concluída, faturada à
  vista, dividida Pix+Dinheiro, 3x no cartão, a prazo recebida, a prazo aberta, a prazo atrasada),
  caixa, contas a pagar (paga, aberta, atrasada, recorrente) e a receber. Datas contadas a partir
  de "hoje". Fiscal em homologação, sem token, sem CSC. IDs fixos começando com `eeee`,
  `on conflict do nothing`, número das OS explícito (a 2ª rodada não gasta número).
  **Trava**: para sem gravar nada se o banco tiver token no cofre, loja em produção, nota
  registrada, OS fora da loja de exemplo, ou clientes cadastrados sem nunca ter recebido o exemplo.
- `supabase/exemplo/ligar-login.sql`: liga um login do Supabase Auth (`<usuario>@sakura.local`,
  criado no painel) a um operador. Equipe = **operador comum, só a loja de exemplo**, módulos do dia a
  dia sem Notas Fiscais e Funcionários (e Configurações, que é só admin). Admin (a Sofia) = as duas
  lojas. Sem senha nem chave dentro; acha o login pelo e-mail (sem copiar UID).
- `supabase/exemplo/apagar-dados-de-exemplo.sql`: zera o movimento da loja de exemplo e o cadastro
  `eeee`; mantém a loja, os logins e o vínculo deles. Mesma trava. **Não usa o
  `limpar-dados-de-teste.sql`** (esse apaga de todas as lojas, sem trava).
- `supabase/scripts/testar-dados-de-exemplo.sql`: roda os arquivos de verdade (`\ir`), entra
  sozinho no `npm run test:sql` e no CI.
- `docs/supabase-de-teste.md`: o guia da Sofia, passo a passo, com tabelas.

## Decisões (e a alternativa descartada)
1. **Loja separada** com ID fixo, em vez de encher a "Loja 1" da instalação. Descartado usar a
   Loja 1: o "zerar" ficaria arriscado (a Loja 1 é a que toda instalação tem) e a separada ainda
   deixa testar multi-loja (a equipe não pode ver a Loja 1; o teste prova isso pela RLS).
2. **Logins pelo painel do Supabase + script**, e não pela tela Configurações → Operadores do
   programa. Descartada a tela por causa do defeito abaixo. Descartado também um script com a chave
   `service_role` (seria mais uma chave poderosa circulando).
3. **Equipe sem admin**, e sem Notas Fiscais e Funcionários. Descartado dar admin (deixaria mexer em
   Configurações, dados fiscais e operadores); se uma tarefa pedir, a Sofia marca o módulo.
4. **Organização grátis separada** no Supabase ("Sakura Teste"). Descartado criar dentro da
   organização das lojas: se ela está no Pro, cada projeto a mais tem custo de máquina por mês.
5. **Migration nova chega no teste colando de novo o `instalacao-completa.sql`**, e não pelo botão
   "Atualizar o banco de todas as empresas" (isso mexe no cofre; fica pra ela decidir).
6. **3 logins = Sofia (admin) + os 2 do programa das lojas.** O Gustavo (painel) não precisa; se
   precisar, é o mesmo Passo 6.

## Provado (Postgres 16 local, com o stub)
- `npm run test:sql`: os **12** testes passam, incluindo o novo; `npx vitest run`: 844 passam.
- O teste confere: as 4 travas do exemplo e a do apagar param com a mensagem certa e não deixam
  linha; tudo prometido existe; dinheiro bate (caixa = total da OS, conta a receber = total);
  estoque nunca negativo e toda peça usada tem baixa; CPF/CNPJ com dígito certo; placa Mercosul;
  e-mail só `@example.com`; nenhum token; **a 2ª rodada não muda nenhuma linha em tabela nenhuma**
  (nem auditoria); login da equipe comum, só na loja de exemplo, e pela RLS vê as 12 OS do exemplo
  e não a da Loja 1; o apagar mantém logins, Loja 1 e Consumidor; depois de apagar, o exemplo volta
  igual.
- **Visto reprovar** (quebrei de propósito, uma de cada vez): sem a trava de cliente (A1), caixa com
  ID aleatório (2ª rodada), equipe com Notas Fiscais (D), token na loja de exemplo (B3), apagar
  tirando os logins (E2), conta a receber com valor errado (B5).

## NÃO provado
- Nada foi rodado num Supabase de verdade. Os cliques e nomes das telas do guia vêm da documentação
  do projeto (INSTALAR-LOJA-NOVA.md) e podem ter mudado.
- `pg_temp` no SQL Editor do Supabase: a 0060 usa e já foi aplicada lá, mas este script não.
- O programa aberto (`npm run dev`) contra os dados de exemplo: as telas não foram olhadas.
- Os limites do plano grátis (2 projetos ativos por organização, pausa após ~7 dias) vieram de
  sites de terceiros; o site do Supabase não abriu do container.

## Defeito achado de passagem (virar tarefa no GitHub, formato da #425)
**Criar operador pelo programa instalado provavelmente não funciona.**
- *O que acontece*: Configurações → Operadores → criar, no programa instalado, deve dar erro de rede.
- *Por quê*: `src/lib/operadores.ts` (`criarOperador`) monta o cliente temporário com
  `import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co"`. No instalado não existe
  `.env` (o `release.yml` deixou de embutir a conexão de propósito), então o `signUp` vai pro
  endereço de mentira. O resto do programa usa `conexaoAtual()` (`src/lib/conexao.ts`).
- *O que fazer*: usar `conexaoAtual()` ali também, com um teste.
- *Pronto quando*: criar um operador no programa instalado funciona, e há um teste que reprova se o
  cliente temporário não usar a conexão salva.
- Visto **só lendo o código**; não rodei o instalado. Pode ser que a Pneus Amigão nunca tenha criado
  operador pelo instalado desde a `conexao.ts`.

## O que depende da Sofia
- Revisar e mesclar (os links do guia apontam pra `main`).
- Seguir o `docs/supabase-de-teste.md`: organização grátis, projeto `ssace-teste`, instalar, os
  dados de exemplo, os 3 logins, os Sends.
- Decidir se o `ssace-teste` entra no botão "Atualizar o banco de todas as empresas".
- (Sessão-mãe) abrir a tarefa do defeito acima, se concordar.
- (Sessão-mãe) pôr `docs/supabase-de-teste.md` na tabela do índice do `PROJETO_STATUS.md` ("abrir
  quando: ao mexer no banco de teste da equipe") e citar no manual da equipe.
