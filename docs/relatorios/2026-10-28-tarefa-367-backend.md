# Relatório: tarefa #367, chefe backend

- **Tarefa**: #367, ordens de serviço só pra quem tem o módulo (TR-04.1, lote 6)
- **Chefe**: backend
- **Data**: 2026-10-28
- **PR**: na descrição do PR da branch `claude/gracious-einstein-gmm9k0`
- **Jeito**: com ajudantes

## O que cada agente fez
- **Sessão mãe**: leu a issue, escreveu o plano (o contrato entre banco e telas: as 5 janelas e as
  colunas de cada uma), postou na issue as duas perguntas que a issue mandava fazer (ficha do
  veículo e "clientes que sumiram") e seguiu a recomendação, escreveu `docs/banco.md` e o item 1 de
  `docs/licoes.md`, avisou a Sofia da ordem certa de publicar, e desfez a ordenação dos itens pelo
  `id` que a rodada de correções tinha posto (o `id` é aleatório: a ficha sairia embaralhada).
- **Explorador** (rápido): mapeou toda leitura e gravação de `ordens_servico` e
  `ordens_servico_itens`, as funções e policies do banco que leem OS, e achou o ramo de Contas a
  Receber do Caixa que quebraria em silêncio.
- **Escritor de migration** (forte): `0075_os_janelas.sql` (5 views e 2 funções), `0076` (4
  policies por tabela), `testar-os-permissao.sql` (15 perfis), a matriz de RLS, a versão do esquema,
  e os tempos num PostgREST 12 local.
- **Telas** (médio): Caixa, Início, Garantias, Comissões, Notas, ficha do veículo e "clientes que
  sumiram" lendo pelas janelas, com tipos estreitos; o Início sem os blocos de OS; o banco falso
  das telas geradas.
- **Revisor de segurança** (forte, esforço alto): achou que as janelas entregavam orçamento e
  recusado (que nenhuma dessas telas mostra); registrou que Relações lê mais do que a tela mostra.
- **Revisor final** (forte, esforço alto): achou a ordem de subir errada (este código na 0.9.55
  travaria as lojas), um `cast` que escondia campos faltando, e três comentários fora do lugar.
- **Correções** (forte, esforço alto): consertou os achados das duas revisões.

## Modelos usados
- Plano e junção: sessão mãe, forte (`claude-opus-5-5`), esforço médio
- Mapear: rápido (agente `ajudante-rapido`), esforço do agente
- Migrations e teste SQL: forte (`ajudante-forte`), esforço alto
- Telas: médio (`ajudante-medio`), esforço do agente
- Revisão de segurança, revisão final e correções: forte (`ajudante-forte`), esforço alto
- Nenhuma troca de modelo por falha.

## Sessões filhas
- nenhuma (a issue diz `Sessões filhas: não`)

## Gasto
- **Uso da sessão mãe**: não medido (sem acesso ao arquivo de uso nesta sessão).
- **Ajudantes** (via aviso de fim de cada um, tokens totais): explorador ~204 mil; telas ~191 mil;
  migrations ~265 mil; segurança ~163 mil; revisão final ~174 mil; correções ~179 mil.
- **Sessões filhas**: nenhuma
- **`/goal`**: não sei se foi ligado (mostrei o texto ao Gustavo na primeira mensagem).

## O que testei e VI reprovar
- **Banco** (`testar-os-permissao.sql`, `npm run test:sql`, `npm run test:rls` no Postgres local):
  28 mutações do escritor de migration, todas vermelhas (filtro de módulo tirado de cada janela;
  filtro de loja; coluna proibida e custo dentro dos itens; `revoke` trocado; sem `faturada` nas
  comissões; sem `security_barrier`; o `exists` de volta no ramo de Contas a Receber; funções sem
  conferir a loja; leitura de OS aberta; Relações sem leitura ou com escrita; inserção sem módulo;
  sem policy de exclusão; a `for all` antiga sobrando). Na matriz, a janela de comissões sem filtro
  deu 1 linha pro perfil de caixa e ficou vermelha.
