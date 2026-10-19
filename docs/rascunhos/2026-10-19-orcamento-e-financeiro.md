# Rascunho: as tarefas do orçamento e do financeiro do painel (19/10/2026)

> Saiu da entrevista com a Sofia de 19/10 (decisões no fim deste arquivo). **Rascunho**: nada aqui
> vira issue antes do "pode criar" dela. Depois de criadas, este arquivo pode ser apagado.

## A ordem

1. **Painel**: a leva 2 inteira (#644 a #650, #547 a #549) **e o financeiro (tarefa A)**. Depois disso
   o painel para e o trabalho vai pro programa das lojas.
2. **Programa das lojas**, nesta ordem: **B** (aviso de peça parecida) → **C** (orçamento na OS, a #379
   reescrita) → **D** (peça avulsa no orçamento) → **E** (juntar peças repetidas).

A #379 virou quatro tarefas (B a E) porque juntas passariam de 30 h e mexeriam no banco, no estoque e
na nota de uma vez. Separadas, cada uma é testada e conferida sozinha, e o aviso de peça parecida (B)
já serve à peça avulsa (D) e à ferramenta de juntar (E).

| | Tarefa | Etiquetas | Depende de |
|---|---|---|---|
| S | Decisão: onde guardar o financeiro do painel | `sofia` | nada |
| A | Painel: o financeiro da Sakura | `chefe:backend` (+ `leva-2` quando ela entrar) | S |
| B | Aviso de peça parecida no cadastro | `chefe:frontend` | nada |
| C | Orçamento como etapa da OS (#379 reescrita) | `chefe:backend` | nada |
| D | Peça avulsa no orçamento | `chefe:backend` | C, B |
| E | Juntar peças repetidas | `chefe:backend` | B |

B a E ficam **sem leva** até a leva 2 do painel fechar (decidido em 19/10); aí entram na leva 3.

---

## S. Decisão: onde guardar o financeiro do painel (issue `sofia`)

**A pergunta**: o financeiro não pode morar no GitHub (é público). Onde guardar os lançamentos?

**As opções**
- **A) Cloudflare D1**: o banco de dados da própria Cloudflare, onde o painel já mora. Sem conta
  nova e sem chave nova (o worker já tem acesso), grátis no tamanho que a gente usa, com cópia de
  segurança automática dos últimos 30 dias. Contra: não tem as regras de acesso do Supabase (RLS);
  quem decide quem vê o quê é o worker, que já confere o login de cada um.
- **B) Um Supabase novo, só da Sakura**: igual ao das lojas, a equipe já conhece. Contra: mais um
  projeto pra cuidar, uma chave nova guardada no worker, e o plano grátis pausa o projeto depois de
  uma semana sem uso.

**Recomendação**: **A (D1)**. O painel inteiro fica num lugar só, e não tem chave nova pra vazar.

**Pronto quando**: a Sofia respondeu aqui e fechou como concluída.

---

## A. Painel: o financeiro da Sakura

```
Chefe: backend
Ajudantes: frontend (a página do Financeiro), seguranca (quem vê o quê, e que nada vaza pro GitHub), tester (conferir o Pronto quando)
Estimativa: 12 h
Depende de: #S
Sessões filhas: não
```

### Pra que serve
A Sakura passa a ter o dinheiro dela organizado no painel: o que entrou, o que saiu e o crescimento
mês a mês. A equipe acompanha o custo e o crescimento da empresa; só a Sofia vê o detalhe.

### Decisões já tomadas
- A Sofia **digita** as entradas e saídas (Sofia, 19/10). Puxar o extrato do banco sozinho fica pra
  depois: o banco da conta PJ é o da Contabilizei, que deve exportar extrato (a conferir quando
  chegar a hora).
