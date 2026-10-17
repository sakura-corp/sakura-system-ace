# Painel v2: a base comum das versões visuais (17/10/2026)

Esta pasta é usada pelas três versões (`versao-a/`, `versao-b/`, `versao-c/`). Elas são **só desenho**:
páginas HTML estáticas, com **dados de exemplo**, pra Sofia escolher olhando as fotos. Nada aqui é o
código do painel (`painel/`), e nada daqui vai pro ar.

- `base.css`: as fontes (Inter, Source Serif 4, Plus Jakarta Sans; licença OFL em `fontes/`) e as cores
  da seção "Design" do `docs/painel.md`, claro e escuro (`prefers-color-scheme`).
- `sala.css`: o visual B da Sala, copiado do código, pra Sala sair igual nas três versões.
- `conferir.mjs`: tira as fotos (375 px e 1280 px, claro e escuro) e mede o contraste (WCAG AA) e a
  rolagem lateral. Rodar da raiz: `node docs/referencia/painel-v2/comum/conferir.mjs docs/referencia/painel-v2/versao-a inicio.html leva.html sala.html em-breve.html`.

## A organização (igual nas três versões; o que muda é o desenho)

A barra lateral tem **cinco grupos**. Item "em breve" aparece apagado, com cadeado, e diz **do que depende**.

