# Relatório: tarefa #457, chefe backend

- **Tarefa**: #457, importar do sistema antigo por planilha, parte 1: clientes e veículos (FN-15)
- **Chefe**: backend
- **Data**: 2026-11-10
- **PR**: o desta branch (`claude/jolly-babbage-kufg0x`), `Closes #457`
- **Jeito**: com sessões filhas

## O que cada agente fez
- **Sessão mãe** (chefe backend): leu a issue e escreveu o contrato entre as partes (nomes de
  tabela, coluna, função e das funções puras). Abriu as duas filhas, juntou as branches, rodou as
  conferências (com um Postgres 16 descartável na própria sessão) e escreveu o `docs/modulos.md`, o
  relatório e o PR.
- **Filha A** (banco): migration `0083_importacao_lotes.sql`, com a tabela `importacao_lotes`, a
  coluna `importacao_lote_id` em `clientes` e `veiculos`, a RLS (Clientes **e** administrador) e a
  função `desfazer_importacao`. Fez também o `testar-importacao.sql`, a matriz de RLS, a instalação
  gerada, `VERSAO_ESQUEMA_ESPERADA = 83` e o `docs/banco.md`. Mexeu em `src/lib/errors.ts`, porque
  o `errors.test.ts` exige.
- **Filha B** (planilha): `importacaoPlanilha.ts` (CSV com `;`/`,`, UTF-8/Latin-1, aspas) e
  `importacaoClientes.ts` (mapeamento, conferência, agrupamento, "já existe"), com testes. Exportou
  `cpfValido`/`cnpjValido` de `pix.ts`, sem mudar a regra, e fez a planilha de exemplo inventada.
- **ajudante-medio** (gravação e tela): `src/lib/importacaoClientes.ts` (paginação, blocos de 500,
  ids gerados no programa), `ImportarClientesModal.tsx` (4 passos, relatório, desfazer) e o botão
  em `ClientesPage.tsx` (só admin), mais a cena nas varreduras de tela.
- **ajudante-forte** (revisão final, do zero): banco sem defeito; 10 achados no programa (1 alto,
  2 médios, 1 médio-baixo, 6 baixos).
- **ajudante-medio** (consertos): consertou os achados 1 a 8, com teste antes.
- **`/code-review` baixo**, nesta sessão, sobre os consertos: nenhum achado.

## Modelos usados
- Planejar e juntar (mãe): forte (`claude-opus-5-5`), esforço médio
- Filha A, banco: forte (`claude-opus-5-5`), esforço alto
- Filha B, funções puras: médio (`claude-sonnet-5-5`), esforço médio
- Gravação e tela: médio (agente `ajudante-medio`), esforço médio
- Revisão final: forte (agente `ajudante-forte`), esforço alto
- Consertos da revisão: médio (agente `ajudante-medio`), esforço médio
- Nenhuma troca por falha de modelo.

## Sessões filhas
- **Parte A** (`claude/tarefa-457-parte-a`, último commit `ab8badf`): "terminou". Verdes lá:
  `test:sql` (27), `test:rls` (1000 células) e `npm test`. Viu 16 mutações reprovarem. Arquivada.
- **Parte B** (`claude/tarefa-457-parte-b`, último commit `149bfbd`): "terminou". 2.000 linhas
  levam ~21 ms; viu 17 quebras reprovarem. Arquivada.

## Gasto
- **Uso da sessão mãe** (arquivo, **parcial**): o caminho da sessão mudou no meio, e o arquivo
  medido só tem a segunda parte. Nela: 60 respostas, 148 mil de cache criado, 9,3 milhões de cache
  lido e 31 mil de saída.
- **Ajudantes** (arquivo):
  - gravação e tela: 313 mil de cache criado, 4,3 milhões de cache lido, 44 mil de saída;
  - revisão: 167 mil, 4,3 milhões e 33 mil;
  - consertos: 158 mil, 7,2 milhões e 35 mil;
  - `/code-review`: 75 mil, 65 mil e 1 mil.
  - Pelo aviso de fim: 162 mil, 172 mil e 160 mil tokens nos três primeiros.
- **Sessões filhas**: não medido, porque rodam em outro computador e não mandaram o número.
- **`/goal`**: não sei se foi ligado (a coordenadora confere). O texto foi mostrado na primeira
  mensagem.

