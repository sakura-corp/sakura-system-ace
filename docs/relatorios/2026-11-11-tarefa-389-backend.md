# Relatório: tarefa #389, chefe backend

- **Tarefa**: #389, Fluxo de caixa projetado (o que vai entrar e sair nas próximas semanas)
- **Chefe**: backend
- **Data**: 2026-11-11
- **PR**: (link na descrição do PR desta branch, `claude/tarefa-389-fluxo-projetado`)
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue e as respostas da Sofia, decidiu as regras da conta (abaixo), escreveu o contrato de `src/schemas/fluxoProjetado.ts` (os tipos), juntou, tirou as fotos, corrigiu os achados das duas revisões e escreveu o teste da página (`RelatoriosPage.test.tsx`).
- **Explorador**: não chamei; a mãe achou os arquivos sozinha (eram poucos e a issue já dizia quais).
- **Ajudante forte (a conta)**: `src/schemas/fluxoProjetado.ts` e o teste (20 casos), com a skill `teste-primeiro`.
- **Ajudante médio (a aba)**: `FluxoProjetadoSection.tsx`, o teste dela (5 casos) e a aba em `RelatoriosPage.tsx`.
- **Ajudante forte (revisão final)**: leu o diff do zero; 5 achados, nenhum grave. Corrigi o 1 (erro nas contas apagava os Gráficos e aparecia como "Sem acesso") e o 5 (o "—" do saldo sem explicação); o 2 (faltava teste da página) virou o `RelatoriosPage.test.tsx`; o 3 e o 4 estão em "O que depende de alguém".
- **`/code-review`** (na sessão mãe, regra da equipe): 5 achados; corrigi 4 (os Gráficos esperavam as contas; a resposta da loja antiga podia ganhar ao trocar de loja; sem "Carregando" na recarga; reformatação à toa). O outro é o mesmo item 3 da revisão.

## Modelos usados
- Planejar e juntar: forte (Opus 5.5), esforço médio (a sessão).
- A conta: `ajudante-forte`, esforço alto.
- A aba: `ajudante-medio`, esforço padrão do agente.
- Fotos: não chamei o ajudante rápido; a mãe tirou (precisou de um ajuste temporário no Windows, ver abaixo).
- Revisão final: `ajudante-forte`, esforço alto.
- Nenhuma troca por falha de modelo.

## Sessões filhas
- nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe**: não medido (o Claude do PC não mostra o arquivo de uso pra sessão).
- **Ajudantes**: 3, pelo aviso de fim: a conta ~107 mil tokens, a aba ~96 mil, a revisão ~97 mil.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não usei: a mãe não montou nem mostrou o texto do `/goal` na primeira mensagem (esqueci o passo 5 do ritual).

## O que testei e VI reprovar
- **A conta (20 casos)**: os 20 reprovaram antes de a função existir ("ainda não existe"); depois passaram.
- **Contar a recorrente duas vezes**: o ajudante tirou a linha que para a previsão quando a próxima já existe; 2 casos reprovaram (o das duas pendentes e o da próxima já paga). Desfeito.
- **Previsão no passado**: sem a guarda e jogando pra hoje o que tem data passada, o caso "recorrente atrasada há mais de um mês" reprovou. Desfeito. (Só tirar a guarda **não** reprovava: o dia passado nem está na lista. A guarda é reforço.)
- **Permissão na página**: troquei `temPermissao(operador, "contas_pagar")` por `true`; o caso "só com Relações" reprovou (buscou as contas a pagar). Desfeito.
- **Erro ao carregar as contas**: o caso novo reprovou antes do conserto (a página mostrava "Sem acesso" e escondia os dados).

## O que passou sem eu ter visto reprovar
- Os 5 testes da aba (`FluxoProjetadoSection.test.tsx`): reprovaram só porque a função ainda não existia, não por quebrar a tela.
- O caso "com Relações e Contas a Pagar" da página.
- `arquitetura.test.ts` (nenhuma conta na tela): passou sempre.

## Conferências
- `typecheck`: verde. `lint`: 0 erros (1 aviso antigo no `AuthContext`).
- `vitest` de `src/schemas` e `src/pages/relatorios`: 48 arquivos, todos verdes.
- `test:fusos`: tudo verde nos dois fusos, menos 1 teste fora da tarefa (`scripts/checar-segredos.test.ts`, os ganchos do git), que reprovou só na rodada completa e **passou sozinho** (com e sem as mudanças): parece lentidão do PC. O CI confirma.
- `contraste:telas` e `largura:telas`: **não rodam no Windows** (o `servidor-telas.mjs` chama `npx` sem `shell`). Rodam no CI (Linux). Pra tirar as fotos, liguei `shell: true` só no meu computador, e desfiz.

