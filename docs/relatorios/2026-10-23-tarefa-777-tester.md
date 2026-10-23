# Relatório: tarefa #777, chefe tester

- **Tarefa**: #777, levantamento do que falta pro programa das lojas ficar apresentável
- **Chefe**: tester
- **Data**: 2026-10-23
- **PR**: o PR desta branch (`claude/tarefa-777-apresentavel`)
- **Jeito**: aberta pela /coordenar

## O que cada agente fez
- **Sessão mãe**: leu a issue, rodou as 54 telas com os dados de mentira (um script de uma
  rodada só, no rascunho da sessão, fora do repositório) e fotografou cada uma em 1366 × 768.
  Conferiu o levantamento de 25/09 contra as releases do GitHub e o `docs/modulos.md`. Conferiu de
  novo, na foto e no código, os achados mais graves (venda 149, Caixa Diário, margem com ponto,
  Auditoria, Araraquara fixo, banco falso que ignora `order` e filtro por OS) e escreveu
  `apresentacao/o-que-falta-pra-apresentar.md`.
- **Ajudante médio 1**: olhou as 24 primeiras telas (login até relatórios de estoque) e anotou
  cada problema, com a origem (programa ou dados de mentira) e as horas.
- **Ajudante médio 2**: o mesmo nas 27 telas seguintes (fornecedores até computadores).

## Modelos usados
- Ler a issue, planejar e juntar a lista: sessão mãe (a da sessão), esforço baixo
- Rodar as telas e fotografar: feito **pela própria mãe**, sem ajudante rápido (era um comando
  só; chamar um ajudante custaria mais que rodar)
- Olhar as fotos e anotar: 2 × `ajudante-medio` (o modelo e o esforço do agente pronto), em paralelo

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (arquivo, medido antes do commit e do PR): 30 respostas; entrada 61,
  cache criado 124.089, cache lido 3.542.394, saída 17.676
- **Ajudantes**: 2. Médio 1: aviso 148.956 tokens, 42 ferramentas; arquivo: 22 respostas, cache
  criado 138.427, cache lido 2.244.765, saída 26.227. Médio 2: aviso 170.897 tokens, 55
  ferramentas; arquivo: 28 respostas, cache criado 161.553, cache lido 3.356.172, saída 28.507
- **Sessões filhas**: nenhuma
- **`/goal`**: não sei se foi ligado (o texto foi mandado à coordenadora na mensagem de começo; a
  coordenadora confere)

## O que testei e VI reprovar
- Nada: a tarefa é só leitura, sem teste novo.

## O que passou sem eu ter visto reprovar
- As conferências do CI (o PR não mexe em código; só dois arquivos `.md`).

## O que ficou de fora
- **As fotos não estão anexadas no PR.** As ferramentas desta sessão não sobem imagem pro GitHub,
  e a regra da tarefa é não pôr foto no repositório. Cada problema está descrito na lista com o
  texto exato que aparece na tela. Pra refazer as fotos (2 a 3 minutos, as 54 telas), na raiz do
  repositório, com `npm ci` feito e o Playwright disponível, salvar isto como
  `fotografar.mjs` **fora do repositório** e rodar `node fotografar.mjs <pasta-de-saida>`:
  ```js
  import { percorrerTelas } from "<raiz>/site/ferramentas/percorrer-telas.mjs";
  import { comServidorDeTelas } from "<raiz>/site/ferramentas/servidor-telas.mjs";
  const SAIDA = process.argv[2];
  process.exit(await comServidorDeTelas(async () => {
    const { falhas } = await percorrerTelas(async (cena, p) => {
      await p.setViewportSize({ width: 1366, height: 768 });
      await p.waitForTimeout(400);
      await p.screenshot({ path: `${SAIDA}/${cena.arquivo}.png` });
      await p.setViewportSize({ width: 1600, height: 1000 });
    });
    console.log("falhas", falhas.length);
    return 0;
  }));
  ```
- **O que fica abaixo da dobra** não foi olhado: a área principal rola por dentro, e a foto de
  página inteira sai igual à da janela.
- **O botão de arquivo em inglês** ("Choose File") não foi conferido no Electron do Windows.

## O que depende de alguém
- **A Sofia**: escolher os itens, e decidir se a demonstração vai ser feita na loja inventada (o
  que muda a ordem da lista) e o que fazer com a margem calculada sobre o custo (item 8).
- **Uma pessoa no PC do Balcão**: conferir se o botão de arquivo aparece em português.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: separar o que a nuvem prova do que só o PC prova, e abrir
  as telas pelo passeio que já existe (`percorrerTelas` + `comServidorDeTelas`), sem `.env`.
- **Onde eu errei ou tive que adivinhar**: pedi as fotos de "página inteira" achando que pegariam
  o que fica abaixo da dobra; não pegam (a rolagem é do painel). Também adivinhei o critério de
  "mais grave": pus primeiro o que se contradiz na tela de dinheiro ou de nota, porque é o que
  derruba a confiança numa demonstração.
- **O que faltou na skill**: a `chefe-tester` é feita pra conferir um "Pronto quando" e abrir
  issue de defeito; não diz nada de **levantamento** (só leitura, sem issue por defeito). Segui a
  issue, que pedia a lista em vez das issues.
- **Sugestão de ajuste (opcional)**: um parágrafo na `chefe-tester` pra tarefa de levantamento:
  não abrir issue por item, separar "programa" de "dados de mentira", e lembrar que a foto de página
  inteira não pega o que rola por dentro (precisa rolar o painel `main` e fotografar de novo).
