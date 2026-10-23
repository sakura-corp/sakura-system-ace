# Relatório: tarefa #684, chefe tester

- **Tarefa**: #684, pôr a tela "clientes que sumiram" nas fotos automáticas das telas
- **Chefe**: tester
- **Data**: 2026-10-23
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/767
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue, planejou, escreveu a cena e os dados de exemplo, rodou as varreduras,
  fez a comparação "antes × depois" das 64 cenas antigas e a quebra de propósito.
- **Ajudante forte (revisão final)**: leu o diff e as telas que leem `ordens_servico`; conferiu a
  conta dos 6 meses nos dois fusos e em qualquer mês, o seletor da caixinha e se as OS antigas
  aparecem em outra cena. Resultado: nada a corrigir.
- A etapa "a cena e os dados de exemplo" (médio, na issue) foi feita pela própria mãe: eram ~20
  linhas com o plano já fechado, e passar pra um ajudante custaria mais do que escrever.

## Modelos usados
- Planejar e escrever: sessão mãe (forte), esforço médio
- Revisão final: forte, esforço alto

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (via arquivo, antes do PR e deste relatório): 37 respostas; entrada 74,
  cache criado 123.202, cache lido 4.918.650, saída 18.845
- **Ajudantes**: 1 (forte, esforço alto). Via aviso: 102.528 tokens. Via arquivo: 22 respostas;
  entrada 44, cache criado 100.157, cache lido 1.775.670, saída 12.268
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei. A sessão foi aberta por mensagem e seguiu direto até o PR.

## Checklist do "Pronto quando"
- ✅ **A cena nova aparece nas fotos, com pelo menos 2 clientes na lista.** Cena
  `05c-clientes-sumidos`, fotografada pelo mesmo passeio das varreduras. Mostra Eduardo Salles
  (última visita há ~300 dias, R$ 2.522,00) e Juliana Prado (~220 dias, R$ 279,50).
- ✅ **`contraste:telas` e `largura:telas` verdes, contando a cena nova.** As duas passaram por 65
  telas, com `✓ 05c-clientes-sumidos` no meio. Contraste: "Nenhuma reprovação NOVA". Largura:
  "Nenhum conteúdo passando da janela", em 1024, 1280, 1366, 1536 e 1600.
- ✅ **As outras cenas não mudaram.** Fotografei as 64 cenas antigas antes e depois da mudança, com
  o relógio parado no Node e no navegador. As 64 saíram iguais byte a byte, a imagem (tela inteira)
  e o texto da tela.
- Depois de publicar: nada (é só ferramenta de conferência).

Também verdes: `typecheck`, `lint`, `test:fusos` (São Paulo e UTC) e `contraste`.

## O que testei e VI reprovar
- **A cena sem os dados**: primeiro pus só a cena, sem as OS antigas. A foto saiu com "Nenhum
  cliente sem vir há mais de 6 meses". Com os dados, saiu com os 2.
- **A comparação "antes × depois"**: antes de confiar nela, rodei duas vezes sem mudar nada, e as
  duas rodadas saíram idênticas. Depois quebrei de propósito: pus uma das OS antigas dentro de
  `ordens`, por onde ela vira lançamento de caixa e garantia. A comparação acusou **36-graficos** e
  **38-garantias** diferentes. Desfiz a quebra e conferi que o diff voltou ao tamanho certo.

## O que passou sem eu ter visto reprovar
- A cena nova entrar nas duas varreduras: conferi pelo `✓ 05c-clientes-sumidos` no log, mas não
  estraguei a cor nem a largura da tela pra ver a varredura reprovar.

## O que ficou de fora
- Nenhum outro arquivo: `src/` não foi mexido, como a issue pede.
- As contagens antigas "54 telas" nos comentários (`cenas.mjs`, `percorrer-telas.mjs`, scripts,
  `docs/estrutura.md`) já estavam desatualizadas antes desta tarefa (eram 64, agora 65). Ficaram
  como estavam, porque estão fora da lista de arquivos.
- Achado da revisão, gravidade baixa: se alguém abrir à mão a ficha do Onix (v3) ou do Renegade
  (v4) nas telas de demonstração, as OS antigas aparecem sem prazo de garantia. Nenhuma cena abre
  essas fichas.
- O catálogo de imagens (`site/telas/`) não foi regerado: a issue não pede.

## O que depende de alguém
- **A Sofia**: revisar e mesclar o PR.
- **Ninguém no PC**: tudo foi provado na nuvem (é só ferramenta de conferência, não tem nada do
  programa instalado).

## Defeitos abertos
- nenhum

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a regra "só vale o teste que eu vi reprovar" me fez provar a
  própria comparação antes de usá-la como prova (duas rodadas iguais e depois a quebra). Sem isso,
  o "64 iguais" podia ser uma comparação que nunca acusa nada.
- **Onde eu errei ou tive que adivinhar**: escolhi a Juliana e o Eduardo, que já existiam, em vez
  de criar clientes novos. Clientes novos mudariam a lista de Clientes (cena 05) e quebrariam o
  terceiro item do "Pronto quando". O lado ruim: os dois têm OS de agora em aberto (146 e 147), o
  que vale pela regra da tela (só faturada conta), mas parece estranho numa foto do site. Se a
  Sofia preferir clientes novos, a mudança é pequena, mas a cena 05 muda junto.
- **O que faltou na skill**: um jeito pronto de provar "as outras telas não mudaram". Montei um
  script de fora, que fotografa tudo com o relógio parado e compara byte a byte.
- **Sugestão de ajuste (opcional)**: se isso se repetir, guardar esse "fotografar com o relógio
  parado e comparar" como ferramenta em `site/ferramentas/`. O `percorrerTelas` já aceita
  `horaFixa`; o que falta é parar também o relógio do Node enquanto o `dados-demo.mjs` carrega.
