# Relatório: tarefa #650, chefe frontend

- **Tarefa**: #650, Painel: Pessoas
- **Chefe**: frontend
- **Data**: 2026-10-21
- **PR**: o PR da branch `claude/tarefa-650-frontend-momlkb`
- **Jeito**: com ajudantes (quem estava na tela: o Tiago)

## O que cada agente fez
- Construtor da página (`ajudante-medio`): fez a página `/pessoas`, tirou "Pessoas" do "em breve", ajustou os testes
  antigos (como no commit das Versões, #649) e tirou as 4 fotos com a medida de contraste e de largura.
- Tester (`ajudante-medio`): conferiu o "Pronto quando no PR", quebrando a página de propósito duas vezes.
- Revisor final (`ajudante-forte`, esforço alto): leu o diff do zero; achou 2 defeitos reais e 3 opcionais.
- A sessão mãe: planejou, conferiu as fotos, consertou o que o revisor achou (com teste antes) e escreveu este relatório.

## Modelos usados
- Planejar: forte (sessão mãe), esforço médio.
- Página e fotos: médio (`ajudante-medio`), esforço do agente.
- Conferir o Pronto quando: médio (`ajudante-medio`), esforço do agente.
- Revisão final: forte (`ajudante-forte`), esforço alto.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (a sessão não tem como ler o próprio uso).
- **Ajudantes**: 3, pelo aviso de término: página ~122 mil tokens, tester ~62 mil, revisor ~90 mil.
- **Sessões filhas**: nenhuma
- **`/goal`**: mostrei o texto na primeira mensagem; a pessoa não colou, então andou pedido por pedido.

## O que testei e VI reprovar
- Pessoa com e sem tarefa: o tester trocou a condição da tarefa por "sempre sem tarefa" (reprovou "pessoa com tarefa") e
  por "nunca sem tarefa" (reprovou "pessoa sem tarefa"). O construtor também tirou a ordem, o `fotoSegura` e o
  `linkSeguro`, um de cada vez, e cada um reprovou um teste.
- Os 3 testes novos do conserto (o "(+N)" escondido, o erro quando só a busca das pessoas falha e o texto sem leva)
  reprovaram antes do conserto.
- Tirei "pessoas" do `naSala` no `App.tsx`: reprovou o teste novo da sessão vencida em `/pessoas`. Depois restaurei.

## O que passou sem eu ter visto reprovar
- `typecheck` e os 889 testes do painel, o `lint` (0 erros e 1 aviso antigo fora da tarefa), o `test:fusos` e o `contraste`.
- O contraste das fotos: o pior foi 5,21:1 no claro e 5,80:1 no escuro (AA pede 4,5:1). Sem rolagem lateral em 320 px.
  O script da medida ficou fora do repositório.

## O que ficou de fora
- `contraste:telas` e `largura:telas`: esses scripts só abrem o programa das lojas, não o painel. No lugar deles valeram as
  fotos e a medida.
- As fotos de exemplo mostram as iniciais e não a foto do GitHub, porque os dados de exemplo não têm foto. O caminho da
  foto está coberto por teste.
- Achado opcional do revisor: a página não mostra o aviso de "dados velhos" do tempo real, como a Sala mostra. O indicador
  da barra lateral já avisa. Ficou pra depois.

## O que depende de alguém
- **A Sofia**: revisar e mesclar o PR (o Tiago não mescla). Depois de publicar o painel, abrir `/pessoas` e conferir que
  os três aparecem com a tarefa certa (o "depois de publicar" da issue).
- Teste no PC: não precisa. É o painel, e a página roda no navegador.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a revisão final do zero achou dois defeitos que os testes não pegavam. Se só a
  busca das pessoas falhasse, a página dizia "Ninguém com tarefa", o que seria mentira. E o "(+1)" que o worker junta
  quando a pessoa segura mais de uma tarefa é número por pessoa, e a issue proíbe.
- **Onde eu errei ou tive que adivinhar**: no plano pro construtor, não pensei nas `falhas` da sala nem no "(+N)". Passei
  "use os dados da Sala" sem ler o que a Sala faz com eles. Adivinhei também que, sem leva, a frase certa é
  "Nenhuma leva aberta agora.".
- **O que faltou na skill**: a regra "rodar `contraste:telas` e `largura:telas`" não serve pro painel. Pela sexta tarefa
  seguida, o painel não tem um script de fotos e contraste guardado.
- **Sugestão de ajuste (opcional)**: na `chefe-frontend`, escrever "no painel, as fotos e a medida valem no lugar de
  `contraste:telas`/`largura:telas`". E, ao reaproveitar dados de outra tela, ler como aquela tela trata os erros e os
  casos de borda deles.
