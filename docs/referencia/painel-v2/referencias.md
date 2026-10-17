# Referências pro painel v2 (pesquisa de 17/10/2026)

> Só links e descrições, com **o que vale copiar do jeito** de cada um. Nada de imagem, logotipo,
> ícone ou código de terceiros entra no painel (regra do `docs/painel.md`, "Design").
> A pesquisa foi feita pela busca na internet, lendo as páginas oficiais quando apareceram;
> onde só achei resumo de terceiros, está dito.

## Resumo: as 8 ideias que mais servem pra nós

1. **A barra lateral é só pra ir a lugares** (cada item muda o endereço), com **ícone em todos ou em
   nenhum**, e grupos separados por uma linha fina. (Primer, do GitHub)
2. **A barra lateral fica mais apagada que o conteúdo**, pra o meio da tela chamar o olho. (Linear, 2026)
3. **Os mesmos dados, mais de um jeito de ver**: lista, quadro de colunas, tabela. Mudar o jeito não
   muda o dado. (GitHub Projects)
4. **A leva é um "ciclo" com começo e fim**, e o ciclo tem a sua barra de progresso e o seu gráfico.
   (Plane)
5. **Uma página "o que é meu"** separada da lista de todo mundo: o que espera por mim, a minha tarefa.
   (Linear: Inbox e My issues)
6. **No celular, a navegação fica à vista**: esconder o menu atrás de um botão reduz muito o quanto as
   pessoas acham as coisas. Barra embaixo, com até 5 itens. (NN/g; Vercel em 2026)
7. **Estado vazio ensina**: diz por que está vazio, o que vai aparecer ali e o próximo passo. (NN/g e
   SAP Fiori)
8. **Cabeçalho de página igual em todas as telas** (título, abas, ações sempre no mesmo lugar).
   (Linear 2026, Vercel 2026)

## Cada referência

