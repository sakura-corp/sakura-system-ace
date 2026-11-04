# Sakura System — AutoCenter Edition — Guia de Melhorias

> **Este arquivo é um prompt.** Ele foi escrito para ser lido por uma sessão do Claude Code
> apontada para o repositório `sakura-corp/sakura-system-ace`, junto de `CLAUDE.md`,
> `AGENTS.md` e `PROJETO_STATUS.md` (que já carregam sozinhos).
>
> Gerado em 10/09/2026, a partir de três fontes: o `PROJETO_STATUS.md` completo, o guia em PDF
> das 54 telas (`sakurasystemguia.pdf`, 41 páginas) e uma pesquisa de referências de mercado,
> acessibilidade e segurança listada no **Apêndice B**.
>
> **Nada aqui é ordem de execução.** É um cardápio priorizado. A usuária decide o que entra em
> cada sessão. Ver "Regras invioláveis" abaixo.

## Situação em 04/11/2026 (ler antes de escolher um item)

O guia foi escrito em 10/09, quando a memória era um arquivo só. **Onde ele diz "§3/§5/§6/§7/§8
do `PROJETO_STATUS.md`"**, hoje é `docs/decisoes.md`, `docs/banco.md`, `docs/licoes.md`,
`docs/modulos.md` e `docs/pendencias-e-futuro.md`, com a mesma numeração de itens.

