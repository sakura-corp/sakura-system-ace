# Relatórios dos chefes

Cada tarefa feita por um chefe (`chefe-frontend`, `chefe-backend`, `chefe-seguranca`,
`chefe-marketing`, `chefe-tester`) deixa aqui **um relatório curto**, no PR da própria tarefa. Um
agente **revisor** (skill `revisor-de-chefes`) lê esta pasta e propõe melhorias nas skills. Decidido
pela Sofia em 17/10/2026.

## Nome do arquivo

`docs/relatorios/AAAA-MM-DD-tarefa-N-<chefe>.md`

Exemplo: `2026-10-20-tarefa-531-frontend.md`. `<chefe>` é a função sem o prefixo: `frontend`,
`backend`, `seguranca`, `marketing`, `tester`. O arquivo `exemplo.md` é um modelo fictício e não
segue esse nome de propósito.

## ⛔ Privacidade (o repositório é PÚBLICO)

Relatório **nunca** leva: credencial, chave, token, senha, CPF, nome civil, preço, custo, margem,
sócios, dado de cliente de verdade nem outro dado pessoal ou da empresa. Isso mora no repositório
privado. Achou uma credencial já commitada? Diga **só onde está** e que precisa ser trocada; não
escreva o valor.

## Modelo (copie e preencha; uma página)

```markdown
# Relatório: tarefa #N, chefe <função>

- **Tarefa**: #N, <título curto>
- **Chefe**: <função>
- **Data**: AAAA-MM-DD
- **PR**: <link>
- **Jeito**: sessão direta | com ajudantes | com sessões filhas | aberta pela /coordenar

## O que cada agente fez
- <agente>: <uma linha>  ("nenhum" se não chamou)

## Modelos usados
- <etapa>: <categoria> (<modelo>), esforço <baixo|médio|alto>  ; se trocou por falha: "trocou de <x> pra <y>: <motivo>"

## Sessões filhas
- <"nenhuma", ou cada parte: branch e a última mensagem dela (estado)>

## Gasto
- **Uso da sessão mãe**: <tokens de entrada, cache criado, cache lido e saída (via arquivo); ou "não medido: <por quê>">
- **Ajudantes**: <quantos; cada um com modelo, esforço e tokens, dizendo a via (aviso ou arquivo), se medidos>
- **Sessões filhas**: <quantas, e o uso de cada, se medido; ou "nenhuma">
- **`/goal`**: <"não usei", ou como parou: cumprido ("achieved"), impossível ("failed"), sem progresso, pelo limite escrito na condição, limpo por erro (crédito, modelo, contexto cheio) ou limpo pela pessoa (`/goal clear`); `/goal` sem nada mostra **pra pessoa** os turnos e os tokens da meta ([goal](https://code.claude.com/docs/en/goal.md))>
- **Colado pela pessoa (opcional)**: <o resultado do `/usage`, se ela quiser colar>

## O que testei e VI reprovar
- <o que, e como quebrei de propósito>

## O que passou sem eu ter visto reprovar
- <o que>

## O que ficou de fora
- <o que, e por quê>

## O que depende de alguém
- <a Sofia, uma pessoa no PC, outro chefe>

## Onde parou
<só se a cota acabou: o que falta, pra outra sessão retomar. Senão: "Terminei.">

## Como eu agi
- **O que a skill me ajudou a fazer**: <...>
- **Onde eu errei ou tive que adivinhar**: <...>
- **O que faltou na skill**: <...>
- **Sugestão de ajuste (opcional)**: <...>
```

### Como medir o "Gasto"

A linha **"Jeito"** (lá no topo do modelo) diz como a tarefa foi feita, com **um** dos quatro
valores: **sessão direta** (sem ajudante nem filha), **com ajudantes**, **com sessões filhas** ou
**aberta pela /coordenar**. Usou mais de um? Vale o primeiro desta ordem: aberta pela /coordenar,
com sessões filhas, com ajudantes, sessão direta. É com ela que o
revisor soma o "tokens por PR mesclado" na revisão do mês; o relatório não diz se o PR foi aceito,
porque é escrito antes da revisão da Sofia (quem descobre é o revisor, no GitHub).

