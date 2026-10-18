# Relatório: tarefa #590, chefe backend (sessão "Opus sozinho")

- **Tarefa**: #590, skill `/loja-nova`: o roteiro da loja nova, do contrato à primeira venda com nota
- **Chefe**: backend
- **Data**: 2026-10-18
- **PR**: o desta branch, `claude/tarefa-590-loja-nova-opus` (link na descrição do PR)
- **Teste de modelos (A3)**: esta é a sessão **Opus sozinho**. Não usei o `/advisor` (conselheiro):
  **0 consultas**. Não olhei a branch da outra sessão.

## O que cada agente fez
- **Explorador** (`ajudante-rapido`): achou os títulos exatos das seções do guia de instalação, do
  playbook fiscal e do `operacao.md`, a linha S9, e mostrou que não há lugar escrito pra dado de
  loja cliente nem documento de impressora. Apontou a contradição que virou a **#592**.
- **Escritor** (`ajudante-medio`): escreveu `SKILL.md`, `mensagens.md` e trocou a linha S9, a
  partir de um plano fechado pela sessão mãe.
- **Revisor final** (`ajudante-forte`, esforço alto): conferiu privado, cópia, títulos, fidelidade à
  issue e fatos. Achou **2 problemas reais**: o `BACKUP_EMPRESAS` vai **nos dois cofres** (a skill
  não dizia) e o "pronto quando" da instalação não conferia a `redefinir-senha-operador`. Os dois
  conferidos no `docs/operacao.md` e corrigidos, junto com 4 sugestões opcionais baratas.
- **Sessão mãe**: conferiu a contradição do explorador e abriu a #592 (formato da #425); corrigiu
  4 pontos do rascunho (onde se cola o token da Focus, uma lista copiada do playbook, a pergunta de
  0 a 10 que tinha virado "indicaria?" em vez de satisfação, e "portal do cliente"); rodou as
  conferências e a varredura de segredo.

- **Ajustes pedidos pela Sofia** (pela coordenadora, depois do PR aberto, 2º commit): o marco de 7
  dias virou dois (marco 1, a loja vendendo até 3 dias depois da instalação; marco 2, a primeira
  nota até 7 dias depois de a parte fiscal ficar pronta, com atraso de terceiro anotado, avisado à
  loja antes e sem contar como falha dela; novo modelo 7 em `mensagens.md`); os 3 itens da
  impressora com a #595; e "RASCUNHO" no `description` e na linha S9. Feitos pela sessão mãe.

## Modelos usados
- Ler e planejar (sessão mãe): forte (Opus), esforço médio.
- Achar as seções: rápido (`ajudante-rapido`), esforço baixo.
- Escrever a skill e as mensagens: médio (`ajudante-medio`), esforço médio.
- Revisão final: forte (`ajudante-forte`), esforço alto.
- Nenhuma troca por falha de modelo. O ajudante de marketing do cabeçalho da issue não foi um
  agente à parte: o escritor seguiu o tom da skill `chefe-marketing` e da `docs/sofia.md`.

## Sessões filhas
- Nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe** (via arquivo, medido depois da revisão final; o PR e este relatório ficam
  de fora): 33 respostas; entrada 70, cache criado 125.435, cache lido 4.423.958, saída 19.589.
- **Ajudantes**: 3.
  - rápido: aviso 83.013 tokens, 5 ferramentas; arquivo 3 respostas, cache criado 77.680, cache
    lido 123.123.
  - médio: aviso 82.779 tokens, 6 ferramentas; arquivo 4 respostas, cache criado 81.501, cache
    lido 216.712.
  - forte (alto): aviso 99.158 tokens, 11 ferramentas; arquivo 8 respostas, cache criado 95.610,
    cache lido 573.616.
  - A saída dos ajudantes no arquivo saiu baixa demais (22, 39 e 484) pra quem escreveu dois
    arquivos inteiros: parece que o arquivo guarda só parte da contagem de saída deles. Tratar a
    saída dos ajudantes como **não medida**.
