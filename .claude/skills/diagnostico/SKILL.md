---
name: diagnostico
description: RASCUNHO (a Sofia ainda vai revisar). Acha a causa de um defeito difícil com método, primeiro montando um comando que reproduz o defeito de verdade, depois levantando hipóteses, consertando com teste e limpando. Use SÓ quando a pessoa digitar /diagnostico ou pedir "diagnostica esse defeito" ou "acha a causa", ou quando uma skill chefe-* mandar usar ao investigar defeito. Não use pra ajuste pequeno de causa já conhecida.
model: opus
effort: medium
---

# Diagnóstico de defeito — Sakura System

> Adaptada de `diagnosing-bugs` do repositório público `mattpocock/skills` (licença MIT, Copyright (c) 2026 Matt Pocock), commit `49dd158`. Lida e reescrita, não instalada: mudar aqui é decisão nossa, não atualização de lá.

Fale **sempre em português simples**. Só pule uma fase com motivo dito em voz alta. Conserte só
**dentro da tarefa**. Defeito achado de passagem vira **issue na hora**, no formato da #425 ("o
que acontece", "por quê", "o que fazer", "Pronto quando"), **procurando duplicata antes**. Não mexa
em banco de loja nem rode SQL em Supabase nenhum.

## Fase 0. Tapar segredo
O repositório é **público**. Em toda saída que você mostrar (comando, log, print em texto), troque
senha, token, chave e certificado por `<TAPADO>`. Se tapado não basta pra diagnosticar, diga e peça.

## Fase 1. Montar o "laço" (esta é a skill)
Um **laço** é **um comando** que fica vermelho com o **sintoma exato** que a pessoa contou. Precisa ser:
rápido (segundos), **igual a cada rodada** e rodável por você sozinho. Tem que ter sido **rodado
uma vez, com a saída mostrada**. **Sem laço, não levante hipótese**: pular pra teoria é o erro que
esta skill existe pra evitar.

Jeitos, mais ou menos nesta ordem:
- **teste Vitest** na porta que alcança o defeito;
- `npm run test:fusos`, se for dia ou hora;
- **script Playwright** nas telas (os de `contraste:telas` e `largura:telas` sobem as telas com dados de exemplo);
- `npm run test:electron`, se for ponte ou preload (feito pro CI: se não rodar aqui, diga isso e não finja);
- defeito de banco ou RLS: um `supabase/scripts/testar-*.sql` ou a matriz de RLS, que **só rodam no CI**;
- **script avulso** com entrada fixa;
- **comparar duas versões** (`git bisect run`).

**Último recurso**, quando só uma pessoa no PC reproduz (app instalado, impressora, nota): um roteiro curto, **um passo por vez**, sempre contra o **Supabase de TESTE**, nunca o de
uma loja, e ela devolve o que apareceu. Na nuvem o `*.supabase.co` não é alcançável (item 6 de
`docs/licoes.md`). Se o defeito só aparece com os dados de uma loja, **só a Sofia olha**, sem
gravar nada, e devolve o que viu.

**Apertar o laço**: mais rápido (corte o que não importa), sintoma mais certeiro (confira o
valor errado, não "não deu erro") e sempre igual (fixe a hora e o dia: aqui isso importa muito,
itens 34 e 42).

**Defeito que só às vezes aparece**: a meta é fazer ele aparecer **mais vezes** (repetir 100
vezes, forçar o tempo), não exigir que apareça sempre. Metade das vezes já dá pra investigar.

**Sem laço possível**: pare, diga o que tentou e peça acesso, print ou log **tapado**.

## Fase 2. Reproduzir e encolher
- Veja vermelho com **o mesmo sintoma** que a pessoa contou. Defeito errado = conserto errado.
- Rode **várias vezes**: o resultado tem que se repetir (ou, no defeito que só às vezes aparece,
  aparecer numa taxa alta o bastante).
- **Encolha**: corte uma coisa por vez (dado, passo, configuração) e rode de novo, até tudo que
  sobrou ser necessário pro defeito aparecer.

## Fase 3. Hipóteses
**Antes**, procure em `docs/licoes.md` um padrão de bug parecido. Muitos se repetem: `??` no lugar
de `||` (item 8), dia em UTC (itens 34 e 42), RLS que falha em silêncio (item 15), CSS contra
Tailwind (itens 14, 51, 54), campo que não aceita digitação (itens 10, 17, 39).

Levante **3 a 5 hipóteses**, em ordem, cada uma com a **previsão**: "se a causa é X, mudar Y faz o
defeito sumir". Sem previsão, é palpite: descarte ou afie. **Mostre a lista à pessoa, sem travar
esperando.** Ela pode saber algo que reordena tudo.

## Fase 4. Instrumentar
- Teste **uma variável por vez**, cada sonda ligada a uma previsão.
- Log com etiqueta única, como `[DEBUG-a4f2]`, pra apagar tudo com um `grep`. Nada de "logar tudo".
- **Lentidão**: meça antes de mexer.

## Fase 5. Consertar com teste de regressão
Escreva o teste **antes** do conserto (skill `teste-primeiro`), **só se existir uma porta que
reproduza o defeito de verdade**. Sem porta boa, isso já é um achado: **anote** que o código não
deixa travar esse defeito.
1. Transforme o caso encolhido num teste que reprova.
2. Veja reprovar. Se você forçou o vermelho mexendo no código, `git diff` pra provar que a mudança pegou.
3. Conserte. 4. Veja verde. 5. Rode **de novo o laço da fase 1** no cenário original.

## Fase 6. Limpar
- [ ] o laço original está verde;
- [ ] o teste de regressão passa (ou a falta de porta está anotada);
- [ ] nenhum `[DEBUG-` sobrando (`grep`);
- [ ] rascunhos apagados;
- [ ] **a causa** escrita no commit ou PR, pro próximo não repetir.

Padrão de bug **novo**: proponha um item novo em `docs/licoes.md` no PR.
