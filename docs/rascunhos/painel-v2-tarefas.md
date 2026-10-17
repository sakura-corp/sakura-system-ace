# Painel v2: rascunhos das tarefas (17/10/2026, à noite)

> **Viraram issues em 17/10/2026, com a aprovação da Sofia**: V2-1 = #542, V2-2 = #543, V2-3 = #544,
> V2-4 = #545, V2-5 = #546, V2-6 = #547, V2-7 = #548, V2-8 = #549. **A issue é que vale**; este arquivo fica
> só como histórico. Duas correções feitas na hora de criar: a #545 também depende da #544 (usa a página
> "em breve"), e a dica do celular "uma vez só" passou da #543 pra #547 (ela mora na lista de tarefas).
> **Sem a etiqueta `leva-2` por enquanto** (decisão da Sofia): o painel mostra como atual a maior leva com
> tarefa aberta, e a leva 1 sumiria da tela. A etiqueta entra nas 8 quando a leva 1 terminar.

> **Rascunho pra Sofia aprovar. Nenhuma issue foi criada.** Escritos no modelo de `docs/tarefas.md`
> (skill `nova-tarefa`), partindo da **versão recomendada** em `docs/rascunhos/painel-v2.md`, seção 3 (**A, com o celular da B**).
> Se ela escolher outra versão (ou misturar: "barra: A, leva: C"), só a parte "Decisões já tomadas" e
> as fotos de referência de cada tarefa mudam; a divisão em tarefas continua a mesma.
>
> **`Depende de` com "V2-n"**: o modelo pede número de issue. Ao criar, a ordem é V2-1 primeiro, e cada "V2-n"
> é trocado pelo número que a issue dela ganhar.
>
> **Etiquetas**: `leva-2` (decidido em 17/10) e o `chefe:` de cada uma.
> As decisões que faltam são as perguntas do PR; como ela responde antes de criar as issues, nenhuma
> issue `sofia` separada é necessária. Se alguma ficar em aberto, vira issue `sofia` e entra no `Depende de`.

## A ordem e o que depende do quê

```
V2-1 barra lateral nova ──┬── V2-2 celular (barra embaixo + Mais)
                          ├── V2-3 páginas "em breve"
                          └── V2-4 cabeçalho de página ─┐
#538 (leva 1) ────────────────── V2-5 Início ◄──────────┤
#536 + #538 + #539 (leva 1) ──── V2-6 a leva redesenhada ◄┘
#536 (leva 1) ────────────────── V2-7 Levas anteriores
V2-5 ──────────────────────────── V2-8 "O que mudou hoje"
```

| Tarefa | Chefe | Estimativa | Depende de | Mexe em (arquivos que se cruzam com a leva 1?) |
|---|---|---|---|---|
| V2-1 barra lateral nova | frontend | 4 h | nada | `BarraLateral.tsx`, `TelaDeEntrada.tsx` (só o nome), `App.tsx` (só a barra), `tipos.ts` (só `Pagina`), `logica/navegacao.ts` novo — **não cruza** com #536/#538/#539 (elas mexem no tipo `Tarefa`, não no `Pagina`) |
| V2-2 celular | frontend | 3 h | V2-1 | `NavegacaoDoCelular.tsx` novo, `BarraLateral.tsx`, `App.tsx` |
| V2-3 páginas "em breve" | frontend | 3 h | V2-1 | `logica/emBreve.ts` e `PaginaEmBreve.tsx` novos, `App.tsx` |
| V2-4 cabeçalho de página | frontend | 2 h | V2-1 | `CabecalhoDaPagina.tsx` novo; usado só na Sala, no Escritório e no "em breve" (a Leva entra na V2-6) |
| V2-5 Início | frontend | 6 h | V2-4, #538 | `PaginaInicio.tsx` e `logica/inicio.ts` novos, `App.tsx`, `logica/dados.ts` (a `/` vira Início) — **cruza** com a #538 em `dados.ts`, por isso espera |
| V2-6 a leva redesenhada | frontend | 6 h | V2-4, #536, #538, #539 | `TelaDaLeva.tsx`, `Contador.tsx`, `ListaDeTarefas.tsx` — **cruza** com as três, por isso espera |
| V2-7 Levas anteriores | backend | 4 h | V2-1, #536 | `worker/tarefas.ts` (cruza com a #536), `PaginaDasLevas.tsx` novo |
| V2-8 "O que mudou hoje" | backend | 4 h | V2-5 | `worker/novidades.ts` novo, `worker/index.ts`, `logica/novidades.ts` novo |