- **Sessões filhas**: nenhuma.
- **Conselheiro (`/advisor`)**: não usado (0 vezes), como pedia o teste.
- **`/goal`**: a pessoa colou o `/goal` no turno 8 (limite de 30 turnos). O 1º commit chegou ao PR
  com o CI verde no turno 22; os ajustes da Sofia vieram no turno 23, com o `/goal` ainda ativo.

## O que testei e VI reprovar
- **Varredura de segredo**: copiei a pasta da skill para fora do repositório, acrescentei uma chave
  falsa no formato `sb_secret_...` e rodei o `gitleaks 8.28.0` (a mesma versão do CI) com o
  `.gitleaks.toml`: **"leaks found: 1", saída 1**. Na pasta de verdade e no repositório inteiro:
  "no leaks found". A cópia foi apagada.
- **Conferência dos documentos citados**: `grep -c` com o título exato devolve 1 em cada título
  citado, e **0** num título inventado ("Parte 6 — Impressora"), então a conferência reprova quando
  o título não existe.

## O que passou sem eu ter visto reprovar
- **Cabeçalho YAML**: a skill `loja-nova` apareceu sozinha na lista de skills desta sessão logo que
  o arquivo foi criado (prova de que o cabeçalho é lido). Não quebrei o YAML de propósito pra ver
  ela sumir.
- O CI (só muda texto; os jobs de código podem nem rodar).

## O que ficou de fora
- Cobrança, preço, os "sinais de que a loja vai embora" e o portal do cliente (o "Não fazer").
- Corrigir o guia de instalação: virou a **#592** (Parte 4 manda publicar a `ler-notas-fiscais`,
  que a decisão de 27/09 tirou das lojas novas, e esconde a obrigatória `redefinir-senha-operador`;
  e o `BACKUP_EMPRESAS` "nos dois cofres" só no `operacao.md`).
- **Impressora**: nenhum documento do projeto explica a instalação dela. A skill manda imprimir um
  teste de cada coisa e abrir issue se falhar. Não abri tarefa pra um documento de impressora
  (seria planejar trabalho novo: fica a critério da Sofia).

## O que depende de alguém
- **A Sofia**: rodar `/loja-nova` de mentira, até o passo 2, e ver tom e ordem (o "depois de
  publicar" da issue). Decidir a **#592**.
- **A Sofia**: dizer **onde, no privado**, ficam contrato, campeão e nota de satisfação de cada
  loja (a skill só diz "no repositório privado `sakura-corp`"; nenhum documento diz a pasta).
- Nenhuma migration, nada de banco.

## Onde parou
Terminei (falta só o CI do PR, acompanhado na conversa).

## Como eu agi
- **O que a skill me ajudou a fazer**: o ritual deixou claro quem faz o quê e o formato da mensagem
  à coordenadora; a regra "achou erro, abre issue" do `chefe-backend` + a issue fez a contradição
  do guia virar #592 em vez de uma correção fora da lista de arquivos.
- **Onde eu errei ou tive que adivinhar**: o `effort` da skill nova (pus `opus` + `medium`, como
  "planejar/publicar" da tabela; ela guia nota fiscal mas não escreve código fiscal). Não marquei a
  skill como "RASCUNHO" no `description`, porque a issue pede a linha S9 como "feita"; outras skills
  novas usam "RASCUNHO" até a Sofia aprovar. Ela decide.
- **O que faltou na skill**: o `chefe-backend` é todo de banco e código; numa tarefa só de texto,
  metade das conferências (typecheck, test:sql, migration) não se aplica e a skill não diz o que
  conferir no lugar (títulos citados, varredura de segredo, skill aparecendo na lista).
- **Sugestão de ajuste (opcional)**: no `chefe-backend`, seção 5, uma linha "tarefa só de texto ou
  skill: conferir com `grep` cada caminho e título citado, rodar o `gitleaks` local, e ver a skill
  aparecer na lista".