- Os dados ficam no banco escolhido na issue S, **nunca no GitHub** (`docs/painel.md`, "O que é").
- **A equipe vê os totais e os gráficos**: quanto entrou no mês, quanto saiu por categoria e o
  crescimento mês a mês. **Só a Sofia vê cada lançamento**, inclusive o quanto cada loja paga e o
  que é dela e dos sócios (Sofia, 19/10). O corte é feito **no worker**: a equipe nunca recebe o
  lançamento, nem escondido na página.
- **Só a Sofia lança, edita e apaga.**
- O DRE (o item "DRE" da barra) não entra aqui: ele continua "em breve", agora dependendo desta tarefa.

### O que fazer
1. Criar o banco escolhido na issue S e a tabela de lançamentos (data, tipo entrada/saída, valor
   em centavos, categoria, descrição, quem lançou) e a de categorias (com as primeiras: mensalidade
   de loja, servidor, Claude, contabilidade, imposto, outros).
2. No worker: rotas pra listar, lançar, editar e apagar (só a Sofia) e pra os totais (todos que
   entraram no painel). Quem é "a Sofia" vem de uma variável do `wrangler.jsonc` com o login do
   GitHub, não de algo escrito no código.
3. A conta (totais do mês, por categoria, mês a mês) numa função pura em `painel/src/logica/`, com
   teste, valores sempre em centavos.
4. A página do Financeiro: os totais e o gráfico pra todo mundo; a lista e o formulário de lançar
   só pra Sofia. Tira o "em breve" do Financeiro em `navegacao.ts`.
5. Atualizar `docs/painel.md` (decisão do banco, como funciona o corte, Andamento).

### Arquivos
- `painel/wrangler.jsonc`: o banco e a variável de quem é dona do financeiro
- `painel/worker/financeiro.ts` (novo), `painel/worker/index.ts`: as rotas
- `painel/src/logica/financeiro.ts` (novo): a conta
- `painel/src/logica/navegacao.ts`: Financeiro sai do "em breve"; DRE passa a depender do Financeiro
- `painel/src/componentes/` (a página nova)
- `docs/painel.md`
Mexer fora desta lista: parar e perguntar à Sofia.

### Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Achar os arquivos | ajudante explorador | rápido | só lê |
| Banco, rotas e o corte de quem vê o quê | ajudante | forte | dinheiro e segurança |
| A conta dos totais (com teste) | ajudante | forte | dinheiro |
| A página | ajudante | médio | plano já pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

### Pronto quando
**No PR** (a sessão prova):
- [ ] Um login da equipe recebe só os totais: um teste do worker prova que a resposta não traz
      nenhum lançamento, visto reprovar com o corte desligado.
- [ ] Só a Sofia consegue lançar, editar e apagar (teste visto reprovar com outro login).
- [ ] A conta dos totais tem teste com centavos e mês virando, visto reprovar.
- [ ] Nenhum dado de dinheiro em arquivo do repositório, nem de exemplo com valor real.
- [ ] Página olhada renderizada em 320 px e 1000 px, claro e escuro.
- [ ] `typecheck`, `lint` e o CI verdes.

**Depois de publicar** (a Sofia confere):
- [ ] Lançar um mês de verdade e conferir os totais.
- [ ] Pedir pra alguém da equipe abrir e confirmar que vê só os totais.

### Não fazer
- Não puxar extrato do banco (fica pra depois).
- Não fazer o DRE.
- Não pôr valor, nome de loja ou de sócio em issue, PR, teste ou commit.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.

---

## B. Aviso de peça parecida no cadastro

```
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 5 h
Depende de: nada
Sessões filhas: não
```

### Pra que serve
Na Pneus Amigão, a mesma peça já foi cadastrada duas vezes à mão, e o estoque ficou dividido entre
as duas. Agora, ao cadastrar, o sistema avisa se já existe uma peça parecida.

### Decisões já tomadas
- **Aviso, nunca tranca** (Sofia, 19/10; `docs/licoes.md`, item 33): "Parece com *Pneu 175/70 R13
  Pirelli*. É a mesma?", com "Abrir a que já existe" e "Cadastrar mesmo assim".