Só tokens e quantidades, **nunca dinheiro** (o repositório é público; a ferramenta da sessão também
mostra um valor em dinheiro, que **não** entra). Número incerto é aviso, nunca trava (`docs/licoes.md`,
item 33): na dúvida, "não medido" e o motivo.

O que a documentação diz (conferido em 18/10): nenhum canal **documentado** entrega ao modelo o
total de tokens da própria sessão. O `/usage` mostra pra **pessoa**
([custos](https://code.claude.com/docs/en/costs.md)); a ferramenta de agente não devolve contagem
([subagentes](https://code.claude.com/docs/en/sub-agents.md)); e o formato do arquivo da conversa é
interno e pode mudar entre versões ([sessões](https://code.claude.com/docs/en/sessions.md)). Por
isso as duas vias abaixo são **o que funcionou na prática**, não garantia. Cada número do "Gasto"
diz de qual via veio (**aviso** ou **arquivo**):

- **O aviso de fim de ajudante**: quando um ajudante em segundo plano termina, o aviso que chega na
  sessão traz `subagent_tokens` e quantas ferramentas usou. **Não é a mesma conta** da soma do
  arquivo (abaixo): em 18/10, o mesmo ajudante deu uns 100 mil num e uns 420 mil no outro. Serve pra
  comparar ajudantes entre si.
- **A conversa da sessão** fica em `~/.claude/projects/<pasta>/<id>.jsonl`, e cada resposta do
  modelo traz um campo `usage` (entrada, cache criado, cache lido, saída). Os ajudantes ficam ao
  lado, em `<id>/subagents/agent-*.jsonl`. Somar uma vez por resposta (a mesma resposta aparece em
  várias linhas com o mesmo `message.id`):
  ```bash
  f=$(ls -t ~/.claude/projects/*/*.jsonl | head -1)
  python3 -I -c 'import json,sys,os
  for a in sys.argv[1:]:
    if not os.path.exists(a): print(a.split("/")[-1], "não existe"); continue
    u={}
    for l in open(a):
      e=json.loads(l); m=e.get("message") or {}
      if e.get("type")=="assistant" and m.get("usage"): u[m.get("id")]=m["usage"]
    k=["input_tokens","cache_creation_input_tokens","cache_read_input_tokens","output_tokens"]
    print(a.split("/")[-1], len(u), "respostas", {x: sum(v.get(x,0) for v in u.values()) for x in k})' \
    "$f" "${f%.jsonl}"/subagents/agent-*.jsonl
  ```
  Roda no terminal da sessão na nuvem (no PC, só no Git Bash, não no PowerShell). A primeira linha
  é a sessão mãe; as outras, os ajudantes desta sessão (sem ajudante, aparece "não existe").
  Se o arquivo não existir ou o comando der erro (o formato mudou), "não medido". Medir **no fim**,
  depois da revisão final: o que vem depois (o PR, o relatório) fica de fora, e o
  relatório diz isso.
- **Sessão filha** roda em outro computador, e a mãe não alcança o arquivo dela: "não medido",
  a não ser que a filha tenha mandado o número dela na mensagem de "terminou".
- **Não deu pra medir** (arquivo não existe, sessão no PC de alguém sem acesso, conta estranha):
  "não medido" e o porquê. A pessoa pode colar o `/usage` no PR, se quiser.

Os chefes de segurança e tester podem acrescentar no fim as seções que a skill deles pede
(achados, checklist do "Pronto quando", defeitos abertos); o resto do formato não muda.

## Arquivamento

No começo do mês seguinte, o revisor move os relatórios **já revisados** para
`docs/relatorios/arquivo/AAAA-MM/` (mês do relatório), no PR dele. `README.md` e `exemplo.md`
ficam onde estão.

## Quem lê

O revisor, nas revisões do mês (R1 de `docs/jeito-de-trabalhar.md`) ou quando alguém pedir. Ele só
**propõe**, em PR aberto, e a Sofia aprova.
