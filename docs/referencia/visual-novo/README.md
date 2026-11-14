# Visual novo do SSACE: as regras de aparência (RASCUNHO de 14/11/2026)

> **Rascunho. Só vale depois que a Sofia aprovar.** Nada aqui mudou o programa: é a base da tarefa
> #990, escrita pra equipe pegar já encaminhado. Enquanto for rascunho, o que vale no programa é a
> "Identidade visual (como está hoje)" do `docs/decisoes.md`.
>
> - **Ver funcionando**: a página privada da Sofia (`https://claude.ai/artifact/AUVoMbi8RvYr8CHW7mq1Dz`),
>   com a miniatura clicável. As mesmas telas, paradas, estão em `conceito/fotos/`.
> - **O código do conceito**: `conceito/` (como refazer está no fim deste arquivo).
> - **As tarefas**: `docs/rascunhos/visual-novo-tarefas.md`.

## 1. O que a Sofia decidiu (14/11/2026)

- **O caminho é o laranja com carmesim** ("tech-automotivo", escuro, de contraste alto). Rosa e roxo
  ficam pra marca da empresa (Sakura Corp), não pro programa. Isso substitui o passo 1 da #990 (a
  equipe trazer conceitos).
- **A logo é a versão B**: só a flor, cheia, com a engrenagem sozinha no miolo, em degradê do claro ao
  carmesim. **O ícone do programa é a B num quadrado claro** (`conceito/logo/icone-programa-claro.png`):
  foi a que ela mais gostou, pelas cores das pétalas no fundo claro.
- **O degradê tem granulado** bem visível. Ela gosta disso; não é pra suavizar.
- **Escuro, e também um tema claro**, com uma configuração pra trocar; **a logo de dentro do programa
  muda junto** com o tema. O claro ainda não foi desenhado (seção 11). As cores têm nome de papel
  (seção 3) justamente pra isso.
- **Quem aplica**: uma sessão nova do Claude aplica a base de uma vez (as tarefas 1 a 7 do rascunho);
  a equipe entra depois, melhorando e levando pras outras telas. Isso muda o combinado de 11/11
  (visual novo em janeiro, pela equipe).
- **Ela gostou** do layout novo, dos efeitos e da Central do dia como cartão de destaque.
- **Dos vídeos de referência ela quer o movimento** (trocar de tela, coisas surgindo) **e a
  organização**. Som fica pra outro momento.
- **O menu vira ícones**, com o nome aparecendo ao passar o mouse.
- **O resto ela delegou** ("o que for melhor, com base em técnica e design"). O que foi escolhido por
  essa delegação está marcado com **(escolha do Claude)** e pode ser trocado por ela.