### Linear (gestão de tarefas de equipes de software)
- Links: [o redesenho da interface](https://linear.app/now/how-we-redesigned-the-linear-ui) ·
  [barra lateral personalizável (dez/2024)](https://linear.app/changelog/2024-12-18-personalized-sidebar) ·
  [atualização visual (mar/2026)](https://linear.app/changelog/2026-03-12-ui-refresh) ·
  [navegação no celular (jan/2026)](https://linear.app/changelog/2026-01-22-customize-your-navigation-in-linear-mobile) ·
  [Triage, a "caixa de entrada" da equipe](https://linear.app/docs/triage)
- **O que copiar**:
  - **Densidade**: uma tarefa por linha, com os dados em colunas curtas; o detalhe abre ao lado. É o que
    deixa ver a leva inteira sem rolar.
  - **Barra lateral mais apagada** que o conteúdo, e cabeçalhos e controles **iguais em todas as telas**
    (a atualização de 2026 foi exatamente isso).
  - **"Mais"**: o que se usa pouco vai pra um item "Mais", em vez de encher a barra (bom pros itens "em breve").
  - **Contador de não lidos como número ou ponto**: pro "Precisa de você".
  - No celular, uma **barra de baixo** com os itens mais usados.
- **O que não copiar**: atalhos de teclado pra tudo e o visual escuro e "técnico"; o nosso é calmo.

### GitHub Projects (os quadros do próprio GitHub)
- Link: [trocar o jeito de ver (tabela, quadro, linha do tempo)](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/changing-the-layout-of-a-view)
- **O que copiar**: **três jeitos de ver as mesmas issues**: tabela (densa, agrupa e ordena), quadro
  (colunas por estado) e linha do tempo. Pra nós: a leva em **lista** (padrão) e em **quadro**, sem
  duplicar dado. A linha do tempo serve pras **fases da leva** (leva 2).
- **O que não copiar**: campos personalizados à vontade; o nosso cabeçalho fixo de `docs/tarefas.md`
  já é o "campo" de cada tarefa.

### Plane (gestão de projetos de código aberto)
- Links: [ciclos](https://plane.so/cycles) · [gráficos de progresso](https://plane.so/blog/introducing-progress-charts) ·
  [curso: o que é um ciclo](https://university.plane.so/courses/101-the-basics/04-intro-to-cycles.html)
- **O que copiar**: o **ciclo** é a nossa **leva**: tem começo e fim, uma barra de progresso, e (no
  plano pago deles) um gráfico de "quanto falta" e "quanto foi feito" por dia. Pra nós, o gráfico
  vira parte do **Relatório da leva** (leva 2). E a ideia de **ligar e desligar seções** por
  projeto combina com os nossos "em breve".
- (Os detalhes vieram do blog e do changelog oficiais; a documentação em `docs.plane.so` não apareceu na busca.)

### Vercel (painel de hospedagem de sites)
- Links: [nova navegação (fev/2026)](https://vercel.com/changelog/dashboard-navigation-redesign-rollout) ·
  [o redesenho do painel](https://vercel.com/blog/dashboard-redesign)
- **O que copiar**: barra lateral que **recolhe** pra trabalhar em tela cheia, **busca pra pular direto
  pra uma página**, e no celular uma **barra flutuante embaixo**. A página inicial do projeto mostra
  primeiro **o estado** (está no ar? deu erro?), que é o espírito do nosso **Início**.

### Primer (o sistema de desenho do GitHub)
- Links: [lista de navegação (NavList)](https://primer.style/product/components/nav-list/guidlines) ·
  [padrões de navegação](https://primer.style/product/ui-patterns/navigation)
- **O que copiar** (regras claras, boas pra tarefa da equipe): item da barra lateral **é sempre um
  link** que muda o endereço (ação, como "Sair", fica fora da lista); **ícone em todos ou em nenhum**;
  linha divisória **só entre grupos**; estados de cada item: normal, **atual**, **desligado**
  (o nosso "em breve"), carregando.

### A interface do Claude (inspiração de estilo, já decidida no `docs/painel.md`)
- **O que copiar**: o jeito **calmo**: fundo creme, muito espaço, título em serif, cartão de borda fina
  sem sombra, uma cor de destaque só. Nada de logotipo, nome, fonte ou ícone.

### Nielsen Norman Group (pesquisa de usabilidade)
- Links: [menus escondidos pioram os números (vídeo)](https://www.nngroup.com/videos/hamburger-menus/) ·
  [como o estudo foi feito](https://www.nngroup.com/articles/hidden-navigation-methodology/) ·
  [navegação visível no celular](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)
- **O que copiar**: esconder a navegação principal atrás de um botão de menu **reduz bastante** o quanto
  as pessoas acham as coisas, e deixa as tarefas mais lentas, inclusive no celular. Se tiver que
  esconder, o botão precisa chamar atenção. **Conclusão pra nós**: no celular, os 4 ou 5 lugares mais
  usados ficam numa barra embaixo, e o resto num "Mais".
- **Estados vazios** (a NN/g é citada por terceiros; o guia da SAP é oficial:
  [SAP Fiori, estados vazios](https://www.sap.com/design-system/fiori-design-web/v1-139/foundations/best-practices/global-patterns/designing-for-empty-states)):
  dizer **por que** está vazio, **o que** vai aparecer ali e **o próximo passo**. Uma lista vazia porque
  tudo foi feito é diferente de uma que nunca teve nada. Vale pros nossos "em breve" e pra "Nenhuma
  tarefa nesta leva ainda".

### Height (um gestor de tarefas que fechou)
- Link: [o Height fechou em setembro de 2025](https://alternativeto.net/news/2025/3/height-project-management-tool-to-shut-down-by-september-2025/)
- **Lição, não modelo**: a gente não deve depender de um serviço de terceiros pra guardar o que é nosso.
  O painel **lê o GitHub e não guarda nada**, e o financeiro, quando vier, num banco nosso. Bom
  confirmar que a decisão está certa.

## Pra conferir depois (não deu pra ver daqui)
- As páginas de "My issues" e "Inbox" da documentação do Linear não apareceram na busca; a ideia está
  descrita pela [Triage](https://linear.app/docs/triage) e pelo changelog.
- O artigo completo da NN/g sobre o estudo dos menus (os números exatos variam entre os resumos).