Total: **32 h**. Podem andar **já** (junto com a leva 1): V2-1; depois dela, V2-2, V2-3 e V2-4 em paralelo
(arquivos diferentes, exceto o `App.tsx`, onde cada uma acrescenta só a sua rota: quem vier depois
mescla a `main` antes de abrir o PR).

---

## V2-1. Painel: a barra lateral nova (grupos, ícones e "em breve")

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: nada
Sessões filhas: não

## Pra que serve
A barra lateral passa a ter os cinco grupos do painel v2 (Início; Trabalho; Equipe; Empresa; rodapé), com
ícone em todos os itens e as funções futuras já no lugar, apagadas, dizendo do que dependem. Conserta a
"Sala dentro de Levas" e o "Financeiro" sozinho.

## Decisões já tomadas
- A organização e a versão visual escolhidas pela Sofia em 17/10 (`docs/rascunhos/painel-v2.md`, seções 2 e 4):
  a **versão A**, com a referência renderizada em `docs/referencia/painel-v2/versao-a/`.
- Nome único (Sofia, 17/10): "Sakura Corp" na barra e "Painel da Sakura Corp" na tela de entrada (`TelaDeEntrada.tsx`, só o texto).
- Item "em breve": apagado, com cadeado, `aria-disabled`, e uma linha "depende de …". Nesta tarefa ele
  **ainda não abre página** (é a V2-3).
- Os itens que existem continuam nos mesmos endereços (`/`, `/leva/<n>`, `/sala`, `/escritorio`).
- Ícones: `lucide-react` (já instalado), um por item, todos do mesmo tamanho.

## O que fazer
1. `painel/src/logica/navegacao.ts` (novo): a lista dos grupos e itens (rótulo, endereço ou `emBreve`,
   `dependeDe`, nome do ícone) como dado, com um teste que confere que todo "em breve" tem `dependeDe` e
   nenhum item existente perdeu o endereço.
2. `painel/src/componentes/BarraLateral.tsx`: desenhar a partir da lista, no visual escolhido; o item atual
   com `aria-current="page"`; as levas continuam vindo de `/api/levas` (só a atual no grupo Trabalho; as
   outras ficam pra V2-7).
3. `painel/src/tipos.ts`: `Pagina` ganha os nomes novos (só o tipo; nenhum outro tipo muda).
4. `docs/painel.md`: atualizar "O desenho já nasce preparado pra crescer" e uma entrada em "Andamento".

## Arquivos
- `painel/src/logica/navegacao.ts` e `navegacao.test.ts`: novos.
- `painel/src/componentes/BarraLateral.tsx`.
- `painel/src/App.tsx`: só o que a barra recebe.
- `painel/src/tipos.ts`: só o tipo `Pagina`.
- `painel/src/componentes/TelaDeEntrada.tsx`: só o nome "Painel da Sakura Corp".
- `docs/painel.md`.
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A lista de navegação e o teste | ajudante | médio | dado puro, plano pronto |
| A barra no visual escolhido | ajudante | médio | plano e referência prontos |
| Fotos e contraste | ajudante tester | rápido | rodar e conferir |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] teste da lista **visto reprovar** (um "em breve" sem `dependeDe`; um item existente sem endereço)
- [ ] a barra renderizada em 320 px, 1000 px e 1280 px, claro e escuro, parecida com a referência escolhida (fotos no PR)
- [ ] contraste AA em tudo o que é texto (inclusive o "em breve" apagado) e sem rolagem lateral
- [ ] `/`, `/leva/<n>`, `/sala`, `/sala?tv` e `/escritorio` continuam abrindo
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] no endereço público, a barra nova aparece com o login dela, e o "ao vivo" continua verde

