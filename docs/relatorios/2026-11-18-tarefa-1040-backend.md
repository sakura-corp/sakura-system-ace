# Relatório: tarefa #1040, chefe backend

- **Tarefa**: #1040, tributos aproximados na NFC-e e na NFS-e (alíquota efetiva do Simples por loja) e o resumo da OS na NFS-e
- **Chefe**: backend
- **Data**: 2026-11-18
- **PR**: o PR da branch `claude/tarefa-1040-backend-hqgqii`
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue e o código da emissão. Decidiu reaproveitar a `percentual_tributos_simples` como a alíquota do serviço e escreveu os campos novos nos tipos e no `configuracoes.ts`. Trocou o número da migration pra 0087, rodou as conferências e consertou os achados da revisão.
- **Ajudante de banco**: escreveu a migration, o `testar-tributos-aproximados.sql`, as frases das travas no `errors.ts`, o `OBJETOS_NOVOS_DO_BANCO`, a instalação e o `docs/banco.md`. Rodou o `test:sql` num Postgres descartável e quebrou a migration de 4 jeitos.
- **Ajudante da conta e da emissão**: escreveu `src/schemas/tributosAproximados.ts` e `src/schemas/discriminacaoNFSe.ts` (com teste primeiro), a emissão em `focusNfe.ts`, o teste-ouro 7 e a troca de uma linha no modal de emissão.
- **Ajudante de tela**: escreveu `src/schemas/avisoTributos.ts` e a validação dos percentuais novos. Fez os campos e o botão "Confirmei a alíquota deste mês" em Dados fiscais, o aviso do Início (`AvisoTributosDoMes`) e os dados de exemplo.
- **Revisor**: leu o diff do zero e trouxe 5 achados. A mãe conferiu cada um e consertou os 5 (detalhe abaixo).

## Modelos usados
- Planejar e juntar: sessão mãe, forte (Opus 5.5).
- Migration e teste do banco: forte, esforço alto.
- A conta e a emissão: forte, esforço alto (as duas etapas num ajudante só, porque a emissão depende da conta).
- Configurações e o aviso: médio, esforço padrão.
- Revisão final: forte, esforço alto.
- Não chamei o "explorador" rápido: a mãe leu os arquivos direto (eram poucos). Nenhuma troca por falha.

## Sessões filhas
- Nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe**: não medido (a sessão não lê o próprio uso).
- **Ajudantes**: 4, cada um pelo aviso de fim:
  - banco: forte, alto, cerca de 107 mil tokens;
  - conta e emissão: forte, alto, cerca de 164 mil;
  - tela: médio, cerca de 112 mil;
  - revisor: forte, alto, cerca de 106 mil.
- **Sessões filhas**: nenhuma.
- **`/goal`**: a pessoa colou o `/goal` no turno 4. Quando este relatório foi escrito, ele ainda estava valendo (falta o CI).

## O que testei e VI reprovar
- **Banco** (`testar-tributos-aproximados.sql`, num Postgres 16 descartável):
  - tirar o teto da trava das peças reprovou com "FALHOU 8: a trava das peças deixou passar 100.01" (o ajudante viu com o número 0089 e a mãe viu de novo com a 0087);
  - tirar o `if not exists` reprovou na segunda rodada;
  - apagar a trava do ICMS-ST reprovou com "FALHOU 4";
  - apagar o registro da versão fez o `gerar-instalacao` recusar.
- **A conta** (`tributosAproximados.test.ts`): serviço, peça sem ST, peça com ST e nota mista reprovaram antes do código. Depois quebrei de propósito: sem a trava da alíquota 0, `incluiST` sem olhar a estimativa, total sem arredondar cada linha (0,70 × 6,5% deu 0,09 em vez de 0,10).
- **A emissão** (`focusNfe.test.ts`):
  - a NFC-e com e sem ST, a NFS-e municipal e a Nacional, e o corte nos 2000 caracteres reprovaram antes do código;
  - mandar os campos sempre derrubou os 3 testes de "sem alíquota", os 6 testes-ouro antigos e 2 testes antigos de corpo.
- **O resumo da OS**: o teste do modal reprovou com "Alinhamento; Balanceamento" antes da troca.
- **O aviso**:
  - `avisoTributos.test.ts` reprovou antes do código, e de novo sem a regra "nenhuma alíquota" (1 teste) e com o regime invertido (5 testes);
  - na revisão, o teste "sem alíquota nenhuma: sem botão" reprovou sem o conserto e passou com ele.
