# Painel v2: o retrato de hoje e a nova organização (rascunho de 17/10/2026, à noite)

> **Rascunho.** As escolhas da seção 4 foram feitas pela Sofia em 17/10; nada foi construído: o código de `painel/` não
> foi mexido. Pedido dela: "planejar uma atualização nas abas do painel, organizando os dados,
> deixando mais claro e profissional, adiantar as abas das futuras funções".

## 0. O plano desta noite (e como ficou)

| # | Etapa | Quem | Resultado |
|---|---|---|---|
| 1 | Ler `docs/painel.md`, `docs/tarefas.md`, as skills e o código de `painel/` | sessão mãe | feito |
| 2 | Fotografar o painel de hoje (375 e 1280 px, claro e escuro) | sessão mãe | `docs/referencia/painel-v2/hoje/` |
| 3 | Montar a base comum das versões (fontes, cores, ferramenta de foto e contraste, dados de exemplo, a organização) | sessão mãe | `docs/referencia/painel-v2/comum/` |
| 4 | Três versões visuais em paralelo, cada uma só na sua pasta | três ajudantes (médio) | `versao-a/`, `versao-b/`, `versao-c/` |
| 5 | Pesquisa de referências | sessão mãe | `docs/referencia/painel-v2/referencias.md` |
| 6 | O retrato de hoje e a nova organização | sessão mãe | este arquivo, seções 1 e 2 |
| 7 | Olhar todas as fotos, comparar e recomendar | sessão mãe | seções 3 e 4 |
| 8 | Página de comparação (privada) | sessão mãe | link no PR |
| 9 | Rascunhos das tarefas de implementação, no modelo de `docs/tarefas.md` | sessão mãe (`nova-tarefa`) | `docs/rascunhos/painel-v2-tarefas.md` |
| 10 | Um PR só, **aberto e não mesclado** | sessão mãe | — |

**Sessões filhas: nenhuma.** Os três desenhos e a pesquisa couberam em ajudantes dentro desta sessão,
que gastam menos que uma filha (cada filha começa gastando ~70 mil tokens só pra ler o projeto).

## 1. O retrato de hoje

Fotos: `docs/referencia/painel-v2/hoje/` (`leva`, `sala`, `escritorio`, cada uma em 375 e 1280 px,
claro e escuro). Tiradas no `npm run dev` (sem login: dados de exemplo).

### O que existe

| Onde | Endereço | O que mostra | De onde vem o dado |
|---|---|---|---|
| **Tela de entrada** | qualquer um, sem login | "Entrar com o GitHub" | — |
| **Barra lateral** | todas | "Sakura Corp", o ponto "ao vivo", grupo **Levas** (cada `leva-N` + **Sala**), grupo **Agentes** (Escritório (exemplo)), **Financeiro** em breve (cadeado), a pessoa e "Sair" | `/api/levas`, `/api/eu`, tempo real (`/api/tempo-real`) |
| **Leva** | `/` (a atual) e `/leva/<n>` | "Painel da Sakura" + "Leva N", link "Ver no GitHub", aviso "fulano está com 2 em andamento", 4 cartões de contagem, "X de Y feitas · horas", barra de progresso, tarefas agrupadas por estado, e em cada tarefa não feita "Começar com o Claude" e "Copiar texto" | `/api/leva/<n>` (issues com a etiqueta `leva-N`) |
| **Sala** | `/sala` e `/sala?tv` | janela escura (visual B): pessoas, robôs do Claude, robôs da casa, "N coisas precisam de você", a lista por estado | `/api/sala` |
| **Escritório** | `/escritorio` | os agentes em salas em volta do Cérebro, tarefas de hoje, lista — **tudo de exemplo** | `src/dados/exemplo-escritorio.ts` |

### O que está confuso ou pouco profissional (olhando as fotos)

1. **A Sala está dentro do grupo "Levas"** na barra lateral. Não é uma leva; é a equipe.
2. **Os nomes não batem**: a barra diz "Sakura Corp", a página diz "Painel da Sakura", a tela de entrada
   diz as duas coisas. Falta um nome só e um cabeçalho de página igual em todas as telas.
