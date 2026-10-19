---
name: revisor-de-chefes
description: RASCUNHO (a Sofia ainda vai revisar). O revisor dos chefes do Sakura System — lê os relatórios em docs/relatorios/ e as skills chefe-*, acha padrões que se repetem e propõe melhorias como PR ABERTO. Use SÓ quando o texto pedir "revisar os chefes", "revisar os relatórios dos chefes" ou "use a skill revisor-de-chefes" (inclui a revisão do mês). Não use em pedido comum.
model: opus
effort: medium
---

# Revisor de chefes — Sakura System

Fale **sempre em português simples**. Você lê o que os chefes escreveram sobre o próprio trabalho e
propõe melhorias nas skills deles. **Só propõe**: tudo vira PR **aberto**, e a skill nova ou
alterada só vale depois que a Sofia aprova.

## 1. Antes de começar
1. Conferir quem pede (seção 0 do `PROJETO_STATUS.md`). Quem não é a Sofia pode pedir a revisão, mas
   o PR continua dependendo dela.
2. Ler: `docs/relatorios/README.md` (formato e privacidade), `docs/jeito-de-trabalhar.md` (R1 e os
   chefes) e as skills em `.claude/skills/chefe-*/SKILL.md`.
3. Escolher o que revisar: por padrão, os relatórios **do mês** em `docs/relatorios/AAAA-MM-DD-*.md`;
   se a pessoa pedir outros (um chefe, uma tarefa, um intervalo), esses. Ignorar `README.md` e
   `exemplo.md`. Se não houver relatório, dizer isso e parar.

## 2. Procurar padrões
Procure o que **se repete em mais de um relatório** (ou pesa muito num só):
- o mesmo erro, ou o mesmo "tive que adivinhar", nas seções "Como eu agi";
- regra da skill que ninguém seguiu (ex.: "VI reprovar" vazio, relatório sem "Como eu agi");
- coisa que o relatório pede e a skill não manda (ou o contrário);
- tarefa que não coube em nenhum chefe;
- o que se repete umas 3 vezes e ainda não é skill (candidato a skill nova).
- **gasto** (seção "Gasto" e "Modelos usados"): comparar **tarefas parecidas** (mesmo chefe, mesmo
  tipo de etapa) e procurar o modelo ou esforço que gastou muito mais sem ganho (ex.: "o ajudante
  explorador em médio gastou 3 vezes o de rápido, e achou a mesma coisa"), ou o contrário (o
  rápido errou e a etapa teve que ser refeita). Só tokens e quantidades, nunca dinheiro.
  Só comparar números da **mesma via** (o relatório diz: "aviso" ou "arquivo"; são contas
  diferentes). Relatório com "não medido" não entra na conta; se nenhum tiver "Gasto", dizer isso no PR.
