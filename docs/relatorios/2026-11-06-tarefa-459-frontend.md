# Relatório: tarefa #459, chefe frontend

- **Tarefa**: #459, pedir avaliação no Google depois do serviço, pelo WhatsApp
- **Chefe**: frontend
- **Data**: 2026-11-06
- **PR**: o desta branch (`claude/tarefa-459-frontend-lwb4f7`)
- **Jeito**: com ajudantes

## O que cada agente fez
- **Ajudante forte (banco)**: escreveu a migration 0082 (tabela `configuracoes_avaliacao`, trava
  `ck_configuracoes_avaliacao_link_https`, RLS por loja igual à dos textos de WhatsApp), o
  `testar-link-avaliacao.sql`, a matriz de RLS (expectativas, cenário e sonda), a frase do erro em
  `errors.ts`, a versão 82 e a linha em `docs/banco.md`.
- **Ajudante médio (telas)**: escreveu o modelo "Pedir avaliação no Google", o esquema zod do link,
  o campo em Configurações → Mensagens de WhatsApp, o botão "Avaliação" na lista de OS e no detalhe
  da venda de balcão, e quatro arquivos de teste. Escreveu os testes antes do código.
- **Ajudante forte (revisão final)**: leu o diff do zero. Achou dois defeitos reais (a venda do
  Consumidor e o `$` no link), consertados pela mãe com teste visto reprovar. Também achou um teste
  que afirma um aviso que a pessoa não vê, e uma ligação sem teste.
- **Mãe (eu)**: plano, link de exemplo nas telas de mentira, varreduras de tela, fotos, os dois
  consertos da revisão e este relatório.

## Modelos usados
- Plano e junção: forte (sessão mãe), esforço médio.
- Migration e teste SQL: forte (`ajudante-forte`), esforço alto.
- O modelo e o botão: médio (`ajudante-medio`), esforço padrão do agente.
- Revisão final: forte (`ajudante-forte`), esforço alto.
- Nenhuma troca por falha.

## Sessões filhas
- Nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe** (via arquivo, medido antes do PR e deste relatório): 62 respostas; entrada
  128, cache criado 161.520, cache lido 9.735.744, saída 29.108.
- **Ajudantes** (via arquivo):
  - banco: 30 respostas, cache criado 108.646, cache lido 2.649.425, saída 16.806;
  - telas: 24 respostas, cache criado 114.785, cache lido 2.275.300, saída 21.385;
  - revisão: 47 respostas, cache criado 137.105, cache lido 5.185.674, saída 25.010.
  - Pelos avisos de fim: uns 111 mil, 117 mil e 141 mil.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não sei se foi ligado. Não mostrei o texto do `/goal` na primeira mensagem, como o
  ritual pede (falha minha; ver "Como eu agi").

## O que testei e VI reprovar
- **Botão com e sem link** (`OrdensServicoPage.avaliacao.test.tsx` e
  `VendaBalcaoDetalhe.avaliacao.test.tsx`): reprovaram antes do código existir e, depois, com a
  checagem de "faturada" e a do link tiradas de propósito.
- **Link sem `https://` recusado ao salvar**:
  - na tela (`ModelosWhatsappSection.avaliacao.test.tsx`), reprovou sem o `zodResolver`;
  - no esquema (`whatsapp.test.ts`), reprovou com a regra afrouxada (`\S+` virou `.*`);
  - no banco (`testar-link-avaliacao.sql`), reprovou com a trava afrouxada pra `'^https://'`.
- **Migration rodada de novo**: sem o `drop constraint if exists`, dá erro.
- **Matriz de RLS**: um número trocado deu "3 células não bateram"; sem a sonda, reprovou; a policy
  com `using (true)` deu 14 células erradas.
- **Frase do erro**: sem ela em `errors.ts`, o `errors.test.ts` reprovou.
- **Venda do Consumidor** (achado da revisão): o teste novo reprovou com o botão aparecendo, e
  passou com o conserto.
- **Link com `$`** (achado da revisão): `preencherModelo` trocava `$&` pelo marcador; o teste
  reprovou e passou depois do conserto.
- **Leitura do link falhando**: reprova se a leitura volta pro `Promise.all` da lista (conferido
  pela revisão).

## O que passou sem eu ter visto reprovar
- `typecheck` e `lint` (0 erros; 1 aviso que já existia em `AuthContext.tsx`).
- `contraste`, `contraste:telas` e `largura:telas`: 65 telas em 1024 a 1600, nada passando da janela.
- `npm test` e `test:fusos`: 1511 passam. A única falha é a esperada, o "sem buraco na numeração",
  porque a 0081 é do #941, ainda aberto. É o mesmo caso da fila do banco já registrada em
  `docs/historico.md`.

## O que ficou de fora
- **Ver o "Link salvo." na tela de verdade**: ao salvar, a página recarrega e a seção fecha, então
  o aviso não chega a aparecer. Os textos de WhatsApp e de garantia já funcionam assim hoje. O
  teste da seção prova o aviso só com um recarregar falso.
- **Botão na venda do Consumidor**: some de propósito (sem cadastro, sem telefone). Por isso não há
  foto da venda com o botão: a venda das telas de exemplo é do Consumidor. Esse caso está provado
  pelo teste da página.
- **Aviso quando a loja apaga `{link_avaliacao}` do texto**: não existe. A mensagem sai sem o link.

## O que depende de alguém
- **Sofia**:
  - escolher pela foto a coluna de ações da lista de OS: uma linha (o padrão deste PR) ou duas
    linhas (`docs/relatorios/fotos/tarefa-459/`);
  - aplicar a 0082 **só depois da 0081 (#941)**: o "Atualizar o banco" aplica só número maior que o
    último gravado, então a 0081 seria pulada;
  - regerar a instalação depois que o #941 entrar.
- **Depois de publicar** (Sofia): configurar o link da Pneus Amigão e pedir uma avaliação de verdade.
- **Teste no PC** (`docs/equipe.md`, "Testar no seu computador o que a sessão da nuvem fez"): caso
  B, branch `claude/tarefa-459-frontend-lwb4f7`, contra o banco de teste, com a 0082 aplicada pela
  Sofia. Roteiro: em Configurações → Mensagens de WhatsApp, salvar um link com `http://` (deve
  recusar), depois com `https://`; faturar uma OS de um cliente com telefone e clicar em
  "Avaliação" na lista.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a regra "aparência se decide por imagem" me fez fotografar a
  lista de OS. A primeira versão do ajudante (`flex-wrap`) deixava toda linha com duas alturas, e
  isso só apareceu na foto. A varredura de largura passava nas duas versões.
- **Onde eu errei ou tive que adivinhar**:
  - não montei o `/goal` na primeira mensagem, como manda o ritual;
  - a lista de arquivos da issue não tinha `cenario.sql`, `sondas.sql`, `errors.ts`, os testes nem
    `site/ferramentas/dados-demo.mjs`, e todos são necessários pra tabela nova e pras telas. Tratei
    como parte da "matriz de RLS" e das "fotos", sem parar pra perguntar.
- **O que faltou na skill**: dizer que, numa tela de exemplo, o dado de mentira precisa cobrir o
  caso novo (aqui, o link em `dados-demo.mjs`). Sem isso, a varredura de largura não mede o botão.
- **Sugestão de ajuste (opcional)**: na seção 5 da `chefe-frontend`, trocar "olhar a tela renderizada"
  por "olhar a tela renderizada **com o dado de mentira que faz o caso novo aparecer**", porque a
  varredura passa calada quando o botão nem é desenhado.
