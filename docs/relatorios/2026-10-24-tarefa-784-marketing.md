# Relatório: tarefa #784, chefe marketing

- **Tarefa**: #784, Apresentação: os textos (sem preço)
- **Chefe**: marketing
- **Data**: 2026-10-24
- **PR**: o PR da branch `claude/tarefa-784-chefe-marketing-l94taj`
- **Jeito**: com ajudantes

Quem trabalhou: o Tiago (pelo celular). Valeram as regras da equipe (seção 0 do índice): PR aberto,
sem mesclar, sem publicar.

## O que cada agente fez
- **Sessão mãe**: leu a issue, o levantamento, a parte "O levantamento de 25/09 ainda está certo?",
  a `docs/visao.md`, o roteiro de instalação e a skill `loja-nova`; montou a ordem dos 14 slides e o
  que entra em cada um; aplicou as correções dos ajudantes.
- **Redator** (`ajudante-medio`): escreveu `apresentacao/textos-da-apresentacao.md` a partir do plano.
- **Caçador de vazamento / conferidor de regras** (`ajudante-rapido`): conferiu o texto contra as
  regras (preço, nome, cidade, "Importar por foto", data no "O que vem por aí", formato do slide).
- **Revisão final / conferidor de fatos** (`ajudante-forte`, esforço alto): conferiu cada função
  citada contra o levantamento, `docs/modulos.md` e `docs/visao.md`, e se as fotos existem.

## Modelos usados
- Planejar os slides: forte (o modelo da tabela de `docs/tarefas.md`), esforço médio. Sem troca.
- Escrever os textos: médio, esforço padrão do agente. Sem troca.
- Conferir as regras: rápido, esforço padrão do agente. Sem troca.
- Revisão final: forte, esforço alto. Sem troca.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (arquivo, medido antes do commit, do PR e deste relatório): 21 respostas;
  entrada 42, cache criado ~101 mil, cache lido ~2,37 milhões, saída ~16 mil.
- **Ajudantes** (arquivo): 3.
  - Redator (médio): cache criado ~76 mil, cache lido ~276 mil, saída ~6 mil. Pelo aviso: ~77 mil.
  - Conferidor (rápido): cache criado ~64 mil, cache lido ~51 mil, saída ~7 mil. Pelo aviso: ~70 mil.
  - Revisão final (forte, alto): cache criado ~92 mil, cache lido ~799 mil, saída ~9 mil. Pelo aviso: ~94 mil.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei. A tarefa veio pedida inteira numa mensagem só ("faça o trabalho e termine
  com PR"); não mostrei o texto do `/goal` antes de começar, e não sei se foi ligado na tela.

## O que testei e VI reprovar
- **Plantei 3 erros** numa cópia do rascunho, fora do repositório: um preço ("R$ 189,90 por mês"),
  o nome da loja de hoje no slide 2 e "(em dezembro)" no "O que vem por aí". Mandei o conferidor
  olhar as duas versões sem dizer qual tinha erro: **ele pegou os 3** na cópia e nenhum no original.
- O mesmo conferidor reprovou o original em duas coisas de verdade: os slides 12 e 13 com 6 itens
  (a issue pede 2 a 5 linhas) e "o pacote **do mês**" no "O que vem por aí". Consertei os três.
- A revisão final reprovou: a foto `55-config-computadores` (tela com termo técnico, "canal de
  teste"); o slide 11 dava a entender que os cadastros já viriam prontos do sistema antigo; e o
  prazo de 15 dias (ver "O que depende de alguém"). Consertei os dois primeiros.

## O que passou sem eu ter visto reprovar
- O português simples e o tom: ninguém além da mãe leu como "dono de loja". Termos que ficaram:
  NFC-e, NFS-e, SEFAZ, XML e DOT (os três primeiros o dono de loja já conhece pela contabilidade).
- A ordem dos slides é escolha da mãe; não foi comparada com outra ordem.

## O que ficou de fora
- O PDF e as fotos (tarefa #785, prioridade 2).
- Um slide "o que o sistema não faz" (seção 12 do levantamento): a issue não pediu. Ficaram no texto
  só os pontos que mudam a decisão de compra: Windows e internet, e a nota que depende de terceiros.
- Assistente de IA no "O que vem por aí": a issue proibiu citar o "Importar por foto", e a frente de
  IA ainda nem tem desenho (#458). Ficou de fora pra não prometer.
- Lembrete de revisão, resumo do dia no WhatsApp e pedido de compra montado (também da visão):
  saíram pra caber em 5 itens.

## O que depende de alguém
- **A Sofia**:
  - preencher `[CONTATO: a Sofia preenche]` no slide 14;
  - **confirmar a "meta de 15 dias"** pra emitir nota (slide 11). Veio da issue, mas nenhum documento
    do repositório dá esse prazo: o roteiro de instalação diz "dias a semanas", e a skill `loja-nova`
    conta 7 dias **depois** que a parte fiscal da loja fica pronta. Se for arriscado, trocar por
    "a meta é emitir nota em até 7 dias depois que o certificado e as autorizações ficam prontos";
  - confirmar os 5 itens do "O que vem por aí" (todos da onda 1 da `docs/visao.md`, sem data);
  - o slide 2 não cita a cidade (pra não identificar a loja); se ela quiser "no interior de São
    Paulo", é só acrescentar.
- **Quem montar o PDF (#785)**: as fotos `10f-orcamentos`, `29b-caixa-fechamento` e `06b-ficha-veiculo`
  ainda não estão no `fotografar-telas-dos-slides.mjs`; e conferir os números da `37-lucratividade` e
  da `46-comissoes` antes de usar (nota no fim do arquivo).
- Ninguém envia nada daqui: quem manda a apresentação é a Sofia.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a tabela de agentes deu o roteiro certo (redator, conferidor,
  caçador); a regra de plantar um erro pra ver o conferidor reprovar provou que ele funciona.
- **Onde eu errei ou tive que adivinhar**: o cabeçalho da issue diz `Ajudantes: nenhum`, mas a tabela
  de etapas pede dois ajudantes; segui a tabela. O primeiro rascunho tinha 6 itens em dois slides e
  um "do mês" no "O que vem por aí", que só o conferidor pegou. Não mostrei o `/goal` no começo.
- **O que faltou na skill**: dizer que, quando a issue traz um prazo que nenhum documento confirma
  (aqui, os 15 dias), o chefe mantém o que a issue diz e pede a confirmação no relatório.
- **Sugestão de ajuste (opcional)**: na seção 3 da skill, "número ou prazo que vem da issue e não
  tem fonte no `docs/`: manter e pedir confirmação no relatório, sem trocar sozinho".
