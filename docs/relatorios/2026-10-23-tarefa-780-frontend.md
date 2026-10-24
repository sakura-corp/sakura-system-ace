# Relatório: tarefa #780, chefe frontend

- **Tarefa**: #780, dados de mentira: arrumar os 7 itens do levantamento antes das fotos
- **Chefe**: frontend
- **Data**: 2026-10-23
- **PR**: https://github.com/sakura-corp/sakura-system-ace/pull/789
- **Jeito**: aberta pela /coordenar

## O que cada agente fez
- Sessão mãe: planejou, escreveu o banco falso e os dados (as etapas "arrumar o banco falso" e "arrumar os dados" ficaram com ela, não com um ajudante médio: os dados se cruzam entre telas e cada ajuste mexia em outro), rodou as varreduras e fotografou as telas.
- Ajudante tester (`ajudante-medio`): olhou as 28 fotos em 1366 × 768, conferiu os itens 1 a 7 e o 11 com os números da tela e achou mais 5 estranhezas dos dados (o "+999%" do Início, OS de madrugada e de domingo, NFS-e com número de OS, um dia de diferença numa data), todas consertadas.
- Ajudante revisor (`ajudante-forte`, esforço alto): revisão final do diff, com o relógio fingido em 132 combinações de dia e hora. Nenhum erro no banco falso; achou 1 teste que reprovava em alguns dias (o do "+999%"), Garantias mostrando peça de OS aberta, o fechamento do caixa com o "esperado" inventado, a comissão paga citando OS de fora do período, a OS 146 e os orçamentos abrindo à noite ou no domingo, o corte de dia em UTC (`toISOString().slice`) e 2 testes que passavam vazios. Tudo consertado, com teste visto reprovar antes (exceto a comissão, que hoje passava por sorte de data: o revisor mostrou 108 dias ruins em 730).

## Modelos usados
- Planejar e escrever: forte (claude-opus-5-5), esforço médio.
- Conferir nas fotos: médio (`ajudante-medio`), esforço médio.
- Revisão final: forte (`ajudante-forte`), esforço alto. A 1ª rodada parou com "You've hit your session limit" (limite da conta, não do modelo); a 2ª (agente comum com o apelido `opus`, porque a ferramenta não aceita o ID da reserva `claude-opus-5`) ficou presa no mesmo limite e foi parada; a 3ª rodou depois que o limite voltou (23:50 UTC).

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe** (arquivo, medido antes da descrição final do PR): 133 respostas; entrada 277, cache criado 514.012, cache lido 31.077.295, saída 96.723.
- **Ajudantes** (arquivo; o aviso dá outra conta):
  - tester (`ajudante-medio`): 7 respostas; cache criado 106.452, lido 384.208, saída 14.103 (aviso: 115.815 tokens, 32 ferramentas).
  - revisor, 1ª rodada (`ajudante-forte`, alto): 59 respostas; cache criado 294.229, lido 6.735.538, saída 34.423. Parou no limite antes de entregar: gasto perdido.
  - revisor, 2ª rodada (agente comum, `opus`, alto): 4 respostas; cache criado 64.617, lido 179.239, saída 1.103. Parada por mim (presa no limite).
  - revisor, 3ª rodada (`ajudante-forte`, alto): 49 respostas; cache criado 131.584, lido 6.260.248, saída 38.575 (aviso: 170.468 tokens, 52 ferramentas).
- **Sessões filhas**: nenhuma.
- **`/goal`**: ligado na tela (chegou a esta sessão como comando `/goal`); não sei como ele parou: a coordenadora confere.

## O que testei e VI reprovar
- **Banco falso** (`site/ferramentas/dados-de-mentira.test.mjs`, 7 testes): escritos antes da função existir; os 7 reprovaram, depois passaram. Cobrem `.in()` (com e sem aspas), `.eq()` com nulo, ordem por várias colunas, número × texto, `offset`/`limit`.
- **Dados** (12 testes, um por item do levantamento): rodados contra os dados da `main` (cópia do arquivo antigo): os 12 reprovaram. Nos dados novos, passam.
- **"Lucratividade = vendas do caixa + o que não foi recebido"**: a primeira versão do teste só somava entradas de OS e passou com R$ 720 de diferença na tela (a parcela da conta a receber `cr3`, sem OS, caía no mês). Corrigi o teste, vi reprovar (39.438,50 × 40.158,50) e só então mudei o dado.
- **Achados do tester** (3 testes novos): o "+999%" reprovou (variação de 5.377%), a OS de madrugada reprovou (OS 143 às 3h). Depois do conserto, passam.
- **Achados da revisão** (4 testes novos e 3 reforçados): reprovaram a ordem das OS de hoje, Garantias, o fechamento do caixa e o "de madrugada" (agora olhando todas as OS, não só as faturadas). Depois do conserto, passam.
- **Relógio fingido**: os testes de dados, com "hoje" num dia a cada 3 durante um ano inteiro, às 7h30, 10h e 21h30: 381 de 381 passaram; depois dos últimos consertos, um dia a cada 4 (2 horários, 186 de 186) e um por semana (53 de 53).
- **Fotos finais, achados meus** (2 testes novos): "Lucros mês −98%" e depois "−R$ 42" (as contas da loja só existiam no mês corrente, e com elas a loja empatava). O teste "o mês passado também pagou as contas e dá lucro" reprovou antes do conserto. Agora as contas se repetem todo mês e a mistura de atendimentos tem a revisão (óleo, alinhamento e pastilha): o mês passado fecha com uns 14% de lucro.
- **Relógio fingido, primeira rodada**: os 15 testes de dados rodaram com "hoje" em 12 datas (dia 1º, domingo, 31/12, 01/01, 28/02, 01/03, antes das 8h, 23h30) nos fusos de São Paulo e UTC. Só o 1º de março reprovou no "+999%" (um dia contra um dia); o teste passou a valer do dia 5 em diante.