## Não fazer
- A barra do celular (V2-2), as páginas "em breve" (V2-3), o Início (V2-5).
- Não mexer em `ListaDeTarefas.tsx`, `TelaDaLeva.tsx`, `Contador.tsx` nem no tipo `Tarefa` (leva 1).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-2. Painel: a navegação do celular (barra embaixo e "Mais")

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 3 h
Depende de: V2-1
Sessões filhas: não

## Pra que serve
No celular, hoje a barra lateral vira um bloco empilhado no topo, que empurra o conteúdo e some ao rolar.
Com a barra embaixo, os lugares mais usados ficam sempre à vista, e o resto num "Mais".

## Decisões já tomadas
- Pesquisa (`docs/referencia/painel-v2/referencias.md`): navegação escondida atrás de um botão reduz o quanto
  as pessoas acham as coisas; no celular, barra embaixo com até 5 itens.
- A Sofia escolheu a **barra fixa embaixo** (o celular da versão B, `docs/referencia/painel-v2/versao-b/`, em 17/10).
- Itens da barra de baixo: Início, Leva, Sala, Pessoas (em breve) e Mais.
- "Mais" abre uma folha com o resto da lista da V2-1 (inclusive os "em breve", o "ao vivo" e o "Sair").
- A dica do celular sobre o link do Claude passa a aparecer **uma vez** na tela, não em cada tarefa (o texto
  continua o mesmo).

## O que fazer
1. `painel/src/componentes/NavegacaoDoCelular.tsx` (novo): a barra fixa embaixo (abaixo de 768 px), toques de
   44 px, `aria-current`, e o "Mais" como `<dialog>` com foco preso e "Fechar".
2. `painel/src/componentes/BarraLateral.tsx`: some abaixo de 768 px.
3. `painel/src/App.tsx`: espaço no fim do conteúdo pra barra não cobrir nada; no `/sala?tv` não aparece.

## Arquivos
- `painel/src/componentes/NavegacaoDoCelular.tsx` (novo) e o teste.
- `painel/src/componentes/BarraLateral.tsx`, `painel/src/App.tsx`.
- `docs/painel.md`: entrada em "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A barra e o "Mais" | ajudante | médio | plano pronto |
| Teclado, leitor de tela, fotos | ajudante tester | médio | testar |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] teste **visto reprovar**: o "Mais" fecha com Esc e devolve o foco; o item atual tem `aria-current`
- [ ] fotos em 320 px e 375 px, claro e escuro: a barra não cobre o fim da página; sem rolagem lateral
- [ ] `/sala?tv` sem a barra
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] no celular dela, a barra aparece embaixo e o "Mais" abre e fecha

## Não fazer
- Não mudar o link do Claude nem o texto da dica.
- Não mexer na lista de tarefas (V2-6).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-3. Painel: as páginas "em breve" que explicam

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 3 h
Depende de: V2-1
Sessões filhas: não

## Pra que serve
Cada função futura (Versões, Fases da leva, Relatório da leva, Pessoas, Financeiro, DRE, Lojas,
Configurações) ganha uma página que diz o que vai ter ali, do que depende e qual tarefa cuida. Quem clica
entende o plano, em vez de achar que está quebrado.

## Decisões já tomadas
- O texto de cada uma é o da tabela "As abas da barra lateral" de `docs/rascunhos/painel-v2.md`, seção 2.
- **Financeiro, DRE e Lojas**: a página diz que dinheiro e nome de cliente **nunca moram no GitHub**, que é
  público, e **não mostra número nenhum**, nem de exemplo.
- Endereço: `/em-breve/<id>` (ex.: `/em-breve/financeiro`).

## O que fazer
1. `painel/src/logica/emBreve.ts` (novo): o texto de cada página como dado (título, o que vai mostrar,
   do que depende, a issue que cuida, se houver), usando os mesmos `id` da `navegacao.ts` (V2-1).
