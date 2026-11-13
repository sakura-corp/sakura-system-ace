# Relatório: tarefa #374, chefe frontend

- **Tarefa**: #374, aviso claro quando a internet da loja cai (TR-10.1)
- **Chefe**: frontend
- **Data**: 2026-11-10
- **PR**: o PR da branch `claude/tarefa-374-frontend-nidtp2` (aponta este arquivo)
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue e planejou. Achou que o postgrest-js 2.110.9 **já repete sozinho**
  as leituras do banco que caem por rede (3 vezes, 1 s, 2 s e 4 s). Mudou o plano da etapa 4 por
  isso (abaixo). Corrigiu a frase da tela de Atualizações (a busca por versão nova só acontece ao
  abrir o programa). Tirou as fotos e consertou os dois achados da revisão.
- `ajudante-rapido`: não chamado. A mãe achou os arquivos e os pontos de gravação com 3 buscas;
  passar o contexto custava mais.
- `ajudante-forte` (erro de rede e fetch): fez `ehErroDeRede`, `MENSAGEM_SEM_CONEXAO`,
  `criarFetchDoPrograma` e `aoMudarARede`, com 52 testes, incluindo um ponta a ponta com o
  `createClient` de verdade. Quebrou a regra 7 vezes de propósito.
- `ajudante-medio` (conexão, faixa e avisos): fez `useConexao` (um estado só, uma conferência só),
  `FaixaSemConexao`, a faixa no `App.tsx` e as frases nas 3 telas, com testes.
- `ajudante-medio` (rascunho): fez o `salvarAgora` no `useRascunhoFormulario` e a chamada no
  `catch` do Salvar dos 5 formulários, com teste no `ClienteForm`.
- `ajudante-forte` (revisão final): nenhuma gravação é repetida. Achou 2 defeitos médios, os dois
  consertados: (1) a faixa ficava presa e a conferência de 30 s não voltava quando a tela
  principal montava de novo; (2) a faixa rolava junto com a página. Achou também 3 pontos baixos
  (ficaram de fora, abaixo).

## Modelos usados
- Planejar: forte (sessão mãe, claude-opus-5-5), esforço médio
- Erro de rede e fetch: forte (`ajudante-forte`), esforço alto
- Conexão, faixa e avisos: médio (`ajudante-medio`), esforço médio
- Rascunho nos 5 formulários: médio (`ajudante-medio`), esforço médio
- Revisão final: forte (`ajudante-forte`), esforço alto
- Nenhuma troca por falha.

## Sessões filhas
- Nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe**: não medido (não li o arquivo da sessão).
- **Ajudantes**: 4, medidos pelo aviso de fim: erro de rede (forte, alto) ~123 mil tokens; faixa
  (médio) ~90 mil; rascunho (médio) ~82 mil; revisão (forte, alto) ~154 mil.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não sei se foi ligado (o texto foi mostrado ao Tiago na primeira mensagem).

## A mudança de plano da etapa 4 (o fetch que repete leitura)
A issue sugeria um `fetch` próprio que repetisse todo `GET`/`HEAD`. O postgrest-js 2.110.9 já
repete os `GET`/`HEAD` do banco (`/rest/v1/`) que caem por rede: 3 vezes, esperando 1 s, 2 s e
4 s, e nunca outros métodos. Com as duas camadas, cada leitura seria tentada **16 vezes** (o teste
mostrou: "expected 4 times, but got 16 times"). Então o fetch novo repete **só** o que a biblioteca
não repete (download de arquivo, `GET`/`HEAD` fora de `/rest/v1/`). A regra é a mesma da issue: até
3 tentativas a mais, 1 s, 2 s e 4 s, e gravação nunca. O teste ponta a ponta prova as duas coisas
com o cliente de verdade: `.select()` caído é tentado 4 vezes no total; `insert`, `update`,
`delete` e `rpc` caídos, 1 vez cada.