## O que testei e VI reprovar
- **Banco** (filha A): `testar-importacao.sql` antes da migration existir, e mais 16 mutações:
  - `invoker` no lugar de `definer`: apagou o veículo com OS de outra loja, e a OS ficou sem
    veículo;
  - sem conferir admin na função, na leitura, na criação e na alteração;
  - sem o `revoke` do anônimo;
  - sem filtrar o lote; com policy de delete; com cascade na marca do lote;
  - só OS nas chaves, sem a conta a receber;
  - sem marcar desfeito; sem a trava do tipo.
  - Na matriz: leitura aberta e policy de delete acusaram 4 células.
- **Planilha** (filha B): 17 quebras, entre elas o `fatal` do UTF-8, o separador, a aspa `""`, o
  CPF inválido, a data bissexta, a placa no banco e a placa repetida.
- **Gravação e tela**:
  - paginação de 1000;
  - veículo ligado ao cliente errado;
  - tamanho do bloco; sem o update final do lote;
  - gravar antes do Confirmar; não recalcular ao editar;
  - desfazer sem confirmação; botão visível pra não-admin.
  - O `contraste:telas` reprovou de verdade no modal novo (texto vermelho e verde no escuro), e foi
    consertado.
- **Consertos da revisão**: cada um com o teste visto reprovar antes:
  - aspa no meio do campo;
  - zero da frente perdido pelo Excel;
  - km acima do `int`;
  - número da linha do arquivo;
  - placa repetida sem perder o cliente novo;
  - só o número final do lote falhar;
  - Confirmar de novo depois de erro;
  - filtro sumindo com a linha;
  - fechar durante a gravação.

## O que passou sem eu ter visto reprovar
- A ordem de `listarLotesImportacao` (o banco simulado ignora o `order`).
- O botão "Copiar relatório" e o "x de y" (testados, mas sem quebra específica).
- O Latin-1 lido **pela tela** (testado na função, não pelo modal).
- A faixa de ano (já existia; o teste novo passou de primeira).

## O que ficou de fora
- **Achado 9 da revisão** (decidido pela issue, mas a Sofia deve saber): sem documento, o veículo
  se liga pelo nome também a um cliente **do cadastro**. Um homônimo que já tem CPF herda o veículo
  (aparece só como aviso). Opção: só ligar pelo nome quando o cliente do cadastro também não tem
  documento.
- **Achado 10** (baixo, só alcança administrador):
  - a policy de alteração do lote deixa o admin mudar `desfeito_em`/`operador_id` à mão;
  - um lote desfeito enquanto ainda grava recebe os blocos seguintes;
  - quem tem Clientes consegue marcar um cliente feito à mão com um lote, mas já podia apagá-lo.
  - Conserto possível: uma tarefa pequena de banco.
- `supabase/scripts/limpar-dados-de-teste.sql` apaga clientes mas deixa os lotes (sobra lote
  vazio; não quebra).
- Excel, peças, contas e histórico: partes seguintes, como a issue manda.

## O que depende de alguém
- **A Sofia**: aplicar a **migration 0083** no `ssace-teste` antes do teste no PC (ela não tem
  `versao-minima-do-programa`, porque só acrescenta). Nas lojas: a migration **antes** da versão.
  Ela também decide os arquivos fora da lista da issue (ver o PR).
- **O Gustavo, no PC**: o "No PC de quem fez" da issue, depois do "aplicado" da Sofia.
- **O número 0083**: a #381 e a #383, da mesma leva, também trazem migration. Quem mesclar depois
  renumera.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a lista de regras de migration e RLS foi direto pro pedido
  da filha A, que usou cada uma. O ritual das filhas, com o formato da mensagem, funcionou de
  primeira: as duas avisaram "começou" e "terminou".
- **Onde eu errei ou tive que adivinhar**:
  - A branch: o ritual pede `claude/tarefa-N-<curto>`, mas a sessão recebeu outra e é proibida de
    usar outra. Fiquei com a da sessão.
  - Escrever **o contrato** (nomes e tipos) nos dois pedidos permitiu tocar banco, planilha e tela
    em paralelo. Isso não está na skill.
- **O que faltou na skill**: dizer que o `test:sql`/`test:rls` rodam na nuvem subindo o Postgres 16
  que já vem instalado (`/usr/lib/postgresql/16/bin`, `initdb` + `pg_ctl` como usuário
  `postgres`). A skill diz "se houver".
- **Sugestão de ajuste (opcional)**:
  - no ritual, quando há filhas em paralelo, a mãe escreve um "contrato" de nomes no pedido de
    cada uma;
  - no chefe-backend, as duas linhas de como subir o Postgres na nuvem.
