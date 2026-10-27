---
name: entrevista
description: Entrevista a pessoa em rodadas curtas, com uma recomendação por pergunta, até fechar as pontas de uma ideia. Use sozinha quando chegar ideia ou plano ainda aberto ("estou pensando em…", "queria que…"), antes da `nova-tarefa`, ou em /entrevista, "me entrevista", "me sabatina". Não use em defeito, ajuste pequeno, pedido já fechado, nem só pra guardar a ideia (`ideia`).
model: opus
effort: medium
---

# Entrevista — Sakura System

> Adaptada de `grill-with-docs` do repositório público `mattpocock/skills` (licença MIT, Copyright (c) 2026 Matt Pocock), commit `49dd158`. Lida e reescrita, não instalada: mudar aqui é decisão nossa, não atualização de lá.

Fale **sempre em português simples**. Serve pra descobrir o que a pessoa realmente quer **antes**
de planejar. "Estou pensando em…" é plano, não ordem (caderno da Sofia): você
pergunta, não começa nada.

## 1. A árvore de decisões
Todo plano é uma árvore: cada decisão abre outras que dependem dela. Seu trabalho é visitar a
árvore inteira, sem deixar nada "entendido por mim". Trabalhe em **rodadas**.

A **fronteira** são as perguntas que já dá pra fazer agora, sem adivinhar a resposta de outra que
ainda está aberta. Pergunta que depende de outra da mesma rodada fica pra rodada seguinte.

## 2. Como montar uma rodada
- **No máximo umas 5 perguntas** por rodada, em português simples, sem jargão. Se a fronteira
  tiver mais, as que sobram vão na rodada seguinte, primeiro as que destravam mais decisões.
- Cada pergunta é numerada e traz a **sua recomendação**, escrita de modo que **"sim" aceita a
  recomendação**.
- Decisão estrutural (arquitetura, biblioteca, modelagem): dê **opções + recomendação** e espere
  o "sim".

Formato:

```
❓ Pergunta 1 - <título curto>
<a pergunta; se tiver opções, liste>

➡️ Recomendo: <sua resposta, que a pessoa aceita dizendo "sim">

---
❓ Pergunta 2 - ...
```

Depois espere as respostas. Cada resposta muda a árvore: recalcule a fronteira e faça a próxima rodada.

## 3. Fato é seu, decisão é da pessoa
- **Não pergunte o que dá pra achar sozinho.** Procure no código, em `docs/` e na memória do
  projeto. Se a busca for longa, mande um ajudante-rapido buscar.
- **Não trave esperando a busca**: só as perguntas que dependem do fato esperam. O resto da
  fronteira já vai na rodada.
- **Decisão** (o que fazer, o que priorizar, como a loja quer) é da pessoa: pergunte e espere.

## 4. Afiar a linguagem
- **Termo vago**: desafie na hora, conferindo com o nome que `docs/` já usa. "Loja ou empresa?" "Venda de balcão ou ordem de serviço?"
  Proponha o termo certo e peça pra confirmar.
- **Cenário concreto**: pra testar a borda, invente um caso ("e se o cliente paga metade no
  cartão e metade no dinheiro?") e veja se a resposta dela aguenta.
- **Confira no código**: quando ela disser como algo funciona, olhe se o código concorda. Se
  discordar, aponte: "Você disse X, mas o código faz Y. Qual está certo?"

## 5. Terminou quando a fronteira esvazia
Terminou quando todas as pontas foram visitadas e nada ficou "subentendido". Mesmo assim, **não
aja** (não planeje a tarefa, não programe) antes de a pessoa **confirmar que o entendimento é
comum**: resuma em poucas linhas e pergunte "é isso?".

## 6. Se a conversa é por outra sessão
Se quem fala com a pessoa é uma sessão coordenadora, mande cada rodada como **mensagem** pra ela
e **espere a resposta**. Não decida pela pessoa nem preencha a resposta no lugar dela.

## 7. O que entregar no fim
Uma lista curta, em português simples:
- **Decisões**: o que ficou decidido, uma linha cada, **pronta pra colar** na seção "Decisões já
  tomadas" da `nova-tarefa`.
- **Na gaveta**: o que ela mandou deixar pra depois. É adiado, **não** decidido.
- **Ficou aberto**: o que ainda precisa de resposta, e de quem. O que depende da Sofia vira
  tarefa com a etiqueta `sofia`.
- **Pro caderno**: o que a entrevista mostrou do jeito da pessoa (como ela gosta de decidir, de
  receber pergunta), se mudou algo. Só anotado aqui; quem grava é a `fechar`, depois do "confere".

Sugira seguir com a `nova-tarefa`. **Só a Sofia escreve tarefa, ou o Tiago em rascunho** (seção 0):
se quem entrevistou é outra pessoa, diga que a lista vai pra ela (ou pro Tiago escrever o rascunho).

## 8. O que NÃO fazer
- Não crie `GLOSSARY.md` nem `docs/adr/`: não são do nosso jeito.
- Não grave nada em `docs/` por conta própria. **Ela revisa antes de você documentar.** Só depois de
  ela conferir: preferência nova da pessoa vai pro caderno dela (`<usuário>/segundo-cerebro`,
  gravado como na lista 4 da skill `fechar`); decisão vai pra `docs/decisoes.md` só
  se valerem as três: **difícil de voltar atrás**, **estranha pra quem não viu a conversa** e
  **escolha de verdade entre opções**. As outras ficam só na tarefa.
- **Nada de preço, sócio, dado pessoal ou credencial** no que for pro repositório (ele é público).
  Se a conversa tocar nesses assuntos, não repita o dado: avise que isso vai pro repositório
  privado, só com autorização dela.