## O que passou sem eu ter visto reprovar
- `npm run typecheck`, `lint`, `contraste`, `test:fusos` (a suíte inteira, com os testes novos, nos dois fusos).
- `npm run contraste:telas` (65 telas, nenhuma reprovação nova) e `npm run largura:telas` (65 telas × 5 larguras, nada passando da janela).

## O que ficou de fora
- **Lucratividade × Início (decisão da Sofia, pela coordenadora)**: Início e Gráficos batem ao centavo; a Lucratividade fica maior **só** pelo total das OS ainda não recebidas (as em andamento, a concluída e a OS 145 a receber). A diferença vem do programa: a Lucratividade conta a OS pela data em que foi aberta, mesmo antes de ser recebida. Não inventei entrada no caixa pra empatar. A Sofia decide se vira tarefa.
- **Forma de pagamento crua no Caixa Diário (achado novo, do programa)**: o programa grava no caixa a chave da forma ("cartao_debito", "pix") e o Diário mostra assim mesmo, numa loja de verdade também. Os dados de mentira gravam o nome ("Cartão de débito"), como sempre gravaram, pra a foto não levar o defeito. Vale uma tarefa.
- **Estoque com saldo final maior que o pedido em duas peças**: a partida (a "Contagem geral" de 28 dias atrás) cobre o ponto mais baixo de cada peça, então amortecedor e pastilha terminam com mais do que o alvo. Não atrapalha nenhuma tela.
- **Fuso do Node × do navegador (achado do revisor)**: os dados são montados no fuso de quem roda o Node, e o navegador das telas está fixo em São Paulo. Vi isso nas fotos: rodando à meia-noite UTC (21h em São Paulo), "hoje" virou outro dia e o Diário mostrou "depois do fechamento". As fotos da apresentação saem de um computador em São Paulo, então não muda nada pra elas; quem fotografar numa sessão da nuvem precisa rodar com `TZ=America/Sao_Paulo`. As varreduras do CI (que só medem contraste e largura) veem os horários deslocados. Não mexi em `percorrer-telas.mjs` (fora da lista de arquivos).
- O comentário do topo de `apresentacao/fotografar-telas-dos-slides.mjs` ainda fala das duas "pegadinhas" que esta tarefa consertou (as notas sem filtro por OS e o lucro do dia igual à venda). Está fora da lista de arquivos; fica pra tarefa do PDF.
- Novo arquivo de teste: `site/ferramentas/dados-de-mentira.test.mjs` não estava na lista da issue; entrou porque a etapa pedia "teste primeiro".

## O que depende de alguém
- A Sofia: revisar o PR. Nada no PC (é tudo nas ferramentas, conferido pelas fotos), nada pra publicar.
- A tarefa do PDF: tirar as fotos finais na véspera (as datas andam com o relógio).

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o ritual deixou claro mandar as perguntas pela coordenadora e não decidir a conta da Lucratividade sozinho; o "teste primeiro" pegou um erro meu (o teste fraco da Lucratividade) que a tela mostrou.
- **Onde eu errei ou tive que adivinhar**: escrevi o primeiro teste da Lucratividade só com as entradas de OS e ele passou com a tela errada; só vi pela foto. Também usei `toISOString().slice` (o corte de dia em UTC, proibido pelas regras do projeto) num ajudante que já existia, e só a revisão pegou. A varredura em segundo plano ficou travada durante o limite de uso e precisei refazer.
- **O que faltou na skill**: o que fazer quando o limite é da conta inteira (o modelo de reserva não ajuda, e a ferramenta de agente não aceita o ID da reserva `claude-opus-5`, só o apelido `opus`).
- **Sugestão de ajuste (opcional)**: no ritual, seção 5, dizer que "session limit" é da conta: esperar a hora que o aviso dá, e não trocar de modelo.
