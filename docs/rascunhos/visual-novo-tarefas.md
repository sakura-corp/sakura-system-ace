# Visual novo (#990): rascunho das tarefas pra equipe (14/11/2026)

> **Rascunho. Nenhuma virou issue.** **Mudou em 14/11**: a Sofia decidiu que uma sessão nova do
> Claude aplica a base de uma vez (as tarefas 1 a 7, nesta ordem, um PR por tarefa, nada publicado),
> e a equipe entra depois, com as tarefas 8 em diante e as melhorias. As decisões da tarefa 0 que ela
> já tomou estão marcadas; as outras a sessão nova pergunta antes de começar. As regras de aparência estão em
> `docs/referencia/visual-novo/README.md`, e o conceito funcionando em
> `docs/referencia/visual-novo/conceito/`.

## A ordem, e por quê

| # | Tarefa | Horas | Depende de | Por que nesta posição |
|---|---|---|---|---|
| 0 | As decisões da Sofia (issue `sofia`) | — | — | trava as outras: logo, letras, ícones, o jeito de migrar |
| 1 | As cores novas e as letras dentro do programa | 6 | 0 | muda o programa inteiro num arquivo; dá pra ver no mesmo dia |
| 2 | As peças: botão, selo, placa, campo, tabela, janela | 10 | 1 | tudo que as telas vão usar |
| 3 | O menu novo (ícones, grupos, abrir e encolher) | 8 | 2 | aparece em toda tela |
| 4 | **Tela-piloto: o Início** | 10 | 2, 3 | a Sofia vê e aprova antes das outras (#990) |
| 5 | O movimento | 5 | 4 | só depois que a tela está certa parada |
| 6 | A logo e o ícone do programa, e o Login | 5 | 0 | pode andar em paralelo com a 2 e a 3 |
| 7 | Ordens de Serviço e o Faturar em janela | 8 | 2, 5 | muda comportamento, não só cor |
| 8 em diante | As outras telas, em grupos de umas 8 | 6 cada | 4 aprovada | uma tarefa por grupo do menu |

Total até a tela-piloto aprovada: umas 39 h. Tudo é `chefe:frontend`, sem banco e sem migration.
**De quem é a cota**: da equipe. Da Sofia, só a tarefa 0 e olhar a tela-piloto.

**Vale pra todas** (não repetir em cada uma):
- Nenhum campo, coluna, filtro, atalho ou botão some. Mudou de lugar: dizer no PR onde foi parar.
- `npm run contraste`, `contraste:telas` e `largura:telas` verdes, além de `typecheck`, `lint` e CI.
- Foto de antes e depois de cada tela mexida, no relatório da tarefa.
- Não publicar nem liberar. A Sofia testa tudo de uma vez, no fim de semana.
- **Melhorar enquanto mexe** (Sofia, 15/11): quem leva uma tela pro visual novo usa ela como quem
  está no balcão e anota o que deixaria ela menos confusa: o que já fez, o que sugere e o que virou
  tarefa (regras, seção 12). Aparência e clareza, decide e mostra; costume da loja, conta ou nota
  fiscal, volta pra ela antes.
- **Usar as peças** (prontas desde a tarefa 2): `Botao`, `Selo`, `LinkPlaca`, `CartaoNumero`,
  `Modal`, `Dica`, `avisar()` e as classes `sakura-campo` e `sakura-tabela` (regras, seção 6, "Onde
  está cada peça"). Peça nova entra na mostra das peças no mesmo PR.

---

## Tarefa 0 — As decisões que travam o visual novo (etiqueta `sofia`)

Ela responde de uma vez, olhando a página do conceito:

1. **Qual logo**: **decidido, a B**, com o ícone do programa no quadrado claro (14/11).
2. **As letras dentro do programa**: **decidido, sim** (14/11): Plus Jakarta Sans e Inter embutidas,
   como arquivo local.
3. **Os ícones do menu**: **decidido, a biblioteca `lucide-react`** (14/11).
4. **O jeito de migrar**: primeiro trocar só os valores das cores de hoje, depois criar os nomes de
   papel (seção 10 das regras). Recomendo **sim**.
5. **O fio de gráfico nos cartões do Início**: muda a sua decisão de 11/09 (só o valor e a seta).
   Recomendo **sim**, com o fio pequeno e sem eixo.
6. **Faturar numa janela** e **as ações da lista no botão de três pontos**. Recomendo **sim** pros
   dois.
7. **Quando o ícone novo entra**: junto com a primeira tela nova (recomendo) ou já.
8. **O tema claro**: **decidido, agora, logo depois da tarefa 2** (14/11), pra cada tela já nascer
   nos dois. Ela quer os dois temas, com configuração, e a logo mudando junto.

As de número 4 a 7 seguem a recomendação: ao mandar aplicar as tarefas 1 a 7, ela aceitou o jeito
de migrar, o fio de gráfico, o Faturar em janela e o botão de três pontos. A sessão mostra o Início
e a lista de OS prontos antes de seguir, e ela pode trocar ali.

**Pedido dela durante a aplicação (14/11)**: nada cresce sem limite. A Central do dia tem sempre a
altura de 4 linhas e a lista rola por dentro; o mesmo vale pra todo bloco que recebe lista (regras,
seção 6, "O que pode crescer"). Entra na tarefa 4 e vale pras tarefas 8 em diante.

---

## Tarefa 1 — As cores novas e as letras dentro do programa

```
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 6 h
Depende de: tarefa 0
Sessões filhas: não
```

**Pra que serve**: o programa inteiro sai do rosa e roxo pro laranja e carmesim mexendo num arquivo
só, e passa a mostrar a mesma letra em qualquer PC.

**Decisões já tomadas**: a paleta e os contrastes (seções 2 e 3 das regras); primeiro só os valores
(seção 10); a borda de campo continua branco a 35%.

**O que fazer**
1. Em `src/styles/globals.css`, trocar os valores dos `--color-sakura-*` pela tabela da seção 10.
   Atualizar o comentário do topo ("Dark Neon Edition" deixa de valer).
2. No mesmo arquivo, criar os tokens de papel da seção 3 (`--color-fundo`, `--color-acao`…) **ao lado**
   dos antigos, sem usar ainda.
3. Onde `sakura-purple` é **fundo com letra branca**, trocar a letra pra `sobre-acao`. Achar com
   `npm run contraste` e `contraste:telas`: eles reprovam cada caso.
4. Embutir as duas letras como arquivo local e ligar em `--font-sans` (Inter) e num `--font-titulo`
   novo (Plus Jakarta Sans). Conferir que carrega **sem internet**.
5. Subir `--text-titulo` pra 26 px e `--text-metrica` pra 30 px.
6. Trocar `public/sakura-login-bg-premium.png` e o `sakura-shell-bg` pelo fundo novo (mancha + grão,
   seção 5), copiando a classe `.grao` do conceito.

**Arquivos**: `src/styles/globals.css`; `package.json` (as letras); os componentes que os testes de
contraste apontarem. Mexer fora disso: parar e perguntar.

**Etapas e modelos**: planejar (mãe, forte); trocar valores e letras (ajudante, médio); corrigir o
que o contraste apontar (ajudante, médio); revisão do diff (revisor, forte).

**Pronto quando**
- No PR: `contraste` e `contraste:telas` verdes, **vistos reprovar antes** (rodar depois do passo 1 e
  antes do 3, e colar a lista do que reprovou); `largura:telas` verde; fotos de 5 telas antes e depois.
- No PC de quem fez: abrir o programa com o Wi-Fi desligado e conferir que a letra dos títulos é a
  nova (o "a" e o "y" de "Sakura System" são redondos); abrir Início, Clientes, Ordens de Serviço,
  Caixa e Contas a Pagar e não achar nada rosa nem roxo.
- Depois de publicar: nada.

**O que não fazer**: não renomear classe nas telas; não mexer em layout; não tirar os tokens antigos.

---

## Tarefa 2 — As peças (FEITA em 15/11)

> **O que entrou**: `Botao` e `LinkBotao`, `Selo`, `Dica`, `CartaoNumero`, o aviso que some
> (`avisar()`), a placa com a faixa azul, a janela com o total em cima e as ações embaixo, e as
> classes de campo, tabela e cartão. O `sakura-card` virou sólido em todas as telas; o vidro ficou
> só no Login (`sakura-vidro`). No Início, só os três cartões de número trocaram. A lista completa,
> e o que saiu diferente do conceito, está nas regras (seção 6, "Onde está cada peça"); as fotos, em
> `docs/referencia/visual-novo/andamento/2-pecas/`.
>
> **Ficou pra tarefa de cada tela**: trocar os botões, os selos, os campos e as tabelas das telas
> pelas peças. A regra fora de camada do `globals.css` que deixa cinza o botão `bg-sakura-purple`
> desligado sai quando a última tela usar o `Botao`.

```
Chefe: frontend
Ajudantes: tester
Estimativa: 10 h
Depende de: tarefa 1
Sessões filhas: não
```

**Pra que serve**: cada tela para de inventar o seu botão e o seu selo. Uma peça, um lugar.

**O que fazer**: criar (ou adaptar os que já existem) os componentes da seção 6 das regras, cada um
com teste:
1. `Botao` com as variantes principal, secundário, fantasma e WhatsApp (o `BotaoWhatsapp.tsx` vira
   uma variante), nos três tamanhos.
2. `Selo` de aviso: recebe o tipo (`info`, `atencao`, `ok`, `perigo`, `neutro`), o ícone e a palavra.
   **Sem a palavra não compila**: é a regra 4.
3. `LinkPlaca.tsx`: a aparência da placa (faixa azul em cima), sem mudar o que ela faz.
4. Campo, select e a tabela: as classes da seção 6, no `globals.css`.
5. `Modal.tsx`: a aparência nova (opaco, canto 22, cabeçalho com total, rodapé com as ações).
6. `Dica` (o texto que aparece ao passar o mouse) e o aviso que some sozinho.
7. O cartão de número (`Valor.tsx` e o cartão do Início), **ainda sem o fio de gráfico**.

**Arquivos**: `src/components/` (os citados e os novos), `src/styles/globals.css`.

**Pronto quando**
- No PR: teste de cada peça; um teste que prova que o `Selo` sem palavra é recusado; `contraste` verde.
- No PC de quem fez: abrir a lista de Ordens de Serviço e conferir que as placas têm a faixa azul e
  que clicar numa abre a ficha do veículo.

**O que não fazer**: não trocar os botões das 54 telas aqui. As telas trocam nas tarefas delas.

---

## Tarefa 3 — O menu novo (FEITA em 15/11)

> **O que entrou**: os quatro grupos com ícone, aberto e encolhido (lembrado por computador), o
> fundo que desliza até o item ativo, a dica com o nome quando encolhido, o ponto laranja em
> "Orçamentos", e o rodapé com Diagnóstico, Auditoria, Configurações e Sair como ícones. O menu
> passou a encostar na borda da janela. O que saiu diferente do conceito, e as sugestões, estão nas
> regras (seção 7, "Como saiu no programa"); as fotos, em
> `docs/referencia/visual-novo/andamento/4-menu/`.
>
> **Aprovado pela Sofia em 15/11** ("pode ficar assim, e o atalho do tema fica"): o menu e o atalho de
> trocar o tema no rodapé.

```
Chefe: frontend
Ajudantes: tester
Estimativa: 8 h
Depende de: tarefa 2
Sessões filhas: não
```

**Pra que serve**: o menu passa a ter ícone, grupos e dois tamanhos, e sobra tela pra trabalhar.

**Decisões já tomadas**: seção 7 das regras (os quatro grupos, aberto por padrão, o programa lembra a
escolha por computador). A ordem dos itens é provisória.

**O que fazer**
1. `src/types/operador.ts`: acrescentar a cada item de `MODULOS` o ícone e o grupo. **Não mudar
   `chave` nem `rota`**: as permissões dependem delas.
2. `src/components/Sidebar.tsx`: os grupos, o ícone, o botão de abrir e encolher, o fundo que desliza
   até o item ativo, a dica com o nome quando encolhido, e o ponto laranja em "Orçamentos" quando há
   orçamento em aberto. Quem não tem permissão de um módulo continua sem vê-lo; grupo vazio some.
3. Guardar aberto ou encolhido no `localStorage`, com `try/catch`.
4. Diagnóstico, Auditoria, Configurações e Sair: ícones com dica, com as mesmas regras de quem vê
   cada um hoje.
5. Atualizar `Sidebar.orcamentos.test.tsx` e escrever os testes novos.

**Arquivos**: `src/components/Sidebar.tsx`, `src/components/Logo.tsx`, `src/types/operador.ts`,
`src/App.tsx` (a largura da área), os testes.

**Pronto quando**
- No PR: teste de que um login só com Caixa vê só o grupo Financeiro com um item; teste de que a
  escolha é lembrada; teste de que encolhido o nome aparece como dica e pra leitor de tela;
  `largura:telas` verde **com o menu aberto e com o menu encolhido**.
- No PC de quem fez: encolher o menu, fechar o programa, abrir de novo e ver que continua encolhido;
  passar o mouse em cada ícone e ler o nome; com um login só com Caixa, ver só o que ele pode.

**O que não fazer**: não mexer nas rotas nem nas permissões; não esconder item atrás de submenu.

---

## Tarefa 4 — Tela-piloto: o Início (FEITA em 15/11, #1052)

```
Chefe: frontend
Ajudantes: backend (a série por dia do fio de gráfico), tester
Estimativa: 10 h
Depende de: tarefas 2 e 3
Sessões filhas: não
```

**Pra que serve**: a primeira tela inteira no visual novo, pra Sofia aprovar antes das outras.

**O que fazer** (a referência é a foto `3-inicio.jpg`)
1. Título com o "Resumo pro dono" à direita (o `BotaoResumoDono.tsx` de hoje, só a aparência).
2. `CentralDoDia.tsx` como cartão de destaque: a capa com a mancha e o grão, o número de itens em
   54 px, e a lista com um selo por linha e o botão que resolve. **O cartão tem sempre a altura de
   4 linhas** (a da foto), com 1 item ou com 15: a lista rola por dentro (`AreaRolavel.tsx`) e a
   capa diz o total (pedido da Sofia, 14/11). **As regras de o que aparece e em
   que ordem não mudam** (`src/schemas/centralDoDia.ts`). Com zero itens, a capa diz "Tudo em dia".
3. Os três cartões de número, com a variação, o "?" e o fio de gráfico. O fio precisa do valor de
   cada dia do mês: a conta nova vai em `src/schemas/`, **nunca dentro da tela**, com teste, e usa
   `diaLocal()`. Sem dados suficientes (menos de 3 dias), o cartão aparece sem o fio.
4. "OS abertas" com a placa e o selo; "Veículos no pátio" (o `VeiculoIcone.tsx` continua).
5. O calendário (`MiniCalendario.tsx`): hoje em laranja com letra escura, os pontos coloridos, e a
   lista de datas com ícone.
6. Os cartões continuam personalizáveis em Configurações → "Cartões do Início".

**Arquivos**: `src/pages/painel/`, `CentralDoDia.tsx`, `MiniCalendario.tsx`, `Valor.tsx`,
`src/schemas/` (a série por dia).

**Pronto quando**
- No PR: teste da série por dia, **visto reprovar**, rodando nos dois fusos (`test:fusos`); teste do
  cartão sem fio; `contraste:telas` e `largura:telas` verdes no Início.
- No PC de quem fez: comparar com a foto, bloco por bloco; clicar em cada botão da Central do dia e
  ver que abre o lugar certo; com um login sem Contas a Pagar, o cartão mostra "—" como hoje.
- Depois de publicar: a Sofia olha o Início na loja e diz se segue pras outras telas.

**O que não fazer**: não mudar número nenhum (vendas, lucro, ticket saem das mesmas funções); não
começar outra tela antes do "sim" dela.

---

## Tarefa 5 — O movimento (FEITA em 16/11, #1054)

```
Chefe: frontend
Ajudantes: tester
Estimativa: 5 h
Depende de: tarefa 4
Sessões filhas: não
```

**Pra que serve**: trocar de tela, abrir janela e mudar de item passam a ter o movimento curto dos
vídeos de referência.

**O que fazer**: a tabela da seção 8 das regras, só com CSS, num lugar só do `globals.css` (as
durações e a curva como tokens). Os blocos de uma tela entram um depois do outro; a janela sobe e
cresce; o número do Início conta até o valor; o fio é desenhado. Com as animações desligadas no
Windows, **nada se move**.

**Pronto quando**
- No PR: um teste que liga "reduzir movimento" e confere que nenhuma animação roda; `test:electron`
  verde.
- No PC de quem fez: trocar de tela dez vezes seguidas, rápido, e não ver nada piscar nem atrasar o
  clique; no Windows, desligar "Efeitos de animação" e ver tudo aparecer parado.

**O que não fazer**: não instalar biblioteca de animação; nada em laço; nada acima de meio segundo
(fora o fio de gráfico).

---

## Tarefa 6 — A logo, o ícone do programa e o Login (FEITA em 16/11, #1051)

```
Chefe: frontend
Ajudantes: marketing (as cópias do site), tester
Estimativa: 5 h
Depende de: tarefa 0 (a logo escolhida)
Sessões filhas: não
```

**O que fazer**
1. Copiar a versão escolhida de `docs/referencia/visual-novo/conceito/logo/` pra
   `public/sakura-icon.svg`; gerar o `build/icon.png` de 1024 px (num quadrado escuro de canto
   arredondado, com a flor ocupando uns 70%); a versão `mini` pros tamanhos de 16 a 32 px.
2. `Logo.tsx`: a flor e o nome em letra de verdade (Plus Jakarta Sans), não mais o SVG do nome
   desenhado à mão. Sai o `public/sakura-logo.svg`.
3. O Login pela foto `2-login.jpg`: fundo com a mancha e o grão, cartão de vidro escuro, a flor em
   cima, Usuário, Senha, Entrar, "Configurar a conexão" e a versão no canto. As telas de conexão e
   de trocar senha no mesmo molde.
4. As cópias em `site/` (ícone e logo).
5. **A barra da janela** (pedido da Sofia, 15/11; regras, seção 12): tirar a faixa branca do
   Windows, deixando a barra na cor do programa com os três botões de verdade por cima
   (`titleBarStyle: "hidden"` com `titleBarOverlay`, no `electron/main.ts`), e uma faixa de arrastar
   no topo do programa. Trocar também o `backgroundColor: "#FFF7FC"` (o rosa-claro do tema antigo,
   que pisca ao abrir) pelo `#0A0A0D`. O canto arredondado vem sozinho no Windows 11; **não forçar**
   no 10 sem perguntar a ela (custa a sombra e o encaixe na lateral).

**Pronto quando**
- No PR: `test:electron` verde; foto do Login em 1366×768 e em 1920×1080.
- No PC de quem fez: gerar o instalador de teste e conferir o ícone na área de trabalho, na barra
  de tarefas e no canto da janela.
  Com a barra nova: arrastar a janela pelo topo, dar duplo clique no topo (maximiza), encaixar na
  lateral da tela, e clicar nos três botões, **no Windows 10 e no 11**; nenhum botão do programa
  pode ficar embaixo dos três botões da janela.
- Depois de publicar: a Sofia confere o ícone no PC da loja depois da atualização automática.

**O que não fazer**: não pôr a flor na capa nem no fim da apresentação comercial (regra dela).

---

## Tarefa 7 — Ordens de Serviço e o Faturar em janela (FEITA em 16/11, #1055)

```
Chefe: frontend
Ajudantes: tester
Estimativa: 8 h
Depende de: tarefas 2 e 5
Sessões filhas: não
```

**O que fazer** (fotos `5-ordens.jpg`, `5b-ordens-mais-acoes.jpg` e `6-faturar.jpg`)
1. A lista: abas com o traço laranja, os filtros, a tabela com placa e selo, e na linha **só o
   próximo passo** ("Faturar" em laranja; "Avisar" em verde na finalizada). As outras ações de hoje
   ("Fechamento", "Avaliação", "Avisar" quando não é o próximo passo) vão pro botão "Mais ações".
   O `AcoesDaLinha.tsx` já existe: é por ele.
2. O Faturar (`FaturamentoCard.tsx`) abre no `Modal.tsx`, com tudo que tem hoje: recebido agora ou a
   receber depois, dividir em mais de uma forma, parcelas e juros, o total com os juros. **Nenhuma
   conta muda.**
3. Ao confirmar, a janela fecha, a linha muda de selo e aparece o aviso "OS 148 faturada".
4. O mesmo pra aba "Vendas de balcão" e pra tela de Orçamentos.
5. **A nota do cliente à mão depois de faturar** (pedido da Sofia, 15/11; regras, seção 12): na
   linha da OS finalizada e no aviso de "OS faturada", um caminho direto pra ver, imprimir ou mandar
   a nota do cliente, sem ir até Notas Fiscais procurar. Mostrar a ela antes de fechar.

**Pronto quando**
- No PR: os testes de faturamento de hoje continuam verdes sem mudar uma linha de conta; teste de
  que "Mais ações" abre pelo teclado e fecha com Esc; `largura:telas` verde em 1366 px.
- No PC de quem fez, no Supabase de teste: faturar uma OS metade no Pix e metade no cartão em 3x e
  conferir no Caixa o mesmo valor de antes da mudança; abrir "Mais ações" de uma OS finalizada e
  achar "Avaliação" e "Fechamento".

**O que não fazer**: não mexer em `src/schemas/` de faturamento; não tirar nenhuma ação, só mudar de
lugar.

---

## Tarefa do tema claro (entra depois da 2, se ela disser "agora")

> **FEITA em 15/11** (#1046), com o "sim" da Sofia pra cara do tema claro ("por mim pode ficar assim
> por enquanto"). O que foi feito e as cores estão nas regras, seção 13; as fotos, em
> `docs/referencia/visual-novo/andamento/3-tema-claro/`.

Estimativa: 8 h. Desenhar o tema claro primeiro, **por imagem**, e mostrar à Sofia (a mesma página do
conceito, com um botão de claro e escuro). Depois: os tokens de papel ganham o segundo conjunto de
valores; a configuração em Configurações (por computador, lembrada; o padrão é o escuro); a logo de
dentro do programa troca junto; o `contraste` e o `contraste:telas` passam a rodar **nos dois
temas**. Cuidado certo: amarelo e verde claros não passam em fundo branco, então as cores de aviso
do tema claro são outras, mais escuras.

---

## Tarefas 8 em diante — As outras telas (com a equipe)

> **Andamento em 16/11**: na `main`: Clientes, veículo e Garantias (#1057); Estoque, Fornecedores e
> Serviços (#1059); Caixa (#1058); Contas (#1056); Notas Fiscais (#1060); Funcionários (#1066).
> Orçamentos entrou na tarefa 7. Faltam: Relações, Configurações/Auditoria/Diagnóstico (#1062) e os tokens.

Uma tarefa por grupo do menu, cada uma depois do "sim" da Sofia no Início:
Clientes e a ficha do veículo; Orçamentos e Garantias; Estoque, Fornecedores e Serviços; Caixa
Diário; Contas a Pagar e a Receber; Notas Fiscais (**com o pedido dela de 15/11**: a nota do cliente
fácil de achar, no lugar de só "Ver DANFE", e cada botão de baixar dizendo o que baixa e pra quem
é: o PDF pro cliente, o XML pro contador; regras, seção 12); Relações (os gráficos passam a usar as cores de
aviso e o laranja); Funcionários; Configurações, Auditoria e Diagnóstico. Por último, uma tarefa só
pra **tirar os tokens antigos** (`sakura-purple-dark` e os outros) e atualizar a "Identidade visual"
do `docs/decisoes.md`.