- "Parecida" = mesmo código de barras, mesmo código interno ou nome muito parecido. Pneu com medida
  diferente (R13 × R14) **não** é parecido: a medida conta mais que o resto do nome.
- A busca é uma função só, porque a peça avulsa (tarefa D) e a ferramenta de juntar (tarefa E) usam
  a mesma.
- Entra primeiro no **cadastro à mão** (onde o defeito aconteceu). A importação de XML do
  fornecedor ganha o mesmo aviso depois, em outra tarefa.

### O que fazer
1. Uma função pura em `src/schemas/` que recebe a peça nova e as do cadastro e devolve as parecidas,
   da mais pra menos parecida, com teste (casos: mesmo código de barras; nome com acento e
   maiúscula diferentes; R13 × R14 não é parecido).
2. No formulário de peça, ao salvar uma peça **nova**: se tiver parecida, mostrar o aviso (no Modal
   do projeto) antes de gravar.

### Arquivos
- `src/schemas/pecaParecida.ts` (novo) e o teste
- `src/pages/estoque/PecaForm.tsx` e `src/pages/estoque/ProdutosSection.tsx`
Mexer fora desta lista: parar e perguntar à Sofia.

### Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A regra de "parecida" (com teste) | ajudante | médio | plano pronto |
| O aviso na tela | ajudante | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

### Pronto quando
**No PR** (a sessão prova):
- [ ] A regra tem teste visto reprovar (inclusive R13 × R14).
- [ ] Cadastrar uma peça repetida mostra o aviso; "Cadastrar mesmo assim" grava normalmente.
- [ ] Editar uma peça que já existe não mostra o aviso.
- [ ] Tela olhada renderizada (`contraste:telas`, `largura:telas`); `typecheck`, `lint` e o CI verdes.

**Depois de publicar** (a Sofia confere):
- [ ] Tentar cadastrar de novo uma peça que já existe na Pneus Amigão.

### Não fazer
- Não juntar peças (tarefa E). Não mexer na importação de XML.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.

---

## C. Orçamento como etapa da OS (a #379 reescrita)

```
Chefe: backend
Ajudantes: frontend (as telas do orçamento), tester (conferir o Pronto quando)
Estimativa: 16 h
Depende de: nada
Sessões filhas: não
```

### Pra que serve
Hoje toda OS já nasce "em andamento". Com o orçamento, dá pra montar o preço, mandar pro cliente e
só virar OS quando ele aprovar. É o que o tio da Sofia mais vai usar na Pneus Amigão, e o recurso que
o concorrente mais anuncia.