O que **não** muda: nenhum campo, coluna, filtro, atalho ou botão some (regra da #990). Só muda
aparência, hierarquia e organização.

## 2. As quatro regras que evitam o erro mais provável

O visual é todo de cores quentes, e as cores de aviso também são quentes. Sem regra, a tela de contas
a pagar vira uma mancha laranja em que não dá pra saber o que é botão e o que é problema.

1. **Carmesim é só marca**: logo, brilho de fundo, o cartão de destaque. **Nunca em dado**, nunca em
   texto, nunca em botão.
2. **Laranja é só ação**: o botão principal, a aba ativa, o dia de hoje, o foco do campo. **Um botão
   laranja por tela**: o próximo passo.
3. **Letra em cima do laranja é escura** (`#1B0B05`), nunca branca. Branco no `#FF5722` dá 3,2 de
   contraste; o mínimo pra texto é 4,5. Com a letra escura dá 6,1.
4. **Todo aviso tem ícone e palavra junto da cor.** Cerca de 1 em cada 12 homens confunde vermelho,
   laranja e verde; cor sozinha não avisa ninguém. Por isso também "Em andamento" é **azul** e
   "atenção" é **amarelo**, longe do laranja.

## 3. As cores (com nome de papel, não de cor)

**Por que nome de papel**: hoje o programa tem `sakura-purple-dark` (que é uma cor **clara**, de
texto) usado 662 vezes. Nome de cor mente quando a cor muda. Os nomes novos dizem pra que serve.

| Papel | Nome sugerido | Valor | Onde |
|---|---|---|---|
| Fundo da janela | `fundo` | `#0A0A0D` | atrás de tudo |
| Menu e painéis | `painel` | `#121217` | menu lateral, barra do topo |
| Cartão | `cartao` | `#191920` | cartões, tabelas |
| Passar o mouse | `passar` | `#22222B` | linha, item, botão secundário |
| Fundo de campo | `campo` | `#14141A` | input, select |
| Janela (modal) | `janela` | `#16161C` | **opaco**, como já é hoje (#361) |
| Linha fina | `linha` | branco a 8% | divisória de tabela, borda de cartão |
| Linha forte | `linha-forte` | branco a 16% | borda de botão secundário, de janela |
| Borda de campo | `borda-campo` | branco a 35% | **continua como está hoje**: dá 3,1 contra o cartão (o mínimo pra contorno é 3) |
| Texto principal | `texto` | `#FFFFFF` | 17,5 no cartão |
| Texto secundário | `texto-2` | `#A1A1AA` | 6,8 no cartão |
| Dica de campo vazio | `texto-3` | `#8A8A94` | 5,4 no campo. O `#6E6E77` do guia do Gemini dava 3,5: **não usar** |
| Marca | `carmesim` | `#E11D48` | só marca (regra 1) |
| Marca, fundo | `carmesim-fundo` | `#6B1229` | base do cartão de destaque |
| Ação | `acao` | `#FF5722` | botão principal (regra 2) |
| Ação, ao passar o mouse | `acao-clara` | `#FF7A4D` | também ícone ativo e anel de foco |
| Letra sobre a ação | `sobre-acao` | `#1B0B05` | regra 3 |
| Em andamento | `info` | `#60A5FA` | 6,9 |
| Atenção | `atencao` | `#FACC15` | 11,4 |
| Certo | `ok` | `#34D399` | 9,1 |
| Problema | `perigo` | `#F87171` | 6,3 |
| WhatsApp | `zap` | `#25D366` | só a borda e o ícone do botão "Avisar" |

Os números de contraste são contra o cartão (`#191920`) e foram calculados pela fórmula da WCAG, a
mesma do `npm run contraste`. **(escolha do Claude)** em tudo que não é o carmesim, o laranja e as
superfícies, que vieram do guia dela.

**Selo de aviso** (status de OS, de conta, de nota): fundo da própria cor a 12 ou 13%, texto na cor,
ícone na frente, formato de pílula. Nunca fundo cheio.

| Status da OS | Cor | Ícone |
|---|---|---|
| Em andamento | `info` | seta girando |
| Concluída (falta faturar) | `atencao` | relógio |
| Finalizada | `ok` | visto |
| Vencida, com erro, cancelada | `perigo` | triângulo |

## 4. As letras

- **Títulos, números grandes e a marca**: Plus Jakarta Sans (pesos 600, 700 e 800).
- **Texto, campos e tabelas**: Inter (400, 500, 600), **com os algarismos em coluna**
  (`font-variant-numeric: tabular-nums`) em todo valor e toda tabela.
- **Nada de letra cursiva nem com serifa**, em lugar nenhum.
- **As duas letras precisam ir dentro do programa** (arquivo local). Hoje o `globals.css` pede "Inter"
  mas **não embute**: em PC sem Inter instalada cai na letra do Windows. O programa roda sem
  internet, então buscar no Google Fonts não serve. É decisão de biblioteca: **pedir o "sim" da
  Sofia** (tarefa 1 dos rascunhos).
- **A escala de tamanhos de hoje continua** (os tokens `--text-*` do `globals.css`, do item TR-01.1).
  Só dois mudam: o título da tela sobe de 24 pra **26 px** e o número grande de cartão de 24 pra
  **30 px**. Texto normal segue 14 px; nada abaixo de 12 px.

## 5. O granulado e o brilho

O efeito que ela gostou é: **manchas de cor desfocadas num fundo quase preto, com ruído por cima**.

- **A mancha**: dois ou três `radial-gradient` (carmesim num canto de cima, laranja no canto oposto
  de baixo) sobre o `#09090C`.
- **O grão**: uma camada por cima, com um ruído em SVG (`feTurbulence`) passado pra cinza de contraste
  alto, com `mix-blend-mode: overlay` e opacidade perto de 0,6. Assim o grão aparece onde tem cor e
  some no preto. O trecho pronto está em `conceito/pagina.html` (a variável `--grao` e a classe
  `.grao`): é pra copiar, não reinventar.
- **Onde pode**: Login, o cartão de destaque do Início (Central do dia), o ícone do programa e o
  material de divulgação.
- **Onde não pode**: atrás de tabela, de formulário ou de texto corrido. No balcão, ler ganha de
  enfeitar.
- **O vidro** (`backdrop-filter: blur`) fica **só no cartão do Login**. Os cartões das telas passam a
  ser sólidos. Motivo: vidro em cima de fundo que muda foi o que derrubou o contraste dos campos em
  setembro (item TR-01.3), e a janela já tinha virado opaca pelo mesmo motivo (#361).

## 6. As peças

| Peça | Regra |
|---|---|
| **Botão principal** | fundo `acao`, letra `sobre-acao`, canto de 12 px, altura 40 (32 na linha de tabela, 48 no Login). Sombra laranja leve. Um por tela. |
| **Botão secundário** | sem fundo, borda `linha-forte`, letra branca. |
| **Botão fantasma** | sem fundo nem borda, letra `texto-2` ("Cancelar", "Adicionar forma de pagamento"). |
| **Botão do WhatsApp** | borda e ícone verdes, sem fundo. |
| **Placa** | etiqueta escura com uma faixa azul fina em cima (lembra a placa Mercosul), letra grossa e espaçada. **É um botão** e abre a ficha do veículo (o `LinkPlaca.tsx` de hoje). |
| **Cartão** | fundo `cartao`, borda `linha`, canto de 18 px. Sem sombra e sem brilho. |
| **Cartão de número** | rótulo pequeno com o "?", o número em 30 px, a variação em verde com seta **e** o texto "contra outubro", e um fio de gráfico à direita com a ponta marcada. O cartão inteiro é clicável. |
| **Tabela** | cabeçalho em 12 px `texto-2`; linha de 52 px; valores à direita e em coluna; **na linha, só o botão do próximo passo**; as outras ações num botão de três pontos ("Mais ações"). |
| **Campo** | altura 44 (38 em filtro), canto 12, borda `borda-campo`; no foco, borda laranja e um anel laranja fraco. |
| **Janela (modal)** | painel opaco, canto de 22 px, o fundo de trás escurecido e desfocado. Título e total em cima, ações embaixo à direita, o botão principal por último. |
| **Aviso que some sozinho** | embaixo, no meio, com o visto verde ("OS 148 faturada"). |
| **Dica ao passar o mouse** | caixinha branca com letra preta. |

**Duas mudanças de comportamento** (não são só tinta, então vão em tarefa própria, com o "sim" dela):
1. **Faturar abre numa janela**, em vez de empurrar a lista pra baixo.
2. **As ações da lista de OS vão pro botão de três pontos**, ficando visível só o próximo passo. Custa
   um clique a mais pra "Fechamento" e "Avaliação"; em troca a tabela fica legível. **(escolha do
   Claude)**

## 7. O menu

- **14 itens em quatro grupos**: Atendimento (Início, Clientes, Ordens de Serviço, Orçamentos,
  Garantias), Estoque (Estoque, Fornecedores, Serviços), Financeiro (Caixa Diário, Contas a Pagar,
  Contas a Receber, Notas Fiscais), Gestão (Relações, Funcionários). **A ordem é provisória**: a Sofia
  já avisou que vai repensar.
- **Dois estados**, com um botão redondo na borda pra alternar, e **o programa lembra a escolha**:
  - **aberto** (236 px): ícone e nome;
  - **encolhido** (68 px): só o ícone, e o nome aparece ao passar o mouse. Item com número (os
    orçamentos em aberto) ganha um ponto laranja.
- **Por que não só ícones**: ícone sozinho é mais lento de reconhecer, e aqui alguns são parecidos
  (Contas a Pagar e a Receber; Fornecedores e Funcionários). Quem acabou de comprar o sistema começa
  com o menu **aberto**. **(escolha do Claude)**
- **O item ativo** tem um fundo laranja fraco que **desliza** de um item pro outro, e o ícone fica
  laranja.
- **As abas de dentro das telas continuam com palavra**, com um traço laranja embaixo da ativa.
- **Embaixo**: quem está logado, e Diagnóstico, Auditoria, Configurações e Sair como ícones com dica.

## 8. O movimento

Regra geral: **curto, e sempre de um jeito só**. Movimento serve pra mostrar de onde a coisa veio.

| O quê | Como | Quanto |
|---|---|---|
| Trocar de tela | cada bloco sobe 12 px e aparece, um depois do outro (45 ms de intervalo) | 0,42 s por bloco |
| Item ativo do menu | o fundo desliza até o novo item | 0,3 s |
| Abrir e encolher o menu | a largura muda, os nomes somem | 0,26 s |
| Abrir janela | o fundo escurece; o painel sobe 14 px e cresce de 96% pra 100% | 0,28 s |
| Menu de três pontos | brota do canto do botão | 0,16 s |
| Número grande do Início | conta de zero até o valor | 0,75 s |
| Fio do gráfico | é desenhado da esquerda pra direita | 0,9 s |
| Botão | ao passar o mouse clareia; ao clicar encolhe pra 97% | 0,12 s |

- **Uma curva só** pra tudo: `cubic-bezier(.2, .8, .2, 1)` (começa rápido, freia macio).
- **Quem desligou as animações no Windows não vê nenhuma** (`prefers-reduced-motion`). Obrigatório.
- **Nada pisca, nada fica em laço**, e nada atrasa o clique: a pessoa está com o cliente na frente.
- **Só CSS**, sem biblioteca de animação. **(escolha do Claude)**: o que os vídeos mostram cabe em
  CSS, e biblioteca a mais é peso e manutenção.

## 9. A logo

- **Escolhida: a B** (Sofia, 14/11/2026). A A e a C ficam guardadas só como registro.
- **Desenho**: flor de cerejeira de cinco pétalas (cada uma com o "V" na ponta) e a engrenagem. As
  três versões estão em `conceito/logo/` e saem do `conceito/logo.mjs`, por conta, sem desenho à mão:
  - **A**: a engrenagem atrás, com os dentes aparecendo entre as pétalas, e uma menor no miolo;
  - **B**: só a flor e a engrenagem sozinha no miolo;
  - **C**: as pétalas saindo de um aro, como dentes; lembra também um cubo de roda.
- **Degradê**: de cima à direita pra baixo à esquerda: `#FFE4D6` → `#FFA070` → `#FF5722` → `#E11D48`.
  Ele atravessa a marca inteira de uma vez (não é pétala por pétala).
- **Versão pequena** (`mini`): em 16 e 24 px os dentes somem, então o ícone da janela usa pétalas mais
  cheias e um furo redondo. Vale pra qualquer das três.
- **Uma cor só**: branca, em cima do degradê ou de foto.
- **O nome**: "Sakura System" em Plus Jakarta Sans 800; embaixo "AUTOCENTER EDITION" em 500,
  maiúsculas bem espaçadas (0,3 em); "by Sakura Corp" pequeno e cinza.
- **Onde troca no programa**: `public/sakura-icon.svg`, `public/sakura-logo.svg`, `build/icon.png`
  (1024 px, o do instalador), `src/components/Logo.tsx`, e as cópias em `site/`.
- **A regra da apresentação comercial continua**: sem a flor na capa e no encerramento, até ela dizer
  o contrário (`docs/decisoes.md`).

## 10. Como levar pro programa sem quebrar as 54 telas

**(escolha do Claude; é decisão estrutural, então precisa do "sim" dela antes da tarefa 1.)**

1. **Primeiro, só os valores.** Trocar os valores dos tokens `--color-sakura-*` de hoje pelos novos,
   no `globals.css`. O programa inteiro muda de cor num arquivo só, e dá pra ver a tela-piloto no
   mesmo dia.

   | Token de hoje | Hoje | Passa a valer |
   |---|---|---|
   | `sakura-bg` | `#0b070a` | `#0A0A0D` |
   | `sakura-pink-soft` | `#1a1018` | `#191920` |
   | `sakura-gray` | `#3a3238` | `#2C2C35` |
   | `sakura-purple-dark` (texto claro) | `#e8d5e5` | `#F4F4F5` |
   | `sakura-muted` | `#9e8d9a` | `#A1A1AA` |
   | `sakura-purple` (destaque) | `#b624ff` | `#FF5722` |
   | `sakura-pink` | `#ff4dce` | `#FF7A4D` |
   | `sakura-focus` | `#ffb3ec` | `#FFB199` |
   | `sakura-borda-campo` | branco a 35% | igual |

   **O cuidado**: onde o `sakura-purple` é **fundo de botão com letra branca**, a letra tem que virar
   escura (regra 3). O `npm run contraste` e o `contraste:telas` acham todos.
2. **Depois, os nomes de papel** (seção 3), criados ao lado dos antigos, e as peças da seção 6 como
   componentes.
3. **A tela-piloto é o Início**, mostrada pra Sofia antes de mexer nas outras (#990).
4. **As outras telas em grupos**, cada grupo passando no `contraste:telas` e no `largura:telas`.
5. **Os nomes antigos só saem no fim**, quando nenhuma tela usar mais.

## 11. O que ficou aberto

- **O tema claro**: falta desenhar (as superfícies claras, e conferir cada cor de aviso contra fundo
  claro, porque o amarelo e o verde de hoje não passam no branco). Onde fica a configuração: por
  computador, em Configurações, é a recomendação.
- **O ícone que muda com o tema**: dentro do programa (menu, Login) é simples. O ícone do Windows (área
  de trabalho, instalador) é um arquivo só, fixo: fica o claro. O da barra de tarefas dá pra trocar
  com o programa aberto; decidir se vale o trabalho.
- **Ícones do menu**: desenhados à mão no código, como hoje, ou uma biblioteca de ícones. Biblioteca
  é decisão dela.
- **O fio de gráfico nos cartões do Início** muda a decisão de 11/09 (TL-04: só o valor e a seta) e
  precisa de um número por dia, que hoje a tela não busca.
- **Som**: na gaveta.
- **A marca da empresa** (rosa e roxo): outro assunto, outra sessão. Os códigos de cor que aparecem
  na imagem rosa foram inventados pela IA de imagem e não servem.

## Como refazer a página e as fotos

Na pasta `conceito/`:

```
node montar.mjs          # junta pagina.html + logo.mjs e gera conceito.html, conceito-local.html e logo/
node fotografar.mjs 2    # tira as fotos da versão local, em alta definição, na pasta fotos/
```

`pagina.html` é o modelo (aparência, telas e o movimento), `logo.mjs` desenha as logos e
`montar.mjs` junta os dois com os ícones. Os dados são inventados (os mesmos nomes do "Auto Center
Modelo" das fotos do site).