## Fotos (`docs/relatorios/tarefa-389/`)
- `fluxo-com-tudo.jpg`: login com tudo. Foi aqui que apareceu que o vermelho dos negativos (`text-red-700`) não se lia no fundo escuro; troquei pelo `text-red-300` (o que o Estoque usa).
- `fluxo-so-relacoes.jpg`: só Relações: os três cartões com "—" e o motivo.
- `fluxo-relacoes-e-pagar.jpg`: Relações e Contas a Pagar: só o lado de pagar.
- As duas sem permissão saíram trocando o operador de mentira em `site/ferramentas/dados-demo.mjs` só no meu computador (desfeito; não está no PR).

## O que ficou de fora
- Cartão a receber e taxa da maquininha (#387), como a issue manda.
- O "saldo de hoje" digitado (pergunta 4, opção B): a Sofia escolheu a A.

## O que depende de alguém
- **Sem migration**: nada pra aplicar no banco.
- **Lázaro, no PC (Supabase de teste)**: o "Pronto quando no PC de quem fez" da issue (criar as 3 contas, conferir os dias, o teste de permissão com os dois logins, apagar no fim).
- **Sofia, arquivos fora da lista da issue** (a issue diz "parar e perguntar"; ficaram no PR pra ela aprovar ou mandar tirar): `site/ferramentas/cenas.mjs` (a cena `37b-fluxo-de-caixa`, pra a aba entrar nas fotos e nas varreduras do CI), `src/pages/relatorios/RelatoriosPage.test.tsx` (o teste da página) e as fotos em `docs/relatorios/tarefa-389/`.
- **Sofia, decisões que eu tive que tomar**:
  1. **Período**: de hoje até hoje + N dias, inclusive (igual ao "Contas a pagar vencendo" do Início).
  2. **Recorrente atrasada há mais de um mês** (o achado 3 das revisões): a previsão não cria as ocorrências do passado. Ex.: internet de 20/09 pendente em 11/11 mostra a de 20/09 (atrasada) e a de 20/11 (prevista), sem a de 20/10, que vai nascer atrasada quando a de 20/09 for paga. A outra opção é pôr essas ocorrências no dia de hoje como "atrasada" e "prevista". Escolhi a mais cautelosa (não inventar dívida); ela decide.
  3. **Como a série de uma recorrente é reconhecida**: o banco não tem um "id da série". Usei descrição + categoria + valor (o que o `pagarConta` copia). Se um dia existir editar conta a pagar, mudar o valor de uma ocorrência quebra a ligação e a previsão pode contar duas vezes; hoje o programa não tem editar.
  4. **Dia 31**: a previsão segue o `proximoVencimento` (31/01 → 28/02 → 28/03), o mesmo que o sistema usa ao criar a próxima conta. O dia vai "escorregando" depois de fevereiro, igual ao que acontece de verdade.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: as regras duras (conta só em `src/schemas`, `diaLocal`, `mensagemDeErro`) e "quebrar de propósito" guiaram os pedidos aos ajudantes; a revisão final pegou um problema que os testes não pegavam (o erro das contas virando "Sem acesso").
- **Onde eu errei ou tive que adivinhar**: esqueci de montar o `/goal` na primeira mensagem; não chamei o explorador nem o ajudante rápido das fotos (fiz na mãe); as 4 decisões acima; mexi em arquivos fora da lista da issue sem a Sofia (deixei pra ela no PR).
- **O que faltou na skill**: dizer que no Windows `contraste:telas`/`largura:telas` não rodam, e como tirar a foto "sem permissão" (o banco de mentira só tem o operador administrador).
- **Sugestão de ajuste (opcional)**: o `chefe-backend` (ou o `chefe-frontend`) ganhar uma linha: "fotos com e sem permissão: `node site/ferramentas/gerar-catalogo-telas.mjs <pasta> <cena>`, trocando o operador em `dados-demo.mjs` só no computador; no Windows o servidor de telas precisa de `shell: true`". Melhor ainda: uma opção no `percorrer-telas.mjs` pra escolher as permissões do operador, e o `servidor-telas.mjs` funcionar no Windows (tarefa à parte).
