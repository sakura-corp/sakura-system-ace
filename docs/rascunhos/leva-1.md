# Leva 1: os rascunhos das tarefas (17/10/2026)

> Rascunho pra Sofia revisar. **Nenhuma destas issues foi criada ou reescrita ainda**: só depois do
> "pode criar". Modelo: `docs/tarefas.md`. Escolha da leva: **opção A, a enxuta** (a Sofia deixou o
> Claude decidir, 17/10).

## O que entra na leva 1

| # | Tarefa | Chefe | Estimativa | Depende de | O que acontece com a issue |
|---|---|---|---|---|---|
| #536 | Painel: o cartão lê o cabeçalho | frontend | 5 h | nada | **já criada** (aprovada antes) |
| nova | Painel: botão "Pegar tarefa" e "Largar" | backend | 6 h | #536 | criar |
| nova | Painel: horas por pessoa | frontend | 3 h | nada | criar |
| #510 | Janelas de importação no Modal | frontend | 3 h | nada | reescrever no modelo |
| #511 | 6 testes que reprovam no Windows | tester | 2 h | nada | reescrever no modelo |
| #455 | Clientes que sumiram | frontend | 6 h | nada | reescrever, tirar `guia` |

**Total: 25 h.** As três do painel seguem "uma de cada vez" entre si (a de pegar espera a #536);
as três do programa podem andar em paralelo. Nenhuma precisa de migration nem de Supabase: as
conferências de tela sobem o app com um Supabase de mentira.

**Ficaram pra leva 2**: "fases da leva" e "relatório e aprovação" no painel (ainda sem desenho
combinado: cada uma pede uma conversa antes).

## O que a Sofia decide ao aprovar (já escrito como proposta)

1. **Pegar tarefa**: o "Começar com o Claude" passa a aparecer **só pra quem pegou** a tarefa;
   numa tarefa livre aparece "Pegar tarefa". (É a regra de `docs/painel.md`: "põe o nome antes de
   começar".)
2. **Horas por pessoa**: contadas **na leva** (a leva é o período), não por semana do calendário.
3. **Clientes que sumiram**: padrão de **6 meses**, e o texto da mensagem (abaixo, na #455).

Se concordar com as três, é só dizer "pode criar". Se não, diga qual muda.

---

## Nova: Painel: botão "Pegar tarefa" e "Largar"

Etiquetas: `chefe:backend`, `leva-1`

```markdown
Chefe: backend
Ajudantes: frontend (os botões no cartão), tester (conferir o Pronto quando)
Estimativa: 6 h
Depende de: #536
Sessões filhas: não

## Pra que serve
Hoje a pessoa tem que ir no GitHub e pôr o nome dela na tarefa. Com o botão, ela pega pelo painel,
e o painel garante as regras da equipe: só tarefa livre, sem dependência aberta, e **uma por vez**.

## Decisões já tomadas
- Regras de `docs/painel.md` ("Como a equipe trabalha"): pega **uma livre**, põe o nome **antes de
  começar**, segura **uma por vez** (só pega outra depois que o PR da atual foi aberto).
- Numa tarefa livre o cartão mostra **"Pegar tarefa"**; o "Começar com o Claude" (e o "Copiar
  texto") aparece **só pra quem pegou** (Sofia, 17/10).
- **"Largar"** devolve a tarefa: só o dono, e só enquanto ela está em andamento (sem PR aberto).
- Quem escreve no GitHub é o token **da própria pessoa** (o app "Sakura Painel" já tem Issues
  leitura e escrita); nenhuma credencial nova.

## O que fazer
1. Worker: rotas `POST /api/tarefa/<n>/pegar` e `POST /api/tarefa/<n>/largar` em
   `painel/worker/index.ts`, com a lógica num arquivo novo `painel/worker/pegar.ts`:
   - só com sessão válida (`sessaoAtual()`, devolvendo os cookies) e com `Origin` igual ao do
     painel (o mesmo cuidado do `/api/tempo-real`);
   - `<n>` validado com `numeroValido`;
   - **confere de novo no GitHub, na hora** (nunca confia no que a página mandou): a issue tem
     etiqueta `leva-N` da leva atual, está aberta, sem dono, com o cabeçalho completo e sem
     dependência aberta (as regras da #536), e a pessoa não tem outra tarefa em andamento na leva;
   - pega com `POST /repos/.../issues/<n>/assignees`, larga com `DELETE` do mesmo endereço, só o
     próprio login;
   - devolve `{ ok: true }` ou `{ ok: false, motivo }` com um motivo em português ("você já está
     com a #N", "espera a #N", "alguém pegou antes").
2. As regras de "pode pegar?" e "pode largar?" como funções puras em `painel/src/logica/pegar.ts`,
   usadas pelo worker **e** pelo cartão (a página desliga o botão; o worker é quem decide).
3. Cartão (`painel/src/componentes/ListaDeTarefas.tsx`): "Pegar tarefa" na livre; depois de pegar,
   "Começar com o Claude", "Copiar texto" e "Largar" só pro dono; o motivo aparece se o worker
   recusar. O tempo real (#355) já atualiza o painel de todo mundo.
4. `docs/painel.md`: atualizar "Pegar tarefa" em "Como a equipe trabalha" e uma entrada em
   "Andamento".

## Arquivos
- `painel/worker/pegar.ts` (novo) e o teste; `painel/worker/index.ts` (as duas rotas) e
  `painel/worker/index.test.ts`.
- `painel/src/logica/pegar.ts` e `pegar.test.ts` (novos).
- `painel/src/logica/dados.ts` (a chamada da página), `painel/src/componentes/ListaDeTarefas.tsx`.
- `docs/painel.md`.
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| As regras puras e os testes | ajudante | médio | plano pronto |
| As rotas do worker | ajudante | forte | escreve no GitHub com o token da pessoa |
| Os botões no cartão | ajudante frontend | médio | plano pronto |
| Conferir o Pronto quando | ajudante tester | médio | testar |
| Revisão final do diff | ajudante revisor | forte | segurança: rota que escreve |

## Pronto quando
**No PR** (a sessão prova):
- [ ] testes **vistos reprovar**: pegar tarefa com dono, de outra leva, com dependência aberta,
      incompleta, ou já tendo uma em andamento; largar tarefa de outra pessoa; `Origin` de fora
      (403); sem sessão (401); número inválido
- [ ] o worker confere no GitHub na hora (teste com o GitHub fingido mudando entre a página e o clique)
- [ ] olhado renderizado em 320 px e 1000 px, claro e escuro (fotos no PR)
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] no endereço público, pegar uma tarefa: o nome aparece no GitHub e nos dois navegadores;
      tentar pegar uma segunda mostra "você já está com a #N"; largar devolve a tarefa

## Não fazer
- Não fechar issue nem abrir PR pelo painel.
- Não deixar a Sofia (ou qualquer um) pôr outra pessoa numa tarefa por aqui.
- Fases da leva e relatório: leva 2.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

---

## Nova: Painel: horas por pessoa

Etiquetas: `chefe:frontend`, `leva-1`

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 3 h
Depende de: nada
Sessões filhas: não

## Pra que serve
O trabalho da equipe é medido em horas, não em dinheiro (`docs/painel.md`). A tela da leva passa a
mostrar, por pessoa, quantas horas ela já entregou e quantas está segurando, pra Sofia ver o ritmo
de cada um sem abrir issue por issue.

## Decisões já tomadas
- As horas são as da linha `Estimativa:` de cada tarefa (a regra `lerEstimativa` que já existe).
- Contadas **na leva** (a leva é o período), não por semana do calendário (Sofia, 17/10).
- **Entregue** = tarefa feita; **segurando** = em andamento ou em revisão. Tarefa sem dono não
  entra; tarefa sem estimativa entra como "sem estimativa" (contada à parte, nunca como 0 h).

## O que fazer
1. Em `painel/src/logica/contador.ts`, uma função pura `horasPorPessoa(tarefas)` que devolve, por
   login, `{ entregues, segurando, semEstimativa }`, em ordem de quem entregou mais.
2. Na tela da leva (`painel/src/componentes/TelaDaLeva.tsx`), abaixo do contador, um quadro
   "Horas por pessoa": foto, login, horas entregues, segurando, e "N sem estimativa" quando houver.
   No celular, uma pessoa por linha, sem tabela larga.

## Arquivos
- `painel/src/logica/contador.ts` e `contador.test.ts`.
- `painel/src/componentes/TelaDaLeva.tsx` (e um componente novo `HorasPorPessoa.tsx`, se ficar grande).
- `docs/painel.md`: uma entrada em "Andamento".
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A função e os testes | ajudante | médio | regra pura, plano pronto |
| O quadro na tela | ajudante | médio | plano pronto |
| Conferir o Pronto quando | ajudante tester | rápido | conferir lista |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] testes de `horasPorPessoa` **vistos reprovar**: meia hora (1,5 h), tarefa sem estimativa,
      tarefa sem dono, tarefa em revisão contando como "segurando"
- [ ] olhado renderizado em 320 px e 1000 px, claro e escuro, sem rolagem lateral (fotos no PR)
- [ ] `typecheck`, `lint` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] no endereço público, as horas da leva 1 batem com as estimativas das issues

## Não fazer
- Nada de dinheiro, valor por hora ou custo (repositório público; financeiro é outra fase).
- Não mudar o contador que já existe.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

---

## Reescrever #510: As duas janelas de importação devem usar o Modal

Etiquetas: `chefe:frontend` (já tem), `leva-1`

```markdown
Chefe: frontend
Ajudantes: tester (conferir o Pronto quando)
Estimativa: 3 h
Depende de: nada
Sessões filhas: não

## Pra que serve
As duas janelas de importação (XML do fornecedor e notas no estoque) foram montadas à mão e não
têm o que o `Modal` tem: Esc pra fechar, Tab preso dentro e `role="dialog"`. Quem usa teclado (ou
leitor de tela) se perde nelas. Achado na revisão de 03/10.

## Decisões já tomadas
- As duas passam a usar o `Modal` de `src/components/Modal.tsx`, que ganha uma opção de largura
  (hoje é fixo em `max-w-lg`; as janelas usam `max-w-4xl` e `max-w-5xl`).
- O padrão continua `max-w-lg`: os outros modais não mudam.

## O que fazer
1. `src/components/Modal.tsx`: prop opcional `largura` (ex.: `"lg" | "4xl" | "5xl"`), com classes
   escritas por extenso (o Tailwind não acha classe montada por texto).
2. `src/pages/fornecedores/ImportarNotaFiscalXmlModal.tsx` e
   `src/pages/estoque/ImportarNotasFiscaisModal.tsx`: trocar a casca feita à mão pelo `Modal`,
   sem mudar o que tem dentro.

## Arquivos
- `src/components/Modal.tsx` (e um teste dele, se não existir).
- `src/pages/fornecedores/ImportarNotaFiscalXmlModal.tsx`.
- `src/pages/estoque/ImportarNotasFiscaisModal.tsx`.
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| A largura no Modal e as duas janelas | ajudante | médio | plano pronto |
| Conferir o Pronto quando | ajudante tester | médio | testar teclado |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] nas duas janelas: Esc fecha, Tab não escapa, `role="dialog"` presente (teste **visto
      reprovar** com a casca antiga)
- [ ] as janelas continuam largas (4xl e 5xl), e os outros modais continuam `lg`
- [ ] `typecheck`, `lint`, `test:fusos`, `contraste:telas` e `largura:telas` verdes

**Depois de publicar** (a Sofia confere):
- [ ] importar um XML de fornecedor no programa instalado, fechando com Esc no meio

## Não fazer
- Não mudar a lógica de importação.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

---

## Reescrever #511: 6 testes de test:fusos reprovam no Windows

Etiquetas: `chefe:tester` (já tem), `leva-1`

```markdown
Chefe: tester
Ajudantes: nenhum
Estimativa: 2 h
Depende de: nada
Sessões filhas: não

## Pra que serve
6 testes de `npm run test:fusos` reprovam no Windows: o caminho vem com `\` e o fim de linha em
CRLF. O CI roda em Linux e passa, e o app não é afetado, mas atrapalha quem roda os testes no PC
(a equipe, em Windows). Achado pelo Gustavo no PR #424, em 01/10.

## Decisões já tomadas
- Mexer **só nos testes** (normalizar caminho e fim de linha), nunca no que os scripts fazem em
  produção.

## O que fazer
1. Em `scripts/atualizar-bancos.test.ts` e `scripts/gerar-instalacao-completa.test.ts`, achar as
   6 comparações e normalizar: caminho com `/` e fim de linha `\n` antes de comparar.
2. Provar no Linux, imitando o Windows: um teste que passa o texto com CRLF e o caminho com `\`
   (ex.: `path.win32`) e mostra que a comparação continua certa.

## Arquivos
- `scripts/atualizar-bancos.test.ts`.
- `scripts/gerar-instalacao-completa.test.ts`.
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | médio | tarefa pequena e clara |
| Achar as 6 comparações | ajudante explorador | rápido | só lê |
| Normalizar e provar | sessão mãe | médio | plano pronto |
| Revisão final do diff | ajudante revisor | forte | garantir que o teste não ficou frouxo |

## Pronto quando
**No PR** (a sessão prova):
- [ ] cada teste mexido, alimentado com CRLF e `\`, reprovava antes e passa depois (visto reprovar)
- [ ] os testes continuam pegando erro de verdade (quebrar o script de propósito e ver reprovar)
- [ ] `test:fusos` e o CI verdes

**Depois de publicar** (a Sofia confere):
- [ ] alguém da equipe roda `npm run test:fusos` no Windows e passa

## Não fazer
- Não mexer em `scripts/atualizar-bancos.*` nem `scripts/gerar-instalacao-completa.*` fora dos testes.
- Não pular nem desligar teste.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```

---

## Reescrever #455: Clientes que sumiram, com a mensagem de volta pronta (FN-11)

Etiquetas: `chefe:frontend`, `leva-1`; **tirar `guia`**

```markdown
Chefe: frontend
Ajudantes: backend (a conta de última visita e total gasto), tester (conferir o Pronto quando)
Estimativa: 6 h
Depende de: nada
Sessões filhas: não

## Pra que serve
Saber **quem parou de vir** e chamar de volta. Em Clientes, um filtro "sem vir há mais de X meses",
com o total que o cliente já gastou e o último serviço, ordenado por quem mais gastou, e em cada
linha o botão de WhatsApp com a mensagem pronta. Trazer de volta quem já comprou custa bem menos
que achar cliente novo, e o dado já existe. Onda 1 de `docs/visao.md` (sem custo, rápida);
`MELHORIAS.md`, item `FN-11`.

## Decisões já tomadas
- **Padrão: 6 meses**, e a pessoa muda no próprio filtro (Sofia, 17/10).
- **Texto padrão** (cada loja edita em Configurações → Mensagens de WhatsApp) (Sofia, 17/10):
  "Oi {cliente}, tudo bem? Aqui é da {loja}.\nFaz um tempinho que você não passa por aqui. Que tal
  dar uma olhada no {veiculo}? É só responder que a gente marca um horário."
- **Um clique por cliente**, e quem manda é a pessoa: nada em massa, nada sozinho.
- O **total gasto** só aparece pra quem pode ver valores (a mesma regra de permissão do módulo
  Relações; achar no código).
- Sem migration: os modelos de WhatsApp não têm trava no banco.

## O que fazer
1. Em `src/schemas/` (arquivo novo, ex. `clientesSumidos.ts`), função pura que recebe as OS e as
   vendas de balcão faturadas e devolve, por cliente, a última visita e o total gasto; dia de
   calendário com `hojeLocal()`/`diaLocal()`.
2. Em `src/schemas/whatsapp.ts`, modelo novo `cliente_sumido` em `MODELOS_WHATSAPP`, com os
   marcadores `{cliente}`, `{loja}`, `{veiculo}`; aparece sozinho em `ModelosWhatsappSection.tsx`.
3. Em `src/pages/clientes/ClientesPage.tsx`, o filtro, as colunas e o botão de WhatsApp,
   registrando que a conversa foi aberta, como os outros botões.

## Arquivos
- `src/schemas/clientesSumidos.ts` e o teste (novos).
- `src/schemas/whatsapp.ts`.
- `src/pages/clientes/ClientesPage.tsx`.
- `src/lib/` só se precisar de uma busca nova das OS e vendas por cliente.
- `docs/modulos.md` (Clientes).
Mexer fora desta lista: parar e perguntar à Sofia.

## Etapas e modelos
| Etapa | Quem | Modelo | Por quê |
|---|---|---|---|
| Ler a issue e planejar | sessão mãe | forte | erro de plano custa a tarefa inteira |
| Achar os arquivos e a regra de "ver valores" | ajudante explorador | rápido | só lê |
| A conta de última visita e total gasto | ajudante backend | forte | dinheiro |
| O modelo de WhatsApp e a tela | ajudante | médio | plano pronto |
| Conferir o Pronto quando | ajudante tester | médio | testar |
| Revisão final do diff | ajudante revisor | forte | pega o que o teste não pega |

## Pronto quando
**No PR** (a sessão prova):
- [ ] testes da conta **vistos reprovar**: cliente com OS e venda de balcão, venda não faturada
      (não conta), virada de mês e de fuso, cliente que nunca veio
- [ ] o total gasto some pra quem não pode ver valores (teste)
- [ ] o botão monta a mensagem certa com os marcadores
- [ ] `typecheck`, `lint`, `test:fusos`, `contraste:telas` e `largura:telas` verdes, com fotos da tela

**Depois de publicar** (a Sofia confere):
- [ ] na loja, os clientes do filtro e os totais batem com as OS de um cliente conhecido

## Não fazer
- Nada de mandar em massa ou sozinho.
- Não mexer em Relações nem no Início.

---
Segue o ritual da skill `ritual-de-tarefa` (sessão mãe, modelos, relatório). Não mesclar.
```
