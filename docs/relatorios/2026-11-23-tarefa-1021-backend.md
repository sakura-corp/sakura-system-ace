# Relatório: tarefa #1021, chefe backend

- **Tarefa**: #1021, "De onde veio": a origem do cliente no cadastro, na OS, no orçamento e na venda de balcão
- **Chefe**: backend
- **Data**: 2026-11-23
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/1171
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe (eu)**: li a issue e o código, achei onde OS, orçamento e venda são criados (inclusive a
  função `cadastrar_cliente_rapido`), escrevi a migration `0091`, o teste SQL, o schema
  `origemCliente.ts`, tipos, libs, o `CampoOrigem` e as quatro telas, com teste antes.
- **Ajudante revisor (forte)**: leu o diff do zero. Nenhum defeito importante; 6 achados pequenos.
  Consertei o 4 (o gatilho apagava o "quem indicou" que o cliente já tinha) com teste visto
  reprovar; o 1 (teste da tela fora do commit) e o 6 (`docs/banco.md`) também. Os 2, 3 e 5 ficaram
  como estão (ver "O que ficou de fora").
- Explorador e escritor de telas: não chamei à parte; o código era pequeno e eu já tinha lido tudo.

## Modelos usados
- Sessão mãe: forte, esforço baixo.
- Revisor: ajudante-forte, esforço padrão.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (sem acesso ao contador nesta sessão).
- **Ajudantes**: 1 (revisor, forte): cerca de 138 mil tokens, 28 ferramentas, ~3 min (pelo aviso).
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei

## Fotos (programa de verdade, dados inventados do modo demonstração)
Em `docs/relatorios/fotos/2026-11-23-tarefa-1021/` (claro e escuro; roteiro em `fotografar.mjs.txt`):
1. Clientes → Novo cliente, com "Indicação" e "Zé da padaria".
2. Nova OS com um cliente que veio por indicação: o campo já vem "Indicação", com o aviso
   "Veio do cadastro do cliente; dá pra trocar".
3. Novo orçamento, trocado pra "Google".
4. Venda de balcão no Consumidor, com "Passou na frente".

## O que testei e VI reprovar
- **Banco** (`testar-origem-do-cliente.sql`, num Postgres local descartável): quebrei a migration de
  8 jeitos, um por vez, e cada um reprovou no ponto certo: a trava aceitando qualquer valor
  (FALHOU 4); o gatilho não copiando (8); o gatilho trocando origem que já existia (9); sem a trava
  do Consumidor (6); o gatilho sem pular o Consumidor (a venda no Consumidor quebrou); o gatilho
  sem `security definer` (14, quem tem só OS); o cadastro rápido ignorando a origem (15); o gatilho
  apagando o detalhe que o cliente já tinha (12b, achado do revisor, visto reprovar antes do conserto).
- **Regras puras** (`origemCliente.test.ts`): trocar de cliente passando por cima da escolha à mão;
  o Consumidor sugerindo origem; um valor a mais na lista do programa (o teste compara com a trava
  da migration). Os três reprovaram.
- **Tela** (`CampoOrigem.test.tsx`): sem aplicar a sugestão (3 reprovaram), sugestão passando por
  cima da escolha (1), e a OS que já abre com o cliente não recebendo a origem (1).
- **Gravação** (`origemCliente.gravacao.test.ts` e `origemCliente.formularios.test.ts`): escritos
  antes do código; 12 reprovaram até o código existir.

## O que passou sem eu ter visto reprovar
- A matriz de RLS (`npm run test:rls`): verde, 1040 células; nenhuma policy mudou, então não havia o
  que quebrar.
- Os outros 31 testes SQL (`npm run test:sql`): todos verdes com a 0091.
- `typecheck`, `lint` (só os 2 avisos que já existiam), `contraste`, `largura:telas` (74 telas × 5
  larguras) e `contraste:telas` (nenhuma combinação ilegível; na primeira rodada, as duas telas de
  Pedidos de compra, que não mexi, não abriram a tempo enquanto os testes de banco rodavam juntos;
  na segunda rodada, sozinha, as 74 telas passaram).
- `test:fusos`: os dois fusos só reprovam no teste da numeração (ver abaixo).

## O que ficou de fora
- **CI vermelho num teste só, de propósito**: `scripts/atualizar-bancos.test.ts` ("sem buraco na
  numeração"). A `0088`–`0090` estão reservadas pela Sofia pros PRs #1120, #1121 e #1123
  (`docs/banco.md`). A `0091` fica certa assim que eles entrarem; antes disso, este teste segura o PR,
  e é bom que segure: o botão "Atualizar o banco" pula migration de número menor que a do banco.
- **Sugestão pra quem não tem o módulo Clientes**: a `clientes_janela` continua só com id e nome
  (o `testar-clientes-permissao.sql` trava isso), então a OS dessa pessoa não vem preenchida. A
  herança (cliente sem origem pega a da OS) vale pra ela, porque é no banco.
- Achados pequenos do revisor, não consertados: (2) uma escolha à mão igual à origem do cliente
  anterior é tratada como sugestão ao trocar de cliente; (3) "Não informado" escolhido de propósito
  pode voltar a receber a origem do cliente se a tela for montada de novo; (5) cliente cuja origem
  foi limpa de propósito volta a ganhar a de uma OS quando ela for salva de novo (é a regra da issue).
- Importação por planilha: não mexi (cliente importado fica "Não informado"), como a issue manda.
- Arquivos fora da lista da issue, só os obrigatórios: `src/lib/errors.ts` (o teste exige frase pra
  toda trava `ck_` e o nome de toda coluna nova), `docs/banco.md`, e quatro testes antigos que
  comparavam o objeto exato ou contavam as caixinhas da tela.

## O que depende de alguém
- **Sofia**: aplicar a migration `0091` (sem `versao-minima-do-programa`), **depois** da `0088`–`0090`
  e **antes** da versão do programa que tem este código (o programa novo grava as colunas novas).
  Primeiro no banco de teste, pra o Gustavo testar.
- **Gustavo, no PC**: os passos do "No PC de quem fez" da issue, depois que a Sofia avisar que
  aplicou no banco de teste.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a lista de regras de migration (idempotente, `schema_versao`,
  `VERSAO_ESQUEMA_ESPERADA`, `gerar-instalacao`, teste SQL que termina na frase) virou uma lista de
  conferência; e "teste de banco não visto reprovar não vale" me fez quebrar a migration 8 vezes.
- **Onde eu errei ou tive que adivinhar**: o número da migration. A issue diz "o próximo livre na
  `main`" (seria `0088`), mas o `docs/banco.md` registra a reserva da `0088`–`0090`. Fui pela reserva,
  e o teste "sem buraco" ficou vermelho. Também adivinhei que a herança devia ser no banco (gatilho),
  e não no programa, porque quem tem só OS não grava em `clientes`.
- **O que faltou na skill**: dizer o que fazer quando o "próximo número livre" já está reservado por
  PRs abertos, e lembrar que o `src/lib/errors.ts` sempre muda junto com migration que cria trava ou
  coluna (a lista de arquivos da tarefa não tinha).
- **Sugestão de ajuste (opcional)**: na seção 3 da skill, uma linha: "conferir `docs/banco.md` pelos
  números reservados por PR aberto antes de escolher o número; e toda trava `ck_` e coluna nova
  entram em `src/lib/errors.ts`".
