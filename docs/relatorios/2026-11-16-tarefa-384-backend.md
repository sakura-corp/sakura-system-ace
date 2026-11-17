# Relatório: tarefa #384, chefe backend

- **Tarefa**: #384, modo demonstração (FN-14): abrir o programa com dados inventados, sem banco
- **Chefe**: backend
- **Data**: 2026-11-16 (começou em 10/11; parou no limite de uso e voltou hoje)
- **PR**: o desta branch (`claude/clever-lovelace-vpsyvg`)
- **Jeito**: com ajudantes

## O que cada agente fez
- `ajudante-rapido`: mapeou todas as chamadas de rede de `src/` (funções, rpc, login, storage, CEP, Diagnóstico).
- `ajudante-medio` (dados): levou os dados de `site/ferramentas/dados-demo.mjs` pra `src/demo/dados.ts`, escreveu o "responder como o Supabase" (`src/demo/supabaseFalso.ts`, com gravação na memória) e o `fetch` de mentira (`src/demo/fetchDemo.ts`); o site passou a usar a cópia única (`runnerImport` do Vite).
- `ajudante-medio` (entrada): a palavra `demo` em `src/lib/conexao.ts` e na tela de conexão, o cliente de demonstração em `src/lib/supabase.ts`, a faixa (`src/demo/FaixaDemonstracao.tsx`) e o `dev:demo`.
- `ajudante-forte` (prova): a seção nova do `scripts/testar-electron.mjs` (nada sai, CSP igual, `conexao.json` intacto) e as fotos.
- `ajudante-forte` (revisão final): a primeira parou no limite de uso; a segunda, sobre o diff já junto com a `main`, achou 3 pontos "deveria" e 7 opcionais.
- Sessão mãe: plano, junção, a função `cliente_e_veiculo_da_ordem` nos dados (o "Confirmar emissão" saía calado), a junção com a `main` (visual novo #990 e rede #374, 4 conflitos), a faixa abaixo da barra própria da janela, os consertos da revisão e os textos.

## Modelos usados
- mapear a rede: rápido (haiku), esforço baixo
- dados e fetch de mentira: médio (sonnet), esforço médio
- entrada, saída e faixa: médio (sonnet), esforço médio
- prova no `test:electron`: forte (opus), esforço alto
- revisão final: forte (opus), esforço alto; a primeira tentativa caiu no limite de 5 horas e foi refeita do zero depois (o diff tinha mudado com a junção)

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (a sessão não tem acesso ao próprio consumo).
- **Ajudantes**: 6 chamadas; tokens pelo aviso de término: rápido ~68 mil, médio ~112 mil e ~104 mil, forte ~174 mil (prova) e ~168 mil (revisão); a revisão que caiu não informou.
- **Sessões filhas**: nenhuma
- **`/goal`**: não sei se foi ligado (não mostrei o texto pronto na primeira mensagem; esqueci o passo do ritual).

## O que testei e VI reprovar
- `fetchDemo.test.ts`: escrito antes, reprovou por módulo inexistente; depois, trocando o total do `content-range`, a frase da nota e o filtro do PATCH/DELETE, os testes certos reprovaram.
- `cliente_e_veiculo_da_ordem`: teste novo reprovou ("expected undefined to be 'c3'") antes da função existir.
- Gravação com filtro desconhecido e `not.in`: os dois testes novos reprovaram antes do conserto.
- Cadastrar operador na demonstração (autorizado pela Sofia no PR, 16/11, opção B): os testes novos de `operadores.test.ts` (usa o `fetchDemo`) e de `fetchDemo.test.ts` (o `signUp`) reprovaram antes do conserto; o `test:electron` continuou com zero pedidos.
- `conexao.test.ts`: os 7 testes da palavra `demo` reprovaram antes do código; tirar a limpeza do sinal fez reprovar "salvar tira da demonstração"; o teste novo "o sinal já saiu quando o programa grava" reprovou com o código antigo.
- `test:electron`, seção 10: com o cliente de demonstração apontando pra `xxxx.supabase.co` sem o `fetchDemo`, reprovou listando os pedidos que saíram; só sem o `fetchDemo` (endereço `.invalid`), reprovou pelo recado da CSP; mudando a CSP e o `conexao.json` no meio, as duas checagens reprovaram.
- Depois da junção com a `main`, o passo da nota reprovou (o "Fechamento" foi pro menu "Mais ações"); acertado, 56 checagens verdes.

## O que passou sem eu ter visto reprovar
- "nenhum pedido sai pra Focus NFe": a tela nunca fala direto com a Focus, não houve quebra honesta que mandasse pedido pra lá.
- "volta pra tela de antes" num computador com banco salvo (cai no login): escrita, mas só rodou sem `conexao.json`.
- "vale até fechar o programa": não há teste que feche e reabra o Electron.
- A faixa sem a barra própria da janela (navegador, `dev:demo`): só a regra de CSS, sem foto.

## O que ficou de fora
- CEP (ViaCEP) e o Diagnóstico (GitHub e "saúde" do banco) continuam saindo pra rede na demonstração: não passam pelo cliente do Supabase.
- O banco de mentira ainda ignora na LEITURA filtros que não entende (`gte`, `ilike`, `or`) e o `.single()` sem linha não dá erro: igual a antes, pra não mudar as imagens do site.
- Nos dados inventados, a configuração fiscal está em "produção" (o aviso "esta nota será emitida de verdade" aparece embaixo do "não sai nota") e o lucro do mês sai negativo. Mexer muda as imagens do site.

## O que depende de alguém
- **A Sofia**: revisar o PR; no fim de semana, o "depois de publicar" da issue (o `.exe` num computador sem banco).
- **Gustavo, no PC**: o "No PC de quem fez" da issue (`npm run dev:demo`, andar pelas telas, salvar uma OS, tentar nota, sair, e o `npm run dev` normal).
- Nenhuma migration.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: dividir em ajudantes com arquivos separados, rodando ao mesmo tempo; exigir ver cada teste reprovar.
- **Onde eu errei ou tive que adivinhar**: esqueci de montar o `/goal` na primeira mensagem; o gancho que pede commit ao fim de cada turno me fez salvar trabalho pela metade dos ajudantes no meio do caminho (sem dano, mas commits "em andamento").
- **O que faltou na skill**: a skill é de backend, e esta tarefa era quase toda de programa (tela, Electron); e não diz o que fazer quando a `main` anda muito durante uma pausa por limite (aqui, 73 commits e 4 conflitos).
- **Sugestão de ajuste (opcional)**: no ritual, um passo "ao voltar de uma pausa longa, juntar a `main` antes de qualquer outra coisa e rodar o `test:electron` de novo".
