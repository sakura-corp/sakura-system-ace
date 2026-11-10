# Relatório: tarefa #373, chefe frontend

- **Tarefa**: #373, Listas longas, parte 1: paginar e ordenar no servidor, começando por Clientes
- **Chefe**: frontend
- **Data**: 2026-11-10
- **PR**: (o link vai na descrição do PR)
- **Jeito**: com ajudantes

## O que cada agente fez
- Sessão mãe: planejou o gancho, escreveu o gancho, a consulta, a tela, os testes, a medição e a
  documentação (a tabela da issue dava isso a ajudantes médios; ver "Como eu agi").
- `ajudante-forte` (revisor): leu o diff do zero procurando escape da busca, resposta fora de ordem,
  ordem total e estado da tela. Achou 7 pontos; consertei 5 (recarregar com a página antiga depois de salvar/excluir, o "Mostrando" adiantado enquanto carrega, a busca sumindo ao apagar uma busca vazia, os números espalhados com letra no meio, o comentário errado da cidade em branco); o `*` virar curinga ficou anotado no código (só aumenta o resultado); o erro na primeira carga mostrar "Nenhum cliente" já era assim antes.

## Modelos usados
- Planejar e escrever tudo: sessão mãe, forte (Opus 5.5), esforço médio.
- Revisão final: forte (`ajudante-forte`), esforço alto.
- Nenhuma troca por falha de modelo.

## Sessões filhas
- Nenhuma (a issue diz `Sessões filhas: não`).

## Gasto
- **Uso da sessão mãe**: não medido: sessão no PC (Windows) sem Python para o comando do README.
- **Ajudantes**: 1 (`ajudante-forte`, esforço alto). Pelo aviso de fim: ~108 mil tokens, 7 ferramentas.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não sei se foi ligado (o texto foi mostrado na primeira mensagem; a coordenadora confere).

## O que testei e VI reprovar
- **Ordem da tabela inteira**: fiz o gancho pedir sempre a ordem padrão e inverter só a página no
  computador. Reprovaram 3 testes do gancho (inclusive "Nome decrescente traz os últimos da tabela
  INTEIRA") e o mesmo teste na tela.
- **Busca no servidor**: fiz o gancho mandar a busca vazia pro banco. Reprovaram 5 testes (gancho e tela).
- **Resposta velha**: tirei o "só a mais nova grava". Reprovaram os 2 testes (lista e erro velhos).
- **Escape da busca**: tirei as aspas do PostgREST. Reprovaram 5 testes da consulta (`%`, `,`, parênteses, aspas, barra).
- **Consumidor**: tirei o `.neq` do Consumidor. Reprovou o teste dele.
- **Achados da revisão**: rodei os 5 testes novos contra o código de antes dos consertos: os 5 reprovaram (recarregar velho, "Mostrando" adiantado, busca sumindo, "Ana 123" e "999" espalhando).

## O que passou sem eu ter visto reprovar
- Ordem guardada por tela, lixo no `localStorage` e `localStorage` bloqueado; recarregar a página
  atual; voltar uma página quando a última ficou vazia; "Anterior/Próxima" e o "Mostrando X a Y de Z";
  excluir na página 2 recarrega a página 2; busca sem resultado; tela sem cliente; os 7 testes que já
  existiam do filtro "sumiram" (agora com a lista completa vindo à parte).
- `contraste:telas` e `largura:telas`: não rodaram no Windows (ver "Como eu agi"); quem prova é o CI do PR.
- `typecheck`, `lint` (só o aviso que já existia no `AuthContext`), `contraste`, `npm test` (1671
  testes) e `test:fusos` (só o `checar-segredos` estourou o tempo com a suíte inteira; sozinho passa,
  com e sem esta mudança).

## Medição (5.000 clientes, antes e depois)
Teste temporário (não entrou no PR), no jsdom, com a resposta do banco já pronta: mede só o
desenho da tela, sem a internet.
- Antes (lista inteira): ~4,8 s, 5.000 linhas desenhadas (3 rodadas: 4.828, 4.761, 4.728 ms).
- Depois (página de 50): ~0,1 s, 50 linhas (3 rodadas: 119, 86, 87 ms).
- `count: "exact"` ficou: com alguns milhares de clientes a contagem é barata; o `estimated` só
  faria sentido com centenas de milhares. Não medi no banco de verdade (não roda consulta em
  Supabase nenhum daqui).

## Fora da lista de arquivos da issue (pra Sofia decidir)
- `site/ferramentas/banco-falso.mjs`: 1 cabeçalho (`access-control-expose-headers: content-range`). O banco de mentira das varreduras não liberava o total pro navegador, a lista abria com total 0 e o `largura:telas` do CI reprovou em "Ver veículos" e "sumiram". Reproduzi aqui (as 3 cenas de Clientes falharam), com o cabeçalho passaram. O Lázaro autorizou mandar, marcado pra Sofia decidir.

## O que ficou de fora
- As outras listas (OS, Produtos, Movimentações, Notas, Auditoria): partes seguintes, como a issue manda.
- Busca sem acento ("joao" acha "João"): decisão da Sofia, fica pra quando ela sentir falta (precisa de migration).
- Virtualização: não precisou (a medição mostra a tela rápida só com a página).
- Teste de tela de "editar na página 2 e salvar fica na página 2": coberto pelo teste do gancho
  (recarregar mantém a página) e pelo de excluir na tela; o formulário inteiro não foi preenchido em teste.

## O que depende de alguém
- **Lázaro, no PC**: FEITO em 10/11, no Supabase de teste: ordem por Nome (e guardada ao fechar e abrir), busca por nome, telefone e CPF, salvar sem perder a ordem, "sumiram". Pulou a troca de página (o banco de teste tem 10 clientes; provada nos testes com 120).
- **Sofia**: revisar e mesclar o PR.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: a issue já tinha todas as decisões; o ritual de "ver
  reprovar" achou um teste de escape que estava fraco (só uma parte da quebra pegou o `%`).
- **Onde eu errei ou tive que adivinhar**: rodei o `prettier` sem o projeto ter configuração dele,
  e ele reformatou os arquivos inteiros; voltei e reapliquei só as mudanças. A busca de telefone e
  CPF "com ou sem pontuação" (algarismos espalhados no `ilike`) foi decisão minha, pra cumprir
  "buscar por um telefone" sem migration.
- **O que faltou na skill**: as varreduras `contraste:telas` e `largura:telas` não rodam no Windows
  (`spawn npx` sem `shell`); tentei com um ajuste temporário fora do projeto, mas travou sem abrir o navegador. Ficaram pro CI (Linux), que roda as duas.
- **Sugestão de ajuste (opcional)**: dizer na skill "não rode o prettier: o projeto não usa"; e
  consertar o `spawn` de `site/ferramentas/servidor-telas.mjs` pra Windows (tarefa à parte).