- Na rodada de correções: o orçamento, o recusado e a peça de OS sem fechamento aparecendo nas
  janelas (C1, C3, C4, C5, D1b, D1c, D1d vermelhos antes do conserto); o TypeScript reclamando
  quando o `cast` saiu (prova que agora ele pega item faltando).
- **Programa** (vitest): `cliente_nome` sem mapear no Caixa; o Início pedindo OS sem o módulo; a
  regra do Início aceitando "clientes"; coluna trocada na leitura de comissões; garantia com prazo
  zerado; ficha sem montar a peça; Notas lendo a tabela; "sumidos" sem o veículo; e (revisor
  final) os blocos de OS do Início pra todo mundo.

## O que passou sem eu ter visto reprovar
- O teste de "mesmos números" (`src/lib/janelasDeOS.test.ts`: Caixa, lucro por lançamento com
  pagamento dividido, comissões e "sumidos" dando o mesmo resultado com a janela e com a OS
  inteira) só foi visto reprovar pela mutação do `cliente_nome`, não por uma conta errada.
- O embutido `notas_fiscais_arquivos → ordens_servico_notas` não foi testado num PostgREST (o do
  Caixa foi, e é o mesmo mecanismo).
- `npm run contraste:telas` e `npm run largura:telas` (65 telas, 5 larguras): sem reprovação nova.

## O que ficou de fora
- **Relações lê `ordens_servico` inteira**, inclusive textos que a tela não mostra (o defeito
  descrito, o motivo da recusa). Coerente com o que ela já vê (o custo de tudo), mas é um desvio da
  regra "só o que a tela mostra"; a saída seria uma janela própria. Para a Sofia decidir.
- **Índice em `ordens_servico.veiculo_id`** (a ficha filtra por ele): não existia antes, não mexi.
- **Caixa recebe também OS em andamento sem lançamento** (sem custo nem descrição, só número,
  cliente e valores). Cortar pelas OS que têm lançamento pede um índice novo e medir; ficou de fora.

## O que depende de alguém
- **Sofia, decidir** (comentários na issue): a ficha do veículo e "clientes que sumiram" continuam
  mostrando o que mostram hoje pra quem tem só Clientes (o que fiz), ou cortam pra número, data,
  valor e cliente; e se Relações fica lendo tudo.
- **Sofia, a ordem de subir** (achado da revisão final): **este PR só entra na `main` depois do
  Release da 0.9.55.** A `0074` espera a 0.9.55 nos computadores e o botão segura as migrations
  seguintes junto; a 0.9.55 com este código precisaria da `0075`, e as lojas travariam. Ordem:
  publicar e liberar a 0.9.55 (sem este código) → `0074` e **`0075`** pelo botão → publicar e
  liberar a 0.9.56 → **`0076`** (declara `-- versao-minima-do-programa: 0.9.56`).
- **Gustavo, no PC** (com as migrations aplicadas no Supabase de teste): o "Pronto quando no PC".

## Onde parou
Terminei.

## Como eu agi
- **O que a skill me ajudou a fazer**: o padrão "duas migrations" e as lições do lote 5 (mapear
  quem grava, não só quem lê) deram o plano em uma rodada; mandar ver o teste reprovar fez a rodada
  de correções escrever o caso do orçamento antes do conserto.
- **Onde eu errei ou tive que adivinhar**: escrevi na issue que a 0076 poderia pedir a 0.9.55 se o
  código saísse nela; estava errado (a revisão final achou) e corrigi na issue. Pedi ao ajudante
  uma "ordem estável" pros itens sem conferir que o `id` é UUID; ele ordenou pelo `id` e a ficha
  sairia embaralhada. Desfiz.
- **O que faltou na skill**: um passo "a migration nova depende de uma `versao-minima` que ainda não
  saiu?" — o botão segura as seguintes junto, e isso decide em qual versão o código pode sair.
- **Sugestão de ajuste (opcional)**: na `chefe-backend`, seção 3: "Antes de escolher a
  `versao-minima-do-programa`, conferir a última migration que já espera computadores
  (`MIGRATIONS_QUE_ESPERAM_OS_COMPUTADORES`) e se a versão dela já foi publicada".
