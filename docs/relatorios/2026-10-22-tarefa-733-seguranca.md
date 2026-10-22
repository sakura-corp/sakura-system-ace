# Relatório: tarefa #733, chefe segurança

- **Tarefa**: #733, as regras do gerente de projetos secundários na memória do SSACE
- **Chefe**: segurança
- **Data**: 2026-10-22
- **PR**: o desta branch (`claude/tarefa-733-regras-secundarios`)
- **Jeito**: aberta pela /coordenar

## O que cada agente fez
- Sessão mãe: leu a issue, a #731 e a #732 (pra saber qual é "a aba nova"), escreveu os cinco arquivos.
- Ajudante rápido: conferiu o tamanho do índice, os caminhos e seções citados, a frase "só nos projetos
  secundários", a ausência de dado sensível, e listou as regras fora da tarefa que podem parecer
  contraditórias (abaixo). Achou que a skill `nova-proposta` não existe: o texto agora diz isso.

## Modelos usados
- Escrever: sessão mãe, forte, esforço médio.
- Conferir tamanho e referências: rápido (`ajudante-rapido`), esforço baixo. Sem troca.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (arquivo, medido antes do relatório e do PR): 21 respostas; entrada 42, cache criado ~93 mil, cache lido ~2,3 milhões, saída ~13 mil.
- **Ajudantes**: 1, rápido, esforço baixo. Aviso: ~86 mil tokens. Arquivo: cache criado ~79 mil, cache lido ~257 mil, saída ~12 mil.
- **Sessões filhas**: nenhuma
- **`/goal`**: não sei se foi ligado (a coordenadora confere); o texto foi mandado a ela na mensagem de começo.

## O que testei e VI reprovar
- Nada: é só texto de regra. A conferência de tamanho é um aviso do CI (`ci.yml`), não um teste.

## O que passou sem eu ter visto reprovar
- O índice com 13,5 mil bytes, abaixo dos 15.360 do CI (contado com `wc -c`).

## O que ficou de fora
- **Regras fora da lista de arquivos que ainda dizem "só a Sofia escreve tarefa" ou "nunca mescla"**, sem a
  exceção dos secundários: as skills `nova-tarefa`, `entrevista`, `ideia`, `fechar`, `coordenar`,
  `ritual-de-tarefa` e as `chefe-*`; `docs/jeito-de-trabalhar.md` e `docs/decisoes.md`. **Não é falha de
  segurança**: elas são mais restritivas, então no pior caso barram o Gusta num secundário, nunca deixam
  passar algo no SSACE. Dentro de um repositório secundário, a memória vem do `modelo-projeto`, não daqui.
  Se a Sofia quiser, vira uma tarefa própria.
- **A skill `nova-proposta`** ainda não existe neste repositório; o texto diz isso.
- **O "Onde parou"** ainda diz "Leva 6 = projeto novo". Não mexi (o "Onde parou" é trocado no `fechar`);
  a correção está no `docs/painel.md`, "Andamento".

## O que depende de alguém
- A Sofia: revisar e mesclar; decidir se as skills da lista acima ganham a exceção.

## Achados
- Nenhum achado de segurança. Nada de política, preço, credencial ou nome de cliente no texto (conferido
  pelo ajudante). Os nomes dos repositórios privados (`sakura-corp/secundarios`) são identificadores,
  como já acontece com outros no índice.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o "caminho real" e a regra "repositório público" guiaram a escrita:
  cada exceção diz "só nos projetos secundários" e lista o que nunca é sem a Sofia.
- **Onde eu errei ou tive que adivinhar**: a issue diz "no quadro da leva continua sem número nem
  ranking", mas a tela da leva já mostra o quadro "Horas por pessoa" (#539). Escrevi "continua como era",
  pra não mudar o sentido de nenhum dos lados; a Sofia confirma.
- **O que faltou na skill**: nada pra esta tarefa (tarefa de texto de regra, não de RLS ou segredo).
- **Sugestão de ajuste (opcional)**: nenhuma.
