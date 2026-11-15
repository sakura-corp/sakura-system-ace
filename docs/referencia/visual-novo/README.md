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
- **Nada cresce sem limite** (14/11, na sessão que aplicou a base): "as coisas não podem ficar
  aumentando muito; é um problema do sistema hoje". O que pode aumentar tem tamanho fixo e **rola por
  dentro**, ou **abre em outra aba**. A Central do dia é o modelo (seção 6, "O que pode crescer").
- **As respostas das três perguntas** (14/11): as duas letras vão **dentro do programa**; os ícones
  vêm da biblioteca **`lucide-react`**; o **tema claro entra já**, logo depois das peças (tarefa 2).
  As referências verdes que ela trouxe valem **pelo estilo** (o grão, o cartão de destaque com
  brilho, o menu de ícones arredondado); a cor continua laranja com carmesim.
- **O resto ela delegou** ("o que for melhor, com base em técnica e design"). O que foi escolhido por
  essa delegação está marcado com **(escolha do Claude)** e pode ser trocado por ela.
- **Quem mexe numa tela procura o que melhorar nela** (15/11, na sessão das peças): "quero melhorar
  bastante, deixar o sistema mais bonito, funcionando melhor, **menos confuso**. Acho que esse é o
  principal." Toda tarefa do visual novo olha a tela inteira, não só a tinta, e **sugere** o que
  deixaria ela mais clara. O que for essencial pode ser pesquisado e decidido por quem está fazendo,
  **mostrando o resultado a ela**; o que muda costume da loja, conta ou documento continua voltando
  pra ela antes. Como fazer está na seção 12.
- **A janela do programa** (15/11): a faixa branca do Windows em cima do programa "fica feia"; ela
  quer a barra na cor do programa e, se der, a janela de canto arredondado. Entra na tarefa da logo
  e do Login (seção 12).
