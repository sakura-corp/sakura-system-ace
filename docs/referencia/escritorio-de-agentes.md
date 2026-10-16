# Referência: o "Escritório de agentes" (como a Sofia imagina a tela)

Origem: 7 prints de um vídeo do Instagram ("My AI Office", de bexruz.khamidullaev), mandados pela Sofia em 16/10/2026.
**Inspiração de jeito, não cópia**: nada de imagem, nome, logotipo ou arte do vídeo. Todo o desenho é nosso (SVG e CSS).
As imagens **não** ficam no repositório (público); só esta descrição.

## O que os prints mostram

1. **Barra do topo**: nome do produto + empresa ("AGENT HQ · BEKHRUZ AI"); abas **Office / Tasks (22) / Calendar / Brain**; busca
   "Ask any agent… ⌘K"; uma pílula "31 agents · 12 running"; sino de avisos; foto da pessoa. Título do vídeo: "8 TEAMS · 31 AGENTS · 1 BRAIN".
2. **O escritório** (vista de cima, isométrica, escura, tipo cidade de brinquedo): **8 salas coloridas** (azul, laranja, amarelo,
   magenta, roxo, verde-água, vermelho, verde), uma por **equipe** (Research, Inbox, Scripts, Social, Creative, Analytics, TBX Shop, Dev),
   dispostas em **roda** em volta de um **disco brilhante no centro: "THE BRAIN, 1.842 notas · memória compartilhada"**. Estradinhas ligam
   as salas ao centro, com bonequinhos andando. Cada sala tem uma etiqueta: nome, "N agentes · M rodando" e mini-fotos dos agentes.
   Dentro de cada sala, mesas com agentes sentados nos computadores; cada agente tem uma legenda ("Video Editor", "Copy & Captions").
   Canto de baixo à esquerda: legenda **"RODA EM: Opus · Sonnet · Haiku · headless/nuvem"**. Canto de baixo à direita: **minimapa** com zoom (− + ⤢).
3. **Clicar numa sala** abre um **painel lateral**: nome, "3 agentes · líder: Video Editor", abas **Visão geral / Tarefas / Agenda / Ajustes**;
   três números com mini-gráfico de linha (**Tarefas hoje 18 · Rodando 5 · Tempo médio 14 min**); **"Ferramentas conectadas · 4 no ar"** (cartões
   com o nome e "conectado · MCP"); **"Skills · 5 rodando em paralelo"**, cada uma com nome e **barra de progresso** (ex.: rough-cut 79%, captions-burn-in 49%).
4. **O escritório inteiro "ao vivo"**: avisos que aparecem no canto de cima à direita ("Dev: site publicado ✓", "Social: 2 posts agendados"),
   ligações luminosas entre as salas e o cérebro, **sub-agentes** aparecendo dentro da sala quando uma tarefa se divide.
5. **Quadro de tarefas do dia** (painel à esquerda): **Rodando** (cada uma com anel de progresso e a equipe numa etiquetinha colorida),
   **Esperando você · 3** (com botões **Aprovar** / **Revisar**: "Postar o reel amanhã 9:00 — precisa da sua aprovação"),
   **Feitas hoje · 14** (com visto e "há 2 h").

## Como isso vira o nosso (decisões da Sofia, 16/10/2026, e o que ainda é pergunta)

- **Equipes** = as frentes do trabalho dela (ex.: Programa das lojas, Painel, Bibi, Fiscal e contabilidade, Site, Equipe). **Agentes** =
  sessões do Claude com um papel e skills que **ela define**. **O Cérebro** = a memória compartilhada (hoje: `PROJETO_STATUS.md` e `docs/`).
- **Meta**: ela cria os agentes, escolhe as skills de cada um e os agentes trabalham de verdade, gastando os tokens das assinaturas da equipe
  (uma "fábrica virtual"). **Isto é a meta, não a primeira entrega.**
- **Primeira entrega (esta)**: **só a tela**, com **dados de exemplo** (como a Sala #467), mostrando tudo acima com o nosso desenho.
  Nada de lançar sessão de verdade, nada de gastar token, nada de chave.
- **Regra do painel** (`docs/painel.md`): só dado de verdade quando houver; o que ainda não existe aparece como "em breve, depende de X".
- **A ligar depois** (cada um é decisão dela, com opções + recomendação): de onde vêm os agentes reais (as ferramentas de sessão do
  Claude Code? um serviço fora do painel? as branches `claude/...` e PRs do GitHub, que o painel já consegue ler?), e **conferir as regras
  de uso das assinaturas antes de automatizar sessões**.

## Mais referências (16/10/2026, à tarde): onde ela quer chegar, não a base

A Sofia mandou mais prints, de dois vídeos, dizendo que são **projetos ambiciosos** e que **a base não precisa ser assim**:
servem pra mostrar o destino. Como antes, as imagens **não** ficam no repositório; só esta descrição.

**"My AI Office" (o mesmo vídeo de antes, outros momentos)**
- Salas em **3D isométrico** (vista inclinada de cima, como maquete), com mesas, cadeiras, computadores, plantas, sofá;
  bonequinhos sentados trabalhando e outros **andando pelas estradinhas** até o Cérebro.
- O Cérebro é um **disco de luz com um feixe subindo**, linhas finas ligando ele a cada sala.
- Abrir uma sala dá **zoom pra dentro dela**: cada agente na mesa dele, com a legenda do papel ("Video Editor", "Copy & Captions").
- No canto de baixo à direita, **minimapa com − + ⤢**; embaixo à esquerda, "RUNS ON Opus · Sonnet · Haiku · headless · cloud".
- O quadro de tarefas fica **à esquerda, do lado do mapa**, com Approve (destacado) e Review.

**"Prédio" de uma empresa de operações (outro vídeo)**
- Um **prédio com andares**: no topo, "Prédio · todos os andares", e cada andar é um escritório ("01 · seu escritório", "02 ·
  …"). **Rolar troca de andar**; clicar num andar entra nele.
- Cada andar é uma **sala isométrica com bordas de neon** (amarelo), com mesas agrupadas por equipe, cada grupo com etiqueta, e
  uma área de **"descanso"** pra quem não está trabalhando.
- No topo, **um número grande do dia** e a contagem "3 em operação · 1 em descanso".
- Dicas na tela: **"clique no agente pra ver detalhes · arraste pra andar pela sala · botão direito gira · roda aproxima"**.

**Como isso conversa com o nosso** (ideias pra conversar, nada decidido)
- "**Descanso**" = o nosso estado *dormindo/livre*: uma área separada da sala pode mostrar isso sem depender de cor.
- **Andares** podem ser um jeito de crescer quando houver mais de um produto (SSACE, outros sistemas da Sakura): um andar por
  produto, as salas das equipes dentro.
- **3D, girar e andar pela sala** pedem uma biblioteca de 3D (pesada) e muito desenho; fica pra depois que os agentes forem de
  verdade, e só se tirar trabalho de verdade.
