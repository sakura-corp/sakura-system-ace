> **EXEMPLO FICTÍCIO.** Serve só para mostrar o formato. Nenhuma tarefa, PR ou fato abaixo é real.
> O revisor ignora este arquivo.

# Relatório: tarefa #999, chefe frontend

- **Tarefa**: #999, trocar o texto do botão "Salvar" por "Guardar" na tela de exemplo
- **Chefe**: frontend
- **Data**: 2026-01-01
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/0 (fictício)

## O que cada agente fez
- Explorador: achou as 3 telas que usam o botão.
- Escritor de tela: trocou o texto e ajustou o teste.
- Revisor: leu o diff do zero; nenhum achado.

## Modelos usados
- Planejar: sessão mãe, forte (`opus`), esforço médio.
- Explorador: rápido (`haiku`), esforço baixo.
- Escritor de tela: médio (`sonnet`), esforço médio.
- Revisor: forte (`opus`), esforço alto.
- Nenhuma troca por falha.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: 40 respostas; entrada 120, cache criado 90.000, cache lido 1.800.000, saída 25.000 tokens (via arquivo, medido antes de abrir o PR).
- **Ajudantes**: 3 (via aviso). Explorador (rápido, baixo): 30.000. Escritor (médio, médio): 80.000. Revisor (forte, alto): 95.000.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei.
- **Colado pela pessoa (opcional)**: nada.

## O que testei e VI reprovar
- Teste do texto do botão: mudei o texto de volta no código e o teste falhou; desfiz.

## O que passou sem eu ter visto reprovar
- `typecheck` e `lint`.

## O que ficou de fora
- A tela de impressão também usa o botão; não estava na tarefa.

## O que depende de alguém
- Uma pessoa no PC conferir a tela no programa instalado.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: lembrou de olhar a tela renderizada, não só o código.
- **Onde eu errei ou tive que adivinhar**: não sabia se a tela de impressão entrava; adivinhei que não.
- **O que faltou na skill**: um jeito de saber quais telas são "da tarefa" quando o texto é genérico.
- **Sugestão de ajuste (opcional)**: pedir à pessoa a lista de telas antes de começar.
