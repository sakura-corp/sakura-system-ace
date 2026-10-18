# Relatório: tarefa #568, chefe tester

- **Tarefa**: #568, Memória: uma entrada só (a skill /ideia e as três portas)
- **Chefe**: tester
- **Data**: 2026-10-18
- **PR**: ver a descrição do PR que fecha a #568

## O que cada agente fez
- Sessão mãe: leu a issue, escreveu a skill `ideia` e as três portas nos dois manuais (a issue diz `Ajudantes: nenhum`; o texto era curto e o plano estava pronto).
- Três ajudantes de ensaio (médio): cada um leu só o arquivo da skill e respondeu como se fosse a pessoa, sem criar issue: (1) ideia comum, (2) ideia com preço e sócio, (3) a mesma ideia de preço numa cópia da skill **sem a barreira**.
- Ajudante revisor (forte): revisão final do diff. Achou o cabeçalho YAML inválido e três ajustes; todos conferidos e feitos.

## Modelos usados
- Ler e planejar, e escrever: forte (a própria sessão).
- Ensaios: médio (Sonnet).
- Revisão final: forte (Opus). Nenhuma troca por falha.

## Sessões filhas
- nenhuma

## Checklist do "Pronto quando"
- ✅ **Cabeçalho válido e `description` só dispara com pedido de guardar ideia**: `yaml.safe_load` passa; o próprio Claude Code passou a listar a skill `ideia` assim que o arquivo foi criado; a `description` diz "Use SÓ" com "/ideia", "guarda/anota/salva essa ideia" e exclui planejar e começar trabalho.
- ✅ **Ensaio sem criar issue**: a ideia comum (aviso de WhatsApp ao fechar a OS, vista num vídeo) virou um rascunho curto com título, 3 linhas, a fonte em texto e a etiqueta `ideia`, mostrado antes de criar. A ideia com preço e sócio foi **barrada**: a resposta foi só "fala de preço e de sócios… leve direto pra Sofia", sem rascunho e sem repetir os valores.
- ✅ **`docs/equipe.md` e `docs/jeito-de-trabalhar.md` mostram as três portas** ("O dia a dia" e perto de "Como as skills funcionam"; a `/ideia` entrou na tabela de skills como S11).
- ✅ `typecheck` e `lint` verdes na sessão; ⏳ o CI, no PR.
- ⏳ **Depois de publicar** (a Sofia): digitar `/` numa sessão nova e ver a `ideia`; guardar uma ideia de verdade.

## O que testei e VI reprovar
- **A barreira**: tirei a seção 1 da skill (cópia fora do repositório) e rodei a mesma ideia de preço e sócio. Sem a barreira, ela virou um rascunho de issue "Ideia: preço único e fixo para as lojas pequenas, com bônus para o sócio…" (sem os números só porque o índice do projeto também estava carregado). Com a barreira, não virou nada. Então é a seção 1 que segura.
- **O cabeçalho**: com o texto antigo da `description` (com "Só guarda: não planeja"), o `yaml.safe_load` reprovou ("mapping values are not allowed here"); com o novo, passa.

## O que passou sem eu ter visto reprovar
- A busca por ideia repetida antes de criar e a regra de print só em texto: estão escritas, mas não ensaiei.

## O que ficou de fora
- **A etiqueta `ideia` não existe no GitHub** e esta sessão não tem ferramenta pra criar etiqueta. Fica pra Sofia (ver abaixo).
- A R1 de `docs/jeito-de-trabalhar.md` não cita as ideias nem o filtro "isso tira trabalho de verdade?": a issue não pedia mexer na R1. Fica pra decidir na revisão do mês.

## O que depende de alguém
- **Sofia**: criar a etiqueta `ideia` (no GitHub: Issues → Labels → New label; nome `ideia`, descrição "Ideia solta, lida na revisão do mês", uma cor clara qualquer). E o "depois de publicar" acima.

## Defeitos abertos
- nenhum

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o "só vale o teste que eu vi reprovar" me fez ensaiar a cópia sem a barreira; sem isso, o ensaio do bloqueio não provava nada.
- **Onde eu errei ou tive que adivinhar**: escrevi um dois-pontos na `description` e o YAML ficou inválido (o Claude Code aceitou mesmo assim, então ver a skill na lista não prova o cabeçalho). Quem pegou foi o revisor.
- **O que faltou na skill**: o chefe tester não diz como ensaiar uma skill (texto, não código). O jeito que funcionou: um ajudante lê só o arquivo da skill e responde a uma mensagem de exemplo, sem ferramenta nenhuma.
- **Sugestão de ajuste (opcional)**: no chefe tester, uma linha: "skill nova: validar o cabeçalho com `yaml.safe_load` e ensaiar com um ajudante que só lê a skill, inclusive numa cópia quebrada".