### Decisões já tomadas (Sofia, 19/10, salvo onde diz)
- **O orçamento é uma etapa da própria OS** (situação "orçamento", antes de "em andamento"), não um
  módulo separado (#379, 30/09; confirmado em 19/10).
- **Numeração própria**: "Orçamento 45". Ganha o número de OS só ao ser aprovado, então a numeração
  das OS continua sem buracos. Cuidado: hoje `numero` é obrigatório e único por loja (migration
  0037), preenchido por um gatilho; isso muda.
- **O estoque só baixa na aprovação.** Orçamento não aprovado **não entra em número nenhum**:
  comissão, lucro, ticket médio, caixa, nota e garantia. Uma regra só, testada, que todas as telas usam.
- **Validade**: 7 dias, que dá pra mudar em cada orçamento. Vencido aparece com uma etiqueta cinza
  "vencido" na lista, e ainda dá pra aprovar, com um aviso (preço de pneu muda).
- **Sem poluir**: nada no Início. Só um número pequeno ao lado de "Orçamentos" no menu. A lista de
  OS mostra só OS; os orçamentos têm a lista deles.
- **Recusado**: um clique, com motivo opcional de uma lista curta (preço, prazo, foi em outro lugar,
  desistiu, outro).
- Aprovou: guarda quem aprovou, em texto livre ("pelo telefone").
- **WhatsApp e impressão**: os mesmos da OS, com o título "Orçamento". Texto proposto pra mensagem
  (a Sofia aprova junto com este rascunho):
  > Olá, {cliente}! Segue o orçamento {número} da {loja} para o {veículo}: {total}. Vale até {validade}.
  > Qualquer dúvida, é só responder aqui.
- O tio usa o login padrão da loja, com acesso a tudo: nenhuma permissão nova.
- Peça avulsa não entra aqui: é a tarefa D.

### O que fazer
1. Migration: a situação "orçamento", o contador de orçamento por loja, a validade, o "quem aprovou",
   o motivo da recusa; o número de OS dado só na aprovação. Idempotente, com o
   `supabase/scripts/testar-*.sql`. Declarar `versao-minima-do-programa` (a versão velha não conhece
   a situação nova).
2. As regras (quem pode ir pra onde; quando baixa o estoque; "conta nos números ou não") numa função
   pura em `src/schemas/`, com teste.
3. Conferir cada lugar que soma OS (comissão, lucro, ticket médio, caixa, nota, garantia, Relações) e
   fazer todos usarem a regra do passo 2.
4. Telas: lista de orçamentos, botão "Novo orçamento", "Aprovar" e "Recusar" na OS, o número no menu.
5. Atualizar `docs/modulos.md` e `docs/banco.md`.

### Arquivos
- `supabase/migrations/0065_orcamento.sql` (nova) e `supabase/scripts/testar-orcamento.sql`
- `src/schemas/versaoEsquema.ts` (sobe pra 65), `src/schemas/ordemServico.ts`, `src/schemas/situacaoFiscal.ts`
- `src/schemas/orcamento.ts` (novo) e o teste
- `src/types/os.ts`, `src/lib/ordensServico.ts`
- os lugares que somam OS (comissões, lucratividade, caixa, `painelInicio`), achados no passo 3
- `src/pages/ordens-servico/` (lista, formulário, `StatusOrdemBadge.tsx`)
- `src/lib/modelosWhatsapp.ts`
- `docs/modulos.md`, `docs/banco.md`
Mexer fora desta lista: parar e perguntar à Sofia.

### Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Achar todo lugar que soma OS | ajudante explorador | rápido | só lê |
| A migration e o teste dela | ajudante | forte | banco e numeração |
| As regras (com teste) | ajudante | forte | estoque e dinheiro |
| As telas | ajudante | médio | plano já pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

### Pronto quando
**No PR** (a sessão prova):
- [ ] Montar, mandar, aprovar e recusar um orçamento funciona; o estoque só baixa na aprovação
      (teste visto reprovar).
- [ ] Orçamento não aprovado não aparece em comissão, lucro, ticket médio, caixa nem Relações
      (teste visto reprovar em cada um).
- [ ] As OS continuam numeradas sem buraco; o orçamento aprovado ganha o próximo número.
- [ ] `testar-orcamento.sql` termina em `TODAS AS CHECAGENS PASSARAM`; `gerar-instalacao` rodado.
- [ ] Telas olhadas renderizadas; `typecheck`, `lint`, `test:fusos` e o CI verdes.
- [ ] Uma revisão de código do zero antes de mesclar (PR grande).

**Depois de publicar** (a Sofia confere):
- [ ] O tio monta um orçamento de verdade na Pneus Amigão, manda pelo WhatsApp e aprova.

### Não fazer
- Não fazer peça avulsa (tarefa D) nem o link de aprovação pelo celular (fica pra depois).
- Não pôr nada no Início.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.

---

## D. Peça avulsa no orçamento

```
Chefe: backend
Ajudantes: frontend (a janela de aprovação e a linha avulsa), tester (conferir o Pronto quando)
Estimativa: 10 h
Depende de: #C, #B
Sessões filhas: não
```

### Pra que serve
O tio monta o orçamento com uma peça que não está no cadastro ("pneu 275/80 R22.5"), sem precisar
cadastrar antes. Hoje só o serviço pode ser avulso.

### Decisões já tomadas (Sofia, 19/10)
- No orçamento, a peça pode ser **digitada** (nome, quantidade, preço), sem cadastro.
- **Custo opcional** na linha avulsa. Sem custo, o lucro mostra "custo não informado", nunca um número errado.
- **Ao aprovar**, uma janelinha pra cada peça avulsa, com três caminhos:
  1. "É uma peça que já tenho": escolher do cadastro, com as parecidas da tarefa B no topo;
  2. "Cadastrar agora": cadastro com nome e preço já preenchidos, e baixa o estoque;
  3. "Seguir sem cadastro": fica avulsa, sem estoque.
- **A nota fiscal**: a NFC-e precisa dos dados fiscais da peça (o NCM), que só o cadastro tem. Se
  alguém for emitir nota com peça avulsa, o sistema avisa "essa peça precisa ser cadastrada pra sair
  na nota" e abre o cadastro ali mesmo. É o único ponto em que o cadastro é obrigatório (quem trava
  ali é a SEFAZ).