| Grupo | Item | Endereço | O que mostra | De onde vem | Situação |
|---|---|---|---|---|---|
| (topo) | **Início** | `/` | "Precisa de você", a sua tarefa, o resumo da leva atual, o que mudou hoje | GitHub (o que a Sala e a leva já leem) | novo, sem custo |
| Trabalho | **Leva atual** | `/leva` | contador, horas por pessoa (#539), tarefas por estado; cartão com chefe/estimativa/Depende de (#536) e Pegar/Largar (#538) | GitHub (issues `leva-N`) | existe (hoje é a `/`) |
| Trabalho | **Levas anteriores** | `/levas` | cada leva, quantas tarefas e horas, e quando terminou | GitHub (`/api/levas`) | novo, sem custo |
| Trabalho | **Versões** | — | o que saiu no canal de teste e o que foi liberado pras lojas | GitHub (releases, públicas) | em breve: depende de uma tarefa (leva 2) |
| Trabalho | **Fases da leva** | — | a leva em etapas (planejar, fazer, congelar, testar, liberar) | GitHub | em breve: depende da conversa de desenho (leva 2) |
| Trabalho | **Relatório da leva** | — | o relatório escrito no fim da leva e a aprovação da Sofia | `docs/relatorios/` | em breve: depende da conversa de desenho (leva 2) |
| Equipe | **Sala** | `/sala` | as pessoas e os robôs ao vivo (visual B) | GitHub | existe |
| Equipe | **Pessoas** | — | cada pessoa: a tarefa de agora e as horas na leva (**sem nota nem ranking**) | GitHub | em breve: depende da #539 |
| Equipe | **Escritório** | `/escritorio` | os agentes (exemplo) | dados de exemplo | existe, marcado "exemplo" |
| Empresa | **Financeiro** | — | entradas, saídas, contas da Sakura Corp | **banco privado** (nunca o GitHub) | em breve: depende de escolher o banco privado |
| Empresa | **DRE** | — | o resultado do mês | o Financeiro | em breve: depende do Financeiro |
| Empresa | **Lojas** | — | cada loja cliente: versão instalada, banco atualizado | **banco privado** (nome de cliente não vai pro GitHub) | em breve: depende do banco privado |
| (rodapé) | **Configurações** | — | tema claro/escuro/automático, avisos | o navegador | em breve |
| (rodapé) | quem entrou + **Sair** | — | foto e login | `/api/eu` | existe |

O ponto **"ao vivo"** (tempo real, #355) fica no topo da barra, junto do nome.

## As páginas que cada versão desenha (nomes de arquivo fixos)

1. `inicio.html`: o Início.
2. `leva.html`: a Leva atual (leva 1 de exemplo), com o contador, as horas por pessoa (#539) e os cartões
   já com as peças da leva 1 desenhadas: chefe e ajudantes e "Espera #536" (#536), "Pegar tarefa" /
   "Largar" (#538). Os botões "Começar com o Claude" e "Copiar texto" aparecem só na tarefa de quem olha.
3. `sala.html`: a Sala dentro da moldura nova (a janela escura da Sala usa `comum/sala.css`, sem mudar).
4. `em-breve.html`: a página do **Financeiro** "em breve": o que vai mostrar, do que depende, e o aviso
   de que dinheiro nunca mora no GitHub. Sem número de dinheiro nenhum, nem fictício.
5. `index.html`: só links pras quatro (não precisa de foto).

Toda página tem, no topo, a faixa `<div class="faixa-referencia">Desenho de referência (versão X), dados de exemplo</div>`.

## Dados de exemplo (os mesmos nas três)

Pessoas (fictícias): `ana-exemplo`, `bruno-exemplo`, `carla-exemplo` e quem olha, `voce-exemplo`.
Foto: círculo com a inicial (nunca foto de verdade, nunca imagem da internet).

**Leva 1** (as tarefas são as de verdade, que são públicas; donos e estados são de exemplo):

| # | Título | Estado | Dono | Chefe | Ajudantes | Estimativa | Depende de |
|---|---|---|---|---|---|---|---|
| 536 | Painel: o cartão da tarefa lê o cabeçalho | em andamento | voce-exemplo | frontend | tester | 5 h | nada |
| 538 | Painel: botão "Pegar tarefa" e "Largar" | livre | — | backend | frontend, tester | 6 h | #536 (aberta) |
| 539 | Painel: horas por pessoa | em revisão | ana-exemplo | frontend | tester | 3 h | nada |
| 510 | Janelas de importação no Modal | em andamento | carla-exemplo | frontend | tester | 3 h | nada |
| 511 | Testes no Windows | livre | — | tester | — | 2 h | nada |
| 455 | Clientes que sumiram | feita | bruno-exemplo | backend | frontend | 6 h | nada |
| 540 | Ajuste pequeno sem cabeçalho | livre | — | — | — | — | (incompleta: falta Chefe, Estimativa) |

Contas: 7 tarefas · 1 feita · 2 em andamento · 1 em revisão · 3 livres · 6 h de 25 h feitas (a #540 não tem estimativa).
Horas por pessoa: bruno-exemplo 6 h entregues; ana-exemplo 3 h segurando; carla-exemplo 3 h segurando; voce-exemplo 5 h segurando.

**Início** (de quem olha, `voce-exemplo`):
- Precisa de você (2): "PR #545 Horas por pessoa pede a sua revisão" (de ana-exemplo, há 40 min) e "A rodada Liberar espera a sua aprovação" (há 12 min).
- A sua tarefa: #536, em andamento, 5 h, com "Começar com o Claude".
- Leva 1: 1 de 7 feitas, 6 h de 25 h, barra de progresso.
- O que mudou hoje: "carla-exemplo pegou a #510" (há 2 h), "bruno-exemplo entregou a #455" (há 3 h), "A conferência do PR #545 passou" (há 35 min).

**Levas** na barra: Leva 1 (atual), Leva 0 (8 de 8 feitas).

**Sala**: as mesmas entradas de `painel/src/dados/exemplo-sala.ts` (2 pessoas, 3 robôs do Claude, 6 robôs da casa), com "2 coisas precisam de você".

## Regras pra quem desenha

- **Só a sua pasta** (`versao-<letra>/`). Não mexer em `comum/` nem em `painel/`.
- HTML e CSS à mão, **sem biblioteca, sem CDN, sem JavaScript obrigatório** (um pouco de JS pra abrir a
  gaveta do celular pode, mas a página tem que fazer sentido sem ele). Ícones: SVG simples desenhados à
  mão no próprio arquivo (traço de 1,5 a 2 px, estilo linha), **nunca copiados** de um site ou marca.
- **Nada de logotipo, nome, fonte ou ícone da Anthropic, do Claude, do Linear, do GitHub** etc. O que se
  copia é o jeito (calmo, claro, espaço, tipografia), não a peça.
- Cores: as de `base.css`. Cor nova só se passar no `conferir.mjs`. A Sala usa `sala.css` sem mudar.
- Celular (375 px): sem rolagem lateral, toque de 44 px nos botões, título que não cabe quebra linha.
- Repositório público: nenhum preço, valor em dinheiro, nome real de pessoa, de loja ou de cliente.
- Estado da tarefa nunca só pela cor: sempre com a palavra.
- No fim, rodar o `conferir.mjs` nas quatro páginas até sair **TUDO OK**, e **olhar cada foto**.
