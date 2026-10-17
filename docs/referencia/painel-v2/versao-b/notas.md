# Versão B, "Quadro": notas (17/10/2026)

**A ideia**: a leva vira um quadro de colunas, e a navegação fica enxuta, pra sobrar espaço pro que importa.

## As escolhas
- **Barra estreita (72 px)**: só ícone de linha e uma palavra embaixo. Os grupos (Início; Trabalho; Equipe; Empresa) são separados por uma linha fina. Item atual: ícone num quadradinho rosa-claro. Em cima, um "S" em serif num círculo e o ponto "ao vivo" com a palavra.
- **Em breve**: cadeado pequeno sobre o ícone, rótulo apagado, e o "depende de" no `title` (e escondido pra leitor de tela). O grupo Empresa abre uma lista ao lado, só na página em-breve, no computador.
- **Leva**: título grande, uma linha de números com barra fina, "Horas por pessoa" em pílulas e quatro colunas (Livres, Em andamento, Em revisão, Feitas). O estado sempre vem em palavra, no alto da coluna. O cartão de quem olha (#536) tem borda rosa e os três botões.
- **Início**: cartões em grade; "Precisa de você" com a borda de revisão. No celular a ordem vira: Precisa de você, A sua tarefa, Leva 1, O que mudou.
- **Celular**: barra de baixo fixa (Início, Leva, Sala, Pessoas, Mais), topo simples com o "S" e o "ao vivo". Na Leva, quatro pílulas escolhem a coluna (uma por vez, "Em andamento" já escolhida), sem JavaScript (usa `:has`). Sobra 104 px no fim da página pra barra não cobrir nada.
- Nenhuma cor nova: só as de `comum/base.css`. A Sala usa `comum/sala.css` sem mudar.

## O que pesa
- Mostra a leva toda de uma vez no computador; no celular, uma coluna por vez (mais um toque pra ver outro estado).
- Rótulo de 11 px na barra estreita é pequeno; "Escritório" é a palavra mais longa e cabe por pouco.

## Conferir
`conferir.mjs` nas quatro páginas: **TUDO OK** (contraste e rolagem lateral, 375 e 1280 px, claro e escuro). As 16 fotos foram olhadas, uma por uma.