- Nenhuma ponta solta: toda peça avulsa sai da aprovação com um caminho escolhido.

### O que fazer
1. Migration: a peça avulsa no item (sem `peca_id`) e o custo opcional da linha. Idempotente, com teste.
2. Regras em `src/schemas/`: o que fazer com cada avulsa na aprovação; quando a nota exige cadastro;
   como o lucro trata custo vazio. Com teste.
3. Telas: a linha avulsa no orçamento; a janela da aprovação; o aviso na emissão da nota.

### Arquivos
- `supabase/migrations/0066_peca_avulsa.sql` (nova) e `supabase/scripts/testar-peca-avulsa.sql`
- `src/schemas/versaoEsquema.ts`, `src/schemas/orcamento.ts`, `src/schemas/faturamento.ts`
- `src/types/os.ts`, `src/lib/ordensServico.ts`, `src/lib/focusNfe.ts` (só a checagem antes de montar a nota)
- `src/pages/ordens-servico/` (`ItemOSRow.tsx`, `ItemExistenteRow.tsx`, `EmitirNotaFiscalModal.tsx`, a janela nova)
Mexer fora desta lista: parar e perguntar à Sofia.

### Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Migration e teste | ajudante | forte | banco |
| As regras (estoque, nota, lucro) | ajudante | forte | dinheiro e nota fiscal |
| As telas | ajudante | médio | plano já pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

### Pronto quando
**No PR** (a sessão prova):
- [ ] Os três caminhos da aprovação funcionam, com teste visto reprovar.
- [ ] Emitir nota com peça avulsa pede o cadastro antes; nenhuma nota sai sem NCM (teste visto reprovar).
- [ ] Lucro com custo vazio mostra "custo não informado" (teste visto reprovar).
- [ ] As notas de exemplo (`__ouro__`) continuam iguais.
- [ ] `testar-peca-avulsa.sql` passa; telas olhadas renderizadas; `typecheck`, `lint` e o CI verdes.

**Depois de publicar** (a Sofia confere):
- [ ] Um orçamento de verdade com peça avulsa, aprovado pelos três caminhos, na Pneus Amigão.

### Não fazer
- Não peça avulsa na venda de balcão (só no orçamento, por enquanto).

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.

---

## E. Juntar peças repetidas

```
Chefe: backend
Ajudantes: frontend (a tela da ferramenta), seguranca (a função do banco e quem pode usar), tester (conferir o Pronto quando)
Estimativa: 12 h
Depende de: #B
Sessões filhas: não
```

### Pra que serve
As peças que já foram cadastradas duas vezes na Pneus Amigão voltam a ser uma só, com o estoque
somado e o histórico todo junto.

### Decisões já tomadas (Sofia, 19/10)
- **Nunca junta sozinho**: o sistema lista os pares suspeitos (a regra da tarefa B) e a pessoa
  confirma cada um.
- **Antes de juntar, mostra o que vai acontecer**: "Estoque 4 + 2 = 6. 12 OS, 3 compras e 1 contagem
  passam pra *Pneu 175/70 R13 Pirelli*."
