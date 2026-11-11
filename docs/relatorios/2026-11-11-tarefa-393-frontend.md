# Relatório: tarefa #393, chefe frontend

- **Tarefa**: #393, Ficha do cliente: tudo que ele comprou, pagou e deve
- **Chefe**: frontend
- **Data**: 2026-11-11
- **PR**: o PR da branch `claude/tarefa-393-frontend-jgpyhn`
- **Jeito**: com ajudantes

## O que cada agente fez
- `ajudante-forte` (revisão final): leu o diff do zero e conferiu as colunas nas migrations 0036, 0068 e 0075. Não achou nada grave e deu 5 sugestões pequenas. Conferi cada uma no código e consertei todas, com teste: a placa vem pela `veiculos_janela`, a forma de pagamento é traduzida, "—" no lugar de "À vista" quando a forma é desconhecida, a ficha é limpa ao recarregar e as contas recebidas ficam na ordem pelo dia local.
- As etapas "achar os arquivos", "as contas" e "a leitura" a sessão mãe fez sozinha, sem ajudante. O contexto já estava aberto, e chamar outro ajudante gastaria cota relendo os mesmos arquivos. A issue pedia um ajudante para cada uma; o desvio fica anotado aqui.

## Modelos usados
- Planejar, as contas, a leitura, a tela e os atalhos: sessão mãe, forte (Opus 5.5), esforço médio.
- Revisão final: `ajudante-forte` (Opus 5.5), esforço alto.

## Sessões filhas
- nenhuma

## Gasto
- **Uso da sessão mãe**: por arquivo, 76 respostas. Entrada: 147. Cache criado: 210.006. Cache lido: 14.086.517. Saída: 62.509. O processo da sessão reiniciou no meio, e o arquivo pode não ter a parte de antes. Medido antes do commit final, do PR e deste relatório.
- **Ajudantes**: 1 (`ajudante-forte`, esforço alto). Pelo aviso: 137.281 tokens. Pelo arquivo, 27 respostas: cache criado 133.878, cache lido 2.916.284, saída 16.532.
- **Sessões filhas**: nenhuma.
- **`/goal`**: não sei se foi ligado (mostrei o texto na primeira mensagem).

## O que testei e VI reprovar
- **As contas** (`src/schemas/fichaCliente.test.ts`). Quebrei de propósito, uma regra por vez, e o teste reprovou nas três:
  - contar orçamento como compra ou visita;
  - contar conta recebida como dívida;
  - dar como atrasada a conta que vence hoje.
- **A leitura** (`src/lib/fichaCliente.test.ts`): tirei a trava do módulo Contas a Receber, e 3 testes reprovaram.
- **Os consertos da revisão**: com o código de antes, os 3 testes novos reprovaram (a placa pela `veiculos_janela`, a tradução da forma, e "—" em vez de "À vista"). Com o conserto, passaram.
- **O começo**: o teste das contas reprovou antes de o arquivo existir. E 2 casos de "dia no fuso local" reprovaram na rodada em UTC até eu fixar o fuso no próprio teste, como em `comissoes.test.ts`.

## O que passou sem eu ter visto reprovar
- **Teste da tela** (`FichaClientePage.test.tsx`):
  - sem Contas a Receber, a leitura recebe `contasReceber: false` e aparece "—" com a frase, nunca R$ 0,00;
  - sem Ordens de Serviço, "Como pagou" mostra "—";
  - "Abrir" só aparece em OS da loja ativa;
  - o nome do cliente abre a ficha sem disparar o clique da linha;
  - o "Consumidor" não vira atalho.
- **As checagens do projeto**, todas verdes: `typecheck`, `lint`, `test:fusos` (1818 testes nos dois fusos), `contraste`, `contraste:telas` e `largura:telas`. A ficha entrou como cena nova e foi medida em 1024, 1280, 1366, 1536 e 1600.

## O que ficou de fora
- **"Voltar" da OS pra ficha.** No "Pronto quando no PC", depois de abrir uma OS pela ficha, o Voltar deveria trazer de volta pra ficha. Hoje ele leva à lista de OS, igual na ficha do veículo. Pra voltar à ficha, é preciso mexer em `src/pages/ordens-servico/OrdensServicoPage.tsx`, que está fora da lista de arquivos da issue. Pela regra da issue, não mexi, e a pergunta à Sofia está no PR.
- **`docs/modulos.md`** não ganhou a linha da tela nova: também está fora da lista. Se a Sofia quiser, entra junto com o item acima.
- **Arquivos fora da lista que mexi**, só de teste ou de prova:
  - `site/ferramentas/cenas.mjs`, com a cena nova: sem ela, o `contraste:telas` e o `largura:telas` nem olhariam a tela, e o "Pronto quando" pede os dois;
  - as fotos em `docs/relatorios/fotos-393/`.