## O que o teste no PC achou (11/11)
- Com o cabo de rede tirado, a faixa apareceu, mas Clientes e Ordens de Serviço ficaram em
  "Carregando..." por minutos, em vez de mostrar a frase de sem conexão. O Windows não avisou a
  queda (placas de rede virtuais continuam "ligadas"), então cada pedido ficou pendurado, sem falhar.
  Os testes da nuvem não pegaram isso porque o fetch de mentira sempre falhava na hora.
- Conserto (`src/lib/supabase.ts`): **leitura** sem resposta desiste sozinha em 15 s, ou em 4 s
  quando a rede já caiu ou o navegador diz que está sem rede. O tempo conta só até a resposta
  começar (os cabeçalhos), nunca o download do corpo. **Gravação continua sem tempo limite.**
- A revisão da Sofia achou um efeito colateral: o cancelamento de quem chamou deixou de alcançar
  o corpo. Consertado (o repasse do cancelamento só sai no erro), e os testes ficaram mais fortes:
  - corpo em pedaços que termina depois do limite;
  - o tempo curto conferido de verdade;
  - HEAD;
  - `navigator.onLine === false`;
  - a volta ao tempo normal depois de uma resposta;
  - o cancelamento vindo do `Request`.
- Na ferramenta de telas (Playwright com o banco de mentira), não deu pra reproduzir o caso da
  tela inteira com o banco pendurado: o relógio da página parou no meio. Lendo o banco direto pelo
  cliente do programa, com 18 leituras penduradas ao mesmo tempo, o erro chegou em 34 s. A
  palavra final é do teste no PC.
- A faixa "O banco desta empresa já recebeu uma atualização que este computador ainda não tem",
  que apareceu no PC, não é desta tarefa: o banco de teste está à frente desta branch.

## Limites conhecidos (sem mexer agora)
- O cabo saindo **no meio** de um download grande do Storage ainda pode deixar a tela esperando:
  o tempo limite não cobre o corpo.
- Logo depois de uma queda, uma consulta lenta e legítima tem só 4 s até algum pedido responder.
  A conferência de 30 s do `useConexao` volta o tempo normal sozinha.
- Gravação pendurada (sem resposta) continua esperando: cortar uma gravação poderia dizer "não
  salvou" sobre o que já chegou ao banco.

## O que testei e VI reprovar
- Fetch: deixar POST ser repetido (4 testes reprovaram); tirar a exceção do `/rest/v1/` (a leitura
  foi tentada 16 vezes); repetir tudo (14 reprovaram, entre eles insert, update, delete e rpc).
- `ehErroDeRede`: aceitar qualquer mensagem (10 reprovaram, inclusive RLS, trava `ck_` e deadlock);
  ignorar o `code` do banco (1 reprovou); ignorar o cancelamento (1 reprovou); `AuthRetryableFetchError`
  com qualquer status (1 reprovou).
- `useConexao`: a conferência não parar (3 reprovaram); `online` limpar sozinho (2); ignorar o
  "respondeu" (1). O caso da revisão (a tela sai e volta com a faixa ligada) foi visto reprovar
  ("expected to be called at least once") antes do conserto.
- Tempo limite (11/11): antes do conserto, os 4 testes de leitura sem resposta reprovaram (ficavam
  pendurados). Quebras de propósito, cada uma pega pelo seu teste:
  - tempo limite também na gravação;
  - nunca voltar ao tempo normal;
  - ignorar o navegador sem rede;
  - sempre 15 s;
  - o relógio cortando o corpo;
  - não olhar o signal do `Request`;
  - HEAD fora da leitura.
  O teste "quem chamou cancela depois da resposta" reprovou antes do conserto pedido pela Sofia.
- Rascunho: sem `salvarAgora` no catch do `ClienteForm`, o teste "sem rede: grava o rascunho na
  hora" reprovou; com `valoresRef` no lugar do `watch()`, "não grava se nada mudou" reprovou.

