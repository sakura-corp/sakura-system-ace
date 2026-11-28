# Relatório: tarefa #1017, chefe frontend

- **Tarefa**: #1017, listas sem internet: só o erro (nunca "Nenhum … cadastrado" junto) e recarregar sozinha quando a internet volta
- **Chefe**: frontend
- **Data**: 2026-11-26
- **PR**: o desta branch (`claude/tarefa-1017-listas-sem-internet`)
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue, planejou, escreveu os testes primeiro (vistos reprovar) e o código, rodou as conferências e tirou as fotos com o programa renderizado (servidor de telas com o Supabase de mentira, com a rede da lista cortada).
- **ajudante-forte (revisor final)**: leu o diff do zero. Achou 2 problemas reais, ambos conferidos no código e consertados:
  1. na OS, a recarga podia recomeçar com a internet oscilando;
  2. no Estoque, a recarga automática podia apagar um formulário aberto.
  Também levantou 2 pontos pequenos (abaixo, em "O que ficou de fora").
- Não chamei o ajudante médio pros testes e pro código: o plano era curto e o contexto já estava na mãe, então chamar sairia mais caro do que fazer.

## Modelos usados
- Ler a issue e planejar: forte (Opus 5.5), esforço médio (a sessão mãe).
- Testes e código: forte (Opus 5.5, a própria mãe). A issue pedia médio; não troquei de modelo, só não separei a etapa num ajudante.
- Revisão final: `ajudante-forte`, esforço alto.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (o Claude do PC não mostra o total pra sessão).
- **Ajudantes**: 1. O revisor forte, esforço alto, gastou cerca de 127 mil tokens (número que a ferramenta mostrou quando ele terminou).
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei. Esta sessão não mostrou o texto do `/goal` na primeira mensagem, e a falha é minha (ver "Como eu agi").

## O que testei e VI reprovar
- `useRecarregarQuandoVoltar`: com o gancho vazio, 5 dos 7 casos reprovaram. Os casos cobrem:
  - no erro, a internet voltou: recarrega uma vez;
  - sem laço;
  - caiu e voltou duas vezes;
  - entrou no erro sem a rede ter caído antes;
  - usa a função mais nova.
- **Clientes**: 3 casos reprovaram antes do conserto (o botão "Tentar de novo" não existia):
  - a busca falha → só o erro;
  - "Tentar de novo" mostra a lista;
  - a internet voltou → a lista recarrega sozinha.
- **Estoque → Produtos**: os mesmos 3 casos reprovaram. Antes aparecia "Nenhum produto cadastrado ainda." junto do erro.
- **Ordens de Serviço**: 2 casos reprovaram:
  - a busca falha → nem "Nenhuma ordem…" nem "Cadastre ao menos um cliente";
  - a internet voltou → recarrega.
  Depois da revisão, mais 1: com a internet oscilando, a recarga recomeçava (3 cargas em vez de 2).
- **No programa renderizado** (navegador com o Supabase de mentira e a leitura da lista cortada), nas três telas:
  - aparece só o erro com "Tentar de novo";
  - não aparece nenhum "Nenhum…" nem "Cadastre…";
  - devolvida a rede, a lista apareceu sozinha, sem clicar.
  Antes de esperar o tempo certo, o roteiro marcou FALHOU (a tela ainda estava em "Carregando…"); depois passou. Fotos em `docs/relatorios/fotos-1017/`.

## O que passou sem eu ter visto reprovar
- "A busca deu certo e voltou vazia → aparece o 'Nenhum … cadastrado'", nas três telas. Já funcionava antes; o teste guarda o comportamento.
- "A lista funcionando não recarrega quando a internet cai e volta", nas três telas. Também já era assim, porque antes nada recarregava.
- O conserto do Estoque da revisão (só recarregar sozinho com a tela sem peça). Não consegui montar no teste "peças na tela e uma recarga que falhou" sem mexer em muita coisa; foi conferido lendo o código.
- O `ErroDeCarga` (mensagem e botão).
- `typecheck` e `lint` passaram: 0 erros, 3 avisos antigos em arquivos que não mexi.
- `contraste` passou.
- `test:fusos` e a suíte inteira: só as mesmas 6 falhas que já acontecem na `main` neste PC (Windows). Elas estão em `conexao.test`, `gruposDre.test`, `checar-segredos.test` e `regras-de-lint.test`; conferi rodando na `main` limpa.

