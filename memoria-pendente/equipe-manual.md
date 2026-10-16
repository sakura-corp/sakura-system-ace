# Sessão filha "equipe-manual" (16/10/2026): regra da seção 0 e manual da equipe (#474, etapa 4)

## O que foi feito
- **Seção 0 do `PROJETO_STATUS.md`**: o escopo agora é "o Gustavo, só o painel; os outros dois, o
  programa das lojas, sempre contra o Supabase de teste". Todas as proibições ficaram. Aponta pro
  manual novo. O roteiro de "Como começar uma tarefa" agora aponta pro `docs/equipe.md`. Nova linha
  na tabela de docs. Tamanho: 23 650 → 23 861 bytes (+211).
- **`docs/equipe.md`** (novo): primeiro dia (Windows e Mac, com a mensagem pra colar no Claude),
  como começar uma tarefa, o dia a dia (branch, conferências reais do `package.json`, PR, pedir a
  revisão da Sofia e parar), o que nunca fazer, tamanho da leva.
- **`docs/painel.md`**: as seções "Primeiro dia" e "Como começar uma tarefa" viraram um link pro
  manual novo (o resto do arquivo não foi mexido).
- **`README.md`**: "quem entra na equipe começa pelo `docs/equipe.md`" (era `docs/painel.md`).

## Decisões (e a alternativa descartada)
- **Ninguém da equipe roda SQL nem migration, nem no Supabase de teste** (a regra antiga dizia
  "de loja nenhuma"). Descartada: deixar rodar no de teste, o que exigiria saber quem cuida de
  desfazer e deixaria o banco de teste diferente do que a Sofia montou. Se ela quiser liberar o de
  teste, é uma linha da seção 0 e uma do manual.
- **As chaves de teste vão no `.env`, colado pela própria pessoa no editor de texto**, nunca na
  conversa com o Claude. Se aparecer a tela de configuração da conexão, não preencher (sinal de
  `.env` errado). Descartada: usar a tela de configuração do programa, que grava a conexão no
  computador e é o caminho das lojas.
- **A mensagem do "Primeiro dia" mudou** em relação à aprovada por ela em 30/09: ganhou "Windows
  ou Mac" e "painel ou programa" entre colchetes, configurar o Git com o e-mail da Sakura, e o
  passo 6 (instalar e abrir o programa). Descartada: manter duas mensagens (painel e programa).
- **`npm test` ficou fora da tabela de conferências**: o CI não roda ele sozinho; o
  `test:fusos` roda os mesmos testes nos dois fusos.

## O que NÃO foi provado
- Ninguém seguiu o manual num PC de verdade, nem Windows nem **Mac**. Que o programa das lojas
  abra no Mac com `npm run dev` é suposição (o manual diz pra anotar no PR o que só funcionar no
  Windows).
- O manual cita o "login de teste" e o Supabase de teste, que são de outra sessão filha
  (`docs/supabase-de-teste.md`, `supabase/exemplo/`). Não conferi o que ela escreveu; conferir que
  os dois textos batem (ex: quem cria o login, o que vai no Bitwarden Send) ao juntar.

## O que depende da Sofia
- Revisar o `docs/equipe.md`, principalmente a mensagem nova do "Primeiro dia".
- Confirmar a decisão "nem SQL no Supabase de teste".