- **Os achados da revisão**: os testes de NFS-e municipal, do "…" e do total da NFC-e reprovaram quando o comportamento mudou e foram atualizados.

## O que passou sem eu ter visto reprovar
- O teste de tela do aviso, nos casos "mês confirmado some" e "sem permissão, sem botão".
- O botão "Confirmei" desabilitado com número digitado e não salvo em Dados fiscais: não tem teste de tela.
- A matriz de RLS: passou, mas nenhuma policy mudou.
- O `contraste:telas` e o `largura:telas` (72 telas): passaram, mas os dados de exemplo podem não abrir o bloco do Simples.

## O que ficou de fora
- **O campo de "informações complementares" da NFS-e**: esta máquina não alcança a documentação da Focus (`focusnfe.com.br`, bloqueado na rede da sessão). Por isso a frase dos tributos vai **no fim da descrição do serviço**, que sai no PDF com certeza.
- **O total `valor_total_tributos` da NFC-e**: o do item foi confirmado no exemplo oficial da Focus (`FocusNFe/php`). O nome do campo do total é o mesmo, mas não conferi na documentação. Se a Focus reclamar, é só tirar essa linha.
- **A quebra de linha na NFS-e Nacional** (uma linha por serviço): pode ser recusada pelo Ambiente Nacional. Só o teste em homologação no PC tira a dúvida. No caminho municipal as linhas vão separadas por "; ", como antes.

## O que depende de alguém
- **A Sofia**:
  - aplicar a migration **0090** pelo "Atualizar o banco" (ensaiar, depois aplicar), **depois da 0087, da 0088 e da 0089** (#1146, #1120 e #1121) e **antes** da versão. Não tem `versao-minima-do-programa`.
  - **Número** (revisão de 20/11): voltou a ser 0089. O teste "sem buraco na numeração" só fica verde depois que a 0087 e a 0088 entrarem na `main` e esta branch for atualizada (e o `gerar-instalacao` rodar de novo).
  - **Decisão a conferir**: a alíquota do serviço reaproveita a `percentual_tributos_simples` (a mesma do pTotTribSN), em vez de criar uma coluna nova com o mesmo número.
- **O Tiago, no PC** (Supabase de teste, homologação):
  - preencher as alíquotas e confirmar o mês;
  - emitir uma NFC-e com uma peça com ST e uma sem;
  - emitir uma NFS-e de uma OS com 2 serviços.
- **Depois de publicar**: a Sofia põe na loja os números da contadora e manda uma nota de cada pra contadora conferir.

## Revisão da Sofia (20/11)
- Migration renumerada pra **0089**, e depois pra **0090** (Sofia, 20/11: o #1146 entrou com a 0087).
- NFS-e municipal: o corte em 2000 agora vem **depois** de trocar a quebra de linha por "; ". O teste novo (400 linhas) reprovou com 2381 caracteres antes do conserto.

## Onde parou
Falta atualizar a branch com a `main` quando a 0087 e a 0088 entrarem e rodar o `gerar-instalacao` de novo. Depois disso o CI fica verde.

## Como eu agi
- **O que a skill me ajudou a fazer**: a lista de regras da migration (idempotente, versão, instalação, teste SQL) e a ordem "quebrar de propósito". O ritual deu o formato dos ajudantes em paralelo e do relatório.
- **Onde eu errei ou tive que adivinhar**:
  - Comecei com a 0089 (depois dos números dos PRs abertos). O teste de "numeração sem buraco" reprova isso, então voltei pra 0087.
  - Commitei o trabalho dos ajudantes ainda pela metade, porque o gancho de fim de turno pede commit.
- **O que faltou na skill**:
  - dizer o que fazer quando outro PR aberto já usa o próximo número de migration (a regra hoje é "a próxima livre", mas na `main` e nos PRs abertos ela é diferente);
  - lembrar que a documentação da Focus pode estar fora da rede da sessão.
- **Sugestão de ajuste (opcional)**: na seção 3 do `chefe-backend`, uma linha: "migration usa o próximo número da `main`; se um PR aberto já usa, siga mesmo assim e avise no PR que quem mesclar depois renumera (o teste de numeração não aceita buraco)".
