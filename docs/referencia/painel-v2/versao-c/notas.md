# Versão C, "Central": as escolhas

Denso e profissional, jeito de ferramenta de gestão: tabela e painel de detalhe. Tudo com dados de exemplo.

- **Barra lateral** de 232 px, no mesmo fundo da página, separada só por uma linha fina. No topo, o seletor
  de espaço (quadradinho "S" + Sakura Corp + "ao vivo") e a caixa "Buscar… Ctrl K" (só desenhada, "em breve").
  Grupos com título pequeno e contador à direita (Leva atual 6, Sala 2). O que ainda não existe fica junto num
  grupo "Em breve" que recolhe, cada item dizendo do que depende. A página atual é marcada só por um fundo
  branco com borda fina, sem cor forte.
- **Títulos** em Inter semibold 20 px; a letra com serifa só aparece na saudação do Início.
- **Leva**: uma faixa com 4 números pequenos, as horas por pessoa numa tabelinha e a lista como **tabela
  densa** agrupada por estado (com a contagem), com chefe, dono, horas, estado e a ação ("Pegar", "Espera #536",
  "incompleta" ou o menu da sua). À direita, o **painel de detalhe** da #536 com chefe, ajudantes, estimativa,
  "depende de", sessões filhas e os botões. As abas "Por pessoa" e "Por chefe" aparecem desligadas ("em breve").
- **Início**: saudação, faixa "Precisa de você" com a ação em cada linha e três blocos (a sua tarefa, a leva,
  o que mudou hoje em linha do tempo).
- **Celular**: topo com o nome da página e o botão de menu (abre a navegação inteira); a tabela vira lista de
  duas alturas (título em cima; selo, dono e horas embaixo), sem rolagem lateral; o detalhe vem logo abaixo
  como cartão; botões de 44 px. A barra de 4 itens (Início, Leva, Sala, Mais) fica **no fim da página** nas fotos;
  no programa de verdade ela ficaria presa na parte de baixo da tela (nas fotos, que são da página inteira,
  uma barra presa apareceria no meio da imagem).
- **Em breve (Financeiro)**: esqueleto apagado (blocos cinza, sem número nenhum) com os rótulos "Entradas",
  "Saídas" e "Resultado do mês", e por cima um cartão com "Em breve", do que depende e por que o dinheiro
  nunca mora no GitHub.
- Só as cores de `comum/base.css`; ícones desenhados à mão no próprio arquivo; sem biblioteca e sem JavaScript.
- "Levas anteriores" e "Escritório" não têm página neste desenho (os links só levam à Leva ou não vão a lugar nenhum).

## Resultado do conferir

`node docs/referencia/painel-v2/comum/conferir.mjs docs/referencia/painel-v2/versao-c inicio.html leva.html sala.html em-breve.html`
deu **TUDO OK**: as 16 fotos sem problema de contraste e sem rolagem lateral. As 16 fotos foram olhadas uma a uma.