## O que passou sem eu ter visto reprovar
- Os testes de aviso em Emitir nota, Importar por foto e Atualizações (a frase aparece com
  `offline`, e o botão continua habilitado).
- O teste do `ClienteForm` com erro de RLS: não grava rascunho.
- `typecheck`, `lint` (0 erros; 1 aviso antigo em `AuthContext.tsx`), `test:fusos`, `contraste`,
  `contraste:telas` (nenhuma reprovação nova) e `largura:telas`.
- Um script à parte (fora do repositório, pra não mexer nos arquivos das varreduras) abriu 5 telas
  no app de telas, simulou a queda, mediu o contraste da faixa e dos avisos (ok), fotografou e
  conferiu que a faixa some com a volta.

## O que ficou de fora
- **A faixa não entra nas varreduras `contraste:telas`/`largura:telas`**: elas abrem as telas com a
  internet ligada. Pôr uma cena "sem internet" é mexer em `site/ferramentas/`, fora da lista da
  issue. A medição foi feita pelo script à parte.
- **Fotos de Importar por foto e de Atualizações**: o "Importar por foto" está desligado (pedido da
  Sofia em 25/09), e a seção de Atualizações só aparece dentro do programa instalado. Ficam provados
  pelos testes.
- **Achados baixos da revisão**: (a) cancelar um download no meio da espera entre tentativas só
  para depois da espera (até 7 s; não grava nada); (b) a frase "tente de novo" depois de uma
  gravação que caiu pode levar a um segundo clique que grava em dobro, se o banco tiver recebido a
  primeira e só a resposta se perdeu. Antes da tarefa já era assim; vale uma frase própria pra
  gravação ("confira na lista se já foi salvo"), e o texto é decisão da Sofia; (c) peça cadastrada
  com estoque inicial que falha no meio: é a #909, não mexi.
- **Central do dia**: já mostra o erro do carregamento com `mensagemDeErro()`, e agora isso sai em
  português. Não mexi nela (fora da lista).

## O que depende de alguém
- **A Sofia**: aprovar o texto da faixa e dos avisos pelas fotos do PR.
- **O Tiago, no PC** (caso B, abrir o programa; `docs/equipe.md`, "Testar no seu computador o que a
  sessão da nuvem fez"), branch `claude/tarefa-374-frontend-nidtp2`: o roteiro do "No PC de quem
  fez" da issue (desligar a internet em Clientes, ver a faixa, a lista de OS em português, o Salvar
  do cliente falhar e o rascunho voltar, a frase do Emitir nota, e nenhum cliente duplicado).
- **A Sofia, depois de publicar**: tirar o cabo de rede no `.exe` instalado da loja.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a tabela de ajudantes deixou claro o que ia pro forte
  (o fetch, onde repetir gravação duplica dinheiro) e o que ia pro médio. A regra "olhar a tela
  renderizada de verdade" pegou um problema na primeira foto: abrir a janela de nota lia o banco
  de mentira, ele respondia e a faixa sumia, como devia. A foto teve que simular a queda depois de
  abrir.
- **Onde eu errei ou tive que adivinhar**: a issue pedia a frase "perto do botão de procurar
  atualização", mas esse botão não existe (a busca é automática ao abrir). O ajudante pôs "não dá
  pra procurar atualização" perto do Salvar do canal, o que enganava. A mãe trocou a frase.
- **O que faltou na skill**: a issue manda rodar `contraste:telas`/`largura:telas`, mas uma faixa
  que só aparece num estado (sem internet) não é vista por elas. Faltou dizer o que fazer nesse caso.
- **Sugestão de ajuste (opcional)**: na seção 5 do `chefe-frontend`, "componente que só aparece num
  estado especial (sem internet, erro, vazio): medir com um script à parte, simulando o estado,
  ou propor uma cena nova em `site/ferramentas/cenas.mjs` à Sofia".