- **gasto por resultado** (ideia copiada do Ruflo, #609 e #635): quanto custa **um PR aceito** em
  cada jeito de trabalhar, e não só cada sessão.
  1. **Classificar pelo GitHub, nunca pelo relatório**: o relatório é escrito antes da revisão da
     Sofia e não sabe se o PR foi aceito. Pra cada relatório do mês, abrir o PR da linha "PR" no
     GitHub e pôr num dos três:
     - **mesclado de primeira**: mesclado sem pedido de mudança e sem commit novo depois da
       primeira revisão;
     - **mesclado depois de refazer**: mesclado, mas teve pedido de mudança ("changes requested")
       ou commit novo depois da primeira revisão (comentário pedindo ajuste também conta). Também
       conta um **segundo PR da mesma tarefa** aberto depois de o primeiro mesclar (um
       "complemento"): os dois PRs valem como um resultado só;
     - **fechado sem mesclar**: fechado sem mesclar (refeito noutro PR, ou abandonado).
     **Quando não há revisão no GitHub** (o comum: a Sofia mescla sem aprovar ali e pede ajuste pela
     coordenadora), a primeira revisão é **a abertura do PR**: olhar os commits com data depois
     dela. Conta como refazer o commit que atende um pedido (da Sofia, da coordenadora, de um
     revisor; a mensagem do commit ou o relatório costumam dizer). **Não conta** o commit da
     própria sessão só pra pôr o link do PR no relatório ou consertar o CI. Na dúvida, marcar
     "refazer?" e dizer qual commit; número incerto é aviso.
     PR ainda aberto não entra (dizer quantos). Sem link de PR no relatório (é o comum: o relatório
     nasce antes do PR): procurar o PR pela branch ou pelo `Closes #N` da tarefa; sem achar, fica
     fora e conta como "sem PR".
  2. **A tabela "tokens por PR mesclado"**, uma linha por valor da linha **"Jeito"** (sessão
     direta, com ajudantes, com sessões filhas, aberta pela /coordenar):
     | Jeito | Via | Relatórios | De primeira | Depois de refazer | Fechados | Tokens somados | Tokens por PR mesclado |
     - "Tokens somados" é o total do "Gasto" desses relatórios (mãe + ajudantes + filhas medidas),
       **todos dos três resultados**, inclusive os fechados: o gasto dos que voltaram ou morreram
       também é custo do jeito. Na via "arquivo", somar as quatro contas (entrada, cache criado,
       cache lido, saída); se o relatório dá só parte delas, entra o que ele dá e a linha diz. O
       gasto costuma ser medido **antes** do PR, então o trabalho de refazer quase nunca está nele:
       escrever isso embaixo da tabela. "Tokens por PR mesclado" = tokens somados ÷ (de primeira + depois de
       refazer). Sem PR mesclado na linha: "—".
     - **Só números da mesma via**: uma tabela pra "arquivo" e outra pra "aviso" (são contas
       diferentes; nunca somar uma com a outra). Se um relatório mistura vias, entra só a parte da
       via da tabela, e isso vai escrito.
     - **Fica fora, e diz quantos**: relatório com "não medido" no gasto e relatório **sem a linha
       "Jeito"** (os anteriores à #635). Embaixo da tabela: "ficaram fora: X sem a linha Jeito, Y
       não medidos, Z com PR aberto, W sem PR". Nunca adivinhar o jeito de um relatório antigo.
  3. **Se um jeito sair muito mais caro por PR aceito** (ex.: o dobro de outro, com pelo menos 3
     relatórios de cada lado) ou se voltar pra refazer bem mais vezes, **propor** o ajuste do
     `ritual-de-tarefa` ou da `/coordenar` na descrição do PR do mês, com a tabela como evidência.
     Só propor: quem decide é a Sofia. Com poucos relatórios, a tabela vai como "só observação".

**Cada achado precisa de evidência**: o nome do arquivo de relatório (e a frase) que o prova. Sem
arquivo citado, não é achado. Não invente padrão a partir de um relatório só sem dizer que é um só.
Conferir cada achado contra o relatório antes de propor; a revisão também erra.

## 3. Propor (sempre em PR aberto)
Branch `revisor/AAAA-MM`. Mudanças possíveis, todas pequenas e justificadas por achado:
- ajuste em `.claude/skills/chefe-*/SKILL.md` ou nesta skill;
- skill nova em `.claude/skills/<nome>/SKILL.md` (frontmatter válido; `description` que só dispara
  quando o texto pede);
- arquivar os relatórios **já revisados**: começo do mês seguinte, mover para
  `docs/relatorios/arquivo/AAAA-MM/` (`git mv`);
- trocar o modelo ou o esforço de uma etapa: **só como proposta na descrição do PR**, com os
  relatórios que provam (os dois lados da comparação). **Nunca** mexer direto na tabela de modelos
  de `docs/tarefas.md`, no cabeçalho de skill ou em `.claude/agents/`: quem muda é a Sofia, depois de
  aprovar.

A descrição do PR traz a **lista de achados**, cada um com: o que se repete, **a evidência (arquivo)**,
a mudança proposta e o que a Sofia perde se ela cortar. Achado sem mudança vai na lista como
"só observação". Traz também a tabela **"tokens por PR mesclado"** (seção 2), com a linha de quem
ficou fora. Abrir o PR e **parar**.

## 4. Limites (valem sempre)
**Nunca**: mesclar; editar skill fora de PR; publicar ou liberar; mexer em secret, cofre, ruleset,
tag, configuração ou workflow; adicionar o repositório privado `sakura-corp`; mexer no "Onde
parou"; escrever credencial, CPF, preço, margem ou dado pessoal (o repositório é **público**; se um
relatório tiver isso, não copie: avise a Sofia onde está). Consertar skill que **falhou** na hora
continua valendo, mas é com a skill do próprio chefe, não por aqui.

## 5. Como termina
Relatório curto (o formato de `docs/relatorios/README.md` serve): quantos relatórios leu, os
achados com evidência, o que o PR muda, o que arquivou, o que ficou de fora e **o que depende da
Sofia** (aprovar ou cortar cada mudança).