2. `painel/src/componentes/PaginaEmBreve.tsx` (novo), no visual escolhido; id desconhecido mostra "Página não encontrada".
3. `painel/src/App.tsx`: a rota; os itens "em breve" da barra passam a ser links pra ela.

## Arquivos
- `painel/src/logica/emBreve.ts` e o teste; `painel/src/componentes/PaginaEmBreve.tsx`.
- `painel/src/App.tsx`, `painel/src/logica/navegacao.ts` (o link).
- `docs/painel.md`: entrada em "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Os textos e a página | ajudante | médio | plano pronto |
| Conferir textos (nada privado, nenhum número de dinheiro) | ajudante | rápido | conferir texto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] teste **visto reprovar**: todo item "em breve" da navegação tem página; nenhuma página do grupo Empresa tem algarismo de dinheiro (`R$` ou número com vírgula)
- [ ] fotos de `/em-breve/financeiro` em 375 e 1280 px, claro e escuro
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] clicar em "Financeiro" no endereço público abre a página que explica

## Não fazer
- Não construir nenhuma das funções; não criar banco.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-4. Painel: o cabeçalho de página igual em todas

```markdown
Chefe: frontend
Ajudantes: nenhum
Estimativa: 2 h
Depende de: V2-1
Sessões filhas: não

## Pra que serve
Toda página passa a começar igual: a trilha ("Equipe / Sala"), o título, uma linha de explicação e as ações à
direita. É o que mais faz o painel parecer um produto só.

## Decisões já tomadas
- O desenho do cabeçalho é o da versão escolhida.
- Nesta tarefa ele entra **só** na Sala, no Escritório e nas páginas "em breve". A Leva recebe na V2-6 (pra
  não cruzar com a leva 1); o Início, na V2-5.
- A janela escura da Sala (visual B) não muda: o cabeçalho fica **fora** dela.

## O que fazer
1. `painel/src/componentes/CabecalhoDaPagina.tsx` (novo): `trilha`, `titulo`, `explicacao`, `acoes`.
2. Usar na Sala (`App.tsx`, em volta do `<Sala>`, sem mexer em `Sala.tsx`), no Escritório e na `PaginaEmBreve`.

## Arquivos
- `painel/src/componentes/CabecalhoDaPagina.tsx` (novo), `painel/src/App.tsx`,
  `painel/src/componentes/escritorio/Escritorio.tsx` (só o topo), `painel/src/componentes/PaginaEmBreve.tsx`.
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| O componente e o uso | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] um só `<h1>` por página (teste **visto reprovar** com dois)
- [ ] fotos da Sala, do Escritório e de um "em breve", 375 e 1280 px, claro e escuro
- [ ] `/sala?tv` sem cabeçalho
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] nada

## Não fazer
- Não mexer em `Sala.tsx`, `sala.css`, `TelaDaLeva.tsx`.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-5. Painel: a página Início ("o que é meu")

```markdown
Chefe: frontend
Ajudantes: backend (a busca juntando sala e leva), tester (conferir o Pronto quando)
Estimativa: 6 h
Depende de: V2-4, #538
Sessões filhas: não

## Pra que serve
Uma página que responde "o que eu preciso fazer agora?": o que espera por mim (PR pra revisar, rodada pra
aprovar), a tarefa que eu peguei, a leva em uma linha. Hoje isso só aparece misturado na Sala.

## Decisões já tomadas
- A `/` passa a ser o Início (Sofia, 17/10); a leva atual vai pra `/leva` (e `/leva/<n>` continua). A `/` antiga **não**
  quebra link: quem chega numa `/leva/<n>` continua chegando.
- "Precisa de você" usa a mesma regra da Sala (`montarSala()`, estado `precisa`, de quem olha): nada novo
  inventado, os dois sempre batem.
- "A sua tarefa" mostra os botões da #538 (Começar com o Claude, Copiar texto, Largar).
- Sem nota por pessoa (regra da Sala).