| Etapa (Parte 4) | Situação |
|---|---|
| 0. Antes de tudo | A `v0.9.29` saiu (11/09) e o gerador das 54 telas está na `main` (a branch `claude/cool-lamport-uzyh8w` sobrou e pode ser apagada). As três credenciais expostas (`TR-04.7`) foram **trocadas em 19/10** (#505) |
| 1. Fundação | **Feita** (11/09) |
| 2. O que dói no balcão | **Feita** (12/09) |
| 3. Confiança nos números | 6 de 7. Falta o `TR-05.2` (uma nota por OS), **adiado de propósito**: ver "O que ainda está frágil na parte fiscal", item 3, na seção 8 |
| 4. Antes da segunda empresa | Todos começados. `TR-04.1` feito (#365 a #367: no banco estão RH, contas, Caixa, clientes, peças/estoque e OS; a `0076`, das OS, espera os computadores na 0.9.56) e a parte 2 do `TR-04.2` feita (#368). Em aberto: o resto do `TR-08.3` (a trilha das últimas ações, #370) |
| 5. Escala e produto | `FN-09` (venda de balcão) feito. Fora do roteiro, também feitos: `FN-04` (ficha do veículo) e `TL-46.1` |

O detalhe de cada entrega está na linha do tempo da seção 8 e nos módulos da seção 7. **Tudo o que
falta das etapas 3 a 5 virou tarefa no GitHub em 30/09** (etiqueta `guia`, #365 a #385; a tabela
está em "O que depende dela", seção 8). Cada tarefa aponta pro item deste guia.

---

## 1. Como usar este arquivo

**Para a usuária (Sofia):** escolha um item pelo código (ex: `TR-03.2`) e diga
*"faz o TR-03.2"*. O bloco **Prompt** de cada item já é a instrução completa — não precisa
explicar de novo o contexto.

**Para o Claude Code:**

1. Leia primeiro `docs/decisoes.md` (§3, decisões travadas) e `docs/licoes.md` (§6, dívidas e
   padrões de bug). **Se um
   item deste guia contradisser uma decisão da §3, a §3 vence** — traga a contradição para a
   usuária em vez de executar.
2. Um item por vez, com PR próprio. Item marcado `E3` quase sempre precisa ser quebrado em
   etapas e alinhado antes de começar.
3. Todo item tem um **Critério de aceite**. Ele é o que define "pronto" — não o código escrito.
4. Todo item tem **Não mexer**. Respeite: a maior parte dos bugs caros deste projeto veio de
   correção que passou do escopo.
5. Antes de fechar qualquer item: `npm install` → `tsc -b` → `npm run lint` → `npm test` →
   `npm run contraste`. Item que mexe em migration: rodar a sequência **duas vezes** num Postgres
   local (§6 item 36 do status). Item que mexe em tela: preview renderizado do componente real
   (§6 item 6 do status), não leitura de código.

---

## 2. Legenda

### Prioridade

| Marca | Significado | Horizonte |
|---|---|---|
| **P0** | Dói **hoje**, na Pneus Amigão, com uma loja só. Risco de erro operacional, de dinheiro ou de dado agora. | Próximas sessões |
| **P1** | Precisa estar de pé **antes da segunda empresa** (as 2 lojas do amigo do pai dela). Segurança, isolamento, suporte remoto. | Fase 2 |
| **P2** | Só passa a doer **na escala de 10+ lojas / 4+ empresas**. Custo, observabilidade, performance, automação de onboarding. | Fase 3 |

### Esforço

| Marca | Significado |
|---|---|
| `E1` | Uma tarefa curta, cabe junto de outras na mesma sessão. Sem migration, sem decisão nova. |
| `E2` | Uma sessão inteira. Pode ter migration simples ou tela nova. |
| `E3` | Várias sessões, ou exige decisão de arquitetura/negócio antes de começar. **Nunca começar sem alinhar.** |

### Códigos

- `TR-nn` — eixo **transversal** (vale para o app inteiro).
- `TL-nn` — **tela**, numerada igual ao catálogo do PDF (1 a 54).
- `FN-nn` — **funcionalidade nova** que hoje não existe em tela nenhuma.

---

## 3. Regras invioláveis (não quebrar por nenhum item deste guia)

1. **Não publicar tag/release por conta própria.** A `v0.9.29` está pronta e segurada por decisão
   dela (§ "O ponto exato onde parou", status). Perguntar sempre.
2. **Não reabrir as decisões da §3 do status** (Electron, React+Vite, Supabase direto sem backend
   próprio, `HashRouter`, `react-hook-form`+`zod`, RLS por login, PR mesclado direto na `main`).
3. **Não trocar a paleta nem o tema escuro/neon.** Ele foi confirmado por ela rodando de verdade.
   Melhorias visuais aqui são de *contraste, densidade e hierarquia* — não de identidade.
4. **Não mexer na logo.** Decisão registrada: não é prioridade, não perguntar de novo (§8 item 3).
5. **Não retomar o site de apresentação** (`site/`) por conta própria (§8 item 9). A *ferramenta*
   `site/ferramentas/` pode ser usada à vontade — ela é infraestrutura de teste, não o site.
6. **Nenhuma credencial neste arquivo nem em nenhum arquivo do repositório.** O repositório é
   **público** (foi aberto para o auto-update funcionar). Segredo mora no painel do serviço.
7. **Validação incerta é aviso, nunca tranca** (§6 item 33 — a lição que deixou ela sem conseguir
   entrar no sistema). Se a checagem não pode ser testada de verdade aqui, o pior caso tem que ser
   "segue avisada", não "fica de fora".
8. **Conta de dinheiro nova vai para `src/schemas/`**, como função pura testada. Nunca dentro do
   componente. É a terceira vez que a mesma conta divergiu entre telas (§6 itens 35, 40, 44).
9. **Escrever em linguagem simples no chat.** Ela não tem experiência prévia em programação:
   opções + recomendação + esperar confirmação antes de decisão estrutural.

---

## 4. Índice

- **Parte 1 — Eixos transversais** (`TR-01` a `TR-12`)
  - TR-01 Sistema visual e densidade
  - TR-02 Acessibilidade e ergonomia de balcão
  - TR-03 Navegação, organização e busca
  - TR-04 Segurança de acesso (o buraco que a venda abre)
  - TR-05 Modelagem de dados e integridade
  - TR-06 Confiabilidade das contas de dinheiro
  - TR-07 Testes e verificação
  - TR-08 Observabilidade e suporte remoto
  - TR-09 Distribuição, atualização e rollback
  - TR-10 Performance e resiliência de rede
  - TR-11 Fiscal — o que ainda é frágil
  - TR-12 Privacidade e LGPD
- **Parte 2 — As 54 telas** (`TL-01` a `TL-54`)
- **Parte 3 — Funcionalidades que faltam** (`FN-01` a `FN-15`)
- **Parte 4 — Roteiro sugerido**
- **Apêndice A — Checklist de "pronto"**
- **Apêndice B — Referências**

---
# Parte 1 — Eixos transversais

---

## TR-01 — Sistema visual e densidade

> **Diagnóstico geral.** Olhando as 54 telas do PDF em sequência, o tema escuro/neon está
> bonito e coerente. O problema não é estética, é **densidade**: texto pequeno, linhas de tabela
> apertadas, ações escritas como links de texto minúsculos, e nenhuma hierarquia clara entre
> "o número que importa" e "o resto". Quem opera é o pai dela, num balcão, provavelmente em pé,
> num monitor de loja — não um desenvolvedor de 24 anos num MacBook. Cada item abaixo ataca
> uma parte disso.

### `TR-01.1` — Escala tipográfica declarada, com base maior — **P0 · E2**

**Sintoma.** Não existe escala definida: cada tela escolheu um `text-xs`/`text-sm` por conta
própria. Nas telas do PDF, rótulo de campo, texto de tabela e legenda de cartão estão todos
em torno de 11–12px equivalentes. Em Lista de Clientes (TL-05), Movimentações (TL-14) e
Auditoria (TL-53), a tabela inteira é texto de tamanho de rodapé.

**Por quê.** Densidade é uma escolha, mas ela precisa ser *escolhida* e não herdada por
descuido. Um ERP de balcão é lido de pé, de relance, muitas vezes por dia — a leitura é
"escanear", não "ler". A recomendação prática de sistemas de design maduros para texto de
interface densa é **13–14px de base**, com 16px para números que carregam decisão, e nunca
abaixo de 12px para conteúdo (só para metadados). Além disso, texto minúsculo é a causa raiz
mais comum de as pessoas *aumentarem o zoom do Windows*, o que quebra layouts fixos —
prevenir isso é mais barato que consertar depois.

**Prompt.**

> Crie uma escala tipográfica única no `@theme` de `src/styles/globals.css`, com tokens
> semânticos em vez de tamanhos soltos: `--text-metrica` (número grande de cartão),
> `--text-titulo`, `--text-subtitulo`, `--text-corpo` (base do app — subir para 14px),
> `--text-tabela` (13px), `--text-rotulo` (13px), `--text-meta` (12px, só metadado como
> "versão", "criado em"). Defina também `line-height` por token (corpo/tabela em 1.45,
> títulos em 1.2). Depois substitua os `text-xs`/`text-sm`/`text-base` avulsos do app pelos
> tokens novos, módulo por módulo, começando por `pages/clientes/`, `pages/ordens-servico/`
> e `pages/estoque/` — que são as três telas mais usadas no balcão. Não invente tamanho novo
> fora da escala. Ao final, gere o catálogo de telas com `site/ferramentas/gerar-catalogo-telas.mjs`
> e compare com as imagens antigas antes/depois, em vez de conferir só lendo código.

**Critério de aceite.** Nenhuma classe de tamanho de fonte crua (`text-xs`, `text-[11px]`)
sobra em `src/pages/`; as 54 imagens do catálogo regeradas mostram tabela e formulário legíveis
a 100% de zoom; `npm run contraste` limpo.

**Não mexer.** Cores, espaçamento entre cards, o `sakura-card`/glassmorphism.

---

### `TR-01.2` — "Modo balcão": densidade confortável como opção — **P1 · E2**

**Sintoma.** Uma só densidade para todo mundo. Quem usa o dia inteiro quer ver mais linhas;
quem tem 55 anos e está de pé quer ver menos e maiores.

**Por quê.** É o padrão de ERPs sérios (SAP Fiori, Atlassian, Linear, Notion todos têm
"compact/comfortable"). Custa quase nada quando os tamanhos já são tokens (TR-01.1) e evita a
discussão infinita de "está pequeno demais / grande demais" virar uma briga de gosto.

**Prompt.**

> Depois de `TR-01.1` estar pronto, adicione um seletor de densidade com três opções
> (Compacto / Padrão / Balcão) em Configurações, salvo em `localStorage` por computador (é
> preferência de máquina, não de operador — a mesma pessoa pode usar dois PCs diferentes).
> A implementação deve ser um `data-densidade` no `<html>` que redefine os tokens de
> tipografia e de altura de linha de tabela criados em `TR-01.1` — nenhum componente deve
> saber que densidade existe. "Balcão" = tokens ~15% maiores, altura de linha de tabela 44px,
> alvo de clique mínimo 40px.

**Critério de aceite.** Trocar a densidade não recarrega a tela e não desalinha nenhuma das 54
telas do catálogo (conferir regerando as imagens nos três modos).

**Não mexer.** Não persistir isso no banco por enquanto — `localStorage` resolve e não exige
migration.

---

### `TR-01.3` — Auditoria de contraste WCAG completa (a que nunca foi feita) — **P0 · E2**

**Sintoma.** O próprio status registra: *"Ainda não foi feita uma auditoria de contraste WCAG
completa da paleta nova"* (§2). E o histórico prova o risco — o tooltip dos gráficos ficou em
**1,39:1** por uma migração de tema, contra o mínimo de 4,5:1, e só foi pego numa varredura
manual (§6 item 17). O `npm run contraste` existe mas, por construção, **só enxerga fundo e
texto declarados na mesma `className`**.

**Por quê.** WCAG 2.2 continua exigindo 4,5:1 para texto normal e 3:1 para texto grande
(≥18.66px bold ou ≥24px) e para componentes de interface e bordas de campo (1.4.11). Nesta
paleta, três combinações são estruturalmente suspeitas: `sakura-muted` sobre `sakura-card`
translúcido, qualquer uso de `sakura-purple-dark` **como fundo** (o nome mente — virou uma cor
clara, `#e8d5e5`), e o rosa neon `#ff4dce` como *texto pequeno* (é ótimo como destaque, mas em
11px vira franja de cor sobre fundo quase preto).

**Prompt.**

> Estenda `scripts/varredura-contraste.mjs` para fazer a medição **no DOM renderizado**, não
> na string de `className`: use o caminho de preview já documentado no `PROJETO_STATUS.md` §6
> item 6 (build com `vite.preview.config.ts` + Playwright), percorra as 54 cenas de
> `site/ferramentas/gerar-catalogo-telas.mjs` e, para cada nó de texto visível, calcule a cor
> efetiva de primeiro plano e a cor de fundo **composta** (subindo a árvore até achar um fundo
> opaco, e aplicando a transparência de `sakura-card`). Reprove abaixo de 4,5:1 (texto normal),
> 3:1 (texto grande) e 3:1 para borda de `input`/`select`/`textarea` e ícone informativo.
> Emita um relatório com tela, seletor, cores e razão medida. Rode, traga o relatório para a
> usuária e **corrija só o que ela aprovar** — não saia trocando cor da paleta sozinho.

**Critério de aceite.** Relatório gerado para as 54 telas; zero reprovações de texto de conteúdo
depois das correções aprovadas; o script novo entra no `npm run contraste` e no CI.

**Não mexer.** Não trocar `#ff4dce`/`#b624ff`/`#0b070a`. Se um texto reprovar, a correção é
mudar *onde* a cor é usada (texto → destaque, ou aumentar o tamanho), não a cor em si.

---

### `TR-01.4` — Renomear os tokens que mentem — **P1 · E1**

**Sintoma.** `sakura-purple-dark` vale `#e8d5e5` (claro). `sakura-muted` é texto sobre escuro.
O próprio status avisa duas vezes para tomar cuidado ao ler CSS antigo por causa disso, e o bug
de contraste 1,39:1 nasceu exatamente dessa armadilha.

**Por quê.** Nome de token é documentação executável. Um nome que descreve a cor errada é uma
armadilha permanente para toda sessão futura — inclusive para uma IA lendo o código, que vai
raciocinar "dark = escuro, então letra branca em cima".

**Prompt.**

> Renomeie os tokens de cor de `src/styles/globals.css` de "nome de aparência" para "nome de
> papel": `--color-sakura-purple-dark` → `--color-sakura-text-forte`, `--color-sakura-muted` →
> `--color-sakura-text-suave`, e crie `--color-sakura-surface-1/2/3` para os fundos. Mantenha
> os nomes antigos como **alias** apontando para os novos por uma versão, para não quebrar nada
> de uma vez, e marque-os com um comentário `/* DEPRECIADO: usar --color-sakura-text-forte */`.
> Troque os usos em `src/` para os nomes novos. Não mude nenhum valor hexadecimal.

**Critério de aceite.** `git grep -n "purple-dark" src/` retorna zero fora do bloco de alias;
imagens do catálogo pixel-idênticas antes/depois.

---

### `TR-01.5` — Estados de carregamento, vazio e erro padronizados — **P1 · E2**

**Sintoma.** O padrão de código do projeto diz que cada `<Modulo>Page.tsx` tem "lista + estado
de carregamento/erro", mas cada tela desenha isso do seu jeito. Nas telas do PDF, o único
"vazio" com texto amigável é Entradas do Caixa (TL-28). Contas a Receber, Garantias, Auditoria
e Relatórios de Estoque mostram só a tabela vazia.

**Por quê.** É a heurística nº 1 de Nielsen (*visibility of system status*) e a que mais custa
suporte: uma lista vazia é ambígua — pode ser "não tem nada", "ainda carregando", "deu erro" ou
"o filtro escondeu". Com dez lojas de terceiros, cada ambiguidade dessas é um telefonema.

**Prompt.**

> Crie três componentes em `src/components/`: `<Carregando>` (skeleton com a forma da tabela
> ou do card, não spinner genérico), `<Vazio titulo mensagem acao?>` (ícone discreto + frase em
> português simples + botão da ação óbvia, ex: "Nenhum cliente cadastrado ainda" +
> "+ Novo cliente") e `<ErroCarregar erro onTentarDeNovo>` (mensagem real via
> `mensagemDeErro()` + botão "Tentar de novo"). Aplique nas listas de todos os módulos.
> Regra que precisa ficar explícita no componente `<Vazio>`: quando há filtro ativo, a mensagem
> muda para "Nenhum resultado para este filtro" + botão "Limpar filtros" — nunca a mensagem de
> "não existe nada cadastrado", que faz o operador achar que perdeu dado.

**Critério de aceite.** Toda `<Modulo>Page.tsx` usa os três; nenhuma tela mostra tabela vazia
sem explicação; o caso "filtro escondeu tudo" tem texto diferente do caso "nada cadastrado".

---

### `TR-01.6` — Custo do glassmorphism: medir antes de manter — **P2 · E1**

**Sintoma.** `backdrop-filter: blur` está aplicado em "praticamente toda tela do app"
(status §2), somado a um fundo com brilho difuso.

**Por quê.** `backdrop-filter` obriga o compositor a re-renderizar a região atrás de cada
camada a cada frame. Em GPU integrada de PC de loja (que é o hardware real do cenário: máquina
de balcão, não estação de trabalho), muitas camadas de blur empilhadas viram rolagem travada —
e o app tem barra de rolagem customizada desenhada em JS, que fica visivelmente pior sob queda
de frame rate.

**Prompt.**

> Meça antes de decidir: abra o app no Electron real com `xvfb-run` (padrão do §6 item 6 do
> status), ative o overlay de FPS do Chromium (`--show-fps-counter`) e role a lista de Ordens
> de Serviço com ~500 linhas de dado falso, com e sem `backdrop-filter` (desligue via um
> `data-perf="sem-blur"` temporário no `<html>`). Traga os dois números. Se a diferença for
> relevante, proponha à usuária uma das duas saídas — reduzir o raio de blur e limitar o efeito
> a no máximo duas camadas por tela (cartão de topo e modal), ou um botão "modo leve" em
> Configurações que desliga o blur na máquina fraca. **Não desligar nada sem ela ver os números
> e escolher.**

---
## TR-02 — Acessibilidade e ergonomia de balcão

> **Diagnóstico geral.** O projeto já acertou coisas que quase ninguém faz: Enter avança campo,
> Backspace limpa data, seta não mexe em campo numérico, rascunho automático. Isso é ergonomia
> de teclado de verdade, e é o diferencial certo contra o S3Auto. O que falta é a outra metade:
> **alvo de clique, foco visível, confirmação de ação destrutiva e desfazer**.

### `TR-02.1` — Alvos de clique de 24px (WCAG 2.2 · 2.5.8) — **P0 · E2**

**Sintoma.** Em **todas** as listas do PDF — Clientes (TL-05), Produtos (TL-11), Serviços
(TL-24), Fornecedores (TL-18), Funcionários (TL-43), Notas Fiscais (TL-39/40), Contas a Pagar
(TL-30) — as ações de linha são três palavras coladas em texto rosa minúsculo:
`Editar  Inativar  Excluir`. São links de ~10px de altura, separados por poucos pixels, e o
**mais destrutivo é o último**, encostado no anterior.

**Por quê.** Dois fundamentos convergem aqui:

- **WCAG 2.2, critério 2.5.8 (Target Size Minimum, nível AA)**: alvo de ponteiro de no mínimo
  **24×24 px CSS**, ou espaçamento equivalente. Esses links não chegam perto.
- **Lei de Fitts**: o tempo para acertar um alvo cresce com a distância e cai com o tamanho.
  Alvo pequeno + vizinho perigoso = erro sistemático, não descuido do operador. E o erro aqui
  não é reversível: "Excluir" apaga cadastro de cliente.

**Prompt.**

> Substitua o trio de links de texto das listas por um padrão único de ações de linha, num
> componente novo `src/components/AcoesDaLinha.tsx`:
> - "Editar" vira um **botão de ícone** com área clicável de no mínimo 32×32 px (ícone de 16px
>   centralizado com padding), `aria-label="Editar <nome do registro>"`, `title` igual.
> - "Inativar"/"Reativar" segue o mesmo padrão.
> - **"Excluir" sai da linha** e passa a viver num menu de três pontinhos (`⋯`), também 32×32,
>   sempre como último item do menu, com o rótulo escrito por extenso e em cor de perigo.
> - Espaçamento mínimo de 8px entre alvos.
>
> Aplique em todas as listas dos módulos. Mantenha a ordem visual (editar primeiro, destrutivo
> por último) igual em todos, porque previsibilidade vale mais que economia de espaço.

**Critério de aceite.** Nenhuma ação de linha com alvo menor que 32×32; excluir nunca acessível
com um clique só a partir da lista; navegação por Tab passa pelos botões na ordem visual.

**Não mexer.** Não trocar os textos dos botões primários das telas (`+ Novo cliente`,
`Confirmar faturamento` etc.) — esses já estão bem dimensionados.

---

### `TR-02.2` — Foco de teclado visível em tudo (WCAG 2.4.11 / 2.4.13) — **P0 · E1**

**Sintoma.** O app foi desenhado para uso só de teclado (`useEnterParaProximoCampo`), mas as
imagens do PDF não mostram anel de foco consistente. Em fundo quase preto com blur, o
`outline` padrão do Chromium some.

**Por quê.** Um app que empurra o operador a usar só teclado e não mostra onde ele está é uma
armadilha: a pessoa aperta Enter sem saber em qual campo. WCAG 2.2 acrescentou 2.4.11 (*Focus
Not Obscured*, AA — o elemento focado não pode ficar escondido atrás de conteúdo do autor, o
que importa aqui por causa de cabeçalhos fixos e do modal) e 2.4.13 (*Focus Appearance*, AAA —
tamanho e contraste mínimos do indicador).

**Prompt.**

> Em `@layer base` de `src/styles/globals.css` (nunca fora de `@layer` — §6 item 14 do status),
> defina um foco único para o app: `:focus-visible` com `outline: 2px solid` numa cor de alto
> contraste sobre o fundo escuro + `outline-offset: 2px` + um `box-shadow` sutil de halo para
> garantir contraste também sobre `sakura-card`. Aplique a `a, button, input, select, textarea,
> [role="button"], [tabindex]`. Remova qualquer `outline: none` sem substituto que exista hoje
> no código. Depois confira, com o app rodando no Electron real, que o elemento focado nunca
> fica atrás do cabeçalho fixo das páginas nem da faixa de abas — se ficar, adicione
> `scroll-margin-top` equivalente à altura do cabeçalho.

**Critério de aceite.** Percorrer Login → Início → Nova OS → Faturamento só de Tab/Enter, sem
mouse, enxergando o foco em todos os passos, inclusive dentro do `Modal.tsx` e do `Combobox.tsx`.

---

### `TR-02.3` — Foco preso e devolvido no modal — **P0 · E1**

**Sintoma.** `Modal.tsx` é usado em confirmações que mexem em dinheiro e em documento fiscal:
Marcar como paga (TL-32), Marcar como recebido (TL-35), Receber pedido (TL-22), Cancelar nota
(TL-42), Importar por foto (TL-13), Importar XML (TL-23). Não há registro de *focus trap*.

**Por quê.** Sem foco preso, o Tab escapa do modal para a tela de trás — que ainda está lá,
clicável e desfocada. Num modal de "Confirmar cancelamento" de nota fiscal, isso é o caminho
para confirmar a coisa errada. É requisito de acessibilidade padrão (WAI-ARIA *dialog* pattern)
e, aqui, também de segurança operacional.

**Prompt.**

> Em `src/components/Modal.tsx`: adicione `role="dialog"` + `aria-modal="true"` +
> `aria-labelledby` apontando para o título; mova o foco para o primeiro elemento focável ao
> abrir (ou para o botão menos destrutivo, quando o modal for de confirmação); prenda o Tab
> dentro do modal; feche no `Esc`; e **devolva o foco para o elemento que abriu o modal** ao
> fechar. Torne `inert` (ou `aria-hidden`) o conteúdo de trás enquanto o modal está aberto.
> Em modal de confirmação destrutiva (excluir, cancelar nota, desfazer pagamento), o foco
> inicial deve ser o botão **Cancelar**, nunca o de confirmar — evita "Enter no automático"
> confirmar algo irreversível.

**Critério de aceite.** Tab nunca sai do modal; Esc fecha; foco volta para o botão de origem;
testado no Electron real (Playwright), não só no navegador.

---

### `TR-02.4` — Desfazer no lugar de confirmar (onde der) — **P1 · E2**

**Sintoma.** O padrão do app é `confirm()` nativo para exclusão e cancelamento. Já existe um
"Desfazer pagamento" em Contas a Pagar, que é o modelo certo — mas ele é exceção.

**Por quê.** Diálogo de confirmação é a ferramenta mais fraca contra erro: as pessoas
aprendem a clicar "Sim" sem ler (é literalmente o efeito estudado de *habituation*/alert
fatigue). Nielsen nº 5 é *error prevention*, e nº 3 é *user control and freedom* — "saída de
emergência", ou seja, **desfazer**. Onde a ação é reversível (inativar, lançar movimento de
estoque, lançar entrada/saída de caixa), desfazer é melhor que perguntar. Onde é irreversível
de verdade (cancelar nota na SEFAZ), a confirmação deve ficar **mais** pesada, não menos.

**Prompt.**

> Duas frentes, na mesma sessão:
> 1. Crie um `<AvisoDesfazer>` (faixa discreta no rodapé, ~8 segundos, com botão "Desfazer")
>    e use-o nas ações **reversíveis**: inativar/reativar cadastro, registrar movimentação
>    manual de estoque, lançamento manual de caixa, marcar conta como paga/recebida. A ação
>    acontece na hora (sem perguntar) e o desfazer chama a função inversa que já existe
>    (`desfazerPagamento()` é o modelo).
> 2. Para as **irreversíveis** — excluir cliente/peça, cancelar nota fiscal, confirmar
>    faturamento — troque o `confirm()` nativo por um modal do app que diga, em português
>    simples, *o que vai acontecer e o que não dá para desfazer*, e exija um gesto deliberado
>    (digitar o número da OS, ou segurar o botão). Especificamente no cancelamento de nota,
>    manter o texto atual sobre a SEFAZ, que já está certo.

**Critério de aceite.** Nenhum `confirm()` nativo sobra em ação reversível; toda ação
irreversível tem modal próprio explicando a consequência; o desfazer foi testado de verdade
(desfazer um pagamento remove a Saída do Caixa, desfazer um movimento manual estorna o saldo).

**Não mexer.** Não transformar em "desfazer" nada que já tenha ido para a SEFAZ ou para a
prefeitura. Lá fora não existe desfazer.

---

### `TR-02.5` — Nunca pedir de novo o que o sistema já sabe (WCAG 3.3.7) — **P1 · E1**

**Sintoma.** Alguns fluxos repedem informação: ao criar OS escolhe-se cliente **e** veículo
mesmo quando o cliente tem um só; no cadastro de cliente, CEP preenche endereço (bom), mas o
mesmo endereço é redigitado do zero no cadastro de fornecedor e de funcionário; o depósito é
perguntado em toda movimentação mesmo quando a loja tem um só (aqui já resolvido nos fluxos
automáticos, mas não nos manuais).

**Por quê.** WCAG 2.2 acrescentou o critério **3.3.7 Redundant Entry** (nível A): informação já
fornecida no mesmo processo deve ser preenchida sozinha ou oferecida para seleção. Fora da
acessibilidade, é o item que mais economiza segundos no balcão — e segundo de balcão é o que
faz um operador gostar ou odiar um sistema.

**Prompt.**

> Varra os formulários procurando redundância e corrija os casos claros:
> - Cliente com **um** veículo: selecionar o cliente na abertura de OS já preenche o veículo
>   (mantendo o campo editável). Com mais de um, abrir a lista já filtrada.
> - Loja com **um** depósito ativo: o campo Depósito em Movimentações e Contagem já vem
>   preenchido e recolhido (mostrar só se houver 2+), reaproveitando `buscarDepositoPadraoId()`.
> - Reaproveite o mesmo grupo de campos de endereço com busca por CEP nos três cadastros
>   (cliente, fornecedor, funcionário) — hoje cada módulo tem o seu `EnderecoFields.tsx`
>   próprio. **Atenção**: o padrão do projeto é *não* compartilhar `FormCompartilhado.tsx`
>   entre módulos de propósito; então extraia só o **hook** de busca de CEP
>   (`src/hooks/useBuscaCep.ts`), não o componente visual.

**Critério de aceite.** Abrir uma OS de cliente com um veículo só exige uma escolha, não duas;
loja com um depósito nunca vê o campo Depósito; a busca de CEP é uma função só.

---

### `TR-02.6` — Mensagem de erro que diz o que fazer — **P1 · E2**

**Sintoma.** O app já mostra o erro real em vez de engolir (`mensagemDeErro()`, §6 itens 11 e
24) — isso está certo. O problema é que a mensagem real costuma ser técnica:
`invalid input syntax for type uuid: ""`, `Edge Function returned a non-2xx status code`,
`Rejeição: Informado CST para emissor do Simples Nacional [nItem:1]`.

**Por quê.** Nielsen nº 9: mensagem de erro deve dizer o problema **em linguagem do usuário** e
sugerir a saída. O pai dela não sabe o que é UUID. E o caso da SEFAZ prova o valor: quando o
sistema passou a listar o **nome da peça** em vez do `[nItem:1]`, o problema deixou de ser
adivinhação (§6 item 47) — esse mesmo tratamento merece ser generalizado.

**Prompt.**

> Crie `src/lib/traduzErro.ts`: uma tabela de padrões conhecidos (regex → mensagem em português
> + ação sugerida), aplicada por cima de `mensagemDeErro()`. Cobrir no mínimo:
> violação de chave estrangeira ("Não dá para excluir: existe OS/pedido usando este registro.
> Inative em vez de excluir."), violação de `unique`, `invalid input syntax for type uuid`,
> erro de rede/timeout ("Sem conexão com o banco. Confira a internet da loja."),
> JWT expirado ("Sua sessão expirou, entre de novo"), e as rejeições mais comuns da SEFAZ/
> prefeitura já vistas (CST/CSOSN, total de pagamentos, alíquota de competência). **Sempre**
> preservar a mensagem técnica original num "Ver detalhes" recolhido — ela é o que a usuária
> manda para o suporte da Focus NFe. Escreva teste para cada padrão traduzido.

**Critério de aceite.** Nenhuma mensagem de banco crua chega à tela sem tradução; o detalhe
técnico continua acessível em um clique; testes cobrindo cada padrão.

---

### `TR-02.7` — Rótulo, `aria` e leitura de tabela — **P2 · E2**

**Sintoma.** Não há registro de auditoria de semântica. Campos com rótulo visual podem não
estar associados via `htmlFor`/`id`; tabelas de dados usam `<table>`? (as telas sugerem que
sim, mas sem `<caption>`/`scope`); ícones-botão (calendário, câmera, três pontos) sem
`aria-label`.

**Por quê.** Menos por leitor de tela — que provavelmente ninguém usa aqui — e mais por três
efeitos colaterais concretos: (a) rótulo associado faz o **clique no rótulo focar o campo**,
que é ergonomia pura; (b) `aria-label` em botão de ícone é o que faz o `title` aparecer no
hover, resolvendo "o que é esse ícone?"; (c) marcação semântica correta é o que permite
**testar** a tela por papel/nome (`getByRole('button', { name: 'Excluir' })`) em vez de por
classe CSS quebradiça — ou seja, é pré-requisito de TR-07.

**Prompt.**

> Instale `eslint-plugin-jsx-a11y` e ligue como **aviso** (não erro) as regras
> `label-has-associated-control`, `control-has-associated-label`, `anchor-is-valid`,
> `no-autofocus`, `role-has-required-aria-props`. Corrija a fila que aparecer, começando pelos
> formulários mais usados. Em tabelas de dados, use `<th scope="col">` e um
> `<caption class="sr-only">` descrevendo a tabela. Em todo botão de ícone, `aria-label` +
> `title` com o mesmo texto. Não ligue como erro no CI ainda — o objetivo aqui é o placar
> baixar sessão a sessão, não travar PR.

---

### `TR-02.8` — Atalhos de teclado do balcão — **P1 · E2**

**Sintoma.** Enter avança campo, mas não há atalho para as ações mais repetidas do dia:
abrir OS, buscar cliente/placa, lançar no caixa.

**Por quê.** É a diferença entre "sistema moderno" e "sistema rápido". O S3Auto é criticado pela
UX densa, mas ERPs antigos ganham em **velocidade de teclado** — quem trabalhou anos num
sistema de tela verde digita sem olhar. Perder essa disputa é perder o argumento de venda.
Hick-Hyman diz o óbvio de outro jeito: quanto mais opções na tela, mais lenta a escolha —
atalho corta a escolha inteira.

**Prompt.**

> Crie `src/hooks/useAtalhos.ts`, aplicado uma vez em `App.tsx` (mesmo padrão global de
> `useEnterParaProximoCampo`). Atalhos, todos respeitando a permissão do operador e **inertes
> enquanto um campo de texto está focado** (exceto os com Ctrl/Alt):
> `Ctrl+K` busca global (ver TR-03.3) · `F2` nova OS · `F4` novo cliente ·
> `F8` lançamento manual no caixa · `Alt+←` voltar · `Esc` fechar modal/cancelar formulário.
> Mostre a lista num "?" no rodapé da Sidebar e coloque o atalho no `title` de cada botão
> correspondente (é assim que a pessoa descobre sozinha). Nada de atalho que dispare ação
> destrutiva.

**Critério de aceite.** Abrir uma OS do zero sem tocar no mouse; nenhum atalho dispara enquanto
se digita num campo; a lista de atalhos é descobrível pela interface.

---
## TR-03 — Navegação, organização e busca

> **Diagnóstico geral.** O menu lateral tem **13 itens em lista plana**, e a própria usuária já
> registrou que essa organização é provisória e que pretende repensá-la (status §1). Este eixo é
> o convite formal para isso — com uma proposta concreta, não só "reorganizar".

### `TR-03.1` — Agrupar o menu por momento de uso — **P1 · E2**

**Sintoma.** Início · Clientes · Ordens de Serviço · Estoque · Fornecedores · Serviços · Caixa
Diário · Contas a Pagar · Contas a Receber · Relações · Garantias · Notas Fiscais · Funcionários
— 13 alvos igualmente destacados, sem hierarquia. Mais Configurações e Auditoria escondidos como
ícones no rodapé.

**Por quê.** A **lei de Hick-Hyman** é direta: o tempo de decisão cresce com o log do número de
alternativas *equiprováveis*. A saída não é cortar itens, é **quebrar a equiprobabilidade** —
agrupar transforma uma escolha entre 13 numa escolha entre 4 seguida de uma entre 3. E os itens
não são igualmente usados: Ordens de Serviço é aberto dezenas de vezes por dia, Funcionários uma
vez por mês.

**Prompt.**

> Reorganize a `Sidebar.tsx` em **quatro grupos com rótulo discreto**, mantendo todas as rotas e
> chaves de `MODULOS` (`src/types/operador.ts`) intactas — é mudança visual e de ordem, não de
> permissão:
>
> - **Balcão** — Início, Ordens de Serviço, Clientes, Estoque
> - **Dinheiro** — Caixa Diário, Contas a Receber, Contas a Pagar, Relações
> - **Fiscal** — Notas Fiscais, Garantias
> - **Cadastros** — Serviços, Fornecedores, Funcionários
>
> Grupo com nenhum módulo liberado para aquele operador **não aparece** (não mostrar grupo
> vazio). Guarde no `localStorage` quais grupos ficam recolhidos, por computador. Leve
> Configurações e Auditoria do rodapé para um quinto grupo "Administração", visível só para
> admin — hoje estão escondidos como ícone sem rótulo, o que é achado por acidente.
>
> **Antes de aplicar, mostre à usuária uma imagem do menu antes/depois** (gerada pelo preview
> renderizado) e confirme o agrupamento com ela. Ela já disse que quer repensar isso — mas
> "quer repensar" não é "pode mudar sozinho".

**Critério de aceite.** Nenhuma rota nova, nenhuma chave de `MODULOS` alterada, nenhuma
permissão muda de efeito; operador com uma permissão só vê um grupo só.

---

### `TR-03.2` — Onde eu estou: cabeçalho de contexto consistente — **P1 · E1**

**Sintoma.** As telas do PDF mostram cabeçalho com título + subtítulo (bom), mas dentro de
formulários o contexto se perde: "Novo pedido de compra" não diz de qual loja, "Nova
movimentação" não diz de qual depósito na barra de título, e o `LojaSwitcher` fica no **rodapé**
da Sidebar — longe do olhar, num app onde ver o dado da loja errada é o pior erro possível.

**Por quê.** Nielsen nº 1 (visibilidade do estado) e nº 6 (reconhecer em vez de lembrar). Com
uma loja só, isso é decoração. Com quatro empresas e dez lojas, "em qual loja eu estou?" vira a
pergunta mais cara do sistema: um lançamento de caixa na loja errada é um dia inteiro de
conciliação.

**Prompt.**

> 1. Suba o `LojaSwitcher.tsx` do rodapé da Sidebar para o **cabeçalho da área de conteúdo**,
>    à direita do título da página, e mostre sempre o nome da loja ativa — mesmo com uma loja
>    só, quando aí ele vira só um rótulo estático, sem seletor (o custo é zero e o hábito de
>    olhar ali se forma antes de existirem duas lojas).
> 2. Quando houver 2+ lojas, pinte uma faixa fina na cor da loja ativa no topo da janela
>    (cor derivada do id da loja, determinística) — reconhecimento periférico, sem ler.
> 3. Dentro de qualquer formulário, o cabeçalho passa a mostrar a trilha:
>    `Estoque › Movimentações › Nova movimentação`, com os níveis anteriores clicáveis. Isso
>    substitui o `BotaoVoltar.tsx` como *informação* (o botão continua existindo como atalho).

---

### `TR-03.3` — Busca global (`Ctrl+K`) — **P1 · E2**

**Sintoma.** Para achar um cliente é preciso ir em Clientes e buscar; para achar uma OS pela
placa, ir em Ordens de Serviço e buscar; para achar uma peça, ir em Estoque. Três caminhos para
a mesma pergunta de balcão: *"chegou o carro placa ABC-1D23, o que a gente já fez nele?"*.

**Por quê.** É o recurso que mais muda a percepção de velocidade num ERP, e é exatamente o
gesto do balcão: o cliente chega e diz a placa. Todos os concorrentes de mercado vendem
"busca por placa" como recurso de capa. Aqui ela sai quase de graça — o dado já está todo no
Postgres.

**Prompt.**

> Crie `src/components/BuscaGlobal.tsx`, aberto por `Ctrl+K` (ver TR-02.8) e por um campo de
> busca no cabeçalho. Uma caixa só, que pesquisa em paralelo e agrupa os resultados por tipo:
> **Veículo/placa** (leva ao histórico do veículo, ver FN-04), **Cliente**, **OS pelo número**,
> **Peça** (descrição, referência, código de barras), **Fornecedor**. Regras:
> - Debounce de 250ms, mínimo 2 caracteres, cancelamento da consulta anterior (`AbortController`).
> - Normalizar acento e a placa nos dois formatos (`ABC1D23` e `ABC-1D23`) antes de comparar.
> - Cada tipo respeita a permissão do operador — quem não tem Estoque não vê peça no resultado.
> - Navegação por ↑/↓/Enter; o item focado mostra um resumo (última OS, saldo em estoque).
> - No banco: crie os índices que faltarem para isso não ficar lento
>   (`veiculos.placa` normalizada, `clientes.nome` com `pg_trgm`, `pecas.codigo_barras`).
>
> Antes de escrever a tela, meça: rode as consultas com `explain analyze` num Postgres local com
> ~50 mil linhas de dado falso e mostre os tempos.

**Critério de aceite.** Digitar uma placa em qualquer tela do app abre o histórico daquele
veículo em menos de 300ms num banco com volume de 10 lojas; a busca respeita permissão.

---

### `TR-03.4` — Abas vs. módulos: uma regra só — **P2 · E1**

**Sintoma.** A organização interna é inconsistente. Estoque tem 4 abas (Produtos, Movimentações,
Contagem, Relatórios); Fornecedores tem 2; Caixa tem 3; Funcionários tem 2; Relações tem 2;
mas Contas a Pagar e Contas a Receber são **módulos separados no menu** mesmo sendo o mesmo
conceito espelhado, e Garantias é um módulo inteiro para **uma** tela.

**Por quê.** A previsibilidade de onde uma coisa mora é o que faz alguém parar de procurar. Hoje
a regra implícita é histórica, não conceitual.

**Prompt.**

> Escreva primeiro **a regra**, num comentário no topo de `src/types/operador.ts`, e só depois
> mexa em tela. Proposta de regra: *"Módulo = uma permissão que faz sentido dar ou tirar de um
> operador. Aba = uma visão do mesmo assunto, para quem já tem essa permissão."* Sob essa regra,
> traga à usuária duas propostas para decidir (não decidir sozinho): juntar Contas a
> Pagar/Receber num módulo "Contas" com duas abas — mas isso **muda permissão** (hoje dá para
> liberar uma e não a outra), então precisa da opinião dela; e mover Garantias para uma aba
> dentro de Notas Fiscais ou de Ordens de Serviço, já que ela é derivada de OS e nunca tem
> cadastro próprio.

**Não mexer.** Nada disso antes de ela escolher. Mudança de módulo mexe em `permissoes[]` de
operador já cadastrado e exige migration de dados (§5, migration `0028` é o precedente).

---

### `TR-03.5` — Lista longa: paginação e ordenação de verdade — **P1 · E2**

**Sintoma.** As listas carregam tudo e ordenam do jeito que vier do banco. Com uma loja e três
carros por dia isso não aparece; com dez lojas a 10 carros/dia, são ~2.600 OS/mês e ~31 mil
por ano numa tabela só, mais o catálogo de peças compartilhado entre lojas.

**Por quê.** Duas coisas quebram ao mesmo tempo: a rede (baixar milhares de linhas para mostrar
20) e o DOM (renderizar milhares de `<tr>`). E o operador perde a capacidade de ordenar pelo
que importa ("qual OS está aberta há mais tempo?", "que peça está com saldo negativo?").

**Prompt.**

> Padronize um `useListaPaginada` em `src/hooks/`, usado pelas listas grandes (Ordens de
> Serviço, Clientes, Produtos, Movimentações, Notas Fiscais, Auditoria):
> - Paginação **no servidor** via `.range()` do `supabase-js`, 50 linhas por página, com
>   contagem exata só quando barata (`count: 'estimated'` nas tabelas grandes).
> - Ordenação clicável no cabeçalho da coluna (`.order()` no servidor, nunca no cliente),
>   guardando a preferência por tela em `localStorage`.
> - Filtro sempre no servidor (hoje há filtro client-side em algumas telas — é o padrão de bug
>   do §6 item 26).
> - Mantenha o comportamento já decidido de "OS em aberto sempre aparecem, não importa a data"
>   — isso é regra de negócio, não paginação.
>
> Só depois disso, se ainda houver lentidão medida, considerar virtualização
> (`@tanstack/react-virtual`) — e aí sim como decisão discutida com ela, porque é dependência
> nova.

**Critério de aceite.** Abrir Ordens de Serviço num banco com 30 mil OS carrega em tempo
constante; ordenar por coluna funciona sobre a tabela inteira, não só sobre a página visível.

---
## TR-04 — Segurança de acesso (o buraco que a venda abre)

> **Diagnóstico geral.** Hoje o sistema roda numa loja da própria família. Nesse cenário, o
> modelo "RLS exige login, permissão por módulo é checada na tela" é uma decisão de escopo
> razoável e está corretamente documentada como dívida (§6 item 1). **A partir da segunda
> empresa isso muda de natureza**: deixa de ser dívida técnica e passa a ser responsabilidade
> sobre dado de terceiro — e a decisão de 28/08 ("tudo na conta da usuária") coloca essa
> responsabilidade no nome dela. Este eixo é o mais importante do guia inteiro para a fase 2.
>
> Os três primeiros itens são **variações do mesmo furo**: qualquer operador logado, com
> qualquer permissão, pode falar direto com a API do Supabase usando a chave `anon` que está no
> `conexao.json` da máquina dele.

### `TR-04.1` — RLS por módulo, não só por login — **P1 · E3**

**Sintoma.** Um balconista com permissão só de "Caixa" não vê o módulo Clientes na tela — mas a
chave `anon` está no computador dele, a sessão é válida, e `select * from clientes` responde.
A RLS exige `auth.uid() is not null` e acesso à loja; não exige a permissão do módulo.

**Por quê.** É a diferença entre esconder e proteger. Enquanto o operador é o pai dela e os
funcionários da loja dele, o risco é teórico — está escrito assim no status e é uma leitura
correta. Quando o operador é funcionário de outra empresa, o risco vira: um balconista pode
exportar o cadastro inteiro de clientes da loja (e o de todas as lojas da mesma empresa, já que
`clientes`/`pecas` são compartilhados) sem nenhum rastro na auditoria — porque a auditoria só
grava `UPDATE`/`DELETE`, não leitura.

**Prompt.**

> Trabalho em três etapas, cada uma com PR próprio. **Alinhe a etapa 1 com a usuária antes de
> começar** — é mudança de arquitetura de segurança.
>
> **Etapa 1 — a função.** Crie a migration com uma função `security definer`
> `operador_tem_permissao(modulo text) returns boolean`, no mesmo padrão de
> `operador_atual_e_admin()` (migration `0008`), que retorne verdadeiro para admin ou quando o
> módulo estiver em `operadores.permissoes`. `security definer` é obrigatório aqui pelo mesmo
> motivo do §6 item 13 (recursão de policy).
>
> **Etapa 2 — as policies, uma tabela por vez, do menos arriscado para o mais.** Comece por
> `funcionarios` (módulo `funcionarios`) e `contas_pagar`/`contas_receber`, depois `clientes`/
> `veiculos`, `pecas`/`estoque_movimentos`, `ordens_servico`, `caixa_movimentos`. Regras
> obrigatórias de performance, todas documentadas pelo Supabase:
> - Sempre `TO authenticated` na policy (evita avaliar para anônimo — a diferença medida é de
>   ordens de grandeza).
> - Sempre envolver a chamada em `select`: `(select operador_tem_permissao('clientes'))`, para o
>   planejador tratar como `initPlan` e avaliar **uma vez**, não por linha.
> - Índice em toda coluna usada na policy que não seja PK (`loja_id`, `operador_id`).
> - Meça com `explain analyze` antes e depois, num Postgres local com volume, e registre os
>   tempos no corpo do PR.
>
> **Etapa 3 — o teste.** Nenhuma policy entra sem um teste automatizado que **prove o
> bloqueio**: script SQL que troca `role` e `request.jwt.claim.sub` para simular cada perfil
> (admin, balconista só-Caixa, operador de outra loja, anônimo) e confere linha a linha o que
> cada um enxerga e consegue gravar. Esse script vira parte do `npm test` — ver `TR-07.3`.
>
> **Cuidado obrigatório** (§6 item 15): toda tabela precisa de policy para **cada comando**
> (`select`, `insert`, `update`, `delete`). Faltar uma não dá erro — filtra a zero linhas em
> silêncio, e o botão "não faz nada". Rodar a checagem que lista tabelas com RLS ligada e
> comandos sem policy antes de fechar o PR.

**Critério de aceite.** Um operador só-Caixa, usando a chave `anon` e a sessão dele direto na
API REST (teste feito de fora do app, com `curl`, pela usuária ou por um teste de integração),
recebe zero linhas de `clientes`, `pecas` e `funcionarios`; nenhuma tela do app perde
funcionalidade; tempos de consulta medidos e registrados.

**Não mexer.** Não mudar a decisão de "leitura de `operadores` aberta a qualquer logado" nesta
etapa — é o `TR-04.4`, separado de propósito, porque a tela de OS depende dessa lista.

---

### `TR-04.2` — O token da Focus NFe está legível por qualquer operador — **P1 · E3**

**Sintoma.** `configuracoes_fiscais_loja.focus_nfe_token` é uma coluna comum, lida pelo app
instalado (é assim que a emissão funciona hoje, via IPC do Electron). Qualquer operador com
acesso à loja pode ler essa coluna pela API — inclusive um balconista.

**Por quê.** Esse token **emite e cancela nota fiscal em nome do CNPJ da loja**. Nas mãos
erradas ele não vaza dado: ele produz documento fiscal falso ou cancela documento verdadeiro,
com consequência tributária para o dono da loja. É o segredo mais sensível do sistema inteiro,
e é o único guardado com menos cuidado que a chave da Anthropic — que, corretamente, nunca sai
do secret da Edge Function (decisão da §3).

**Prompt.**

> Este item **é** a arquitetura de "token compartilhado" que já está na fila dela (§8 item 6) —
> e agora tem duas justificativas somadas: economia de ~R$650/mês no cenário de 10 lojas, e
> tirar o segredo fiscal de dentro do alcance do operador. Proponha à usuária fazer as duas de
> uma vez, porque é o mesmo trabalho.
>
> Desenho a implementar, depois de ela aprovar:
> 1. Uma Edge Function `emitir-nota` (Deno, mesmo padrão de `ler-notas-fiscais`), com o token da
>    Focus NFe **só como secret da função**. O app manda: `loja_id`, `ordem_servico_id`, tipo da
>    nota. A função busca no banco o CNPJ daquela loja, monta o corpo (reaproveitando as funções
>    puras de `src/lib/focusNfe.ts`, que devem migrar para um módulo compartilhável) e chama a
>    Focus NFe.
> 2. A função **confere do lado do servidor** que quem chamou tem sessão válida, tem acesso
>    àquela loja e tem a permissão de notas fiscais — exatamente o padrão que
>    `redefinir-senha-operador` já usa para conferir "é admin mesmo?".
> 3. `focus_nfe_token` deixa de ser lido pelo app. Numa migration seguinte, some da tabela.
> 4. A chamada por IPC do Electron (§6 item 29) deixa de ser necessária para a Focus NFe —
>    a Edge Function já roda fora do navegador, sem CORS. **Mantenha a ponte IPC**, que continua
>    servindo para outras integrações, mas a emissão passa a ir pela função.
>
> **Ordem combinada com ela e que continua valendo**: primeiro terminar de validar a emissão
> na Pneus Amigão; só depois construir isso. Não inverter.

**Critério de aceite.** Nenhuma linha do app instalado lê `focus_nfe_token`; emissão e
cancelamento continuam funcionando de ponta a ponta em produção; uma chamada à Edge Function
com sessão de operador sem permissão de notas é recusada pelo servidor.

**Não mexer.** Nada de mudar a lógica de montagem do corpo da NFC-e/NFS-e nesta mudança — ela
está validada em produção e é a parte mais cara de reconquistar. Mover, não reescrever.

---

### `TR-04.3` — Dado de RH visível para quem não tem o módulo — **P1 · E1**

**Sintoma.** `funcionarios` guarda `salario`, `comissao`, CPF, RG, CNH, filiação, nome do
cônjuge e filhos. A tela esconde de quem não tem a permissão "Funcionários"; a RLS não.

**Por quê.** É `TR-04.1` aplicado à tabela onde o dano é mais direto: salário de colega
circulando na loja é conflito humano imediato, e CPF/RG/CNH/filiação é dado pessoal de
terceiro sob a LGPD (ver TR-12). A escolha de **deixar dado de saúde de fora** do cadastro já
mostra que essa preocupação existe no projeto — é coerente completá-la aqui.

**Prompt.**

> Faça `funcionarios` e `funcionario_filhos` serem a **primeira** tabela da etapa 2 do
> `TR-04.1`. Além da permissão de módulo, separe a leitura em dois níveis na própria policy:
> qualquer operador com acesso à loja pode ler as colunas necessárias para escolher técnico e
> vendedor numa OS (`id`, `nome`, `cargo`, `ativo`, `loja_id`); o restante só com a permissão
> `funcionarios`. Como o Postgres não faz RLS por coluna, implemente com uma **view**
> `funcionarios_publico` (`security_invoker = true`) usada pelos seletores de OS e comissão, e
> restrinja a tabela base. Ajuste `src/lib/funcionarios.ts` e os `Combobox` de técnico/vendedor
> para lerem a view.

**Critério de aceite.** Operador sem permissão de Funcionários consegue abrir OS escolhendo
técnico e vendedor, e recebe zero colunas de salário/CPF ao consultar a tabela base pela API.

---

### `TR-04.4` — Lista de operadores aberta a qualquer logado — **P2 · E1**

**Sintoma.** Decisão deliberada e documentada (§5): a leitura de `operadores` é livre para
qualquer logado, inclusive de outra loja.

**Por quê.** Com uma empresa, é baixo risco como está escrito. Com quatro empresas em quatro
projetos Supabase separados, o vazamento não cruza empresas — o isolamento por projeto resolve
isso. Mas **dentro** de uma empresa com 5 lojas, o balconista da loja A enumera nome e
permissões de todo mundo da loja B, o que é um mapa útil para quem quiser tentar algo. É baixo,
mas é gratuito de fechar.

**Prompt.**

> Estreite a policy de `select` em `operadores` para: o próprio operador, mais operadores que
> compartilhem pelo menos uma loja (`operador_lojas`), mais tudo para admin. Faça isso **depois**
> do `TR-04.1`, e confira antes quais telas quebram — `OperadorForm`, `ComissoesSection` e a
> coluna "Enviado por" de Notas Fiscais leem essa tabela. Onde só o nome for necessário, use uma
> view enxuta, mesmo padrão do `TR-04.3`.

---

### `TR-04.5` — Bucket de notas fiscais não segmentado por loja — **P2 · E2**

**Sintoma.** O bucket `notas-fiscais` guarda `<tipo>/<ano>-<mes>/<uuid>-<nome>`, sem loja no
caminho. A tabela `notas_fiscais_arquivos` isola por `loja_id` corretamente, mas o objeto no
Storage não. Risco residual aceito e documentado (§5).

**Por quê.** Enquanto o app só lê pela tabela, funciona. Mas o XML é a prova fiscal que a lei
manda guardar por cinco anos, e uma URL assinada obtida por um caminho fora do app não passa
pela tabela. Além disso, o dia em que alguém precisar **apagar os dados de um cliente que
cancelou o contrato** (fase 3, LGPD), não existe hoje um jeito de listar "os arquivos daquela
loja" sem cruzar com a tabela.

**Prompt.**

> Migre para `<loja_id>/<tipo>/<ano>-<mes>/<uuid>-<nome>` e crie policies de Storage que
> confiram `operador_tem_acesso_loja()` a partir do primeiro segmento do caminho. Como não dá
> para renomear objeto por SQL, escreva um script de uso único em `supabase/scripts/` que
> percorra `notas_fiscais_arquivos`, copie cada objeto para o caminho novo via API, atualize
> `storage_path` e só então apague o antigo — **em transação lógica por arquivo**, com log do
> que foi movido, e com um modo "simular" que não escreve nada. Rode primeiro em simulação e
> mostre o relatório para a usuária.

---

### `TR-04.6` — Endurecer o Electron — **P1 · E2**

**Sintoma.** Não há registro no status de auditoria de segurança do processo principal. O app
já faz coisas certas (`contextBridge`, chave da IA só no servidor), mas também abre exceções
por necessidade: parâmetros do Chromium desligando *occlusion*, ponte `fetchComAuth` genérica
via IPC, e carregamento por `file://`.

**Por quê.** O checklist oficial de segurança do Electron existe justamente porque a falha
típica não é exótica: um XSS na tela vira execução de código na máquina quando `nodeIntegration`
está ligado ou o contexto não está isolado. Dois pontos específicos deste app merecem atenção:
`http:fetchComAuth` é uma **ponte de requisição arbitrária** exposta à tela (se a tela for
comprometida, ela vira um proxy autenticado), e o app carrega HTML local sem CSP declarada.

**Prompt.**

> Auditoria e correção em `electron/main.ts` e `electron/preload.ts`, seguindo o checklist
> oficial do Electron:
> 1. Confirme e mantenha `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
>    `webSecurity: true`. Se algum estiver diferente, traga o motivo antes de mudar.
> 2. Declare uma **CSP restritiva** (via `session.defaultSession.webRequest.onHeadersReceived`,
>    não só `<meta>`): `default-src 'self'`, `connect-src` só o domínio do Supabase configurado,
>    `img-src 'self' data:`, sem `unsafe-inline` em `script-src`.
> 3. **Feche a ponte `fetchComAuth`**: em vez de aceitar qualquer URL, aceite só um conjunto de
>    destinos permitidos (hoje, a API da Focus NFe). Valide o `event.senderFrame` de toda
>    chamada `ipcMain.handle` — é o item 17 do checklist. Se o `TR-04.2` for feito, essa ponte
>    deixa de ser usada para a Focus NFe e pode ficar ainda mais estreita.
> 4. Bloqueie navegação e janelas novas: `will-navigate` e `setWindowOpenHandler` recusando
>    tudo que não seja a origem do app; links externos só por `shell.openExternal` com URL
>    validada contra uma lista.
> 5. Ligue os **fuses** do Electron no build (`RunAsNode`, `EnableNodeCliInspectArguments`,
>    `EnableNodeOptionsEnvironmentVariable` desligados; `OnlyLoadAppFromAsar` e integridade do
>    asar ligados) — é o que impede alguém abrir o `.exe` instalado como um Node.js comum.
> 6. DevTools só quando `import.meta.env.DEV`.
> 7. Fixe uma tarefa recorrente de **atualizar o Electron** — o app está no Chromium 130 (§6
>    item 41), e versão de Chromium é vetor de CVE.
>
> Depois de cada mudança, rode o teste de ponta a ponta no Electron real que já existe
> (Playwright + `xvfb-run`) — o preload é o lugar clássico de quebrar em silêncio (§6 item 18).

**Critério de aceite.** Checklist do Electron percorrido item a item, com uma linha de resposta
para cada, escrita no PR; app abre, loga, emite nota e atualiza sozinho depois das mudanças.

---

### `TR-04.7` — Segredo no histórico do Git e varredura automática — **P0 · E1**

**Sintoma.** O repositório é **público** (foi aberto para o auto-update funcionar). O CSC da
SEFAZ, o token do portal Giap e a senha do portal da prefeitura já estiveram escritos no
`PROJETO_STATUS.md` e **continuam no histórico do Git**, mesmo depois de removidos do texto. As
três credenciais seguem em uso e ainda não foram trocadas (§ "O que depende dela para andar").

**Por quê.** Remover do arquivo não remove do histórico — qualquer pessoa clona e lê. E isso vai
acontecer de novo: o `PROJETO_STATUS.md` é escrito por sessões diferentes ao longo de meses, e
o gesto de "colar aqui para não esquecer" é natural.

**Prompt.**

> Duas coisas, na mesma sessão:
> 1. **Lembrete para a usuária, com passo a passo curto** (não é código): regerar CSC/ID Token
>    na SEFAZ-SP, gerar token novo no portal Giap (Dados Cadastrais) e trocar a senha do portal
>    da prefeitura com a contabilidade — e atualizar os três no painel da Focus NFe. Enquanto não
>    trocar, tratar como expostos. Escrever a mensagem curta e informal, do jeito que ela pediu.
> 2. **Impedir a repetição**: adicione um job de CI (`.github/workflows/`) rodando `gitleaks`
>    em todo push e PR, e um `pre-commit` opcional. Adicione ao `.gitignore` os arquivos que
>    tendem a carregar segredo (`conexao.json`, `*.pfx`, `*.p12`, `.env*` exceto `.env.example`).
>    Escreva no topo do `PROJETO_STATUS.md`, em negrito, a regra "nenhuma credencial neste
>    arquivo — o lugar dela é o painel do serviço" (já existe uma nota parecida; promova para o
>    topo, onde é lida).
>
> **Não tentar reescrever o histórico do Git** (`filter-repo`/`BFG`): quebra o auto-update de
> quem já instalou, invalida as releases publicadas e não desfaz clones que já existem. A
> resposta certa para segredo exposto é **rotacionar**, não apagar.

---

### `TR-04.8` — Login: tentativas, sessão e a senha de 6 caracteres — **P2 · E2**

**Sintoma.** Login é usuário + senha, sem limite de tentativas próprio, sessão não persiste
entre aberturas (decisão explícita dela, correta para um PC de balcão), e a senha mínima de 6
caracteres não pode baixar — o Supabase Auth barra, já foi tentado.

**Por quê.** O pedido original dela (senha de 4 dígitos para digitar rápido no balcão) é
legítimo e continua sem resposta. E a decisão de "cada abertura pede login de novo" torna a
digitação da senha um gesto **muitas vezes por dia** — o que na prática empurra todo mundo para
a senha mais curta e óbvia possível, ou para o papelzinho colado no monitor. Ou seja: a regra
de 6 caracteres, somada ao login frequente, está *piorando* a segurança real.

**Prompt.**

> Não mexa em nada disso sem alinhar. Leve à usuária as três opções, com o custo de cada uma:
> 1. **Manter como está.** Custo zero. A senha continua curta e compartilhada na prática.
> 2. **PIN por operador, por cima da senha.** A senha do Supabase Auth continua existindo e
>    fica forte (gerada pelo sistema, ninguém digita); o operador entra com um PIN de 4-6
>    dígitos guardado como hash (`bcrypt`/`argon2`) numa coluna nova de `operadores`, validado
>    por uma Edge Function que, se aprovar, faz o login de verdade no Auth com a senha forte.
>    Ganha velocidade de balcão sem enfraquecer o Auth. Custo: uma Edge Function, uma migration,
>    e uma decisão sobre bloqueio após N tentativas erradas.
> 3. **Manter a sessão viva com bloqueio de tela.** O app não desloga ao fechar; em vez disso,
>    tranca a tela depois de X minutos parado e volta pedindo só o PIN. Muda a decisão dela
>    sobre sessão — só se ela quiser.
>
> Independente da escolha, faça agora o que é barato e não conflita: **contador de tentativas
> erradas por usuário** (coluna + bloqueio temporário de 60s após 5 erros, checado na Edge
> Function ou por trigger) e **registro de login/logout na auditoria** — hoje a trilha não sabe
> quem entrou, só quem editou.

---

### `TR-04.9` — Auditoria: cobrir o que hoje escapa — **P1 · E1**

**Sintoma.** O trigger da migration `0040` cobre `UPDATE`/`DELETE` de um conjunto de tabelas.
Ficam de fora: **toda criação** (`INSERT`), a tabela `ordens_servico_itens` (que agora é
editável — §"Onde tudo parou 08-09/09"), `notas_fiscais_arquivos`, `configuracoes_fiscais_loja`
e `operador_lojas`.

**Por quê.** O buraco de `ordens_servico_itens` é o mais urgente e já está reconhecido no status
como candidato natural: desde a `v0.9.28` dá para mudar o **valor de um item** de uma OS, e essa
alteração não deixa rastro nenhum. É exatamente o tipo de mexida que uma trilha de auditoria
existe para responder. `configuracoes_fiscais_loja` importa porque mudar o CNPJ ou a alíquota
ali muda documento fiscal. E `INSERT` importa porque "quem cadastrou este cliente com esse
CPF?" é uma pergunta tão legítima quanto "quem editou".

**Prompt.**

> Migration nova, no mesmo padrão da `0040`, idempotente, validada duas vezes num Postgres
> local:
> 1. Adicione `ordens_servico_itens`, `notas_fiscais_arquivos`, `configuracoes_fiscais_loja`,
>    `configuracoes_juros_parcelas` e `operador_lojas` à lista de tabelas com o trigger.
> 2. Estenda `registrar_auditoria()` para cobrir também `INSERT` (`acao = 'criar'`,
>    `dados_antes` nulo). Ajuste `src/lib/auditoria.ts` e a tela (TL-53) para o valor novo de
>    `acao`, incluindo o filtro.
> 3. **Nunca gravar segredo na trilha**: em `configuracoes_fiscais_loja`, mascare
>    `focus_nfe_token` no `to_jsonb()` antes de salvar (substituir por `'***'`), senão a
>    auditoria vira o novo lugar onde o token fica legível. Escreva teste SQL provando o
>    mascaramento.
> 4. Adicione um índice em `auditoria (criado_em desc)` e outro em `(tabela, criado_em desc)` —
>    a tela filtra por isso e a tabela só cresce.
> 5. Decida com a usuária uma política de retenção (ex: 24 meses) e escreva a rotina de expurgo
>    — trilha de auditoria sem expurgo é a tabela que estoura o banco primeiro.

**Critério de aceite.** Editar o preço de um item de OS aparece em Auditoria com antes/depois;
criar um cliente aparece; o token fiscal nunca aparece em texto claro na trilha.

---
## TR-05 — Modelagem de dados e integridade

> **Diagnóstico geral.** A modelagem está boa e as decisões grandes (multi-loja por
> `operador_lojas`, o que é compartilhado vs. por loja, derivar Garantias e "Finalizada" em vez
> de gravar) são acertadas e bem justificadas. O que falta é a camada de **defesa no banco**:
> hoje quase toda regra de negócio vive no TypeScript, e o Postgres aceita o que mandarem.

### `TR-05.1` — Constraints que impedem dado impossível — **P1 · E2**

**Sintoma.** O banco aceita quantidade negativa, preço negativo, desconto maior que o valor do
item, data de fechamento anterior à de abertura, alíquota de 300%. A validação existe no `zod`,
que roda **na tela** — a mesma camada que o `TR-04.1` acabou de mostrar que pode ser
contornada. Já houve um caso real de valor absurdo entrando por acidente: o estoque de "1,99
UN" (§6 item 41).

**Por quê.** O banco é a última linha, e é a única que vale para dado que entrou por
importação de XML, por Edge Function, por SQL Editor ou por uma versão antiga do app rodando
numa loja que não atualizou. Um `check` custa nada e não deixa o dado impossível existir.

**Prompt.**

> Migration nova, idempotente, validada duas vezes num Postgres local. **Antes de criar cada
> constraint, rode a consulta que procura linhas que já a violariam** e traga o resultado — se
> houver dado real fora da regra, ele precisa ser corrigido ou a regra afrouxada, e isso é
> conversa com a usuária, não decisão sua.
>
> - `ordens_servico_itens`: `quantidade > 0`, `preco_unitario >= 0`, `desconto >= 0`,
>   `desconto <= quantidade * preco_unitario`.
> - `pecas`/`servicos`: `preco_custo >= 0`, `preco_venda >= 0`, `prazo_garantia_dias >= 0`,
>   `aliquota_icms between 0 and 100`.
> - `estoque_movimentos`: `quantidade > 0` (o sinal é o `tipo`, não o número).
> - `caixa_movimentos`, `contas_pagar`, `contas_receber`: `valor > 0`.
> - `ordens_servico`: `data_fechamento is null or data_fechamento >= data_abertura`.
> - `configuracoes_juros_parcelas`: `juros_percentual between 0 and 100`,
>   `numero_parcelas between 2 and 12`.
> - `configuracoes_fiscais_loja`: `aliquota_iss between 0 and 10` (ISS é limitado a 5% por lei;
>   a folga é proposital) e formato de `cnpj` só com dígitos.
> - `clientes`: quando `tipo_pessoa = 'juridica'`, `cpf_cnpj` com 14 dígitos ou nulo — nunca
>   um CNPJ pela metade, que faz a SEFAZ recusar a nota inteira.
>
> Cada constraint com nome explícito (`ck_<tabela>_<regra>`), para a mensagem de erro poder ser
> traduzida em `TR-02.6`.

**Critério de aceite.** Migration roda duas vezes sem erro; cada constraint tem um teste que
tenta inserir a linha proibida e confirma a recusa; `traduzErro.ts` tem uma frase em português
para cada nome de constraint criado.

---

### `TR-05.2` — Uma nota por OS por tipo, garantido pelo banco — **P1 · E2**

**Sintoma.** Registrado como fragilidade fiscal conhecida (§8, "O que ainda está frágil", item
3): *"Não existe trava no banco contra duas notas do mesmo tipo para a mesma OS. A proteção hoje
é só de tela."* E há dois caminhos conhecidos que furam a proteção de tela — a `ref` perdida
quando a espera vence, e a exclusão de nota autorizada.

**Por quê.** Duas NFC-e válidas para a mesma venda é problema tributário real: imposto pago em
dobro, obrigação acessória inconsistente, e o conserto envolve cancelamento na SEFAZ dentro do
prazo legal. O item já foi analisado e a única coisa que faltou foi decidir o caso da
reemissão depois de cancelar.

**Prompt.**

> A decisão que faltava tem uma resposta natural: **índice único parcial**, que ignora as
> canceladas.
>
> ```sql
> create unique index if not exists ux_nota_por_os_tipo
>   on notas_fiscais_arquivos (ordem_servico_id, tipo)
>   where ordem_servico_id is not null
>     and origem = 'automatica'
>     and status is distinct from 'cancelado';
> ```
>
> Assim: uma NFC-e e uma NFS-e por OS; cancelar libera a reemissão; upload manual de XML
> (`origem = 'manual'`) continua livre, porque a contabilidade pode legitimamente subir mais de
> um arquivo. **Antes de criar**, rode a consulta que procura duplicidade já existente no banco
> real dela e traga o resultado. Ajuste `src/lib/notasFiscais.ts` para tratar a violação com a
> mensagem certa ("Esta OS já tem NFC-e emitida e não cancelada") em vez do erro cru.
>
> Aproveite a mesma migration para resolver a fragilidade nº 5 da mesma lista: grave a `ref`
> **antes** do envio, numa linha com `status = 'processando'`, e atualize depois da resposta.
> É o que permite recuperar sozinho uma emissão cuja espera venceu, em vez de só mostrar a `ref`
> na tela e torcer.

**Critério de aceite.** Tentar emitir a segunda NFC-e da mesma OS falha com mensagem clara;
cancelar e reemitir funciona; uma emissão interrompida no meio deixa rastro consultável.

---

### `TR-05.3` — Dinheiro é `numeric`, nunca ponto flutuante — **P0 · E1**

**Sintoma.** O projeto já teve bug real de arredondamento no JavaScript (`100 * 1.1` virando
`110.00000000000001`, §6 item 4) e outro de parcela que não fechava (`3x de 33,33` somando
99,99, §6 item 45). O que **não** está registrado é qual o tipo das colunas de dinheiro no
Postgres.

**Por quê.** Se alguma coluna de valor for `real`/`double precision`, o problema deixa de ser de
tela e passa a ser de armazenamento — e aí nenhuma função pura em `schemas/` resolve, porque o
erro entra antes. É uma checagem de cinco minutos que fecha uma classe inteira de bug.

**Prompt.**

> Rode no banco a consulta que lista o tipo de toda coluna de valor:
>
> ```sql
> select table_name, column_name, data_type, numeric_precision, numeric_scale
> from information_schema.columns
> where table_schema = 'public'
>   and (column_name ~ '(valor|preco|custo|salario|juros|aliquota|desconto|total|saldo)'
>        or data_type in ('real','double precision'))
> order by 1, 2;
> ```
>
> Traga o resultado. Toda coluna de dinheiro deve ser `numeric(12,2)`; quantidade,
> `numeric(12,3)`; percentual, `numeric(5,2)`. Se houver `double precision`, escreva a migration
> de conversão (`alter table ... type numeric(12,2) using round(coluna::numeric, 2)`) e avise a
> usuária que valores já gravados podem mudar no último centavo. Se estiver tudo `numeric`,
> **registre isso no `PROJETO_STATUS.md`** para ninguém precisar checar de novo.
>
> No lado do TypeScript, padronize: toda conta intermediária em **centavos inteiros**, com
> conversão só na borda (entrada e exibição). Coloque as duas funções (`paraCentavos`,
> `deCentavos`) em `src/schemas/dinheiro.ts` e use nas funções puras que já existem
> (`faturamento.ts`, `metricasCaixa.ts`, `comissoes.ts`).

---

### `TR-05.4` — Saldo de estoque: parar de somar tudo toda vez — **P2 · E3**

**Sintoma.** O saldo de uma peça é derivado de `estoque_movimentos`. Com uma loja isso é
instantâneo. Com dez lojas, o histórico vira centenas de milhares de linhas, e a tela de
Produtos precisa do saldo de **todas** as peças de uma vez.

**Por quê.** Derivar em vez de gravar foi a decisão certa (é a mesma filosofia de Garantias e do
estado "Finalizada", e evita saldo mentiroso). O problema é só de custo, e ele aparece de
repente: a tela funciona bem até o dia em que trava.

**Prompt.**

> Não reescrever nada ainda — **medir primeiro**. Gere num Postgres local o volume de 10 lojas
> (~2.600 OS/mês por 24 meses, com 3 itens médios por OS, mais compras) e rode `explain analyze`
> na consulta que a tela de Produtos usa hoje. Traga o tempo. Se passar de ~300ms (limiar em
> que a interface deixa de parecer instantânea), proponha à usuária, nesta ordem de preferência:
> 1. **Índice** em `estoque_movimentos (peca_id, deposito_id)` e `(loja_id, criado_em desc)` —
>    resolve boa parte e não muda arquitetura nenhuma.
> 2. **View materializada** de saldo por (peça, depósito), atualizada por trigger nas
>    movimentações, com o saldo derivado continuando a existir como fonte de verdade para
>    conferência.
> 3. Só em último caso, coluna de saldo mantida por trigger — que é o desenho que mais mente
>    quando dá problema, e por isso fica por último.

---

### `TR-05.5` — Data e fuso: fechar a porta de vez — **P0 · E1**

**Sintoma.** O mesmo bug apareceu **quatro vezes** em lugares diferentes: OS faturada à noite
sumindo da lista (§6 item 34), competência de nota fiscal caindo no mês seguinte, data de emissão
adiantada, data de pedido de compra (§6 item 42). A correção foi criar `src/lib/datas.ts` e
trocar os quatro pontos.

**Por quê.** Corrigir os quatro lugares não impede o quinto. E o quinto vai aparecer — ela mexe
no sistema à noite, que é exatamente quando o UTC já virou o dia seguinte no fuso do Brasil.
Isso pede uma **trava mecânica**, não vigilância.

**Prompt.**

> Três travas, todas baratas:
> 1. Regra de ESLint proibindo `toISOString` e `.slice(0, 10)` sobre data em `src/`, com exceção
>    declarada só em `src/lib/datas.ts`. Use `no-restricted-syntax` com mensagem explicando o
>    porquê e apontando para `hojeLocal()`/`diaLocal()`.
> 2. Um teste que roda a suíte inteira com `TZ=America/Sao_Paulo` **e** com `TZ=UTC`, e reprova
>    se algum resultado divergir — hoje a máquina de teste roda em UTC, onde o bug não aparece
>    (lição já registrada no §6 item 42, mas ainda dependendo de alguém lembrar de fixar o fuso
>    caso a caso).
> 3. Confira que toda coluna de data/hora no Postgres é `timestamptz` (não `timestamp` sem
>    fuso), e que as colunas que representam **dia de calendário** (vencimento, competência,
>    data do pedido) são `date` — misturar os dois é a origem do problema.

**Critério de aceite.** `npm test` roda nos dois fusos; a regra de lint reprova um
`toISOString().slice(0,10)` novo; o inventário de colunas de data está registrado no status.

---

### `TR-05.6` — Chaves estrangeiras e exclusão: o mapa completo — **P1 · E1**

**Sintoma.** O mesmo bug apareceu três vezes: excluir loja bloqueada por `depositos` (§6 item
15), depois pelas **4 tabelas de configuração** que ninguém tinha olhado (§6 item 20), e
operador sem loja que não podia ser inativado por ninguém (§6 item 23). A lição já foi escrita:
*"conferir a lista completa de tabelas que referenciam Y, não só a que apareceu no primeiro
relato"*.

**Por quê.** Essa lição depende de alguém lembrar dela. Dá para transformá-la num relatório.

**Prompt.**

> Escreva `supabase/scripts/mapa-fks.sql`: uma consulta sobre `information_schema` /
> `pg_constraint` que produza, para cada tabela, todas as FKs que apontam para ela, com a regra
> de `on delete` de cada uma. Rode e guarde a saída como `supabase/MAPA-FKS.md`, versionado.
> Adicione ao `npm test` um teste que **regenera** esse mapa e reprova se ele estiver
> desatualizado — mesmo mecanismo que já protege o `instalacao-completa.sql`. Assim, toda
> migration que cria FK obriga quem a escreveu a olhar o mapa.
>
> Com o mapa em mãos, revise as regras de `on delete` que hoje são implícitas: o padrão para
> dado de configuração por loja deveria ser `cascade` (some junto com a loja), e para dado de
> negócio deveria ser **restrict explícito** com mensagem clara, nunca `set null` silencioso —
> que foi o que quase desconectou OS antigas do veículo (§7, Clientes).

---

### `TR-05.7` — Versão do esquema visível para o app — **P1 · E2**

**Sintoma.** O app instalado não sabe em que versão o banco daquela empresa está. Hoje isso é
gerenciado por confiança: a usuária roda a migration no SQL Editor e depois o app novo chega.
Já houve descompasso (a `0046`/`0047` ficaram "ainda não rodadas por ela" por um tempo).

**Por quê.** Com dez lojas e quatro projetos Supabase, o descompasso deixa de ser exceção e vira
rotina — o auto-update chega em todas as lojas ao mesmo tempo, mas a migration é manual, uma
empresa por vez. Um app novo contra um banco velho falha de um jeito ruim: coluna que não
existe, erro genérico, telefonema.

**Prompt.**

> 1. Migration criando `schema_versao (versao int primary key, aplicada_em timestamptz default
>    now())`, e faça **toda migration nova** inserir a própria linha ao final (o gerador
>    `scripts/gerar-instalacao-completa.mjs` já sabe a numeração — faça ele conferir isso
>    também).
> 2. No `App.tsx`, na abertura, compare a versão máxima do banco com a versão mínima que aquela
>    build do app exige (constante gerada no build). Se o banco estiver atrás, mostre uma faixa
>    fixa, não bloqueante, dizendo em português simples o que fazer, e **liste quais migrations
>    faltam**. Se o app estiver atrás do banco, avise que existe versão nova do programa.
> 3. Nunca bloquear o acesso por causa disso (regra 7 deste guia) — é aviso.

**Critério de aceite.** Abrir um app novo contra um banco sem a última migration mostra a faixa
com o número exato do que falta rodar, em vez de dar erro de coluna inexistente numa tela
qualquer.

---
## TR-06 — Confiabilidade das contas de dinheiro

> **Diagnóstico geral.** Esta é a área com o pior histórico do projeto e, ao mesmo tempo, a que
> já tem a melhor solução estrutural. Cinco vezes a mesma conta divergiu entre telas (§6 itens
> 35, 38, 40, 44, 45); a resposta certa — juntar tudo em `src/schemas/metricasCaixa.ts` como
> funções puras testadas — já foi aplicada. O que falta é **impedir a sexta vez**.

### `TR-06.1` — Testes de propriedade nas contas de rateio — **P0 · E2**

**Sintoma.** Os bugs que mais custaram (rejeição da SEFAZ por "total dos pagamentos menor que o
total da nota", "ausência de troco", parcela somando R$99,99) são todos do mesmo tipo:
**uma soma que precisa fechar exatamente**. Os testes atuais cobrem casos escolhidos à mão.

**Por quê.** Teste de exemplo só encontra o bug que quem escreveu já imaginou. Esse tipo de
conta — repartir um total entre N linhas com arredondamento — tem **invariantes** que valem
para qualquer entrada, e é exatamente o caso em que teste baseado em propriedade
(`fast-check`) acha o caso patológico que ninguém teria escolhido: 3 formas de pagamento,
R$0,01 de desconto, 12 parcelas.

**Prompt.**

> Adicione `fast-check` como devDependency e escreva testes de propriedade para as funções
> puras que repartem valor, em `src/schemas/`:
> - `calcularListaParcelas`: a soma das parcelas é **exatamente** o total, para qualquer total
>   entre 0,01 e 1.000.000 e qualquer número de parcelas de 1 a 12; nenhuma parcela negativa;
>   nenhuma parcela difere da outra em mais de um centavo.
> - `ratearPagamentos` / `buscarPagamentosParaNota`: a soma dos pagamentos rateados é
>   exatamente o total da nota; nenhuma linha negativa (foi o bug da §7, faturamento dividido
>   com juros); a ordem das formas não muda o total.
> - `calcularLinhasPagamento` + `somarLinhasCobradas`: para qualquer divisão em formas de
>   pagamento, o valor cobrado só difere do total dos itens pelo juro do cartão, e o juro
>   incide só sobre a parte do cartão.
> - `resumirMovimentos`: o custo de aquisição de uma OS é contado **uma vez**, para qualquer
>   número de lançamentos de caixa daquela OS (é o bug do §6 item 40 virando invariante).
> - `valorLiquidoItem`: nunca negativo, e igual nas três contas que o usam (§6 item 44).
>
> Cada propriedade com no mínimo 1.000 casos gerados. Quando `fast-check` achar um contraexemplo,
> **não conserte a propriedade** — conserte a função, e adicione o contraexemplo como teste de
> exemplo fixo, para ele nunca mais voltar.

**Critério de aceite.** As cinco propriedades passando; pelo menos um contraexemplo encontrado
e registrado (se nenhum aparecer, as propriedades provavelmente estão fracas demais — revise).

---

### `TR-06.2` — Uma conta, um lugar: transformar a lição em teste — **P0 · E1**

**Sintoma.** A regra "conta de negócio nova vai para `schemas/`" existe no `PROJETO_STATUS.md`,
mas é uma regra que depende de quem está escrevendo lembrar dela — e já falhou cinco vezes.

**Por quê.** As melhores regras deste projeto viraram mecanismo, não lembrete: o teste que
reprova quando `instalacao-completa.sql` está desatualizado, o `npm run contraste`, os hooks
globais de teclado. Esta merece o mesmo tratamento.

**Prompt.**

> Escreva um teste de arquitetura (`src/schemas/arquitetura.test.ts`) que leia os arquivos de
> `src/pages/` e reprove quando encontrar, fora de `src/schemas/`:
> - as palavras `lucro`, `ticket`, `margem`, `comissao` seguidas de uma operação aritmética;
> - `preco_custo` ou `.custo` dentro de um `reduce`/`map` que soma;
> - `* 1.` ou `/ 100` sobre variável cujo nome contenha `juros` ou `aliquota`.
>
> A mensagem de falha deve dizer, em uma frase, o que fazer: *"conta de dinheiro vive em
> `src/schemas/` como função pura testada — ver PROJETO_STATUS.md §6 item 40"*. Adicione uma
> lista de exceções explícitas para os casos legítimos que sobrarem, cada um com comentário
> justificando. É um teste tosco de propósito: ele erra para o lado de avisar demais, e isso é
> melhor que a sexta divergência.

---

### `TR-06.3` — Teste-ouro do corpo da nota fiscal — **P1 · E2**

**Sintoma.** `montarItemNFCe()`, `montarCorpoNFSe()` e `montarDestinatarioNFCe()` acumulam
regras conquistadas na marra: IBS/CBS com alíquotas fixadas por lei para 2026, CSOSN vs. CST,
`indicador_inscricao_estadual_destinatario: "9"`, desconto abatido no preço unitário, valores
com duas casas como texto. Cada uma dessas foi um bloqueio de dias.

**Por quê.** Esse conhecimento está hoje espalhado em condicionais dentro das funções. Uma
refatoração distraída derruba qualquer uma delas, e a consequência não aparece em teste nem em
tela — aparece como rejeição da SEFAZ, ou pior, como **nota autorizada errada**. A lição do §6
item 46 é literal: *"a parte fiscal quase nunca falha com erro na tela — ela falha autorizando
algo errado"*.

**Prompt.**

> Crie testes-ouro (snapshot) do corpo JSON enviado à Focus NFe, em
> `src/lib/focusNfe.golden.test.ts`, cobrindo um conjunto fixo de cenários com dados falsos
> **mas estruturalmente iguais aos reais**:
> 1. NFC-e, só peça, consumidor não identificado.
> 2. NFC-e, só peça, cliente pessoa física com CPF.
> 3. NFC-e, cliente pessoa jurídica (CNPJ + indicador IE "9", **sem** IE).
> 4. NFC-e com desconto no item.
> 5. NFC-e de OS mista (peça + serviço), com pagamento dividido em duas formas e cartão
>    parcelado — o cenário que gerou as rejeições dos §6 itens 31, 32 e 44.
> 6. NFS-e com alíquota, CNAE, código do município e item da LC 116.
>
> Cada snapshot é um `.json` versionado, revisado uma vez com atenção e depois congelado.
> Escreva no topo do arquivo, em comentário, **por que** cada campo estranho existe (alíquota
> fixada por lei, indicador "9", desconto no unitário porque a SEFAZ confere
> `bruto = qtd × unitário`) — esse comentário é o que impede a próxima sessão de "limpar" um
> campo que parece redundante.
>
> Regra que precisa ficar clara: **mudar um snapshot é uma decisão, não uma correção**. Se um
> teste-ouro quebrar, o PR tem que explicar qual mudança fiscal justifica.

---

### `TR-06.4` — Fechamento de caixa do dia — **P1 · E2**

**Sintoma.** O Caixa Diário mostra o movimento do dia, mas não existe o gesto de **fechar** o
dia: conferir o dinheiro físico contra o que o sistema diz, registrar a diferença e travar.

**Por quê.** É o controle mais básico de loja com dinheiro em espécie, e é o espelho exato da
Contagem de Estoque (TL-16), que o sistema já faz certo — inclusive gerando o ajuste
automático na diferença. Sem fechamento, um erro de troco só é descoberto olhando extrato no
fim do mês, quando ninguém lembra do dia. É também o que dá ao dono da loja a resposta para
"faltou dinheiro no caixa hoje?", que é uma das perguntas que mais motivam a compra de um
sistema.

**Prompt.**

> Espelhe o desenho da Contagem de Estoque, que já funciona e ela já entende:
> - Migration `fechamentos_caixa` (loja_id, data, saldo_sistema, valor_contado, diferenca,
>   observacao, operador_id, criado_em), com único por (loja_id, data).
> - Aba nova em Caixa Diário, "Fechamento": mostra o que o sistema calculou por forma de
>   recebimento (dinheiro é o que importa contar; Pix/cartão são conferência de extrato),
>   pede o valor contado em espécie, mostra a diferença na hora e registra.
> - Diferença gera um lançamento de caixa categorizado ("Quebra de caixa"), igual a Contagem
>   gera ajuste de estoque — nunca "sumir" com a diferença.
> - Depois de fechado, lançamento manual naquele dia pede confirmação extra e fica marcado como
>   "lançado após o fechamento" (não bloquear — regra 7 deste guia).
> - Reaproveite `schemas/metricasCaixa.ts` para o saldo do sistema; nenhuma conta nova na tela.

---

## TR-07 — Testes e verificação

> **Diagnóstico geral.** 176 testes, todos de função pura, e um caminho já descoberto para
> renderizar componente real e para validar migration em Postgres local. A base é boa. Os dois
> buracos são: **nenhum teste de tela** (§6 item 4, dívida reconhecida) e **nenhum teste de
> RLS automatizado** — que é a dívida mais cara quando o sistema roda na loja dos outros.

### `TR-07.1` — CI que roda o que já existe — **P0 · E1**

**Sintoma.** `tsc`, `lint`, `npm test`, `npm run contraste` e a checagem do
`instalacao-completa.sql` existem e são rodados à mão, sessão a sessão.

**Por quê.** É o item de melhor retorno do guia inteiro: uma hora de trabalho que passa a
proteger todo PR futuro, inclusive os escritos por outras sessões sem memória desta conversa.

**Prompt.**

> Crie `.github/workflows/ci.yml` rodando em todo push e PR: `npm ci` → `tsc -b` →
> `npm run lint` → `npm test` → `npm run contraste` → `npm run gerar-instalacao` seguido de
> `git diff --exit-code` (reprova se o arquivo gerado estiver desatualizado). Cachear
> `node_modules`. Não incluir build do Electron aqui — é lento e já existe no `release.yml`.
> Deixe o job obrigatório para merge **só depois** de confirmar que ele passa verde na `main`
> atual, para não travar o fluxo dela de mesclar direto (decisão da §3).

---

### `TR-07.2` — Teste de tela nos cinco formulários que mexem em dinheiro — **P1 · E2**

**Sintoma.** Dívida reconhecida: *"não testa componente React, tela, nem nada que dependa do
Supabase"*. E vários bugs reais foram exatamente de tela: veículo descartado em silêncio,
`uuid: ""` ao adicionar item, campo invisível, Combobox que não selecionava.

**Por quê.** `jsdom` já é devDependency (entrou para o parser de XML), e todo formulário do app
já segue o mesmo padrão `react-hook-form` + `zod` com os dados chegando por `props` — ou seja,
o custo de começar é o menor que vai ser. Testar por papel e nome acessível
(`getByRole('button', { name: 'Salvar' })`) ainda dá de brinde a pressão para arrumar a
semântica do `TR-02.7`.

**Prompt.**

> Adicione `@testing-library/react` + `@testing-library/user-event` e escreva testes de
> comportamento (não de implementação) para cinco formulários, nesta ordem de valor:
> 1. `FaturamentoCard.tsx` — dividir pagamento em duas formas, parcelar só o cartão, conferir
>    que a soma bate com o total dos itens e que "Confirmar faturamento" só habilita quando
>    fecha.
> 2. `OrdemServicoForm.tsx` — adicionar item, trocar peça por serviço, conferir que o total da
>    linha e o total geral batem; e que "+ adicionar item" **some** quando a OS está faturada.
> 3. `ClienteForm.tsx` — salvar veículo com Marca preenchida e Placa vazia (o bug do §6 item
>    26); adicionar veículo novo a cliente existente (o `uuid: ""` do item 28).
> 4. `PecaForm.tsx` — custo → margem → preço nos dois sentidos.
> 5. `ContaPagarForm.tsx` — recorrente até, e o vencimento dia 31 (o bug do §6 item 43).
>
> Cada teste começa reproduzindo o bug real que já aconteceu naquela tela. Um teste que só
> confirma o caminho feliz não vale o custo de manutenção.

---

### `TR-07.3` — Matriz de RLS automatizada — **P1 · E2**

**Sintoma.** A RLS é a única defesa real do sistema, e é testada manualmente, uma vez, por
migration. O `stub-supabase-local.sql` já existe e o caminho de simular
`role`/`request.jwt.claim.sub` num Postgres local já foi usado com sucesso (§5, migrations 0041
e §6 item 37).

**Por quê.** Toda migration nova pode furar a RLS sem que nada dê erro (§6 item 15: falha em
silêncio, filtra a zero linhas). Uma matriz automatizada é o único jeito de saber que o furo não
existe — e ela vira pré-requisito do `TR-04.1`, que multiplica o número de policies.

**Prompt.**

> Crie `supabase/testes-rls/` com um runner (Node ou `psql` puro) que:
> 1. Sobe um Postgres local, aplica `stub-supabase-local.sql` e o `instalacao-completa.sql`.
> 2. Semeia um cenário fixo: 2 empresas não se aplicam (são projetos separados) — mas **2 lojas**
>    da mesma empresa, 1 admin das duas, 1 admin só da loja A, 1 balconista só-Caixa da loja A,
>    1 operador sem loja nenhuma (o caso órfão do §6 item 23), e dado de negócio nas duas lojas.
> 3. Para cada papel × cada tabela × cada comando (`select`/`insert`/`update`/`delete`),
>    afirma o resultado esperado numa **tabela de expectativas declarada num arquivo só**
>    (CSV ou JSON), fácil de ler e revisar sem ler código.
> 4. Reprova também o caso "comando sem policy nenhuma": consulta `pg_policies` e lista tabelas
>    com RLS ligada que não tenham policy para algum dos quatro comandos.
>
> Entre no `npm test` como suíte separada (`npm run test:rls`), rodada no CI. Toda migration que
> mexa em policy passa a exigir atualização do arquivo de expectativas — que é o ponto: a
> mudança de segurança fica **visível na revisão do PR**.

---

### `TR-07.4` — Regressão visual a partir do gerador que já existe — **P2 · E2**

**Sintoma.** `site/ferramentas/gerar-catalogo-telas.mjs` já abre o app de verdade com dados
controlados e fotografa as 54 telas. O próprio status registra a ideia: *"é meio caminho para o
teste de tela que falta; faltaria comparar o resultado em vez de só fotografar"*.

**Por quê.** Os bugs visuais deste projeto são recorrentes e da mesma família: texto invisível
por fundo claro herdado do tema antigo, badge quebrando linha, tooltip ilegível, campo dentro de
faixa amarela. Todos apareceriam num diff de imagem, e nenhum aparece em teste de função pura.

**Prompt.**

> Feche o ciclo: adicione ao gerador um modo `--comparar` que confronta cada uma das 54 imagens
> com uma baseline versionada em `site/telas-baseline/`, usando `odiff` ou `pixelmatch`, com
> tolerância pequena e uma máscara para as regiões que mudam legitimamente (datas, número de
> versão). Saída: um relatório HTML com as três imagens lado a lado (antes, depois, diff).
> Rode no CI **como aviso**, não como reprovação — o objetivo é a pessoa **ver** a mudança na
> revisão do PR, não travar. Atualizar a baseline é um commit explícito, com as imagens no diff.

---

### `TR-07.5` — Fumaça de ponta a ponta no Electron real — **P1 · E2**

**Sintoma.** O teste do Electron real (Playwright + `xvfb-run`) já existe, mas como script
avulso, fora do `npm test`. Ele é o único capaz de pegar falha silenciosa de preload — que já
aconteceu duas vezes (versão do app, `createRequire`).

**Prompt.**

> Promova esse script a suíte (`npm run test:e2e`) com um roteiro curto de fumaça, com o
> Supabase respondido por `page.route()` (o padrão já usado): abre o app → tela de conexão
> aparece quando não há `conexao.json` → salvar grava o arquivo → recarrega → login →
> Início carrega os três cartões → abre Ordens de Serviço → abre uma OS → o modal fecha com Esc.
> Rode no CI num job separado (é lento). **Aponte o Electron para a raiz do app**, nunca para
> `dist-electron/main.js` direto — apontar para o arquivo faz `app.getVersion()` devolver a
> versão do Electron, e o teste passa mentindo (§6 item 18).

---
## TR-08 — Observabilidade e suporte remoto

> **Diagnóstico geral.** Hoje o diagnóstico de qualquer problema é: pedir para a pessoa achar um
> arquivo de log no `%APPDATA%` e mandar por WhatsApp. Com uma loja, funciona. O próprio
> levantamento das 10 lojas já apontou isso como pendência de peso médio: *"um botão de
> diagnóstico dentro do sistema — que junta versão, últimos erros e estado da conexão num
> arquivo só — já resolve boa parte. Também não existe nada hoje que avise que uma loja parou
> de emitir nota; você só descobre quando ligam."*

### `TR-08.1` — Botão de diagnóstico — **P1 · E2**

**Prompt.**

> Crie a tela **Ajuda → Diagnóstico** (ícone no rodapé da Sidebar, ao lado de Configurações e
> Auditoria; visível para qualquer operador, porque quem liga para pedir socorro é quem está no
> balcão, não o admin). Ela mostra na tela e exporta num `.zip` único:
> - versão do app (`window.sakuraApp.version`), versão do Electron/Chromium, sistema operacional;
> - URL do projeto Supabase (**sem a chave**), loja ativa, usuário logado, se é admin;
> - versão do esquema do banco (`TR-05.7`) e quais migrations faltam;
> - resultado ao vivo de três checagens: alcança a internet, alcança o Supabase, consegue ler
>   uma linha de `lojas` (cada uma com o tempo em ms);
> - as últimas 200 linhas de `erros.log` e de `atualizacoes.log`;
> - data/hora local e fuso do computador (é a informação que teria encurtado o §6 item 34).
>
> Botões: "Copiar resumo" (texto curto, para colar no WhatsApp) e "Salvar arquivo para enviar".
> **Nenhum dado de cliente, nenhuma chave, nenhum token** entra no pacote — escreva isso como
> teste, não como intenção.

---

### `TR-08.2` — Saber que uma loja parou, antes de ela ligar — **P2 · E3**

**Sintoma.** Não existe sinal nenhum de vida das instalações. Uma loja pode ficar uma semana
sem conseguir emitir nota (alíquota da competência não cadastrada, certificado vencido, crédito
da Anthropic zerado) e a descoberta é o telefonema.

**Por quê.** Com quatro empresas, o produto que ela vende deixa de ser só o programa e passa a
ser **o serviço**. Descobrir o problema antes do cliente é a diferença entre "o sistema é bom" e
"o sistema deu problema". E o custo é baixo: já existe Edge Function no projeto, e o Supabase
tem agendamento (`pg_cron`).

**Prompt.**

> Só depois do `TR-08.1`. Desenho a alinhar com ela antes:
> 1. Tabela `pulso` (loja_id, ultimo_login, ultima_os, ultima_nota, versao_app, atualizado_em),
>    uma linha por loja, escrita pelo app no login e ao emitir nota — sem dado de negócio, só
>    carimbo de data.
> 2. Uma Edge Function diária (`pg_cron` + `net.http_post`, ou o agendamento do próprio
>    Supabase) que olhe a tabela e mande um e-mail para ela quando: nenhuma OS em 3 dias úteis,
>    nenhuma nota emitida em 5 dias úteis numa loja que emitia, versão do app atrasada em 2+
>    versões, ou nenhum login em 7 dias.
> 3. Como cada empresa é um projeto Supabase separado, isso vive **dentro de cada projeto** e
>    manda e-mail para o mesmo endereço. Não construir painel central agora — é fase 3, e
>    e-mail resolve até lá.
>
> **Deixe explícito para ela** o que o pulso guarda e o que não guarda, porque isso é dado da
> operação de um cliente dela. Nada de faturamento, nada de nome de cliente.

---

### `TR-08.3` — Erro de tela com contexto, não só a pilha — **P1 · E1**

**Sintoma.** `src/lib/registrarErros.ts` grava `error` e `unhandledrejection` em `erros.log`.
Bom. Mas grava a pilha sem o contexto que faz a pilha significar alguma coisa.

**Prompt.**

> Acrescente ao registro, em cada erro: rota atual (`location.hash`), loja ativa, usuário,
> versão do app, e as **últimas 20 ações do usuário** numa trilha em memória (só "abriu tela X",
> "clicou em Salvar", "abriu modal Y" — nunca o conteúdo digitado). Adicione um
> `<ErrorBoundary>` no `App.tsx` que, em vez de tela branca, mostre "Alguma coisa quebrou nesta
> tela" com botão "Voltar ao Início" e "Abrir diagnóstico" — hoje um erro de render deixa o
> operador com a janela em branco e nenhuma saída a não ser fechar o programa.

---

## TR-09 — Distribuição, atualização e rollback

> **Diagnóstico geral.** O ponto mais reconhecidamente frágil para a fase 2, e já está na fila
> dela: *"Hoje uma tag atualiza todas as lojas ao mesmo tempo, automaticamente. Com uma loja
> isso é ótimo; com dez lojas de terceiros, uma versão ruim vira dez telefonemas simultâneos."*

### `TR-09.1` — Canal de teste antes do canal de todos — **P1 · E2**

**Prompt.**

> Implemente publicação em dois canais do `electron-updater`, que é o mecanismo mais simples e
> mais confiável para o tamanho desta operação:
> - `beta` — o computador dela e o da Pneus Amigão. Recebe toda versão nova assim que sai.
> - `latest` — as demais lojas. Só recebe quando ela **promove** a versão.
>
> Implementação: `channel` na configuração de publish do `electron-builder`; o app lê o canal de
> um campo novo no `conexao.json` (padrão `latest`, editável numa tela de Configurações visível
> só para admin, ou por um arquivo, para não virar botão que alguém aperta por engano). Promover
> = copiar o `latest.yml` do canal beta para o canal estável na mesma release, sem rebuild.
> **Antes de implementar, confira na documentação atual do `electron-updater`** como estão o
> suporte a `channel` e ao campo `stagingPercentage` do `latest.yml` — a API já mudou entre
> versões maiores, e este guia não é fonte confiável para isso.
>
> Escreva no `PROJETO_STATUS.md` §9 o procedimento novo, em português simples e passo a passo,
> porque quem vai executar é ela.

**Critério de aceite.** Publicar uma tag atualiza só as máquinas do canal beta; promover
atualiza as demais; voltar atrás é um passo documentado.

---

### `TR-09.2` — Como voltar uma versão — **P1 · E1**

**Sintoma.** Não existe procedimento de rollback escrito. O `electron-updater` só anda para
frente por padrão.

**Prompt.**

> Escreva (e teste uma vez de verdade, com a `v0.9.28`) o procedimento de rollback no
> `PROJETO_STATUS.md` §9: como republicar o `latest.yml` de uma versão anterior no canal
> estável, e o que fazer quando a versão ruim já entrou numa loja (baixar o instalador antigo
> pelo link permanente de release, desinstalar/instalar por cima, o que acontece com o
> `conexao.json` — que **não** pode ser perdido). Se a migration da versão ruim já rodou no
> banco, isso precisa aparecer no procedimento: banco não volta junto, e essa é a razão de
> migration só aditiva ser regra.
>
> Adote e escreva a regra: **migration nunca remove nem renomeia coluna em uso na mesma versão
> que passa a usar a coluna nova** — sempre em duas versões (v1 adiciona e passa a escrever nas
> duas; v2, depois de todas as lojas atualizadas, remove a antiga). É o que torna o rollback
> possível.

---

### `TR-09.3` — Assinatura de código — **P2 · E3**

**Sintoma.** O SmartScreen avisa "editor desconhecido"; instalar exige "Mais informações →
Executar assim mesmo".

**Por quê.** Com a loja do pai dela, é constrangimento. Com trinta lojas desconhecidas, é
**objeção de venda**: um dono de autocenter que vê "editor desconhecido" num programa que vai
mexer no financeiro dele tem todo motivo para desconfiar. Um certificado OV custa na faixa de
poucas centenas de reais por ano; EV é mais caro mas dispensa a construção de reputação.

**Prompt.**

> Não comprar nada agora. Faça o levantamento para ela decidir na fase 2/3: preço atual de
> certificado OV e EV para code signing no Brasil (as mesmas certificadoras do certificado A1
> que ela já usa costumam vender), o que muda no SmartScreen em cada caso, e como isso entra no
> `release.yml` sem o certificado ficar no repositório público (secret do GitHub + assinatura
> no runner; ou serviço de assinatura em nuvem). Traga em uma página, com o custo mensal
> diluído por loja no cenário de 10 lojas, no mesmo formato das tabelas de custo que ela já usa.

---

## TR-10 — Performance e resiliência de rede

### `TR-10.1` — Quando a internet da loja cai — **P1 · E2**

**Sintoma.** O app fala direto com o Supabase. Sem internet, nada funciona — e não há uma
mensagem dizendo isso. O sintoma que o operador vê é um erro genérico, ou uma tela vazia.

**Por quê.** Internet de loja de bairro cai. Isso não é hipótese: é rotina. A decisão de
arquitetura (Supabase direto, sem backend) está certa e não deve ser reaberta — mas o app pode,
com pouco esforço, **explicar** o que está acontecendo em vez de parecer quebrado.

**Prompt.**

> Escopo pequeno de propósito, sem tocar na arquitetura:
> 1. Um `useConexao()` global que escuta `online`/`offline` do navegador **e** faz um ping leve
>    ao Supabase a cada 30s quando há erro de rede. Faixa fixa no topo: "Sem conexão com o
>    banco — o que você digitar agora não vai ser salvo." Some sozinha ao voltar.
> 2. Repetir automaticamente (com espera crescente, 3 tentativas) toda **leitura** que falhar
>    por rede — nunca escrita, que precisa ser decisão do operador.
> 3. Em erro de rede durante um formulário, **não perder o que foi digitado**: o rascunho
>    automático já cobre cinco formulários; garanta que ele seja salvo imediatamente (não só a
>    cada 30s) quando uma gravação falha por rede.
> 4. Escreva na tela, no lugar certo, o que **não** funciona offline: emitir nota, importar por
>    foto, atualizar o programa.
>
> **Não** construir fila de escrita offline nem cache local de dados agora. É `E3` de verdade,
> muda a arquitetura, e a decisão da §3 é explícita.

---

### `TR-10.2` — Consultas que crescem em N+1 — **P2 · E2**

**Sintoma.** O padrão do app é "buscar ao montar a tela", uma função por entidade. Telas que
cruzam dados (Comissões faz 4 consultas; Ordens de Serviço precisa de itens, peças e serviços
para calcular lucro por linha) tendem a puxar tudo e cruzar no cliente.

**Prompt.**

> Meça antes: instrumente `src/lib/` com um contador de chamadas em modo dev, abra as cinco
> telas mais pesadas (Ordens de Serviço, Início, Comissões, Lucratividade, Relatórios de
> Estoque) e traga o número de requisições e o total baixado em cada uma. Onde houver leitura
> repetida do mesmo catálogo (peças, serviços, funcionários), proponha uma das duas saídas —
> uma **view** no Postgres que já devolva o cruzamento pronto (preferível: mantém a conta perto
> do dado e continua protegida por RLS), ou um cache em memória com invalidação por módulo.
> Só considere `@tanstack/react-query` se os números justificarem, e aí como decisão dela — é
> dependência nova num projeto que hoje não tem camada de dados.

---

### `TR-10.3` — Sensação de rapidez: 400ms — **P2 · E1**

**Por quê.** Os limites de resposta são bem estabelecidos desde os anos 90 e não mudaram, porque
são da percepção humana: até **0,1s** parece instantâneo; até **1s** o pensamento não se
interrompe; acima de **10s** a pessoa vai fazer outra coisa. O limiar prático de "o sistema é
rápido" fica por volta de 400ms.

**Prompt.**

> Depois dos números do `TR-10.2`, ataque só o que passar de 1s: skeleton em vez de tela vazia
> (`TR-01.5`), gravação **otimista** nas ações pequenas e reversíveis (marcar como pago já
> aparece pago, e volta se falhar — combina com o desfazer do `TR-02.4`), e pré-carregamento do
> catálogo (peças/serviços) quando o operador entra no módulo, não quando clica em "Nova OS".

---
## TR-11 — Fiscal: o que ainda é frágil

> **Diagnóstico geral.** A parte fiscal é a conquista mais difícil do projeto e está funcionando
> em produção. Os itens abaixo não reabrem nada disso — são as cinco fragilidades já listadas no
> próprio status, transformadas em tarefa, mais três que aparecem quando se pensa em dez lojas.
> **Nada aqui autoriza mexer às cegas em corpo de nota.** A lição do §6 item 46 vale como regra:
> *ao mexer aqui, a pergunta útil não é "isso dá erro?", é "se isso estiver errado, alguém fica
> sabendo?"*.

### `TR-11.1` — Reabrir o DANFE de uma nota já emitida — **P0 · E1**

**Sintoma.** O PDF só existe dentro do modal de emissão; fechou, acabou. Já investigado: não é
bug de renderização, é falta de botão. A migration `0046` já guarda `focus_nfe_ref`.

**Por quê.** É o pedido mais comum de balcão que existe: o cliente volta e pede a nota de novo.
Hoje a saída é entrar no painel da Focus NFe — que o dono da loja nem deveria saber que existe.

**Prompt.**

> Em Notas Fiscais (TL-39/TL-40), adicione "Ver DANFE" nas notas com `origem = 'automatica'`,
> buscando o PDF pela `focus_nfe_ref` já gravada e mostrando no mesmo `iframe` embutido já usado
> em "Ver garantia" e "Versão para o cliente", com "Baixar PDF" e "Imprimir". Trate o caso de o
> PDF não vir mais (nota antiga, `ref` ausente em nota anterior à `0046`) com a mensagem certa,
> não com erro cru. Adicione o mesmo botão na aba Fechamento da OS.

---

### `TR-11.2` — Alíquota da competência: lembrar antes de falhar — **P0 · E1**

**Sintoma.** Toda primeira NFS-e do mês é recusada até a alíquota da competência ser cadastrada
no portal da prefeitura. É tarefa recorrente do lojista, não do código. Já custou uma manhã
uma vez.

**Por quê.** É uma armadilha mensal, conhecida, com data certa e consequência certa. Deixar o
sistema calado sobre algo assim é desperdiçar a única coisa que ele faz bem: lembrar.

**Prompt.**

> Sem migration nova se der: guarde em `configuracoes_fiscais_loja` (ou numa tabela pequena
> `fiscal_competencias`) a última competência confirmada. No **primeiro dia útil de cada mês**,
> a tela Início mostra um aviso destacado: *"Antes da primeira nota de serviço de setembro,
> cadastre a alíquota da competência no portal da prefeitura"*, com o passo a passo curto (portal
> Giap → Emissor/Consulta NFS-e → Cadastro de Alíquota → Mês/Ano + Alíquota + Atividade →
> Replicar Alíquota) e um botão "Já cadastrei" que some com o aviso até o mês seguinte. Coloque
> o aviso também **dentro do modal de emissão de NFS-e**, quando for a primeira do mês.
>
> Como isso varia por município, deixe o texto do passo a passo num campo editável em
> Configurações → Dados fiscais, com o de Araraquara como padrão — a loja de outro município vai
> ter outro portal.

---

### `TR-11.3` — Avisar antes de a SEFAZ recusar — **P1 · E2**

**Sintoma.** O aviso de CST/CSOSN antes de emitir já existe e funciona (§6 item 47) — foi a
resposta certa e prova o valor do padrão. Outras recusas conhecidas continuam sem aviso: NFC-e
acima do limite da UF (em geral R$10.000) sem destinatário identificado; cliente PJ sem CNPJ
cadastrado; alíquota de ISS em branco (esta já tem guarda); nota para OS que já tem nota.

**Prompt.**

> Generalize o padrão que já deu certo: crie `src/schemas/conferenciaFiscal.ts` (funções puras,
> testadas), que recebe a OS + a loja + o cliente e devolve uma lista de avisos, cada um com
> gravidade (`impede` / `avisa`), texto em português e **o que fazer**. Regras iniciais:
> - total da NFC-e acima do limite da UF sem cliente identificado → avisa;
> - cliente pessoa jurídica sem CNPJ → avisa e explica que a nota sai como consumidor não
>   identificado;
> - CST/CSOSN incompatível com o regime → avisa, listando o nome de cada peça (já existe, mova
>   para cá);
> - alíquota de ISS, código do município, CNAE ou item da LC 116 em branco na NFS-e → impede,
>   dizendo qual campo e onde preencher;
> - OS já com nota daquele tipo não cancelada → impede (espelha a trava do `TR-05.2`).
>
> O modal de emissão passa a mostrar essa lista antes do botão. **Manter a filosofia**: só
> `impede` o que é certeza absoluta (campo obrigatório vazio); o resto **avisa**, porque a lista
> de códigos válidos envelhece com mudança de legislação e barrar por palpite é pior que deixar
> a SEFAZ decidir.

---

### `TR-11.4` — Cancelar nota: decidir o que acontece com estoque e caixa — **P1 · E3**

**Sintoma.** Pergunta de design registrada no status e nunca respondida: *"Cancelar nota deveria
estornar estoque/Caixa?"*.

**Por quê.** Hoje cancelar a nota deixa a OS faturada, o dinheiro no caixa e a peça baixada do
estoque. Isso está **certo** para o caso mais comum (erro no documento, reemissão em seguida) e
**errado** para o outro caso (a venda foi desfeita, o cliente devolveu a peça). O sistema não
sabe qual dos dois é, e adivinhar seria pior.

**Prompt.**

> Não implemente estorno automático. Leve à usuária esta proposta: o modal de cancelamento passa
> a perguntar **por que** está cancelando, com duas opções que já existem no mundo real dela:
> - *"Erro na nota — vou emitir de novo"* → nada muda no estoque/caixa; a OS volta a aparecer
>   como "falta nota" e o botão de emitir volta (é o comportamento de hoje, que fica explícito).
> - *"A venda foi desfeita"* → o sistema **não estorna sozinho**, mas mostra a lista do que
>   precisa ser desfeito, com um botão para cada: desfazer o faturamento (devolve a OS para
>   "concluída" e remove o lançamento do Caixa) e devolver as peças ao estoque (movimentação de
>   entrada com motivo "ajuste", referência "Cancelamento da nota da OS 12").
>
> Assim o operador decide, cada passo fica registrado como movimentação normal e auditável, e
> ninguém precisa confiar num estorno automático que pode estar errado. Isso conversa
> diretamente com o `FN-08` (devolução/troca), e vale construir os dois juntos se ela quiser.

---

### `TR-11.5` — CSOSN 500 e ICMS-ST: a pergunta que está com a contabilidade — **P1 · E1**

**Sintoma.** Item aberto desde 03/09: com CSOSN 500, as peças deveriam levar valor de ICMS-ST
retido? A Focus NFe confirmou que **não** completa campo fiscal não enviado. As notas continuam
sendo autorizadas assim desde agosto.

**Prompt.**

> **Não mexer no `montarItemNFCe()`.** O que fazer: escrever para ela a mensagem curta e informal
> para a contabilidade (do jeito que ela pediu — o print/contexto carrega a parte técnica, a
> mensagem é só o pedido), perguntando exatamente isso, e deixar registrado no status que a
> resposta define se é mudança de código ou não. Se a resposta vier "sim", aí sim vira tarefa:
> os campos `vBCSTRet`/`vICMSSTRet` e afins, com teste-ouro novo (`TR-06.3`) e conferência das
> notas já emitidas.

---

### `TR-11.6` — Onboarding fiscal como checklist dentro do sistema — **P2 · E2**

**Sintoma.** O playbook de habilitação fiscal por loja nova (§8 item 1) é excelente e está em
Markdown, num repositório. Quem vai conduzir isso com o cliente é ela — no telefone, no
WhatsApp, ao longo de semanas.

**Por quê.** O próprio status já concluiu: *"esse onboarding precisa virar um checklist
operacional que a usuária conduz junto com o cliente, não uma redescoberta por loja"*. E o
levantamento das 10 lojas reforçou que **o gargalo do crescimento não é dinheiro nem código, é
o credenciamento fiscal de cada CNPJ novo**. Um checklist com estado é a ferramenta certa.

**Prompt.**

> Transforme o playbook em tela: Configurações → "Ativação fiscal desta loja", com os passos do
> bucket (C) do playbook, cada um com estado (não começado / em andamento / feito / não se
> aplica), campo de observação, data e responsável (loja, contabilidade ou ela). Passos:
> habilitar documentos no painel da Focus NFe; certificado digital A1 emitido e vinculado;
> credenciamento do CNPJ na SEFAZ do estado (produção e homologação são separados); CSC e ID
> Token gerados na SEFAZ; numeração de RPS conferida (se a loja já emitia antes); login/token do
> portal da prefeitura; CST/CSOSN confirmado com a contabilidade; alíquota da competência do
> mês. Guardar em tabela por loja.
>
> Duas consequências que o desenho precisa respeitar, ambas já decididas: **"usar o sistema" e
> "emitir nota" são duas ativações separadas** — a loja começa usando cadastro/OS/estoque/caixa
> no primeiro dia, e a emissão entra quando esse checklist fechar (mudou em 29/10/2026: a loja só
> recebe o sistema já emitindo nota; `docs/decisoes.md`); e a tela é **operacional, não
> bloqueante** — ela informa, nunca impede de usar o resto.

---

## TR-12 — Privacidade e LGPD

> **Diagnóstico geral.** O projeto já tomou a decisão certa mais difícil: deixar **dados de
> saúde fora** do cadastro de funcionário, por escolha explícita e por serem dado sensível.
> Isso mostra que a preocupação existe. O que muda na fase 2 é o papel: a partir do momento em
> que a infraestrutura está toda na conta dela e o dado é de clientes das lojas dos outros, ela
> deixa de ser só a desenvolvedora e passa a ser **operadora de dados** dessas empresas — e isso
> tem obrigações próprias.

### `TR-12.1` — Backup: sair do plano grátis é obrigação, não conforto — **P1 · E1**

**Sintoma.** O plano gratuito do Supabase **não faz backup automático nenhum**, permite no
máximo 2 projetos ativos por organização e pausa o projeto sozinho depois de uma semana sem
uso. Hoje o dado é da própria família e o sistema é usado todo dia, então isso passa. Na
primeira loja vendida, deixa de passar.

**Por quê.** No plano Pro, o Supabase mantém os **últimos 7 dias** de backup diário (Team, 14;
Enterprise, até 30), e *point-in-time recovery* — restaurar até o segundo — é um add-on pago à
parte, que exige compute mínimo. Ou seja: mesmo no Pro, o pior caso é perder **um dia** de
lançamentos. Para uma loja, um dia de OS e caixa é um dia de retrabalho; é preciso saber disso
antes, não depois.

**Prompt.**

> 1. Além do plano Pro (já contemplado no custo), monte um **backup próprio**: um job diário
>    (GitHub Actions agendado, no repositório, com as credenciais como secret) que rode
>    `supabase db dump` de cada projeto e guarde o arquivo cifrado fora do Supabase. Retenção:
>    30 dias diários + 12 mensais. Custa quase nada e cobre o buraco de "7 dias".
> 2. **Teste a restauração uma vez**, de verdade, num projeto Supabase descartável, e escreva o
>    procedimento no `PROJETO_STATUS.md` §9. Backup nunca testado não é backup — é esperança.
> 3. Escreva para ela, em uma página, o que acontece em cada cenário: apagou uma OS sem querer
>    (auditoria + restauração pontual), o Supabase caiu, o projeto foi apagado, o dado foi
>    corrompido por um bug. Cada um com o passo a passo e o tempo estimado de recuperação.

---

### `TR-12.2` — Contrato e papéis, antes da primeira venda — **P1 · E3**

**Sintoma.** A decisão de 28/08 é clara: *"Tudo na conta da usuária — Supabase, Anthropic e
Focus NFe. O dono da loja não cria conta em serviço nenhum e nunca vê que eles existem."* É a
decisão certa para o produto. A consequência também está escrita: *"em troca, o dado dos
clientes das lojas fica sob responsabilidade dela"*.

**Por quê.** Na LGPD, a loja é **controladora** dos dados dos clientes dela; quem trata esses
dados por conta da loja é **operadora**. Isso não é formalidade: define quem responde pelo quê
se acontecer um incidente, e é o tipo de coisa que ninguém resolve depois do problema.

**Prompt.**

> Isto não é tarefa de código. O que fazer nesta sessão: escrever para ela, em linguagem simples
> e em uma página, o que precisa existir antes da primeira venda — um contrato de prestação de
> serviço com uma cláusula de tratamento de dados (quem é controlador, quem é operador, para
> quê o dado pode ser usado, o que acontece quando o contrato acaba, prazo para devolver ou
> apagar o dado), e o registro básico de operações de tratamento. Recomendar que ela mostre isso
> a um advogado ou à contabilidade dela antes de assinar qualquer coisa — **este guia não é
> aconselhamento jurídico**, e o valor aqui é ela saber que a pergunta existe, não a resposta
> pronta. Registrar no `PROJETO_STATUS.md` como pendência da fase 2.

---

### `TR-12.3` — Só peça o dado que você usa — **P2 · E2**

**Sintoma.** A ficha de funcionário guarda RG, CNH e número, tipo sanguíneo, estado civil,
naturalidade, filiação, nome e nascimento do cônjuge, data do casamento, telefone e celular do
cônjuge, e a lista de filhos com data de nascimento.

**Por quê.** Minimização é o princípio mais prático da LGPD: dado que não existe não vaza, não
precisa ser protegido e não precisa ser apagado depois. Boa parte desses campos existe porque
*"costuma ser exigido em documento de admissão"* — o que é verdade, mas a admissão é um momento,
e o sistema guarda para sempre. Tipo sanguíneo, em particular, é dado de saúde, que o projeto
já decidiu deliberadamente não guardar em outro lugar.

**Prompt.**

> Traga à usuária, para ela decidir campo a campo (não decida sozinho): quais desses são
> realmente usados por ela ou pelo pai dela hoje. Proposta: tornar a aba "Família" e o bloco de
> documentos **opcionais e recolhidos por padrão**, com um aviso curto de que é dado pessoal de
> terceiro; remover `tipo_sanguineo` (é dado de saúde e não tem uso no sistema); e mostrar
> CPF/RG/CNH mascarados na tela (`***.***.789-**`), com um "mostrar" que registra na auditoria
> quem revelou. Migration só depois da decisão dela, e sempre aditiva primeiro (`TR-09.2`).

---

### `TR-12.4` — Exportar e apagar os dados de uma loja — **P2 · E2**

**Sintoma.** Não existe caminho para "o cliente cancelou, devolva os dados dele e apague o
resto" nem para "o cliente quer levar os dados para outro sistema".

**Por quê.** É obrigação contratual e legal, e também é **argumento de venda**: um dono de loja
que pergunta "e se eu quiser sair?" e ouve "você leva tudo, em CSV, quando quiser" confia mais
do que um que ouve silêncio. Também é a resposta para o "importador universal de dados de outros
sistemas" listado como futuro — a mesma estrutura serve para os dois lados.

**Prompt.**

> Construa a exportação primeiro (a parte útil no dia a dia): Configurações → "Exportar dados
> da loja", gerando um `.zip` com um CSV por tabela daquela loja (UTF-8 com BOM, para abrir
> certo no Excel brasileiro) mais os XMLs de nota fiscal do Storage. Reaproveite `src/lib/zip.ts`,
> que já existe e já resolveu acento no Windows. Só admin, registrado na auditoria.
> A exclusão definitiva (`E3`) fica para depois e passa por decisão dela — tem conflito real com
> a **obrigação de guardar o XML por cinco anos**, que sobrevive ao fim do contrato.

---
# Parte 2 — As 54 telas, uma a uma

> Numeração igual à do catálogo em PDF. Cada tela traz o que ela faz hoje, as sugestões
> numeradas com prioridade e esforço, e um prompt único para executar o conjunto.
> Sugestão marcada `↗` já está coberta por um item transversal — o prompt da tela só aponta.

---

## Entrada no sistema

### `TL-01` · Tela de login

*Hoje:* usuário e senha (sem e-mail — o app monta `usuario@sakura.local` por baixo), versão no
canto inferior direito, link para trocar a conexão com o banco.

1. **[P0·E1] Foco automático no campo Usuário** ao abrir, e Enter no campo Senha entra direto.
   O programa é aberto e o login digitado várias vezes por dia (a sessão não persiste, por
   decisão dela) — cada clique de mouse aqui é um imposto diário.
2. **[P0·E1] Botão de revelar a senha.** Digitar às cegas num teclado de balcão, muitas vezes ao
   dia, produz erro; e sem revelar não dá para descobrir que o Caps Lock está ligado. Avisar
   Caps Lock também.
3. **[P0·E1] Estado "Entrando…" com botão desabilitado.** Sem isso, dois cliques disparam duas
   autenticações — visibilidade do estado do sistema, a primeira heurística de Nielsen.
4. **[P1·E1] Erro específico em vez de genérico:** "usuário ou senha errados" ≠ "sem conexão com
   o banco" ≠ "este operador está inativo". Hoje os três provavelmente caem na mesma mensagem, e
   os três têm soluções completamente diferentes.
5. **[P1·E1] Lembrar o último usuário daquele computador** (só o nome, nunca a senha). É o
   critério 3.3.7 da WCAG 2.2 aplicado ao gesto mais repetido do sistema.
6. **[P1·E1] Mostrar a empresa/loja à qual este computador está conectado**, lido do banco antes
   do login. Com multi-empresa, saber em qual banco você está *antes* de entrar evita o pior
   erro possível: trabalhar na empresa errada.
7. **[P2·E1] Peso do fundo.** `public/sakura-login-bg-premium.png` é um PNG de tela cheia dentro
   do instalador. Conferir o tamanho e converter para WebP/AVIF com fallback: pesa no download
   do instalador e na primeira pintura da tela.

**Prompt.**

> Em `src/pages/login/LoginPage.tsx`: `autoFocus` no campo Usuário; botão de revelar senha
> (ícone de olho, alvo ≥32px, `aria-pressed`); aviso de Caps Lock; estado de envio com botão
> desabilitado e texto "Entrando…"; separe as mensagens de erro em três casos distintos, usando
> `traduzErro.ts` (TR-02.6) — credencial inválida, falha de rede/Supabase inalcançável, e
> operador inativo; grave o último usuário em `localStorage` e pré-preencha. Acrescente, abaixo
> do formulário, uma linha discreta com o nome da loja lida do banco (consulta anônima a `lojas`
> não é possível com a RLS atual — então leia da última sessão bem-sucedida guardada
> localmente, ou do `conexao.json`, e mostre "Conectado a: …"). Meça o tamanho do PNG de fundo e,
> se passar de ~300 KB, converta e mostre o antes/depois. **Não** mudar o esquema de login nem a
> decisão de sessão não persistente.

---

### `TL-02` · Conexão com o banco da empresa

*Hoje:* URL do projeto + chave `anon`, "Testar conexão", "Salvar e entrar", e "Salvar assim
mesmo" quando o teste reprova (correção do §6 item 33 — o teste avisa, não tranca).

1. **[P0·E1] Colar tudo de uma vez.** Aceitar que a pessoa cole as duas linhas juntas (ou o
   bloco copiado do painel do Supabase) e separar sozinho URL e chave. Quem instala é o dono da
   loja seguindo instrução por WhatsApp; cada campo separado é uma chance de errar.
2. **[P0·E1] Aviso de formato, nunca trava.** "Isso não parece um endereço de projeto Supabase"
   / "Essa chave parece a `service_role`, não a publicável" — **como aviso**, mantendo o
   "Salvar assim mesmo". A regra 7 deste guia nasceu exatamente nesta tela.
3. **[P0·E1] Nunca deixar a chave chegar ao `erros.log`.** Conferir `registrarErros.ts` e o
   diagnóstico (TR-08.1). Escrever um teste que prove isso.
4. **[P1·E1] Confirmar a empresa antes de salvar.** Se o teste passar, mostrar o nome da loja
   encontrada: "Conectado a: Pneus Amigão — Araraquara/SP. É essa?".
5. **[P1·E2] Lista de conexões já usadas neste computador** (apelido + URL mascarada), para
   trocar de empresa sem redigitar. Útil no PC dela, que vai ter várias.
6. **[P2·E1] Exportar/importar a conexão como arquivo.** Ela manda um `.sakuraconn` pronto para
   o cliente novo em vez de ditar URL e chave. Seguro: a chave publicável é feita para ser
   pública. Documentar isso na tela em uma linha, para ninguém achar que é segredo.

**Prompt.**

> Em `src/pages/conexao/ConexaoPage.tsx` e `src/lib/conexao.ts`: colagem inteligente no campo de
> URL (se o texto colado contiver duas linhas ou um `https://...` e um `sb_publishable_...`/
> `eyJ...`, distribuir nos dois campos); validação de formato **só como aviso** ao lado do
> campo; campo de chave do tipo senha com revelar; ao passar no teste, buscar o nome da loja e
> mostrar a confirmação antes de salvar. Guarde as conexões usadas num `conexoes.json` ao lado
> do `conexao.json` (apelido, URL, data do último uso — **nunca a chave em texto claro se der
> para usar `safeStorage` do Electron**; se não der, documentar a decisão). Preserve o
> comportamento "Salvar assim mesmo" e o limite de 10s do teste. Teste no Electron real, com
> `xvfb-run`, incluindo o caminho de falha.

---

### `TL-03` · Troca de senha obrigatória

*Hoje:* tela cheia e bloqueante quando `operador.deve_trocar_senha` é verdadeiro; nova senha +
confirmação; botão "Sair".

1. **[P0·E1] Mostrar a regra antes, não como erro depois.** "A senha precisa ter pelo menos 6
   caracteres" fica visível desde o começo, com o requisito ficando verde conforme é atendido.
   O limite de 6 vem do Supabase Auth e não pode baixar — então o mínimo é não deixar a pessoa
   descobrir isso errando.
2. **[P0·E1] Conferência em tempo real** do "confirmar senha", não no envio.
3. **[P1·E1] Recusar a senha temporária como senha nova.** É o atalho que todo mundo tenta, e
   anula o propósito da tela.
4. **[P1·E1] Entrar direto depois de trocar**, sem pedir login de novo — a sessão já é válida.
5. **[P1·E1] Explicar em uma linha por que a tela apareceu:** "Um administrador redefiniu sua
   senha. Escolha uma nova para continuar." Sem isso, o operador acha que foi hackeado.

**Prompt.**

> Em `src/pages/login/TrocarSenhaPage.tsx`: lista de requisitos visível com marcação ao vivo;
> validação de confirmação em tempo real (`zod` + `watch`); comparar com a senha temporária que
> veio no fluxo e recusar se for igual; após sucesso, navegar direto para o Início sem novo
> login; texto explicativo no topo. Aproveite para conferir na Edge Function
> `redefinir-senha-operador` que ela está publicada com o código atual — o status registra que o
> estado real do deploy é incerto e que uma versão mais simples pode ter sido publicada por
> engano (§7, "Login e permissões"). Se estiver desatualizada, gere o passo a passo de redeploy
> para a usuária, em português simples.

---

## Início

### `TL-04` · Painel de início

*Hoje:* três cartões escolhidos pelo dono (padrão Vendas/Lucro/Ticket médio), calendário do mês
com feriados, aniversários e contas a vencer, lista de OS abertas e "Veículos no pátio".

1. **[P0·E1] "Contas a pagar vencendo" só soma o mês corrente.** Ponto cego conhecido e aceito:
   no dia 31, o cartão mostra R$ 0,00 com uma conta vencendo amanhã. Trocar por "próximos 15
   dias", ignorando a fronteira do mês — que não significa nada para quem paga contas.
2. **[P0·E1] Número negativo precisa parecer negativo.** No PDF, "Lucro mês −R$ 8.368,00" tem
   exatamente o mesmo tratamento visual de um número positivo. Cor de alerta, seta para baixo e
   sinal explícito. Essa tela é a que o dono olha todo dia, de relance.
3. **[P0·E1] Dizer o que cada cartão conta.** Um "?" com a definição em uma frase — "Lucro =
   vendas − custo das peças e serviços vendidos − saídas lançadas no caixa". A definição de
   "lucro" já mudou uma vez neste sistema (§6 item 40) e o número caiu bastante; sem a
   explicação, quem olha acha que o negócio piorou.
4. **[P1·E1] A seta "›" promete tendência e não entrega.** Ou mostra a comparação de verdade
   ("+12% vs. mês anterior") ou sai. Indicador que não indica é ruído.
5. **[P1·E1] Setas ‹ › no calendário.** A grade de 6 semanas foi a solução certa para o problema
   do dia 31, mas navegar meses continua impossível — e "o que vence mês que vem?" é uma
   pergunta legítima.
6. **[P1·E1] Idade da OS e do veículo no pátio.** "Aberta em 09/09" exige contar nos dedos;
   "há 3 dias", em cor de alerta a partir de N dias, é a informação que faz alguém agir. Um
   carro parado no pátio é dinheiro parado e é reclamação chegando.
7. **[P2·E2] Mais opções de cartão:** OS abertas, contas a receber vencidas, peças abaixo do
   mínimo, ticket médio da semana. Hoje são 5 chaves possíveis em `CARTAO_METRICA_LABEL`.

**Prompt.**

> Em `src/pages/painel/PainelPage.tsx` e `src/components/MiniCalendario.tsx`:
> (1) troque a janela de "contas a pagar vencendo" de mês corrente para próximos 15 dias
> corridos, com a conta feita em `src/schemas/metricasCaixa.ts`, não na tela;
> (2) formate valor negativo com cor de alerta, sinal e seta, num componente `<Valor>` reusável
> que passe a ser usado em todos os cartões e tabelas de dinheiro do app;
> (3) adicione um `<Explicacao>` (ícone "?" com `title` + popover acessível) em cada cartão, com
> o texto vindo de `CARTAO_METRICA_LABEL` estendido com uma `descricao`;
> (4) substitua a seta genérica pela variação percentual real contra o período anterior,
> reaproveitando o que `GraficosSection` já calcula — se não houver período anterior, não mostrar
> nada em vez de mostrar seta neutra;
> (5) setas de mês no `MiniCalendario`, mantendo a grade de 6 semanas e o realce de "hoje";
> (6) coluna "há X dias" em OS abertas e em Veículos no pátio, com destaque configurável.
> Regenere as imagens do catálogo e compare antes/depois.

---

## Clientes

### `TL-05` · Lista de clientes

*Hoje:* nome, telefone, veículos, cidade/UF; busca por nome, telefone ou placa; ações "Editar" e
"Excluir".

1. **[P0·E1] `↗ TR-02.1`** — as ações são links de texto de ~10px, e "Excluir" está colado em
   "Editar".
2. **[P0·E1] Cliente não deveria ter "Excluir" na lista.** Todo o resto do sistema já usa
   inativar (peças, serviços, fornecedores, funcionários, lojas). Excluir um cliente que tem OS
   é o gesto que mais estraga histórico — e a FK de veículo é `on delete set null`, ou seja, o
   vínculo se perde **em silêncio**, que é o padrão de bug mais recorrente deste projeto.
3. **[P1·E1] Colunas "Última visita" e "Total gasto".** Transformam uma lista de cadastro numa
   ferramenta de venda, e o dado já existe nas OS.
4. **[P1·E1] Busca insensível a acento e formato.** Hoje "joao" provavelmente não acha "João", e
   "ABC1D23" não acha "ABC-1D23". Normalizar dos dois lados (`unaccent` no Postgres, ou coluna
   gerada normalizada com índice).
5. **[P2·E1] Filtro "sem visita há mais de 6 meses"** — é a base da campanha de retorno (FN-11).

**Prompt.**

> Em `src/pages/clientes/`: troque "Excluir" por "Inativar" (coluna `ativo` em `clientes`, com
> migration aditiva; a lista passa a mostrar só ativos por padrão, com filtro para ver os
> inativos). Mantenha a exclusão de verdade apenas dentro do menu `⋯` (TR-02.1) e **só quando o
> cliente não tiver nenhuma OS** — se tiver, explique e ofereça inativar (é o padrão já usado
> em Lojas). Adicione as colunas "Última visita" e "Total gasto" com a conta em
> `src/schemas/`, não na tela. Normalize a busca no servidor: crie colunas geradas
> `nome_busca` (sem acento, minúsculo) e `placa_norm`, com índice, e faça a busca contra elas.

---

### `TL-06` · Cadastro de cliente e veículos

*Hoje:* pessoa física/jurídica com rótulos que mudam sozinhos, endereço por CEP, lista de
veículos com placa, marca (com sugestão de ~80 montadoras), modelo, ano, cor, tipo e KM.

1. **[P0·E1] Validar CPF/CNPJ pelo dígito verificador, como aviso.** Um CPF digitado errado só
   aparece meses depois, como NFC-e recusada — e a mensagem da SEFAZ não ajuda. Aviso, nunca
   trava (a pessoa pode não ter o documento na hora).
2. **[P0·E1] Máscara em CPF/CNPJ, telefone, CEP e placa**, aceitando os dois formatos de placa
   (`ABC-1234` e `ABC1D23`) e gravando normalizado.
3. **[P1·E1] Avisar cliente possivelmente duplicado** ao digitar um CPF, telefone ou placa que
   já existe. Cadastro duplicado parte o histórico do veículo em dois, e o histórico é o ativo
   mais valioso da loja.
4. **[P1·E1] Placa repetida em outro cliente:** avisar e oferecer "transferir o veículo" — é o
   caso real de carro vendido, e hoje ou vira duplicata ou vira perda de histórico.
5. **[P1·E2] Buscar dados da placa por API** (marca, modelo, ano, cor) com um botão ao lado do
   campo. Existem serviços brasileiros para isso; **é decisão dela** por causa do custo por
   consulta e porque significa mandar a placa de um cliente para um terceiro — o que precisa
   estar previsto na política de privacidade (TR-12.2). Implementar como opcional e desligado
   por padrão.
6. **[P1·E1] KM: guardar histórico, não só o último valor.** `veiculos.km_atual` é
   sobrescrito. Registrar o KM de cada OS é o que permite lembrete de revisão por quilometragem
   (FN-06) e é o que um dono de autocenter mais usa para vender o próximo serviço.

**Prompt.**

> Em `src/schemas/cliente.ts` e `src/pages/clientes/campos/`: adicione validação de CPF/CNPJ
> (função pura testada, com os casos clássicos de todos os dígitos iguais) exposta como **aviso**
> no formulário, não como erro que impede salvar; máscaras de entrada que gravam só dígitos no
> banco; normalização de placa. Ao sair do campo CPF/telefone/placa, consulte duplicidade e
> mostre uma faixa "Já existe um cliente com este CPF: <nome> — abrir?". Para o KM: nada de
> mudar `veiculos.km_atual` agora; adicione `ordens_servico.km_entrada` ao histórico (já existe!)
> e crie a consulta "último KM conhecido deste veículo" em `src/lib/`, usada aqui e na abertura
> de OS. **Não** implemente a consulta de placa por API nesta sessão — leve a proposta com custo
> e implicação de privacidade para ela decidir.

---

## Ordens de Serviço

### `TL-07` · Lista de ordens de serviço

*Hoje:* busca por cliente ou placa, filtro de período (De/Até), colunas Nº/Cliente/Veículo/
Aberta em/Status/Peças/Serviços/Total/Lucro, atalhos "Faturar" e "Fechamento" na linha. OS em
aberto sempre aparecem, independente do período.

1. **[P0·E1] Filtro por status.** "Quais concluídas ainda faltam faturar?" é a pergunta do fim
   do dia e hoje só dá para responder olhando a lista inteira. O status já tem cor (concluída em
   laranja, faturada em azul, finalizada em verde) — falta poder filtrar por ela.
2. **[P0·E1] Idade da OS.** Mesmo argumento do Início: a data crua obriga a contar.
3. **[P1·E1] Totalizador do que está filtrado** no rodapé da lista (total e lucro somados). É a
   diferença entre uma lista e um relatório.
4. **[P1·E1] `↗ TR-03.5`** — ordenação por coluna e paginação no servidor.
5. **[P1·E1] Ações rápidas na linha:** imprimir e enviar por WhatsApp (FN-03).
6. **[P2·E1] Exportar o resultado filtrado em CSV.**

**Prompt.**

> Em `src/pages/ordens-servico/OrdensServicoPage.tsx`: filtro de status em botões de alternância
> (múltipla escolha: Em andamento / Concluída / Faturada / Finalizada), aplicado **no servidor**;
> coluna "Aberta há" calculada com `diaLocal()` (nunca cortando string de timestamp — §6 item
> 34); rodapé com os totais do filtro atual, com a soma feita em `src/schemas/`; exportação CSV
> com BOM UTF-8. Preserve a regra de negócio já documentada: **OS em aberto aparecem sempre**,
> independentemente do período — e escreva isso como comentário no código, porque é a segunda
> vez que essa regra precisaria ser redescoberta.

---

### `TL-08` · Abertura de ordem de serviço

*Hoje:* cliente, veículo, KM de entrada, vendedor/atendente, observação, e a lista de itens
(peça ou serviço) com quantidade, preço, desconto e técnico. Peça lançada já dá baixa no estoque.

1. **[P0·E1] Cadastrar cliente e veículo sem sair da tela.** É o gesto mais comum do balcão —
   chega um carro de cliente novo — e hoje exige sair da OS, ir em Clientes, cadastrar e voltar
   do zero. Um "+ Cadastrar novo" dentro do `Combobox`, abrindo um modal enxuto (nome, telefone,
   placa) e voltando com o cliente já selecionado.
2. **[P0·E1] `↗ TR-02.5`** — cliente com um veículo só preenche o veículo sozinho.
3. **[P0·E1] KM de entrada com o último valor conhecido como sugestão**, e aviso se o novo for
   **menor** que o anterior (quase sempre é erro de digitação, e é o dado que sustenta o
   lembrete de revisão).
4. **[P1·E1] Total previsto fixo no rodapé.** Hoje ele fica no meio da tela, acima da lista de
   itens; com a OS cheia de peças, some da vista — que é justamente quando ele importa.
5. **[P1·E1] Saldo em estoque ao escolher a peça**, com aviso (não trava) se a quantidade
   lançada for maior que o saldo. O sistema já deixa o saldo ficar negativo, e o relatório de
   estoque trata saldo negativo como sinal de erro — melhor avisar na origem.
6. **[P1·E1] Peça sem preço de custo cadastrado:** avisar na hora do lançamento. Ela infla o
   lucro da OS, a comissão e o relatório de lucratividade — a tela de Comissões já avisa disso
   depois; avisar antes é melhor.
7. **[P2·E2] "Repetir a última OS deste veículo"** — troca de óleo, rodízio e alinhamento são
   recorrentes e idênticos.

**Prompt.**

> Em `src/pages/ordens-servico/`: adicione a opção "+ Cadastrar novo" nos `Combobox` de cliente e
> de veículo, abrindo um `Modal` com o formulário mínimo (reaproveite `ClienteForm` numa variante
> compacta, não duplique o schema) e devolvendo o registro já selecionado; preencha o veículo
> sozinho quando houver um só; sugira o último KM conhecido e avise se o digitado for menor;
> transforme o total previsto numa barra fixa no rodapé do formulário (com peças, serviços e
> total); em `ItemOSRow.tsx`, mostre o saldo do depósito padrão ao lado da peça escolhida e um
> aviso quando a quantidade passar do saldo ou quando a peça não tiver `preco_custo`. Nenhuma
> dessas checagens pode impedir de salvar.

---

### `TL-09` · Faturamento da ordem

*Hoje:* "Recebido agora" (lança no Caixa) ou "A receber depois" (cria conta a receber); divisão
em mais de uma forma de pagamento, com parcelamento e juros só na parte do cartão; confirmação
explícita avisando que faturar trava a OS.

1. **[P0·E1] A confirmação precisa dizer o número.** Hoje ela avisa da trava; deve dizer também
   *o total que está sendo faturado* e *o que exatamente deixa de ser possível* ("não vai mais
   dar para acrescentar peça ou serviço nesta OS"). Confirmação genérica é clicada sem ler.
2. **[P1·E1] Troco.** Se a forma for dinheiro, campo "valor recebido" e cálculo do troco na
   tela. É balcão, e é conta feita de cabeça hoje.
3. **[P1·E1] Deixar escrito por que o parcelamento sumiu** quando se escolhe "A receber depois"
   — hoje o campo simplesmente não aparece, e campo que some sem explicação parece bug.
4. **[P1·E2] Desconto no total da OS**, não só por item. "Faz por mil" é o pedido mais comum do
   balcão. **Precisa de decisão antes de construir**: a SEFAZ confere `bruto = quantidade ×
   unitário`, então o desconto tem que ser rateado nos itens (é o que o sistema já faz com o
   desconto de linha, §6 item 44) — o desenho é ratear proporcionalmente e mostrar o resultado
   antes de confirmar.
5. **[P1·E1] Mostrar o lucro da OS na hora de faturar**, discretamente e só para quem tem
   permissão de Relações. É a informação que faz o dono aceitar ou recusar um desconto.

**Prompt.**

> Em `src/pages/ordens-servico/FaturamentoCard.tsx`: enriqueça o texto da confirmação com o total
> e a consequência exata; acrescente "valor recebido" + troco quando houver forma "dinheiro";
> troque o sumiço silencioso dos campos por um texto explicativo; mostre o lucro da OS ao lado do
> total, condicionado à permissão. **Não** implemente o desconto no total nesta sessão — escreva
> a proposta (como ratear, o que acontece na nota, o que acontece se a OS já tiver desconto por
> item) e leve para ela decidir. Toda conta nova entra em `src/schemas/faturamento.ts` com teste
> de propriedade (TR-06.1).

---

### `TL-10` · Fechamento: notas fiscais e garantia

*Hoje:* o sistema deduz de que nota a OS precisa (só peça → NFC-e, só serviço → NFS-e, os dois →
as duas), mostra só o botão que faz sentido, emite via Focus NFe com espera pela autorização, e
carrega o PDF num preview embutido. Botão "Ver garantia" gera o documento.

1. **[P0·E1] `↗ TR-11.1`** — reabrir o DANFE depois de fechar o modal.
2. **[P0·E1] `↗ TR-11.3`** — lista de conferência antes de emitir.
3. **[P1·E1] Mostrar em que passo a emissão está.** A espera é de ~30 segundos e hoje é um
   silêncio: "enviando para a Focus NFe" → "aguardando autorização da SEFAZ" → "autorizada".
   Trinta segundos sem sinal é tempo suficiente para alguém achar que travou e clicar de novo —
   e clicar de novo aqui é emitir duas notas.
4. **[P1·E1] Botão "Consultar de novo" quando a espera vencer**, usando a `ref` que já é exibida
   (§6 item 46). Com o `TR-05.2` feito, isso vira recuperação automática.
5. **[P1·E1] Garantia: registrar a entrega.** Marcar que o documento foi gerado/impresso e por
   quem, e permitir mandar por WhatsApp (FN-03).

**Prompt.**

> Em `src/pages/ordens-servico/FechamentoTab.tsx` e `EmitirNotaFiscalModal.tsx`: barra de passos
> da emissão com o estado real do polling; botão "Consultar de novo" com a `ref`; "Ver DANFE" em
> nota já emitida (TR-11.1); a lista de conferência de `src/schemas/conferenciaFiscal.ts`
> (TR-11.3) acima do botão de emitir. Registre em `notas_fiscais_arquivos` (ou numa coluna nova
> em `ordens_servico`) que a garantia foi gerada, com data e operador. **Não** mexa na montagem
> do corpo da nota — ela está validada em produção e tem teste-ouro (TR-06.3).

---

## Estoque

### `TL-11` · Produtos

*Hoje:* descrição, categoria, código, unidade, preço de custo, preço de venda, estoque atual e
status; botão "Importar por foto/PDF" e "+ Novo produto". Catálogo compartilhado entre lojas da
mesma empresa; o saldo é por loja.

1. **[P0·E1] Saldo com semântica.** Hoje "Estoque atual" é um número neutro. Saldo **negativo**
   é sinal de erro de lançamento (o próprio relatório de estoque já o trata assim) e precisa
   gritar; saldo zerado precisa aparecer.
2. **[P0·E2] Estoque mínimo por peça.** É o campo que falta para o sistema responder "o que eu
   preciso comprar?" — a pergunta que mais dá dinheiro num autocenter, porque peça em falta é
   venda perdida na hora, com o carro no pátio. Coluna nova + filtro "abaixo do mínimo" +
   destaque na lista.
3. **[P1·E1] Fluxo de leitor de código de barras.** A peça já tem `codigo_barras` e não há
   nenhuma tela pensada para o leitor, que funciona como um teclado: foco automático num campo
   de busca que, ao receber Enter, seleciona a peça. Custa pouco e muda a velocidade do balcão.
4. **[P1·E1] Filtro por categoria e por depósito**, e margem % na coluna (já é calculada).
5. **[P2·E1] Foto da peça** — ajuda o balconista a confirmar que é aquela mesma.

**Prompt.**

> Migration aditiva: `pecas.estoque_minimo numeric(12,3) null`. Em
> `src/pages/estoque/ProdutosSection.tsx`: coluna de saldo com três estados visuais (negativo =
> alerta, abaixo do mínimo = atenção, normal), filtro "abaixo do mínimo", filtros de categoria e
> depósito, coluna de margem. Adicione um campo de busca no topo com `autoFocus` que aceite
> código de barras e, ao dar Enter com correspondência exata, abra a peça — o mesmo campo serve
> para busca por texto. Toda a lógica de "qual estado o saldo tem" vira função pura em
> `src/schemas/estoque.ts`, para a mesma regra valer na lista, no relatório e na abertura de OS.

---

### `TL-12` · Cadastro de produto

*Hoje:* dados cadastrais, tributos (NCM, CEST, CFOP, CSOSN/CST, origem, alíquota de ICMS),
garantia em dias, e custo/margem/preço calculados entre si nos dois sentidos.

1. **[P0·E1] Os campos fiscais são a maior fonte de erro do sistema** — foi o CST/CSOSN que
   derrubou a emissão (§6 item 47). Cada campo precisa de uma linha explicando o que é e de onde
   tirar ("NCM: está na nota do fornecedor, 8 dígitos"), e o CSOSN precisa vir **sugerido com o
   código que a loja mais usa**, exatamente como a importação de XML já faz. Hoje a sugestão só
   existe na importação, e o cadastro manual continua sendo um campo em branco.
2. **[P0·E1] Avisar quando o preço de venda ficar abaixo do custo.** Erro de digitação em preço
   é silencioso e vira prejuízo por venda, repetido até alguém reparar.
3. **[P1·E1] Unidade como lista fechada** (UN, PC, PÇ, KG, L, M, CX...) em vez de texto livre —
   unidade divergente é rejeição de nota, e "UN"/"Un"/"un" viram três coisas nos relatórios.
4. **[P1·E1] Bloco de pneu, quando a categoria for Pneus:** medida (ex. 175/70 R14), índice de
   carga e velocidade, e DOT. É a peça que essa loja mais vende, o dado está na lateral do pneu,
   e é o que permite responder "tem 175/70 R14?" sem procurar na descrição em texto livre.
5. **[P2·E1] Foto da peça e ficha de aplicação** (para quais carros serve) — o campo "aplicação"
   já existe como texto.

**Prompt.**

> Em `src/pages/estoque/PecaForm.tsx` e `campos/TributosFields.tsx`: acrescente a explicação
> curta por campo fiscal (um `<Explicacao>` reusável, o mesmo do TL-04); pré-preencha o
> CSOSN/CST com o código mais usado no cadastro da loja, reaproveitando a função que já existe
> em `src/schemas/tributacao.ts`; aviso (não trava) quando `preco_venda < preco_custo`; troque a
> unidade por `select` com a lista fechada mais "outro". Para o bloco de pneu: migration aditiva
> com `medida`, `indice_carga_velocidade` e `dot` em `pecas` (todos opcionais), exibidos só
> quando a categoria selecionada for a de Pneus — e incluídos na busca do TL-11. Cuidado de
> layout já conhecido (§6 item 47): **campo de formulário nunca dentro de faixa de aviso clara**.

---

### `TL-13` · Importar produtos por foto ou PDF

*Hoje:* uma ou mais fotos/PDFs de nota do fornecedor → Claude (via Edge Function) → tabela
editável → cadastro em lote. Chave da Anthropic só como secret da função.

1. **[P0·E1] Crédito da Anthropic é a falha mais provável hoje.** O status registra que o
   recurso pode estar sem funcionar desde agosto, porque a mesma chave é usada em outros
   projetos e o saldo ficou negativo. Duas coisas: mensagem específica para esse erro, com o
   caminho exato ("console.anthropic.com → Billing → Comprar créditos"), e **retomar a proposta
   de uma chave separada só do Sakura System** — que foi oferecida e nunca pedida, e cujo motivo
   ficou mais claro depois que o problema aconteceu de verdade.
2. **[P1·E1] Custo visível.** Mostrar o custo estimado antes de mandar (a leitura custa 1 a 3
   centavos) e um total gasto no mês, com limite configurável. Sem isso, o recurso é uma torneira
   aberta que ninguém vê.
3. **[P1·E1] Marcar o que é novo e o que já existe.** A tabela de revisão é editável, mas não
   diz quais itens já têm peça cadastrada — cadastrar em lote sem isso cria duplicata do
   catálogo, que é compartilhado entre as lojas da empresa.
4. **[P1·E1] Guardar o arquivo lido**, vinculado ao que foi criado. É rastro e é conferência.
5. **[P1·E1] `↗ TR-11.3` na origem:** a correção de CST/CSOSN já está aplicada aqui (§6 item 47)
   — manter e cobrir com teste.

**Prompt.**

> Em `src/lib/iaNotaFiscal.ts` e `ImportarNotasFiscaisModal.tsx`: detecte especificamente o erro
> de crédito da Anthropic no corpo da resposta e mostre a mensagem própria com o caminho;
> mostre o custo estimado antes de enviar e acumule o gasto do mês numa tabela pequena
> (`uso_ia`: loja, data, arquivos, custo estimado), com limite mensal configurável em
> Configurações que **avisa** ao ser ultrapassado; na tabela de revisão, marque cada item como
> "peça nova" ou "já cadastrada — vai atualizar", casando por código de barras e código interno
> antes de mostrar; salve o arquivo original no Storage, vinculado ao lote. Escreva também, para
> a usuária, o passo a passo curto de criar uma chave separada só para o Sakura System.

---

### `TL-14` · Movimentações

*Hoje:* extrato de tudo que entrou e saiu, com data, produto, depósito, tipo, quantidade, motivo
e referência. Filtro por produto.

1. **[P1·E1] Filtros que faltam:** período, tipo, motivo e depósito. É a tela de investigação do
   estoque, e hoje só filtra por produto.
2. **[P1·E1] Saldo acumulado depois de cada linha.** Sem ele, achar *onde* o saldo desandou
   exige somar à mão. É a coluna que transforma extrato em ferramenta de diagnóstico.
3. **[P1·E1] Referência clicável.** "OS 148" deveria abrir a OS 148, "NF 88213" o pedido de
   compra. Hoje é texto.
4. **[P2·E1] Exportar CSV.**

**Prompt.**

> Em `src/pages/estoque/MovimentacoesSection.tsx`: filtros de período/tipo/motivo/depósito
> aplicados no servidor; coluna de saldo acumulado, calculada em `src/schemas/estoque.ts` a
> partir da sequência ordenada por data (cuidado com paginação — o acumulado tem que ser
> calculado sobre o filtro inteiro, não sobre a página); referência virando link quando puder
> ser resolvida; exportação CSV.

---

### `TL-15` · Registrar movimentação manual

*Hoje:* peça, depósito, tipo (entrada/saída), quantidade, motivo e referência opcional.

1. **[P0·E1] Observação obrigatória quando o motivo for "ajuste".** Ajuste sem justificativa é
   o caminho por onde estoque some sem rastro — e agora que existe auditoria, faz ainda menos
   sentido deixar o campo livre.
2. **[P1·E1] Mostrar saldo antes e depois** na própria tela, antes de confirmar. Confirmar às
   cegas uma saída de 24 unidades é como o "1,99 UN" apareceu (§6 item 41).
3. **[P1·E1] Transferência entre depósitos como tipo próprio.** Hoje é uma saída aqui e uma
   entrada ali — duas ações sem vínculo, e nada garante que a segunda aconteça.

**Prompt.**

> Em `src/pages/estoque/MovimentoForm.tsx`: `observacao` obrigatória quando `motivo = 'ajuste'`
> (no `zod` e como `check` no banco, TR-05.1); painel "saldo atual → saldo depois" atualizado ao
> vivo. Para a transferência: migration aditiva com o motivo `transferencia` e uma coluna
> `movimento_par_id` que liga os dois lançamentos; a tela cria os dois numa transação
> (função no Postgres, para não haver meio caminho). Confira que os relatórios de estoque
> ignoram transferência ao somar entradas/saídas da loja — ela não muda o total, só o lugar.

---

### `TL-16` · Contagem de estoque (inventário)

*Hoje:* um produto por vez, por depósito; mostra o saldo do sistema, recebe a quantidade contada,
calcula a diferença e gera o ajuste sozinho. Histórico de contagens embaixo.

1. **[P1·E1] Contagem em lote.** Inventário de verdade é feito percorrendo a prateleira com uma
   lista, não abrindo uma tela por peça. Uma sessão de contagem que abre com todas as peças
   daquele depósito e vai recebendo os números é a diferença entre o recurso ser usado e não ser.
2. **[P1·E1] Imprimir a folha de contagem** (produto, local, espaço em branco para escrever). É
   assim que se conta na prática: no papel, e depois digita.
3. **[P1·E1] Exigir observação quando a diferença passar de um limite** (percentual ou valor).
4. **[P2·E1] Avisar que há contagem em aberto** naquele depósito quando alguém for lançar
   movimentação — contagem e movimentação simultâneas produzem ajuste errado.

**Prompt.**

> Migration: `sessoes_contagem` (loja, depósito, status aberta/fechada, operador, datas) e
> `contagens_estoque.sessao_id` opcional, mantendo o fluxo de uma peça só funcionando como está
> (compatibilidade). Em `ContagemSection.tsx`: nova aba/modo "Contagem em lote" que abre uma
> sessão, lista as peças com saldo do depósito, recebe os contados, mostra o total de diferenças
> e só gera os ajustes ao **fechar** a sessão — com uma tela de conferência antes. Botão
> "Imprimir folha" gerando um HTML simples para impressão (mesmo padrão de `iframe` já usado na
> garantia). Aviso na tela de movimentação quando houver sessão aberta naquele depósito.

---

### `TL-17` · Relatórios de estoque

*Hoje:* estoque físico-financeiro (valor parado), saldo por situação (positivo/negativo/zerado)
e produtos sem movimentação.

1. **[P1·E1] Giro de estoque e curva ABC.** É o relatório que responde "que peça está parada me
   custando dinheiro" e "quais 20% do catálogo fazem 80% da receita". Todo concorrente vende
   isso, os dados já existem (movimentações + custo + vendas), e para uma borracharia isso tem
   nome concreto: medida de pneu que gira e medida que encalha.
2. **[P1·E1] "Sem movimentação" com período configurável** e o valor parado somado — hoje o
   critério é fixo e o relatório não diz quanto dinheiro aquilo representa.
3. **[P1·E1] Exportar e imprimir.**

**Prompt.**

> Em `src/pages/estoque/RelatoriosEstoqueSection.tsx`: acrescente "Giro por peça" (quantidade
> vendida no período ÷ saldo médio) e "Curva ABC" por receita e por margem, com o cálculo em
> `src/schemas/estoque.ts` como função pura testada — nunca na tela. No "sem movimentação",
> período escolhível (30/60/90/180 dias) e soma do valor parado. Exportação CSV e impressão.
> Meça o custo das consultas com `explain analyze` antes de entregar (TR-05.4).

---
## Fornecedores

### `TL-18` · Cadastro de fornecedores

*Hoje:* razão social, CNPJ, telefone, cidade/UF, status; compartilhado entre lojas da mesma
empresa.

1. **[P1·E1] Validar CNPJ e avisar duplicado.** Fornecedor duplicado quebra o histórico de
   cotação, que é justamente o que dá poder de negociação na compra.
2. **[P1·E1] Preencher pelo CNPJ.** Consulta pública de dados cadastrais (razão social,
   endereço) — reduz digitação e reduz erro. Dado de empresa é público, então aqui não há a
   objeção de privacidade que existe na consulta de placa.
3. **[P1·E1] Colunas "última compra" e "total comprado"** — é o que separa fornecedor ativo de
   cadastro morto.
4. **[P1·E1] `↗ TR-02.1`** nas ações de linha.

**Prompt.**

> Em `src/pages/fornecedores/`: validação de CNPJ (função pura testada, reaproveitada de
> TL-06), aviso de duplicidade por CNPJ, colunas de última compra e total comprado (conta em
> `src/schemas/`), e um botão "Buscar dados pelo CNPJ" que consulta uma API pública de cadastro
> de empresa e preenche razão social e endereço — **com tratamento de falha silencioso**: se a
> consulta não responder, o formulário continua funcionando normalmente. Traga o custo/limite da
> API escolhida para a usuária antes de fixar a dependência.

---

### `TL-19` · Ficha do fornecedor

*Hoje:* é o formulário de cadastro (nome, CNPJ, contato, endereço) com a opção de inativar.

1. **[P1·E1] Virar ficha de verdade.** Hoje "ficha" é só o formulário. O que o comprador precisa
   ver ao abrir um fornecedor: histórico de pedidos, quais peças ele fornece, o último preço de
   cada uma, prazo médio entre pedido e recebimento, e total comprado no ano. Todo esse dado já
   existe em `pedidos_compra` e `cotacoes_pecas` — falta a tela.
2. **[P1·E1] Contato de vendedor com WhatsApp.** Quem compra fala com uma pessoa, não com um
   CNPJ. Nome + telefone + botão que abre a conversa.
3. **[P2·E1] Prazo de pagamento combinado** (à vista, 28 dias, 30/60) como campo — é o que
   permite prever o Contas a Pagar de uma compra.

**Prompt.**

> Transforme `FornecedorForm.tsx` numa ficha com abas: "Dados" (o formulário de hoje) e
> "Histórico" (pedidos, peças fornecidas com último preço e data, prazo médio de entrega
> calculado, total comprado por ano). Migration aditiva: `fornecedores.vendedor_nome`,
> `vendedor_telefone`, `prazo_pagamento_dias`. Botão de WhatsApp abrindo `https://wa.me/<numero>`
> via `shell.openExternal` **com a URL validada** (TR-04.6, item 15 do checklist do Electron).

---

### `TL-20` · Pedidos de compra

*Hoje:* número sequencial por loja, fornecedor, data, total e status (pendente / recebido
parcialmente / recebido / cancelado).

1. **[P1·E1] Filtro por status e por fornecedor**, e destaque para pedido pendente há muito
   tempo — pedido esquecido é peça que não chegou e ninguém cobrou.
2. **[P1·E1] Total pendente somado** no topo (quanto de mercadoria está a caminho).
3. **[P1·E1] Previsão de entrega** por pedido, com alerta ao passar da data.

**Prompt.**

> Em `src/pages/fornecedores/PedidosCompraSection.tsx`: filtros de status e fornecedor no
> servidor, coluna "aberto há X dias", destaque a partir de um limite configurável, e o total
> pendente no cabeçalho. Migration aditiva `pedidos_compra.previsao_entrega date null`, com
> alerta na lista e no Início quando vencer.

---

### `TL-21` · Novo pedido de compra

*Hoje:* fornecedor, data, observação e itens; ao escolher a peça, mostra as cotações anteriores
por fornecedor (mais barato primeiro) com botão "usar esse preço".

> A cotação por fornecedor é o melhor recurso desta tela e não tem equivalente na maioria dos
> concorrentes de faixa parecida. As sugestões abaixo são para aproveitá-lo melhor, não para
> mudá-lo.

1. **[P1·E1] Nascer do estoque mínimo.** Um botão "Sugerir itens em falta" que traz as peças
   abaixo do mínimo (TL-11), com a quantidade sugerida = mínimo − saldo. É o que fecha o ciclo
   compra→estoque→venda e o que faz um sistema economizar dinheiro de verdade.
2. **[P1·E1] Total do pedido visível enquanto monta** (hoje aparece só na lista depois).
3. **[P1·E1] Mandar o pedido pronto para o fornecedor** em texto formatado, por WhatsApp ou
   e-mail. É como a compra acontece de fato.
4. **[P2·E1] Comparar dois fornecedores lado a lado** para o mesmo conjunto de peças, a partir
   das cotações — o passo natural do recurso que já existe.

**Prompt.**

> Em `PedidoCompraForm.tsx`: botão "Sugerir itens em falta" (usa `pecas.estoque_minimo` do TL-11
> e o saldo do depósito), total ao vivo no rodapé, e "Enviar pedido" gerando um texto formatado
> (fornecedor, número do pedido, lista de peça/quantidade/preço, total, prazo) copiável e com
> link de WhatsApp. Nada de anexo/PDF nesta etapa — texto resolve e é o que o vendedor lê no
> celular.

---

### `TL-22` · Conferência de recebimento

*Hoje:* confirma quanto chegou de cada item (pode ser parcial, mais de uma vez), lança a entrada
no estoque e recalcula o status do pedido.

1. **[P0·E1] Preço realmente cobrado.** Se a nota veio com preço diferente do pedido, é esse o
   valor que precisa virar cotação e custo — hoje a cotação é gravada na criação do pedido, com
   o preço *pedido*. Um campo de preço no recebimento corrige a base de comparação inteira.
2. **[P1·E1] Divergência de qualidade.** Campo "chegou avariado / veio errado" com quantidade,
   que **não** entra no estoque e fica registrado para cobrar do fornecedor.
3. **[P1·E1] Registrar a nota fiscal do fornecedor** (número e chave) no recebimento — é o
   vínculo entre o pedido e o documento de entrada, e evita receber duas vezes a mesma nota
   (ver TL-23).

**Prompt.**

> Em `ReceberPedidoModal.tsx` e `src/lib/pedidosCompra.ts`: campo de preço unitário por item no
> recebimento, pré-preenchido com o do pedido; ao confirmar, gravar a cotação com o preço
> **recebido** (e não mais na criação do pedido — ajustar `criarPedido()` para não gravar
> cotação, senão o histórico fica com dois valores para a mesma compra); campos de quantidade
> avariada/divergente, que geram registro próprio sem entrada de estoque; campos de número e
> chave da nota do fornecedor. Migration aditiva. **Cuidado**: `cotacoes_pecas` tem
> `check (preco > 0)` — o §8 registra um bug real de preço zero batendo nessa constraint;
> trate isso.

---

### `TL-23` · Importar XML da nota do fornecedor

*Hoje:* lê o XML que o fornecedor emite, acha o fornecedor pelo CNPJ (cria se não existir), casa
os itens com peças por código de barras/código interno, pede o depósito e cria um pedido já
"recebido", com entrada de estoque e cotação. Desde 09/09 não copia mais o CST/CSOSN do
fornecedor.

1. **[P0·E1] Resumo antes de confirmar.** "Vão ser criadas 4 peças novas, 9 já cadastradas serão
   movimentadas, e o custo de 3 delas vai mudar" — hoje o lote inteiro é confirmado de uma vez.
   É a diferença entre revisar e torcer.
2. **[P0·E1] Recusar XML já importado.** Guardar a chave de acesso da nota e barrar a repetição.
   Importar duas vezes dobra o estoque em silêncio, e o saldo errado só aparece na próxima
   contagem.
3. **[P1·E1] Atualizar o preço de custo com o valor da nota**, com aviso e opção de não
   atualizar. Hoje só a cotação é gravada — o `preco_custo` da peça, que é o que alimenta todo o
   cálculo de lucro e comissão, continua o antigo.
4. **[P1·E1] Guardar o XML.** É documento de entrada e também tem obrigação de guarda; e é a
   prova de o que foi importado.

**Prompt.**

> Em `ImportarNotaFiscalXmlModal.tsx` e `src/lib/notaFiscalXmlFornecedor.ts`: tela de resumo
> antes da confirmação, com as três contagens e a lista do que muda; guardar `chave_acesso` no
> `pedidos_compra` (migration aditiva + único) e recusar reimportação com mensagem clara e link
> para o pedido já criado; oferecer a atualização de `preco_custo` item a item, marcada por
> padrão quando a diferença for pequena e desmarcada quando for grande (uma variação de 40% é
> mais provável ser erro de unidade do que aumento real); salvar o XML no Storage vinculado ao
> pedido. Mantenha a correção de CST/CSOSN e cubra-a com teste, porque é regressão cara.

---

## Serviços

### `TL-24` · Catálogo de serviços

*Hoje:* descrição, categoria, código, preço padrão, custo (mão de obra) e status.

1. **[P1·E1] Categoria vazia em todas as linhas.** No PDF, a coluna Categoria mostra "—" nos
   cinco serviços. O campo existe, as 6 categorias vêm semeadas, e ninguém preencheu — sinal de
   que a tela não incentiva. Sugerir a categoria no cadastro e mostrar um aviso discreto na
   lista enquanto houver serviço sem categoria (o relatório por categoria depende disso).
2. **[P1·E1] Quantidade vendida e margem no período** — transforma o catálogo em informação.
3. **[P1·E1] `↗ TR-02.1`** nas ações.

**Prompt.**

> Em `src/pages/servicos/`: colunas de quantidade vendida e margem no período (conta em
> `src/schemas/`), aviso discreto "N serviços sem categoria — isso deixa o relatório por
> categoria incompleto" com filtro para achá-los, e sugestão de categoria no formulário a partir
> de palavras da descrição ("alinhamento" → Alinhamento), sempre como sugestão editável.

---

### `TL-25` · Cadastro de serviço

*Hoje:* descrição, código opcional, preço padrão, custo e categoria.

1. **[P1·E1] Tempo estimado de execução.** Campo simples que abre duas portas: saber se o preço
   da mão de obra faz sentido (preço ÷ tempo = valor da hora da oficina, que é o número que todo
   consultor do ramo manda calcular) e alimentar uma agenda no futuro (FN-05).
2. **[P1·E1] Peças que costumam acompanhar o serviço.** "Troca de óleo e filtro" já sugerir o
   óleo e o filtro na OS. É o recurso que mais acelera o lançamento e o que mais evita esquecer
   de cobrar uma peça.
3. **[P1·E1] Prazo de garantia do serviço** — hoje só a peça tem garantia (TL-38).

**Prompt.**

> Migration aditiva: `servicos.tempo_estimado_min int null`,
> `servicos.prazo_garantia_dias int null`, e uma tabela `servico_pecas_sugeridas`
> (servico_id, peca_id, quantidade_padrao). No formulário, os campos novos e um bloco de peças
> sugeridas com `useFieldArray`. Na abertura de OS (TL-08), ao escolher um serviço com peças
> sugeridas, oferecer acrescentá-las (**perguntar, nunca lançar sozinho** — lançar peça sozinho
> dá baixa em estoque). Mostrar no cadastro o valor da hora calculado a partir de preço e tempo.

---

## Caixa Diário

### `TL-26` · Caixa do dia

*Hoje:* entradas, saídas, saldo e lucro do dia; resumo por forma de recebimento; tabela com
horário, origem, cliente, forma, valor e lucro. O lucro do dia é confiável desde 28/08.

1. **[P0·E2] `↗ TR-06.4`** — fechamento do dia com conferência do dinheiro em espécie.
2. **[P1·E1] Navegar dias com ‹ ›** e um atalho "hoje". Hoje é preciso abrir o calendário para
   ver ontem.
3. **[P1·E1] Marcar como conciliado** por forma de pagamento (o Pix bateu com o extrato, o
   cartão bateu com o relatório da maquininha). É o gesto que o dono faz toda manhã com o
   celular na mão.
4. **[P1·E1] Explicar o "Lucro do dia"** — ele mudou de definição (passou a descontar as saídas
   lançadas à mão) e ninguém adivinha isso olhando o número (`↗ TL-04.3`).

**Prompt.**

> Em `src/pages/caixa/DiarioSection.tsx`: setas de dia e botão "Hoje"; explicação do lucro no
> mesmo componente do TL-04; caixa de seleção "conferido" por forma de pagamento, gravada numa
> tabela pequena por (loja, data, forma), com quem conferiu e quando. Fechamento do dia conforme
> TR-06.4. Nenhuma conta nova fora de `src/schemas/metricasCaixa.ts`.

---

### `TL-27` · Lançamento manual no caixa

*Hoje:* tipo (entrada/saída), valor, categoria **opcional**, forma de pagamento e descrição.

1. **[P0·E1] Categoria deveria ser obrigatória.** A prova está na própria tela de Saídas do PDF:
   "Por categoria — Sem categoria: R$ 31.000,00". Todas as despesas do mês num balde só. A
   categoria é opcional, então ninguém preenche, então o relatório por categoria não existe na
   prática. Tornar obrigatória (com uma categoria "Outros" disponível) resolve.
2. **[P1·E1] Vincular a saída a um fornecedor ou a uma conta a pagar** quando fizer sentido — é
   o que fecha a conciliação entre os dois módulos.
3. **[P1·E1] Anexar comprovante** (foto do recibo). Uma saída de R$ 11.200,00 de folha de
   pagamento sem nenhum documento anexado é um problema quando alguém perguntar.
4. **[P1·E1] Lançamento recorrente** (aluguel todo mês) — hoje isso existe só em Contas a Pagar,
   e a diferença entre os dois módulos não é óbvia para quem usa.

**Prompt.**

> Em `src/pages/caixa/CaixaForm.tsx`: torne `categoria_id` obrigatório no `zod` e semeie uma
> categoria "Outros" para cada tipo, se não existir; campo opcional de fornecedor nas saídas;
> upload de comprovante para o Storage (bucket novo, com as mesmas policies por loja do
> TR-04.5). **Antes de tornar obrigatório**, conte quantos lançamentos existentes estão sem
> categoria e ofereça à usuária uma tela simples para categorizar o histórico em lote — mudar a
> regra sem oferecer o conserto do passado deixa o relatório errado para sempre.

---

### `TL-28` · Entradas · `TL-29` · Saídas

*Hoje:* só os lançamentos manuais, com filtro por período e categoria, total do período e
totais por categoria. O texto no topo explica que não inclui faturamento de OS.

1. **[P1·E1] O texto explicativo do topo é o melhor do sistema** — "Lançamento manual de saída
   — não inclui faturamento de OS, que aparece na aba Diário". Replicar esse padrão em toda tela
   cujo escopo possa ser confundido (Contas a Pagar vs. Saídas, Contas a Receber vs. Diário,
   Relatórios de estoque vs. Movimentações).
2. **[P1·E1] Gráfico por categoria no período** — o dado já está agregado logo acima da tabela.
3. **[P1·E1] Comparar com o período anterior** ("aluguel subiu 12%").
4. **[P1·E1] Filtro por forma de pagamento** (no PDF, todas as saídas são "Transferência" — vale
   conferir se o campo está sendo usado ou se virou padrão automático).

**Prompt.**

> Em `src/pages/caixa/EntradaSaidaSection.tsx`: gráfico de barras horizontais por categoria
> (usar `GraficoBarras.tsx`, que já existe e é SVG puro — nenhuma biblioteca nova), comparação
> com o período anterior, filtro por forma de pagamento. Extraia o padrão de texto explicativo
> num componente `<NotaDeEscopo>` e aplique nas telas listadas acima.

---

## Contas a Pagar

### `TL-30` · Contas a pagar

*Hoje:* total pendente, lista de pendentes com vencimento, descrição, categoria, valor e status
(vencida em destaque); as vencidas também aparecem no calendário do Início.

1. **[P0·E1] Agrupar por urgência**, não numa lista só: Vencidas / Vence hoje / Próximos 7 dias
   / Depois. É como a pessoa pensa, e é o que a tela precisa responder em dois segundos.
2. **[P1·E1] Total por grupo** e projeção do mês (o que ainda vai vencer).
3. **[P1·E1] Filtro por categoria e fornecedor.**
4. **[P1·E1] Contas pagas com filtro de período** — hoje só há "pagas recentemente".

**Prompt.**

> Em `src/pages/contas-pagar/ContasPagarPage.tsx`: agrupamento por urgência com cabeçalho e
> total por grupo, calculado em `src/schemas/`; filtros de categoria e fornecedor; aba/filtro de
> contas pagas por período. Reaproveite o mesmo agrupamento em Contas a Receber (TL-33) — é a
> mesma tela espelhada, e duas implementações divergentes é o padrão de bug já conhecido deste
> projeto.

---

### `TL-31` · Nova conta a pagar

*Hoje:* descrição, valor, vencimento, categoria, "conta mensal recorrente" e "recorrente até".

1. **[P1·E1] Parcelamento.** Uma compra em 3x hoje exige criar três contas à mão. Um campo
   "dividir em N vezes" que cria as N contas de uma vez é a diferença entre o módulo ser usado e
   ser abandonado.
2. **[P1·E1] Anexar boleto/nota.**
3. **[P1·E1] Vincular a um fornecedor** — fecha o ciclo com Pedidos de Compra e permite
   "quanto eu devo para este fornecedor?".
4. **[P2·E1] O resíduo do dia 28.** A conta recorrente que caiu em fevereiro fica presa no dia
   28 para sempre. Guardar o dia original numa coluna e usá-lo para recalcular resolve — é a
   migration pequena que o próprio status já identificou.

**Prompt.**

> Em `ContaPagarForm.tsx` e `src/lib/contasPagar.ts`: campo "dividir em N parcelas" que cria N
> linhas (descrição com "(1/3)", vencimentos mês a mês, última parcela absorvendo a sobra de
> centavos — mesma técnica de `calcularListaParcelas`); `fornecedor_id` opcional; upload de
> anexo. Migration aditiva `contas_pagar.dia_vencimento_original int null`, preenchida na
> criação e usada por `pagarConta()` para recalcular o próximo vencimento a partir do dia
> original, segurando no último dia do mês quando não existir (mantendo o comportamento correto
> já implementado para 29/30/31, §6 item 43) — mas voltando ao dia certo no mês seguinte.

---

### `TL-32` · Marcar conta como paga

*Hoje:* confirma data e forma de pagamento, lança a Saída no caixa e, se recorrente, cria a
próxima ocorrência. Dá para desfazer.

1. **[P1·E1] Pagamento parcial.** Pagar metade hoje e metade semana que vem é rotina com
   fornecedor, e hoje não tem como registrar.
2. **[P1·E1] Juros e multa por atraso como campos próprios.** Hoje entrariam embutidos no valor
   pago e sumiriam do relatório — e "quanto eu paguei de juros esse ano" é uma pergunta que
   costuma assustar (produtivamente) o dono da loja.
3. **[P1·E1] Data de pagamento retroativa** com aviso, para quem lança depois.

**Prompt.**

> Em `PagarContaModal.tsx` e `src/lib/contasPagar.ts`: campos `valor_juros` e `valor_multa`
> (migration aditiva), somados no lançamento de Saída mas guardados separados, com categoria
> própria no caixa; pagamento parcial gravando `valor_pago` acumulado e mantendo a conta
> pendente pelo saldo (decidir com a usuária se o saldo vira uma conta nova ou se a mesma conta
> guarda os pagamentos — recomendo uma tabela `contas_pagar_pagamentos`, que é o desenho que não
> mente); e "Desfazer pagamento" precisa continuar funcionando em todos os casos novos —
> escreva teste para cada um.

---

## Contas a Receber

### `TL-33` · Contas a receber

*Hoje:* espelho de Contas a Pagar; nasce ao faturar uma OS como "a receber depois" ou à mão;
lista de pendentes e recebidas recentemente.

1. **[P0·E1] As vencidas não aparecem no calendário do Início.** As contas a **pagar** aparecem;
   as a **receber**, não. É assimetria sem motivo, e o dinheiro que entra importa tanto quanto o
   que sai.
2. **[P0·E1] `↗ TL-30.1`** — mesmo agrupamento por urgência.
3. **[P1·E1] Total a receber por cliente** e "quem está devendo há mais tempo". É a lista que o
   dono usa para cobrar.
4. **[P1·E1] Botão de cobrança por WhatsApp** com texto pronto (FN-03).

**Prompt.**

> Em `src/pages/contas-receber/` e `src/pages/painel/PainelPage.tsx`: reaproveite o agrupamento
> por urgência do TL-30 (componente compartilhado, uma implementação só); acrescente as contas a
> receber vencidas ao calendário e à lista de eventos do Início, com cor distinta das a pagar;
> visão "por cliente" com total devido e dias em atraso do mais antigo; botão de cobrança
> gerando o texto e abrindo o WhatsApp (FN-03).

---

### `TL-34` · Nova conta a receber

*Hoje:* cliente, descrição, valor e previsão de recebimento.

1. **[P1·E1] Parcelamento**, igual ao TL-31.
2. **[P1·E1] Vincular a uma OS opcionalmente** — hoje ou nasce da OS, ou é totalmente avulsa;
   não há meio-termo para "cobrança extra referente à OS 148".
3. **[P1·E1] Sugerir a data** a partir de um prazo padrão do cliente (30 dias para frota, por
   exemplo).

**Prompt.**

> Em `ContaReceberForm.tsx`: parcelamento (mesma função de TL-31, compartilhada); `Combobox` de
> OS opcional, filtrado pelas OS daquele cliente — atenção à constraint
> `contas_receber_ordem_id_unique`, que impede duas contas para a mesma OS (o comportamento com
> nulos já foi analisado e está correto, §5); e prazo padrão por cliente
> (`clientes.prazo_recebimento_dias`, migration aditiva) usado para sugerir a data.

---

### `TL-35` · Marcar como recebido

*Hoje:* confirma valor e forma, lança a Entrada no caixa.

1. **[P1·E1] Recebimento parcial**, mesmo desenho de TL-32.
2. **[P1·E1] Data de recebimento editável** — quem lança no dia seguinte precisa corrigir, e sem
   isso o Caixa do dia fica errado nos dois dias.
3. **[P1·E1] Desfazer recebimento** — existe em Contas a Pagar e não aqui. Assimetria sem motivo.

**Prompt.**

> Em `ReceberContaModal.tsx` e `src/lib/contasReceber.ts`: data editável com aviso quando for
> diferente de hoje; recebimento parcial no mesmo desenho de TL-32; e implemente
> `desfazerRecebimento()` espelhando `desfazerPagamento()`, com a mesma lógica de remover a
> Entrada gerada. Teste os dois lados juntos.

---

## Relações

### `TL-36` · Gráficos de vendas, custos e lucro

*Hoje:* barras (Vendas × Custos × Lucro) com períodos Diário/Semanal/Mensal/Anual, mais um radar
comparando o período atual com o anterior. Tudo em SVG próprio, sem biblioteca externa.

1. **[P0·E1] Contraste e legibilidade dos eixos.** Esta tela já produziu o pior contraste do
   sistema (1,39:1 no tooltip). Rótulos do eixo Y abreviados (R$ 20 mil), grade sutil, e
   `↗ TR-01.3`.
2. **[P1·E1] O radar é o gráfico errado para esta pergunta.** Comparar magnitudes num radar é
   conhecidamente enganoso — a área cresce com o quadrado do valor, e o julgamento visual não
   corrige isso. Para "este período vs. o anterior" em três medidas, barras agrupadas respondem
   melhor e em menos espaço. **Levar como proposta com um preview lado a lado**, não trocar
   sozinho: ela escolheu o radar e ele está bonito.
3. **[P1·E1] Clicar numa barra abre o detalhe daquele dia/mês** — é o que faz o gráfico virar
   ponto de partida em vez de enfeite.
4. **[P1·E1] Exportar imagem ou PDF** para mandar ao contador ou guardar.
5. **[P1·E1] Marcar visualmente quando o período está incompleto** (o mês corrente sempre parece
   pior que os anteriores) — erro de leitura clássico.

**Prompt.**

> Em `src/components/GraficoBarras.tsx`, `GraficoRadar.tsx` e
> `src/pages/relatorios/GraficosSection.tsx`: abrevie os rótulos do eixo Y, adicione grade
> horizontal sutil e rótulo de valor no topo da barra em foco; marque o período incompleto com
> hachura e uma legenda ("mês em andamento"); torne a barra clicável, navegando para a lista
> filtrada daquele período; exporte o SVG como PNG (`canvas`) e como PDF. Para o radar: gere um
> preview com barras agrupadas ao lado do radar atual, com os mesmos dados, e mostre os dois
> para a usuária escolher. **Não remova o radar sem a decisão dela.**

---

### `TL-37` · Lucratividade por item

*Hoje:* receita, custo e margem do período, e a margem por peça/serviço com quantidade vendida.

1. **[P1·E1] Ordenação por coluna** (margem, receita, quantidade) e destaque para margem
   negativa. Hoje a ordem é fixa, e o item que dá prejuízo é o que mais precisa ser achado.
2. **[P1·E1] Avisar quando o item não tem custo cadastrado.** Ele entra como lucro cheio e
   **infla a margem**. A tela de Comissões já faz esse aviso e ele é excelente — a mesma
   armadilha existe aqui e não é avisada.
3. **[P1·E1] Separar peça de serviço** no resumo do topo — são negócios com margens muito
   diferentes, e a média junta esconde os dois.
4. **[P1·E1] Percentual de margem, não só o valor.** R$ 808,00 de margem em R$ 2.448,00 (33%) e
   em R$ 900,00 (90%) são coisas completamente diferentes.

**Prompt.**

> Em `src/pages/relatorios/LucratividadeSection.tsx`: ordenação por coluna; coluna de margem
> percentual; destaque para margem negativa e para item sem custo cadastrado, com a mesma
> linguagem de aviso já usada em `ComissoesSection` (reaproveite o texto — consistência importa
> mais que originalidade aqui); resumo separado de peças e serviços. Toda conta em
> `src/schemas/metricasCaixa.ts` — esta tela é uma das três que já divergiram (§6 item 40).

---

## Garantias

### `TL-38` · Garantias em vigor

*Hoje:* lista derivada de `ordens_servico_itens` + `pecas.prazo_garantia_dias` +
`ordens_servico.data_fechamento`, com abas Todos / Dentro do prazo / Vencida. Sem tabela própria
— nunca fica desatualizada.

> Derivar em vez de gravar foi a decisão certa aqui e não deve ser reaberta.

1. **[P1·E1] Avisar garantia vencendo** (30 dias) no Início. Uma garantia prestes a vencer é
   uma oportunidade de contato ("passa aqui para a gente conferir"), e é a diferença entre
   garantia como custo e garantia como relacionamento.
2. **[P1·E1] Registrar o acionamento.** Hoje a tela só lista. Quando a peça volta com defeito,
   não há onde registrar — e sem isso não existe "quantas peças deste fornecedor voltaram",
   que é a informação que dá poder na conversa com o fornecedor.
3. **[P1·E1] Garantia de serviço** — hoje só peça tem prazo (`↗ TL-25.3`).
4. **[P1·E1] Busca por placa e cliente**, que é como a pergunta chega ("o pneu que eu comprei
   aqui furou, ainda tem garantia?").

**Prompt.**

> Em `src/pages/garantias/GarantiasPage.tsx`: busca por placa/cliente/peça; aviso de garantia
> vencendo no Início. Para o acionamento: migration com `garantias_acionamentos`
> (ordem_servico_item_id, data, motivo, resolução, operador, e um vínculo opcional com a OS nova
> gerada pelo atendimento), e um botão "Registrar acionamento" na linha. Estenda a derivação
> para incluir serviço quando `servicos.prazo_garantia_dias` existir (TL-25). **Manter a
> filosofia**: continua tudo derivado, e a tabela nova guarda só o evento de acionamento, que
> não é derivável de nada.

---
## Notas Fiscais

### `TL-39` · Notas de produto (NFC-e) · `TL-40` · Notas de serviço (NFS-e)

*Hoje:* arquivo dos XMLs por mês de competência, com "Versão para o cliente" (recibo HTML
montado a partir do XML), "Baixar XML", "Cancelar nota" (só nas automáticas ainda autorizadas),
"Excluir" e o botão de baixar os XMLs do mês inteiro num `.zip`.

1. **[P0·E1] `↗ TR-11.1`** — "Ver DANFE" da nota já emitida. É o pedido de balcão mais comum e
   hoje a saída é entrar no painel da Focus NFe.
2. **[P1·E1] Nota cancelada precisa parecer cancelada.** Riscada, com etiqueta e a data do
   cancelamento — hoje a lista não distingue. Uma nota cancelada tratada como válida é erro de
   conferência garantido.
3. **[P1·E1] Resumo do mês:** quantidade de notas e valor total, ao lado do botão de baixar o
   `.zip`. É exatamente o que a contabilidade confere ao receber o arquivo, e evita a ida e
   volta de "faltou uma".
4. **[P1·E1] Filtro por período, por OS e por status** (autorizada/cancelada). Hoje o
   agrupamento por mês é bom, mas não há filtro.
5. **[P1·E1] "Baixar todos do ano"** — é o pedido de janeiro, todo ano.
6. **[P1·E1] A conferência de "Excluir" já foi corrigida** (§6 item 46: excluir nota autorizada
   agora explica e aponta para "Cancelar nota"). Manter e cobrir com teste — é regressão cara,
   porque apagar o XML de uma nota válida some com a guarda obrigatória de cinco anos.

**Prompt.**

> Em `src/pages/notas-fiscais/`: "Ver DANFE" (TR-11.1); estilo próprio para nota cancelada, com
> data e a justificativa no `title`; cabeçalho de cada mês com contagem e soma dos valores
> (lendo do XML já parseado — não faça consulta nova); filtros de período/OS/status; "Baixar
> todos do ano" reaproveitando `src/lib/zip.ts` e os mesmos cuidados já testados (nome repetido
> vira `nota (2).xml`, acento correto no Windows, download em lotes de 5). Escreva teste para o
> caminho de exclusão de nota autorizada — ele já está certo e precisa continuar.

---

### `TL-41` · Enviar XML manualmente

*Hoje:* arquivo, mês de competência e OS relacionada (opcional).

1. **[P1·E1] Ler o XML e preencher sozinho.** O arquivo já contém a competência, o valor, o
   número e a chave — perguntar tudo isso ao usuário é exatamente a "entrada redundante" que a
   WCAG 2.2 pede para eliminar, e é onde o erro entra (competência escolhida errada some com a
   nota do mês).
2. **[P1·E1] Recusar duplicidade pela chave de acesso** e recusar arquivo que não seja XML de
   nota, com mensagem clara.
3. **[P1·E1] Vários arquivos de uma vez.** Quem sobe nota antiga sobe um lote, não um por um.
4. **[P1·E1] Sugerir a OS** pela chave/valor quando der para casar.

**Prompt.**

> Em `src/pages/notas-fiscais/ArquivosSection.tsx`: parseie o XML no navegador com `DOMParser`
> (o mesmo caminho já usado e testado em `notaFiscalXmlFornecedor.ts` — sem IA, sem Edge
> Function), preencha competência, número, chave e valor sozinho, deixando editável; recuse
> chave já existente; aceite múltiplos arquivos com uma linha de status por arquivo. Use
> `primeiroDiaDoMesLocal()` para a competência — nunca `toISOString()` (§6 itens 42 e 46).

---

### `TL-42` · Cancelar uma nota emitida

*Hoje:* modal com justificativa de no mínimo 15 caracteres (exigência da Focus NFe), cancelando
de verdade na SEFAZ ou na prefeitura.

1. **[P0·E1] Mostrar o prazo legal e quanto falta.** A NFC-e tem janela curta para cancelamento
   (varia por UF, tipicamente muito menor que a da NF-e), e a NFS-e varia por município. Depois
   do prazo, o caminho é outro (carta de correção, nota de ajuste, ou nada) — e descobrir isso
   *depois* de tentar é o pior momento.
2. **[P1·E1] `↗ TR-11.4`** — perguntar o motivo estruturado ("erro na nota, vou reemitir" vs.
   "a venda foi desfeita") e, no segundo caso, oferecer os passos de estorno.
3. **[P1·E1] Guardar e mostrar o protocolo de cancelamento.** É o comprovante; hoje ele volta da
   Focus NFe e se perde.
4. **[P1·E1] Sugestões de justificativa** ("Erro de digitação no valor", "Venda cancelada pelo
   cliente") — o mínimo de 15 caracteres hoje é preenchido com qualquer coisa.

**Prompt.**

> Em `CancelarNotaModal.tsx` e `src/lib/focusNfe.ts`: calcule e mostre o tempo restante do prazo
> de cancelamento a partir da data de emissão, com o prazo configurável por tipo de nota em
> Configurações → Dados fiscais (padrão conservador, e um texto dizendo que varia por
> estado/município — **não chute um número na marra**); sugestões de justificativa em botões que
> preenchem o campo; grave o protocolo de cancelamento em `notas_fiscais_arquivos` (migration
> aditiva) e mostre-o na lista. O motivo estruturado do TR-11.4 entra aqui.

---

## Funcionários

### `TL-43` · Lista de funcionários

*Hoje:* nome, cargo, login (quando é operador), status. Todo operador criado ganha uma ficha
aqui automaticamente.

1. **[P1·E1] Mostrar o acesso de cada um**, não só o login. "@bruna — Início, Clientes, OS,
   Estoque, Caixa" responde a pergunta que hoje exige abrir Configurações e cruzar as duas
   telas.
2. **[P1·E1] Filtro ativo/inativo** e indicação de quem é só cadastro (não loga).
3. **[P1·E1] Comissão do mês na linha** (o dado já é calculado na aba ao lado).

**Prompt.**

> Em `src/pages/funcionarios/FuncionariosSection.tsx`: coluna de módulos liberados (resumida,
> completa no `title`), lida de `operadores.permissoes` via o vínculo `operador_id`; filtro de
> status; coluna de comissão do mês corrente. **Cuidado**: essa tela vai passar a ler
> `operadores` — confira contra o TR-04.4 antes, para não criar dependência que precise ser
> desfeita depois.

---

### `TL-44` · Ficha do funcionário

*Hoje:* identificação, documentos (CPF, RG, CNH, tipo sanguíneo, estado civil), endereço,
contato, cargo/admissão (PIS, CBO, salário, comissão, admissão, férias). Dados de saúde ficaram
de fora de propósito.

1. **[P1·E1] `↗ TR-12.3`** — mascarar documentos, tornar opcionais os campos sem uso, e
   reconsiderar `tipo_sanguineo`, que é dado de saúde num cadastro que deliberadamente deixou
   dado de saúde de fora.
2. **[P1·E1] `data_ferias` não é usada em lugar nenhum.** O campo existe e não aparece no
   calendário, não gera aviso, não faz nada. Ou vira aviso no Início ("Anderson entra de férias
   em 5 dias"), ou some do formulário — campo que não serve para nada só ocupa a atenção de quem
   preenche.
3. **[P1·E1] Validar CPF** (mesma função de TL-06).
4. **[P1·E1] Aniversário no calendário do Início** — o de cliente já aparece; o de funcionário,
   não. É gratuito e é o tipo de detalhe que faz uma equipe gostar do sistema.

**Prompt.**

> Em `src/pages/funcionarios/FuncionarioForm.tsx` e `campos/`: validação de CPF como aviso;
> aniversário e férias de funcionário no calendário do Início (mesmo caminho já usado para
> aniversário de cliente, em `src/lib/feriados.ts`/`calendario.ts`); mascaramento de documentos
> conforme TR-12.3. **Antes de remover qualquer campo**, liste para a usuária quais campos estão
> vazios em todos os funcionários cadastrados — é o dado que mostra o que ninguém usa.

---

### `TL-45` · Ficha do funcionário — Família

*Hoje:* filiação, naturalidade, cônjuge (nome, nascimento, data do casamento, telefone, celular)
e lista de filhos.

1. **[P2·E1] `↗ TR-12.3`** — aba opcional, recolhida por padrão, com um aviso curto de que são
   dados pessoais de terceiros que não têm uso dentro do sistema (nenhuma tela lê esses campos
   hoje; eles existem porque documento de admissão pede).
2. **[P2·E1] Aniversário de filho no calendário** — se os dados vão ser guardados, que pelo
   menos sirvam para alguma coisa boa. Só se ela quiser.

**Prompt.**

> Nenhuma mudança de esquema sem decisão dela. Nesta sessão: recolher a aba por padrão, escrever
> o aviso, e levantar quantos funcionários têm esses campos preenchidos hoje. Levar as duas
> opções (manter com aviso, ou remover os campos sem uso) com o argumento de minimização de
> dados.

---

### `TL-46` · Comissões

*Hoje:* período filtrável; comissão por funcionário separando vendedor (leva pela OS inteira) de
técnico (leva pelos itens que executou); base é o lucro; só conta OS faturada. A tela avisa
quando o número merece desconfiança: OS faturada "a receber" ainda não paga, item sem custo,
funcionário sem porcentagem, OS sem vendedor.

> **Os avisos desta tela são o melhor exemplo de design defensivo do sistema inteiro.** O padrão
> deveria ser copiado para Lucratividade (TL-37) e para o Início (TL-04).

1. **[P1·E2] Fechar e travar o período pago.** Hoje a comissão é sempre recalculada a partir das
   OS. Como agora dá para **editar o valor de um item de OS já lançado** (`v0.9.28`), uma
   correção numa OS antiga muda retroativamente uma comissão que já foi paga — e ninguém fica
   sabendo. Registrar "comissão do período X paga em Y, no valor Z" congela o passado.
2. **[P1·E1] Recibo por funcionário** para imprimir ou mandar — é o documento que acompanha o
   pagamento.
3. **[P1·E1] Os avisos deveriam levar ao conserto.** "Item vendido sem preço de custo" com um
   link que abre aquela peça; "OS sem vendedor" com link para a OS.
4. **[P1·E1] Evolução mês a mês** por funcionário — é o que motiva.

**Prompt.**

> Migration: `comissoes_fechamentos` (loja, funcionario_id, periodo_inicio, periodo_fim,
> valor_calculado, valor_pago, data_pagamento, operador_id, e um `snapshot jsonb` com as OS que
> formaram o número). Em `ComissoesSection.tsx`: botão "Fechar período" que grava o snapshot e
> passa a mostrar o valor congelado para períodos já fechados, com um aviso quando o recálculo
> atual divergir do congelado (é justamente o sinal de que alguém editou uma OS antiga —
> **mostrar, nunca esconder**); recibo por funcionário em HTML para impressão; links nos avisos;
> gráfico simples de evolução usando `GraficoBarras.tsx`. Toda conta continua em
> `src/schemas/comissoes.ts`.

---

## Configurações

### `TL-47` · Operadores e lojas

*Hoje:* cards de operador com permissões visíveis, "Redefinir senha", editar e inativar; cadastro
de lojas; e as seções recolhíveis (juros, categorias, depósitos, texto de garantia, dados
fiscais, cartões do Início).

1. **[P0·E1] Não deixar ficar trancado do lado de fora.** Hoje nada impede um admin de remover a
   própria permissão de admin, de se inativar, ou de inativar o **último** admin da loja. O
   sistema já mostrou que operador sem vínculo de loja vira registro que ninguém consegue
   administrar, e que o conserto foi pelo painel do Supabase (§6 item 23) — ou seja, exige a
   usuária, remotamente. Bloquear as três coisas na origem é uma checagem simples e evita um
   chamado que não tem solução pela tela.
2. **[P1·E1] Último acesso de cada operador** — mostra quem realmente usa o sistema, e quem
   ficou como cadastro morto com acesso ativo.
3. **[P1·E1] Perfis prontos.** Marcar 12 caixas uma a uma para cada operador é lento e propenso
   a erro. Quatro perfis (Balconista, Mecânico, Gerente, Dono) que preenchem as caixas — e que
   continuam editáveis depois — resolvem o caso comum em um clique.
4. **[P1·E1] A seção "Lojas" tem exclusão de verdade**, que já custou dois bugs de FK (§6 itens
   15 e 20). Mostrar antes o que está vinculado, em vez de tentar e falhar.

**Prompt.**

> Em `src/pages/configuracoes/`: bloqueie (com mensagem explicando) remover a própria permissão
> de admin, inativar-se, e inativar/remover o último admin de uma loja — a checagem tem que
> existir **também no banco**, como policy ou trigger, porque a checagem de tela não protege
> nada (TR-04.1). Adicione `operadores.ultimo_acesso timestamptz` atualizada no login e exibida
> no card. Crie os perfis prontos como uma constante em `src/types/operador.ts`
> (`PERFIS_PADRAO`), aplicados por um `select` no formulário que preenche as caixas e continua
> permitindo ajuste manual. Na exclusão de loja, faça a consulta de vínculos **antes** e mostre
> a contagem por tabela, usando o `MAPA-FKS.md` do TR-05.6 como fonte da lista.

---

### `TL-48` · Cadastro de operador

*Hoje:* usuário, nome, senha, marcação de administrador e as caixas de módulos liberados, mais o
multi-select de lojas quando há 2+.

1. **[P0·E1] `↗ TL-47.3`** — perfis prontos.
2. **[P1·E1] Dizer o que a permissão realmente faz.** Enquanto o TR-04.1 não existir, esta tela
   deveria dizer, em uma linha honesta: *"as permissões controlam o que aparece no programa"*.
   Prometer mais do que se entrega é como um dono de loja toma uma decisão errada sobre quem
   contratar para o balcão.
3. **[P1·E1] Senha temporária gerada automaticamente** na criação, mostrada uma vez, com troca
   obrigatória no primeiro login — é exatamente o desenho que a redefinição de senha já tem
   (`deve_trocar_senha`), e não faz sentido a criação ser diferente.
4. **[P1·E1] Pré-visualizar o menu** que aquele operador vai ver, ao lado das caixas.

**Prompt.**

> Em `OperadorForm.tsx`: `select` de perfil que preenche as permissões; texto honesto de uma
> linha sobre o alcance da permissão (atualizar quando o TR-04.1 estiver pronto); geração
> automática de senha temporária com `deve_trocar_senha = true` (reaproveitando a Edge Function
> `redefinir-senha-operador`, em vez de escrever um caminho novo); e um painel lateral que
> mostra, ao vivo, o menu resultante — usando o mesmo cálculo que a `Sidebar` usa, não uma cópia.

---

### `TL-49` · Dados fiscais da loja

*Hoje:* CNPJ, inscrições, razão social, nome fantasia, regime tributário, endereço, contato,
token e ambiente da Focus NFe, e os campos de NFS-e (código IBGE do município, item da LC 116,
alíquota de ISS, código tributário, CNAE).

1. **[P0·E1] Dizer o que vai para a nota e o que não vai.** O status registra isso como "engano
   fácil de cometer": **só o CNPJ** (mais inscrição municipal, código do município, CNAE e
   alíquota na NFS-e) é enviado. Razão social, inscrição estadual, endereço e regime **não saem
   na nota** — a emitente de verdade é a empresa cadastrada no painel da Focus NFe. Esses campos
   alimentam o documento de garantia. Uma linha por bloco resolve, e economiza uma tarde de
   alguém corrigindo o endereço e esperando a nota mudar.
2. **[P0·E1] O ambiente precisa gritar.** "Homologação" e "Produção" num `select` discreto é
   perigoso nos dois sentidos: emitir de mentira achando que é de verdade, ou o contrário. Faixa
   colorida fixa no topo do app quando estiver em homologação.
3. **[P0·E1] Token como campo de senha, com "Testar token"** — hoje ele aparece mascarado na
   tela, mas convém garantir que não vaza em log nem em diagnóstico (TR-08.1).
4. **[P1·E1] Avisar o que falta para emitir.** Uma lista de conferência no topo: "Faltam 2 campos
   para emitir NFS-e: alíquota de ISS e código tributário do município" (`↗ TR-11.3`).
5. **[P1·E1] Depois do TR-04.2, o campo de token some daqui.**

**Prompt.**

> Em `DadosFiscaisSection.tsx`: divida em três blocos com título e uma linha de explicação cada
> — "Vai para a nota fiscal", "Vai para o documento de garantia", "Integração". Faixa fixa e
> inconfundível no topo do app quando `focus_nfe_ambiente = 'homologacao'`. Botão "Testar token"
> chamando um endpoint de consulta simples da Focus NFe, com o resultado explicado em português.
> Lista de conferência do que falta para cada tipo de nota, usando
> `src/schemas/conferenciaFiscal.ts` (TR-11.3). Garanta, com teste, que o token não aparece em
> `erros.log` nem no pacote de diagnóstico.

---

### `TL-50` · Juros de parcelamento

*Hoje:* percentual por número de parcelas (2 a 12), por loja.

1. **[P1·E1] Simulação ao lado.** Digitar "4,24%" para 5x não diz nada; "R$ 1.000 em 5x =
   R$ 208,48 por parcela, total R$ 1.042,40" diz tudo. É como se confere se o número está certo,
   e é o número que o cliente vai ouvir no balcão.
2. **[P1·E1] Escrever que só vale para cartão de crédito** — está implícito no código e não na
   tela.
3. **[P2·E1] Importar a tabela da maquininha.** Os percentuais vêm da adquirente; digitar 11
   campos à mão é onde entra erro de um dígito que ninguém percebe.

**Prompt.**

> Em `JurosParcelasSection.tsx`: coluna de simulação ao vivo ao lado de cada parcela, com um
> valor de referência editável (padrão R$ 1.000), usando `calcularListaParcelas` de
> `src/schemas/faturamento.ts` — a mesma função do faturamento, nunca uma conta paralela; texto
> explicando que o juro incide só sobre a parte paga em cartão de crédito (que é o que o código
> já faz desde 28/08); e um aviso quando um percentual for menor que o da parcela anterior, que
> é quase sempre erro de digitação.

---

### `TL-51` · Categorias e depósitos

*Hoje:* depósitos por loja, categorias de produto, de serviço e de caixa; cada uma com adicionar
e remover.

1. **[P1·E1] Mostrar quantos registros usam cada categoria.** É o que permite limpar as que
   ninguém usa e é o que impede apagar a que está em uso.
2. **[P1·E1] Explicar por que não dá para excluir**, com o número, em vez de o botão falhar —
   é a família de bug mais recorrente do projeto (ação sem efeito visível).
3. **[P1·E1] Renomear em vez de apagar e recriar** — recriar perde o vínculo dos registros
   antigos em silêncio.
4. **[P2·E1] Categorias de caixa com tipo visível** (entrada/saída) na própria lista — hoje as
   duas listas convivem e o tipo não aparece.

**Prompt.**

> Em `CategoriasSection.tsx`, `CategoriasServicoSection.tsx`, `CategoriasCaixaSection.tsx` e
> `DepositosSection.tsx`: contagem de uso ao lado de cada item (uma consulta agregada só, não
> uma por linha); ao tentar excluir item em uso, mensagem explicando com o número e oferecendo
> inativar; edição do nome no lugar. **Cuidado de contraste já documentado** (§6 item 17): as
> linhas de edição inline de Loja e Depósito já foram o lugar do bug de "texto invisível" por
> `bg-white/10` — não reintroduzir fundo claro em torno de campo.

---

### `TL-52` · Texto de garantia

*Hoje:* textarea com o modelo e os marcadores `{cliente}`, `{veiculo}`, `{itens}`, `{data}`,
substituídos na hora de gerar o documento.

1. **[P1·E1] Pré-visualização ao vivo** com dados de exemplo, ao lado do editor. Hoje é preciso
   salvar, ir numa OS, gerar a garantia e voltar para ver se ficou bom.
2. **[P1·E1] Marcadores clicáveis** que inserem no ponto do cursor, com a lista sempre visível
   — hoje eles estão descritos no texto de ajuda acima do campo, o que exige digitar certinho.
3. **[P1·E1] Avisar marcador inexistente** (`{placa}` que ninguém implementou vira texto literal
   no documento entregue ao cliente).
4. **[P2·E1] Marcadores que faltam:** `{placa}`, `{km}`, `{prazo}`, `{loja}`, `{os}`.

**Prompt.**

> Em `TextoGarantiaSection.tsx`: painel de preview ao lado, renderizando com dados de exemplo a
> cada tecla (usando `src/lib/garantiaTexto.ts`, a mesma função da geração real); barra de
> marcadores clicáveis; aviso ao encontrar `{algo}` que não esteja na lista de marcadores
> conhecidos. Acrescente os marcadores novos em `garantiaTexto.ts` com teste para cada um.

---

## Auditoria

### `TL-53` · Trilha de auditoria

*Hoje:* admin-only, lista quem editou ou excluiu o quê e quando, com filtro por tabela e por
operador. Gravada por trigger de banco, então pega alteração feita por qualquer caminho.

> Gravar por trigger em vez de pelo código do app foi a decisão certa e é o que dá valor real a
> este módulo. Não mexer nisso.

1. **[P1·E1] `↗ TR-04.9`** — cobrir criação e `ordens_servico_itens`, que agora é editável.
2. **[P1·E1] Filtro por período e busca por registro.** Hoje só tabela e operador; a pergunta
   real costuma ser "o que aconteceu com a peça X" ou "o que mudou ontem".
3. **[P1·E1] Nomes em português das tabelas** e da ação — a tela já mostra "Peças", "Ordens de
   Serviço"; garantir que a lista de rótulos cubra todas as tabelas novas e não caia no nome
   técnico quando aparecer uma que não está mapeada.
4. **[P2·E1] Exportar o resultado filtrado.**

**Prompt.**

> Em `src/pages/auditoria/` e `src/lib/auditoria.ts`: filtros de período e busca por
> `registro_id` (e por texto dentro de `dados_antes`/`dados_depois`, com índice GIN em `jsonb`
> se a medição justificar); mapa de rótulos em português com fallback explícito
> (`"Tabela: pedidos_compra"` em vez de esconder) para não sumir com evento de tabela nova;
> exportação CSV. O TR-04.9 é pré-requisito e vem antes.

---

### `TL-54` · Detalhe de uma alteração

*Hoje:* modal com o registro inteiro antes e depois, em JSON.

1. **[P1·E1] Diferença destacada, campo a campo.** JSON lado a lado obriga a comparar com o
   olho, linha por linha. Só os campos que **mudaram**, com rótulo em português, valor antigo e
   valor novo, é o que responde a pergunta em um segundo ("quem mudou esse preço?" — que é
   literalmente o exemplo do próprio guia em PDF).
2. **[P1·E1] Esconder campos técnicos por padrão** (`id`, `criado_em`, `loja_id`), com um "ver
   tudo" que mostra o JSON cru — que continua sendo útil para investigação.
3. **[P1·E1] Formatar valores** com o mesmo formato do resto do app: dinheiro como R$, data como
   dd/mm/aaaa, booleano como Sim/Não.
4. **[P1·E1] Link para o registro** (abrir a peça, a OS, o cliente que foi alterado).

**Prompt.**

> Crie `src/components/DiffAuditoria.tsx`: recebe `dados_antes`/`dados_depois`, calcula os
> campos alterados, e mostra uma tabela de três colunas (campo, antes, depois) com rótulo em
> português, formatação por tipo e destaque de mudança. Campos técnicos recolhidos, com "ver
> JSON completo" preservado. Link para o registro quando a tabela for reconhecida. Reaproveite
> os formatadores que já existem no app (não escreva novos) e o mapa de rótulos do TL-53.

---
# Parte 3 — Funcionalidades que faltam

> **Como esta lista foi montada.** Cada item aqui é algo que (a) os sistemas concorrentes do
> ramo vendem como recurso de capa, (b) resolve uma dor concreta de quem toca um autocenter ou
> borracharia, e (c) **não existe em nenhuma das 54 telas** do Sakura System hoje. Estão em
> ordem de valor por esforço, não de tamanho.
>
> **Nada aqui deve ser construído sem ela pedir.** O status registra, com data e citação, a
> lição de 28/08: *"estou pensando em fazer X com você no fim de semana" é plano, não
> autorização*. Esta lista existe para ela escolher, não para ser executada.

---

### `FN-01` — Orçamento separado da OS, com aprovação do cliente — **P1 · E3**

**O que falta.** Hoje toda OS nasce direto em `em_andamento`. Não existe o passo anterior:
montar o valor, mostrar ao cliente, e só virar OS quando ele aprovar.

**Por quê.** É o recurso mais vendido pelos concorrentes do ramo — "orçamento enviável pelo
WhatsApp com aprovação do cliente" aparece na primeira dobra da página de praticamente todos.
E resolve um problema real de oficina: o carro entra, o mecânico diagnostica, o cliente some, e
alguém precisa lembrar de cobrar uma resposta. Sem orçamento, ou a loja começa o serviço sem
aprovação (e brigа depois), ou o valor fica anotado num papel.

**Desenho sugerido.**

> Não criar tabela nova: acrescentar `orcamento` como um status **anterior** a `em_andamento` em
> `ordens_servico`, com a regra de que OS em orçamento **não dá baixa no estoque** (é a única
> diferença real de comportamento). Campos novos: `validade_orcamento`, `aprovado_em`,
> `aprovado_por` (texto livre — quem autorizou pelo telefone). Transições: Orçamento → Aprovado
> (vira `em_andamento` e aí sim baixa o estoque) ou Orçamento → Recusado (com motivo, que vira
> relatório: *por que a gente está perdendo serviço?*). A lista de OS ganha os dois status no
> filtro, e o Início ganha "orçamentos aguardando resposta".
>
> **A parte delicada** e que precisa de decisão dela: a baixa de estoque hoje acontece no
> lançamento do item. Passar a acontecer na aprovação muda um comportamento que já está em uso
> real — precisa ser conversado, não decidido aqui.

---

### `FN-02` — Checklist de entrada do veículo, com fotos — **P1 · E3**

**O que falta.** Não há registro do estado do carro quando ele chega.

**Por quê.** É padrão no ramo ("O.S. com fotos e checklists", "registro de diagnósticos com
fotos") e existe por um motivo específico: **disputa**. O cliente volta dizendo que o
para-choque estava inteiro, que o tanque estava cheio, que o rádio estava lá. Sem foto da
entrada, a loja paga. Com foto, a conversa acaba em trinta segundos. Para uma borracharia, o
equivalente é a foto do pneu antes de mexer — sulco, bolha, reparo antigo.

**Desenho sugerido.**

> Tabela `os_checklist_itens` (ordem_servico_id, item, estado, observacao) e
> `os_fotos` (ordem_servico_id, momento `entrada`/`saida`, storage_path, descricao). Modelos de
> checklist configuráveis por tipo de serviço (Configurações), porque "revisão completa" e
> "troca de pneu" não têm nada em comum. Nível de combustível, KM e avarias visíveis no
> checklist de entrada.
>
> **O ponto que decide se isso é usado ou não é a captura da foto.** Num app Electron de balcão,
> ninguém vai pegar o celular, mandar por WhatsApp e anexar. As duas saídas realistas: uma
> webcam no balcão (`getUserMedia`, funciona no Chromium do Electron) ou uma página de upload
> aberta no celular por QR Code, vinculada àquela OS. A segunda é melhor e é `E3` de verdade —
> exige uma rota web fora do Electron. **Levar as duas para ela decidir antes de construir
> qualquer coisa**, porque construir o banco e depois descobrir que ninguém tira foto é o pior
> resultado possível.

---

### `FN-03` — WhatsApp em toda parte — **P0 · E2**

**O que falta.** Nenhum botão de WhatsApp no sistema inteiro.

**Por quê.** É o canal por onde essa operação já funciona — o status registra que o pai dela
manda dados e fotos de nota por WhatsApp, que ela conversa com a contabilidade e com o suporte
por lá, e que a senha temporária é repassada "por WhatsApp ou pessoalmente". O sistema é a
única parte do fluxo que ignora isso. E o custo é quase zero: `https://wa.me/<numero>?text=<texto>`
aberto pelo navegador padrão.

**Onde entra, em ordem de valor:**

1. **Cobrança** de conta a receber vencida (TL-33) — texto com o valor, a data e a descrição.
2. **"Seu carro está pronto"** — a partir da OS concluída, com o total.
3. **Orçamento** para aprovação (depende de FN-01).
4. **Garantia** e **recibo/DANFE** — mandar o documento em vez de imprimir.
5. **Pedido de compra** para o fornecedor (TL-21).
6. **Lembrete de revisão** (depende de FN-06).

**Prompt.**

> Crie `src/lib/whatsapp.ts`: normaliza o telefone para o formato internacional (55 + DDD +
> número, tratando os casos brasileiros — nono dígito, número com e sem DDI, número fixo),
> monta o texto a partir de **modelos editáveis em Configurações** (não texto fixo no código:
> cada loja fala do seu jeito, e ela vai querer ajustar), e abre pelo `shell.openExternal` do
> Electron **com a URL validada** contra `https://wa.me/` — é o item 15 do checklist de
> segurança do Electron, e URL montada com dado do banco é exatamente o caso que ele alerta.
> Marcadores nos modelos no mesmo padrão do texto de garantia (`{cliente}`, `{valor}`,
> `{vencimento}`, `{os}`, `{placa}`, `{loja}`), reaproveitando a função de substituição que já
> existe. Registre que a mensagem foi aberta (não que foi enviada — isso o sistema não tem como
> saber, e prometer isso seria mentira).

---

### `FN-04` — Ficha do veículo: a linha do tempo por placa — **P1 · E2**

**O que falta.** Dá para buscar OS por placa, mas não existe uma tela do **veículo**: tudo que
já foi feito nele, quando, por quanto, com que KM, e o que está em garantia.

**Por quê.** É a pergunta que chega no balcão junto com o carro, e é o ativo que a loja constrói
sem perceber. Também é o que sustenta FN-06 (lembrete de revisão) e o que transforma "troca de
óleo" em "sua última troca foi há 8 meses e 9.000 km".

**Prompt.**

> Rota `/veiculos/:id` com: cabeçalho (placa, marca/modelo/ano/cor, dono atual, KM mais
> recente), linha do tempo de OS (data, KM, itens, total), peças em garantia com data de
> vencimento, total já gasto, e média de dias entre visitas. Nenhuma tabela nova — tudo já
> existe. Ligue essa tela a partir da busca global (TR-03.3), da lista de clientes, da lista de
> OS e de Garantias. O KM da linha do tempo sai de `ordens_servico.km_entrada`, que já é
> gravado e hoje não é usado para nada depois da abertura.

---

### `FN-05` — Agenda — **P2 · E3**

**O que falta.** Não há agendamento de nenhum tipo.

**Por quê.** Todo concorrente tem, e para autocenter faz diferença real: alinhamento e
geometria têm equipamento único, e dois carros agendados no mesmo horário viram cliente
esperando na calçada. Para a Pneus Amigão, com 3 carros/dia, isso é excesso de sistema. Para uma
loja de 30 carros/dia (que é o perfil das ~30 lojas-alvo da fase 3), é necessidade.

**Nota honesta.** Este é o item desta lista com pior relação valor/esforço **hoje**. Está aqui
para não ser esquecido na fase 3, não para ser construído agora. Se for construído, o mínimo
viável é um calendário semanal com blocos (cliente, veículo, serviço, tempo estimado de
`servicos.tempo_estimado_min` — ver TL-25) que viram OS com um clique.

---

### `FN-06` — Lembrete de retorno e revisão — **P1 · E2**

**O que falta.** O sistema sabe tudo que precisa (o que foi feito, quando, com que KM, a média
de rodagem do cliente) e não faz nada com isso.

**Por quê.** É o recurso que **gera receita** em vez de só organizar: "alertas automáticos de
revisão e retorno" é vendido por todo concorrente porque funciona. Troca de óleo tem prazo,
rodízio de pneu tem quilometragem, alinhamento tem intervalo. Um cliente que recebe a mensagem
volta; um que não recebe, vai no concorrente que mandou. E o custo marginal é zero — a loja já
tem o telefone e o histórico.

**Prompt.**

> Migration: `servicos.intervalo_dias` e `servicos.intervalo_km` (opcionais). Ao faturar uma OS
> com um serviço que tenha intervalo, gravar em `retornos_previstos` (veiculo_id, servico_id,
> previsto_em, previsto_km, status). Uma tela "Retornos" (ou uma aba em Clientes) lista quem
> está na janela, ordenado por atraso, com o botão de WhatsApp do FN-03 já com o texto pronto.
> A previsão por KM usa a média de rodagem daquele veículo, calculada a partir do histórico de
> `km_entrada` (FN-04) — **e mostra que é estimativa**, nunca como se fosse fato.
>
> **Cuidado que precisa estar no desenho**: isso é comunicação de marketing para o cliente final
> da loja. A lista precisa de um "não avisar este cliente" respeitado para sempre, e o texto
> precisa ser útil (lembrete de manutenção), não propaganda. Mandar mensagem demais destrói o
> canal que o FN-03 abriu.

---

### `FN-07` — Sugestão de compra a partir do estoque — **P1 · E2**

**O que falta.** O ciclo compra → estoque → venda está quase inteiro, e falta o elo que fecha:
o sistema nunca diz *o que comprar*.

**Por quê.** Peça em falta com o carro no pátio é venda perdida na hora — e em borracharia, o
cliente vai na loja do lado no mesmo dia. Com estoque mínimo (TL-11) e histórico de consumo
(movimentações), o sistema consegue responder "compre isto, nesta quantidade, deste fornecedor,
por este preço" — e o preço por fornecedor já existe em `cotacoes_pecas`, que é a peça mais rara
desse quebra-cabeça e já está construída.

**Prompt.**

> Depende de TL-11 (estoque mínimo). Tela "Sugestão de compra": peças abaixo do mínimo ou com
> consumo médio que zera o saldo em menos de N dias, com quantidade sugerida, o fornecedor mais
> barato da última cotação e o valor total estimado. Botão "Gerar pedidos" que cria **um pedido
> de compra por fornecedor**, já com os itens e preços. Consumo médio calculado em
> `src/schemas/estoque.ts`, como função pura testada.

---

### `FN-08` — Devolução e troca — **P1 · E2**

**O que falta.** Nenhum caminho para "o cliente devolveu a peça" ou "a peça voltou com defeito".

**Por quê.** Acontece toda semana em loja de peça, e hoje o conserto é manual: movimentação de
entrada à mão, lançamento de saída no caixa à mão, e a nota fiscal cancelada por outro caminho —
três gestos desconexos, nenhum ligado ao outro, nenhum auditável como um evento só. É também a
outra metade da resposta para a pergunta em aberto do TR-11.4.

**Prompt.**

> Desenho a alinhar com ela: uma "OS de devolução" vinculada à OS original, com os itens
> devolvidos (quantidade parcial permitida), que gera de uma vez: entrada de estoque com motivo
> próprio e referência à OS original, saída no caixa (ou abatimento na conta a receber), e o
> aviso de que a nota fiscal precisa ser cancelada ou complementada — **sem cancelar sozinho**,
> porque isso é decisão fiscal. Registrar o motivo (defeito, arrependimento, peça errada) —
> defeito por fornecedor vira o relatório que dá poder na conversa com ele (ver TL-38.2).

---

### `FN-09` — Venda de balcão sem OS — **P0 · E2**

**O que falta.** Tudo passa por ordem de serviço. Vender um pneu, uma bateria ou um par de
palhetas para quem não vai deixar o carro exige abrir uma OS com cliente e veículo.

**Por quê.** É venda de peça pura, e ela existe todo dia numa borracharia. Hoje o operador tem
três saídas ruins: abrir uma OS "de mentira" (que polui a lista de OS, o ticket médio e o
relatório), lançar direto no caixa (que **não baixa o estoque** e não emite NFC-e) ou não
registrar. Todas erradas. Os concorrentes chamam isso de PDV e é um módulo separado justamente
por isso.

**Prompt.**

> Não construir um módulo de PDV inteiro. O caminho barato e coerente com o que já existe: uma
> OS **sem veículo obrigatório e sem cliente obrigatório**, marcada com um tipo `venda_balcao`,
> que pula direto para o faturamento — uma tela só, com leitor de código de barras (TL-11),
> itens, total, forma de pagamento e "Faturar e emitir NFC-e". Todo o resto (baixa de estoque,
> caixa, nota, garantia) reaproveita o que já funciona. Nas listas e relatórios, venda de balcão
> aparece separada de OS, para não distorcer ticket médio nem tempo de serviço.
>
> **Decisão que precisa dela**: hoje `ordens_servico.cliente_id` é obrigatório. Tornar opcional
> é migration e mexe numa regra em uso. A alternativa é um cliente "Consumidor" fixo — mais
> feio, mas sem migration. Levar as duas.

---

### `FN-10` — Impressão térmica de 80 mm — **P1 · E2**

**O que falta.** Os documentos (garantia, recibo, DANFE) são HTML pensados para folha A4.

**Por quê.** Balcão de loja imprime em bobina, não em A4 — é mais barato, mais rápido e é o que
já está no balcão por causa da impressora fiscal. Um HTML de A4 numa térmica sai cortado ou sai
em três folhas.

**Prompt.**

> Uma folha de estilo de impressão para 80 mm (`@media print` + `@page { size: 80mm auto }`),
> com um layout enxuto (loja, OS, itens, total, forma de pagamento, garantia resumida) e a opção
> de escolher o formato na hora de imprimir. Reaproveite o `iframe` de impressão já usado em
> "Ver garantia" e "Versão para o cliente" — o mecanismo existe, falta o estilo. Teste com a
> impressora real na loja (isso só ela pode fazer) antes de considerar pronto.

---

### `FN-11` — Clientes que sumiram — **P2 · E1**

**O que falta.** Nenhuma visão de "quem não volta há muito tempo".

**Por quê.** É o relatório mais barato de construir com maior retorno direto: a base já está
paga, o telefone já está cadastrado, e trazer de volta quem já comprou custa uma fração de
conquistar cliente novo. Com o FN-03, vira uma ação de uma tarde.

**Prompt.**

> Filtro em Clientes (TL-05): "sem visita há mais de X meses", com o total já gasto e o último
> serviço feito, ordenado por valor. Botão de WhatsApp com modelo editável. Nada além disso —
> o valor está na simplicidade.

---

### `FN-12` — Metas e comparação — **P2 · E2**

**O que falta.** Os números existem (vendas, lucro, ticket médio, por dia/semana/mês/ano) e não
há nada com que compará-los além do período anterior.

**Por quê.** É o que transforma relatório em gestão: "faltam R$ 4.200 para bater a meta do mês,
e faltam 6 dias úteis" muda o comportamento de quem está no balcão; "vendemos R$ 15.872" não
muda nada. E é barato — os dados já estão todos calculados.

**Prompt.**

> Migration pequena: `metas` (loja, mes, tipo `vendas`/`lucro`/`os`, valor). Um cartão no Início
> com o progresso e o ritmo necessário para o resto do mês. Configuração em Configurações. Todo
> o cálculo em `src/schemas/metricasCaixa.ts`.

---

### `FN-13` — Relatório mensal para a contabilidade — **P1 · E2**

**O que falta.** Toda a informação que a contabilidade pede existe espalhada em quatro telas, e
o único pacote pronto é o `.zip` de XMLs.

**Por quê.** É uma tarefa mensal, repetitiva e chata, que o sistema pode fazer inteira. E é o
tipo de coisa que faz o **contador do cliente** recomendar o sistema — que é um canal de venda
que ninguém compra com anúncio.

**Prompt.**

> Uma tela "Fechamento do mês" que gera, num pacote só: o `.zip` de XMLs (já existe), um CSV de
> vendas por dia, um CSV de despesas por categoria, o resumo de faturamento por forma de
> pagamento, e as notas canceladas do período. Formato CSV com BOM UTF-8, para abrir certo no
> Excel brasileiro. **Perguntar à contabilidade dela exatamente o que eles pedem antes de
> construir** — é uma pergunta curta por WhatsApp e evita construir o pacote errado.

---

### `FN-14` — Modo demonstração — **P2 · E1**

**O que falta.** Para mostrar o sistema a um dono de loja, hoje é preciso mostrar a Pneus Amigão
— com os clientes, os preços e o faturamento reais da loja do pai dela.

**Por quê.** É problema de venda e de privacidade ao mesmo tempo. E a solução **já está pronta
no repositório**: `site/ferramentas/banco-falso.mjs` + `dados-demo.mjs` cobrem todas as tabelas
com dados inventados, e foi isso que gerou as 54 imagens do guia.

**Prompt.**

> Reaproveite o banco falso que já existe: um modo demonstração ligado por uma chave especial na
> tela de conexão (ex: a palavra `demo` no lugar da URL), que roda o app inteiro contra os dados
> inventados, com uma faixa permanente "MODO DEMONSTRAÇÃO" e gravação desabilitada. Custo baixo,
> e resolve a apresentação para as 30 lojas da fase 3 sem expor nenhum dado real.

---

### `FN-15` — Importar dados do sistema antigo — **P2 · E3**

**O que falta.** Uma loja que já usa outro sistema precisa recadastrar cliente, veículo e peça
na mão para entrar.

**Por quê.** Está listado como "futuro" no status, e é a maior barreira prática de troca de
sistema no ramo — mais que preço. Uma loja com 2.000 clientes cadastrados não troca de sistema
para digitar tudo de novo.

**Prompt.**

> Não construir "importador universal" — isso não existe. Construir um importador de **CSV com
> mapeamento de colunas**: a pessoa sobe o arquivo, escolhe qual coluna é o quê, vê uma
> pré-visualização das 10 primeiras linhas, e importa em lote com relatório de erros linha a
> linha. Comece por Clientes + Veículos (que é o que mais dói) e depois Peças. Reaproveite o
> padrão de revisão em tabela editável que o "Importar por foto" (TL-13) já usa — a usuária já
> conhece essa tela e o código já existe.

---
# Parte 4 — Roteiro sugerido

> Uma ordem possível, não uma obrigação. A lógica dela é: primeiro o que **protege** o que já
> existe, depois o que **dói hoje**, depois o que **destrava a venda**, e por último o que só
> importa na escala.

## Etapa 0 — Antes de qualquer item deste guia

> **Situação em 30/09/2026**: os itens 1 e 2 já foram resolvidos; o 3 continua pendente (ver o
> quadro no topo deste arquivo).

1. **Perguntar se é para publicar a `v0.9.29`.** Está pronta, validada e segurada por decisão
   dela. Enquanto isso, o PC da loja está na `v0.9.28`: a edição de item já chegou lá, o aviso
   de código fiscal e a correção da importação ainda não.
2. **Decidir o que fazer com a branch `claude/cool-lamport-uzyh8w`** — o gerador das 54 telas
   está commitado lá, sem PR aberto. Se ninguém mesclar, esse trabalho fica parado. Vários itens
   deste guia dependem dele (TR-01.3, TR-07.4).
3. **Trocar as três credenciais expostas** (`TR-04.7`). Não é código, é uma tarde dela, e cada
   dia que passa é um dia a mais com o repositório público carregando os segredos no histórico.

## Etapa 1 — Fundação barata que protege tudo o resto *(1–2 sessões)*

`TR-07.1` CI · `TR-05.5` trava de fuso · `TR-06.2` teste de arquitetura · `TR-05.3` tipo de
coluna de dinheiro · `TR-04.7` gitleaks.

> São cinco itens `E1` que, juntos, param de deixar erro conhecido voltar. É a etapa com melhor
> retorno do guia inteiro e a única que protege **as sessões futuras**, que não têm memória
> desta conversa.

## Etapa 2 — O que dói hoje, no balcão *(3–5 sessões)*

`TR-02.1` alvos de clique · `TR-02.2` foco visível · `TR-02.3` foco no modal · `TR-01.1` escala
tipográfica · `TR-01.3` auditoria de contraste · `TL-04` cartões e calendário do Início ·
`TL-08` cadastrar cliente sem sair da OS · `TL-11`/`TL-12` estoque mínimo e campos fiscais ·
`TR-11.1` reabrir o DANFE · `TR-11.2` aviso da alíquota mensal · `TL-27` categoria obrigatória
no caixa · `FN-03` WhatsApp.

> Ordenada por quantas vezes por dia alguém esbarra no problema. `FN-03` está aqui, apesar de
> ser funcionalidade nova, porque custa pouco e muda a relação da loja com o cliente.

## Etapa 3 — Confiança nos números *(2–3 sessões)*

`TR-06.1` testes de propriedade · `TR-06.3` teste-ouro da nota · `TR-05.1` constraints ·
`TR-05.2` uma nota por OS · `TR-07.2` teste de tela · `TR-06.4` fechamento de caixa ·
`TL-46.1` travar comissão paga.

> Esta etapa fecha a área com o pior histórico do projeto. Depois dela, uma sexta divergência de
> conta de dinheiro deixa de ser provável.

## Etapa 4 — Antes da segunda empresa *(o bloco pesado — 5+ sessões)*

`TR-04.1` RLS por módulo · `TR-04.3` dado de RH · `TR-04.9` auditoria completa ·
`TR-07.3` matriz de RLS · `TR-04.2` token da Focus NFe na Edge Function ·
`TR-12.1` backup próprio e testado · `TR-09.1` canal de teste · `TR-09.2` rollback ·
`TR-08.1` diagnóstico · `TR-04.6` endurecer o Electron · `TR-05.7` versão do esquema ·
`TR-12.2` contrato e papéis.

> **Nenhuma loja de terceiro deveria entrar antes desta etapa fechar.** Não por perfeccionismo:
> porque cada item aqui é uma coisa que, dando errado com dado de outra empresa, não tem
> conserto pela tela — e a decisão de 28/08 colocou essa responsabilidade no nome dela.

## Etapa 5 — Escala e produto *(fase 3)*

`TR-03.1` menu agrupado · `TR-03.3` busca global · `TR-03.5` paginação · `TR-10.1` offline ·
`TR-08.2` pulso das lojas · `TR-11.6` checklist de ativação fiscal · `TR-09.3` assinatura de
código · `TR-12.4` exportar dados · `FN-01`, `FN-02`, `FN-06`, `FN-07`, `FN-09`, `FN-13`,
`FN-14`.

---

# Apêndice A — Checklist de "pronto"

Colar no corpo do PR, com uma resposta por linha. Item que não se aplica leva "n/a" e o motivo.

```
[ ] Contradiz alguma decisão travada da §3 do PROJETO_STATUS.md?     ( ) não  ( ) sim → alinhado com ela em: ____
[ ] npm install && tsc -b && npm run lint && npm test && npm run contraste — tudo limpo
[ ] Mexeu em migration? Rodada DUAS vezes num Postgres local, do zero (idempotência)
[ ] Mexeu em migration? npm run gerar-instalacao rodado e o SQL único commitado
[ ] Mexeu em policy/RLS? Existe policy para os QUATRO comandos (select/insert/update/delete)
[ ] Mexeu em policy/RLS? A matriz de expectativas (TR-07.3) foi atualizada
[ ] Mexeu em tela? Conferida por preview RENDERIZADO do componente real, não por leitura de código
[ ] Mexeu em tela? Nenhum fundo bg-white/* em volta de input/select/textarea
[ ] Conta de dinheiro nova? Está em src/schemas/, como função pura, com teste
[ ] Data? Usa hojeLocal()/diaLocal(). Nenhum toISOString().slice(0,10) novo
[ ] Ação nova numa tabela? Tem try/catch chamando setErro(mensagemDeErro(err))
[ ] Validação nova? É AVISO, não tranca — ou é certeza absoluta e está documentado o porquê
[ ] Segredo? Nenhuma credencial no código, no PROJETO_STATUS.md, no log ou no diagnóstico
[ ] Mexeu no preload/main do Electron? Testado no Electron REAL (Playwright + xvfb-run)
[ ] A memória foi atualizada (docs/licoes.md, docs/modulos.md ou docs/pendencias-e-futuro.md, conforme o caso)
[ ] O que este PR NÃO faz está escrito, para a próxima sessão não achar que está pronto
```

---

# Apêndice B — Referências

**As fontes do projeto** (as mais importantes — este guia é, em boa parte, uma releitura delas):

- `PROJETO_STATUS.md`, §3 (decisões travadas), §5 (modelagem), §6 (47 dívidas e padrões de bug),
  §7 (estado por módulo), §8 (o que não existe) e as seções "Onde tudo parou".
- `sakurasystemguia.pdf` — o catálogo das 54 telas, 10/09/2026.

**Acessibilidade e usabilidade** (a base dos eixos TR-01, TR-02 e TR-03):

- W3C — *Web Content Accessibility Guidelines (WCAG) 2.2*, recomendação de 05/10/2023. Os
  critérios citados nominalmente aqui: **2.5.8** Target Size (Minimum, AA, 24×24 px CSS),
  **2.4.11** Focus Not Obscured (AA), **2.4.13** Focus Appearance (AAA), **3.3.7** Redundant
  Entry (A), **3.3.8** Accessible Authentication (AA), **1.4.3**/**1.4.11** contraste (4,5:1
  texto normal, 3:1 texto grande e componentes).
  <https://www.w3.org/TR/WCAG22/> · resumo prático: <https://dequeuniversity.com/resources/wcag-2.2/>
- Jakob Nielsen — *10 Usability Heuristics for User Interface Design* (1994, revisado 2024).
  Usadas aqui: nº 1 visibilidade do estado, nº 3 controle e liberdade (desfazer), nº 5 prevenção
  de erro, nº 6 reconhecer em vez de lembrar, nº 9 mensagens de erro em linguagem do usuário.
  <https://www.nngroup.com/articles/ten-usability-heuristics/>
- Nielsen — *Response Times: The 3 Important Limits* (0,1 s / 1 s / 10 s), base do TR-10.3.
  <https://www.nngroup.com/articles/response-times-3-important-limits/>
- **Lei de Fitts** (Fitts, 1954) — tempo de aquisição de alvo em função de tamanho e distância;
  base do TR-02.1. **Lei de Hick-Hyman** (Hick, 1952; Hyman, 1953) — tempo de decisão em função
  do número de alternativas; base do TR-03.1 e do TL-47.3.

**Banco de dados e segurança:**

- Supabase — *RLS Performance and Best Practices*: índice nas colunas usadas em policy, envolver
  chamadas em `(select ...)` para virar `initPlan`, funções `security definer` para evitar
  recursão e reduzir custo, `TO authenticated` para não avaliar em anônimo. Os ganhos medidos
  citados no TR-04.1 vêm daqui.
  <https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv>
- Supabase — *Database Backups*: plano gratuito **sem backup automático**; Pro com os **últimos
  7 dias** de backup diário; Team 14; Enterprise até 30. *Point-in-Time Recovery* é add-on pago
  à parte, com compute mínimo. Base do TR-12.1.
  <https://supabase.com/docs/guides/platform/backups>
- Electron — *Security* (checklist oficial de 20 itens). Os citados no TR-04.6: isolamento de
  contexto, sandbox, sem integração Node, CSP, validar remetente de IPC, limitar navegação e
  criação de janelas, `shell.openExternal` com dado confiável, fuses, manter o Electron atual.
  <https://www.electronjs.org/docs/latest/tutorial/security>

**Mercado — o que os concorrentes vendem** (base da Parte 3 e de várias sugestões por tela):

- Oficina Integrada — OS com fotos e checklists, envio por WhatsApp e e-mail, acompanhamento
  pelo cliente, busca de veículo por placa, histórico de OS por veículo, PDV de balcão com
  código de barras, comissões por setor, controle de acesso por perfil.
  <https://www.oficinaintegrada.com.br/>
- AutocenterPro — orçamento que vira OS, aprovação do cliente por WhatsApp, checklists
  padronizados por tipo de serviço, registro de diagnóstico com fotos, assinatura digital,
  histórico por placa, **alertas automáticos de revisão e retorno**.
  <https://autocenterpro.com.br/ordem-de-servico-para-oficina>
- Comsis / S3 — o ERP tradicional usado como referência de mercado no próprio `PROJETO_STATUS.md`
  (funcional, UX densa/datada). <https://www.comsis.com.br/>
- Outros conferidos para triangular a lista de recursos esperados no ramo:
  <https://bruningsistemas.com.br/sistema-para-autocenter> ·
  <https://erp.autocenterapp.com/> · <https://oficinavision.com.br/para/borracharia/>

**LGPD e pequenos negócios** (base do TR-12 — material de orientação, não aconselhamento
jurídico):

- Sebrae — *LGPD exige adequações de empresas a dados de clientes* e *O que é LGPD e a
  flexibilização para os pequenos negócios*.
  <https://sebrae.com.br/sites/PortalSebrae/artigos/lgpd-exige-adequacoes-de-empresas-a-dados-de-clientes-veja-o-que-muda,fe51f2520da54710VgnVCM1000004c00210aRCRD>

**Ferramentas citadas nos prompts:** `fast-check` (teste de propriedade), `@testing-library/react`,
`eslint-plugin-jsx-a11y`, `gitleaks`, `odiff`/`pixelmatch` (regressão visual), `pg_trgm` e
`unaccent` (busca no Postgres), `@tanstack/react-virtual` e `@tanstack/react-query` (só se a
medição justificar).

---

> **Última palavra, para a sessão que for executar isto.** Este guia tem mais de cem sugestões.
> Nenhuma delas vale mais que a regra que o próprio projeto aprendeu do jeito difícil: mostrar
> funcionando, em etapas pequenas, antes de avançar. Um item bem feito e confirmado por ela
> rodando de verdade na loja vale mais que dez mesclados na `main` esperando alguém descobrir
> se prestam.
