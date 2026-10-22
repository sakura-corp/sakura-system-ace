# Projetos secundários: o fluxo e quem faz o quê

> Parte da memória do projeto. O índice é o `PROJETO_STATUS.md`. Abrir quando a tarefa ou a
> conversa for de um **projeto secundário** (não do SSACE), de uma **proposta** de projeto, ou da
> aba "Projetos secundários" do painel. Decidido pela Sofia em 22/10/2026 (#733).
>
> ⛔ **Este arquivo é público.** As **políticas** dos secundários (o que a Sakura aceita fazer, como
> cobra, com quem) moram no repositório **privado** `sakura-corp/secundarios`, nunca aqui. Nada de
> política, preço, estratégia ou nome de cliente neste arquivo.

## O que é

**Projetos secundários** são projetos pequenos da Sakura, fora do SSACE, pra fazer caixa logo.
Cada um mora no **seu próprio repositório privado** da `sakura-corp`, criado a partir do
`modelo-projeto`, com as **suas levas** e as suas tarefas.

- **O Gusta (Gustavo, `GustavoSakuras`) guia os projetos secundários.** Ele organiza; **não é dono
  sozinho**: todo mundo trabalha em tudo, decide junto e cuida do pós-venda junto.
- **O SSACE não muda em nada**: lá continuam valendo inteiras as regras da seção 0 do
  `PROJETO_STATUS.md` (a equipe não escreve tarefa e nunca mescla).

## O fluxo, da ideia ao repositório

1. **Ideia**: qualquer pessoa da equipe.
2. **Entrevista**: a skill `nova-proposta`, que mora no `sakura-corp/secundarios`, entrevista a pessoa e fecha as pontas da ideia.
3. **Relatório**: a entrevista vira uma proposta escrita, uma issue no `sakura-corp/secundarios`.
4. **Análise da Sofia**: a Sofia e o Claude dela analisam a proposta **contra as políticas**,
   adaptam e **devolvem explicando cada mudança**.
5. **Resposta de quem propôs**: aceita a versão adaptada, ou pede outra análise (volta ao passo 4).
6. **Aprovada**: **a Sofia cria o repositório** do projeto a partir do `modelo-projeto`.

## As etiquetas de proposta (no `sakura-corp/secundarios`)

Toda proposta é uma issue com a etiqueta `proposta` e **uma** de estado:

| Etiqueta | Quer dizer |
|---|---|
| `proposta:em-entrevista` | a entrevista (passos 2 e 3) ainda não terminou |
| `proposta:esperando-sofia` | pronta, esperando a análise da Sofia (passo 4) |
| `proposta:com-sugestoes` | a Sofia devolveu adaptada; esperando quem propôs (passo 5) |
| `proposta:aprovada` | aprovada; a Sofia cria o repositório (passo 6) |
| `proposta:recusada` | não vai virar projeto |

No painel, as propostas aparecem na aba "Projetos secundários" (#731), e as que esperam a Sofia,
também em "Decisões da Sofia" (#732).

## Quem faz o quê, **só nos projetos secundários**

Depois que a proposta foi aprovada e o repositório existe:

| Quem | O que pode |
|---|---|
| **Gusta** | **cria as tarefas** (no modelo de `docs/tarefas.md`), **abre e fecha as levas** do projeto e **mescla os PRs**, sempre com **CI verde e uma revisão do Claude antes** de mesclar |
| **Todo mundo da equipe** | pega tarefa, programa, abre PR e decide junto; cuida do pós-venda junto |
| **A Sofia** | aprova a proposta, cria o repositório, e decide **tudo o que está na lista abaixo** |

**Nunca sem a Sofia**, nem nos secundários: **cobrança, preço, contrato, domínio, publicar pra
cliente de verdade, e dado de cliente**. Nesses casos, para e pergunta a ela (o Claude escreve a
mensagem curta).

Continuam valendo em todo projeto, secundário ou não: nada de credencial no repositório; não mexer
em senha (secret), cofre (environment), regra do repositório (ruleset) nem configuração; não
adicionar à sessão o repositório privado `caranovavidanova/sakura-corp`.

## Levas e horas

- **Levas por projeto**: cada projeto conta as suas a partir de 1 (`leva-1`, `leva-2`… no
  repositório dele). A leva atual de um projeto secundário é a menor `leva-N` com tarefa aberta,
  sem as fases do SSACE. As levas do SSACE seguem a numeração delas (depois da 5, vem a 6).
- **Uma tarefa por vez no total**: cada pessoa segura uma tarefa só, **somando o SSACE e todos os
  secundários**. O "Pegar" do painel confere em todos (#731).
- **Horas por projeto**: um quadro de horas por pessoa em cada projeto.

## Onde aparece no painel

A aba **"Projetos secundários"**, no 1º andar (Produção), com as propostas, um cartão por projeto e
a leva de cada um (#731). O painel descobre sozinho quais repositórios são projetos: os da
`sakura-corp` com o tópico `projeto-secundario`. Detalhe em `docs/painel.md`, "Os andares".