## O que fazer
1. `painel/src/logica/inicio.ts` (novo): função pura que junta `RespostaDaSala` + `RespostaDaLeva` + o login
   em `{ precisaDeVoce, suaTarefa, resumoDaLeva }`, com testes.
2. `painel/src/componentes/PaginaInicio.tsx` (novo), no visual escolhido, com estados vazios que ensinam
   ("Nada esperando por você", "Você não está com nenhuma tarefa: veja as livres na Leva").
3. `painel/src/App.tsx` e `painel/src/logica/dados.ts`: a rota `/` e o endereço da leva atual (`/leva`).
4. Tempo real: a página escuta os mesmos avisos da Sala.

## Arquivos
- `painel/src/logica/inicio.ts` e o teste; `painel/src/componentes/PaginaInicio.tsx`.
- `painel/src/App.tsx`, `painel/src/logica/dados.ts` (`enderecoDaLeva`, `levaPedida`), `painel/src/App.test.tsx`.
- `docs/painel.md`: os endereços em "Como rodar no PC" ("No ar") e uma entrada em "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | mexe na rota principal |
| A função pura e os testes | ajudante | médio | plano pronto |
| A página | ajudante | médio | plano pronto |
| Conferir o Pronto quando | ajudante tester | médio | testar |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] testes **vistos reprovar**: o "precisa de você" do Início diferente do da Sala; tarefa de outra pessoa como "sua"; a leva cortada
- [ ] `/leva`, `/leva/<n>`, `/sala`, `/sala?tv`, `/escritorio` abrem; a volta do login (`?volta=`) continua levando pra página pedida
- [ ] fotos em 320, 375 e 1280 px, claro e escuro, com e sem coisas esperando
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] no endereço público, com o login dela, o Início mostra o que a Sala mostra como "precisa de você"

## Não fazer
- "O que mudou hoje" (V2-8).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-6. Painel: a tela da leva redesenhada

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 6 h
Depende de: V2-4, #536, #538, #539
Sessões filhas: não

## Pra que serve
A tela da leva fica mais calma e densa: o contador numa faixa só, as tarefas uma por linha, e os botões
fortes só onde fazem sentido (na tarefa de quem olha). Hoje são 8 botões rosa numa tela de 8 tarefas.

## Decisões já tomadas
- O desenho da versão A (`docs/referencia/painel-v2/versao-a/leva.html`), escolhida pela Sofia em 17/10.
- **As regras não mudam**: o que a #536 (cabeçalho), a #538 (pegar e largar) e a #539 (horas por pessoa)
  decidiram continua igual. Esta tarefa só redesenha.
- O estado continua sempre com a palavra.

## O que fazer
1. `painel/src/componentes/Contador.tsx`: a faixa única com a barra de progresso dentro.
2. `painel/src/componentes/ListaDeTarefas.tsx`: a linha compacta da versão escolhida; os botões da #538 no
   lugar da referência; a dica do celular uma vez (V2-2).
3. `painel/src/componentes/TelaDaLeva.tsx`: o `CabecalhoDaPagina` (V2-4) e o quadro da #539 no lugar novo.

## Arquivos
- `painel/src/componentes/Contador.tsx`, `ListaDeTarefas.tsx`, `TelaDaLeva.tsx` (e o componente da #539).
- `painel/src/App.test.tsx` (só o que o desenho novo mudar).
- `docs/painel.md`: entrada em "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| O redesenho | ajudante | médio | plano e referência prontos |
| Fotos, contraste, teclado | ajudante tester | médio | testar |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] os testes da #536, #538 e #539 continuam passando **sem mudar o que eles conferem**
- [ ] fotos em 320, 375, 1000 e 1280 px, claro e escuro, ao lado da referência
- [ ] título longo quebra linha no celular; sem rolagem lateral; contraste AA
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] a leva de verdade, no endereço público, no celular e no PC

## Não fazer
- Não mudar regra nenhuma (estado, horas, pegar, cabeçalho). Visão em quadro: fica pra depois (Sofia, 17/10).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-7. Painel: levas anteriores