## O que ficou de fora
- **`contraste:telas` e `largura:telas` não rodaram neste PC.** O servidor de telas usa `spawn("npx")`, que no Windows não acha o `npx`. A prova vem do CI do PR, que roda as duas no Linux. Fica a sugestão de usar `shell: true` no Windows (`site/ferramentas/servidor-telas.mjs`), numa tarefa à parte.
- **Mudei 11 testes `OrdensServicoPage.*.test.tsx`, fora da lista de arquivos da issue.** Foi só uma linha em cada: o mock de `@/lib/supabase` ganhou `aoMudarARede: () => () => {}`, porque a tela agora ouve a rede pelo `useConexao`. É o mesmo jeito do teste da `FaixaSemConexao`. Sem isso, os testes da tela quebravam.
- **O `MoldeLista` continua com o desenho de erro dele.** O `ErroDeCarga` repete o mesmo desenho pra Clientes, que ainda não usa o molde. Fazer o molde usar o `ErroDeCarga` é mexer fora da lista.
- **2 pontos pequenos do revisor, que já existiam:**
  - Estoque: o erro do catálogo de uma carga velha não confere se a carga ainda vale (`EstoquePage.tsx`, o `setErroCatalogo`).
  - OS: se a carga da loja nova falha, a lista mostra as ordens da loja anterior (falta na OS o mesmo cuidado do #927).
- **As outras listas com o mesmo padrão** (erro e "Nenhum…" separados, sem recarregar sozinhas), pra tarefa seguinte. Conferir uma por uma, porque a lista saiu de uma busca pelo texto do vazio:
  - Orçamentos (`OrcamentosPage.tsx`)
  - Serviços (`ServicosPage.tsx`)
  - Garantias (`GarantiasPage.tsx`)
  - Fornecedores e Pedidos de compra (`FornecedoresSection.tsx`, `PedidosCompraSection.tsx`)
  - Funcionários e Comissões (`FuncionariosSection.tsx`, `ComissoesSection.tsx`)
  - Notas Fiscais (`ArquivosSection.tsx`)
  - Auditoria (`AuditoriaPage.tsx`)
  - Estoque → Movimentações e Contagem (`MovimentacoesSection.tsx`, `ContagemSection.tsx`)
  - Caixa Diário e Fechamento (`DiarioSection.tsx`, `FechamentoSection.tsx`)
  - Ficha do cliente e Ficha do veículo (`FichaClientePage.tsx`, `FichaVeiculoPage.tsx`)
  - Configurações: Categorias (as 3), Depósitos, Lojas e Computadores

## O que depende de alguém
- **Tiago, no PC** (caso B: abrir o programa, no Supabase de teste), branch `claude/tarefa-1017-listas-sem-internet`. Passo a passo geral em `docs/equipe.md`, "Testar no seu computador o que a sessão da nuvem fez". O roteiro é o "No PC de quem fez" da issue:
  1. Sem internet: Clientes, Estoque → Produtos e Ordens de Serviço mostram só o erro e o "Tentar de novo".
  2. Ligar a internet e não clicar em nada: em até meio minuto a lista aparece.
  3. Com uma lista funcionando, desligar e ligar a internet: a lista não pisca.
  4. Sem internet, clicar em "Tentar de novo": continua no erro, sem travar.
- **A Sofia**: revisar e aprovar o PR.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o "teste primeiro" e o "quebrar de propósito" pegaram o defeito da recarga em laço na OS antes de mesclar. A revisão forte achou o problema do Estoque, que nenhum teste pegava.
- **Onde eu errei ou tive que adivinhar**:
  - Não mostrei o `/goal` na primeira mensagem, como o ritual pede.
  - Não avisei a Recepção: não existe sessão "Recepção 26/11" neste PC, e eu não sabia pra onde mandar.
  - A frase "nada de tranca: continua vendo o que já estava" e a decisão "mostra só o erro" pareciam se contradizer. Li assim: sem dado na tela, só o erro; com dado, o dado fica e o erro vai em cima.
- **O que faltou na skill**:
  - O Claude do PC (Windows) não tem o `gh` e o conector do GitHub falhou. A issue foi lida pela API pública.
  - As ferramentas de tela (`contraste:telas`, `largura:telas`) não sobem o servidor no Windows.
- **Sugestão de ajuste (opcional)**: na seção 5 do `chefe-frontend`, dizer que no Windows o `contraste:telas`/`largura:telas` ficam com o CI. E, pra foto de estado de erro, que dá pra cortar a rede de uma tabela com `contexto.route(..., r => r.abort())` no servidor de telas.