- **Indentação**: no `<td>` novo de Clientes e de Contas a Receber, a indentação ficou desalinhada. O lint passa. Não reformatei pra não sujar o diff.

## O que depende de alguém
- **A Sofia**:
  - decidir sobre o "Voltar" (acima);
  - decidir se o "Total comprado" deve ficar escondido de quem não tem Caixa ou Relações. Na lista de clientes sumidos, o "total gasto" fica escondido; na ficha do veículo e nesta, aparece pra quem tem Clientes ou OS, como a issue pede.
- **Tiago, no PC**: **feito em 11/11/2026**, no Supabase de teste, com `npm run dev` na branch `claude/tarefa-393-frontend-jgpyhn` (resultado na seção "Teste no PC", abaixo).
- **Contas a Receber e a ficha mostram vencimentos diferentes por enquanto**: Contas a Receber ainda mostra o vencimento um dia antes, no Brasil, e a ficha mostra o dia certo. Quem conserta é a #1005.

## Teste no PC (Tiago, 11/11/2026, Supabase de teste)
- **Carlos Eduardo Lima**, aberto pelo nome em Clientes:
  - Deve: R$ 394,80 (R$ 314,80 da OS 4, **Atrasada**, mais R$ 80,00 **Pendente**);
  - Total comprado: R$ 2.174,80 (OS 3, R$ 1.860,00, cartão de crédito em 3x; OS 4, R$ 314,80, dinheiro à vista).
- **Os totais batem com as listas**: em Ordens de Serviço, a OS 3 é R$ 1.860,00 e a OS 4 é R$ 314,80; em Contas a Receber, as pendentes do Carlos somam R$ 394,80.
- **Atalhos**:
  - o nome em Contas a Receber abre a ficha, e não a OS da linha; a setinha volta pra Contas a Receber;
  - o "Abrir" da ficha abre a OS 5, e o nome do cliente dentro da OS volta pra ficha.
- **Transportes Exemplo Ltda**: a conta da OS 5 aparece **Atrasada**, com vencimento em 08/11/2026. A issue esperava "pendente, não atrasada", mas o vencimento já passou (hoje é 11/11): o certo agora é atrasada. Contas a Receber mostra 07/11 e "Vencida", um dia antes, que é o defeito da #1005.
- **Login só com Clientes**: "—" e a frase em Deve, O que deve e Como pagou, **nunca R$ 0,00**; as OS 3 e 4 aparecem, sem o "Abrir".
- **Login só com Contas a Receber**: em Contas a Receber, os nomes aparecem como texto, sem atalho.
- **Visto de passagem, fora desta tarefa**: um login sem o módulo Início cai, logo depois de entrar, na tela "Você não tem permissão para acessar este módulo". Já era assim antes.

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**:
  - as regras duras (dinheiro em `src/schemas/`, `hojeLocal`/`diaLocal`, `mensagemDeErro`, `min-w-0`) guiaram cada arquivo;
  - "teste só prova o que se viu reprovar" fez eu quebrar cada regra de propósito.
- **Onde eu errei ou tive que adivinhar**:
  - o `LinkCliente` lia o login sozinho, e isso quebrou 20 testes do formulário de OS, que montam a tela sem login. Passei a permissão por propriedade;
  - um formatador mexeu em duas telas inteiras, e desfiz;
  - adivinhei que a cena das varreduras podia entrar mesmo fora da lista de arquivos.
- **O que faltou na skill**:
  - não diz o que fazer quando o "Pronto quando" exige mexer num arquivo fora da lista (o "Voltar");
  - não diz que tela nova precisa de cena em `site/ferramentas/cenas.mjs` pra entrar no `contraste:telas` e no `largura:telas`.
- **Sugestão de ajuste (opcional)**:
  - na seção 5 da skill, "tela nova: acrescentar a cena em `site/ferramentas/cenas.mjs` (arquivo de teste, vale mesmo fora da lista da issue)";
  - no modelo de tarefa, pôr na lista de arquivos o `cenas.mjs` sempre que a tarefa criar uma tela.
