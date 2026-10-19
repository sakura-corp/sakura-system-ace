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
- **gasto por resultado** (ideia copiada do Ruflo, #609 e #635): quantos tokens gasta **um PR
  aceito** em cada jeito de trabalhar, e não só cada sessão. A unidade é **o relatório**.
  1. **Classificar pelo GitHub, nunca pelo relatório** (ele é escrito antes da revisão da Sofia e não
     sabe se o PR foi aceito). Achar o PR pela linha "PR", pela branch ou pelo `Closes #N`
     (o relatório quase nunca traz o link). Pôr num dos três:
     - **mesclado de primeira**: mesclou sem pedido de mudança e sem commit novo depois da
       primeira revisão;
     - **mesclado depois de refazer**: teve "changes requested", comentário de uma pessoa ou da
       coordenadora pedindo ajuste (aviso de robô não conta), ou commit novo depois da primeira
       revisão. Também quando um **segundo PR sem relatório próprio** conserta ou completa o que o
       primeiro entregou, ou refaz um PR fechado, e mescla: os dois valem como um resultado só;
     - **fechado sem mesclar**: nada daquele relatório chegou a mesclar.
     **Sem revisão no GitHub** (o comum: a Sofia mescla sem aprovar ali e pede ajuste pela
     coordenadora), a primeira revisão é **a abertura do PR**. Conta como refazer o commit depois
     dela que atende um pedido (a mensagem do commit ou o relatório costumam dizer). **Não conta**:
     commit da própria sessão só pra pôr o link do PR ou consertar o CI; segundo PR que só mexe no
     relatório (o #582 da #577); etapa planejada com relatório próprio (as da #608), que é
     classificada sozinha. Na dúvida, "refazer?": conta em "depois de refazer", com asterisco e o
     commit numa nota. A tabela não vê pedido de mudança feito antes de o PR abrir.
  2. **A tabela "tokens por PR mesclado"**, uma linha por valor da linha **"Jeito"**, e **uma
     tabela por via**, com o título "via arquivo" ou "via aviso" (nunca somar uma com a outra):
     | Jeito | Relatórios | De primeira | Depois de refazer | Fechados | Tokens somados | Tokens por PR mesclado |
     - **Tokens somados**: o "Gasto" de todos os relatórios da linha (mãe + ajudantes + filhas
       medidas), inclusive os fechados, que também são gasto do jeito. Na via "arquivo", somar as
       quatro contas (entrada, cache criado, cache lido, saída). **Tokens por PR mesclado** =
       tokens somados ÷ (de primeira + depois de refazer); sem PR mesclado, "—".
     - **A comparação principal é a "via arquivo"**. A "via aviso" só tem ajudantes (a mãe nunca
       tem número de aviso), então mede só eles. Relatório sem número numa via não entra na
       tabela dessa via.
     - **Fica fora, e diz quantos**: relatório **sem a linha "Jeito"** (os anteriores à #635; nunca
       adivinhar o jeito), relatório em que **a mãe** é "não medido" na via da tabela, ou em que
       falta cache lido ou cache criado (sem eles, parece muitas vezes mais barato), PR ainda
       aberto e "sem PR". Embaixo da tabela: "ficaram fora: X sem Jeito, Y não medidos, Z com PR
       aberto, W sem PR", cada relatório contado uma vez só, no primeiro motivo dessa ordem. Se só
       um ajudante ou uma filha não foi medido, o relatório entra e a linha diz "parcial: N".
     - Escrever também embaixo da tabela: o gasto costuma ser medido **antes** do PR, então o
       trabalho de refazer quase nunca está nele; e "com sessões filhas" e "aberta pela
       /coordenar" saem **sempre por baixo** (as filhas quase nunca são medidas, e a coordenadora
       não tem relatório), então gastar menos nesses dois jeitos não é evidência.
  3. **Propor** o ajuste do `ritual-de-tarefa` ou da `/coordenar`, na descrição do PR do mês e com
     a tabela como evidência, quando, na mesma tabela, um jeito gastar **o dobro ou mais** por PR
     mesclado que outro, ou tiver o dobro da fração (refazer + fechados) ÷ relatórios, com **pelo
     menos 3 PRs mesclados** em cada jeito comparado. Abaixo disso, "só observação". Só propor:
     quem decide é a Sofia.

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
