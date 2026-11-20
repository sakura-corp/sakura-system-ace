# Relatório: tarefa #1135, chefe frontend

- **Tarefa**: #1135, visual leva 8, peças comuns (4/5): molde de lista
- **Chefe**: frontend
- **Data**: 2026-11-18
- **PR**: ver a descrição do PR desta branch (`claude/tarefa-1135-molde-lista`)
- **Jeito**: com ajudantes

## O que cada agente fez
- **ajudante-forte (revisor)**: leu o diff do zero, sem o meu raciocínio, e devolveu os achados
  (seção "Revisão" abaixo).
- Explorador e construtor da tabela da issue: não chamei. A busca de uma lista de exemplo foi ler a
  `ClientesPage` e as peças (`Chips`, `AcoesDaLinha`, `Botao`, `Aviso`); o molde e os testes foram
  escritos na sessão mãe, com os testes primeiro. Chamar ajudante ali gastaria mais cota do que
  fazer.

## Modelos usados
- Planejar, escrever o molde e os testes: sessão mãe, forte (Opus 5.5), esforço baixo.
- Revisão final: ajudante-forte (Opus 5.5), esforço alto. Nenhuma troca por falha.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (o arquivo da conversa não foi lido; a pessoa pode colar o `/usage`).
- **Ajudantes**: 1 (ajudante-forte, esforço alto); tokens: ver o aviso de fim, se a pessoa quiser.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não sei se foi ligado (o texto foi mostrado à pessoa no começo).

## Revisão (ajudante-forte, do zero) e o que mudou
Cada achado foi conferido no código antes de mexer; todos procediam.
- **Defeitos corrigidos** (cada um ganhou teste, visto reprovar com o conserto desfeito):
  1. "Limpar a busca e os filtros" só apagava a busca, e "Limpar os filtros" sem `aoLimparFiltros`
     não fazia nada. Agora o botão apaga a busca **e** chama `aoLimparFiltros`, e o tipo não deixa
     a tela ligar `filtroAtivo` sem passar `aoLimparFiltros` (teste de compilação).
  2. O foco se perdia quando "Limpar", "Ver todos" ou "Tentar de novo" sumiam depois do clique.
     Agora vai pro campo de busca, pra lista ou pro cartão da lista.
  3. Recarregar uma lista que já tinha linhas trocava tudo pelo esqueleto (piscava a cada letra
     numa busca no banco). Agora as linhas ficam, só marcadas como "ocupada"; o esqueleto é só da
     primeira carga.
- **Sugestões aceitas**: o "Ver todos" volta a cortar quando a busca ou o filtro mudam; um aviso
  único pro leitor de tela ("Carregando…", "1 encontrado.", "Nada encontrado."); nome que não é
  texto exige a `descricao` (teste de compilação); erro sem "Tentar de novo" diz o que fazer;
  `Fragment` com a chave no lugar do componente a mais.
- **Ficou como aviso**: o "⋯" com 40 px depende de a `AcoesDaLinha` continuar usando
  `aria-haspopup="menu"`. O revisor compilou o Tailwind e confirmou que o seletor vence o
  `h-8 w-8`; o ambiente de teste não calcula CSS, então a prova é a medida na tela renderizada.
- **Testes que o revisor apontou como fracos**: o do "⋯" agora passa `aoAbrir` e prova que não
  abre a linha; entrou o "nunca botão dentro de botão"; o Esc prova as duas metades (com texto não
  fecha a janela em volta; vazio segue). O "a tela não pula" continua conferindo só as linhas
  reservadas e a altura mínima pela classe (o jsdom não mede altura); a medida real (64 px, a
  mesma da linha de verdade) foi tirada na tela renderizada.

## Revisão do Tiago no PR (20/11) e o que mudou
- **"Ver todos" não voltava a cortar ao trocar um filtro ligado por outro** (Matão → Araraquara):
  o molde guardava só *se* havia filtro. Agora guarda a busca e **quais** itens aparecem (as
  chaves); recarregar com os mesmos itens não fecha. Teste novo visto reprovar antes (8 linhas em
  vez de 5) e outro pra recarga.