- **Notas Fiscais** (15/11): a nota **do cliente** tem que ser fácil de achar (hoje só aparece "Ver
  DANFE", e depois de finalizar a OS o caminho é difícil), e os botões de **baixar** têm que dizer
  o que baixam e pra quem é. Entra na tarefa da tela de Notas Fiscais e na das OS (seção 12).

O que **não** muda: nenhum campo, coluna, filtro, atalho ou botão some (regra da #990). Só muda
aparência, hierarquia e organização.

**O conceito vale pela aparência, não pelo conteúdo** (Sofia, 14/11: "confere se aquilo faz sentido,
não vai fazendo cegamente"). As telas do conceito foram desenhadas com dados e botões inventados, e
algumas coisas ali estão erradas. Antes de aplicar cada bloco, comparar com a tela de verdade: no
que divergir em **texto, botão, coluna ou lugar**, vale a tela de verdade, e a dúvida vai pra ela
com a recomendação. O que já foi achado no Início do conceito (`3-inicio.jpg`):

| No conceito | No programa de verdade | O que fazer |
|---|---|---|
| Cada linha da Central do dia tem **um** botão ("Ver a nota", "Abrir a conta") | Tem **um ou dois** ("Cobrar" e "Receber"; "Avisar" e "Abrir a OS"; "Pagar") | Manter os botões de verdade, todos; nenhum some |
| Os cartões dizem "Vendas mês" e "Lucros mês" | "Recebido no mês" e "Lucro do mês" | Manter os nomes de verdade (recebido não é vendido) |
| "Ver relações completas" dentro do cartão "OS abertas" | Fica embaixo dos três cartões de número, que é do que ele fala | Deixar junto dos números |
| Selo "Em andamento" em toda linha de "OS abertas" | A tabela não tem coluna de status | Perguntar: a lista só tem OS aberta, o selo repete a mesma palavra em toda linha |
| "Auto Center Modelo · Matriz" no alto, à direita | Conferir onde a troca de loja fica hoje antes de mover | Não inventar botão novo |
| O número de "Orçamentos" num círculo cinza | As regras (seção 7) pedem o ponto laranja | Seguir as regras |


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
| Dica | `dica` | `#FFFFFF` | a caixinha que aparece ao passar o mouse |
| Letra sobre a dica | `sobre-dica` | `#111111` | 18,9 |
| Placa | `placa` | `#0E0E13` | o fundo da placa do carro |
| Faixa da placa | `placa-faixa` | `#2F62E0` | a faixa azul de cima |

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
- **O vidro** (`backdrop-filter: blur`) fica **só no cartão do Login** (a classe `sakura-vidro`, usada
  também na tela de conexão e na de trocar a senha). Os cartões das telas (`sakura-card`) são
  sólidos desde a tarefa 2. Motivo: vidro em cima de fundo que muda foi o que derrubou o contraste dos campos em
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

### Onde está cada peça (prontas desde a tarefa 2, 15/11)

**Tela nova não escreve mais as classes do botão, do selo ou do campo à mão: usa a peça.** As telas
antigas trocam cada uma na tarefa dela (as 8 em diante); até lá convivem os dois jeitos.

| Peça | Onde | Como usar |
|---|---|---|
| Botão | `src/components/Botao.tsx` | `<Botao variante="principal">Faturar</Botao>`. Variantes: `principal`, `secundario` (o padrão), `fantasma`, `whatsapp`. Tamanhos: `pequeno` (32), `medio` (40), `grande` (48). `LinkBotao` é o mesmo botão quando o clique leva pra outra tela. Só com ícone: `soIcone`, e aí o `aria-label` é obrigatório. |
| Botão do WhatsApp | `src/components/BotaoWhatsapp.tsx` | como antes; por dentro é a variante `whatsapp` do `Botao`. |
| Selo de aviso | `src/components/Selo.tsx` | `<Selo tipo="atencao" palavra="Concluída" />`. Tipos: `info`, `atencao`, `ok`, `perigo`, `neutro`. **Sem a `palavra` não compila** (regra 4); o ícone tem um padrão por tipo e pode ser trocado. |
| Placa | `src/components/LinkPlaca.tsx` | `<LinkPlaca veiculoId={…} placa={…} />`, como antes. |
| Cartão | a classe `sakura-card` | sólido, canto de 18 px. |
| Cartão de número | `src/components/CartaoNumero.tsx` | o rótulo, o "?", o número (um `<Valor />`) e a `<Variacao contra="outubro" />`. Com `para="/rota"`, o cartão inteiro é clicável. Ainda sem o fio de gráfico. |
| Tabela | a classe `sakura-tabela` | no `<table>`, dentro de um `sakura-card overflow-hidden`; valor em dinheiro com `text-right`. |
| Campo | as classes `sakura-campo` e `sakura-rotulo` | `<label class="sakura-rotulo">Nome <input class="sakura-campo" /></label>`. No filtro, somar `sakura-campo-filtro`. Serve pra `input`, `select` e `textarea`. Recusado pela validação: `aria-invalid="true"`. |
| Janela | `src/components/Modal.tsx` | como antes, e agora com `total={{ rotulo, valor }}` no cabeçalho e `rodape={…}` com as ações (o botão principal por último). |
| Aviso que some sozinho | `avisar("OS 148 faturada")`, de `src/lib/avisoQueSome.ts` | **só pra confirmação**. Erro não some sozinho: continua do lado do botão que falhou. |
| Dica | `src/components/Dica.tsx` | `<Dica texto="Mais ações"><button>…</button></Dica>`. Entra no lugar do `title`; **não usar os dois juntos**. Aparece no mouse e no teclado. |

**A mostra das peças.** Todas as peças, desenhadas com o componente de verdade e com a linha de
código de como usar, estão numa página que **não faz parte do programa das lojas**
(`docs/referencia/visual-novo/pecas.html`, com o código em `src/galeria-de-pecas/`). As fotos dela
estão em `andamento/2-pecas/`. Pra abrir no PC, com o projeto instalado:

```
npx vite --config site/ferramentas/vite.telas.config.ts
```

e no navegador `http://localhost:5199/docs/referencia/visual-novo/pecas.html`. Pra refazer as fotos
e conferir o contraste da página: `node docs/referencia/visual-novo/fotografar-pecas.mjs`. **Peça
nova entra na mostra no mesmo PR**: é onde o tema claro vai conferir todas de uma vez.

**O que as peças fizeram diferente do conceito, e por quê** (escolhas do Claude, 15/11):
- **O foco do campo** é a borda laranja com 2 px mais o anel fraco, no lugar do anel de foco geral
  do programa. No conceito a borda tinha 1 px a 70%; o balcão é operado só no teclado, então o foco
  ficou mais forte (6,9:1 contra o cartão).
- **O campo desligado** fica com a borda tracejada e a letra mais fraca. A borda não clareia: abaixo
  de 3:1 o campo some do formulário (a medição de contraste reprovou a primeira versão).
- **O botão desligado** é cinza sólido com a letra secundária, nos quatro tipos: dá pra ler o que ele
  faria.
- **A placa** tem 32 px de altura (o conceito tinha 26): é o alvo de clique das listas (TR-02.1).
- **A dica** espera o mouse parar (0,35 s) e acompanha o botão quando a tela rola. No teclado
  aparece na hora, e só no teclado: foco que veio de clique, ou que o programa devolveu sozinho (a
  janela que fecha), não acende dica. Dentro de uma janela, o Esc fecha só a dica.
- **O aviso que some** fica fora do alcance do "mudo" que a janela põe no resto da tela: o aviso de
  "OS faturada" sai no mesmo clique que fecha a janela, e o leitor de tela precisa anunciar.
- **O fundo atrás da janela** fica desfocado, como no conceito. Em 03/10 (#361) ela tinha escolhido,
  por imagem, o fundo nítido e só escurecido; o painel continua opaco, que era o motivo daquela
  escolha. Se o desfoque incomodar no uso, é uma linha (`sakura-modal-fundo`, no `globals.css`).
- **"0%" sem sinal** na variação que arredonda pra zero (antes saía "+0%").

### O que pode crescer (regra da Sofia, 14/11)

Um bloco que recebe uma lista **não estica a tela** quando a lista aumenta. Vale pra toda tela nova:

- **Tamanho fixo, rolando por dentro.** O bloco tem a altura de um número certo de linhas e a lista
  rola dentro dele, com o `AreaRolavel.tsx` (a barra arredondada que o programa já tem). O que está
  em volta não sai do lugar.
- **A Central do dia é o modelo**: sempre a altura de **4 linhas** (a da foto `3-inicio.jpg`), com 1
  item ou com 15. A capa continua dizendo o total ("9 coisas pedem a sua atenção"), pra ninguém
  achar que só existem as 4 que estão à vista; com mais de 4, a lista rola.
- **Quando rolar não serve** (a lista é o assunto da tela, ou a pessoa precisa comparar linhas
  distantes): o bloco mostra as primeiras e um "Ver todas", que **abre em outra aba ou tela**.
- **Dá pra ver que tem mais**: a última linha à vista aparece cortada ou esmaecida, e a barra de
  rolagem fica visível. Lista que rola sem avisar é lista que ninguém rola.
- **Não vale pra tabela principal da tela** (a lista de OS, de clientes): essa é a tela, e continua
  rolando a página inteira, como hoje.

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

- **O tema claro**: feito e aprovado em 15/11 (seção 13). Abertas: o atalho de tema no menu e a opção
  "Automático".
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

## 12. Melhorar enquanto mexe (pedido da Sofia, 15/11)

O visual novo não é só tinta: o objetivo é o programa ficar **menos confuso**. Quem leva uma tela
pro visual novo faz, na mesma tarefa:

1. **Usa a tela como quem está no balcão** antes de mexer: o que a pessoa veio fazer aqui, e em
   quantos cliques ela chega lá. O que está escondido e é usado todo dia? O que tem nome que só quem
   programou entende?
2. **Anota o que achou** no relatório da tarefa, em três montes: o que **já fez** (era aparência ou
   organização, sem mudar costume); o que **sugere**, com a recomendação; e o que **virou tarefa**
   (defeito achado de passagem vira issue na hora).
3. **Decide sozinho só o que é de aparência e de clareza** (nome de botão, ordem, o que fica à vista
   e o que vai pros três pontos), e **mostra o resultado**. Mudou costume da loja, conta, nota
   fiscal ou documento: volta pra Sofia antes.
4. **Nada some** (a regra da #990 continua): mudou de lugar, diz onde foi parar.

### O que ela já apontou (15/11), com a recomendação

**A janela do programa** (entra na tarefa 6, a da logo e do Login, que já mexe no Electron):
- **A barra de cima na cor do programa.** O Electron deixa esconder a barra do Windows e manter os
  três botões de verdade (minimizar, maximizar, fechar) por cima do programa, na cor que a gente
  escolher (`titleBarStyle: "hidden"` com `titleBarOverlay`, no `electron/main.ts`). Arrastar a
  janela, o duplo clique que maximiza e o encaixe na lateral continuam funcionando, porque os botões
  e a área de arrastar continuam sendo do Windows. **(recomendação do Claude)**: é o jeito que não
  quebra nada do que o Windows já faz.
- **O canto arredondado.** No Windows 11 a janela já ganha canto arredondado sozinha, com a barra
  nova inclusive. No Windows 10 o canto é reto, e forçar o arredondado exige uma janela
  transparente desenhada inteira pelo programa, que perde a sombra, o encaixe na lateral e o
  redimensionar pelas bordas. **(recomendação do Claude)**: não forçar; conferir qual Windows as
  lojas usam antes de decidir.
- **Isto ainda não foi testado num Windows de verdade**: a sessão das peças não abre o Electron.
  Quem fizer a tarefa confere as duas coisas no instalador de teste, no Windows 10 e no 11, antes
  de dar como certo.
- **De passagem**: a janela nasce com o fundo **rosa-claro** do tema antigo (`backgroundColor:
  "#FFF7FC"` no `electron/main.ts`), que aparece por um instante ao abrir o programa. Trocar pelo
  `#0A0A0D` na mesma tarefa.

**Notas Fiscais** (entra na tarefa da tela de Notas Fiscais, e a parte da OS na tarefa 7):
- **A nota do cliente à vista.** Hoje a linha mostra "Ver DANFE", que é nome de quem programa. O
  botão passa a dizer o que a pessoa quer ("Ver a nota" ou "Nota do cliente"), e na linha fica o
  próximo passo de verdade: abrir, imprimir ou mandar pro cliente.
- **Depois de finalizar a OS**, o caminho pra nota fica à mão: no aviso de "OS faturada" e na linha
  da OS finalizada, sem precisar ir até Notas Fiscais procurar.
- **Baixar, sem adivinhação.** Cada opção de baixar diz o que é e pra quem serve: o **PDF** é a nota
  pra ler e imprimir (a do cliente); o **XML** é o arquivo que o contador pede; "os XML do mês" é o
  pacote que vai pro contador de uma vez.
- Antes de desenhar, conferir a #773 (o "Ver documento oficial completo" da NFS-e que não abre):
  pode ser parte do mesmo aperto.

## 13. O tema claro (na `main` desde 15/11/2026; a Sofia aprovou a cara "por enquanto")

**Como funciona.** O tema é um atributo no `<html>` (`data-tema="claro"`), posto pelo
`src/lib/tema.ts` com a escolha guardada **neste computador** (o padrão é o escuro). Quem troca é a
seção **"Aparência deste computador"**, em Configurações: troca na hora, sem salvar. Os valores do
segundo tema estão num bloco só do `src/styles/globals.css` (`:root[data-tema="claro"]`). **Nenhuma
tela tem classe de tema**: a tela usa o nome de papel (ou o nome antigo) e o valor troca sozinho. Só
a logo pergunta qual é o tema (`useTema()`), porque troca de arquivo.

**As cores do claro** (contraste contra o cartão branco):

| Papel | Escuro | Claro | |
|---|---|---|---|
| `fundo` | `#0A0A0D` | `#F3F2EF` | um branco levemente quente, pra combinar com o laranja |
| `painel` | `#121217` | `#FAF9F7` | |
| `cartao`, `campo`, `janela` | `#191920`… | `#FFFFFF` | |
| `passar` | `#22222B` | `#EFEDEA` | |
| `linha` / `linha-forte` | branco a 8% / 16% | escuro a 10% / 22% | |
| `borda-campo` | branco a 35% | escuro a 55% | 4:1 |
| `texto` | `#FFFFFF` | `#1B1B1F` | 17:1 |
| `texto-2` | `#A1A1AA` | `#55555E` | 7,4:1 |
| `texto-3` | `#8A8A94` | `#6C6C76` | 5,2:1 |
| `acao` e `sobre-acao` | `#FF5722` e `#1B0B05` | **iguais** | o botão é o mesmo nos dois (regra 3) |
| laranja como **letra ou ícone** | `#FF7A4D` | `#AD3508` | o laranja do botão em letra no branco dá 3,2:1 |
| laranja como **borda de foco** | `#FF5722` | `#D9430F` | o contorno pede 3:1 |
| `info` | `#60A5FA` | `#1D4ED8` | |
| `atencao` | `#FACC15` | `#8A5300` | o amarelo vira um âmbar escuro: amarelo no branco dá 1,5:1 |
| `ok` | `#34D399` | `#05694D` | |
| `perigo` | `#F87171` | `#B91C1C` | |
| `zap` | `#25D366` | `#0E7A3F` | |
| `dica` e `sobre-dica` | branca, letra preta | **escura, letra branca** | inverte, pra continuar saltando |
| `placa` | `#0E0E13` | `#FFFFFF` | branca com a letra escura, como a placa Mercosul de verdade |
| `poco` (fundo rebaixado) | preto a 25% | escuro a 5% | novo: entrou no lugar do `bg-black/20` e `/30` |

**(escolhas do Claude)**, todas. O carmesim e o cartão de destaque não mudam: o destaque continua
escuro nos dois temas, é o momento de marca.

**Regras pra quem escreve tela** (valem desde já, nos dois temas):
- **Nada de `text-white`, `bg-white/10`, `border-white/10`, `bg-black/20`** em cima de superfície do
  tema: é `text-texto`, `bg-texto/10`, `border-texto/10`, `bg-poco`. No escuro dá na mesma; no claro
  é o que faz a tela aparecer. `text-white` só em cima de cor cheia (um botão vermelho).
- **Sombra do que flutua**: `var(--sombra-forte)`, não `rgba(0,0,0,…)`.
- **As varreduras rodam nos dois temas**: `npm run contraste` (rápida) e `npm run contraste:telas`
  (`-- claro` ou `-- escuro` roda um só). Reprovou num, reprovou.
- **Fotos nos dois temas**: `node docs/referencia/visual-novo/fotografar-telas.mjs <pasta> [cenas]` e
  `fotografar-pecas.mjs <pasta> claro`. As desta tarefa estão em `andamento/3-tema-claro/`.

**O que ficou de fora, de propósito**: a logo de dentro do programa no claro é a antiga com a letra
escura (`public/sakura-logo-claro.svg`); a nova, nas duas versões, é da tarefa 6. A barra da janela
e o fundo com que o Electron nasce também são da tarefa 6. O Login no claro usa o mesmo desenho de
manchas com grão, em base creme.

**Sugestões achadas de passagem** (seção 12): um atalho de trocar o tema no rodapé do menu (entra
bem na tarefa do menu), porque Configurações só o administrador abre; e a seção "Aparência" poder
seguir o tema do Windows ("Automático"), se ela quiser.

## Como refazer a página e as fotos

Na pasta `conceito/`:

```
node montar.mjs          # junta pagina.html + logo.mjs e gera conceito.html, conceito-local.html e logo/
node fotografar.mjs 2    # tira as fotos da versão local, em alta definição, na pasta fotos/
```

`pagina.html` é o modelo (aparência, telas e o movimento), `logo.mjs` desenha as logos e
`montar.mjs` junta os dois com os ícones. Os dados são inventados (os mesmos nomes do "Auto Center
Modelo" das fotos do site).