3. **O cartão de cada tarefa grita**: o botão rosa cheio "Começar com o Claude" aparece em **toda**
   tarefa não feita (8 botões rosa na tela da leva de exemplo), mais "Copiar texto". O olho não sabe
   onde parar. A leva 1 (#538) já decidiu que ele aparece **só pra quem pegou**.
4. **No celular** é pior: cada tarefa ganha três linhas extras (os dois botões e a dica "No celular, se
   o texto não aparecer…", repetida em todas). A leva de 8 tarefas vira uma página de 2.600 px.
5. **No celular, a barra lateral vira um bloco no topo** com tudo empilhado, inclusive o "Financeiro em
   breve" com a frase inteira, empurrando o conteúdo pra baixo. E não existe jeito de voltar ao menu
   sem rolar até o topo.
6. **Os 4 cartões de contagem** ocupam muito espaço pra 4 números, e a barra de progresso fica solta
   embaixo deles.
7. **Não existe uma página "o que é meu"**: o que espera por mim (um PR pra revisar, uma rodada pra
   aprovar) só aparece dentro da Sala, misturado com o resto.
8. **Só um item "em breve"** (Financeiro). As outras funções planejadas (relatório e fases da leva,
   pessoas e horas, DRE, configurações) não aparecem em lugar nenhum.
9. **Itens sem ícone** na barra, e o item atual é um bloco rosa cheio, mais forte que o título da página.
10. **Na tela grande, a barra lateral termina no meio** da página inteira (ela é fixa na tela; ao rolar
    fica certo, mas a borda some na foto de página inteira). Não é defeito, só um detalhe a manter.
11. **O Escritório** é bonito, mas está num grupo próprio ("Agentes") com um item só, e escrito
    "(exemplo)" no menu. Pode ficar no grupo Equipe, com uma etiqueta "exemplo".

O que **está bom** e fica: as cores e o contraste conferidos, as fontes, o "ao vivo", o estado sempre
com a palavra (nunca só cor), a Sala no visual B, o cuidado com link só pra `github.com/sakura-corp/`.

## 2. A nova organização

### As abas da barra lateral

Cinco grupos. Item **"em breve"** aparece apagado, com cadeado, e **diz do que depende**. Clicar nele
abre uma página que explica o que vai ter ali, do que depende e qual tarefa cuida (o "estado vazio que
ensina", das referências).

| Grupo | Aba | O que mostra | Dado que **já existe** | Dado que **vai existir** | Situação |
|---|---|---|---|---|---|
| — | **Início** (`/`) | Precisa de você · A sua tarefa · a leva atual em uma linha · O que mudou hoje | o "precisa de você" e os robôs (`/api/sala`), a leva (`/api/leva`) | "o que mudou hoje" (a lista de eventos do repositório, `GET /repos/.../events`, lida na hora: o painel continua sem guardar nada) | **nova, sem custo** |
| Trabalho | **Leva atual** (`/leva`) | contador e progresso, horas por pessoa, tarefas por estado, o cartão com chefe e Depende de, Pegar/Largar | `/api/leva/<n>` | cabeçalho (#536), pegar (#538), horas por pessoa (#539) | existe; muda de lugar (hoje é a `/`) |
| Trabalho | **Levas anteriores** (`/levas`) | cada leva: tarefas, horas e quando terminou | `/api/levas` (falta a data de fim: a da última issue fechada) | — | **nova, sem custo** |
| Trabalho | **Versões** | o que saiu no canal de teste e o que foi liberado | releases do GitHub (públicas) | — | em breve: depende de uma tarefa (leva 2) |
| Trabalho | **Fases da leva** | a leva em etapas: planejar, fazer, congelar, testar, liberar | etiquetas e issues | um jeito de marcar a fase (a decidir) | em breve: depende da conversa de desenho (leva 2) |
| Trabalho | **Relatório da leva** | o relatório do fim da leva e a aprovação da Sofia | `docs/relatorios/` | a aprovação (a decidir) | em breve: depende da conversa de desenho (leva 2) |
| Equipe | **Sala** (`/sala`) | as pessoas e os robôs, ao vivo | `/api/sala` | — | existe |
| Equipe | **Pessoas** | cada pessoa: a tarefa de agora e as horas na leva. **Sem nota, sem ranking** | `/api/leva` | horas por pessoa (#539) | em breve: depende da #539 |
| Equipe | **Escritório** (`/escritorio`) | os agentes | só exemplo | de onde vêm os agentes (A, B ou C, `docs/painel.md`) | existe, com a etiqueta "exemplo" |
| Empresa | **Financeiro** | entradas, saídas, contas a pagar da Sakura Corp | — | **banco privado** (nunca no GitHub nem no repositório) | em breve: depende de escolher o banco privado |
| Empresa | **DRE** | o resultado do mês | — | o Financeiro | em breve: depende do Financeiro |
| Empresa | **Lojas** | cada loja cliente: versão instalada, banco atualizado | — | **banco privado** (nome de cliente não vai pro GitHub) | em breve: depende do banco privado |
| (rodapé) | **Configurações** | tema claro, escuro ou automático; avisos | — | guardado no navegador | em breve |
| (rodapé) | a pessoa + **Sair** | foto e login | `/api/eu` | — | existe |

**Por que esta ordem**: o que se usa todo dia em cima (Início, Leva, Sala); o que é da empresa e ainda
não existe embaixo, sem atrapalhar. O "ao vivo" fica no topo da barra, junto do nome.

**Regras que valem em qualquer versão**:
- Nome único: **"Sakura Corp"** na barra, e o título da página é o nome da aba (ex.: "Leva 1"). A tela
  de entrada diz "Painel da Sakura Corp".
- **Cabeçalho de página igual em todas**: a trilha pequena ("Trabalho / Leva atual"), o título, uma linha
  de explicação e as ações à direita.
- **Celular**: a navegação fica **à vista** (barra embaixo com os 4 ou 5 lugares mais usados, e o resto
  num "Mais"), em vez do bloco empilhado de hoje. A dica do celular aparece **uma vez**, não em cada tarefa.
- Item "em breve" **sempre diz do que depende**, e a página dele não tem número inventado (no Financeiro,
  nem fictício).
- **Dinheiro nunca mora no GitHub** nem no repositório: o Financeiro, a DRE e as Lojas só existem
  depois do banco privado, que é decisão dela.

### Onde entram as peças da leva 1 (sem fazer essas tarefas)

| Tarefa | Onde aparece na nova organização | Muda alguma coisa na tarefa? |
|---|---|---|
| **#536** cabeçalho (chefe, ajudantes, estimativa, Depende de) | no cartão/linha da tarefa na **Leva atual**; o "Espera #N" e o "tarefa incompleta" | não: o PR dela mexe no cartão de hoje; o v2 só redesenha o cartão **depois** que ela entrar |
| **#538** Pegar e Largar | na linha da tarefa (Leva atual) e no "A sua tarefa" do **Início** | não: idem, o v2 vem depois |
| **#539** horas por pessoa | o quadro "Horas por pessoa" na **Leva atual**; mais tarde, a aba **Pessoas** | não |

**A regra pra não brigar com a leva 1**: as tarefas do v2 que mexem no cartão e na tela da leva
**dependem de #536, #538 e #539** (começam depois que elas entram na `main`). As que só mexem na moldura
(barra lateral, cabeçalho de página, Início, páginas "em breve") podem andar junto, porque mexem em
outros arquivos. A divisão exata está em `docs/rascunhos/painel-v2-tarefas.md`.

## 3. As três versões, e a recomendação

Cada uma é um conjunto de páginas HTML com os **mesmos dados de exemplo** e a **mesma organização** (seção 2):
o que muda é o desenho. Fotos em `docs/referencia/painel-v2/versao-<letra>/fotos/` (375 e 1280 px, claro e
escuro; no celular também `-tela`, só a primeira tela, do jeito que a pessoa vê). As três passaram no
`conferir.mjs`: **contraste AA em todo texto e sem rolagem lateral**, nas 16 fotos de cada uma.

| | **A, "Calma"** | **B, "Quadro"** | **C, "Central"** |
|---|---|---|---|
| Ideia | a evolução do painel de hoje, mais perto do jeito do Claude | a leva como quadro de colunas | ferramenta de gestão densa, tabela e detalhe ao lado |
| Barra lateral | larga, com os cinco grupos, ícones, e cada "em breve" no seu grupo dizendo do que depende | estreita, só ícones com o nome embaixo; o grupo Empresa abre uma lista ao lado | larga, no fundo da página; todos os "em breve" juntos num grupo que recolhe; busca (em breve) |
| Leva | contador numa faixa, horas por pessoa com barrinhas, **uma tarefa por linha**; botões só na sua | **quatro colunas** (Livres, Em andamento, Em revisão, Feitas) com cartões | **tabela densa** + o **painel de detalhe** da tarefa escolhida |
| Início | duas colunas: o que é seu à esquerda, a leva e o dia à direita | cartões em grade | saudação, faixa "Precisa de você", três blocos |
| Celular | barra no topo com botão "Menu" (gaveta) | **barra fixa embaixo** (Início, Leva, Sala, Pessoas, Mais) e uma coluna por vez | barra fixa embaixo (4 itens) e lista de duas linhas |
| Títulos | serif grande (como hoje) | serif grande | Inter 20 px (serif só na saudação) |
| A favor | calma, clara, a mais fiel ao `docs/painel.md`; cabe muita tarefa sem rolar | bate o olho e vê o andamento; bom pra reunião | a mais "profissional"; o cabeçalho inteiro da tarefa (#536) aparece no detalhe |
| Contra | no celular o menu fica escondido atrás de um botão (a pesquisa diz que isso atrapalha) | com muitas tarefas, as colunas ficam compridas; no celular só se vê um estado por vez | mais fria, foge do "parecido com o Claude"; o "em breve" junto perde o desenho por assunto |

### Recomendação: **a versão A**, com **o celular da B**

- **A** é a que melhor cumpre o pedido ("mais claro e profissional") **sem perder o jeito calmo** já decidido no
  `docs/painel.md`, e a lista de uma linha por tarefa aguenta a leva crescer.
- **O celular da B**: a barra fixa embaixo deixa os lugares mais usados sempre à vista (é o que a pesquisa
  mostra, `referencias.md`), em vez do botão "Menu" da A.
- **Da C, guardar pra depois**: o painel de detalhe da tarefa (cabeçalho inteiro ao lado da lista) é uma boa
  ideia quando a leva tiver muitas tarefas; e a **visão em quadro da B** pode virar um segundo jeito de ver a
  mesma leva (pergunta 5).
- Detalhes a acertar na hora de construir: no celular da A o "Início" aparece três vezes (topo, trilha e
  título); a C tem um contador "6" ao lado de "Leva atual" que vale copiar pro "Precisa de você".

Os rascunhos das tarefas (`docs/rascunhos/painel-v2-tarefas.md`) partem desta recomendação; se a escolha for
outra, muda só a referência de cada tarefa.

## 4. Perguntas pra Sofia (responder numa linha)

> **Respondidas pela Sofia em 17/10/2026, de madrugada (pelo celular): tudo como a recomendação.**
> `versão: A · celular: B · início: sim · lojas: sim · nome: sim · quadro: depois · quando: leva 2`
> Ou seja: a versão **A, "Calma"**; no celular, a **barra fixa embaixo** (o da B); a `/` vira o **Início** e a leva
> vai pra `/leva`; a aba **Lojas** (em breve) entra no grupo Empresa; o nome é **"Sakura Corp"** na barra e
> **"Painel da Sakura Corp"** na entrada; a **visão em quadro fica pra depois**; as tarefas do v2 entram na **leva 2**.
> Falta só ela aprovar os rascunhos de `docs/rascunhos/painel-v2-tarefas.md` antes de virarem issue.


Jeito de responder: **`versão: A · celular: B · início: sim · lojas: sim · nome: sim · quadro: depois · quando: leva 2`**
(é a recomendação; troque o que quiser).

1. **Versão** (`versão:`): A, B ou C? Pode misturar por parte: `barra: A`, `leva: C`, `celular: B`, `início: B`.
   *Recomendo A.*
2. **Celular** (`celular:`): a barra fixa embaixo (B ou C) ou o botão "Menu" com gaveta (A)? *Recomendo B.*
3. **Início** (`início:`): a `/` passa a ser o Início, e a leva atual vai pra `/leva`? Os links antigos de
   `/leva/<n>` continuam funcionando. *Recomendo sim.*
4. **Lojas** (`lojas:`): mostrar, no grupo Empresa, uma aba "Lojas" (em breve) pra acompanhar a versão e o banco de
   cada loja cliente? Ela também dependeria do banco privado, porque nome de cliente não pode ir pro GitHub.
   *Recomendo sim (só como "em breve").*
5. **Nome** (`nome:`): "Sakura Corp" na barra e "Painel da Sakura Corp" na tela de entrada, no lugar do
   "Painel da Sakura" de hoje? *Recomendo sim.*
6. **Quadro** (`quadro:`): a visão em colunas da B como segundo jeito de ver a leva: `agora`, `depois` ou `não`?
   *Recomendo depois.*
7. **Quando** (`quando:`): as tarefas do v2 entram na **leva 2** (recomendado: a leva 1 já está cheia e as V2-5
   e V2-6 dependem dela), ou a V2-1 (barra lateral, que não cruza com a leva 1) entra já na leva 1?

**Não é pergunta pra agora, só lembrete**: o Financeiro, a DRE e as Lojas só saem do "em breve" depois de
escolher o **banco privado** (decisão estrutural dela, `docs/painel.md`). Nada disso foi decidido aqui.
