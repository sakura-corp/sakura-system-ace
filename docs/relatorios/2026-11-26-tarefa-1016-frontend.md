# Relatório: tarefa #1016, chefe frontend

- **Tarefa**: #1016, login sem acesso ao Início abre em "sem permissão" em vez do primeiro módulo dele
- **Chefe**: frontend
- **Data**: 2026-11-26
- **PR**: (o link está na descrição do PR desta branch)
- **Jeito**: com ajudantes

## O diagnóstico (qual caminho dava o defeito)
- **Depois de entrar, com a tela do login anterior ainda no endereço**: é o único caminho que dá
  "sem permissão". O programa guarda a última tela no endereço (HashRouter); quem sai e entra com
  outro login (ou depois do "Sair" que recarrega a janela) cai nela. Um login só de Relações que
  entra onde estava o Caixa vê "Você não tem permissão". **Esse caminho é consertado pelo PR #1206
  (tarefa #1191, decisão 3)**, que faz o login terminar sempre no Início (`/`). O teste "login só
  de Relações, numa tela do Caixa" deste PR mostra o estado do defeito (e garante que o Caixa não
  aparece); o teste do #1206 prova a ida pro Início.
- **Botão de voltar ao Início** (`BotaoVoltar`, `navigate("/")`): **não** dá o defeito; o `/` já
  desvia. Agora tem teste.
- **Troca de loja**: **não** dá o defeito, e não tem como dar: as permissões são do login
  (`operador.permissoes`), não da loja. O caso do "Pronto quando" "Caixa numa loja e só Clientes
  em outra" não existe no programa de hoje.
- **Permissões ainda carregando**: **não** dá o defeito: o `AuthContext` segura "Carregando..." até
  o perfil chegar, e a tela só monta depois.

## O que cada agente fez
- **ajudante-forte (revisor)**: revisão final do diff, do zero, com olhar adversarial (resultado abaixo).
- As outras etapas (função, testes, conserto) foram pequenas e a sessão mãe fez direto, pra não gastar cota.

## Modelos usados
- Diagnóstico, função, testes e conserto: sessão mãe (forte), esforço médio.
- Revisão final: ajudante-forte, esforço alto.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: não medido (a sessão não lê o próprio consumo).
- **Ajudantes**: 1 (forte, esforço alto); tokens não medidos.
- **Sessões filhas**: nenhuma
- **`/goal`**: não usei (a tarefa coube em poucos turnos).

## O que testei e VI reprovar
- **Ordem do menu**: troquei a função pra ignorar os grupos do menu; o teste "segue a ordem do
  menu" reprovou.
- **Mensagem de quem não tem módulo**: voltei o texto pra "Fale com o administrador."; os 2 testes
  da mensagem reprovaram.
- **Ir pro primeiro módulo**: troquei o desvio da `PaginaInicial` pela mensagem; reprovaram "abre
  em Relações" e "o botão do Início volta pro primeiro módulo".
- Antes do conserto, os testes novos reprovaram (a função não existia, a `PaginaInicial` não era
  exportada, o texto era o antigo).

## O que passou sem eu ter visto reprovar
- "Login só de Relações numa tela do Caixa não mostra o Caixa" e "perfil não carregado não mostra
  a tela": já valiam antes (o `PermissaoRoute` já barrava); ficam de guarda.
- `typecheck`, `lint` (só os 3 avisos que já existiam), `contraste`, `test:fusos` (a suíte inteira,
  nos dois fusos).

## O que ficou de fora
- **O caminho "depois de entrar"**: é do PR #1206 (#1191). Este PR não repete o conserto, pra não
  ter duas regras no mesmo lugar. **Mesclar o #1206 antes deste** (ou junto): só com os dois a
  #1016 fica fechada de verdade.
- **Ordem**: a issue diz "primeiro módulo do menu (a ordem de `MODULOS`)", mas as duas ordens
  diferem: no menu, Garantias (Atendimento) vem antes de Relações (Gestão); em `MODULOS`, depois.
  Segui **a ordem que a pessoa vê no menu** (grupo por grupo). Se a Sofia preferir a ordem crua de
  `MODULOS`, é uma linha na função e um teste.

## O que depende de alguém
- **Sofia**: revisar e mesclar (depois do #1206); confirmar a escolha da ordem do menu.
- **Gustavo, no PC** (caso B, abrir o programa; `docs/equipe.md`, "Testar no seu computador o que
  a sessão da nuvem fez" e "Teste de permissão"), na branch deste PR **com o #1206 já na `main`**:
  1. login só com Relações: entrar abre em Relações; o botão da casinha volta pra Relações;
  2. login sem nenhum módulo: aparece "Nenhum módulo liberado... Fale com quem administra a loja";
  3. login de administrador: abre no Início, como antes.
  O caso "Caixa numa loja e Clientes em outra" não dá pra montar (permissão é do login).

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: começar pelo diagnóstico com teste, e quebrar de propósito
  cada parte do conserto.
- **Onde eu errei ou tive que adivinhar**: a ordem "do menu" × a ordem de `MODULOS` (escolhi a do
  menu e deixei escrito); e a branch: o ritual pede `claude/tarefa-N-<curto>`, mas a sessão já
  nasceu numa branch fixa e só pode subir nela.
- **O que faltou na skill**: dizer o que fazer quando outra tarefa aberta (aqui a #1191) conserta
  parte do mesmo defeito: esperar, juntar ou separar.
- **Sugestão de ajuste (opcional)**: no ritual, "branch da tarefa" aceitar a branch que a sessão
  recebeu do ambiente quando ela é fixa.
