# Relatório da leva 6

> Escrito pelo Claude da Sofia em 10/11/2026. **Aprovar é a Sofia mesclar este PR**: com este arquivo na `main`, a
> leva 6 fica "Aprovada", e a leva 7 passa a ser a leva atual.

## 1. O que entrou

17 de 18 tarefas feitas. A leva começou com o que sobrou da leva 5 (a Central do dia, o Pix, a avaliação no Google e a
busca geral) e cresceu com os consertos da primeira NFS-e Nacional e dos dados de exemplo da equipe.

| Tarefa | O que é | PR |
|---|---|---|
| #454 | Central do dia no Início: o que precisa de atenção hoje | #854 |
| #372 | Busca geral com Ctrl+K: placa, cliente, OS, peça e fornecedor numa caixa só | #857 |
| #456 | Pix copia e cola na cobrança e QR no faturamento, já com o valor (migration 0081) | #941 |
| #459 | Pedir avaliação no Google pelo WhatsApp, na OS e na venda faturadas (migration 0082) | #945 |
| #866 | NFS-e Nacional: o percentual aproximado dos tributos do Simples nos Dados fiscais (migration 0078) | #882 e #936 |
| #861 | NFC-e: pessoa física sem CPF sai como consumidor não identificado | #944 |
| #865 | Dois textos velhos: o "API Keys" na conexão e o aviso de computador atrasado | #954 |
| #814 | O painel saiu daqui (mora no escritório) | #863 |
| #864 | Peça: avisar quando o CFOP e o CSOSN não combinam | #963 |
| #947 | Configurações: salvar não pula pro topo e o "salvo" aparece perto do botão | #964 |
| #950 | Emitir NFC-e: avisar a pessoa física sem CPF completo | #961 |
| #957 | Dados de exemplo: as peças saem com CSOSN, CFOP e origem | #960 |
| #708 | Peça parecida: lado LE/LD, índice de carga do pneu e peça inativa no aviso | #953 |
| #965 | NFS-e Nacional: a prévia do PDF depois de emitir (a política de segurança fora do visualizador de PDF) | #971 |
| #968 | Aviso CFOP × CSOSN: sugerir só 5102/5405 e avisar na emissão e na importação | #973 |
| #967 | Configurações: descartar a carga da loja anterior ao trocar de loja | #974 |
| #966 | Dados de exemplo: CEST nas 12 peças de exemplo | #977 |

**Onde cada uma está**: as oito primeiras da tabela (da #454 à #814) estão nas lojas, na **v0.9.57** (liberada em
09/11), com o banco da Pneus Amigão na 82. As outras nove (da #864 à #966) estão na `main` e vão na **próxima
versão**, que ainda não foi publicada. A #814 e a #966 não mudam o programa das lojas: uma mexe na
documentação, a outra nos dados de exemplo do banco de teste.

## 2. Horas (no total da leva)

- **Estimadas**: 81 h (as 18 tarefas).
- **Entregues**: 78 h (as 17 feitas, pela estimativa de cada uma).
- **Ficaram abertas**: 3 h (a #969).

## 3. Defeitos achados nos testes

**A rodada de testes desta leva foi adiada**, como nas levas 4 e 5. A Sofia decidiu em 10/11 aprovar o relatório agora,
pra a leva 7 abrir e a equipe ter tarefa pra pegar. O que a leva 6 entregou é testado no dia de teste da próxima versão,
junto com o "Depois de publicar" de cada tarefa (seção 5).

Por isso: nenhum defeito achado nos testes por enquanto. O que aparecer nessa rodada vira issue com a etiqueta
`defeito`, sem `leva-N`.

Nas revisões dos PRs apareceram defeitos que já existiam antes, e eles viraram tarefa: a #978 e a #979 (sem leva), e
três que entraram na leva 7 (o CFOP com ponto na nota, a Configurações que mostra os dados da loja anterior quando a
carga dá erro, dentro da #927, e as outras telas sem a proteção da troca de loja, também na #927).

## 4. O que ficou pra próxima

| Tarefa | O que é | Estimativa |
|---|---|---|
| #969 | Estoque: com a lista rolada, a canetinha parece não fazer nada. O PR #975 está quase pronto: falta a mesma linha em Clientes, pedida na revisão de 10/11 | 3 h |

A #969 continua com a etiqueta `leva-6`: o painel deixa pegar e entregar tarefa aberta de uma leva anterior.

Ficou também a rodada de testes, adiada:

| O que | Quando |
|---|---|
| Testar o que a leva 6 entregou (o "Depois de publicar" de cada tarefa, seção 5) | no dia de teste da próxima versão |
| As rodadas adiadas das levas 4 e 5 | nos 10 a 15 dias antes do próximo cliente (relatórios das levas 4 e 5) |

## 5. O que depende da Sofia

- **Aprovar este relatório** (mesclar o PR). A leva 7 passa a ser a leva atual, e a equipe já pode pegar tarefa dela.
- **No banco de teste**: rodar o `supabase/exemplo/dados-de-exemplo.sql` no `ssace-teste` e salvar o pneu e o bico de
  válvula sem erro (#966).
- **Publicar a próxima versão e testar antes de liberar**: o aviso de CFOP × CSOSN no cadastro da peça, na emissão e nas
  duas importações (#864, #968); salvar em Configurações sem pular pro topo, e trocar de loja no meio do carregamento
  (#947, #967); a pessoa física sem CPF completo na emissão (#950); o aviso da peça parecida com LE/LD (#708).
- **Na Pneus Amigão, depois de liberar**: na próxima NFS-e Nacional, a prévia mostra o DANFSe e o "Imprimir" abre a
  janela de impressão; em Notas Fiscais, a NFS-e nº 1 abre a prévia (#965).
- **Já dá pra conferir na loja** (está na 0.9.57): a Central do dia, o Ctrl+K, o Pix na cobrança e o pedido de
  avaliação no Google (#454, #372, #456, #459).