- **`outline-none` na lista e no cartão** apagava o anel de foco do programa: saiu do cartão; na
  lista, o anel vem pra dentro (`-outline-offset-4`), porque o cartão corta o que passa da borda.
  Visto na tela renderizada: Enter no "Ver todos" → o anel aparece inteiro em volta da lista.
- A `main` (com o #1139) foi trazida pra branch.

## O que testei e VI reprovar
- **Sem as peças**: os dois arquivos de teste reprovam inteiros.
- **Quebrando de propósito, um pedaço por vez** (cada um reprovou o teste dele):
  - esqueleto aparecendo na hora (sem a espera de 0,4 s);
  - sem o `aria-busy` no carregando;
  - sem o vazio da busca (caía no "Nenhum cliente cadastrado"): 2 testes;
  - sem o corte do `limite` ("Ver todos"): 2 testes;
  - sem o Esc que apaga a busca;
  - a ação da linha sem o nome do item pro leitor de tela: 3 testes;
  - o nome sem virar botão com `aoAbrir`.
- **Não reprovou**: forçar o "⋯" a aparecer sem itens. A própria `AcoesDaLinha` já não desenha o
  botão quando o menu está vazio; a proteção está lá, e o teste continua valendo pra ela.

## O que passou sem eu ter visto reprovar
- `typecheck`; `lint` (sem erro; só o aviso antigo do `AuthContext`); `contraste`; `test:fusos`.
- **Medidas na tela renderizada** (1366 × 700): busca 48 px de altura; chips, "Receber", "⋯" e o
  nome clicável com 40 px ou mais; linha de 64 px; nada rola de lado em 1366 nem em 1024.
- **Fotos** (claro e escuro) em `docs/relatorios/fotos/2026-11-18-tarefa-1135/`: pronta com o
  "Ver todos" e o menu "⋯" aberto ("Apagar" em vermelho, no fim), pronta em 1024, vazia, busca sem
  resultado, carregando e erro.

## O que ficou de fora
- **`contraste:telas` e `largura:telas` no meu PC**: não sobem no Windows (o script chama o `npx`
  de um jeito que só funciona no Linux: `spawn npx ENOENT`). Rodam no CI do PR. Nenhuma tela usa o
  molde ainda, então a prova do molde são as medidas e as fotos acima.
- **A cena do molde no catálogo das telas**: é da parte 5/5 (#1136). As fotos foram tiradas numa
  página de rascunho, fora do Git, já apagada.
- **Trocar as telas pro molde**: cada tarefa da trilha (a issue manda não fazer aqui).

## O que depende de alguém
- **O #1139 (Chips, da #1133, do Gusta)**: esta branch nasceu em cima dele, porque o molde usa os
  `Chips`. O PR desta tarefa mostra os commits dele também até o #1139 entrar na `main`; depois, é
  só atualizar a branch.
- **A Sofia**: revisar e mesclar (depois do #1139).
- **Teste no PC** (`docs/equipe.md`, "Testar no seu computador o que a sessão da nuvem fez"): caso
  A, só `npx vitest run src/components/molde` na branch `claude/tarefa-1135-molde-lista`. Ver a
  peça no catálogo fica pra quando a #1136 puser a cena.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o ritual deixou claro que o PR é um só, que a revisão final
  vai pro forte e que o teste só prova o que se viu reprovar (quebrei 8 coisas de propósito).
- **Onde eu errei ou tive que adivinhar**: um teste meu procurava as linhas do esqueleto pelo papel
  de item de lista, mas elas ficam escondidas do leitor de tela de propósito; o teste foi corrigido
  pra contar pelo HTML. O "Ver todos" foi lido como "mostrar só o começo e abrir o resto"; ficou
  com as duas saídas (abrir ali ou a tela decidir, com `aoVerTodos`).
- **O que faltou na skill**: o mesmo que a #1133 apontou: um jeito pronto de fotografar UMA peça
  nova antes de ela ter cena no catálogo. E, no Windows, as varreduras `contraste:telas` e
  `largura:telas` não sobem (`spawn npx` sem `shell`).
- **Sugestão de ajuste (opcional)**: no `site/ferramentas/servidor-telas.mjs`, chamar o `npx` com
  `shell: true` no Windows (ou `npx.cmd`), pra equipe rodar as varreduras no PC. Fica como proposta
  pra Sofia; o arquivo não é desta tarefa.
