---
name: revisor-de-chefes
description: RASCUNHO (a Sofia ainda vai revisar). O revisor dos chefes do Sakura System — lê os relatórios em docs/relatorios/ e as skills chefe-*, acha padrões que se repetem e propõe melhorias como PR ABERTO. Use SÓ quando o texto pedir "revisar os chefes", "revisar os relatórios dos chefes" ou "use a skill revisor-de-chefes" (inclui a revisão do mês). Não use em pedido comum.
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

**Cada achado precisa de evidência**: o nome do arquivo de relatório (e a frase) que o prova. Sem
arquivo citado, não é achado. Não invente padrão a partir de um relatório só sem dizer que é um só.
Conferir cada achado contra o relatório antes de propor; a revisão também erra.

## 3. Propor (sempre em PR aberto)
Branch `revisor/AAAA-MM`. Mudanças possíveis, todas pequenas e justificadas por achado:
- ajuste em `.claude/skills/chefe-*/SKILL.md` ou nesta skill;
- skill nova em `.claude/skills/<nome>/SKILL.md` (frontmatter válido; `description` que só dispara
  quando o texto pede);
- arquivar os relatórios **já revisados**: começo do mês seguinte, mover para
  `docs/relatorios/arquivo/AAAA-MM/` (`git mv`).

A descrição do PR traz a **lista de achados**, cada um com: o que se repete, **a evidência (arquivo)**,
a mudança proposta e o que a Sofia perde se ela cortar. Achado sem mudança vai na lista como
"só observação". Abrir o PR e **parar**.

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