```markdown
Chefe: backend
Ajudantes: frontend (a página), tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: V2-1, #536
Sessões filhas: não

## Pra que serve
Ver as levas que já passaram: quantas tarefas, quantas horas e quando terminou. É o começo do histórico da
equipe, sem guardar nada fora do GitHub.

## Decisões já tomadas
- Os dados são as issues com a etiqueta `leva-N` (como hoje). "Terminou em" = a data em que a última tarefa
  da leva foi fechada; leva com tarefa aberta não terminou.
- Sem nota por pessoa.

## O que fazer
1. `painel/worker/tarefas.ts`: `/api/levas` passa a devolver, por leva, `total`, `feitas`, `horas` e `terminouEm`
   (uma consulta GraphQL só, com no máximo 20 levas).
2. `painel/src/componentes/PaginaDasLevas.tsx` (novo) em `/levas`, uma linha por leva, levando a `/leva/<n>`.
3. A barra lateral (V2-1) ganha o item "Levas anteriores".

## Arquivos
- `painel/worker/tarefas.ts` e o teste; `painel/src/tipos.ts` (o tipo `Leva`).
- `painel/src/componentes/PaginaDasLevas.tsx` (novo), `painel/src/App.tsx`, `painel/src/logica/navegacao.ts`.
- `docs/painel.md`: "Decisões técnicas" e "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A consulta no worker | ajudante | forte | fala com o GitHub |
| A página | ajudante frontend | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] testes **vistos reprovar**: leva com tarefa aberta marcada como terminada; horas somando tarefa sem estimativa
- [ ] a consulta validada contra o esquema público do GitHub (como na #354)
- [ ] fotos em 375 e 1280 px, claro e escuro
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] a leva 0 aparece com 8 de 8 feitas e a data certa

## Não fazer
- Relatório e fases da leva (leva 2, com conversa de desenho antes).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

## V2-8. Painel: "O que mudou hoje" no Início

```markdown
Chefe: backend
Ajudantes: frontend (o bloco no Início), tester (conferir o Pronto quando)
Estimativa: 4 h
Depende de: V2-5
Sessões filhas: não

## Pra que serve
No Início, uma linha do tempo curta do dia: quem pegou, entregou ou fechou tarefa, e qual conferência passou ou
falhou. Sem abrir o GitHub.

## Decisões já tomadas
- Vem da lista de eventos do repositório no GitHub (`GET /repos/sakura-corp/sakura-system-ace/events`),
  lida na hora, com o token de quem está logado. **O painel continua sem guardar nada.**
- Só eventos de issue, PR e rodada; no máximo 15; "hoje" = mesmo dia no fuso do computador (regra de tempo
  de `painel/src/logica/tempo.ts`).
- O texto de cada evento é montado pelo painel a partir do tipo e do número; **título de issue ou de PR não
  vira link** se não for `https://github.com/sakura-corp/`.

## O que fazer
1. `painel/worker/novidades.ts` (novo) e a rota `GET /api/novidades` em `painel/worker/index.ts`, só com sessão.
2. `painel/src/logica/novidades.ts` (novo): o texto de cada evento e o filtro do dia.
3. O bloco no Início.

## Arquivos
- `painel/worker/novidades.ts`, `painel/worker/index.ts` e os testes.
- `painel/src/logica/novidades.ts` e o teste, `painel/src/componentes/PaginaInicio.tsx`.
- `docs/painel.md`: "Decisões técnicas" e "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A rota no worker | ajudante | forte | fala com o GitHub |
| O texto e o filtro do dia | ajudante | médio | regra pura |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] testes **vistos reprovar**: evento de ontem como "hoje" (fuso); link de fora da sakura-corp virando link; rota sem sessão (401)
- [ ] fotos do Início com e sem novidades
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] depois de pôr o nome numa tarefa, a linha aparece no Início dela

## Não fazer
- Não guardar eventos em lugar nenhum (nem no Durable Object).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```
