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

## O que cada agente fez
- <agente>: <uma linha>  ("nenhum" se não chamou)

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

Os chefes de segurança e tester podem acrescentar no fim as seções que a skill deles pede
(achados, checklist do "Pronto quando", defeitos abertos); o resto do formato não muda.

## Arquivamento

No começo do mês seguinte, o revisor move os relatórios **já revisados** para
`docs/relatorios/arquivo/AAAA-MM/` (mês do relatório), no PR dele. `README.md` e `exemplo.md`
ficam onde estão.

## Quem lê

O revisor, nas revisões do mês (R1 de `docs/jeito-de-trabalhar.md`) ou quando alguém pedir. Ele só
**propõe**, em PR aberto, e a Sofia aprova.
