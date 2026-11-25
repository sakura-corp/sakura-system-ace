# Relatório: tarefa #1134, chefe frontend

- **Tarefa**: #1134, visual leva 8, peças comuns (3/5): moldes de formulário e de perfil
- **Chefe**: frontend
- **Data**: 2026-11-23
- **PR**: ver a descrição do PR desta branch (`claude/elegant-albattani-4gw2ay`)
- **Jeito**: com ajudantes

## O que cada agente fez
- **ajudante-forte (revisor)**: leu o diff do zero, sem o meu raciocínio, compilou as classes do
  Tailwind em dúvida e devolveu 7 defeitos e 10 sugestões (seção "Revisão" abaixo).
- Explorador e construtor da tabela da issue: não chamei. Achar um formulário de exemplo foi ler
  o `docs/estrutura.md`, o `Modal`, o `Botao`, o `MoldeLista` e o `useEnterParaProximoCampo`. Os
  moldes e os testes foram escritos na sessão mãe, com os testes primeiro, como na #1135: chamar um
  ajudante pra isso gastaria mais cota do que fazer.

## Modelos usados
- Planejar, escrever os moldes e os testes: sessão mãe, forte (Opus 5.5), esforço baixo.
- Revisão final: ajudante-forte (Opus 5.5), esforço alto. Nenhuma troca por falha.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (via arquivo, medido antes do relatório e do PR): 71 respostas; entrada
  142, cache criado 191 mil, cache lido 12,95 milhões, saída 70 mil.
- **Ajudantes** (1): ajudante-forte, esforço alto. Pelo arquivo: 26 respostas; entrada 52, cache
  criado 146 mil, cache lido 2,97 milhões, saída 26 mil. Pelo aviso: 151 mil tokens, 27 ferramentas.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei. A tarefa veio pronta no pedido de abertura ("termine com PR aberto e um
  relatório"), e o texto do `/goal` não foi mostrado à pessoa no começo. Erro meu de ritual (ver
  "Como eu agi").

## O que entrou
- `CampoDoMolde`: rótulo em cima com 14 px; "obrigatório" escrito (e `aria-required`); erro com
  ícone e frase embaixo do campo; ajuda embaixo; erro e ajuda ligados ao campo pro leitor de tela.
  Campo de uma linha com 48 px. O campo é de quem chama, por uma função (funciona com `register`,
  `select` e área de texto; com o `Combobox`, só o `id`).
- `MoldeFormulario` + `SecaoDoFormulario`:
  - formulário curto em janela (`Modal`): foco no primeiro campo; Esc, ✕ e "Cancelar" fecham,
    menos no meio do "Salvando…";
  - formulário longo em página: cada seção num cartão, rodapé preso embaixo com "Cancelar" e o
    botão principal (48 px), à direita;
  - nos dois: o Enter anda de campo em campo e confirma no fim; 2 cliques não salvam 2 vezes; o
    erro ao salvar fica do lado do botão.
- `MoldePerfil`:
  - cabeçalho com nome, selo, detalhe, a ação laranja e o resto no "⋯" (40 px);
  - 1 número grande com rótulo e comparação, mais até 3 de apoio, menores (o tipo não deixa passar
    de 3);
  - listas embaixo, que são o `MoldeLista` com 6 linhas e o "Ver todos". A função `listaDoPerfil`
    confere o tipo de cada lista.

## Revisão (ajudante-forte, do zero) e o que mudou
Conferi cada achado no código antes de mexer; todos procediam.

**Defeitos corrigidos**, cada um com teste novo, visto reprovar com o conserto desfeito:
1. **Na página, o rodapé preso cobria o campo que ganhava o foco** (Tab, Enter, foco no campo com
   erro). Agora o campo coberto rola pra cima do rodapé. No navegador, com Tab de campo em campo,
   o CEP terminou em 604 px e o rodapé começa em 619.
2. **Com o `Combobox`, espalhar o `campo` quebrava**: ficava uma caixa dentro da outra e os `aria-*`
   sumiam. O comentário agora manda passar só o `id`.
3. **Erro que escapa do `salvar` virava "erro não tratado" sem dono.** Agora o molde destrava o
   botão e manda o erro, com a pilha, pro registro de erros do programa (`registrarErros.ts`).
4. **O teste do erro ao salvar não testava erro**: ele engolia a rejeição. Agora usa o
   `handleSubmit` de verdade, com um `salvar` que rejeita.
5. **O "?" dos números tinha 24 px de alvo.** Agora tem uma área invisível de 40 px (o clique pega
   a 18 px do centro pros quatro lados, medido no navegador), sem mexer na peça.

**Aceitos**: a janela não fecha no meio do "Salvando…" (Esc, ✕, "Cancelar"); o título da janela
deixou de ser lido duas vezes; a chave das listas e dos números é pela posição; o perfil tem
`w-full`; os comentários avisam que, na página, a janela com formulário vai como irmã do molde e
que embrulhar o `aoEnviar` sem `return` perde a trava.

**Ficou de fora** (está em "O que ficou de fora").

## O que testei e VI reprovar
- **Sem as peças**: os 3 arquivos de teste reprovam inteiros.
- **Quebrando de propósito, um pedaço por vez** (cada quebra reprovou o teste dela):
  - campo sem os 48 px;
  - campo sem a ligação com a ajuda e o erro;
  - "obrigatório" virando um "*";
  - erro sem ícone;
  - erro sem `aria-invalid`;
  - envio sem a trava (salvou 2 vezes);
  - botão com `disabled` em vez de `aria-disabled` (o foco cairia);
  - janela sem o foco no primeiro campo;
  - formulário sem `noValidate`;
  - erro fora do rodapé da janela;
  - botão principal médio (40 px);
  - perfil sem o limite de 6 linhas;
  - número principal pequeno;
  - "Ver todos" sem chamar a tela;
  - "⋯" sem nada dentro.
