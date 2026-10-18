# Relatório: tarefa #590, chefe backend (sessão Sonnet + conselheiro)

- **Tarefa**: #590, Skill /loja-nova: o roteiro da loja nova, do contrato à primeira venda com nota
- **Chefe**: backend
- **Data**: 2026-10-18
- **PR**: ver a descrição do PR da branch `claude/tarefa-590-loja-nova-sonnet`

## O que cada agente fez
- nenhum ajudante chamado. Planejei, escrevi e conferi tudo na própria sessão (a issue pedia ajudante médio para escrever, mas as regras do teste mandam fazer o planejamento sem ajudante forte; escrevi eu mesma porque eram só dois textos).

## Modelos usados
- Planejar: sessão mãe no Sonnet (`claude-sonnet-5-5`) + conselheiro Opus, 1 consulta (a tabela pede forte; o teste A3 troca isso pelo conselheiro).
- Escrever a skill e as mensagens: o próprio Sonnet da sessão, em vez do ajudante médio (mesmo modelo da categoria médio), esforço padrão da sessão.
- Revisão final: feita por mim mesma, sem ajudante forte (regra do teste A3); não houve segunda consulta ao conselheiro ainda (ver "Conselheiro").
- Não houve troca por falha de modelo.
- Cabeçalho da skill: `model: opus`, `effort: medium`, igual ao `ritual-de-tarefa`, porque a skill decide e conduz a Sofia por passos com consequência (certificado, banco, nota fiscal); a tabela de `docs/tarefas.md` põe "planejar" na categoria forte, esforço médio.

## Conselheiro
- Consultado **1 vez**, antes de escrever. Ajudou em: (1) a skill precisa perguntar primeiro se é empresa nova ou segunda unidade, porque `INSTALAR-LOJA-NOVA.md` abre com essa distinção e o nome "loja nova" colide com ela; (2) o marco de 7 dias depende da nota fiscal, que leva dias ou semanas, então o pedido ao contador começa na fase 1 (sem mudar o marco decidido); (3) Claude guia e a Sofia faz, com o guarda da seção 0; (4) a skill não guarda estado, então pergunta "em que passo estamos?" e entrega as datas dos dias 7/14/30/90 pra agenda dela; (5) apontar títulos exatos em vez de copiar; (6) como provar o "Pronto quando" sem abrir arquivo na conversa. Aceitei todos.
- Onde não ajudou ou não consultei de novo: a revisão final.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (via arquivo, medido antes do commit e do PR; o que vem depois fica de fora): 13 respostas, entrada 28, cache criado 88.639, cache lido 1.514.533, saída 10.171. O conselheiro e as chamadas feitas pelo harness fora do arquivo da conversa não entram nessa soma.
- **Ajudantes**: nenhum.
- **Sessões filhas**: nenhuma.
- **`/goal`**: ligado pela Sofia, com limite de 30 turnos; ver o fim do PR para como parou.
- **Conselheiro**: 1 consulta (Opus), tokens não medidos (o arquivo da conversa não separa).

## O que testei e VI reprovar
- Nada reprovado de propósito: o trabalho é texto, sem código. A conferência de caminhos reprovou 3 nomes curtos (`INSTALAR-LOJA-NOVA.md`, `instalacao-completa.sql`, `mensagens.md`) por serem citados sem a pasta; corrigi o do `.sql` para o caminho completo, os outros dois são citados dentro de frases com o caminho completo na tabela do começo.

## O que passou sem eu ter visto reprovar
- O cabeçalho YAML (carregou com `yaml.safe_load`: `name`, `description`, `model`, `effort`) e a skill apareceu na lista de skills **da própria sessão** logo depois de criada.
- Os 11 títulos citados existem nos três documentos (conferido com `grep -c`, todos 1).
- A varredura de segredo do gatilho (`scripts/checar-segredos.mjs`) roda no commit; o CI roda o `gitleaks`.

## O que ficou de fora
- Os "sinais de que a loja vai embora", o portal do cliente, a cobrança e o preço (tudo na lista "Não fazer" da issue).
- Aparece uma tensão que não resolvi: a primeira venda com nota em 7 dias depende de SEFAZ, prefeitura e contador, que levam dias ou semanas. A skill puxa o pedido ao contador pra o dia do contrato e diz que, se o prazo não fechar, o marco conta a partir da liberação da nota. A Sofia decide se é isso mesmo.

## O que depende de alguém
- A Sofia: rodar `/loja-nova` de mentira até o passo 2 e conferir tom e ordem (o "depois de publicar" da issue); aprovar o rascunho.
- A coordenadora: a linha S9 de `docs/jeito-de-trabalhar.md` pode conflitar com a da outra sessão da mesma tarefa.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a ordem (ler issue, avisar a coordenadora, esperar o conselheiro) evitou planejar às cegas.
- **Onde eu errei ou tive que adivinhar**: o tom das mensagens de WhatsApp (só há a regra geral de `docs/sofia.md`, nada específico de cliente novo); o formato de "dias 7/14/30" como texto curto.
- **O que faltou na skill**: dizer o que fazer quando a tabela da issue pede ajudante médio mas o teste manda fazer na própria sessão.
- **Sugestão de ajuste (opcional)**: o relatório poderia ter um campo próprio para "conselheiro" quando houver.
