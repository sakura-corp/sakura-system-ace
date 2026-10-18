# Relatório: tarefa #567, chefe tester

- **Tarefa**: #567, modelo e esforço por etapa, escritos nas skills
- **Chefe**: tester
- **Data**: 2026-10-18
- **PR**: o PR da branch `claude/tarefa-567-modelo-e-esforco`

## O que cada agente fez
- `claude-code-guide`: conferiu na documentação oficial quais campos existem e onde (a mãe conferiu as citações de novo, baixando as páginas).
- Ajudante escritor: a coluna Esforço, a etiqueta `ideia`, os 3 agentes, a seção 3 do ritual e os 8 cabeçalhos.
- Ajudante revisor: achou 3 problemas reais (abaixo), corrigidos pela mãe.

## Modelos usados
- Planejar e conferir: sessão mãe, forte (`claude-opus-5-5`), esforço baixo (o da sessão).
- Conferir a documentação: rápido (`haiku`), esforço padrão.
- Escrever a tabela e os cabeçalhos: médio (`sonnet`), esforço médio.
- Revisão final: forte (`opus`), esforço **alto**.
- Nenhuma troca por falha. Os agentes novos de `.claude/agents/` não foram usados aqui: a pasta nasceu nesta sessão, e a sessão só os enxerga depois de reiniciar.

## Sessões filhas
- nenhuma

## O que a documentação diz (18/10)
| Campo | Skill | Agente em `.claude/agents/` | Na chamada da ferramenta |
|---|---|---|---|
| `model` | existe, vale só até o fim do turno | existe | existe |
| `effort` | existe | existe | existe (v2.1.292+) |
| `maxTurns` | **não existe hoje** | existe | **não existe hoje** |
| `omitClaudeMd` (não reler a memória) | **não existe hoje** | existe (v2.1.271+) | **não existe hoje** |

Links: [skills](https://code.claude.com/docs/en/skills.md), [agentes](https://code.claude.com/docs/en/sub-agents.md). Por isso valeu o passo 6 da issue: os ajudantes nasceram em `.claude/agents/`. Só o `ajudante-rapido` não relê a memória: a Sofia decidiu (18/10, pela coordenadora) que o médio volta a ler, porque escreve código e as regras de código moram na memória (o índice custa ~4 mil tokens).

## O que testei e VI reprovar
- Script que lê os 8 cabeçalhos (YAML válido, `name` e `description` iguais aos da `main`, só `model`/`effort` novos e com valor permitido, corpo igual ao da `main` fora da seção 3 do ritual). Vi reprovar com: um `effort: [medium` (YAML quebrado), um `effort: alto` (valor inválido) e uma linha a mais no corpo do `revisor-de-chefes`. Desfeito; passa com o diff final.

## O que passou sem eu ter visto reprovar
- `typecheck` e `lint` (esta tarefa não mexe em código).
- Que o Claude Code de fato carrega os 3 agentes e respeita `maxTurns` e `omitClaudeMd`: só dá pra ver numa sessão aberta depois do PR mesclado.

## O que ficou de fora
- As linhas da seção 5 e 6 do ritual que falam de "Modelos usados" ainda não citam o esforço (a issue proíbe mexer fora da seção 3; a seção 3 já manda anotar).
- `effort: medium` nas skills: com o Opus 5.5 o esforço padrão já é médio, então o campo só faz diferença se alguém subir o esforço da sessão (aí ele **baixa** pra médio). Deixado como a issue sugeriu; a Sofia decide.

## O que depende de alguém
- A Sofia: aprovar a tabelinha dos cabeçalhos no PR, linha por linha, e os limites de turnos (80, 60, 30), que são um chute meu.
- Quem usa o painel: Claude Code v2.1.293 ou mais novo.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a regra "não inventar campo" + o ajudante revisor forte pegaram 3 erros: o ritual dizia que o modelo do cabeçalho segurava a mãe no forte (só vale um turno), o motivo do "agente não aparece" estava errado (é pasta nova sem reiniciar, não versão antiga), e faltava a versão mínima do Claude Code.
- **Onde eu errei ou tive que adivinhar**: os números de `maxTurns`; e meu primeiro teste de reprovar "passou" porque eu li a saída depois de um `| tail` (o código de saída era do `tail`). Refiz sem o cano.
- **O que faltou na skill**: o `chefe-tester` não diz onde guardar o script de conferência quando ele não está na lista de arquivos da tarefa (ficou só no PR).