- **Os consertos da revisão, desfeitos um por um**: o botão não destravando depois de um erro; o
  erro não indo pro registro; a janela fechando no meio do "Salvando…"; o campo coberto não
  rolando; o "?" sem a área de 40 px.
- **Testes de compilação**: afrouxar o tipo dos números de apoio, ou da `listaDoPerfil`, faz o
  `typecheck` reclamar do `@ts-expect-error` que sobrou.

## O que passou sem eu ter visto reprovar
- `typecheck`, `lint` (sem erro; 3 avisos antigos, de fora destes arquivos), `contraste`, e
  `test:fusos` (235 arquivos, 2947 testes).
- `contraste:telas`: 74 telas, nenhuma reprovação. `largura:telas`: nada passa da janela; a tela
  51 passou na segunda tentativa, com "a sessão caiu durante a medição", que não tem a ver com esta
  tarefa. Nenhuma tela usa os moldes ainda; a prova dos moldes são as medidas e as fotos abaixo.
- **Medidas na tela renderizada** (página de rascunho fora do Git, já apagada), em 1024 e 1366 ×
  700, claro e escuro:
  - campos de uma linha com 48 px;
  - "Salvar cliente", "Cancelar" e "Nova OS" com 48 px;
  - "⋯" com 40 px;
  - foco no campo Nome ao abrir a janela;
  - nada rola de lado;
  - nenhum erro no console.
- **O teste "Esc não fecha a página"** passa porque nada ouve o Esc na página: ele só pega se
  alguém ligar isso depois (achado do revisor).
- **Fotos** (claro e escuro) em `docs/relatorios/fotos/2026-11-23-tarefa-1134/`: janela, janela com
  erro de campo e erro ao salvar, página e perfil (também em 1024). As fotos são de antes dos
  consertos da revisão, que não mudaram a aparência.

## O que ficou de fora
- **O ✕ do `Modal` tem 32 px**, abaixo dos 40 da leva 8. É peça de fora desta parte (o rodapé do
  Modal é a #1125). Fica como sugestão pra Sofia.
- **A janela fecha quando se arrasta do campo pra fora** (aperta o mouse no campo pra selecionar,
  solta no fundo): é o `onClick` do fundo, no `Modal.tsx`. O revisor achou provável, mas não
  testou. Mesma sugestão.
- **Ligar o erro e a ajuda ao `Combobox`**: ele não aceita os `aria-*`. É mudança no Combobox.
- **O botão principal do perfil não segura o segundo clique**: hoje ele abre uma tela ("Nova OS").
  Se algum dia gravar direto, ele precisa da trava do formulário.
- **"Ver todos" em vez de "Ver todas"** (a issue escreve "Ver todas"): o texto é do `MoldeLista`,
  peça da parte 4/5, e vale pra todo o programa.
- **As cenas no catálogo das telas e na mostra das peças**: são da parte 5/5 (#1136), como as
  partes 1, 2 e 4 também deixaram.
- **No foco do primeiro campo**: se o primeiro campo for um `Combobox`, a lista dele abre sozinha.
  E campo que aparece depois de carregar não ganha o foco (só ao abrir).
- **Trocar as telas pros moldes**: é de cada tarefa da trilha (a issue manda não fazer aqui).

## O que depende de alguém
- **A Sofia**: revisar o PR. Também decidir as duas sugestões do `Modal` (o ✕ de 32 px e o
  fechar ao arrastar), que viram tarefa à parte, se ela quiser.
- **Teste no PC** (`docs/equipe.md`, "Testar no seu computador o que a sessão da nuvem fez"):
  caso A, só `npx vitest run src/components/molde` na branch `claude/elegant-albattani-4gw2ay`. Ver
  as peças no catálogo das telas fica pra quando a #1136 puser a cena.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**:
  - o ritual deixou claro que a revisão final vai pro forte, e ela achou 5 defeitos que os meus
    testes não pegavam;
  - a regra de que o teste só prova o que se viu reprovar: quebrei 20 coisas de propósito;
  - o relatório da #1135 serviu de molde pro jeito (sessão mãe escreve, forte revisa) e pras fotos
    numa página de rascunho.
- **Onde eu errei ou tive que adivinhar**:
  - **não mostrei o texto do `/goal`** na primeira mensagem, como manda o ritual (seção 2, passo 5);
  - usei a branch que a sessão recebeu (`claude/elegant-albattani-4gw2ay`) em vez de
    `claude/tarefa-1134-<curto>`: a sessão só pode enviar pra ela;
  - **"Esc fecha" na página**: entendi que o Esc vale pra janela, e que na página ele não pode
    jogar fora um cadastro comprido. Isso está escrito no molde; se a Sofia quiser o Esc na página
    (voltar, talvez perguntando antes), é uma linha;
  - o hook do Enter não acha campo no jsdom (`offsetParent` é sempre nulo ali); o teste simula o
    `offsetParent` pra provar o caminho de verdade.
- **O que faltou na skill**: o mesmo que a #1133 e a #1135 apontaram: um jeito pronto de fotografar
  uma peça nova antes de ela ter cena no catálogo (fiz de novo uma página de rascunho à mão). E o
  `npm ci` na nuvem falha no download do Electron; com `ELECTRON_SKIP_BINARY_DOWNLOAD=1` funciona
  (pra rodar os testes de tela, o binário não é preciso).
- **Sugestão de ajuste (opcional)**: na skill `chefe-frontend`, seção 5, uma linha: "na nuvem,
  instalar com `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci` (o download do Electron cai no proxy)".
  Fica como proposta pra Sofia.
