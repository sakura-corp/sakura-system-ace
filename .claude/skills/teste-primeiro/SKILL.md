---
name: teste-primeiro
description: RASCUNHO (a Sofia ainda vai revisar). Escreve o teste ANTES do código, uma fatia por vez (vê o teste reprovar, faz o mínimo pra passar, repete), testando pela porta pública e sem teste que passa por construção. Use SÓ quando a pessoa digitar /teste-primeiro ou pedir "teste primeiro" ou "escreve o teste antes", ou quando uma skill chefe-* mandar usar ao escrever código. Não use em pedido comum de rodar teste.
---

# Teste primeiro — Sakura System

> Adaptada de `tdd` do repositório público `mattpocock/skills` (licença MIT, Copyright (c) 2026 Matt Pocock), commit `49dd158`. Lida e reescrita, não instalada: mudar aqui é decisão nossa, não atualização de lá.

Fale **sempre em português simples**. O ciclo é: **vermelho** (o teste reprova) → **verde** (o
mínimo de código pra passar). O teste vem antes, e só vale se você o viu reprovar.

## 1. Antes: combinar as "costuras"
Costura é a **porta pública** que o teste usa: o que quem chama enxerga, sem mexer no miolo.
Antes de escrever qualquer teste, escreva **quais portas vão ser testadas**, com uma linha cada
sobre **o que pega e o que não pega**, e combine com a pessoa. Não escreva teste em porta não
combinada. Se a pessoa não está na conversa, **anote no PR** em vez de esperar.

Portas típicas daqui:
- função de `src/schemas/` (conta de dinheiro mora lá, item 49 de `docs/licoes.md`);
- a **tela montada** com `@testing-library/react`: a costura entre conta e tela é onde os bugs
  moram (item 62).

## 2. O ciclo (uma fatia por vez)
1. Escreva **um** teste pra **um** comportamento.
2. Rode e **veja reprovar**, e pelo **motivo certo**: o sintoma que você esperava, não erro de
   sintaxe ou de import (item 76).
3. Escreva o **mínimo** de código pra passar. Nada de adiantar teste futuro nem "já deixar pronto".
4. Rode, veja verde, e volte ao passo 1.

**Nunca escreva todos os testes antes** ("fatia horizontal"): teste em bloco confere o que você
imagina, não o que o código faz, e trava a forma antes de você entender o problema. Refatorar
**fica fora do ciclo**: vai pra revisão.

## 3. Teste bom e teste ruim
Bom: confere o **comportamento** pela porta pública, e continua passando se o miolo mudar.
- **Preso ao miolo (ruim)**: finge um colaborador interno, testa função privada ou confere "por
  fora" (olha o banco em vez de usar a porta). Sinal: quebra numa mudança que não alterou o
  comportamento.
- **Tautológico (ruim)**: o esperado é calculado do mesmo jeito que o código, então passa sempre.
  O esperado vem de fonte **independente**: número escrito à mão, exemplo resolvido, a regra da
  tarefa.

```ts
// RUIM: o esperado repete a conta do código
const esperado = itens.reduce((s, i) => s + i.preco, 0)
expect(totalDaVenda(itens)).toBe(esperado)

// BOM: número escrito à mão
expect(totalDaVenda([{ preco: 10 }, { preco: 5 }])).toBe(15)
```

## 4. Regras do nosso projeto
- **Vitest**, com o teste ao lado do arquivo: `<arquivo>.test.ts` (`docs/estrutura.md`).
- **"Só vale o teste que eu VI reprovar."** Passou de primeira? **Desconfie.** Quebre o código de
  propósito, veja ficar vermelho, desfaça e confira com `git diff` que a quebra **não ficou**
  (itens 76 e 77).
- **jsdom não tem layout**: `offsetParent` é sempre `null` (item 77). Código que depende disso
  (como o Enter que pula de campo) não faz nada no teste, e o teste passa sem provar nada: simule
  o que falta só naquele teste.
- **Data**: rode `npm run test:fusos` (São Paulo e UTC). Dia de calendário com `hojeLocal()` ou
  `diaLocal()` (itens 34, 42, 48).
- **Banco** (`test:sql`, `test:rls`): só roda no CI (Linux). Sem Postgres no ambiente, **diga isso
  e não finja** que rodou.
- **Credencial**: nenhuma de verdade em teste; credencial de mentira em formato real é pega pela
  varredura (item 64).
- **Nunca pule nem desligue teste** pra ficar verde.

## 5. No fim: as conferências
`npm run typecheck`, `npm run lint`, `npm run test:fusos`, `npm run contraste`. Mexeu em tela?
Também `npm run contraste:telas` e `npm run largura:telas`.

No relatório ou PR, diga **o que você viu reprovar e como quebrou** o código pra ver.
