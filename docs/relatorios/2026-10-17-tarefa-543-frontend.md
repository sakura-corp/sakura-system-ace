# Relatório: tarefa #543, chefe frontend

- **Tarefa**: #543, a navegação do celular (barra embaixo e "Mais")
- **Chefe**: frontend
- **Data**: 2026-10-17
- **PR**: (o link está na descrição do PR que fecha a #543)

## O que cada agente fez
- **Sessão mãe**: leu a issue e o comentário "Mudança de plano", planejou a barra e a folha, conferiu o código do
  construtor, consertou o contraste e o achado da revisão, escreveu o andamento, este relatório e o PR.
- **Ajudante construtor**: `NavegacaoDoCelular.tsx` (barra fixa embaixo + folha do "Mais" em `<dialog>` + `ligarFolha()`),
  o teste dela, a `BarraLateral` escondida abaixo de 768 px (exportando ícones, item em breve, ponto "ao vivo" e `sair()`
  pra não duplicar) e o espaço no fim dos três `<main>` do `App.tsx`.
- **Ajudante tester**: no Chromium (Playwright), mediu largura, sobreposição, alvos de toque, teclado, `aria-current` e
  contraste em 320/375/1000 px, claro e escuro, e tirou as fotos. Achou o contraste baixo do "em breve" na barra de baixo.
- **Ajudante revisor**: leu o diff do zero numa cópia (worktree). Nada que bloqueie; um "deveria" (a folha some e trava a
  página se a tela passar de 768 px com ela aberta) e dois opcionais (abaixo).

## Modelos usados
- Planejar: forte (Opus), na sessão mãe.
- A barra e o "Mais": médio (Sonnet).
- Teclado, leitor de tela e fotos: médio (Sonnet).
- Revisão final: forte (Opus). Nenhuma troca por falha.

## Sessões filhas
- Nenhuma (`Sessões filhas: não`).

## O que testei e VI reprovar
- Sem o `botao.focus()` do `ligarFolha`: reprovaram "Esc fecha a folha, avisa e devolve o foco ao botão Mais" e "o evento
  close também avisa e devolve o foco".
- Sem o `aria-current` da barra de baixo: reprovou "barra de baixo: Início, Leva, Sala, Pessoas, Mais; só a Sala é a página
  atual".
- Com o Shift+Tab olhando o elemento errado: reprovou o teste do foco preso. As três quebras foram desfeitas.
- Contraste: com `opacity-60`, "Início" e "Pessoas" (em breve) mediam 2,46:1 (claro) e 3,08:1 (escuro). Sem ele,
  5,49 e 5,9.
- A folha aberta e a janela alargada pra 1000 px: com o `md:hidden` no `<dialog>`, o "Fechar" ficou invisível e o script
  não conseguiu clicar (a página travada). Sem ele, a folha continua visível e fecha.

## O que passou sem eu ter visto reprovar
- `tsc -b` e os 435 testes do painel (9 novos).
- No Chromium, em `/`, `/sala` e `/escritorio`, 320 e 375 px, claro e escuro: a barra de baixo aparece, a lateral some, sem
  rolagem lateral, o fim do conteúdo fica 47 px acima da barra, alvos de 52 px. Em 1000 px, só a lateral.
- `/sala?tv`: nenhuma barra do celular na página.
- Teclado: Enter no "Mais" abre e o foco vai pro "Fechar"; 30 Tab e 30 Shift+Tab sem o foco sair da folha; Esc, "Fechar" e
  toque no fundo fecham; o foco volta ao "Mais"; `aria-expanded` false → true → false.
- `aria-current`: um só na tela (em `/sala`, na barra; em `/escritorio`, dentro da folha).
- A folha em 320 px encosta embaixo, largura total, linhas de 44 px ou mais.
- Fotos em `docs/relatorios/fotos/tarefa-543/`.

## O que ficou de fora
- **`env(safe-area-inset-bottom)` dá 0 hoje**: falta `viewport-fit=cover` na tag `viewport` do `painel/index.html`, que está
  fora da lista de arquivos da tarefa. Não faz mal (o Safari não desenha por baixo da barrinha do iPhone sem isso).
- **Item em breve que ganhar link (#544)**: a barra e a folha decidem "link ou não" por `item.href`, como pedido. Quando a
  #544 der `/em-breve/<id>` ao Início e a Pessoas, eles viram links e perdem o visual apagado e o " (em breve)" do leitor
  de tela. Quem mesclar por último ajusta (o visual por `item.emBreve`, o link por `item.href`).
- No celular não há nome "Sakura Corp" no topo (a issue não pede barra de cima); o ponto "ao vivo" e o "Sair" estão no "Mais".
- O lint da raiz ignora `painel/` e o painel não tem lint próprio (igual à #542).

## O que depende de alguém
- **A Sofia, depois de publicar**: no celular dela, a barra aparece embaixo e o "Mais" abre e fecha.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a regra "teste só prova o que se viu reprovar" fez o tester medir o contraste com a
  opacidade, que o código sozinho não mostrava.
- **Onde eu errei ou tive que adivinhar**: o `opacity-60` passou pelo meu plano (eu só pedi "apagado"); deveria ter pedido
  `text-texto-2`, que já é o apagado aprovado da barra lateral. O `aria-current` do "Mais" (deixei só a cor, sem
  `aria-current`, pra ter um só na tela) foi decisão minha.
- **O que faltou na skill**: o painel não tem `contraste:telas` nem `largura:telas`; cada tarefa reescreve um script de
  Playwright no scratchpad.
- **Sugestão (opcional)**: guardar o script de fotos e medidas do painel num lugar fixo (ex.: `painel/scripts/`), pra a
  próxima tarefa só rodar.