- Se as duas tiverem preço, código ou dados fiscais diferentes, **a pessoa escolhe campo por campo**.
- Tudo numa função do banco que faz **tudo ou nada** (se falhar no meio, nada muda). A peça passa
  em pelo menos: movimentos de estoque, itens de OS, contagens, pedidos de compra e cotações.
- Fica registrado na Auditoria quem juntou, quando, e o que tinha cada peça.
- **Na Pneus Amigão, cópia de segurança do banco antes da primeira vez**, e antes disso ensaiado no
  Supabase de teste com peças repetidas de propósito.

### O que fazer
1. Migration: a função de juntar (tudo ou nada), com teste que cobre cada tabela que aponta pra peça.
2. A prévia ("o que vai acontecer") e a escolha campo a campo numa função pura em `src/schemas/`.
3. A tela "Juntar peças repetidas" no Estoque.
4. Atualizar `docs/modulos.md`, `docs/banco.md` e o passo a passo da cópia de segurança em `docs/operacao.md`.

### Arquivos
- `supabase/migrations/0067_juntar_pecas.sql` (nova) e `supabase/scripts/testar-juntar-pecas.sql`
- `src/schemas/versaoEsquema.ts`, `src/schemas/juntarPecas.ts` (novo) e o teste
- `src/lib/pecas.ts`
- `src/pages/estoque/` (a tela nova e o botão em `EstoquePage.tsx`)
- `docs/modulos.md`, `docs/banco.md`, `docs/operacao.md`
Mexer fora desta lista: parar e perguntar à Sofia.

### Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Achar toda tabela que aponta pra peça | ajudante explorador | rápido | só lê |
| A função do banco e o teste | ajudante | forte | banco, estoque, sem volta fácil |
| A prévia e a escolha (com teste) | ajudante | forte | estoque |
| A tela | ajudante | médio | plano já pronto |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

### Pronto quando
**No PR** (a sessão prova):
- [ ] O teste do banco prova que nenhuma tabela fica apontando pra peça que sumiu, visto reprovar
      com uma tabela esquecida de propósito.
- [ ] Falha no meio não muda nada (teste visto reprovar).
- [ ] A prévia bate com o resultado.
- [ ] Ensaiado no Supabase de teste; telas olhadas renderizadas; `typecheck`, `lint` e o CI verdes.
- [ ] Uma revisão de código do zero antes de mesclar.

**Depois de publicar** (a Sofia confere):
- [ ] Cópia de segurança da Pneus Amigão feita, e as peças repetidas de verdade juntadas.

### Não fazer
- Não juntar nada sem confirmação. Não mexer em peça de outra loja.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.

---

## As decisões da entrevista de 19/10 (pra conferência)

1. Ordem: painel (leva 2 + financeiro) primeiro, depois o programa das lojas.
2. Financeiro do painel: a Sofia digita; puxar o extrato fica pra depois (banco da Contabilizei).
3. A equipe vê totais e gráficos; só a Sofia vê cada lançamento.
4. Primeiro do programa: orçamento na OS, pro tio. Melhorias pra cliente novo depois.
5. Orçamento com numeração própria; número de OS só na aprovação.
6. Validade de 7 dias, etiqueta cinza "vencido", sem poluir.
7. Nada no Início; só o número no menu.
8. Recusa com um clique e motivo opcional.
9. Peça avulsa: três caminhos na aprovação; cadastro obrigatório só na nota.
10. Custo opcional na peça avulsa.
11. Aviso de peça parecida no cadastro à mão; depois na importação de XML.
12. Juntar peças: sempre confirmado, com prévia, escolha por campo, auditoria e cópia de segurança.
13. O tio usa o login padrão, com acesso a tudo.

**Na gaveta**: extrato automático no financeiro; o resto do concorrente; aprovação do orçamento por
link no celular; o aviso de peça parecida na importação de XML.
